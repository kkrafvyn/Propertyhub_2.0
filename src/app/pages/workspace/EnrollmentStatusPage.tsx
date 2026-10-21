import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  enrollmentService,
  type OrganizationEnrollmentRequest,
} from "../../../lib/enrollment.service";
import { getWorkspaceRoute, WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { BusinessMobileShell } from "../../shells/BusinessMobileShell";
import { shouldUseBusinessMobileShell } from "../../lib/business-mobile-nav";

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusVariant(status: OrganizationEnrollmentRequest["status"]) {
  switch (status) {
    case "approved":
      return "default" as const;
    case "rejected":
      return "destructive" as const;
    case "pending":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function statusIcon(status: OrganizationEnrollmentRequest["status"]) {
  switch (status) {
    case "approved":
      return CheckCircle2;
    case "rejected":
      return XCircle;
    case "pending":
      return Clock3;
    default:
      return Building2;
  }
}

export function EnrollmentStatusPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<OrganizationEnrollmentRequest[]>([]);

  const loadRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rows = await enrollmentService.getMyRequests(user.id);
      setRequests(rows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load your enrollment applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [user?.id]);

  const latestApproved = useMemo(
    () => requests.find((entry) => entry.status === "approved"),
    [requests],
  );

  const useBusinessShell = shouldUseBusinessMobileShell();

  const content = (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Company enrollment</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Application status</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Track BaytMiftah workspace applications for your company. Approved applications become
          live workspaces automatically.
        </p>
      </div>

      {loading ? (
        <Card className="flex min-h-[240px] items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">No applications yet</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Submit a company profile to request workspace access on BaytMiftah.
          </p>
          <Link to={WORKSPACE_ENTRY_PATH} className="mt-6 inline-block">
            <Button>Apply for a workspace</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {latestApproved ? (
            <Card className="app-surface-card border-primary/25 bg-primary/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">Workspace ready</p>
                  <p className="text-sm text-ink-secondary">
                    {latestApproved.company_name} was approved. Open your workspace to continue
                    setup.
                  </p>
                </div>
                <Link to={getWorkspaceRoute(latestApproved.desired_slug)}>
                  <Button>Open workspace</Button>
                </Link>
              </div>
            </Card>
          ) : null}

          {requests.map((request) => {
            const Icon = statusIcon(request.status);
            return (
              <Card key={request.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-subtle">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{request.company_name}</h2>
                      <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-ink-muted">/{request.desired_slug}</p>
                    <p className="mt-3 text-sm text-ink-secondary">
                      {request.description || "No company description provided."}
                    </p>
                    <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-ink-muted">Submitted</dt>
                        <dd className="font-medium">{formatTimestamp(request.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-muted">Contact email</dt>
                        <dd className="font-medium">{request.contact_email || "—"}</dd>
                      </div>
                      {request.reviewed_at ? (
                        <div>
                          <dt className="text-ink-muted">Reviewed</dt>
                          <dd className="font-medium">{formatTimestamp(request.reviewed_at)}</dd>
                        </div>
                      ) : null}
                      {request.review_notes ? (
                        <div className="sm:col-span-2">
                          <dt className="text-ink-muted">Review note</dt>
                          <dd className="font-medium">{request.review_notes}</dd>
                        </div>
                      ) : null}
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void enrollmentService.withdrawRequest(request.id).then(async () => {
                              toast.success("Application withdrawn.");
                              await loadRequests();
                            })
                          }
                        >
                          Withdraw application
                        </Button>
                      ) : null}
                      {request.status === "approved" ? (
                        <Link to={getWorkspaceRoute(request.desired_slug)}>
                          <Button size="sm">Open workspace</Button>
                        </Link>
                      ) : null}
                      {request.status === "rejected" ? (
                        <Link to={WORKSPACE_ENTRY_PATH}>
                          <Button size="sm" variant="outline">
                            Submit revised application
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <Mail className="h-4 w-4" />
          We email you when your application status changes.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadRequests()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link to={WORKSPACE_ENTRY_PATH}>
            <Button variant="ghost" size="sm">
              Back to workspace entry
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent("/enrollment")}`} replace />;
  }

  if (useBusinessShell) {
    return (
      <BusinessMobileShell showNav={false} jobRole="property_manager">
        {content}
      </BusinessMobileShell>
    );
  }

  return (
    <DesktopShell minimal showFooter={false}>
      {content}
    </DesktopShell>
  );
}
