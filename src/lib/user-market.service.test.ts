import { describe, expect, it } from "vitest";
import {
  buildUserMarket,
  getDisplayCurrencyForMarket,
  getMarketSummary,
  marketFromAuthMetadata,
} from "./user-market.service";

describe("user-market.service", () => {
  it("builds a Ghana market with Paystack currency", () => {
    const market = buildUserMarket("GH", 0);
    expect(market.country).toBe("Ghana");
    expect(market.city).toBe("Accra");
    expect(market.searchLocation).toBe("Accra, Ghana");
    expect(market.currency).toBe("GHS");
  });

  it("builds a US market with Stripe currency", () => {
    const market = buildUserMarket("US", 0);
    expect(market.currency).toBe("USD");
    expect(getDisplayCurrencyForMarket(market)).toBe("USD");
  });

  it("summarizes compliance and payment context", () => {
    const market = buildUserMarket("NG", 0);
    const summary = getMarketSummary(market);
    expect(summary.jurisdictionLabel).toBe("Nigeria");
    expect(summary.paymentProvider).toBe("Paystack");
    expect(summary.currency).toBe("NGN");
  });

  it("hydrates market from auth metadata", () => {
    const market = marketFromAuthMetadata({
      market_jurisdiction: "KE",
      market_city: "Nairobi",
      market_region: "Nairobi",
    });
    expect(market?.jurisdictionId).toBe("KE");
    expect(market?.city).toBe("Nairobi");
  });
});
