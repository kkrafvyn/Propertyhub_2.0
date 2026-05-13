import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/badge";
import { marketIntelligenceService } from "@/lib/market-intelligence.service";

interface MarketIntelligenceDashboardProps {
  organizationId: string;
}

function formatCurrency(amount?: number | null) {
  return `GHS ${(amount || 0).toLocaleString()}`;
}

export default function MarketIntelligenceDashboard({
  organizationId,
}: MarketIntelligenceDashboardProps) {
  const [insights, setInsights] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [topLocations, setTopLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);

        const [insightsData, analyticsData, locationsData] = await Promise.all([
          marketIntelligenceService.getOrganizationInsights(organizationId),
          marketIntelligenceService.getMarketAnalytics("Accra"),
          marketIntelligenceService.getTopLocations(3),
        ]);

        if (!cancelled) {
          setInsights(insightsData);
          setAnalytics(analyticsData || []);
          setTopLocations(locationsData || []);
        }
      } catch (error) {
        console.error("Failed to load market intelligence:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const recommendations = useMemo(() => {
    const cards: Array<{
      title: string;
      detail: string;
      cta: string;
    }> = [];
    const latestAnalytics = analytics[0] || null;

    if ((insights?.avg_lead_quality || 0) < 3.5) {
      cards.push({
        title: "Improve inquiry qualification",
        detail:
          "Lead quality is still below your strongest pipeline range. Faster follow-up and clearer listing details usually help.",
        cta: "Review team workflow",
      });
    }

    if ((latestAnalytics?.price_trend || 0) > 0) {
      cards.push({
        title: "Pricing is trending upward",
        detail: `Average pricing in ${latestAnalytics.location || "your market"} is up ${latestAnalytics.price_trend}% in the latest ${latestAnalytics.period || "period"}.`,
        cta: "Review pricing",
      });
    }

    if (topLocations[0]?.city) {
      cards.push({
        title: `${topLocations[0].city} is gaining momentum`,
        detail: `Growth rate is ${topLocations[0].growth_rate || 0}% with a demand level of ${topLocations[0].demand_level || "unknown"}.`,
        cta: "View location signals",
      });
    }

    if (cards.length === 0) {
      cards.push({
        title: "Your live market feed is connected",
        detail:
          "As more listings and trend snapshots land in Supabase, this page will keep sharpening its recommendations automatically.",
        cta: "Refresh insights",
      });
    }

    return cards.slice(0, 3);
  }, [analytics, insights, topLocations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Market Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Track live market signals and adjust pricing, inventory, and response strategy.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading market data...</div>
      ) : (
        <>
          {insights && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Active Listings</div>
                <div className="text-3xl font-bold mt-2">{insights.active_listings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {insights.total_listings || 0} total
                </p>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Conversion Rate</div>
                <div className="text-3xl font-bold mt-2">{insights.conversion_rate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(insights.conversion_rate || 0) > 10 ? "Above average" : "Room to improve"}
                </p>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Lead Quality</div>
                <div className="text-3xl font-bold mt-2">{insights.avg_lead_quality || 0}/5</div>
                <p className="text-xs text-muted-foreground mt-1">Average score</p>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Response Time</div>
                <div className="text-3xl font-bold mt-2">{insights.response_time_hours || 0}h</div>
                <p className="text-xs text-muted-foreground mt-1">Average response</p>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Market Trends</h2>
              <Badge variant="outline">Accra feed</Badge>
            </div>
            <div className="grid gap-4">
              {analytics.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  No market snapshots have been recorded yet. As soon as `market_analytics` data is
                  available, this dashboard will populate automatically.
                </Card>
              ) : (
                analytics.map((analytic) => (
                  <Card key={analytic.id} className="p-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Average Price</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(analytic.avg_price)}
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          {(analytic.price_trend || 0) > 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">+{analytic.price_trend}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span className="text-red-600">{analytic.price_trend || 0}%</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Median Price</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(analytic.median_price)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          {analytic.total_listings || 0} listings
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Market Activity</div>
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between text-sm">
                            <span>New Listings</span>
                            <span className="font-bold">{analytic.new_listings || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Avg Days Listed</span>
                            <span className="font-bold">{analytic.avg_listing_days || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Period</span>
                            <span className="font-bold capitalize">{analytic.period}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recommendations</h2>
            <Card className="p-4">
              <div className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <div key={recommendation.title}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{recommendation.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {recommendation.detail}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        {recommendation.cta}
                      </Button>
                    </div>
                    {index < recommendations.length - 1 && <div className="h-px bg-border mt-3" />}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
