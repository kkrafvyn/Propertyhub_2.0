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
              className={`category-chip group ${isActive ? "active" : ""}`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 transition-all duration-200 group-hover:scale-110 ${
                  isActive ? "text-ink scale-105" : "text-ink-secondary"
                }`}
              />
              <span
                className={`max-w-[5.5rem] truncate text-center text-[11px] leading-tight sm:max-w-none sm:text-xs sm:whitespace-nowrap md:text-[13px] ${
                  isActive ? "text-ink font-bold" : "text-ink-secondary font-medium"
                }`}
              >
                {t(categoryLabelKeys[id])}
              </span>
              {isActive ? (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-primary/80 dark:bg-emerald-400 transition-all duration-300" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="desktop-category-row flex shrink-0 items-center gap-2 sm:gap-3 sm:border-s sm:border-surface-border sm:ps-4">
        {onFiltersClick && (
          <button
            type="button"
            onClick={onFiltersClick}
            className="filter-chip hover:border-primary/40 hover:bg-surface-hover hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4 text-ink-secondary" />
            <span className="font-semibold">{t("searchPage.filters")}</span>
          </button>
        )}
        {showMapToggle && onToggleMap && (
          <button
            type="button"
            onClick={onToggleMap}
            className={`filter-chip cursor-pointer transition-all active:scale-[0.98] ${
              mapMode
                ? "bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                : "hover:border-primary/40 hover:bg-surface-hover hover:shadow-xs"
            }`}
          >
            <Map className="h-4 w-4" />
            <span className="font-semibold">{mapMode ? t("categoryBar.showList") : t("categoryBar.showMap")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
