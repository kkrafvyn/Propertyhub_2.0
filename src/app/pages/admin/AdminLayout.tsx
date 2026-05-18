import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Settings,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { fraudDetectionService } from "../../../lib/fraud-detection.service";
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
  | "escrow"
  | "moderation"
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
  { key: "escrow", label: "Escrow", href: "/admin/escrow", icon: Wallet },
  { key: "moderation", label: "Moderation", href: "/admin/moderation", icon: AlertTriangle },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
];

function getCurrentSection(pathname: string): AdminSection {
  const section = pathname.split("/")[2] as AdminSection | undefined;
  return section || "overview";
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

function formatTimestamp(value?: string | null) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString();
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

  const queueCount = triageAlerts.length + reviewCases.length;
  const canManagePlatform = currentAdmin?.role === "admin" || currentAdmin?.role === "support";

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
      ] = await Promise.all([
        fraudDetectionService.getModerationOverview(),
        fraudDetectionService.getReviewCases("active", 12),
        fraudDetectionService.getPendingAlertsWithoutCase(8),
        platformAdminService.getOrganizationQueue(),
        platformAdminService.getListingQueue(),
        platformAdminService.getUserQueue(),
        platformAdminService.getAdminSettings(),
        platformAdminService.getEscrowQueue(),
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
          ? "Escrow release started through Paystack transfer."
          : "Escrow refund started through Paystack."
      );
    });
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Users</p>
            <p className="text-3xl font-semibold">{overview.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Live user profile count</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Organizations</p>
            <p className="text-3xl font-semibold">
              {overview.totalOrganizations.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Workspace teams on the platform</p>
          </div>
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-accent" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Active Listings</p>
            <p className="text-3xl font-semibold">{overview.totalListings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Inventory currently tracked</p>
          </div>
          <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-chart-3" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Moderation Queue</p>
            <p className="text-3xl font-semibold">{queueCount.toLocaleString()}</p>
            <p className="text-xs text-destructive mt-1">
              {overview.escalatedCases} escalated, {overview.resolvedToday} resolved today
            </p>
          </div>
          <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
        </div>
      </Card>
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
            <h2 className="text-xl font-semibold">Paystack Escrow Control</h2>
            <p className="text-sm text-muted-foreground">
              Review document gates, resolve disputes, and trigger Paystack release or refund actions.
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

  const renderAuditFeed = () => (
    <Card className="p-6 bg-white">
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

  const renderOverviewContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Trust Snapshot</h2>
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary/30 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium">Open moderation workload</p>
              <p className="text-sm text-muted-foreground">
                {overview.openCases} active cases and {overview.pendingAlerts} pending alerts are
                currently in circulation.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/30 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <p className="font-medium">Resolved in the last 24 hours</p>
              <p className="text-sm text-muted-foreground">
                {overview.resolvedToday} cases were closed today, giving a clean handoff trail.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/30 p-4 flex items-start gap-3">
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

      {renderAuditFeed()}
    </div>
  );

  const renderSectionContent = () => {
    if (loading) {
      return (
        <Card className="p-10 bg-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading the admin console...</p>
        </Card>
      );
    }

    if (currentSection === "moderation") {
      return (
        <div className="space-y-6">
          {renderTriageAlerts()}
          {renderReviewCases()}
          {renderAuditFeed()}
        </div>
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

    if (currentSection === "escrow") {
      return renderEscrowQueue();
    }

    if (currentSection === "users") {
      return renderUserQueue();
    }

    if (currentSection === "settings") {
      return renderAdminSettings();
    }

    return renderOverviewContent();
  };

  const sectionTitle =
    currentSection === "overview"
      ? "Platform Overview"
      : currentSection === "moderation"
        ? "Moderation & Trust"
        : currentSection === "escrow"
          ? "Escrow Control"
        : `${currentSection.charAt(0).toUpperCase()}${currentSection.slice(1)}`;

  const sectionDescription =
    currentSection === "moderation"
      ? "Triage fraud alerts, assign investigators, escalate cases, and keep a clean audit trail."
      : currentSection === "escrow"
        ? "Resolve Paystack escrow document gates, disputes, releases, and refunds."
      : currentSection === "users"
        ? "Manage account verification, suspension, and platform admin visibility."
        : currentSection === "settings"
          ? "Review admin access controls and recent billing/admin events."
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
    <div className="min-h-screen bg-background">
      <nav className="bg-gradient-to-r from-primary to-accent text-white">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link to="/" className="flex min-w-0 items-center gap-2">
                <div className="w-10 h-10 flex-shrink-0 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-xl font-semibold">Admin Console</span>
                  <span className="text-xs text-white/80">BaytMiftah REOS</span>
                </div>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20">
                {queueCount} in queue
              </Badge>
              <Link to="/">
                <Button variant="secondary" size="sm">
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-white p-4 lg:w-64 lg:border-b-0 lg:border-r lg:min-h-[calc(100vh-73px)] lg:p-6">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const isActive =
                currentSection === item.key ||
                (item.key === "overview" && location.pathname === "/admin");
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`flex flex-shrink-0 items-center gap-3 rounded-lg px-4 py-3 transition-colors lg:shrink ${
                    isActive ? "bg-primary text-white" : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.key === "moderation" ? (
                    <span
                      className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-destructive text-white"
                      }`}
                    >
                      {queueCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 bg-secondary/30 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl min-w-0">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold mb-2">{sectionTitle}</h1>
              <p className="text-muted-foreground">{sectionDescription}</p>
            </div>

            {renderStats()}
            {renderSectionContent()}
          </div>
        </main>
      </div>
    </div>
    )
  );
}
