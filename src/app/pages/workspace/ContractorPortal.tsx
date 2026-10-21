import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hammer } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const db = supabase as any;

export function ContractorPortal({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const { data: estates } = await db.from("managed_estates").select("id, name").eq("organization_id", organizationId);
      const estateIds = ((estates || []) as any[]).map((e) => e.id);
      if (estateIds.length === 0) {
        setOrders([]);
        return;
      }
      const { data } = await db
        .from("estate_work_orders")
        .select("id, status, notes, assigned_to_user_id, created_at, issue:estate_issues(title)")
        .in("estate_id", estateIds)
        .order("created_at", { ascending: false })
        .limit(50);
      const mine = ((data || []) as any[]).filter(
        (row) => !user?.id || row.assigned_to_user_id === user.id || !row.assigned_to_user_id,
      );
      setOrders(mine.map((row) => ({ ...row, title: row.issue?.title || row.notes || "Work order" })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load contractor jobs.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId, user?.id]);

  const queryPhase = loadError ? "error" : loading ? "loading" : orders.length === 0 ? "empty" : "ready";

  return (
    <WorkspacePageShell
      tone="emerald"
      title="Contractor Self-Serve Portal"
      description="Work orders assigned to you (or unassigned jobs available to contractors). Update progress from Technician Jobs."
      badge={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <Hammer className="h-4 w-4" aria-hidden="true" />
          Contractor portal
        </span>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void load()}
        emptyTitle="No contractor jobs yet"
        emptyDescription="No contractor jobs in this organization yet."
      >
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{order.title || "Work order"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {String(order.status || "open").replace(/_/g, " ")}
              </Badge>
            </Card>
          ))}
        </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
