/** Maximum price in the listing's displayed currency. Blank/invalid input is unset. */
export function parseMaximumBudget(value: string): number | null {
  const normalized = value.trim().replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
