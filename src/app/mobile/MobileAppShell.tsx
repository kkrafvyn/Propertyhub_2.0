import { type ReactNode, type TouchEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Bell,
  Bath,
  BedDouble,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarDays,
  Camera,
  ChevronRight,
  CheckCircle2,
  Compass,
  Crown,
  FileText,
  GraduationCap,
  Globe2,
  Heart,
  Home,
  HousePlus,
  KeyRound,
  Landmark,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  MapPin,
  Navigation,
  Phone,
  Shield,
  RefreshCw,
  Search,
  ShieldCheck,
  Share2,
  SlidersHorizontal,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { APP_THEME_OPTIONS, useAppTheme } from "../context/AppThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  getUserDashboardSection,
  USER_DASHBOARD_ROUTE_CONFIG,
} from "../features/expansion/section-navigation";
import { communicationService, type NotificationRecord } from "../../lib/communication.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { listingService } from "../../lib/listing.service";
import { messageService } from "../../lib/message.service";
import { mobileAppLockService, type MobileAppLockStatus } from "../../lib/mobile-app-lock.service";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import {
  mobileDocumentScannerService,
  type MobileScannedDocument,
} from "../../lib/mobile-document-scanner.service";
import { mobileMediaService, type MobileCapturedPhoto } from "../../lib/mobile-media.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { mobileOnboardingService } from "../../lib/mobile-onboarding.service";
import { mobileOfflineQueueService } from "../../lib/mobile-offline-queue.service";
import { mobileOfflineSyncService } from "../../lib/mobile-offline-sync.service";
import { organizationService } from "../../lib/organization.service";
import { paymentService } from "../../lib/payment.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import { getPropertyCoverImage } from "../../lib/property-media";
import { pushNotificationService } from "../../lib/push-notification.service";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { MobileShellProvider } from "./MobileShellContext";
import "./mobile.css";

type MobileTab = "home" | "search" | "saved" | "messages" | "profile";

const mobileHomeCategories: Array<{
  label: string;
  detail: string;
  icon: typeof Home;
}> = [
  { label: "Apartments", detail: "340+ verified", icon: Building2 },
  { label: "Family Homes", detail: "190+ ready", icon: Home },
  { label: "Offices", detail: "80+ spaces", icon: BriefcaseBusiness },
  { label: "Luxury", detail: "Private picks", icon: Crown },
  { label: "Student Housing", detail: "Near campus", icon: GraduationCap },
];

const mobileHomeIntentFilters = [
  { label: "Rent", to: "/search?listingType=rental" },
  { label: "Buy", to: "/search?listingType=sale" },
  { label: "Short Stay", to: "/search?q=short%20stay" },
  { label: "Land", to: "/search?propertyType=land" },
  { label: "Commercial", to: "/search?propertyType=office" },
];

const mobileTrustIndicators: Array<{
  title: string;
  detail: string;
  icon: typeof Home;
}> = [
  { title: "Verified Properties", detail: "Reviewed documents and active moderation.", icon: ShieldCheck },
  { title: "Verified Agencies", detail: "Approved teams with public reputation signals.", icon: Building },
  { title: "Secure Transactions", detail: "Provider-neutral payments with audit trails.", icon: Wallet },
  { title: "Fraud Protection", detail: "Reports, risk checks, and human review.", icon: CheckCircle2 },
];

const mobileFallbackListings = [
  {
    id: "demo-airport-residential",
    listing_type: "rental",
    price: 18000,
    currency: "GHS",
    quality_score: 82,
    organization: { verified: true },
    property: {
      address: "45 Liberation Road, Airport Residential",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Airport Residential",
      bedrooms: 2,
      bathrooms: 2,
      category: "Apartment",
    },
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-labone-apartment",
    listing_type: "rental",
    price: 6200,
    currency: "GHS",
    quality_score: 79,
    organization: { verified: true },
    property: {
      address: "12 Fifth Avenue, Labone",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Labone",
      bedrooms: 2,
      bathrooms: 2,
      category: "Apartment",
    },
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-cantonments-villa",
    listing_type: "sale",
    price: 3200000,
    currency: "GHS",
    quality_score: 91,
    organization: { verified: true },
    property: {
      address: "7 Second Rangoon Close, Cantonments",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Cantonments",
      bedrooms: 3,
      bathrooms: 3,
      category: "Villa",
    },
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-east-legon-office",
    listing_type: "lease",
    price: 8500,
    currency: "GHS",
    quality_score: 84,
    organization: { verified: true },
    property: {
      address: "19 Lagos Avenue, East Legon",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      bedrooms: 4,
      bathrooms: 4,
      category: "Office",
    },
    image:
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileFallbackAgencies = [
  {
    id: "agency-accra-prime",
    name: "Accra Prime Homes",
    slug: "accra-prime-homes",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 42,
    rating: "4.9",
  },
  {
    id: "agency-coastal-realty",
    name: "Coastal Realty GH",
    slug: "coastal-realty-gh",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 31,
    rating: "4.8",
  },
  {
    id: "agency-urban-gate",
    name: "UrbanGate Properties",
    slug: "urban-gate-properties",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 28,
    rating: "4.7",
  },
];

const mobileAgentPreview = [
  {
    name: "Kwame Mensah",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "120",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Akosua Addo",
    role: "Property Consultant",
    rating: "4.8",
    deals: "98",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Kojo Asare",
    role: "Senior Realtor",
    rating: "4.7",
    deals: "89",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Ama Ofori",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "110",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop",
  },
];

const mobileOnboardingAcceptedItems = [
  "terms-of-use",
  "privacy-notice",
  "push-alerts-disclosure",
  "offline-drafts-disclosure",
  "buying-guide-disclaimer",
  "support-disclaimer",
] as const;

const mobileOnboardingSteps: Array<{
  title: string;
  detail: string;
  legal: string;
  icon: typeof Home;
}> = [
  {
    title: "Turn on alerts",
    detail: "Get listing, viewing, message, offer, and safety updates when you choose push notifications.",
    legal: "Alerts are optional and can be changed in device settings.",
    icon: Bell,
  },
  {
    title: "Send drafts",
    detail: "Keep notes, message drafts, offer drafts, photos, and documents safe until your phone is online.",
    legal: "Drafts may stay on this device until sent, deleted, or app data is cleared.",
    icon: FileText,
  },
  {
    title: "Buying guide",
    detail: "Use simple checklists for costs, timing, remote-buyer steps, and safer verification.",
    legal: "Guides are informational only and do not replace professional advice.",
    icon: Compass,
  },
  {
    title: "Get help",
    detail: "Reach support for account access, property handoff, aftercare, and next-step questions.",
    legal: "Support can route and explain workflows, but it is not legal, tax, valuation, or lending advice.",
    icon: MessageCircle,
  },
];

const validMobileTabs = new Set<MobileTab>(["home", "search", "saved", "messages", "profile"]);

function getTabHref(tab: MobileTab) {
  if (tab === "home") return "/";
  if (tab === "search") return "/search";
  return `/?tab=${tab}`;
}

function getActiveMobileTab(searchParams: URLSearchParams): MobileTab {
  const requested = searchParams.get("tab");
  return requested && validMobileTabs.has(requested as MobileTab)
    ? (requested as MobileTab)
    : "home";
}

function getPathDrivenMobileTab(pathname: string): MobileTab {
  if (
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/guides") ||
    pathname.startsWith("/market-trends") ||
    pathname.startsWith("/sold-ledger") ||
    pathname.startsWith("/buyer-requests") ||
    pathname.startsWith("/projects")
  ) {
    return "search";
  }

  if (pathname.startsWith("/app")) {
    const section = getUserDashboardSection(pathname);

    if (["deals", "messages", "applications", "viewings", "payments", "insights", "concierge"].includes(section)) {
      return "messages";
    }

    if (["compare", "buying-tools", "saved", "alerts", "groups"].includes(section)) {
      return "saved";
    }

    return "profile";
  }

  if (pathname.startsWith("/workspace")) {
    return "profile";
  }

  if (
    pathname.startsWith("/valuation") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/get-the-app") ||
    pathname.startsWith("/legal")
  ) {
    return "profile";
  }

  return "home";
}

function getCurrentMobileTab(pathname: string, searchParams: URLSearchParams): MobileTab {
  return pathname === "/" ? getActiveMobileTab(searchParams) : getPathDrivenMobileTab(pathname);
}

function getMobileRouteTitle(pathname: string) {
  if (pathname.startsWith("/property/")) return "Property";
  if (pathname.startsWith("/search")) return "Search results";
  if (pathname.startsWith("/agencies/")) return "Agency";
  if (pathname.startsWith("/agencies")) return "Agencies";
  if (pathname.startsWith("/guides/")) return "Area guide";
  if (pathname.startsWith("/guides")) return "Area guides";
  if (pathname.startsWith("/market-trends")) return "Market trends";
  if (pathname.startsWith("/sold-ledger")) return "Sold ledger";
  if (pathname.startsWith("/reviews")) return "Public reviews";
  if (pathname.startsWith("/buyer-requests")) return "Buyer requests";
  if (pathname.startsWith("/projects/")) return "Project";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/valuation")) return "Home valuation";
  if (pathname.startsWith("/get-the-app")) return "Get the app";
  if (pathname.startsWith("/legal/terms")) return "Terms of Use";
  if (pathname.startsWith("/legal/privacy")) return "Privacy Notice";
  if (pathname.startsWith("/workspace/accept")) return "Workspace invite";
  if (pathname.startsWith("/workspace")) return "Workspace";
  if (pathname.startsWith("/app")) {
    if (pathname === "/app") return "Overview";

    const matchedRoute = USER_DASHBOARD_ROUTE_CONFIG.find(
      (route) =>
        route.section !== "overview" &&
        (route.href === pathname || pathname.startsWith(`${route.href}/`))
    );

    return matchedRoute?.label || "Dashboard";
  }

  return "BaytMiftah";
}

function formatPrice(amount?: number | null, currency = "GHS") {
  if (!amount) return "Price on request";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatViewingTime(value?: string | null) {
  if (!value) return "Pending confirmation";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getListingLabel(type?: string) {
  if (type === "sale") return "For sale";
  if (type === "lease") return "Lease";
  return "For rent";
}

function MobilePaneHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mobile-nav-header">
      <div>
        <p className="mobile-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="mobile-nav-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="mobile-nav-action">{action}</div> : null}
    </header>
  );
}

function MobileQuickLink({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string;
  icon: typeof Home;
  title: string;
  detail: string;
}) {
  return (
    <Link to={to} className="mobile-quick-link">
      <div className="mobile-quick-link-icon">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}

function MobileShellTabLink({
  tab,
  icon,
  title,
  detail,
}: {
  tab: MobileTab;
  icon: typeof Home;
  title: string;
  detail: string;
}) {
  return <MobileQuickLink to={getTabHref(tab)} icon={icon} title={title} detail={detail} />;
}

function MobileStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="mobile-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function MobilePropertySkeleton() {
  return (
    <div className="mobile-card mobile-property-card mobile-skeleton-card" aria-hidden="true">
      <div className="mobile-skeleton mobile-skeleton-image" />
      <div className="mobile-property-body">
        <div className="mobile-skeleton mobile-skeleton-line short" />
        <div className="mobile-skeleton mobile-skeleton-line" />
        <div className="mobile-skeleton mobile-skeleton-line medium" />
        <div className="mobile-property-footer">
          <div className="mobile-skeleton mobile-skeleton-line short" />
          <div className="mobile-skeleton mobile-skeleton-pill" />
        </div>
      </div>
    </div>
  );
}

function MobileBottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mobile-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mobile-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="mobile-sheet-handle"
          aria-label="Close panel"
          onClick={onClose}
        />
        <header className="mobile-sheet-header">
          <h2>{title}</h2>
          <button type="button" className="mobile-text-button" onClick={onClose}>
            Done
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function MobilePropertyCard({
  listing,
  distanceLabel,
}: {
  listing: any;
  distanceLabel?: string | null;
}) {
  const property = listing.property || {};

  return (
    <Link to={`/property/${listing.id}`} className="mobile-card mobile-property-card">
      <img
        src={getPropertyCoverImage(property)}
        alt={property.address || "Property"}
        className="mobile-property-image"
      />
      <div className="mobile-property-body">
        <div className="mobile-property-meta">
          <span>{getListingLabel(listing.listing_type)}</span>
          {listing.organization?.verified && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Verified
            </span>
          )}
          {listing.quality_score >= 75 && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Trust {listing.quality_score}
            </span>
          )}
        </div>
        <h3>{property.address || "Ghana property"}</h3>
        <p>
          {[property.neighborhood, property.city, property.region].filter(Boolean).join(", ") || "Ghana"}
        </p>
        <div className="mobile-property-footer">
          <strong>{formatPrice(listing.price, listing.currency)}</strong>
          <span>{distanceLabel || (property.bedrooms ? `${property.bedrooms} bed` : property.category || "Property")}</span>
        </div>
      </div>
    </Link>
  );
}

function getMobileListingImage(listing: any, fallbackImage: string) {
  if (listing?.image) return listing.image;

  try {
    const cover = listing?.property ? getPropertyCoverImage(listing.property) : "";
    return cover || fallbackImage;
  } catch {
    return fallbackImage;
  }
}

function getMobileListingTitle(listing: any) {
  return listing?.property?.address || listing?.title || "Verified Ghana property";
}

function getMobileListingLocation(listing: any) {
  const property = listing?.property || {};
  return [property.neighborhood, property.city, property.region].filter(Boolean).join(", ") || "Accra, Ghana";
}

function getMobileListingBedrooms(listing: any) {
  return listing?.property?.bedrooms || listing?.bedrooms || 2;
}

function getMobileListingBathrooms(listing: any) {
  return listing?.property?.bathrooms || listing?.bathrooms || getMobileListingBedrooms(listing);
}

function getAgencyInitials(agency: any) {
  return (agency?.name || "BaytMiftah")
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getAgencyCoverImage(agency: any, index: number) {
  return (
    agency?.cover_image_url ||
    agency?.banner_url ||
    mobileFallbackAgencies[index % mobileFallbackAgencies.length]?.cover_image_url ||
    mobileFallbackAgencies[0].cover_image_url
  );
}

function MobileHomeSection({
  title,
  actionLabel = "See All",
  actionTo,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="mobile-luxe-section">
      <div className="mobile-luxe-section-heading">
        <h2>{title}</h2>
        {actionTo ? <Link to={actionTo}>{actionLabel}</Link> : null}
      </div>
      {children}
    </section>
  );
}

function MobileCategoryCard({
  label,
  detail,
  icon: Icon,
}: {
  label: string;
  detail: string;
  icon: typeof Home;
}) {
  return (
    <Link to={`/search?q=${encodeURIComponent(label)}`} className="mobile-luxe-category-card">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function MobileVerifiedAgentCard({
  agent,
}: {
  agent: (typeof mobileAgentPreview)[number];
}) {
  return (
    <article className="mobile-luxe-agent-card">
      <div className="mobile-luxe-agent-photo-wrap">
        <img src={agent.image} alt={agent.name} />
        <span aria-label="Verified agent">
          <ShieldCheck aria-hidden="true" />
        </span>
      </div>
      <strong>{agent.name}</strong>
      <p>{agent.role}</p>
      <div className="mobile-luxe-agent-stats">
        <span>{agent.rating} rating</span>
        <span>{agent.deals} listings</span>
      </div>
      <Link to="/app/messages" className="mobile-luxe-message-button">
        Message
      </Link>
    </article>
  );
}

function MobilePremiumListingCard({
  listing,
  index,
}: {
  listing: any;
  index: number;
}) {
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);

  return (
    <article className="mobile-luxe-listing-card">
      <Link to={`/property/${listing.id}`} className="mobile-luxe-listing-image-link">
        <img src={image} alt={getMobileListingTitle(listing)} />
        <span className="mobile-luxe-verified-badge">
          <ShieldCheck aria-hidden="true" />
          Verified
        </span>
      </Link>
      <button type="button" className="mobile-luxe-favorite" aria-label="Save property">
        <Heart aria-hidden="true" />
      </button>
      <div className="mobile-luxe-listing-body">
        <strong>{formatPrice(listing.price, listing.currency)}</strong>
        <Link to={`/property/${listing.id}`}>{getMobileListingTitle(listing)}</Link>
        <p>
          <MapPin aria-hidden="true" />
          {getMobileListingLocation(listing)}
        </p>
        <div className="mobile-luxe-listing-facts">
          <span>
            <BedDouble aria-hidden="true" />
            {getMobileListingBedrooms(listing)} bed
          </span>
          <span>
            <Bath aria-hidden="true" />
            {getMobileListingBathrooms(listing)} bath
          </span>
        </div>
      </div>
    </article>
  );
}

function MobileDarkPropertyCard({
  listing,
  index,
}: {
  listing: any;
  index: number;
}) {
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);

  return (
    <Link to={`/property/${listing.id}`} className="mobile-luxe-recent-card">
      <img src={image} alt={getMobileListingTitle(listing)} />
      <div>
        <strong>{getMobileListingTitle(listing)}</strong>
        <span>{formatPrice(listing.price, listing.currency)}</span>
      </div>
    </Link>
  );
}

function MobileSavedLuxeCard({
  item,
  index,
}: {
  item: any;
  index: number;
}) {
  const listing = item.listing || item;
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);
  const price = formatPrice(listing.price || fallback.price, listing.currency || fallback.currency);
  const title = getMobileListingTitle(listing);
  const bedrooms = getMobileListingBedrooms(listing);
  const bathrooms = getMobileListingBathrooms(listing);

  return (
    <Link to={`/property/${listing.id}`} className="mobile-saved-luxe-card">
      <div className="mobile-saved-luxe-image">
        <img src={image} alt={title} />
        {index === 0 ? <span>New Listing</span> : null}
        <button type="button" aria-label="Remove saved property" onClick={(event) => event.preventDefault()}>
          <Heart aria-hidden="true" />
        </button>
      </div>
      <div className="mobile-saved-luxe-body">
        <strong>{price}</strong>
        <h3>{title}</h3>
        <div>
          <span>
            <BedDouble aria-hidden="true" />
            {bedrooms}
          </span>
          <span>
            <Bath aria-hidden="true" />
            {bathrooms}
          </span>
          <span>
            <Landmark aria-hidden="true" />
            {listing.property?.area_sqm || listing.property?.square_feet || "Verified"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileProfileRow({
  icon: Icon,
  label,
  value,
  to,
  badge,
}: {
  icon: typeof Home;
  label: string;
  value?: string;
  to?: string;
  badge?: string;
}) {
  const content = (
    <>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      {badge ? <em>{badge}</em> : value ? <small>{value}</small> : null}
      <ChevronRight aria-hidden="true" />
    </>
  );

  if (to) {
    return (
      <Link to={to} className="mobile-profile-luxe-row">
        {content}
      </Link>
    );
  }

  return <div className="mobile-profile-luxe-row">{content}</div>;
}

function MobileProfileGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    icon: typeof Home;
    label: string;
    to: string;
    value?: string;
    badge?: string;
  }>;
}) {
  return (
    <section className="mobile-profile-luxe-group">
      <h3>{title}</h3>
      <div>
        {items.map((item) => (
          <MobileProfileRow key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

function MobileVerifiedAgencyCard({
  agency,
  index,
}: {
  agency: any;
  index: number;
}) {
  const cover = getAgencyCoverImage(agency, index);
  const listingsCount =
    agency?.active_listings_count || agency?.listing_count || agency?.listings_count || 24 + index * 7;
  const rating = agency?.rating || (4.9 - index * 0.1).toFixed(1);

  return (
    <article className="mobile-luxe-agency-card">
      <img src={cover} alt="" className="mobile-luxe-agency-cover" />
      <div className="mobile-luxe-agency-body">
        <div className="mobile-luxe-agency-logo">
          {agency?.logo_url ? <img src={agency.logo_url} alt="" /> : <span>{getAgencyInitials(agency)}</span>}
        </div>
        <div>
          <strong>{agency.name}</strong>
          <p>
            <ShieldCheck aria-hidden="true" />
            Verified agency
          </p>
        </div>
        <div className="mobile-luxe-agency-stats">
          <span>{listingsCount} listings</span>
          <span>
            <Star aria-hidden="true" />
            {rating}
          </span>
        </div>
        <Link to={`/agencies/${agency.slug || agency.id}`} className="mobile-luxe-agency-action">
          View Agency
        </Link>
      </div>
    </article>
  );
}

function MobileTrustIndicatorCard({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: typeof Home;
}) {
  return (
    <article className="mobile-luxe-trust-card">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Search;
  title: string;
  body?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mobile-empty">
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
      {action && (
        <Link to={action.to} className="mobile-primary-link">
          {action.label}
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function MobileTabButton({
  active,
  icon: Icon,
  label,
  to,
  badge,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  to: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`mobile-tab-button ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
      {badge && badge > 0 ? (
        <strong className="mobile-tab-badge">{badge > 99 ? "99+" : badge}</strong>
      ) : null}
    </Link>
  );
}

export function MobileAppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [propertyPayments, setPropertyPayments] = useState<any[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [fieldNote, setFieldNote] = useState("");
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<MobileCapturedPhoto[]>([]);
  const [scannedDocuments, setScannedDocuments] = useState<MobileScannedDocument[]>([]);
  const [pushStatus, setPushStatus] = useState<"idle" | "registered" | "denied" | "unsupported" | "failed">(
    "idle"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [appLockStatus, setAppLockStatus] = useState<MobileAppLockStatus>({
    enabled: false,
    locked: false,
    lockedAt: null,
    biometryAvailable: false,
    biometryLabel: null,
    deviceCredentialAvailable: false,
    nativeUnlockAvailable: false,
  });
  const [appLockSheetOpen, setAppLockSheetOpen] = useState(false);
  const [appLockCode, setAppLockCode] = useState("");
  const [showSplash, setShowSplash] = useState(() => mobileNativeService.isNative());
  const [onboardingReady, setOnboardingReady] = useState(() => !mobileNativeService.isNative());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pullStartY = useRef<number | null>(null);

  const initialsSource = user?.user_metadata?.full_name || user?.email || "BaytMiftah";
  const initials = initialsSource
    .split(/[ @.]/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [listingRows, agencyRows] = await Promise.all([
          listingService.getPublicListings(10, 0),
          organizationService.getVerifiedOrganizations(6),
        ]);

        if (!cancelled) {
          setListings(listingRows || []);
          setAgencies(agencyRows || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showSplash) return;

    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    let cancelled = false;

    const loadOnboardingStatus = async () => {
      if (!mobileNativeService.isNative()) {
        setOnboardingReady(true);
        setShowOnboarding(false);
        return;
      }

      try {
        const status = await mobileOnboardingService.getStatus();

        if (!cancelled) {
          setShowOnboarding(!status.completed);
          setOnboardingReady(true);
        }
      } catch {
        if (!cancelled) {
          setShowOnboarding(true);
          setOnboardingReady(true);
        }
      }
    };

    void loadOnboardingStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      setOrganizations([]);
      setDealCases([]);
      setConversations([]);
      setPropertyViewings([]);
      setPropertyPayments([]);
      setSavedAlerts([]);
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const loadPrivateData = async () => {
      const [
        savedRows,
        orgRows,
        dealRows,
        chatRows,
        viewingRows,
        paymentRows,
        alertRows,
        unreadCount,
        notificationRows,
      ] =
        await Promise.all([
          savedPropertyService.getSavedProperties(user.id).catch(() => []),
          organizationService.getUserOrganizations(user.id).catch(() => []),
          dealCaseService.getDealCasesByUser(user.id).catch(() => []),
          messageService.getUserConversations(user.id).catch(() => []),
          propertyViewingService.getUserViewings(user.id).catch(() => []),
          paymentService.getUserPropertyTransactions(user.id).catch(() => []),
          savedSearchAlertService.getUserAlerts(user.id).catch(() => []),
          communicationService.getUnreadCount(user.id).catch(() => 0),
          communicationService.getNotificationHistory(user.id, 4).catch(() => []),
        ]);

      if (!cancelled) {
        setSaved(savedRows || []);
        setOrganizations(orgRows || []);
        setDealCases(dealRows || []);
        setConversations(chatRows || []);
        setPropertyViewings(viewingRows || []);
        setPropertyPayments(paymentRows || []);
        setSavedAlerts(alertRows || []);
        setUnreadNotifications(unreadCount || 0);
        setNotifications(notificationRows || []);
      }
    };

    void loadPrivateData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const updateQueueCount = () => {
      void mobileOfflineQueueService.count().then((count) => {
        if (!cancelled) setOfflineQueueCount(count);
      });
    };

    updateQueueCount();
    window.addEventListener("online", updateQueueCount);
    window.addEventListener("baytmiftah:offline-queue-change", updateQueueCount);

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateQueueCount);
      window.removeEventListener("baytmiftah:offline-queue-change", updateQueueCount);
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    void mobileNativeService
      .watchPushOpens((url) => {
        navigate(mobileDeepLinkService.toAppPath(url));
      })
      .then((nextCleanup) => {
        if (mounted) cleanup = nextCleanup;
        else nextCleanup();
      });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const updateAppLockStatus = () => {
      void mobileAppLockService.getStatus().then((status) => {
        if (!cancelled) setAppLockStatus(status);
      });
    };

    updateAppLockStatus();
    window.addEventListener("baytmiftah:app-lock-change", updateAppLockStatus);

    return () => {
      cancelled = true;
      window.removeEventListener("baytmiftah:app-lock-change", updateAppLockStatus);
    };
  }, []);

  const activeTab = getCurrentMobileTab(location.pathname, searchParams);
  const isHomeRoute = location.pathname === "/";
  const homeListings = listings;

  const featuredListing = homeListings[0] || listings[0];
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=dashboard`;
  const hasWorkspaceAccess = organizations.length > 0;
  const openDeals = dealCases.filter(
    (dealCase) => !["won", "lost"].includes(dealCase.pipeline_stage || "")
  );
  const upcomingViewings = propertyViewings.slice(0, 2);
  const recentMessages = conversations.slice(0, 2);
  const routeTitle = getMobileRouteTitle(location.pathname);
  const activityBadgeCount =
    openDeals.length + propertyViewings.length + propertyPayments.length + unreadNotifications;
  const savedBadgeCount = saved.length + savedAlerts.length;
  const accountBadgeCount = organizations.length;
  const hasMobileTabBar = Boolean(user);
  const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "BaytMiftah user";
  const profileEmail = user?.email || "Add an email";
  const profilePhone = user?.phone || user?.user_metadata?.phone || "Add phone";
  const accountSubtitle = organizations.length
    ? `${organizations.length} workspace${organizations.length === 1 ? "" : "s"} connected`
    : "Premium Buyer Account";
  const currentThemeOption =
    APP_THEME_OPTIONS.find((option) => option.value === themePreference) || APP_THEME_OPTIONS[0];
  const profileAvatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.photo_url;
  const pushNotificationsEnabled = pushStatus === "registered";
  const locationServicesEnabled = Boolean(lastLocation);

  const cycleThemePreference = () => {
    const currentIndex = APP_THEME_OPTIONS.findIndex((option) => option.value === themePreference);
    const nextOption = APP_THEME_OPTIONS[(currentIndex + 1) % APP_THEME_OPTIONS.length];

    if (nextOption) {
      setThemePreference(nextOption.value);
      toast.success(`${nextOption.label} appearance selected.`);
    }
  };

  const refreshMobileData = async () => {
    try {
      setIsRefreshing(true);
      const [listingRows, agencyRows] = await Promise.all([
        listingService.getPublicListings(10, 0).catch(() => listings),
        organizationService.getVerifiedOrganizations(6).catch(() => agencies),
      ]);

      setListings(listingRows || []);
      setAgencies(agencyRows || []);

      if (user) {
        const [
          savedRows,
          orgRows,
          dealRows,
          chatRows,
          viewingRows,
          paymentRows,
          alertRows,
          unreadCount,
          notificationRows,
        ] = await Promise.all([
          savedPropertyService.getSavedProperties(user.id).catch(() => saved),
          organizationService.getUserOrganizations(user.id).catch(() => organizations),
          dealCaseService.getDealCasesByUser(user.id).catch(() => dealCases),
          messageService.getUserConversations(user.id).catch(() => conversations),
          propertyViewingService.getUserViewings(user.id).catch(() => propertyViewings),
          paymentService.getUserPropertyTransactions(user.id).catch(() => propertyPayments),
          savedSearchAlertService.getUserAlerts(user.id).catch(() => savedAlerts),
          communicationService.getUnreadCount(user.id).catch(() => unreadNotifications),
          communicationService.getNotificationHistory(user.id, 4).catch(() => notifications),
        ]);

        setSaved(savedRows || []);
        setOrganizations(orgRows || []);
        setDealCases(dealRows || []);
        setConversations(chatRows || []);
        setPropertyViewings(viewingRows || []);
        setPropertyPayments(paymentRows || []);
        setSavedAlerts(alertRows || []);
        setUnreadNotifications(unreadCount || 0);
        setNotifications(notificationRows || []);
      }

      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Mobile data refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (window.scrollY <= 4) {
      pullStartY.current = event.touches[0]?.clientY ?? null;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (pullStartY.current == null || isRefreshing) {
      pullStartY.current = null;
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? pullStartY.current;
    const distance = endY - pullStartY.current;
    pullStartY.current = null;

    if (distance > 72 && window.scrollY <= 4) {
      void refreshMobileData();
    }
  };

  const handleSettingsSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast.error("Couldn't sign you out right now.");
    }
  };

  const saveFieldNote = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const note = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `field-note-${Date.now()}`,
      note: fieldNote.trim() || "Quick field note",
      location: lastLocation,
      createdAt: new Date().toISOString(),
    };
    await mobileOfflineQueueService.enqueue("field-note", note);
    setOfflineQueueCount(await mobileOfflineQueueService.count());
    setFieldNote("");
    await mobileNativeService.impact();
    toast.success("Saved to offline queue.");
  };

  const syncOfflineQueue = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (offlineQueueCount === 0) {
      toast.message("Offline queue is already clear.");
      return;
    }

    try {
      setIsSyncingOffline(true);
      const result = await mobileOfflineSyncService.syncQueuedItems(user.id);

      setOfflineQueueCount(result.remaining);
      await mobileNativeService.impact();

      if (result.offline) {
        toast.message("You are offline. We will keep these items queued.");
        return;
      }

      if (result.failed > 0) {
        toast.error(
          `${result.failed} item${result.failed === 1 ? "" : "s"} need another try.`
        );
        return;
      }

      toast.success(
        result.synced > 0
          ? `Synced ${result.synced} queued item${result.synced === 1 ? "" : "s"}.`
          : "No queued items needed syncing."
      );
    } catch (error) {
      console.error("Failed to sync offline queue:", error);
      toast.error("We couldn't sync the offline queue yet.");
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const refreshAppLockStatus = async () => {
    setAppLockStatus(await mobileAppLockService.getStatus());
  };

  const openAppLockSheet = () => {
    setAppLockCode("");
    setAppLockSheetOpen(true);
  };

  const handleEnableAppLock = async () => {
    try {
      await mobileAppLockService.enable(appLockCode);
      await refreshAppLockStatus();
      setAppLockCode("");
      await mobileNativeService.impact();
      toast.success("App lock enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable app lock.");
    }
  };

  const handleVerifyAppLock = async () => {
    const verified = await mobileAppLockService.verify(appLockCode);
    setAppLockCode("");
    await refreshAppLockStatus();

    if (verified) {
      await mobileNativeService.impact();
      toast.success("App unlocked.");
      return;
    }

    toast.error("That app lock code did not match.");
  };

  const handleDeviceUnlock = async () => {
    const unlocked = await mobileAppLockService.unlockWithDevice();
    await refreshAppLockStatus();

    if (unlocked) {
      await mobileNativeService.impact();
      toast.success("Unlocked with device security.");
      return;
    }

    toast.error(appLockStatus.nativeUnlockReason || "Device unlock was not completed.");
  };

  const handleDisableAppLock = async () => {
    await mobileAppLockService.disable();
    await refreshAppLockStatus();
    setAppLockCode("");
    await mobileNativeService.impact();
    toast.success("App lock turned off.");
  };

  const handleLockNow = async () => {
    await mobileAppLockService.lock();
    await refreshAppLockStatus();
    setAppLockCode("");
    await mobileNativeService.impact();
    toast.success("App locked.");
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setLastLocation(value);
        toast.success("GPS captured for this visit.");
      },
      () => toast.error("Unable to capture GPS. Check location permissions."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getTabHref(activeTab));
  };

  const handleNotificationOpen = async (notification: NotificationRecord) => {
    if (!notification.read) {
      try {
        await communicationService.markAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
        setUnreadNotifications((current) => Math.max(0, current - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    navigate(notification.action_url || getTabHref("messages"));
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user || unreadNotifications === 0) {
      return;
    }

    try {
      await communicationService.markAllAsRead(user.id);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
      setUnreadNotifications(0);
      toast.success("Notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("We couldn't update your notifications.");
    }
  };

  const enablePushNotifications = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const result = await pushNotificationService.registerPush(user.id, {
        onOpenUrl: (url) => navigate(mobileDeepLinkService.toAppPath(url)),
      });

      setPushStatus(result.status);

      if (result.status === "registered") {
        await mobileNativeService.impact();
        toast.success("Push notifications are enabled.");
      } else if (result.status === "denied") {
        toast.error("Notification permission was denied.");
      } else if (result.status === "unsupported") {
        toast.error("Push notifications are not supported here.");
      } else {
        toast.error("Push notifications could not be enabled.");
      }
    } catch (error) {
      setPushStatus("failed");
      console.error("Failed to enable push notifications:", error);
      toast.error(error instanceof Error ? error.message : "Unable to enable push notifications.");
    }
  };

  const completeMobileOnboarding = async () => {
    try {
      await mobileOnboardingService.complete(mobileOnboardingAcceptedItems);
      setShowOnboarding(false);
      await mobileNativeService.impact();
      toast.success("Mobile onboarding complete.");
    } catch {
      toast.error("We could not save onboarding yet. Please try again.");
    }
  };

  const captureListingPhoto = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const photo = await mobileMediaService.capturePropertyPhoto();
      await mobileOfflineQueueService.enqueue("listing-photo", {
        photo,
        location: lastLocation,
        capturedBy: user.id,
      });
      setCapturedPhotos((current) => [photo, ...current].slice(0, 6));
      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Photo queued for listing upload.");
    } catch (error) {
      console.error("Failed to capture listing photo:", error);
      toast.error("We couldn't capture that photo.");
    }
  };

  const scanDealDocument = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const scan = await mobileDocumentScannerService.scanDocument(
        fieldNote.trim() ? `Scanned document - ${fieldNote.trim().slice(0, 36)}` : "Scanned deal document"
      );
      await mobileOfflineQueueService.enqueue("deal-document", {
        scan,
        title: scan.title,
        createdBy: user.id,
        location: lastLocation,
      });
      setScannedDocuments((current) => [scan, ...current].slice(0, 6));
      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Document scanned and queued.");
    } catch (error) {
      console.error("Failed to scan document:", error);
      toast.error("We couldn't scan that document.");
    }
  };

  const saveOfflineDraft = async (
    type: "message-draft" | "offer-draft" | "maintenance-report" | "viewing-request"
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const content = fieldNote.trim() || "Draft saved from BaytMiftah mobile.";
    const payload =
      type === "message-draft"
        ? { content, createdAt: new Date().toISOString() }
        : type === "offer-draft"
          ? { message: content, userId: user.id, createdAt: new Date().toISOString() }
          : type === "viewing-request"
            ? { requesterNote: content, userId: user.id, createdAt: new Date().toISOString() }
            : { note: content, location: lastLocation, createdAt: new Date().toISOString() };

    await mobileOfflineQueueService.enqueue(type, payload);
    setOfflineQueueCount(await mobileOfflineQueueService.count());
    setFieldNote("");
    await mobileNativeService.impact();
    toast.success("Draft saved to offline queue.");
  };

  const renderContent = () => {
    if (activeTab === "home") {
      const displayListings = homeListings.length > 0 ? homeListings : mobileFallbackListings;
      const heroListing = featuredListing || displayListings[0];
      const heroImage = getMobileListingImage(heroListing, mobileFallbackListings[0].image);
      const displayAgencies = agencies.length > 0 ? agencies : mobileFallbackAgencies;
      const profileHref = user ? getTabHref("profile") : "/login";
      const notificationsHref = user ? getTabHref("messages") : "/login";

      return (
        <section className="mobile-luxe-home" aria-label="BaytMiftah home">
          <header className="mobile-luxe-header">
            <Link to="/" className="mobile-luxe-brand" aria-label="BaytMiftah home">
              <span>
                <Home aria-hidden="true" />
              </span>
              <strong>BaytMiftah</strong>
            </Link>
            <Link to={notificationsHref} className="mobile-luxe-icon-button" aria-label="Open notifications">
              <Bell aria-hidden="true" />
              {unreadNotifications > 0 ? <span aria-label={`${unreadNotifications} unread`} /> : null}
            </Link>
            <Link to={profileHref} className="mobile-luxe-icon-button" aria-label="Open profile menu">
              {user ? <strong>{initials}</strong> : <Menu aria-hidden="true" />}
            </Link>
          </header>

          <section className="mobile-bolt-discovery" aria-label="Property discovery">
            <div className="mobile-bolt-location">
              <span>
                <MapPin aria-hidden="true" />
              </span>
              <div>
                <small>Current search area</small>
                <strong>Accra, Ghana</strong>
              </div>
              <Link to="/search" aria-label="Open search filters">
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </div>
            <Link to="/search" className="mobile-bolt-search" aria-label="Search by location, property, or agent">
              <Search aria-hidden="true" />
              <span>Search by location, property, or agent</span>
            </Link>
            <div className="mobile-bolt-intents" aria-label="Quick property intents">
              {mobileHomeIntentFilters.map((item, index) => (
                <Link key={item.label} to={item.to} className={index === 0 ? "is-active" : undefined}>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <MobileHomeSection title="Property Categories" actionTo="/search">
            <div className="mobile-luxe-category-row">
              {mobileHomeCategories.map((category) => (
                <MobileCategoryCard key={category.label} {...category} />
              ))}
            </div>
          </MobileHomeSection>

          <section className="mobile-luxe-hero" aria-label="Featured verified property">
            <img src={heroImage} alt={getMobileListingTitle(heroListing)} />
            <div className="mobile-luxe-hero-overlay" />
            <div className="mobile-luxe-hero-content">
              <span className="mobile-luxe-verified-badge">
                <ShieldCheck aria-hidden="true" />
                Verified Property
              </span>
              <h1>{getMobileListingTitle(heroListing)}</h1>
              <p>{getMobileListingLocation(heroListing)}</p>
              <Link to={`/property/${heroListing.id}`} className="mobile-luxe-hero-cta">
                Explore Property
              </Link>
            </div>
          </section>

          <MobileHomeSection title="Featured Listings" actionTo="/search">
            <div className="mobile-luxe-listing-row">
              {loading && listings.length === 0 ? (
                <>
                  <MobilePropertySkeleton />
                  <MobilePropertySkeleton />
                </>
              ) : (
                displayListings.slice(0, 4).map((listing, index) => (
                  <MobilePremiumListingCard key={listing.id} listing={listing} index={index} />
                ))
              )}
            </div>
          </MobileHomeSection>

          <MobileHomeSection title="Verified Agents" actionTo="/agencies">
            <div className="mobile-luxe-agent-row">
              {mobileAgentPreview.map((agent) => (
                <MobileVerifiedAgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          </MobileHomeSection>

          <MobileHomeSection title="Verified Agencies" actionTo="/agencies">
            <div className="mobile-luxe-agency-row">
              {displayAgencies.slice(0, 4).map((agency, index) => (
                <MobileVerifiedAgencyCard key={agency.id} agency={agency} index={index} />
              ))}
            </div>
          </MobileHomeSection>

          <MobileHomeSection title="Recently Viewed" actionTo="/app/saved">
            <div className="mobile-luxe-recent-row">
              {displayListings.slice(1, 5).map((listing, index) => (
                <MobileDarkPropertyCard key={listing.id} listing={listing} index={index + 1} />
              ))}
            </div>
          </MobileHomeSection>

          <MobileHomeSection title="Trust Built In">
            <div className="mobile-luxe-trust-grid">
              {mobileTrustIndicators.map((item) => (
                <MobileTrustIndicatorCard key={item.title} {...item} />
              ))}
            </div>
          </MobileHomeSection>
        </section>
      );
    }

    if (activeTab === "messages") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <MobilePaneHeader
              eyebrow="Messages"
              title="Stay connected"
              subtitle="Messages, deal rooms, payments, and upcoming viewings."
            />
            <EmptyState
              icon={MessageCircle}
              title="Sign in to track messages, deals, and viewing updates."
              body="This area keeps your in-progress buyer activity together in one stream."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-messages-luxe" aria-label="Messages">
          <header className="mobile-messages-luxe-header">
            <Link to="/" className="mobile-saved-luxe-location">
              <MapPin aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </Link>
            <div>
              <Link to="/search" aria-label="Search messages">
                <Search aria-hidden="true" />
              </Link>
              <Link to="/app/settings" aria-label="Message filters">
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="mobile-messages-luxe-title">
            <h1>Messages</h1>
            <div aria-label="Message filters">
              <button type="button" className="is-active">All</button>
              <button type="button">Unread</button>
            </div>
          </div>

          <div className="mobile-messages-luxe-list">
            {[
              {
                name: recentMessages[0]?.organization?.name || "Kwame Mensah",
                property: "45 Liberation Road • Airport",
                message: recentMessages[0]?.messages?.[0]?.content || "I've confirmed the private viewing window for tomorrow.",
                time: "2:45 PM",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&q=85&auto=format&fit=crop",
                unread: true,
              },
              {
                name: "Akosua Addo",
                property: "Cantonments Villa • Accra",
                message: "The agreement details are ready for review.",
                time: "Yesterday",
                image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=220&q=85&auto=format&fit=crop",
              },
              {
                name: "Kojo Asare",
                property: "East Legon Office",
                message: "The owner is open to a slight adjustment.",
                time: "Tue",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=220&q=85&auto=format&fit=crop",
              },
              {
                name: "Ama Ofori",
                property: "Labone Apartment",
                message: "Just received new photos and the viewing notes.",
                time: "Aug 12",
                image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=220&q=85&auto=format&fit=crop",
                unread: true,
              },
            ].map((message, index) => (
              <Link
                key={`${message.name}-${message.time}`}
                to="/app/messages"
                className={`mobile-messages-luxe-card ${index === 0 || index === 3 ? "is-featured" : ""}`}
              >
                <span className="mobile-messages-avatar">
                  <img src={message.image} alt="" />
                  <i className={message.unread ? "is-online" : ""} />
                </span>
                <span className="mobile-messages-copy">
                  <strong>{message.name}</strong>
                  <small>{message.property}</small>
                  <em>{message.message}</em>
                </span>
                <span className="mobile-messages-time">
                  {message.time}
                  {message.unread ? <i /> : null}
                </span>
              </Link>
            ))}
          </div>

          <Link to="/app/messages" className="mobile-messages-archive">
            Archive older conversations
          </Link>
        </section>
      );
    }

    if (activeTab === "saved") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <MobilePaneHeader
              eyebrow="Saved"
              title="Keep your shortlist"
              subtitle="Favorites, comparisons, alerts, and buyer planning."
            />
            <EmptyState
              icon={Heart}
              title="Log in to keep favorites, alerts, and comparisons together."
              body="Saved homes become more useful when your alerts and buyer tools sit beside them."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-saved-luxe" aria-label="Saved listings">
          <header className="mobile-saved-luxe-header">
            <div className="mobile-saved-luxe-location">
              <MapPin aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </div>
            <Link to="/app/alerts" aria-label="Saved alert filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <div className="mobile-saved-luxe-copy">
            <h1>Saved Listings</h1>
            <p>
              Your curated collection of verified properties. Compare your favorites and find
              your next sanctuary.
            </p>
          </div>

          <div className="mobile-saved-luxe-actions">
            <Link to="/app/saved" className="is-muted">
              Clear All
            </Link>
            <Link to="/app/compare">
              <Share2 aria-hidden="true" />
              Share List
            </Link>
          </div>

          {saved.length ? (
            <div className="mobile-saved-luxe-grid">
              {saved.map((item, index) => (
                <MobileSavedLuxeCard key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="mobile-saved-luxe-grid">
              {mobileFallbackListings.map((listing, index) => (
                <MobileSavedLuxeCard key={listing.id} item={{ listing }} index={index} />
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="mobile-profile-luxe">
        {user ? (
          <>
            <header className="mobile-profile-luxe-topbar">
              <Link to="/" className="mobile-saved-luxe-location">
                <MapPin aria-hidden="true" />
                <strong>BaytMiftah</strong>
              </Link>
              <Link to="/app/settings" aria-label="Profile settings">
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </header>

            <div className="mobile-profile-luxe-card">
              <div className="mobile-profile-luxe-avatar" aria-hidden="true">
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : <span>{initials}</span>}
                <button type="button" aria-label="Edit profile">
                  <Camera aria-hidden="true" />
                </button>
              </div>
              <h2>{profileName}</h2>
              <p>
                <ShieldCheck aria-hidden="true" />
                Platinum member
              </p>
            </div>

            <div className="mobile-profile-luxe-stats">
              <span><strong>{saved.length}</strong>Saved</span>
              <span><strong>{propertyViewings.length}</strong>Tours</span>
              <span><strong>{openDeals.length}</strong>Offered</span>
            </div>

            <MobileProfileGroup
              title="Account settings"
              items={[
                { icon: UserRound, label: "Personal Info", to: "/app/settings" },
                { icon: Shield, label: "Security", to: "/app/verification" },
                { icon: Bell, label: "Notifications", to: "/app/messages", badge: unreadNotifications ? `${unreadNotifications} New` : undefined },
              ]}
            />

            <MobileProfileGroup
              title="Property management"
              items={[
                { icon: Home, label: "My Listings", to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
                { icon: CalendarDays, label: "Scheduled Tours", to: "/app/viewings" },
                { icon: FileText, label: "Documents", to: "/app/documents" },
              ]}
            />

            <section className="mobile-profile-luxe-group">
              <h3>Preferences</h3>
              <div>
                <MobileProfileRow icon={Wallet} label="Currency" value="GHS" to="/app/settings" />
                <MobileProfileRow icon={Globe2} label="Language" value="English (GH)" to="/app/settings" />
                <button
                  type="button"
                  className="mobile-profile-luxe-row"
                  onClick={cycleThemePreference}
                  role="switch"
                  aria-checked={currentThemeOption.value === "pink"}
                >
                  <span><Moon aria-hidden="true" /></span>
                  <strong>App Theme</strong>
                  <i className={`mobile-profile-switch ${currentThemeOption.value === "pink" ? "is-on" : ""}`} />
                </button>
              </div>
            </section>

            <MobileProfileGroup
              title="Support"
              items={[
                { icon: Compass, label: "Help Center", to: "/app/support" },
                { icon: MessageCircle, label: "Contact Us", to: "/app/messages" },
                { icon: ShieldCheck, label: "Privacy Policy", to: "/legal/privacy" },
              ]}
            />

            <button type="button" className="mobile-profile-logout" onClick={() => void handleSettingsSignOut()}>
              <LogOut aria-hidden="true" />
              Logout {profileName.split(" ")[0] || "Account"}
            </button>

            <MobileBottomSheet
              open={appLockSheetOpen}
              title="App lock"
              onClose={() => setAppLockSheetOpen(false)}
            >
              <div className="mobile-sheet-section mobile-app-lock-sheet">
                <span>{appLockStatus.enabled ? "Security status" : "Create app lock"}</span>
                <p>
                  {appLockStatus.enabled
                    ? appLockStatus.nativeUnlockAvailable
                      ? `${appLockStatus.biometryLabel} is available. You can unlock with device security or your local backup code.`
                      : appLockStatus.nativeUnlockReason ||
                        "This device has a local app lock. Use your backup code to unlock."
                    : appLockStatus.nativeUnlockAvailable
                      ? `Set a local backup code. ${appLockStatus.biometryLabel} will be offered when the app is locked.`
                      : "Set a local code for this device. Native device unlock can be enabled once the platform supports it."}
                </p>
                <label>
                  <span>{appLockStatus.enabled && !appLockStatus.locked ? "Update code" : "App lock code"}</span>
                  <input
                    value={appLockCode}
                    onChange={(event) => setAppLockCode(event.target.value)}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="At least 4 characters"
                  />
                </label>

                {!appLockStatus.enabled ? (
                  <button
                    type="button"
                    className="mobile-primary-button"
                    onClick={() => void handleEnableAppLock()}
                  >
                    Enable app lock
                  </button>
                ) : appLockStatus.locked ? (
                  <div className="mobile-app-lock-actions">
                    {appLockStatus.nativeUnlockAvailable ? (
                      <button
                        type="button"
                        className="mobile-primary-button"
                        onClick={() => void handleDeviceUnlock()}
                      >
                        <ShieldCheck aria-hidden="true" />
                        Use {appLockStatus.biometryLabel}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={appLockStatus.nativeUnlockAvailable ? "mobile-secondary-button" : "mobile-primary-button"}
                      onClick={() => void handleVerifyAppLock()}
                    >
                      Unlock with code
                    </button>
                  </div>
                ) : (
                  <div className="mobile-app-lock-actions">
                    <button
                      type="button"
                      className="mobile-primary-button"
                      onClick={() => void handleEnableAppLock()}
                    >
                      Update code
                    </button>
                    <button
                      type="button"
                      className="mobile-secondary-button"
                      onClick={() => void handleLockNow()}
                    >
                      Lock now
                    </button>
                    <button
                      type="button"
                      className="mobile-text-button"
                      onClick={() => void handleDisableAppLock()}
                    >
                      Turn off app lock
                    </button>
                  </div>
                )}
              </div>
            </MobileBottomSheet>
          </>
        ) : (
          <>
            <EmptyState
              icon={KeyRound}
              title="Log in to manage searches, saved listings, payments, and workspace access."
              body="You can still browse public listings, reviews, projects, and valuation tools without signing in."
              action={{ label: "Log in", to: "/login" }}
            />

            <div className="mobile-action-list mobile-grouped-list">
              <MobileQuickLink
                to="/valuation"
                icon={HousePlus}
                title="Seller tools"
                detail="Estimate value or prepare to list a property."
              />
              <MobileQuickLink
                to="/reviews"
                icon={ShieldCheck}
                title="Public reviews"
                detail="Read trust signals before you reach out."
              />
            </div>
          </>
        )}
      </section>
    );
  };

  const renderMobileOnboarding = () => (
    <section
      className="mobile-onboarding"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-onboarding-title"
    >
      <div className="mobile-onboarding-card">
        <div className="mobile-onboarding-hero">
          <span>First run setup</span>
          <h1 id="mobile-onboarding-title">Start with confidence.</h1>
          <p>
            Before you use the mobile app, review the simple tools we surface here and the legal
            notices behind them.
          </p>
        </div>

        <div className="mobile-onboarding-actions" aria-label="Mobile onboarding features">
          {mobileOnboardingSteps.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="mobile-onboarding-action">
                <div className="mobile-onboarding-action-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <span>{item.legal}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mobile-onboarding-legal">
          <div className="mobile-onboarding-legal-icon">
            <ShieldCheck aria-hidden="true" />
          </div>
          <div>
            <strong>Legal acceptance</strong>
            <p>
              By continuing, you agree to the Terms of Use and Privacy Notice. You also understand
              that BaytMiftah guides, AI help, alerts, drafts, support, and marketplace data are
              workflow tools, not legal, tax, valuation, title, mortgage, or investment advice.
            </p>
            <div className="mobile-onboarding-legal-links">
              <Link to="/legal/terms">Terms of Use</Link>
              <Link to="/legal/privacy">Privacy Notice</Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mobile-primary-button mobile-onboarding-continue"
          onClick={() => void completeMobileOnboarding()}
        >
          I agree and continue
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );

  const renderAppLockGate = () => (
    <section className="mobile-pane mobile-lock-gate">
      <div className="mobile-lock-orb">
        <KeyRound aria-hidden="true" />
      </div>
      <MobilePaneHeader
        eyebrow="App lock"
        title="Unlock BaytMiftah"
        subtitle="Your mobile workspace is protected on this device."
      />
      <div className="mobile-app-lock-card">
        {appLockStatus.nativeUnlockAvailable ? (
          <button
            type="button"
            className="mobile-primary-button"
            onClick={() => void handleDeviceUnlock()}
          >
            <ShieldCheck aria-hidden="true" />
            Use {appLockStatus.biometryLabel}
          </button>
        ) : null}
        <label>
          <span>App lock code</span>
          <input
            value={appLockCode}
            onChange={(event) => setAppLockCode(event.target.value)}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter your code"
          />
        </label>
        <button
          type="button"
          className={appLockStatus.nativeUnlockAvailable ? "mobile-secondary-button" : "mobile-primary-button"}
          onClick={() => void handleVerifyAppLock()}
        >
          Unlock with code
        </button>
      </div>
    </section>
  );

  return (
    <MobileShellProvider value={{ isMobileShell: true }}>
      <main
        className={`mobile-app-shell ${hasMobileTabBar ? "has-mobile-tab-bar" : "is-guest-mobile-shell"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showSplash && (
          <section className="mobile-splash" aria-label="BaytMiftah is opening">
            <div className="mobile-splash-orb">
              <Home aria-hidden="true" />
            </div>
            <div>
              <p>BaytMiftah</p>
              <span>Verified homes, guided simply.</span>
            </div>
          </section>
        )}
        {onboardingReady && showOnboarding ? renderMobileOnboarding() : null}
        <div className={`mobile-refresh-indicator ${isRefreshing ? "is-active" : ""}`} aria-live="polite">
          <Loader2 aria-hidden="true" />
          <span>{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
        <div className="mobile-content">
          {appLockStatus.locked ? (
            renderAppLockGate()
          ) : isHomeRoute ? (
            renderContent()
          ) : (
            <section className="mobile-shell-route">
              <header className="mobile-route-header">
                <button
                  type="button"
                  className="mobile-route-back"
                  onClick={handleGoBack}
                  aria-label="Go back"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>
                <div>
                  <p className="mobile-eyebrow">BaytMiftah mobile</p>
                  <h1>{routeTitle}</h1>
                </div>
                {user ? (
                  <Link
                    to={getTabHref("messages")}
                    className="mobile-route-notifications"
                    aria-label="Open messages"
                  >
                    <Bell aria-hidden="true" />
                    {unreadNotifications > 0 ? (
                      <strong>{unreadNotifications > 99 ? "99+" : unreadNotifications}</strong>
                    ) : null}
                  </Link>
                ) : (
                  <Link
                    to={getTabHref("profile")}
                    className="mobile-route-notifications"
                    aria-label="Open profile"
                  >
                    <UserRound aria-hidden="true" />
                  </Link>
                )}
              </header>
              <div className="mobile-route-body">{children}</div>
            </section>
          )}
        </div>
        {hasMobileTabBar ? (
          <nav className="mobile-tab-bar" aria-label="Primary mobile navigation">
            <MobileTabButton
              active={activeTab === "home"}
              icon={Home}
              label="Home"
              to={getTabHref("home")}
            />
            <MobileTabButton
              active={activeTab === "search"}
              icon={Search}
              label="Search"
              to={getTabHref("search")}
            />
            <MobileTabButton
              active={activeTab === "saved"}
              icon={Heart}
              label="Saved"
              to={getTabHref("saved")}
              badge={savedBadgeCount}
            />
            <MobileTabButton
              active={activeTab === "messages"}
              icon={MessageCircle}
              label="Messages"
              to={getTabHref("messages")}
              badge={activityBadgeCount}
            />
            <MobileTabButton
              active={activeTab === "profile"}
              icon={UserRound}
              label="Profile"
              to={getTabHref("profile")}
              badge={accountBadgeCount}
            />
          </nav>
        ) : null}
      </main>
    </MobileShellProvider>
  );
}

function CardPreview({
  title,
  subtitle,
  detail,
}: {
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <div className="mobile-card mobile-inline-card">
      <strong>{title}</strong>
      <p>{subtitle}</p>
      <span>{detail}</span>
    </div>
  );
}
