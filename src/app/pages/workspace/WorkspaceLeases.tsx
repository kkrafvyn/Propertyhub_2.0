import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { leaseService } from "../../../lib/lease.service";
import { leaseWorkflowService } from "../../../lib/lease-workflow.service";
import { tenantNoticeService } from "../../../lib/tenant-notice.service";
import { walletService } from "../../../lib/wallet.service";
import { moveChecklistService } from "../../../lib/move-checklist.service";
import { leaseDepositService } from "../../../lib/lease-deposit.service";
import { dealCaseService } from "../../../lib/dealcase.service";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { PropertyLeaseClausePanel } from "../../components/compliance/PropertyLeaseClausePanel";
import { useAuth } from "../../context/AuthContext";
import { leaseEsignatureService } from "../../../lib/lease-esignature.service";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function WorkspaceLeases({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeLeaseId, setNoticeLeaseId] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeType, setNoticeType] = useState("general");
  const [moveLeaseId, setMoveLeaseId] = useState("");
  const [moveItems, setMoveItems] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositValues, setDepositValues] = useState<Record<string, { amount: string; deductions: string; refunded: string; reason: string }>>({});
  const [applications, setApplications] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [screeningCaseId, setScreeningCaseId] = useState("");
  const [screeningProvider, setScreeningProvider] = useState<"manual_review" | "provider_pending_setup">("manual_review");
  const [clauseLeaseId, setClauseLeaseId] = useState("");

  const loadLeases = async () => {
    try {
      setLoading(true);
      const [rows, noticeRows, dealCases, screeningRows] = await Promise.all([
        leaseService.getOrganizationLeases(organizationId),
        tenantNoticeService.getOrganizationNotices(organizationId),
        dealCaseService.getDealCasesByOrganization(organizationId),
        leaseScreeningService.listForOrganization(organizationId),
      ]);
      setLeases(rows || []);
      setNotices(noticeRows || []);
      setApplications((dealCases || []).filter((dealCase: any) => ["rental_application", "lease_application"].includes(dealCase.case_type)));
      setScreenings(screeningRows || []);
      const depositRows = await leaseDepositService.getByLeaseIds((rows || []).map((lease) => lease.id));
      setDeposits(depositRows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load leases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeases();
  }, [organizationId]);

  const screeningSubmitted = screenings.filter((screening) => ["submitted", "manual_review"].includes(screening.status)).length;
  const screeningCompleted = screenings.filter((screening) => screening.status === "completed").length;
  const renewalsPending = leases.filter((lease) => lease.renewal_status === "requested").length;
  const readyForSigning = leases.filter((lease) => lease.status === "approved" && lease.signed_at == null).length;

  const respondRenewal = async (leaseId: string, status: "approved" | "declined") => {
    try {
      setBusyId(`${leaseId}-${status}`);
      await leaseWorkflowService.respondToRenewal(leaseId, status);
      toast.success(`Renewal ${status}.`);
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update renewal.");
    } finally {
      setBusyId(null);
    }
  };

  const startScreening = async () => {
    const application = applications.find((entry) => entry.id === screeningCaseId) || applications[0];
    if (!application) {
      toast.error("There are no rental applications ready for screening.");
      return;
    }
    try {
      setBusyId("start-screening");
      await leaseScreeningService.start({ dealCaseId: application.id, provider: screeningProvider });
      toast.success(screeningProvider === "manual_review" ? "Application added to manual review." : "Screening request recorded.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to start the screening workflow.");
    } finally {
      setBusyId(null);
    }
  };

  const recordScreeningResult = async (screening: any, recommendation: "clear" | "review" | "decline") => {
    if (!user) return;
    try {
      setBusyId(`screening-${screening.id}-${recommendation}`);
      await leaseScreeningService.recordResult({
        screeningId: screening.id,
        status: recommendation === "review" ? "manual_review" : "completed",
        recommendation,
        reviewedBy: user.id,
        resultSummary: recommendation === "clear" ? "Reviewed and clear to proceed." : recommendation === "decline" ? "Reviewed and not recommended to proceed." : "Needs a human follow-up before a decision.",
      });
      toast.success("Screening decision saved.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save the screening decision.");
    } finally {
      setBusyId(null);
    }
  };

  const prepareRentSchedule = async (lease: any) => {
    try {
      setBusyId(`schedule-${lease.id}`);
      await leaseWorkflowService.ensureRentSchedule(lease);
      toast.success("Rent schedule is ready.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to prepare the rent schedule.");
    } finally { setBusyId(null); }
  };

  const requestRenewal = async (leaseId: string) => {
    try {
      setBusyId(`renew-${leaseId}`);
      await leaseWorkflowService.requestRenewal(leaseId);
      toast.success("Renewal request sent.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to request renewal.");
    } finally { setBusyId(null); }
  };

  const sendForEsignature = async (lease: any, forceOverride = false) => {
    if (!user) return;
    try {
      setBusyId(`esign-${lease.id}`);
      const request = await leaseEsignatureService.sendLeaseForSigning({
        organizationId,
        lease,
        requestedBy: user.id,
        forceOverride,
      });
      toast.success(`Lease sent for signature.${request.signing_url ? " Signing link ready." : ""}`);
    } catch (error: any) {
      console.error(error);
      if (error?.name === "LeaseAuditBlockedError" && window.confirm(
        `${error.message}\n\nSend anyway with manager override?`
      )) {
        await sendForEsignature(lease, true);
        return;
      }
      if (error?.name === "CounselSignoffRequiredError" && window.confirm(
        `${error.message}\n\nRecord counsel sign-off in International Markets, or send with manager override?`
      )) {
        await sendForEsignature(lease, true);
        return;
      }
      toast.error(error?.message || "Unable to send lease for e-signature.");
    } finally {
      setBusyId(null);
    }
  };

  const signLease = async (lease: any) => {
    if (!user) return;
    try {
      setBusyId(`sign-${lease.id}`);
      await leaseWorkflowService.signLeaseDocument({ leaseId: lease.id, userId: user.id, signerName: user.user_metadata?.full_name || user.email || "Authorized signer", signerEmail: user.email });
      toast.success("Lease signed and recorded.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to sign this lease.");
    } finally { setBusyId(null); }
  };

  const loadMoveChecklist = async (leaseId: string) => {
    if (!leaseId) return;
    try {
      setBusyId(`checklist-${leaseId}`);
      await moveChecklistService.ensureChecklists(leaseId);
      setMoveLeaseId(leaseId);
      setMoveItems(await moveChecklistService.getChecklists(leaseId));
    } catch (error) {
      console.error(error);
      toast.error("Unable to prepare move checklist.");
    } finally { setBusyId(null); }
  };

  const toggleMoveItem = async (item: any) => {
    if (!user) return;
    try {
      setBusyId(`move-${item.id}`);
      await moveChecklistService.toggleItem(item.id, user.id, !item.completed);
      setMoveItems(await moveChecklistService.getChecklists(moveLeaseId));
    } catch (error) {
      console.error(error);
      toast.error("Unable to update checklist item.");
    } finally { setBusyId(null); }
  };

  const saveDeposit = async (lease: any) => {
    if (!user) return;
    const value = depositValues[lease.id] || { amount: "", deductions: "0", refunded: "0", reason: "" };
    const amountMinor = Math.round(Number(value.amount) * 100);
    const deductionsMinor = Math.round(Number(value.deductions || 0) * 100);
    const refundedMinor = Math.round(Number(value.refunded || 0) * 100);
    if (!amountMinor || deductionsMinor + refundedMinor > amountMinor) { toast.error("Enter a deposit amount; deductions and refunds cannot exceed it."); return; }
    try { setBusyId(`deposit-${lease.id}`); await leaseDepositService.upsert({ leaseId: lease.id, amountMinor, deductionsMinor, refundedMinor, currency: lease.currency || "GHS", reason: value.reason, recordedBy: user.id }); toast.success("Deposit record saved."); await loadLeases(); } catch (error) { console.error(error); toast.error("Unable to save deposit."); } finally { setBusyId(null); }
  };

  const sendNotice = async () => {
    const lease = leases.find((entry) => entry.id === noticeLeaseId) || leases[0];
    if (!lease?.tenant_user_id || !user?.id) {
      toast.error("Select a lease with an assigned tenant.");
      return;
    }
    if (!noticeTitle.trim() || !noticeBody.trim()) {
      toast.error("Add a title and message.");
      return;
    }

    try {
      setSendingNotice(true);
      await tenantNoticeService.sendNotice({
        organizationId,
        tenantUserId: lease.tenant_user_id,
        leaseId: lease.id,
        createdBy: user.id,
        noticeType,
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
      });
      toast.success("Notice sent to tenant.");
      setNoticeTitle("");
      setNoticeBody("");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to send notice.");
    } finally {
      setSendingNotice(false);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading leases...</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Applications</p>
          <p className="mt-1 text-2xl font-semibold">{applications.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Screening in progress</p>
          <p className="mt-1 text-2xl font-semibold">{screeningSubmitted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Awaiting signatures</p>
          <p className="mt-1 text-2xl font-semibold">{readyForSigning}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Renewals pending</p>
          <p className="mt-1 text-2xl font-semibold">{renewalsPending}</p>
        </Card>
      </div>
      <div>
        <h1 className="text-3xl font-semibold mb-2">Leases</h1>
        <p className="text-muted-foreground">Active tenancies, renewals, rent schedules, and tenant notices.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Jurisdiction lease schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate mandatory clauses and audit drafts against property-specific rent and deposit caps.
          </p>
        </div>
        {leases.length > 0 ? (
          <>
            <select
              className="w-full rounded-lg border border-border px-3 py-2"
              value={clauseLeaseId || leases[0]?.id || ""}
              onChange={(event) => setClauseLeaseId(event.target.value)}
            >
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.listing?.property?.address || "Property"} —{" "}
                  {lease.tenant?.full_name || lease.tenant?.email || "Tenant"}
                </option>
              ))}
            </select>
            {(() => {
              const lease =
                leases.find((entry) => entry.id === (clauseLeaseId || leases[0]?.id)) || leases[0];
              const property = lease?.listing?.property;
              return (
                <PropertyLeaseClausePanel
                  property={property}
                  landlordName={lease?.landlord?.full_name || undefined}
                  tenantName={lease?.tenant?.full_name || lease?.tenant?.email || undefined}
                  rentAmountMajor={lease?.rent_minor ? lease.rent_minor / 100 : undefined}
                  currency={lease?.currency || property?.currency || "GHS"}
                />
              );
            })()}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Active leases will appear here for schedule generation.</p>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Application screening</h2>
          <p className="mt-1 text-sm text-muted-foreground">Keep the application, the result, and the next decision together. Provider checks are only sent once a provider connection is configured; manual review stays inside BaytMiftah.</p>
        </div>
        {applications.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
            <select className="rounded-lg border border-border px-3 py-2" value={screeningCaseId || applications[0]?.id || ""} onChange={(event) => setScreeningCaseId(event.target.value)}>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.user?.full_name || application.user?.email || "Applicant"} — {application.listing?.property?.address || "Rental application"}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-border px-3 py-2" value={screeningProvider} onChange={(event) => setScreeningProvider(event.target.value as "manual_review" | "provider_pending_setup")}>
              <option value="manual_review">Manual review</option>
              <option value="provider_pending_setup">Connected provider (setup required)</option>
            </select>
            <Button onClick={() => void startScreening()} disabled={busyId === "start-screening"}>{busyId === "start-screening" ? "Starting..." : "Start review"}</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">New rental and lease applications will appear here as soon as they are submitted.</p>}
        {screenings.length > 0 ? (
          <div className="space-y-2">
            {screenings.slice(0, 6).map((screening) => {
              const application = applications.find((entry) => entry.id === screening.deal_case_id);
              return <div key={screening.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{application?.user?.full_name || application?.user?.email || "Applicant"}</p>
                  <p className="text-sm text-muted-foreground">{application?.listing?.property?.address || "Rental application"} · {screening.provider === "manual_review" ? "Manual review" : "Provider workflow"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{screening.recommendation || screening.status.replace("_", " ")}</Badge>
                  {!["clear", "decline"].includes(screening.recommendation || "") ? <>
                    <Button size="sm" variant="outline" onClick={() => void recordScreeningResult(screening, "review")} disabled={busyId?.startsWith(`screening-${screening.id}`)}>Needs follow-up</Button>
                    <Button size="sm" onClick={() => void recordScreeningResult(screening, "clear")} disabled={busyId?.startsWith(`screening-${screening.id}`)}>Clear to proceed</Button>
                    <Button size="sm" variant="outline" onClick={() => void recordScreeningResult(screening, "decline")} disabled={busyId?.startsWith(`screening-${screening.id}`)}>Do not proceed</Button>
                  </> : null}
                </div>
              </div>;
            })}
          </div>
        ) : null}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Send tenant notice</h2>
        {leases.length > 0 ? (
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={noticeLeaseId || leases[0]?.id || ""}
            onChange={(event) => setNoticeLeaseId(event.target.value)}
          >
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant?.full_name || lease.tenant?.email || "Tenant"} —{" "}
                {lease.listing?.property?.address || lease.id}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="w-full rounded-lg border border-border px-3 py-2"
          value={noticeType}
          onChange={(event) => setNoticeType(event.target.value)}
        >
          <option value="general">General</option>
          <option value="rent_increase">Rent increase</option>
          <option value="lease_renewal">Lease renewal</option>
          <option value="termination">Termination</option>
          <option value="inspection">Inspection</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <Input
          value={noticeTitle}
          onChange={(event) => setNoticeTitle(event.target.value)}
          placeholder="Notice title"
        />
        <textarea
          className="w-full min-h-24 rounded-lg border border-border px-3 py-2"
          value={noticeBody}
          onChange={(event) => setNoticeBody(event.target.value)}
          placeholder="Notice message"
        />
        <Button onClick={() => void sendNotice()} disabled={sendingNotice || leases.length === 0}>
          {sendingNotice ? "Sending..." : "Send notice"}
        </Button>
      </Card>

      {notices.length > 0 ? (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Recent notices</h2>
          {notices.slice(0, 8).map((notice) => (
            <div key={notice.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notice.title}</p>
                  <p className="text-sm text-muted-foreground">{notice.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notice.tenant?.full_name || notice.tenant?.email} ·{" "}
                    {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {notice.status}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Move-in / move-out handover</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track keys, condition checks, utilities, damage review and deposit-release readiness against the lease.</p>
        </div>
        {leases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {leases.map((lease) => (
              <Button key={lease.id} size="sm" variant={moveLeaseId === lease.id ? "default" : "outline"} onClick={() => void loadMoveChecklist(lease.id)} disabled={busyId === `checklist-${lease.id}`}>
                {lease.listing?.property?.address || "Lease"}
              </Button>
            ))}
          </div>
        ) : null}
        {moveItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(["move_in", "move_out"] as const).map((type) => (
              <div key={type} className="rounded-xl border border-border p-4">
                <h3 className="font-medium capitalize">{type.replace("_", " ")} checklist</h3>
                <div className="mt-3 space-y-2">
                  {moveItems.filter((item) => item.checklist_type === type).map((item) => (
                    <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left" onClick={() => void toggleMoveItem(item)} disabled={busyId === `move-${item.id}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${item.completed ? "bg-primary text-primary-foreground" : ""}`}>
                        {item.completed ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : leases.length > 0 ? <p className="text-sm text-muted-foreground">Choose a lease to prepare its handover checklist.</p> : null}
      </Card>

      {leases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No leases yet.</Card>
      ) : (
        leases.map((lease) => (
          <Card key={lease.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  {lease.listing?.property?.address || "Lease property"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lease.tenant?.full_name || lease.tenant?.email} · Started {lease.start_date}
                </p>
              </div>
              <div className="text-right space-y-2">
                <Badge className="capitalize">{lease.status}</Badge>
                {lease.renewal_status === "requested" ? (
                  <Badge variant="outline">Renewal requested</Badge>
                ) : null}
                <p className="font-semibold">{formatMoney(lease.rent_minor, lease.currency)}</p>
              </div>
            </div>
            {lease.renewal_status === "requested" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void respondRenewal(lease.id, "approved")}
                  disabled={busyId === `${lease.id}-approved`}
                >
                  Approve renewal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void respondRenewal(lease.id, "declined")}
                  disabled={busyId === `${lease.id}-declined`}
                >
                  Decline
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button size="sm" variant="outline" onClick={() => void sendForEsignature(lease)} disabled={busyId === `esign-${lease.id}` || !lease.tenant?.email}>
                {busyId === `esign-${lease.id}` ? "Sending..." : "Send for e-signature"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void prepareRentSchedule(lease)} disabled={busyId === `schedule-${lease.id}`}>
                {busyId === `schedule-${lease.id}` ? "Preparing..." : "Prepare rent schedule"}
              </Button>
              {lease.signing_status !== "signed" ? (
                <Button size="sm" variant="outline" onClick={() => void signLease(lease)} disabled={busyId === `sign-${lease.id}`}>
                  {busyId === `sign-${lease.id}` ? "Signing..." : "Record e-signature"}
                </Button>
              ) : <Badge variant="outline">E-signed</Badge>}
              {!lease.renewal_status || lease.renewal_status === "declined" ? (
                <Button size="sm" variant="outline" onClick={() => void requestRenewal(lease.id)} disabled={busyId === `renew-${lease.id}`}>
                  {busyId === `renew-${lease.id}` ? "Requesting..." : "Request renewal"}
                </Button>
              ) : null}
            </div>
            <div className="rounded-xl border border-border p-4">
              <h4 className="font-medium">Deposit management</h4>
              <p className="mt-1 text-xs text-muted-foreground">Record held deposit, approved deductions, evidence reason, and refund progress separately from rent.</p>
              {(() => { const existing = deposits.find((deposit) => deposit.lease_id === lease.id); const value = depositValues[lease.id] || { amount: existing ? String(existing.amount_minor / 100) : "", deductions: existing ? String(existing.deductions_minor / 100) : "0", refunded: existing ? String(existing.refunded_minor / 100) : "0", reason: existing?.deduction_reason || "" }; return <div className="mt-3 grid gap-2 md:grid-cols-5"><Input placeholder="Held deposit" value={value.amount} onChange={(event) => setDepositValues((current) => ({ ...current, [lease.id]: { ...value, amount: event.target.value } }))} /><Input placeholder="Deductions" value={value.deductions} onChange={(event) => setDepositValues((current) => ({ ...current, [lease.id]: { ...value, deductions: event.target.value } }))} /><Input placeholder="Refunded" value={value.refunded} onChange={(event) => setDepositValues((current) => ({ ...current, [lease.id]: { ...value, refunded: event.target.value } }))} /><Input placeholder="Deduction reason / evidence" value={value.reason} onChange={(event) => setDepositValues((current) => ({ ...current, [lease.id]: { ...value, reason: event.target.value } }))} /><Button size="sm" variant="outline" onClick={() => void saveDeposit(lease)} disabled={busyId === `deposit-${lease.id}`}>Save deposit</Button></div>; })()}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
