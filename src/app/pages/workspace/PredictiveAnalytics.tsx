import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Download,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { marketIntelligenceService } from "../../../lib/market-intelligence.service";

interface PredictiveAnalyticsProps {
  organizationId: string;
}

function formatPrice(amount?: number | null) {
  if (!amount) return "GHS 0";
  return `GHS ${amount.toLocaleString()}`;
}

export default function PredictiveAnalytics({
  organizationId,
}: PredictiveAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("6m");
  const [selectedLocation, setSelectedLocation] = useState("Accra");
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [topLocations, setTopLocations] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadBaseData = async () => {
      try {
        setLoading(true);

        const [insightsData, refreshedInsights, locations] = await Promise.all([
          marketIntelligenceService.getOrganizationInsights(organizationId),
          marketIntelligenceService.updateOrganizationInsights(organizationId),
          marketIntelligenceService.getTopLocations(5),
        ]);

        if (!cancelled) {
          setInsights(refreshedInsights || insightsData);
          setTopLocations(locations);
          if (locations[0]?.city) {
            setSelectedLocation(locations[0].city);
          }
        }
      } catch (error) {
        console.error("Failed to load predictive analytics:", error);
        if (!cancelled) {
          toast.error("We couldn't load predictive analytics right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBaseData();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    const loadLocationData = async () => {
      try {
        const [analyticsData, forecastData] = await Promise.all([
          marketIntelligenceService.getMarketAnalytics(selectedLocation),
          marketIntelligenceService.getMarketForecast(selectedLocation),
        ]);

        if (!cancelled) {
          const analyticsLimit =
            timeRange === "1m" ? 1 : timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
          setAnalytics((analyticsData || []).slice(0, analyticsLimit));
          setForecast(forecastData || []);
        }
      } catch (error) {
        console.error("Failed to load location analytics:", error);
      }
    };

    void loadLocationData();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, timeRange]);

  const latestAnalytics = analytics[0] || null;

  const metrics = useMemo(() => {
    return [
      {
        label: "Active Listings",
        value: insights?.active_listings || 0,
        change: insights?.total_listings
          ? Math.round(((insights.active_listings || 0) / insights.total_listings) * 100)
          : 0,
        trend: "up",
      },
      {
        label: "Average Market Price",
        value: latestAnalytics?.avg_price || 0,
        change: latestAnalytics?.price_trend || 0,
        trend:
          (latestAnalytics?.price_trend || 0) > 0
            ? "up"
            : (latestAnalytics?.price_trend || 0) < 0
              ? "down"
              : "stable",
      },
      {
        label: "Conversion Rate",
        value: insights?.conversion_rate || 0,
        change: (insights?.conversion_rate || 0) > 10 ? 3 : -2,
        trend: (insights?.conversion_rate || 0) > 10 ? "up" : "down",
      },
      {
        label: "Predicted Demand",
        value: forecast[0]?.predicted_avg_price || 0,
        change: forecast[0]?.confidence ? Math.round(forecast[0].confidence * 100) : 0,
        trend: "up",
      },
    ];
  }, [forecast, insights, latestAnalytics]);

  const derivedInsights = useMemo(() => {
    const cards: Array<{
      title: string;
      description: string;
      impact: "high" | "medium" | "low";
    }> = [];

    if ((latestAnalytics?.price_trend || 0) > 0) {
      cards.push({
        title: `${selectedLocation} pricing is climbing`,
        description: `Average prices are up ${latestAnalytics?.price_trend || 0}% in the latest ${latestAnalytics?.period || "period"}. Review inventory that could be priced more aggressively.`,
        impact: "high",
      });
    }

    if ((insights?.response_time_hours || 0) > 6) {
      cards.push({
        title: "Response times are slowing conversions",
        description: `Your team is averaging ${insights?.response_time_hours || 0} hours to respond. Faster follow-up usually protects pipeline quality.`,
        impact: "medium",
      });
    }

    if (topLocations[0]?.city) {
      cards.push({
        title: `${topLocations[0].city} is your strongest trend market`,
        description: `Growth rate is ${topLocations[0].growth_rate || 0}% with an investment score of ${topLocations[0].investment_score || 0}.`,
        impact: "high",
      });
    }

    if (cards.length === 0) {
      cards.push({
        title: "Analytics will get sharper as data accumulates",
        description:
          "We’re showing live organization and market data now. More listings, lead flow, and market snapshots will make predictions more specific.",
        impact: "low",
      });
    }

    return cards;
  }, [insights, latestAnalytics, selectedLocation, topLocations]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Predictive Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Live organization insight plus market trend and location forecast signals.
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          Export Snapshot
        </Button>
      </div>

      <Card className="p-4 bg-secondary/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-4">
            <div>
              <label htmlFor="predictive-time-range" className="text-sm font-medium block mb-2">
                Time Range
              </label>
              <select
                id="predictive-time-range"
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
                className="border rounded-md px-3 py-2 bg-input-background"
              >
                <option value="1m">Last month</option>
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div>
              <label htmlFor="predictive-location" className="text-sm font-medium block mb-2">
                Market
              </label>
              <select
                id="predictive-location"
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
                className="border rounded-md px-3 py-2 bg-input-background"
              >
                {[selectedLocation, ...topLocations.map((location) => location.city)]
                  .filter(Boolean)
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <Badge variant="outline">
            <CheckCircle className="w-3 h-3 mr-1" />
            Live data
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  metric.trend === "up"
                    ? "text-green-600"
                    : metric.trend === "down"
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : metric.trend === "down" ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            </div>
            <div className="text-2xl font-semibold">
              {metric.label.includes("Price") || metric.label.includes("Demand")
                ? formatPrice(metric.value)
                : metric.label.includes("Conversion")
                  ? `${metric.value}%`
                  : metric.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 border-b">
        {[
          { key: "overview", label: "Overview" },
          { key: "forecast", label: "Forecast" },
          { key: "insights", label: "Insights" },
          { key: "locations", label: "Locations" },
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

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Market Snapshots</h3>
            {analytics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No market analytics snapshots yet for {selectedLocation}.
              </p>
            ) : (
              <div className="space-y-4">
                {analytics.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{entry.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.total_listings || 0} listings • {entry.new_listings || 0} new
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(entry.avg_price)}</p>
                      <p className="text-sm text-muted-foreground">
                        Median {formatPrice(entry.median_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Organization Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Lead Quality</span>
                  <span className="text-sm font-semibold">
                    {insights?.avg_lead_quality || 0}/5
                  </span>
                </div>
                <progress
                  className="h-2 w-full overflow-hidden rounded-full bg-secondary accent-blue-600"
                  value={Math.min(100, ((insights?.avg_lead_quality || 0) / 5) * 100)}
                  max={100}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm font-semibold">
                    {insights?.customer_satisfaction_score || 0}/5
                  </span>
                </div>
                <progress
                  className="h-2 w-full overflow-hidden rounded-full bg-secondary accent-green-600"
                  value={Math.min(
                    100,
                    ((insights?.customer_satisfaction_score || 0) / 5) * 100
                  )}
                  max={100}
                />
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
                Best performing listing ID: {insights?.best_performing_listing_id || "Not enough data yet"}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "forecast" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Forecast for {selectedLocation}</h3>
          {forecast.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Add more market snapshots in {selectedLocation} to unlock a stronger forecast.
            </div>
          ) : (
            <div className="space-y-4">
              {forecast.map((entry, index) => (
                <div
                  key={`${entry.date}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Confidence {Math.round((entry.confidence || 0) * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(entry.predicted_avg_price)}</p>
                    <p className="text-sm text-muted-foreground">Predicted average price</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "insights" && (
        <div className="space-y-4">
          {derivedInsights.map((entry) => (
            <Card
              key={entry.title}
              className={`p-6 border-l-4 ${
                entry.impact === "high"
                  ? "border-l-primary"
                  : entry.impact === "medium"
                    ? "border-l-amber-500"
                    : "border-l-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{entry.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{entry.description}</p>
                </div>
                <Badge variant={entry.impact === "high" ? "default" : "outline"}>
                  {entry.impact} impact
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "locations" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Location Signals</h3>
          {topLocations.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Location trends have not been recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topLocations.map((location) => (
                <div
                  key={`${location.city}-${location.region}`}
                  className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">
                      {location.city}, {location.region}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Demand {location.demand_level || "unknown"} • Investment score{" "}
                      {location.investment_score || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">
                      Growth {location.growth_rate || 0}%
                    </span>
                    <span className="font-medium">
                      Safety {location.safety_score || 0}
                    </span>
                    <span className="font-medium">
                      Access {location.accessibility_score || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {analytics.length === 0 && (
        <Card className="p-4 bg-secondary/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This screen is live now, but it depends on `market_analytics` and `location_trends`
              data existing in Supabase. As those tables fill up, the forecasts and insights get
              stronger automatically.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
