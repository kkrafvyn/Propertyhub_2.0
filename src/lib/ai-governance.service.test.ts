import { describe, expect, it } from "vitest";
import { aiGovernanceService, canExecuteAiAction } from "./ai-governance.service";

describe("AI governance controls", () => {
  it("allows a kill switch while preserving a non-negative action budget", () => {
    const control = { enabled: false, dailyActionBudget: 0, actionCount: 0 };
    expect(canExecuteAiAction(control)).toBe(false);
    expect(control.dailyActionBudget).toBeGreaterThanOrEqual(0);
  });

  it("blocks actions once the daily budget is exhausted", () => {
    const control = { enabled: true, dailyActionBudget: 5, actionCount: 6 };
    expect(canExecuteAiAction(control)).toBe(false);
  });

  it("allows actions within budget when governance is enabled", () => {
    const control = { enabled: true, dailyActionBudget: 10, actionCount: 3 };
    expect(canExecuteAiAction(control)).toBe(true);
    expect(aiGovernanceService.evaluateFromControl(control)).toBe(true);
  });
});