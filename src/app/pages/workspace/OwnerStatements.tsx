import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { Download, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/Input";
import { estateOperationsService } from "../../../lib/estate-operations.service";
import { estateReportingService } from "../../../lib/estate-reporting.service";
import { supabase } from "../../../lib/supabase";
import {
  canApproveAmount,
  formatApprovalLimit,
  getApprovalLimitMinor,
  type MemberApprovalProfile,
} from "../../../lib/authorization.service";

const minorToMoney = (value: number | null | undefined, currency = "GHS") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format((value || 0) / 100);

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const firstOfMonth = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const today = isoDate(new Date());

export function OwnerStatements({
  organizationId,
  memberApprovalProfile = null,
}: {
  organizationId?: string;
  memberApprovalProfile?: MemberApprovalProfile | null;
}) {
    const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estates, setEstates] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, any>>({});
  const [runs, setRuns] = useState<any[]>([]);
  const [estateId, setEstateId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  const load = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const estateRows = await estateOperationsService.getEstates(organizationId);
      const units = await estateOperationsService.getUnits(estateRows.map((estate) => estate.id));
      const occupancies = await estateOperationsService.getOccupancies(units.map((unit) => unit.id));
      const ownerRows = occupancies.filter((occupancy) => occupancy.role === "owner");
      const { data, error } = await (supabase as any)
        .from("estate_owner_statement_runs")
        .select("*")
        .in("estate_id", estateRows.map((estate) => estate.id))
        .order("period_end", { ascending: false });
      if (error) throw error;
      const ownerIds = [...new Set(ownerRows.map((owner) => owner.user_id))];
      const { data: peopleRows } = ownerIds.length
        ? await (supabase as any).from("users").select("id, full_name, email").in("id", ownerIds)
        : { data: [] };
      setEstates(estateRows);
      setUnits(units);
      setOwners(ownerRows);
      setPeople(Object.fromEntries((peopleRows || []).map((person: any) => [person.id, person])));
      setRuns(data || []);
      setApprovals(await estateReportingService.listDistributionApprovals(organizationId, "pending"));
      setEstateId((current) => current || estateRows[0]?.id || "");
      setOwnerId((current) => current || ownerRows.find((owner) => owner.role === "owner")?.user_id || "");
    } catch (error) {
      console.error(error);
      toast.error("Unable to load owner reporting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  const estateOwners = useMemo(() => {
    const estateUnitIds = new Set(units.filter((unit) => !estateId || unit.estate_id === estateId).map((unit) => unit.id));
    return owners.filter((owner) => estateUnitIds.has(owner.unit_id));
  }, [owners, units, estateId]);
  const selectedEstate = estates.find((estate) => estate.id === estateId);
  const selectedRun = runs.find((run) => run.estate_id === estateId && run.owner_user_id === ownerId && run.period_start === periodStart && run.period_end === periodEnd);

  const createStatement = async () => {
    if (!estateId || !ownerId) { toast.error("Choose a property and owner first."); return; }
    if (periodEnd < periodStart) { toast.error("The end date must be after the start date."); return; }
    try {
      setBusy(true);
      await estateReportingService.createOwnerStatement({
        estateId,
        ownerUserId: ownerId,
        periodStart,
        periodEnd,
        organizationId,
      });
      toast.success(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "Statement calculation queued offline — it will sync when you reconnect."
          : "Owner statement calculated from recorded payments and paid bills.",
      );
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create the statement. Check your finance access and property ownership records.");
    } finally { setBusy(false); }
  };

  const queueDelivery = async (channel: "in_app" | "email") => {
    if (!selectedRun) { toast.error("Create this statement before queuing delivery."); return; }
    try {
      setBusy(true);
      await estateReportingService.queueOwnerStatementDelivery(selectedRun.id, channel);
      toast.success(`${channel === "email" ? "Email" : "In-app"} delivery queued. It will send after a provider confirms delivery.`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to queue statement delivery.");
    } finally { setBusy(false); }
  };

  const requestApproval = async () => {
    if (!selectedRun || !user?.id) return;
    try {
      setBusy(true);
        await estateReportingService.requestDistributionApproval({
          statementRunId: selectedRun.id,
          amountMinor: selectedRun.net_distributable_minor,
          requestedBy: user.id,
          organizationId,
        });
      setApprovalRequested(true);
      toast.success(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "Payout approval queued offline — it will sync when you reconnect."
          : "Distribution approval requested.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to request distribution approval.");
    } finally { setBusy(false); }
  };

  const reviewApproval = async (
    approvalId: string,
    decision: "approved" | "rejected",
    amountMinor: number,
  ) => {
    if (!user?.id) return;
    if (
      decision === "approved" &&
      memberApprovalProfile &&
      !canApproveAmount(memberApprovalProfile, "finance", amountMinor)
    ) {
      toast.error(
        `Your finance approval limit is ${formatApprovalLimit(getApprovalLimitMinor(memberApprovalProfile, "finance"))}. This payout exceeds it.`,
      );
      return;
    }
    try {
      setBusy(true);
      await estateReportingService.reviewDistributionApproval(approvalId, decision, user.id);
      setApprovals((current) => current.filter((approval) => approval.id !== approvalId));
      toast.success(`Distribution ${decision}.`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to review distribution approval.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!selectedRun?.id) {
      setDeliveries([]);
      return;
    }
    void estateReportingService.listOwnerStatementDeliveries(selectedRun.id).then(setDeliveries);
  }, [selectedRun?.id]);

  const downloadCsv = async () => {
    if (!selectedRun) return;
    try {
      setBusy(true);
      const csv = await estateReportingService.exportOwnerStatementCsv(selectedRun.id);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `owner-statement-${selectedRun.period_start}-${selectedRun.period_end}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Unable to export statement CSV.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Card className="p-8 text-center text-muted-foreground">Loading owner reporting...</Card>;
  if (!organizationId) return <Card className="p-8 text-center text-muted-foreground">Choose an organization to view owner reporting.</Card>;

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold">Owner statements</h1>
      <p className="mt-1 text-muted-foreground">A simple, review-first statement workflow built from recorded collections and paid vendor bills.</p>
    </div>

    <Card className="p-5 space-y-4">
      <div><h2 className="font-semibold">Create a statement</h2><p className="mt-1 text-sm text-muted-foreground">Pick the property, owner, and period. BaytMiftah calculates the amounts; a person still approves any actual payout.</p></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <NativeSelectControl className="rounded-lg border border-border px-3 py-2" value={estateId} onChange={(event) => { setEstateId(event.target.value); setOwnerId(""); }}><option value="">Choose property</option>{estates.map((estate) => <option key={estate.id} value={estate.id}>{estate.name}</option>)}</NativeSelectControl>
        <NativeSelectControl className="rounded-lg border border-border px-3 py-2" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">Choose owner</option>{estateOwners.map((owner) => <option key={`${owner.unit_id}-${owner.user_id}`} value={owner.user_id}>{people[owner.user_id]?.full_name || people[owner.user_id]?.email || `Owner ${owner.user_id.slice(0, 8)}`}</option>)}</NativeSelectControl>
        <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} aria-label="Statement period start" />
        <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} aria-label="Statement period end" />
      </div>
      <Button onClick={() => void createStatement()} disabled={busy || !estateId || !ownerId}>{busy ? "Calculating..." : "Calculate statement"}</Button>
    </Card>

    {selectedRun ? <Card className="p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Statement ready for review</h2><p className="mt-1 text-sm text-muted-foreground">{selectedEstate?.name || "Property"} · {selectedRun.period_start} to {selectedRun.period_end}</p></div><Badge variant="outline" className="capitalize w-fit">{selectedRun.status}</Badge></div>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Collections</p><p className="mt-1 text-xl font-semibold">{minorToMoney(selectedRun.gross_collections_minor, selectedRun.currency)}</p></div><div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Paid expenses</p><p className="mt-1 text-xl font-semibold">{minorToMoney(selectedRun.expense_minor, selectedRun.currency)}</p></div><div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Net distributable</p><p className="mt-1 text-xl font-semibold text-emerald-600">{minorToMoney(selectedRun.net_distributable_minor, selectedRun.currency)}</p></div></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => void requestApproval()} disabled={busy || approvalRequested}>{approvalRequested ? "Approval requested" : "Request payout approval"}</Button><Button variant="outline" onClick={() => void queueDelivery("in_app")} disabled={busy}><Send className="mr-2 h-4 w-4" />Queue in-app</Button><Button variant="outline" onClick={() => void queueDelivery("email")} disabled={busy}><Send className="mr-2 h-4 w-4" />Queue email</Button><Button variant="outline" onClick={() => void downloadCsv()} disabled={busy}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Print / save PDF</Button></div>
      {deliveries.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Delivery queue</h3>
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span className="capitalize">{delivery.channel.replace("_", " ")}</span>
              <Badge variant="outline" className="capitalize">{delivery.status}</Badge>
            </div>
          ))}
        </div>
      ) : null}
    </Card> : <Card className="p-8 text-center text-muted-foreground">Select an owner and period, then calculate a statement to review the actual totals.</Card>}

    {runs.length > 0 ? <Card className="p-5"><h2 className="font-semibold">Recent statements</h2><div className="mt-3 space-y-2">{runs.slice(0, 8).map((run) => <div key={run.id} className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm">{estates.find((estate) => estate.id === run.estate_id)?.name || "Property"} · {run.period_start} to {run.period_end}</span><span className="font-medium">{minorToMoney(run.net_distributable_minor, run.currency)}</span></div>)}</div></Card> : null}
    {approvals.length > 0 ? <Card className="p-5"><h2 className="font-semibold">Pending distribution approvals</h2><div className="mt-3 space-y-2">{approvals.map((approval) => {
      const amountMinor = approval.requested_amount_minor || 0;
      const canApprove = memberApprovalProfile
        ? canApproveAmount(memberApprovalProfile, "finance", amountMinor)
        : true;
      return (
        <div key={approval.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <span className="text-sm">{minorToMoney(amountMinor, approval.statement?.currency)} requested</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => void reviewApproval(approval.id, "approved", amountMinor)}
              disabled={busy || !canApprove}
              title={!canApprove ? `Exceeds your limit (${formatApprovalLimit(memberApprovalProfile ? getApprovalLimitMinor(memberApprovalProfile, "finance") : 0)})` : undefined}
            >
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => void reviewApproval(approval.id, "rejected", amountMinor)} disabled={busy}>Reject</Button>
          </div>
        </div>
      );
    })}</div></Card> : null}
  </div>;
}
