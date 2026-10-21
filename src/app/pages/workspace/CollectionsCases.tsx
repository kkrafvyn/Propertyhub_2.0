import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Plus,
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  collectionsCaseService,
  type CollectionCase,
  type CaseDetail,
  type ContactChannel,
} from "../../../lib/collections-case.service";
import { promiseToPayService, type PtPSummary } from "../../../lib/promise-to-pay.service";
import { useAuth } from "../../context/AuthContext";
import {
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";

const money = (pesewas: number = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
  }).format(pesewas / 100);

export function CollectionsCases({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"queue" | "detail" | "ptp">("queue");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cases, setCases] = useState<CollectionCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [ptpSummary, setPtpSummary] = useState<PtPSummary | null>(null);

  // Modals / forms
  const [contactNote, setContactNote] = useState("");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("phone");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [promiseNotes, setPromiseNotes] = useState("");
  const [activePtps, setActivePtps] = useState<Awaited<ReturnType<typeof promiseToPayService.getActivePtPs>>>([]);
  const [overduePtps, setOverduePtps] = useState<Awaited<ReturnType<typeof promiseToPayService.getOverduePtPs>>>([]);
  const [writeOffReason, setWriteOffReason] = useState("");
  const [escalateReason, setEscalateReason] = useState("");

  const loadCases = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const [caseList, ptp, active, overdue] = await Promise.all([
        collectionsCaseService.listCases(organizationId),
        promiseToPayService.getSummary(organizationId),
        promiseToPayService.getActivePtPs(organizationId),
        promiseToPayService.getOverduePtPs(organizationId),
      ]);
      setCases(caseList);
      setPtpSummary(ptp);
      setActivePtps(active);
      setOverduePtps(overdue);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load collections cases";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [organizationId]);

  const handleSelectCase = async (id: string) => {
    try {
      setSelectedCaseId(id);
      const detail = await collectionsCaseService.getCaseDetail(id);
      setCaseDetail(detail);
      setTab("detail");
    } catch (err: any) {
      toast.error("Failed to load case detail");
    }
  };

  const handleLogContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    try {
      await collectionsCaseService.logContactAttempt({
        caseId: selectedCaseId,
        actorUserId: user?.id,
        channel: contactChannel,
        note: contactNote,
      });
      toast.success("Contact logged successfully");
      setContactNote("");
      handleSelectCase(selectedCaseId);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to log contact");
    }
  };

  const handleAddPromise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    try {
      await collectionsCaseService.createPromise({
        caseId: selectedCaseId,
        amountMinor: Math.round((parseFloat(promiseAmount) || 0) * 100),
        currency: "GHS",
        promisedFor: promiseDate,
        createdBy: user?.id,
        notes: promiseNotes,
      });
      toast.success("Promise-to-Pay recorded");
      setPromiseAmount("");
      setPromiseDate("");
      setPromiseNotes("");
      handleSelectCase(selectedCaseId);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to create Promise-to-Pay");
    }
  };

  const handleClosePaid = async (caseId: string) => {
    try {
      await collectionsCaseService.closeAsPaid(caseId, user?.id);
      toast.success("Case marked as fully paid & closed");
      loadCases();
      if (selectedCaseId === caseId) setTab("queue");
    } catch (err: any) {
      toast.error(err.message || "Failed to close case");
    }
  };

  const handleEscalate = async () => {
    if (!selectedCaseId || !escalateReason.trim()) return;
    try {
      await collectionsCaseService.escalateCase(selectedCaseId, escalateReason.trim(), user?.id);
      toast.success("Case escalated");
      setEscalateReason("");
      handleSelectCase(selectedCaseId);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate case");
    }
  };

  const handleWriteOff = async () => {
    if (!selectedCaseId || !writeOffReason.trim()) return;
    try {
      await collectionsCaseService.writeOff(selectedCaseId, writeOffReason.trim(), user?.id);
      toast.success("Case written off and closed");
      setWriteOffReason("");
      setTab("queue");
      setSelectedCaseId(null);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to write off case");
    }
  };

  const handleFulfillPromise = async (promiseId: string) => {
    try {
      await collectionsCaseService.fulfillPromise(promiseId, user?.id);
      toast.success("Promise marked fulfilled");
      if (selectedCaseId) handleSelectCase(selectedCaseId);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to update promise");
    }
  };

  const handleBreachPromise = async (promiseId: string) => {
    try {
      await collectionsCaseService.breachPromise(promiseId, user?.id);
      toast.success("Promise marked broken — case escalated");
      if (selectedCaseId) handleSelectCase(selectedCaseId);
      loadCases();
    } catch (err: any) {
      toast.error(err.message || "Failed to breach promise");
    }
  };

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : tab === "queue" && cases.length === 0
        ? "empty"
        : "ready";

  return (
    <WorkspacePageShell
      title="Collections & arrears cases"
      description="Track overdue accounts, log contact attempts, and manage payment agreements from one place."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "queue" ? "primary" : "outline"}
            onClick={() => setTab("queue")}
            size="sm"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" />
            Cases Queue ({cases.length})
          </Button>
          <Button
            variant={tab === "ptp" ? "primary" : "outline"}
            onClick={() => setTab("ptp")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Promises ({ptpSummary?.totalActive || 0})
          </Button>
        </div>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadCases()}
        emptyTitle="All accounts in good standing"
        emptyDescription="No open collection cases. Overdue accounts will appear here when cases are opened."
        emptyIcon={CheckCircle2}
      >
      {ptpSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-surface border-surface-border">
            <div className="text-xs text-ink-muted">Active Promises</div>
            <div className="text-xl font-bold text-ink mt-1">
              {ptpSummary.totalActive}
            </div>
          </Card>
          <Card className="p-4 bg-surface border-surface-border">
            <div className="text-xs text-ink-muted">Fulfilled Promises</div>
            <div className="text-xl font-bold text-emerald-600 mt-1">
              {ptpSummary.totalFulfilled}
            </div>
          </Card>
          <Card className="p-4 bg-surface border-surface-border">
            <div className="text-xs text-ink-muted">Broken / Missed</div>
            <div className="text-xl font-bold text-rose-600 mt-1">
              {ptpSummary.totalBroken}
            </div>
          </Card>
          <Card className="p-4 bg-surface border-surface-border">
            <div className="text-xs text-ink-muted">Pending Recovery</div>
            <div className="text-xl font-bold text-primary font-mono mt-1">
              {money(ptpSummary.amountPendingMinor, ptpSummary.currency)}
            </div>
          </Card>
        </div>
      )}

      {tab === "queue" && cases.length > 0 && (
        <Card className="p-6 space-y-4">
            <div className="overflow-x-auto border border-surface-border rounded-xl" role="region" aria-label="Collection cases" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Unit / Estate</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Next Follow-Up</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3 font-medium text-ink">
                        {c.unit_label || `Unit ${c.unit_id?.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-ink">
                        {money(c.total_outstanding_minor, c.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            c.status === "promise_active"
                              ? "bg-blue-500/10 text-blue-600 border-none"
                              : c.status === "escalated"
                              ? "bg-amber-500/10 text-amber-600 border-none"
                              : c.status === "payment_plan"
                              ? "bg-violet-500/10 text-violet-600 border-none"
                              : "bg-surface-subtle text-ink-muted border-none"
                          }
                        >
                          {c.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted font-mono">
                        {c.next_follow_up_at
                          ? c.next_follow_up_at.slice(0, 10)
                          : "None"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectCase(c.id)}
                        >
                          View Case
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </Card>
      )}

      {tab === "ptp" && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-ink">Active Promises-to-Pay</h2>
            <p className="text-xs text-ink-muted mt-1">
              Overdue payment promises are automatically flagged and updated each night.
            </p>
          </div>
          {overduePtps.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Overdue ({overduePtps.length})
              </h3>
              {overduePtps.map((ptp) => (
                <div
                  key={ptp.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5"
                >
                  <div>
                    <p className="font-mono font-bold text-ink">
                      {money(ptp.amount_minor, ptp.currency)}
                    </p>
                    <p className="text-xs text-ink-muted">Due {ptp.promised_for}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSelectCase(ptp.collection_case_id)}>
                      Open case
                    </Button>
                    <Button size="sm" onClick={() => void handleBreachPromise(ptp.id)}>
                      Mark broken
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {activePtps.length === 0 ? (
            <p className="text-sm text-ink-muted py-8 text-center">No active promises on file.</p>
          ) : (
            <div className="space-y-3">
              {activePtps.map((ptp) => (
                <div
                  key={ptp.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-surface-border"
                >
                  <div>
                    <p className="font-mono font-bold text-ink">
                      {money(ptp.amount_minor, ptp.currency)}
                    </p>
                    <p className="text-xs text-ink-muted">Promised for {ptp.promised_for}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSelectCase(ptp.collection_case_id)}>
                      Open case
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleFulfillPromise(ptp.id)}>
                      Mark fulfilled
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "detail" && caseDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setTab("queue")}>
                ← Back to queue
              </Button>
            </div>
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-surface-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Collection Case: Unit {caseDetail.case.unit_id?.slice(0, 8)}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Opened on {caseDetail.case.opened_at?.slice(0, 10)}
                  </p>
                </div>
                <Badge>{caseDetail.case.status.toUpperCase()}</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-ink-muted">Total Balance Due</div>
                  <div className="text-lg font-bold text-rose-600 font-mono">
                    {money(
                      caseDetail.case.total_outstanding_minor,
                      caseDetail.case.currency
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">Next Scheduled Action</div>
                  <div className="text-sm font-semibold text-ink font-mono mt-1">
                    {caseDetail.case.next_follow_up_at?.slice(0, 10) || "Immediate"}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClosePaid(caseDetail.case.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Mark Settled
                  </Button>
                </div>
              </div>
            </Card>

            {caseDetail.promises.length > 0 ? (
              <Card className="p-6 space-y-4">
                <h3 className="font-bold text-ink text-sm">Promises on this case</h3>
                <div className="space-y-2">
                  {caseDetail.promises.map((ptp) => (
                    <div
                      key={ptp.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-surface-border text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold">{money(ptp.amount_minor, ptp.currency)}</span>
                        <span className="text-ink-muted ml-2">by {ptp.promised_for}</span>
                      </div>
                      <Badge className="capitalize">{ptp.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-ink text-sm">Action Timeline & Audit</h3>
              <div className="space-y-3">
                {caseDetail.events.length === 0 ? (
                  <p className="text-xs text-ink-muted">No timeline events logged yet.</p>
                ) : (
                  caseDetail.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-surface-subtle/50 rounded-xl border border-surface-border text-xs flex justify-between items-start"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span className="uppercase text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {ev.event_type}
                          </span>
                          {ev.channel && (
                            <span className="text-ink-muted">via {ev.channel}</span>
                          )}
                        </div>
                        {ev.note && <p className="text-ink">{ev.note}</p>}
                      </div>
                      <span className="text-ink-muted font-mono text-[10px] shrink-0">
                        {ev.created_at?.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm">Log Contact Attempt</h3>
              <form onSubmit={handleLogContact} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Channel
                  </label>
                  <NativeSelectControl
                    className="w-full px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-ink text-xs"
                    value={contactChannel}
                    onChange={(e) =>
                      setContactChannel(e.target.value as ContactChannel)
                    }
                  >
                    <option value="phone">Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="in_person">In-Person Visit</option>
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Notes / Outcome
                  </label>
                  <Input
                    required
                    placeholder="e.g. Tenant promised payment by Friday"
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" className="w-full">
                  Save Contact Attempt
                </Button>
              </form>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm">Record Promise-to-Pay</h3>
              <form onSubmit={handleAddPromise} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Promised Amount (GHS) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={promiseAmount}
                    onChange={(e) => setPromiseAmount(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Promised By Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Condition / Notes
                  </label>
                  <Input
                    placeholder="e.g. Salary payout date"
                    value={promiseNotes}
                    onChange={(e) => setPromiseNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="w-full">
                  Record Formal Promise
                </Button>
              </form>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm">Escalate case</h3>
              <Input
                placeholder="Reason for escalation"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="text-xs"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={() => void handleEscalate()}>
                Escalate
              </Button>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm">Write off arrears</h3>
              <Input
                placeholder="Write-off reason (required)"
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                className="text-xs"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={() => void handleWriteOff()}>
                Close as write-off
              </Button>
            </Card>
          </div>
        </div>
      )}
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
