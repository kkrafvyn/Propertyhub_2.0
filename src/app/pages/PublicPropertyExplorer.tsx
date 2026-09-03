import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { ArrowRight, Bath, BedDouble, MapPin, Ruler, ShieldCheck, Building2, Eye, Lock } from "lucide-react";
import { listingService } from "../../lib/listing.service";
import { Button } from "../components/ui/Button";
import { AppLoadingScreen } from "../components/ux/AppLoadingScreen";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";

export function PublicPropertyExplorer() {
  const { id } = useParams();
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
        const data = await listingService.getListingById(id);
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
  }, [id]);

  const publicUnitId = useMemo(() => {
    if (!listing?.id) return "BM-UNIT-LOADING";
    return `BM-UNIT-${String(listing.id).slice(-6).toUpperCase()}`;
  }, [listing?.id]);

  const propertyName = useMemo(() => {
    if (!listing?.property) return "Example Heights";
    return listing.property.name || "Example Heights";
  }, [listing?.property]);

  const buyerPublicId = useMemo(() => {
    if (!listing?.organization_id) return "BUY-000000";
    return `BUY-${String(listing.organization_id).slice(0, 8).toUpperCase()}`;
  }, [listing?.organization_id]);

  const isVerified = Boolean(listing?.organization?.verified);
  const property = listing?.property || {};

  if (loading) {
    return <AppLoadingScreen label="Loading property explorer…" />;
  }

  return (
    <StandalonePageShell maxWidthClassName="max-w-4xl">
      <div className="py-8 space-y-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-ink-secondary backdrop-blur-sm shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-ink-secondary" />
              BaytMiftah Property Explorer
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Public Property Preview
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Verified listing data — occupant &amp; owner identities are never shown.
            </p>
          </div>
          <span
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "#059669",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Public profile mode
          </span>
        </div>

        {/* Main Card */}
        <div
          className="overflow-hidden rounded-3xl border border-surface-border shadow-xl"
          style={{ background: "var(--surface)" }}
        >
          <div className="grid md:grid-cols-[1.5fr_0.65fr]">
            {/* Left — Property details */}
            <div className="p-7 md:p-9">
              {/* Badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold tracking-wider"
                  style={{
                    background: "rgba(14,165,233,0.1)",
                    border: "1px solid rgba(14,165,233,0.2)",
                    color: "#0284c7",
                  }}
                >
                  Unit: {publicUnitId}
                </span>
                {isVerified ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      color: "#059669",
                    }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified identity
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      color: "#d97706",
                    }}
                  >
                    Verification pending
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-ink">
                Property: {propertyName}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>
                  {property.address || "5 Independence Ave"}, {property.city || "Accra"}
                </span>
              </div>

              <p className="mt-5 max-w-xl text-sm leading-7 text-ink-secondary">
                {property.description ||
                  "Bright and modern apartment with secure access, flexible viewing windows, and a verified ownership trail."}
              </p>

              {/* Stat tiles */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: BedDouble, label: "Bedrooms", value: property.bedrooms ?? 3 },
                  { icon: Bath, label: "Bathrooms", value: property.bathrooms ?? 2 },
                  { icon: Ruler, label: "Size", value: `${property.square_meters ?? 120} m²` },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-surface-border p-4 transition-all hover:shadow-md"
                    style={{ background: "var(--surface-subtle)" }}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                    <div className="mt-2.5 text-2xl font-bold text-ink">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Trust panel */}
            <div
              className="flex flex-col justify-between p-7 md:p-9 border-t md:border-t-0 md:border-l border-surface-border"
              style={{ background: "var(--surface-subtle)" }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary mb-1">
                  Buyer Public ID:
                </p>
                <div className="mt-2 rounded-xl border border-surface-border bg-surface px-4 py-3 font-mono text-base font-semibold text-ink shadow-sm">
                  {buyerPublicId}
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      icon: ShieldCheck,
                      label: "Identity status",
                      value: isVerified ? "Verified" : "Pending",
                      valueColor: isVerified ? "#059669" : "#d97706",
                    },
                    { icon: Eye, label: "Public visibility", value: "Limited", valueColor: "var(--ink)" },
                    { icon: Lock, label: "Owner privacy", value: "Protected", valueColor: "var(--ink)" },
                  ].map(({ icon: Icon, label, value, valueColor }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-ink-secondary">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                      <span className="font-semibold" style={{ color: valueColor }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="mt-8 w-full h-11 rounded-xl font-semibold"
                variant="default"
                style={{
                  background: "linear-gradient(135deg, #e07a5f, #c45d44)",
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
                }}
              >
                Request private access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-ink-secondary">
          This page is publicly accessible. No personal data is shown.{" "}
          <span className="font-semibold text-ink">BaytMiftah</span> · Verified Property Network
        </p>
      </div>
    </StandalonePageShell>
  );
}
