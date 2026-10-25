import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { Link } from "react-router";
import { ChevronDown, CreditCard, Home, MapPin, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../../i18n/LocaleContext";

function SearchSegment({
  icon: Icon,
  label,
  htmlFor,
  children,
  className = "",
  onClear,
  hasValue = false,
}: {
  icon: typeof MapPin;
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
  onClear?: () => void;
  hasValue?: boolean;
}) {
  return (
    <div className={`search-segment search-segment-icon group ${className}`}>
      <Icon className="search-segment-icon-svg h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="search-segment-label cursor-pointer select-none">
          {label}
        </label>
        {children}
      </div>
      {onClear && hasValue && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="relative z-10 hidden rounded-full p-1 text-ink-muted hover:bg-surface-hover hover:text-ink group-hover:inline-flex transition-colors"
          aria-label="Clear input"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

const PROPERTY_TYPE_KEYS: Record<string, string> = {
  any: "search.anyType",
  apartment: "search.apartments",
  house: "search.houses",
  commercial: "search.commercial",
  land: "search.land",
};

interface SearchPillProps {
  location: string;
  onLocationChange: (value: string) => void;
  propertyType: string;
  onTypeChange: (value: string) => void;
  budget?: string;
  onBudgetChange?: (value: string) => void;
  onSearch?: () => void;
}

export function SearchPill({
  location,
  onLocationChange,
  propertyType,
  onTypeChange,
  budget = "",
  onBudgetChange,
  onSearch,
}: SearchPillProps) {
  const { t } = useTranslation();

  return (
    <div className="search-pill min-w-0 w-full max-w-full">
      <SearchSegment
        icon={MapPin}
        label={t("search.where")}
        htmlFor="search-location"
        hasValue={Boolean(location.trim())}
        onClear={() => onLocationChange("")}
      >
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          placeholder={t("search.searchDestinations")}
          className="search-segment-value"
        />
      </SearchSegment>

      <div className="search-divider" />

      <SearchSegment icon={Home} label={t("search.type")} htmlFor="search-type">
        <div className="relative flex items-center">
          <NativeSelectControl
            id="search-type"
            value={propertyType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="search-segment-value cursor-pointer appearance-none pr-5"
          >
            {Object.entries(PROPERTY_TYPE_KEYS).map(([value, key]) => (
              <option key={value} value={value} className="bg-surface text-ink py-1">
                {t(key)}
              </option>
            ))}
          </NativeSelectControl>
          <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-ink-muted opacity-70" />
        </div>
      </SearchSegment>

      <div className="search-divider hidden xl:block" />

      <SearchSegment
        icon={CreditCard}
        label={t("search.budget")}
        htmlFor="search-budget"
        className="hidden xl:flex"
        hasValue={Boolean(budget.trim())}
        onClear={() => onBudgetChange?.("")}
      >
        <input
          id="search-budget"
          type="text"
          inputMode="decimal"
          value={budget}
          onChange={(e) => onBudgetChange?.(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          placeholder={t("search.any")}
          className="search-segment-value"
        />
      </SearchSegment>

      <button
        type="button"
        className="search-orb shrink-0 group"
        aria-label={t("search.search")}
        onClick={onSearch}
      >
        <Search className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110 group-active:scale-90" />
      </button>
    </div>
  );
}

export function CompactSearch({
  location = "",
  propertyType = "any",
  budget = "",
  to = "/search",
}: {
  location?: string;
  propertyType?: string;
  budget?: string;
  to?: string;
} = {}) {
  const { t } = useTranslation();
  const locationLabel = location.trim() || t("search.anywhere");
  const typeLabel = t(PROPERTY_TYPE_KEYS[propertyType] ?? PROPERTY_TYPE_KEYS.any);
  const budgetLabel = budget.trim() || t("search.any");

  return (
    <Link to={to} className="compact-search-pill group">
      <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">
        <span className="font-semibold text-ink">{locationLabel}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{typeLabel}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{budgetLabel}</span>
      </div>
      <span className="search-orb mr-0 h-9 w-9 group-hover:scale-105">
        <Search className="h-4 w-4" />
      </span>
    </Link>
  );
}

