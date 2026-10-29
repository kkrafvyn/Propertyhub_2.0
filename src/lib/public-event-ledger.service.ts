import { supabase } from "./supabase";
import { formatPublicUnitId, isUuid, parsePublicUnitListingSuffix } from "./public-explorer";

const db = supabase as any;

async function findPublicListingByUnitCode(code: string) {
  const suffix = parsePublicUnitListingSuffix(code) || code.replace(/^BM-UNIT-/i, "").toUpperCase();
  const { data, error } = await db
    .from("listings")
    .select("id, listing_type, status, property:properties(address, city, name)")
    .eq("status", "listed")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data || []) as Array<{
    id: string;
    listing_type?: string;
    status?: string;
    property?: { address?: string; city?: string; name?: string } | null;
  }>;
  return rows.find((row) => row.id.slice(-6).toUpperCase() === suffix.slice(-6).toUpperCase()) ?? null;
}

function listingToLedgerRecord(
  listing: {
    id: string;
    listing_type?: string;
    status?: string;
    property?: { address?: string; city?: string; name?: string } | null;
  },
  kind: PublicLedgerKind,
) {
  const property = listing.property;
  return {
    kind,
    identifier: kind === "unit" ? formatPublicUnitId(listing.id) : listing.id,
    title: property?.name || property?.address || "Listing",
    summary: [property?.city, listing.listing_type, listing.status].filter(Boolean).join(" · "),
    events: [
      {
        at: new Date().toISOString(),
        label: "Public listing status. Owner and applicant records are withheld.",
      },
    ],
  } satisfies PublicLedgerRecord;
}

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
      if (/^BM-UNIT-/i.test(id)) {
        const listing = await findPublicListingByUnitCode(id);
        if (listing) return listingToLedgerRecord(listing, kind);
      }

      if (isUuid(id)) {
        const { data: listing } = await db
          .from("listings")
          .select("id, listing_type, status, property:properties(address, city, name)")
          .eq("id", id)
          .eq("status", "listed")
          .eq("visibility", "public")
          .maybeSingle();
        if (listing) return listingToLedgerRecord(listing, kind);

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

      const listing = await findPublicListingByUnitCode(id);
      if (listing) return listingToLedgerRecord(listing, kind);
      return null;
    }

    if (isUuid(id)) {
      const { data: listingByProperty } = await db
        .from("listings")
        .select("id, listing_type, status, property:properties(address, city, name)")
        .eq("property_id", id)
        .eq("status", "listed")
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (listingByProperty) return listingToLedgerRecord(listingByProperty, kind);

      const { data: listing } = await db
        .from("listings")
        .select("id, listing_type, status, property:properties(address, city, name)")
        .eq("id", id)
        .eq("status", "listed")
        .eq("visibility", "public")
        .maybeSingle();
      if (listing) return listingToLedgerRecord(listing, kind);
    }

    return null;
  },
};
