import { useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { leaseService } from "../../../lib/lease.service";
import { leaseWorkflowService } from "../../../lib/lease-workflow.service";
import { walletService } from "../../../lib/wallet.service";
import { ActivityTimeline, EmptyState } from "../../components/ux";
import { CONSUMER_PAGE_CONFIG } from "../../lib/consumer-page-config";
import { buildBookingTimeline, buildEscrowTimeline, buildLeaseTimeline, buildMaintenanceTimeline } from "../../lib/workflow-timeline";
import { maintenanceService } from "../../../lib/maintenance.service";
import { bookingService } from "../../../lib/booking.service";
import { monitoring } from "../../../lib/monitoring";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function WalletSection({
  wallet,
  ledger,
  escrowHolds,
  payoutRequests,
  onRefresh,
}: {
  wallet: any;
  ledger: any[];
  escrowHolds: any[];
  payoutRequests: any[];
  onRefresh: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePayout = async () => {
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      toast.error("Enter a valid payout amount.");
      return;
    }
    if (!destination.trim()) {
      toast.error("Enter a MoMo number or bank destination.");
      return;
    }

    try {
      setSubmitting(true);
      await walletService.requestPayout({
        userId: wallet.user_id,
        amountMinor,
        payoutDestination: destination.trim(),
      });
      monitoring.trackWorkflowStep("wallet", "payout_requested");
      toast.success("Payout request submitted.");
      setAmount("");
      setDestination("");
      await onRefresh();
    } catch (error) {
      console.error(error);
      monitoring.captureError(error, "wallet_payout");
      toast.error(error instanceof Error ? error.message : "Unable to request payout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Available</p>
          <p className="text-3xl font-semibold">
            {formatMoney(wallet.available_minor, wallet.currency)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">In Escrow</p>
          <p className="text-3xl font-semibold">
            {formatMoney(wallet.pending_minor, wallet.currency)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Escrow Holds</p>
          <p className="text-3xl font-semibold">{escrowHolds.filter((h) => h.status === "held").length}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Request payout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount in GHS"
          />
          <Input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="MoMo number or bank account"
          />
        </div>
        <Button onClick={() => void handlePayout()} disabled={submitting}>
          {submitting ? "Submitting..." : "Request payout"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent ledger</h3>
        <div className="space-y-3">
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
          ) : (
            ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span>{entry.description || entry.entry_type}</span>
                <span>{formatMoney(entry.amount_minor, wallet.currency)}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      {payoutRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Payout requests</h3>
          <div className="space-y-3">
            {payoutRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between text-sm">
                <span>{formatMoney(request.amount_minor, request.currency)}</span>
                <Badge variant="outline" className="capitalize">
                  {request.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

export function LeasesSection({ leases, userId }: { leases: any[]; userId?: string }) {
  const [payingLeaseId, setPayingLeaseId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const loadSchedule = async (lease: any) => {
    const rows = await leaseWorkflowService.ensureRentSchedule(lease);
    setSchedules((current) => ({ ...current, [lease.id]: rows }));
  };

  const handlePayRent = async (lease: any) => {
    try {
      setPayingLeaseId(lease.id);
      monitoring.trackWorkflowStep("rent", "pay_rent_started", { leaseId: lease.id });
      await leaseService.payRent(lease);
    } catch (error) {
      console.error(error);
      monitoring.captureError(error, "rent_payment");
      toast.error("Unable to start rent payment.");
      setPayingLeaseId(null);
    }
  };

  const handleRenewal = async (leaseId: string) => {
    try {
      setRenewingId(leaseId);
      await leaseWorkflowService.requestRenewal(leaseId);
      monitoring.trackWorkflowStep("rent", "renewal_requested", { leaseId });
      toast.success("Renewal request sent to your property team.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to request renewal.");
    } finally {
      setRenewingId(null);
    }
  };

  const handleSignLease = async (leaseId: string) => {
    try {
      setSigningId(leaseId);
      await leaseWorkflowService.markLeaseSigned(leaseId);
      monitoring.trackWorkflowStep("rent", "lease_signed", { leaseId });
      toast.success("Lease marked as signed.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update lease signing status.");
    } finally {
      setSigningId(null);
    }
  };

  return (
    <div className="space-y-4">
      {leases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={CONSUMER_PAGE_CONFIG.leases.emptyTitle || "You don't have an active lease"}
          description={CONSUMER_PAGE_CONFIG.leases.emptyDescription || ""}
          actionLabel={CONSUMER_PAGE_CONFIG.leases.emptyActionLabel}
          actionHref={CONSUMER_PAGE_CONFIG.leases.emptyActionHref}
        />
      ) : (
        leases.map((lease) => {
          const schedule = schedules[lease.id] || [];

          return (
            <Card key={lease.id} className="p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-semibold">
                    {lease.listing?.property?.address || "Lease property"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lease.listing?.property?.city}, {lease.listing?.property?.region}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {lease.organization?.name} · Started {lease.start_date}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <Badge className="capitalize">{lease.status}</Badge>
                  {lease.signing_status !== "signed" ? (
                    <Badge variant="outline" className="capitalize">
                      {lease.signing_status || "pending"} signature
                    </Badge>
                  ) : null}
                  <p className="font-semibold">{formatMoney(lease.rent_minor, lease.currency)}</p>
                  {lease.next_rent_due_at ? (
                    <p className="text-xs text-muted-foreground">Next rent due {lease.next_rent_due_at}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 justify-end">
                    {lease.signing_status !== "signed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSignLease(lease.id)}
                        disabled={signingId === lease.id}
                      >
                        {signingId === lease.id ? "Saving..." : "Mark signed"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => void handlePayRent(lease)}
                      disabled={payingLeaseId === lease.id}
                    >
                      {payingLeaseId === lease.id ? "Redirecting..." : "Pay rent"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRenewal(lease.id)}
                      disabled={renewingId === lease.id || lease.renewal_status === "requested"}
                    >
                      {lease.renewal_status === "requested" ? "Renewal pending" : "Request renewal"}
                    </Button>
                  </div>
                </div>
              </div>

              {schedule.length === 0 ? (
                <Button size="sm" variant="outline" onClick={() => void loadSchedule(lease)}>
                  View rent schedule
                </Button>
              ) : (
                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold mb-3">Rent schedule</h4>
                  <div className="space-y-2">
                    {schedule.slice(0, 6).map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm">
                        <span>{row.due_date}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatMoney(row.amount_minor, row.currency)}</span>
                          <Badge variant="outline" className="capitalize">
                            {row.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ActivityTimeline steps={buildLeaseTimeline(lease, schedule)} />
            </Card>
          );
        })
      )}
    </div>
  );
}

export function MaintenanceSection({
  userId,
  leases,
  requests,
  onCreated,
}: {
  userId: string;
  leases: any[];
  requests: any[];
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeLeases = useMemo(
    () => leases.filter((lease) => lease.status === "active"),
    [leases]
  );

  const handleSubmit = async () => {
    const lease = activeLeases.find((entry) => entry.id === leaseId) || activeLeases[0];
    if (!lease) {
      toast.error("You need an active lease before submitting maintenance.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Add a title and description.");
      return;
    }

    try {
      setSubmitting(true);
      await maintenanceService.createRequest({
        tenantUserId: userId,
        organizationId: lease.organization_id,
        leaseId: lease.id,
        listingId: lease.listing_id,
        title: title.trim(),
        description: description.trim(),
      });
      monitoring.trackWorkflowStep("maintenance", "request_submitted");
      toast.success("Maintenance request submitted.");
      setTitle("");
      setDescription("");
      await onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit maintenance request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">New request</h3>
        {activeLeases.length > 1 && (
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={leaseId || activeLeases[0]?.id || ""}
            onChange={(event) => setLeaseId(event.target.value)}
          >
            {activeLeases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.listing?.property?.address || lease.id}
              </option>
            ))}
          </select>
        )}
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" />
        <textarea
          className="w-full min-h-28 rounded-lg border border-border px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue"
        />
        <Button onClick={() => void handleSubmit()} disabled={submitting || activeLeases.length === 0}>
          {submitting ? "Submitting..." : "Submit request"}
        </Button>
      </Card>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No maintenance requests yet.</Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{request.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {request.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <ActivityTimeline steps={buildMaintenanceTimeline(request)} />
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

function BookingCard({
  booking,
  userId,
  onRefresh,
}: {
  booking: any;
  userId?: string;
  onRefresh?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const canCheckIn = booking.status === "confirmed" && !booking.checked_in_at && booking.check_in <= today;
  const canCheckOut = booking.checked_in_at && !booking.checked_out_at;
  const canReview = booking.status === "completed" || booking.checked_out_at;
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  const loadReviews = async () => {
    const rows = await bookingService.getBookingReviews(booking.id);
    setReviews(rows);
  };

  useEffect(() => {
    void loadReviews();
  }, [booking.id]);

  const runAction = async (action: string, fn: () => Promise<unknown>) => {
    try {
      setBusy(action);
      await fn();
      monitoring.trackWorkflowStep("short_stay", action, { bookingId: booking.id });
      toast.success("Booking updated.");
      await onRefresh?.();
      await loadReviews();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update booking.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{booking.listing?.property?.address || "Short stay"}</h3>
          <p className="text-sm text-muted-foreground">
            {booking.check_in} → {booking.check_out} · {booking.nights} nights
          </p>
          {booking.booking_mode === "request" ? (
            <p className="text-xs text-muted-foreground mt-1">Request-to-book</p>
          ) : null}
          {booking.refund_minor ? (
            <p className="text-xs text-muted-foreground mt-1">
              Refund {formatMoney(booking.refund_minor, booking.currency)}
            </p>
          ) : null}
        </div>
        <Badge className="capitalize">{booking.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy === "cancel"}
            onClick={() =>
              void runAction("cancel", () =>
                bookingService.cancelBookingWithRefund(booking.id, "Guest cancelled")
              )
            }
          >
            {busy === "cancel" ? "Cancelling..." : "Cancel & refund"}
          </Button>
        ) : null}
        {canCheckIn ? (
          <Button
            size="sm"
            disabled={busy === "checkin"}
            onClick={() => void runAction("check_in", () => bookingService.checkInGuest(booking.id))}
          >
            {busy === "checkin" ? "Checking in..." : "Check in"}
          </Button>
        ) : null}
        {canCheckOut ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy === "checkout"}
            onClick={() => void runAction("check_out", () => bookingService.checkOutGuest(booking.id))}
          >
            {busy === "checkout" ? "Checking out..." : "Check out"}
          </Button>
        ) : null}
      </div>

      {canReview && userId ? (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Leave a review</h4>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`text-sm px-2 py-1 rounded border ${rating >= value ? "border-primary text-primary" : "border-border"}`}
                onClick={() => setRating(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <textarea
            className="w-full min-h-20 rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Share your stay experience"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <Button
            size="sm"
            disabled={busy === "review"}
            onClick={() =>
              void runAction("review", () =>
                bookingService.submitReview({
                  bookingId: booking.id,
                  reviewerUserId: userId,
                  reviewerRole: "guest",
                  rating,
                  comment: comment.trim() || undefined,
                })
              )
            }
          >
            {busy === "review" ? "Submitting..." : "Submit review"}
          </Button>
        </div>
      ) : null}

      <ActivityTimeline steps={buildBookingTimeline(booking, reviews)} />
    </Card>
  );
}

export function TripsSection({
  bookings,
  userId,
  onRefresh,
}: {
  bookings: any[];
  userId?: string;
  onRefresh?: () => Promise<void>;
}) {
  const upcoming = bookings.filter((booking) => booking.check_out >= new Date().toISOString().slice(0, 10));

  return (
    <section className="space-y-4">
      {upcoming.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No upcoming trips yet.</Card>
      ) : (
        upcoming.map((booking) => (
          <BookingCard key={booking.id} booking={booking} userId={userId} onRefresh={onRefresh} />
        ))
      )}
    </section>
  );
}

export function ReservationsSection({
  bookings,
  userId,
  onRefresh,
}: {
  bookings: any[];
  userId?: string;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No reservations yet.</Card>
      ) : (
        bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} userId={userId} onRefresh={onRefresh} />
        ))
      )}
    </section>
  );
}

export function DocumentsSection({ dealCases }: { dealCases: any[] }) {
  const purchaseCases = dealCases.filter((dealCase) => dealCase.case_type === "purchase_offer");

  return (
    <section className="space-y-4">
      {purchaseCases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Purchase documents will appear when you have active offers.
        </Card>
      ) : (
        purchaseCases.map((dealCase) => (
          <Card key={dealCase.id} className="p-5">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">
                  {dealCase.listing?.property?.address || "Purchase offer"}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {dealCase.status} · {dealCase.pipeline_stage?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}

export function TransactionsSection({ payments, escrowHolds }: { payments: any[]; escrowHolds: any[] }) {
  const purchasePayments = payments.filter((payment) =>
    ["deposit", "purchase_installment", "booking_fee"].includes(payment.purpose)
  );

  return (
    <section className="space-y-4">
      {purchasePayments.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No purchase transactions yet.</Card>
      ) : (
        purchasePayments.map((payment) => {
          const hold = escrowHolds.find((entry) => entry.transaction_id === payment.id);
          return (
            <Card key={payment.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold capitalize">{payment.purpose.replace(/_/g, " ")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {payment.listing?.property?.address || "Property transaction"}
                  </p>
                  <p className="text-sm text-muted-foreground">{payment.provider_reference}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(payment.amount_minor, payment.currency)}</p>
                  {hold ? (
                    <Badge variant="outline" className="capitalize mt-2">
                      Escrow {hold.status}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {hold ? <ActivityTimeline steps={buildEscrowTimeline(hold)} /> : null}
            </Card>
          );
        })
      )}
    </section>
  );
}

export function PaymentsWithWalletSection({
  wallet,
  payments,
  escrowHolds,
  onRefreshWallet,
}: {
  wallet: any;
  payments: any[];
  escrowHolds: any[];
  onRefreshWallet: () => Promise<void>;
}) {
  return (
    <section className="space-y-8">
      <WalletSection
        wallet={wallet}
        ledger={[]}
        escrowHolds={escrowHolds}
        payoutRequests={[]}
        onRefresh={onRefreshWallet}
      />
      <div>
        <h3 className="font-semibold mb-4">Paystack history</h3>
        {payments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No payments yet.</Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="p-5 mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold capitalize">{payment.purpose.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{payment.provider_reference}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-semibold">{formatMoney(payment.amount_minor, payment.currency)}</p>
                  <Badge variant="outline" className="capitalize">{payment.status}</Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

export function LoadingSection() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}