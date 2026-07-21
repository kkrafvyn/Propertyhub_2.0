import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CurrencyCode = "GHS" | "USD";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (amount: number, opts?: { perMonth?: boolean }) => string;
}

const RATES: Record<CurrencyCode, number> = { GHS: 1, USD: 1 / 15.5 };

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "GHS",
  setCurrency: () => {},
  formatPrice: (n) => `GHS ${n}`,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      return (localStorage.getItem("baytmiftah_currency") as CurrencyCode) || "GHS";
    } catch {
      return "GHS";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("baytmiftah_currency", currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency: setCurrencyState,
      formatPrice(amount, opts = {}) {
        const n = Number(amount) || 0;
        if (currency === "USD") {
          const usd = n * RATES.USD;
          const formatted = usd.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          });
          return opts.perMonth ? `$${formatted} / mo` : `$${formatted}`;
        }
        return opts.perMonth
          ? `GHS ${n.toLocaleString()} / month`
          : `GHS ${n.toLocaleString()}`;
      },
    }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
