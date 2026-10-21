import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, Plus } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { commercialLeaseService, type CommercialEscalation } from "../../../lib/commercial-lease.service";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

const db = supabase as any;

export function CommercialLeaseEscalations({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState<CommercialEscalation[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [form, setForm] = useState<{ leaseId: string; effectiveDate: string; type: CommercialEscalation["escalation_type"]; basisPoints: string; amount: string }>({
    leaseId: "",
    effectiveDate: "",
    type: "percentage",
    basisPoints: "300",
    amount: "",
  });

  const load = async () => {
    const [e, l] = await Promise.all([
      commercialLeaseService.listEscalations(organizationId),
      db.from("leases").select("id, rent_minor, currency, start_date, end_date").eq("organization_id", organizationId).eq("status", "active"),
    ]);
    setEscalations(e);
    setLeases(l.data || []);
    setForm((f) => ({ ...f, leaseId: f.leaseId || l.data?.[0]?.id || "" }));
  };

  useEffect(() => { void load(); }, [organizationId]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await commercialLeaseService.scheduleEscalation({
        leaseId: form.leaseId,
        organizationId,
        effectiveDate: form.effectiveDate,
        escalationType: form.type,
        valueBasisPoints: form.type === "percentage" ? parseInt(form.basisPoints) : undefined,
        amountMinor: form.type === "fixed_amount" ? Math.round(parseFloat(form.amount) * 100) : undefined,
        createdBy: user?.id,
      });
      toast.success("Escalation scheduled");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApply = async (id: string) => {
    try {
      await commercialLeaseService.applyEscalation(id);
      toast.success("Escalation applied to lease rent");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <WorkspacePageShell
      tone="finance"
      title="Commercial Lease Escalations"
      description="Schedule CPI, percentage, and step-rent increases for commercial leases."
    >
      <OperationalQueryState phase="ready">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Scheduled escalations</h2>
          {escalations.length === 0 ? <p className="text-sm text-muted-foreground">None scheduled.</p> : escalations.map((esc) => (
            <div key={esc.id} className="rounded-lg border p-3 flex justify-between items-center">
              <div>
                <p className="font-medium capitalize">{esc.escalation_type.replace(/_/g, " ")} · {esc.effective_date}</p>
                {esc.new_rent_minor != null && <p className="text-xs text-muted-foreground">New rent: {(esc.new_rent_minor / 100).toFixed(2)}</p>}
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{esc.status}</Badge>
                {esc.status === "scheduled" && <Button size="sm" variant="outline" onClick={() => handleApply(esc.id)}>Apply</Button>}
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Schedule escalation</h2>
          <form onSubmit={handleSchedule} className="space-y-3">
            <NativeSelectControl className="w-full rounded-lg border px-3 py-2" value={form.leaseId} onChange={(e) => setForm({ ...form, leaseId: e.target.value })}>
              {leases.map((l) => <option key={l.id} value={l.id}>Lease · {(l.rent_minor / 100).toFixed(2)} {l.currency}</option>)}
            </NativeSelectControl>
            <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} required />
            <NativeSelectControl className="w-full rounded-lg border px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
              <option value="percentage">Percentage increase</option>
              <option value="fixed_amount">Fixed amount increase</option>
              <option value="cpi">CPI index</option>
              <option value="step_rent">Step rent</option>
            </NativeSelectControl>
            {form.type === "percentage" ? (
              <Input type="number" placeholder="Basis points (300 = 3%)" value={form.basisPoints} onChange={(e) => setForm({ ...form, basisPoints: e.target.value })} />
            ) : (
              <Input type="number" step="0.01" placeholder="Amount increase" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            )}
            <Button type="submit"><Plus className="h-4 w-4 mr-1" /> Schedule</Button>
          </form>
        </Card>
      </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
