import { describe, expect, it } from "vitest";
import {
  PAYANGELS_CHECKOUT_PROVIDER_IDS,
  clientIntegrations,
  getIntegrationSummary,
} from "./integrations";

describe("integrations", () => {
  it("includes payangels in live checkout provider ids", () => {
    expect(PAYANGELS_CHECKOUT_PROVIDER_IDS.has("payangels")).toBe(true);
    expect(PAYANGELS_CHECKOUT_PROVIDER_IDS.has("mtn_momo")).toBe(true);
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
