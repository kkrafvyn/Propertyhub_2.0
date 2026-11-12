import { describe, expect, it } from "vitest";
import { assertPayAngelsAmountMatch, normalizePayAngelsAmountMinor } from "./payangels-amount";

describe("payangels amount normalization", () => {
  it("accepts minor units directly", () => {
    expect(normalizePayAngelsAmountMinor(25000, 25000)).toBe(25000);
  });

  it("converts major units when provider returns major", () => {
    expect(normalizePayAngelsAmountMinor(250, 25000)).toBe(25000);
  });

  it("asserts matching amounts after normalization", () => {
    expect(() =>
      assertPayAngelsAmountMatch({ expectedMinor: 25000, providerAmount: 25000 })
    ).not.toThrow();
    expect(() =>
      assertPayAngelsAmountMatch({ expectedMinor: 25000, providerAmount: 250 })
    ).not.toThrow();
  });

  it("rejects mismatched amounts", () => {
    expect(() =>
      assertPayAngelsAmountMatch({ expectedMinor: 25000, providerAmount: 30000 })
    ).toThrow(/does not match/);
  });
});
