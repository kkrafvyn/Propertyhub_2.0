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
  LineChart,
  Map,
  MessageCircle,
  AlertTriangle,
  Palette,
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
import BlockchainVerification from "./BlockchainVerification";
import AdvancedSearch from "./AdvancedSearch";
import PredictiveAnalytics from "./PredictiveAnalytics";
import RecommendationEngine from "./RecommendationEngine";
import TeamCollaborationHub from "./TeamCollaborationHub";
import CustomWorkflowsBuilder from "./CustomWorkflowsBuilder";
import { FraudAlerts } from "./FraudAlerts";
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
  { slug: "leads", label: "Leads & Messages", icon: MessageCircle },
  { slug: "documents", label: "Documents", icon: FileText },
  { slug: "trust", label: "Ghana Trust", icon: Shield },
  { slug: "calendar", label: "Calendar Ops", icon: CalendarDays },
  { slug: "payments", label: "Payments", icon: CreditCard },
  { slug: "finance", label: "Finance", icon: BarChart3 },
  { slug: "team", label: "Team", icon: Users },
];

const TIER_TWO_NAV_ITEMS: NavItem[] = [
  { slug: "market-intelligence", label: "Market Intelligence", icon: LineChart },
  { slug: "automation", label: "Automation", icon: Zap },
  { slug: "fraud-alerts", label: "Fraud Alerts", icon: AlertTriangle },
  { slug: "ai-assistant", label: "AI Assistant", icon: Brain },
  { slug: "vendors", label: "Vendors", icon: Wrench },
  { slug: "location-intelligence", label: "Location Intel", icon: Map },
  { slug: "org-insights", label: "Org Insights", icon: BarChart3 },
  { slug: "notifications", label: "Notifications", icon: Bell },
  { slug: "whitelabel", label: "White-Label", icon: Palette },
  { slug: "mobile-settings", label: "Mobile Apps", icon: Smartphone },
  { slug: "blockchain", label: "Blockchain", icon: Shield },
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
        return <AIAssistant />;
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
      case "blockchain":
        return <BlockchainVerification organizationId={organization.id} />;
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
        return <CustomWorkflowsBuilder />;
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
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
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
                <span className="text-xl font-semibold">Property Hub</span>
              </Link>
              <div className="h-8 w-px bg-border hidden md:block" />
              <div>
                <h2 className="font-semibold">{organization.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Workspace - {getRoleLabel(currentRole)}
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
        <aside className="w-64 border-r border-border bg-white min-h-[calc(100vh-73px)] p-6 overflow-y-auto">
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
                TIER 2 FEATURES
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

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
