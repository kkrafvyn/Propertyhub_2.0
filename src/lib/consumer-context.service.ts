import { bookingService } from "./booking.service";
import { dealCaseService } from "./dealcase.service";
import { leaseService } from "./lease.service";

export type ContextualNavItem = {
  label: string;
  href: string;
  section: string;
  context: "booking" | "renting" | "buying" | "default";
};

const BOOKING_NAV: ContextualNavItem[] = [
  { label: "Trips", href: "/app/trips", section: "trips", context: "booking" },
  { label: "Reservations", href: "/app/reservations", section: "reservations", context: "booking" },
  { label: "Calendar", href: "/app/viewings", section: "viewings", context: "booking" },
];

const RENTING_NAV: ContextualNavItem[] = [
  { label: "Leases", href: "/app/leases", section: "leases", context: "renting" },
  { label: "Payments", href: "/app/payments", section: "payments", context: "renting" },
  { label: "Maintenance", href: "/app/maintenance", section: "maintenance", context: "renting" },
  { label: "My Home", href: "/app/home", section: "home", context: "renting" },
];

const BUYING_NAV: ContextualNavItem[] = [
  { label: "Offers", href: "/app/applications", section: "applications", context: "buying" },
  { label: "Transactions", href: "/app/transactions", section: "transactions", context: "buying" },
  { label: "Documents", href: "/app/documents", section: "documents", context: "buying" },
  { label: "Mortgage", href: "/app/mortgage", section: "mortgage", context: "buying" },
];

const DEFAULT_NAV: ContextualNavItem[] = [
  { label: "Offers", href: "/app/applications", section: "applications", context: "default" },
  { label: "Viewings", href: "/app/viewings", section: "viewings", context: "default" },
  { label: "Payments", href: "/app/payments", section: "payments", context: "default" },
  { label: "Alerts", href: "/app/alerts", section: "alerts", context: "default" },
  { label: "Notifications", href: "/app/notifications", section: "notifications", context: "default" },
];

export const consumerContextService = {
  async getConsumerContext(userId: string) {
    const [bookings, leases, dealCases] = await Promise.all([
      bookingService.getActiveGuestBookings(userId),
      leaseService.getActiveTenantLeases(userId),
      dealCaseService.getDealCasesByUser(userId),
    ]);

    const purchaseDeals = (dealCases || []).filter(
      (dealCase) =>
        dealCase.case_type === "purchase_offer" &&
        !["closed", "rejected"].includes(String(dealCase.status))
    );

    return {
      hasBookingContext: bookings.length > 0,
      hasRentingContext: leases.length > 0,
      hasBuyingContext: purchaseDeals.length > 0,
      bookings,
      leases,
      purchaseDeals,
    };
  },

  getContextualNavItems(context: {
    hasBookingContext: boolean;
    hasRentingContext: boolean;
    hasBuyingContext: boolean;
  }) {
    const items: ContextualNavItem[] = [];

    if (context.hasBookingContext) items.push(...BOOKING_NAV);
    if (context.hasRentingContext) items.push(...RENTING_NAV);
    if (context.hasBuyingContext) items.push(...BUYING_NAV);

    if (items.length === 0) {
      return DEFAULT_NAV;
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  },
};
