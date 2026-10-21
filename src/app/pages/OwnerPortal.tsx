import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import {
  Building2,
  Loader2,
  ShieldCheck,
  Home,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  Coins,
  MapPin,
  Lock,
  ArrowUpRight,
  Landmark,
  Sparkles,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { stakeholderPortalService, type OwnerPortalSnapshot } from "../../lib/stakeholder-portal.service";
import { OperationalQueryState, StandalonePageShell } from "../components/ux";

export function OwnerPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<OwnerPortalSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await stakeholderPortalService.getOwnerPortalSnapshot(token);
        setSnapshot(data);
      } catch (err: any) {
        setError(err.message || "Portal access link expired or invalid");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const estate = snapshot?.estate as {
    name?: string;
    city?: string;
    region?: string;
    currency?: string;
    total_units?: number;
  } | null;

  const units = (snapshot?.units || []) as Array<{
    id: string;
    identifier?: string;
    status?: string;
    rent_amount?: number;
    currency?: string;
  }>;

  const unitStats = useMemo(() => {
    const total = units.length;
    const occupied = units.filter((u) => u.status === "occupied" || u.status === "active").length;
    const vacant = units.filter((u) => u.status === "vacant" || u.status === "available").length;
    const maintenance = units.filter((u) => u.status === "maintenance").length;
    return { total, occupied, vacant, maintenance };
  }, [units]);

  return (
    <StandalonePageShell maxWidthClassName="max-w-4xl">
      <div className="py-10 px-4 space-y-8">
        <OperationalQueryState
          phase={loading ? "loading" : error ? "error" : "ready"}
          errorMessage={error || undefined}
          loadingFallback={
            <div className="flex flex-col items-center justify-center py-28 text-ink-muted space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Authenticating encrypted stakeholder portal...</p>
            </div>
          }
        >
        {snapshot ? (
          <>
            {/* ── Editorial Header ── */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-surface/80 border border-primary/20 shadow-lg backdrop-blur-md">
              <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-primary/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" dot className="text-xs font-bold px-2.5 py-0.5 capitalize">
                      {snapshot.portal_type} Terminal
                    </Badge>
                    <span className="text-xs text-ink-muted flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Live Escrow & Double-Entry Verified
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight">
                    Welcome, {snapshot.contact_name}
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-secondary max-w-xl leading-relaxed">
                    Private stakeholder visibility for {estate?.name || "Portfolio Units"}. Access verified unit occupancy, disbursement ledgers, and property performance.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface/80 border border-surface-border backdrop-blur-md shadow-xs shrink-0 text-right">
                  <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">
                    Verified Stakeholder
                  </span>
                  <span className="text-xs font-semibold text-ink">{snapshot.contact_email}</span>
                </div>
              </div>
            </div>

            {/* ── Estate Profile Card ── */}
            {estate && (
              <Card
                variant="glass"
                className="p-6 border border-surface-border/80 bg-surface/90 backdrop-blur-md rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-display font-medium text-ink">{estate.name}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{[estate.city, estate.region, (estate as { country?: string }).country].filter(Boolean).join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    Currency: {estate.currency || "GHS"}
                  </Badge>
                </div>
              </Card>
            )}

            {/* ── Portfolio Units Summary ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
                <span className="text-xs font-medium text-ink-secondary">Total Portfolio Units</span>
                <div className="text-2xl font-bold text-ink mt-2 font-mono">{unitStats.total}</div>
                <p className="text-[11px] text-ink-muted mt-1">Under active management</p>
              </Card>

              <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
                <span className="text-xs font-medium text-ink-secondary">Occupied & Generating</span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                  {unitStats.occupied}
                </div>
                <p className="text-[11px] text-ink-muted mt-1">Performing rental units</p>
              </Card>

              <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
                <span className="text-xs font-medium text-ink-secondary">Vacant / In Turnaround</span>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 font-mono">
                  {unitStats.vacant + unitStats.maintenance}
                </div>
                <p className="text-[11px] text-ink-muted mt-1">Available or in maintenance</p>
              </Card>
            </div>

            {/* ── Unit Directory ── */}
            <Card
              variant="glass"
              className="p-6 border border-surface-border/80 bg-surface/90 backdrop-blur-md rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Assigned Property Units</h3>
                  <p className="text-xs text-ink-secondary">Live occupancy and status verification</p>
                </div>
                <span className="text-xs font-mono font-bold text-ink-muted">
                  {units.length} Unit{units.length !== 1 ? "s" : ""}
                </span>
              </div>

              {units.length === 0 ? (
                <p className="text-xs text-ink-secondary text-center py-8">
                  No units currently linked to this stakeholder access token.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {units.map((unit) => {
                    const isOccupied = unit.status === "occupied" || unit.status === "active";
                    const isVacant = unit.status === "vacant" || unit.status === "available";

                    return (
                      <div
                        key={unit.id}
                        className="p-4 rounded-xl border border-surface-border bg-surface-subtle/50 hover:border-primary/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-xs text-ink">
                              Unit {unit.identifier || unit.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <Badge
                            variant={isOccupied ? "success" : isVacant ? "warning" : "outline"}
                            dot
                            className="capitalize text-[10px] font-bold"
                          >
                            {unit.status?.replace(/_/g, " ") || "Active"}
                          </Badge>
                        </div>

                        {unit.rent_amount && (
                          <div className="text-xs font-mono text-ink-secondary">
                            Monthly Rent: <strong className="text-ink">{unit.currency || "GHS"} {Number(unit.rent_amount).toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Escrow & Trust Footer */}
            <div className="p-4 rounded-2xl bg-surface-subtle/60 border border-surface-border text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-ink">
                <Landmark className="w-3.5 h-3.5 text-primary" />
                <span>Protected by BaytMiftah Escrow & Trust Settlement Network</span>
              </div>
              <p className="text-[11px] text-ink-muted">
                Statutory GRA withholding tax compliance & double-entry reconciliation guaranteed.
              </p>
            </div>
          </>
        ) : null}
        </OperationalQueryState>
      </div>
    </StandalonePageShell>
  );
}
