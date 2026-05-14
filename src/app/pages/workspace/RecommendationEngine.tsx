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
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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

function scoreListing(listing: any, savedRows: any[]) {
  const property = listing.property || {};
  const signals = getSavedSignals(savedRows);
  const qualityReport = listingQualityService.evaluateListing(listing);
  const marketInsight = ghanaMarketService.getLocationInsight(
    property.city,
    property.region,
    property.neighborhood
  );
  const reasons: string[] = [];
  let score = 45;

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
    reasons.push("Fresh Ghana listing with enough data for review");
  }

  return {
    score: Math.min(98, Math.max(55, score)),
    reasons,
  };
}

export default function RecommendationEngine() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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

      const scored = (listingRows || [])
        .map((listing) => {
          const score = scoreListing(listing, savedRows || []);
          return {
            listing,
            matchScore: score.score,
            matchReasons: score.reasons,
            liked: savedIds.has(listing.id),
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

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
    .filter((item) => filterType === "all" || item.listing.property?.category === filterType)
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
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading Ghana recommendations...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Smart Ghana Recommendations
          </h1>
          <p className="text-muted-foreground mt-1">
            Real listings ranked by trust score, saved-property signals, verified agencies, and
            Ghana demand context.
          </p>
        </div>
        <Button onClick={() => void loadRecommendations()} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-r from-amber-50 to-emerald-50">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recommendation Signals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Listings scanned</span>
            <div className="text-2xl font-semibold">{recommendations.length}</div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Saved signal</span>
            <div className="text-2xl font-semibold">{user ? "Enabled" : "Log in"}</div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Market</span>
            <div className="text-2xl font-semibold">Ghana</div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Currency</span>
            <div className="text-2xl font-semibold">GHS</div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
          aria-label="Filter recommendations by property type"
        >
          <option value="all">All Property Types</option>
          <option value="apartment">Apartments</option>
          <option value="house">Houses</option>
          <option value="office">Office Spaces</option>
          <option value="commercial">Commercial</option>
          <option value="land">Land</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
          aria-label="Sort recommendations"
        >
          <option value="match">Best Match</option>
          <option value="price">Lowest Price</option>
          <option value="quality">Highest Trust Score</option>
        </select>
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredRecommendations.length} recommendations
        </div>
      </div>

      {filteredRecommendations.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No public Ghana listings match this filter yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecommendations.map(({ listing, matchScore, matchReasons, liked }) => {
            const property = listing.property || {};
            const qualityScore =
              listing.quality_score || listingQualityService.evaluateListing(listing).score;

            return (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-56 bg-secondary">
                  <img
                    src={getPropertyCoverImage(property)}
                    alt={property.address || "Recommended property"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge className="bg-blue-600">{matchScore}% Match</Badge>
                    {listing.organization?.verified && (
                      <Badge className="bg-emerald-700">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{property.address || "Ghana listing"}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {[property.neighborhood, property.city, property.region]
                          .filter(Boolean)
                          .join(", ") || "Ghana"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {moneyFormatter.format(listing.price || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">{getListingLabel(listing.listing_type)}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{matchReasons.slice(0, 2).join(" | ")}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-3 border-t border-b">
                    <div className="text-center">
                      <Home className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <div className="text-sm font-medium">{property.bedrooms || 0}</div>
                      <div className="text-xs text-muted-foreground">Bedrooms</div>
                    </div>
                    <div className="text-center">
                      <ShieldCheck className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <div className="text-sm font-medium">{qualityScore}</div>
                      <div className="text-xs text-muted-foreground">Trust Score</div>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <div className="text-sm font-medium">{listing.currency || "GHS"}</div>
                      <div className="text-xs text-muted-foreground">Currency</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => void toggleLike(listing.id)}
                      className={`flex-1 flex items-center justify-center gap-2 ${
                        liked
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? "fill-white" : ""}`} />
                      {liked ? "Saved" : "Save"}
                    </Button>
                    <Link to={`/property/${listing.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="px-4"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`${window.location.origin}/property/${listing.id}`);
                        toast.success("Property link copied.");
                      }}
                      aria-label={`Share ${property.address || "property"}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
