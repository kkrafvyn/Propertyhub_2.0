import { describe, expect, it } from "vitest";
import { parseMaximumBudget } from "./marketplace-budget";
describe("maximum marketplace budget", () => {
  it("preserves numeric limits and cents instead of matching formatted price text", () => {
    expect(parseMaximumBudget("4,500.50")).toBe(4500.5);
    expect(parseMaximumBudget(" 1500 ")).toBe(1500);
    expect(parseMaximumBudget("0")).toBe(0);
  });
  it("does not turn invalid or missing values into unintended price limits", () => {
    for (const input of ["", "any", "-50", "1.2.3", "Infinity", "5k"])
      expect(parseMaximumBudget(input)).toBeNull();
  });
});
