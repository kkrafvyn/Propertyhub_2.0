import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Building2, FileText, Loader2, MapPin, Shield } from "lucide-react";
import { Navbar } from "../components/Navbar";
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
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32" : "pt-24 pb-16"}>
        <section className="px-4">
          <div className="max-w-6xl mx-auto rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(201,168,97,0.18),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,241,232,0.9))] p-8 md:p-12">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Verified Agencies
              </p>
              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
                Browse public company profiles before you send a lead or payment.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Compare verified operators, trust documents, response signals, and active listings across the marketplace.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 mt-10">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {agencies.map((agency) => (
                  <Card key={agency.id} className="p-6">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
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
                      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings</p>
                        <p className="mt-2 text-xl font-semibold">{agency.publicListingCount}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Starting From</p>
                        <p className="mt-2 text-xl font-semibold">{formatMoney(agency.startingPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust Docs</p>
                        <p className="mt-2 text-xl font-semibold">{agency.publicDocumentCount}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
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

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link to={`/agencies/${agency.slug}`}>
                        <Button>
                          View Profile
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/search?ref=${encodeURIComponent(agency.slug)}&channel=agency-directory`}>
                        <Button variant="outline">Browse Listings</Button>
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
