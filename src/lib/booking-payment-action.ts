import { buildCheckoutPath } from "../app/lib/checkout-navigation";
import { CONSUMER_ROUTES } from "../app/lib/consumer-routes";

export type BookingPaymentActionKind =
  | "none"
  | "resume_payment"
  | "pay_now"
  | "payment_processing"
  | "retry_payment"
  | "expired";

export type BookingPaymentAction = {
  kind: BookingPaymentActionKind;
  label: string;
  disabled: boolean;
  reason?: string;
  checkoutPath?: string;
};

type BookingPaymentInput = {
  id: string;
  listing_id: string;
  status?: string | null;
  booking_mode?: string | null;
  transaction_id?: string | null;
  total_minor?: number | null;
  currency?: string | null;
  check_in?: string | null;
  payment_transaction_status?: string | null;
};

export function resolveBookingPaymentAction(booking: BookingPaymentInput): BookingPaymentAction {
  const status = String(booking.status || "pending");
  const mode = booking.booking_mode === "request" ? "request" : "instant";
  const hasTxn = Boolean(booking.transaction_id);
  const txnStatus = String(booking.payment_transaction_status || "").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const amount = (Number(booking.total_minor) || 0) / 100;

  const checkoutPath =
    amount > 0
      ? buildCheckoutPath({
          listingId: booking.listing_id,
          amount,
          purpose: "booking_fee",
          bookingId: booking.id,
          returnTo: CONSUMER_ROUTES.reservations,
        })
      : undefined;

  if (status === "cancelled" || status === "completed") {
    return { kind: "none", label: "", disabled: true };
  }

  if (mode === "request" && status === "confirmed" && !hasTxn) {
    return {
      kind: "pay_now",
      label: "Pay now",
      disabled: false,
      checkoutPath,
    };
  }

  if (mode === "instant" && status === "pending" && !hasTxn) {
    if (booking.check_in && booking.check_in < today) {
      return {
        kind: "expired",
        label: "Booking expired",
        disabled: true,
        reason: "Check-in date has passed. Cancel and book again.",
      };
    }
    return {
      kind: "resume_payment",
      label: "Resume payment",
      disabled: false,
      checkoutPath,
    };
  }

  if (status === "pending" && hasTxn && txnStatus === "pending") {
    return {
      kind: "payment_processing",
      label: "Payment processing",
      disabled: true,
      reason: "Your payment is being confirmed.",
    };
  }

  if (status === "pending" && hasTxn && txnStatus === "failed") {
    return {
      kind: "retry_payment",
      label: "Retry payment",
      disabled: false,
      checkoutPath,
    };
  }

  return { kind: "none", label: "", disabled: true };
}
