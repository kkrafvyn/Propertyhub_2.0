import { csvCell, csvHeaderMap } from "./csv-parse";

export type BankFeedTransactionDraft = {
  date: string;
  description: string;
  amount: string;
  type: "DEBIT" | "CREDIT";
  reference: string;
};

function pickCell(row: string[], map: Record<string, number>, keys: string[]) {
  for (const key of keys) {
    const value = csvCell(row, map, key);
    if (value) return value;
  }
  return "";
}

/** Parse a mapped bank feed matrix (canonical or legacy header row). */
export function parseBankFeedTable(matrix: string[][]): BankFeedTransactionDraft[] {
  const rows = matrix.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length <= 1) return [];

  const map = csvHeaderMap(rows[0]);

  return rows.slice(1).map((columns) => {
    const amountCell = pickCell(columns, map, ["amount", "value", "debit", "credit"]) || "0";
    const rawType = pickCell(columns, map, ["type", "direction", "dr_cr"]).toUpperCase();
    const amount = Number(amountCell.replace(/[^0-9.-]/g, "")) || 0;
    const inferredType =
      rawType.includes("CREDIT") || rawType === "CR" || amountCell.startsWith("+")
        ? "CREDIT"
        : rawType.includes("DEBIT") || rawType === "DR" || amountCell.startsWith("-")
          ? "DEBIT"
          : amount >= 0
            ? "DEBIT"
            : "CREDIT";

    return {
      date:
        pickCell(columns, map, ["date", "transaction_date", "posted_date"]) ||
        new Date().toISOString().slice(0, 10),
      description: pickCell(columns, map, ["description", "narration", "details"]) || "Imported bank line",
      amount: String(Math.abs(amount)),
      type: inferredType,
      reference: pickCell(columns, map, ["reference", "bank_reference", "ref"]),
    };
  });
}
