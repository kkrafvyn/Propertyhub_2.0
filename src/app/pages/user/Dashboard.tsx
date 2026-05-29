import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowRightLeft,
  ArrowRight,
  Bell,
  BarChart3,
  Brain,
  Calculator,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  HandCoins,
  Heart,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  Search,
  Settings,
  Share2,
  Shield,
  TrendingUp,
  UserCircle2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../../components/Navbar";
import { EscrowMilestoneTimeline } from "../../components/escrow/EscrowMilestoneTimeline";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useMobileShell } from "../../mobile/MobileShellContext";
import { useAuth } from "../../context/AuthContext";
import { dealCaseService } from "../../../lib/dealcase.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { escrowService, getEscrowStatusLabel } from "../../../lib/escrow.service";
import { messageService } from "../../../lib/message.service";
import { mobileCalendarService } from "../../../lib/mobile-calendar.service";
import {
  mobileLocationService,
  type GeoCoordinates,
} from "../../../lib/mobile-location.service";
import { organizationService } from "../../../lib/organization.service";
import { getPaymentGatewayLabel, paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { savedSearchAlertService } from "../../../lib/saved-search-alert.service";
import { savedPropertyService } from "../../../lib/savedproperty.service";
import { smartAccessService } from "../../../lib/smart-access.service";
import {
  buildAbsoluteSearchUrl,
  buildAlertSearchInput,
  buildSearchPath,
} from "../../../lib/search-sharing";
import { userService } from "../../../lib/user.service";
import { stripReferralMetadata } from "../../../lib/referral-attribution.service";
import {
  buildRoleTaskLaunchpad,
  formatLabel,
  parseOfferSummary,
  type RoleTaskKey,
} from "../../features/expansion/feature-helpers";
import {
  BuyerToolkitPanel,
  BuyingGroupPanel,
  ConciergePanel,
  DealRoomsPanel,
  PropertyComparisonPanel,
  ReferralProgramPanel,
  SupportPanel,
  TrustVerificationPanel,
  UserInsightsPanel,
} from "../../features/user/UserExpansionPanels";
import {
  getMinimalUserDashboardRoutes,
  getUserDashboardSection,
  USER_DASHBOARD_ROUTE_CONFIG,
  type UserDashboardSection,
} from "../../features/expansion/section-navigation";

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

function selectConditionReportPhotos() {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    let resolved = false;

    const finish = (files: File[]) => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener("focus", handleFocus);
      resolve(files);
    };

    const handleFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) finish([]);
      }, 300);
    };

    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = true;
    input.addEventListener("change", () => finish(Array.from(input.files || []).slice(0, 12)));
    window.addEventListener("focus", handleFocus, { once: true });
    input.click();
  });
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

const roleTaskIconByKey: Record<RoleTaskKey, typeof TrendingUp> = {
  buyer: Heart,
  diaspora_buyer: Users,
  seller: Home,
  agent: MessageCircle,
  manager: Shield,
  analyst: BarChart3,
  vendor: Wrench,
  family_reviewer: Users,
  legal_reviewer: FileText,
  local_representative: CalendarDays,
};

export function UserDashboard() {
  const { isMobileShell } = useMobileShell();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [smartAccessGrants, setSmartAccessGrants] = useState<any[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);
  const [dealDocuments, setDealDocuments] = useState<any[]>([]);
  const [organizationContacts, setOrganizationContacts] = useState<
    Array<{ name: string; email?: string | null; phone?: string | null }>
  >([]);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<any[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [currentCoordinates, setCurrentCoordinates] = useState<GeoCoordinates | null>(null);
  const [verifyingReference, setVerifyingReference] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [workingEscrowId, setWorkingEscrowId] = useState<string | null>(null);

  const section = getUserDashboardSection(location.pathname);
  const conversationIdsKey = useMemo(
    () =>
      conversations
        .map((conversation) => conversation.id)
        .filter(Boolean)
        .sort()
        .join(","),
    [conversations]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        if (!cancelled) setLoading(true);
        const [saved, deals, chats, payments, viewings, accessGrants, alerts, workspaceRows] = await Promise.all([
          savedPropertyService.getSavedProperties(user.id),
          dealCaseService.getDealCasesByUser(user.id),
          messageService.getUserConversations(user.id),
          paymentService.getUserPropertyTransactions(user.id),
          propertyViewingService.getUserViewings(user.id),
          smartAccessService.getUserAccessGrants(user.id).catch(() => []),
          savedSearchAlertService.getUserAlerts(user.id),
          organizationService.getUserOrganizations(user.id).catch(() => []),
        ]);

        if (!cancelled) {
          setSavedProperties(saved || []);
          setDealCases(deals || []);
          setConversations(chats || []);
          setPropertyTransactions(payments || []);
          setPropertyViewings(viewings || []);
          setSmartAccessGrants(accessGrants || []);
          setSavedAlerts(alerts || []);
          setWorkspaceMemberships(workspaceRows || []);
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
          toast.error("We couldn't load your dashboard data right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const searchParams = new URLSearchParams(location.search);
    const reference =
      searchParams.get("reference") ||
      searchParams.get("tx_ref") ||
      searchParams.get("trxref") ||
      searchParams.get("transaction_id");

    if (!reference) return;

    let cancelled = false;

    const verifyPayment = async () => {
      try {
        setVerifyingReference(true);
        const result = await paymentService.verifyPropertyPayment(reference);

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

        if (result.status === "success") {
          toast.success(
            result.alreadyProcessed
              ? "Your payment was already verified."
              : "Payment verified. Your receipt is now available."
          );
        } else {
          toast.message(`Payment status: ${result.status || "pending"}`);
        }
      } catch (error) {
        console.error("Failed to verify property payment:", error);
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

  useEffect(() => {
    if (!user || !conversationIdsKey) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const conversationIds = conversationIdsKey.split(",").filter(Boolean);
    const refreshConversations = () => {
      if (refreshTimer) return;

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void messageService
          .getUserConversations(user.id)
          .then((chats) => setConversations(chats || []))
          .catch((error) => {
            console.error("Failed to refresh realtime conversations:", error);
          });
      }, 150);
    };

    const unsubscribe = conversationIds.map((conversationId) =>
      messageService.subscribeToConversationActivity(conversationId, {
        onMessage: refreshConversations,
        onReadReceipt: refreshConversations,
      })
    );

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe.forEach((cleanup) => cleanup());
    };
  }, [conversationIdsKey, user]);

  useEffect(() => {
    if (!user || section !== "messages" || !conversationIdsKey) return;

    const conversationIds = conversationIdsKey.split(",").filter(Boolean);

    void Promise.all(
      conversationIds.map((conversationId) =>
        messageService.markMessagesAsRead(conversationId, user.id)
      )
    )
      .then(() => {
        setConversations((current) =>
          current.map((conversation) => ({
            ...conversation,
            messages: conversation.messages?.map((message: any) =>
              message.sender_id === user.id ? message : { ...message, read: true }
            ),
          }))
        );
      })
      .catch((error) => {
        console.error("Failed to mark messages as read:", error);
      });
  }, [conversationIdsKey, section, user]);

  useEffect(() => {
    if (!user || dealCases.length === 0) {
      setDealDocuments([]);
      setOrganizationContacts([]);
      return;
    }

    let cancelled = false;

    const loadDealContext = async () => {
      const organizationIds = Array.from(
        new Set(dealCases.map((dealCase) => dealCase.organization_id).filter(Boolean))
      ) as string[];
      const dealCaseIds = new Set(dealCases.map((dealCase) => dealCase.id));
      const listingIds = new Set(
        dealCases.map((dealCase) => dealCase.listing_id).filter(Boolean)
      );
      const userEmail = user.email?.toLowerCase() || null;

      try {
        const [documentResults, organizationResults] = await Promise.all([
          Promise.allSettled(
            organizationIds.map((organizationId) =>
              documentCenterService.getOrganizationDocuments(organizationId)
            )
          ),
          Promise.allSettled(
            organizationIds.map((organizationId) =>
              organizationService.getOrganizationById(organizationId)
            )
          ),
        ]);

        if (cancelled) return;

        const documentsForUser = documentResults
          .flatMap((result) =>
            result.status === "fulfilled" ? result.value || [] : []
          )
          .filter((document) => {
            if (dealCaseIds.has(document.deal_case_id)) return true;
            if (document.listing_id && listingIds.has(document.listing_id)) return true;
            if (document.signed_by_user_id === user.id) return true;
            if (
              userEmail &&
              document.external_signer_email &&
              document.external_signer_email.toLowerCase() === userEmail
            ) {
              return true;
            }

            return false;
          });

        const uniqueDocuments = Array.from(
          new Map(documentsForUser.map((document) => [document.id, document])).values()
        );

        const contacts = organizationResults
          .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
          .map((organization) => ({
            name: organization.name,
            email: organization.email,
            phone: organization.phone,
          }));

        setDealDocuments(uniqueDocuments);
        setOrganizationContacts(contacts);
      } catch (error) {
        console.error("Failed to load user deal context:", error);
      }
    };

    void loadDealContext();

    return () => {
      cancelled = true;
    };
  }, [dealCases, user]);

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

  const roleTaskPlans = useMemo(
    () =>
      buildRoleTaskLaunchpad({
        savedProperties,
        dealCases,
        conversations,
        propertyViewings,
        propertyTransactions,
        savedAlerts,
        workspaceMemberships,
        documents: dealDocuments,
      }),
    [
      conversations,
      dealCases,
      dealDocuments,
      propertyTransactions,
      propertyViewings,
      savedAlerts,
      savedProperties,
      workspaceMemberships,
    ]
  );

  const navIconBySection: Record<
    UserDashboardSection,
    typeof TrendingUp
  > = {
    overview: TrendingUp,
    compare: ArrowRightLeft,
    "buying-tools": Calculator,
    deals: Shield,
    verification: UserCheck,
    insights: BarChart3,
    concierge: Brain,
    groups: Users,
    referrals: HandCoins,
    support: Wrench,
    saved: Heart,
    messages: MessageCircle,
    applications: FileText,
    viewings: CalendarDays,
    access: KeyRound,
    alerts: Bell,
    payments: CreditCard,
    settings: Settings,
  };

  const primaryDashboardRoutes = getMinimalUserDashboardRoutes();

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

  const refreshUserPayments = async () => {
    if (!user?.id) return;
    const rows = await paymentService.getUserPropertyTransactions(user.id);
    setPropertyTransactions(rows || []);
  };

  const normalizeEscrow = (transaction: any) => {
    return Array.isArray(transaction.escrow) ? transaction.escrow[0] : transaction.escrow;
  };

  const handleConfirmEscrowRelease = async (escrow: any) => {
    const confirmed = window.confirm(
      "Confirm that the verified documents satisfy you and release this deposit to the agency?"
    );
    if (!confirmed) return;

    try {
      setWorkingEscrowId(escrow.id);
      await escrowService.managePropertyEscrow({
        action: "confirm_release",
        escrowId: escrow.id,
      });
      await refreshUserPayments();
      toast.success("Escrow release started through the configured payment gateway.");
    } catch (error) {
      console.error("Failed to confirm escrow release:", error);
      toast.error("We couldn't release that escrow right now.");
    } finally {
      setWorkingEscrowId(null);
    }
  };

  const handleCancelEscrow = async (escrow: any) => {
    const confirmed = window.confirm(
      "Cancel this escrow and request a gateway refund within the active cancellation window?"
    );
    if (!confirmed) return;

    try {
      setWorkingEscrowId(escrow.id);
      await escrowService.managePropertyEscrow({
        action: "cancel_within_window",
        escrowId: escrow.id,
      });
      await refreshUserPayments();
      toast.success("Escrow cancellation refund started.");
    } catch (error) {
      console.error("Failed to cancel escrow:", error);
      toast.error("We couldn't cancel that escrow right now.");
    } finally {
      setWorkingEscrowId(null);
    }
  };

  const handleUserEscrowDispute = async (escrow: any) => {
    const reason = window.prompt("What should the admin team investigate?");
    if (!reason?.trim()) return;

    try {
      setWorkingEscrowId(escrow.id);
      await escrowService.managePropertyEscrow({
        action: "raise_dispute",
        escrowId: escrow.id,
        reason: reason.trim(),
      });
      await refreshUserPayments();
      toast.success("Escrow dispute raised for admin review.");
    } catch (error) {
      console.error("Failed to dispute escrow:", error);
      toast.error("We couldn't raise that dispute right now.");
    } finally {
      setWorkingEscrowId(null);
    }
  };

  const handleSubmitTenantConditionReport = async (escrow: any) => {
    if (!user?.id) return;

    const notes = window.prompt(
      "Describe the move-in property condition. You can attach photos after this prompt."
    );
    if (!notes?.trim()) return;
    const photoFiles = window.confirm("Add condition photos now?")
      ? await selectConditionReportPhotos()
      : [];

    try {
      setWorkingEscrowId(escrow.id);
      await escrowService.submitConditionReport({
        escrowId: escrow.id,
        listingId: escrow.listing_id,
        propertyId: escrow.property_id,
        organizationId: escrow.organization_id,
        dealCaseId: escrow.transaction?.deal_case_id || null,
        submittedBy: user.id,
        submittedRole: "tenant",
        reportStage: "move_in",
        notes: notes.trim(),
        photoFiles,
        metadata: {
          source: "user_dashboard",
        },
      });
      await refreshUserPayments();
      toast.success("Move-in condition report saved.");
    } catch (error) {
      console.error("Failed to submit condition report:", error);
      toast.error("We couldn't save that condition report right now.");
    } finally {
      setWorkingEscrowId(null);
    }
  };

  const handleAcknowledgeConditionReport = async (report: any) => {
    if (!user?.id) return;

    try {
      setWorkingEscrowId(report.escrow_id);
      await escrowService.acknowledgeConditionReport(report.id, user.id);
      await refreshUserPayments();
      toast.success("Condition report acknowledged.");
    } catch (error) {
      console.error("Failed to acknowledge condition report:", error);
      toast.error("We couldn't acknowledge that report right now.");
    } finally {
      setWorkingEscrowId(null);
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

  const handleShareAlert = async (alert: any) => {
    if (typeof window === "undefined") return;

    const searchUrl = buildAbsoluteSearchUrl(
      buildAlertSearchInput(alert),
      window.location.origin
    );

    try {
      if (navigator.share) {
        await navigator.share({
          title: alert.title || "BaytMiftah search alert",
          text: "Take a look at this BaytMiftah search.",
          url: searchUrl,
        });
      } else {
        await navigator.clipboard.writeText(searchUrl);
        toast.success("Alert search link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to share alert search:", error);
      toast.error("We couldn't share that alert right now.");
    }
  };

  const getViewingCalendarInput = (viewing: any) => {
    const property = viewing.listing?.property || {};
    const address = [property.address, property.city, property.region].filter(Boolean).join(", ");

    return {
      title: `Property viewing: ${property.address || "BaytMiftah"}`,
      startsAt: viewing.confirmed_datetime || viewing.requested_datetime,
      durationMinutes: viewing.duration_minutes || 45,
      location: address,
      description:
        viewing.requester_note ||
        `Viewing with ${viewing.organization?.name || "the BaytMiftah team"}.`,
    };
  };

  const handleAddViewingToCalendar = (viewing: any) => {
    mobileCalendarService.downloadIcs(getViewingCalendarInput(viewing));
    toast.success("Calendar invite downloaded.");
  };

  const handleOpenViewingDirections = async (viewing: any) => {
    let origin = currentCoordinates;

    if (!origin) {
      try {
        origin = await mobileLocationService.getCurrentPosition();
        setCurrentCoordinates(origin);
      } catch {
        origin = null;
      }
    }

    window.open(
      mobileLocationService.getMapsUrl(viewing.listing?.property, origin),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const renderSavedGrid = (items: any[]) => {
    if (items.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No saved properties yet</h3>
          <p className="text-muted-foreground mb-5">
            Save listings you love so you can compare them later.
          </p>
          <Link to="/search">
            <Button aria-label="Browse properties" title="Browse properties">
              Browse properties
            </Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <Link key={item.id} to={`/property/${item.listing?.id}`}>
            <Card hover className="overflow-hidden h-full">
              <div className="relative h-44">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
                  alt={item.listing?.property?.address || "Saved property"}
                  className="w-full h-full object-cover"
                />
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
    if (conversations.length === 0) {
      return (
        <Card className="p-8 text-center">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground">
            Start an inquiry from a property page and your conversations will show up here.
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {conversations.map((conversation) => {
          const counterpartId =
            conversation.participant_1_id === user?.id
              ? conversation.participant_2_id
              : conversation.participant_1_id;
          const counterpart = participantProfiles[counterpartId];
          const latestMessage = [...(conversation.messages || [])]
            .sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
          const unreadCount =
            conversation.messages?.filter(
              (message: any) => !message.read && message.sender_id !== user?.id
            ).length || 0;

          return (
            <Card key={conversation.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {(counterpart?.full_name || counterpart?.email || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {counterpart?.full_name || counterpart?.email || "Conversation"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {latestMessage?.content || "No messages yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {formatRelativeTime(conversation.last_message_at || latestMessage?.created_at)}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
              </div>
            </Card>
          );
        })}
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
        {dealCases.map((item) => {
          const offerSummary =
            item.case_type === "purchase_offer" ? parseOfferSummary(item.message) : null;

          return (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{getCaseLabel(item.case_type)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.listing?.property?.address || "Property"} in {item.listing?.property?.city || "Ghana"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant={getStatusVariant(item.status)} className="capitalize">
                    {item.status}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {formatLabel(item.pipeline_stage || item.status)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <span>{formatPrice(item.listing?.price)}</span>
                <span>{item.organization?.name || "Property team"}</span>
                <span>Updated {formatRelativeTime(item.updated_at || item.created_at)}</span>
                {item.next_follow_up_at && (
                  <span>Follow-up {formatRelativeTime(item.next_follow_up_at)}</span>
                )}
              </div>
              {offerSummary ? (
                <div className="grid gap-3 md:grid-cols-3 mb-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Offer</p>
                    <p className="mt-1 font-semibold">{formatPrice(offerSummary.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Financing</p>
                    <p className="mt-1 font-semibold">{formatLabel(offerSummary.financing)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Close Target</p>
                    <p className="mt-1 font-semibold">{offerSummary.targetCloseDate || "Flexible"}</p>
                  </div>
                </div>
              ) : null}
              {item.message && (
                <p className="text-sm whitespace-pre-line">
                  {offerSummary?.notes || stripReferralMetadata(item.message)}
                </p>
              )}
            </Card>
          );
        })}
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
            When you complete a secure property checkout, your receipts and verification status will show up here.
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
          const escrow = normalizeEscrow(transaction);
          const escrowDocuments = Array.isArray(escrow?.documents) ? escrow.documents : [];
          const conditionReports = Array.isArray(escrow?.condition_reports)
            ? escrow.condition_reports
            : [];
          const escrowWorking = escrow ? workingEscrowId === escrow.id : false;

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
                        {(receipt?.integrity_status === "hashed" ||
                          receipt?.integrity_status === "verified") && (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            Receipt hash verified
                          </Badge>
                        )}
                        {escrow && (
                          <Badge variant={escrow.status === "disputed" ? "destructive" : "secondary"}>
                            Escrow: {getEscrowStatusLabel(escrow.status)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.listing?.property?.address || "Property payment"} in{" "}
                        {transaction.listing?.property?.city || "Ghana"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getPaymentGatewayLabel(transaction.provider)} reference:{" "}
                        {transaction.provider_reference}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{formatPaymentAmount(transaction.amount_minor, transaction.currency)}</span>
                    <span>{getPaymentGatewayLabel(transaction.provider)}</span>
                    <span>{transaction.payment_channel || "Awaiting channel confirmation"}</span>
                    <span>{formatRelativeTime(transaction.paid_at || transaction.created_at)}</span>
                    {(transaction.refunded_amount_minor || 0) > 0 && (
                      <span>
                        Refunded {formatPaymentAmount(transaction.refunded_amount_minor, transaction.currency)}
                      </span>
                    )}
                  </div>

                  {escrow && (
                    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">Escrow document gate</p>
                          <p className="mt-1 text-muted-foreground">
                            Funds stay held until required documents are approved and you confirm
                            satisfaction.
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatPaymentAmount(escrow.amount_minor, escrow.currency)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {escrowDocuments.length === 0 ? (
                          <span className="text-muted-foreground">Agency documents are pending.</span>
                        ) : (
                          escrowDocuments.map((document: any) => (
                            <Badge
                              key={document.id}
                              variant={document.status === "approved" ? "default" : "outline"}
                            >
                              {String(document.document_type).replaceAll("_", " ")}:{" "}
                              {getEscrowStatusLabel(document.status)}
                            </Badge>
                          ))
                        )}
                      </div>
                      {escrowDocuments.some((document: any) => document.status === "approved") ? (
                        <div className="mt-4 space-y-3">
                          {escrowDocuments
                            .filter((document: any) => document.status === "approved")
                            .map((document: any) => (
                              <details
                                key={document.id}
                                className="rounded-xl border border-border bg-white p-3"
                              >
                                <summary className="cursor-pointer font-medium text-foreground">
                                  View verified {String(document.document_type).replaceAll("_", " ")}
                                </summary>
                                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                  {document.watermark_text ? (
                                    <p className="font-semibold text-foreground">
                                      {document.watermark_text}
                                    </p>
                                  ) : null}
                                  {document.public_summary ? <p>{document.public_summary}</p> : null}
                                  {document.watermarked_sha256 || document.document_sha256 ? (
                                    <p className="break-all font-mono">
                                      Hash: {document.watermarked_sha256 || document.document_sha256}
                                    </p>
                                  ) : null}
                                  {document.rsa_signature ? (
                                    <p className="break-all font-mono">
                                      Signature: {document.rsa_signature}
                                    </p>
                                  ) : null}
                                  {document.watermarked_content_markdown ? (
                                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 font-mono text-[11px] text-foreground">
                                      {document.watermarked_content_markdown}
                                    </pre>
                                  ) : null}
                                </div>
                              </details>
                            ))}
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <EscrowMilestoneTimeline
                          milestones={escrow.milestones}
                          title="Your release timeline"
                          description="See the trust checkpoints tied to this protected payment."
                          compact
                        />
                      </div>

                      {conditionReports.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-border bg-white p-3">
                          <p className="font-medium text-foreground">Condition reports</p>
                          <div className="mt-3 space-y-3">
                            {conditionReports.map((report: any) => (
                              <div key={report.id} className="rounded-lg bg-secondary/35 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {formatPaymentStatusLabel(report.submitted_role)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {formatPaymentStatusLabel(report.condition_status)}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-sm text-foreground">{report.notes}</p>
                                {Array.isArray(report.photo_storage_paths) &&
                                report.photo_storage_paths.length > 0 ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {report.photo_storage_paths.length} condition photo
                                    {report.photo_storage_paths.length === 1 ? "" : "s"} attached
                                  </p>
                                ) : null}
                                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                                  Hash: {report.report_sha256}
                                </p>
                                {report.condition_status === "submitted" &&
                                report.submitted_by !== user?.id ? (
                                  <Button
                                    className="mt-3"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleAcknowledgeConditionReport(report)}
                                    disabled={escrowWorking}
                                  >
                                    Acknowledge
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {escrow?.status === "docs_approved" && (
                    <Button
                      variant="outline"
                      onClick={() => void handleConfirmEscrowRelease(escrow)}
                      disabled={escrowWorking}
                    >
                      {escrowWorking ? "Working..." : "Confirm Release"}
                    </Button>
                  )}
                  {escrow && ["held", "docs_pending"].includes(escrow.status) && (
                    <Button
                      variant="outline"
                      onClick={() => void handleCancelEscrow(escrow)}
                      disabled={escrowWorking}
                    >
                      Cancel Escrow
                    </Button>
                  )}
                  {escrow && !["released", "refunded", "cancelled", "disputed"].includes(escrow.status) && (
                    <Button
                      variant="outline"
                      onClick={() => void handleUserEscrowDispute(escrow)}
                      disabled={escrowWorking}
                    >
                      Raise Dispute
                    </Button>
                  )}
                  {escrow?.status === "released" && (
                    <Button
                      variant="outline"
                      onClick={() => void handleSubmitTenantConditionReport(escrow)}
                      disabled={escrowWorking}
                    >
                      Move-in Report
                    </Button>
                  )}
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
                  {viewing.smart_access_status && viewing.smart_access_status !== "not_enabled" ? (
                    <span>Smart access: {formatPaymentStatusLabel(viewing.smart_access_status)}</span>
                  ) : null}
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

  const renderSmartAccess = () => {
    if (smartAccessGrants.length === 0) {
      return (
        <Card className="p-8 text-center">
          <KeyRound className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No smart access yet</h3>
          <p className="text-muted-foreground mb-5">
            When an agency confirms a viewing or tenancy handoff for a smart property, your access
            window will appear here.
          </p>
          <Link to="/search">
            <Button>Find smart-ready properties</Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {smartAccessGrants.map((grant) => {
          const grantEvents = Array.isArray(grant.events)
            ? [...grant.events].sort(
                (a: any, b: any) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime()
              )
            : [];

          return (
              <Card key={grant.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {grant.property?.address || "Smart property access"}
                      </h3>
                      <Badge variant={grant.status === "active" ? "default" : "secondary"}>
                        {formatPaymentStatusLabel(grant.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {grant.organization?.name || "Property team"} -{" "}
                      {grant.property?.city || "Ghana"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>Reason: {formatPaymentStatusLabel(grant.access_reason)}</span>
                      <span>Scope: {formatPaymentStatusLabel(grant.access_scope)}</span>
                      <span>
                        Starts {formatViewingTime(grant.starts_at)}
                      </span>
                      <span>
                        Ends {formatViewingTime(grant.ends_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {grant.access_code_hint ||
                        "The property team will send the final access code once the device provider sync completes."}
                    </p>

                    {grantEvents.length > 0 ? (
                      <div className="rounded-xl border border-border bg-secondary/20 p-3">
                        <p className="font-medium text-foreground">Recent access log</p>
                        <div className="mt-3 space-y-2">
                          {grantEvents.slice(0, 3).map((event: any) => (
                            <div key={event.id} className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {formatPaymentStatusLabel(event.event_type)}
                              </span>
                              {" / "}
                              {formatRelativeTime(event.created_at)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {grant.listing?.id ? (
                    <Link to={`/property/${grant.listing.id}`}>
                      <Button variant="outline">View Listing</Button>
                    </Link>
                  ) : null}
                </div>
              </Card>
          );
        })}
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
                <Link to={buildSearchPath(buildAlertSearchInput(alert))}>
                  <Button variant="outline">Open Search</Button>
                </Link>
                <Button variant="outline" onClick={() => void handleShareAlert(alert)}>
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
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

  const renderSettings = () => {
    const profilePhone = user?.phone || user?.user_metadata?.phone || "Add phone";
    const profileSubtitle = savedProperties.length || dealCases.length
      ? `${savedProperties.length} saved · ${dealCases.length} active deal${dealCases.length === 1 ? "" : "s"}`
      : "Premium Buyer Account";
    const settingsSections = [
      {
        title: "Profile information",
        rows: [
          { icon: UserCircle2, label: "Name", value: displayName, href: "/app/settings" },
          { icon: Mail, label: "Email", value: user?.email || "Add email", href: "/app/settings" },
          { icon: Phone, label: "Phone", value: profilePhone, href: "/app/settings" },
        ],
      },
      {
        title: "Preferences",
        rows: [
          { icon: Bell, label: "Push Notifications", value: "On", href: "/app/notifications", danger: true },
          { icon: KeyRound, label: "Security & Password", value: "Review", href: "/forgot-password" },
          { icon: Moon, label: "Appearance", value: "System", href: "/app/settings" },
          { icon: Settings, label: "Account Preferences", value: "Manage", href: "/app/settings" },
        ],
      },
    ];

    return (
      <div className="mx-auto max-w-3xl space-y-8 rounded-[2rem] bg-[#f7f5fa] p-4 sm:p-8">
        <div className="border-b border-slate-200/80 pb-5">
          <h3 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
            Settings
          </h3>
        </div>

        <div className="grid justify-items-center gap-3 text-center">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-slate-950 text-3xl font-bold text-white shadow-xl shadow-primary/20">
            {displayName
              .split(/[ @.]/)
              .filter(Boolean)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h4 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {displayName}
            </h4>
            <p className="mt-1 text-base text-slate-600">{profileSubtitle}</p>
          </div>
        </div>

        {settingsSections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h4 className="px-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {section.title}
            </h4>
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              {section.rows.map((row) => {
                const Icon = row.icon;

                return (
                  <Link
                    key={row.label}
                    to={row.href}
                    className="grid min-h-[76px] grid-cols-[auto_minmax(0,0.7fr)_minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-100 px-5 text-slate-950 no-underline last:border-b-0 hover:bg-primary/5"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <strong className="text-lg font-medium tracking-[-0.03em]">{row.label}</strong>
                    <span className="truncate text-right text-slate-600">{row.value}</span>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <Button
          variant="outline"
          className="h-16 w-full rounded-2xl border-slate-200 bg-white text-lg font-semibold text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => void handleSettingsSignOut()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    );
  };

  const renderRoleTaskLaunchpad = () => (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-3">Role-based guidance</Badge>
          <h2 className="text-2xl font-semibold tracking-tight">Simple tasks for every role</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Each person sees the job they need to do next. The app keeps the calculations,
            trust checks, CRM, and receipt integrity logs in the background.
          </p>
        </div>
        <Link to="/workspace">
          <Button variant="outline">
            Open workspace
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roleTaskPlans.map((plan) => {
          const Icon = roleTaskIconByKey[plan.key];

          return (
            <Card
              key={plan.key}
              className="overflow-hidden border-border/70 bg-gradient-to-br from-white via-white to-secondary/35"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">{plan.audience}</p>
                      <h3 className="text-lg font-semibold">{plan.label}</h3>
                    </div>
                  </div>
                  <Badge variant={plan.priority === "Today" ? "default" : "outline"}>
                    {plan.priority}
                  </Badge>
                </div>

                <div className="mt-5 rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{plan.metricLabel}</p>
                      <p className="mt-1 text-2xl font-semibold">{plan.metricValue}</p>
                    </div>
                    <p className="max-w-[13rem] text-sm leading-relaxed text-muted-foreground">
                      {plan.headline}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.helper}</p>

                <div className="mt-4 space-y-3">
                  {plan.tasks.map((task) => (
                    <div key={task} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{task}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={plan.primaryAction.href}>
                    <Button size="sm">
                      {plan.primaryAction.label}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  {plan.secondaryAction ? (
                    <Link to={plan.secondaryAction.href}>
                      <Button variant="outline" size="sm">
                        {plan.secondaryAction.label}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );

  const renderOverview = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
        {renderRoleTaskLaunchpad()}

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

        <section>
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <Card className="p-6 text-muted-foreground">
              Your saved properties, conversations, and applications will show up here.
            </Card>
          ) : (
            <Card className="divide-y divide-border">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  to={activity.href}
                  className="flex items-start gap-4 p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    {activity.type === "saved" && <Heart className="w-5 h-5" />}
                    {activity.type === "message" && <MessageCircle className="w-5 h-5" />}
                    {activity.type === "application" && <FileText className="w-5 h-5" />}
                    {activity.type === "payment" && <CreditCard className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p>{activity.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Next best steps</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            BaytMiftah handles the calculations, reminders, and trust checks in the background.
          </p>
          <div className="space-y-3">
            <Link to="/search">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="Search properties"
                title="Search properties"
              >
                <Search className="w-4 h-4" />
                Find a home
              </Button>
            </Link>
            <Link to="/app/saved">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="Open saved homes"
                title="Open saved homes"
              >
                <Heart className="w-4 h-4" />
                Review saved homes
              </Button>
            </Link>
            <Link to="/app/deals">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4" />
                Continue a deal
              </Button>
            </Link>
            <Link to="/app/messages">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="View messages"
                title="View messages"
              >
                <MessageCircle className="w-4 h-4" />
                Reply to messages
              </Button>
            </Link>
            <Link to="/app/payments">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="Open payments"
                title="Open payments"
              >
                <CreditCard className="w-4 h-4" />
                Payments & receipts
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Search Watchlist</h3>
          {savedAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save a search from the listings page and it will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {savedAlerts.slice(0, 3).map((alert) => (
                <Link
                  key={alert.id}
                  to={buildSearchPath(buildAlertSearchInput(alert))}
                  className="block rounded-lg bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors"
                >
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.last_match_count} matches · {alert.frequency}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Recommended Next Move</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Keep momentum going with a fresh search in {recommendedLocation}.
          </p>
          <Link to={`/search?q=${encodeURIComponent(recommendedLocation)}`}>
            <Button className="w-full" aria-label="View recommendations" title="View recommendations">
              View Recommendations
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );

  const renderMobileEmpty = (
    Icon: typeof TrendingUp,
    title: string,
    body: string,
    action?: { label: string; to: string }
  ) => (
    <div className="mobile-dashboard-empty">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <p>{body}</p>
      {action ? (
        <Link to={action.to} className="mobile-primary-link">
          {action.label}
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );

  const renderMobileActivityCards = () => {
    if (recentActivity.length === 0) {
      return renderMobileEmpty(
        TrendingUp,
        "No activity yet",
        "Saved homes, messages, payments, and viewings will show up here.",
        { label: "Browse listings", to: "/search" }
      );
    }

    return (
      <div className="mobile-dashboard-stack">
        {recentActivity.map((activity) => (
          <Link key={activity.id} to={activity.href} className="mobile-dashboard-card">
            <span>{formatLabel(activity.type)}</span>
            <strong>{activity.message}</strong>
            <p>{formatRelativeTime(activity.createdAt)}</p>
          </Link>
        ))}
      </div>
    );
  };

  const renderMobileRoleTasks = () => (
    <section className="mobile-dashboard-section">
      <div className="mobile-section-heading">
        <h2>Role tasks</h2>
        <Link to="/workspace">Workspace</Link>
      </div>
      <div className="mobile-role-task-list" aria-label="Role-based task shortcuts">
        {roleTaskPlans.map((plan) => {
          const Icon = roleTaskIconByKey[plan.key];

          return (
            <article key={plan.key} className="mobile-role-task-card">
              <div className="mobile-role-task-topline">
                <span>{plan.priority}</span>
                <strong>{plan.metricValue}</strong>
              </div>
              <div className="mobile-role-task-title">
                <Icon aria-hidden="true" />
                <div>
                  <small>{plan.audience}</small>
                  <h3>{plan.label}</h3>
                </div>
              </div>
              <p>{plan.headline}</p>
              <ul>
                {plan.tasks.slice(0, 2).map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
              <div className="mobile-role-task-actions">
                <Link to={plan.primaryAction.href}>{plan.primaryAction.label}</Link>
                {plan.secondaryAction ? (
                  <Link to={plan.secondaryAction.href}>{plan.secondaryAction.label}</Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderMobileSectionContent = () => {
    if (section === "compare") {
      return (
        <div className="mobile-dashboard-panel">
          <PropertyComparisonPanel savedProperties={savedProperties} />
        </div>
      );
    }

    if (section === "buying-tools") {
      return (
        <div className="mobile-dashboard-panel">
          <BuyerToolkitPanel savedProperties={savedProperties} dealCases={dealCases} />
        </div>
      );
    }

    if (section === "deals") {
      return (
        <div className="mobile-dashboard-panel">
          <DealRoomsPanel
            user={user}
            dealCases={dealCases}
            propertyTransactions={propertyTransactions}
            propertyViewings={propertyViewings}
            documents={dealDocuments}
            conversations={conversations}
          />
        </div>
      );
    }

    if (section === "verification") {
      return (
        <div className="mobile-dashboard-panel">
          <TrustVerificationPanel user={user} dealCases={dealCases} documents={dealDocuments} />
        </div>
      );
    }

    if (section === "insights") {
      return (
        <div className="mobile-dashboard-panel">
          <UserInsightsPanel
            savedProperties={savedProperties}
            dealCases={dealCases}
            propertyTransactions={propertyTransactions}
            propertyViewings={propertyViewings}
            savedAlerts={savedAlerts}
            conversations={conversations}
          />
        </div>
      );
    }

    if (section === "concierge") {
      return (
        <div className="mobile-dashboard-panel">
          <ConciergePanel
            user={user}
            savedProperties={savedProperties}
            dealCases={dealCases}
            propertyViewings={propertyViewings}
            documents={dealDocuments}
          />
        </div>
      );
    }

    if (section === "groups") {
      return (
        <div className="mobile-dashboard-panel">
          <BuyingGroupPanel
            user={user}
            savedProperties={savedProperties}
            dealCases={dealCases}
            conversations={conversations}
          />
        </div>
      );
    }

    if (section === "referrals") {
      return (
        <div className="mobile-dashboard-panel">
          <ReferralProgramPanel user={user} />
        </div>
      );
    }

    if (section === "support") {
      return (
        <div className="mobile-dashboard-panel">
          <SupportPanel organizationContacts={organizationContacts} dealCases={dealCases} />
        </div>
      );
    }

    if (section === "saved") {
      if (savedProperties.length === 0) {
        return renderMobileEmpty(
          Heart,
          "No saved properties",
          "Save listings you love so your mobile shortlist stays ready.",
          { label: "Browse listings", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {savedProperties.map((item) => (
            <Link key={item.id} to={`/property/${item.listing?.id}`} className="mobile-dashboard-card">
              <span>{item.listing?.listing_type || "Listing"}</span>
              <strong>{item.listing?.property?.address || "Saved property"}</strong>
              <p>
                {formatPrice(item.listing?.price)}
                {item.listing?.property?.city ? ` in ${item.listing.property.city}` : ""}
              </p>
            </Link>
          ))}
        </div>
      );
    }

    if (section === "messages") {
      if (conversations.length === 0) {
        return renderMobileEmpty(
          MessageCircle,
          "No conversations yet",
          "Start an inquiry from a property page and the thread lands here.",
          { label: "Search properties", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {conversations.map((conversation) => {
            const counterpartId =
              conversation.participant_1_id === user?.id
                ? conversation.participant_2_id
                : conversation.participant_1_id;
            const counterpart = participantProfiles[counterpartId];
            const latestMessage = [...(conversation.messages || [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            return (
              <article key={conversation.id} className="mobile-dashboard-card">
                <span>{formatRelativeTime(conversation.last_message_at || latestMessage?.created_at)}</span>
                <strong>{counterpart?.full_name || counterpart?.email || "Conversation"}</strong>
                <p>{latestMessage?.content || "No messages yet"}</p>
              </article>
            );
          })}
        </div>
      );
    }

    if (section === "applications") {
      if (dealCases.length === 0) {
        return renderMobileEmpty(
          FileText,
          "No active applications",
          "Offers and applications will appear here once you start a property flow.",
          { label: "Find a property", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {dealCases.map((item) => (
            <article key={item.id} className="mobile-dashboard-card">
              <span>{formatLabel(item.pipeline_stage || item.status)}</span>
              <strong>{getCaseLabel(item.case_type)}</strong>
              <p>
                {item.listing?.property?.address || "Property"} ·{" "}
                {stripReferralMetadata(item.message || "Awaiting next update")}
              </p>
            </article>
          ))}
        </div>
      );
    }

    if (section === "viewings") {
      if (propertyViewings.length === 0) {
        return renderMobileEmpty(
          CalendarDays,
          "No viewings yet",
          "Book a viewing from a listing and confirmations will stay here.",
          { label: "Browse listings", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {propertyViewings.map((viewing) => (
            <article key={viewing.id} className="mobile-dashboard-card">
              <span>{formatPaymentStatusLabel(viewing.status)}</span>
              <strong>{viewing.listing?.property?.address || "Property viewing"}</strong>
              <p>{formatViewingTime(viewing.confirmed_datetime || viewing.requested_datetime)}</p>
              <div className="mobile-dashboard-actions">
                {viewing.listing?.id ? (
                  <Link to={`/property/${viewing.listing.id}`}>Open listing</Link>
                ) : null}
                <button type="button" onClick={() => void handleOpenViewingDirections(viewing)}>
                  Directions
                </button>
                <button type="button" onClick={() => handleAddViewingToCalendar(viewing)}>
                  Add calendar
                </button>
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (section === "access") {
      if (smartAccessGrants.length === 0) {
        return renderMobileEmpty(
          KeyRound,
          "No smart access yet",
          "Confirmed smart-property viewings and tenancy keys will appear here.",
          { label: "Browse listings", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {smartAccessGrants.map((grant) => {
            const latestEvent = Array.isArray(grant.events)
              ? [...grant.events].sort(
                  (a: any, b: any) =>
                    new Date(b.created_at || 0).getTime() -
                    new Date(a.created_at || 0).getTime()
                )[0]
              : null;

            return (
              <article key={grant.id} className="mobile-dashboard-card">
                <span>{formatPaymentStatusLabel(grant.status)}</span>
                <strong>{grant.property?.address || "Smart property access"}</strong>
                <p>
                  {formatViewingTime(grant.starts_at)} to {formatViewingTime(grant.ends_at)}
                </p>
                {latestEvent ? (
                  <p>
                    {formatPaymentStatusLabel(latestEvent.event_type)} /{" "}
                    {formatRelativeTime(latestEvent.created_at)}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      );
    }

    if (section === "alerts") {
      if (savedAlerts.length === 0) {
        return renderMobileEmpty(
          Bell,
          "No saved alerts",
          "Save a search and we will keep watching the market for you.",
          { label: "Start searching", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {savedAlerts.map((alert) => (
            <Link
              key={alert.id}
              to={buildSearchPath(buildAlertSearchInput(alert))}
              className="mobile-dashboard-card"
            >
              <span>{alert.is_active ? "Active" : "Paused"}</span>
              <strong>{alert.title}</strong>
              <p>
                {alert.last_match_count} matches · {alert.frequency}
              </p>
            </Link>
          ))}
        </div>
      );
    }

    if (section === "payments") {
      if (propertyTransactions.length === 0) {
        return renderMobileEmpty(
          CreditCard,
          "No payments yet",
          "Receipts and secure checkout history appear here after payment.",
          { label: "Browse listings", to: "/search" }
        );
      }

      return (
        <div className="mobile-dashboard-stack">
          {propertyTransactions.map((transaction) => (
            <article key={transaction.id} className="mobile-dashboard-card">
              <span>{formatPaymentStatusLabel(transaction.status)}</span>
              <strong>{getPaymentPurposeLabel(transaction.purpose)}</strong>
              <p>
                {formatPaymentAmount(transaction.amount_minor, transaction.currency)} ·{" "}
                {getPaymentGatewayLabel(transaction.provider)} · {transaction.provider_reference}
              </p>
            </article>
          ))}
        </div>
      );
    }

    if (section === "settings") {
      const profilePhone = user?.phone || user?.user_metadata?.phone || "Add phone";

      return (
        <div className="mobile-settings-screen">
          <header className="mobile-settings-header">
            <h1>Settings</h1>
          </header>
          <div className="mobile-settings-profile">
            <div className="mobile-settings-avatar" aria-hidden="true">
              <span>
                {displayName
                  .split(/[ @.]/)
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <h2>{displayName}</h2>
            <p>Premium Buyer Account</p>
          </div>
          <section className="mobile-settings-group" aria-labelledby="dashboard-profile-info">
            <h3 id="dashboard-profile-info">Profile information</h3>
            <div className="mobile-settings-card">
              <Link to="/app/settings" className="mobile-settings-row">
                <span className="mobile-settings-icon">
                  <UserCircle2 aria-hidden="true" />
                </span>
                <strong>Name</strong>
                <span className="mobile-settings-value">{displayName}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
              <Link to="/app/settings" className="mobile-settings-row">
                <span className="mobile-settings-icon">
                  <Mail aria-hidden="true" />
                </span>
                <strong>Email</strong>
                <span className="mobile-settings-value">{user?.email}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
              <Link to="/app/settings" className="mobile-settings-row">
                <span className="mobile-settings-icon">
                  <Phone aria-hidden="true" />
                </span>
                <strong>Phone</strong>
                <span className="mobile-settings-value">{profilePhone}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </section>
          <section className="mobile-settings-group" aria-labelledby="dashboard-preferences">
            <h3 id="dashboard-preferences">Preferences</h3>
            <div className="mobile-settings-card">
              <Link to="/app/notifications" className="mobile-settings-row">
                <span className="mobile-settings-icon is-danger">
                  <Bell aria-hidden="true" />
                </span>
                <strong>Push Notifications</strong>
                <span className="mobile-settings-switch is-on" aria-hidden="true" />
              </Link>
              <Link to="/forgot-password" className="mobile-settings-row">
                <span className="mobile-settings-icon is-muted">
                  <KeyRound aria-hidden="true" />
                </span>
                <strong>Security & Password</strong>
                <span className="mobile-settings-value">Review</span>
                <ChevronRight aria-hidden="true" />
              </Link>
              <Link to="/app/settings" className="mobile-settings-row">
                <span className="mobile-settings-icon is-muted">
                  <Moon aria-hidden="true" />
                </span>
                <strong>Appearance</strong>
                <span className="mobile-settings-value">System</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </section>
          <button
            type="button"
            className="mobile-settings-signout"
            onClick={() => void handleSettingsSignOut()}
          >
            Sign Out
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="mobile-command-grid">
          {[
            {
              to: "/app/deals",
              icon: Shield,
              title: "Continue deals",
              detail: `${dealCases.length} active flow${dealCases.length === 1 ? "" : "s"}`,
            },
            {
              to: "/app/messages",
              icon: MessageCircle,
              title: "Reply",
              detail: `${unreadMessages} unread messages`,
            },
            {
              to: "/app/saved",
              icon: Heart,
              title: "Saved homes",
              detail: `${savedProperties.length} saved homes`,
            },
            {
              to: "/app/buying-tools",
              icon: Calculator,
              title: "Buying guide",
              detail: `Plan around ${recommendedLocation}`,
            },
            {
              to: "/app/verification",
              icon: UserCheck,
              title: "Verify safely",
              detail: "ID, title, and address checks",
            },
            {
              to: "/app/support",
              icon: Wrench,
              title: "Get help",
              detail: "Support and handoff help",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.to} to={item.to} className="mobile-command-card">
                <Icon aria-hidden="true" />
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </Link>
            );
          })}
        </div>

        {renderMobileRoleTasks()}

        <section className="mobile-dashboard-section">
          <div className="mobile-section-heading">
            <h2>Recent activity</h2>
            <Link to="/app/messages">Inbox</Link>
          </div>
          {renderMobileActivityCards()}
        </section>
      </>
    );
  };

  const renderMobileDashboardShell = () => {
    const activeRoute = USER_DASHBOARD_ROUTE_CONFIG.find((item) => item.section === section);

    return (
      <section className="mobile-dashboard-native">
        <header className="mobile-dashboard-hero">
          <p className="mobile-eyebrow">Your BaytMiftah</p>
          <h1>{activeRoute?.label || "Dashboard"}</h1>
          <p>
            Welcome back, {displayName}. Your saved homes, viewings, messages, and payments stay
            grouped for one-thumb mobile use.
          </p>
        </header>

        <div className="mobile-dashboard-metrics">
          <div>
            <span>Saved</span>
            <strong>{savedProperties.length}</strong>
          </div>
          <div>
            <span>Deals</span>
            <strong>{dealCases.length}</strong>
          </div>
          <div>
            <span>Viewings</span>
            <strong>{propertyViewings.length}</strong>
          </div>
          <div>
            <span>Alerts</span>
            <strong>{savedAlerts.filter((alert) => alert.is_active).length}</strong>
          </div>
        </div>

        <nav className="mobile-dashboard-rail" aria-label="Dashboard sections">
          {primaryDashboardRoutes.map((item) => {
            const Icon = navIconBySection[item.section];
            const active = item.section === section;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={active ? "is-active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {loading ? (
          <div className="mobile-dashboard-loading">
            <Loader2 aria-hidden="true" />
            <p>{verifyingReference ? "Verifying payment..." : "Loading dashboard..."}</p>
          </div>
        ) : (
          renderMobileSectionContent()
        )}
      </section>
    );
  };

  if (isMobileShell) {
    return renderMobileDashboardShell();
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4 max-w-7xl mx-auto" : "pt-24 pb-12 px-4 max-w-7xl mx-auto"}>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Welcome back, {displayName}.</h1>
          <p className="text-muted-foreground">
            Track your saved homes, conversations, viewings, and payments without chasing tabs.
          </p>
        </div>

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

        <div className="flex flex-wrap gap-3 mb-8">
          {primaryDashboardRoutes.map((item) => {
            const Icon = navIconBySection[item.section];
            const active =
              (item.href === "/app" && section === "overview") ||
              item.href === `/app/${section}`;

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

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              {verifyingReference && <p>Verifying your property payment securely...</p>}
            </div>
          </div>
        ) : section === "compare" ? (
          <PropertyComparisonPanel savedProperties={savedProperties} />
        ) : section === "buying-tools" ? (
          <BuyerToolkitPanel
            savedProperties={savedProperties}
            dealCases={dealCases}
          />
        ) : section === "deals" ? (
          <DealRoomsPanel
            user={user}
            dealCases={dealCases}
            propertyTransactions={propertyTransactions}
            propertyViewings={propertyViewings}
            documents={dealDocuments}
            conversations={conversations}
          />
        ) : section === "verification" ? (
          <TrustVerificationPanel user={user} dealCases={dealCases} documents={dealDocuments} />
        ) : section === "insights" ? (
          <UserInsightsPanel
            savedProperties={savedProperties}
            dealCases={dealCases}
            propertyTransactions={propertyTransactions}
            propertyViewings={propertyViewings}
            savedAlerts={savedAlerts}
            conversations={conversations}
          />
        ) : section === "concierge" ? (
          <ConciergePanel
            user={user}
            savedProperties={savedProperties}
            dealCases={dealCases}
            propertyViewings={propertyViewings}
            documents={dealDocuments}
          />
        ) : section === "groups" ? (
          <BuyingGroupPanel
            user={user}
            savedProperties={savedProperties}
            dealCases={dealCases}
            conversations={conversations}
          />
        ) : section === "referrals" ? (
          <ReferralProgramPanel user={user} />
        ) : section === "support" ? (
          <SupportPanel organizationContacts={organizationContacts} dealCases={dealCases} />
        ) : section === "saved" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Saved Properties</h2>
              <p className="text-muted-foreground mt-1">
                Keep track of the listings you want to revisit.
              </p>
            </div>
            {renderSavedGrid(savedProperties)}
          </section>
        ) : section === "messages" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Messages</h2>
              <p className="text-muted-foreground mt-1">
                Review your latest property conversations.
              </p>
            </div>
            {renderConversations()}
          </section>
        ) : section === "applications" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Applications</h2>
              <p className="text-muted-foreground mt-1">
                Follow the status of your inquiries, offers, and applications.
              </p>
            </div>
            {renderApplications()}
          </section>
        ) : section === "viewings" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Viewings</h2>
              <p className="text-muted-foreground mt-1">
                Track requested and confirmed property visits in one place.
              </p>
            </div>
            {renderViewings()}
          </section>
        ) : section === "access" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Smart Access</h2>
              <p className="text-muted-foreground mt-1">
                See time-boxed entry windows and tenancy access grants for smart properties.
              </p>
            </div>
            {renderSmartAccess()}
          </section>
        ) : section === "alerts" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Saved Alerts</h2>
              <p className="text-muted-foreground mt-1">
                Keep search alerts active and manage the filters watching the market for you.
              </p>
            </div>
            {renderAlerts()}
          </section>
        ) : section === "payments" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Payments</h2>
              <p className="text-muted-foreground mt-1">
                Review property payments, open receipts, and track receipt integrity.
              </p>
            </div>
            {renderPayments()}
          </section>
        ) : section === "settings" ? (
          <section>
            {renderSettings()}
          </section>
        ) : (
          renderOverview()
        )}
      </div>
    </div>
  );
}
