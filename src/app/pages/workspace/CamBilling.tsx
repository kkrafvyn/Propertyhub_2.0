import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calculator, Plus } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { camBillingService, type CamAllocationPlan, type CamAllocationLine } from "../../../lib/cam-billing.service";
import { estateOperationsService, type ManagedEstate, type EstateUnit } from "../../../lib/estate-operations.service";

const money = (minor = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minor / 100);

export function CamBilling({ organizationId }: { organizationId: string }) {
  const [plans, setPlans] = useState<CamAllocationPlan[]>([]);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [lines, setLines] = useState<CamAllocationLine[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", estateId: "", periodStart: "", periodEnd: "", totalExpense: "", method: "pro_rata_sqft" as const });

  const load = async () => {
    try {
      setLoading(true);
      const [planRows, estateRows] = await Promise.all([
        camBillingService.listPlans(organizationId),
        estateOperationsService.getEstates(organizationId),
      ]);
      setPlans(planRows);
      setEstates(estateRows);
      setForm((f) => ({ ...f, estateId: f.estateId || estateRows[0]?.id || "" }));
      if (planRows[0]) setSelectedPlanId(planRows[0].id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  useEffect(() => {
    if (!form.estateId) return;
    void estateOperationsService.getUnits([form.estateId]).then(setUnits);
  }, [form.estateId]);

  useEffect(() => {
    if (!selectedPlanId) return;
    void camBillingService.getLines(selectedPlanId).then(setLines);
  }, [selectedPlanId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const plan = await camBillingService.createPlan({
        organizationId,
        estateId: form.estateId,
        name: form.name,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        totalExpenseMinor: Math.round(parseFloat(form.totalExpense) * 100),
        allocationMethod: form.method,
      });
      toast.success("CAM plan created");
      setSelectedPlanId(plan.id);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAllocate = async () => {
    if (!selectedPlanId || units.length === 0) return;
    try {
      const unitInputs = units.map((u) => ({ unitId: u.id, squareFeet: 100 }));
      await camBillingService.allocateProRata(selectedPlanId, unitInputs);
      toast.success("CAM allocated across units");
      setLines(await camBillingService.getLines(selectedPlanId));
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const unitLabel = (id: string) => units.find((u) => u.id === id)?.identifier || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Calculator className="h-6 w-6 text-primary" /> Common Area Maintenance (CAM) Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Distribute and bill shared property maintenance, security, and facility upkeep costs across tenants.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Allocation Plans</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading plans...</p>
          ) : plans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No allocation plans created yet. Use the form to start your first cost distribution.
            </div>
          ) : (
            plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                  selectedPlanId === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-sm text-foreground">{p.name}</p>
                  <Badge variant={p.status === "allocated" || p.status === "invoiced" ? "default" : "outline"} className="capitalize text-xs">
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.period_start} → {p.period_end} · {money(p.total_expense_minor, p.currency)}
                </p>
              </button>
            ))
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Create Allocation Plan</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="plan-name" className="block text-xs font-medium text-muted-foreground mb-1">
                Plan Name
              </label>
              <Input
                id="plan-name"
                placeholder="e.g. Q3 2026 Facility & Security Expenses"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="property-estate" className="block text-xs font-medium text-muted-foreground mb-1">
                Property / Estate
              </label>
              <NativeSelectControl
                id="property-estate"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={form.estateId}
                onChange={(e) => setForm({ ...form, estateId: e.target.value })}
              >
                {estates.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </NativeSelectControl>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="period-start" className="block text-xs font-medium text-muted-foreground mb-1">
                  Period Start
                </label>
                <Input
                  id="period-start"
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="period-end" className="block text-xs font-medium text-muted-foreground mb-1">
                  Period End
                </label>
                <Input
                  id="period-end"
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="total-expense" className="block text-xs font-medium text-muted-foreground mb-1">
                Total Shared Expense Amount
              </label>
              <Input
                id="total-expense"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.totalExpense}
                onChange={(e) => setForm({ ...form, totalExpense: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-1.5" /> Create Plan
            </Button>
          </form>
        </Card>
      </div>

      {selectedPlan && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Allocations — {selectedPlan.name}</h2>
            {selectedPlan.status === "draft" && (
              <Button size="sm" onClick={handleAllocate}>Run pro-rata allocation</Button>
            )}
          </div>
          {lines.length === 0 ? <p className="text-sm text-muted-foreground">No allocations yet.</p> : (
            <div className="overflow-x-auto" role="region" aria-label="CAM allocations" tabIndex={0}>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Unit</th><th className="py-2">Share</th><th className="py-2">Amount</th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2">{unitLabel(l.unit_id)}</td>
                      <td className="py-2">{(l.share_basis_points / 100).toFixed(2)}%</td>
                      <td className="py-2">{money(l.allocated_minor, selectedPlan.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
