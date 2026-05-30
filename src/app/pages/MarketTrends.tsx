import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BarChart3,
  MapPin,
  Shield,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { ActionEmptyState, PageLoadingState } from "../components/PageStates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { publicDiscoveryService, type MarketTrendSnapshot } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No public data";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value?: number | null, fallback = "No change signal") {
  if (value == null) return fallback;
  return `${value.toFixed(1)}%`;
}

function formatDemandLabel(value: string) {
  return value.replaceAll("_", " ");
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function MarketTrends() {
  const { isMobileShell } = useMobileShell();
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

  const summary = useMemo(() => {
    const highDemandCount = trends.filter((trend) =>
      ["high", "very_high"].includes(trend.demandLevel)
    ).length;
    const trackedTrendAverage = average(
      trends
        .map((trend) => trend.priceTrend)
        .filter((value): value is number => typeof value === "number")
    );
    const averageListings = average(
      trends
        .map((trend) => trend.totalListings)
        .filter((value): value is number => typeof value === "number" && value > 0)
    );

    return {
      marketCount: trends.length,
      highDemandCount,
      trackedTrendAverage,
      averageListings,
    };
  }, [trends]);

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(195,141,78,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,1),rgba(244,240,232,1))] p-8 md:p-12">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Market Trends
                </p>
                <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
                  Live pricing and demand snapshots across public Ghana markets.
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
                  These benchmarks now read from public inventory, Ghana market intelligence, and anon-safe trend tables so buyers and sellers can compare momentum without signed-in workspace access.
                </p>
              </div>
              <div className="rounded-3xl border border-primary/15 bg-white/80 p-5 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                  Data Source
                </p>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  Public listings, `ghana_market_locations`, and published market trend snapshots.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search">
                <Button>
                  Search live listings
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/guides">
                <Button variant="outline">
                  <Shield className="w-4 h-4" />
                  Browse area guides
                </Button>
              </Link>
            </div>
          </section>

          {!loading && trends.length > 0 && (
            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Markets Tracked
                </p>
                <p className="mt-3 text-3xl font-semibold">{summary.marketCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Locations with public signals this cycle.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  High Demand
                </p>
                <p className="mt-3 text-3xl font-semibold">{summary.highDemandCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Markets tagged high or very high demand.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Avg Price Trend
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatPercent(summary.trackedTrendAverage, "Watch")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Across markets with current trend data.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Avg Live Supply
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.averageListings != null ? Math.round(summary.averageListings) : "N/A"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Public listing count per tracked market.</p>
              </Card>
            </section>
          )}

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Active Market Board
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Where pricing and demand are moving now</h2>
              </div>
              {!loading && trends.length > 0 && (
                <p className="max-w-xl text-sm text-muted-foreground">
                  Compare price direction, flood risk, accessibility, and live supply before you shortlist a market.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6">
            {loading ? (
              <PageLoadingState label="Loading market snapshots..." />
            ) : trends.length === 0 ? (
              <ActionEmptyState
                icon={BarChart3}
                eyebrow="No trend snapshots yet"
                title="Market boards light up when live listings and location trend rows are available."
                description="Use search while data grows, then compare price direction, supply, demand, flood-risk, and accessibility by market."
                actions={
                  <>
                    <Link to="/search">
                      <Button>Browse Live Listings</Button>
                    </Link>
                    <Link to="/guides">
                      <Button variant="outline">Open Area Guides</Button>
                    </Link>
                  </>
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trends.map((trend) => (
                  <Card key={trend.slug} className="overflow-hidden border-border/70 bg-white/95">
                    <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(195,141,78,0.12),rgba(15,23,42,0.02))] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {trend.city}, {trend.region}
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold">{trend.title}</h2>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                            {formatDemandLabel(trend.demandLevel)}
                          </span>
                          {trend.newListings > 0 && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                              {trend.newListings} new listings
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Price</p>
                          <p className="mt-2 font-semibold">{formatMoney(trend.averagePrice)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Median</p>
                          <p className="mt-2 font-semibold">{formatMoney(trend.medianPrice)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Price Trend</p>
                          <p className="mt-2 font-semibold">{formatPercent(trend.priceTrend, "Stable")}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                          <p className="mt-2 font-semibold">{trend.totalListings}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Growth</p>
                          <p className="mt-2 text-lg font-semibold">{formatPercent(trend.growthRate, "Watch")}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Investment</p>
                          <p className="mt-2 text-lg font-semibold">
                            {trend.investmentScore != null ? `${trend.investmentScore.toFixed(1)}/5` : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Accessibility</p>
                          <p className="mt-2 text-lg font-semibold">
                            {trend.accessibilityScore != null
                              ? `${trend.accessibilityScore.toFixed(1)}/5`
                              : "N/A"}
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

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link to={`/search?q=${encodeURIComponent(trend.searchQuery)}`}>
                          <Button>
                            Search this market
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        {trend.guideSlug ? (
                          <Link to={`/guides/${trend.guideSlug}`}>
                            <Button variant="outline">
                              <TrendingUp className="w-4 h-4" />
                              Open area guide
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/guides">
                            <Button variant="outline">
                              <Waves className="w-4 h-4" />
                              Browse location guides
                            </Button>
                          </Link>
                        )}
                      </div>
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
