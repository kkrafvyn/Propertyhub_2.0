import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { currencyService } from "../../lib/currency.service";
import { formatMoneyMajor } from "../../lib/currency-format";

type DisplayCurrency = string;

interface CurrencyContextValue {
  currency: DisplayCurrency;
  baseCurrency: DisplayCurrency;
  setCurrency: (code: DisplayCurrency) => void;
  setBaseCurrency: (code: DisplayCurrency) => void;
  formatPrice: (amount: number, opts?: { perMonth?: boolean; currency?: string }) => string;
  ratesLoading: boolean;
}

const FALLBACK_USD_RATE = 1 / 15.5;

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "GHS",
  baseCurrency: "GHS",
  setCurrency: () => {},
  setBaseCurrency: () => {},
  formatPrice: (n) => `GHS ${n}`,
  ratesLoading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState<DisplayCurrency>("GHS");
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => {
    try {
      return localStorage.getItem("baytmiftah_currency") || "GHS";
    } catch {
      return "GHS";
    }
  });
  const [ghsToUsd, setGhsToUsd] = useState(FALLBACK_USD_RATE);
  const [ratesLoading, setRatesLoading] = useState(true);

  const setBaseCurrency = (code: DisplayCurrency) => {
    const next = code.trim().toUpperCase();
    setBaseCurrencyState(next);
    setCurrencyState(next);
  };

  const setCurrency = (code: DisplayCurrency) => {
    setCurrencyState(code.trim().toUpperCase());
  };

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
      baseCurrency,
      setCurrency,
      setBaseCurrency,
      ratesLoading,
      formatPrice(amount, opts = {}) {
        const n = Number(amount) || 0;
        const listingCurrency = (opts.currency || baseCurrency).toUpperCase();
        const displayCurrency = currency.toUpperCase();

        if (displayCurrency === "USD" && listingCurrency === "GHS") {
          const usd = n * ghsToUsd;
          return formatMoneyMajor(usd, "USD", undefined, opts);
        }

        if (displayCurrency !== listingCurrency && listingCurrency === "GHS" && displayCurrency === "USD") {
          return formatMoneyMajor(n * ghsToUsd, "USD", undefined, opts);
        }

        return formatMoneyMajor(n, displayCurrency, undefined, opts);
      },
    }),
    [currency, baseCurrency, ghsToUsd, ratesLoading]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
