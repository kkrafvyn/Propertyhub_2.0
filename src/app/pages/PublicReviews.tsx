import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Building2,
  Clock3,
  Loader2,
  MessageSquareQuote,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  publicDiscoveryService,
  type PublicAgencyReputationSpotlight,
  type PublicProjectReputationSpotlight,
  type PublicVendorReview,
  type PublicVendorSpotlight,
} from "../../lib/public-discovery.service";

function formatResponseTime(minutes?: number | null) {
  if (!minutes || minutes <= 0) {
    return "Response time varies";
  }

  if (minutes < 60) {
    return `${minutes} min avg reply`;
  }

  return `${Math.round(minutes / 60)}h avg reply`;
}

export function PublicReviews() {
  const [testimonials, setTestimonials] = useState<PublicVendorReview[]>([]);
  const [partners, setPartners] = useState<PublicVendorSpotlight[]>([]);
  const [agencies, setAgencies] = useState<PublicAgencyReputationSpotlight[]>([]);
  const [projects, setProjects] = useState<PublicProjectReputationSpotlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const snapshot = await publicDiscoveryService.getPublicReputationSnapshot();
        setTestimonials(snapshot.vendors.testimonials);
        setPartners(snapshot.vendors.topPartners);
        setAgencies(snapshot.agencies);
        setProjects(snapshot.projects);
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
              Public Reviews
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Reputation you can actually read, not just badges you have to trust blindly.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              This layer is grounded in verified service-partner ratings, live response signals,
              agency trust snapshots, and project momentum already flowing through the product.
            </p>
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                  Recent Testimonials
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Real client feedback from verified partners</h2>
              </div>
              <Link to="/buyer-requests">
                <Button variant="outline">
                  See Demand Board
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : testimonials.length === 0 ? (
              <Card className="p-8 mt-6 text-muted-foreground">
                Public testimonials will appear here as more service reviews are completed.
              </Card>
            ) : (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {testimonials.map((testimonial) => (
                  <Card key={testimonial.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <MessageSquareQuote className="w-8 h-8 text-primary" />
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${testimonial.id}-${index}`}
                            className={`w-4 h-4 ${
                              index < Math.round(testimonial.rating) ? "fill-current" : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-5 text-lg leading-8 text-foreground/90">
                      &ldquo;{testimonial.reviewText}&rdquo;
                    </p>
                    <div className="mt-6 border-t border-border pt-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{testimonial.vendorName}</p>
                        {testimonial.vendorVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {testimonial.vendorCategory} / {testimonial.reviewerLabel}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{testimonial.highlight}</p>
                      {testimonial.serviceAreas.length > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Service areas: {testimonial.serviceAreas.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-14">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                  Top Partners
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Verified vendors with public-facing momentum</h2>
              </div>
              <Link to="/agencies">
                <Button variant="outline">Browse Agencies</Button>
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <Card key={partner.id} className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{partner.businessCategory}</p>
                      <h3 className="mt-1 text-2xl font-semibold">{partner.businessName}</h3>
                    </div>
                    {partner.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Rating</p>
                      <p className="mt-2 font-semibold">
                        {partner.ratingAverage?.toFixed(1) || "New"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviews</p>
                      <p className="mt-2 font-semibold">{partner.reviewCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Jobs</p>
                      <p className="mt-2 font-semibold">{partner.totalJobsCompleted || 0}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {partner.topServices.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                      >
                        <Wrench className="w-3 h-3" />
                        {service}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <p>{partner.highlight}</p>
                    <p>
                      <Clock3 className="w-4 h-4 inline mr-1" />
                      {formatResponseTime(partner.responseTimeMinutes)}
                    </p>
                    {partner.serviceAreas.length > 0 && (
                      <p>Coverage: {partner.serviceAreas.slice(0, 3).join(", ")}</p>
                    )}
                  </div>

                  {partner.standoutQuote && (
                    <p className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-foreground/80">
                      &ldquo;{partner.standoutQuote}&rdquo;
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                  Agency Reputation
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Public operators with real trust depth</h2>
              </div>
              <Link to="/agencies">
                <Button variant="outline">Browse Agencies</Button>
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {agencies.map((agency) => (
                <Card key={agency.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Agency</p>
                      <h3 className="mt-1 text-2xl font-semibold">{agency.name}</h3>
                    </div>
                    {agency.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
                      <p className="mt-2 font-semibold">{agency.reviewScore}/100</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                      <p className="mt-2 font-semibold">{agency.publicListingCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Docs</p>
                      <p className="mt-2 font-semibold">{agency.publicDocumentCount}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground">{agency.standoutQuote}</p>
                  <div className="mt-4 space-y-2">
                    {agency.trustHighlights.slice(0, 3).map((highlight) => (
                      <div key={highlight} className="flex gap-2 text-sm text-muted-foreground">
                        <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  <Link to={`/agencies/${agency.slug}`} className="mt-5 inline-block">
                    <Button variant="outline" size="sm">
                      Open Agency
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                  Project Momentum
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Collections with public trust and supply signals</h2>
              </div>
              <Link to="/projects">
                <Button variant="outline">Browse Projects</Button>
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.slug} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{project.organizationName}</p>
                      <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
                    </div>
                    <Badge variant="outline">{project.reviewScore}/100</Badge>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">{project.locationLabel}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Units</p>
                      <p className="mt-2 font-semibold">{project.availableUnits}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                      <p className="mt-2 font-semibold">{project.listingCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                      <p className="mt-2 font-semibold">
                        {project.startingPrice ? new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(project.startingPrice) : "Request"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {project.trustHighlights.slice(0, 3).map((highlight) => (
                      <div key={highlight} className="flex gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  <Link to={`/projects/${project.slug}`} className="mt-5 inline-block">
                    <Button variant="outline" size="sm">
                      Open Project
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
