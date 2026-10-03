import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Shield,
  UserCircle2,
  Wrench,
  QrCode,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useFinancialAccessGuard } from "../../hooks/useFinancialAccessGuard";
import { dealCaseService } from "../../../lib/dealcase.service";
import { messageService } from "../../../lib/message.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { savedSearchAlertService } from "../../../lib/saved-search-alert.service";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import { savedPropertyService } from "../../../lib/savedproperty.service";
import { getPropertyCoverImage } from "../../../lib/property-media";
import { userService } from "../../../lib/user.service";
import { walletService } from "../../../lib/wallet.service";
import { escrowService } from "../../../lib/escrow.service";
import { workflowOrchestratorService } from "../../../lib/workflow-orchestrator.service";
import { bookingService } from "../../../lib/booking.service";
import { tenantEsignatureService } from "../../../lib/tenant-esignature.service";
import { maintenanceService } from "../../../lib/maintenance.service";
import { leaseService } from "../../../lib/lease.service";
import { consumerContextService } from "../../../lib/consumer-context.service";
import { useTranslation } from "../../i18n/LocaleContext";
import { communicationService } from "../../../lib/communication.service";
import { residentHomeService } from "../../../lib/resident-home.service";
import { mortgageInsuranceService } from "../../../lib/mortgage-insurance.service";
import { CONSUMER_PAGE_CONFIG, CONSUMER_PRIMARY_NAV, CONSUMER_SECONDARY_NAV, type ConsumerSection } from "../../lib/consumer-page-config";
import {
  ActivityFeed,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  PageLayout,
  PageLoadingSkeleton,
} from "../../components/ux";
import {
  ApplicationsWorkflowSection,
  DocumentFoldersSection,
  MaintenanceWithVendorsSection,
  NotificationsCenterSection,
  ResidentHomeSection,
  WalletHubSection,
} from "./ConsumerPortalExtended";
import {
  InsuranceMarketplaceSection,
  MortgageMarketplaceSection,
  VendorMarketplaceSection,
} from "./FinancialMarketplaces";
import { FinancialServicesNav } from "../../components/baytmiftah/FinancialServicesNav";
import {
  LeasesSection,
  ReservationsSection,
  TransactionsSection,
  TripsSection,
} from "./ConsumerPortalSections";
import ChatThread, { ChatThreadHeader } from "../../components/baytmiftah/chat/ChatThread";
import { InboxList } from "../../components/baytmiftah/chat/InboxList";
import { subscribeToUserConversations } from "../../lib/baytmiftah/realtime";
import { AppSettingsPanels } from "../../components/baytmiftah/AppSettings";
import ProfileKycCard from "../../components/baytmiftah/ProfileKycCard";
import { KycVerificationPanel } from "../../components/baytmiftah/KycVerificationPanel";
import KycBanner from "../../components/baytmiftah/KycBanner";
import { useMyKyc } from "../../hooks/useMyKyc";
import { isKycVerified } from "../../lib/baytmiftah/kyc";
import { ConsumerNotificationPreferences } from "../../components/baytmiftah/ConsumerNotificationPreferences";
import { ConsumerPortalNav, type ConsumerNavItem } from "../../components/baytmiftah/consumer/ConsumerPortalNav";
import { ConsumerStatCard } from "../../components/baytmiftah/consumer/ConsumerStatCard";
import { ConsumerWelcomeHero } from "../../components/baytmiftah/consumer/ConsumerWelcomeHero";
import { isWorkspaceRole } from "../../lib/baytmiftah/roles";
import {
  getAgencyDashboardConfig,
  getConsumerDashboardConfig,
  getPropertyOperationsDashboardConfig,
  normalizeAgencyDashboardRole,
  normalizeConsumerDashboardRole,
  normalizePropertyOperationsDashboardRole,
} from "../../lib/role-dashboard";
import { getWorkspaceRoute, WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import { getRoleLabel } from "../../../lib/company-model";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";
import { SignatureActionBanner } from "../../components/ux/SignatureActionBanner";
import { buildCheckoutPath } from "../../lib/checkout-navigation";
import { organizationService } from "../../../lib/organization.service";
import { ownerOversightService } from "../../../lib/owner-oversight.service";

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "Recently";

  const diffMs = new Date(dateString).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatPrice(amount?: number | null) {
  if (!amount) return "Price on request";
  return `GHS ${amount.toLocaleString()}`;
}

function formatPaymentAmount(amountMinor?: number | null, currency = "GHS") {
  if (!amountMinor) return `${currency} 0.00`;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function getSection(pathname: string) {
  if (pathname.startsWith("/app/saved")) return "saved";
  if (pathname.startsWith("/app/messages")) return "messages";
  if (pathname.startsWith("/app/applications")) return "applications";
  if (pathname.startsWith("/app/viewings")) return "viewings";
  if (pathname.startsWith("/app/alerts")) return "alerts";
  if (pathname.startsWith("/app/payments")) return "payments";
  if (pathname.startsWith("/app/wallet")) return "wallet";
  if (pathname.startsWith("/app/leases")) return "leases";
  if (pathname.startsWith("/app/maintenance")) return "maintenance";
  if (pathname.startsWith("/app/trips")) return "trips";
  if (pathname.startsWith("/app/reservations")) return "reservations";
  if (pathname.startsWith("/app/documents")) return "documents";
  if (pathname.startsWith("/app/transactions")) return "transactions";
  if (pathname.startsWith("/app/home")) return "home";
  if (pathname.startsWith("/app/notifications")) return "notifications";
  if (pathname.startsWith("/app/mortgage")) return "mortgage";
  if (pathname.startsWith("/app/insurance")) return "insurance";
  if (pathname.startsWith("/app/vendors")) return "vendors";
  if (pathname.startsWith("/app/kyc")) return "kyc";
  if (pathname.startsWith("/app/settings")) return "settings";
  return "overview";
}

function getCaseLabel(caseType?: string) {
  switch (caseType) {
    case "purchase_offer":
      return "Purchase Offer";
    case "lease_application":
      return "Lease Application";
    default:
      return "Rental Application";
  }
}

function getStatusVariant(status?: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "approved":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function getPaymentStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "success":
      return "default";
    case "failed":
    case "reversed":
      return "destructive";
    case "abandoned":
      return "outline";
    default:
      return "secondary";
  }
}

function formatPaymentStatusLabel(status?: string | null) {
  if (!status) return "Pending";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPaymentPurposeLabel(purpose?: string) {
  switch (purpose) {
    case "lease_fee":
      return "Lease Fee";
    case "inspection_fee":
      return "Inspection Fee";
    case "booking_fee":
      return "Booking Fee";
    case "purchase_installment":
      return "Purchase Installment";
    default:
      return purpose ? purpose.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Payment";
  }
}

function getViewingStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "default";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "rescheduled":
      return "outline";
    default:
      return "secondary";
  }
}

function formatViewingTime(value?: string | null) {
  if (!value) return "Pending confirmation";
  return new Date(value).toLocaleString();
}

export function UserDashboard() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedConversationId = searchParams.get("conversation");
  const { user, signOut, role } = useAuth();
  const { kyc, verified: kycVerified } = useMyKyc();
  const [loading, setLoading] = useState(true);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [verifyingReference, setVerifyingReference] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [walletLedger, setWalletLedger] = useState<any[]>([]);
  const [escrowHolds, setEscrowHolds] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [pendingEsignatureCount, setPendingEsignatureCount] = useState(0);
  const [pendingEsignatures, setPendingEsignatures] = useState<
    Awaited<ReturnType<typeof tenantEsignatureService.listPending>>
  >([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [consumerContext, setConsumerContext] = useState({
    hasBookingContext: false,
    hasRentingContext: false,
    hasBuyingContext: false,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [residentProfile, setResidentProfile] = useState<any>(null);
  const [mortgageInquiries, setMortgageInquiries] = useState<any[]>([]);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ownerOversightPath, setOwnerOversightPath] = useState<string | null>(null);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<
    Array<{ slug: string; name: string; role: string }>
  >([]);

  const section = getSection(location.pathname);
  useFinancialAccessGuard();

  useEffect(() => {
    if (section === "settings" && location.hash === "#kyc") {
      window.requestAnimationFrame(() => {
        document.getElementById("kyc")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [section, location.hash]);

  useEffect(() => {
    if (!user?.id) {
      setOwnerOversightPath(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const orgSlug = (row: any) => {
          const org = Array.isArray(row?.organization) ? row.organization[0] : row?.organization;
          return org?.slug ? String(org.slug) : null;
        };
        const orgId = (row: any) => {
          const org = Array.isArray(row?.organization) ? row.organization[0] : row?.organization;
          return org?.id ? String(org.id) : null;
        };
        const [memberships, agreements] = await Promise.all([
          organizationService.getUserOrganizations(user.id),
          ownerOversightService.listMyAgreements(user.id).catch(() => []),
        ]);
        if (cancelled) return;
        const mappedMemberships = (memberships || [])
          .map((row: any) => {
            const org = Array.isArray(row?.organization) ? row.organization[0] : row?.organization;
            if (!org?.slug) return null;
            return {
              slug: String(org.slug),
              name: String(org.name || org.slug),
              role: String(row.role || "member"),
            };
          })
          .filter(Boolean) as Array<{ slug: string; name: string; role: string }>;
        setWorkspaceMemberships(mappedMemberships);

        const ownerMembership = (memberships || []).find(
          (row: any) =>
            row.role === "property_owner" ||
            agreements.some((a) => a.managing_organization_id === orgId(row)),
        );
        const slug = ownerMembership ? orgSlug(ownerMembership) : null;
        if (slug) {
          setOwnerOversightPath(`/workspace/${slug}/owner-oversight`);
          return;
        }
        if (agreements[0]?.managing_organization_id) {
          const match = (memberships || []).find(
            (row: any) => orgId(row) === agreements[0].managing_organization_id,
          );
          const matchedSlug = match ? orgSlug(match) : null;
          if (matchedSlug) {
            setOwnerOversightPath(`/workspace/${matchedSlug}/owner-oversight`);
            return;
          }
        }
        setOwnerOversightPath(null);
      } catch {
        if (!cancelled) setOwnerOversightPath(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        if (!cancelled) {
          setLoading(true);
          setLoadError(null);
        }
        const [
          saved,
          deals,
          chats,
          payments,
          viewings,
          alerts,
          nextWallet,
          nextLedger,
          nextEscrow,
          nextPayouts,
          nextLeases,
          nextBookings,
          nextMaintenance,
          nextContext,
          nextNotifications,
          nextResidentProfile,
          nextMortgageInquiries,
          nextSavedMethods,
          pendingEsignatures,
        ] = await Promise.all([
          savedPropertyService.getSavedProperties(user.id),
          dealCaseService.getDealCasesByUser(user.id),
          messageService.getUserConversations(user.id),
          paymentService.getUserPropertyTransactions(user.id),
          propertyViewingService.getUserViewings(user.id),
          savedSearchAlertService.getUserAlerts(user.id),
          walletService.getWallet(user.id),
          walletService.getLedger(user.id),
          escrowService.getUserEscrowHolds(user.id),
          walletService.getPayoutRequests(user.id),
          leaseService.getTenantLeases(user.id),
          bookingService.getGuestBookings(user.id),
          maintenanceService.getTenantRequests(user.id),
          consumerContextService.getConsumerContext(user.id),
          communicationService.getNotificationHistory(user.id, 100),
          residentHomeService.getActiveTenantProfile(user.id),
          mortgageInsuranceService.getUserInquiries(user.id),
          walletService.getSavedPaymentMethods(user.id),
          tenantEsignatureService.listPending(user.id).catch(() => []),
        ]);

        if (!cancelled) {
          setSavedProperties(saved || []);
          setDealCases(deals || []);
          setConversations(chats || []);
          setPropertyTransactions(payments || []);
          setPropertyViewings(viewings || []);
          setSavedAlerts(alerts || []);
          setWallet(nextWallet);
          setWalletLedger(nextLedger || []);
          setEscrowHolds(nextEscrow || []);
          setPayoutRequests(nextPayouts || []);
          setLeases(nextLeases || []);
          setBookings(nextBookings || []);
          setMaintenanceRequests(nextMaintenance || []);
          setConsumerContext({
            hasBookingContext: nextContext.hasBookingContext,
            hasRentingContext: nextContext.hasRentingContext,
            hasBuyingContext: nextContext.hasBuyingContext,
          });
          setNotifications(nextNotifications || []);
          setResidentProfile(nextResidentProfile);
          setMortgageInquiries(nextMortgageInquiries || []);
          setSavedPaymentMethods(nextSavedMethods || []);
          setPendingEsignatureCount(pendingEsignatures?.length || 0);
          setPendingEsignatures(pendingEsignatures || []);
        }

        void savedSearchAlertService
          .evaluateUserAlerts(user.id)
          .then(async () => {
            if (cancelled) return;
            const refreshedAlerts = await savedSearchAlertService.getUserAlerts(user.id);
            if (!cancelled) {
              setSavedAlerts(refreshedAlerts || []);
            }
          })
          .catch((error) => {
            console.error("Failed to evaluate saved alerts:", error);
          });
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        if (!cancelled) {
          setLoadError("We couldn't load your BaytMiftah data right now.");
          toast.error("We couldn't load your dashboard data right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    void aiAssistantService
      .getRecommendations(user.id, 4)
      .then(async (items) => {
        if (cancelled) return;
        if (!items || items.length === 0) {
          await aiAssistantService.generateRecommendations(user.id).catch(() => []);
          const refreshed = await aiAssistantService.getRecommendations(user.id, 4);
          if (!cancelled) setRecommendations(refreshed || []);
          return;
        }
        setRecommendations(items || []);
      })
      .catch((error) => {
        console.error("Failed to load recommendations:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshConversations = () => {
      void messageService.getUserConversations(user.id).then(setConversations).catch(() => undefined);
    };

    const unsubscribe = subscribeToUserConversations(user.id, refreshConversations);
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const searchParams = new URLSearchParams(location.search);
    const reference = searchParams.get("reference");
    const sessionId = searchParams.get("session_id");

    if (!reference && !sessionId) return;

    let cancelled = false;

    const verifyPayment = async () => {
      try {
        setVerifyingReference(true);
        const result = await paymentService.verifyCheckoutReturn({
          reference,
          sessionId,
        });

        if (cancelled) return;

        setPropertyTransactions((current) => {
          const next = [...current];
          const index = next.findIndex(
            (transaction) => transaction.provider_reference === result.transaction.provider_reference
          );

          if (index >= 0) {
            next[index] = {
              ...next[index],
              ...result.transaction,
              receipt: result.receipt || next[index].receipt,
            };
            return next;
          }

          return [result.transaction, ...next];
        });

        if (result.status === "success" || result.status === "completed") {
          const txn = result.transaction;
          if (
            txn?.purpose === "deposit" &&
            txn?.deal_case_id &&
            !result.alreadyProcessed
          ) {
            void workflowOrchestratorService.onDepositPaid(txn.deal_case_id, user.id);
          }

          if (
            txn?.purpose === "booking_fee" &&
            txn?.booking_id &&
            txn?.id &&
            !result.alreadyProcessed
          ) {
            void bookingService.onPaymentVerified(txn.booking_id, txn.id);
          }

          toast.success(
            result.alreadyProcessed
              ? "Your payment was already verified."
              : "Payment verified. Your receipt is now available."
          );
        } else {
          toast.message(`Payment status: ${result.status || "pending"}`);
        }
      } catch (error) {
        console.error("Failed to verify payangels payment:", error);
        if (!cancelled) {
          toast.error("We couldn't verify that payment yet. Please refresh in a moment.");
        }
      } finally {
        if (!cancelled) {
          setVerifyingReference(false);
          navigate("/app/payments", { replace: true });
        }
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, user]);

  useEffect(() => {
    if (!user || conversations.length === 0) {
      setParticipantProfiles({});
      return;
    }

    let cancelled = false;

    const otherParticipantIds = Array.from(
      new Set(
        conversations
          .map((conversation) =>
            conversation.participant_1_id === user.id
              ? conversation.participant_2_id
              : conversation.participant_1_id
          )
          .filter(Boolean)
      )
    );

    const loadProfiles = async () => {
      const entries = await Promise.all(
        otherParticipantIds.map(async (id) => {
          try {
            const profile = await userService.getUserById(id);
            return [id, profile] as const;
          } catch (error) {
            console.error("Failed to load conversation participant:", error);
            return [id, null] as const;
          }
        })
      );

      if (!cancelled) {
        setParticipantProfiles(
          entries.reduce<Record<string, any>>((acc, [id, profile]) => {
            if (profile) acc[id] = profile;
            return acc;
          }, {})
        );
      }
    };

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [conversations, user]);

  const displayName = useMemo(() => {
    if (!user) return "there";
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
  }, [user]);

  const consumerRole = useMemo(
    () => normalizeConsumerDashboardRole(role || user?.user_metadata?.role || user?.app_metadata?.role),
    [role, user?.app_metadata?.role, user?.user_metadata?.role],
  );

  const agencyRole = useMemo(
    () => normalizeAgencyDashboardRole(role || user?.user_metadata?.role || user?.app_metadata?.role),
    [role, user?.app_metadata?.role, user?.user_metadata?.role],
  );

  const propertyOperationsRole = useMemo(
    () => normalizePropertyOperationsDashboardRole(role || user?.user_metadata?.role || user?.app_metadata?.role),
    [role, user?.app_metadata?.role, user?.user_metadata?.role],
  );

  const dashboardConfig = useMemo(() => {
    const normalizedRole = role || user?.user_metadata?.role || user?.app_metadata?.role;
    if (["independent_agent", "agency_agent", "agency_manager", "agency_owner"].includes(normalizedRole || "")) {
      return getAgencyDashboardConfig(agencyRole);
    }

    if (["property_owner", "property_manager"].includes(normalizedRole || "")) {
      return getPropertyOperationsDashboardConfig(propertyOperationsRole);
    }

    return getConsumerDashboardConfig(consumerRole);
  }, [agencyRole, consumerRole, propertyOperationsRole, role, user?.app_metadata?.role, user?.user_metadata?.role]);

  const unreadMessages = useMemo(
    () =>
      conversations.reduce((count, conversation) => {
        const unreadInConversation =
          conversation.messages?.filter(
            (message: any) => !message.read && message.sender_id !== user?.id
          ).length || 0;

        return count + unreadInConversation;
      }, 0),
    [conversations, user?.id]
  );

  const recentActivity = useMemo(() => {
    const savedActivity = savedProperties.map((item) => ({
      id: `saved-${item.id}`,
      type: "saved",
      href: "/app/saved",
      createdAt: item.created_at,
      message: `You saved ${item.listing?.property?.address || "a property"}.`,
    }));

    const applicationActivity = dealCases.map((item) => ({
      id: `case-${item.id}`,
      type: "application",
      href: "/app/applications",
      createdAt: item.updated_at || item.created_at,
      message: `${getCaseLabel(item.case_type)} is ${item.status}.`,
    }));

    const messageActivity = conversations
      .filter((conversation) => conversation.last_message_at)
      .map((conversation) => {
        const counterpartId =
          conversation.participant_1_id === user?.id
            ? conversation.participant_2_id
            : conversation.participant_1_id;
        const counterpart = participantProfiles[counterpartId];

        return {
          id: `message-${conversation.id}`,
          type: "message",
          href: "/app/messages",
          createdAt: conversation.last_message_at,
          message: `Conversation updated with ${counterpart?.full_name || counterpart?.email || "your contact"}.`,
        };
      });

    const paymentActivity = propertyTransactions.map((item) => ({
      id: `payment-${item.id}`,
      type: "payment",
      href: "/app/payments",
      createdAt: item.paid_at || item.created_at,
      message: `${getPaymentPurposeLabel(item.purpose)} payment is ${item.status}.`,
    }));

    const viewingActivity = propertyViewings.map((item) => ({
      id: `viewing-${item.id}`,
      type: "viewing",
      href: "/app/viewings",
      createdAt: item.confirmed_datetime || item.requested_datetime || item.created_at,
      message: `Viewing ${item.status.replace(/_/g, " ")} for ${item.listing?.property?.address || "your property request"}.`,
    }));

    const alertActivity = savedAlerts.map((item) => ({
      id: `alert-${item.id}`,
      type: "alert",
      href: "/app/alerts",
      createdAt: item.updated_at || item.created_at,
      message: `${item.title} is ${item.is_active ? "active" : "paused"}.`,
    }));

    const maintenanceActivity = maintenanceRequests.map((item) => ({
      id: `maintenance-${item.id}`,
      type: "maintenance",
      href: "/app/maintenance",
      createdAt: item.updated_at || item.created_at,
      message: `Maintenance "${item.title}" is ${String(item.status).replace(/_/g, " ")}.`,
    }));

    return [
      ...savedActivity,
      ...applicationActivity,
      ...messageActivity,
      ...paymentActivity,
      ...viewingActivity,
      ...alertActivity,
      ...maintenanceActivity,
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [
    dealCases,
    participantProfiles,
    propertyTransactions,
    propertyViewings,
    savedAlerts,
    savedProperties,
    conversations,
    maintenanceRequests,
    user?.id,
  ]);

  const recommendedLocation =
    savedProperties[0]?.listing?.property?.city ||
    dealCases[0]?.listing?.property?.city ||
    propertyViewings[0]?.listing?.property?.city ||
    "Accra";

  const refreshWalletState = async () => {
    if (!user) return;
    const [nextWallet, nextLedger, nextEscrow, nextPayouts, nextSavedMethods] = await Promise.all([
      walletService.getWallet(user.id),
      walletService.getLedger(user.id),
      escrowService.getUserEscrowHolds(user.id),
      walletService.getPayoutRequests(user.id),
      walletService.getSavedPaymentMethods(user.id),
    ]);
    setWallet(nextWallet);
    setWalletLedger(nextLedger || []);
    setEscrowHolds(nextEscrow || []);
    setPayoutRequests(nextPayouts || []);
    setSavedPaymentMethods(nextSavedMethods || []);
  };

  const refreshNotifications = async () => {
    if (!user) return;
    const nextNotifications = await communicationService.getNotificationHistory(user.id, 100);
    setNotifications(nextNotifications || []);
  };

  const refreshMortgageInquiries = async () => {
    if (!user) return;
    const nextInquiries = await mortgageInsuranceService.getUserInquiries(user.id);
    setMortgageInquiries(nextInquiries || []);
  };

  const handlePayFromApplication = async (
    dealCase: any,
    purpose: "deposit" | "lease_fee" | "rent"
  ) => {
    if (!dealCase?.listing_id) {
      toast.error("Listing details are missing for this application.");
      return;
    }

    try {
      const amount =
        purpose === "deposit"
          ? Math.max((dealCase.listing?.price || 0) * 0.1, 1)
          : dealCase.listing?.price || 0;

      navigate(
        buildCheckoutPath({
          listingId: dealCase.listing_id,
          amount,
          purpose,
          dealCaseId: dealCase.id,
          returnTo: CONSUMER_ROUTES.applications,
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to start payment checkout.");
    }
  };

  const refreshMaintenanceState = async () => {
    if (!user) return;
    const nextMaintenance = await maintenanceService.getTenantRequests(user.id);
    setMaintenanceRequests(nextMaintenance || []);
  };

  const refreshBookingsState = async () => {
    if (!user) return;
    const nextBookings = await bookingService.getGuestBookings(user.id);
    setBookings(nextBookings || []);
  };

  const contextualNavItems = useMemo(
    () => consumerContextService.getContextualNavItems(consumerContext, t),
    [consumerContext, t],
  );

  const pageConfig = CONSUMER_PAGE_CONFIG[section as ConsumerSection] || CONSUMER_PAGE_CONFIG.overview;

  const reloadDashboard = () => {
    if (!user) return;
    setLoadError(null);
    setLoading(true);
    window.location.reload();
  };

  const activityNavItems = useMemo(() => {
    if (isWorkspaceRole(role) && contextualNavItems.length === 0) {
      return [];
    }
    return contextualNavItems;
  }, [contextualNavItems, role]);

  const contextualNavIcons: Record<string, typeof FileText> = {
    applications: FileText,
    viewings: CalendarDays,
    payments: CreditCard,
    alerts: Bell,
    leases: FileText,
    maintenance: Wrench,
    trips: CalendarDays,
    reservations: CalendarDays,
    documents: FileText,
    transactions: CreditCard,
    home: Home,
    notifications: Bell,
    mortgage: Shield,
    insurance: Shield,
    vendors: Wrench,
  };

  const portalNavItems = useMemo(() => {
    const seen = new Set<string>();
    const merged: ConsumerNavItem[] = [];

    const append = (
      items: Array<{ label: string; href: string; icon: typeof Home; section: string | null }>,
      badgeForSection?: (section: string | null) => number | null,
    ) => {
      for (const item of items) {
        if (seen.has(item.href)) continue;
        seen.add(item.href);
        merged.push({
          label: item.label,
          href: item.href,
          icon: item.icon,
          section: item.section,
          badgeCount: badgeForSection?.(item.section) ?? null,
        });
      }
    };

    append(CONSUMER_PRIMARY_NAV, (navSection) => {
      if (navSection === "saved") return savedProperties.length;
      if (navSection === "messages") return unreadMessages;
      if (navSection === "applications") return dealCases.length;
      if (navSection === "payments") return propertyTransactions.length;
      return null;
    });

    append(CONSUMER_SECONDARY_NAV, (navSection) => {
      if (navSection === "viewings") return propertyViewings.length;
      if (navSection === "alerts") return savedAlerts.filter((alert) => alert.is_active).length;
      if (navSection === "leases") return pendingEsignatureCount;
      return null;
    });

    for (const item of activityNavItems) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      merged.push({
        label: item.label,
        href: item.href,
        icon: contextualNavIcons[item.section] || FileText,
        section: item.section,
        badgeCount: null,
      });
    }

    return merged;
  }, [
    activityNavItems,
    dealCases.length,
    propertyTransactions.length,
    propertyViewings.length,
    savedAlerts,
    savedProperties.length,
    unreadMessages,
    pendingEsignatureCount,
  ]);

  const handleReceiptDownload = async (transaction: any) => {
    const receipt = Array.isArray(transaction.receipt)
      ? transaction.receipt[0]
      : transaction.receipt;

    if (!receipt?.storage_bucket || !receipt?.storage_path) {
      toast.error("Receipt is not ready yet.");
      return;
    }

    try {
      setDownloadingReceiptId(transaction.id);
      const signedUrl = await paymentService.getReceiptDownloadUrl(
        receipt.storage_bucket,
        receipt.storage_path
      );
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to download receipt:", error);
      toast.error("We couldn't open that receipt right now.");
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleToggleAlert = async (alert: any) => {
    try {
      const updated = await savedSearchAlertService.updateAlert(alert.id, {
        is_active: !alert.is_active,
      });
      setSavedAlerts((current) =>
        current.map((item) => (item.id === alert.id ? updated : item))
      );
      toast.success(updated.is_active ? "Alert resumed." : "Alert paused.");
    } catch (error) {
      console.error("Failed to update alert:", error);
      toast.error("We couldn't update that alert right now.");
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await savedSearchAlertService.deleteAlert(alertId);
      setSavedAlerts((current) => current.filter((item) => item.id !== alertId));
      toast.success("Alert removed.");
    } catch (error) {
      console.error("Failed to delete alert:", error);
      toast.error("We couldn't remove that alert right now.");
    }
  };

  const handleRemoveSaved = async (listingId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return;

    try {
      await savedPropertyService.toggleSavedProperty(user.id, listingId);
      setSavedProperties((current) => current.filter((item) => item.listing_id !== listingId));
      toast.success("Removed from saved properties.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove saved property.");
    }
  };

  const renderSavedGrid = (items: any[]) => {
    if (items.length === 0) {
      const config = CONSUMER_PAGE_CONFIG.saved;
      return (
        <EmptyState
          icon={Heart}
          title={config.emptyTitle || "No saved properties yet"}
          description={config.emptyDescription || ""}
          actionLabel={config.emptyActionLabel}
          actionHref={config.emptyActionHref}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <Link key={item.id} to={`/property/${item.listing?.id}`}>
            <Card hover className="overflow-hidden h-full">
              <div className="relative h-44">
                <img
                  src={getPropertyCoverImage(item.listing?.property)}
                  alt={item.listing?.property?.address || "Saved property"}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-3 right-3 rounded-full bg-white/90 p-2"
                  onClick={(event) => void handleRemoveSaved(item.listing_id, event)}
                  aria-label="Remove saved property"
                >
                  <Heart className="w-4 h-4 fill-primary text-primary" />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold">
                      {item.listing?.property?.address || "Saved property"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.listing?.property?.city}, {item.listing?.property?.region}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {item.listing?.listing_type || "listing"}
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-primary">
                  {formatPrice(item.listing?.price)}
                  {item.listing?.listing_type === "rental" ? "/month" : ""}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  const renderConversations = () => {
    if (selectedConversationId) {
      const selected = conversations.find((c) => c.id === selectedConversationId);
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/messages")}
            >
              Back to inbox
            </Button>
          </div>
          <ChatThreadHeader
            conversation={
              selected
                ? {
                    id: selected.id,
                    participant:
                      participantProfiles[
                        selected.participant_1_id === user?.id
                          ? selected.participant_2_id
                          : selected.participant_1_id
                      ]?.full_name || "Conversation",
                  }
                : { id: selectedConversationId, participant: "Conversation" }
            }
          />
          <div className="flex h-[min(70vh,560px)] flex-col">
            <ChatThread conversationId={selectedConversationId} />
          </div>
        </div>
      );
    }

    if (conversations.length === 0) {
      const config = CONSUMER_PAGE_CONFIG.messages;
      return (
        <EmptyState
          icon={MessageCircle}
          title={config.emptyTitle || "No conversations yet"}
          description={config.emptyDescription || ""}
          actionLabel={config.emptyActionLabel}
          actionHref={config.emptyActionHref}
        />
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <InboxList
            conversations={conversations.map((conversation) => {
              const counterpartId =
                conversation.participant_1_id === user?.id
                  ? conversation.participant_2_id
                  : conversation.participant_1_id;
              const counterpart = participantProfiles[counterpartId];
              const latestMessage = [...(conversation.messages || [])].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              return {
                id: conversation.id,
                participant: counterpart?.full_name || counterpart?.email || "Conversation",
                lastMessage: latestMessage?.content,
                updated_at: conversation.last_message_at || latestMessage?.created_at,
                unread:
                  conversation.messages?.filter(
                    (message: any) => !message.read && message.sender_id !== user?.id
                  ).length || 0,
              };
            })}
            variant="desktop"
            className="divide-y divide-border"
            empty={
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            }
          />
        </div>
        <div className="hidden min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground lg:flex">
          Select a conversation to view the thread.
        </div>
      </div>
    );
  };

  const renderApplications = () => {
    if (dealCases.length === 0) {
      return (
        <Card className="p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No active applications yet</h3>
          <p className="text-muted-foreground mb-5">
            Send an inquiry on a property to start a rental, lease, or purchase flow.
          </p>
          <Link to="/search">
            <Button aria-label="Find a property" title="Find a property">
              Find a property
            </Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {dealCases.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-lg">{getCaseLabel(item.case_type)}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.listing?.property?.address || "Property"} in {item.listing?.property?.city || "Ghana"}
                </p>
              </div>
              <Badge variant={getStatusVariant(item.status)} className="capitalize">
                {item.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
              <span>{formatPrice(item.listing?.price)}</span>
              <span>{item.organization?.name || "Property team"}</span>
              <span>Updated {formatRelativeTime(item.updated_at || item.created_at)}</span>
            </div>
            {item.message && <p className="text-sm">{item.message}</p>}
          </Card>
        ))}
      </div>
    );
  };

  const renderPayments = () => {
    if (propertyTransactions.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No payments yet</h3>
          <p className="text-muted-foreground mb-5">
            When you complete a secure checkout, your receipts and verification status will show up here.
          </p>
          <Link to="/search">
            <Button aria-label="Browse listings" title="Browse listings">
              Browse listings
            </Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {propertyTransactions.map((transaction) => {
          const receipt = Array.isArray(transaction.receipt)
            ? transaction.receipt[0]
            : transaction.receipt;

          return (
            <Card key={transaction.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {getPaymentPurposeLabel(transaction.purpose)}
                        </h3>
                        <Badge variant={getPaymentStatusVariant(transaction.status)} className="capitalize">
                          {formatPaymentStatusLabel(transaction.status)}
                        </Badge>
                        {receipt?.receipt_sha256 && (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            Receipt issued
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.listing?.property?.address || "Property payment"} in{" "}
                        {transaction.listing?.property?.city || "Ghana"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reference: {transaction.provider_reference}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{formatPaymentAmount(transaction.amount_minor, transaction.currency)}</span>
                    <span>{transaction.payment_channel || "Awaiting channel confirmation"}</span>
                    <span>{formatRelativeTime(transaction.paid_at || transaction.created_at)}</span>
                    {(transaction.refunded_amount_minor || 0) > 0 && (
                      <span>
                        Refunded {formatPaymentAmount(transaction.refunded_amount_minor, transaction.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void handleReceiptDownload(transaction)}
                    disabled={downloadingReceiptId === transaction.id || !receipt?.storage_path}
                  >
                    <Download className="w-4 h-4" />
                    {downloadingReceiptId === transaction.id ? "Opening..." : "Receipt"}
                  </Button>
                  {receipt?.verification_url && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(receipt.verification_url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                      Verification
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderViewings = () => {
    if (propertyViewings.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No viewings yet</h3>
          <p className="text-muted-foreground mb-5">
            Book a property viewing from a listing page and confirmations will show up here.
          </p>
          <Link to="/search">
            <Button>Browse properties</Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {propertyViewings.map((viewing) => (
          <Card key={viewing.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-lg">
                    {viewing.listing?.property?.address || "Property viewing"}
                  </h3>
                  <Badge variant={getViewingStatusVariant(viewing.status)} className="capitalize">
                    {formatPaymentStatusLabel(viewing.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {viewing.organization?.name || "Property team"} ·{" "}
                  {viewing.listing?.property?.city || "Ghana"}
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    Preferred: {formatViewingTime(viewing.requested_datetime)}
                  </span>
                  <span>
                    Confirmed: {formatViewingTime(viewing.confirmed_datetime)}
                  </span>
                  <span>{viewing.duration_minutes} minutes</span>
                </div>
                {viewing.requester_note && <p className="text-sm">{viewing.requester_note}</p>}
              </div>

              {viewing.listing?.id && (
                <Link to={`/property/${viewing.listing.id}`}>
                  <Button variant="outline">View Listing</Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderAlerts = () => {
    if (savedAlerts.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No saved alerts yet</h3>
          <p className="text-muted-foreground mb-5">
            Save a search from the property search page and we’ll keep watching for fresh matches.
          </p>
          <Link to="/search">
            <Button>Start searching</Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {savedAlerts.map((alert) => (
          <Card key={alert.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-lg">{alert.title}</h3>
                  <Badge variant={alert.is_active ? "default" : "outline"}>
                    {alert.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="capitalize">{alert.listing_type}</span>
                  <span className="capitalize">{alert.frequency}</span>
                  <span>{alert.last_match_count} last known matches</span>
                  <span>Checked {formatRelativeTime(alert.last_checked_at)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={savedSearchAlertService.buildSearchUrlFromAlert(alert)}>
                  <Button variant="default">View matches</Button>
                </Link>
                <Button variant="outline" onClick={() => void handleToggleAlert(alert)}>
                  {alert.is_active ? "Pause" : "Resume"}
                </Button>
                <Button variant="outline" onClick={() => void handleDeleteAlert(alert.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <UserCircle2 className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">{displayName}</h3>
            <p className="text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground mt-3">
              Account created {formatRelativeTime(user?.created_at)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Account Actions</h3>
        <div className="space-y-3">
          <Link to="/forgot-password">
            <Button
              variant="outline"
              className="w-full justify-start"
              aria-label="Reset password"
              title="Reset password"
            >
              <Settings className="w-4 h-4" />
              Reset Password
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              try {
                await signOut();
                toast.success("Signed out.");
              } catch (error) {
                console.error("Failed to sign out:", error);
                toast.error("Couldn't sign you out right now.");
              }
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </Card>

      <div id="kyc" className="lg:col-span-3 scroll-mt-24">
        <KycVerificationPanel />
      </div>

      <Card className="p-6 lg:col-span-3">
        <ConsumerNotificationPreferences userId={user!.id} />
      </Card>

      <Card className="p-6 lg:col-span-3">
        <AppSettingsPanels includeLegal />
      </Card>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {!kycVerified ? <KycBanner kyc={kyc} /> : null}
      <Card className="p-6 border-brand-forest/15 bg-brand-forest/[0.04]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your workspaces</h2>
              <p className="text-sm text-muted-foreground">
                Open an organization you belong to, or request access to manage property through a company workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {workspaceMemberships[0] ? (
                <Link to={getWorkspaceRoute(workspaceMemberships[0].slug)}>
                  <Button>
                    Open workspace
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to={WORKSPACE_ENTRY_PATH}>
                  <Button>
                    Create workspace
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Link to="/app/workspace-access">
                <Button variant="outline">Claims & join requests</Button>
              </Link>
            </div>
          </div>
          {workspaceMemberships.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {workspaceMemberships.map((membership) => (
                <li
                  key={membership.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{membership.name}</p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel(membership.role)}</p>
                  </div>
                  <Link to={getWorkspaceRoute(membership.slug)}>
                    <Button size="sm" variant="outline">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No organization memberships yet. Use claims & join requests to link a listing or company, or start enrollment from create workspace.
            </p>
          )}
        </div>
      </Card>

      {ownerOversightPath ? (
        <Card className="p-6 border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Owner Oversight</h2>
              <p className="text-sm text-muted-foreground">
                Review KPIs, activity, financials, maintenance, and approvals for company-managed properties.
              </p>
            </div>
            <Link to={ownerOversightPath}>
              <Button>
                Open Owner Oversight
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {maintenanceRequests.filter((r) => !["resolved", "cancelled"].includes(r.status)).length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Open Maintenance
            </h2>
            <Link to="/app/maintenance" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {maintenanceRequests
              .filter((r) => !["resolved", "cancelled"].includes(r.status))
              .slice(0, 3)
              .map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{request.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {String(request.status).replace(/_/g, " ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {request.priority || "normal"}
                    </Badge>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      ) : null}

      {/* Quick Action Launchpad */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="consumer-section-heading">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/app/payments" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Pay Rent</span>
            <span className="text-xs text-ink-muted mt-0.5">MoMo & Cards</span>
          </Link>

          <Link to="/app/maintenance" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Repairs</span>
            <span className="text-xs text-ink-muted mt-0.5">Request fix</span>
          </Link>

          <Link to="/app/home" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Gate Pass</span>
            <span className="text-xs text-ink-muted mt-0.5">Visitor entry</span>
          </Link>

          <Link to="/app/messages" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 relative">
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-foreground">Messages</span>
            <span className="text-xs text-ink-muted mt-0.5">Chat agent</span>
          </Link>

          <Link to="/app/documents" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Documents</span>
            <span className="text-xs text-ink-muted mt-0.5">Leases & KYC</span>
          </Link>

          <Link to="/search" className="quick-action-card group">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Explore</span>
            <span className="text-xs text-ink-muted mt-0.5">Find homes</span>
          </Link>
        </div>
      </section>

      <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="consumer-section-heading">Upcoming Viewings</h2>
            <Link to="/app/viewings">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          {propertyViewings.length === 0 ? (
            <div className="consumer-panel-card p-6 text-ink-secondary">
              Book a property viewing and it will appear here for quick follow-up.
            </div>
          ) : (
            <div className="space-y-3">
              {propertyViewings.slice(0, 2).map((viewing) => (
                <Card key={viewing.id} className="consumer-panel-card p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">
                        {viewing.listing?.property?.address || "Property viewing"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatViewingTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                      </p>
                    </div>
                    <Badge variant={getViewingStatusVariant(viewing.status)} className="capitalize">
                      {formatPaymentStatusLabel(viewing.status)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="consumer-section-heading">Saved Properties</h2>
            <Link to="/app/saved">
              <Button variant="outline" size="sm" aria-label="View all saved properties" title="View all saved properties">
                View All
              </Button>
            </Link>
          </div>
          {renderSavedGrid(savedProperties.slice(0, 2))}
        </section>

        {recommendations.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="consumer-section-heading">Recommended for You</h2>
              <Link to="/search">
                <Button variant="outline" size="sm">
                  Explore more
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recommendations.map((recommendation) => (
                <Card key={recommendation.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {recommendation.listing?.property?.address || "Recommended property"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {recommendation.reason || "Based on your saved searches and preferences."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {recommendation.listing?.property?.city}, {recommendation.listing?.property?.region}
                      </p>
                    </div>
                    <Link to={`/property/${recommendation.listing_id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="consumer-section-heading mb-6">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Your saved properties, conversations, and applications will show up here."
              actionLabel="Explore Properties"
              actionHref="/search"
            />
          ) : (
            <ActivityFeed
              items={recentActivity.map((activity) => ({
                id: activity.id,
                message: activity.message,
                href: activity.href,
                createdAt: activity.createdAt,
                icon:
                  activity.type === "saved"
                    ? Heart
                    : activity.type === "message"
                      ? MessageCircle
                      : activity.type === "payment"
                        ? CreditCard
                        : activity.type === "maintenance"
                          ? Wrench
                          : FileText,
              }))}
            />
          )}
        </section>
    </div>
  );

  const renderSectionShell = (content: ReactNode, actions?: ReactNode) => (
    <section className="space-y-6">
      <PageHeader
        title={pageConfig.title}
        description={pageConfig.description}
        breadcrumbs={pageConfig.breadcrumb}
        actions={actions}
      />
      {content}
    </section>
  );

  const walletSection = wallet ? (
    <WalletHubSection
      wallet={wallet}
      ledger={walletLedger}
      escrowHolds={escrowHolds}
      payoutRequests={payoutRequests}
      payments={propertyTransactions}
      savedMethods={savedPaymentMethods}
      onRefresh={refreshWalletState}
      onSaveMethod={(label) =>
        walletService.savePaymentMethod({
          userId: user!.id,
          label,
          isDefault: savedPaymentMethods.length === 0,
        })
      }
      onDownloadReceipt={handleReceiptDownload}
      downloadingReceiptId={downloadingReceiptId}
    />
  ) : (
    <EmptyState
      icon={CreditCard}
      title={CONSUMER_PAGE_CONFIG.payments.emptyTitle || "Your wallet is empty"}
      description={CONSUMER_PAGE_CONFIG.payments.emptyDescription || ""}
      actionLabel={CONSUMER_PAGE_CONFIG.payments.emptyActionLabel}
      actionHref={CONSUMER_PAGE_CONFIG.payments.emptyActionHref}
    />
  );

  return (
    <PageLayout
      variant="consumer"
      sidebar={
        section === "overview" ? (
          <>
            <div className="consumer-panel-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-medium text-ink tracking-tight text-base">Quick Actions</h3>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-secondary">Portal</span>
              </div>
              <div className="space-y-2">
                <Link
                  to="/search"
                  className="group flex items-center justify-between p-3 rounded-xl bg-surface-hover/60 hover:bg-surface-hover border border-surface-border transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      <Search className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-ink">Search Properties</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>

                <Link
                  to="/app/messages"
                  className="group flex items-center justify-between p-3 rounded-xl bg-surface-hover/60 hover:bg-surface-hover border border-surface-border transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-ink">View Messages</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>

                <Link
                  to="/app/payments"
                  className="group flex items-center justify-between p-3 rounded-xl bg-surface-hover/60 hover:bg-surface-hover border border-surface-border transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-ink">Wallet & Payments</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </div>
            </div>
          </>
        ) : undefined
      }
    >
      {loadError ? (
        <ErrorState
          title="We couldn't load My BaytMiftah"
          message={`${loadError} Please check your connection or try again.`}
          onRetry={reloadDashboard}
        />
      ) : (
        <>
          {section === "overview" ? (
            <ConsumerWelcomeHero
              displayName={displayName}
              kicker={dashboardConfig.kicker}
              heading={dashboardConfig.heading}
              description={dashboardConfig.description}
              primaryActionLabel={dashboardConfig.primaryActionLabel}
              primaryActionHref={dashboardConfig.primaryActionHref}
              unreadMessages={unreadMessages}
            />
          ) : null}

          {section === "overview" && !loading && pendingEsignatures.length > 0 ? (
            <SignatureActionBanner
              title="Signature required"
              description={`${pendingEsignatures.length} lease agreement${pendingEsignatures.length === 1 ? "" : "s"} awaiting your electronic signature.`}
              actionLabel="Review & sign"
              onAction={() => {
                const pending = pendingEsignatures[0];
                if (!pending?.public_sign_token) {
                  navigate(CONSUMER_ROUTES.leases);
                  return;
                }
                window.open(
                  CONSUMER_ROUTES.signLease(pending.public_sign_token, pending.signer_token),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            />
          ) : null}

          {section === "overview" && !loading && !isWorkspaceRole(role) ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {dashboardConfig.summaryCards.map((card, index) => {
                const iconMap = {
                  saved: Heart,
                  offers: FileText,
                  payments: CreditCard,
                  viewings: CalendarDays,
                  messages: MessageCircle,
                  leases: FileText,
                  maintenance: Wrench,
                } as const;

                const toneMap = ["primary", "primary", "accent", "info"] as const;

                return (
                  <ConsumerStatCard
                    key={`${card.label}-${index}`}
                    label={card.label}
                    value={
                      card.href === "/app/saved"
                        ? savedProperties.length
                        : card.href === "/app/payments"
                          ? propertyTransactions.length
                          : card.href === "/app/applications"
                            ? dealCases.length
                            : card.href === "/app/viewings"
                              ? propertyViewings.length
                              : card.href === "/app/messages"
                                ? conversations.length
                                : card.href === "/app/alerts"
                                  ? savedAlerts.filter((alert) => alert.is_active).length
                                  : card.href === "/app/leases"
                                    ? leases.length
                                    : card.href === "/app/maintenance"
                                      ? maintenanceRequests.filter((request) => !["resolved", "cancelled"].includes(request.status)).length
                                      : 0
                    }
                    icon={iconMap[card.icon] || Heart}
                    tone={toneMap[index % toneMap.length]}
                    href={card.href}
                  />
                );
              })}
            </div>
          ) : null}

          <ConsumerPortalNav items={portalNavItems} activeSection={section} />

          {section === "overview" ? (
            loading ? (
              <PageLoadingSkeleton />
            ) : (
              renderOverview()
            )
          ) : loading ? (
            <ListSkeleton rows={4} />
          ) : section === "saved" ? (
            renderSectionShell(renderSavedGrid(savedProperties))
          ) : section === "messages" ? (
            renderSectionShell(renderConversations())
          ) : section === "applications" ? (
            renderSectionShell(
              <ApplicationsWorkflowSection
                dealCases={dealCases}
                escrowHolds={escrowHolds}
                userId={user!.id}
                userName={displayName}
                userEmail={user?.email || undefined}
                onPayDeposit={handlePayFromApplication}
              />
            )
          ) : section === "viewings" ? (
            renderSectionShell(renderViewings())
          ) : section === "alerts" ? (
            renderSectionShell(renderAlerts())
          ) : section === "payments" || section === "wallet" ? (
            renderSectionShell(
              <>
                {!kycVerified ? <KycBanner kyc={kyc} /> : null}
                {walletSection}
              </>,
            )
          ) : section === "leases" ? (
            renderSectionShell(<LeasesSection leases={leases} userId={user!.id} />)
          ) : section === "maintenance" ? (
            renderSectionShell(
              <MaintenanceWithVendorsSection
                userId={user!.id}
                leases={leases}
                requests={maintenanceRequests}
                onCreated={refreshMaintenanceState}
              />
            )
          ) : section === "trips" ? (
            renderSectionShell(
              <TripsSection bookings={bookings} userId={user!.id} onRefresh={refreshBookingsState} />
            )
          ) : section === "reservations" ? (
            renderSectionShell(
              <ReservationsSection
                bookings={bookings}
                userId={user!.id}
                onRefresh={refreshBookingsState}
              />
            )
          ) : section === "documents" ? (
            renderSectionShell(
              <DocumentFoldersSection userId={user!.id} dealCases={dealCases} />
            )
          ) : section === "transactions" ? (
            renderSectionShell(
              <TransactionsSection payments={propertyTransactions} escrowHolds={escrowHolds} />
            )
          ) : section === "home" ? (
            renderSectionShell(<ResidentHomeSection profile={residentProfile} />)
          ) : section === "notifications" ? (
            renderSectionShell(
              <NotificationsCenterSection
                userId={user!.id}
                notifications={notifications}
                onRefresh={refreshNotifications}
              />
            )
          ) : section === "mortgage" ? (
            renderSectionShell(
              <>
                <FinancialServicesNav />
                <MortgageMarketplaceSection
                  userId={user!.id}
                  dealCases={dealCases}
                  inquiries={mortgageInquiries}
                  onSubmitted={refreshMortgageInquiries}
                />
              </>,
            )
          ) : section === "insurance" ? (
            renderSectionShell(
              <>
                <FinancialServicesNav />
                <InsuranceMarketplaceSection
                  userId={user!.id}
                  dealCases={dealCases}
                  inquiries={mortgageInquiries}
                  onSubmitted={refreshMortgageInquiries}
                />
              </>,
            )
          ) : section === "vendors" ? (
            renderSectionShell(
              <>
                <FinancialServicesNav />
                <VendorMarketplaceSection />
              </>,
            )
          ) : section === "kyc" ? (
            renderSectionShell(
              <div className="space-y-6">
                <KycVerificationPanel />
              </div>
            )
          ) : section === "settings" ? (
            renderSectionShell(renderSettings())
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
