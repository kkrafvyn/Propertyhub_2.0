import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Banknote, BellRing, CheckCircle2, FileText, Landmark, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { estateOperationsService, type EstateCollectionAction, type EstatePaymentPlan, type EstateReconciliation, type EstateUnit, type ManagedEstate } from "../../../lib/estate-operations.service";
import { getChargeOutstandingMinor, summarizeEstateLedger, type EstateChargeRow } from "../../../lib/estate-ledger";
import { exportEstateReceivables } from "../../../lib/estate-accounting-export.service";
import { collectionsQueueService, type CollectionQueueItem } from "../../../lib/collections-queue.service";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { escapeHtml } from "../../../lib/html-escape";

interface EstateFinanceProps { organizationId: string; currentUserId: string; }

const money = (value = 0, currency = "GHS") => new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(value / 100);
const date = () => new Date().toISOString().slice(0, 10);

export function EstateFinance({ organizationId, currentUserId }: EstateFinanceProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [plans, setPlans] = useState<EstatePaymentPlan[]>([]);
  const [reconciliations, setReconciliations] = useState<EstateReconciliation[]>([]);
  const [collectionQueue, setCollectionQueue] = useState<CollectionQueueItem[]>([]);
  const [estateId, setEstateId] = useState("");
  const [planUnitId, setPlanUnitId] = useState("");
  const [planTotal, setPlanTotal] = useState("");
  const [planDeposit, setPlanDeposit] = useState("0");
  const [planCount, setPlanCount] = useState("12");
  const [planType, setPlanType] = useState<EstatePaymentPlan["plan_type"]>("rent");
  const [planFrequency, setPlanFrequency] = useState<EstatePaymentPlan["frequency"]>("monthly");
  const [planStart, setPlanStart] = useState(date());
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [statementDate, setStatementDate] = useState(date());
  const [selectedReconciliationId, setSelectedReconciliationId] = useState("");
  const [lineReference, setLineReference] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [collectionUnitId, setCollectionUnitId] = useState("");
  const [collectionNote, setCollectionNote] = useState("");
  const [collectionChannel, setCollectionChannel] = useState<EstateCollectionAction["channel"]>("sms");

  const refresh = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const estateRows = await estateOperationsService.getEstates(organizationId);
      const estateIds = estateRows.map((item) => item.id);
      const unitRows = await estateOperationsService.getUnits(estateIds);
      const [chargeRows, planRows, reconciliationRows, queueRows] = await Promise.all([
        estateOperationsService.getCharges(unitRows.map((item) => item.id)),
        estateOperationsService.getPaymentPlans(unitRows.map((item) => item.id)),
        estateOperationsService.getReconciliations(estateIds),
        collectionsQueueService.getQueue(organizationId),
      ]);
      setEstates(estateRows); setUnits(unitRows); setCharges(chargeRows); setPlans(planRows); setReconciliations(reconciliationRows); setCollectionQueue(queueRows);
      setEstateId((value) => value || estateRows[0]?.id || "");
      setPlanUnitId((value) => value || unitRows[0]?.id || "");
      setCollectionUnitId((value) => value || unitRows[0]?.id || "");
      setSelectedReconciliationId((value) => value || reconciliationRows[0]?.id || "");
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load estate finance. Apply the latest database migration and try again.";
      setLoadError(message);
      toast.error(message);
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [organizationId]);

  const selectedEstate = estates.find((item) => item.id === estateId);
  const estateUnits = units.filter((item) => item.estate_id === estateId);
  const ledger = useMemo(() => summarizeEstateLedger(charges.filter((item) => estateUnits.some((unit) => unit.id === item.unit_id))), [charges, estateUnits]);
  const arrears = useMemo(() => charges.filter((item) => estateUnits.some((unit) => unit.id === item.unit_id) && getChargeOutstandingMinor(item) > 0).sort((a, b) => a.due_date.localeCompare(b.due_date)), [charges, estateUnits]);
  const estatePlans = plans.filter((item) => estateUnits.some((unit) => unit.id === item.unit_id));
  const estateQueue = collectionQueue.filter((item) => item.estateId === estateId);
  const estateReconciliations = reconciliations.filter((item) => item.estate_id === estateId);
  const selectedReconciliation = estateReconciliations.find((item) => item.id === selectedReconciliationId) || null;
  const unitName = (unitId: string) => units.find((item) => item.id === unitId)?.identifier || "Unit";

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalMinor = Math.round(Number(planTotal) * 100); const depositMinor = Math.round(Number(planDeposit) * 100); const count = Number(planCount);
    if (!planUnitId || totalMinor <= 0 || depositMinor < 0 || depositMinor > totalMinor || !Number.isInteger(count) || count < 1) { toast.error("Enter a unit, valid amounts, and at least one instalment."); return; }
    try { setSubmitting(true); await estateOperationsService.createPaymentPlan({ unitId: planUnitId, planType, totalMinor, depositMinor, currency: selectedEstate?.currency || "GHS", frequency: planFrequency, startDate: planStart, installmentCount: count, createdBy: currentUserId }); setPlanTotal(""); toast.success("Payment plan created and instalment charges posted."); await refresh(); }
    catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : "Unable to create the payment plan."); }
    finally { setSubmitting(false); }
  };
  const createReconciliation = async (event: React.FormEvent) => {
    event.preventDefault(); const opening = Math.round(Number(openingBalance || 0) * 100); const closing = Math.round(Number(closingBalance || 0) * 100);
    if (!estateId || !accountName.trim()) { toast.error("Choose an estate and enter the bank or wallet account name."); return; }
    try { setSubmitting(true); const row = await estateOperationsService.createReconciliation({ estateId, accountName, statementDate, openingBalanceMinor: opening, closingBalanceMinor: closing, currency: selectedEstate?.currency || "GHS", createdBy: currentUserId }); setAccountName(""); setOpeningBalance(""); setClosingBalance(""); setSelectedReconciliationId(row.id); toast.success("Reconciliation opened."); await refresh(); }
    catch (error) { console.error(error); toast.error("Unable to open reconciliation."); } finally { setSubmitting(false); }
  };
  const addLine = async (event: React.FormEvent) => {
    event.preventDefault(); const amount = Math.round(Number(lineAmount) * 100);
    if (!selectedReconciliation || !lineReference.trim() || !amount) { toast.error("Enter a statement reference and amount."); return; }
    try { setSubmitting(true); await estateOperationsService.addReconciliationLine({ reconciliationId: selectedReconciliation.id, statementReference: lineReference, amountMinor: amount }); setLineReference(""); setLineAmount(""); toast.success("Statement line added."); await refresh(); }
    catch (error) { console.error(error); toast.error("Unable to add statement line."); } finally { setSubmitting(false); }
  };
  const logCollection = async (charge?: EstateChargeRow) => {
    const unitId = charge?.unit_id || collectionUnitId;
    if (!unitId || !collectionNote.trim()) { toast.error("Add a short collection note first."); return; }
    try { setSubmitting(true); await estateOperationsService.createCollectionAction({ unitId, chargeId: charge?.id, actionType: "reminder", channel: collectionChannel, note: collectionNote, createdBy: currentUserId }); setCollectionNote(""); toast.success("Collection action logged. Use your connected channel to send the reminder."); }
    catch (error) { console.error(error); toast.error("Unable to log the collection action."); } finally { setSubmitting(false); }
  };
  const openStatement = (unitId: string) => {
    const unitCharges = charges.filter((charge) => charge.unit_id === unitId);
    const outstanding = unitCharges.reduce((total, charge) => total + Math.max(0, getChargeOutstandingMinor(charge)), 0);
    const popup = window.open("", "_blank", "noopener,noreferrer,width=840,height=760");
    if (!popup) { toast.error("Allow pop-ups to open the unit statement."); return; }
    const estateLabel = escapeHtml(selectedEstate?.name || "Estate");
    const unitLabel = escapeHtml(unitName(unitId));
    const generatedOn = escapeHtml(new Date().toLocaleDateString());
    const rows = unitCharges
      .map(
        (charge) =>
          `<tr><td>${escapeHtml(charge.due_date)}</td><td>${escapeHtml(charge.description || charge.type || "Charge")}</td><td>${escapeHtml(money(Number(charge.amount_minor), charge.currency || selectedEstate?.currency))}</td><td>${escapeHtml(money(getChargeOutstandingMinor(charge), charge.currency || selectedEstate?.currency))}</td></tr>`,
      )
      .join("");
    popup.document.write(
      `<html><head><title>${unitLabel} statement</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#172033}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:22px;font-weight:bold;margin-top:24px}</style></head><body><h1>BaytMiftah Unit Statement</h1><p>${estateLabel} · ${unitLabel} · Generated ${generatedOn}</p><table><thead><tr><th>Due date</th><th>Description</th><th>Charge</th><th>Outstanding</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No ledger entries.</td></tr>"}</tbody></table><p class="total">Balance due: ${escapeHtml(money(outstanding, selectedEstate?.currency))}</p></body></html>`,
    );
    popup.document.close(); popup.focus(); popup.print();
  };

  const collectionQueuePanel = selectedEstate ? <Card className="p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Collections queue</h2><p className="mt-1 text-sm text-muted-foreground">Prioritized by balance, age, and follow-up history.</p></div><Badge variant="outline">{estateQueue.length} cases</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{estateQueue.slice(0, 12).map((item) => <div key={item.unitId} className="rounded-lg border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{unitName(item.unitId)}</p><p className="text-xs text-muted-foreground">{item.agingBucket.replace("_", "-")} · {item.daysOverdue} days overdue</p></div><Badge variant={item.priorityScore >= 70 ? "destructive" : "outline"}>P{item.priorityScore}</Badge></div><p className="mt-3 text-lg font-semibold">{money(item.totalOutstandingMinor, selectedEstate.currency)}</p><p className="text-xs text-muted-foreground">Status: {item.status}</p></div>)}{estateQueue.length === 0 && <p className="text-sm text-muted-foreground">No outstanding cases in this estate.</p>}</div></Card> : null;

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="Estate Finance"
      description="Run property-level billing, receivables, payment plans, bank matching, and collections from one finance record."
      actions={
        <Button
          variant="outline"
          onClick={() =>
            exportEstateReceivables(
              charges.filter((charge) => estateUnits.some((unit) => unit.id === charge.unit_id)),
              unitName,
            )
          }
        >
          Export receivables CSV
        </Button>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void refresh()}
        loadingFallback={
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading estate finance...
          </div>
        }
      >
    <div className="space-y-6">{collectionQueuePanel}
    <div className="flex flex-wrap gap-3"><NativeSelectControl className="rounded-lg border border-border bg-input-background px-3 py-2" value={estateId} onChange={(event) => setEstateId(event.target.value)}><option value="">Select estate</option>{estates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelectControl><Badge variant="outline">{estateUnits.length} units</Badge></div>
    {!selectedEstate ? <Card className="p-8 text-center text-muted-foreground">Create an estate and unit in Estate Operations first, then finance it here.</Card> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card className="p-4"><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-semibold">{money(ledger.totalOutstandingMinor, selectedEstate.currency)}</p></Card><Card className="p-4"><p className="text-sm text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-semibold text-destructive">{money(ledger.overdueMinor, selectedEstate.currency)}</p></Card><Card className="p-4"><p className="text-sm text-muted-foreground">Active plans</p><p className="mt-1 text-2xl font-semibold">{estatePlans.filter((plan) => plan.status === "active").length}</p></Card><Card className="p-4"><p className="text-sm text-muted-foreground">Unmatched statement lines</p><p className="mt-1 text-2xl font-semibold">{estateReconciliations.flatMap((item) => item.lines || []).filter((line) => !line.matched).length}</p></Card></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><div className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Deposit & instalment plans</h2></div><p className="mt-1 text-sm text-muted-foreground">Creates dated instalment charges on the immutable unit ledger.</p><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={createPlan}><NativeSelectControl className="rounded-lg border border-border bg-input-background px-3 py-2" value={planUnitId} onChange={(event) => setPlanUnitId(event.target.value)}>{estateUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.identifier}</option>)}</NativeSelectControl><NativeSelectControl className="rounded-lg border border-border bg-input-background px-3 py-2" value={planType} onChange={(event) => setPlanType(event.target.value as EstatePaymentPlan["plan_type"])}><option value="rent">Rent</option><option value="sale">Sale</option><option value="deposit">Deposit</option><option value="service_charge">Service charge</option><option value="other">Other</option></NativeSelectControl><Input inputMode="decimal" placeholder="Total amount (GHS)" value={planTotal} onChange={(event) => setPlanTotal(event.target.value)} /><Input inputMode="decimal" placeholder="Deposit now (GHS)" value={planDeposit} onChange={(event) => setPlanDeposit(event.target.value)} /><Input type="number" min="1" placeholder="Number of instalments" value={planCount} onChange={(event) => setPlanCount(event.target.value)} /><NativeSelectControl className="rounded-lg border border-border bg-input-background px-3 py-2" value={planFrequency} onChange={(event) => setPlanFrequency(event.target.value as EstatePaymentPlan["frequency"])}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="custom">Custom monthly</option></NativeSelectControl><Input type="date" value={planStart} onChange={(event) => setPlanStart(event.target.value)} /><Button type="submit" disabled={submitting}><Plus className="h-4 w-4" />Create plan</Button></form><div className="mt-5 space-y-2">{estatePlans.slice(0, 5).map((plan) => <div key={plan.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"><span>{unitName(plan.unit_id)} · {plan.plan_type.replace(/_/g, " ")}</span><span>{money(plan.total_minor, plan.currency)} · {plan.installments?.length || 0} dates</span></div>)}{estatePlans.length === 0 && <p className="text-sm text-muted-foreground">No payment plans yet.</p>}</div></Card>
        <Card className="p-6"><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Bank reconciliation</h2></div><p className="mt-1 text-sm text-muted-foreground">Create a statement, enter its lines, then mark each verified against payment evidence.</p><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={createReconciliation}><Input placeholder="Bank or MoMo account" value={accountName} onChange={(event) => setAccountName(event.target.value)} /><Input type="date" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} /><Input inputMode="decimal" placeholder="Opening balance" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /><Input inputMode="decimal" placeholder="Closing balance" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} /><Button type="submit" className="sm:col-span-2" disabled={submitting}>Open reconciliation</Button></form><div className="mt-5 flex flex-wrap gap-2">{estateReconciliations.map((item) => <Button key={item.id} size="sm" variant={item.id === selectedReconciliationId ? "default" : "outline"} onClick={() => setSelectedReconciliationId(item.id)}>{item.account_name} · {item.statement_date}</Button>)}</div>{selectedReconciliation && <><form className="mt-4 flex flex-wrap gap-2" onSubmit={addLine}><Input className="min-w-40 flex-1" placeholder="Statement reference" value={lineReference} onChange={(event) => setLineReference(event.target.value)} /><Input className="w-36" inputMode="decimal" placeholder="Amount" value={lineAmount} onChange={(event) => setLineAmount(event.target.value)} /><Button type="submit" variant="outline" disabled={submitting}>Add line</Button></form><div className="mt-4 space-y-2">{(selectedReconciliation.lines || []).map((line) => <div key={line.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"><span>{line.statement_reference} · {money(line.amount_minor, selectedEstate.currency)}</span><Button size="sm" variant={line.matched ? "default" : "outline"} onClick={() => void estateOperationsService.setReconciliationLineMatched(line.id, !line.matched).then(refresh)}><CheckCircle2 className="h-4 w-4" />{line.matched ? "Matched" : "Match"}</Button></div>)}</div></>}</Card>
      </div>
      <Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Arrears & collections</h2></div><p className="mt-1 text-sm text-muted-foreground">Record every reminder and follow-up against the unit’s financial history.</p></div><div className="flex flex-wrap gap-2"><NativeSelectControl className="rounded-lg border border-border bg-input-background px-3 py-2" value={collectionChannel || ""} onChange={(event) => setCollectionChannel(event.target.value as EstateCollectionAction["channel"])}><option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="in_app">In-app</option></NativeSelectControl><Input className="w-64" placeholder="Collection note / message" value={collectionNote} onChange={(event) => setCollectionNote(event.target.value)} /></div></div><div className="mt-5 space-y-2">{arrears.slice(0, 12).map((charge) => <div key={charge.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{unitName(charge.unit_id)} · {money(getChargeOutstandingMinor(charge), charge.currency || selectedEstate.currency)}</p><p className="text-sm text-muted-foreground">Due {new Date(charge.due_date).toLocaleDateString()} · {charge.description || charge.type || "Charge"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openStatement(charge.unit_id)}>Statement</Button><Button size="sm" variant="outline" onClick={() => void logCollection(charge)} disabled={submitting}>Log reminder</Button></div></div>)}{arrears.length === 0 && <div className="py-6 text-center text-muted-foreground"><FileText className="mx-auto mb-2 h-5 w-5" />No outstanding estate charges.</div>}</div></Card>
    </>}
  </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
