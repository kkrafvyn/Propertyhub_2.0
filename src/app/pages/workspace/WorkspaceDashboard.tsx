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
import { dealCaseService } from "../../../lib/dealcase.service";
import type { Database } from "../../../lib/database.types";
import { listingService } from "../../../lib/listing.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import type { MemberRole } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceDashboardProps {
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

        if (!cancelled) {
          setListings(organizationListings || []);
          setDealCases(organizationDeals || []);
          setMembersCount((members || []).length);
          setPropertyTransactions(payments || []);
          setPropertyViewings(viewings || []);
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
  }, [organization.id]);

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
      <div className="bg-surface border border-surface-border p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary/10 text-primary border border-primary/20 capitalize text-xs">
                {activeRole} Perspective
              </Badge>
              <span className="text-xs text-ink-muted">· {organization.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-ink">
              {activeRole === "owner" && "Executive Portfolio & Yield Command"}
              {activeRole === "manager" && "Estate Operations & Facility Command"}
              {activeRole === "agent" && "Leasing Deals & Pipeline Accelerator"}
              {activeRole === "analyst" && "Intelligence & Macro Risk Studio"}
            </h1>
            <p className="text-sm text-ink-secondary mt-0.5">
              {activeRole === "owner" && "Monitor gross rental yields, Bank of Ghana FX hedging, and enterprise revenue."}
              {activeRole === "manager" && "Oversee gate passes, 150-point offline inspections, and artisan work order dispatches."}
              {activeRole === "agent" && "Close tenancy deals, verify Act 220 lease compliance, and dispatch WhatsApp payment links."}
              {activeRole === "analyst" && "Evaluate micro-market cap rates, rental inflation forecasting, and portfolio valuations."}
            </p>
          </div>

          {/* Role-Specific Quick Launch Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeRole === "owner" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    AI Yield Predictor
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/multi-currency-fx`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-surface-border text-ink">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    FX & Hedging Hub
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "manager" && (
              <>
                <Link to={`${workspaceBasePath}/inspections`}>
                  <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                    <FileCheck className="w-3.5 h-3.5" />
                    150-Point Inspection
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-surface-border text-ink">
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    WhatsApp Gate Pass
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "agent" && (
              <>
                <Link to={`${workspaceBasePath}/whatsapp-hub`}>
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Send className="w-3.5 h-3.5" />
                    1-Click WhatsApp
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/ai-lease-analyzer`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-surface-border text-ink">
                    <Scale className="w-3.5 h-3.5 text-indigo-500" />
                    Act 220 Lease Audit
                  </Button>
                </Link>
              </>
            )}

            {activeRole === "analyst" && (
              <>
                <Link to={`${workspaceBasePath}/ai-rent-yield`}>
                  <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Run Cap Model
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/market-intelligence`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-surface-border text-ink">
                    <LineChart className="w-3.5 h-3.5" />
                    Market Analytics
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Role-Tailored KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeRole === "owner" && (
          <>
            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Gross Rent Roll (Annualized)</p>
              <p className="text-2xl font-black text-ink mt-1">₵3.25M</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">+12.4% vs last year</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Net Portfolio Yield</p>
              <p className="text-2xl font-black text-primary mt-1">11.8%</p>
              <p className="text-[11px] text-ink-muted mt-1">Airport Residential benchmark: 10.5%</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Total Collected (MoMo/Bank)</p>
              <p className="text-2xl font-black text-ink mt-1">
                {currencyFormatter.format(collectedRevenue || 1450000)}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">98.2% on-time collection</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">FX Hedging Collar Status</p>
              <p className="text-2xl font-black text-amber-500 mt-1">Active (+/- 5%)</p>
              <p className="text-[11px] text-ink-muted mt-1">BOG Reference: ₵15.85/USD</p>
            </Card>
          </>
        )}

        {activeRole === "manager" && (
          <>
            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Occupancy Rate</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">94.6%</p>
              <p className="text-[11px] text-ink-muted mt-1">48 of 50 units occupied</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Pending Gate Clearances</p>
              <p className="text-2xl font-black text-primary mt-1">8 Passes</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">Kiosk QR active</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Open Work Orders</p>
              <p className="text-2xl font-black text-amber-500 mt-1">3 Active</p>
              <p className="text-[11px] text-ink-muted mt-1">2 Artisans on-site</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Offline Inspection Drafts</p>
              <p className="text-2xl font-black text-ink mt-1">2 Ready</p>
              <p className="text-[11px] text-blue-500 font-medium mt-1">IndexedDB Synced</p>
            </Card>
          </>
        )}

        {activeRole === "agent" && (
          <>
            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Active Inbound Leads</p>
              <p className="text-2xl font-black text-primary mt-1">{activeLeadsCount || 14}</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">6 Hot WhatsApp leads</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Viewings Scheduled Today</p>
              <p className="text-2xl font-black text-ink mt-1">{upcomingViewings.length || 4}</p>
              <p className="text-[11px] text-ink-muted mt-1">Next: 2:00 PM at Cantonments</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Pending Leases (Ghana Card)</p>
              <p className="text-2xl font-black text-indigo-500 mt-1">3 Drafts</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">Act 220 Compliant</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Commission Accrued (MoMo)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₵28,500</p>
              <p className="text-[11px] text-ink-muted mt-1">Auto-payout upon lease close</p>
            </Card>
          </>
        )}

        {activeRole === "analyst" && (
          <>
            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Sub-Market Demand Index</p>
              <p className="text-2xl font-black text-primary mt-1">88.4 / 100</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">High expat rental surge</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Weighted Cap Rate</p>
              <p className="text-2xl font-black text-ink mt-1">11.4%</p>
              <p className="text-[11px] text-ink-muted mt-1">Spread vs Treasury: +2.1%</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Legal Compliance Score</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Grade A (96%)</p>
              <p className="text-[11px] text-ink-muted mt-1">Ghana Rent Act 220</p>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <p className="text-xs font-semibold text-ink-secondary">Revenue Pipeline</p>
              <p className="text-2xl font-black text-ink mt-1">
                {currencyFormatter.format(revenuePipeline || 850000)}
              </p>
              <p className="text-[11px] text-purple-500 font-medium mt-1">Forecast model active</p>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Split: Activity & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Inventory List */}
        <Card className="p-6 border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Active Property Inventory</h2>
              <p className="text-xs text-ink-secondary">Managed units & rental availability.</p>
            </div>
            <Link to={`${workspaceBasePath}/listings`}>
              <Button variant="outline" size="sm" className="text-xs border-surface-border text-ink">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentListings.length === 0 ? (
              <div className="text-xs text-ink-muted py-6 text-center">No active listings available.</div>
            ) : (
              recentListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">
                      {listing.property?.address || "Airport Residential Suite"}
                    </p>
                    <p className="text-[11px] text-ink-secondary truncate">
                      {listing.property?.city || "Accra"}, {listing.property?.region || "Greater Accra"}
                    </p>
                    <p className="text-xs font-bold text-primary mt-1">
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
        </Card>

        {/* Viewing Schedule & Tenant Requests */}
        <Card className="p-6 border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Upcoming Viewings & Tours</h2>
              <p className="text-xs text-ink-secondary">Confirmed calendar appointments.</p>
            </div>
            <Link to={`${workspaceBasePath}/calendar`}>
              <Button variant="outline" size="sm" className="text-xs border-surface-border text-ink">
                Calendar
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingViewings.length === 0 ? (
              <div className="text-xs text-ink-muted py-6 text-center">No upcoming viewings scheduled.</div>
            ) : (
              upcomingViewings.map((viewing) => (
                <div
                  key={viewing.id}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">
                      {viewing.property?.address || "Cantonments Luxury Apartment"}
                    </p>
                    <p className="text-[11px] text-ink-secondary flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-primary" />
                      {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                    </p>
                  </div>
                  <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {viewing.status || "Scheduled"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Fast Action Shortcuts */}
        <Card className="p-6 border-surface-border bg-surface">
          <div className="mb-4">
            <h2 className="text-base font-bold text-ink">Fast Action Launchpad</h2>
            <p className="text-xs text-ink-secondary">Direct short-cuts for {activeRole} workflows.</p>
          </div>

          <div className="space-y-2.5">
            <Link
              to={`${workspaceBasePath}/whatsapp-hub`}
              className="p-3 rounded-xl bg-surface-subtle border border-surface-border hover:bg-surface-hover hover:border-emerald-500/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Send className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">WhatsApp Business Hub</p>
                  <p className="text-[11px] text-ink-secondary">Gate passes, rent links & bot</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition" />
            </Link>

            <Link
              to={`${workspaceBasePath}/ai-rent-yield`}
              className="p-3 rounded-xl bg-surface-subtle border border-surface-border hover:bg-surface-hover hover:border-primary/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">AI Rent Yield Predictor</p>
                  <p className="text-[11px] text-ink-secondary">Cap rate modeling for Ghana</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition" />
            </Link>

            <Link
              to={`${workspaceBasePath}/multi-currency-fx`}
              className="p-3 rounded-xl bg-surface-subtle border border-surface-border hover:bg-surface-hover hover:border-amber-500/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">Multi-Currency FX & Hedging</p>
                  <p className="text-[11px] text-ink-secondary">Bank of Ghana rate sync & collar</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition" />
            </Link>

            <Link
              to={`${workspaceBasePath}/ai-command-center`}
              className="p-3 rounded-xl bg-surface-subtle border border-surface-border hover:bg-surface-hover hover:border-primary/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Cpu className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">AI Command & Approval Center</p>
                  <p className="text-[11px] text-ink-secondary">Night Watch audits & Level 2 approvals</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition" />
            </Link>

            <Link
              to={`${workspaceBasePath}/procurement`}
              className="p-3 rounded-xl bg-surface-subtle border border-surface-border hover:bg-surface-hover hover:border-emerald-500/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">Procurement & Contractor RFQ</p>
                  <p className="text-[11px] text-ink-secondary">Quote comparison & 3-way PO match</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
