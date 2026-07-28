import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Search, SlidersHorizontal, Grid3x3, List, Map, MapPin, Bed, Bath, X, Loader2, Bell, Sparkles, Heart } from "lucide-react";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { EmptyState } from "../components/ux";
import { BaytMiftahAIPanel } from "../components/ux/BaytMiftahAIPanel";
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
import { motion, AnimatePresence } from "motion/react";
import { getPropertyCoverImage } from "../../lib/property-media";
import { listingService } from "../../lib/listing.service";
import { normalizePropertyCategory } from "../../lib/property-category";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import { aiAssistantService } from "../../lib/ai-assistant.service";
import { getRecentlyViewedIds } from "../../lib/recently-viewed";
import { syncCompareIds, toggleCompareIdAsync } from "../../lib/compare-listings";
import { useIsDesktopViewport } from "../hooks/useMediaQuery";
import { useTranslation } from "../i18n/LocaleContext";

const PAGE_SIZE = 12;

type SearchFilters = {
  priceMin: string;
  priceMax: string;
  bedrooms: string;
  bathrooms: string;
  propertyType: string;
  listingType: string;
  agency: string;
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
    sort: searchParams.get("sort") || "newest",
    verifiedOnly: searchParams.get("verified") === "1",
    featuredOnly: searchParams.get("featured") === "1",
  };
}

export function PropertySearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState(searchParams.get("q") || "");
  const [parsingQuery, setParsingQuery] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
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
        const [alerts, savedRows, searchHistory] = await Promise.all([
          savedSearchAlertService.getUserAlerts(user.id),
          savedPropertyService.getSavedProperties(user.id),
          aiAssistantService.getSearchHistory(user.id, 6),
        ]);
        if (!cancelled) {
          setUserAlerts(alerts);
          setSavedListingIds(new Set((savedRows || []).map((row: any) => row.listing_id)));
          setRecentSearches(searchHistory || []);
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
      const parsed = queryText ? await aiAssistantService.parseSearchQuery(queryText) : {};
      const searchFilter = {
        location: parsed.location || queryText || undefined,
        priceMin: activeFilters.priceMin
          ? parseInt(activeFilters.priceMin, 10)
          : parsed.priceMin || undefined,
        priceMax: activeFilters.priceMax
          ? parseInt(activeFilters.priceMax, 10)
          : parsed.priceMax || undefined,
        bedrooms: parseCountFilter(activeFilters.bedrooms) ?? parsed.bedrooms,
        bathrooms: parseCountFilter(activeFilters.bathrooms) ?? parsed.bathrooms,
        propertyType:
          activeFilters.propertyType !== "all"
            ? activeFilters.propertyType
            : parsed.propertyType || undefined,
        listingType: (parsed.listingType || activeFilters.listingType) as
          | "rental"
          | "sale"
          | "lease"
          | "short_stay",
        organizationSlug: activeFilters.agency || undefined,
        sort: activeFilters.sort as "newest" | "price_asc" | "price_desc" | "featured",
        verifiedOnly: activeFilters.verifiedOnly,
        featuredOnly: activeFilters.featuredOnly,
      };

      const offset = (currentPage - 1) * PAGE_SIZE;
      const data = await listingService.searchListingsWithCount(searchFilter, PAGE_SIZE, offset);
      setListings(data.results);
      setTotalResults(data.total);

      if (user && queryText) {
        void aiAssistantService
          .logSearch(user.id, null, queryText, data.total)
          .catch((error) => console.error("Failed to log AI search:", error));
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
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
    nextParams.delete("verified");
    nextParams.delete("featured");
    nextParams.delete("sort");
    nextParams.delete("page");
    nextParams.set("listingType", "rental");
    setSearchParams(nextParams);
  };

  const handleNaturalLanguageSearch = async () => {
    if (!naturalLanguageQuery.trim()) return;

    try {
      setParsingQuery(true);
      const parsed = await aiAssistantService.parseSearchQuery(naturalLanguageQuery);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("q", naturalLanguageQuery.trim());
      nextParams.set("page", "1");

      if (parsed.listingType) nextParams.set("listingType", parsed.listingType);
      if (parsed.priceMin) nextParams.set("priceMin", String(parsed.priceMin));
      if (parsed.priceMax) nextParams.set("priceMax", String(parsed.priceMax));
      if (parsed.bedrooms) nextParams.set("bedrooms", String(parsed.bedrooms));
      if (parsed.bathrooms) nextParams.set("bathrooms", String(parsed.bathrooms));
      if (parsed.propertyType) nextParams.set("propertyType", parsed.propertyType);

      setSearchParams(nextParams);
      toast.success(t("searchPage.aiApplied"));
    } catch (error) {
      console.error(error);
      toast.error(t("searchPage.aiParseFailed"));
    } finally {
      setParsingQuery(false);
    }
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

    return searchParams.get("q") || t("searchPage.defaultLocation");
  }, [searchParams, selectedMapListing, t]);
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
    if (id === "all") nextParams.delete("propertyType");
    else nextParams.set("propertyType", id);
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const categoryActive =
    filters.propertyType && filters.propertyType !== "all" ? filters.propertyType : "all";

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

  const handleRecentSearchClick = (query: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("q", query);
    nextParams.set("page", "1");
    setNaturalLanguageQuery(query);
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
        <BaytMiftahAIPanel
          context="search"
          compact
          onNavigate={(href) => navigate(href)}
        />

        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-forest" />
              <Input
                value={naturalLanguageQuery}
                onChange={(event) => setNaturalLanguageQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleNaturalLanguageSearch();
                }}
                placeholder={t("searchPage.aiSearchPlaceholder")}
                className="pl-10"
              />
            </div>
            <Button onClick={() => void handleNaturalLanguageSearch()} disabled={parsingQuery}>
              {parsingQuery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t("searchPage.aiSearch")}
            </Button>
          </div>
          {user && recentSearches.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("searchPage.recentSearches")}
              </span>
              {recentSearches.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleRecentSearchClick(entry.query)}
                  className="rounded-full border border-surface-border bg-surface-subtle px-3 py-1 text-sm text-ink transition-colors hover:bg-surface-hover"
                >
                  {entry.query}
                </button>
              ))}
            </div>
          ) : null}
        </Card>

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

        <div className="desktop-search-toolbar">
          <div>
            <h1>{resultsTitle}</h1>
            <p>{resultSummary}</p>
          </div>
          <div className="desktop-search-toolbar-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSaveAlert()}
              disabled={savingAlert}
            >
              <Bell className="w-4 h-4" />
              {savingAlert ? t("searchPage.savingAlert") : t("searchPage.saveAlert")}
            </Button>
            <div className="desktop-view-toggle" role="group" aria-label={t("searchPage.viewMode")}>
              <button
                type="button"
                className={viewMode === "grid" ? "is-active" : ""}
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "is-active" : ""}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={viewMode === "map" ? "is-active" : ""}
                onClick={() => setViewMode("map")}
                aria-pressed={viewMode === "map"}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
            {!isDesktop ? (
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="w-4 h-4" />
                {t("searchPage.filters")}
              </Button>
            ) : null}
          </div>
        </div>

        {user && userAlerts.length > 0 && (
          <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Saved Search Alerts</p>
                <p className="text-sm text-muted-foreground">
                  You have {userAlerts.filter((alert) => alert.is_active).length} active alerts
                  watching for new matches.
                </p>
              </div>
              <Link to="/app/alerts">
                <Button variant="outline" size="sm">
                  Manage Alerts
                </Button>
              </Link>
            </div>
          </Card>
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
            <AnimatePresence>
              {showFilters && (
                <motion.aside
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="fixed inset-0 z-50 flex bg-black/40 p-4"
                  onClick={() => setShowFilters(false)}
                >
                  <div className="w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
                    <SearchFiltersPanel
                      filters={filters}
                      setFilters={setFilters}
                      onApply={handleApplyFilters}
                      onClear={clearFilters}
                      onClose={() => setShowFilters(false)}
                    />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
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
              <EmptyState
                icon={Search}
                title={t("searchPage.noPropertiesTitle")}
                description={t("searchPage.noPropertiesDesc")}
                actionLabel={t("searchPage.clearFilters")}
                onAction={clearFilters}
                secondaryActionLabel={t("searchPage.exploreRentals")}
                secondaryActionHref="/search?listingType=rental"
              />
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
                                    {listing.property?.address || 'Property'}
                                  </h3>
                                  <div className="flex items-center gap-1 text-muted-foreground mb-4">
                                    <MapPin className="w-4 h-4" />
                                    <span>{listing.property?.city}, {listing.property?.region}</span>
                                  </div>
                                  <p className="text-muted-foreground text-sm mb-4">
                                    {listing.property?.description || 'Property available'}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-3xl font-semibold text-primary">
                                      GHS {listing.price.toLocaleString()}
                                    </span>
                                    {listing.listing_type === 'rental' && (
                                      <span className="text-sm text-muted-foreground">/month</span>
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
                  <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
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
                        title={`Map search for ${selectedMapQuery}`}
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
                <p className="text-sm text-muted-foreground">{resultSummary}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {visiblePages.map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
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
    <Card className="desktop-filters-panel sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">{t("searchPage.filters")}</h3>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle"
            type="button"
            aria-label={t("searchPage.closeFilters")}
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block font-semibold text-ink">{t("searchPage.listingType")}</label>
          <div className="grid grid-cols-2 gap-2">
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
                className={filterChipClass(filters.listingType === value)}
              >
                {t(`searchPage.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block font-semibold text-ink" htmlFor="sort-filter">
            {t("searchPage.sortBy")}
          </label>
          <select
            id="sort-filter"
            value={filters.sort || "newest"}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="w-full rounded-lg border border-surface-border bg-white px-4 py-3 text-ink"
          >
            <option value="newest">{t("searchPage.newest")}</option>
            <option value="price_asc">{t("searchPage.priceAsc")}</option>
            <option value="price_desc">{t("searchPage.priceDesc")}</option>
            <option value="featured">{t("searchPage.featured")}</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(event) => setFilters({ ...filters, verifiedOnly: event.target.checked })}
              className="h-4 w-4 rounded border-surface-border"
            />
            {t("searchPage.verifiedOnly")}
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={filters.featuredOnly}
              onChange={(event) => setFilters({ ...filters, featuredOnly: event.target.checked })}
              className="h-4 w-4 rounded border-surface-border"
            />
            {t("searchPage.featuredOnly")}
          </label>
        </div>

        <div>
          <label className="mb-3 block font-semibold text-ink">{t("searchPage.priceRange")}</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("searchPage.min")}
              value={filters.priceMin}
              onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t("searchPage.max")}
              value={filters.priceMax}
              onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block font-semibold text-ink" htmlFor="property-type-filter">
            {t("searchPage.propertyType")}
          </label>
          <select
            id="property-type-filter"
            value={filters.propertyType}
            onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
            className="w-full rounded-lg border border-surface-border bg-white px-4 py-3 text-ink"
          >
            <option value="all">{t("searchPage.allTypes")}</option>
            <option value="apartment">{t("searchPage.propertyTypes.apartment")}</option>
            <option value="house">{t("searchPage.propertyTypes.house")}</option>
            <option value="office">{t("searchPage.propertyTypes.office")}</option>
            <option value="commercial">{t("searchPage.propertyTypes.commercial")}</option>
            <option value="land">{t("searchPage.propertyTypes.land")}</option>
          </select>
        </div>

        <div>
          <label className="mb-3 block font-semibold text-ink">{t("searchPage.bedrooms")}</label>
          <div className="grid grid-cols-5 gap-2">
            {["Any", "1", "2", "3", "4+"].map((bed) => (
              <button
                key={bed}
                type="button"
                onClick={() => setFilters({ ...filters, bedrooms: bed === "Any" ? "" : bed })}
                className={filterChipClass((filters.bedrooms || "Any") === bed)}
              >
                {bed === "Any" ? t("filters.any") : bed}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block font-semibold text-ink">{t("searchPage.bathrooms")}</label>
          <div className="grid grid-cols-5 gap-2">
            {["Any", "1", "2", "3", "4+"].map((bath) => (
              <button
                key={bath}
                type="button"
                onClick={() => setFilters({ ...filters, bathrooms: bath === "Any" ? "" : bath })}
                className={filterChipClass((filters.bathrooms || "Any") === bath)}
              >
                {bath === "Any" ? t("filters.any") : bath}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={onApply}>
          {t("searchPage.applyFilters")}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClear}>
          {t("searchPage.clearFilters")}
        </Button>
      </div>
    </Card>
  );
}
