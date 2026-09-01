import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hammer } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const db = supabase as any;

export function ContractorPortal({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const { data: estates } = await db.from("managed_estates").select("id, name").eq("organization_id", organizationId);
        const estateIds = ((estates || []) as any[]).map((e) => e.id);
        if (estateIds.length === 0) {
          if (active) setOrders([]);
          return;
        }
        const { data } = await db
          .from("estate_work_orders")
          .select("id, status, notes, assigned_to_user_id, created_at, issue:estate_issues(title)")
          .in("estate_id", estateIds)
          .order("created_at", { ascending: false })
          .limit(50);
        const mine = ((data || []) as any[]).filter(
          (row) => !user?.id || row.assigned_to_user_id === user.id || !row.assigned_to_user_id
        );
        if (active) setOrders(mine.map((row) => ({ ...row, title: row.issue?.title || row.notes || "Work order" })));
      } catch (error) {
        console.error(error);
        toast.error("Unable to load contractor jobs.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [organizationId, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Hammer className="h-6 w-6" />
          Contractor Self-Serve Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          Work orders assigned to you (or unassigned jobs available to contractors). Update progress from Technician Jobs.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading jobs…</p>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No contractor jobs in this organization yet.</Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{order.title || "Work order"}</div>
                <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              <Badge variant="outline" className="capitalize">{String(order.status || "open").replace(/_/g, " ")}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
