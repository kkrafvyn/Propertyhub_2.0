import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Loader2, MapPin, Shield, TrendingUp } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { publicDiscoveryService, type AreaGuide } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No public pricing yet";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AreaGuides() {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[2rem] border border-border bg-secondary/30 p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
              Area Guides
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Public neighborhood pages built from live marketplace and Ghana-specific trust signals.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-3xl">
              Use demand, flood risk, access, and current supply together before you shortlist a move or investment.
            </p>
          </section>

          <section className="mt-10">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {guides.map((guide) => (
                  <Card key={guide.slug} className="overflow-hidden">
                    <div className="h-56 overflow-hidden">
                      <img src={guide.imageUrl} alt={guide.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {guide.neighborhood}, {guide.city}
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

                      <div className="mt-6 flex gap-3 flex-wrap">
                        <Link to={`/guides/${guide.slug}`}>
                          <Button>
                            Read Guide
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/search?q=${encodeURIComponent(guide.neighborhood)}`}>
                          <Button variant="outline">
                            <Shield className="w-4 h-4" />
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
