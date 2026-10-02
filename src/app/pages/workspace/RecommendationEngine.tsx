import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Heart,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Search,
  X,
  SlidersHorizontal,
  Compass,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { MetricCard } from "../../components/ui/MetricCard";
import { useAuth } from "../../context/AuthContext";
import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { getPropertyCoverImage } from "../../../lib/property-media";
import { listingQualityService } from "../../../lib/listing-quality.service";
import { listingService } from "../../../lib/listing.service";
import { savedPropertyService } from "../../../lib/savedproperty.service";

interface Recommendation {
  listing: any;
  matchScore: number;
  matchReasons: string[];
  liked: boolean;
}

const moneyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

function getListingLabel(type?: string) {
  if (type === "sale") return "For sale";
  if (type === "lease") return "Lease";
  return "For rent";
}

function getSavedSignals(savedRows: any[]) {
  const cities = new Set<string>();
  const categories = new Set<string>();
  const listingTypes = new Set<string>();

  savedRows.forEach((row) => {
    const listing = row.listing || row;
    if (listing?.property?.city) cities.add(String(listing.property.city).toLowerCase());
    if (listing?.property?.category) categories.add(String(listing.property.category).toLowerCase());
    if (listing?.listing_type) listingTypes.add(String(listing.listing_type).toLowerCase());
  });

  return { cities, categories, listingTypes };
}

function scoreListing(listing: any, savedRows: any[], marketInsight?: Awaited<
  ReturnType<typeof ghanaMarketService.getLocationInsight>
> | null) {
  const property = listing.property || {};
  const signals = getSavedSignals(savedRows);
  const qualityReport = listingQualityService.evaluateListing(listing);
  const reasons: string[] = [];
  let score = 0;

  if (signals.cities.has(String(property.city || "").toLowerCase())) {
    score += 12;
    reasons.push(`Matches saved city: ${property.city}`);
  }

  if (signals.categories.has(String(property.category || "").toLowerCase())) {
    score += 10;
    reasons.push(`Matches saved property type: ${property.category}`);
  }

  if (signals.listingTypes.has(String(listing.listing_type || "").toLowerCase())) {
    score += 8;
    reasons.push(`Matches saved intent: ${getListingLabel(listing.listing_type)}`);
  }

  score += Math.round(qualityReport.score * 0.2);
  if (qualityReport.score >= 75) {
    reasons.push(`Trust score ${qualityReport.score}/100`);
  }

  if (listing.organization?.verified) {
    score += 6;
    reasons.push("Verified agency");
  }

  if (marketInsight) {
    score += ghanaMarketService.getDemandWeight(marketInsight.demandLevel);
    reasons.push(`${marketInsight.neighborhood} demand is ${marketInsight.demandLevel.replace("_", " ")}`);
  }

  if (!reasons.length) {
    reasons.push("Matches available listing data");
  }

  return {
    score: Math.min(98, Math.max(0, score)),
    reasons,
  };
}

async function scoreListingWithInsight(listing: any, savedRows: any[]) {
  const property = listing.property || {};
  const marketInsight = await ghanaMarketService.getLocationInsight(
    property.city,
    property.region,
    property.neighborhood
  );

  return scoreListing(listing, savedRows, marketInsight);
}

export default function RecommendationEngine() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("match");

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const [listingRows, savedRows] = await Promise.all([
        listingService.getPublicListings(50, 0),
        user ? savedPropertyService.getSavedProperties(user.id).catch(() => []) : Promise.resolve([]),
      ]);
      const savedIds = new Set((savedRows || []).map((row: any) => row.listing?.id || row.listing_id));

      const scored = await Promise.all(
        (listingRows || []).map(async (listing) => {
          const score = await scoreListingWithInsight(listing, savedRows || []);
          return {
            listing,
            matchScore: score.score,
            matchReasons: score.reasons,
            liked: savedIds.has(listing.id),
          };
        })
      );
      scored.sort((a, b) => b.matchScore - a.matchScore);

      setRecommendations(scored);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      toast.error("Unable to load recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, [user?.id]);

  const toggleLike = async (listingId: string) => {
    if (!user) {
      toast.error("Log in to save recommendations.");
      return;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listingId);
      setRecommendations((current) =>
        current.map((item) =>
          item.listing.id === listingId ? { ...item, liked: result.saved } : item
        )
      );
      toast.success(result.saved ? "Saved to favorites." : "Removed from favorites.");
    } catch (error) {
      console.error("Failed to save recommendation:", error);
      toast.error("Unable to update saved property.");
    }
  };

  const filteredRecommendations = recommendations
    .filter((item) => {
      if (filterType !== "all" && item.listing.property?.category !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const p = item.listing.property || {};
        const match =
          p.address?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q) ||
          p.region?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match") return b.matchScore - a.matchScore;
      if (sortBy === "price") return a.listing.price - b.listing.price;
      if (sortBy === "quality") {
        return (b.listing.quality_score || 0) - (a.listing.quality_score || 0);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-3xl bg-surface-subtle/80 border border-surface-border animate-pulse" />
        <div className="h-36 rounded-3xl bg-surface-subtle/60 border border-surface-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 rounded-3xl bg-surface-subtle/70 border border-surface-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-primary/5 to-surface/80 border border-amber-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                BaytMiftah REOS Matching Matrix
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ghana Market Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
              Smart Market Recommendations
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-2xl leading-relaxed">
              Prime Ghanaian real estate ranked dynamically by title trust score, buyer affinity signals, agency verification, and micro-market demand metrics.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => void loadRecommendations()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-xl border-surface-border/80 bg-surface/60 backdrop-blur-xs hover:bg-surface text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Re-evaluate Matrix</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Signal Telemetry Halo Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Listings Scanned"
          value={recommendations.length}
          icon={Compass}
          iconColor="primary"
          glow="primary"
          subtitle="Inventory pool analyzed"
        />
        <MetricCard
          title="Client Affinity Signals"
          value={user ? "Active Learning" : "Guest Mode"}
          icon={Sparkles}
          iconColor="purple"
          glow="purple"
          subtitle={user ? "Calibrated to your favorites" : "Generic market affinity"}
        />
        <MetricCard
          title="Regional Boundary"
          value="Ghana National"
          icon={MapPin}
          iconColor="emerald"
          glow="emerald"
          subtitle="Accra, Kumasi & Takoradi corridors"
        />
        <MetricCard
          title="Settlement Standards"
          value="GHS & USD"
          icon={TrendingUp}
          iconColor="amber"
          glow="amber"
          subtitle="Multi-currency dual indexing"
        />
      </div>

      {/* ── Search, Filter and Sorting Bar ── */}
      <Card variant="glass" className="p-4 sm:p-5 rounded-2xl border border-surface-border/80 bg-surface/80 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
            {/* Live Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by area, city, neighborhood..."
                className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-surface-subtle border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category */}
            <NativeSelectControl
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="px-3 py-2 rounded-xl border border-surface-border bg-surface-subtle text-ink text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
              aria-label="Filter recommendations by property type"
            >
              <option value="all">All Property Types</option>
              <option value="apartment">Apartments</option>
              <option value="house">Houses & Villas</option>
              <option value="office">Commercial Office</option>
              <option value="commercial">Retail & Logistics</option>
              <option value="land">Parcels & Land</option>
            </NativeSelectControl>

            {/* Sort */}
            <NativeSelectControl
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="px-3 py-2 rounded-xl border border-surface-border bg-surface-subtle text-ink text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
              aria-label="Sort recommendations"
            >
              <option value="match">Rank: Match Score</option>
              <option value="price">Rank: Lowest Price</option>
              <option value="quality">Rank: Highest Trust Score</option>
            </NativeSelectControl>
          </div>

          <div className="text-xs font-semibold text-ink-secondary px-3 py-1.5 rounded-full bg-surface-subtle border border-surface-border shrink-0">
            {filteredRecommendations.length} {filteredRecommendations.length === 1 ? "match" : "recommendations"}
          </div>
        </div>
      </Card>

      {/* ── Recommendations Grid ── */}
      {filteredRecommendations.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-muted-foreground rounded-3xl border-dashed">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3 opacity-60 animate-pulse" />
          <h3 className="text-base font-semibold text-ink">No matching recommendations found</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            No properties currently match your selected filters and query. Try clearing your search term.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecommendations.map(({ listing, matchScore, matchReasons, liked }) => {
            const property = listing.property || {};
            const qualityScore =
              listing.quality_score || listingQualityService.evaluateListing(listing).score;

            return (
              <Card
                key={listing.id}
                variant="glass"
                className="overflow-hidden rounded-3xl border border-surface-border/80 hover:border-amber-500/40 bg-surface/85 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 bg-surface-subtle overflow-hidden">
                    <img
                      src={getPropertyCoverImage(property)}
                      alt={property.address || "Recommended property"}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 pointer-events-none" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-primary text-white shadow-md backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        {matchScore}% Match
                      </span>
                      {listing.organization?.verified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-600/90 text-white shadow-md backdrop-blur-md">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verified Agency
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-display font-semibold text-ink group-hover:text-primary transition-colors">
                          {property.address || "Ghana Prime Property"}
                        </h3>
                        <p className="text-xs text-ink-secondary flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                          <span>
                            {[property.neighborhood, property.city, property.region]
                              .filter(Boolean)
                              .join(", ") || "Ghana"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold font-display tracking-tight text-primary">
                          {moneyFormatter.format(listing.price || 0)}
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mt-0.5">
                          {getListingLabel(listing.listing_type)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                      <p className="text-xs text-ink flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                        <span className="leading-relaxed">{matchReasons.slice(0, 2).join(" • ")}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-surface-border/70">
                      <div className="text-center p-2 rounded-xl bg-surface-subtle/50">
                        <Home className="w-4 h-4 text-ink-muted mx-auto mb-1" />
                        <div className="text-sm font-semibold text-ink">{property.bedrooms || 0}</div>
                        <div className="text-[10px] text-ink-muted">Bedrooms</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-surface-subtle/50">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-ink">{qualityScore}/100</div>
                        <div className="text-[10px] text-ink-muted">Trust Score</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-surface-subtle/50">
                        <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-sm font-semibold text-ink">{listing.currency || "GHS"}</div>
                        <div className="text-[10px] text-ink-muted">Currency</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex gap-2.5">
                  <Button
                    onClick={() => void toggleLike(listing.id)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs transition-all ${
                      liked
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                        : "bg-surface-subtle hover:bg-surface border border-surface-border text-ink hover:border-rose-500/40"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? "fill-white text-white" : "text-ink-muted"}`} />
                    <span>{liked ? "Saved" : "Save"}</span>
                  </Button>
                  <Link to={`/property/${listing.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl text-xs border-surface-border/80 bg-surface/80 hover:bg-surface flex items-center justify-center gap-1.5"
                    >
                      <span>View Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-ink-muted" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="px-3 rounded-xl border-surface-border/80 bg-surface/80 hover:bg-surface"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${window.location.origin}/property/${listing.id}`);
                      toast.success("Property link copied.");
                    }}
                    aria-label={`Share ${property.address || "property"}`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-ink-muted" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
