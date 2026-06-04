import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Building2, MapPin, Search, Shield } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { ActionEmptyState, PageLoadingState } from "../components/PageStates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import { buildConstructionProgressPreview } from "../../lib/competitive-operations.service";
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

const projectFlow = ["Find project", "Check operator", "Compare units", "Open collection", "Track"];

export function Projects() {
  const { isMobileShell } = useMobileShell();
  const [projects, setProjects] = useState<ProjectCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getProjectCollections(18);
        setProjects(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const projectSpotlightsBySlug = new Map(
    buildProjectReputationSpotlights(projects, projects.length).map((spotlight) => [spotlight.slug, spotlight])
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,56,92,0.13),transparent_34rem),linear-gradient(180deg,#fff7fa_0%,#ffffff_44%,#fff7fa_100%)] text-[#171214]">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-7xl mx-auto">
          <section className="rounded-[2.5rem] border border-white/80 bg-white/88 p-8 shadow-[0_28px_90px_rgba(255,56,92,0.12)] backdrop-blur-xl md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              Projects & Developments
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-6xl">
              Browse grouped developments and active inventory collections instead of single listings only.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-muted-foreground md:text-lg">
              Each collection groups related units by operator and area so buyers can compare availability, pricing, and trust signals faster.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {projectFlow.map((step, index) => (
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
          </section>

          <section className="mt-10">
            {loading ? (
              <PageLoadingState label="Loading project collections..." />
            ) : projects.length === 0 ? (
              <ActionEmptyState
                icon={Building2}
                eyebrow="No development collections yet"
                title="Project collections will appear once agencies group units into public developments."
                description="Use live search for single listings now, or create a workspace listing collection when the first development inventory is ready."
                actions={
                  <>
                    <Link to="/search">
                      <Button>
                        <Search className="h-4 w-4" />
                        Search Properties
                      </Button>
                    </Link>
                    <Link to="/workspace">
                      <Button variant="outline">Open Workspace</Button>
                    </Link>
                  </>
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((project) => {
                  const reputation = projectSpotlightsBySlug.get(project.slug);
                  const trustHighlights = reputation?.trustHighlights?.length
                    ? reputation.trustHighlights
                    : project.trustHighlights;
                  const constructionPreview = buildConstructionProgressPreview({
                    progressPercent: project.availableUnits > 0 ? 68 : 28,
                    updateCount: project.listings.length,
                  });

                  return (
                    <Card key={project.slug} className="overflow-hidden rounded-[2rem] border-white bg-white/90 shadow-[0_22px_70px_rgba(255,56,92,0.10)]">
                      <div className="h-56 overflow-hidden">
                        <img src={project.heroImage} alt={project.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {project.neighborhood || project.city}, {project.region}
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {reputation && (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                {reputation.reviewScore}/100 reputation
                              </span>
                            )}
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                              {project.listingType}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 text-muted-foreground">{project.summary}</p>

                        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Units</p>
                            <p className="mt-2 font-semibold">{project.availableUnits}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                            <p className="mt-2 font-semibold">{formatMoney(project.startingPrice)}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Operator</p>
                            <p className="mt-2 font-semibold line-clamp-2">{project.organizationName}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reputation</p>
                            <p className="mt-2 font-semibold">
                              {reputation ? `${reputation.reviewScore}/100` : "Pending"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-amber-800">Construction readiness</p>
                              <p className="mt-1 text-sm font-semibold text-amber-950">
                                {constructionPreview.status.replaceAll("_", " ")} / {constructionPreview.confidence}% confidence
                              </p>
                            </div>
                            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-amber-900">
                              {constructionPreview.progress}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {trustHighlights.slice(0, 3).map((highlight) => (
                            <span
                              key={highlight}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                            >
                              <Shield className="w-3 h-3" />
                              {highlight}
                            </span>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <Link to={`/projects/${project.slug}`}>
                            <Button>
                              Open Collection
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                          {project.organizationSlug && (
                            <Link to={`/agencies/${project.organizationSlug}`}>
                              <Button variant="outline">Open Agency</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
