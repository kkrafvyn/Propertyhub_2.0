import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { DEFAULT_RETENTION_ENTITIES, retentionService } from "../../../lib/retention.service";
import { useAuth } from "../../context/AuthContext";

export function DataRetentionCenter({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [entity, setEntity] = useState(DEFAULT_RETENTION_ENTITIES[0].entity);

  const load = async () => {
    if (!organizationId) return;
    const [p, h] = await Promise.all([
      retentionService.listPolicies(organizationId),
      retentionService.listHolds(organizationId),
    ]);
    setPolicies(p);
    setHolds(h);
  };

  useEffect(() => {
    void load().catch((error) => {
      console.error(error);
      toast.error("Unable to load retention controls.");
    });
  }, [organizationId]);

  const seed = async () => {
    if (!organizationId) return;
    for (const row of DEFAULT_RETENTION_ENTITIES) {
      await retentionService.upsertPolicy(organizationId, row.entity, row.days, user?.id);
    }
    toast.success("Default retention policies saved.");
    await load();
  };

  const placeHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      await retentionService.placeHold({ organizationId, entity, reason, createdBy: user?.id });
      setReason("");
      toast.success("Legal hold placed. Records in this category are protected from scheduled cleanup.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to place hold.");
    }
  };

  const formatEntityName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Retention & Compliance Holds</h1>
        <p className="text-sm text-muted-foreground">
          Configure how long historical records and activity logs are preserved. Active compliance holds protect records from scheduled cleanup.
        </p>
      </div>
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Retention Schedules</h2>
          <Button size="sm" variant="outline" onClick={() => void seed()}>
            Apply Recommended Policies
          </Button>
        </div>
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom policies active yet. Click Apply Recommended Policies to configure standard document retention periods.
          </p>
        ) : (
          policies.map((p) => (
            <div key={`${p.organization_id}-${p.entity}`} className="flex justify-between items-center text-sm border border-border rounded-lg p-3">
              <span className="font-medium text-foreground">{formatEntityName(p.entity)}</span>
              <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                {p.retention_days} days
              </span>
            </div>
          ))
        )}
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" /> Compliance & Legal Holds</h2>
        <form className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]" onSubmit={placeHold}>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {DEFAULT_RETENTION_ENTITIES.map((row) => (
              <option key={row.entity} value={row.entity}>{formatEntityName(row.entity)}</option>
            ))}
          </select>
          <Input required placeholder="Reason for hold (e.g., audit review, disputed claim…)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button>Place Hold</Button>
        </form>
        {holds.map((h) => (
          <div key={h.id} className="flex justify-between items-center text-sm border border-border rounded-lg p-3">
            <span><strong>{formatEntityName(h.entity)}:</strong> {h.reason}</span>
            <Button size="sm" variant="outline" onClick={() => void retentionService.releaseHold(h.id).then(load)}>Release</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
