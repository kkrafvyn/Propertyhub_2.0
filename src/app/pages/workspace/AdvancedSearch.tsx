import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, Filter, MapPin, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import { listingService } from "../../../lib/listing.service";

interface SearchFilter {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  category?: string;
}

interface AdvancedSearchProps {
  organizationId: string;
  currentUserId: string;
}

function formatPrice(amount?: number | null) {
  if (!amount) return "Price on request";
  return `GHS ${amount.toLocaleString()}`;
}

function normalizeSearchFilters(filters: SearchFilter, parsedFilters: Record<string, any>) {
  return {
    location: filters.location?.trim() || parsedFilters.location || undefined,
    priceMin: filters.minPrice || parsedFilters.priceMin || undefined,
    priceMax: filters.maxPrice || parsedFilters.priceMax || undefined,
    bedrooms: filters.bedrooms || parsedFilters.bedrooms || undefined,
    bathrooms: filters.bathrooms || parsedFilters.bathrooms || undefined,
    propertyType: filters.category || parsedFilters.propertyType || undefined,
    listingType: parsedFilters.listingType || undefined,
  };
}

function getMatchScore(result: any, filters: ReturnType<typeof normalizeSearchFilters>) {
  const property = result.property;
  const checks = [
    !filters.location ||
      [property?.address, property?.city, property?.region, property?.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(filters.location.toLowerCase()),
    !filters.priceMin || result.price >= filters.priceMin,
    !filters.priceMax || result.price <= filters.priceMax,
    !filters.bedrooms || (property?.bedrooms || 0) >= filters.bedrooms,
    !filters.bathrooms || (property?.bathrooms || 0) >= filters.bathrooms,
    !filters.propertyType || property?.category === filters.propertyType,
    !filters.listingType || result.listing_type === filters.listingType,
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export default function AdvancedSearch({
  organizationId,
  currentUserId,
}: AdvancedSearchProps) {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilter>({});
  const [results, setResults] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const loadSearchData = async () => {
    try {
      const [saved, recent] = await Promise.all([
        aiAssistantService.getSavedSearches(currentUserId),
        aiAssistantService.getSearchHistory(currentUserId, 8),
      ]);

      setSavedSearches(saved);
      setRecentSearches(recent);
    } catch (error) {
      console.error("Failed to load search data:", error);
    }
  };

  useEffect(() => {
    void loadSearchData();
  }, [currentUserId]);

  const performSearch = async (queryOverride?: string, filterOverride?: SearchFilter) => {
    const nextQuery = queryOverride ?? searchQuery;
    const nextFilters = filterOverride ?? filters;

    if (!nextQuery.trim() && Object.values(nextFilters).every((value) => !value)) {
      toast.error("Add a search prompt or at least one filter.");
      return;
    }

    try {
      setIsSearching(true);

      const parsedFilters = nextQuery
        ? await aiAssistantService.parseSearchQuery(nextQuery)
        : {};
      const normalizedFilters = normalizeSearchFilters(nextFilters, parsedFilters);
      const searchResults = await listingService.searchListingsWithCount(normalizedFilters, 24, 0);

      setResults(searchResults.results || []);
      setTotalResults(searchResults.total || 0);

      await aiAssistantService.logSearch(
        currentUserId,
        organizationId,
        nextQuery || "Filtered search",
        searchResults.total || 0
      );

      await loadSearchData();
    } catch (error) {
      console.error("Failed to run advanced search:", error);
      toast.error("We couldn't complete that search right now.");
    } finally {
      setIsSearching(false);
    }
  };

  const saveCurrentSearch = async () => {
    if (!searchQuery.trim() && Object.values(filters).every((value) => !value)) {
      toast.error("Run a search before saving it.");
      return;
    }

    try {
      await aiAssistantService.saveSearch({
        userId: currentUserId,
        organizationId,
        name: searchQuery.trim() || "Filtered property search",
        query: searchQuery.trim(),
        filters,
        alerts: false,
      });
      toast.success("Search saved.");
      await loadSearchData();
    } catch (error) {
      console.error("Failed to save search:", error);
      toast.error("We couldn't save that search.");
    }
  };

  const applySavedSearch = async (savedSearch: any) => {
    const nextFilters = (savedSearch.filters || {}) as SearchFilter;
    setFilters(nextFilters);
    setSearchQuery(savedSearch.query || savedSearch.name || "");
    setActiveTab("search");
    await performSearch(savedSearch.query || savedSearch.name || "", nextFilters);
  };

  const toggleSearchAlert = async (savedSearchId: string, alerts: boolean) => {
    try {
      await aiAssistantService.toggleSavedSearchAlert(savedSearchId, !alerts);
      await loadSearchData();
    } catch (error) {
      console.error("Failed to toggle search alerts:", error);
      toast.error("We couldn't update search alerts.");
    }
  };

  const deleteSavedSearch = async (savedSearchId: string) => {
    try {
      await aiAssistantService.deleteSavedSearch(savedSearchId);
      await loadSearchData();
    } catch (error) {
      console.error("Failed to delete saved search:", error);
      toast.error("We couldn't delete that saved search.");
    }
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Advanced Search</h1>
          <p className="text-muted-foreground mt-1">
            Natural-language property discovery backed by live listings, saved searches, and search
            history.
          </p>
        </div>
        <Button variant="outline" onClick={() => void saveCurrentSearch()}>
          <Save className="w-4 h-4" />
          Save Search
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {[
          { key: "search", label: "Search" },
          { key: "saved", label: `Saved (${savedSearches.length})` },
          { key: "recent", label: `Recent (${recentSearches.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "search" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Try: 3-bedroom apartment in Accra under 300000"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void performSearch();
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => void performSearch()} disabled={isSearching}>
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  className="flex items-center gap-2 text-primary hover:opacity-80 font-medium"
                >
                  <Filter className="w-4 h-4" />
                  {showAdvancedFilters ? "Hide" : "Show"} advanced filters
                </button>
                <Badge variant="outline">
                  {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                </Badge>
              </div>

              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <Input
                    label="Location"
                    placeholder="City or neighborhood"
                    value={filters.location || ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                  <div>
                    <label htmlFor="advanced-search-category" className="block mb-2 text-sm text-foreground">
                      Category
                    </label>
                    <select
                      id="advanced-search-category"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                      value={filters.category || ""}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          category: event.target.value || undefined,
                        }))
                      }
                    >
                      <option value="">All categories</option>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="office">Office</option>
                      <option value="commercial">Commercial</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                  <Input
                    label="Minimum Price"
                    type="number"
                    value={filters.minPrice || ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        minPrice: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  />
                  <Input
                    label="Maximum Price"
                    type="number"
                    value={filters.maxPrice || ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        maxPrice: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  />
                  <Input
                    label="Bedrooms"
                    type="number"
                    value={filters.bedrooms || ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        bedrooms: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  />
                  <Input
                    label="Bathrooms"
                    type="number"
                    value={filters.bathrooms || ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        bathrooms: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </Card>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{totalResults} results found</h2>
                  <p className="text-sm text-muted-foreground">
                    Sorted from the live public catalog using your natural-language prompt and
                    filters.
                  </p>
                </div>
              </div>

              {results.map((result) => {
                const property = result.property;
                const matchScore = getMatchScore(
                  result,
                  normalizeSearchFilters(filters, {})
                );

                return (
                  <Card key={result.id} className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-lg font-semibold">
                            {property?.address || "Property listing"}
                          </h3>
                          <Badge>{matchScore}% match</Badge>
                          <Badge variant="outline" className="capitalize">
                            {result.listing_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {[property?.city, property?.region, property?.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-3">
                          {property?.bedrooms || 0} bed • {property?.bathrooms || 0} bath •{" "}
                          {property?.square_meters || 0} m²
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-semibold text-primary">
                          {formatPrice(result.price)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {result.organization?.name || "Verified organization"}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!isSearching && results.length === 0 && (searchQuery.trim() || activeFilterCount > 0) && (
            <Card className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No matching listings yet</h3>
              <p className="text-muted-foreground">
                Try broadening the location or price range, or save this search to revisit it later.
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedSearches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No saved searches yet. Run a search and save it from the results view.
            </Card>
          ) : (
            savedSearches.map((savedSearch) => (
              <Card key={savedSearch.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{savedSearch.name}</h3>
                      <Badge variant={savedSearch.alerts ? "default" : "outline"}>
                        {savedSearch.alerts ? "Alerts on" : "Alerts off"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {savedSearch.query || "Saved filter set"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Saved {new Date(savedSearch.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleSearchAlert(savedSearch.id, savedSearch.alerts)}
                    >
                      <Bell className="w-4 h-4" />
                      {savedSearch.alerts ? "Disable Alerts" : "Enable Alerts"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void applySavedSearch(savedSearch)}
                    >
                      Run Search
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void deleteSavedSearch(savedSearch.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "recent" && (
        <div className="space-y-4">
          {recentSearches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No recent searches yet. Search activity will show up here automatically.
            </Card>
          ) : (
            recentSearches.map((search) => (
              <Card key={search.id} className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-semibold">{search.query || "Filtered property search"}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {search.results_count || 0} results logged •{" "}
                      {new Date(search.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void performSearch(search.query || "", (search.parsed_filters || {}) as SearchFilter)}
                  >
                    Search Again
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
