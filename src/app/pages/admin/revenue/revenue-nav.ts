import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Building2,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Percent,
  Receipt,
  ShieldCheck,
  Store,
  Ticket,
  Wallet,
} from "lucide-react";

export type RevenueSection =
  | "dashboard"
  | "listing-fees"
  | "agency-plans"
  | "transaction-fees"
  | "booking-fees"
  | "escrow-fees"
  | "wallet-fees"
  | "payment-settings"
  | "marketplace-commissions"
  | "verification-fees"
  | "enterprise-pricing"
  | "promo-codes"
  | "taxes";

export const REVENUE_NAV: Array<{
  id: RevenueSection;
  label: string;
  href: string;
  icon: LucideIcon;
  category?: string;
}> = [
  { id: "dashboard", label: "Dashboard", href: "/admin/revenue", icon: LayoutDashboard },
  { id: "listing-fees", label: "Listing Fees", href: "/admin/revenue/listing-fees", icon: Receipt, category: "listing_fees" },
  { id: "agency-plans", label: "Agency Plans", href: "/admin/revenue/agency-plans", icon: Building2 },
  { id: "transaction-fees", label: "Transaction Fees", href: "/admin/revenue/transaction-fees", icon: Percent, category: "transaction_fees" },
  { id: "booking-fees", label: "Booking Fees", href: "/admin/revenue/booking-fees", icon: Ticket, category: "booking_fees" },
  { id: "escrow-fees", label: "Escrow Fees", href: "/admin/revenue/escrow-fees", icon: Landmark, category: "escrow_fees" },
  { id: "wallet-fees", label: "Wallet Fees", href: "/admin/revenue/wallet-fees", icon: Wallet, category: "wallet_fees" },
  { id: "payment-settings", label: "Payment Settings", href: "/admin/revenue/payment-settings", icon: CreditCard },
  { id: "marketplace-commissions", label: "Marketplace Commissions", href: "/admin/revenue/marketplace-commissions", icon: Store, category: "marketplace_commissions" },
  { id: "verification-fees", label: "Verification Fees", href: "/admin/revenue/verification-fees", icon: ShieldCheck, category: "verification_fees" },
  { id: "enterprise-pricing", label: "Enterprise Pricing", href: "/admin/revenue/enterprise-pricing", icon: Building2, category: "enterprise_pricing" },
  { id: "promo-codes", label: "Promo Codes", href: "/admin/revenue/promo-codes", icon: BadgePercent },
  { id: "taxes", label: "Taxes & VAT", href: "/admin/revenue/taxes", icon: Percent },
];

export function resolveRevenueSection(pathname: string): RevenueSection {
  const segment = pathname.replace(/^\/admin\/revenue\/?/, "").split("/")[0];
  if (!segment) return "dashboard";
  return (REVENUE_NAV.find((item) => item.id === segment)?.id || "dashboard") as RevenueSection;
}

export const LISTING_TYPES = [
  { id: "sale", label: "Sale Listings" },
  { id: "rental", label: "Rental Listings" },
  { id: "lease", label: "Lease Listings" },
  { id: "short_stay", label: "Short Stay Listings" },
] as const;
