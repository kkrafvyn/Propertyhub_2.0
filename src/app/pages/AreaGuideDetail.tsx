import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Loader2, MapPin, Shield, TrendingUp, Waves } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getPropertyCoverImage } from "../../lib/property-media";
import { publicDiscoveryService, type AreaGuide } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No public pricing yet";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AreaGuideDetail() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<AreaGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getAreaGuideBySlug(slug);
        setGuide(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-semibold">Guide not found</h1>
            <p className="mt-3 text-muted-foreground">This neighborhood guide is unavailable right now.</p>
            <Link to="/guides" className="inline-block mt-6">
              <Button>Back to Guides</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-white">
            <div className="h-72 overflow-hidden">
              <img src={guide.imageUrl} alt={guide.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Neighborhood Guide
              </p>
              <h1 className="mt-4 text-4xl font-semibold">{guide.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {guide.neighborhood}, {guide.city}, {guide.region}
              </p>
              <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{guide.intro}</p>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {guide.demandLevel.replaceAll("_", " ")}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Median Price</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(guide.medianPrice)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Accessibility</p>
              <p className="mt-2 text-2xl font-semibold">
                {guide.accessibilityScore != null ? `${guide.accessibilityScore.toFixed(1)}/5` : "N/A"}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Flood Risk</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{guide.floodRiskLevel}</p>
            </Card>
          </section>

          <section className="mt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="space-y-8">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold">What this area is best for</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {guide.bestFor.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold">Current public listings</h2>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {guide.featuredListings.map((listing) => (
                    <Link key={listing.id} to={`/property/${listing.id}`}>
                      <Card hover className="overflow-hidden">
                        <div className="h-48 overflow-hidden">
                          <img
                            src={getPropertyCoverImage(listing.property)}
                            alt={listing.property?.address || "Property"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold line-clamp-2">
                            {listing.property?.address || "Property"}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {listing.property?.bedrooms || "N/A"} bed · {listing.property?.bathrooms || "N/A"} bath
                          </p>
                          <p className="mt-3 text-xl font-semibold text-primary">{formatMoney(listing.price)}</p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Why buyers shortlist this area
                </h2>
                <div className="mt-4 space-y-3">
                  {guide.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                      {highlight}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Waves className="w-5 h-5 text-primary" />
                  What to double-check
                </h2>
                <p className="mt-4 text-sm text-muted-foreground">{guide.caution}</p>
                <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Trust cue</p>
                  <p className="mt-2">
                    Pair flood and access context with the listing&apos;s public documents, quality score, and verified payment path before committing.
                  </p>
                </div>
                <Link to={`/search?q=${encodeURIComponent(guide.neighborhood)}`} className="inline-block mt-5">
                  <Button>
                    <Shield className="w-4 h-4" />
                    Browse this area
                  </Button>
                </Link>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
