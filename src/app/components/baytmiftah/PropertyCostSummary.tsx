interface PropertyCostSummaryProps {
  currency: string;
  price: number;
  listingType: string;
  minimumDeposit?: number | null;
  inspectionFee?: number | null;
}
export function PropertyCostSummary({ currency, price, listingType, minimumDeposit, inspectionFee }: PropertyCostSummaryProps) {
  const format = (value: number) => `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const rateLabel = listingType === "rental" ? "Monthly rent" : listingType === "short_stay" ? "Nightly rate" : listingType === "lease" ? "Lease term price" : "Asking price";
  return <section aria-label="Price details" className="my-5 rounded-xl border border-surface-border bg-surface-subtle p-4">
    <h2 className="mb-3 text-base font-semibold text-ink">Price details</h2>
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4"><dt className="text-ink-secondary">{rateLabel}</dt><dd className="text-end font-semibold text-ink">{format(price)}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Minimum deposit listed</dt><dd className="text-end text-ink">{minimumDeposit != null ? format(minimumDeposit) : "Not specified"}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Inspection fee</dt><dd className="text-end text-ink">{inspectionFee != null ? format(inspectionFee) : "Not specified"}</dd></div>
    </dl>
    <p className="mt-4 border-t border-surface-border pt-3 text-xs leading-relaxed text-ink-secondary">Ask the listing team to confirm the payment schedule and whether deposits are credited toward the price before agreeing to a total.</p>
  </section>;
}
