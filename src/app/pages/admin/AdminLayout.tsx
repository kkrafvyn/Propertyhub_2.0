import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Gauge,
  LockKeyhole,
  MoreHorizontal,
  Settings,
  Shield,
  ShieldAlert,
  Rocket,
  Search,
  UserCheck,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { EscrowMilestoneTimeline } from "../../components/escrow/EscrowMilestoneTimeline";
import { PageLoadingState } from "../../components/PageStates";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { fraudDetectionService } from "../../../lib/fraud-detection.service";
import {
  canProviderGoLive,
  LAUNCH_WORKSTREAM_LABELS,
  launchReadinessService,
  summarizeLaunchReadiness,
  type ExternalProviderReadiness,
  type LaunchReadinessItem,
  type LaunchStatus,
} from "../../../lib/launch-readiness.service";
import {
  platformAdminService,
  type AdminEscrowRow,
  type AdminListingRow,
  type AdminOrganizationRow,
  type AdminUserRow,
  type PlatformAdmin,
  type PlatformAdminRosterRow,
} from "../../../lib/platform-admin.service";
import { formatMinorCurrency } from "../../../lib/subscription.service";

type AdminSection =
  | "overview"
  | "users"
  | "organizations"
  | "listings"
  | "transactions"
  | "verification"
  | "disputes"
  | "analytics"
  | "security"
  | "settings";

const navItems: Array<{
  key: AdminSection;
  label: string;
  href: string;
  icon: typeof BarChart3;
}> = [
  { key: "overview", label: "Overview", href: "/admin", icon: BarChart3 },
  { key: "users", label: "Users", href: "/admin/users", icon: Users },
  { key: "organizations", label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { key: "listings", label: "Listings", href: "/admin/listings", icon: FileText },
  { key: "transactions", label: "Transactions", href: "/admin/transactions", icon: Wallet },
  { key: "verification", label: "Verification", href: "/admin/verification", icon: UserCheck },
  { key: "disputes", label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: Gauge },
  { key: "security", label: "Security", href: "/admin/security", icon: LockKeyhole },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
];

function getCurrentSection(pathname: string): AdminSection {
  const section = pathname.split("/")[2];

  if (!section) return "overview";

  const aliases: Record<string, AdminSection> = {
    escrow: "transactions",
    moderation: "security",
    launch: "settings",
  };

  if (aliases[section]) return aliases[section];
  if (navItems.some((item) => item.key === section)) return section as AdminSection;

  return "overview";
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "resolved":
      return "default";
    case "escalated":
      return "destructive";
    case "investigating":
      return "secondary";
    case "dismissed":
      return "outline";
    default:
      return "outline";
  }
}

function getLaunchStatusVariant(status: LaunchStatus) {
  switch (status) {
    case "approved":
    case "live":
      return "default";
    case "blocked":
    case "rejected":
      return "destructive";
    case "in_progress":
    case "ready_for_review":
      return "secondary";
    default:
      return "outline";
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString();
}

const adminSurfaceClass =
  "rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur";

const adminSoftSurfaceClass =
  "rounded-3xl border border-slate-200/80 bg-slate-50/70";

function AdminMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof BarChart3;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
}) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-primary/10 text-primary",
    green: "bg-primary/10 text-primary",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <Card className={`${adminSurfaceClass} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const currentSection = useMemo(() => getCurrentSection(location.pathname), [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<PlatformAdmin | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganizationRow[]>([]);
  const [organizationMetrics, setOrganizationMetrics] = useState({
    totalOrganizations: 0,
    pendingVerification: 0,
    suspendedOrganizations: 0,
    activeSubscriptions: 0,
    monthlyRecurringRevenueMinor: 0,
  });
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalListings: 0,
    pendingAlerts: 0,
    openCases: 0,
    escalatedCases: 0,
    resolvedToday: 0,
    recentAudit: [] as any[],
  });
  const [reviewCases, setReviewCases] = useState<any[]>([]);
  const [triageAlerts, setTriageAlerts] = useState<any[]>([]);
  const [listingQueue, setListingQueue] = useState<AdminListingRow[]>([]);
  const [listingMetrics, setListingMetrics] = useState({
    totalListings: 0,
    pendingReview: 0,
    listed: 0,
    suspended: 0,
  });
  const [userQueue, setUserQueue] = useState<AdminUserRow[]>([]);
  const [userMetrics, setUserMetrics] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    bannedUsers: 0,
    organizationMembers: 0,
    platformAdmins: 0,
  });
  const [adminRoster, setAdminRoster] = useState<PlatformAdminRosterRow[]>([]);
  const [billingEvents, setBillingEvents] = useState<any[]>([]);
  const [escrowQueue, setEscrowQueue] = useState<AdminEscrowRow[]>([]);
  const [escrowMetrics, setEscrowMetrics] = useState({
    totalEscrows: 0,
    held: 0,
    disputed: 0,
    released: 0,
    refunded: 0,
    heldValueMinor: 0,
  });
  const [readinessItems, setReadinessItems] = useState<LaunchReadinessItem[]>([]);
  const [providerReadiness, setProviderReadiness] = useState<ExternalProviderReadiness[]>([]);

  const queueCount = triageAlerts.length + reviewCases.length;
  const canManagePlatform = currentAdmin?.role === "admin" || currentAdmin?.role === "support";
  const readinessSummary = useMemo(
    () => summarizeLaunchReadiness(readinessItems),
    [readinessItems]
  );
  const failedPaymentEvents = useMemo(
    () =>
      billingEvents.filter((event) =>
        String(event.event_type || "").toLowerCase().includes("fail")
      ),
    [billingEvents]
  );
  const disputedEscrows = useMemo(
    () => escrowQueue.filter((escrow) => escrow.status === "disputed"),
    [escrowQueue]
  );

  const loadAdminState = async () => {
    try {
      setLoading(true);
      const admin = await platformAdminService.getCurrentAdmin();
      setCurrentAdmin(admin);

      if (!admin) {
        setOverview((current) => ({ ...current, recentAudit: [] }));
        setReviewCases([]);
        setTriageAlerts([]);
        setOrganizations([]);
        setListingQueue([]);
        setUserQueue([]);
        setAdminRoster([]);
        setBillingEvents([]);
        setEscrowQueue([]);
        setReadinessItems([]);
        setProviderReadiness([]);
        return;
      }

      const [
        nextOverview,
        nextReviewCases,
        nextTriageAlerts,
        nextOrganizationQueue,
        nextListingQueue,
        nextUserQueue,
        nextAdminSettings,
        nextEscrowQueue,
        nextReadinessItems,
        nextProviderReadiness,
      ] = await Promise.all([
        fraudDetectionService.getModerationOverview(),
        fraudDetectionService.getReviewCases("active", 12),
        fraudDetectionService.getPendingAlertsWithoutCase(8),
        platformAdminService.getOrganizationQueue(),
        platformAdminService.getListingQueue(),
        platformAdminService.getUserQueue(),
        platformAdminService.getAdminSettings(),
        platformAdminService.getEscrowQueue(),
        launchReadinessService.getReadinessItems().catch(() => []),
        launchReadinessService.getProviderReadiness().catch(() => []),
      ]);

      setOverview(nextOverview);
      setReviewCases(nextReviewCases);
      setTriageAlerts(nextTriageAlerts);
      setOrganizations(nextOrganizationQueue.organizations);
      setOrganizationMetrics(nextOrganizationQueue.metrics);
      setListingQueue(nextListingQueue.listings);
      setListingMetrics(nextListingQueue.metrics);
      setUserQueue(nextUserQueue.users);
      setUserMetrics(nextUserQueue.metrics);
      setAdminRoster(nextAdminSettings.admins);
      setBillingEvents(nextAdminSettings.billingEvents);
      setEscrowQueue(nextEscrowQueue.escrows);
      setEscrowMetrics(nextEscrowQueue.metrics);
      setReadinessItems(nextReadinessItems);
      setProviderReadiness(nextProviderReadiness);
    } catch (error) {
      console.error("Failed to load admin console:", error);
      toast.error("Unable to load the latest admin signals right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminState();
  }, []);

  const runAction = async (actionKey: string, task: () => Promise<void>) => {
    try {
      setWorkingId(actionKey);
      await task();
      await loadAdminState();
    } catch (error) {
      console.error("Admin action failed:", error);
      toast.error("That admin action could not be completed.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleOpenCase = async (alertId: string) => {
    if (!user) return;

    await runAction(`alert:${alertId}:open`, async () => {
      await fraudDetectionService.createReviewCaseFromAlert({
        alertId,
        actorUserId: user.id,
        assignedTo: user.id,
      });
      toast.success("Review case opened and assigned to you.");
    });
  };

  const handleDismissAlert = async (alertId: string) => {
    if (!user) return;

    await runAction(`alert:${alertId}:dismiss`, async () => {
      await fraudDetectionService.reviewAlert(
        alertId,
        false,
        user.id,
        "Dismissed during initial moderation triage."
      );
      toast.success("Alert dismissed.");
    });
  };

  const handleAssignToMe = async (caseId: string) => {
    if (!user) return;

    await runAction(`case:${caseId}:assign`, async () => {
      await fraudDetectionService.assignReviewCase({
        caseId,
        assignedTo: user.id,
        actorUserId: user.id,
      });
      toast.success("Case assigned to you.");
    });
  };

  const handleCaseStatus = async (caseId: string, status: any) => {
    if (!user) return;

    const note =
      status === "resolved" || status === "dismissed"
        ? window.prompt("Add a short resolution note (optional):") || undefined
        : undefined;

    await runAction(`case:${caseId}:${status}`, async () => {
      await fraudDetectionService.updateReviewCaseStatus({
        caseId,
        status,
        actorUserId: user.id,
        note,
      });
      toast.success(`Case moved to ${String(status).replaceAll("_", " ")}.`);
    });
  };

  const handleOrganizationAction = async (
    organization: AdminOrganizationRow,
    action: "approve" | "reject" | "request_changes" | "suspend" | "unsuspend"
  ) => {
    if (!user) return;

    const reason =
      action === "approve" || action === "unsuspend"
        ? undefined
        : window.prompt("Add a short admin reason:") || undefined;

    await runAction(`organization:${organization.id}:${action}`, async () => {
      await platformAdminService.updateOrganizationStatus({
        organizationId: organization.id,
        actorUserId: user.id,
        action,
        reason,
      });
      toast.success(`Organization ${action.replace("_", " ")} completed.`);
    });
  };

  const handleListingAction = async (
    listing: AdminListingRow,
    action: "approve" | "reject" | "suspend" | "unsuspend"
  ) => {
    if (!user) return;

    const reason =
      action === "approve" || action === "unsuspend"
        ? window.prompt("Optional admin note for this listing:") || undefined
        : window.prompt("Add a short admin reason:") || undefined;

    await runAction(`listing:${listing.id}:${action}`, async () => {
      await platformAdminService.updateListingModerationStatus({
        listingId: listing.id,
        organizationId: listing.organization_id,
        actorUserId: user.id,
        action,
        reason,
      });
      toast.success(`Listing ${action.replace("_", " ")} completed.`);
    });
  };

  const handleUserAction = async (
    profile: AdminUserRow,
    action: "verify" | "unverify" | "suspend" | "restore"
  ) => {
    if (!user || !canManagePlatform) return;

    const reason =
      action === "verify" || action === "restore"
        ? undefined
        : window.prompt("Add a short admin reason:") || undefined;

    await runAction(`user:${profile.id}:${action}`, async () => {
      await platformAdminService.updateUserAccessStatus({
        targetUserId: profile.id,
        actorUserId: user.id,
        action,
        reason,
      });
      toast.success(`User ${action.replace("_", " ")} completed.`);
    });
  };

  const handleEscrowDocumentAction = async (
    escrow: AdminEscrowRow,
    escrowDocument: any,
    approved: boolean
  ) => {
    if (!canManagePlatform) return;

    const reason = approved
      ? window.prompt("Optional admin note for approving this escrow document:") || undefined
      : window.prompt("Why is this escrow document being rejected?") || undefined;

    if (!approved && !reason) {
      toast.error("A rejection reason is required.");
      return;
    }

    await runAction(`escrow:${escrow.id}:document:${escrowDocument.id}`, async () => {
      await platformAdminService.reviewEscrowDocument({
        escrowId: escrow.id,
        escrowDocumentId: escrowDocument.id,
        approved,
        reason,
      });
      toast.success(approved ? "Escrow document approved." : "Escrow document rejected.");
    });
  };

  const handleEscrowResolution = async (
    escrow: AdminEscrowRow,
    resolution: "release_to_organization" | "refund_to_payer"
  ) => {
    if (!canManagePlatform) return;

    const note = window.prompt("Add the admin resolution note:");
    if (!note?.trim()) {
      toast.error("A resolution note is required.");
      return;
    }

    await runAction(`escrow:${escrow.id}:${resolution}`, async () => {
      await platformAdminService.resolveEscrowDispute({
        escrowId: escrow.id,
        resolution,
        note: note.trim(),
      });
      toast.success(
        resolution === "release_to_organization"
          ? "Escrow release started through the configured payment gateway."
          : "Escrow refund started through the configured payment gateway."
      );
    });
  };

  const handleReadinessStatus = async (item: LaunchReadinessItem, status: LaunchStatus) => {
    if (!user || !canManagePlatform) return;

    const note =
      status === "blocked" || status === "rejected"
        ? window.prompt("Add a short blocker or rejection note:") || undefined
        : undefined;

    await runAction(`readiness:${item.id}:${status}`, async () => {
      await launchReadinessService.updateReadinessStatus({
        itemId: item.id,
        status,
        reviewedBy: user.id,
        metadata: {
          ...item.metadata,
          admin_note: note,
          updated_from: "admin_launch_readiness",
        },
      });
      toast.success(`Readiness item moved to ${status.replaceAll("_", " ")}.`);
    });
  };

  const handleReadinessEvidence = async (item: LaunchReadinessItem) => {
    if (!user || !canManagePlatform) return;

    const title = window.prompt("Evidence title:");
    if (!title?.trim()) {
      toast.error("Evidence title is required.");
      return;
    }

    const summary = window.prompt("Short evidence summary:") || undefined;
    const externalUrl = window.prompt("Evidence link or dashboard URL (optional):") || undefined;

    await runAction(`readiness:${item.id}:evidence`, async () => {
      await launchReadinessService.submitEvidence({
        readinessItemId: item.id,
        submittedBy: user.id,
        evidenceType: "other",
        title: title.trim(),
        summary,
        externalUrl,
        metadata: {
          workstream: item.workstream,
          submitted_from: "admin_launch_readiness",
        },
      });
      toast.success("Launch readiness evidence attached.");
    });
  };

  const renderStats = () => (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <AdminMetricCard
        label="Active Listings"
        value={overview.totalListings.toLocaleString()}
        helper="Public and workspace inventory under watch."
        icon={FileText}
        tone="blue"
      />
      <AdminMetricCard
        label="Pending Verifications"
        value={organizationMetrics.pendingVerification.toLocaleString()}
        helper="Organizations waiting for trust review."
        icon={UserCheck}
        tone="amber"
      />
      <AdminMetricCard
        label="Daily Transactions"
        value={escrowMetrics.released.toLocaleString()}
        helper="Completed releases currently visible."
        icon={CreditCard}
        tone="green"
      />
      <AdminMetricCard
        label="Open Disputes"
        value={escrowMetrics.disputed.toLocaleString()}
        helper="Cases needing calm resolution."
        icon={AlertTriangle}
        tone={escrowMetrics.disputed ? "red" : "slate"}
      />
      <AdminMetricCard
        label="Revenue"
        value={formatMinorCurrency(organizationMetrics.monthlyRecurringRevenueMinor)}
        helper="Subscription MRR being tracked."
        icon={Wallet}
        tone="green"
      />
      <AdminMetricCard
        label="Active Organizations"
        value={organizationMetrics.activeSubscriptions.toLocaleString()}
        helper="Paid workspaces with access."
        icon={Building2}
        tone="slate"
      />
      <AdminMetricCard
        label="Fraud Alerts"
        value={queueCount.toLocaleString()}
        helper={`${overview.escalatedCases} escalated, ${overview.resolvedToday} resolved today.`}
        icon={ShieldAlert}
        tone={queueCount ? "red" : "slate"}
      />
    </div>
  );

  const renderTriageAlerts = () => (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Needs Triage</h2>
          <p className="text-sm text-muted-foreground">
            Fresh fraud alerts that have not yet been promoted into a review case.
          </p>
        </div>
        <Badge variant={triageAlerts.length ? "destructive" : "outline"}>
          {triageAlerts.length} pending
        </Badge>
      </div>

      <div className="space-y-4">
        {triageAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No untriaged alerts are waiting right now.
          </div>
        ) : (
          triageAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold capitalize">
                      {String(alert.alert_type).replaceAll("_", " ")}
                    </p>
                    <Badge variant={getPriorityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline">{alert.target_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.description || "No additional description attached to this alert."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Flagged {formatTimestamp(alert.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDismissAlert(alert.id)}
                    disabled={workingId === `alert:${alert.id}:dismiss`}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleOpenCase(alert.id)}
                    disabled={workingId === `alert:${alert.id}:open`}
                  >
                    Open Case
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderReviewCases = () => (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Active Review Cases</h2>
          <p className="text-sm text-muted-foreground">
            Investigation workflow with assignee ownership, escalation, and audit trail.
          </p>
        </div>
        <Badge variant={reviewCases.length ? "secondary" : "outline"}>
          {reviewCases.length} active
        </Badge>
      </div>

      <div className="space-y-4">
        {reviewCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No active review cases yet.
          </div>
        ) : (
          reviewCases.map((reviewCase) => {
            const latestEvent = reviewCase.case_events?.[0];
            const isWorking = workingId?.startsWith(`case:${reviewCase.id}:`);

            return (
              <div key={reviewCase.id} className="rounded-xl border border-border p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{reviewCase.summary}</p>
                      <Badge variant={getPriorityVariant(reviewCase.priority)}>
                        {reviewCase.priority}
                      </Badge>
                      <Badge variant={getStatusVariant(reviewCase.status)}>
                        {String(reviewCase.status).replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">Target: {reviewCase.target_type}</span>
                      <span>
                        Assignee: {reviewCase.assigned_user?.full_name || "Unassigned"}
                      </span>
                      <span>Updated: {formatTimestamp(reviewCase.updated_at)}</span>
                    </div>

                    {reviewCase.alert?.description ? (
                      <p className="text-sm text-muted-foreground">
                        {reviewCase.alert.description}
                      </p>
                    ) : null}

                    {latestEvent ? (
                      <div className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                        Latest note: {latestEvent.note || latestEvent.event_type}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-xs">
                    {reviewCase.assigned_to !== user?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleAssignToMe(reviewCase.id)}
                        disabled={workingId === `case:${reviewCase.id}:assign`}
                      >
                        <UserCheck className="w-4 h-4" />
                        Assign to Me
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCaseStatus(reviewCase.id, "investigating")}
                      disabled={isWorking}
                    >
                      Investigate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCaseStatus(reviewCase.id, "escalated")}
                      disabled={isWorking}
                    >
                      Escalate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleCaseStatus(reviewCase.id, "resolved")}
                      disabled={isWorking}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCaseStatus(reviewCase.id, "dismissed")}
                      disabled={isWorking}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );

  const renderOrganizationQueue = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Organizations</p>
          <p className="mt-1 text-2xl font-semibold">{organizationMetrics.totalOrganizations}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="mt-1 text-2xl font-semibold">{organizationMetrics.pendingVerification}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Suspended</p>
          <p className="mt-1 text-2xl font-semibold">{organizationMetrics.suspendedOrganizations}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Active Billing</p>
          <p className="mt-1 text-2xl font-semibold">{organizationMetrics.activeSubscriptions}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">MRR</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMinorCurrency(organizationMetrics.monthlyRecurringRevenueMinor)}
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Organization Verification Queue</h2>
            <p className="text-sm text-muted-foreground">
              Review business details, billing state, and verification/suspension actions.
            </p>
          </div>
          <Badge variant="outline">{organizations.length} records</Badge>
        </div>

        <div className="space-y-4">
          {organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No organizations are available for review.
            </div>
          ) : (
            organizations.map((organization) => {
              const isWorking = workingId?.startsWith(`organization:${organization.id}:`);
              return (
                <div key={organization.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{organization.name}</p>
                        <Badge variant={organization.verified ? "default" : "secondary"}>
                          {organization.verification_status || "unverified"}
                        </Badge>
                        {organization.suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {organization.tier?.name || "No tier"} - {organization.subscription?.status || "no billing"}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>Email: {organization.email || "Not set"}</span>
                        <span>Phone: {organization.phone || "Not set"}</span>
                        <span>License: {organization.license_number || organization.ghana_business_registration_number || "Not provided"}</span>
                        <span>Submitted: {formatTimestamp(organization.verification_submitted_at || organization.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {organization.business_address || "No business address provided yet."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                      <Button
                        size="sm"
                        onClick={() => void handleOrganizationAction(organization, "approve")}
                        disabled={isWorking}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleOrganizationAction(organization, "request_changes")}
                        disabled={isWorking}
                      >
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleOrganizationAction(organization, "reject")}
                        disabled={isWorking}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleOrganizationAction(
                            organization,
                            organization.suspended ? "unsuspend" : "suspend"
                          )
                        }
                        disabled={isWorking}
                      >
                        {organization.suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );

  const renderListingQueue = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Listings in Queue</p>
          <p className="mt-1 text-2xl font-semibold">{listingMetrics.totalListings}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="mt-1 text-2xl font-semibold">{listingMetrics.pendingReview}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Live</p>
          <p className="mt-1 text-2xl font-semibold">{listingMetrics.listed}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Suspended</p>
          <p className="mt-1 text-2xl font-semibold">{listingMetrics.suspended}</p>
        </Card>
      </div>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Listing Moderation Queue</h2>
            <p className="text-sm text-muted-foreground">
              Approve, reject, suspend, or restore listings without giving them a verified badge.
            </p>
          </div>
          <Badge variant="outline">{listingQueue.length} records</Badge>
        </div>

        <div className="space-y-4">
          {listingQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No listings are waiting for moderation.
            </div>
          ) : (
            listingQueue.map((listing) => {
              const isWorking = workingId?.startsWith(`listing:${listing.id}:`);
              const location = [
                listing.property?.address,
                listing.property?.city,
                listing.property?.region,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <div key={listing.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{location || "Untitled listing"}</p>
                        <Badge variant={listing.status === "suspended" ? "destructive" : "secondary"}>
                          {listing.status || "draft"}
                        </Badge>
                        <Badge variant="outline">{listing.visibility || "hidden"}</Badge>
                        <Badge variant="outline">{listing.verification_status || "unverified"}</Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>Agency: {listing.organization?.name || "Unknown"}</span>
                        <span>Type: {listing.listing_type}</span>
                        <span>
                          Price: {formatMinorCurrency(Number(listing.price || 0) * 100, listing.currency || "GHS")}
                        </span>
                        <span>Updated: {formatTimestamp(listing.updated_at || listing.created_at)}</span>
                      </div>
                      {listing.verification_notes ? (
                        <p className="text-sm text-muted-foreground">
                          Note: {listing.verification_notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                      <Button
                        size="sm"
                        onClick={() => void handleListingAction(listing, "approve")}
                        disabled={isWorking}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleListingAction(listing, "reject")}
                        disabled={isWorking}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleListingAction(
                            listing,
                            listing.status === "suspended" ? "unsuspend" : "suspend"
                          )
                        }
                        disabled={isWorking}
                      >
                        {listing.status === "suspended" ? "Unsuspend" : "Suspend"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );

  const renderUserQueue = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Users Loaded</p>
          <p className="mt-1 text-2xl font-semibold">{userMetrics.totalUsers}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Verified</p>
          <p className="mt-1 text-2xl font-semibold">{userMetrics.verifiedUsers}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Suspended</p>
          <p className="mt-1 text-2xl font-semibold">{userMetrics.bannedUsers}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Org Members</p>
          <p className="mt-1 text-2xl font-semibold">{userMetrics.organizationMembers}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="mt-1 text-2xl font-semibold">{userMetrics.platformAdmins}</p>
        </Card>
      </div>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="text-sm text-muted-foreground">
              Review marketplace and workspace accounts, verify profiles, and suspend risky users.
            </p>
          </div>
          <Badge variant="outline">{userQueue.length} recent profiles</Badge>
        </div>

        <div className="space-y-4">
          {userQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No user profiles are available to review.
            </div>
          ) : (
            userQueue.map((profile) => {
              const isWorking = workingId?.startsWith(`user:${profile.id}:`);
              const isSelf = profile.id === user?.id;

              return (
                <div key={profile.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{profile.full_name || profile.email || "Unnamed user"}</p>
                        <Badge variant={profile.verified ? "default" : "outline"}>
                          {profile.verified ? "Verified" : "Unverified"}
                        </Badge>
                        {profile.banned ? <Badge variant="destructive">Suspended</Badge> : null}
                        {profile.isPlatformAdmin ? <Badge variant="secondary">Platform admin</Badge> : null}
                        {isSelf ? <Badge variant="outline">You</Badge> : null}
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>Email: {profile.email || "Not set"}</span>
                        <span>Phone: {profile.phone || "Not set"}</span>
                        <span>Organizations: {profile.organizationCount}</span>
                        <span>Joined: {formatTimestamp(profile.created_at)}</span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Roles: {profile.roles.length ? profile.roles.join(", ") : "Marketplace user only"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUserAction(profile, profile.verified ? "unverify" : "verify")}
                        disabled={isWorking || !canManagePlatform}
                      >
                        {profile.verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUserAction(profile, profile.banned ? "restore" : "suspend")}
                        disabled={isWorking || !canManagePlatform || isSelf}
                      >
                        {profile.banned ? "Restore" : "Suspend"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );

  const renderEscrowQueue = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Escrows</p>
          <p className="mt-1 text-2xl font-semibold">{escrowMetrics.totalEscrows}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Held / Review</p>
          <p className="mt-1 text-2xl font-semibold">{escrowMetrics.held}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Disputed</p>
          <p className="mt-1 text-2xl font-semibold">{escrowMetrics.disputed}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Released</p>
          <p className="mt-1 text-2xl font-semibold">{escrowMetrics.released}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-xs text-muted-foreground">Held Value</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMinorCurrency(escrowMetrics.heldValueMinor)}
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Escrow Control</h2>
            <p className="text-sm text-muted-foreground">
              Review document gates, resolve disputes, and trigger payment gateway release or refund actions.
            </p>
          </div>
          <Badge variant={escrowMetrics.disputed ? "destructive" : "outline"}>
            {escrowMetrics.disputed} disputed
          </Badge>
        </div>

        <div className="space-y-4">
          {escrowQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No escrow records are available yet.
            </div>
          ) : (
            escrowQueue.map((escrow) => {
              const documents = Array.isArray(escrow.documents) ? escrow.documents : [];
              const conditionReports = Array.isArray(escrow.condition_reports)
                ? escrow.condition_reports
                : [];
              const isWorking = workingId?.startsWith(`escrow:${escrow.id}:`);
              const location = [
                escrow.listing?.property?.address,
                escrow.listing?.property?.city,
                escrow.listing?.property?.region,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <div key={escrow.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{location || "Escrow property"}</p>
                        <Badge variant={escrow.status === "disputed" ? "destructive" : "secondary"}>
                          {String(escrow.status).replaceAll("_", " ")}
                        </Badge>
                        <Badge variant="outline">
                          {formatMinorCurrency(Number(escrow.amount_minor || 0), escrow.currency || "GHS")}
                        </Badge>
                        {!escrow.organization?.paystack_transfer_recipient_code ? (
                          <Badge variant="outline">Recipient code missing</Badge>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>Agency: {escrow.organization?.name || "Unknown"}</span>
                        <span>Payer: {escrow.payer?.full_name || escrow.payer?.email || "Customer"}</span>
                        <span>Updated: {formatTimestamp(escrow.updated_at || escrow.created_at)}</span>
                        <span>Cancel window: {formatTimestamp(escrow.cancellation_deadline_at)}</span>
                      </div>

                      {escrow.dispute_reason ? (
                        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                          Dispute: {escrow.dispute_reason}
                        </p>
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Document gate</p>
                        {documents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No escrow documents uploaded yet.</p>
                        ) : (
                          documents.map((document) => (
                            <div
                              key={document.id}
                              className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {String(document.document_type).replaceAll("_", " ")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Hash: {String(document.document_sha256 || "").slice(0, 18)}...
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={document.status === "approved" ? "default" : "outline"}>
                                  {document.status}
                                </Badge>
                                {document.status !== "approved" ? (
                                  <Button
                                    size="sm"
                                    onClick={() => void handleEscrowDocumentAction(escrow, document, true)}
                                    disabled={isWorking || !canManagePlatform}
                                  >
                                    Approve
                                  </Button>
                                ) : null}
                                {document.status !== "rejected" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleEscrowDocumentAction(escrow, document, false)}
                                    disabled={isWorking || !canManagePlatform}
                                  >
                                    Reject
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <EscrowMilestoneTimeline
                        milestones={escrow.milestones || []}
                        title="Trust timeline"
                        description="Support can review which checkpoints are still open before release or refund."
                        compact
                      />

                      {conditionReports.length > 0 ? (
                        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
                          <p className="text-sm font-medium text-foreground">Condition reports</p>
                          {conditionReports.map((report) => (
                            <div key={report.id} className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {String(report.submitted_role || "report").replaceAll("_", " ")}
                              </span>
                              {": "}
                              {report.notes}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                      {escrow.status === "disputed" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void handleEscrowResolution(escrow, "release_to_organization")}
                            disabled={isWorking || !canManagePlatform}
                          >
                            Release to Agency
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleEscrowResolution(escrow, "refund_to_payer")}
                            disabled={isWorking || !canManagePlatform}
                          >
                            Refund Payer
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );

  const renderAdminSettings = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Admin Roster</h2>
            <p className="text-sm text-muted-foreground">
              Access is controlled by `platform_admins`, not editable user metadata.
            </p>
          </div>
          <Badge variant="outline">{adminRoster.length} admins</Badge>
        </div>

        <div className="space-y-4">
          {adminRoster.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No platform admins are visible to this account.
            </div>
          ) : (
            adminRoster.map((admin) => (
              <div key={admin.user_id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {admin.user?.full_name || admin.user?.email || admin.user_id}
                    </p>
                    <p className="text-sm text-muted-foreground">{admin.user?.email || "No email on profile"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Badge variant="secondary">{admin.role}</Badge>
                    <Badge variant={admin.status === "active" ? "default" : "outline"}>
                      {admin.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Billing & Admin Events</h2>
            <p className="text-sm text-muted-foreground">
              Recent organization billing and admin events for Phase 1 operational follow-up.
            </p>
          </div>
          <Badge variant="outline">{billingEvents.length} recent</Badge>
        </div>

        <div className="space-y-4">
          {billingEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No billing events are available yet.
            </div>
          ) : (
            billingEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold capitalize">
                      {String(event.event_type).replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(event.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );

  const renderLaunchReadiness = () => {
    const providerLiveCount = providerReadiness.filter((provider) => canProviderGoLive(provider)).length;
    const orderedWorkstreams = Object.entries(LAUNCH_WORKSTREAM_LABELS);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="p-6 bg-white">
            <p className="text-sm text-muted-foreground">Ready Items</p>
            <p className="mt-2 text-3xl font-semibold">{readinessSummary.percentReady}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {readinessSummary.ready}/{readinessSummary.total} approved or live
            </p>
          </Card>
          <Card className="p-6 bg-white">
            <p className="text-sm text-muted-foreground">Critical Blockers</p>
            <p className="mt-2 text-3xl font-semibold">{readinessSummary.criticalBlocked}</p>
            <p className="mt-1 text-xs text-muted-foreground">Critical items still blocked or not started</p>
          </Card>
          <Card className="p-6 bg-white">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="mt-2 text-3xl font-semibold">{readinessSummary.inProgress}</p>
            <p className="mt-1 text-xs text-muted-foreground">Workstreams moving toward review</p>
          </Card>
          <Card className="p-6 bg-white">
            <p className="text-sm text-muted-foreground">Providers Go-Live Ready</p>
            <p className="mt-2 text-3xl font-semibold">{providerLiveCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{providerReadiness.length} providers tracked</p>
          </Card>
        </div>

        <Card className="p-6 bg-white">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Launch Workstreams</h2>
              <p className="text-sm text-muted-foreground">
                Sensitive features stay gated here until evidence, legal review, provider setup, and operational
                runbooks are approved.
              </p>
            </div>
            <Badge variant={readinessSummary.criticalBlocked ? "destructive" : "default"}>
              {readinessSummary.criticalBlocked ? "Launch blockers remain" : "No critical blockers"}
            </Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {orderedWorkstreams.map(([workstream, label]) => {
              const items = readinessSummary.byWorkstream[workstream as keyof typeof LAUNCH_WORKSTREAM_LABELS] || [];
              const readyCount = items.filter((item) => ["approved", "live"].includes(item.status)).length;

              return (
                <div key={workstream} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {readyCount}/{items.length || 0} items approved or live
                      </p>
                    </div>
                    <Badge variant={readyCount === items.length && items.length > 0 ? "default" : "outline"}>
                      {items.length || 0} tracked
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No readiness items seeded for this workstream yet.
                      </div>
                    ) : (
                      items.slice(0, 3).map((item) => {
                        const isWorking = workingId?.startsWith(`readiness:${item.id}:`);

                        return (
                          <div key={item.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{item.title}</p>
                                  <Badge variant={getPriorityVariant(item.priority)}>
                                    {item.priority}
                                  </Badge>
                                  <Badge variant={getLaunchStatusVariant(item.status)}>
                                    {item.status.replaceAll("_", " ")}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {item.description || "No description attached yet."}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Owner: {item.owner_team || "Unassigned"} · Updated {formatTimestamp(item.updated_at)}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 md:justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleReadinessStatus(item, "in_progress")}
                                  disabled={isWorking || !canManagePlatform}
                                >
                                  Start
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleReadinessStatus(item, "ready_for_review")}
                                  disabled={isWorking || !canManagePlatform}
                                >
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void handleReadinessStatus(item, "approved")}
                                  disabled={isWorking || !canManagePlatform}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleReadinessEvidence(item)}
                                  disabled={isWorking || !canManagePlatform}
                                >
                                  Add Evidence
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleReadinessStatus(item, "blocked")}
                                  disabled={isWorking || !canManagePlatform}
                                >
                                  Block
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">External Provider Readiness</h2>
              <p className="text-sm text-muted-foreground">
                Payment, SMS, identity, registry, hyperlocal, AI, fraud, and IoT providers must prove secrets,
                webhooks, sandbox evidence, and approval before live use.
              </p>
            </div>
            <Badge variant="outline">{providerReadiness.length} providers</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {providerReadiness.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground lg:col-span-2">
                No provider readiness rows are visible yet. Run the launch-readiness migration seed before production activation.
              </div>
            ) : (
              providerReadiness.map((provider) => {
                const canGoLive = canProviderGoLive(provider);

                return (
                  <div key={provider.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{provider.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {provider.provider_category.replaceAll("_", " ")} · {provider.environment}
                        </p>
                      </div>
                      <Badge variant={canGoLive ? "default" : "outline"}>
                        {canGoLive ? "Go-live ready" : provider.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl bg-secondary/30 p-3">
                        Secret: {provider.has_live_secret ? "present" : "missing"}
                      </div>
                      <div className="rounded-xl bg-secondary/30 p-3">
                        Webhook: {provider.webhook_configured ? "configured" : "pending"}
                      </div>
                      <div className="rounded-xl bg-secondary/30 p-3">
                        Sandbox: {provider.sandbox_verified_at ? "verified" : "pending"}
                      </div>
                      <div className="rounded-xl bg-secondary/30 p-3">
                        Fallback: {provider.fallback_provider_key || "none"}
                      </div>
                    </div>

                    {provider.notes ? (
                      <p className="mt-3 text-sm text-muted-foreground">{provider.notes}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderAuditFeed = () => (
    <Card className={`${adminSurfaceClass} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Audit Trail</h2>
          <p className="text-sm text-muted-foreground">
            Recent moderation and admin actions written to the platform log.
          </p>
        </div>
        <Badge variant="outline">{overview.recentAudit.length} recent</Badge>
      </div>

      <div className="space-y-4">
        {overview.recentAudit.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No audit log entries are available yet.
          </div>
        ) : (
          overview.recentAudit.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Clock3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {String(entry.action).replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.target_type} · {formatTimestamp(entry.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderLiveActivityFeed = () => {
    const activityItems = [
      ...organizations.slice(0, 2).map((organization) => ({
        id: `org:${organization.id}`,
        title: organization.name,
        subtitle: "New organization registration",
        time: formatTimestamp(organization.verification_submitted_at || organization.created_at),
        icon: Building2,
      })),
      ...listingQueue.slice(0, 2).map((listing) => ({
        id: `listing:${listing.id}`,
        title:
          [listing.property?.address, listing.property?.city].filter(Boolean).join(", ") ||
          "Listing awaiting moderation",
        subtitle: `${listing.organization?.name || "Agency"} submitted a listing`,
        time: formatTimestamp(listing.updated_at || listing.created_at),
        icon: FileText,
      })),
      ...escrowQueue.slice(0, 2).map((escrow) => ({
        id: `escrow:${escrow.id}`,
        title: `${formatMinorCurrency(Number(escrow.amount_minor || 0), escrow.currency || "GHS")} ${String(
          escrow.status
        ).replaceAll("_", " ")}`,
        subtitle: escrow.organization?.name || "Escrow transaction",
        time: formatTimestamp(escrow.updated_at || escrow.created_at),
        icon: Wallet,
      })),
      ...reviewCases.slice(0, 2).map((reviewCase) => ({
        id: `case:${reviewCase.id}`,
        title: reviewCase.summary || "Review case opened",
        subtitle: `${reviewCase.priority || "normal"} priority trust review`,
        time: formatTimestamp(reviewCase.updated_at || reviewCase.created_at),
        icon: ShieldAlert,
      })),
    ].slice(0, 7);

    return (
      <Card className={`${adminSurfaceClass} p-6`}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Live Activity Feed</h2>
            <p className="text-sm text-slate-500">Today's operational pulse in one calm timeline.</p>
          </div>
          <Badge variant="outline">{activityItems.length} signals</Badge>
        </div>

        <div className="space-y-5">
          {activityItems.length === 0 ? (
            <div className={`${adminSoftSurfaceClass} p-6 text-sm text-slate-500`}>
              No live platform activity is visible yet.
            </div>
          ) : (
            activityItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.id} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    );
  };

  const renderPriorityActions = () => {
    const priorities = [
      {
        title: "Pending KYC",
        count: organizationMetrics.pendingVerification,
        helper: "Organization documents awaiting review.",
        href: "/admin/verification",
      },
      {
        title: "Fraud Alerts",
        count: triageAlerts.length,
        helper: "Signals that need triage before escalation.",
        href: "/admin/security",
      },
      {
        title: "Listings Awaiting Approval",
        count: listingMetrics.pendingReview,
        helper: "Submitted listings needing moderation.",
        href: "/admin/listings",
      },
      {
        title: "Failed Payments",
        count: failedPaymentEvents.length,
        helper: "Billing events that may affect workspaces.",
        href: "/admin/transactions",
      },
      {
        title: "Escalated Reports",
        count: overview.escalatedCases + disputedEscrows.length,
        helper: "Trust items requiring senior judgment.",
        href: "/admin/disputes",
      },
    ];

    return (
      <aside className="space-y-4">
        <Card className={`${adminSurfaceClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Priority Actions
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">Focus queue</h2>
              <p className="mt-1 text-sm text-slate-500">Urgent, but not noisy.</p>
            </div>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Bell className="h-4 w-4" />
              {queueCount || escrowMetrics.disputed ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              ) : null}
            </span>
          </div>

          <div className="mt-5 space-y-2">
            {priorities.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.count > 0 ? "bg-rose-400" : "bg-primary"
                      }`}
                    />
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.count}
                  </span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className={`${adminSurfaceClass} p-5`}>
          <p className="text-sm font-semibold text-slate-950">Admin Session</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {user?.email || "Platform admin"}
              </p>
              <p className="text-xs capitalize text-slate-500">{currentAdmin?.role || "admin"} access</p>
            </div>
          </div>
        </Card>
      </aside>
    );
  };

  const renderOverviewContent = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      {renderLiveActivityFeed()}

      <Card className={`${adminSurfaceClass} p-6`}>
        <h2 className="text-xl font-semibold mb-4">Trust Snapshot</h2>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium">Open moderation workload</p>
              <p className="text-sm text-muted-foreground">
                {overview.openCases} active cases and {overview.pendingAlerts} pending alerts are
                currently in circulation.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <p className="font-medium">Resolved in the last 24 hours</p>
              <p className="text-sm text-muted-foreground">
                {overview.resolvedToday} cases were closed today, giving a clean handoff trail.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 flex items-start gap-3">
            <Clock3 className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Escalation pressure</p>
              <p className="text-sm text-muted-foreground">
                {overview.escalatedCases} cases are escalated and may need policy or legal review.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAnalyticsDashboard = () => {
    const analyticsRows = [
      {
        label: "Marketplace Trends",
        value: overview.totalListings,
        helper: "Inventory tracked across live marketplace surfaces.",
      },
      {
        label: "Revenue Growth",
        value: organizationMetrics.monthlyRecurringRevenueMinor / 100,
        helper: "Subscription revenue baseline for executive review.",
      },
      {
        label: "Listing Performance",
        value: listingMetrics.listed,
        helper: "Listings currently approved or visible.",
      },
      {
        label: "User Activity",
        value: overview.totalUsers,
        helper: "Registered users and workspace operators.",
      },
      {
        label: "Conversion Metrics",
        value: escrowMetrics.released,
        helper: "Released transactions from active escrow flows.",
      },
    ];
    const maxValue = Math.max(...analyticsRows.map((row) => row.value), 1);

    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className={`${adminSurfaceClass} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Executive Intelligence
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Analytics</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            A restrained read on revenue, inventory, trust pressure, and platform usage without dashboard clutter.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Open trust workload</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{overview.openCases}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Refunded transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{escrowMetrics.refunded}</p>
            </div>
          </div>
        </Card>

        <Card className={`${adminSurfaceClass} p-6`}>
          <h2 className="text-xl font-semibold text-slate-950">Performance Signals</h2>
          <div className="mt-6 space-y-5">
            {analyticsRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.label}</p>
                    <p className="text-xs text-slate-500">{row.helper}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {row.label === "Revenue Growth"
                      ? formatMinorCurrency(organizationMetrics.monthlyRecurringRevenueMinor)
                      : row.value.toLocaleString()}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-800 to-slate-400"
                    style={{ width: `${Math.max(8, Math.round((row.value / maxValue) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderVerificationCenter = () => (
    <div className="space-y-6">
      <Card className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Verification
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Trust Review Center</h2>
            <p className="mt-2 text-sm text-slate-500">
              Pending documents, KYC reviews, ownership checks, and manual verification decisions live here.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-semibold text-slate-950">{organizationMetrics.pendingVerification}</p>
              <p className="text-xs text-slate-500">Pending docs</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-semibold text-slate-950">{listingMetrics.pendingReview}</p>
              <p className="text-xs text-slate-500">Listing checks</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-semibold text-slate-950">{userMetrics.verifiedUsers}</p>
              <p className="text-xs text-slate-500">Verified users</p>
            </div>
          </div>
        </div>
      </Card>
      {renderOrganizationQueue()}
      {renderListingQueue()}
    </div>
  );

  const renderDisputesWorkspace = () => (
    <div className="space-y-6">
      <Card className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Dispute Workspace</h2>
            <p className="mt-2 text-sm text-slate-500">
              Case cards stay focused on evidence, severity, and deliberate actions.
            </p>
          </div>
          <Badge variant={disputedEscrows.length ? "destructive" : "outline"}>
            {disputedEscrows.length} open disputes
          </Badge>
        </div>
      </Card>

      {disputedEscrows.length === 0 ? (
        <Card className={`${adminSurfaceClass} p-8 text-sm text-slate-500`}>
          No open escrow disputes are visible. The transaction queue remains available below for audit review.
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {disputedEscrows.map((escrow) => {
            const evidenceCount =
              (Array.isArray(escrow.documents) ? escrow.documents.length : 0) +
              (Array.isArray(escrow.condition_reports) ? escrow.condition_reports.length : 0);
            const location = [
              escrow.listing?.property?.address,
              escrow.listing?.property?.city,
              escrow.listing?.property?.region,
            ]
              .filter(Boolean)
              .join(", ");
            const isWorking = workingId?.startsWith(`escrow:${escrow.id}:`);

            return (
              <Card key={escrow.id} className={`${adminSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                      Escalated
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      {location || "Escrow dispute"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {escrow.dispute_reason || "No dispute reason attached yet."}
                    </p>
                  </div>
                  <Badge variant="outline">{evidenceCount} evidence</Badge>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-slate-500 sm:grid-cols-2">
                  <span>Agency: {escrow.organization?.name || "Unknown"}</span>
                  <span>Payer: {escrow.payer?.full_name || escrow.payer?.email || "Customer"}</span>
                  <span>{formatMinorCurrency(Number(escrow.amount_minor || 0), escrow.currency || "GHS")}</span>
                  <span>{formatTimestamp(escrow.disputed_at || escrow.updated_at)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleEscrowResolution(escrow, "release_to_organization")}
                    disabled={isWorking || !canManagePlatform}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleEscrowResolution(escrow, "refund_to_payer")}
                    disabled={isWorking || !canManagePlatform}
                  >
                    Refund
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Request Evidence
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {renderEscrowQueue()}
    </div>
  );

  const renderSecurityCenter = () => (
    <div className="space-y-6">
      <Card className={`${adminSurfaceClass} p-6`}>
        <h2 className="text-2xl font-semibold text-slate-950">Security</h2>
        <p className="mt-2 text-sm text-slate-500">
          Audit logs, suspicious accounts, fraud signals, login activity, and enforcement actions stay review-first.
        </p>
      </Card>
      {renderTriageAlerts()}
      {renderReviewCases()}
      {renderAuditFeed()}
    </div>
  );

  const renderSectionContent = () => {
    if (loading) {
      return (
        <PageLoadingState label="Loading the admin console..." />
      );
    }

    if (currentSection === "overview") {
      return renderOverviewContent();
    }

    if (currentSection === "organizations") {
      return renderOrganizationQueue();
    }

    if (currentSection === "listings") {
      return renderListingQueue();
    }

    if (currentSection === "transactions") {
      return renderEscrowQueue();
    }

    if (currentSection === "verification") {
      return renderVerificationCenter();
    }

    if (currentSection === "disputes") {
      return renderDisputesWorkspace();
    }

    if (currentSection === "analytics") {
      return renderAnalyticsDashboard();
    }

    if (currentSection === "security") {
      return renderSecurityCenter();
    }

    if (currentSection === "users") {
      return renderUserQueue();
    }

    if (currentSection === "settings") {
      return (
        <div className="space-y-6">
          {renderAdminSettings()}
          {renderLaunchReadiness()}
        </div>
      );
    }

    return renderOverviewContent();
  };

  const isLegacyEscrowPath = location.pathname.startsWith("/admin/escrow");
  const isLaunchReadinessPath = location.pathname.startsWith("/admin/launch");

  const sectionTitle =
    isLegacyEscrowPath
      ? "Escrow Control"
      : isLaunchReadinessPath
        ? "Launch Readiness"
    : currentSection === "overview"
      ? "Platform Overview"
      : currentSection === "transactions"
        ? "Transactions"
        : currentSection === "verification"
          ? "Verification"
        : currentSection === "disputes"
          ? "Disputes"
        : currentSection === "analytics"
          ? "Analytics"
        : currentSection === "security"
          ? "Security"
        : `${currentSection.charAt(0).toUpperCase()}${currentSection.slice(1)}`;

  const sectionDescription =
    isLegacyEscrowPath
      ? "Review document gates, resolve disputes, and trigger provider release or refund actions."
      : isLaunchReadinessPath
        ? "Track production readiness, legal gates, provider activation, and launch evidence in one calm control plane."
    : currentSection === "security"
      ? "Triage fraud alerts, suspicious behavior, audit logs, and enforcement actions."
      : currentSection === "transactions"
        ? "Review payments, escrow document gates, releases, refunds, and provider handoffs."
      : currentSection === "users"
        ? "Manage account verification, suspension, and platform admin visibility."
        : currentSection === "verification"
          ? "Review organization documents, listing checks, and ownership verification signals."
        : currentSection === "disputes"
          ? "Resolve escalated cases with evidence, receipts, and deliberate admin actions."
        : currentSection === "analytics"
          ? "Read marketplace, revenue, listing, user, and conversion trends at executive speed."
        : currentSection === "settings"
          ? "Organize platform settings, launch readiness, payments, verification, security, and feature gates."
      : "Monitor operational health, trust signals, and moderation volume across BaytMiftah.";

  return (
    !loading && !currentAdmin ? (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-muted-foreground">
            This console is protected by the platform admin roster. Ask an active admin to add
            your user to `platform_admins`.
          </p>
          <Link to="/">
            <Button className="mt-6">Back to Site</Button>
          </Link>
        </Card>
      </div>
    ) : (
      <div className="min-h-screen bg-[#fff7fa] text-foreground">
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-white/75 px-5 py-6 backdrop-blur-2xl lg:block">
            <Link to="/" className="flex items-center gap-3 px-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">BaytMiftah</p>
                <p className="text-xs text-slate-500">Admin command center</p>
              </div>
            </Link>

            <div className="my-6 h-px bg-slate-200/80" />

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  currentSection === item.key ||
                  (item.key === "overview" && location.pathname === "/admin");
                const Icon = item.icon;
                const itemCount =
                  item.key === "verification"
                    ? organizationMetrics.pendingVerification
                    : item.key === "disputes"
                      ? escrowMetrics.disputed
                      : item.key === "security"
                        ? queueCount
                        : 0;

                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(255,56,92,0.18)]"
                        : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                    {itemCount > 0 ? (
                      <span
                        className={`ml-auto h-2 w-2 rounded-full ${
                          isActive ? "bg-white" : "bg-rose-500"
                        }`}
                        aria-label={`${itemCount} pending`}
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
            <header className="sticky top-0 z-20 border-b border-primary/10 bg-white/85 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Admin</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-slate-800">{sectionTitle}</span>
                  </div>
                </div>

                <div className="flex flex-1 items-center gap-3 xl:max-w-2xl">
                  <label className="relative hidden min-w-0 flex-1 md:block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Search users, listings, transactions, organizations"
                      className="h-11 w-full rounded-full border border-slate-200 bg-white/80 pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/60"
                    />
                  </label>
                  <button
                    type="button"
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {queueCount || escrowMetrics.disputed ? (
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Quick actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </header>

            <div className="grid min-w-0 flex-1 gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:pb-6">
              <main className="min-w-0">
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Operational View
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                    {sectionTitle}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                    {sectionDescription}
                  </p>
                </div>

                {renderStats()}
                {renderSectionContent()}
              </main>

              <div className="hidden lg:block">{renderPriorityActions()}</div>
            </div>
          </div>
        </div>

        <nav
          className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-5 rounded-[2rem] border border-slate-200/80 bg-white/88 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl lg:hidden"
          aria-label="Mobile admin navigation"
        >
          {[
            { label: "Overview", href: "/admin", icon: BarChart3, active: currentSection === "overview" },
            { label: "Listings", href: "/admin/listings", icon: FileText, active: currentSection === "listings" },
            { label: "Verify", href: "/admin/verification", icon: UserCheck, active: currentSection === "verification" },
            { label: "Activity", href: "/admin/security", icon: ShieldAlert, active: currentSection === "security" || currentSection === "disputes" },
            { label: "More", href: "/admin/settings", icon: MoreHorizontal, active: currentSection === "settings" || currentSection === "analytics" || currentSection === "transactions" },
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
      </div>
    )
  );
}
