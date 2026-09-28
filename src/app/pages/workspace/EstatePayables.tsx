import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { estatePayablesService } from "../../../lib/estate-payables.service";

const money = (v = 0, c = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: c }).format(v / 100);

interface EstatePayablesProps {
  organizationId: string;
  currentUserId: string;
}

export function EstatePayables({ organizationId, currentUserId }: EstatePayablesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [estateId, setEstateId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    number: "",
    amount: "",
    due: "",
    description: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const es = await estateOperationsService.getEstates(organizationId);
      setEstates(es);
      setEstateId((x) => x || es[0]?.id || "");
      setBills(await estatePayablesService.getBills(es.map((x) => x.id)));
    } catch {
      toast.error("Unable to load payables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const estate = estates.find((x) => x.id === estateId);
  const scoped = bills.filter((x) => x.estate_id === estateId);
  const total = scoped
    .filter((x) => x.status !== "paid" && x.status !== "void")
    .reduce((s, x) => s + Number(x.amount_minor), 0);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(Number(form.amount) * 100);
    if (!estateId || !form.number.trim() || amountMinor <= 0) {
      toast.error("Please provide a valid bill number and positive amount.");
      return;
    }
    try {
      setSaving(true);
      await estatePayablesService.createBill({
        estateId,
        billNumber: form.number.trim(),
        amountMinor,
        currency: estate?.currency || "GHS",
        dueDate: form.due,
        description: form.description.trim(),
        createdBy: currentUserId,
      });
      setForm({ number: "", amount: "", due: "", description: "" });
      setShowAddForm(false);
      toast.success("Vendor bill recorded.");
      await load();
    } catch {
      toast.error("Unable to record bill. Bill numbers must be unique per property.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, next: "approved" | "paid" | "void") => {
    try {
      setSaving(true);
      await estatePayablesService.updateStatus(id, next, currentUserId);
      toast.success(
        next === "paid"
          ? "Bill marked as paid."
          : next === "approved"
            ? "Bill approved for payment."
            : "Bill updated.",
      );
      await load();
    } catch {
      toast.error("Unable to update bill status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading vendor bills…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendor Bills & Payables</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Track and approve contractor invoices, utility charges, and supplier bills.
          </p>
        </div>

        {estates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Property:</span>
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-w-[200px]"
              value={estateId}
              onChange={(e) => setEstateId(e.target.value)}
            >
              {estates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Open Payable Balance</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{money(total, estate?.currency)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Outstanding balance across active bills
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Bills</span>
            <FileText className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {scoped.filter((x) => !["paid", "void"].includes(x.status)).length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Invoices awaiting settlement</p>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Bill Register</h2>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "outline" : "default"}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          {showAddForm ? "Cancel" : "Add Vendor Bill"}
        </Button>
      </div>

      {/* Add Bill Form Card */}
      {showAddForm && (
        <Card className="p-5 border-primary/20 space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-semibold text-foreground">Record New Vendor Bill</h3>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Invoice / Bill #
              </label>
              <Input
                placeholder="e.g. INV-2024-001"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Amount ({estate?.currency || "GHS"})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Supplier / Description
              </label>
              <Input
                placeholder="e.g. Generator diesel refill"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="text-xs h-8">
                {saving ? "Saving…" : "Save Bill"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Bill List */}
      <Card className="p-0 overflow-hidden">
        {scoped.length === 0 ? (
          <p className="text-xs text-muted-foreground py-12 text-center">
            No vendor bills recorded for this property yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {scoped.map((bill) => (
              <div
                key={bill.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 text-xs hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{bill.bill_number}</span>
                    <Badge
                      variant={
                        bill.status === "paid"
                          ? "default"
                          : bill.status === "approved"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize text-[10px]"
                    >
                      {bill.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {bill.description || "Vendor invoice"} · Due{" "}
                    {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "Not specified"}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-foreground">
                    {money(bill.amount_minor, bill.currency)}
                  </span>

                  {bill.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateStatus(bill.id, "approved")}
                      disabled={saving}
                      className="h-7 text-xs"
                    >
                      Approve
                    </Button>
                  )}

                  {bill.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => void updateStatus(bill.id, "paid")}
                      disabled={saving}
                      className="h-7 text-xs gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
