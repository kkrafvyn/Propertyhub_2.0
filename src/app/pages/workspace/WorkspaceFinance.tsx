import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  LineChart,
  RotateCcw,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Banknote,
  Send,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import type { Database } from "../../../lib/database.types";
import { financeReportService } from "../../../lib/finance-report.service";
import { commissionService } from "../../../lib/commission.service";
import { organizationWalletService } from "../../../lib/organization-wallet.service";
import { paymentService } from "../../../lib/payment.service";
import { useAuth } from "../../context/AuthContext";
import type { MemberRole } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceFinanceProps {
  organization: Organization;
  currentRole: MemberRole | null;
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(amountMinor = 0, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function WorkspaceFinance({
  organization,
  currentRole,
}: WorkspaceFinanceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [orgWallet, setOrgWallet] = useState<any>(null);
  const [orgLedger, setOrgLedger] = useState<any[]>([]);
  const [orgPayouts, setOrgPayouts] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rows, wallet, ledger, payouts, commissionRows] = await Promise.all([
        paymentService.getOrganizationPropertyTransactions(organization.id),
        organizationWalletService.getOrganizationWallet(organization.id),
        organizationWalletService.getOrganizationLedger(organization.id),
        organizationWalletService.getOrganizationPayoutRequests(organization.id),
        commissionService.getOrganizationCommissions(organization.id),
      ]);
      setPayments(rows || []);
      setOrgWallet(wallet);
      setOrgLedger(ledger || []);
      setOrgPayouts(payouts || []);
      setCommissions(commissionRows || []);
    } catch (error) {
      console.error("Failed to load finance workspace:", error);
      toast.error("We couldn't load finance reporting right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const summary = useMemo(() => financeReportService.summarize(payments), [payments]);
  const purposeEntries = useMemo(
    () =>
      Object.entries(summary.purposeBreakdown).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 6),
    [summary.purposeBreakdown]
  );
  const attentionPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const latestRefund = Array.isArray(payment.refunds) ? payment.refunds[0] : null;
        return (
          ["pending", "processing", "reversal_pending"].includes(payment.status) ||
          ["failed", "needs_attention"].includes(latestRefund?.status)
        );
      }),
    [payments]
  );

  const canSeeManagerMetrics = currentRole === "owner" || currentRole === "manager";
  const trustAvailableMinor = orgWallet?.available_minor || 0;
  const trustPendingMinor = orgWallet?.pending_minor || 0;
  const payoutQueueOpen = orgPayouts.filter((payout) => ["pending", "approved"].includes(payout.status)).length;

  const handleRequestPayout = async () => {
    if (!user) return;
    const amountMinor = Math.round(Number.parseFloat(payoutAmount || "0") * 100);
    if (!amountMinor || !payoutDestination.trim()) {
      toast.error("Enter a valid amount and payout destination.");
      return;
    }

    try {
      setSubmittingPayout(true);
      await organizationWalletService.requestOrganizationPayout({
        organizationId: organization.id,
        requestedByUserId: user.id,
        amountMinor,
        payoutDestination: payoutDestination.trim(),
      });
      toast.success("Payout request submitted.");
      setPayoutAmount("");
      setPayoutDestination("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to request payout.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleProcessPayout = async (
    requestId: string,
    action: "approve" | "mark_paid" | "reject"
  ) => {
    try {
      await organizationWalletService.processOrganizationPayoutRequest(requestId, action);
      toast.success(`Payout ${action.replace("_", " ")}.`);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update payout request.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-500/15 via-primary/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-radial from-amber-500/10 via-transparent to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" dot pulse className="text-xs font-semibold px-2.5 py-1">
                Trust Accounting & Treasury
              </Badge>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Multi-Currency Escrow & PayAngels Clearing
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-tight text-ink">
              Financial Operations & Treasury
            </h1>
            <p className="text-sm text-ink-secondary max-w-xl leading-relaxed">
              Trust reconciliation, owner payout disbursement queues, broker commission reporting, and export-ready ledger statements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="glass" size="sm" className="gap-1.5 text-xs shadow-sm" onClick={() => financeReportService.exportPaymentsCsv(payments)}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              variant="glass"
              size="sm"
              className="gap-1.5 text-xs shadow-sm"
              onClick={() => financeReportService.openPrintableReport(summary, payments)}
            >
              <FileText className="w-3.5 h-3.5" />
              Print / PDF
            </Button>
            <Button variant="gradient" size="sm" className="gap-1.5 text-xs shadow-sm" onClick={() => void loadData()}>
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Ledger
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip with Halo Illumination ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Collected"
          value={summary.formatted.totalCollected}
          subtitle="Gross volume recorded"
          icon={TrendingUp}
          iconColor="primary"
          glow="primary"
        />
        <MetricCard
          title="Net Collected"
          value={summary.formatted.netCollected}
          subtitle="Net after refunds & fees"
          icon={Banknote}
          iconColor="emerald"
          glow="emerald"
        />
        <MetricCard
          title="Total Refunded"
          value={summary.formatted.totalRefunded}
          subtitle={`${Math.round(summary.refundRate * 100)}% refund rate`}
          icon={RotateCcw}
          iconColor="purple"
          glow="purple"
        />
        <MetricCard
          title="Pending / Attention"
          value={String(attentionPayments.length)}
          subtitle="Requires staff action"
          icon={AlertCircle}
          iconColor="amber"
          glow="amber"
          trend={attentionPayments.length > 0 ? { value: "Review required", isPositive: false } : undefined}
        />
      </div>

      {canSeeManagerMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Available Trust Balance"
            value={formatMoney(trustAvailableMinor, orgWallet?.currency || "GHS")}
            subtitle="Ready for owner/operating payouts"
            icon={Wallet}
            iconColor="emerald"
            glow="emerald"
          />
          <MetricCard
            title="Held in Reserve"
            value={formatMoney(trustPendingMinor, orgWallet?.currency || "GHS")}
            subtitle="Pending escrow release & clearance"
            icon={CreditCard}
            iconColor="indigo"
            glow="indigo"
          />
          <MetricCard
            title="Payout Queue"
            value={String(payoutQueueOpen)}
            subtitle="Requests awaiting disbursement"
            icon={ArrowUpRight}
            iconColor="amber"
            glow="amber"
            trend={payoutQueueOpen > 0 ? { value: `${payoutQueueOpen} pending`, isPositive: false } : undefined}
          />
        </div>
      ) : null}

      {canSeeManagerMetrics ? (
        <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <LineChart className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Commission Distribution</h2>
              <p className="text-xs text-ink-secondary">Agent broker commissions earned on lease and sale completions.</p>
            </div>
          </div>
          {commissions.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-secondary bg-surface-subtle/40 rounded-xl border border-surface-border">
              No commission disbursements recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {commissions.slice(0, 8).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-surface-border/60 hover:border-primary/30 transition-all text-sm">
                  <div>
                    <p className="font-semibold text-ink text-sm">{commission.agentName}</p>
                    <p className="text-xs text-ink-secondary capitalize mt-0.5">{commission.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink text-sm">
                      {formatMoney(Math.round(commission.amount * 100), commission.currency)}
                    </p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {new Date(commission.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {canSeeManagerMetrics && (
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Wallet className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Trust Account & Payout Requests</h2>
                <p className="text-xs text-ink-secondary">Operating withdrawals and owner remittance requests.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-surface-border bg-surface-subtle/50 p-4">
                <p className="text-xs font-semibold text-ink-secondary">Available Trust Balance</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(trustAvailableMinor, orgWallet?.currency || "GHS")}</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-subtle/50 p-4">
                <p className="text-xs font-semibold text-ink-secondary">Held in Reserve</p>
                <p className="mt-1 text-2xl font-bold text-ink">{formatMoney(trustPendingMinor, orgWallet?.currency || "GHS")}</p>
              </div>
            </div>
            <p className="text-xs text-ink-secondary mt-3 leading-relaxed">
              Use this queue for human-approved owner payouts and operating withdrawals. Clearances undergo automated PayAngels compliance auditing.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider mb-1 block">Payout Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount (e.g. 5000.00 GHS)"
                  value={payoutAmount}
                  onChange={(event) => setPayoutAmount(event.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider mb-1 block">Destination</label>
                <Input
                  placeholder="Mobile money number or bank account"
                  value={payoutDestination}
                  onChange={(event) => setPayoutDestination(event.target.value)}
                />
              </div>
              <Button variant="gradient" onClick={() => void handleRequestPayout()} disabled={submittingPayout} className="w-full gap-2">
                <Send className="w-3.5 h-3.5" />
                {submittingPayout ? "Submitting Request..." : "Request Payout Disbursement"}
              </Button>
            </div>
          </Card>

          <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">Payout Queue</h2>
                  <p className="text-xs text-ink-secondary">Disbursement approvals awaiting manager signoff.</p>
                </div>
              </div>
              <Badge variant={payoutQueueOpen > 0 ? "warning" : "outline"} className="text-xs">
                {payoutQueueOpen} open
              </Badge>
            </div>
            {orgPayouts.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-secondary bg-surface-subtle/40 rounded-xl border border-surface-border">
                No pending payout requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {orgPayouts.slice(0, 6).map((payout) => (
                  <div key={payout.id} className="rounded-xl border border-surface-border bg-surface/70 p-4 hover:border-amber-500/30 transition-all shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink text-base">
                          {formatMoney(payout.amount_minor, payout.currency || "GHS")}
                        </p>
                        <p className="text-xs text-ink-secondary mt-0.5">{payout.payout_destination}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          Requested {new Date(payout.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={payout.status === "paid" ? "success" : payout.status === "approved" ? "info" : "warning"}>
                        {formatLabel(payout.status)}
                      </Badge>
                    </div>
                    {["pending", "approved"].includes(payout.status) && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-border/60">
                        {payout.status === "pending" && (
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => void handleProcessPayout(payout.id, "approve")}
                            className="text-xs gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => void handleProcessPayout(payout.id, "mark_paid")}
                          className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CreditCard className="w-3 h-3" />
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={() => void handleProcessPayout(payout.id, "reject")}
                          className="text-xs text-red-500 hover:bg-red-500/10"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {canSeeManagerMetrics && orgLedger.length > 0 && (
        <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Banknote className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Treasury Wallet Ledger</h2>
              <p className="text-xs text-ink-secondary">Immutable audit trail of credit allocations, fee deductions, and payouts.</p>
            </div>
          </div>
          <div className="space-y-1 divide-y divide-surface-border/50">
            {orgLedger.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm py-2.5">
                <span className="font-medium text-ink text-xs">{entry.description || formatLabel(entry.entry_type)}</span>
                <span className="font-bold text-ink text-xs">{formatMoney(entry.amount_minor, orgWallet?.currency || "GHS")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
        <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <LineChart className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Purpose Breakdown</h2>
              <p className="text-xs text-ink-secondary">Revenue categorized by rental deposit, rent collection, and booking fees.</p>
            </div>
          </div>
          {purposeEntries.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-secondary bg-surface-subtle/40 rounded-xl border border-surface-border">
              No settled transaction volume recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {purposeEntries.map(([purpose, amountMinor]) => (
                <div
                  key={purpose}
                  className="flex items-center justify-between rounded-xl bg-surface/60 border border-surface-border/60 p-3 hover:border-primary/30 transition-all"
                >
                  <div>
                    <p className="font-semibold text-ink text-xs">{formatLabel(purpose)}</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5">
                      Based on successful settlement value
                    </p>
                  </div>
                  <p className="font-bold text-ink text-sm">{formatMoney(Number(amountMinor || 0))}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Refund & Dispute Health</h2>
              <p className="text-xs text-ink-secondary">Reversal rates, escrow claims, and transaction success velocity.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-4 rounded-xl border border-surface-border bg-surface/60">
              <p className="text-xs font-semibold text-ink-secondary">Refund Rate</p>
              <p className="mt-1 text-2xl font-bold text-ink">{Math.round(summary.refundRate * 100)}%</p>
            </div>
            <div className="p-4 rounded-xl border border-surface-border bg-surface/60">
              <p className="text-xs font-semibold text-ink-secondary">Successful Transactions</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.successfulTransactions}</p>
            </div>
          </div>
          <p className="text-[11px] text-ink-secondary mt-4">
            Manager governance mode: <span className="font-semibold text-ink">{canSeeManagerMetrics ? "Full clearance enabled" : "Restricted view"}</span>
          </p>
          {canSeeManagerMetrics && (
            <div className="mt-3 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs text-ink-secondary">
              <span>Total Transactions: <strong className="text-ink">{summary.totalTransactions}</strong></span>
              <span>Pending Clearance: <strong className="text-amber-500">{summary.pendingTransactions}</strong></span>
            </div>
          )}
        </Card>
      </div>

      {/* ── Latest Activity ── */}
      <Card variant="glass" className="p-6 border border-surface-border/80 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Wallet className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink">Latest Financial Activity</h2>
            <p className="text-xs text-ink-secondary">Recent card, mobile money, and escrow transactions across your properties.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-ink-secondary">Loading financial activity...</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-xs text-ink-secondary bg-surface-subtle/40 rounded-xl border border-surface-border">
            No payment activity recorded yet. Transactions will appear here as soon as orders or leases are initiated.
          </div>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 10).map((payment) => {
              const latestRefund = Array.isArray(payment.refunds) ? payment.refunds[0] : null;

              return (
                <div key={payment.id} className="rounded-2xl border border-surface-border/80 bg-surface/70 hover:border-primary/40 transition-all p-4 shadow-xs">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-ink">{payment.provider_reference}</span>
                        <Badge variant={payment.status === "succeeded" ? "success" : payment.status === "failed" ? "destructive" : "warning"} className="text-[11px]">
                          {formatLabel(payment.status)}
                        </Badge>
                        {latestRefund && (
                          <Badge variant="outline" className="text-[11px]">
                            Refund {formatLabel(latestRefund.status)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        <span className="font-medium text-ink">{payment.payer?.full_name || payment.payer?.email || "Customer"}</span> &bull;{" "}
                        {formatLabel(payment.purpose)}
                      </p>
                      <p className="text-xs text-ink-muted mt-1">
                        {payment.listing?.property?.address || "Property transaction"}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-bold text-ink text-sm">
                        {formatMoney(payment.amount_minor, payment.currency || "GHS")}
                      </p>
                      {latestRefund && (
                        <p className="text-xs text-red-500 mt-0.5">
                          Refunded {formatMoney(latestRefund.amount_minor, latestRefund.currency || payment.currency || "GHS")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
