import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock3, Loader2, Shield, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  enrollmentService,
  type OrganizationEnrollmentRequest,
} from "../../../lib/enrollment.service";
import { kycService } from "../../../lib/kyc.service";
import { adminService } from "../../../lib/admin.service";
import { describeKycEngine } from "../../../lib/kyc-gate.service";
import { isKycVerified, isKycPending } from "../../lib/baytmiftah/kyc";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { getWorkspaceRoute } from "../../../lib/workspace";
import { Link } from "react-router";

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

interface AdminEnrollmentRequestsProps {
  onApproved?: () => void;
}

export function AdminEnrollmentRequests({ onApproved }: AdminEnrollmentRequestsProps) {
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [pending, setPending] = useState<OrganizationEnrollmentRequest[]>([]);
  const [recent, setRecent] = useState<OrganizationEnrollmentRequest[]>([]);
  const [kycByUser, setKycByUser] = useState<Record<string, Awaited<ReturnType<typeof kycService.getLatestSubmission>>>>({});

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [pendingRows, allRows] = await Promise.all([
        enrollmentService.listRequests("pending", 50),
        enrollmentService.listRequests(undefined, 20),
      ]);
      setPending(pendingRows);
      setRecent(allRows.filter((row) => row.status !== "pending").slice(0, 10));

      const userIds = [...new Set(pendingRows.map((row) => row.requester_user_id))];
      const kycEntries = await Promise.all(
        userIds.map(async (userId) => {
          const submission = await kycService.getLatestSubmission(userId).catch(() => null);
          return [userId, submission] as const;
        }),
      );
      setKycByUser(Object.fromEntries(kycEntries));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load enrollment requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleApprove = async (request: OrganizationEnrollmentRequest) => {
    const notes = window.prompt("Optional approval note for the applicant:");
    if (notes === null) return;

    try {
      setWorkingId(request.id);
      const orgId = await enrollmentService.approveRequest(request.id, notes || undefined);
      toast.success(`${request.company_name} approved. Workspace is live.`);
      await loadRequests();
      onApproved?.();
      void orgId;
    } catch (error: unknown) {
      console.error(error);
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to approve this enrollment request.";
      toast.error(message);
    } finally {
      setWorkingId(null);
    }
  };

  const handleVerifyApplicant = async (request: OrganizationEnrollmentRequest) => {
    if (
      !window.confirm(
        `Mark ${request.requester?.full_name || request.requester?.email || "this applicant"} as identity-verified? This unlocks workspace approval.`,
      )
    ) {
      return;
    }

    try {
      setWorkingId(`verify:${request.requester_user_id}`);
      await adminService.updateUser(request.requester_user_id, { verified: true });
      toast.success("Applicant marked as verified. You can now approve the workspace.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to verify this applicant.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleReject = async (request: OrganizationEnrollmentRequest) => {
    const notes = window.prompt("Reason for rejection (shared internally):");
    if (notes === null) return;

    try {
      setWorkingId(request.id);
      await enrollmentService.rejectRequest(request.id, notes || undefined);
      toast.success("Enrollment request rejected.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to reject this enrollment request.");
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 flex min-h-[160px] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Workspace enrollment requests</h2>
            <p className="text-sm text-muted-foreground">
              Personal owners and organizations must complete KYC before approval.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {pending.length} pending
          </Badge>
        </div>

        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No pending enrollment requests.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((request) => {
              const submission = kycByUser[request.requester_user_id];
              const kycSnapshot = submission
                ? { status: submission.status, submission }
                : null;
              const kycVerified = isKycVerified(kycSnapshot);
              const kycPending = isKycPending(kycSnapshot);
              const identityVerified = kycVerified || Boolean(request.requester?.verified);
              const engine = describeKycEngine(kycSnapshot, request.operating_jurisdiction);

              return (
              <div key={request.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {request.workspace_kind === "personal" ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <Building2 className="h-4 w-4 text-primary" />
                      )}
                      <p className="font-semibold">{request.company_name}</p>
                      <Badge variant="warning">Pending review</Badge>
                      <Badge variant="outline">
                        {request.workspace_kind === "personal" ? "Personal" : "Organization"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">/{request.desired_slug}</p>
                    <p className="mt-2 text-sm">
                      {request.description || "No description provided."}
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-foreground">Applicant</dt>
                        <dd>
                          {request.requester?.full_name || request.requester?.email || "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Operating country</dt>
                        <dd>{request.operating_jurisdiction || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">KYC status</dt>
                        <dd>
                          {identityVerified
                            ? "Verified"
                            : kycPending
                              ? "Under review"
                              : "Not submitted"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">KYC engine</dt>
                        <dd>{engine}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Contact</dt>
                        <dd>{request.contact_email || request.requester?.email || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Phone</dt>
                        <dd>{request.contact_phone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Submitted</dt>
                        <dd>{formatTimestamp(request.created_at)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!identityVerified ? (
                      <p className="max-w-xs text-xs text-amber-700 dark:text-amber-300">
                        Verify the applicant&apos;s identity before creating their workspace.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                    {!identityVerified ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === `verify:${request.requester_user_id}`}
                          onClick={() => void handleVerifyApplicant(request)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Verify identity
                        </Button>
                        <Link to="/admin/trust">
                          <Button size="sm" variant="outline">
                            Open Trust review
                          </Button>
                        </Link>
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={workingId === request.id || !identityVerified}
                      title={
                        identityVerified
                          ? undefined
                          : "Verify the applicant's identity first"
                      }
                      onClick={() => void handleApprove(request)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve & create workspace
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={workingId === request.id}
                      onClick={() => void handleReject(request)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </Card>

      {recent.length > 0 ? (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Recently reviewed</h3>
          <div className="space-y-2">
            {recent.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{request.company_name}</span>
                  <span className="text-muted-foreground"> · {formatTimestamp(request.reviewed_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      request.status === "approved"
                        ? "default"
                        : request.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {request.status}
                  </Badge>
                  {request.status === "approved" && request.desired_slug ? (
                    <Link
                      to={getWorkspaceRoute(request.desired_slug)}
                      className="text-xs text-primary hover:underline"
                    >
                      Open workspace
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
