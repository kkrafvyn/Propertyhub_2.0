import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  MessageCircle,
  Shield,
  TrendingUp,
  Users,
  ShieldCheck,
  Wrench,
  Scale,
  Coins,
  Send,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  ChevronRight,
  Gauge,
  MapPin,
  FileCheck,
  Crown,
  Briefcase,
  Layers,
  LineChart,
  Cpu,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { MetricCard } from "../../components/ui/MetricCard";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { dealCaseService } from "../../../lib/dealcase.service";
import type { Database } from "../../../lib/database.types";
import { listingService } from "../../../lib/listing.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { ActivityFeed, type TimelineActivity } from "../../components/ux/ActivityTimeline";
import {
  CardGridSkeleton,
  DashboardStatsSkeleton,
  ErrorState,
  SectionHeader,
  WorkspacePageShell,
} from "../../components/ux";
import { orgActivityService } from "../../../lib/org-activity.service";
import { useAuth } from "../../context/AuthContext";
import { formatCurrencyAmount, summarizeByCurrency } from "../../../lib/currency-summary";
import type { MemberRole } from "../../../lib/workspace";
import { parseWorkspaceCustomization } from "../../../lib/workspace-customization.service";
import { isDashboardWidgetEnabled } from "../../../lib/workspace-module-catalog";
import {
  filterByPropertyScope,
  filterByNestedPropertyScope,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceDashboardProps extends MemberScopeProps {
  organization: Organization;
  workspaceBasePath: string;
  currentRole?: MemberRole | null;
  onRoleChange?: (role: MemberRole) => void;
}

const PIPELINE_LABELS: Record<string, string> = {
  new_inquiry: "New Inquiry",
  contacted: "Contacted",
  qualified: "Qualified",
  viewing_scheduled: "Viewing",
  negotiation: "Negotiation",
  payment_pending: "Payment Pending",
  won: "Won",
  lost: "Lost",
};

function formatDateTime(value?: string | null) {
  if (!value) return "Awaiting confirmation";
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type DashboardPreviewRole = "owner" | "manager" | "agent" | "analyst";

const DASHBOARD_HERO_COPY: Record<
  DashboardPreviewRole,
  { title: string; description: string }
> = {
  owner: {
    title: "Portfolio & Performance Overview",
    description: "Monitor income, payments, and company performance in real time.",
  },
  manager: {
    title: "Operations & Property Management",
    description: "Oversee gate clearance, property inspections, and contractor work orders.",
  },
  agent: {
    title: "Leasing Deals & Pipeline",
    description: "Manage tenant leads, track lease agreements, and dispatch payment links.",
  },
  analyst: {
    title: "Market Intelligence & Insights",
    description: "Track rental trends, occupancy, and portfolio financial performance.",
  },
};

function resolveDashboardPreviewRole(role: MemberRole | null | undefined): DashboardPreviewRole {
  if (role === "manager" || role === "property_manager") return "manager";
  if (role === "agent" || role === "sales") return "agent";
  if (role === "analyst" || role === "platform_analyst") return "analyst";
  if (
    role === "owner" ||
    role === "property_owner" ||
    role === "platform_admin" ||
    role === "organization_admin" ||
    role === "managing_director"
  ) {
    return "owner";
  }
  return "owner";
}

function normalizeDashboardMemberRole(role: MemberRole | null | undefined): MemberRole {
  if (!role || role === "platform_admin") return "owner";
  return role;
}

export function WorkspaceDashboard({
  organization,
  workspaceBasePath,
  currentRole = "owner",
  onRoleChange,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: WorkspaceDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [membersCount, setMembersCount] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [activityItems, setActivityItems] = useState<TimelineActivity[]>([]);
  const [activeRole, setActiveRole] = useState<MemberRole>(
    normalizeDashboardMemberRole(currentRole || "owner"),
  );

  useEffect(() => {
    if (currentRole) setActiveRole(normalizeDashboardMemberRole(currentRole));
  }, [currentRole]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
      }

      const scope = withMemberScopeDefaults({
        scopeMode,
        scopedPropertyIds,
        bypassPropertyScope,
      });

      const results = await Promise.allSettled([
        listingService.getOrganizationListings(organization.id),
        dealCaseService.getDealCasesByOrganization(organization.id),
        organizationService.getOrganizationMembers(organization.id),
        paymentService.getOrganizationPropertyTransactions(organization.id),
        propertyViewingService.getOrganizationViewings(organization.id),
        orgActivityService.getRecentActivity({
          organizationId: organization.id,
          userId: user?.id,
          role: currentRole || activeRole,
          workspaceBasePath,
          limit: 20,
        }),
      ]);

      if (cancelled) return;

      const failedSources: string[] = [];
      const read = <T,>(index: number, label: string, fallback: T): T => {
        const result = results[index];
        if (result.status === "fulfilled") return result.value as T;
        failedSources.push(label);
        console.error(`Failed to load ${label}:`, result.reason);
        return fallback;
      };

      const organizationListings = read(0, "listings", [] as Awaited<
        ReturnType<typeof listingService.getOrganizationListings>
      >);
      const organizationDeals = read(1, "deal cases", [] as Awaited<
        ReturnType<typeof dealCaseService.getDealCasesByOrganization>
      >);
      const members = read(2, "team members", [] as Awaited<
        ReturnType<typeof organizationService.getOrganizationMembers>
      >);
      const payments = read(3, "payments", [] as Awaited<
        ReturnType<typeof paymentService.getOrganizationPropertyTransactions>
      >);
      const viewings = read(4, "viewings", [] as Awaited<
        ReturnType<typeof propertyViewingService.getOrganizationViewings>
      >);
      const activity = read(5, "recent activity", [] as TimelineActivity[]);

      setListings(
        filterByPropertyScope(
          organizationListings || [],
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
      setDealCases(
        filterByNestedPropertyScope(
          organizationDeals || [],
          (deal) => {
            const property = deal.property;
            if (Array.isArray(property)) return property[0]?.id;
            return property?.id ?? deal.property_id;
          },
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
      setMembersCount((members || []).length);
      setPropertyTransactions(
        filterByNestedPropertyScope(
          payments || [],
          (payment) => {
            const property = payment.property;
            if (Array.isArray(property)) return property[0]?.id;
            return property?.id ?? payment.property_id;
          },
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
      setPropertyViewings(
        filterByPropertyScope(
          viewings || [],
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
      setActivityItems(activity || []);
      setLoadError(
        failedSources.length > 0
          ? `Some dashboard data could not be loaded (${failedSources.join(", ")}). Showing available metrics below.`
          : null,
      );
      setLoading(false);
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    organization.id,
    scopeMode,
    scopedPropertyIds,
    bypassPropertyScope,
    user?.id,
    currentRole,
    workspaceBasePath,
    refreshToken,
  ]);

  const listedCount = useMemo(
    () => listings.filter((listing) => listing.status === "listed").length,
    [listings]
  );

  const activeLeadsCount = useMemo(
    () => dealCases.filter((dealCase) => dealCase.status === "pending").length,
    [dealCases]
  );

  // The same numeric amount has a different meaning in each currency.
  // Exclude won/lost/closed opportunities rather than showing them as open pipeline.
  const revenuePipeline = useMemo(
    () => summarizeByCurrency(
      dealCases
        .filter((dealCase) => !["won", "lost", "closed", "rejected"].some(
          (stage) => stage === String(dealCase.pipeline_stage || "").toLowerCase()
            || stage === String(dealCase.status || "").toLowerCase(),
        ))
        .filter((dealCase) => dealCase.listing)
        .map((dealCase) => ({
          amount: Number(dealCase.listing.price || 0),
          currency: dealCase.listing.currency,
        })),
    ),
    [dealCases]
  );

  const successfulPayments = useMemo(
    () => propertyTransactions.filter((transaction) => transaction.status === "success"),
    [propertyTransactions]
  );

  const collectedRevenue = useMemo(
    () => summarizeByCurrency(
      successfulPayments.map((transaction) => ({
        amount: Number(transaction.amount_minor || 0) / 100,
        currency: transaction.currency,
      })),
    ),
    [successfulPayments]
  );

  const recentListings = useMemo(() => listings.slice(0, 3), [listings]);
  const recentDealCases = useMemo(() => dealCases.slice(0, 3), [dealCases]);
  const upcomingViewings = useMemo(
    () =>
      propertyViewings
        .filter((viewing) => ["requested", "confirmed", "rescheduled"].includes(viewing.status))
        .sort(
          (a, b) =>
            new Date(a.confirmed_datetime || a.requested_datetime).getTime() -
            new Date(b.confirmed_datetime || b.requested_datetime).getTime()
        )
        .slice(0, 4),
    [propertyViewings]
  );

  const handleRoleSwitch = (newRole: MemberRole) => {
    setActiveRole(newRole);
    onRoleChange?.(newRole);
  };

  const dashboardRole = resolveDashboardPreviewRole(activeRole);

  const dashboardWidgets = useMemo(
    () => parseWorkspaceCustomization(organization).dashboardWidgets,
    [organization],
  );
  const showPipelineMetrics = isDashboardWidgetEnabled(dashboardWidgets, "pipeline");
  const showRevenueMetrics = isDashboardWidgetEnabled(dashboardWidgets, "revenue");
  const showKpiGrid = showPipelineMetrics || showRevenueMetrics;
  const showListingsWidget = isDashboardWidgetEnabled(dashboardWidgets, "listings");
  const showViewingsWidget = isDashboardWidgetEnabled(dashboardWidgets, "viewings");
  const showQuickActions = isDashboardWidgetEnabled(dashboardWidgets, "quick_actions");
  const showRecentActivity = isDashboardWidgetEnabled(dashboardWidgets, "recent_activity");
  const showCoreMetrics = showKpiGrid || dashboardRole === "owner";

  const roleConfig = [
    {
      role: "owner" as MemberRole,
      label: "Owner / Exec",
      icon: Crown,
      color: "text-amber-500",
      ring: "ring-amber-500/30",
      bg: "bg-amber-500/10",
      gradient: "from-amber-500/15 via-amber-500/5",
    },
    {
      role: "manager" as MemberRole,
      label: "Estate Manager",
      icon: Briefcase,
      color: "text-emerald-500",
      ring: "ring-emerald-500/30",
      bg: "bg-emerald-500/10",
      gradient: "from-emerald-500/15 via-emerald-500/5",
    },
    {
      role: "agent" as MemberRole,
      label: "Leasing Agent",
      icon: Users,
      color: "text-blue-500",
      ring: "ring-blue-500/30",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/15 via-blue-500/5",
    },
    {
      role: "analyst" as MemberRole,
      label: "Data Analyst",
      icon: LineChart,
      color: "text-purple-500",
      ring: "ring-purple-500/30",
      bg: "bg-purple-500/10",
      gradient: "from-purple-500/15 via-purple-500/5",
    },
  ] as const;

  const activeRoleConfig = roleConfig.find((r) => r.role === dashboardRole) || roleConfig[0];
  const heroCopy = DASHBOARD_HERO_COPY[dashboardRole];

  return (
    <WorkspacePageShell
      title={heroCopy.title}
      description={heroCopy.description}
    >
    <div className="space-y-8">
      {/* Role Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl bg-surface-subtle/80 border border-surface-border backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">
            Dashboard preview:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {roleConfig.map((r) => {
              const Icon = r.icon;
              const isActive = dashboardRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleRoleSwitch(r.role)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? `bg-surface text-ink border border-surface-border/80 shadow-sm ring-2 ${r.ring}`
                      : "text-ink-secondary hover:text-ink hover:bg-surface-hover border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span className={`absolute inset-0 rounded-xl ${r.bg} opacity-50 pointer-events-none`} />
                  )}
                  <Icon className={`w-3.5 h-3.5 relative ${r.color}`} />
                  <span className="relative">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-ink-muted">Loaded on refresh</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRefreshToken((value) => value + 1)}
            aria-label="Refresh workspace metrics"
          >
            <RefreshCw aria-hidden="true" className={`mr-1.5 h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loadError ? (
        <ErrorState
          title="Partial dashboard load"
          message={loadError}
          onRetry={() => {
            setLoadError(null);
            setRefreshToken((value) => value + 1);
          }}
          retryLabel="Reload dashboard"
        />
      ) : null}

      <div className="app-surface-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize text-xs font-medium px-2.5 py-0.5">
                {activeRole} view
              </Badge>
              <span className="text-xs text-ink-muted font-medium">{organization.name}</span>
            </div>
          </div>

          {/* Role-Specific Quick Launch Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {dashboardRole === "owner" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" className="gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                    Yield Predictor
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/multi-currency-fx`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                    FX & Currency
                  </Button>
                </Link>
              </>
            )}
            {dashboardRole === "manager" && (
              <>
                <Link to={`${workspaceBasePath}/inspections`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-md shadow-emerald-500/25">
                    <FileCheck className="w-3.5 h-3.5" />
                    Inspections
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-emerald-500/30 text-ink">
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    WhatsApp Hub
                  </Button>
                </Link>
              </>
            )}
            {dashboardRole === "agent" && (
              <>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-md shadow-emerald-500/25">
                    <Send className="w-3.5 h-3.5" />
                    WhatsApp Messages
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/ai-lease-analyzer`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-purple-500/30 text-ink">
                    <Scale className="w-3.5 h-3.5 text-purple-500" />
                    Lease Compliance
                  </Button>
                </Link>
              </>
            )}
            {dashboardRole === "analyst" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-md shadow-emerald-500/25">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Yield Predictor
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/market-intelligence`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-blue-500/30 text-ink">
                    <LineChart className="w-3.5 h-3.5 text-blue-500" />
                    Market Analytics
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Role-Tailored KPI Grid */}
      {loading ? (
        <DashboardStatsSkeleton />
      ) : showCoreMetrics ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ '--stagger': '80ms' } as React.CSSProperties}>
        {dashboardRole === "owner" && (
          <>
            <MetricCard
              title="Listed units"
              value={<AnimatedNumber value={listedCount} />}
              subtitle={`${listings.length} total listings`}
              icon={Building2}
              iconColor="emerald"
              glow
            />
            <MetricCard
              title="Active leads"
              value={<AnimatedNumber value={activeLeadsCount} />}
              subtitle="Open deal cases"
              icon={Users}
              iconColor="primary"
              glow
            />
            <MetricCard
              title="Total collected"
              value={collectedRevenue.headline}
              subtitle={`${successfulPayments.length} successful payments${collectedRevenue.breakdown ? ` · ${collectedRevenue.breakdown}` : ""}`}
              icon={CreditCard}
              iconColor="emerald"
            />
            <MetricCard
              title="Pipeline value"
              value={revenuePipeline.headline}
              subtitle={revenuePipeline.breakdown || "Open deal listing prices"}
              icon={Coins}
              iconColor="amber"
            />
          </>
        )}

        {dashboardRole === "manager" && (
          <>
            <MetricCard
              title="Listed units"
              value={<AnimatedNumber value={listedCount} />}
              subtitle={`${listings.length} in portfolio`}
              icon={Building2}
              iconColor="emerald"
              glow
            />
            <MetricCard
              title="Team members"
              value={<AnimatedNumber value={membersCount} />}
              subtitle="Organization roster"
              icon={Users}
              iconColor="primary"
            />
            <MetricCard
              title="Upcoming viewings"
              value={<AnimatedNumber value={upcomingViewings.length} />}
              subtitle="Scheduled viewings"
              icon={CalendarDays}
              iconColor="amber"
            />
            <MetricCard
              title="Active leads"
              value={<AnimatedNumber value={activeLeadsCount} />}
              subtitle="Open deal cases"
              icon={Wrench}
              iconColor="purple"
            />
          </>
        )}
        {dashboardRole === "agent" && (
          <>
            <MetricCard
              title="Active inbound leads"
              value={<AnimatedNumber value={activeLeadsCount} />}
              subtitle="Open deal cases"
              icon={Users}
              iconColor="primary"
              glow
            />
            <MetricCard
              title="Viewings scheduled"
              value={<AnimatedNumber value={upcomingViewings.length} />}
              subtitle="Upcoming appointments"
              icon={CalendarDays}
              iconColor="emerald"
            />
            <MetricCard
              title="Listed inventory"
              value={<AnimatedNumber value={listedCount} />}
              subtitle="Active public listings"
              icon={Building2}
              iconColor="purple"
            />
            <MetricCard
              title="Pipeline value"
              value={revenuePipeline.headline}
              subtitle={revenuePipeline.breakdown || "Open deal listing prices"}
              icon={Coins}
              iconColor="emerald"
            />
          </>
        )}

        {dashboardRole === "analyst" && (
          <>
            <MetricCard
              title="Listed units"
              value={<AnimatedNumber value={listedCount} />}
              subtitle={`${listings.length} total listings`}
              icon={Building2}
              iconColor="primary"
              glow
            />
            <MetricCard
              title="Active leads"
              value={<AnimatedNumber value={activeLeadsCount} />}
              subtitle="Open deal cases"
              icon={LineChart}
              iconColor="purple"
            />
            <MetricCard
              title="Successful payments"
              value={<AnimatedNumber value={successfulPayments.length} />}
              subtitle="Collected transactions"
              icon={ShieldCheck}
              iconColor="emerald"
            />
            <MetricCard
              title="Revenue pipeline"
              value={revenuePipeline.headline}
              subtitle={revenuePipeline.breakdown || "Open deal listing prices"}
              icon={CreditCard}
              iconColor="amber"
            />
          </>
        )}
      </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-subtle/40 p-6 text-center text-sm text-ink-secondary">
          Core metrics are hidden in workspace customization. Enable pipeline or revenue widgets to restore KPI cards.
        </div>
      )}

      {/* Main Content Split: Activity & Pipeline */}
      {loading ? (
        <CardGridSkeleton count={3} />
      ) : (showListingsWidget || showViewingsWidget || showQuickActions) ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Inventory List */}
        {showListingsWidget ? (
        <Card variant="glass" className="p-6 border-surface-border/60 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-black text-ink flex items-center gap-2 uppercase tracking-wide">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  </span>
                  Active Inventory
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 ml-0.5">Managed units & rental availability</p>
              </div>
              <Link to={`${workspaceBasePath}/listings`}>
                <Button variant="glass" size="sm" className="text-xs text-ink gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentListings.length === 0 ? (
                <div className="text-xs text-ink-muted py-8 text-center bg-surface-subtle/50 rounded-xl border border-surface-border">
                  No active listings available.
                </div>
              ) : (
                recentListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-3.5 rounded-xl bg-surface/80 border border-surface-border/80 hover:border-emerald-500/30 hover:bg-surface transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {listing.property?.address || "Untitled property"}
                      </p>
                      <p className="text-xs text-ink-secondary truncate">
                        {[listing.property?.city, listing.property?.region].filter(Boolean).join(", ") || "Location TBD"}
                      </p>
                      <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatCurrencyAmount(listing.price, listing.currency)}
                        {listing.listing_type === "rental" ? " / mo" : listing.listing_type === "short_stay" ? " / night" : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs border-surface-border shrink-0 capitalize">
                      {listing.status || "listed"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
        ) : null}

        {/* Viewing Schedule & Tenant Requests */}
        {showViewingsWidget ? (
        <Card variant="glass" className="p-6 border-surface-border/60 hover:border-blue-500/40 hover:shadow-lg transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-black text-ink flex items-center gap-2 uppercase tracking-wide">
                  <span className="p-1.5 rounded-lg bg-blue-500/10">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                  </span>
                  Upcoming Viewings
                </h2>
                <p className="text-xs text-ink-muted mt-0.5 ml-0.5">Confirmed calendar appointments</p>
              </div>
              <Link to={`${workspaceBasePath}/calendar`}>
                <Button variant="glass" size="sm" className="text-xs text-ink gap-1">
                  Calendar <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {upcomingViewings.length === 0 ? (
                <div className="text-xs text-ink-muted py-8 text-center bg-surface-subtle/50 rounded-xl border border-surface-border">
                  No upcoming viewings scheduled.
                </div>
              ) : (
                upcomingViewings.map((viewing) => (
                  <div
                    key={viewing.id}
                    className="p-3.5 rounded-xl bg-surface/80 border border-surface-border/80 hover:border-blue-500/30 hover:bg-surface transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {viewing.property?.address || "Untitled property"}
                      </p>
                      <p className="text-xs text-ink-secondary flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                        {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                      </p>
                    </div>
                    <Badge variant="info" className="text-xs shrink-0">
                      {viewing.status || "Scheduled"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
        ) : null}

        {/* Fast Action Shortcuts */}
        {showQuickActions ? (
        <Card variant="glass" className="p-6 border-surface-border/60 hover:border-amber-500/40 hover:shadow-lg transition-all duration-300">
          <div>
            <div className="mb-5">
              <h2 className="text-sm font-black text-ink flex items-center gap-2 uppercase tracking-wide">
                <span className="p-1.5 rounded-lg bg-amber-500/10">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </span>
                Fast Action Launchpad
              </h2>
              <p className="text-xs text-ink-muted mt-0.5 ml-0.5">Direct shortcuts for {activeRole} workflows</p>
            </div>

            <div className="space-y-2">
              <Link
                to={`${workspaceBasePath}/whatsapp-hub`}
                className="p-3 rounded-xl bg-surface/70 border border-surface-border hover:bg-surface hover:border-emerald-500/40 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Send className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">WhatsApp Business Hub</p>
                    <p className="text-xs text-ink-secondary">Gate passes, rent links & bot</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to={`${workspaceBasePath}/ai-rent-yield`}
                className="p-3 rounded-xl bg-surface/70 border border-surface-border hover:bg-surface hover:border-primary/40 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-primary transition-colors">AI Rent Yield Predictor</p>
                    <p className="text-xs text-ink-secondary">Cap rate modeling for Ghana</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to={`${workspaceBasePath}/multi-currency-fx`}
                className="p-3 rounded-xl bg-surface/70 border border-surface-border hover:bg-surface hover:border-amber-500/40 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                    <Coins className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Multi-Currency FX & Hedging</p>
                    <p className="text-xs text-ink-secondary">Bank of Ghana rate sync & collar</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to={`${workspaceBasePath}/ai-command-center`}
                className="p-3 rounded-xl bg-surface/70 border border-surface-border hover:bg-surface hover:border-purple-500/40 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                    <Cpu className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">AI Command & Approval Center</p>
                    <p className="text-xs text-ink-secondary">Night Watch audits & Level 2 approvals</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to={`${workspaceBasePath}/procurement`}
                className="p-3 rounded-xl bg-surface/70 border border-surface-border hover:bg-surface hover:border-emerald-500/40 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Procurement & Contractor RFQ</p>
                    <p className="text-xs text-ink-secondary">Quote comparison & 3-way PO match</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </Card>
        ) : null}
      </div>
      ) : (
        <div className="p-8 rounded-2xl text-center border border-dashed border-surface-border bg-surface-subtle/50">
          <Layers className="w-8 h-8 text-ink-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-secondary">Dashboard widgets are hidden.</p>
          <p className="text-xs text-ink-muted mt-1">Enable them in Customize Workspace settings.</p>
        </div>
      )}

      {showRecentActivity ? (
        <div className="space-y-3">
          <SectionHeader
            level="subsection"
            title="Recent activity"
            description={
              orgActivityService.isExecutiveRole(activeRole)
                ? "Organization-wide tasks, deals, inbox, and field updates"
                : "Your assigned tasks, deals, and related updates"
            }
          />
          {activityItems.length === 0 ? (
            <Card className="p-8 text-center text-sm text-ink-muted border-dashed">
              No recent activity yet.
            </Card>
          ) : (
            <ActivityFeed items={activityItems} />
          )}
        </div>
      ) : null}
    </div>
    </WorkspacePageShell>
  );
}
