import { describe, expect, it } from "vitest";
import { formatCurrencyAmount, summarizeByCurrency } from "./currency-summary";

describe("currency summaries", () => {
  it("displays one currency as an amount", () => {
    const summary = summarizeByCurrency([
      { amount: 500, currency: "GHS" },
      { amount: 250, currency: "ghs" },
    ]);
    expect(summary.headline).toMatch(/750/);
    expect(summary.breakdown).toBe("");
  });
  it("never adds USD to GHS as if it were the same currency", () => {
    const summary = summarizeByCurrency([
      { amount: 100, currency: "GHS" },
      { amount: 200, currency: "USD" },
    ]);
    expect(summary.headline).toBe("2 currencies");
    expect(summary.breakdown).toMatch(/GH₵|GHS/);
    expect(summary.breakdown).toMatch(/US\$|USD/);
    expect(summary.breakdown).not.toMatch(/GHS\s*300|GH₵\s*300/);
  });
  it("does not pretend missing/invalid currency is GHS", () => {
    expect(formatCurrencyAmount(10, null)).toContain("Unspecified currency");
    expect(formatCurrencyAmount(10, "NOT-A-CURRENCY")).toContain("NOT-A-CURRENCY");
    expect(summarizeByCurrency([]).headline).toBe("—");
  });
});
