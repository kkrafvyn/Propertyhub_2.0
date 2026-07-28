import { describe, expect, it } from "vitest";
import {
  PAYSTACK_CHECKOUT_PROVIDER_IDS,
  clientIntegrations,
  getIntegrationSummary,
} from "./integrations";

describe("integrations", () => {
  it("includes paystack in live checkout provider ids", () => {
    expect(PAYSTACK_CHECKOUT_PROVIDER_IDS.has("paystack")).toBe(true);
    expect(PAYSTACK_CHECKOUT_PROVIDER_IDS.has("mtn_momo")).toBe(true);
  });

  it("returns integration summary entries", () => {
    const summary = getIntegrationSummary();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.some((item) => item.label === "Supabase")).toBe(true);
  });

  it("detects supabase from test env", () => {
    expect(clientIntegrations.supabase.configured).toBe(true);
  });
});
