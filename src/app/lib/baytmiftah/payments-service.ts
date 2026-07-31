import { buildCheckoutPath } from "../checkout-navigation";
import { getDefaultProvider, PAYMENT_PROVIDERS } from "./payment-providers";

export { PAYMENT_PROVIDERS, getDefaultProvider };

export function providerMeta(provider: string) {
  return { id: provider, label: provider };
}

/** @deprecated Use buildCheckoutPath and navigate to /checkout instead. */
export async function payReservation({
  reservationId,
  amount,
  listingId,
}: {
  reservationId: string;
  amount: number;
  listingId: string;
  provider?: string;
}) {
  return {
    checkout_path: buildCheckoutPath({
      listingId,
      amount,
      purpose: "booking_fee",
      bookingId: reservationId,
    }),
    source: "in_app",
  };
}
