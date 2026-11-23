export type CurrencyAmount = { amount: number; currency?: string | null };

export function formatCurrencyAmount(amount: number, currency?: string | null): string {
  const normalized = currency?.trim().toUpperCase();
  const number = Number.isFinite(amount) ? amount : 0;
  if (!normalized) return `Unspecified currency ${number.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: normalized,
      maximumFractionDigits: 0,
    }).format(number);
  } catch {
    return `${normalized} ${number.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
  }
}

export function summarizeByCurrency(rows: CurrencyAmount[]): { headline: string; breakdown: string } {
  if (!rows.length) return { headline: "—", breakdown: "No recorded amounts" };
  const totals = new Map<string, number>();
  for (const { amount, currency } of rows) {
    if (!Number.isFinite(amount)) continue;
    const key = currency?.trim().toUpperCase() || "";
    totals.set(key, (totals.get(key) || 0) + amount);
  }
  const parts = [...totals.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (!parts.length) return { headline: "—", breakdown: "No valid amounts" };
  if (parts.length === 1) {
    return { headline: formatCurrencyAmount(parts[0][1], parts[0][0]), breakdown: "" };
  }
  return {
    headline: `${parts.length} currencies`,
    breakdown: parts.map(([currency, total]) => formatCurrencyAmount(total, currency)).join(" · "),
  };
}
