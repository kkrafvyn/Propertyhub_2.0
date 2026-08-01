import { HttpError } from "./http.ts";

type ListingRow = {
  price?: number | null;
  currency?: string | null;
  listing_type?: string | null;
  status?: string | null;
};

export function assertListingPayable(listing: ListingRow) {
  if (!listing) {
    throw new HttpError(404, "Listing not found");
  }

  if (!["listed", "under_offer"].includes(String(listing.status || ""))) {
    throw new HttpError(400, "This listing is not available for payment");
  }
}

/** @deprecated Use resolveCheckoutAmountMinor from promo-pricing.ts for checkout flows. */
export function resolvePaymentAmountMinor(input: {
  listing: ListingRow;
  purpose?: string | null;
  clientAmountMinor?: number | null;
}) {
  const listingPrice = Number(input.listing.price || 0);
  if (!Number.isFinite(listingPrice) || listingPrice <= 0) {
    throw new HttpError(400, "Listing price is not configured");
  }

  const expectedMinor = Math.round(listingPrice * 100);

  if (input.clientAmountMinor != null && input.clientAmountMinor > 0) {
    const tolerance = Math.max(100, Math.round(expectedMinor * 0.01));
    if (Math.abs(input.clientAmountMinor - expectedMinor) > tolerance) {
      throw new HttpError(400, "Payment amount does not match listing price");
    }
  }

  return expectedMinor;
}

export function assertPaystackAmountMatch(input: {
  expectedMinor: number;
  paystackAmountMajor: number;
  currency: string;
}) {
  const paystackMinor = Math.round(Number(input.paystackAmountMajor) * 100);
  if (paystackMinor !== input.expectedMinor) {
    throw new HttpError(400, "Paystack amount does not match transaction record");
  }
}
