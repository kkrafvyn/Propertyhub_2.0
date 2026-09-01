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
      toast.success("Legal hold placed. Retention worker will skip this entity.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to place hold.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Retention & Legal Hold</h1>
        <p className="text-sm text-muted-foreground">
          Policies are enforced by the retention worker. Active legal holds block purge for that entity.
        </p>
      </div>
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Policies</h2>
          <Button size="sm" variant="outline" onClick={() => void seed()}>Seed defaults</Button>
        </div>
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No policies yet. Seed defaults (minimum 30 days).</p>
        ) : (
          policies.map((p) => (
            <div key={`${p.organization_id}-${p.entity}`} className="flex justify-between text-sm border border-border rounded-lg p-3">
              <span className="font-mono">{p.entity}</span>
              <span>{p.retention_days} days</span>
            </div>
          ))
        )}
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Legal holds</h2>
        <form className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]" onSubmit={placeHold}>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {DEFAULT_RETENTION_ENTITIES.map((row) => (
              <option key={row.entity} value={row.entity}>{row.entity}</option>
            ))}
          </select>
          <Input required placeholder="Reason (litigation, regulator request…)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button>Place hold</Button>
        </form>
        {holds.map((h) => (
          <div key={h.id} className="flex justify-between text-sm border border-border rounded-lg p-3">
            <span>{h.entity}: {h.reason}</span>
            <Button size="sm" variant="outline" onClick={() => void retentionService.releaseHold(h.id).then(load)}>Release</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
