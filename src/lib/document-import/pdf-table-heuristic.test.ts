import { describe, expect, it } from "vitest";
import { matrixFromPdfText } from "./pdf-table-heuristic";

describe("matrixFromPdfText", () => {
  it("detects bank-style columns", () => {
    const text = `Date,Description,Amount,Type,Reference
2024-01-01,Rent payment,1200,DEBIT,REF1
2024-01-02,Deposit,500,CREDIT,REF2`;
    const { matrix, confidence } = matrixFromPdfText(text, "bank_feed");
    expect(matrix.length).toBeGreaterThan(2);
    expect(confidence).toBeGreaterThan(0.4);
  });
});
