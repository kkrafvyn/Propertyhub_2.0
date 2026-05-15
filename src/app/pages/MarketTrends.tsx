import { useEffect, useState } from "react";
import { BarChart3, Loader2, MapPin, TrendingUp } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Card } from "../components/ui/Card";
import { publicDiscoveryService, type MarketTrendSnapshot } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No public data";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MarketTrends() {
  const [trends, setTrends] = useState<MarketTrendSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getMarketTrendSnapshots(8);
        setTrends(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))] p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
              Market Trends
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Public pricing and demand snapshots across Ghana locations in your marketplace.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              These summaries blend workspace analytics, public supply, and Ghana-specific location risk signals into a fast benchmark for buyers and sellers.
            </p>
          </section>

          <section className="mt-10">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trends.map((trend) => (
                  <Card key={trend.slug} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {trend.city}, {trend.region}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold">{trend.title}</h2>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                        {trend.demandLevel.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Price</p>
                        <p className="mt-2 font-semibold">{formatMoney(trend.averagePrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Median</p>
                        <p className="mt-2 font-semibold">{formatMoney(trend.medianPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trend</p>
                        <p className="mt-2 font-semibold">
                          {trend.priceTrend != null ? `${trend.priceTrend.toFixed(1)}%` : "Stable"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                        <p className="mt-2 font-semibold">{trend.totalListings}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Growth</p>
                        <p className="mt-2 text-lg font-semibold">
                          {trend.growthRate != null ? `${trend.growthRate.toFixed(1)}%` : "Watch"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Accessibility</p>
                        <p className="mt-2 text-lg font-semibold">
                          {trend.accessibilityScore != null ? `${trend.accessibilityScore.toFixed(1)}/5` : "N/A"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Flood Risk</p>
                        <p className="mt-2 text-lg font-semibold capitalize">{trend.floodRiskLevel}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Snapshot note
                      </p>
                      <p className="mt-2">{trend.notes}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
