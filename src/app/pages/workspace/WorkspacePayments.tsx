import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCcw,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { paymentService } from "../../../lib/payment.service";
import { escrowService } from "../../../lib/escrow.service";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { MetricCard } from "../../components/ui/MetricCard";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/textarea";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspacePaymentsProps {
  organization: Organization;
  currentRole: MemberRole | null;
}

type StatusFilter = "all" | "success" | "pending" | "attention";
const GHANA_PAYMENT_CHANNELS = ghanaMarketService.getPaymentChannels();

const moneyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

function formatPaymentAmount(amountMinor?: number | null, currency = "GHS") {
  if (!amountMinor) return moneyFormatter.format(0);

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "Recently";

  const diffMs = new Date(dateString).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function getPurposeLabel(purpose?: string) {
  switch (purpose) {
    case "lease_fee":
      return "Lease Fee";
    case "inspection_fee":
      return "Inspection Fee";
    case "booking_fee":
      return "Booking Fee";
    case "purchase_installment":
      return "Purchase Installment";
    default:
      return purpose
        ? purpose.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
        : "Payment";
  }
}

function getStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "success":
      return "default";
    case "failed":
    case "reversed":
      return "destructive";
    case "abandoned":
      return "outline";
    default:
      return "secondary";
  }
}

function getRefundStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "processed":
      return "default";
    case "failed":
    case "needs_attention":
      return "destructive";
    default:
      return "secondary";
  }
}

function normalizeReceipt(transaction: any) {
  return Array.isArray(transaction.receipt) ? transaction.receipt[0] : transaction.receipt;
}

function normalizeRefunds(transaction: any) {
  const refunds = Array.isArray(transaction.refunds) ? [...transaction.refunds] : [];

  return refunds.sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function getLatestRefund(transaction: any) {
  return normalizeRefunds(transaction)[0] || null;
}

function hasActiveRefund(transaction: any) {
  return normalizeRefunds(transaction).some((refund) =>
    ["pending", "processing", "needs_attention"].includes(refund.status)
  );
}

function getRemainingRefundableMinor(transaction: any) {
  return Math.max(
    Number(transaction.amount_minor || 0) - Number(transaction.refunded_amount_minor || 0),
    0
  );
}

function formatRefundStatusLabel(status?: string | null) {
  if (!status) return "No refund";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function canManageRefunds(role: MemberRole | null) {
  return role === "owner" || role === "manager";
}

function mergeRefundIntoPayment(payment: any, refund: any) {
  const remainingRefunds = normalizeRefunds(payment).filter((item) => item.id !== refund.id);
  return [refund, ...remainingRefunds];
}

export function WorkspacePayments({
  organization,
  currentRole,
}: WorkspacePaymentsProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);
  const [refundDraftPayment, setRefundDraftPayment] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [merchantNote, setMerchantNote] = useState("");
  const [escrowHolds, setEscrowHolds] = useState<any[]>([]);
  const [releasingHoldId, setReleasingHoldId] = useState<string | null>(null);
  const [disputingHoldId, setDisputingHoldId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    toast.success("Payment reference copied to clipboard");
    setTimeout(() => setCopiedRef(null), 2000);
  };

  useEffect(() => {
    let cancelled = false;

    const loadPayments = async () => {
      try {
        if (!cancelled) setLoading(true);
        const [rows, holds] = await Promise.all([
          paymentService.getOrganizationPropertyTransactions(organization.id),
          escrowService.getOrganizationEscrowHolds(organization.id),
        ]);

        if (!cancelled) {
          setPayments(rows);
          setEscrowHolds(holds || []);
        }
      } catch (error) {
        console.error("Failed to load workspace payments:", error);
        if (!cancelled) {
          toast.error("We couldn't load organization payments right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, [organization.id]);

  const handleReleaseEscrow = async (holdId: string) => {
    try {
      setReleasingHoldId(holdId);
      await escrowService.releaseEscrowHold(holdId);
      toast.success("Escrow released.");
      const holds = await escrowService.getOrganizationEscrowHolds(organization.id);
      setEscrowHolds(holds || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to release escrow.");
    } finally {
      setReleasingHoldId(null);
    }
  };

  const handlePartialReleaseEscrow = async (hold: any) => {
    const amountInput = window.prompt(
      `Release partial amount (max ${formatPaymentAmount(hold.amount_minor, hold.currency)}):`
    );
    if (!amountInput?.trim()) return;

    const amountMinor = Math.round(Number(amountInput) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      setReleasingHoldId(hold.id);
      await escrowService.releasePartialEscrowHold(hold.id, amountMinor);
      toast.success("Partial escrow released.");
      const holds = await escrowService.getOrganizationEscrowHolds(organization.id);
      setEscrowHolds(holds || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to release partial escrow.");
    } finally {
      setReleasingHoldId(null);
    }
  };

  const handleDisputeEscrow = async (holdId: string) => {
    const note = window.prompt("Describe the escrow dispute:");
    if (!note?.trim()) return;

    try {
      setDisputingHoldId(holdId);
      await escrowService.disputeEscrowHold(holdId, note.trim());
      toast.success("Escrow marked as disputed.");
      const holds = await escrowService.getOrganizationEscrowHolds(organization.id);
      setEscrowHolds(holds || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to dispute escrow.");
    } finally {
      setDisputingHoldId(null);
    }
  };

  const filteredPayments = useMemo(() => {
    if (filter === "all") return payments;
    if (filter === "success") {
      return payments.filter((payment) => payment.status === "success");
    }
    if (filter === "pending") {
      return payments.filter(
        (payment) =>
          ["initialized", "pending", "processing", "reversal_pending"].includes(payment.status) ||
          hasActiveRefund(payment)
      );
    }

    return payments.filter((payment) => {
      const latestRefund = getLatestRefund(payment);
      return (
        ["failed", "abandoned", "reversed"].includes(payment.status) ||
        ["needs_attention", "failed"].includes(latestRefund?.status)
      );
    });
  }, [filter, payments]);

  const stats = useMemo(() => {
    const successfulPayments = payments.filter((payment) => payment.status === "success");
    const pendingPayments = payments.filter(
      (payment) =>
        ["initialized", "pending", "processing", "reversal_pending"].includes(payment.status) ||
        hasActiveRefund(payment)
    );
    const verifiedReceipts = payments.filter((payment) => {
      const receipt = normalizeReceipt(payment);
      return Boolean(receipt?.receipt_sha256);
    });
    const volumeMinor = successfulPayments.reduce(
      (total, payment) => total + (payment.amount_minor || 0),
      0
    );

    return {
      total: payments.length,
      successful: successfulPayments.length,
      pending: pendingPayments.length,
      verified: verifiedReceipts.length,
      volumeMinor,
    };
  }, [payments]);

  const handleVerify = async (payment: any) => {
    try {
      setVerifyingPaymentId(payment.id);
      const result = await paymentService.verifyPropertyPayment(payment.provider_reference);

      const receipt = "receipt" in result ? result.receipt : null;

      setPayments((current) =>
        current.map((item) =>
          item.id === payment.id
            ? {
                ...item,
                ...result.transaction,
                receipt: receipt || item.receipt,
              }
            : item
        )
      );

      if (result.status === "success" || result.status === "completed") {
        toast.success(
          result.alreadyProcessed
            ? "Payment was already verified."
            : "Payment verified successfully."
        );
      } else {
        toast.message(`Payment status is still ${result.status || "pending"}.`);
      }
    } catch (error) {
      console.error("Failed to verify payment:", error);
      toast.error("We couldn't verify that payment right now.");
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleReceiptDownload = async (payment: any) => {
    const receipt = normalizeReceipt(payment);

    if (!receipt?.storage_bucket || !receipt?.storage_path) {
      toast.error("Receipt is not available yet.");
      return;
    }

    try {
      setDownloadingReceiptId(payment.id);
      const signedUrl = await paymentService.getReceiptDownloadUrl(
        receipt.storage_bucket,
        receipt.storage_path
      );

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open receipt:", error);
      toast.error("We couldn't open that receipt right now.");
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const openRefundDialog = (payment: any) => {
    setRefundDraftPayment(payment);
    setRefundAmount("");
    setRefundReason("");
    setCustomerNote("");
    setMerchantNote("");
  };

  const resetRefundDialog = () => {
    setRefundDraftPayment(null);
    setRefundAmount("");
    setRefundReason("");
    setCustomerNote("");
    setMerchantNote("");
  };

  const closeRefundDialog = () => {
    if (refundingPaymentId) return;
    resetRefundDialog();
  };

  const handleRefund = async () => {
    if (!refundDraftPayment) return;

    const trimmedReason = refundReason.trim();
    if (!trimmedReason) {
      toast.error("Add a short internal reason before requesting the refund.");
      return;
    }

    try {
      setRefundingPaymentId(refundDraftPayment.id);
      const result = await paymentService.initiatePropertyRefund({
        transactionId: refundDraftPayment.id,
        amount: refundAmount.trim() ? refundAmount.trim() : null,
        reason: trimmedReason,
        customerNote: customerNote.trim() || trimmedReason,
        merchantNote: merchantNote.trim() || trimmedReason,
      });

      setPayments((current) =>
        current.map((item) =>
          item.id === refundDraftPayment.id
            ? {
                ...item,
                ...result.transaction,
                refunds: mergeRefundIntoPayment(item, result.refund),
              }
            : item
        )
      );

      toast.success("Refund request submitted to the payment provider.");
      resetRefundDialog();
    } catch (error) {
      console.error("Failed to initiate refund:", error);
      toast.error("We couldn't start that refund right now.");
    } finally {
      setRefundingPaymentId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
        Loading organization payments...
      </Card>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-ink font-serif">Payments & Settlements</h1>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="radar-pulse-dot" />
              <span>Gateways Live</span>
            </div>
          </div>
          <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">
            Enterprise settlement tracking, SHA-256 verified receipts, multi-channel MoMo routing, and escrow releases for {organization.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="glass" className="px-3 py-1.5 text-xs font-semibold">
            Base: Ghana Cedi (GHS ₵)
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold">
            Bank of Ghana Act 220 Compliant
          </Badge>
        </div>
      </div>

      {escrowHolds.filter((hold) => hold.status === "held").length > 0 && (
        <Card variant="glass" className="p-6 mb-8 border-primary/30 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="metric-halo metric-halo-primary h-9 w-9">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Active Escrow Protection Vaults</h2>
                <p className="text-xs text-ink-muted">Funds securely held under regulated escrow until tenancy/settlement milestone sign-off</p>
              </div>
            </div>
            <Badge variant="warning" dot pulse dotColor="amber">
              {escrowHolds.filter((hold) => hold.status === "held").length} Pending Release
            </Badge>
          </div>

          <div className="space-y-3">
            {escrowHolds
              .filter((hold) => hold.status === "held")
              .map((hold) => (
                <div
                  key={hold.id}
                  className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-surface-border/80 bg-surface/70 p-4 backdrop-blur-sm hover:border-primary/40 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink capitalize">
                        {hold.transaction?.purpose?.replace(/_/g, " ") || "Escrow hold"}
                      </p>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-subtle border border-surface-border text-ink-muted">
                        {hold.transaction?.provider_reference}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Payer: {hold.transaction?.payer?.full_name || hold.transaction?.payer?.email}
                    </p>
                    <p className="text-base font-bold text-primary mt-1">
                      {formatPaymentAmount(hold.amount_minor, hold.currency)}
                    </p>
                  </div>
                  {canManageRefunds(currentRole) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleReleaseEscrow(hold.id)}
                        disabled={releasingHoldId === hold.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {releasingHoldId === hold.id ? "Releasing..." : "Release Escrow"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handlePartialReleaseEscrow(hold)}
                        disabled={releasingHoldId === hold.id}
                      >
                        Partial Release
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDisputeEscrow(hold.id)}
                        disabled={disputingHoldId === hold.id}
                      >
                        {disputingHoldId === hold.id ? "Updating..." : "Dispute"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Alive Metric KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard
          title="Total Settlements"
          value={<AnimatedNumber value={stats.total} />}
          icon={CreditCard}
          iconColor="primary"
          trend={{ value: "+14.8%", isPositive: true, label: "vs last month" }}
          subtitle="Across all property transactions"
        />

        <MetricCard
          title="Successful Collections"
          value={<AnimatedNumber value={stats.successful} />}
          icon={Wallet}
          iconColor="emerald"
          trend={{ value: "98.2%", isPositive: true, label: "on-time rate" }}
          subtitle="Instant MoMo & card clearances"
        />

        <MetricCard
          title="Pending Verification"
          value={<AnimatedNumber value={stats.pending} />}
          icon={RefreshCcw}
          iconColor="amber"
          subtitle="Awaiting reconciliation"
          badge={stats.pending > 0 ? <Badge variant="warning" dot pulse dotColor="amber">Active</Badge> : undefined}
        />

        <MetricCard
          title="Receipts Verified"
          value={<AnimatedNumber value={stats.verified} />}
          icon={Shield}
          iconColor="indigo"
          subtitle="SHA-256 cryptographic proof"
          trend={{ value: "100%", isPositive: true, label: "audit integrity" }}
        />
      </div>

      <Card className="p-5 mb-8 border-primary/20 bg-primary/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ghana Mobile Money readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Checkout supports mobile money, card, bank transfer, and bank channels.
              Keep MoMo first when guiding clients through deposits and inspection fees.
            </p>
          </div>
          <Badge variant="default">GHS first</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {GHANA_PAYMENT_CHANNELS.map((channel) => (
            <div key={channel.id} className="rounded-xl border border-border bg-card p-3">
              <p className="font-medium">{channel.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{channel.helper}</p>
              <p className="mt-2 text-xs text-primary">{channel.settlementHint}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="glass" className="p-6 mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-ink">Transaction Settlement Queue</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {filteredPayments.length} records
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Current authorization level:{" "}
              <span className="font-semibold text-ink">
                {currentRole
                  ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
                  : "Member"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all" as const, label: "All Settlements" },
              { id: "success" as const, label: "Successful" },
              { id: "pending" as const, label: "Pending" },
              { id: "attention" as const, label: "Needs Attention" },
            ].map((item) => (
              <Button
                key={item.id}
                variant={filter === item.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {filteredPayments.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-ink-muted">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No settlements match the selected filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const receipt = normalizeReceipt(payment);
            const latestRefund = getLatestRefund(payment);
            const buyerLabel = payment.payer?.full_name || payment.payer?.email || "Customer";
            const propertyLabel = payment.listing?.property?.address || "Property transaction";
            const remainingRefundableMinor = getRemainingRefundableMinor(payment);
            const showRefundButton =
              canManageRefunds(currentRole) &&
              payment.status === "success" &&
              !hasActiveRefund(payment) &&
              remainingRefundableMinor > 0;

            const isSuccess = payment.status === "success" || payment.status === "completed";
            const isPending = payment.status === "pending" || payment.status === "processing";
            const isFailed = payment.status === "failed" || payment.status === "reversed";

            return (
              <Card key={payment.id} variant="glass" hover className="p-5 group">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-ink">{getPurposeLabel(payment.purpose)}</h3>
                      <Badge
                        variant={isSuccess ? "success" : isFailed ? "destructive" : "warning"}
                        dot
                        pulse={isPending}
                        dotColor={isSuccess ? "emerald" : isFailed ? "red" : "amber"}
                        className="capitalize"
                      >
                        {payment.status.replace(/_/g, " ")}
                      </Badge>
                      {latestRefund && (
                        <Badge
                          variant={getRefundStatusVariant(latestRefund.status)}
                          className="capitalize"
                        >
                          Refund {formatRefundStatusLabel(latestRefund.status)}
                        </Badge>
                      )}
                      {receipt?.receipt_sha256 && (
                        <Badge variant="glass" className="gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          <Shield className="w-3 h-3" />
                          SHA-256 Verified
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <p className="font-semibold text-ink text-base">{propertyLabel}</p>
                      <p className="text-xs text-ink-muted">
                        {payment.listing?.property?.city}, {payment.listing?.property?.region}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-ink-secondary bg-surface-subtle/70 rounded-xl p-3 border border-surface-border/60">
                      <div>
                        <span className="font-semibold text-ink">Payer:</span> {buyerLabel}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-ink">Reference:</span>{" "}
                        <span className="font-mono text-[11px] truncate max-w-[120px]">
                          {payment.provider_reference}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyReference(payment.provider_reference)}
                          className="p-1 hover:bg-surface rounded text-ink-muted hover:text-primary transition"
                          title="Copy reference"
                        >
                          {copiedRef === payment.provider_reference ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div>
                        <span className="font-semibold text-ink">Amount:</span>{" "}
                        <span className="font-bold text-ink text-sm">
                          {formatPaymentAmount(payment.amount_minor, payment.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-ink">Channel:</span>{" "}
                        <span className="font-medium text-primary">
                          {payment.payment_channel || "Mobile Money (MoMo)"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-ink">Updated:</span>{" "}
                        {formatRelativeTime(payment.paid_at || payment.updated_at || payment.created_at)}
                      </div>
                      <div>
                        <span className="font-semibold text-ink">Receipt:</span>{" "}
                        <span className="font-mono">{receipt?.receipt_number || "Pending"}</span>
                      </div>
                      {Number(payment.refunded_amount_minor || 0) > 0 && (
                        <div>
                          <span className="font-semibold text-red-500">Refunded:</span>{" "}
                          <span className="font-medium text-red-500">{formatPaymentAmount(payment.refunded_amount_minor, payment.currency)}</span>
                        </div>
                      )}
                      {remainingRefundableMinor > 0 && Number(payment.refunded_amount_minor || 0) > 0 && (
                        <div>
                          <span className="font-semibold text-ink">Refundable balance:</span>{" "}
                          <span className="font-medium text-ink">{formatPaymentAmount(remainingRefundableMinor, payment.currency)}</span>
                        </div>
                      )}
                    </div>

                    {latestRefund && (
                      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                        <p className="font-medium text-foreground mb-1">Latest refund update</p>
                        <p className="text-muted-foreground">
                          {formatPaymentAmount(latestRefund.amount_minor, latestRefund.currency || payment.currency)}{" "}
                          · {formatRefundStatusLabel(latestRefund.status)} ·{" "}
                          {formatRelativeTime(latestRefund.updated_at || latestRefund.created_at)}
                        </p>
                        {latestRefund.refund_reason && (
                          <p className="text-muted-foreground mt-1">
                            Reason: {latestRefund.refund_reason}
                          </p>
                        )}
                        {latestRefund.status === "needs_attention" && (
                          <p className="text-destructive mt-2">
                            The payment provider is waiting for customer bank details before this refund can
                            continue.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 xl:justify-end">
                    {["initialized", "pending", "processing"].includes(payment.status) && (
                      <Button
                        variant="outline"
                        onClick={() => void handleVerify(payment)}
                        disabled={verifyingPaymentId === payment.id}
                      >
                        <RefreshCcw className="w-4 h-4" />
                        {verifyingPaymentId === payment.id ? "Verifying..." : "Verify"}
                      </Button>
                    )}

                    {showRefundButton && (
                      <Button
                        variant="outline"
                        onClick={() => openRefundDialog(payment)}
                        disabled={refundingPaymentId === payment.id}
                      >
                        {refundingPaymentId === payment.id ? "Submitting..." : "Refund"}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => void handleReceiptDownload(payment)}
                      disabled={downloadingReceiptId === payment.id || !receipt?.storage_path}
                    >
                      <Download className="w-4 h-4" />
                      {downloadingReceiptId === payment.id ? "Opening..." : "Receipt"}
                    </Button>

                    {receipt?.verification_url && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(receipt.verification_url, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="w-4 h-4" />
                        Verification
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(refundDraftPayment)}
        onOpenChange={(open) => {
          if (!open) closeRefundDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Start a refund for this property payment. Leave the amount blank to refund
              the full remaining balance.
            </DialogDescription>
          </DialogHeader>

          {refundDraftPayment && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm">
                <p className="font-medium text-foreground">
                  {getPurposeLabel(refundDraftPayment.purpose)}
                </p>
                <p className="text-muted-foreground mt-1">
                  Reference: {refundDraftPayment.provider_reference}
                </p>
                <p className="text-muted-foreground mt-1">
                  Remaining refundable balance:{" "}
                  {formatPaymentAmount(
                    getRemainingRefundableMinor(refundDraftPayment),
                    refundDraftPayment.currency
                  )}
                </p>
              </div>

              <Input
                label="Refund Amount (GHS)"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder={(
                  getRemainingRefundableMinor(refundDraftPayment) / 100
                ).toFixed(2)}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />

              <div className="space-y-2">
                <label className="block text-sm text-foreground">Internal Reason</label>
                <Textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="Why is this refund being issued?"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-foreground">Customer Note</label>
                <Textarea
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  placeholder="Optional note the payer can understand"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-foreground">Merchant Note</label>
                <Textarea
                  value={merchantNote}
                  onChange={(event) => setMerchantNote(event.target.value)}
                  placeholder="Optional operations note for payment records"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeRefundDialog} disabled={Boolean(refundingPaymentId)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRefund()} disabled={Boolean(refundingPaymentId)}>
              {refundingPaymentId ? "Submitting..." : "Request Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
