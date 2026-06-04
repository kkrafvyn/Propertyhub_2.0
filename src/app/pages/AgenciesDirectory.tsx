import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  MessageCircle,
  Search,
  Shield,
  Star,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { ActionEmptyState, PageLoadingState } from "../components/PageStates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { publicDiscoveryService, type PublicAgencySnapshot } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "Pricing on request";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

const directoryFlow = ["Choose area", "Compare teams", "Open listings", "Message", "Track"];

const trustCards = [
  {
    title: "Verified teams",
    detail: "Admin-reviewed organizations with public trust signals.",
    icon: Shield,
  },
  {
    title: "Live inventory",
    detail: "Agency cards connect straight into active marketplace supply.",
    icon: Building2,
  },
  {
    title: "Buyer-safe path",
    detail: "Shortlist, message, view, and pay from the same account flow.",
    icon: CheckCircle2,
  },
];

export function AgenciesDirectory() {
  const { isMobileShell } = useMobileShell();
  const [agencies, setAgencies] = useState<PublicAgencySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getAgencyDirectory(18);
        setAgencies(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,56,92,0.13),transparent_34rem),linear-gradient(180deg,#fff7fa_0%,#ffffff_44%,#fff7fa_100%)] text-[#171214]">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32" : "pt-24 pb-16"}>
        <section className="px-4">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
            <div className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/86 p-7 shadow-[0_28px_90px_rgba(255,56,92,0.12)] backdrop-blur-xl md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                Verified Agencies
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-6xl">
                Find the team behind the property before you take the next step.
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-muted-foreground md:text-lg">
                Compare verified operators, trust documents, response signals, and active listings across the marketplace.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {directoryFlow.map((step, index) => (
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

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/search">
                  <Button>
                    <Search className="h-4 w-4" />
                    Browse Listings
                  </Button>
                </Link>
                <Link to="/reviews">
                  <Button variant="outline" className="rounded-full border-primary/15 bg-white">
                    <Star className="h-4 w-4" />
                    Read Reviews
                  </Button>
                </Link>
              </div>
            </div>

            <aside className="rounded-[2.25rem] border border-white/80 bg-white/82 p-5 shadow-[0_22px_70px_rgba(255,56,92,0.10)] backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Buyer shortcuts
              </p>
              <div className="mt-5 grid gap-3">
                {trustCards.map((item) => (
                  <Link
                    key={item.title}
                    to={item.title === "Live inventory" ? "/search" : "/reviews"}
                    className="group rounded-2xl border border-primary/10 bg-primary/5 p-4 transition hover:-translate-y-0.5 hover:bg-primary/10"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <strong className="mt-3 block text-sm tracking-[-0.02em]">{item.title}</strong>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="px-4 mt-10">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <PageLoadingState label="Loading verified agency profiles..." />
            ) : agencies.length === 0 ? (
              <ActionEmptyState
                icon={Building2}
                eyebrow="No public agencies yet"
                title="Verified agency profiles will appear here once workspaces publish inventory."
                description="Agencies become visible after subscription activation, profile setup, and verification review. Buyers can still browse live listings while the directory fills up."
                actions={
                  <>
                    <Link to="/search">
                      <Button>
                        <Search className="h-4 w-4" />
                        Browse Listings
                      </Button>
                    </Link>
                    <Link to="/workspace">
                      <Button variant="outline">Register Agency</Button>
                    </Link>
                  </>
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {agencies.map((agency) => (
                  <Card key={agency.id} className="rounded-[2rem] border-white bg-white/90 p-6 shadow-[0_22px_70px_rgba(255,56,92,0.10)]">
                    <div className="flex items-start gap-4">
                      {agency.logoUrl ? (
                        <img
                          src={agency.logoUrl}
                          alt={agency.name}
                          className="w-16 h-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="w-8 h-8" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-semibold">{agency.name}</h2>
                          {agency.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                              <Shield className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                          {agency.description || "Verified partner with an active public inventory and trust workflow."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                        <p className="mt-2 text-xl font-semibold">{agency.publicListingCount}</p>
                      </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Starting From</p>
                        <p className="mt-2 text-xl font-semibold">{formatMoney(agency.startingPrice)}</p>
                      </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust Docs</p>
                        <p className="mt-2 text-xl font-semibold">{agency.publicDocumentCount}</p>
                      </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Projects</p>
                        <p className="mt-2 text-xl font-semibold">{agency.projectCount}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {agency.serviceAreas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                        >
                          <MapPin className="w-3 h-3" />
                          {area}
                        </span>
                      ))}
                    </div>

                    {agency.trustHighlights.length > 0 && (
                      <div className="mt-5 space-y-2">
                        {agency.trustHighlights.slice(0, 3).map((highlight) => (
                          <div key={highlight} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 grid gap-2 sm:grid-cols-3">
                      <Link to={`/agencies/${agency.slug}`}>
                        <Button className="w-full">
                          View Profile
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/search?ref=${encodeURIComponent(agency.slug)}&channel=agency-directory`}>
                        <Button variant="outline" className="w-full rounded-full border-primary/15 bg-primary/5">
                          <Search className="h-4 w-4" />
                          Listings
                        </Button>
                      </Link>
                      <Link to="/app/messages">
                        <Button variant="outline" className="w-full rounded-full border-primary/15 bg-white">
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
