import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react";

export type ConsumerSection =
  | "overview"
  | "saved"
  | "messages"
  | "applications"
  | "viewings"
  | "alerts"
  | "payments"
  | "wallet"
  | "leases"
  | "maintenance"
  | "trips"
  | "reservations"
  | "documents"
  | "transactions"
  | "home"
  | "notifications"
  | "mortgage"
  | "insurance"
  | "vendors"
  | "settings";

export type PageConfig = {
  title: string;
  description: string;
  breadcrumb?: { label: string; href?: string }[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
};

export const CONSUMER_PAGE_CONFIG: Record<ConsumerSection, PageConfig> = {
  overview: {
    title: "My BaytMiftah",
    description: "Your home for saved properties, bookings, leases, offers, and payments.",
    breadcrumb: [{ label: "My BaytMiftah" }],
  },
  saved: {
    title: "Saved Properties",
    description: "Properties you've bookmarked for later.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Saved" }],
    emptyTitle: "You haven't saved any properties yet",
    emptyDescription:
      "Explore properties and tap the heart icon to build your shortlist.",
    emptyActionLabel: "Explore Properties",
    emptyActionHref: "/search",
  },
  messages: {
    title: "Messages",
    description: "Conversations with agents, hosts, and property teams.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Messages" }],
    emptyTitle: "No conversations yet",
    emptyDescription:
      "Once you contact an agent or host, your conversations will appear here.",
    emptyActionLabel: "Browse Listings",
    emptyActionHref: "/search",
  },
  applications: {
    title: "Offers & Applications",
    description: "Rental, lease, and purchase workflows in one place.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Offers" }],
    emptyTitle: "No active applications yet",
    emptyDescription:
      "Send an inquiry on a property to start a rental, lease, or purchase flow.",
    emptyActionLabel: "Find a Property",
    emptyActionHref: "/search",
  },
  viewings: {
    title: "Viewings",
    description: "Requested and confirmed property visits.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Viewings" }],
    emptyTitle: "No viewings scheduled",
    emptyDescription: "Book a viewing from a property page and it will appear here.",
    emptyActionLabel: "Browse Listings",
    emptyActionHref: "/search",
  },
  alerts: {
    title: "Saved Alerts",
    description: "Search alerts watching the market for you.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Alerts" }],
    emptyTitle: "No saved alerts",
    emptyDescription: "Save a search from Explore and matching listings will notify you.",
    emptyActionLabel: "Explore Properties",
    emptyActionHref: "/search",
  },
  payments: {
    title: "Wallet & Payments",
    description: "Balance, escrow, receipts, and Paystack history.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Payments" }],
    emptyTitle: "Your wallet is empty",
    emptyDescription: "Use your wallet to pay deposits, rent, and booking fees.",
    emptyActionLabel: "Browse Listings",
    emptyActionHref: "/search",
  },
  wallet: {
    title: "Wallet",
    description: "Available balance, escrow holds, and payout requests.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Wallet" }],
    emptyTitle: "Your wallet is empty",
    emptyDescription: "Complete a payment to activate your BaytMiftah wallet.",
    emptyActionLabel: "Browse Listings",
    emptyActionHref: "/search",
  },
  leases: {
    title: "Leases",
    description: "Active tenancies, rent due dates, and property details.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Leases" }],
    emptyTitle: "You don't have an active lease",
    emptyDescription:
      "When you rent through BaytMiftah, your lease, payments, and maintenance requests will appear here.",
    emptyActionLabel: "Find Rentals",
    emptyActionHref: "/search?listingType=rental",
  },
  maintenance: {
    title: "Maintenance",
    description: "Report issues and hire verified vendors.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Maintenance" }],
    emptyTitle: "No maintenance requests",
    emptyDescription: "Submit a request from an active lease when something needs fixing.",
    emptyActionLabel: "View Leases",
    emptyActionHref: "/app/leases",
  },
  trips: {
    title: "Trips",
    description: "Upcoming and recent short-stay bookings.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Trips" }],
    emptyTitle: "No upcoming trips",
    emptyDescription: "Book a short stay and your trip details will show up here.",
    emptyActionLabel: "Explore Short Stays",
    emptyActionHref: "/search?listingType=short_stay",
  },
  reservations: {
    title: "Reservations",
    description: "All short-stay reservation history.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Reservations" }],
    emptyTitle: "No reservations yet",
    emptyDescription: "Your short-stay booking history will appear here after your first stay.",
    emptyActionLabel: "Explore Short Stays",
    emptyActionHref: "/search?listingType=short_stay",
  },
  documents: {
    title: "Documents",
    description: "IDs, leases, sale agreements, receipts, and more.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Documents" }],
    emptyTitle: "No documents yet",
    emptyDescription: "Documents shared with you will appear in folders here.",
    emptyActionLabel: "View Offers",
    emptyActionHref: "/app/applications",
  },
  transactions: {
    title: "Transactions",
    description: "Deposits, installments, and escrow-backed payments.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Transactions" }],
    emptyTitle: "No purchase transactions yet",
    emptyDescription: "Deposits and installments from active offers will appear here.",
    emptyActionLabel: "View Offers",
    emptyActionHref: "/app/applications",
  },
  home: {
    title: "My Home",
    description: "Smart building tools for your active lease.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "My Home" }],
    emptyTitle: "No resident profile yet",
    emptyDescription: "Complete a lease to unlock door access, utilities, and announcements.",
    emptyActionLabel: "Find Rentals",
    emptyActionHref: "/search?listingType=rental",
  },
  notifications: {
    title: "Notifications",
    description: "Messages, transactions, bookings, maintenance, and system updates.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Notifications" }],
    emptyTitle: "You're all caught up",
    emptyDescription: "New notifications about bookings, payments, and messages will appear here.",
    emptyActionLabel: "Explore Properties",
    emptyActionHref: "/search",
  },
  mortgage: {
    title: "Mortgage Marketplace",
    description: "Compare lenders, estimate payments, and request introductions.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Mortgage" }],
    emptyTitle: "No inquiries yet",
    emptyDescription: "Browse mortgage partners and submit a quote request.",
    emptyActionLabel: "Browse for Sale",
    emptyActionHref: "/search?listingType=sale",
  },
  insurance: {
    title: "Insurance Marketplace",
    description: "Home and contents cover from verified Ghana insurers.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Insurance" }],
    emptyTitle: "No insurance inquiries yet",
    emptyDescription: "Request quotes from partner insurers for your property.",
    emptyActionLabel: "Browse for Sale",
    emptyActionHref: "/search?listingType=sale",
  },
  vendors: {
    title: "Vendor Marketplace",
    description: "Verified maintenance and property service providers.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Vendors" }],
    emptyTitle: "No vendors in this category",
    emptyDescription: "Check another category or submit a maintenance request from your lease.",
    emptyActionLabel: "Maintenance",
    emptyActionHref: "/app/maintenance",
  },
  settings: {
    title: "Profile & Settings",
    description: "Manage your account and session preferences.",
    breadcrumb: [{ label: "My BaytMiftah", href: "/app" }, { label: "Profile" }],
  },
};

export const CONSUMER_PRIMARY_NAV = [
  { label: "Home", href: "/app", icon: Home, section: "overview" as const },
  { label: "Explore", href: "/search", icon: Search, section: null },
  { label: "Saved", href: "/app/saved", icon: Heart, section: "saved" as const },
  { label: "Messages", href: "/app/messages", icon: MessageCircle, section: "messages" as const },
  { label: "Profile", href: "/app/settings", icon: Settings, section: "settings" as const },
];
