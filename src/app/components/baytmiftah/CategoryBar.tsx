import {
  Building,
  Building2,
  Home,
  LayoutGrid,
  Map,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "../../i18n/LocaleContext";

const categoryIds = ["all", "apartment", "house", "commercial", "verified"] as const;

const categoryIcons: Record<(typeof categoryIds)[number], LucideIcon> = {
  all: LayoutGrid,
  apartment: Building2,
  house: Home,
  commercial: Building,
  verified: ShieldCheck,
};

const categoryLabelKeys: Record<(typeof categoryIds)[number], string> = {
  all: "categoryBar.all",
  apartment: "categoryBar.apartment",
  house: "categoryBar.house",
  commercial: "categoryBar.commercial",
  verified: "categoryBar.verified",
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
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div
        className="listing-scroll min-w-0 flex-1 lg:justify-start"
        role="tablist"
        aria-label={t("categoryBar.label")}
      >
        {categoryIds.map((id) => {
          const Icon = categoryIcons[id];
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className={`category-chip ${isActive ? "active" : ""}`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${isActive ? "text-ink" : "text-ink-secondary"}`}
              />
              <span
                className={`max-w-[5.5rem] truncate text-center text-[11px] font-medium leading-tight sm:max-w-none sm:text-xs sm:whitespace-nowrap md:text-[13px] ${isActive ? "text-ink" : "text-ink-secondary"}`}
              >
                {t(categoryLabelKeys[id])}
              </span>
            </button>
          );
        })}
      </div>

      <div className="desktop-category-row flex shrink-0 items-center gap-2 sm:gap-3 sm:border-s sm:border-white/15 sm:ps-4">
        {onFiltersClick && (
          <button type="button" onClick={onFiltersClick} className="filter-chip">
            <SlidersHorizontal className="h-4 w-4" />
            {t("searchPage.filters")}
          </button>
        )}
        {showMapToggle && onToggleMap && (
          <button
            type="button"
            onClick={onToggleMap}
            className={`filter-chip ${mapMode ? "bg-ink text-white hover:bg-ink/90" : ""}`}
          >
            <Map className="h-4 w-4" />
            {mapMode ? t("categoryBar.showList") : t("categoryBar.showMap")}
          </button>
        )}
      </div>
    </div>
  );
}
