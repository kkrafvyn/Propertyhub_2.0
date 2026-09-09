import { describe, expect, it } from "vitest";
import { assertPaystackAmountMatch, normalizePaystackAmountMinor } from "./paystack-amount";

describe("paystack amount normalization", () => {
  it("accepts minor units directly", () => {
    expect(normalizePaystackAmountMinor(25000, 25000)).toBe(25000);
  });

  it("converts major units when provider returns major", () => {
    expect(normalizePaystackAmountMinor(250, 25000)).toBe(25000);
  });

  it("asserts matching amounts after normalization", () => {
    expect(() =>
      assertPaystackAmountMatch({ expectedMinor: 25000, paystackAmount: 25000 })
    ).not.toThrow();
    expect(() =>
      assertPaystackAmountMatch({ expectedMinor: 25000, paystackAmount: 250 })
    ).not.toThrow();
  });

  it("rejects mismatched amounts", () => {
    expect(() =>
      assertPaystackAmountMatch({ expectedMinor: 25000, paystackAmount: 30000 })
    ).toThrow(/does not match/);
  });
});
