import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { customerHealthService, type OrgHealthRecord } from "../../../lib/customer-health.service";

export function CustomerHealthCenter({ organizationId }: { organizationId?: string }) {
  const [orgs, setOrgs] = useState<OrgHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void customerHealthService
      .getOrganizationHealth()
      .then((rows) => {
        if (!active) return;
        const scoped = organizationId ? rows.filter((r) => r.id === organizationId) : rows;
        setOrgs(scoped.length ? scoped : rows);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Unable to load customer health telemetry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  const avgHealth = useMemo(
    () => (orgs.length ? Math.round(orgs.reduce((sum, o) => sum + o.healthScore, 0) / orgs.length) : 0),
    [orgs]
  );
  const totalUnits = orgs.reduce((sum, o) => sum + o.unitsManaged, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Customer Health & SaaS Telemetry</h1>
        <p className="text-sm text-ink-muted">
          Live scores from collection rate, open issue load, and AI utilization — not demo data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Computing health scores…
        </div>
      ) : (
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
          <div className="space-y-3">
            {orgs.map((org) => (
              <Card key={org.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {org.name}
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {org.unitsManaged} units · {org.collectionRate}% collected · {org.openIssues} open issues ·{" "}
                    {org.aiActions30d} AI actions (30d)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Health {org.healthScore}</Badge>
                  <Badge className={org.renewalRisk === "LOW" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>
                    {org.renewalRisk} risk
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
