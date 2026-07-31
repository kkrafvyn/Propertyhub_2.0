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
import { leaseService } from "../../../lib/lease.service";
import { maintenanceService } from "../../../lib/maintenance.service";
import { consumerContextService } from "../../../lib/consumer-context.service";
import { communicationService } from "../../../lib/communication.service";
import { residentHomeService } from "../../../lib/resident-home.service";
import { mortgageInsuranceService } from "../../../lib/mortgage-insurance.service";
import { CONSUMER_PAGE_CONFIG, CONSUMER_PRIMARY_NAV, type ConsumerSection } from "../../lib/consumer-page-config";
import {
  ActivityFeed,
  BaytMiftahAIPanel,
  DashboardStatsSkeleton,
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
import { isWorkspaceRole } from "../../lib/baytmiftah/roles";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";
import { buildCheckoutPath } from "../../lib/checkout-navigation";

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
        console.error("Failed to verify paystack payment:", error);
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

    return [
      ...savedActivity,
      ...applicationActivity,
      ...messageActivity,
      ...paymentActivity,
      ...viewingActivity,
      ...alertActivity,
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
    () => consumerContextService.getContextualNavItems(consumerContext),
    [consumerContext]
  );

  const primaryNavItems = CONSUMER_PRIMARY_NAV;
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
            When you complete a secure Paystack checkout, your receipts and verification status will show up here.
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

      <Card id="kyc" className="p-6 lg:col-span-3 scroll-mt-24">
        <ProfileKycCard variant="desktop" />
      </Card>

      <Card className="p-6 lg:col-span-3">
        <KycVerificationPanel />
      </Card>

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
      {isWorkspaceRole(role) ? (
        <Card className="p-6 border-brand-forest/15 bg-brand-forest/[0.04]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Professional workspace</h2>
              <p className="text-sm text-muted-foreground">
                Manage listings, leads, calendar, and payouts from your workspace dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={WORKSPACE_ENTRY_PATH}>
                <Button>
                  Open workspace
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to={`${WORKSPACE_ENTRY_PATH}?next=new`}>
                <Button variant="outline">List property</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Upcoming Viewings</h2>
            <Link to="/app/viewings">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          {propertyViewings.length === 0 ? (
            <Card className="p-6 text-muted-foreground">
              Book a property viewing and it will appear here for quick follow-up.
            </Card>
          ) : (
            <div className="space-y-3">
              {propertyViewings.slice(0, 2).map((viewing) => (
                <Card key={viewing.id} className="p-4">
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
            <h2 className="text-2xl font-semibold">Saved Properties</h2>
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
              <h2 className="text-2xl font-semibold">Recommended for You</h2>
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
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
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
      sidebar={
        section === "overview" ? (
          <>
            <BaytMiftahAIPanel context="consumer" compact />
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/search">
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="w-4 h-4" />
                    Search Properties
                  </Button>
                </Link>
                <Link to="/app/messages">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4" />
                    View Messages
                  </Button>
                </Link>
                <Link to="/app/payments">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="w-4 h-4" />
                    Wallet & Payments
                  </Button>
                </Link>
              </div>
            </Card>
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
          <PageHeader
            title={section === "overview" ? pageConfig.title : undefined}
            description={
              section === "overview"
                ? `Welcome back, ${displayName}. ${pageConfig.description}`
                : undefined
            }
            breadcrumbs={section === "overview" ? pageConfig.breadcrumb : undefined}
          />

          {section === "overview" && !loading && !isWorkspaceRole(role) ? (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-10">
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Saved Properties</p>
                        <p className="text-3xl font-semibold">{savedProperties.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Heart className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Payments</p>
                        <p className="text-3xl font-semibold">{propertyTransactions.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Applications</p>
                        <p className="text-3xl font-semibold">{dealCases.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Viewings</p>
                        <p className="text-3xl font-semibold">{propertyViewings.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Conversations</p>
                        <p className="text-3xl font-semibold">{conversations.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-chart-3" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Alerts</p>
                        <p className="text-3xl font-semibold">
                          {savedAlerts.filter((alert) => alert.is_active).length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-chart-1/10 rounded-lg flex items-center justify-center">
                        <Bell className="w-6 h-6 text-chart-1" />
                      </div>
                    </div>
                  </Card>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 mb-4">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.section === "overview"
                ? section === "overview"
                : item.section
                  ? item.section === section
                  : false;

            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={active ? "default" : "outline"}
                  size="sm"
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {activityNavItems.length > 0
            ? activityNavItems.map((item) => {
            const iconBySection: Record<string, typeof FileText> = {
              applications: FileText,
              viewings: CalendarDays,
              payments: CreditCard,
              alerts: Bell,
              leases: FileText,
              maintenance: Settings,
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
            const Icon = iconBySection[item.section] || FileText;
            const active = item.section === section;

            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          }) : null}
        </div>

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
          ) : section === "settings" ? (
            renderSectionShell(renderSettings())
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
