import { supabase } from "./supabase";

const SOLD_ANNOUNCEMENT_SELECT = `
  id,
  listing_id,
  property_id,
  organization_id,
  transaction_id,
  property_label,
  city,
  region,
  listing_type,
  sold_amount_minor,
  currency,
  buyer_hash,
  receipt_hash,
  verification_url,
  announced_at,
  metadata
`;

export interface SoldPropertyAnnouncement {
  id: string;
  listingId: string;
  propertyId: string;
  organizationId: string | null;
  transactionId: string;
  propertyLabel: string;
  city: string | null;
  region: string | null;
  listingType: string;
  soldAmountMinor: number | null;
  currency: string;
  buyerHash: string;
  receiptHash: string | null;
  verificationUrl: string | null;
  announcedAt: string;
  metadata: Record<string, any>;
}

export interface SoldAnnouncementFeedResult {
  announcements: SoldPropertyAnnouncement[];
  total: number;
  unavailable: boolean;
}

export function formatBuyerHash(hash?: string | null) {
  if (!hash) return "0x...pending";
  const normalized = hash.startsWith("0x") ? hash : `0x${hash}`;
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`;
}

export function formatTransactionHash(hash?: string | null) {
  if (!hash) return "Pending receipt hash";
  const normalized = hash.startsWith("0x") ? hash : `0x${hash}`;
  if (normalized.length <= 18) return normalized;
  return `${normalized.slice(0, 10)}...${normalized.slice(-8)}`;
}

export function formatSoldAmount(amountMinor?: number | null, currency = "GHS") {
  if (!amountMinor) return "Amount private";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function normalizeSoldAnnouncement(row: any): SoldPropertyAnnouncement {
  return {
    id: row.id,
    listingId: row.listing_id,
    propertyId: row.property_id,
    organizationId: row.organization_id || null,
    transactionId: row.transaction_id,
    propertyLabel: row.property_label || "Sold property",
    city: row.city || null,
    region: row.region || null,
    listingType: row.listing_type || "sale",
    soldAmountMinor:
      typeof row.sold_amount_minor === "number" ? row.sold_amount_minor : Number(row.sold_amount_minor || 0) || null,
    currency: row.currency || "GHS",
    buyerHash: row.buyer_hash || "",
    receiptHash: row.receipt_hash || null,
    verificationUrl: row.verification_url || null,
    announcedAt: row.announced_at || row.created_at || new Date().toISOString(),
    metadata: row.metadata || {},
  };
}

export const soldAnnouncementService = {
  async getRecentAnnouncements(limit = 24, offset = 0): Promise<SoldAnnouncementFeedResult> {
    const { data, error, count } = await (supabase as any)
      .from("sold_property_announcements")
      .select(SOLD_ANNOUNCEMENT_SELECT, { count: "exact" })
      .order("announced_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const message = String(error.message || "");
      if (
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        message.includes("sold_property_announcements")
      ) {
        return { announcements: [], total: 0, unavailable: true };
      }

      throw error;
    }

    const announcements = (data || []).map(normalizeSoldAnnouncement);
    return {
      announcements,
      total: count ?? announcements.length,
      unavailable: false,
    };
  },
};
