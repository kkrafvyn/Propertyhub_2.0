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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { fraudDetectionService } from "../../../lib/fraud-detection.service";

type AdminSection =
  | "overview"
  | "users"
  | "organizations"
  | "listings"
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

  const queueCount = triageAlerts.length + reviewCases.length;

  const loadAdminState = async () => {
    try {
      setLoading(true);
      const [nextOverview, nextReviewCases, nextTriageAlerts] = await Promise.all([
        fraudDetectionService.getModerationOverview(),
        fraudDetectionService.getReviewCases("active", 12),
        fraudDetectionService.getPendingAlertsWithoutCase(8),
      ]);

      setOverview(nextOverview);
      setReviewCases(nextReviewCases);
      setTriageAlerts(nextTriageAlerts);
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

    return (
      <div className="space-y-6">
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-semibold mb-2">Admin Surface In Progress</h2>
          <p className="text-muted-foreground">
            This section now shares the live moderation and audit data layer. The next step is
            deeper record management for {currentSection}.
          </p>
        </Card>
        {renderOverviewContent()}
      </div>
    );
  };

  const sectionTitle =
    currentSection === "overview"
      ? "Platform Overview"
      : currentSection === "moderation"
        ? "Moderation & Trust"
        : `${currentSection.charAt(0).toUpperCase()}${currentSection.slice(1)}`;

  const sectionDescription =
    currentSection === "moderation"
      ? "Triage fraud alerts, assign investigators, escalate cases, and keep a clean audit trail."
      : "Monitor operational health, trust signals, and moderation volume across BaytMiftah.";

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-gradient-to-r from-primary to-accent text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-semibold block">Admin Console</span>
                  <span className="text-xs text-white/80">BaytMiftah REOS</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
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

      <div className="flex">
        <aside className="w-64 border-r border-border bg-white min-h-[calc(100vh-73px)] p-6">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive =
                currentSection === item.key ||
                (item.key === "overview" && location.pathname === "/admin");
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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

        <main className="flex-1 p-8 bg-secondary/30">
          <div className="max-w-7xl">
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
  );
}
