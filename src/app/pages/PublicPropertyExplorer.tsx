import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowRight, Bath, BedDouble, MapPin, Ruler, ShieldCheck, Building2, Eye, Lock } from "lucide-react";
import { listingService } from "../../lib/listing.service";
import { formatPublicUnitId } from "../../lib/public-explorer";
import { isMarketingSite } from "../../lib/site-mode";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AppLoadingScreen, EmptyState, StandalonePageShell } from "../components/ux";
import { MarketingSubpage } from "../components/marketing/MarketingSubpage";
import { PageMeta } from "../components/baytmiftah/PageMeta";

export function PublicPropertyExplorer() {
  const { id } = useParams();
  const location = useLocation();
  const resolveByProperty = location.pathname.includes("/explorer/property/");
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = resolveByProperty
          ? await listingService.getPublicListingByPropertyId(id)
          : await listingService.getListingById(id);
        if (active) setListing(data);
      } catch (error) {
        console.error("Failed to load public property explorer", error);
        if (active) setListing(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, resolveByProperty]);

  const publicUnitId = useMemo(() => {
    if (!listing?.id) return "BM-UNIT-LOADING";
    return formatPublicUnitId(listing.id);
  }, [listing?.id]);

  const propertyName = useMemo(() => {
    const property = listing?.property;
    if (!property) return "Property";
    return property.name || property.address || "Property";
  }, [listing?.property]);

  const buyerPublicId = useMemo(() => {
    if (!listing?.organization_id) return null;
    return `BUY-${String(listing.organization_id).slice(0, 8).toUpperCase()}`;
  }, [listing?.organization_id]);

  const isVerified = Boolean(listing?.organization?.verified);
  const property = listing?.property || {};

  if (loading) {
    return <AppLoadingScreen label="Loading property explorer…" />;
  }

  const wrapShell = (content: ReactNode, maxWidth = "max-w-4xl") => {
    if (isMarketingSite()) {
      return <MarketingSubpage>{content}</MarketingSubpage>;
    }
    return <StandalonePageShell maxWidthClassName={maxWidth}>{content}</StandalonePageShell>;
  };

  if (!listing) {
    return wrapShell(
      <EmptyState
        icon={Eye}
        title="No property matches this preview link"
        description="The listing may have been removed or the link is incorrect. Search BaytMiftah for active inventory."
        actionLabel="Browse properties"
        actionHref="/search"
      />,
      "max-w-2xl",
    );
  }

  const pageBody = (
      <div className="py-8 space-y-8">
        <PageMeta
          title={`${propertyName} — public preview`}
          description="Privacy-safe public listing preview on BaytMiftah."
          canonicalPath={location.pathname}
        />
        {/* ── Editorial Header with Ambient Glowing Orbs ── */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 backdrop-blur-sm shadow-xs">
                <Building2 className="h-3.5 w-3.5" />
                BaytMiftah Property Explorer
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
                Public Property Preview
              </h1>
              <p className="mt-1.5 text-sm text-ink-secondary max-w-lg leading-relaxed">
                Verified listing telemetry — resident &amp; ownership identities remain cryptographically protected.
              </p>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Public Authenticated Mode
            </span>
          </div>
        </div>

        {/* ── Main Showcase Card ── */}
        <Card
          variant="glass"
          className="overflow-hidden rounded-3xl border border-surface-border/80 shadow-xl backdrop-blur-md"
        >
          <div className="grid md:grid-cols-[1.5fr_0.75fr]">
            {/* Left — Property details */}
            <div className="p-7 md:p-9 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold tracking-wider bg-primary/10 border border-primary/20 text-primary">
                  Unit: {publicUnitId}
                </span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified identity
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                    Verification pending
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
                  Property: {propertyName}
                </h2>

                {(property.address || property.city || property.region) && (
                  <div className="mt-2.5 flex items-center gap-2 text-sm text-ink-secondary">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {[property.address, property.city, property.region].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {property.description ? (
                <p className="max-w-xl text-sm leading-relaxed text-ink-secondary">{property.description}</p>
              ) : null}

              {/* Stat tiles — only real values; never invent bedrooms/baths/size */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                {[
                  { icon: BedDouble, label: "Bedrooms", value: property.bedrooms != null ? String(property.bedrooms) : null },
                  { icon: Bath, label: "Bathrooms", value: property.bathrooms != null ? String(property.bathrooms) : null },
                  {
                    icon: Ruler,
                    label: "Size",
                    value: property.square_meters != null ? `${property.square_meters} m²` : null,
                  },
                ]
                  .filter((item) => item.value != null)
                  .map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-surface-border/80 bg-surface-subtle/60 p-4 transition-all hover:border-emerald-500/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      {label}
                    </div>
                    <div className="mt-2 text-xl sm:text-2xl font-bold text-ink font-display">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Trust & Access Panel */}
            <div className="flex flex-col justify-between p-7 md:p-9 border-t md:border-t-0 md:border-l border-surface-border/80 bg-surface-subtle/40 backdrop-blur-xs">
              <div className="space-y-6">
                {buyerPublicId ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary mb-2">
                      Seller public ID
                    </p>
                    <div className="rounded-xl border border-surface-border/80 bg-surface px-4 py-3 font-mono text-sm font-semibold text-ink shadow-xs">
                      {buyerPublicId}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2.5">
                  {[
                    {
                      icon: ShieldCheck,
                      label: "Identity status",
                      value: isVerified ? "Verified" : "Pending",
                      valueCls: isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                    },
                    { icon: Eye, label: "Public visibility", value: "Limited Privacy", valueCls: "text-ink" },
                    { icon: Lock, label: "Owner data", value: "Limited disclosure", valueCls: "text-ink" },
                  ].map(({ icon: Icon, label, value, valueCls }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-surface-border/80 bg-surface/90 px-4 py-3 text-sm shadow-xs"
                    >
                      <span className="flex items-center gap-2 text-ink-secondary text-xs font-medium">
                        <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {label}
                      </span>
                      <span className={`font-semibold text-xs ${valueCls}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 space-y-2">
                <Link to={`/property/${listing.id}`} className="block">
                  <Button className="w-full h-12 rounded-xl font-semibold shadow-md shadow-emerald-500/15">
                    <span>View full listing</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  to="/explorer"
                  className="block text-center text-xs font-medium text-primary hover:underline"
                >
                  Back to explorer
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-ink-secondary">
          This record is publicly accessible and verified. No private consumer data is displayed.{" "}
          <span className="font-semibold text-ink font-display">BaytMiftah REOS</span> · Verified Property Network
        </p>
      </div>
  );

  return wrapShell(pageBody);
}

