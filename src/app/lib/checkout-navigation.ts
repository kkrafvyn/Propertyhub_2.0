import type { InitializePropertyPaymentInput } from "../../lib/payment.service";

export type CheckoutPurpose = NonNullable<InitializePropertyPaymentInput["purpose"]>;

export type CheckoutParams = {
  listingId: string;
  amount: number;
  purpose: CheckoutPurpose;
  bookingId?: string;
  dealCaseId?: string;
  returnTo?: string;
  customerName?: string;
  customerPhone?: string;
};

export function buildCheckoutSearchParams(params: CheckoutParams) {
  const search = new URLSearchParams();
  search.set("listingId", params.listingId);
  search.set("amount", String(params.amount));
  search.set("purpose", params.purpose);
  if (params.bookingId) search.set("bookingId", params.bookingId);
  if (params.dealCaseId) search.set("dealCaseId", params.dealCaseId);
  if (params.returnTo) search.set("returnTo", params.returnTo);
  if (params.customerName) search.set("customerName", params.customerName);
  if (params.customerPhone) search.set("customerPhone", params.customerPhone);
  return search;
}

export function buildCheckoutPath(params: CheckoutParams) {
  return `/checkout?${buildCheckoutSearchParams(params).toString()}`;
}

export function parseCheckoutParams(searchParams: URLSearchParams): CheckoutParams | null {
  const listingId = searchParams.get("listingId")?.trim();
  const amountRaw = searchParams.get("amount");
  const purpose = searchParams.get("purpose") as CheckoutPurpose | null;

  if (!listingId || !amountRaw || !purpose) return null;

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    listingId,
    amount,
    purpose,
    bookingId: searchParams.get("bookingId") || undefined,
    dealCaseId: searchParams.get("dealCaseId") || undefined,
    returnTo: searchParams.get("returnTo") || undefined,
    customerName: searchParams.get("customerName") || undefined,
    customerPhone: searchParams.get("customerPhone") || undefined,
  };
}

export const PURPOSE_LABELS: Record<CheckoutPurpose, string> = {
  deposit: "Security deposit",
  rent: "Rent payment",
  lease_fee: "Lease fee",
  inspection_fee: "Inspection fee",
  booking_fee: "Booking payment",
  purchase_installment: "Purchase installment",
  other: "Property payment",
};
