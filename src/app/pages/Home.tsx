import { Link, useNavigate } from "react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { listingService } from "../../lib/listing.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { syncCompareIds, toggleCompareIdAsync } from "../../lib/compare-listings";
import { normalizePropertyCategory } from "../../lib/property-category";
import { useAuth } from "../context/AuthContext";
import {
  BackendBanner,
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
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("any");
  const [budget, setBudget] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minBedrooms, setMinBedrooms] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [mapMode, setMapMode] = useState(false);
  const [compareToast, setCompareToast] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const rows = await listingService.getPublicListings(60, 0);
        if (!ignore) setListings(rows);
      } catch (error) {
        console.error("Failed to load listings:", error);
        if (!ignore) toast.error("Failed to load listings");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    syncCompareIds().then(setCompareIds);
  }, []);

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

  const cards = useMemo(() => listings.map(mapListingToCard), [listings]);

  const visible = useMemo(() => {
    const query = location.trim().toLowerCase();

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
      const matchesQuery = !query || haystack.includes(query);

      return (
        matchesCategory &&
        matchesType &&
        matchesBudget &&
        matchesVerified &&
        matchesBeds &&
        matchesQuery
      );
    });
  }, [cards, category, location, propertyType, budget, verifiedOnly, minBedrooms]);

  const featured = useMemo(() => cards.filter((l) => l.featured).slice(0, 12), [cards]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set("q", location.trim());
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
      toast.error("Could not update saved property");
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
      setCompareToast("You can compare up to 4 properties.");
      setTimeout(() => setCompareToast(""), 3000);
    }
  };

  return (
    <>
      <PageMeta title="Explore homes" description="Discover properties across Ghana on BaytMiftah." />
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
      <BackendBanner />

      {compareToast && (
        <p className="mb-4 rounded-xl border border-amber-200/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {compareToast}
        </p>
      )}
      {filtersOpen && (
        <FiltersPanel
          verifiedOnly={verifiedOnly}
          onVerifiedOnlyChange={setVerifiedOnly}
          minBedrooms={minBedrooms}
          onMinBedroomsChange={setMinBedrooms}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {!loading && visible.length === 0 && (
        <p className="mb-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-ink-secondary">
          No listings match your filters yet. Try adjusting your search.
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
            <Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-white/10" />}>
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
              title="Popular in Accra"
              listings={featured}
              savedIds={savedIds}
              compareIds={compareIds}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
            />
          )}

          <section className={featured.length > 0 ? "mt-12" : ""}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-heading">
                {location.trim() ? `Homes in ${location}` : "Explore homes"}
              </h2>
              <Link
                to="/search"
                className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline underline-offset-2"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {visible.length === 0 ? (
              <EmptyState />
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
            className="carousel-nav-btn"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="carousel-nav-btn"
            aria-label="Scroll right"
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
  onClose,
}: {
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (value: boolean) => void;
  minBedrooms: number;
  onMinBedroomsChange: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-brand-marketplace p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-ink" />
          </button>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => onVerifiedOnlyChange(e.target.checked)}
          />
          Verified agencies only
        </label>

        <label className="mb-4 block text-sm text-ink">
          Minimum bedrooms
          <select
            value={minBedrooms}
            onChange={(e) => onMinBedroomsChange(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          >
            <option value={0}>Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Show results
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 px-8 py-16 text-center">
      <h2 className="text-xl font-semibold text-ink">No matches found</h2>
      <p className="mt-2 text-ink-secondary">Try adjusting your filters or search in a different area.</p>
    </div>
  );
}
