import { Link } from "react-router";
import { ArrowDownWideNarrow, BedDouble, Map, ShieldCheck, type LucideIcon } from "lucide-react";

/**
 * Keep the existing transaction/property filters when adding a quick filter.
 * Actual results are resolved by /search; no availability or fee estimates.
 */
export function mobileBookingFilterUrl(baseUrl: string, updates: Record<string, string>) {
  const [path, query = ""] = baseUrl.split("?");
  const params = new URLSearchParams(query);
  Object.entries(updates).forEach(([key, value]) => params.set(key, value));
  params.delete("page");
  return `${path}?${params.toString()}`;
}

export function MobileBookingQuickFilters({ searchBaseUrl }: { searchBaseUrl: string }) {
  const options: Array<{ label: string; values: Record<string, string>; icon: LucideIcon }> = [
    { label: "2+ bedrooms", values: { bedrooms: "2" }, icon: BedDouble },
    { label: "Verified organizations", values: { verified: "1" }, icon: ShieldCheck },
    { label: "Lowest price", values: { sort: "price_asc" }, icon: ArrowDownWideNarrow },
    { label: "Explore map", values: { view: "map" }, icon: Map },
  ];

  return (
    <section aria-label="Quick property filters" className="mb-4">
      <div className="mb-2 flex items-center justify-between px-4">
        <p className="text-xs font-semibold text-ink-secondary">Find the right fit</p>
        <span className="text-[11px] text-ink-muted">Tap to filter</span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map(({ label, values, icon: Icon }) => (
          <Link
            key={label}
            to={mobileBookingFilterUrl(searchBaseUrl, values)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-surface-border bg-surface px-3.5 text-xs font-semibold text-ink transition-colors hover:border-primary/50 hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Icon className="h-4 w-4 text-mobile-forest" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
