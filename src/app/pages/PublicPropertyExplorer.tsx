import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { ArrowRight, Bath, BedDouble, MapPin, Ruler, ShieldCheck } from "lucide-react";
import { listingService } from "../../lib/listing.service";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

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
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-slate-800 dark:text-slate-100">
        <p>Loading BaytMiftah Property Explorer…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-slate-800 dark:text-slate-100">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
            BaytMiftah Property Explorer
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Public property preview
          </h1>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700/80 dark:bg-emerald-950/60 dark:text-emerald-300">
          Public profile mode
        </span>
      </div>

      <Card className="overflow-hidden border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_0.7fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                Unit: {publicUnitId}
              </div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified identity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  Verification pending
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Property: {propertyName}</h2>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="h-4 w-4" />
              <span>
                {property.address || "5 Independence Ave"}, {property.city || "Accra"}
              </span>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {property.description || "Bright and modern apartment with secure access, flexible viewing windows, and a verified ownership trail."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <BedDouble className="h-4 w-4" /> Bedrooms
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {property.bedrooms ?? 3}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Bath className="h-4 w-4" /> Bathrooms
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {property.bathrooms ?? 2}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Ruler className="h-4 w-4" /> Size
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {property.square_meters ?? 120} m²
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Buyer Public ID:
            </p>
            <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{buyerPublicId}</div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Identity status</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-300">
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Public visibility</span>
                <span className="font-medium text-slate-900 dark:text-white">Limited</span>
              </div>
            </div>

            <Button className="mt-6 w-full" variant="default">
              Request private access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
