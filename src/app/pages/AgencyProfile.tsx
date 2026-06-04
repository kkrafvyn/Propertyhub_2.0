import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Star,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { getPropertyCoverImage } from "../../lib/property-media";
import {
  calculatePublicReputationScore,
  publicDiscoveryService,
  type AgencyProfile as AgencyProfileData,
} from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "Pricing on request";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

const agencyFlowSteps = ["Review", "Browse", "Message", "Shortlist", "Track"];

export function AgencyProfile() {
  const { isMobileShell } = useMobileShell();
  const { slug } = useParams();
  const [agency, setAgency] = useState<AgencyProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getAgencyProfile(slug);
        setAgency(data);
      } catch (error) {
        console.error("Failed to load agency profile:", error);
        setAgency(null);
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

  if (!agency) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobileShell && <Navbar />}
        <div className={isMobileShell ? "pt-4 px-4 max-w-3xl mx-auto pb-32" : "pt-24 px-4 max-w-3xl mx-auto"}>
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-semibold">Agency not found</h1>
            <p className="mt-3 text-muted-foreground">
              This public company page is unavailable right now.
            </p>
            <Link to="/agencies" className="inline-block mt-6">
              <Button>Back to Agencies</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const reputationScore = calculatePublicReputationScore({
    verified: agency.verified,
    averageTrustScore: agency.averageTrustScore,
    customerSatisfactionScore: agency.customerSatisfactionScore,
    responseTimeHours: agency.responseTimeHours,
    documentCount: agency.publicDocumentCount,
    listingCount: agency.publicListingCount,
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,56,92,0.13),transparent_34rem),linear-gradient(180deg,#fff7fa_0%,#ffffff_44%,#fff7fa_100%)] text-[#171214]">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-7xl mx-auto">
          <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(255,56,92,0.12)] backdrop-blur-xl">
            <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/20 via-white to-primary/10">
              {agency.bannerUrl ? (
                <img src={agency.bannerUrl} alt={agency.name} className="w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
            <div className="p-8 md:p-10 -mt-16 relative">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {agency.logoUrl ? (
                  <img
                    src={agency.logoUrl}
                    alt={agency.name}
                    className="w-28 h-28 rounded-[1.75rem] object-cover border-4 border-white shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-[1.75rem] bg-white shadow-lg border-4 border-white flex items-center justify-center text-primary">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl font-black tracking-[-0.06em] md:text-5xl">{agency.name}</h1>
                    {agency.verified && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
                        <Shield className="w-4 h-4" />
                        Verified organization
                      </span>
                    )}
                  </div>
                  <p className="mt-4 max-w-3xl font-semibold leading-7 text-muted-foreground">
                    {agency.description || "This company runs a public profile with verified listings, trust documents, and active transaction signals."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {agency.email && (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {agency.email}
                      </span>
                    )}
                    {agency.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {agency.phone}
                      </span>
                    )}
                    {agency.website && (
                      <a
                        href={agency.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        Visit website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {agencyFlowSteps.map((step, index) => (
                  <span
                    key={step}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-xs font-black text-muted-foreground"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[0.65rem] text-white">
                      {index + 1}
                    </span>
                    {step}
                  </span>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link to={`/search?ref=${encodeURIComponent(agency.slug)}&channel=agency-profile`}>
                  <Button className="w-full rounded-full">
                    Browse Listings
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/app/messages">
                  <Button variant="outline" className="w-full rounded-full border-primary/15 bg-white">
                    <MessageCircle className="h-4 w-4" />
                    Message Team
                  </Button>
                </Link>
                <Link to="/app/saved">
                  <Button variant="outline" className="w-full rounded-full border-primary/15 bg-primary/5">
                    <Heart className="h-4 w-4" />
                    Open Shortlist
                  </Button>
                </Link>
                <Link to="/reviews">
                  <Button variant="outline" className="w-full rounded-full border-primary/15 bg-white">
                    <Star className="h-4 w-4" />
                    Read Reviews
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="rounded-[1.75rem] border-white bg-white/88 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Public Listings</p>
              <p className="mt-2 text-3xl font-semibold">{agency.publicListingCount}</p>
            </Card>
            <Card className="rounded-[1.75rem] border-white bg-white/88 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reputation Score</p>
              <p className="mt-2 text-3xl font-semibold">{reputationScore}/100</p>
            </Card>
            <Card className="rounded-[1.75rem] border-white bg-white/88 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Starting Price</p>
              <p className="mt-2 text-3xl font-semibold">{formatMoney(agency.startingPrice)}</p>
            </Card>
            <Card className="rounded-[1.75rem] border-white bg-white/88 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust Documents</p>
              <p className="mt-2 text-3xl font-semibold">{agency.publicDocumentCount}</p>
            </Card>
            <Card className="rounded-[1.75rem] border-white bg-white/88 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Response Signal</p>
              <p className="mt-2 text-3xl font-semibold">
                {agency.responseTimeHours != null && agency.responseTimeHours > 0
                  ? `${Math.round(agency.responseTimeHours)}h`
                  : "Active"}
              </p>
            </Card>
          </section>

          <section className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-8">
            <div className="space-y-8">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold">Reputation Snapshot</h2>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agency.trustHighlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-border bg-secondary/30 p-4 flex gap-3">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{highlight}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-2xl font-semibold">Active Listings</h2>
                  <Link to={`/search?ref=${encodeURIComponent(agency.slug)}&channel=agency-profile`}>
                    <Button variant="outline">See All Search Results</Button>
                  </Link>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {agency.listings.slice(0, 4).map((listing) => (
                    <Link key={listing.id} to={`/property/${listing.id}`}>
                      <Card hover className="overflow-hidden">
                        <div className="h-52 overflow-hidden">
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
                          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {listing.property?.city}, {listing.property?.region}
                          </p>
                          <p className="mt-3 text-2xl font-semibold text-primary">
                            {formatMoney(listing.price)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold">Service Areas</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {agency.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold">Projects & Collections</h2>
                  <Link to="/projects">
                    <Button variant="outline" size="sm">
                      Explore
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {agency.projects.slice(0, 4).map((project) => (
                    <Link key={project.slug} to={`/projects/${project.slug}`}>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4 hover:bg-secondary/50 transition-colors">
                        <p className="font-semibold">{project.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{project.summary}</p>
                        <p className="mt-3 text-sm text-primary">
                          {project.availableUnits} units from {formatMoney(project.startingPrice)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold">Public Verification Records</h2>
                <div className="mt-4 space-y-3">
                  {agency.publicDocuments.length > 0 ? (
                    agency.publicDocuments.map((document) => (
                      <div key={document.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="font-semibold">{document.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {document.documentType.replaceAll("_", " ")} / {document.status.replaceAll("_", " ")}
                        </p>
                        {document.summary && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{document.summary}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No public trust records have been published yet.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
