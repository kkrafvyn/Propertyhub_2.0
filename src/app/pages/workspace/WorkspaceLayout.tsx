import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  HandCoins,
  Home,
  LineChart,
  MessageCircle,
  AlertTriangle,
  MoreHorizontal,
  Plus,
  Settings,
  Shield,
  KeyRound,
  UserCircle2,
  Users,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database } from "../../../lib/database.types";
import { dealCaseService } from "../../../lib/dealcase.service";
import { listingService } from "../../../lib/listing.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import {
  getWorkspaceAccessState,
  subscriptionService,
  type OrganizationBillingOverview,
} from "../../../lib/subscription.service";
import { FraudAlerts } from "./FraudAlerts";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { WorkspaceBilling } from "./WorkspaceBilling";
import { CalendarOperations } from "./CalendarOperations";
import { WorkspaceDocuments } from "./WorkspaceDocuments";
import { WorkspaceFinance } from "./WorkspaceFinance";
import { GhanaTrustCenter } from "./GhanaTrustCenter";
import { WorkspaceLeads } from "./WorkspaceLeads";
import { WorkspaceListings } from "./WorkspaceListings";
import { WorkspaceNewListing } from "./WorkspaceNewListing";
import { WorkspacePayments } from "./WorkspacePayments";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { WorkspaceSmartAccess } from "./WorkspaceSmartAccess";
import { WorkspaceTeam } from "./WorkspaceTeam";
import { WorkspaceExpansionSuite } from "../../features/workspace/WorkspaceExpansionSuite";
import {
  WORKSPACE_GROWTH_ROUTE_CONFIG,
  getWorkspaceGrowthSection,
  type WorkspaceGrowthSection,
} from "../../features/expansion/section-navigation";
import {
  WORKSPACE_ENTRY_PATH,
  getWorkspaceRoute,
  normalizeOrganizationMemberships,
  type MemberRole,
  type MembershipRow,
  type OrganizationMembership,
} from "../../../lib/workspace";

interface NavItem {
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const CORE_NAV_ITEMS: NavItem[] = [
  { slug: "", label: "Dashboard", icon: Home },
  { slug: "billing", label: "Billing", icon: CreditCard },
  { slug: "listings", label: "Listings", icon: Building2 },
  { slug: "leads", label: "Leads & Messages", icon: MessageCircle },
  { slug: "documents", label: "Documents", icon: FileText },
  { slug: "trust", label: "Ghana Trust", icon: Shield },
  { slug: "calendar", label: "Calendar Ops", icon: CalendarDays },
  { slug: "payments", label: "Payments", icon: CreditCard },
  { slug: "smart-access", label: "Smart Access", icon: KeyRound },
  { slug: "finance", label: "Finance", icon: BarChart3 },
  { slug: "team", label: "Team", icon: Users },
];

const GROWTH_NAV_ICON_BY_SLUG: Record<
  WorkspaceGrowthSection,
  ComponentType<{ className?: string }>
> = {
  offers: ArrowRightLeft,
  "deal-rooms": FileText,
  performance: LineChart,
  "seller-portal": Building2,
  crm: Brain,
  referrals: HandCoins,
  aftercare: Wrench,
};

const GROWTH_NAV_ITEMS: NavItem[] = WORKSPACE_GROWTH_ROUTE_CONFIG.map((item) => ({
  slug: item.slug,
  label: item.label,
  icon: GROWTH_NAV_ICON_BY_SLUG[item.slug],
}));

const TIER_TWO_NAV_ITEMS: NavItem[] = [
  { slug: "fraud-alerts", label: "Fraud Alerts", icon: AlertTriangle },
];

interface WorkspaceExperience {
  headline: string;
  helper: string;
  coreSlugs: string[];
  growthSlugs: string[];
  advancedSlugs: string[];
  showNewListing: boolean;
  taskCards: Array<{
    label: string;
    helper: string;
    slug: string;
  }>;
}

interface MobileOperationsMetrics {
  membersCount: number;
  members: any[];
  listings: any[];
  dealCases: any[];
  payments: any[];
  viewings: any[];
}

interface MobileDetailSheet {
  title: string;
  subtitle: string;
  meta: Array<{ label: string; value: string }>;
  actions: Array<{ label: string; href?: string; tone?: "primary" | "neutral" | "danger" }>;
}

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-GH", { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

function formatShortTime(value?: string | null) {
  if (!value) return "Now";

  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getListingCoverUrl(listing: any) {
  const media = Array.isArray(listing?.property?.media) ? listing.property.media : [];
  const cover = media.find((item: any) => item.is_primary || item.media_type === "image") || media[0];

  return cover?.url || cover?.media_url || cover?.storage_path || null;
}

function getListingAddress(listing: any) {
  return [
    listing?.property?.address,
    listing?.property?.neighborhood,
    listing?.property?.city,
  ]
    .filter(Boolean)
    .join(", ") || "Property listing";
}

function getListingPriceLabel(listing: any) {
  const price = Number(listing?.price || 0);
  const currency = listing?.currency || "GHS";

  if (!price) return "Price pending";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function getSoftStatusClasses(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (["active", "listed", "success", "confirmed", "completed", "approved", "won", "closed"].includes(normalized)) {
    return "bg-emerald-500";
  }
  if (["flagged", "suspended", "failed", "cancelled", "rejected", "missed", "lost"].includes(normalized)) {
    return "bg-rose-500";
  }
  return "bg-amber-400";
}

function getLeadClientName(lead: any) {
  return (
    lead?.buyer?.full_name ||
    lead?.client?.full_name ||
    lead?.profile?.full_name ||
    lead?.buyer_email ||
    "Client"
  );
}

function getWorkspaceExperience(role: MemberRole | null): WorkspaceExperience {
  switch (role) {
    case "owner":
      return {
        headline: "Owner view",
        helper: "Billing, team, verification, and core operations stay visible for decision makers.",
        coreSlugs: ["", "billing", "listings", "leads", "documents", "trust", "calendar", "payments", "smart-access", "finance", "team"],
        growthSlugs: ["offers", "deal-rooms", "performance", "seller-portal", "referrals", "aftercare"],
        advancedSlugs: ["fraud-alerts"],
        showNewListing: true,
        taskCards: [
          {
            label: "Approve the exceptions",
            helper: "Review open deal rooms, trust gaps, payments, and owner-facing blockers.",
            slug: "deal-rooms",
          },
          {
            label: "Check performance",
            helper: "See which agents, listings, and channels are moving revenue.",
            slug: "performance",
          },
          {
            label: "Prepare owner updates",
            helper: "Package seller proof, demand, net-sheet, and next actions.",
            slug: "seller-portal",
          },
          {
            label: "Watch risk",
            helper: "Monitor for fraud alerts and suspicious listings.",
            slug: "fraud-alerts",
          },
        ],
      };
    case "manager":
      return {
        headline: "Manager view",
        helper: "Daily operations, approvals, and service work are prioritized.",
        coreSlugs: ["", "billing", "listings", "leads", "documents", "trust", "calendar", "payments", "smart-access", "team"],
        growthSlugs: ["offers", "deal-rooms", "performance", "seller-portal", "crm", "aftercare"],
        advancedSlugs: ["fraud-alerts"],
        showNewListing: true,
        taskCards: [
          {
            label: "Run today",
            helper: "Move leads, viewings, payment gaps, and documents through the queue.",
            slug: "crm",
          },
          {
            label: "Clear deal blockers",
            helper: "Use deal rooms to find what is missing before buyers go cold.",
            slug: "deal-rooms",
          },
          {
            label: "Dispatch aftercare",
            helper: "Assign handoff, maintenance, and service work without exposing every admin tool.",
            slug: "aftercare",
          },
          {
            label: "Watch risk",
            helper: "Monitor fraud alerts when exceptions appear.",
            slug: "fraud-alerts",
          },
        ],
      };
    case "analyst":
      return {
        headline: "Analyst view",
        helper: "Reporting and performance metrics are visible without listing controls.",
        coreSlugs: ["", "billing", "listings", "finance"],
        growthSlugs: ["performance", "seller-portal"],
        advancedSlugs: [],
        showNewListing: false,
        taskCards: [
          {
            label: "Read demand",
            helper: "Compare listing demand, area movement, and conversion before recommending changes.",
            slug: "performance",
          },
          {
            label: "Explain finance",
            helper: "Turn payment, pipeline, and net-sheet numbers into plain owner guidance.",
            slug: "finance",
          },
          {
            label: "Check performance",
            helper: "Review sales performance and market trends.",
            slug: "performance",
          },
          {
            label: "Summarize health",
            helper: "Create a concise organizational health report.",
            slug: "finance",
          },
        ],
      };
    case "agent":
    default:
      return {
        headline: "Agent view",
        helper: "The tools you need most: listings, leads, viewings, documents, and deal follow-up.",
        coreSlugs: ["", "billing", "listings", "leads", "documents", "trust", "calendar", "smart-access"],
        growthSlugs: ["offers", "deal-rooms", "crm", "aftercare"],
        advancedSlugs: [],
        showNewListing: true,
        taskCards: [
          {
            label: "Reply first",
            helper: "Start with leads and messages while buyer intent is still warm.",
            slug: "leads",
          },
          {
            label: "Confirm tours",
            helper: "Keep viewings, calendar notes, and follow-ups in the same workflow.",
            slug: "calendar",
          },
          {
            label: "Capture the offer",
            helper: "Move serious buyers into offer and deal-room steps before payment.",
            slug: "offers",
          },
          {
            label: "Close the handoff",
            helper: "Use aftercare for keys, service needs, and move-in confidence.",
            slug: "aftercare",
          },
        ],
      };
  }
}

function getNavItemClasses(isActive: boolean) {
  return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    isActive ? "bg-primary text-white" : "hover:bg-secondary"
  }`;
}

function getFeatureNavItemClasses(isActive: boolean) {
  return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
  }`;
}

function getRoleLabel(role: MemberRole | null) {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function WorkspaceLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { organizationSlug = "", page } = useParams();
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [billing, setBilling] = useState<OrganizationBillingOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileActionSheet, setMobileActionSheet] = useState<"quick" | "more" | null>(null);
  const [mobileDetailSheet, setMobileDetailSheet] = useState<MobileDetailSheet | null>(null);
  const [mobileSwipeItemId, setMobileSwipeItemId] = useState<string | null>(null);
  const [mobileTouchStartX, setMobileTouchStartX] = useState<number | null>(null);
  const [mobileMetrics, setMobileMetrics] = useState<MobileOperationsMetrics>({
    membersCount: 0,
    members: [],
    listings: [],
    dealCases: [],
    payments: [],
    viewings: [],
  });

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadWorkspaceMemberships = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const rows = (await organizationService.getUserOrganizations(user.id)) as MembershipRow[];
        const normalizedMemberships = normalizeOrganizationMemberships(rows);

        if (!cancelled) {
          setMemberships(normalizedMemberships);
        }
      } catch (error) {
        console.error("Failed to load workspace memberships:", error);
        if (!cancelled) {
          setLoadError("We couldn't load your workspace organizations right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkspaceMemberships();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.organization.slug === organizationSlug) || null,
    [memberships, organizationSlug]
  );

  const fallbackMembership = memberships[0] || null;
  const organization = currentMembership?.organization || null;
  const currentRole = currentMembership?.role || null;
  const currentPage = page || "";
  const workspaceBasePath = organization
    ? getWorkspaceRoute(organization.slug)
    : WORKSPACE_ENTRY_PATH;
  const workspaceExperience = getWorkspaceExperience(currentRole);
  const workspaceAccess = getWorkspaceAccessState(billing?.subscription || null);
  const visibleCoreNavItems = CORE_NAV_ITEMS.filter((item) =>
    workspaceExperience.coreSlugs.includes(item.slug)
  );
  const visibleGrowthNavItems: NavItem[] = [];
  const visibleAdvancedNavItems: NavItem[] = [];
  const listedCount = mobileMetrics.listings.filter((listing) => listing.status === "listed").length;
  const activeLeadsCount = mobileMetrics.dealCases.filter((dealCase) =>
    ["pending", "new", "contacted", "qualified", "viewing_scheduled", "negotiation"].includes(
      dealCase.status || dealCase.pipeline_stage
    )
  ).length;
  const todayViewingsCount = mobileMetrics.viewings.filter((viewing) => {
    const dateValue = viewing.confirmed_datetime || viewing.requested_datetime;
    if (!dateValue) return false;
    return new Date(dateValue).toDateString() === new Date().toDateString();
  }).length;
  const closedDealsCount = mobileMetrics.dealCases.filter((dealCase) =>
    ["closed", "approved", "won"].includes(dealCase.status || dealCase.pipeline_stage)
  ).length;
  const collectedRevenue = mobileMetrics.payments
    .filter((payment) => payment.status === "success")
    .reduce((total, payment) => total + Number(payment.amount_minor || 0) / 100, 0);
  const pendingApprovalsCount =
    mobileMetrics.listings.filter((listing) =>
      ["pending", "pending_review", "draft"].includes(listing.status || listing.visibility)
    ).length +
    mobileMetrics.dealCases.filter((dealCase) => dealCase.status === "pending").length;

  useEffect(() => {
    if (!organization) {
      setBilling(null);
      return;
    }

    let cancelled = false;

    const loadBilling = async () => {
      try {
        setBillingLoading(true);
        const overview = await subscriptionService.getOrganizationBillingOverview(organization.id);
        if (!cancelled) {
          setBilling(overview);
        }
      } catch (error) {
        console.error("Failed to load workspace billing state:", error);
        if (!cancelled) {
          setLoadError("We couldn't load the workspace billing status right now.");
        }
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    };

    void loadBilling();

    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  useEffect(() => {
    if (!organization) {
      setMobileMetrics({
        membersCount: 0,
        members: [],
        listings: [],
        dealCases: [],
        payments: [],
        viewings: [],
      });
      return;
    }

    let cancelled = false;

    const loadMobileOperations = async () => {
      try {
        const [organizationListings, organizationDeals, members, payments, viewings] = await Promise.all([
          listingService.getOrganizationListings(organization.id),
          dealCaseService.getDealCasesByOrganization(organization.id),
          organizationService.getOrganizationMembers(organization.id),
          paymentService.getOrganizationPropertyTransactions(organization.id),
          propertyViewingService.getOrganizationViewings(organization.id),
        ]);

        if (!cancelled) {
          setMobileMetrics({
            membersCount: (members || []).length,
            members: members || [],
            listings: organizationListings || [],
            dealCases: organizationDeals || [],
            payments: payments || [],
            viewings: viewings || [],
          });
        }
      } catch (error) {
        console.error("Failed to load mobile workspace operations:", error);
      }
    };

    void loadMobileOperations();

    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const handleOrganizationChange = (organizationId: string) => {
    const nextMembership = memberships.find(
      (membership) => membership.organization.id === organizationId
    );

    if (!nextMembership) return;

    const nextPath = page
      ? getWorkspaceRoute(nextMembership.organization.slug, page)
      : getWorkspaceRoute(nextMembership.organization.slug);
    navigate(nextPath);
  };

  const handleMobileSwipeStart = (clientX: number) => {
    setMobileTouchStartX(clientX);
  };

  const handleMobileSwipeEnd = (itemId: string, clientX: number) => {
    if (mobileTouchStartX === null) return;

    const delta = clientX - mobileTouchStartX;
    if (delta < -44) {
      setMobileSwipeItemId(itemId);
    } else if (delta > 36) {
      setMobileSwipeItemId(null);
    }

    setMobileTouchStartX(null);
  };

  const openMobileDetail = (detail: MobileDetailSheet) => {
    setMobileSwipeItemId(null);
    setMobileDetailSheet(detail);
  };

  const renderWorkspaceRoleTasks = () => {
    const allNavItems = [
      ...CORE_NAV_ITEMS,
      ...GROWTH_NAV_ITEMS,
      ...TIER_TWO_NAV_ITEMS,
      { slug: "settings", label: "Settings", icon: Settings },
    ];

    return (
      <section className="mb-8 hidden overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-white via-white to-secondary/35 p-6 shadow-sm lg:block">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {workspaceExperience.headline}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Start with the work that matters today.
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              BaytMiftah keeps advanced CRM, trust, finance, and automation behind the scenes so
              each role can focus on the next practical action.
            </p>
          </div>
          {workspaceExperience.showNewListing ? (
            <Link to={`${workspaceBasePath}/new`}>
              <Button>
                <Plus className="h-4 w-4" />
                Add property
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workspaceExperience.taskCards.map((task) => {
            const navItem = allNavItems.find((item) => item.slug === task.slug);
            const Icon = navItem?.icon || ArrowRight;
            const href = task.slug ? `${workspaceBasePath}/${task.slug}` : workspaceBasePath;

            return (
              <Link
                key={task.label}
                to={href}
                className="group rounded-3xl border border-border/70 bg-background/85 p-4 text-foreground transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <h2 className="mt-4 text-base font-semibold">{task.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.helper}</p>
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const renderMobileOperationsHome = () => {
    const agencyMode = currentRole === "owner" ? "Agency Control" : "Operations";
    const healthCards = [
      { label: "Active Listings", value: formatCompactNumber(listedCount), href: `${workspaceBasePath}/listings`, tone: "from-primary to-rose-400" },
      { label: "New Leads", value: formatCompactNumber(activeLeadsCount), href: `${workspaceBasePath}/leads`, tone: "from-[#ff5a7a] to-primary" },
      { label: "Today's Viewings", value: formatCompactNumber(todayViewingsCount), href: `${workspaceBasePath}/calendar`, tone: "from-primary to-rose-400" },
      { label: "Pending Approvals", value: formatCompactNumber(pendingApprovalsCount), href: `${workspaceBasePath}/documents`, tone: "from-amber-600 to-orange-400" },
      { label: "Closed Deals", value: formatCompactNumber(closedDealsCount), href: `${workspaceBasePath}/payments`, tone: "from-primary to-rose-400" },
      { label: "Revenue", value: currencyFormatter.format(collectedRevenue), href: `${workspaceBasePath}/finance`, tone: "from-zinc-700 to-zinc-500" },
      { label: "Active Agents", value: formatCompactNumber(mobileMetrics.membersCount), href: `${workspaceBasePath}/team`, tone: "from-stone-800 to-stone-500" },
    ];
    const quickActions = [
      { label: "Add Listing", href: `${workspaceBasePath}/new`, icon: Plus, requiresListingAccess: true },
      { label: "Assign Lead", href: `${workspaceBasePath}/leads`, icon: MessageCircle },
      { label: "Schedule", href: `${workspaceBasePath}/calendar`, icon: CalendarDays },
      { label: "Approve", href: `${workspaceBasePath}/documents`, icon: Shield },
      { label: "Contact", href: `${workspaceBasePath}/leads`, icon: Users },
    ].filter((action) => !action.requiresListingAccess || workspaceExperience.showNewListing);
    const activityItems = [
      ...mobileMetrics.dealCases.slice(0, 2).map((dealCase) => ({
        label: "New inquiry received",
        detail: dealCase.listing?.property?.address || "Lead waiting for assignment",
        time: formatShortTime(dealCase.created_at || dealCase.updated_at),
      })),
      ...mobileMetrics.viewings.slice(0, 2).map((viewing) => ({
        label: "Viewing scheduled",
        detail: viewing.listing?.property?.address || "Property viewing",
        time: formatShortTime(viewing.confirmed_datetime || viewing.requested_datetime),
      })),
      ...mobileMetrics.listings.slice(0, 2).map((listing) => ({
        label: listing.status === "listed" ? "Listing published" : "Listing updated",
        detail: listing.property?.address || "Property listing",
        time: formatShortTime(listing.updated_at || listing.created_at),
      })),
      ...mobileMetrics.payments.slice(0, 2).map((payment) => ({
        label: payment.status === "success" ? "Payment confirmed" : "Payment activity",
        detail: currencyFormatter.format(Number(payment.amount_minor || 0) / 100),
        time: formatShortTime(payment.created_at || payment.updated_at),
      })),
    ].slice(0, 5);

    return (
      <section className="mb-6 space-y-5 lg:hidden">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {agencyMode}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            What needs attention right now?
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Run listings, leads, viewings, payments, and team handoffs from one calm mobile workspace.
          </p>
        </div>

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {healthCards.map((card) => (
            <Link
              key={card.label}
              to={card.href}
              className={`min-w-[172px] snap-start rounded-[1.75rem] bg-gradient-to-br ${card.tone} p-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]`}
            >
              <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm text-white/78">{card.label}</p>
            </Link>
          ))}
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
              <p className="text-sm text-slate-500">One or two taps, then back to work.</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              onClick={() => setMobileActionSheet("quick")}
            >
              Open
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex min-h-20 items-center gap-3 rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-900"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
          <h2 className="text-lg font-semibold text-slate-950">Live operations</h2>
          <div className="mt-4 space-y-4">
            {(activityItems.length ? activityItems : workspaceExperience.taskCards.slice(0, 4)).map((item) => (
              <Link
                key={`${item.label}-${"detail" in item ? item.detail : item.slug}`}
                to={"detail" in item ? `${workspaceBasePath}/leads` : `${workspaceBasePath}/${item.slug}`}
                className="flex gap-3"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 border-b border-slate-100 pb-3 last:border-b-0">
                  <strong className="block text-sm text-slate-950">{item.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {"detail" in item ? `${item.detail} - ${item.time}` : item.helper}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderMobileModuleHeader = () => {
    if (currentPage === "") return null;

    const moduleConfig: Record<
      string,
      {
        title: string;
        subtitle: string;
        metric: string;
        helper: string;
        actions: Array<{ label: string; href: string; icon: ComponentType<{ className?: string }> }>;
      }
    > = {
      listings: {
        title: "Listings",
        subtitle: "Publish, assign, pause, boost, and archive inventory from one card-first queue.",
        metric: formatCompactNumber(mobileMetrics.listings.length),
        helper: `${listedCount} active, ${pendingApprovalsCount} awaiting action`,
        actions: [
          { label: "Add Listing", href: `${workspaceBasePath}/new`, icon: Plus },
          { label: "Assign Agent", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Review Docs", href: `${workspaceBasePath}/documents`, icon: Shield },
        ],
      },
      leads: {
        title: "Leads",
        subtitle: "Assign agents, prioritize hot inquiries, update stages, and keep clients moving.",
        metric: formatCompactNumber(activeLeadsCount),
        helper: "New, contacted, viewing, negotiation, and closed stages.",
        actions: [
          { label: "Assign Lead", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Message Client", href: `${workspaceBasePath}/leads`, icon: MessageCircle },
          { label: "Schedule Follow-up", href: `${workspaceBasePath}/calendar`, icon: CalendarDays },
        ],
      },
      calendar: {
        title: "Viewings",
        subtitle: "A calendar-and-cards flow for today, upcoming, completed, and missed appointments.",
        metric: formatCompactNumber(todayViewingsCount),
        helper: "Today's site visits and follow-up windows.",
        actions: [
          { label: "Schedule", href: `${workspaceBasePath}/calendar`, icon: CalendarDays },
          { label: "Notify Client", href: `${workspaceBasePath}/leads`, icon: MessageCircle },
          { label: "Reassign", href: `${workspaceBasePath}/team`, icon: Users },
        ],
      },
      payments: {
        title: "Transactions",
        subtitle: "Track deposits, booking fees, confirmations, refunds, and receipts.",
        metric: currencyFormatter.format(collectedRevenue),
        helper: `${mobileMetrics.payments.length} payment records visible`,
        actions: [
          { label: "Confirm Payment", href: `${workspaceBasePath}/payments`, icon: CreditCard },
          { label: "Send Receipt", href: `${workspaceBasePath}/documents`, icon: FileText },
          { label: "Escalate", href: `${workspaceBasePath}/payments`, icon: AlertTriangle },
        ],
      },
      finance: {
        title: "Analytics",
        subtitle: "Executive-level insight without overwhelming managers: revenue, conversion, and performance.",
        metric: currencyFormatter.format(collectedRevenue),
        helper: "Revenue trend, conversion rate, lead source, and agent performance.",
        actions: [
          { label: "Revenue", href: `${workspaceBasePath}/finance`, icon: BarChart3 },
          { label: "Agents", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Listings", href: `${workspaceBasePath}/listings`, icon: Building2 },
        ],
      },
      team: {
        title: "Team",
        subtitle: "Monitor agent workload, activity, viewings, response speed, and assignments.",
        metric: formatCompactNumber(mobileMetrics.membersCount),
        helper: "Owners, managers, agents, and analysts.",
        actions: [
          { label: "Assign Task", href: `${workspaceBasePath}/leads`, icon: ArrowRight },
          { label: "Invite Agent", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Review Activity", href: `${workspaceBasePath}/finance`, icon: LineChart },
        ],
      },
      settings: {
        title: "Settings",
        subtitle: "Grouped agency controls for branding, billing, notifications, team roles, and workspace settings.",
        metric: "iOS",
        helper: "Clean grouped controls with fewer distractions.",
        actions: [
          { label: "Branding", href: `${workspaceBasePath}/settings`, icon: Settings },
          { label: "Billing", href: `${workspaceBasePath}/billing`, icon: CreditCard },
          { label: "Team Roles", href: `${workspaceBasePath}/team`, icon: Users },
        ],
      },
    };
    const config = moduleConfig[currentPage];
    if (!config) return null;

    return (
      <section className="mb-5 space-y-4 lg:hidden">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Agency module
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{config.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{config.subtitle}</p>
            </div>
            <div className="rounded-3xl bg-primary px-4 py-3 text-right text-primary-foreground">
              <p className="text-2xl font-semibold">{config.metric}</p>
              <p className="text-[11px] text-white/70">{config.helper}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {config.actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.href}
                className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-3 text-center text-xs font-semibold text-slate-900 shadow-sm"
              >
                <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const renderMobileMoreHub = () => (
    <section className="space-y-5 lg:hidden">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">More</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Agency controls
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Analytics, transactions, team, settings, notifications, and smart access stay one tap away.
        </p>
      </div>

      <div className="grid gap-3">
        {[
          { label: "Analytics", helper: "Revenue, conversion, lead sources, and listing performance.", href: `${workspaceBasePath}/finance`, icon: BarChart3 },
          { label: "Transactions", helper: "Payments, commissions, refunds, and receipts.", href: `${workspaceBasePath}/payments`, icon: CreditCard },
          { label: "Team", helper: "Agents, roles, assignments, and performance.", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Messages", helper: "Client chats, team updates, pinned threads, and quick replies.", href: `${workspaceBasePath}/messages`, icon: MessageCircle },
          { label: "Notifications", helper: "High-signal lead, viewing, payment, and deal alerts.", href: `${workspaceBasePath}/notifications`, icon: Bell },
          { label: "Smart Access", helper: "IoT viewing codes and property access readiness.", href: `${workspaceBasePath}/smart-access`, icon: KeyRound },
          { label: "Settings", helper: "Branding, billing, workspace preferences, and security.", href: `${workspaceBasePath}/settings`, icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-slate-950">{item.label}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{item.helper}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );

  const renderMobileModuleBody = () => {
    const renderSwipeActions = (
      itemId: string,
      actions: Array<{ label: string; onClick: () => void; tone?: "neutral" | "danger" }>
    ) => (
      <div
        className={`grid overflow-hidden transition-all duration-200 ${
          mobileSwipeItemId === itemId ? "mt-2 grid-cols-3 gap-2 opacity-100" : "grid-cols-3 gap-0 opacity-0"
        }`}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`rounded-2xl px-3 py-3 text-xs font-semibold ${
              action.tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800"
            }`}
            onClick={action.onClick}
            tabIndex={mobileSwipeItemId === itemId ? 0 : -1}
          >
            {action.label}
          </button>
        ))}
      </div>
    );

    if (currentPage === "listings") {
      const listings = mobileMetrics.listings.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {listings.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
              No listings yet. Add inventory to start running the agency from this phone.
            </div>
          ) : (
            listings.map((listing) => {
              const imageUrl = getListingCoverUrl(listing);
              const status = listing.status || listing.visibility || "pending";

              return (
                <div
                  key={listing.id}
                  className="flex gap-3 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm"
                  onTouchStart={(event) => handleMobileSwipeStart(event.touches[0]?.clientX || 0)}
                  onTouchEnd={(event) => handleMobileSwipeEnd(`listing:${listing.id}`, event.changedTouches[0]?.clientX || 0)}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 gap-3 text-left"
                    onClick={() =>
                      openMobileDetail({
                        title: getListingAddress(listing),
                        subtitle: `${getListingPriceLabel(listing)} - ${String(status).replaceAll("_", " ")}`,
                        meta: [
                          { label: "Assigned agent", value: listing.agent?.full_name || listing.assigned_agent?.full_name || "Unassigned" },
                          { label: "Listing type", value: listing.listing_type || "Not set" },
                          { label: "Location", value: [listing.property?.city, listing.property?.region].filter(Boolean).join(", ") || "Ghana" },
                        ],
                        actions: [
                          { label: "Edit listing", href: `${workspaceBasePath}/listings`, tone: "primary" },
                          { label: "Assign agent", href: `${workspaceBasePath}/team` },
                          { label: "Archive", href: `${workspaceBasePath}/listings`, tone: "danger" },
                        ],
                      })
                    }
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-[1.25rem] object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 shrink-0 rounded-[1.25rem] bg-gradient-to-br from-slate-200 to-slate-100" />
                    )}
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getSoftStatusClasses(status)}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {String(status).replaceAll("_", " ")}
                        </span>
                      </div>
                      <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">
                        {getListingAddress(listing)}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{getListingPriceLabel(listing)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Agent: {listing.agent?.full_name || listing.assigned_agent?.full_name || "Unassigned"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">Swipe for actions</span>
                      </div>
                    </div>
                  </button>
                  {renderSwipeActions(`listing:${listing.id}`, [
                    { label: "Edit", onClick: () => navigate(`${workspaceBasePath}/listings`) },
                    { label: "Assign", onClick: () => navigate(`${workspaceBasePath}/team`) },
                    { label: "Archive", tone: "danger", onClick: () => navigate(`${workspaceBasePath}/listings`) },
                  ])}
                </div>
              );
            })
          )}
        </section>
      );
    }

    if (currentPage === "leads") {
      const leads = mobileMetrics.dealCases.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {leads.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
              No active leads yet. New inquiries will appear here as clean action cards.
            </div>
          ) : (
            leads.map((lead) => {
              const stage = lead.pipeline_stage || lead.status || "new";
              const client =
                lead.buyer?.full_name ||
                lead.client?.full_name ||
                lead.profile?.full_name ||
                lead.buyer_email ||
                "Client";

              return (
                <div
                  key={lead.id}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {String(client).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="truncate text-sm font-semibold text-slate-950">{client}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {String(stage).replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {lead.listing?.property?.address || "Property interest"} - Assigned to{" "}
                        {lead.agent?.full_name || lead.assigned_agent?.full_name || "team queue"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["Assign", "Message", "Prioritize"].map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-800"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      );
    }

    if (currentPage === "calendar") {
      const viewings = mobileMetrics.viewings.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            {["Today", "Upcoming", "Done", "Missed"].map((label) => (
              <span
                key={label}
                className="rounded-2xl bg-white/88 px-3 py-3 text-center text-xs font-semibold text-slate-700 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
          {viewings.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
              No viewings are scheduled yet. Confirmed appointments will appear as calendar cards.
            </div>
          ) : (
            viewings.map((viewing) => {
              const status = viewing.status || "requested";

              return (
                <div
                  key={viewing.id}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getSoftStatusClasses(status)}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {String(status).replaceAll("_", " ")}
                        </span>
                      </div>
                      <h2 className="mt-2 text-sm font-semibold text-slate-950">
                        {viewing.listing?.property?.address || "Property viewing"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {viewing.client?.full_name || viewing.requester?.full_name || "Client"} with{" "}
                        {viewing.agent?.full_name || "assigned agent"}
                      </p>
                    </div>
                    <p className="text-right text-xs font-semibold text-slate-700">
                      {formatShortTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["Reschedule", "Notify", "Reassign"].map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-800"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      );
    }

    if (currentPage === "payments") {
      const payments = mobileMetrics.payments.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {[
            { label: "Received", value: currencyFormatter.format(collectedRevenue) },
            { label: "Pending", value: formatCompactNumber(payments.filter((payment) => payment.status !== "success").length) },
            { label: "Refunds", value: formatCompactNumber(payments.filter((payment) => payment.status === "refunded").length) },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.75rem] bg-white/88 p-4 shadow-sm">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    {payment.payer?.full_name || payment.customer_name || "Payer"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {payment.listing?.property?.address || payment.property?.address || "Property payment"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    {currencyFormatter.format(Number(payment.amount_minor || 0) / 100)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{payment.status || "pending"}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Confirm", "Receipt", "Escalate"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-800"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      );
    }

    if (currentPage === "finance") {
      const metrics = [
        { label: "Revenue Trend", value: currencyFormatter.format(collectedRevenue), percent: 78 },
        { label: "Conversion Rate", value: `${Math.min(100, Math.round((closedDealsCount / Math.max(activeLeadsCount, 1)) * 100))}%`, percent: 54 },
        { label: "Agent Performance", value: formatCompactNumber(mobileMetrics.membersCount), percent: 66 },
        { label: "Listing Performance", value: formatCompactNumber(listedCount), percent: 72 },
      ];

      return (
        <section className="space-y-3 lg:hidden">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-950">{metric.label}</p>
                <p className="text-sm font-semibold text-slate-700">{metric.value}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-rose-400" style={{ width: `${metric.percent}%` }} />
              </div>
            </div>
          ))}
        </section>
      );
    }

    if (currentPage === "team") {
      const members = mobileMetrics.members.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {members.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
              Team members will appear here as performance-first cards.
            </div>
          ) : (
            members.map((member) => {
              const profile = member.profile || member.user || member;
              const name = profile.full_name || profile.email || "Team member";

              return (
                <div key={member.id || member.user_id || name} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                      {String(name).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-slate-950">{name}</h2>
                      <p className="text-xs capitalize text-slate-500">{member.role || "agent"} - Active today</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      92
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <span className="rounded-2xl bg-slate-50 p-3">Leads</span>
                    <span className="rounded-2xl bg-slate-50 p-3">Viewings</span>
                    <span className="rounded-2xl bg-slate-50 p-3">Message</span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      );
    }

    if (currentPage === "settings") {
      return (
        <section className="space-y-4 lg:hidden">
          {[
            { title: "Team management", helper: "Roles, invitations, and staff access.", href: `${workspaceBasePath}/team` },
            { title: "Branding", helper: "Logo, public profile, and agency identity.", href: `${workspaceBasePath}/settings` },
            { title: "Billing", helper: "Subscription, invoices, and payment recovery.", href: `${workspaceBasePath}/billing` },
            { title: "Notifications", helper: "Lead, viewing, payment, and deal alerts.", href: `${workspaceBasePath}/leads` },
            { title: "Workspace settings", helper: "Preferences, verification, and security.", href: `${workspaceBasePath}/settings` },
          ].map((item) => (
            <Link key={item.title} to={item.href} className="flex items-center justify-between rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <span>
                <strong className="block text-sm text-slate-950">{item.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{item.helper}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </section>
      );
    }

    return null;
  };

  const renderMobileActionSheet = () => {
    if (!mobileActionSheet) return null;

    const sheetItems = mobileActionSheet === "quick"
      ? [
          { label: "Add Listing", href: `${workspaceBasePath}/new`, icon: Plus },
          { label: "Assign Agent", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Schedule Viewing", href: `${workspaceBasePath}/calendar`, icon: CalendarDays },
          { label: "Approve Listing", href: `${workspaceBasePath}/documents`, icon: Shield },
          { label: "Contact Client", href: `${workspaceBasePath}/leads`, icon: MessageCircle },
        ].filter((item) => item.label !== "Add Listing" || workspaceExperience.showNewListing)
      : [
          { label: "Analytics", href: `${workspaceBasePath}/finance`, icon: BarChart3 },
          { label: "Transactions", href: `${workspaceBasePath}/payments`, icon: CreditCard },
          { label: "Team", href: `${workspaceBasePath}/team`, icon: Users },
          { label: "Settings", href: `${workspaceBasePath}/settings`, icon: Settings },
        ];

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          aria-label="Close mobile action sheet"
          className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
          onClick={() => setMobileActionSheet(null)}
        />
        <div className="absolute inset-x-3 bottom-3 rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_26px_70px_rgba(15,23,42,0.28)]">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {mobileActionSheet === "quick" ? "Quick actions" : "More controls"}
              </h2>
              <p className="text-sm text-slate-500">Touch-friendly controls for the agency workflow.</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => setMobileActionSheet(null)}
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sheetItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className="rounded-[1.5rem] bg-slate-50 p-4 text-sm font-semibold text-slate-950"
                  onClick={() => setMobileActionSheet(null)}
                >
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEnhancedMobileModuleBody = () => {
    const renderEmptyState = (message: string) => (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
        {message}
      </div>
    );

    const renderSwipeActions = (
      itemId: string,
      actions: Array<{ label: string; onClick: () => void; tone?: "neutral" | "danger" }>
    ) => (
      <div
        className={`grid grid-cols-3 overflow-hidden transition-all duration-200 ${
          mobileSwipeItemId === itemId ? "mt-3 max-h-20 gap-2 opacity-100" : "max-h-0 gap-0 opacity-0"
        }`}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`rounded-2xl px-3 py-3 text-xs font-semibold ${
              action.tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800"
            }`}
            onClick={action.onClick}
            tabIndex={mobileSwipeItemId === itemId ? 0 : -1}
          >
            {action.label}
          </button>
        ))}
      </div>
    );

    if (currentPage === "listings") {
      const listings = mobileMetrics.listings.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {listings.length === 0
            ? renderEmptyState("No listings yet. Add inventory to start running the agency from this phone.")
            : listings.map((listing) => {
                const imageUrl = getListingCoverUrl(listing);
                const status = listing.status || listing.visibility || "pending";
                const assignedAgent = listing.agent?.full_name || listing.assigned_agent?.full_name || "Unassigned";
                const mobileCardTitle =
                  listing.property?.neighborhood ||
                  listing.property?.city ||
                  listing.property?.category ||
                  "Property listing";

                return (
                  <div
                    key={listing.id}
                    className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm"
                    onTouchStart={(event) => handleMobileSwipeStart(event.touches[0]?.clientX || 0)}
                    onTouchEnd={(event) => handleMobileSwipeEnd(`listing:${listing.id}`, event.changedTouches[0]?.clientX || 0)}
                  >
                    <button
                      type="button"
                      className="flex w-full min-w-0 gap-3 text-left"
                      onClick={() =>
                        openMobileDetail({
                          title: getListingAddress(listing),
                          subtitle: `${getListingPriceLabel(listing)} - ${String(status).replaceAll("_", " ")}`,
                          meta: [
                            { label: "Assigned agent", value: assignedAgent },
                            { label: "Listing type", value: listing.listing_type || "Not set" },
                            { label: "Location", value: [listing.property?.city, listing.property?.region].filter(Boolean).join(", ") || "Ghana" },
                          ],
                          actions: [
                            { label: "Edit listing", href: `${workspaceBasePath}/listings`, tone: "primary" },
                            { label: "Assign agent", href: `${workspaceBasePath}/team` },
                            { label: "Archive", href: `${workspaceBasePath}/listings`, tone: "danger" },
                          ],
                        })
                      }
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-[1.25rem] object-cover" />
                      ) : (
                        <div className="h-24 w-24 shrink-0 rounded-[1.25rem] bg-gradient-to-br from-slate-200 to-slate-100" />
                      )}
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getSoftStatusClasses(status)}`} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {String(status).replaceAll("_", " ")}
                          </span>
                        </div>
                        <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{mobileCardTitle}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{getListingPriceLabel(listing)}</p>
                        <p className="mt-1 text-xs text-slate-500">Agent: {assignedAgent}</p>
                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          Swipe left for actions
                        </span>
                      </div>
                    </button>
                    {renderSwipeActions(`listing:${listing.id}`, [
                      { label: "Edit", onClick: () => navigate(`${workspaceBasePath}/listings`) },
                      { label: "Assign", onClick: () => navigate(`${workspaceBasePath}/team`) },
                      { label: "Archive", tone: "danger", onClick: () => navigate(`${workspaceBasePath}/listings`) },
                    ])}
                  </div>
                );
              })}
        </section>
      );
    }

    if (currentPage === "leads") {
      const leads = mobileMetrics.dealCases.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {leads.length === 0
            ? renderEmptyState("No active leads yet. New inquiries will appear here as clean action cards.")
            : leads.map((lead) => {
                const stage = lead.pipeline_stage || lead.status || "new";
                const client = getLeadClientName(lead);
                const assignedAgent = lead.agent?.full_name || lead.assigned_agent?.full_name || "team queue";
                const property = lead.listing?.property?.address || "Property interest";

                return (
                  <div
                    key={lead.id}
                    className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                    onTouchStart={(event) => handleMobileSwipeStart(event.touches[0]?.clientX || 0)}
                    onTouchEnd={(event) => handleMobileSwipeEnd(`lead:${lead.id}`, event.changedTouches[0]?.clientX || 0)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 text-left"
                      onClick={() =>
                        openMobileDetail({
                          title: client,
                          subtitle: `${property} - ${String(stage).replaceAll("_", " ")}`,
                          meta: [
                            { label: "Assigned agent", value: assignedAgent },
                            { label: "Lead stage", value: String(stage).replaceAll("_", " ") },
                            { label: "Last activity", value: formatShortTime(lead.updated_at || lead.created_at) },
                          ],
                          actions: [
                            { label: "Assign lead", href: `${workspaceBasePath}/team`, tone: "primary" },
                            { label: "Message client", href: `${workspaceBasePath}/messages` },
                            { label: "Schedule follow-up", href: `${workspaceBasePath}/calendar` },
                          ],
                        })
                      }
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {String(client).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="truncate text-sm font-semibold text-slate-950">{client}</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {String(stage).replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{property} - Assigned to {assignedAgent}</p>
                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          Swipe left for actions
                        </span>
                      </div>
                    </button>
                    {renderSwipeActions(`lead:${lead.id}`, [
                      { label: "Assign", onClick: () => navigate(`${workspaceBasePath}/team`) },
                      { label: "Message", onClick: () => navigate(`${workspaceBasePath}/messages`) },
                      { label: "Hot", onClick: () => navigate(`${workspaceBasePath}/leads`) },
                    ])}
                  </div>
                );
              })}
        </section>
      );
    }

    if (currentPage === "calendar") {
      const viewings = mobileMetrics.viewings.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            {["Today", "Upcoming", "Done", "Missed"].map((label) => (
              <span key={label} className="rounded-2xl bg-white/88 px-3 py-3 text-center text-xs font-semibold text-slate-700 shadow-sm">
                {label}
              </span>
            ))}
          </div>
          {viewings.length === 0
            ? renderEmptyState("No viewings are scheduled yet. Confirmed appointments will appear as calendar cards.")
            : viewings.map((viewing) => {
                const status = viewing.status || "requested";
                const property = viewing.listing?.property?.address || "Property viewing";
                const client = viewing.client?.full_name || viewing.requester?.full_name || "Client";
                const agent = viewing.agent?.full_name || "assigned agent";
                const time = formatShortTime(viewing.confirmed_datetime || viewing.requested_datetime);

                return (
                  <div
                    key={viewing.id}
                    className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                    onTouchStart={(event) => handleMobileSwipeStart(event.touches[0]?.clientX || 0)}
                    onTouchEnd={(event) => handleMobileSwipeEnd(`viewing:${viewing.id}`, event.changedTouches[0]?.clientX || 0)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 text-left"
                      onClick={() =>
                        openMobileDetail({
                          title: property,
                          subtitle: `${client} with ${agent}`,
                          meta: [
                            { label: "Time", value: time },
                            { label: "Status", value: String(status).replaceAll("_", " ") },
                            { label: "Agent", value: agent },
                          ],
                          actions: [
                            { label: "Reschedule", href: `${workspaceBasePath}/calendar`, tone: "primary" },
                            { label: "Notify client", href: `${workspaceBasePath}/messages` },
                            { label: "Reassign", href: `${workspaceBasePath}/team` },
                          ],
                        })
                      }
                    >
                      <span>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getSoftStatusClasses(status)}`} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {String(status).replaceAll("_", " ")}
                          </span>
                        </span>
                        <strong className="mt-2 block text-sm text-slate-950">{property}</strong>
                        <span className="mt-1 block text-xs text-slate-500">{client} with {agent}</span>
                      </span>
                      <span className="text-right text-xs font-semibold text-slate-700">{time}</span>
                    </button>
                    {renderSwipeActions(`viewing:${viewing.id}`, [
                      { label: "Move", onClick: () => navigate(`${workspaceBasePath}/calendar`) },
                      { label: "Notify", onClick: () => navigate(`${workspaceBasePath}/messages`) },
                      { label: "Reassign", onClick: () => navigate(`${workspaceBasePath}/team`) },
                    ])}
                  </div>
                );
              })}
        </section>
      );
    }

    if (currentPage === "messages") {
      const threads = [
        ...mobileMetrics.dealCases.slice(0, 5).map((lead) => ({
          id: `lead-${lead.id}`,
          title: getLeadClientName(lead),
          subtitle: lead.listing?.property?.address || "Client inquiry",
          detail: `Stage: ${String(lead.pipeline_stage || lead.status || "new").replaceAll("_", " ")}`,
          href: `${workspaceBasePath}/leads`,
          initials: String(getLeadClientName(lead)).slice(0, 1).toUpperCase(),
          unread: true,
        })),
        ...mobileMetrics.members.slice(0, 3).map((member) => {
          const profile = member.profile || member.user || member;
          const name = profile.full_name || profile.email || "Team member";
          return {
            id: `member-${member.id || member.user_id || name}`,
            title: name,
            subtitle: `${member.role || "agent"} team update`,
            detail: "Internal team channel",
            href: `${workspaceBasePath}/team`,
            initials: String(name).slice(0, 1).toUpperCase(),
            unread: false,
          };
        }),
      ].slice(0, 8);

      return (
        <section className="space-y-4 lg:hidden">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Communication</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Messages</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Client chats, team updates, pinned conversations, and property-linked follow-ups.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["Unread", "Urgent", "Deals", "Team"].map((filter) => (
              <span key={filter} className="shrink-0 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                {filter}
              </span>
            ))}
          </div>
          {threads.length === 0
            ? renderEmptyState("Message threads will appear here once leads and team updates start moving.")
            : threads.map((thread) => (
                <Link key={thread.id} to={thread.href} className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {thread.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <strong className="truncate text-sm text-slate-950">{thread.title}</strong>
                      {thread.unread ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{thread.subtitle}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-400">{thread.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
        </section>
      );
    }

    if (currentPage === "notifications") {
      const notifications = [
        ...mobileMetrics.dealCases.slice(0, 3).map((lead) => ({
          id: `lead-${lead.id}`,
          label: "New inquiry",
          detail: `${getLeadClientName(lead)} needs follow-up`,
          time: formatShortTime(lead.created_at || lead.updated_at),
          icon: MessageCircle,
          href: `${workspaceBasePath}/leads`,
        })),
        ...mobileMetrics.viewings.slice(0, 3).map((viewing) => ({
          id: `viewing-${viewing.id}`,
          label: "Viewing update",
          detail: viewing.listing?.property?.address || "Site visit needs attention",
          time: formatShortTime(viewing.confirmed_datetime || viewing.requested_datetime),
          icon: CalendarDays,
          href: `${workspaceBasePath}/calendar`,
        })),
        ...mobileMetrics.payments.slice(0, 3).map((payment) => ({
          id: `payment-${payment.id}`,
          label: payment.status === "success" ? "Payment received" : "Payment issue",
          detail: currencyFormatter.format(Number(payment.amount_minor || 0) / 100),
          time: formatShortTime(payment.created_at || payment.updated_at),
          icon: CreditCard,
          href: `${workspaceBasePath}/payments`,
        })),
        ...mobileMetrics.listings.slice(0, 2).map((listing) => ({
          id: `listing-${listing.id}`,
          label: listing.status === "flagged" ? "Listing flagged" : "Listing updated",
          detail: getListingAddress(listing),
          time: formatShortTime(listing.updated_at || listing.created_at),
          icon: Building2,
          href: `${workspaceBasePath}/listings`,
        })),
      ].slice(0, 10);

      return (
        <section className="space-y-4 lg:hidden">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">High signal</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Lead, viewing, payment, listing, and deal alerts without the noisy dashboard feeling.
            </p>
          </div>
          {notifications.length === 0
            ? renderEmptyState("No urgent notifications yet. Critical work will surface here first.")
            : notifications.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} to={item.href} className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-slate-950">{item.label}</strong>
                      <span className="mt-1 block truncate text-xs text-slate-500">{item.detail}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">{item.time}</span>
                  </Link>
                );
              })}
        </section>
      );
    }

    if (currentPage === "payments") {
      const payments = mobileMetrics.payments.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {[
            { label: "Received", value: currencyFormatter.format(collectedRevenue) },
            { label: "Pending", value: formatCompactNumber(payments.filter((payment) => payment.status !== "success").length) },
            { label: "Refunds", value: formatCompactNumber(payments.filter((payment) => payment.status === "refunded").length) },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.75rem] bg-white/88 p-4 shadow-sm">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
          {payments.length === 0
            ? renderEmptyState("Payment activity will appear here as transaction cards.")
            : payments.map((payment) => {
                const payer = payment.payer?.full_name || payment.customer_name || "Payer";
                const property = payment.listing?.property?.address || payment.property?.address || "Property payment";
                const amount = currencyFormatter.format(Number(payment.amount_minor || 0) / 100);
                const status = payment.status || "pending";

                return (
                  <div
                    key={payment.id}
                    className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                    onTouchStart={(event) => handleMobileSwipeStart(event.touches[0]?.clientX || 0)}
                    onTouchEnd={(event) => handleMobileSwipeEnd(`payment:${payment.id}`, event.changedTouches[0]?.clientX || 0)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 text-left"
                      onClick={() =>
                        openMobileDetail({
                          title: payer,
                          subtitle: `${amount} - ${String(status).replaceAll("_", " ")}`,
                          meta: [
                            { label: "Property", value: property },
                            { label: "Payment status", value: String(status).replaceAll("_", " ") },
                            { label: "Updated", value: formatShortTime(payment.created_at || payment.updated_at) },
                          ],
                          actions: [
                            { label: "Confirm payment", href: `${workspaceBasePath}/payments`, tone: "primary" },
                            { label: "Send receipt", href: `${workspaceBasePath}/documents` },
                            { label: "Escalate", href: `${workspaceBasePath}/payments`, tone: "danger" },
                          ],
                        })
                      }
                    >
                      <span>
                        <strong className="block text-sm text-slate-950">{payer}</strong>
                        <span className="mt-1 block text-xs text-slate-500">{property}</span>
                      </span>
                      <span className="text-right">
                        <strong className="block text-sm text-slate-950">{amount}</strong>
                        <span className="mt-1 block text-[11px] text-slate-500">{status}</span>
                      </span>
                    </button>
                    {renderSwipeActions(`payment:${payment.id}`, [
                      { label: "Confirm", onClick: () => navigate(`${workspaceBasePath}/payments`) },
                      { label: "Receipt", onClick: () => navigate(`${workspaceBasePath}/documents`) },
                      { label: "Escalate", tone: "danger", onClick: () => navigate(`${workspaceBasePath}/payments`) },
                    ])}
                  </div>
                );
              })}
        </section>
      );
    }

    if (currentPage === "team") {
      const members = mobileMetrics.members.slice(0, 8);

      return (
        <section className="space-y-3 lg:hidden">
          {members.length === 0
            ? renderEmptyState("Team members will appear here as performance-first cards.")
            : members.map((member) => {
                const profile = member.profile || member.user || member;
                const name = profile.full_name || profile.email || "Team member";
                const role = member.role || "agent";

                return (
                  <button
                    key={member.id || member.user_id || name}
                    type="button"
                    className="w-full rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm"
                    onClick={() =>
                      openMobileDetail({
                        title: name,
                        subtitle: `${role} - Active today`,
                        meta: [
                          { label: "Role", value: role },
                          { label: "Active leads", value: formatCompactNumber(activeLeadsCount) },
                          { label: "Viewings today", value: formatCompactNumber(todayViewingsCount) },
                        ],
                        actions: [
                          { label: "Assign task", href: `${workspaceBasePath}/leads`, tone: "primary" },
                          { label: "Message", href: `${workspaceBasePath}/messages` },
                          { label: "Review activity", href: `${workspaceBasePath}/finance` },
                        ],
                      })
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {String(name).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="truncate text-sm text-slate-950">{name}</strong>
                        <span className="block text-xs capitalize text-slate-500">{role} - Active today</span>
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">92</span>
                    </span>
                    <span className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <span className="rounded-2xl bg-slate-50 p-3">Leads</span>
                      <span className="rounded-2xl bg-slate-50 p-3">Viewings</span>
                      <span className="rounded-2xl bg-slate-50 p-3">Message</span>
                    </span>
                  </button>
                );
              })}
        </section>
      );
    }

    return renderMobileModuleBody();
  };

  const renderMobileDetailSheet = () => {
    if (!mobileDetailSheet) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          aria-label="Close mobile detail sheet"
          className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
          onClick={() => setMobileDetailSheet(null)}
        />
        <div className="absolute inset-x-3 bottom-3 rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_26px_70px_rgba(15,23,42,0.28)]">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Details</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{mobileDetailSheet.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{mobileDetailSheet.subtitle}</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => setMobileDetailSheet(null)}
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {mobileDetailSheet.meta.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">{item.label}</span>
                <strong className="text-right text-slate-900">{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {mobileDetailSheet.actions.map((action) => {
              const classes =
                action.tone === "primary"
                  ? "bg-primary text-primary-foreground"
                  : action.tone === "danger"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-800";

              return action.href ? (
                <Link
                  key={action.label}
                  to={action.href}
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${classes}`}
                  onClick={() => setMobileDetailSheet(null)}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${classes}`}
                  onClick={() => setMobileDetailSheet(null)}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderBillingBlock = () => (
    <Card className="border-amber-200 bg-amber-50 p-8 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white text-amber-700">
        <CreditCard className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold">{workspaceAccess.title}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{workspaceAccess.message}</p>
      {currentRole === "owner" ? (
        <Link to={`${workspaceBasePath}/billing`} className="mt-6 inline-flex">
          <Button>Open Billing Recovery</Button>
        </Link>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Ask the organization owner to restore billing access.
        </p>
      )}
    </Card>
  );

  const renderPage = () => {
    if (!organization || !user) return null;

    if (!workspaceAccess.canAccess && currentPage !== "billing") {
      return renderBillingBlock();
    }

    const growthSection = getWorkspaceGrowthSection(currentPage);
    if (growthSection) {
      return (
        <WorkspaceExpansionSuite
          organization={organization}
          workspaceBasePath={workspaceBasePath}
          section={growthSection}
        />
      );
    }

    switch (currentPage) {
      case "":
        return (
          <WorkspaceDashboard
            organization={organization}
            workspaceBasePath={workspaceBasePath}
          />
        );
      case "more":
        return renderMobileMoreHub();
      case "messages":
        return (
          <WorkspaceLeads
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "notifications":
        return (
          <Card className="p-8">
            <h1 className="text-2xl font-semibold">Workspace notifications</h1>
            <p className="mt-2 text-muted-foreground">
              High-signal lead, viewing, payment, listing, and deal alerts are available in the mobile command center.
            </p>
          </Card>
        );
      case "new":
        return (
          <WorkspaceNewListing
            organization={organization}
            workspaceBasePath={workspaceBasePath}
            currentUserId={user.id}
          />
        );
      case "listings":
        return (
          <WorkspaceListings
            organization={organization}
            workspaceBasePath={workspaceBasePath}
            currentUserId={user.id}
          />
        );
      case "leads":
        return (
          <WorkspaceLeads
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "team":
        return (
          <WorkspaceTeam
            organization={organization}
            currentUserId={user.id}
            currentRole={currentRole}
          />
        );
      case "billing":
        return (
          <WorkspaceBilling
            organization={organization}
            currentRole={currentRole}
          />
        );
      case "payments":
        return (
          <WorkspacePayments
            organization={organization}
            currentRole={currentRole}
            currentUserId={user.id}
          />
        );
      case "smart-access":
        return (
          <WorkspaceSmartAccess
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "documents":
        return (
          <WorkspaceDocuments
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "trust":
        return (
          <GhanaTrustCenter
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "calendar":
        return (
          <CalendarOperations
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "finance":
        return (
          <WorkspaceFinance
            organization={organization}
            currentRole={currentRole}
          />
        );
      case "settings":
        return (
          <WorkspaceSettings
            organization={organization}
            currentRole={currentRole}
          />
        );
      case "fraud-alerts":
        return <FraudAlerts organizationId={organization.id} />;
      default:
        return null;
    }
  }

  if (loading || billingLoading || (organization && billing === null)) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Loading workspace...
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Workspace unavailable</h1>
          <p className="text-muted-foreground">{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!organization && fallbackMembership) {
    const redirectPath = page
      ? getWorkspaceRoute(fallbackMembership.organization.slug, page)
      : getWorkspaceRoute(fallbackMembership.organization.slug);
    return <Navigate to={redirectPath} replace />;
  }

  if (!organization) {
    return <Navigate to={WORKSPACE_ENTRY_PATH} replace />;
  }

  const mobileModuleBody = renderEnhancedMobileModuleBody();

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <nav className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/82 backdrop-blur-2xl">
        <div className="px-4 py-3 sm:px-6 lg:px-6 lg:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link to="/" className="flex min-w-0 items-center gap-2">
                <div className="w-10 h-10 flex-shrink-0 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span className="hidden truncate text-xl font-semibold sm:inline">BaytMiftah</span>
              </Link>
              <div className="h-8 w-px bg-border hidden md:block" />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h2 className="truncate font-semibold text-slate-950">{organization.name}</h2>
                <p className="text-xs text-slate-500">
                  {workspaceExperience.headline} - {getRoleLabel(currentRole)}
                </p>
              </div>
            </div>

            <div className="hidden flex-col gap-3 sm:flex-row sm:items-center lg:flex">
              {memberships.length > 1 && (
                <select
                  className="px-4 py-2.5 rounded-lg border border-border bg-input-background"
                  value={organization.id}
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                >
                  {memberships.map((membership) => (
                    <option key={membership.organization.id} value={membership.organization.id}>
                      {membership.organization.name}
                    </option>
                  ))}
                </select>
              )}
              {workspaceExperience.showNewListing && (
                <Link to={`${workspaceBasePath}/new`}>
                  <Button>
                    <Plus className="w-4 h-4" />
                    Add property
                  </Button>
                </Link>
              )}
            </div>

            <div className="absolute right-4 top-3 flex items-center gap-2 lg:hidden">
              <Link
                to={`${workspaceBasePath}/notifications`}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/86 text-slate-700 shadow-sm"
                aria-label="Workspace notifications"
              >
                <Bell className="h-4 w-4" />
              </Link>
              <Link
                to={`${workspaceBasePath}/settings`}
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
                aria-label="Workspace profile"
              >
                <UserCircle2 className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row">
        <aside className="hidden w-full border-b border-border bg-white p-4 lg:block lg:w-64 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-73px)] lg:p-6 lg:overflow-y-auto">
          <nav className="space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">ESSENTIALS</h3>
              {visibleCoreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.slug === "" ? currentPage === "" : currentPage === item.slug;
                const href = item.slug ? `${workspaceBasePath}/${item.slug}` : workspaceBasePath;

                return (
                  <Link
                    key={item.label}
                    to={href}
                    className={getNavItemClasses(isActive)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {visibleGrowthNavItems.length > 0 && (
              <div className="border-t pt-6 mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">
                  NEXT STEPS
                </h3>
                {visibleGrowthNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={`${workspaceBasePath}/${item.slug}`}
                      className={getFeatureNavItemClasses(currentPage === item.slug)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {visibleAdvancedNavItems.length > 0 && (
              <details className="border-t pt-6 mb-6" open={["owner", "manager"].includes(currentRole || "")}>
                <summary className="cursor-pointer px-4 text-xs font-semibold text-muted-foreground">
                  ADVANCED SETUP
                </summary>
                <div className="mt-2 space-y-2">
                  {visibleAdvancedNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={`${workspaceBasePath}/${item.slug}`}
                        className={getFeatureNavItemClasses(currentPage === item.slug)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            )}

            <Card className="border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{workspaceExperience.headline}</p>
              <p className="mt-1 leading-relaxed">{workspaceExperience.helper}</p>
            </Card>

            <div className="border-t pt-6">
              <Link
                to={`${workspaceBasePath}/settings`}
                className={getNavItemClasses(currentPage === "settings")}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
          <div className="max-w-7xl min-w-0">
            {currentPage === "" ? (
              <>
                {renderMobileOperationsHome()}
                {renderWorkspaceRoleTasks()}
                <div className="hidden lg:block">{renderPage()}</div>
              </>
            ) : (
              <>
                {currentPage !== "more" ? renderMobileModuleHeader() : null}
                {currentPage === "more" ? (
                  renderPage()
                ) : (
                  <>
                    {mobileModuleBody}
                    <div className={mobileModuleBody ? "hidden lg:block" : ""}>
                      {renderPage()}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-5 rounded-[2rem] border border-slate-200/80 bg-white/90 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl lg:hidden"
        aria-label="Workspace mobile navigation"
      >
        {[
          { label: "Home", href: workspaceBasePath, icon: Home, active: currentPage === "" },
          { label: "Listings", href: `${workspaceBasePath}/listings`, icon: Building2, active: currentPage === "listings" },
          { label: "Leads", href: `${workspaceBasePath}/leads`, icon: MessageCircle, active: currentPage === "leads" },
          { label: "Viewings", href: `${workspaceBasePath}/calendar`, icon: CalendarDays, active: currentPage === "calendar" },
          {
            label: "More",
            href: `${workspaceBasePath}/more`,
            icon: MoreHorizontal,
            active: ["more", "settings", "payments", "finance", "team", "documents", "trust", "smart-access", "messages", "notifications"].includes(currentPage),
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-3xl text-[11px] font-semibold transition ${
                item.active ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {renderMobileActionSheet()}
      {renderMobileDetailSheet()}
    </div>
  );
}
