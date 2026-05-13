import { useEffect, useMemo, useState } from "react";
import { Clock, Target, TrendingUp, Users } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/badge";
import { marketIntelligenceService } from "@/lib/market-intelligence.service";

interface OrganizationInsightsProps {
  organizationId: string;
}

function getInquiryCount(listing: any) {
  if (!Array.isArray(listing?.deal_cases) || listing.deal_cases.length === 0) {
    return 0;
  }

  const firstRow = listing.deal_cases[0];
  return typeof firstRow?.count === "number" ? firstRow.count : listing.deal_cases.length;
}

export default function OrganizationInsights({
  organizationId,
}: OrganizationInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [bestPerformers, setBestPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      try {
        const [insightsData, performersData] = await Promise.all([
          marketIntelligenceService.getOrganizationInsights(organizationId),
          marketIntelligenceService.getBestPerformingListings(organizationId, 5),
        ]);

        if (!cancelled) {
          setInsights(insightsData);
          setBestPerformers(performersData || []);
        }
      } catch (error) {
        console.error("Failed to load insights:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInsights();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const recommendations = useMemo(() => {
    const cards: string[] = [];

    if ((insights?.response_time_hours || 0) > 6) {
      cards.push(
        `Reduce response time from ${insights.response_time_hours} hours to protect conversion quality.`
      );
    }

    if ((insights?.avg_lead_quality || 0) < 3.5) {
      cards.push("Tighten listing details and lead routing to improve lead quality scores.");
    }

    if ((insights?.active_listings || 0) < (insights?.total_listings || 0)) {
      cards.push("Review inactive inventory and re-publish the listings that still have market fit.");
    }

    if (bestPerformers[0]) {
      const property = bestPerformers[0].property;
      cards.push(
        `${property?.address || "Your top listing"} is drawing the strongest traction. Reuse that pricing and merchandising pattern.`
      );
    }

    return cards.slice(0, 4);
  }, [bestPerformers, insights]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading insights...</div>;
  }

  const leadQualityProgress = Math.min(100, ((insights?.avg_lead_quality || 0) / 5) * 100);
  const satisfactionProgress = Math.min(
    100,
    ((insights?.customer_satisfaction_score || 0) / 5) * 100
  );
  const activeInventoryProgress =
    insights?.total_listings && insights.total_listings > 0
      ? Math.min(100, Math.round(((insights.active_listings || 0) / insights.total_listings) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Insights</h1>
        <p className="text-muted-foreground mt-2">
          Live operational performance across listings, response speed, and lead quality.
        </p>
      </div>

      {insights && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-2xl font-bold mt-2">{insights.active_listings || 0}</p>
              </div>
              <Badge variant="secondary">{insights.total_listings || 0} total</Badge>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold mt-2">{insights.conversion_rate || 0}%</p>
              </div>
              <div className="ml-auto">
                <TrendingUp
                  className={`w-6 h-6 ${
                    (insights.conversion_rate || 0) > 10 ? "text-green-600" : "text-amber-500"
                  }`}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lead Quality</p>
                <p className="text-2xl font-bold mt-2">{insights.avg_lead_quality || 0}/5</p>
              </div>
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold mt-2">{insights.response_time_hours || 0}h</p>
              </div>
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Key Performance Metrics</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Lead Quality Score</span>
              <span className="text-sm font-bold">{insights?.avg_lead_quality || 0}/5</span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded-full bg-secondary accent-blue-600"
              value={leadQualityProgress}
              max={100}
              aria-label="Lead quality score"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Customer Satisfaction</span>
              <span className="text-sm font-bold">
                {insights?.customer_satisfaction_score || 0}/5
              </span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded-full bg-secondary accent-green-600"
              value={satisfactionProgress}
              max={100}
              aria-label="Customer satisfaction score"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Active Inventory Share</span>
              <span className="text-sm font-bold">{activeInventoryProgress}%</span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded-full bg-secondary accent-purple-600"
              value={activeInventoryProgress}
              max={100}
              aria-label="Active inventory percentage"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Top Performing Listings</h2>
        {bestPerformers.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No organization listings have enough engagement data yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {bestPerformers.map((listing, idx) => {
              const property = listing.property;
              const inquiryCount = getInquiryCount(listing);

              return (
                <Card key={listing.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-bold text-muted-foreground">#{idx + 1}</span>
                        <h3 className="font-semibold">
                          {property?.address || "Property listing"}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[property?.city, property?.region].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {inquiryCount} inquiries recorded
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="outline">
                          GHS {listing.price?.toLocaleString() || 0}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {listing.listing_type}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {listing.status}
                        </Badge>
                      </div>
                    </div>
                    <Badge>{inquiryCount} leads</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="p-6 border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-200 rounded-lg">
            <Target className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold">Operational Recommendations</h3>
            <ul className="space-y-2 mt-3 text-sm">
              {recommendations.length === 0 ? (
                <li>Your organization insights are connected and ready for more live activity.</li>
              ) : (
                recommendations.map((entry) => <li key={entry}>{entry}</li>)
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
