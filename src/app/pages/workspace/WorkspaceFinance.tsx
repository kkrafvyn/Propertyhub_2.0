import { useEffect, useMemo, useState } from "react";
import { Download, FileText, LineChart, RotateCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Database } from "../../../lib/database.types";
import { financeReportService } from "../../../lib/finance-report.service";
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
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rows, wallet, ledger, payouts] = await Promise.all([
        paymentService.getOrganizationPropertyTransactions(organization.id),
        organizationWalletService.getOrganizationWallet(organization.id),
        organizationWalletService.getOrganizationLedger(organization.id),
        organizationWalletService.getOrganizationPayoutRequests(organization.id),
      ]);
      setPayments(rows || []);
      setOrgWallet(wallet);
      setOrgLedger(ledger || []);
      setOrgPayouts(payouts || []);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Finance Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Reconciliation summaries, refund analytics, and export-ready payment reporting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => financeReportService.exportPaymentsCsv(payments)}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => financeReportService.openPrintableReport(summary, payments)}
          >
            <FileText className="w-4 h-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-semibold mt-1">{summary.formatted.totalCollected}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net Collected</p>
          <p className="text-2xl font-semibold mt-1">{summary.formatted.netCollected}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Refunded</p>
          <p className="text-2xl font-semibold mt-1">{summary.formatted.totalRefunded}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending / Attention</p>
          <p className="text-2xl font-semibold mt-1">{attentionPayments.length}</p>
        </Card>
      </div>

      {canSeeManagerMetrics && (
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Organization Wallet</h2>
            </div>
            <p className="text-3xl font-semibold">
              {formatMoney(orgWallet?.available_minor || 0, orgWallet?.currency || "GHS")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Available balance after platform fees and escrow releases.
            </p>
            <div className="mt-6 space-y-3">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount (GHS)"
                value={payoutAmount}
                onChange={(event) => setPayoutAmount(event.target.value)}
              />
              <Input
                placeholder="Mobile money or bank destination"
                value={payoutDestination}
                onChange={(event) => setPayoutDestination(event.target.value)}
              />
              <Button onClick={() => void handleRequestPayout()} disabled={submittingPayout}>
                {submittingPayout ? "Submitting..." : "Request Payout"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Payout Queue</h2>
            {orgPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payout requests yet.</p>
            ) : (
              <div className="space-y-3">
                {orgPayouts.slice(0, 6).map((payout) => (
                  <div key={payout.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {formatMoney(payout.amount_minor, payout.currency || "GHS")}
                        </p>
                        <p className="text-sm text-muted-foreground">{payout.payout_destination}</p>
                      </div>
                      <Badge>{formatLabel(payout.status)}</Badge>
                    </div>
                    {["pending", "approved"].includes(payout.status) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {payout.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleProcessPayout(payout.id, "approve")}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => void handleProcessPayout(payout.id, "mark_paid")}
                        >
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleProcessPayout(payout.id, "reject")}
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
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Ledger</h2>
          <div className="space-y-2">
            {orgLedger.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{entry.description || formatLabel(entry.entry_type)}</span>
                <span>{formatMoney(entry.amount_minor, orgWallet?.currency || "GHS")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Purpose Breakdown</h2>
          </div>
          {purposeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No successful payments yet.</p>
          ) : (
            <div className="space-y-3">
              {purposeEntries.map(([purpose, amountMinor]) => (
                <div
                  key={purpose}
                  className="flex items-center justify-between rounded-lg bg-secondary/20 p-3"
                >
                  <div>
                    <p className="font-medium">{formatLabel(purpose)}</p>
                    <p className="text-sm text-muted-foreground">
                      Based on successful transaction value
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(Number(amountMinor || 0))}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Refund Analytics</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Refund Rate</p>
              <p className="mt-2 text-2xl font-semibold">{Math.round(summary.refundRate * 100)}%</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Successful Transactions</p>
              <p className="mt-2 text-2xl font-semibold">{summary.successfulTransactions}</p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Manager-level view: {canSeeManagerMetrics ? "enabled" : "limited"}
          </p>
          {canSeeManagerMetrics && (
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Total transactions: {summary.totalTransactions}</p>
              <p>Pending transactions: {summary.pendingTransactions}</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Latest Finance Activity</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading finance activity...</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No payment activity to report yet.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.slice(0, 10).map((payment) => {
              const latestRefund = Array.isArray(payment.refunds) ? payment.refunds[0] : null;

              return (
                <div key={payment.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{payment.provider_reference}</h3>
                        <Badge>{formatLabel(payment.status)}</Badge>
                        {latestRefund && (
                          <Badge variant="outline">
                            Refund {formatLabel(latestRefund.status)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {payment.payer?.full_name || payment.payer?.email || "Customer"} -{" "}
                        {formatLabel(payment.purpose)}
                      </p>
                      <p className="text-sm mt-2">
                        {payment.listing?.property?.address || "Property transaction"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatMoney(payment.amount_minor, payment.currency || "GHS")}
                      </p>
                      {latestRefund && (
                        <p className="text-sm text-muted-foreground mt-1">
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
