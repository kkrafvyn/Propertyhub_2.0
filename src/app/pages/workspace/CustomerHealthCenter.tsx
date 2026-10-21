import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { customerHealthService, type OrgHealthRecord } from "../../../lib/customer-health.service";

export function CustomerHealthCenter({ organizationId }: { organizationId?: string }) {
  const [orgs, setOrgs] = useState<OrgHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const rows = await customerHealthService.getOrganizationHealth(organizationId);
      setOrgs(rows);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load organization performance metrics.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const avgHealth = useMemo(
    () => (orgs.length ? Math.round(orgs.reduce((sum, org) => sum + org.healthScore, 0) / orgs.length) : 0),
    [orgs],
  );
  const totalUnits = orgs.reduce((sum, org) => sum + org.unitsManaged, 0);

  const queryPhase = loadError ? "error" : loading ? "loading" : orgs.length === 0 ? "empty" : "ready";

  return (
    <WorkspacePageShell
      title="Customer & Estate Health Overview"
      description="Live operational scores computed from collections, maintenance resolution, customer ratings, and product adoption."
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void load()}
        loadingFallback={
          <div className="flex items-center gap-2 text-sm text-ink-muted py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Computing health scores…
          </div>
        }
        emptyTitle="No health scores yet"
        emptyDescription="Scores appear once estates have collection and maintenance activity."
      >
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-ink-muted">Average health</div>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">{avgHealth} / 100</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-ink-muted">Units under management</div>
              <div className="text-2xl font-bold font-mono mt-1">{totalUnits.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-ink-muted">Organizations scored</div>
              <div className="text-2xl font-bold font-mono mt-1">{orgs.length}</div>
            </Card>
          </div>
          <div className="space-y-3 mt-6">
            {orgs.map((org) => (
              <Card key={org.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {org.name}
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {org.unitsManaged} units ·{" "}
                    {org.collectionRate === null ? "No collection data" : `${org.collectionRate}% collected`} ·{" "}
                    {org.resolutionRate === null
                      ? "No maintenance history"
                      : `${org.resolutionRate}% resolved`}{" "}
                    ·{" "}
                    {org.satisfactionScore === null
                      ? "No customer ratings"
                      : `${org.satisfactionScore}/5 customer rating`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Health {org.healthScore}</Badge>
                  <Badge variant="outline">{org.scoreConfidence} confidence</Badge>
                  <Badge
                    className={
                      org.renewalRisk === "LOW"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }
                  >
                    {org.renewalRisk === "INSUFFICIENT_DATA" ? "Needs data" : `${org.renewalRisk} risk`}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
