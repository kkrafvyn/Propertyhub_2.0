import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import {
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Heart,
  Home,
  KeyRound,
  LineChart,
  Map,
  MessageCircle,
  AlertTriangle,
  Palette,
  Plug,
  Plus,
  Search,
  Settings,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Users2,
  Workflow,
  Wrench,
  Zap,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database } from "../../../lib/database.types";
import { organizationService } from "../../../lib/organization.service";
import MarketIntelligenceDashboard from "./MarketIntelligence";
import AutomationWorkflows from "./AutomationWorkflows";
import WhitelabelConfiguration from "./WhitelabelConfig";
import VendorManagement from "./VendorManagement";
import { AIAssistant } from "./AIAssistant";
import NotificationSettings from "./NotificationSettings";
import LocationIntelligence from "./LocationIntelligence";
import OrganizationInsights from "./OrganizationInsights";
import MobileAppSettings from "./MobileAppSettings";
import AdvancedSearch from "./AdvancedSearch";
import PredictiveAnalytics from "./PredictiveAnalytics";
import RecommendationEngine from "./RecommendationEngine";
import TeamCollaborationHub from "./TeamCollaborationHub";
import CustomWorkflowsBuilder from "./CustomWorkflowsBuilder";
import { IntegrationHub } from "./IntegrationHub";
import { WorkspaceHost } from "./WorkspaceHost";
import { WorkspaceMaintenance } from "./WorkspaceMaintenance";
import { WorkspaceInspections } from "./WorkspaceInspections";
import { WorkspaceLeases } from "./WorkspaceLeases";
import { ErrorState, PageLoadingSkeleton, BaytMiftahAIPanel } from "../../components/ux";
import { FraudAlerts } from "./FraudAlerts";
import ComplianceCenter from "./ComplianceCenter";
import BlockchainVerification from "./BlockchainVerification";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { CalendarOperations } from "./CalendarOperations";
import { WorkspaceDocuments } from "./WorkspaceDocuments";
import { WorkspaceFinance } from "./WorkspaceFinance";
import { GhanaTrustCenter } from "./GhanaTrustCenter";
import { WorkspaceLeads } from "./WorkspaceLeads";
import { WorkspaceListings } from "./WorkspaceListings";
import { WorkspaceNewListing } from "./WorkspaceNewListing";
import { WorkspacePayments } from "./WorkspacePayments";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { WorkspaceTeam } from "./WorkspaceTeam";
import { WorkspaceContacts } from "./WorkspaceContacts";
import { WorkspaceTasks } from "./WorkspaceTasks";
import { WorkspaceSmartProperty } from "./WorkspaceSmartProperty";
import { Logo } from "../../components/baytmiftah";
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
  { slug: "listings", label: "Listings", icon: Building2 },
  { slug: "leads", label: "Leads", icon: MessageCircle },
  { slug: "contacts", label: "Contacts", icon: Users2 },
  { slug: "tasks", label: "Tasks", icon: Workflow },
  { slug: "calendar", label: "Calendar", icon: CalendarDays },
  { slug: "payments", label: "Payments", icon: CreditCard },
  { slug: "team", label: "Team", icon: Users },
  { slug: "documents", label: "Documents", icon: FileText },
  { slug: "leases", label: "Leases", icon: KeyRound },
  { slug: "maintenance", label: "Maintenance", icon: Wrench },
  { slug: "inspections", label: "Inspections", icon: ClipboardCheck },
  { slug: "smart-property", label: "Smart Property", icon: Smartphone },
];

const WORKSPACE_SECONDARY_NAV: NavItem[] = [
  { slug: "market-intelligence", label: "Analytics", icon: LineChart },
  { slug: "trust", label: "Trust", icon: Shield },
  { slug: "compliance", label: "Compliance", icon: Shield },
  { slug: "automation", label: "Automation", icon: Zap },
  { slug: "ai-assistant", label: "AI", icon: Brain },
  { slug: "settings", label: "Settings", icon: Settings },
];

const TIER_TWO_NAV_ITEMS: NavItem[] = [
  { slug: "fraud-alerts", label: "Fraud Alerts", icon: AlertTriangle },
  { slug: "vendors", label: "Vendors", icon: Wrench },
  { slug: "location-intelligence", label: "Location Intel", icon: Map },
  { slug: "org-insights", label: "Org Insights", icon: BarChart3 },
  { slug: "notifications", label: "Notifications", icon: Bell },
  { slug: "whitelabel", label: "White-Label", icon: Palette },
  { slug: "mobile-settings", label: "Mobile Apps", icon: Smartphone },
  { slug: "integrations", label: "Integrations", icon: Plug },
  { slug: "blockchain", label: "Blockchain", icon: Shield },
  { slug: "host", label: "Host", icon: Home },
  { slug: "finance", label: "Finance", icon: BarChart3 },
];

const AI_NAV_ITEMS: NavItem[] = [
  { slug: "advanced-search", label: "Advanced Search", icon: Search },
  { slug: "predictive-analytics", label: "Predictive Analytics", icon: TrendingUp },
  { slug: "recommendations", label: "Recommendations", icon: Heart },
];

const ENTERPRISE_NAV_ITEMS: NavItem[] = [
  { slug: "team-collaboration", label: "Team Hub", icon: Users2 },
  { slug: "workflows", label: "Workflows", icon: Workflow },
];

function getNavItemClasses(isActive: boolean) {
  return `workspace-nav-link flex items-center gap-3 ${isActive ? "active" : ""}`;
}

function getFeatureNavItemClasses(isActive: boolean) {
  return `workspace-nav-link flex items-center gap-3 ${isActive ? "active" : ""}`;
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
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
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

  const renderPage = () => {
    if (!organization || !user) return null;

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
      case "contacts":
        return (
          <WorkspaceContacts
            organization={organization}
            currentUserId={user.id}
          />
        );
      case "tasks":
        return (
          <WorkspaceTasks
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
      case "payments":
        return (
          <WorkspacePayments
            organization={organization}
            currentRole={currentRole}
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
      case "compliance":
        return (
          <ComplianceCenter
            organizationId={organization.id}
            defaultJurisdiction="GH"
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
      case "market-intelligence":
        return <MarketIntelligenceDashboard organizationId={organization.id} />;
      case "automation":
        return (
          <AutomationWorkflows
            organizationId={organization.id}
            currentRole={currentRole}
          />
        );
      case "fraud-alerts":
        return <FraudAlerts organizationId={organization.id} />;
      case "whitelabel":
        return (
          <WhitelabelConfiguration
            organizationId={organization.id}
            currentRole={currentRole}
          />
        );
      case "vendors":
        return <VendorManagement />;
      case "ai-assistant":
        return <AIAssistant organizationId={organization.id} />;
      case "notifications":
        return <NotificationSettings />;
      case "location-intelligence":
        return <LocationIntelligence />;
      case "org-insights":
        return <OrganizationInsights organizationId={organization.id} />;
      case "mobile-settings":
        return (
          <MobileAppSettings
            currentUserId={user.id}
            organizationId={organization.id}
          />
        );
      case "integrations":
        return (
          <IntegrationHub
            organizationId={organization.id}
            workspaceBasePath={workspaceBasePath}
          />
        );
      case "blockchain":
        return <BlockchainVerification organizationId={organization.id} />;
      case "host":
        return <WorkspaceHost organizationId={organization.id} />;
      case "leases":
        return <WorkspaceLeases organizationId={organization.id} />;
      case "maintenance":
        return <WorkspaceMaintenance organizationId={organization.id} />;
      case "inspections":
        return (
          <WorkspaceInspections
            organizationId={organization.id}
            currentUserId={user.id}
          />
        );
      case "smart-property":
        return <WorkspaceSmartProperty organizationId={organization.id} />;
      case "advanced-search":
        return (
          <AdvancedSearch
            organizationId={organization.id}
            currentUserId={user.id}
          />
        );
      case "predictive-analytics":
        return <PredictiveAnalytics organizationId={organization.id} />;
      case "recommendations":
        return <RecommendationEngine />;
      case "team-collaboration":
        return (
          <TeamCollaborationHub
            organization={organization}
            currentUserId={user.id}
            currentRole={currentRole}
          />
        );
      case "workflows":
        return (
          <CustomWorkflowsBuilder
            organizationId={organization.id}
            currentRole={currentRole}
          />
        );
      default:
        return (
          <WorkspaceDashboard
            organization={organization}
            workspaceBasePath={workspaceBasePath}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-7xl mx-auto">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto">
        <ErrorState
          title="Workspace unavailable"
          message={`${loadError} Please check your connection or try again.`}
          onRetry={() => window.location.reload()}
        />
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
    <div className="desktop-shell min-h-screen">
      <nav className="desktop-header border-b border-white/10 bg-brand-marketplace">
        <div className="mx-auto max-w-[var(--max-width-page)] px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Logo inverted />
              <div className="h-8 w-px bg-white/15 hidden md:block" />
              <div>
                <h2 className="font-semibold text-ink">{organization.name}</h2>
                <p className="text-xs text-ink-secondary">
                  Workspace · {getRoleLabel(currentRole)}
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
              <Link to={`${workspaceBasePath}/new`}>
                <Button>
                  <Plus className="w-4 h-4" />
                  New Listing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 border-r border-white/10 bg-brand-marketplace/80 min-h-[calc(100vh-73px)] p-6 overflow-y-auto">
          <nav className="space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">CORE</h3>
              {CORE_NAV_ITEMS.map((item) => {
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

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">
                TOOLS
              </h3>
              {WORKSPACE_SECONDARY_NAV.map((item) => {
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

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">
                MORE
              </h3>
              {TIER_TWO_NAV_ITEMS.map((item) => {
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

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">
                PHASE 3: AI INTELLIGENCE
              </h3>
              {AI_NAV_ITEMS.map((item) => {
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

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-4">
                PHASE 4: ENTERPRISE
              </h3>
              {ENTERPRISE_NAV_ITEMS.map((item) => {
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

          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
            <div>{renderPage()}</div>
            <aside className="hidden xl:block">
              <div className="sticky top-8">
                <BaytMiftahAIPanel context="workspace" compact />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
