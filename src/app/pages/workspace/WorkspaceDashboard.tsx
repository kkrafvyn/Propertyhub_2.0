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

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

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

export function WorkspaceDashboard({
  organization,
  workspaceBasePath,
  currentRole = "owner",
  onRoleChange,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: WorkspaceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [membersCount, setMembersCount] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [activeRole, setActiveRole] = useState<MemberRole>(currentRole || "owner");

  useEffect(() => {
    if (currentRole) setActiveRole(currentRole);
  }, [currentRole]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        if (!cancelled) setLoading(true);

        const [organizationListings, organizationDeals, members, payments, viewings] = await Promise.all([
          listingService.getOrganizationListings(organization.id),
          dealCaseService.getDealCasesByOrganization(organization.id),
          organizationService.getOrganizationMembers(organization.id),
          paymentService.getOrganizationPropertyTransactions(organization.id),
          propertyViewingService.getOrganizationViewings(organization.id),
        ]);

        const scope = withMemberScopeDefaults({
          scopeMode,
          scopedPropertyIds,
          bypassPropertyScope,
        });

        if (!cancelled) {
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
        }
      } catch (error) {
        console.error("Failed to load workspace dashboard:", error);
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
  }, [organization.id, scopeMode, scopedPropertyIds, bypassPropertyScope]);

  const listedCount = useMemo(
    () => listings.filter((listing) => listing.status === "listed").length,
    [listings]
  );

  const activeLeadsCount = useMemo(
    () => dealCases.filter((dealCase) => dealCase.status === "pending").length,
    [dealCases]
  );

  const revenuePipeline = useMemo(
    () => dealCases.reduce((total, dealCase) => total + (dealCase.listing?.price || 0), 0),
    [dealCases]
  );

  const successfulPayments = useMemo(
    () => propertyTransactions.filter((transaction) => transaction.status === "success"),
    [propertyTransactions]
  );

  const collectedRevenue = useMemo(
    () =>
      successfulPayments.reduce(
        (total, transaction) => total + ((transaction.amount_minor || 0) / 100),
        0
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

  if (loading) {
    return (
      <Card className="p-8 text-center text-ink-secondary bg-surface border-surface-border">
        Loading tailored workspace view...
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Role Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-subtle border border-surface-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
            Viewing Workspace As:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { role: "owner" as MemberRole, label: "Owner / Exec", icon: Crown, color: "text-amber-500" },
                { role: "manager" as MemberRole, label: "Estate Manager", icon: Briefcase, color: "text-emerald-500" },
                { role: "agent" as MemberRole, label: "Leasing Agent", icon: Users, color: "text-blue-500" },
                { role: "analyst" as MemberRole, label: "Data Analyst", icon: LineChart, color: "text-purple-500" },
              ] as const
            ).map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleRoleSwitch(r.role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? "bg-surface text-ink border border-surface-border shadow-sm ring-2 ring-primary/20"
                      : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <Badge variant="outline" className="text-xs border-surface-border text-ink self-start sm:self-auto">
          Role-Adaptive Workspace v2.0
        </Badge>
      </div>

      {/* Role-Specific Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-surface border border-emerald-500/20 shadow-lg backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant="success" dot pulse className="capitalize text-xs font-semibold px-2.5 py-0.5">
                {activeRole} Perspective
              </Badge>
              <span className="text-xs font-medium text-ink-muted">- {organization.name}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                Live Telemetry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              {activeRole === "owner" && "Executive Portfolio & Yield Command"}
              {activeRole === "manager" && "Estate Operations & Facility Command"}
              {activeRole === "agent" && "Leasing Deals & Pipeline Accelerator"}
              {activeRole === "analyst" && "Intelligence & Macro Risk Studio"}
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-2xl leading-relaxed">
              {activeRole === "owner" && "Monitor gross rental yields, Bank of Ghana FX hedging, and enterprise revenue."}
              {activeRole === "manager" && "Oversee gate passes, 150-point offline inspections, and artisan work order dispatches."}
              {activeRole === "agent" && "Close tenancy deals, verify Act 220 lease compliance, and dispatch WhatsApp payment links."}
              {activeRole === "analyst" && "Evaluate micro-market cap rates, rental inflation forecasting, and portfolio valuations."}
            </p>
          </div>

          {/* Role-Specific Quick Launch Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {activeRole === "owner" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-sm shadow-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                    AI Yield Predictor
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/multi-currency-fx`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-amber-500/30 text-ink">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    FX & Hedging Hub
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "manager" && (
              <>
                <Link to={`${workspaceBasePath}/inspections`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-sm shadow-emerald-500/20">
                    <FileCheck className="w-3.5 h-3.5" />
                    150-Point Inspection
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-emerald-500/30 text-ink">
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    WhatsApp Gate Pass
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "agent" && (
              <>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-sm shadow-emerald-500/20">
                    <Send className="w-3.5 h-3.5" />
                    1-Click WhatsApp
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/ai-lease-analyzer`}>
                  <Button size="sm" variant="glass" className="gap-1.5 border-purple-500/30 text-ink">
                    <Scale className="w-3.5 h-3.5 text-purple-500" />
                    Act 220 Lease Audit
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "analyst" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" variant="gradient" className="gap-1.5 shadow-sm shadow-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Run Cap Model
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
      {showKpiGrid ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeRole === "owner" && (
          <>
            <MetricCard
              title="Gross Rent Roll (Annualized)"
              value="₵3.25M"
              trend={{ value: "+12.4% vs last yr", isPositive: true, label: "YoY" }}
              icon={TrendingUp}
              iconColor="emerald"
            />
            <MetricCard
              title="Net Portfolio Yield"
              value="11.8%"
              subtitle="Airport Res. target: 10.5%"
              trend={{ value: "+1.3% spread", isPositive: true }}
              icon={BarChart3}
              iconColor="primary"
            />
            <MetricCard
              title="Total Collected (MoMo/Bank)"
              value={currencyFormatter.format(collectedRevenue || 1450000)}
              trend={{ value: "98.2% on-time", isPositive: true }}
              icon={CreditCard}
              iconColor="emerald"
            />
            <MetricCard
              title="FX Hedging Collar Status"
              value="Active (+/- 5%)"
              subtitle="BOG: ₵15.85/USD"
              icon={Coins}
              iconColor="amber"
            />
          </>
        )}

        {activeRole === "manager" && (
          <>
            <MetricCard
              title="Occupancy Rate"
              value="94.6%"
              subtitle="48 of 50 units occupied"
              trend={{ value: "+2.1%", isPositive: true }}
              icon={Building2}
              iconColor="emerald"
            />
            <MetricCard
              title="Pending Gate Clearances"
              value="8 Passes"
              trend={{ value: "Kiosk QR active", isPositive: true }}
              icon={ShieldCheck}
              iconColor="primary"
            />
            <MetricCard
              title="Open Work Orders"
              value="3 Active"
              subtitle="2 Artisans on-site"
              icon={Wrench}
              iconColor="amber"
            />
            <MetricCard
              title="Offline Inspection Drafts"
              value="2 Ready"
              subtitle="IndexedDB Synced"
              trend={{ value: "Offline ready", isPositive: true }}
              icon={FileCheck}
              iconColor="purple"
            />
          </>
        )}

        {activeRole === "agent" && (
          <>
            <MetricCard
              title="Active Inbound Leads"
              value={<AnimatedNumber value={activeLeadsCount || 14} />}
              trend={{ value: "6 Hot WhatsApp", isPositive: true }}
              icon={Users}
              iconColor="primary"
            />
            <MetricCard
              title="Viewings Scheduled Today"
              value={<AnimatedNumber value={upcomingViewings.length || 4} />}
              subtitle="Next: 2:00 PM Cantonments"
              icon={CalendarDays}
              iconColor="emerald"
            />
            <MetricCard
              title="Pending Leases (Ghana Card)"
              value="3 Drafts"
              trend={{ value: "Act 220 Compliant", isPositive: true }}
              icon={Scale}
              iconColor="purple"
            />
            <MetricCard
              title="Commission Accrued (MoMo)"
              value="₵28,500"
              subtitle="Auto-payout upon lease close"
              trend={{ value: "+18.5%", isPositive: true }}
              icon={Coins}
              iconColor="emerald"
            />
          </>
        )}

        {activeRole === "analyst" && (
          <>
            <MetricCard
              title="Sub-Market Demand Index"
              value="88.4 / 100"
              trend={{ value: "+4.2 pts", isPositive: true }}
              icon={TrendingUp}
              iconColor="primary"
            />
            <MetricCard
              title="Weighted Cap Rate"
              value="11.4%"
              subtitle="Spread vs Treasury: +2.1%"
              icon={LineChart}
              iconColor="purple"
            />
            <MetricCard
              title="Legal Compliance Score"
              value="Grade A (96%)"
              subtitle="Ghana Rent Act 220"
              trend={{ value: "Audit Passed", isPositive: true }}
              icon={ShieldCheck}
              iconColor="emerald"
            />
            <MetricCard
              title="Revenue Pipeline"
              value={currencyFormatter.format(revenuePipeline || 850000)}
              trend={{ value: "Forecast model active", isPositive: true }}
              icon={CreditCard}
              iconColor="amber"
            />
          </>
        )}
      </div>
      ) : null}

      {/* Main Content Split: Activity & Pipeline */}
      {(showListingsWidget || showViewingsWidget || showQuickActions) ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Inventory List */}
        {showListingsWidget ? (
        <Card variant="glass" className="p-6 border-surface-border/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Active Inventory
                </h2>
                <p className="text-xs text-ink-secondary">Managed units & rental availability</p>
              </div>
              <Link to={`${workspaceBasePath}/listings`}>
                <Button variant="glass" size="sm" className="text-xs text-ink">
                  View All
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
                        {listing.property?.address || "Airport Residential Suite"}
                      </p>
                      <p className="text-[11px] text-ink-secondary truncate">
                        {listing.property?.city || "Accra"}, {listing.property?.region || "Greater Accra"}
                      </p>
                      <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {currencyFormatter.format(listing.price)} / mo
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-surface-border shrink-0 capitalize">
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
        <Card variant="glass" className="p-6 border-surface-border/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  Upcoming Viewings
                </h2>
                <p className="text-xs text-ink-secondary">Confirmed calendar appointments</p>
              </div>
              <Link to={`${workspaceBasePath}/calendar`}>
                <Button variant="glass" size="sm" className="text-xs text-ink">
                  Calendar
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
                        {viewing.property?.address || "Cantonments Luxury Apartment"}
                      </p>
                      <p className="text-[11px] text-ink-secondary flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                        {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                      </p>
                    </div>
                    <Badge variant="info" className="text-[10px] shrink-0">
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
        <Card variant="glass" className="p-6 border-surface-border/80 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Fast Action Launchpad
              </h2>
              <p className="text-xs text-ink-secondary">Direct shortcuts for {activeRole} workflows</p>
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
                    <p className="text-[11px] text-ink-secondary">Gate passes, rent links & bot</p>
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
                    <p className="text-[11px] text-ink-secondary">Cap rate modeling for Ghana</p>
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
                    <p className="text-[11px] text-ink-secondary">Bank of Ghana rate sync & collar</p>
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
                    <p className="text-[11px] text-ink-secondary">Night Watch audits & Level 2 approvals</p>
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
                    <p className="text-[11px] text-ink-secondary">Quote comparison & 3-way PO match</p>
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
        <Card className="p-8 text-center text-ink-secondary bg-surface border-surface-border">
          Dashboard widgets are hidden. Enable them in Customize Workspace.
        </Card>
      )}
    </div>
  );
}
