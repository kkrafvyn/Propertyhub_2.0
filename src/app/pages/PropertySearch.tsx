import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Search, SlidersHorizontal, Grid3x3, List, Map, MapPin, Bed, Bath, X, Loader2, Bell } from "lucide-react";
import { Navbar } from "../components/Navbar";
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

const PAGE_SIZE = 12;

export function PropertySearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [savingAlert, setSavingAlert] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [selectedMapListingId, setSelectedMapListingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);

  const buildFiltersFromSearchParams = () => ({
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
      (["rental", "sale", "lease"].includes(searchParams.get("type") || "")
        ? (searchParams.get("type") as "rental" | "sale" | "lease")
        : "rental"),
  });

  const [filters, setFilters] = useState(buildFiltersFromSearchParams());

  useEffect(() => {
    setFilters(buildFiltersFromSearchParams());
  }, [searchParams]);

  useEffect(() => {
    loadListings();
  }, [searchParams]);

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
        priceMin: filters.priceMin ? parseInt(filters.priceMin, 10) : undefined,
        priceMax: filters.priceMax ? parseInt(filters.priceMax, 10) : undefined,
        bedrooms: parseCountFilter(filters.bedrooms),
        bathrooms: parseCountFilter(filters.bathrooms),
        propertyType: filters.propertyType !== "all" ? filters.propertyType : undefined,
        listingType: filters.listingType as "rental" | "sale" | "lease",
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
        listingType: filters.listingType as "rental" | "sale" | "lease",
        propertyType: filters.propertyType !== "all" ? filters.propertyType : null,
        priceMin: filters.priceMin ? parseInt(filters.priceMin, 10) : null,
        priceMax: filters.priceMax ? parseInt(filters.priceMax, 10) : null,
        bedrooms: parseCountFilter(filters.bedrooms) ?? null,
        bathrooms: parseCountFilter(filters.bathrooms) ?? null,
        initialMatchCount: totalResults,
      });

      setUserAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]);
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
    const listingTypeLabel =
      filters.listingType === "sale"
        ? "Sale"
        : filters.listingType === "lease"
          ? "Lease"
          : "Rent";
    const locationLabel = searchParams.get("q");

    if (locationLabel) {
      return `Properties for ${listingTypeLabel} in ${locationLabel}`;
    }

    return `Properties for ${listingTypeLabel}`;
  }, [filters.listingType, searchParams]);

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

    return searchParams.get("q") || "Accra, Ghana";
  }, [searchParams, selectedMapListing]);
  const selectedMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    selectedMapQuery
  )}&output=embed`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{resultsTitle}</h1>
              <p className="text-muted-foreground">{resultSummary}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSaveAlert()}
                disabled={savingAlert}
              >
                <Bell className="w-4 h-4" />
                {savingAlert ? "Saving..." : "Save Alert"}
              </Button>
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
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="hidden md:block w-80 flex-shrink-0"
              >
                <Card className="p-6 sticky top-24">
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
                      <div className="flex gap-2">
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
                      <div className="flex gap-2">
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
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="office">Office</option>
                        <option value="commercial">Commercial</option>
                        <option value="land">Land</option>
                      </select>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="block mb-3 font-semibold">Bedrooms</label>
                      <div className="grid grid-cols-5 gap-2">
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
                      <div className="grid grid-cols-5 gap-2">
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
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No properties found matching your criteria</p>
              </div>
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
                        <Link to={`/property/${listing.id}`}>
                          <Card hover className="overflow-hidden">
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={getPropertyCoverImage(listing.property)}
                                alt={listing.property?.address}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                                {listing.property?.category || 'Property'}
                              </div>
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
                                  <span className="text-2xl font-semibold text-primary">
                                    GHS {listing.price.toLocaleString()}
                                  </span>
                                  {listing.listing_type === 'rental' && (
                                    <span className="text-sm text-muted-foreground">/month</span>
                                  )}
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
                                  {listing.property?.address || "Property"}
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
    </div>
  );
}
