import { useEffect, useState } from "react";
import { currencyService } from "../../lib/currency.service";

interface DiasporaPriceProps {
  amount: number;
  currency?: string | null;
  suffix?: string;
  size?: "sm" | "md" | "lg";
}

const TARGET_CURRENCIES = ["USD", "GBP"] as const;

function formatCurrency(amount: number, currency: string) {
  return currencyService.formatCurrency(amount, currency, currency === "GHS" ? "en-GH" : "en-US");
}

export function DiasporaPrice({
  amount,
  currency = "GHS",
  suffix = "",
  size = "md",
}: DiasporaPriceProps) {
  const baseCurrency = (currency || "GHS").toUpperCase();
  const [converted, setConverted] = useState<Array<{ currency: string; amount: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    const loadConversions = async () => {
      if (!Number.isFinite(amount) || amount <= 0) {
        setConverted([]);
        return;
      }

      const targets = TARGET_CURRENCIES.filter((target) => target !== baseCurrency);
      const nextValues = await Promise.all(
        targets.map(async (target) => ({
          currency: target,
          amount: await currencyService.convertCurrency(amount, baseCurrency, target),
        }))
      );

      if (!cancelled) {
        setConverted(nextValues);
      }
    };

    void loadConversions();

    return () => {
      cancelled = true;
    };
  }, [amount, baseCurrency]);

  const mainSize =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div>
      <div className={`${mainSize} font-semibold text-primary`}>
        {formatCurrency(amount, baseCurrency)}
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      {converted.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Diaspora guide:{" "}
          {converted
            .map((item) => formatCurrency(item.amount, item.currency))
            .join(" / ")}
        </p>
      ) : null}
    </div>
  );
}
