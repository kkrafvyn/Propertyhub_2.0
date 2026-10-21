import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { SlidersHorizontal, Grid3x3, List, Map, MapPin, Bed, Bath, X, Loader2, Bell, Heart, Search } from "lucide-react";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { EmptyState } from "../components/ux";
import {
  CategoryBar,
  DesktopShell,
  ListingCard,
  ListingCardSkeleton,
  SearchPill,
  mapListingToCard,
} from "../components/baytmiftah";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { motion } from "motion/react";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { getPropertyCoverImage } from "../../lib/property-media";
import { listingService } from "../../lib/listing.service";
import { normalizePropertyCategory } from "../../lib/property-category";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import { getRecentlyViewedIds } from "../../lib/recently-viewed";
import { POPULAR_SEARCH_LOCATIONS } from "../../lib/search-locations";
import { syncCompareIds, toggleCompareIdAsync } from "../../lib/compare-listings";
import { useIsDesktopViewport } from "../hooks/useMediaQuery";
import { useTranslation } from "../i18n/LocaleContext";
import { useUserMarket } from "../context/MarketContext";
import { GHANA_REGIONS } from "../../lib/ghana-regions";

const PAGE_SIZE = 12;

type SearchFilters = {
  priceMin: string;
  priceMax: string;
  bedrooms: string;
  bathrooms: string;
  propertyType: string;
  listingType: string;
  agency: string;
  region: string;
  sort: string;
  verifiedOnly: boolean;
  featuredOnly: boolean;
};

function buildFiltersFromSearchParams(searchParams: URLSearchParams): SearchFilters {
  return {
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    bedrooms: searchParams.get("bedrooms") || "",
    bathrooms: searchParams.get("bathrooms") || "",
    propertyType:
      normalizePropertyCategory(searchParams.get("propertyType")) ||
      normalizePropertyCategory(searchParams.get("category")) ||
      "all",
    listingType:
      searchParams.get("listingType") ||
      (["rental", "sale", "lease", "short_stay"].includes(searchParams.get("type") || "")
        ? (searchParams.get("type") as "rental" | "sale" | "lease" | "short_stay")
        : "rental"),
    agency: searchParams.get("agency") || "",
    region: searchParams.get("region") || "all",
    sort: searchParams.get("sort") || "newest",
    verifiedOnly: ["1", "true"].includes(searchParams.get("verified") || ""),
    featuredOnly: searchParams.get("featured") === "1",
  };
}

export function PropertySearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { defaultSearchLocation } = useUserMarket();
  const isDesktop = useIsDesktopViewport();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [savingAlert, setSavingAlert] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  const [selectedMapListingId, setSelectedMapListingId] = useState<string | null>(null);
  const [recentlyViewedListings, setRecentlyViewedListings] = useState<any[]>([]);

  const [filters, setFilters] = useState(() => buildFiltersFromSearchParams(searchParams));

  useEffect(() => {
    setFilters(buildFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    loadListings();
  }, [searchParams]);

  useEffect(() => {
    syncCompareIds().then(setCompareIds);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserAlerts([]);
      setSavedListingIds(new Set());
      return;
    }

    let cancelled = false;

    const loadUserData = async () => {
      try {
        const [alerts, savedRows] = await Promise.all([
          savedSearchAlertService.getUserAlerts(user.id),
          savedPropertyService.getSavedProperties(user.id),
        ]);
        if (!cancelled) {
          setUserAlerts(alerts);
          setSavedListingIds(
            new Set(
              (savedRows || [])
                .map((row: any) => row.listing?.id || row.listing_id)
                .filter(Boolean)
            )
          );
        }
      } catch (error) {
        console.error("Failed to load saved search data:", error);
      }
    };

    const loadRecentlyViewed = async () => {
      const ids = getRecentlyViewedIds();
      if (ids.length === 0) {
        if (!cancelled) setRecentlyViewedListings([]);
        return;
      }

      try {
        const listings = await Promise.all(
          ids.slice(0, 6).map((listingId) =>
            listingService.getListingById(listingId).catch(() => null)
          )
        );
        if (!cancelled) {
          setRecentlyViewedListings(listings.filter(Boolean));
        }
      } catch (error) {
        console.error("Failed to load recently viewed listings:", error);
      }
    };

    void loadUserData();
    void loadRecentlyViewed();
    void savedSearchAlertService.evaluateUserAlerts(user.id).catch((error) => {
      console.error("Failed to evaluate search alerts:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const parseCountFilter = (value: string) => {
    if (!value || value === "Any") return undefined;
    if (value.endsWith("+")) return parseInt(value, 10);
    return parseInt(value, 10);
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      const activeFilters = buildFiltersFromSearchParams(searchParams);
      const queryText = searchParams.get("q") || "";
      const searchFilter = {
        location: queryText || undefined,
        priceMin: activeFilters.priceMin ? parseInt(activeFilters.priceMin, 10) : undefined,
        priceMax: activeFilters.priceMax ? parseInt(activeFilters.priceMax, 10) : undefined,
        bedrooms: parseCountFilter(activeFilters.bedrooms),
        bathrooms: parseCountFilter(activeFilters.bathrooms),
        propertyType:
          activeFilters.propertyType !== "all" ? activeFilters.propertyType : undefined,
        listingType: activeFilters.listingType as "rental" | "sale" | "lease" | "short_stay",
        organizationSlug: activeFilters.agency || undefined,
        region: activeFilters.region !== "all" ? activeFilters.region : undefined,
        sort: activeFilters.sort as "newest" | "price_asc" | "price_desc" | "featured",
        verifiedOnly: activeFilters.verifiedOnly,
        featuredOnly: activeFilters.featuredOnly,
      };

      const offset = (currentPage - 1) * PAGE_SIZE;
      const data = await listingService.searchListingsWithCount(searchFilter, PAGE_SIZE, offset);
      setListings(data.results);
      setTotalResults(data.total);
    } catch (error) {
      console.error("Failed to load listings:", error);
      toast.error(t("searchPage.loadListingsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAlert = async () => {
    if (!user) {
      toast.error(t("searchPage.loginSaveSearch"));
      navigate("/login", {
        state: {
          from: `/search${window.location.search || ""}`,
        },
      });
      return;
    }

    try {
      setSavingAlert(true);
      const alert = await savedSearchAlertService.createAlert({
        userId: user.id,
        locationQuery: searchParams.get("q") || undefined,
        listingType: filters.listingType as "rental" | "sale" | "lease",
        propertyType: filters.propertyType !== "all" ? filters.propertyType : null,
        priceMin: filters.priceMin ? parseInt(filters.priceMin, 10) : null,
        priceMax: filters.priceMax ? parseInt(filters.priceMax, 10) : null,
        bedrooms: parseCountFilter(filters.bedrooms) ?? null,
        bathrooms: parseCountFilter(filters.bathrooms) ?? null,
        initialMatchCount: totalResults,
      });

      setUserAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
      toast.success(t("searchPage.alertSaved"));
    } catch (error) {
      console.error("Failed to save search alert:", error);
      toast.error(t("searchPage.alertSaveFailed"));
    } finally {
      setSavingAlert(false);
    }
  };

  const handleApplyFilters = () => {
    const nextParams = new URLSearchParams(searchParams);

    if (filters.priceMin) nextParams.set("priceMin", filters.priceMin);
    else nextParams.delete("priceMin");

    if (filters.priceMax) nextParams.set("priceMax", filters.priceMax);
    else nextParams.delete("priceMax");

    if (filters.bedrooms) nextParams.set("bedrooms", filters.bedrooms);
    else nextParams.delete("bedrooms");

    if (filters.bathrooms) nextParams.set("bathrooms", filters.bathrooms);
    else nextParams.delete("bathrooms");

    if (filters.propertyType !== "all") nextParams.set("propertyType", filters.propertyType);
    else nextParams.delete("propertyType");

    if (filters.agency) nextParams.set("agency", filters.agency);
    else nextParams.delete("agency");

    if (filters.region && filters.region !== "all") nextParams.set("region", filters.region);
    else nextParams.delete("region");

    if (filters.sort && filters.sort !== "newest") nextParams.set("sort", filters.sort);
    else nextParams.delete("sort");

    if (filters.verifiedOnly) nextParams.set("verified", "1");
    else nextParams.delete("verified");

    if (filters.featuredOnly) nextParams.set("featured", "1");
    else nextParams.delete("featured");

    nextParams.set("listingType", filters.listingType);
    nextParams.set("page", "1");
    setSearchParams(nextParams);
    setShowFilters(false);
  };

  const handleToggleSave = async (listingId: string) => {
    if (!user) {
      toast.error(t("searchPage.loginSaveProperty"));
      navigate("/login", { state: { from: `/search${window.location.search || ""}` } });
      return;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listingId);
      setSavedListingIds((current) => {
        const next = new Set(current);
        if (result.saved) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
      toast.success(result.saved ? t("searchPage.propertySaved") : t("searchPage.propertyUnsaved"));
    } catch (error) {
      console.error(error);
      toast.error(t("searchPage.savePropertyFailed"));
    }
  };

  const toggleSavedListing = async (listingId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    await handleToggleSave(listingId);
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("priceMin");
    nextParams.delete("priceMax");
    nextParams.delete("bedrooms");
    nextParams.delete("bathrooms");
    nextParams.delete("propertyType");
    nextParams.delete("region");
    nextParams.delete("verified");
    nextParams.delete("featured");
    nextParams.delete("sort");
    nextParams.delete("page");
    nextParams.set("listingType", "rental");
    setSearchParams(nextParams);
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.max(page, 1);
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage === 1) nextParams.delete("page");
    else nextParams.set("page", String(nextPage));

    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resultsTitle = useMemo(() => {
    const listingTypeLabel = t(`searchPage.listingTypes.${filters.listingType}`);
    const locationLabel = searchParams.get("q");

    if (locationLabel) {
      return t("searchPage.resultsForIn", { type: listingTypeLabel, location: locationLabel });
    }

    return t("searchPage.resultsFor", { type: listingTypeLabel });
  }, [filters.listingType, searchParams, t]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  const resultSummary = useMemo(() => {
    if (totalResults === 0) return t("searchPage.zeroResults");

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalResults);
    return t("searchPage.showing", { start, end, total: totalResults });
  }, [currentPage, totalResults, t]);

  const activeFilters = useMemo(() => {
    const list: Array<{ label: string; onRemove: () => void }> = [];

    const q = searchParams.get("q");
    if (q) {
      list.push({
        label: `"${q}"`,
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("q");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.propertyType && filters.propertyType !== "all") {
      list.push({
        label: t("searchPage.filterType", { type: filters.propertyType }),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("propertyType");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.region && filters.region !== "all") {
      const regionLabel =
        GHANA_REGIONS.find((region) => region.code === filters.region)?.label || filters.region;
      list.push({
        label: regionLabel,
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("region");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.priceMax) {
      list.push({
        label: t("searchPage.filterMaxPrice", {
          amount: parseInt(filters.priceMax, 10).toLocaleString(),
        }),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("priceMax");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.priceMin) {
      list.push({
        label: t("searchPage.filterMinPrice", {
          amount: parseInt(filters.priceMin, 10).toLocaleString(),
        }),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("priceMin");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.bedrooms) {
      list.push({
        label: t("searchPage.filterBeds", { count: filters.bedrooms }),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("bedrooms");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.bathrooms) {
      list.push({
        label: t("searchPage.filterBaths", { count: filters.bathrooms }),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("bathrooms");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.verifiedOnly) {
      list.push({
        label: t("searchPage.verifiedOnly"),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("verified");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    if (filters.featuredOnly) {
      list.push({
        label: t("searchPage.featuredOnly"),
        onRemove: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("featured");
          next.set("page", "1");
          setSearchParams(next);
        },
      });
    }

    return list;
  }, [searchParams, filters, setSearchParams, t]);

  useEffect(() => {
    setSelectedMapListingId((current) => {
      if (current && listings.some((listing) => listing.id === current)) {
        return current;
      }
      return listings[0]?.id || null;
    });
  }, [listings]);

  const selectedMapListing = useMemo(
    () => listings.find((listing) => listing.id === selectedMapListingId) || listings[0] || null,
    [listings, selectedMapListingId]
  );
  const selectedMapQuery = useMemo(() => {
    if (selectedMapListing?.property) {
      return [
        selectedMapListing.property.address,
        selectedMapListing.property.city,
        selectedMapListing.property.region,
        selectedMapListing.property.country,
      ]
        .filter(Boolean)
        .join(", ");
    }

    return searchParams.get("q") || defaultSearchLocation || t("searchPage.defaultLocation");
  }, [searchParams, selectedMapListing, defaultSearchLocation, t]);
  const selectedMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    selectedMapQuery
  )}&output=embed`;

  const searchLocation = searchParams.get("q") || "";
  const searchPropertyType = filters.propertyType !== "all" ? filters.propertyType : "any";
  const searchBudget = filters.priceMax || "";

  const handleToggleCompare = async (listingId: string) => {
    const { ids, capped } = await toggleCompareIdAsync(listingId);
    setCompareIds(ids);
    if (capped) {
      toast.message(t("comparePage.maxReached"));
    }
  };

  const handleCategoryChange = (id: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("verified");
    if (id === "all") {
      nextParams.delete("propertyType");
    } else if (id === "verified") {
      nextParams.delete("propertyType");
      nextParams.set("verified", "1");
    } else {
      nextParams.set("propertyType", id);
    }
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const categoryActive = filters.verifiedOnly
    ? "verified"
    : filters.propertyType && filters.propertyType !== "all"
      ? filters.propertyType
      : "all";

  const handleHeaderSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    if (searchLocation.trim()) nextParams.set("q", searchLocation.trim());
    else nextParams.delete("q");
    if (searchPropertyType !== "any") nextParams.set("propertyType", searchPropertyType);
    else nextParams.delete("propertyType");
    if (searchBudget.trim()) nextParams.set("priceMax", searchBudget.replace(/\D/g, ""));
    else nextParams.delete("priceMax");
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  return (
    <DesktopShell
      compareCount={compareIds.length}
      categoryBar={
        <CategoryBar
          active={categoryActive}
          onChange={handleCategoryChange}
          onFiltersClick={() => setShowFilters(true)}
          showMapToggle={false}
        />
      }
      search={
        <SearchPill
          location={searchLocation}
          onLocationChange={(value) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value.trim()) nextParams.set("q", value.trim());
            else nextParams.delete("q");
            setSearchParams(nextParams);
          }}
          propertyType={searchPropertyType}
          onTypeChange={(value) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value !== "any") nextParams.set("propertyType", value);
            else nextParams.delete("propertyType");
            setSearchParams(nextParams);
          }}
          budget={searchBudget}
          onBudgetChange={(value) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value.trim()) nextParams.set("priceMax", value.replace(/\D/g, ""));
            else nextParams.delete("priceMax");
            setSearchParams(nextParams);
          }}
          onSearch={handleHeaderSearch}
        />
      }
    >
      <div className="pb-12">
        {recentlyViewedListings.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-ink">{t("searchPage.recentlyViewed")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {recentlyViewedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={mapListingToCard(listing)}
                  saved={savedListingIds.has(listing.id)}
                  onToggleSave={(listingId) => void handleToggleSave(listingId)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Luxury Search Results Toolbar */}
        <div className="flex flex-col gap-3 mb-6 p-4 sm:p-5 rounded-2xl bg-surface-subtle/70 border border-surface-border/70 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight truncate">{resultsTitle}</h1>
              <p className="text-xs text-ink-muted mt-0.5">{resultSummary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSaveAlert()}
                disabled={savingAlert}
                className="gap-1.5 text-xs"
              >
                <Bell className="w-3.5 h-3.5" />
                {savingAlert ? t("searchPage.savingAlert") : t("searchPage.saveAlert")}
              </Button>
              {/* View-mode segment control */}
              <div
                className="flex items-center rounded-xl bg-surface border border-surface-border p-0.5 gap-0.5"
                role="group"
                aria-label={t("searchPage.viewMode")}
              >
                {[
                  { mode: "grid" as const, Icon: Grid3x3 },
                  { mode: "list" as const, Icon: List },
                  { mode: "map" as const, Icon: Map },
                ].map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    aria-label={`${t("searchPage.viewMode")}: ${mode}`}
                    aria-pressed={viewMode === mode}
                    className={`p-1.5 rounded-lg transition-all duration-150 ${
                      viewMode === mode
                        ? "bg-primary text-white shadow-sm"
                        : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
              {!isDesktop ? (
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {t("searchPage.filters")}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Listing type quick-segment (inline) */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              ["rental", "Rent"],
              ["sale", "Buy"],
              ["lease", "Lease"],
              ["short_stay", "Short Stay"],
            ] as const).map(([value, label]) => {
              const isActive = filters.listingType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("listingType", value);
                    nextParams.set("page", "1");
                    setSearchParams(nextParams);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface border border-surface-border text-ink-secondary hover:text-ink hover:border-primary/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span className="text-xs font-black text-ink-muted uppercase tracking-[0.12em]">{t("searchPage.activeFilters")}:</span>
            {activeFilters.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25 transition-all hover:bg-primary/15 hover:border-primary/40"
              >
                <span>{badge.label}</span>
                <button
                  type="button"
                  onClick={badge.onRemove}
                  className="hover:text-destructive transition-colors p-0.5 rounded-full cursor-pointer ml-0.5"
                  aria-label={t("searchPage.removeFilter", { label: badge.label })}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-ink-muted hover:text-ink font-bold uppercase tracking-wide underline underline-offset-2 ml-1 cursor-pointer"
            >
              {t("searchPage.clearAll")}
            </button>
          </div>
        )}

        {user && userAlerts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 mb-6 rounded-xl bg-primary/8 border border-primary/20 backdrop-blur-sm">
            <div>
              <p className="text-sm font-bold text-ink">{t("searchPage.savedSearchAlerts")}</p>
              <p className="text-xs text-ink-secondary">
                {t("searchPage.savedSearchAlertsDesc", {
                  count: userAlerts.filter((alert) => alert.is_active).length,
                })}
              </p>
            </div>
            <Link to="/app/alerts">
              <Button variant="outline" size="sm" className="text-xs">
                {t("searchPage.manageAlerts")}
              </Button>
            </Link>
          </div>
        )}

        <div className="flex gap-8">
          {isDesktop ? (
            <aside className="hidden lg:block w-72 shrink-0">
              <SearchFiltersPanel
                filters={filters}
                setFilters={setFilters}
                onApply={handleApplyFilters}
                onClear={clearFilters}
              />
            </aside>
          ) : (
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetContent side="left" className="w-full max-w-sm overflow-y-auto p-0">
                <SearchFiltersPanel
                  filters={filters}
                  setFilters={setFilters}
                  onApply={handleApplyFilters}
                  onClear={clearFilters}
                  onClose={() => setShowFilters(false)}
                />
              </SheetContent>
            </Sheet>
          )}

          {/* Properties Grid/List */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="space-y-6">
                <EmptyState
                  icon={Search}
                  title={t("searchPage.noPropertiesTitle")}
                  description={t("searchPage.noPropertiesDesc")}
                  actionLabel={t("searchPage.clearFilters")}
                  onAction={clearFilters}
                  secondaryActionLabel={t("searchPage.exploreRentals")}
                  secondaryActionHref="/search?listingType=rental"
                />

                <Card className="p-6 text-center border-surface-border">
                  <h3 className="text-sm font-semibold text-ink mb-3">{t("searchPage.popularLocations")}</h3>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {POPULAR_SEARCH_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          const nextParams = new URLSearchParams(searchParams);
                          nextParams.set("q", loc);
                          nextParams.set("page", "1");
                          setSearchParams(nextParams);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-surface-border bg-surface hover:bg-surface-hover hover:border-primary/40 text-ink transition cursor-pointer"
                      >
                        <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{loc}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-muted-foreground">{resultSummary}</p>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {listings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={mapListingToCard(listing)}
                        saved={savedListingIds.has(listing.id)}
                        compared={compareIds.includes(listing.id)}
                        onToggleSave={handleToggleSave}
                        onToggleCompare={handleToggleCompare}
                      />
                    ))}
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-4">
                    {listings.map((listing, index) => (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link to={`/property/${listing.id}`}>
                          <Card hover className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                              <div className="relative w-full md:w-80 h-48 flex-shrink-0 overflow-hidden">
                                <img
                                  src={getPropertyCoverImage(listing.property)}
                                  alt={listing.property?.address}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 p-6 flex flex-col justify-between">
                                <div>
                                  <h3 className="font-semibold text-xl mb-2">
                                    {listing.property?.address || t("searchPage.propertyFallback")}
                                  </h3>
                                  <div className="flex items-center gap-1 text-muted-foreground mb-4">
                                    <MapPin className="w-4 h-4" />
                                    <span>{listing.property?.city}, {listing.property?.region}</span>
                                  </div>
                                  <p className="text-muted-foreground text-sm mb-4">
                                    {listing.property?.description || t("searchPage.propertyAvailable")}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-3xl font-semibold text-primary">
                                      GHS {listing.price.toLocaleString()}
                                    </span>
                                    {listing.listing_type === 'rental' && (
                                      <span className="text-sm text-muted-foreground">{t("searchPage.perMonth")}</span>
                                    )}
                                  </div>
                                  {listing.property?.bedrooms && (
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Bed className="w-4 h-4" />
                                        <span>{listing.property.bedrooms}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Bath className="w-4 h-4" />
                                        <span>{listing.property.bathrooms}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <div className="space-y-4 max-h-[880px] overflow-y-auto pr-2">
                      {listings.map((listing, index) => (
                        <motion.div
                          key={listing.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <Card
                            hover
                            className={`overflow-hidden ${
                              selectedMapListingId === listing.id ? "border-primary" : ""
                            }`}
                            onClick={() => setSelectedMapListingId(listing.id)}
                          >
                            <div className="flex gap-4 p-4">
                              <div className="relative h-28 w-28 overflow-hidden rounded-lg flex-shrink-0">
                                <img
                                  src={getPropertyCoverImage(listing.property)}
                                  alt={listing.property?.address}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold line-clamp-2">
                                  {listing.property?.address || t("searchPage.propertyFallback")}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {listing.property?.city}, {listing.property?.region}
                                </p>
                                <p className="text-lg font-semibold text-primary mt-3">
                                  GHS {listing.price.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    <Card className="overflow-hidden sticky top-24 h-[880px]">
                      <iframe
                        title={t("searchPage.mapSearchTitle", { location: selectedMapQuery })}
                        src={selectedMapEmbedUrl}
                        className="h-full w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </Card>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {totalResults > PAGE_SIZE && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <p className="text-xs text-ink-muted">{resultSummary}</p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-xs px-3"
                  >
                    {t("searchPage.previous")}
                  </Button>
                  {visiblePages.map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="text-xs w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="text-xs px-3"
                  >
                    {t("searchPage.next")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

function filterChipClass(active: boolean) {
  return `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
    active ? "bg-brand-forest text-white" : "bg-surface-subtle text-ink hover:bg-surface-hover"
  }`;
}

type SearchFiltersPanelProps = {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onApply: () => void;
  onClear: () => void;
  onClose?: () => void;
};

function SearchFiltersPanel({
  filters,
  setFilters,
  onApply,
  onClear,
  onClose,
}: SearchFiltersPanelProps) {
  const { t } = useTranslation();

  return (
    <Card className="desktop-filters-panel sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto p-0 border-surface-border/80 shadow-lg">
      {/* Filter panel header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-surface-border bg-surface/90 backdrop-blur-md rounded-t-2xl">
        <div>
          <h3 className="text-sm font-black text-ink uppercase tracking-wide">{t("searchPage.filters")}</h3>
          <p className="text-xs text-ink-muted mt-0.5">Refine your property search</p>
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-surface-hover border border-transparent hover:border-surface-border"
            type="button"
            aria-label={t("searchPage.closeFilters")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="p-5 space-y-5">
        <div>
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]">{t("searchPage.listingType")}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ["rental", "rent"],
                ["sale", "buy"],
                ["lease", "lease"],
                ["short_stay", "stay"],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilters({ ...filters, listingType: value })}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  filters.listingType === value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-subtle text-ink-secondary hover:bg-surface-hover hover:text-ink border border-transparent hover:border-surface-border"
                }`}
              >
                {t(`searchPage.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-border pt-5">
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]" htmlFor="region-filter">
            {t("searchPage.region")}
          </label>
          <NativeSelectControl
            id="region-filter"
            value={filters.region || "all"}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            className="w-full rounded-xl border border-surface-border bg-surface-subtle px-3 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          >
            <option value="all">{t("searchPage.allRegions")}</option>
            {GHANA_REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.label}
              </option>
            ))}
          </NativeSelectControl>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]" htmlFor="sort-filter">
            {t("searchPage.sortBy")}
          </label>
          <NativeSelectControl
            id="sort-filter"
            value={filters.sort || "newest"}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="w-full rounded-xl border border-surface-border bg-surface-subtle px-3 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          >
            <option value="newest">{t("searchPage.newest")}</option>
            <option value="price_asc">{t("searchPage.priceAsc")}</option>
            <option value="price_desc">{t("searchPage.priceDesc")}</option>
            <option value="featured">{t("searchPage.featured")}</option>
          </NativeSelectControl>
        </div>

        <div className="border-t border-surface-border pt-5 space-y-2.5">
          <label className="block text-xs font-black text-ink-muted uppercase tracking-[0.12em] mb-2">Quick Filters</label>
          <label className="flex items-center gap-3 text-xs text-ink cursor-pointer group">
            <div className={`w-8 h-4.5 rounded-full border-2 transition-all flex items-center px-0.5 ${
              filters.verifiedOnly ? "bg-emerald-500 border-emerald-500" : "border-surface-border bg-surface-subtle"
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow transition-all ${
                filters.verifiedOnly ? "translate-x-3.5" : "translate-x-0"
              }`} />
            </div>
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(event) => setFilters({ ...filters, verifiedOnly: event.target.checked })}
              className="sr-only"
            />
            <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{t("searchPage.verifiedOnly")}</span>
          </label>
          <label className="flex items-center gap-3 text-xs text-ink cursor-pointer group">
            <div className={`w-8 h-4.5 rounded-full border-2 transition-all flex items-center px-0.5 ${
              filters.featuredOnly ? "bg-amber-500 border-amber-500" : "border-surface-border bg-surface-subtle"
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow transition-all ${
                filters.featuredOnly ? "translate-x-3.5" : "translate-x-0"
              }`} />
            </div>
            <input
              type="checkbox"
              checked={filters.featuredOnly}
              onChange={(event) => setFilters({ ...filters, featuredOnly: event.target.checked })}
              className="sr-only"
            />
            <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{t("searchPage.featuredOnly")}</span>
          </label>
        </div>

        <div className="border-t border-surface-border pt-5">
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]">{t("searchPage.priceRange")}</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("searchPage.min")}
              value={filters.priceMin}
              onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
              className="text-xs"
            />
            <Input
              type="number"
              placeholder={t("searchPage.max")}
              value={filters.priceMax}
              onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
              className="text-xs"
            />
          </div>
        </div>

        <div className="border-t border-surface-border pt-5">
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]" htmlFor="property-type-filter">
            {t("searchPage.propertyType")}
          </label>
          <NativeSelectControl
            id="property-type-filter"
            value={filters.propertyType}
            onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
            className="w-full rounded-xl border border-surface-border bg-surface-subtle px-3 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          >
            <option value="all">{t("searchPage.allTypes")}</option>
            <option value="apartment">{t("searchPage.propertyTypes.apartment")}</option>
            <option value="house">{t("searchPage.propertyTypes.house")}</option>
            <option value="office">{t("searchPage.propertyTypes.office")}</option>
            <option value="commercial">{t("searchPage.propertyTypes.commercial")}</option>
            <option value="land">{t("searchPage.propertyTypes.land")}</option>
          </NativeSelectControl>
        </div>

        <div className="border-t border-surface-border pt-5">
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]">{t("searchPage.bedrooms")}</label>
          <div className="grid grid-cols-5 gap-1.5">
            {["Any", "1", "2", "3", "4+"].map((bed) => (
              <button
                key={bed}
                type="button"
                onClick={() => setFilters({ ...filters, bedrooms: bed === "Any" ? "" : bed })}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
                  (filters.bedrooms || "Any") === bed
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-subtle text-ink-secondary hover:bg-surface-hover hover:text-ink border border-transparent hover:border-surface-border"
                }`}
              >
                {bed === "Any" ? t("filters.any") : bed}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-border pt-5">
          <label className="mb-2 block text-xs font-black text-ink-muted uppercase tracking-[0.12em]">{t("searchPage.bathrooms")}</label>
          <div className="grid grid-cols-5 gap-1.5">
            {["Any", "1", "2", "3", "4+"].map((bath) => (
              <button
                key={bath}
                type="button"
                onClick={() => setFilters({ ...filters, bathrooms: bath === "Any" ? "" : bath })}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
                  (filters.bathrooms || "Any") === bath
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-subtle text-ink-secondary hover:bg-surface-hover hover:text-ink border border-transparent hover:border-surface-border"
                }`}
              >
                {bath === "Any" ? t("filters.any") : bath}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-border pt-5 space-y-2">
          <Button className="w-full text-xs" size="lg" onClick={onApply}>
            {t("searchPage.applyFilters")}
          </Button>
          <Button variant="outline" className="w-full text-xs" size="sm" onClick={onClear}>
            {t("searchPage.clearFilters")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
