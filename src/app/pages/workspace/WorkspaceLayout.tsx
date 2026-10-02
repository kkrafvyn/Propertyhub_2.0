import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  AreaChart,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Blocks,
  BookOpen,
  BookOpenCheck,
  Bot,
  Brain,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  Calculator,
  CheckSquare,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Coins,
  Compass,
  Contact,
  Cpu,
  CreditCard,
  Database,
  FileBarChart,
  FileCheck,
  FileCheck2,
  FileCode2,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Gauge,
  Globe,
  GitBranch,
  Grid3X3,
  Hammer,
  Headphones,
  Heart,
  HeartHandshake,
  HelpCircle,
  Home,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LineChart,
  Map,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MessagesSquare,
  MessageSquare,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  PieChart,
  Plug,
  Plus,
  QrCode,
  Receipt,
  Rocket,
  Scale,
  Search,
  SlidersHorizontal,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  Users2,
  Workflow,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database as DatabaseTypes } from "../../../lib/database.types";
import { organizationService } from "../../../lib/organization.service";
import { ErrorState, PageLoadingSkeleton } from "../../components/ux";
import { SignatureActionBanner } from "../../components/ux/SignatureActionBanner";
import { hasPlatformConsoleAccess } from "../../../lib/platform-access";
import { eSignatureService } from "../../../lib/esignature.service";
import { UniversalCommandBar } from "../../components/navigation/UniversalCommandBar";
import { ShowMeHowOverlay } from "../../components/ux/ShowMeHowOverlay";
import { practiceModeService } from "../../../lib/practice-mode-fixtures";
import { Logo, ThemeToggle } from "../../components/baytmiftah";
import { useTranslation } from "../../i18n/LocaleContext";
import { WorkspaceMfaGate } from "../../components/security/WorkspaceMfaGate";
import { BusinessMobileShell } from "../../shells/BusinessMobileShell";
import { BusinessDesktopShell } from "../../shells/BusinessDesktopShell";
import {
  mapMemberRoleToMobileJobRole,
  shouldUseBusinessMobileShell,
} from "../../lib/business-mobile-nav";
import { isElectron } from "../../../lib/surface-detection";
import { persistDesktopLastOrg } from "../../../lib/desktop-navigation";
import {
  WORKSPACE_ENTRY_PATH,
  getWorkspaceRoute,
  normalizeOrganizationMemberships,
  type MemberRole,
  type MembershipRow,
  type OrganizationMembership,
} from "../../../lib/workspace";
import {
  canAccessWorkspaceSlug,
  filterWorkspaceNavItems,
  getRoleHomeSlug,
  getWorkspaceRoleDescription,
} from "../../lib/workspace-role-nav";
import { canAccessOrganization } from "../../../lib/organization-access";
import { canWorkspace } from "../../../lib/workspace-permissions";
import type { MemberApprovalProfile } from "../../../lib/authorization.service";
import { memberScopeService } from "../../../lib/member-scope.service";
import type { MemberScopeMode } from "../../../lib/member-scope";
import { whitelabelService } from "../../../lib/whitelabel.service";
import { OfflineStatusBanner } from "../../components/workspace/OfflineStatusBanner";
import {
  applyNavCustomization,
  parseWorkspaceCustomization,
} from "../../../lib/workspace-customization.service";
import { isNavSlugEnabledByModules } from "../../../lib/workspace-module-catalog";
import { workspaceSyncService } from "../../../lib/workspace-sync.service";
import { getRoleLabel, type CompanyCapability } from "../../../lib/company-model";

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as Extract<TModule[TKey], ComponentType<any>> };
  });
}

const FraudAlerts = lazyNamed(() => import("./FraudAlerts"), "FraudAlerts");
const ComplianceCenter = lazyNamed(() => import("./ComplianceCenter"), "ComplianceCenter");
const BlockchainVerification = lazy(() => import("./BlockchainVerification"));
const CalendarOperations = lazyNamed(() => import("./CalendarOperations"), "CalendarOperations");
const WorkspaceDocuments = lazyNamed(() => import("./WorkspaceDocuments"), "WorkspaceDocuments");
const WorkspaceFinance = lazyNamed(() => import("./WorkspaceFinance"), "WorkspaceFinance");
const GhanaTrustCenter = lazyNamed(() => import("./GhanaTrustCenter"), "GhanaTrustCenter");
const WorkspaceNewListing = lazyNamed(() => import("./WorkspaceNewListing"), "WorkspaceNewListing");
const WorkspaceSettings = lazyNamed(() => import("./WorkspaceSettings"), "WorkspaceSettings");
const WorkspaceTeam = lazyNamed(() => import("./WorkspaceTeam"), "WorkspaceTeam");
const WorkspaceContacts = lazyNamed(() => import("./WorkspaceContacts"), "WorkspaceContacts");
const WorkspaceTasks = lazyNamed(() => import("./WorkspaceTasks"), "WorkspaceTasks");
const WorkspaceSmartProperty = lazyNamed(() => import("./WorkspaceSmartProperty"), "WorkspaceSmartProperty");
const EstateFinance = lazyNamed(() => import("./EstateFinance"), "EstateFinance");
const EstateCommunications = lazyNamed(() => import("./EstateCommunications"), "EstateCommunications");
const ContextualInboxHub = lazyNamed(() => import("./ContextualInboxHub"), "ContextualInboxHub");
const StakeholderPortals = lazyNamed(() => import("./StakeholderPortals"), "StakeholderPortals");
const CommandCenter = lazyNamed(() => import("./CommandCenter"), "CommandCenter");
const DataMigration = lazyNamed(() => import("./DataMigration"), "DataMigration");
const Property360 = lazyNamed(() => import("./Property360"), "Property360");
const Customer360 = lazyNamed(() => import("./Customer360"), "Customer360");
const TechnicianJobs = lazyNamed(() => import("./TechnicianJobs"), "TechnicianJobs");
const EstateAIOperations = lazyNamed(() => import("./EstateAIOperations"), "EstateAIOperations");
const CompanyLaunchpad = lazyNamed(() => import("./CompanyLaunchpad"), "CompanyLaunchpad");
const OpeningBalanceImport = lazyNamed(() => import("./OpeningBalanceImport"), "OpeningBalanceImport");
const PaymentImport = lazyNamed(() => import("./PaymentImport"), "PaymentImport");
const EstatePayables = lazyNamed(() => import("./EstatePayables"), "EstatePayables");
const OwnerStatements = lazyNamed(() => import("./OwnerStatements"), "OwnerStatements");
const ServiceDesk = lazyNamed(() => import("./ServiceDesk"), "ServiceDesk");
const Unit360 = lazyNamed(() => import("./Unit360"), "Unit360");
const GeneralLedger = lazyNamed(() => import("./GeneralLedger"), "GeneralLedger");
const ProcurementCenter = lazyNamed(() => import("./ProcurementCenter"), "ProcurementCenter");
const PortfolioAnalytics = lazyNamed(() => import("./PortfolioAnalytics"), "PortfolioAnalytics");
const AICommandCenter = lazyNamed(() => import("./AICommandCenter"), "AICommandCenter");
const AutomationBuilder = lazyNamed(() => import("./AutomationBuilder"), "AutomationBuilder");
const BulkOperations = lazyNamed(() => import("./BulkOperations"), "BulkOperations");
const DataImportExport = lazyNamed(() => import("./DataImportExport"), "DataImportExport");
const ChartOfAccountsAdmin = lazyNamed(() => import("./ChartOfAccountsAdmin"), "ChartOfAccountsAdmin");
const JournalEntryManager = lazyNamed(() => import("./JournalEntryManager"), "JournalEntryManager");
const FinancialStatementsViewer = lazyNamed(() => import("./FinancialStatementsViewer"), "FinancialStatementsViewer");
const CollectionsCases = lazyNamed(() => import("./CollectionsCases"), "CollectionsCases");
const LeasingApplications = lazyNamed(() => import("./LeasingApplications"), "LeasingApplications");
const ESignature = lazyNamed(() => import("./ESignature"), "ESignature");
const HoaManagement = lazyNamed(() => import("./HoaManagement"), "HoaManagement");
const CamBilling = lazyNamed(() => import("./CamBilling"), "CamBilling");
const Contractor1099 = lazyNamed(() => import("./Contractor1099"), "Contractor1099");
const TrustAccounting = lazyNamed(() => import("./TrustAccounting"), "TrustAccounting");
const TenantScreeningCenter = lazyNamed(() => import("./TenantScreeningCenter"), "TenantScreeningCenter");
const CommercialLeaseEscalations = lazyNamed(() => import("./CommercialLeaseEscalations"), "CommercialLeaseEscalations");
const InternationalRulesHub = lazyNamed(() => import("./InternationalRulesHub"), "InternationalRulesHub");
const OwnerDisbursements = lazyNamed(() => import("./OwnerDisbursements"), "OwnerDisbursements");
const ApprovalCenter = lazyNamed(() => import("./ApprovalCenter"), "ApprovalCenter");
const ExceptionCenter = lazyNamed(() => import("./ExceptionCenter"), "ExceptionCenter");
const CompanyKnowledgeHub = lazyNamed(() => import("./CompanyKnowledgeHub"), "CompanyKnowledgeHub");
const EvidenceCenter = lazyNamed(() => import("./EvidenceCenter"), "EvidenceCenter");
const ProductivityWorkspace = lazyNamed(() => import("./ProductivityWorkspace"), "ProductivityWorkspace");
const MyWorkQueue = lazyNamed(() => import("./MyWorkQueue"), "MyWorkQueue");
const DesktopMyWorkHome = lazyNamed(() => import("./DesktopMyWorkHome"), "DesktopMyWorkHome");
const OwnerOversight = lazyNamed(() => import("./OwnerOversight"), "OwnerOversight");
const WorkspaceTeamChat = lazyNamed(() => import("./WorkspaceTeamChat"), "WorkspaceTeamChat");
const StaffTimeTracking = lazyNamed(() => import("./StaffTimeTracking"), "StaffTimeTracking");
const DataRetentionCenter = lazyNamed(() => import("./DataRetentionCenter"), "DataRetentionCenter");
const ContractorPortal = lazyNamed(() => import("./ContractorPortal"), "ContractorPortal");
const CompanySetupWizard = lazyNamed(() => import("./CompanySetupWizard"), "CompanySetupWizard");
const CustomizeWorkspace = lazyNamed(() => import("./CustomizeWorkspace"), "CustomizeWorkspace");
const WorkflowApprovalHub = lazyNamed(() => import("./WorkflowApprovalHub"), "WorkflowApprovalHub");
const ModuleMarketplace = lazyNamed(() => import("./ModuleMarketplace"), "ModuleMarketplace");

const WorkspaceDashboard = lazy(() => import("./WorkspaceDashboard").then((module) => ({ default: module.WorkspaceDashboard })));
const WorkspaceLeads = lazy(() => import("./WorkspaceLeads").then((module) => ({ default: module.WorkspaceLeads })));
const WorkspaceListings = lazy(() => import("./WorkspaceListings").then((module) => ({ default: module.WorkspaceListings })));
const WorkspaceLeases = lazy(() => import("./WorkspaceLeases").then((module) => ({ default: module.WorkspaceLeases })));
const WorkspacePayments = lazy(() => import("./WorkspacePayments").then((module) => ({ default: module.WorkspacePayments })));
const WorkspaceMaintenance = lazy(() => import("./WorkspaceMaintenance").then((module) => ({ default: module.WorkspaceMaintenance })));
const EstateOperations = lazy(() => import("./EstateOperations").then((module) => ({ default: module.EstateOperations })));
const EnterpriseOperations = lazy(() => import("./EnterpriseOperations").then((module) => ({ default: module.EnterpriseOperations })));
const BankReconciliation = lazy(() => import("./BankReconciliation").then((module) => ({ default: module.BankReconciliation })));
const WhatsAppAutomationHub = lazy(() => import("./WhatsAppAutomationHub").then((module) => ({ default: module.WhatsAppAutomationHub })));
const TeamCollaborationHub = lazy(() => import("./TeamCollaborationHub"));
const CustomWorkflowsBuilder = lazy(() => import("./CustomWorkflowsBuilder"));
const CustomerHealthCenter = lazy(() => import("./CustomerHealthCenter").then((module) => ({ default: module.CustomerHealthCenter })));
const MarketIntelligenceDashboard = lazy(() => import("./MarketIntelligence"));
const AutomationWorkflows = lazy(() => import("./AutomationWorkflows"));
const WhitelabelConfiguration = lazy(() => import("./WhitelabelConfig"));
const VendorManagement = lazy(() => import("./VendorManagement"));
const AIAssistant = lazy(() => import("./AIAssistant").then((module) => ({ default: module.AIAssistant })));
const NotificationSettings = lazy(() => import("./NotificationSettings"));
const LocationIntelligence = lazy(() => import("./LocationIntelligence"));
const OrganizationInsights = lazy(() => import("./OrganizationInsights"));
const MobileAppSettings = lazy(() => import("./MobileAppSettings"));
const UtilitySubmetering = lazy(() => import("./UtilitySubmetering").then((module) => ({ default: module.UtilitySubmetering })));
const AILeaseAnalyzer = lazy(() => import("./AILeaseAnalyzer").then((module) => ({ default: module.AILeaseAnalyzer })));
const GateClearanceKiosk = lazy(() => import("./GateClearanceKiosk").then((module) => ({ default: module.GateClearanceKiosk })));
const ContractorWorkOrders = lazy(() => import("./ContractorWorkOrders").then((module) => ({ default: module.ContractorWorkOrders })));
const AdvancedSearch = lazy(() => import("./AdvancedSearch"));
const PredictiveAnalytics = lazy(() => import("./PredictiveAnalytics"));
const RecommendationEngine = lazy(() => import("./RecommendationEngine"));
const IntegrationHub = lazy(() => import("./IntegrationHub").then((module) => ({ default: module.IntegrationHub })));
const AIRentYieldPredictor = lazy(() => import("./AIRentYieldPredictor").then((module) => ({ default: module.AIRentYieldPredictor })));
const MultiCurrencyHedgingHub = lazy(() => import("./MultiCurrencyHedgingHub").then((module) => ({ default: module.MultiCurrencyHedgingHub })));
const WorkspaceHost = lazy(() => import("./WorkspaceHost").then((module) => ({ default: module.WorkspaceHost })));
const WorkspaceInspections = lazy(() => import("./WorkspaceInspections").then((module) => ({ default: module.WorkspaceInspections })));

interface NavItem {
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const CORE_NAV_ITEMS: NavItem[] = [
  { slug: "", label: "Dashboard", icon: Home },
  { slug: "owner-oversight", label: "Owner Oversight", icon: ShieldCheck },
  { slug: "listings", label: "Listings", icon: Building2 },
  { slug: "leads", label: "Leads", icon: UserPlus },
  { slug: "contacts", label: "Contacts", icon: Contact },
  { slug: "tasks", label: "Tasks", icon: CheckSquare },
  { slug: "calendar", label: "Calendar", icon: CalendarDays },
  { slug: "payments", label: "Payments", icon: CreditCard },
  { slug: "team", label: "Team", icon: Users },
  { slug: "documents", label: "Documents", icon: FileText },
  { slug: "leases", label: "Leases", icon: KeyRound },
  { slug: "maintenance", label: "Maintenance", icon: Wrench },
  { slug: "inspections", label: "Inspections", icon: ClipboardCheck },
  { slug: "smart-property", label: "Smart Property", icon: Cpu },
  { slug: "estate-operations", label: "Estate Operations", icon: Building },
  { slug: "estate-finance", label: "Estate Finance", icon: CircleDollarSign },
  { slug: "contextual-inbox", label: "Realtime Inbox", icon: MessagesSquare },
  { slug: "estate-communications", label: "Client Communications", icon: Megaphone },
  { slug: "stakeholder-portals", label: "Stakeholder Portals", icon: UserRound },

  { slug: "command-center", label: "Command Center", icon: LayoutDashboard },
  { slug: "data-migration", label: "Data Migration", icon: Database },
  { slug: "property-360", label: "Property 360", icon: Compass },
  { slug: "customer-360", label: "Customer 360", icon: HeartHandshake },
  { slug: "technician-jobs", label: "My Jobs", icon: Hammer },
  { slug: "ai-operations", label: "AI Briefing", icon: Sparkles },
  { slug: "company-launchpad", label: "Company Launchpad", icon: Rocket },
  { slug: "opening-balances", label: "Opening Balances", icon: Receipt },
  { slug: "payment-import", label: "Payment Import", icon: FileSpreadsheet },
  { slug: "estate-payables", label: "Payables", icon: ArrowUpRight },
  { slug: "owner-statements", label: "Owner Statements", icon: FileBarChart },
  { slug: "service-desk", label: "Service Desk", icon: Headphones },
  { slug: "unit-360", label: "Unit 360", icon: Grid3X3 },
  { slug: "utility-metering", label: "Utility Sub-Metering", icon: Gauge },
  { slug: "ai-lease-analyzer", label: "AI Lease Analyzer", icon: FileSearch },
  { slug: "gate-clearance", label: "Gate Clearance Kiosk", icon: QrCode },
  { slug: "contractor-work-orders", label: "Contractor MoMo", icon: Banknote },
  { slug: "whatsapp-hub", label: "WhatsApp Hub", icon: MessageSquare },
  { slug: "multi-currency-fx", label: "FX & Hedging", icon: Coins },
  { slug: "chart-of-accounts", label: "Chart of Accounts", icon: FolderTree },
  { slug: "journal-entries", label: "Journal Entries", icon: BookOpenCheck },
  { slug: "financial-statements", label: "Financial Reports", icon: Scale },
  { slug: "collections-cases", label: "Collections Cases", icon: ShieldAlert },
  { slug: "leasing-applications", label: "Lease Applications", icon: UserCheck },
  { slug: "tenant-screening", label: "Tenant Screening", icon: ShieldCheck },
  { slug: "hoa-management", label: "HOA & Associations", icon: Building },
  { slug: "cam-billing", label: "CAM Billing", icon: Calculator },
  { slug: "contractor-1099", label: "1099 Reporting", icon: FileSpreadsheet },
  { slug: "trust-accounting", label: "Trust Accounting", icon: Landmark },
  { slug: "commercial-escalations", label: "Lease Escalations", icon: TrendingUp },
  { slug: "esignature", label: "eSignature Hub", icon: FileSignature },
  { slug: "owner-disbursements", label: "Owner Payouts", icon: Landmark },
  { slug: "approval-center", label: "Approval Center", icon: BadgeCheck },
  { slug: "exception-center", label: "Exception Center", icon: AlertOctagon },
  { slug: "my-work", label: "My Work", icon: Inbox },
  { slug: "staff-time", label: "Staff Time", icon: Clock },
  { slug: "contractor-portal", label: "Contractor Portal", icon: Hammer },
  { slug: "data-retention", label: "Retention & Holds", icon: Shield },
  { slug: "company-knowledge", label: "Company SOP AI", icon: BookOpen },
  { slug: "evidence-center", label: "Evidence Dossier", icon: FileCheck },
  { slug: "customer-health", label: "SaaS Health & Ops", icon: Activity },
  { slug: "productivity", label: "Living Documents", icon: FileCode2 },
];

const WORKSPACE_SECONDARY_NAV: NavItem[] = [
  { slug: "market-intelligence", label: "Analytics", icon: LineChart },
  { slug: "trust", label: "Trust", icon: ShieldCheck },
  { slug: "compliance", label: "Compliance", icon: FileCheck2 },
  { slug: "international-rules", label: "International Markets", icon: Globe },
  { slug: "automation", label: "Automation", icon: Zap },
  { slug: "module-marketplace", label: "Module Marketplace", icon: Package },
  { slug: "ai-assistant", label: "AI", icon: Bot },
  { slug: "customize-workspace", label: "Customize Workspace", icon: SlidersHorizontal },
  { slug: "settings", label: "Settings", icon: Settings },
];

const TIER_TWO_NAV_ITEMS: NavItem[] = [
  { slug: "fraud-alerts", label: "Fraud Alerts", icon: AlertTriangle },
  { slug: "vendors", label: "Vendors", icon: Truck },
  { slug: "location-intelligence", label: "Location Intel", icon: MapPin },
  { slug: "org-insights", label: "Org Insights", icon: PieChart },
  { slug: "notifications", label: "Notifications", icon: Bell },
  { slug: "whitelabel", label: "White-Label", icon: Palette },
  { slug: "mobile-settings", label: "Mobile Apps", icon: Smartphone },
  { slug: "integrations", label: "Integrations", icon: Plug },
  { slug: "blockchain", label: "Blockchain", icon: Blocks },
  { slug: "host", label: "Host", icon: Home },
  { slug: "finance", label: "Finance", icon: BarChart3 },
];

const AI_NAV_ITEMS: NavItem[] = [
  { slug: "ai-rent-yield", label: "AI Yield Predictor", icon: TrendingUp },
  { slug: "advanced-search", label: "Advanced Search", icon: Search },
  { slug: "predictive-analytics", label: "Predictive Analytics", icon: AreaChart },
  { slug: "recommendations", label: "Recommendations", icon: Sparkles },
];

const ENTERPRISE_NAV_ITEMS: NavItem[] = [
  { slug: "enterprise-operations", label: "Enterprise Operations", icon: Briefcase },
  { slug: "team-chat", label: "Team Chat", icon: MessageSquare },
  { slug: "team-collaboration", label: "Team Hub", icon: Users2 },
  { slug: "workflow-approval", label: "Approval Chains", icon: GitBranch },
  { slug: "workflows", label: "Workflows", icon: Workflow },
];

// Kept for external consumers; internal rendering uses renderNavGroup
function getNavItemClasses(isActive: boolean) {
  return `workspace-nav-link flex items-center gap-3 ${isActive ? "active" : ""}`;
}

void getNavItemClasses; // suppress unused-var lint

export function WorkspaceLayout() {
  const { user, profile, role } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationSlug = "", page } = useParams();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<MemberRole | null>(null);
  const [toolSearch, setToolSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [showMeHowOpen, setShowMeHowOpen] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(() => practiceModeService.isPracticeMode());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("bm_workspace_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [memberScopeMode, setMemberScopeMode] = useState<MemberScopeMode>("organization");
  const [memberPropertyIds, setMemberPropertyIds] = useState<string[]>([]);
  const [memberApprovalProfile, setMemberApprovalProfile] = useState<MemberApprovalProfile | null>(
    null,
  );
  const [adminViewOrganization, setAdminViewOrganization] = useState<
    OrganizationMembership["organization"] | null
  >(null);
  const [adminOrgLoading, setAdminOrgLoading] = useState(false);
  const [pendingCosigns, setPendingCosigns] = useState<
    Awaited<ReturnType<typeof eSignatureService.listPendingCosignForLandlord>>
  >([]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bm_workspace_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  useEffect(() => {
    if (organizationSlug) {
      persistDesktopLastOrg(organizationSlug);
    }
  }, [organizationSlug]);

  useEffect(() => {
    return workspaceSyncService.subscribe(() => undefined);
  }, []);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.organization.slug === organizationSlug) || null,
    [memberships, organizationSlug]
  );

  const userOrganizationIds = useMemo(
    () => memberships.map((membership) => membership.organization.id),
    [memberships],
  );

  const isPlatformStaff = hasPlatformConsoleAccess(profile) || role === "platform_admin";
  const isPlatformAdmin = Boolean(profile?.is_platform_admin) || role === "platform_admin";
  const isPlatformAdminViewer = Boolean(profile?.is_platform_admin);

  useEffect(() => {
    if (!isPlatformAdminViewer || !organizationSlug || currentMembership) {
      setAdminViewOrganization(null);
      setAdminOrgLoading(false);
      return;
    }

    let cancelled = false;
    setAdminOrgLoading(true);

    void organizationService
      .getOrganizationBySlug(organizationSlug)
      .then((org) => {
        if (!cancelled) {
          setAdminViewOrganization(org as OrganizationMembership["organization"]);
        }
      })
      .catch((error) => {
        console.error("Failed to load organization for platform admin view:", error);
        if (!cancelled) {
          setAdminViewOrganization(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAdminOrgLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPlatformAdminViewer, organizationSlug, currentMembership]);

  const isCurrentOrgAccessible = canAccessOrganization({
    userOrganizationIds,
    targetOrganizationId:
      currentMembership?.organization.id ?? adminViewOrganization?.id ?? null,
    isPlatformAdmin,
    isPlatformStaff,
  });

  const fallbackMembership = memberships[0] || null;
  const organization =
    currentMembership?.organization || adminViewOrganization || null;
  const currentRole =
    isPlatformAdminViewer ? "platform_admin" : currentMembership?.role || null;
  const currentPermissions = currentMembership?.permissions ?? null;
  const enabledCapabilities = (
    (organization as { enabled_capabilities?: string[] | null } | null)?.enabled_capabilities ||
    []
  ) as CompanyCapability[];
  const companySetupCompleted = Boolean(
    (organization as { company_setup_completed?: boolean | null } | null)?.company_setup_completed,
  );
  const workspaceKind =
    (organization as { workspace_kind?: "personal" | "company" | null } | null)?.workspace_kind ??
    "company";
  const isPersonalWorkspace = workspaceKind === "personal";
  const navCustomization = useMemo(
    () =>
      parseWorkspaceCustomization(
        organization as {
          workspace_kind?: string | null;
          default_home_slug?: string | null;
          setup_metadata?: unknown;
        } | null,
      ),
    [organization],
  );

  useEffect(() => {
    if (organization?.id) {
      sessionStorage.setItem("bm_workspace_org_id", organization.id);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) return;
    void whitelabelService.applyTheme(organization.id);
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id || !user?.id) {
      setPendingCosigns([]);
      return;
    }

    void eSignatureService
      .listPendingCosignForLandlord(organization.id, user.id)
      .then(setPendingCosigns)
      .catch(() => setPendingCosigns([]));
  }, [organization?.id, user?.id]);
  const effectiveRole: MemberRole = previewRole || currentRole || "owner";
  const mfaGateRole: MemberRole = isPlatformAdminViewer ? "platform_admin" : effectiveRole;
  const dashboardRole: MemberRole = isPlatformAdminViewer
    ? previewRole || "owner"
    : effectiveRole;
  const accessRole: MemberRole =
    shouldUseBusinessMobileShell() ? currentRole || "owner" : effectiveRole;
  const currentPage = page || "";
  const workspaceBasePath = organization
    ? getWorkspaceRoute(organization.slug)
    : WORKSPACE_ENTRY_PATH;

  useEffect(() => {
    if (!organization?.id || !user?.id) return;

    void memberScopeService
      .getMemberScope(organization.id, user.id)
      .then((scope) => {
        setMemberScopeMode(scope.scopeMode);
        setMemberPropertyIds(
          scope.scopeMode === "properties" ? scope.scopedPropertyIds : scope.propertyIds,
        );
        setMemberApprovalProfile({
          role: (scope.role || "analyst") as MemberApprovalProfile["role"],
          permissions: scope.permissions,
          financeApprovalLimitMinor: scope.financeApprovalLimitMinor,
          maintenanceApprovalLimitMinor: scope.maintenanceApprovalLimitMinor,
        });
      })
      .catch(() => {
        setMemberScopeMode("organization");
        setMemberPropertyIds([]);
        setMemberApprovalProfile(null);
      });
  }, [organization?.id, user?.id]);

  const navRole: MemberRole = isPlatformAdminViewer ? "owner" : effectiveRole;
  const navPermissions = isPlatformAdminViewer ? null : currentPermissions;
  const navCapabilities = isPlatformAdminViewer ? null : enabledCapabilities;
  const bypassPropertyScope = isPlatformAdminViewer;
  const memberScopeProps = {
    scopeMode: memberScopeMode,
    scopedPropertyIds: memberPropertyIds,
    bypassPropertyScope,
  };

  const enabledModules = (
    (organization as { enabled_workspace_modules?: string[] | null } | null)
      ?.enabled_workspace_modules || []
  ) as string[];

  const filterByEnabledModules = <T extends { slug: string }>(items: T[]) =>
    items.filter((item) => isNavSlugEnabledByModules(item.slug, enabledModules));

  const visibleCoreNav = useMemo(
    () =>
      applyNavCustomization(
        filterByEnabledModules(
          filterWorkspaceNavItems(CORE_NAV_ITEMS, navRole, navPermissions, navCapabilities),
        ),
        navCustomization,
      ),
    [navRole, navPermissions, navCapabilities, navCustomization, enabledModules],
  );
  const visibleToolsNav = useMemo(
    () =>
      applyNavCustomization(
        filterByEnabledModules(
          filterWorkspaceNavItems(WORKSPACE_SECONDARY_NAV, navRole, navPermissions, navCapabilities),
        ),
        navCustomization,
      ),
    [navRole, navPermissions, navCapabilities, navCustomization, enabledModules],
  );
  const visibleMoreNav = useMemo(
    () =>
      applyNavCustomization(
        filterByEnabledModules(
          filterWorkspaceNavItems(TIER_TWO_NAV_ITEMS, navRole, navPermissions, navCapabilities),
        ),
        navCustomization,
      ),
    [navRole, navPermissions, navCapabilities, navCustomization, enabledModules],
  );
  const visibleAiNav = useMemo(
    () =>
      applyNavCustomization(
        filterByEnabledModules(
          filterWorkspaceNavItems(AI_NAV_ITEMS, navRole, navPermissions, navCapabilities),
        ),
        navCustomization,
      ),
    [navRole, navPermissions, navCapabilities, navCustomization, enabledModules],
  );
  const visibleEnterpriseNav = useMemo(
    () =>
      applyNavCustomization(
        filterByEnabledModules(
          filterWorkspaceNavItems(ENTERPRISE_NAV_ITEMS, navRole, navPermissions, navCapabilities),
        ),
        navCustomization,
      ),
    [navRole, navPermissions, navCapabilities, navCustomization, enabledModules],
  );

  const filteredSearchResults = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();
    if (!query) return null;

    const sections = [
      { category: "Core", items: visibleCoreNav },
      { category: "Tools", items: visibleToolsNav },
      { category: "More", items: visibleMoreNav },
      { category: "AI Intelligence", items: visibleAiNav },
      { category: "Enterprise", items: visibleEnterpriseNav },
    ];

    const results: Array<NavItem & { category: string }> = [];
    for (const section of sections) {
      for (const item of section.items) {
        if (
          item.label.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query)
        ) {
          results.push({ ...item, category: section.category });
        }
      }
    }
    return results;
  }, [
    toolSearch,
    visibleCoreNav,
    visibleToolsNav,
    visibleMoreNav,
    visibleAiNav,
    visibleEnterpriseNav,
  ]);

  const canCreateListing = canWorkspace(navRole, "listings:write", navPermissions);
  const roleHomeSlug = isPlatformAdminViewer ? "" : getRoleHomeSlug(accessRole);
  const orgHomeSlug = navCustomization.defaultHomeSlug || roleHomeSlug;
  const pageAllowed =
    currentPage === "company-setup" ||
    currentPage === "" ||
    canAccessWorkspaceSlug(currentPage, isPlatformAdminViewer ? "owner" : accessRole, navPermissions, navCapabilities);

  useEffect(() => {
    const state = location.state as { restrictedAccess?: boolean; attemptedPage?: string } | null;
    if (!state?.restrictedAccess) return;
    toast.message(t("access.restricted"), {
      description: state.attemptedPage
        ? t("access.restrictedSection", {
            section: state.attemptedPage.replace(/-/g, " "),
          })
        : t("access.restrictedGeneric"),
    });
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate, t]);

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
      case "company-setup":
        return (
          <CompanySetupWizard
            organization={organization}
            onComplete={() => navigate(getWorkspaceRoute(organization.slug, "team"))}
          />
        );
      case "":
        if (isElectron()) {
          return (
            <DesktopMyWorkHome
              organization={organization}
              workspaceBasePath={workspaceBasePath}
              currentRole={effectiveRole}
            />
          );
        }
        return (
          <WorkspaceDashboard
            organization={organization}
            workspaceBasePath={workspaceBasePath}
            currentRole={dashboardRole}
            onRoleChange={(r) => setPreviewRole(r)}
            {...memberScopeProps}
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
            currentRole={currentRole}
            scopeMode={memberScopeMode}
            scopedPropertyIds={memberPropertyIds}
            bypassPropertyScope={bypassPropertyScope}
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
            currentRole={currentRole}
          />
        );
      case "tasks":
        return (
          <WorkspaceTasks
            organization={organization}
            currentUserId={user.id}
            currentRole={currentRole}
          />
        );
      case "team":
        return (
          <WorkspaceTeam
            organization={organization}
            currentUserId={user.id}
            currentRole={currentRole}
            currentPermissions={currentPermissions}
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
          />
        );
      case "international-rules":
        return <InternationalRulesHub organizationId={organization.id} />;
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
      case "customize-workspace":
        return (
          <CustomizeWorkspace
            organizationId={organization.id}
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
        return <VendorManagement organizationId={organization.id} currentUserId={user.id} />;
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
        return <WorkspaceHost organizationId={organization.id} {...memberScopeProps} />;
      case "leases":
        return <WorkspaceLeases organizationId={organization.id} {...memberScopeProps} />;
      case "maintenance":
        return (
          <WorkspaceMaintenance
            organizationId={organization.id}
            scopeMode={memberScopeMode}
            scopedPropertyIds={memberPropertyIds}
            bypassPropertyScope={bypassPropertyScope}
          />
        );
      case "inspections":
        return (
          <WorkspaceInspections
            organizationId={organization.id}
            currentUserId={user.id}
            {...memberScopeProps}
          />
        );
      case "smart-property":
        return <WorkspaceSmartProperty organizationId={organization.id} />;
      case "estate-operations":
        return (
          <EstateOperations
            organizationId={organization.id}
            currentUserId={user.id}
            memberApprovalProfile={memberApprovalProfile}
            {...memberScopeProps}
          />
        );
      case "estate-finance":
        return <EstateFinance organizationId={organization.id} currentUserId={user.id} />;
      case "estate-communications":
        return <EstateCommunications organizationId={organization.id} currentUserId={user.id} />;
      case "contextual-inbox":
        return <ContextualInboxHub organizationId={organization.id} currentUserId={user.id} />;
      case "stakeholder-portals":
        return <StakeholderPortals organizationId={organization.id} />;
      case "enterprise-operations":
        return <EnterpriseOperations organizationId={organization.id} currentUserId={user.id} />;
      case "command-center":
        return <CommandCenter organizationId={organization.id} />;
      case "data-migration":
        return <DataMigration organizationId={organization.id} currentUserId={user.id} />;
      case "property-360":
        return <Property360 organizationId={organization.id} {...memberScopeProps} />;
      case "customer-360":
        return <Customer360 organizationId={organization.id} />;
      case "technician-jobs":
        return <TechnicianJobs organizationId={organization.id} currentUserId={user.id} />;
      case "ai-operations":
        return <EstateAIOperations organizationId={organization.id} currentUserId={user.id} />;
      case "company-launchpad":
        return <CompanyLaunchpad organizationId={organization.id} />;
      case "opening-balances":
        return <OpeningBalanceImport organizationId={organization.id} currentUserId={user.id} />;
      case "payment-import":
        return <PaymentImport organizationId={organization.id} currentUserId={user.id} />;
      case "estate-payables":
        return <EstatePayables organizationId={organization.id} currentUserId={user.id} />;
      case "owner-statements":
        return (
          <OwnerStatements
            organizationId={organization.id}
            memberApprovalProfile={memberApprovalProfile}
          />
        );
      case "service-desk":
        return <ServiceDesk organizationId={organization.id} />;
      case "unit-360":
        return <Unit360 organizationId={organization.id} />;
      case "utility-metering":
        return <UtilitySubmetering organizationId={organization.id} />;
      case "ai-lease-analyzer":
        return <AILeaseAnalyzer />;
      case "gate-clearance":
        return <GateClearanceKiosk organizationId={organization.id} currentUserId={user.id} />;
      case "contractor-work-orders":
        return <ContractorWorkOrders organizationId={organization.id} currentUserId={user.id} />;
      case "advanced-search":
        return (
          <AdvancedSearch
            organizationId={organization.id}
            currentUserId={user.id}
          />
        );
      case "predictive-analytics":
        return <PredictiveAnalytics organizationId={organization.id} />;
      case "ai-rent-yield":
        return <AIRentYieldPredictor organizationId={organization.id} />;
      case "whatsapp-hub":
        return <WhatsAppAutomationHub organizationId={organization.id} />;
      case "multi-currency-fx":
        return <MultiCurrencyHedgingHub />;
      case "recommendations":
        return <RecommendationEngine />;
      case "owner-oversight":
        return (
          <OwnerOversight
            organization={organization}
            workspaceBasePath={workspaceBasePath}
          />
        );
      case "team-chat":
        return (
          <WorkspaceTeamChat
            organizationId={organization.id}
            currentUserId={user.id}
            currentRole={currentRole}
          />
        );
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
      case "workflow-approval":
        return (
          <WorkflowApprovalHub
            organizationId={organization.id}
            organizationSlug={organization.slug}
            currentRole={currentRole}
          />
        );
      case "module-marketplace":
        return (
          <ModuleMarketplace
            organizationId={organization.id}
            currentRole={currentRole}
          />
        );
      // ── Desktop-Exclusive Enterprise Modules ──────────────────────
      case "general-ledger":
        return <GeneralLedger organizationId={organization.id} />;
      case "procurement":
        return <ProcurementCenter organizationId={organization.id} currentUserId={user.id} />;
      case "bank-reconciliation":
        return <BankReconciliation organizationId={organization.id} currentUserId={user.id} />;
      case "portfolio-analytics":
        return <PortfolioAnalytics organizationId={organization.id} {...memberScopeProps} />;
      case "ai-command-center":
        return <AICommandCenter organizationId={organization.id} />;
      case "automation-builder":
        return <AutomationBuilder organizationId={organization.id} />;
      case "bulk-operations":
        return <BulkOperations organizationId={organization.id} />;
      case "data-import-export":
        return <DataImportExport />;
      case "chart-of-accounts":
        return <ChartOfAccountsAdmin organizationId={organization.id} />;
      case "journal-entries":
        return <JournalEntryManager organizationId={organization.id} />;
      case "financial-statements":
        return <FinancialStatementsViewer organizationId={organization.id} />;
      case "collections-cases":
        return <CollectionsCases organizationId={organization.id} />;
      case "leasing-applications":
        return <LeasingApplications organizationId={organization.id} />;
      case "tenant-screening":
        return <TenantScreeningCenter organizationId={organization.id} />;
      case "hoa-management":
        return <HoaManagement organizationId={organization.id} />;
      case "cam-billing":
        return <CamBilling organizationId={organization.id} />;
      case "contractor-1099":
        return <Contractor1099 organizationId={organization.id} />;
      case "trust-accounting":
        return <TrustAccounting organizationId={organization.id} />;
      case "commercial-escalations":
        return <CommercialLeaseEscalations organizationId={organization.id} />;
      case "integration-marketplace":
        return <Navigate to={getWorkspaceRoute(organization.slug, "finance")} replace />;
      case "esignature":
        return <ESignature organizationId={organization.id} />;
      case "owner-disbursements":
        return <OwnerDisbursements organizationId={organization.id} />;
      case "approval-center":
        return <ApprovalCenter organizationId={organization.id} />;
      case "exception-center":
        return <ExceptionCenter organizationId={organization.id} />;
      case "my-work":
        return <MyWorkQueue organizationId={organization.id} currentRole={effectiveRole} />;
      case "staff-time":
        return <StaffTimeTracking organizationId={organization.id} />;
      case "contractor-portal":
        return <ContractorPortal organizationId={organization.id} />;
      case "data-retention":
        return <DataRetentionCenter organizationId={organization.id} />;
      case "company-knowledge":
        return <CompanyKnowledgeHub organizationId={organization.id} />;
      case "evidence-center":
        return <EvidenceCenter organizationId={organization.id} />;
      case "customer-health":
        return <CustomerHealthCenter organizationId={organization.id} />;
      case "productivity":
        return <ProductivityWorkspace organizationId={organization.id} />;
      default:
        return (
          <WorkspaceDashboard
            organization={organization}
            workspaceBasePath={workspaceBasePath}
            currentRole={dashboardRole}
            onRoleChange={(r) => setPreviewRole(r)}
            {...memberScopeProps}
          />
        );
    }
  };

  if (loading || adminOrgLoading) {
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

  if (organizationSlug && !isCurrentOrgAccessible && !(isPlatformAdminViewer && adminViewOrganization)) {
    if (memberships.length > 0) {
      return <Navigate to={WORKSPACE_ENTRY_PATH} replace />;
    }
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

  if (
    currentRole === "owner" &&
    !companySetupCompleted &&
    !isPersonalWorkspace &&
    !isPlatformAdminViewer &&
    currentPage !== "company-setup" &&
    currentPage !== "team"
  ) {
    return <Navigate to={getWorkspaceRoute(organization.slug, "company-setup")} replace />;
  }

  if (
    currentPage === "" &&
    !previewRole &&
    !isPlatformAdminViewer &&
    orgHomeSlug &&
    orgHomeSlug !== "" &&
    canAccessWorkspaceSlug(orgHomeSlug, accessRole, currentPermissions, enabledCapabilities) &&
    !isElectron()
  ) {
    return <Navigate to={getWorkspaceRoute(organization.slug, orgHomeSlug)} replace />;
  }

  const renderNavGroup = (
    title: string,
    items: NavItem[],
    categoryTag?: string,
    isMobile = false
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-5">
        {!isCollapsed || isMobile ? (
          <div className="flex items-center justify-between px-3 mb-1.5">
            <h3 className="text-[10px] font-extrabold text-ink-muted uppercase tracking-[0.12em]">
              {title}
            </h3>
            <span className="text-[9px] font-bold bg-primary/8 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
              {items.length}
            </span>
          </div>
        ) : (
          <div className="h-px bg-surface-border/60 my-3 mx-2" />
        )}
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.slug === "" ? currentPage === "" : currentPage === item.slug;
            const href = item.slug
              ? `${workspaceBasePath}/${item.slug}`
              : workspaceBasePath;

            return (
              <Link
                key={item.slug || "dashboard"}
                to={href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => isMobile && setMobileDrawerOpen(false)}
                title={isCollapsed && !isMobile ? `${item.label}` : undefined}
                className={`workspace-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? "active bg-emerald-500/10 dark:bg-emerald-500/15 font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
                } ${isCollapsed && !isMobile ? "justify-center px-0 py-2.5" : ""}`}
              >
                {/* Active glowing accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}

                <Icon
                  className={`shrink-0 transition-all duration-200 ${
                    isCollapsed && !isMobile ? "w-5 h-5" : "w-4 h-4"
                  } ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400 drop-shadow-xs"
                      : "text-ink-tertiary group-hover:text-ink"
                  }`}
                />

                {(!isCollapsed || isMobile) && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate text-[13px]">{item.label}</span>
                    {categoryTag && (
                      <span className="text-[9px] uppercase font-extrabold text-ink-muted bg-surface-subtle border border-surface-border/60 px-1.5 py-0.5 rounded ml-2 shrink-0 tracking-wider">
                        {categoryTag}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const cosignBanner =
    pendingCosigns.length > 0 ? (
      <SignatureActionBanner
        title="Countersignature required"
        description={`${pendingCosigns.length} lease${pendingCosigns.length === 1 ? "" : "s"} waiting for your signature after tenant sign-off.`}
        actionLabel="Countersign now"
        onAction={() => {
          const pending = pendingCosigns[0];
          if (pending?.signPath?.startsWith("/sign/")) {
            window.open(pending.signPath, "_blank", "noopener,noreferrer");
            return;
          }
          if (pending?.signingUrl) {
            window.open(pending.signingUrl, "_blank", "noopener,noreferrer");
          }
        }}
      />
    ) : null;

  const workspacePageContent = (
    <>
      <OfflineStatusBanner organizationId={organization.id} />
      {cosignBanner}
      {!pageAllowed && currentPage && organization ? (
        <Navigate
          to={getWorkspaceRoute(organization.slug, orgHomeSlug)}
          replace
          state={{ restrictedAccess: true, attemptedPage: currentPage }}
        />
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-surface-border bg-surface-subtle/40 p-6">
              <PageLoadingSkeleton />
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      )}
    </>
  );

  const workspaceModals = (
    <>
      {commandOpen && (
        <UniversalCommandBar
          workspaceBasePath={workspaceBasePath}
          onClose={() => setCommandOpen(false)}
        />
      )}
      {showMeHowOpen && (
        <ShowMeHowOverlay
          currentModule={currentPage}
          onClose={() => setShowMeHowOpen(false)}
        />
      )}
    </>
  );

  if (isElectron()) {
    return (
      <WorkspaceMfaGate role={mfaGateRole} permissions={navPermissions}>
        <BusinessDesktopShell organizationName={organization.name}>
          <div className="max-w-full">{workspacePageContent}</div>
        </BusinessDesktopShell>
        {workspaceModals}
      </WorkspaceMfaGate>
    );
  }

  if (shouldUseBusinessMobileShell()) {
    return (
      <WorkspaceMfaGate role={mfaGateRole} permissions={navPermissions}>
        <BusinessMobileShell
          jobRole={mapMemberRoleToMobileJobRole(accessRole)}
          organizationSlug={organizationSlug}
          organizationName={organization.name}
          organizationId={organization.id}
          memberRole={accessRole}
          organizationOptions={memberships.map((membership) => ({
            id: membership.organization.id,
            slug: membership.organization.slug,
            name: membership.organization.name,
          }))}
          onOrganizationChange={handleOrganizationChange}
          onMenuPress={() => setMobileDrawerOpen(true)}
        >
          <div className="max-w-full">{workspacePageContent}</div>
        </BusinessMobileShell>

        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Workspace menu">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close workspace menu"
            />
            <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-surface-border bg-surface shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{organization.name}</p>
                  <span className="mt-0.5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
                    {getRoleLabel(effectiveRole)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="shrink-0 rounded-lg p-1.5 text-ink-secondary hover:bg-surface-hover"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {renderNavGroup("Core", visibleCoreNav, undefined, true)}
                {renderNavGroup("Tools", visibleToolsNav, undefined, true)}
                {renderNavGroup("More", visibleMoreNav, undefined, true)}
                {renderNavGroup("AI Suite", visibleAiNav, undefined, true)}
                {renderNavGroup("Enterprise", visibleEnterpriseNav, undefined, true)}
              </div>
            </div>
          </div>
        )}

        {workspaceModals}
      </WorkspaceMfaGate>
    );
  }

  return (
    <WorkspaceMfaGate role={mfaGateRole} permissions={navPermissions}>
      <div className="desktop-shell workspace-portal">
        {/* ── Top Header ─────────────────────────────────────────────── */}
        <nav className="desktop-header border-b border-surface-border bg-surface/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[var(--max-width-page)] px-4 sm:px-6">
            <div className="flex h-14 items-center justify-between gap-3">

              {/* Left: toggle + logo + org info */}
              <div className="flex items-center gap-2.5">
                {/* Mobile hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="lg:hidden p-2 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover text-ink-secondary transition-colors"
                  aria-label="Open workspace menu"
                >
                  <Menu className="w-4.5 h-4.5" />
                </button>

                {/* Desktop collapse toggle */}
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="hidden lg:flex p-2 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover text-ink-secondary transition-colors"
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </button>

                <div className="h-5 w-px bg-surface-border" />
                <Logo />

                {/* Org info – desktop only */}
                <div className="hidden sm:flex flex-col justify-center ml-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink text-sm leading-tight truncate max-w-[12rem]">
                      {organization.name}
                    </span>
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                      {getRoleLabel(effectiveRole)}
                    </span>
                    <span className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      <span className="radar-pulse-dot" />
                      Live Sync
                    </span>
                    {isPracticeMode && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Sandbox
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted truncate max-w-[16rem] leading-tight">
                    {getWorkspaceRoleDescription(effectiveRole)}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2">
                {/* Org switcher */}
                {memberships.length > 1 && (
                  <NativeSelectControl
                    className="hidden sm:block px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface text-xs text-ink outline-none transition focus:border-primary max-w-[9rem]"
                    value={organization.id}
                    onChange={(event) => handleOrganizationChange(event.target.value)}
                    aria-label="Switch organization"
                  >
                    {memberships.map((membership) => (
                      <option key={membership.organization.id} value={membership.organization.id}>
                        {membership.organization.name}
                      </option>
                    ))}
                  </NativeSelectControl>
                )}

                {/* Sandbox toggle – mobile uses icon-only */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPracticeMode;
                    setIsPracticeMode(next);
                    practiceModeService.setPracticeMode(next);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isPracticeMode
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/10"
                      : "border-surface-border bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                  title="Toggle Sandbox / Practice Mode"
                >
                  <span className="hidden sm:inline">Sandbox</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isPracticeMode ? "bg-amber-500 animate-ping" : "bg-ink-muted/30"}`} />
                </button>

                {/* Universal command */}
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-border/80 bg-surface/90 hover:bg-surface hover:border-emerald-500/40 text-xs text-ink-muted hover:text-ink transition-all shadow-xs group"
                  title="Universal Command (Cmd+K)"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden md:inline text-ink font-medium text-xs">Search...</span>
                  <kbd className="hidden sm:inline text-[10px] font-mono bg-surface-subtle border border-surface-border px-1.5 py-0.5 rounded text-ink-muted group-hover:border-emerald-500/30">⌘K</kbd>
                </button>

                {/* Show Me How */}
                <button
                  type="button"
                  onClick={() => setShowMeHowOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                  title="Interactive Guide"
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">Show Me How</span>
                </button>

                <ThemeToggle />

                {canCreateListing && (
                  <Link to={`${workspaceBasePath}/new`}>
                    <Button size="sm" className="hidden sm:inline-flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>New Listing</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ── Mobile Slide-over Drawer ───────────────────────────────── */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace menu">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close workspace menu"
            />

            <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-surface-border bg-surface shadow-2xl animate-in slide-in-from-left-4 duration-200">
              {/* Drawer header */}
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-sm truncate">{organization.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-px rounded-full border border-primary/20">
                      {getRoleLabel(effectiveRole)}
                    </span>
                    {isPracticeMode && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-600 px-1.5 py-px rounded-full border border-amber-500/20">
                        Sandbox
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-ink-secondary flex-shrink-0"
                  aria-label="Close menu"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-surface-border">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    aria-label="Search workspace tools and modules"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Search tools & modules..."
                    className="w-full pl-8 pr-8 py-2 rounded-lg bg-surface-subtle border border-surface-border text-xs text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:bg-surface transition-colors"
                  />
                  {toolSearch && (
                    <button
                      type="button"
                      onClick={() => setToolSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                      aria-label="Clear workspace search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nav list */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {filteredSearchResults ? (
                  <div>
                    <p className="text-[11px] text-ink-muted mb-3 font-semibold px-2">
                      {filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? "s" : ""}
                    </p>
                    {renderNavGroup("Search Results", filteredSearchResults, undefined, true)}
                  </div>
                ) : (
                  <>
                    {renderNavGroup("Core Operations", visibleCoreNav, undefined, true)}
                    {renderNavGroup("Tools & Management", visibleToolsNav, undefined, true)}
                    {renderNavGroup("More Modules", visibleMoreNav, undefined, true)}
                    {renderNavGroup("AI Suite", visibleAiNav, undefined, true)}
                    {renderNavGroup("Enterprise", visibleEnterpriseNav, undefined, true)}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-3 border-t border-surface-border">
                <Link
                  to="/app"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-hover text-ink-secondary text-sm font-medium transition-colors"
                >
                  <UserRound className="w-4 h-4 text-primary shrink-0" />
                  <span>Consumer Portal</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="workspace-body">
          {/* ── Desktop Collapsible Sidebar ────────────────────────── */}
          <aside
            className={`workspace-sidebar hidden lg:flex flex-col transition-[width] duration-300 ease-in-out shrink-0 ${
              isCollapsed ? "w-[4.5rem]" : "w-64"
            }`}
          >
            <div className={`flex flex-col h-full ${isCollapsed ? "px-2 py-4" : "px-3 py-4"}`}>
              {/* Search – expanded only */}
              {!isCollapsed && (
                <div className="mb-4 px-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      aria-label="Search workspace tools and modules"
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                      placeholder="Search tools & modules..."
                      className="w-full pl-8 pr-8 py-2 rounded-lg bg-surface-subtle border border-surface-border text-xs text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-primary focus:bg-surface"
                    />
                    {toolSearch && (
                      <button
                        type="button"
                        onClick={() => setToolSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                        aria-label="Clear workspace search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Nav groups */}
              <nav className="flex-1 overflow-y-auto space-y-1 pr-0.5" aria-label="Workspace sections">
                {filteredSearchResults ? (
                  <div>
                    {!isCollapsed && (
                      <p className="text-[11px] text-ink-muted mb-3 font-semibold px-3">
                        {filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {renderNavGroup("Results", filteredSearchResults)}
                  </div>
                ) : (
                  <>
                    {renderNavGroup("Core", visibleCoreNav)}
                    {renderNavGroup("Tools", visibleToolsNav)}
                    {renderNavGroup("More", visibleMoreNav)}
                    {renderNavGroup("AI Suite", visibleAiNav)}
                    {renderNavGroup("Enterprise", visibleEnterpriseNav)}
                  </>
                )}
              </nav>

              {/* Sidebar footer */}
              <div className="mt-2 pt-3 border-t border-surface-border">
                {!isCollapsed && profile && (
                  <div className="px-3 py-2 mb-1 rounded-xl bg-surface-subtle border border-surface-border/60">
                    <p className="text-xs font-semibold text-ink truncate">{profile.full_name || "My Account"}</p>
                    <p className="text-[10px] text-ink-muted truncate">{user?.email}</p>
                  </div>
                )}
                <Link
                  to="/app"
                  title={isCollapsed ? "Consumer Portal" : undefined}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink transition-colors ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                >
                  <UserRound className="w-4 h-4 text-primary shrink-0" />
                  {!isCollapsed && <span className="text-[13px] font-medium">Consumer Portal</span>}
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main
            id="main-content"
            tabIndex={-1}
            className="main-content-region workspace-main-panel flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden max-w-full"
          >
            <div className="max-w-7xl mx-auto">
              {workspacePageContent}
            </div>
          </main>
        </div>

        {workspaceModals}
      </div>
    </WorkspaceMfaGate>
  );
}
