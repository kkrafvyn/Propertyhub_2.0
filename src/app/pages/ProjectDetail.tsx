import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ExternalLink, Loader2, MapPin, Shield } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { getPropertyCoverImage } from "../../lib/property-media";
import {
  buildProjectReputationSpotlights,
  publicDiscoveryService,
  type ProjectCollection,
} from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "Pricing on request";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectDetail() {
  const { isMobileShell } = useMobileShell();
  const { slug } = useParams();
  const [project, setProject] = useState<ProjectCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getProjectCollectionBySlug(slug);
        setProject(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobileShell && <Navbar />}
        <div className={isMobileShell ? "pt-4 min-h-[40vh] flex items-center justify-center" : "pt-24 min-h-[60vh] flex items-center justify-center"}>
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobileShell && <Navbar />}
        <div className={isMobileShell ? "pt-4 px-4 max-w-3xl mx-auto pb-32" : "pt-24 px-4 max-w-3xl mx-auto"}>
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-semibold">Project not found</h1>
            <p className="mt-3 text-muted-foreground">
              This grouped development page is unavailable right now.
            </p>
            <Link to="/projects" className="inline-block mt-6">
              <Button>Back to Projects</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const reputationSnapshot = buildProjectReputationSpotlights([project], 1)[0] || null;

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-white">
            <div className="h-72 overflow-hidden">
              <img src={project.heroImage} alt={project.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Project Collection
              </p>
              <h1 className="mt-4 text-4xl font-semibold">{project.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {project.neighborhood || project.city}, {project.region}
              </p>
              <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{project.summary}</p>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Units</p>
              <p className="mt-2 text-3xl font-semibold">{project.availableUnits}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reputation Score</p>
              <p className="mt-2 text-3xl font-semibold">
                {reputationSnapshot ? `${reputationSnapshot.reviewScore}/100` : "Pending"}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Starting Price</p>
              <p className="mt-2 text-3xl font-semibold">{formatMoney(project.startingPrice)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Bedroom Mix</p>
              <p className="mt-2 text-3xl font-semibold">{project.bedroomMix.join(", ") || "Mixed"}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Operator</p>
              <p className="mt-2 text-3xl font-semibold">{project.organizationName}</p>
            </Card>
          </section>

          <section className="mt-8 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8">
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold">Trust Highlights</h2>
                <div className="mt-4 space-y-3">
                  {project.trustHighlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-border bg-secondary/30 p-4 flex gap-3">
                      <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{highlight}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold">Amenity Mix</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.amenityHighlights.map((item) => (
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold">Operator Profile</h2>
                  {project.organizationSlug && (
                    <Link to={`/agencies/${project.organizationSlug}`}>
                      <Button variant="outline" size="sm">
                        Open Agency
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>{project.organizationName} manages this public collection.</p>
                  {reputationSnapshot?.trustHighlights?.length ? (
                    reputationSnapshot.trustHighlights.slice(0, 3).map((highlight) => (
                      <div key={highlight} className="rounded-xl border border-border bg-secondary/30 p-3">
                        {highlight}
                      </div>
                    ))
                  ) : (
                    <p>Trust and pricing signals will deepen as more units and documents go live.</p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold">Units in this collection</h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {project.listings.map((listing) => (
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
                          {listing.property?.bedrooms || "N/A"} bed / {listing.property?.bathrooms || "N/A"} bath
                        </p>
                        <p className="mt-3 text-xl font-semibold text-primary">{formatMoney(listing.price)}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
