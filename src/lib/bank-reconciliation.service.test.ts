import { describe, expect, it } from "vitest";
import { rankBankPaymentCandidates } from "./bank-reconciliation.service";

describe("bank reconciliation matching", () => {
  it("prioritizes an exact bank reference over an earlier amount-only candidate", () => {
    const match = rankBankPaymentCandidates(
      { amount_minor: -12500, transaction_date: "2026-08-20", bank_reference: "PAY-42" },
      [
        { id: "amount-only", amount_minor: 12500, received_at: "2026-08-20" },
        { id: "exact-reference", amount_minor: 12500, received_at: "2026-08-21", provider_reference: "PAY-42" },
      ]
    );

    expect(match?.id).toBe("exact-reference");
  });

  it("does not reuse a payment already matched in the statement", () => {
    const match = rankBankPaymentCandidates(
      { amount_minor: -5000, transaction_date: "2026-08-20", bank_reference: undefined },
      [{ id: "already-used", amount_minor: 5000, received_at: "2026-08-20" }],
      new Set(["already-used"])
    );

    expect(match).toBeUndefined();
  });
});