import { describe, expect, it } from "vitest";
import {
  formatBuyerHash,
  formatSoldAmount,
  formatTransactionHash,
  normalizeSoldAnnouncement,
} from "./sold-announcement.service";

describe("sold announcement helpers", () => {
  it("formats proof hashes without exposing the full buyer id", () => {
    expect(formatBuyerHash("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x123456...345678"
    );
    expect(formatTransactionHash("abcdef1234567890abcdef1234567890abcdef12")).toBe(
      "0xabcdef12...abcdef12"
    );
  });

  it("normalizes public sold announcement rows", () => {
    const announcement = normalizeSoldAnnouncement({
      id: "sale-1",
      listing_id: "listing-1",
      property_id: "property-1",
      organization_id: "org-1",
      transaction_id: "transaction-1",
      property_label: "Cantonments townhouse",
      city: "Accra",
      region: "Greater Accra",
      sold_amount_minor: "125000000",
      currency: "GHS",
      buyer_hash: "0xabc",
      receipt_hash: "abc123",
      announced_at: "2026-05-16T12:00:00.000Z",
      metadata: { organizationName: "Prime Homes" },
    });

    expect(announcement).toMatchObject({
      listingId: "listing-1",
      propertyLabel: "Cantonments townhouse",
      soldAmountMinor: 125000000,
      buyerHash: "0xabc",
      receiptHash: "abc123",
    });
    expect(formatSoldAmount(announcement.soldAmountMinor, announcement.currency)).toContain(
      "1,250,000"
    );
  });

});
