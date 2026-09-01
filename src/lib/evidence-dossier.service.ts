import { supabase } from "./supabase";

const db = supabase as any;

export type EvidenceCategory = "LEGAL" | "PAYMENT" | "MAINTENANCE" | "COMMUNICATION" | "COLLECTIONS";

export interface EvidenceEvent {
  id: string;
  timestamp: string;
  category: EvidenceCategory;
  title: string;
  actor: string;
  hash: string;
  details: string;
}

export interface EvidenceDossier {
  unitIdentifier: string;
  unitId: string;
  estateName: string;
  events: EvidenceEvent[];
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 28)
  );
}

export const evidenceDossierService = {
  /**
   * Assembles a chronological, read-only dossier for a unit from the immutable
   * ledgers: charges/payments (DB triggers prevent mutation), maintenance
   * issues, and collection case events. Each event carries a SHA-256 content
   * hash so exported dossiers can be integrity-checked later.
   */
  async buildUnitDossier(organizationId: string, unitIdentifier: string): Promise<EvidenceDossier | null> {
    const { data: estates } = await db
      .from("managed_estates")
      .select("id, name")
      .eq("organization_id", organizationId);
    const estateRows = (estates || []) as Array<{ id: string; name: string }>;
    if (estateRows.length === 0) return null;

    const { data: units } = await db
      .from("estate_units")
      .select("id, identifier, estate_id")
      .in("estate_id", estateRows.map((e) => e.id))
      .ilike("identifier", unitIdentifier.trim());
    const unit = ((units || []) as any[])[0];
    if (!unit) return null;

    const estateName = estateRows.find((e) => e.id === unit.estate_id)?.name || "Estate";
    const raw: Array<Omit<EvidenceEvent, "hash">> = [];

    const { data: charges } = await db
      .from("estate_charges")
      .select("id, charge_type, amount_minor, currency, due_date, status, created_at")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true })
      .limit(100);
    for (const c of (charges || []) as any[]) {
      raw.push({
        id: `charge-${c.id}`,
        timestamp: c.created_at,
        category: "LEGAL",
        title: `${String(c.charge_type || "Charge").replace(/_/g, " ")} charged (${((c.amount_minor || 0) / 100).toFixed(2)} ${c.currency || "GHS"})`,
        actor: "Estate ledger (immutable)",
        details: `Due ${c.due_date}. Current status: ${c.status}. Ledger row is protected by an immutability trigger.`,
      });
    }

    const { data: payments } = await db
      .from("unit_payments")
      .select("id, amount_minor, currency, method, provider_reference, received_at")
      .eq("unit_id", unit.id)
      .order("received_at", { ascending: true })
      .limit(100);
    for (const p of (payments || []) as any[]) {
      raw.push({
        id: `payment-${p.id}`,
        timestamp: p.received_at,
        category: "PAYMENT",
        title: `Payment received (${((p.amount_minor || 0) / 100).toFixed(2)} ${p.currency || "GHS"} via ${p.method})`,
        actor: `Provider reference ${p.provider_reference}`,
        details: `Recorded through the deterministic payment RPC; row is immutable and publicly verifiable at /explorer/transaction.`,
      });
    }

    const { data: issues } = await db
      .from("estate_issues")
      .select("id, title, category, priority, status, created_at")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true })
      .limit(100);
    for (const i of (issues || []) as any[]) {
      raw.push({
        id: `issue-${i.id}`,
        timestamp: i.created_at,
        category: "MAINTENANCE",
        title: `${i.title} (${i.priority})`,
        actor: "Service desk",
        details: `Category ${i.category}; status ${i.status}.`,
      });
    }

    const { data: cases } = await db
      .from("estate_collection_cases")
      .select("id, status, escalation_level, opened_at")
      .eq("unit_id", unit.id)
      .limit(20);
    for (const kase of (cases || []) as any[]) {
      raw.push({
        id: `case-${kase.id}`,
        timestamp: kase.opened_at,
        category: "COLLECTIONS",
        title: `Collection case opened (escalation level ${kase.escalation_level ?? 0})`,
        actor: "Collections agent",
        details: `Status ${kase.status}.`,
      });
      const { data: events } = await db
        .from("estate_collection_case_events")
        .select("id, event_type, notes, created_at")
        .eq("collection_case_id", kase.id)
        .order("created_at", { ascending: true })
        .limit(50);
      for (const ev of (events || []) as any[]) {
        raw.push({
          id: `case-event-${ev.id}`,
          timestamp: ev.created_at,
          category: "COMMUNICATION",
          title: `Collections: ${String(ev.event_type).replace(/_/g, " ")}`,
          actor: "Collections workflow",
          details: ev.notes || "Case event recorded.",
        });
      }
    }

    raw.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const events: EvidenceEvent[] = [];
    for (const item of raw) {
      events.push({ ...item, hash: await sha256(JSON.stringify(item)) });
    }

    return {
      unitIdentifier: unit.identifier,
      unitId: unit.id,
      estateName,
      events,
    };
  },
};
