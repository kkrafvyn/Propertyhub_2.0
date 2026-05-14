import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Shield,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { paymentService } from "../../../lib/payment.service";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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

  useEffect(() => {
    let cancelled = false;

    const loadPayments = async () => {
      try {
        if (!cancelled) setLoading(true);
        const rows = await paymentService.getOrganizationPropertyTransactions(organization.id);

        if (!cancelled) {
          setPayments(rows);
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
      return receipt?.blockchain_status === "confirmed";
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

      setPayments((current) =>
        current.map((item) =>
          item.id === payment.id
            ? {
                ...item,
                ...result.transaction,
                receipt: result.receipt || item.receipt,
              }
            : item
        )
      );

      if (result.status === "success") {
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

      toast.success("Refund request submitted to Paystack.");
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
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Payments</h1>
        <p className="text-muted-foreground">
          Track Paystack payments, review receipts, confirm Polygon verification, and manage
          refunds for {organization.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Payments</p>
              <p className="text-3xl font-semibold">{stats.total}</p>
              <p className="text-xs text-accent mt-1">Across all property transactions</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Successful</p>
              <p className="text-3xl font-semibold">{stats.successful}</p>
              <p className="text-xs text-accent mt-1">Completed through Paystack</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
              <p className="text-3xl font-semibold">{stats.pending}</p>
              <p className="text-xs text-chart-3 mt-1">Awaiting payment or refund resolution</p>
            </div>
            <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-chart-3" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Verified on Polygon</p>
              <p className="text-3xl font-semibold">{stats.verified}</p>
              <p className="text-xs text-accent mt-1">
                {formatPaymentAmount(stats.volumeMinor, "GHS")} settled volume
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-8 border-primary/20 bg-primary/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ghana Mobile Money readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paystack checkout requests mobile_money, card, bank transfer, and bank channels.
              Keep MoMo first when guiding clients through deposits and inspection fees.
            </p>
          </div>
          <Badge variant="default">GHS first</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {GHANA_PAYMENT_CHANNELS.map((channel) => (
            <div key={channel.id} className="rounded-xl border border-border bg-white p-3">
              <p className="font-medium">{channel.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{channel.helper}</p>
              <p className="mt-2 text-xs text-primary">{channel.settlementHint}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Transaction Queue</h2>
            <p className="text-sm text-muted-foreground">
              Current role:{" "}
              {currentRole
                ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
                : "Member"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "all" as const, label: "All" },
              { id: "success" as const, label: "Successful" },
              { id: "pending" as const, label: "Pending" },
              { id: "attention" as const, label: "Needs Attention" },
            ].map((item) => (
              <Button
                key={item.id}
                variant={filter === item.id ? "default" : "outline"}
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
        <Card className="p-8 text-center text-muted-foreground">
          No payments match the current filter.
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

            return (
              <Card key={payment.id} className="p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{getPurposeLabel(payment.purpose)}</h3>
                      <Badge variant={getStatusVariant(payment.status)} className="capitalize">
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
                      {receipt?.blockchain_status === "confirmed" && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="w-3 h-3" />
                          Verified on Polygon
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-medium">{propertyLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.listing?.property?.city}, {payment.listing?.property?.region}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Payer:</span> {buyerLabel}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Reference:</span>{" "}
                        {payment.provider_reference}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Amount:</span>{" "}
                        {formatPaymentAmount(payment.amount_minor, payment.currency)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Channel:</span>{" "}
                        {payment.payment_channel || "Awaiting confirmation"}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Updated:</span>{" "}
                        {formatRelativeTime(payment.paid_at || payment.updated_at || payment.created_at)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Receipt:</span>{" "}
                        {receipt?.receipt_number || "Pending"}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Refunded:</span>{" "}
                        {formatPaymentAmount(payment.refunded_amount_minor, payment.currency)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Refundable balance:</span>{" "}
                        {formatPaymentAmount(remainingRefundableMinor, payment.currency)}
                      </p>
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
                            Paystack is waiting for customer bank details before this refund can
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
              Start a Paystack refund for this property payment. Leave the amount blank to refund
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
                  placeholder="Optional operations note for Paystack records"
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
