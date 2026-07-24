import { Link } from "react-router";
import { CreditCard, Home, MapPin, Search } from "lucide-react";
import type { ReactNode } from "react";

function SearchSegment({
  icon: Icon,
  label,
  htmlFor,
  children,
  className = "",
}: {
  icon: typeof MapPin;
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`search-segment search-segment-icon ${className}`}>
      <Icon className="search-segment-icon-svg h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="search-segment-label">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

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
  return (
    <div className="search-pill min-w-0 w-full max-w-full">
      <SearchSegment icon={MapPin} label="Where" htmlFor="search-location">
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          placeholder="Search destinations"
          className="search-segment-value"
        />
      </SearchSegment>

      <div className="search-divider" />

      <SearchSegment icon={Home} label="Type" htmlFor="search-type">
        <select
          id="search-type"
          value={propertyType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="search-segment-value cursor-pointer"
        >
          <option value="any">Any type</option>
          <option value="apartment">Apartments</option>
          <option value="house">Houses</option>
          <option value="commercial">Commercial</option>
          <option value="land">Land</option>
        </select>
      </SearchSegment>

      <div className="search-divider hidden xl:block" />

      <SearchSegment
        icon={CreditCard}
        label="Budget"
        htmlFor="search-budget"
        className="hidden xl:flex"
      >
        <input
          id="search-budget"
          type="text"
          value={budget}
          onChange={(e) => onBudgetChange?.(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          placeholder="Any"
          className="search-segment-value"
        />
      </SearchSegment>

      <button type="button" className="search-orb shrink-0" aria-label="Search" onClick={onSearch}>
        <Search className="h-5 w-5" />
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
  const locationLabel = location.trim() || "Anywhere";
  const typeLabel =
    propertyType === "any"
      ? "Any type"
      : propertyType.charAt(0).toUpperCase() + propertyType.slice(1);
  const budgetLabel = budget.trim() || "Any";

  return (
    <Link to={to} className="compact-search-pill">
      <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">
        <span className="font-semibold text-ink">{locationLabel}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{typeLabel}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{budgetLabel}</span>
      </div>
      <span className="search-orb mr-0 h-9 w-9">
        <Search className="h-4 w-4" />
      </span>
    </Link>
  );
}
