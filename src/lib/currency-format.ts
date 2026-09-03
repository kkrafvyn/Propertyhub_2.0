import { PAYANGELS_SUPPORTED_CURRENCIES } from "./country-rules/payangels-rails";

export type MarketCurrency = (typeof PAYANGELS_SUPPORTED_CURRENCIES)[number] | string;

/** Format major units (e.g. listing price 2500 GHS). */
export function formatMoneyMajor(
  amount: number,
  currency: MarketCurrency,
  locale = "en",
  opts?: { perMonth?: boolean }
): string {
  const code = String(currency || "USD").toUpperCase();
  const n = Number(amount) || 0;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: code === "JPY" ? 0 : 2,
    }).format(n);
  } catch {
    formatted = `${code} ${n.toLocaleString(locale)}`;
  }
  return opts?.perMonth ? `${formatted} / mo` : formatted;
}

/** Format minor units (pesewas, cents). */
export function formatMoneyMinor(
  amountMinor: number,
  currency: MarketCurrency,
  locale = "en",
  opts?: { perMonth?: boolean }
): string {
  return formatMoneyMajor((Number(amountMinor) || 0) / 100, currency, locale, opts);
}

export function isPayAngelsCurrency(code: string): boolean {
  return (PAYANGELS_SUPPORTED_CURRENCIES as readonly string[]).includes(code.toUpperCase());
}
