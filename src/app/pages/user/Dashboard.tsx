import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowRightLeft,
  ArrowRight,
  Bell,
  Calculator,
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  HandCoins,
  Heart,
  Loader2,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Share2,
  Shield,
  TrendingUp,
  UserCircle2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../../components/Navbar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { dealCaseService } from "../../../lib/dealcase.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { messageService } from "../../../lib/message.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { savedSearchAlertService } from "../../../lib/saved-search-alert.service";
import { savedPropertyService } from "../../../lib/savedproperty.service";
import {
  buildAbsoluteSearchUrl,
  buildAlertSearchInput,
  buildSearchPath,
} from "../../../lib/search-sharing";
import { userService } from "../../../lib/user.service";
import { stripReferralMetadata } from "../../../lib/referral-attribution.service";
import { formatLabel, parseOfferSummary } from "../../features/expansion/feature-helpers";
import {
  BuyerToolkitPanel,
  DealRoomsPanel,
  PropertyComparisonPanel,
  ReferralProgramPanel,
  SupportPanel,
} from "../../features/user/UserExpansionPanels";
import {
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

export function UserDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);
  const [dealDocuments, setDealDocuments] = useState<any[]>([]);
  const [organizationContacts, setOrganizationContacts] = useState<
    Array<{ name: string; email?: string | null; phone?: string | null }>
  >([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [verifyingReference, setVerifyingReference] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const section = getUserDashboardSection(location.pathname);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        if (!cancelled) setLoading(true);
        const [saved, deals, chats, payments, viewings, alerts] = await Promise.all([
          savedPropertyService.getSavedProperties(user.id),
          dealCaseService.getDealCasesByUser(user.id),
          messageService.getUserConversations(user.id),
          paymentService.getUserPropertyTransactions(user.id),
          propertyViewingService.getUserViewings(user.id),
          savedSearchAlertService.getUserAlerts(user.id),
        ]);

        if (!cancelled) {
          setSavedProperties(saved || []);
          setDealCases(deals || []);
          setConversations(chats || []);
          setPropertyTransactions(payments || []);
          setPropertyViewings(viewings || []);
          setSavedAlerts(alerts || []);
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
    const reference = searchParams.get("reference");

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

  const navIconBySection: Record<
    UserDashboardSection,
    typeof TrendingUp
  > = {
    overview: TrendingUp,
    compare: ArrowRightLeft,
    "buying-tools": Calculator,
    deals: Shield,
    referrals: HandCoins,
    support: Wrench,
    saved: Heart,
    messages: MessageCircle,
    applications: FileText,
    viewings: CalendarDays,
    alerts: Bell,
    payments: CreditCard,
    settings: Settings,
  };

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

  const handleShareAlert = async (alert: any) => {
    if (typeof window === "undefined") return;

    const searchUrl = buildAbsoluteSearchUrl(
      buildAlertSearchInput(alert),
      window.location.origin
    );

    try {
      if (navigator.share) {
        await navigator.share({
          title: alert.title || "Property Hub search alert",
          text: "Take a look at this Property Hub search.",
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
                        {receipt?.blockchain_status === "confirmed" && (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            Verified on Polygon
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
    </div>
  );

  const renderOverview = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/search">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="Search properties"
                title="Search properties"
              >
                <Search className="w-4 h-4" />
                Search Properties
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
                View Messages
              </Button>
            </Link>
            <Link to="/app/compare">
              <Button variant="outline" className="w-full justify-start">
                <ArrowRightLeft className="w-4 h-4" />
                Compare Properties
              </Button>
            </Link>
            <Link to="/app/buying-tools">
              <Button variant="outline" className="w-full justify-start">
                <Calculator className="w-4 h-4" />
                Buyer Toolkit
              </Button>
            </Link>
            <Link to="/app/deals">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4" />
                Deal Rooms
              </Button>
            </Link>
            <Link to="/app/applications">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="View my applications"
                title="View my applications"
              >
                <FileText className="w-4 h-4" />
                My Applications
              </Button>
            </Link>
            <Link to="/app/settings">
              <Button
                variant="outline"
                className="w-full justify-start"
                aria-label="Open account settings"
                title="Open account settings"
              >
                <Settings className="w-4 h-4" />
                Account Settings
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
                Payments
              </Button>
            </Link>
            <Link to="/app/alerts">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="w-4 h-4" />
                Saved Alerts
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Welcome back, {displayName}.</h1>
          <p className="text-muted-foreground">
            Track your saved properties, conversations, and active deal flow in one place.
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
          {USER_DASHBOARD_ROUTE_CONFIG.map((item) => {
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
              {verifyingReference && <p>Verifying your Paystack payment securely...</p>}
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
            dealCases={dealCases}
            propertyTransactions={propertyTransactions}
            propertyViewings={propertyViewings}
            documents={dealDocuments}
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
                Review Paystack payments, open receipts, and track Polygon verification.
              </p>
            </div>
            {renderPayments()}
          </section>
        ) : section === "settings" ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Settings</h2>
              <p className="text-muted-foreground mt-1">
                Manage your account and session preferences.
              </p>
            </div>
            {renderSettings()}
          </section>
        ) : (
          renderOverview()
        )}
      </div>
    </div>
  );
}
