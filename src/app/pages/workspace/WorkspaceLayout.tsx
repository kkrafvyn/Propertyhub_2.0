import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
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
  Plus,
  Settings,
  Shield,
  KeyRound,
  Users,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database } from "../../../lib/database.types";
import { organizationService } from "../../../lib/organization.service";
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

  const renderWorkspaceRoleTasks = () => {
    const allNavItems = [
      ...CORE_NAV_ITEMS,
      ...GROWTH_NAV_ITEMS,
      ...TIER_TWO_NAV_ITEMS,
      { slug: "settings", label: "Settings", icon: Settings },
    ];

    return (
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-white via-white to-secondary/35 p-6 shadow-sm">
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

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white border-b border-border">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link to="/" className="flex min-w-0 items-center gap-2">
                <div className="w-10 h-10 flex-shrink-0 bg-primary rounded-lg flex items-center justify-center">
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
                <span className="truncate text-xl font-semibold">BaytMiftah</span>
              </Link>
              <div className="h-8 w-px bg-border hidden md:block" />
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{organization.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {workspaceExperience.headline} - {getRoleLabel(currentRole)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          </div>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-white p-4 lg:w-64 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-73px)] lg:p-6 lg:overflow-y-auto">
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

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl min-w-0">
            {currentPage === "" ? renderWorkspaceRoleTasks() : null}
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
