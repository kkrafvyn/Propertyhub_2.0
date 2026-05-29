import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Search,
  SlidersHorizontal,
  Grid3x3,
  List,
  Map,
  MapPin,
  Bed,
  Bath,
  X,
  Bell,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { DiasporaPrice } from "../components/DiasporaPrice";
import { ActionEmptyState, PageLoadingState } from "../components/PageStates";
import { PropertyMap, type PropertyMapMarker } from "../components/PropertyMap";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { motion, AnimatePresence } from "motion/react";
import { useMobileShell } from "../mobile/MobileShellContext";
import { getPropertyCoverImage } from "../../lib/property-media";
import { listingService, type PublicLocationSummary } from "../../lib/listing.service";
import { buildPublicMapUrl } from "../../lib/map-provider";
import {
  PROPERTY_CATEGORY_OPTIONS,
  formatPropertyCategory,
  normalizePropertyCategory,
} from "../../lib/property-category";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import {
  buildReferralQueryString,
  captureReferralContext,
  formatReferralChannel,
  hasReferralContext,
  readReferralContext,
} from "../../lib/referral-context";
import { trackReferralSearchAlert, trackReferralVisit } from "../../lib/referral-attribution.service";
import {
  buildAbsoluteSearchUrl,
  buildSearchPath,
  type SearchShareInput,
  matchesAlertSearch,
} from "../../lib/search-sharing";

const PAGE_SIZE = 12;
const AMENITY_FILTER_OPTIONS = [
  "Air conditioning",
  "Parking",
  "Security",
  "Backup power",
  "Water storage",
  "Furnished",
];

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatCoordinate(value?: number | null, axis: "lat" | "lng" = "lat") {
  if (!isFiniteCoordinate(value)) return axis === "lat" ? "Lat pending" : "Lng pending";
  return `${Math.abs(value).toFixed(4)} ${value >= 0 ? (axis === "lat" ? "N" : "E") : axis === "lat" ? "S" : "W"}`;
}

function formatCompactPrice(amount: number, currency = "GHS", listingType?: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return listingType === "rental" ? "Rent" : "Listing";
  }

  const compactValue = new Intl.NumberFormat("en-GH", {
    notation: "compact",
    maximumFractionDigits: amount >= 1000000 ? 1 : 0,
  }).format(amount);

  const prefix = currency === "GHS" ? "GHS" : currency;
  return listingType === "rental" ? `${prefix} ${compactValue}/mo` : `${prefix} ${compactValue}`;
}

export function PropertySearch() {
  const { isMobileShell } = useMobileShell();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">(isMobileShell ? "list" : "grid");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<"immediate" | "daily" | "weekly">("daily");
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [selectedMapListingId, setSelectedMapListingId] = useState<string | null>(null);
  const currentPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const amenitySearchParam = searchParams.get("amenities") || "";

  const buildFiltersFromSearchParams = (params: URLSearchParams) => ({
    priceMin: params.get("priceMin") || "",
    priceMax: params.get("priceMax") || "",
    bedrooms: params.get("bedrooms") || "",
    bathrooms: params.get("bathrooms") || "",
    propertyType:
      normalizePropertyCategory(params.get("propertyType")) ||
      normalizePropertyCategory(params.get("category")) ||
      "all",
    listingType:
      params.get("listingType") ||
      (["rental", "sale", "lease"].includes(params.get("type") || "")
        ? (params.get("type") as "rental" | "sale" | "lease")
        : "rental"),
    amenities: params.get("amenities") || amenitySearchParam,
  });

  const appliedFilters = useMemo(() => buildFiltersFromSearchParams(searchParams), [searchParams]);
  const [filters, setFilters] = useState(appliedFilters);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [locationSuggestions, setLocationSuggestions] = useState<PublicLocationSummary[]>([]);
  const [popularLocations, setPopularLocations] = useState<PublicLocationSummary[]>([]);

  useEffect(() => {
    setFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    setSearchInput(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    loadListings();
  }, [searchParams, appliedFilters]);

  useEffect(() => {
    captureReferralContext(searchParams);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    listingService
      .getPopularLocations(6)
      .then((data) => {
        if (!cancelled) {
          setPopularLocations(data);
        }
      })
      .catch((error) => {
        console.error("Failed to load popular locations:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = searchInput.trim();

    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      listingService
        .getLocationSuggestions(query, 6)
        .then((data) => {
          if (!cancelled) {
            setLocationSuggestions(data);
          }
        })
        .catch((error) => {
          console.error("Failed to load location suggestions:", error);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!user) {
      setUserAlerts([]);
      return;
    }

    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const alerts = await savedSearchAlertService.getUserAlerts(user.id);
        if (!cancelled) {
          setUserAlerts(alerts);
        }
      } catch (error) {
        console.error("Failed to load saved alerts:", error);
      }
    };

    void loadAlerts();

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
      const searchFilter = {
        location: searchParams.get("q") || undefined,
        priceMin: appliedFilters.priceMin ? parseInt(appliedFilters.priceMin, 10) : undefined,
        priceMax: appliedFilters.priceMax ? parseInt(appliedFilters.priceMax, 10) : undefined,
        bedrooms: parseCountFilter(appliedFilters.bedrooms),
        bathrooms: parseCountFilter(appliedFilters.bathrooms),
        propertyType: appliedFilters.propertyType !== "all" ? appliedFilters.propertyType : undefined,
        listingType: appliedFilters.listingType as "rental" | "sale" | "lease",
        amenities: appliedFilters.amenities
          ? appliedFilters.amenities
              .split(",")
              .map((amenity) => amenity.trim())
              .filter(Boolean)
          : undefined,
      };

      const offset = (currentPage - 1) * PAGE_SIZE;
      const data = await listingService.searchListingsWithCount(searchFilter, PAGE_SIZE, offset);
      setListings(data.results);
      setTotalResults(data.total);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    const nextParams = new URLSearchParams(searchParams);
    const trimmedQuery = searchInput.trim();

    if (trimmedQuery) nextParams.set("q", trimmedQuery);
    else nextParams.delete("q");

    nextParams.set("listingType", filters.listingType);
    nextParams.delete("page");
    setSearchParams(nextParams);
  };

  const applyLocationSuggestion = (location: PublicLocationSummary) => {
    setSearchInput(location.label);
    setLocationSuggestions([]);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("q", location.label);
    nextParams.set("listingType", filters.listingType);
    nextParams.delete("page");
    setSearchParams(nextParams);
  };

  const handleSaveAlert = async () => {
    if (!user) {
      toast.error("Log in to save this search.");
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
        listingType: appliedFilters.listingType as "rental" | "sale" | "lease",
        propertyType: appliedFilters.propertyType !== "all" ? appliedFilters.propertyType : null,
        priceMin: appliedFilters.priceMin ? parseInt(appliedFilters.priceMin, 10) : null,
        priceMax: appliedFilters.priceMax ? parseInt(appliedFilters.priceMax, 10) : null,
        bedrooms: parseCountFilter(appliedFilters.bedrooms) ?? null,
        bathrooms: parseCountFilter(appliedFilters.bathrooms) ?? null,
        frequency: alertFrequency,
        amenities: appliedFilters.amenities
          ? appliedFilters.amenities
              .split(",")
              .map((amenity) => amenity.trim())
              .filter(Boolean)
          : [],
        alertRules: ["new_listing", "price_drop"],
        initialMatchCount: totalResults,
      });

      setUserAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
      trackReferralSearchAlert(referralContext, {
        source: "property-search",
        landingPath: currentSearchPath,
      });
      toast.success("Search alert saved.");
    } catch (error) {
      console.error("Failed to save search alert:", error);
      toast.error("We couldn't save this alert right now.");
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

    nextParams.set("listingType", filters.listingType);

    if (filters.amenities) nextParams.set("amenities", filters.amenities);
    else nextParams.delete("amenities");

    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("priceMin");
    nextParams.delete("priceMax");
    nextParams.delete("bedrooms");
    nextParams.delete("bathrooms");
    nextParams.delete("propertyType");
    nextParams.delete("amenities");
    nextParams.delete("page");
    nextParams.set("listingType", filters.listingType);
    setSearchParams(nextParams);
  };

  const toggleAmenityFilter = (amenity: string) => {
    const currentAmenities = filters.amenities
      ? filters.amenities.split(",").filter(Boolean)
      : [];
    const nextAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter((item) => item !== amenity)
      : [...currentAmenities, amenity];

    setFilters({ ...filters, amenities: nextAmenities.join(",") });
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
    const listingTypeLabel =
      appliedFilters.listingType === "sale"
        ? "Sale"
        : appliedFilters.listingType === "lease"
          ? "Lease"
          : "Rent";
    const locationLabel = searchParams.get("q");

    if (locationLabel) {
      return `Properties for ${listingTypeLabel} in ${locationLabel}`;
    }

    return `Properties for ${listingTypeLabel}`;
  }, [appliedFilters.listingType, searchParams]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  const resultSummary = useMemo(() => {
    if (totalResults === 0) return "0 properties found";

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalResults);
    return `Showing ${start}-${end} of ${totalResults} properties`;
  }, [currentPage, totalResults]);

  const referralContext = useMemo(() => {
    const directContext = {
      ref: searchParams.get("ref"),
      channel: searchParams.get("channel"),
    };

    return hasReferralContext(directContext) ? directContext : readReferralContext();
  }, [searchParams]);

  const referralQueryString = useMemo(
    () => buildReferralQueryString(referralContext),
    [referralContext]
  );

  const currentSearchInput = useMemo(
    () =>
      ({
        q: searchParams.get("q"),
        listingType: appliedFilters.listingType,
        propertyType: appliedFilters.propertyType !== "all" ? appliedFilters.propertyType : null,
        priceMin: appliedFilters.priceMin || null,
        priceMax: appliedFilters.priceMax || null,
        bedrooms: appliedFilters.bedrooms || null,
        bathrooms: appliedFilters.bathrooms || null,
        ref: referralContext?.ref || null,
        channel: referralContext?.channel || null,
      }) satisfies SearchShareInput,
    [appliedFilters, referralContext?.channel, referralContext?.ref, searchParams]
  );
  const currentSearchPath = useMemo(
    () => buildSearchPath(currentSearchInput),
    [currentSearchInput]
  );
  const currentSearchUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return buildAbsoluteSearchUrl(currentSearchInput, window.location.origin);
  }, [currentSearchInput]);
  const encodedSearchUrl = encodeURIComponent(currentSearchUrl);
  const encodedSearchTitle = encodeURIComponent(resultsTitle);
  const socialShareLinks = useMemo(
    () => [
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodedSearchTitle}%20${encodedSearchUrl}`,
      },
      {
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedSearchUrl}`,
      },
      {
        label: "X",
        href: `https://twitter.com/intent/tweet?text=${encodedSearchTitle}&url=${encodedSearchUrl}`,
      },
    ],
    [encodedSearchTitle, encodedSearchUrl]
  );
  const currentSearchSaved = useMemo(
    () => userAlerts.some((alert) => matchesAlertSearch(alert, currentSearchInput)),
    [currentSearchInput, userAlerts]
  );

  const buildPropertyHref = (listingId: string) => `/property/${listingId}${referralQueryString}`;

  useEffect(() => {
    if (!hasReferralContext(referralContext)) return;

    trackReferralVisit(referralContext, {
      source: "property-search",
      landingPath: currentSearchPath,
    });
  }, [currentSearchPath, referralContext]);

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
  const mapPoints = useMemo<PropertyMapMarker[]>(
    () =>
      listings
        .filter(
          (listing) =>
            isFiniteCoordinate(listing?.property?.latitude) &&
            isFiniteCoordinate(listing?.property?.longitude)
        )
        .map((listing) => ({
          id: listing.id,
          latitude: Number(listing.property.latitude),
          longitude: Number(listing.property.longitude),
          label: listing.property?.address || "Property",
          subtitle: [listing.property?.city, listing.property?.region].filter(Boolean).join(", "),
          caption: listing.property?.ghana_post_gps
            ? `GhanaPostGPS ${listing.property.ghana_post_gps}`
            : "Verified listing coordinate",
          badge: formatCompactPrice(
            Number(listing.price || 0),
            listing.currency || "GHS",
            listing.listing_type
          ),
        })),
    [listings]
  );
  const selectedMapPoint = useMemo(
    () => mapPoints.find((point) => point.id === selectedMapListingId) || null,
    [mapPoints, selectedMapListingId]
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

    return searchParams.get("q") || "Accra, Ghana";
  }, [searchParams, selectedMapListing]);
  const selectedMapUrl = useMemo(() => {
    return buildPublicMapUrl({
      latitude: selectedMapPoint?.latitude,
      longitude: selectedMapPoint?.longitude,
      query: selectedMapQuery,
    });
  }, [selectedMapPoint, selectedMapQuery]);
  const marketPulse = useMemo(() => {
    const verifiedCount = listings.filter((listing) => listing.organization?.verified).length;
    const prices = listings
      .map((listing) => Number(listing.price || 0))
      .filter((price) => Number.isFinite(price) && price > 0);
    const averagePrice =
      prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const topLocation = popularLocations[0];

    return {
      verifiedCount,
      averagePrice,
      topLocation,
      alertText:
        totalResults > 0
          ? `${totalResults} active match${totalResults === 1 ? "" : "es"} with ${verifiedCount} verified agenc${verifiedCount === 1 ? "y" : "ies"}.`
          : "No active matches yet. Save the search to catch the next listing.",
    };
  }, [listings, popularLocations, totalResults]);

  const handleShareSearch = async () => {
    if (!currentSearchUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: resultsTitle,
          text: "Take a look at this BaytMiftah search.",
          url: currentSearchUrl,
        });
      } else {
        await navigator.clipboard.writeText(currentSearchUrl);
        toast.success("Search link copied to your clipboard.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to share search:", error);
      toast.error("We couldn't share this search right now.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4 max-w-7xl mx-auto" : "pt-24 pb-12 px-4 max-w-7xl mx-auto"}>
        {/* Search Header */}
        <div className="mb-8">
          <Card className="mb-6 overflow-visible border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(247,247,247,1))] p-5 sm:p-6">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { label: "Rent", value: "rental" },
                    { label: "Buy", value: "sale" },
                    { label: "Lease", value: "lease" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          listingType: option.value as typeof current.listingType,
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        filters.listingType === option.value
                          ? "bg-primary text-white"
                          : "bg-secondary text-foreground hover:bg-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-background px-4 py-2 shadow-sm">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchInput}
                    list="property-location-suggestions"
                    placeholder="Search by city, neighborhood, address, or GhanaPostGPS"
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearchSubmit();
                      }
                    }}
                    className="border-0 bg-transparent px-0 py-2 shadow-none focus:ring-0"
                  />
                </div>

                <Button type="submit" size="lg" className="xl:min-w-[152px]">
                  <Search className="h-4 w-4" />
                  Update Search
                </Button>
              </div>

              <datalist id="property-location-suggestions">
                {[...locationSuggestions, ...popularLocations].map((location) => (
                  <option key={`${location.label}-${location.region}`} value={location.label} />
                ))}
              </datalist>

              {locationSuggestions.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {locationSuggestions.map((location) => (
                    <button
                      key={`${location.label}-${location.region}`}
                      type="button"
                      onClick={() => applyLocationSuggestion(location)}
                      className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
                    >
                      {location.label}
                    </button>
                  ))}
                </div>
              ) : popularLocations.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {popularLocations.map((location) => (
                    <button
                      key={`${location.label}-${location.region}`}
                      type="button"
                      onClick={() => applyLocationSuggestion(location)}
                      className="rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/25 hover:bg-primary/5"
                    >
                      {location.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </form>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{resultsTitle}</h1>
              <p className="text-muted-foreground">{resultSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user && (
                <Link to="/app/compare">
                  <Button variant="outline" size="sm">
                    Compare Saved
                  </Button>
                </Link>
              )}
              <select
                className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                value={alertFrequency}
                onChange={(event) =>
                  setAlertFrequency(event.target.value as typeof alertFrequency)
                }
                aria-label="Saved alert frequency"
              >
                <option value="immediate">Immediate alerts</option>
                <option value="daily">Daily alerts</option>
                <option value="weekly">Weekly digest</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSaveAlert()}
                disabled={savingAlert}
              >
                <Bell className="w-4 h-4" />
                {savingAlert ? "Saving..." : "Save Alert"}
              </Button>
              <div className="hidden flex-wrap gap-2 md:flex">
                <Button variant="outline" size="sm" onClick={() => void handleShareSearch()}>
                  <Share2 className="w-4 h-4" />
                  Share Search
                </Button>
                {socialShareLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  variant={viewMode === "grid" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                >
                  <Map className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </div>
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

        {user && currentSearchSaved && (
          <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">This search is already on watch.</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll keep tracking new matches for this filter set in your saved alerts.
                </p>
              </div>
              <Link to="/app/alerts">
                <Button variant="outline" size="sm">
                  Open Alerts
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {hasReferralContext(referralContext) && (
          <Card className="p-4 mb-6 bg-accent/5 border-accent/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">
                  Shared via {formatReferralChannel(referralContext.channel)}
                </p>
                <p className="text-sm text-muted-foreground">
                  You&apos;re browsing with a trusted referral link. Save listings you like so you can compare them later.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user && (
                  <Link to="/app/compare">
                    <Button variant="outline" size="sm">
                      Compare Saved
                    </Button>
                  </Link>
                )}
                <Link to="/app/buying-tools">
                  <Button variant="outline" size="sm">
                    Buyer Toolkit
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 mb-6 border-primary/10 bg-secondary/20">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Marketplace pulse
              </p>
              <p className="mt-1 font-semibold">{marketPulse.alertText}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Heat-map data is currently based on BaytMiftah search and area-guide signals. Live flood, power, water, safety, and transit feeds remain gated in provider readiness.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Average visible price</p>
              <p className="mt-1 text-lg font-semibold">
                {marketPulse.averagePrice > 0
                  ? `GHS ${Math.round(marketPulse.averagePrice).toLocaleString()}`
                  : "Pending"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Hot location</p>
              <p className="mt-1 text-lg font-semibold">
                {marketPulse.topLocation?.label || "Building signal"}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full lg:w-80 lg:flex-shrink-0"
              >
                <Card className="p-6 lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-secondary rounded-lg transition-colors"
                      type="button"
                      aria-label="Close filters"
                      title="Close filters"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Listing Type */}
                    <div>
                      <label className="block mb-3 font-semibold">Listing Type</label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                          onClick={() => setFilters({ ...filters, listingType: "rental" })}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                            filters.listingType === "rental"
                              ? "bg-primary text-white"
                              : "bg-secondary hover:bg-muted"
                          }`}
                        >
                          Rent
                        </button>
                        <button
                          onClick={() => setFilters({ ...filters, listingType: "sale" })}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                            filters.listingType === "sale"
                              ? "bg-primary text-white"
                              : "bg-secondary hover:bg-muted"
                          }`}
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => setFilters({ ...filters, listingType: "lease" })}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                            filters.listingType === "lease"
                              ? "bg-primary text-white"
                              : "bg-secondary hover:bg-muted"
                          }`}
                        >
                          Lease
                        </button>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block mb-3 font-semibold">Price Range (GHS)</label>
                      <div className="flex min-w-0 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.priceMin}
                          onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.priceMax}
                          onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Property Type */}
                    <div>
                      <label className="block mb-3 font-semibold" htmlFor="property-type-filter">
                        Property Type
                      </label>
                      <select
                        id="property-type-filter"
                        value={filters.propertyType}
                        onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                        aria-label="Property type"
                        title="Property type"
                      >
                        <option value="all">All Types</option>
                        {PROPERTY_CATEGORY_OPTIONS.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="block mb-3 font-semibold">Bedrooms</label>
                      <div className="grid grid-cols-5 gap-2 overflow-x-auto pb-1">
                        {["Any", "1", "2", "3", "4+"].map((bed) => (
                          <button
                            key={bed}
                            onClick={() => setFilters({ ...filters, bedrooms: bed === "Any" ? "" : bed })}
                            className={`py-2 px-3 rounded-lg transition-all ${
                              (filters.bedrooms || "Any") === bed
                                ? "bg-primary text-white"
                                : "bg-secondary hover:bg-muted"
                            }`}
                          >
                            {bed}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <label className="block mb-3 font-semibold">Bathrooms</label>
                      <div className="grid grid-cols-5 gap-2 overflow-x-auto pb-1">
                        {["Any", "1", "2", "3", "4+"].map((bath) => (
                          <button
                            key={bath}
                            onClick={() => setFilters({ ...filters, bathrooms: bath === "Any" ? "" : bath })}
                            className={`py-2 px-3 rounded-lg transition-all ${
                              (filters.bathrooms || "Any") === bath
                                ? "bg-primary text-white"
                                : "bg-secondary hover:bg-muted"
                            }`}
                          >
                            {bath}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <label className="block mb-3 font-semibold">Amenities</label>
                      <div className="grid grid-cols-1 gap-2">
                        {AMENITY_FILTER_OPTIONS.map((amenity) => {
                          const selectedAmenities = filters.amenities
                            ? filters.amenities.split(",").filter(Boolean)
                            : [];
                          const isSelected = selectedAmenities.includes(amenity);

                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => toggleAmenityFilter(amenity)}
                              className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-secondary hover:bg-muted"
                              }`}
                            >
                              {amenity}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button className="w-full" size="lg" onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </Card>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Properties Grid/List */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <PageLoadingState label="Loading matching properties..." />
            ) : listings.length === 0 ? (
              <ActionEmptyState
                icon={Search}
                eyebrow="No matches yet"
                title="No properties match this exact search."
                description="Try widening the price range, removing an amenity, or saving the search so BaytMiftah can alert you when a new match arrives."
                actions={
                  <>
                    <Button onClick={clearFilters}>Clear Filters</Button>
                    <Button variant="outline" onClick={() => void handleSaveAlert()}>
                      <Bell className="h-4 w-4" />
                      Save This Search
                    </Button>
                  </>
                }
              />
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-muted-foreground">{resultSummary}</p>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing, index) => (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link to={buildPropertyHref(listing.id)}>
                          <Card hover className="group overflow-hidden rounded-[1.5rem] border-border/70 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                            <div className="relative h-52 overflow-hidden">
                              <img
                                src={getPropertyCoverImage(listing.property)}
                                alt={listing.property?.address}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 to-transparent" />
                              <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize backdrop-blur-sm">
                                {listing.listing_type}
                              </div>
                              <div className="absolute right-3 top-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                                {formatPropertyCategory(listing.property?.category)}
                              </div>
                              {listing.organization?.verified && (
                                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Verified agency
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                                {listing.property?.address || 'Property'}
                              </h3>
                              <div className="flex items-center gap-1 text-muted-foreground mb-3">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">{listing.property?.city}, {listing.property?.region}</span>
                              </div>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <DiasporaPrice
                                    amount={Number(listing.price || 0)}
                                    currency={listing.currency || "GHS"}
                                    suffix={listing.listing_type === "rental" ? "/month" : ""}
                                  />
                                </div>
                              </div>
                              {listing.property?.bedrooms && (
                                <div className="flex gap-4 text-sm text-muted-foreground border-t border-border pt-3">
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
                              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                                <span className="text-muted-foreground">Open full listing</span>
                                <span className="font-semibold text-primary">View details</span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
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
                        <Link to={buildPropertyHref(listing.id)}>
                          <Card hover className="group overflow-hidden rounded-[1.5rem] border-border/70 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.1)]">
                            <div className="flex flex-col md:flex-row">
                              <div className="relative w-full md:w-80 h-48 flex-shrink-0 overflow-hidden">
                                <img
                                  src={getPropertyCoverImage(listing.property)}
                                  alt={listing.property?.address}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize backdrop-blur-sm">
                                  {listing.listing_type}
                                </div>
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-6">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <h3 className="font-semibold text-xl mb-2">
                                      {listing.property?.address || 'Property'}
                                    </h3>
                                    {listing.organization?.verified && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground mb-4">
                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                    <span className="min-w-0 truncate">{listing.property?.city}, {listing.property?.region}</span>
                                  </div>
                                  <p className="text-muted-foreground text-sm mb-4">
                                    {listing.property?.description || 'Property available'}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <DiasporaPrice
                                      amount={Number(listing.price || 0)}
                                      currency={listing.currency || "GHS"}
                                      suffix={listing.listing_type === "rental" ? "/month" : ""}
                                      size="lg"
                                    />
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
                                  <span className="text-sm font-semibold text-primary">View details</span>
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
                    <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2 sm:max-h-[560px] xl:max-h-[880px]">
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
                                  {listing.property?.address || "Property"}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {listing.property?.city}, {listing.property?.region}
                                </p>
                                <div className="mt-3">
                                  <DiasporaPrice
                                    amount={Number(listing.price || 0)}
                                    currency={listing.currency || "GHS"}
                                    suffix={listing.listing_type === "rental" ? "/month" : ""}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    <Card className="sticky top-24 overflow-hidden">
                      <div className="flex flex-col gap-3 border-b border-border bg-secondary/20 px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Live market map</p>
                            <p className="text-xs text-muted-foreground">
                              Plotting verified property coordinates for the current search.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                              {mapPoints.length} plotted
                            </span>
                            {listings.length > mapPoints.length ? (
                              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                                {listings.length - mapPoints.length} awaiting geocode
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-background px-3 py-1">
                            Select a card or pin to inspect the property area
                          </span>
                          {selectedMapPoint ? (
                            <span className="rounded-full bg-background px-3 py-1">
                              {formatCoordinate(selectedMapPoint.latitude)} /{" "}
                              {formatCoordinate(selectedMapPoint.longitude, "lng")}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex h-[420px] flex-col sm:h-[560px] xl:h-[880px]">
                        <PropertyMap
                          markers={mapPoints}
                          selectedMarkerId={selectedMapListingId}
                          onMarkerSelect={setSelectedMapListingId}
                          className="rounded-none border-0"
                          heightClassName="min-h-0 flex-1"
                          emptyStateTitle="The live map is ready for this search"
                          emptyStateDescription="We still need verified coordinates for these results, so BaytMiftah is holding the map on the Ghana overview until the listing team geocodes the properties."
                        />

                        {selectedMapListing ? (
                          <div className="border-t border-border bg-background px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">
                                    {selectedMapListing.property?.address || "Property"}
                                  </p>
                                  {selectedMapPoint ? (
                                    <span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                                      Coordinate verified
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                      Coordinate pending
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {selectedMapListing.property?.city}, {selectedMapListing.property?.region}
                                  {selectedMapListing.property?.ghana_post_gps
                                    ? ` / ${selectedMapListing.property.ghana_post_gps}`
                                    : ""}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {selectedMapPoint
                                    ? `${formatCoordinate(selectedMapPoint.latitude)} / ${formatCoordinate(
                                        selectedMapPoint.longitude,
                                        "lng"
                                      )}`
                                    : "This listing can still open in the wider map search while the team finishes its geocode."}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Link to={buildPropertyHref(selectedMapListing.id)}>
                                  <Button size="sm">Open Listing</Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(selectedMapUrl, "_blank", "noopener,noreferrer")
                                  }
                                >
                                  <Map className="h-4 w-4" />
                                  Open Full Map
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
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
    </div>
  );
}
