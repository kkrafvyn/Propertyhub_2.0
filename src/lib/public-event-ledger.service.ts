import { supabase } from "./supabase";

const db = supabase as any;

export type PublicLedgerKind = "unit" | "property" | "transaction";

export interface PublicLedgerRecord {
  kind: PublicLedgerKind;
  identifier: string;
  title: string;
  summary: string;
  events: Array<{ at: string; label: string }>;
}

export const publicEventLedgerService = {
  async lookup(kind: PublicLedgerKind, identifier: string): Promise<PublicLedgerRecord | null> {
    const id = identifier.trim();
    if (!id) return null;

    if (kind === "transaction") {
      const { data, error } = await db.rpc("verify_public_transaction", { p_reference: id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.found && row?.amount_minor == null) return null;
      return {
        kind,
        identifier: id,
        title: "Payment receipt",
        summary: `${((Number(row.amount_minor) || 0) / 100).toFixed(2)} ${row.currency || "GHS"} via ${row.method || "unknown"}`,
        events: [
          {
            at: row.received_at,
            label: `Settled against ${row.unit_pseudonym}. No tenant or owner identity is disclosed.`,
          },
        ],
      };
    }

    if (kind === "unit") {
      const { data: unit } = await db
        .from("estate_units")
        .select("id, identifier, bedrooms, status, estate_id")
        .eq("id", id)
        .maybeSingle();
      if (!unit) return null;
      const { data: estate } = await db
        .from("managed_estates")
        .select("name, city")
        .eq("id", unit.estate_id)
        .maybeSingle();
      return {
        kind,
        identifier: unit.identifier,
        title: `Unit ${unit.identifier}`,
        summary: [estate?.name, estate?.city, unit.bedrooms ? `${unit.bedrooms} bed` : null, unit.status]
          .filter(Boolean)
          .join(" · "),
        events: [{ at: new Date().toISOString(), label: "Public occupancy status only. Occupant identity is withheld." }],
      };
    }

    const { data: listing } = await db
      .from("listings")
      .select("id, listing_type, status, property:properties(address, city)")
      .eq("id", id)
      .maybeSingle();
    if (!listing) return null;
    const property = listing.property as { address?: string; city?: string } | null;
    return {
      kind,
      identifier: listing.id,
      title: property?.address || "Listing",
      summary: [property?.city, listing.listing_type, listing.status].filter(Boolean).join(" · "),
      events: [{ at: new Date().toISOString(), label: "Public listing status. Owner and applicant records are withheld." }],
    };
  },
};
