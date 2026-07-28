import { paymentService } from "../../../lib/payment.service";
import { getDefaultProvider, PAYMENT_PROVIDERS } from "./payment-providers";

export { PAYMENT_PROVIDERS, getDefaultProvider };

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
