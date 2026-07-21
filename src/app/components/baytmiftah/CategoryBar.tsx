import {
  Building2,
  Home,
  LayoutGrid,
  Map,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const categoryIds = ["all", "apartment", "house", "commercial", "verified"] as const;

const categoryIcons: Record<(typeof categoryIds)[number], LucideIcon> = {
  all: LayoutGrid,
  apartment: Building2,
  house: Home,
  commercial: Building2,
  verified: ShieldCheck,
};

const categoryLabels: Record<(typeof categoryIds)[number], string> = {
  all: "All",
  apartment: "Apartments",
  house: "Houses",
  commercial: "Commercial",
  verified: "Verified",
};

interface CategoryBarProps {
  active: string;
  onChange: (id: string) => void;
  onFiltersClick?: () => void;
  mapMode?: boolean;
  onToggleMap?: () => void;
  showMapToggle?: boolean;
}

export function CategoryBar({
  active,
  onChange,
  onFiltersClick,
  mapMode = false,
  onToggleMap,
  showMapToggle = true,
}: CategoryBarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="listing-scroll min-w-0 flex-1 lg:justify-start">
        {categoryIds.map((id) => {
          const Icon = categoryIcons[id];
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`category-chip ${isActive ? "active" : ""}`}
            >
              <Icon
                className={`h-6 w-6 shrink-0 ${isActive ? "text-ink" : "text-ink-secondary"}`}
              />
              <span
                className={`whitespace-nowrap text-xs font-medium sm:text-[13px] ${isActive ? "text-ink" : "text-ink-secondary"}`}
              >
                {categoryLabels[id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="desktop-category-row flex shrink-0 items-center gap-2 sm:gap-3 sm:border-s sm:border-white/15 sm:ps-4">
        {onFiltersClick && (
          <button type="button" onClick={onFiltersClick} className="filter-chip">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        )}
        {showMapToggle && onToggleMap && (
          <button
            type="button"
            onClick={onToggleMap}
            className={`filter-chip ${mapMode ? "bg-ink text-white hover:bg-ink/90" : ""}`}
          >
            <Map className="h-4 w-4" />
            {mapMode ? "Show list" : "Show map"}
          </button>
        )}
      </div>
    </div>
  );
}
