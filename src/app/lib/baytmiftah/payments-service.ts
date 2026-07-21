import { paymentService } from "../../../lib/payment.service";

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"] as const;

export function getDefaultProvider() {
  return "paystack";
}

export function providerMeta(provider: string) {
  return { id: provider, label: provider };
}

export async function payReservation({
  reservationId,
  amount,
  listingId,
  provider,
}: {
  reservationId: string;
  amount: number;
  listingId: string;
  provider?: string;
}) {
  const checkout = await paymentService.initializePropertyPayment({
    listingId,
    amount,
    purpose: "booking_fee",
    bookingId: reservationId,
  });

  return {
    checkout_url: checkout.authorizationUrl,
    source: "supabase",
  };
}
