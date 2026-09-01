import { bookingService } from "./booking.service";
import { dealCaseService } from "./dealcase.service";
import { leaseService } from "./lease.service";

export type ContextualNavItem = {
  label: string;
  href: string;
  section: string;
  context: "booking" | "renting" | "buying" | "default";
};

type TranslateFn = (key: string) => string;

const BOOKING_NAV_KEYS: NavKeyDef[] = [
  { labelKey: "consumer.context.trips", href: "/app/trips", section: "trips", context: "booking" as const },
  { labelKey: "consumer.context.reservations", href: "/app/reservations", section: "reservations", context: "booking" as const },
  { labelKey: "consumer.context.calendar", href: "/app/viewings", section: "viewings", context: "booking" as const },
];

const SERVICES_NAV_KEYS: NavKeyDef[] = [
  { labelKey: "consumer.context.vendors", href: "/app/vendors", section: "vendors", context: "renting" as const },
];

const RENTING_NAV_KEYS: NavKeyDef[] = [
  { labelKey: "consumer.context.leases", href: "/app/leases", section: "leases", context: "renting" as const },
  { labelKey: "consumer.context.payments", href: "/app/payments", section: "payments", context: "renting" as const },
  { labelKey: "consumer.context.maintenance", href: "/app/maintenance", section: "maintenance", context: "renting" as const },
  { labelKey: "consumer.context.myHome", href: "/app/home", section: "home", context: "renting" as const },
  ...SERVICES_NAV_KEYS,
];

const BUYING_NAV_KEYS: NavKeyDef[] = [
  { labelKey: "consumer.context.offers", href: "/app/applications", section: "applications", context: "buying" as const },
  { labelKey: "consumer.context.transactions", href: "/app/transactions", section: "transactions", context: "buying" as const },
  { labelKey: "consumer.context.documents", href: "/app/documents", section: "documents", context: "buying" as const },
  { labelKey: "consumer.context.mortgage", href: "/app/mortgage", section: "mortgage", context: "buying" as const },
  { labelKey: "consumer.context.insurance", href: "/app/insurance", section: "insurance", context: "buying" as const },
];

type NavKeyDef = {
  labelKey: string;
  href: string;
  section: string;
  context: ContextualNavItem["context"];
};

function mapNavKeys(keys: NavKeyDef[], t: TranslateFn): ContextualNavItem[] {
  return keys.map((item) => ({
    label: t(item.labelKey),
    href: item.href,
    section: item.section,
    context: item.context,
  }));
}

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

  getContextualNavItems(
    context: {
      hasBookingContext: boolean;
      hasRentingContext: boolean;
      hasBuyingContext: boolean;
    },
    t: TranslateFn,
  ) {
    const items: ContextualNavItem[] = [];

    if (context.hasBookingContext) items.push(...mapNavKeys(BOOKING_NAV_KEYS, t));
    if (context.hasRentingContext) items.push(...mapNavKeys(RENTING_NAV_KEYS, t));
    if (context.hasBuyingContext) items.push(...mapNavKeys(BUYING_NAV_KEYS, t));

    if (items.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  },
};
