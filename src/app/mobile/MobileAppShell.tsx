import { type ReactNode, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  ChevronRight,
  Compass,
  FileText,
  Heart,
  Home,
  HousePlus,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  Navigation,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  mobileLocationService,
  type GeoCoordinates,
} from "../../lib/mobile-location.service";
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

type MobileTab = "home" | "search" | "activity" | "saved" | "me";
type ListingType = "rental" | "sale" | "lease";

const listingTabs: Array<{ label: string; value: ListingType }> = [
  { label: "Rent", value: "rental" },
  { label: "Buy", value: "sale" },
  { label: "Lease", value: "lease" },
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

const validMobileTabs = new Set<MobileTab>(["home", "search", "activity", "saved", "me"]);

function getTabHref(tab: MobileTab) {
  return tab === "home" ? "/" : `/?tab=${tab}`;
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
    pathname.startsWith("/buyer-requests") ||
    pathname.startsWith("/projects")
  ) {
    return "search";
  }

  if (pathname.startsWith("/app")) {
    const section = getUserDashboardSection(pathname);

    if (["deals", "messages", "applications", "viewings", "payments", "insights", "concierge"].includes(section)) {
      return "activity";
    }

    if (["compare", "buying-tools", "saved", "alerts", "groups"].includes(section)) {
      return "saved";
    }

    return "me";
  }

  if (
    pathname.startsWith("/valuation") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/get-the-app") ||
    pathname.startsWith("/legal")
  ) {
    return "me";
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
  if (pathname.startsWith("/reviews")) return "Public reviews";
  if (pathname.startsWith("/buyer-requests")) return "Buyer requests";
  if (pathname.startsWith("/projects/")) return "Project";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/valuation")) return "Home valuation";
  if (pathname.startsWith("/get-the-app")) return "Get the app";
  if (pathname.startsWith("/legal/terms")) return "Terms of Use";
  if (pathname.startsWith("/legal/privacy")) return "Privacy Notice";
  if (pathname.startsWith("/app")) {
    if (pathname === "/app") return "Overview";

    const matchedRoute = USER_DASHBOARD_ROUTE_CONFIG.find(
      (route) =>
        route.section !== "overview" &&
        (route.href === pathname || pathname.startsWith(`${route.href}/`))
    );

    return matchedRoute?.label || "Dashboard";
  }

  return "Property Hub";
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
  const [listingType, setListingType] = useState<ListingType>("rental");
  const [query, setQuery] = useState("");
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
  const [userCoordinates, setUserCoordinates] = useState<GeoCoordinates | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<MobileCapturedPhoto[]>([]);
  const [scannedDocuments, setScannedDocuments] = useState<MobileScannedDocument[]>([]);
  const [pushStatus, setPushStatus] = useState<"idle" | "registered" | "denied" | "unsupported" | "failed">(
    "idle"
  );
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [appLockStatus, setAppLockStatus] = useState<MobileAppLockStatus>({
    enabled: false,
    locked: false,
    lockedAt: null,
  });
  const [appLockSheetOpen, setAppLockSheetOpen] = useState(false);
  const [appLockCode, setAppLockCode] = useState("");
  const [showSplash, setShowSplash] = useState(() => mobileNativeService.isNative());
  const [onboardingReady, setOnboardingReady] = useState(() => !mobileNativeService.isNative());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pullStartY = useRef<number | null>(null);

  const initialsSource = user?.user_metadata?.full_name || user?.email || "Property Hub";
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
    window.addEventListener("propertyhub:offline-queue-change", updateQueueCount);

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateQueueCount);
      window.removeEventListener("propertyhub:offline-queue-change", updateQueueCount);
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
    window.addEventListener("propertyhub:app-lock-change", updateAppLockStatus);

    return () => {
      cancelled = true;
      window.removeEventListener("propertyhub:app-lock-change", updateAppLockStatus);
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const activeTab = getCurrentMobileTab(location.pathname, searchParams);
  const isHomeRoute = location.pathname === "/";
  const matchingListings = useMemo(
    () =>
      listings.filter((listing) => {
        const property = listing.property || {};
        const haystack = [
          property.address,
          property.city,
          property.region,
          property.country,
          property.neighborhood,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (listing.listing_type !== listingType) return false;
        if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
        return true;
      }),
    [listingType, listings, normalizedQuery]
  );
  const filteredListings = useMemo(
    () => mobileLocationService.sortListingsByDistance(matchingListings, userCoordinates),
    [matchingListings, userCoordinates]
  );

  const featuredListing = filteredListings[0] || listings[0];
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

  const submitSearch = () => {
    const params = new URLSearchParams({
      listingType,
    });

    if (query.trim()) params.set("q", query.trim());
    navigate(`/search?${params.toString()}`);
  };

  const sortSearchNearMe = async () => {
    try {
      const coordinates = await mobileLocationService.getCurrentPosition();
      setUserCoordinates(coordinates);
      await mobileNativeService.impact();
      toast.success("Search sorted by distance from you.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not get your location.");
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

    navigate(notification.action_url || "/?tab=activity");
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

    const content = fieldNote.trim() || "Draft saved from Property Hub mobile.";
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
      return (
        <>
          <MobilePaneHeader
            eyebrow="Ghana property market"
            title="Discover"
            subtitle="Fresh homes, verified teams, and the clearest next step."
            action={
              <Link
                to={getTabHref("me")}
                className="mobile-icon-button"
                aria-label="Open profile"
                title="Profile"
              >
                {user ? initials : <UserRound aria-hidden="true" />}
              </Link>
            }
          />

          <form
            className="mobile-search-bar"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Accra, Labone, East Legon"
            />
            <button type="submit" className="mobile-search-submit" aria-label="Search">
              <ChevronRight aria-hidden="true" />
            </button>
          </form>

          <section className="mobile-segmented" aria-label="Listing type">
            {listingTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={listingType === tab.value ? "is-active" : ""}
                onClick={() => setListingType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </section>

          {featuredListing && (
            <section className="mobile-feature">
              <Link to={`/property/${featuredListing.id}`} className="mobile-feature-link">
                <img
                  src={getPropertyCoverImage(featuredListing.property)}
                  alt={featuredListing.property?.address || "Featured property"}
                />
                <div>
                  <span>{getListingLabel(featuredListing.listing_type)}</span>
                  <strong>{featuredListing.property?.address}</strong>
                  <p>{formatPrice(featuredListing.price, featuredListing.currency)}</p>
                </div>
              </Link>
            </section>
          )}

          {user && (
            <section className="mobile-section">
              <div className="mobile-section-heading">
                <h2>Continue</h2>
              </div>
              <div className="mobile-action-list mobile-grouped-list">
                <MobileShellTabLink
                  tab="activity"
                  icon={CalendarDays}
                  title="Activity"
                  detail="Open deal rooms, viewings, receipts, and active follow-up."
                />
                <MobileShellTabLink
                  tab="saved"
                  icon={Heart}
                  title="Saved"
                  detail="Jump back into favorites, comparisons, and your search alerts."
                />
                <MobileShellTabLink
                  tab="me"
                  icon={BriefcaseBusiness}
                  title="Account"
                  detail="Reach support, settings, and any workspace you belong to."
                />
              </div>
            </section>
          )}

          <section className="mobile-section">
            <div className="mobile-section-heading">
              <h2>Quick paths</h2>
            </div>
            <div className="mobile-quick-grid">
              <MobileQuickLink
                to="/projects"
                icon={Building2}
                title="Projects"
                detail="Browse developments and available units."
              />
              <MobileQuickLink
                to="/reviews"
                icon={ShieldCheck}
                title="Public reviews"
                detail="See trust signals before you reach out."
              />
              <MobileQuickLink
                to="/valuation"
                icon={HousePlus}
                title="Seller tools"
                detail="Estimate value or start listing your property."
              />
              <MobileQuickLink
                to="/get-the-app"
                icon={Compass}
                title="Get the app"
                detail="Install the native app when you need alerts and offline tools."
              />
            </div>
          </section>

          <section className="mobile-section">
            <div className="mobile-section-heading">
              <h2>Fresh listings</h2>
              <Link to="/search">View all</Link>
            </div>
            <div className="mobile-list">
              {loading ? (
                <>
                  <MobilePropertySkeleton />
                  <MobilePropertySkeleton />
                </>
              ) : (
                filteredListings.map((listing) => (
                  <MobilePropertyCard key={listing.id} listing={listing} />
                ))
              )}
            </div>
          </section>

          <section className="mobile-section">
            <div className="mobile-section-heading">
              <h2>Verified agencies</h2>
              <Link to="/agencies">Browse</Link>
            </div>
            <div className="mobile-agency-row">
              {agencies.map((agency) => (
                <Link
                  key={agency.id}
                  to={`/agencies/${agency.slug}`}
                  className="mobile-agency-chip"
                >
                  <img src={agency.logo_url || "https://placehold.co/80x80"} alt="" />
                  <span>{agency.name}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      );
    }

    if (activeTab === "search") {
      return (
        <section className="mobile-pane">
          <MobilePaneHeader
            eyebrow="Search"
            title="Find the right fit"
            subtitle="Start simple. Property Hub can narrow the details for you."
            action={
              <button
                type="button"
                className="mobile-toolbar-button"
                aria-label="Open quick filters"
                onClick={() => setSearchSheetOpen(true)}
              >
                <SlidersHorizontal aria-hidden="true" />
              </button>
            }
          />

          <form
            className="mobile-search-stack"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <label>
              <span>Location</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Neighborhood or city"
              />
            </label>
            <div className="mobile-segmented" aria-label="Listing type">
              {listingTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={listingType === tab.value ? "is-active" : ""}
                  onClick={() => setListingType(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="submit" className="mobile-primary-button">
              <Search aria-hidden="true" />
              Search listings
            </button>
            <button
              type="button"
              className="mobile-secondary-button"
              onClick={() => void sortSearchNearMe()}
            >
              <MapPin aria-hidden="true" />
              {userCoordinates ? "Sorted near you" : "Find near me"}
            </button>
          </form>

          <div className="mobile-action-list mobile-grouped-list">
            <MobileQuickLink
              to="/buyer-requests"
              icon={MessageCircle}
              title="Buyer requests"
              detail="See where demand is strongest before you list or buy."
            />
            <MobileQuickLink
              to="/guides"
              icon={MapPin}
              title="Area guides"
              detail="Open neighborhood context before narrowing results."
            />
            <MobileQuickLink
              to="/market-trends"
              icon={Compass}
              title="Market trends"
              detail="Check demand and pricing momentum before you commit."
            />
          </div>

          <div className="mobile-list">
            {loading ? (
              <>
                <MobilePropertySkeleton />
                <MobilePropertySkeleton />
              </>
            ) : (
              filteredListings.map((listing) => {
                const distanceLabel = userCoordinates
                  ? mobileLocationService.formatDistance(
                      mobileLocationService.distanceKm(userCoordinates, listing.property)
                    )
                  : null;

                return (
                  <MobilePropertyCard
                    key={listing.id}
                    listing={listing}
                    distanceLabel={distanceLabel}
                  />
                );
              })
            )}
          </div>

          <MobileBottomSheet
            open={searchSheetOpen}
            title="Quick filters"
            onClose={() => setSearchSheetOpen(false)}
          >
            <div className="mobile-sheet-section">
              <span>Listing type</span>
              <div className="mobile-segmented" aria-label="Sheet listing type">
                {listingTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={listingType === tab.value ? "is-active" : ""}
                    onClick={() => setListingType(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mobile-action-list mobile-grouped-list">
              <MobileQuickLink
                to="/search"
                icon={Search}
                title="More filters"
                detail="Add details only when you need more control."
              />
              <MobileQuickLink
                to="/app/alerts"
                icon={Bell}
                title="Create an alert"
                detail="Track this area and get notified when matching listings appear."
              />
            </div>
          </MobileBottomSheet>
        </section>
      );
    }

    if (activeTab === "activity") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <MobilePaneHeader
              eyebrow="Activity"
              title="Stay in motion"
              subtitle="Deal rooms, messages, payments, and upcoming viewings."
            />
            <EmptyState
              icon={CalendarDays}
              title="Sign in to track deals, viewings, and payment updates."
              body="This area keeps your in-progress buyer activity together in one stream."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-pane">
          <MobilePaneHeader
            eyebrow="Activity"
            title="Your live flow"
            subtitle="Keep deal rooms, confirmations, and receipts in one place."
            action={
              <Link
                to="/app/deals"
                className="mobile-toolbar-button"
                aria-label="Open dashboard deals"
              >
                <ShieldCheck aria-hidden="true" />
              </Link>
            }
          />

          <div className="mobile-stat-grid">
            <MobileStatCard
              label="Deal rooms"
              value={openDeals.length}
              helper="Active buyer threads."
            />
            <MobileStatCard
              label="Viewings"
              value={propertyViewings.length}
              helper="Requested or confirmed."
            />
            <MobileStatCard
              label="Messages"
              value={conversations.length}
              helper="Tracked conversations."
            />
            <MobileStatCard
              label="Payments"
              value={propertyPayments.length}
              helper="Receipts and checkouts."
            />
          </div>

          <div className="mobile-action-list mobile-grouped-list">
            <MobileQuickLink
              to="/app/deals"
              icon={ShieldCheck}
              title="Deal rooms"
              detail="Open negotiation, documents, and payment threads."
            />
            <MobileQuickLink
              to="/app/viewings"
              icon={CalendarDays}
              title="Viewings"
              detail="Check the next property visit or reschedule."
            />
            <MobileQuickLink
              to="/app/messages"
              icon={MessageCircle}
              title="Messages"
              detail="Continue the latest conversation with a listing team."
            />
            <MobileQuickLink
              to="/app/payments"
              icon={Wallet}
              title="Payments"
              detail="Review secure checkout and receipt status."
            />
          </div>

          <section className="mobile-section" id="notifications">
            <div className="mobile-section-heading">
              <h2>Notifications</h2>
              {unreadNotifications > 0 ? (
                <button
                  type="button"
                  className="mobile-text-button"
                  onClick={() => void handleMarkAllNotificationsRead()}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            {notifications.length ? (
              <div className="mobile-list">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`mobile-card mobile-notification-card ${
                      notification.read ? "" : "is-unread"
                    }`}
                    onClick={() => void handleNotificationOpen(notification)}
                  >
                    <div className="mobile-notification-header">
                      <strong>{notification.subject || "Notification"}</strong>
                      {!notification.read && <span>New</span>}
                    </div>
                    <p>{notification.content || "Open Property Hub to review the latest update."}</p>
                    <small>{formatRelativeTime(notification.created_at)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Bell}
                title="No notifications yet."
                body="Updates about viewings, messages, offers, and receipts will land here."
              />
            )}
          </section>

          <section className="mobile-section">
            <div className="mobile-section-heading">
              <h2>Upcoming viewings</h2>
              <Link to="/app/viewings">View all</Link>
            </div>
            {upcomingViewings.length ? (
              <div className="mobile-list">
                {upcomingViewings.map((viewing) => (
                  <CardPreview
                    key={viewing.id}
                    title={viewing.listing?.property?.address || "Property viewing"}
                    subtitle={formatViewingTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                    detail={viewing.organization?.name || "Property team"}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No viewings booked yet."
                body="Book a viewing from a listing page and it will show up here."
                action={{ label: "Browse listings", to: "/search" }}
              />
            )}
          </section>

          {recentMessages.length > 0 && (
            <section className="mobile-section">
              <div className="mobile-section-heading">
                <h2>Recent messages</h2>
                <Link to="/app/messages">Open inbox</Link>
              </div>
              <div className="mobile-list">
                {recentMessages.map((conversation) => (
                  <CardPreview
                    key={conversation.id || conversation.conversation_id}
                    title={conversation.organization?.name || "Property team"}
                    subtitle={conversation.messages?.[0]?.content || "Conversation update"}
                    detail={formatRelativeTime(conversation.updated_at || conversation.created_at)}
                  />
                ))}
              </div>
            </section>
          )}
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
        <section className="mobile-pane">
          <MobilePaneHeader
            eyebrow="Saved"
            title="Your shortlist"
            subtitle={`${saved.length} saved properties and ${savedAlerts.length} active alerts.`}
            action={
              <Link to="/app/compare" className="mobile-toolbar-button" aria-label="Compare saved listings">
                <Heart aria-hidden="true" />
              </Link>
            }
          />

          <div className="mobile-action-list mobile-grouped-list">
            <MobileQuickLink
              to="/app/compare"
              icon={Heart}
              title="Compare saved listings"
              detail="Open side-by-side price, trust, and location context."
            />
            <MobileQuickLink
              to="/app/buying-tools"
              icon={Wallet}
              title="Buying guide"
              detail="Let Property Hub explain costs, timing, and remote-buyer steps."
            />
            <MobileQuickLink
              to="/app/alerts"
              icon={Bell}
              title="Saved alerts"
              detail="Pause, resume, or share the searches you track."
            />
          </div>

          {saved.length ? (
            <div className="mobile-list">
              {saved.map((item) => (
                <MobilePropertyCard key={item.id} listing={item.listing || item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title="Your saved homes will appear here."
              body="Save properties from search or detail pages to build a shortlist."
              action={{ label: "Browse listings", to: "/search" }}
            />
          )}
        </section>
      );
    }

    return (
      <section className="mobile-pane">
        <MobilePaneHeader
          eyebrow="Me"
          title={user ? "Account" : "Profile"}
          subtitle={
            user
              ? "Support, settings, and the right tools for your role."
              : "Sign in to unlock your dashboard, saved activity, and workspace tools."
          }
          action={
            user ? (
              <button
                type="button"
                className="mobile-icon-button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                title="Sign out"
              >
                {initials}
              </button>
            ) : null
          }
        />

        {user ? (
          <>
            <div className="mobile-profile-card">
              <div className="mobile-avatar">{initials}</div>
              <div>
                <strong>{user.user_metadata?.full_name || user.email}</strong>
                <p>{user.email}</p>
              </div>
              <Link to="/app" className="mobile-primary-link">
                Open dashboard
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="mobile-native-status">
              <div>
                <span>Offline queue</span>
                <strong>
                  {offlineQueueCount} item{offlineQueueCount === 1 ? "" : "s"}
                </strong>
                <p>Drafts stay safe until the app can send them.</p>
              </div>
              <div className="mobile-native-actions">
                <button
                  type="button"
                  className="mobile-secondary-button"
                  onClick={() => void syncOfflineQueue()}
                  disabled={isSyncingOffline || offlineQueueCount === 0}
                >
                  {isSyncingOffline ? (
                    <Loader2 aria-hidden="true" className="mobile-spin" />
                  ) : (
                    <RefreshCw aria-hidden="true" />
                  )}
                  Send drafts
                </button>
                <button
                  type="button"
                  className="mobile-secondary-button"
                  onClick={() => void enablePushNotifications()}
                >
                  <Bell aria-hidden="true" />
                  {pushStatus === "registered" ? "Alerts on" : "Turn on alerts"}
                </button>
              </div>
            </div>

            <div className="mobile-action-list mobile-grouped-list">
              <MobileQuickLink
                to="/app/referrals"
                icon={Compass}
                title="Referrals"
                detail="Share trusted listings and review your referral activity."
              />
              <MobileQuickLink
                to="/app/support"
                icon={ShieldCheck}
                title="Get help"
                detail="Open support, aftercare, and property handoff help."
              />
              <MobileQuickLink
                to="/app/verification"
                icon={KeyRound}
                title="Verify safely"
                detail="Send buyer ID, title, or address checks without learning the process."
              />
              <MobileQuickLink
                to="/app/settings"
                icon={UserRound}
                title="Settings"
                detail="Manage password, security, and account preferences."
              />
              <button
                type="button"
                className="mobile-quick-link mobile-quick-button"
                onClick={openAppLockSheet}
              >
                <div className="mobile-quick-link-icon">
                  <KeyRound aria-hidden="true" />
                </div>
                <div>
                  <strong>App lock</strong>
                  <p>
                    {appLockStatus.enabled
                      ? appLockStatus.locked
                        ? `Locked until you verify your code or use ${appLockStatus.biometryLabel.toLowerCase()}.`
                        : appLockStatus.nativeUnlockAvailable
                          ? `Use ${appLockStatus.biometryLabel.toLowerCase()} or a local code before sensitive mobile use.`
                          : "Require a code before sensitive mobile use."
                      : "Add a local code lock for this device."}
                  </p>
                </div>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>

            <section className="mobile-section">
              <div className="mobile-section-heading">
                <h2>Seller tools</h2>
              </div>
              <div className="mobile-action-list mobile-grouped-list">
                <MobileQuickLink
                  to="/valuation"
                  icon={HousePlus}
                  title="Home valuation"
                  detail="Estimate a pricing range before listing or calling an agent."
                />
                <MobileQuickLink
                  to={`${WORKSPACE_ENTRY_PATH}?next=new`}
                  icon={Camera}
                  title="Start a listing"
                  detail="Property Hub guides the details and checks in the background."
                />
              </div>
            </section>

            {hasWorkspaceAccess && (
              <section className="mobile-section">
              <div className="mobile-section-heading">
                <h2>Workspace</h2>
              </div>
              <div className="mobile-action-list mobile-grouped-list">
                <MobileQuickLink
                  to={workspacePath}
                  icon={BriefcaseBusiness}
                  title="Open workspace"
                  detail="Jump into leads, documents, payments, and team work."
                />
                {organizations.map((item) => {
                  const organization = item.organization || item;
                  return (
                    <MobileQuickLink
                      key={organization.id}
                      to={`/workspace/${organization.slug}`}
                      icon={Building2}
                      title={organization.name}
                      detail="Open this workspace directly."
                    />
                  );
                })}
              </div>

              <section className="mobile-agent-kit">
                <div className="mobile-section-heading">
                  <h2>Field kit</h2>
                </div>
                <div className="mobile-agent-grid">
                  <button type="button" onClick={captureLocation}>
                    <Navigation aria-hidden="true" />
                    <span>Save location</span>
                  </button>
                  <button type="button" onClick={() => void captureListingPhoto()}>
                    <Camera aria-hidden="true" />
                    <span>Add photos</span>
                  </button>
                  <button type="button" onClick={() => void scanDealDocument()}>
                    <FileText aria-hidden="true" />
                    <span>Scan document</span>
                  </button>
                  <Link to="/app/payments">
                    <Wallet aria-hidden="true" />
                    <span>Receipts</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toast.message("Voice notes are queued for native recording setup.")}
                  >
                    <Mic aria-hidden="true" />
                    <span>Voice note</span>
                  </button>
                </div>
                {lastLocation && <p className="mobile-agent-location">Last GPS: {lastLocation}</p>}
                {capturedPhotos.length > 0 && (
                  <div className="mobile-capture-strip" aria-label="Queued photos">
                    {capturedPhotos.map((photo) => (
                      <div key={photo.id} className="mobile-capture-thumb">
                        {photo.webPath ? <img src={photo.webPath} alt="" /> : <Camera aria-hidden="true" />}
                      </div>
                    ))}
                  </div>
                )}
                {scannedDocuments.length > 0 && (
                  <div className="mobile-capture-strip" aria-label="Queued scanned documents">
                    {scannedDocuments.map((scan) => (
                      <div key={scan.id} className="mobile-capture-thumb">
                        {scan.photo.webPath ? (
                          <img src={scan.photo.webPath} alt="" />
                        ) : (
                          <FileText aria-hidden="true" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  value={fieldNote}
                  onChange={(event) => setFieldNote(event.target.value)}
                  placeholder="Quick note from a viewing, inspection, or owner handoff"
                />
                <button type="button" className="mobile-primary-button" onClick={() => void saveFieldNote()}>
                  Save note
                </button>
                <div className="mobile-draft-grid" aria-label="Offline draft actions">
                  <button type="button" onClick={() => void saveOfflineDraft("message-draft")}>
                    Message
                  </button>
                  <button type="button" onClick={() => void saveOfflineDraft("offer-draft")}>
                    Offer
                  </button>
                  <button type="button" onClick={() => void saveOfflineDraft("viewing-request")}>
                    Viewing
                  </button>
                  <button type="button" onClick={() => void saveOfflineDraft("maintenance-report")}>
                    Maintenance
                  </button>
                </div>
              </section>
            </section>
            )}

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
              that Property Hub guides, AI help, alerts, drafts, support, and marketplace data are
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
        title="Unlock Property Hub"
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
        className="mobile-app-shell"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showSplash && (
          <section className="mobile-splash" aria-label="Property Hub is opening">
            <div className="mobile-splash-orb">
              <Home aria-hidden="true" />
            </div>
            <div>
              <p>Property Hub</p>
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
                  <p className="mobile-eyebrow">Property Hub mobile</p>
                  <h1>{routeTitle}</h1>
                </div>
                {user ? (
                  <Link
                    to="/?tab=activity"
                    className="mobile-route-notifications"
                    aria-label="Open activity"
                  >
                    <Bell aria-hidden="true" />
                    {unreadNotifications > 0 ? (
                      <strong>{unreadNotifications > 99 ? "99+" : unreadNotifications}</strong>
                    ) : null}
                  </Link>
                ) : (
                  <Link
                    to={getTabHref("me")}
                    className="mobile-route-notifications"
                    aria-label="Open account"
                  >
                    <UserRound aria-hidden="true" />
                  </Link>
                )}
              </header>
              <div className="mobile-route-body">{children}</div>
            </section>
          )}
        </div>
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
            active={activeTab === "activity"}
            icon={CalendarDays}
            label="Activity"
            to={getTabHref("activity")}
            badge={activityBadgeCount}
          />
          <MobileTabButton
            active={activeTab === "saved"}
            icon={Heart}
            label="Saved"
            to={getTabHref("saved")}
            badge={savedBadgeCount}
          />
          <MobileTabButton
            active={activeTab === "me"}
            icon={UserRound}
            label="Me"
            to={getTabHref("me")}
            badge={accountBadgeCount}
          />
        </nav>
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
