import { Link, useNavigate } from "react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Home as HomeIcon, Key, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { listingService } from "../../lib/listing.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { syncCompareIds, toggleCompareIdAsync } from "../../lib/compare-listings";
import { normalizePropertyCategory } from "../../lib/property-category";
import { useAuth } from "../context/AuthContext";
import { useUserMarket } from "../context/MarketContext";
import { useTranslation } from "../i18n/LocaleContext";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { GHANA_REGIONS, propertyMatchesGhanaRegion } from "../../lib/ghana-regions";
import {
  CategoryBar,
  DesktopShell,
  ListingCard,
  ListingCardSkeleton,
  MapErrorBoundary,
  PageMeta,
  SearchPill,
  mapListingToCard,
  mapListingToMapListing,
  type MarketplaceListingCard,
} from "../components/baytmiftah";
const MapView = lazy(() =>
  import("../components/baytmiftah/MapView").then((m) => ({ default: m.MapView })),
);

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { market } = useUserMarket();
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("");
  const [ghanaRegion, setGhanaRegion] = useState("all");
  const [propertyType, setPropertyType] = useState("any");
  const [budget, setBudget] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minBedrooms, setMinBedrooms] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [mapMode, setMapMode] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncCompareIds().then(setCompareIds);
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const rows = await listingService.getPublicListings(200, 0);
        if (!ignore) setListings(rows);
      } catch (error) {
        console.error("Failed to load listings:", error);
        if (!ignore) toast.error(t("searchPage.loadListingsFailed"));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [t]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }

    let cancelled = false;

    const loadSaved = async () => {
      try {
        const rows = await savedPropertyService.getSavedProperties(user.id);
        if (!cancelled) {
          setSavedIds((rows || []).map((row: any) => row.listing?.id || row.listing_id).filter(Boolean));
        }
      } catch (error) {
        console.error("Failed to load saved properties:", error);
      }
    };

    void loadSaved();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const listingFiltered = useMemo(() => {
    const query = location.trim().toLowerCase();

    return listings.filter((listing) => {
      const property = listing.property || {};
      const haystack = [property.address, property.city, property.region, property.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesRegion = propertyMatchesGhanaRegion(
        property.region,
        property.city,
        property.address,
        ghanaRegion
      );

      return matchesQuery && matchesRegion;
    });
  }, [listings, location, ghanaRegion]);

  const cards = useMemo(() => listingFiltered.map(mapListingToCard), [listingFiltered]);

  const visible = useMemo(() => {
    return cards.filter((listing) => {
      const matchesCategory =
        category === "all" ||
        normalizePropertyCategory(listing.type) === normalizePropertyCategory(category) ||
        (category === "verified" && listing.verified);

      const matchesType =
        propertyType === "any" ||
        normalizePropertyCategory(listing.type) === normalizePropertyCategory(propertyType);

      const haystack = `${listing.title} ${listing.location}`.toLowerCase();
      const matchesBudget =
        !budget.trim() ||
        haystack.includes(budget.toLowerCase()) ||
        listing.priceLabel.includes(budget);

      const matchesVerified = !verifiedOnly || listing.verified;
      const matchesBeds = !minBedrooms || (listing.bedrooms ?? 0) >= minBedrooms;

      return matchesCategory && matchesType && matchesBudget && matchesVerified && matchesBeds;
    });
  }, [cards, category, propertyType, budget, verifiedOnly, minBedrooms]);

  const featured = useMemo(() => cards.filter((l) => l.featured).slice(0, 12), [cards]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set("q", location.trim());
    if (ghanaRegion !== "all") params.set("region", ghanaRegion);
    if (propertyType !== "any") params.set("propertyType", propertyType);
    if (budget.trim()) params.set("priceMax", budget.replace(/\D/g, ""));
    navigate(`/search?${params.toString()}`);
  };

  const handleToggleSave = async (listingId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listingId);
      setSavedIds((prev) =>
        result.saved ? [...new Set([...prev, listingId])] : prev.filter((id) => id !== listingId),
      );
    } catch (error) {
      console.error("Failed to toggle saved property:", error);
      toast.error(t("home.savePropertyFailed"));
    }
  };

  const visibleIds = useMemo(() => new Set(visible.map((v) => v.id)), [visible]);
  const mapListings = useMemo(
    () => listings.filter((l) => visibleIds.has(l.id)).map(mapListingToMapListing),
    [listings, visibleIds],
  );

  const handleToggleCompare = async (listingId: string) => {
    const { ids, capped } = await toggleCompareIdAsync(listingId);
    setCompareIds(ids);
    if (capped) {
      toast.message(t("comparePage.maxReached"));
    }
  };

  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;

  return (
    <>
      <PageMeta title={t("home.pageTitle")} description={t("home.pageDescription")} />
      <DesktopShell
        compareCount={compareIds.length}
      search={
        <SearchPill
          location={location}
          onLocationChange={setLocation}
          propertyType={propertyType}
          onTypeChange={setPropertyType}
          budget={budget}
          onBudgetChange={setBudget}
          onSearch={handleSearch}
        />
      }
      categoryBar={
        <CategoryBar
          active={category}
          onChange={setCategory}
          onFiltersClick={() => setFiltersOpen(true)}
          mapMode={mapMode}
          onToggleMap={() => setMapMode((v) => !v)}
        />
      }
    >
      {!mapMode && !loading && (
        <DesktopHero
          listingCount={cards.length}
          onBrowse={() => navigate("/search")}
          onListProperty={() => navigate(listPropertyPath)}
        />
      )}

      {filtersOpen && (
        <FiltersPanel
          verifiedOnly={verifiedOnly}
          onVerifiedOnlyChange={setVerifiedOnly}
          minBedrooms={minBedrooms}
          onMinBedroomsChange={setMinBedrooms}
          ghanaRegion={ghanaRegion}
          onGhanaRegionChange={setGhanaRegion}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {!loading && (
        <section className="mb-8 overflow-x-auto" aria-label={t("searchPage.region")}>
          <div className="flex min-w-max gap-2 pb-1">
            <button
              type="button"
              onClick={() => setGhanaRegion("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                ghanaRegion === "all"
                  ? "bg-brand-forest text-white"
                  : "bg-surface-subtle text-ink hover:bg-surface-hover"
              }`}
            >
              {t("searchPage.allRegions")}
            </button>
            {GHANA_REGIONS.map((region) => (
              <button
                key={region.code}
                type="button"
                onClick={() => setGhanaRegion(region.code)}
                className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  ghanaRegion === region.code
                    ? "bg-brand-forest text-white"
                    : "bg-surface-subtle text-ink hover:bg-surface-hover"
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && visible.length === 0 && cards.length > 0 && (
        <p className="desktop-inline-note mb-6">
          {t("home.noFilterMatches")}{" "}
          <button type="button" className="desktop-inline-link" onClick={() => setCategory("all")}>
            {t("home.clearFilters")}
          </button>
          .
        </p>
      )}

      {mapMode ? (
        <div className="hidden gap-6 lg:grid lg:grid-cols-2">
          <div className="max-h-[calc(100vh-12rem)] space-y-6 overflow-y-auto pe-1">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
              {visible.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  saved={savedIds.includes(listing.id)}
                  compared={compareIds.includes(listing.id)}
                  onToggleSave={handleToggleSave}
                  onToggleCompare={handleToggleCompare}
                />
              ))}
            </div>
          </div>
          <div className="sticky top-28 h-[calc(100vh-12rem)]">
            <Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-surface-subtle" />}>
              <MapErrorBoundary>
                <MapView listings={mapListings} />
              </MapErrorBoundary>
            </Suspense>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <ListingCarousel
              title={
                market?.city
                  ? t("onboarding.popularTitle", { city: market.city })
                  : t("home.popularInAccra")
              }
              listings={featured}
              savedIds={savedIds}
              compareIds={compareIds}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
            />
          )}

          <section className={featured.length > 0 ? "mt-12" : ""}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="section-heading">
                  {location.trim() ? t("home.homesIn", { location: location.trim() }) : t("home.exploreHomes")}
                </h2>
                {!loading && visible.length > 0 && (
                  <p className="mt-1 text-sm text-ink-secondary">
                    {visible.length === 1
                      ? t("home.propertyAvailable")
                      : t("home.propertiesAvailable", { count: visible.length })}
                  </p>
                )}
              </div>
              <Link to="/search" className="desktop-text-link">
                {t("home.viewAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {visible.length === 0 ? (
              <EmptyState onBrowse={() => navigate("/search")} onListProperty={() => navigate(listPropertyPath)} />
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visible.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    compared={compareIds.includes(listing.id)}
                    onToggleSave={handleToggleSave}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </DesktopShell>
    </>
  );
}

function DesktopHero({
  listingCount,
  onBrowse,
  onListProperty,
}: {
  listingCount: number;
  onBrowse: () => void;
  onListProperty: () => void;
}) {
  const { t } = useTranslation();
  const quickLinks = [
    { label: t("home.heroForRent"), to: "/search?listingType=rental", icon: Key },
    { label: t("home.heroForSale"), to: "/search?listingType=sale", icon: HomeIcon },
    { label: t("home.heroShortStays"), to: "/search?listingType=short_stay", icon: Compass },
    { label: t("home.heroVerified"), to: "/search?verified=true", icon: ShieldCheck },
  ];

  return (
    <section className="desktop-hero mb-10 hidden md:block">
      <div className="desktop-hero-glow" aria-hidden />
      <div className="desktop-hero-glow-secondary" aria-hidden />
      <div className="desktop-hero-content">
        <p className="desktop-hero-eyebrow">
          <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
          <span>{t("home.heroEyebrow")}</span>
        </p>
        <h1 className="desktop-hero-title">{t("home.heroTitle")}</h1>
        <p className="desktop-hero-subtitle">{t("home.heroSubtitle")}</p>

        <div className="desktop-hero-actions">
          <button type="button" onClick={onBrowse} className="desktop-hero-btn desktop-hero-btn-primary">
            {t("common.startExploring")}
          </button>
          <button type="button" onClick={onListProperty} className="desktop-hero-btn desktop-hero-btn-secondary">
            {t("nav.listProperty")}
          </button>
        </div>

        <div className="desktop-hero-chips">
          {quickLinks.map(({ label, to, icon: Icon }) => (
            <Link key={label} to={to} className="desktop-hero-chip">
              <Icon className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {listingCount > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/85 px-3.5 py-1 text-xs font-medium text-ink-secondary backdrop-blur-md shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("home.heroListingsLive", { count: listingCount })}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ListingCarousel({
  title,
  listings,
  savedIds,
  compareIds,
  onToggleSave,
  onToggleCompare,
}: {
  title: string;
  listings: MarketplaceListingCard[];
  savedIds: string[];
  compareIds: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: number) {
    scrollRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="section-heading">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="carousel-nav-btn cursor-pointer"
            aria-label={t("home.scrollLeft")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="carousel-nav-btn cursor-pointer"
            aria-label={t("home.scrollRight")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="listing-scroll">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            compact
            saved={savedIds.includes(listing.id)}
            compared={compareIds.includes(listing.id)}
            onToggleSave={onToggleSave}
            onToggleCompare={onToggleCompare}
          />
        ))}
      </div>
    </section>
  );
}

function FiltersPanel({
  verifiedOnly,
  onVerifiedOnlyChange,
  minBedrooms,
  onMinBedroomsChange,
  ghanaRegion,
  onGhanaRegionChange,
  onClose,
}: {
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (value: boolean) => void;
  minBedrooms: number;
  onMinBedroomsChange: (value: number) => void;
  ghanaRegion: string;
  onGhanaRegionChange: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  // UX: Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleReset = () => {
    onVerifiedOnlyChange(false);
    onMinBedroomsChange(0);
    onGhanaRegionChange("all");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-surface-border bg-surface p-6 sm:p-7 text-ink shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-surface-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">{t("home.filters")}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-hover hover:text-ink cursor-pointer transition"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("home.clearFilters")}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-ink-secondary hover:bg-surface-hover hover:text-ink cursor-pointer transition"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
              {t("searchPage.region")}
            </label>
            <select
              value={ghanaRegion}
              onChange={(e) => onGhanaRegionChange(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-subtle px-3 py-2.5 text-sm text-ink"
            >
              <option value="all">{t("searchPage.allRegions")}</option>
              {GHANA_REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-subtle p-3.5 text-sm font-medium text-ink cursor-pointer hover:bg-surface-hover transition-colors">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t("home.verifiedAgenciesOnly")}
            </span>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => onVerifiedOnlyChange(e.target.checked)}
              className="h-4 w-4 rounded border-surface-border text-brand-forest focus:ring-primary cursor-pointer accent-brand-forest"
            />
          </label>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
              {t("home.minBedrooms")}
            </label>
            <select
              value={minBedrooms}
              onChange={(e) => onMinBedroomsChange(Number(e.target.value))}
              className="w-full rounded-xl border border-surface-border bg-surface text-ink px-4 py-3 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
            >
              <option value={0}>{t("search.any")}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+ {n === 1 ? "bedroom" : "bedrooms"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-brand-orange to-[#c45d44] py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          {t("home.showResults")}
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  onBrowse,
  onListProperty,
}: {
  onBrowse: () => void;
  onListProperty: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="desktop-empty-state">
      <div className="desktop-empty-state-icon" aria-hidden>
        <HomeIcon className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-ink">{t("home.emptyTitle")}</h2>
      <p className="mt-2 max-w-md text-ink-secondary">{t("home.emptyDesc")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onBrowse} className="desktop-hero-btn desktop-hero-btn-primary">
          {t("home.browseAll")}
        </button>
        <button type="button" onClick={onListProperty} className="desktop-hero-btn desktop-hero-btn-secondary">
          {t("nav.listProperty")}
        </button>
      </div>
    </div>
  );
}
