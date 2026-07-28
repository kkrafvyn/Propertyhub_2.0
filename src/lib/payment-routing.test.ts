import { describe, expect, it } from "vitest";
import { resolvePaymentContext } from "./payment-routing.service";

describe("payment-routing.service", () => {
  it("routes Ghana properties to Paystack and GHS", () => {
    const ctx = resolvePaymentContext({
      country: "Ghana",
      city: "Accra",
      currency: "GHS",
    });

    expect(ctx.jurisdictionId).toBe("GH");
    expect(ctx.primaryProvider).toBe("paystack");
    expect(ctx.currency).toBe("GHS");
    expect(ctx.region).toBe("GH");
  });

  it("routes US properties to Stripe and USD", () => {
    const ctx = resolvePaymentContext({
      country: "United States",
      city: "New York",
    });

    expect(ctx.jurisdictionId).toBe("US");
    expect(ctx.primaryProvider).toBe("stripe");
    expect(ctx.currency).toBe("USD");
  });

  it("routes UK properties to Stripe and GBP", () => {
    const ctx = resolvePaymentContext({
      country: "United Kingdom",
      city: "London",
    });

    expect(ctx.jurisdictionId).toBe("GB");
    expect(ctx.primaryProvider).toBe("stripe");
    expect(ctx.currency).toBe("GBP");
  });

  it("routes Nigeria properties to Paystack", () => {
    const ctx = resolvePaymentContext({
      country: "Nigeria",
      city: "Lagos",
    });

    expect(ctx.jurisdictionId).toBe("NG");
    expect(ctx.primaryProvider).toBe("paystack");
    expect(ctx.currency).toBe("NGN");
  });
});
