import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BarChart3,
  Loader2,
  MapPin,
  Shield,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { publicDiscoveryService, type AreaGuide } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No public pricing yet";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function AreaGuides() {
  const { isMobileShell } = useMobileShell();
  const [guides, setGuides] = useState<AreaGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getAreaGuides(12);
        setGuides(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const summary = useMemo(() => {
    const highDemandCount = guides.filter((guide) =>
      ["high", "very_high"].includes(guide.demandLevel)
    ).length;
    const averageListingPrice = average(
      guides
        .map((guide) => guide.averagePrice)
        .filter((value): value is number => typeof value === "number")
    );
    const averageAccessibility = average(
      guides
        .map((guide) => guide.accessibilityScore)
        .filter((value): value is number => typeof value === "number")
    );

    return {
      guideCount: guides.length,
      highDemandCount,
      averageListingPrice,
      averageAccessibility,
    };
  }, [guides]);

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(26,95,122,0.16),transparent_35%),linear-gradient(135deg,rgba(255,255,255,1),rgba(237,243,244,1))] p-8 md:p-12">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Area Guides
                </p>
                <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
                  Neighborhood guides built from live marketplace activity and Ghana-specific location signals.
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
                  Use demand, flood risk, access, and current supply together before you shortlist a move or investment.
                </p>
              </div>
              <div className="rounded-3xl border border-primary/15 bg-white/80 p-5 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                  Live Inputs
                </p>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  Public listings, neighborhood grouping, and Ghana market intelligence rows.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/market-trends">
                <Button>
                  View market trends
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="outline">
                  <Shield className="w-4 h-4" />
                  Search listings
                </Button>
              </Link>
            </div>
          </section>

          {!loading && guides.length > 0 && (
            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Guides Live
                </p>
                <p className="mt-3 text-3xl font-semibold">{summary.guideCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Neighborhoods currently backed by public data.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  High Demand
                </p>
                <p className="mt-3 text-3xl font-semibold">{summary.highDemandCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Guides marked high or very high demand.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Avg Price
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.averageListingPrice != null
                    ? formatMoney(summary.averageListingPrice)
                    : "No data"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Average public price across surfaced guides.</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Access Score
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.averageAccessibility != null
                    ? `${summary.averageAccessibility.toFixed(1)}/5`
                    : "N/A"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Average accessibility signal across the board.</p>
              </Card>
            </section>
          )}

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Neighborhood Board
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Start with the strongest location signals</h2>
              </div>
              {!loading && guides.length > 0 && (
                <p className="max-w-xl text-sm text-muted-foreground">
                  Each card combines live supply, price signals, flood context, and access cues you can act on.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : guides.length === 0 ? (
              <Card className="p-10 text-center">
                <h3 className="text-2xl font-semibold">No neighborhood guides are live yet</h3>
                <p className="mt-3 text-muted-foreground">
                  Publish a few public listings with city, region, and neighborhood details to unlock this board.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link to="/search">
                    <Button>Browse listings</Button>
                  </Link>
                  <Link to="/market-trends">
                    <Button variant="outline">Open market trends</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {guides.map((guide) => (
                  <Card key={guide.slug} className="overflow-hidden border-border/70 bg-white/95">
                    <div className="h-56 overflow-hidden">
                      <img src={guide.imageUrl} alt={guide.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {guide.neighborhood}, {guide.city}
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                          {guide.demandLevel.replaceAll("_", " ")}
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold">{guide.title}</h2>
                      <p className="mt-3 text-muted-foreground">{guide.intro}</p>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand</p>
                          <p className="mt-2 font-semibold capitalize">
                            {guide.demandLevel.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Price</p>
                          <p className="mt-2 font-semibold">{formatMoney(guide.averagePrice)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                          <p className="mt-2 font-semibold">{guide.listingCount}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Accessibility</p>
                          <p className="mt-2 text-lg font-semibold">
                            {guide.accessibilityScore != null
                              ? `${guide.accessibilityScore.toFixed(1)}/5`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Flood Risk</p>
                          <p className="mt-2 text-lg font-semibold capitalize">{guide.floodRiskLevel}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-white p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Investment</p>
                          <p className="mt-2 text-lg font-semibold">
                            {guide.investmentScore != null ? `${guide.investmentScore.toFixed(1)}/5` : "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {guide.highlights.slice(0, 3).map((highlight) => (
                          <span
                            key={highlight}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                          >
                            <TrendingUp className="w-3 h-3" />
                            {highlight}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Shortlist note
                        </p>
                        <p className="mt-2">{guide.caution}</p>
                      </div>

                      <div className="mt-6 flex gap-3 flex-wrap">
                        <Link to={`/guides/${guide.slug}`}>
                          <Button>
                            Read Guide
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/search?q=${encodeURIComponent(guide.neighborhood)}`}>
                          <Button variant="outline">
                            <Waves className="w-4 h-4" />
                            Browse Listings
                          </Button>
                        </Link>
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
