import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("payment boundary hardening", () => {
  it("charges a booking from its locked server-side amount", () => {
    const source = read("supabase/functions/initialize-payangels-payment/index.ts");
    expect(source).toContain("total_minor, currency, check_in, check_out, nights, transaction_id");
    expect(source).toContain("Payment amount does not match the locked booking total");
    expect(source).toContain('purpose !== "booking_fee"');
  });

  it("derives disbursement recipients from verified server records", () => {
    const source = read("supabase/functions/initiate-payangels-disbursement/index.ts");
    expect(source).not.toMatch(/body\?\.phone/);
    expect(source).toContain('from("owner_payout_methods")');
    expect(source).toContain("ghana_card_verified");
    expect(source).toContain("payout_destination_verified_at");
  });

  it("keeps the generic refund endpoint finance-only", () => {
    const source = read("supabase/functions/initiate-payangels-refund/index.ts");
    expect(source).not.toContain("isGuestBookingRefund");
    expect(source).toContain('"finance:write"');
  });

  it("matches successful payments to every booking boundary", () => {
    const source = read("supabase/functions/_shared/payment-reconciliation.ts");
    expect(source).toContain("Payment does not match the locked booking details");
    expect(source).toContain('.eq("status", "pending")');
    expect(source).toContain('.is("transaction_id", null)');
  });

  it("fails closed until the real PayAngel contract is configured", () => {
    const provider = read("supabase/functions/_shared/payangels.ts");
    const readiness = read("scripts/production-check.mjs");
    const exampleEnv = read(".env.example");

    expect(provider).not.toContain('|| "https://api.paystack.co"');
    expect(provider).toContain("PAYANGELS_API_CONTRACT_VERIFIED");
    expect(provider).toContain("paystack\\.co");
    expect(readiness).toContain("Primary payment rail (PayAngel) is not live-certified");
    expect(readiness).toContain("PAYANGELS_LIVE_CERTIFIED");
    expect(exampleEnv).toMatch(/^PAYANGELS_API_BASE=\r?$/m);
    expect(exampleEnv).toContain("VITE_PAYANGELS_CONFIGURED=false");
  });
});
