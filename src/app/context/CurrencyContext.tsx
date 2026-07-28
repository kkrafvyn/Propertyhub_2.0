import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { currencyService } from "../../lib/currency.service";

type CurrencyCode = "GHS" | "USD";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (amount: number, opts?: { perMonth?: boolean }) => string;
  ratesLoading: boolean;
}

const FALLBACK_USD_RATE = 1 / 15.5;

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "GHS",
  setCurrency: () => {},
  formatPrice: (n) => `GHS ${n}`,
  ratesLoading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      return (localStorage.getItem("baytmiftah_currency") as CurrencyCode) || "GHS";
    } catch {
      return "GHS";
    }
  });
  const [ghsToUsd, setGhsToUsd] = useState(FALLBACK_USD_RATE);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem("baytmiftah_currency", currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  useEffect(() => {
    let cancelled = false;

    const loadRate = async () => {
      try {
        const rate = await currencyService.getExchangeRate("GHS", "USD");
        if (!cancelled && Number.isFinite(rate) && rate > 0) {
          setGhsToUsd(rate);
        }
      } catch {
        if (!cancelled) setGhsToUsd(FALLBACK_USD_RATE);
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    };

    void loadRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency: setCurrencyState,
      ratesLoading,
      formatPrice(amount, opts = {}) {
        const n = Number(amount) || 0;
        if (currency === "USD") {
          const usd = n * ghsToUsd;
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
    [currency, ghsToUsd, ratesLoading]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
