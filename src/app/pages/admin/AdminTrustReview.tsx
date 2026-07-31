import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, UserCheck } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { kycService } from "../../../lib/kyc.service";
import {
  trustVerificationService,
  type TrustRequestStatus,
} from "../../../lib/trust-verification.service";

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function recommendationBadgeClass(recommendation?: string | null) {
  if (recommendation === "approve") return "border-green-300 text-green-700";
  if (recommendation === "reject") return "border-red-300 text-red-700";
  return "border-amber-300 text-amber-700";
}

export function AdminTrustReview() {
  const [loading, setLoading] = useState(true);
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [trustQueue, setTrustQueue] = useState<any[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadQueues = async () => {
    try {
      setLoading(true);
      const [kycRows, trustRows] = await Promise.all([
        kycService.listPendingSubmissions(30),
        trustVerificationService.listPendingTrustRequests(30),
      ]);
      setKycQueue(kycRows);
      setTrustQueue(trustRows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load trust review queues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueues();
  }, []);

  const rescreenKyc = async (submissionId: string) => {
    try {
      setWorkingId(`kyc:${submissionId}:screen`);
      await kycService.requestAiScreening(submissionId);
      toast.success("AI pre-screening completed.");
      await loadQueues();
    } catch (error) {
      console.error(error);
      toast.error("Unable to run AI pre-screening.");
    } finally {
      setWorkingId(null);
    }
  };

  const reviewKyc = async (submissionId: string, status: "verified" | "rejected") => {
    const notes =
      status === "rejected"
        ? window.prompt("Rejection reason (optional):") || undefined
        : undefined;

    try {
      setWorkingId(`kyc:${submissionId}:${status}`);
      await kycService.reviewSubmission(submissionId, status, notes);
      toast.success(`KYC ${status}.`);
      await loadQueues();
    } catch (error) {
      console.error(error);
      toast.error("Unable to review KYC submission.");
    } finally {
      setWorkingId(null);
    }
  };

  const reviewTrust = async (requestId: string, status: TrustRequestStatus) => {
    const notes = window.prompt("Reviewer notes (optional):") || undefined;

    try {
      setWorkingId(`trust:${requestId}:${status}`);
      await trustVerificationService.reviewTrustRequest(requestId, status, notes);
      toast.success(`Trust request marked ${status.replace(/_/g, " ")}.`);
      await loadQueues();
    } catch (error) {
      console.error(error);
      toast.error("Unable to review trust request.");
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading trust queues...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Trust & KYC Review</h2>
        <p className="text-sm text-muted-foreground">
          Approve identity verification and agency trust requests.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">KYC submissions</h3>
          <Badge variant="outline">{kycQueue.length} pending</Badge>
        </div>
        {kycQueue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending KYC submissions.</p>
        ) : (
          kycQueue.map((submission) => (
            <div key={submission.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium">
                    {submission.full_name || submission.user?.full_name || "Applicant"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {submission.user?.email} · {formatLabel(submission.document_type)}
                    {submission.document_number ? ` · ${submission.document_number}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {submission.status}
                </Badge>
              </div>
              {submission.storage_path ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const url = await kycService.getDocumentPublicUrl(submission.storage_path);
                    if (url) window.open(url, "_blank", "noreferrer");
                  }}
                >
                  View document
                </Button>
              ) : null}
              {(submission.ai_screening_status || submission.ai_recommendation || submission.ai_summary) ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">AI pre-screen</p>
                    {submission.ai_recommendation ? (
                      <Badge
                        variant="outline"
                        className={`capitalize ${recommendationBadgeClass(submission.ai_recommendation)}`}
                      >
                        {submission.ai_recommendation}
                      </Badge>
                    ) : null}
                    {typeof submission.ai_confidence_score === "number" ? (
                      <Badge variant="secondary">{submission.ai_confidence_score}% confidence</Badge>
                    ) : null}
                    {submission.ai_screening_status ? (
                      <Badge variant="outline" className="capitalize">
                        {formatLabel(submission.ai_screening_status)}
                      </Badge>
                    ) : null}
                    {submission.ai_source ? (
                      <Badge variant="outline" className="capitalize">
                        {submission.ai_source}
                      </Badge>
                    ) : null}
                  </div>
                  {submission.ai_summary ? (
                    <p className="text-sm text-muted-foreground">{submission.ai_summary}</p>
                  ) : null}
                  {Array.isArray(submission.ai_flags) && submission.ai_flags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {submission.ai_flags.map((flag: string) => (
                        <Badge key={flag} variant="outline" className="text-xs capitalize">
                          {formatLabel(flag)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {submission.ai_extracted_data &&
                  typeof submission.ai_extracted_data === "object" &&
                  Object.keys(submission.ai_extracted_data).length > 0 ? (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Extracted fields</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-2 border border-border overflow-x-auto">
                        {JSON.stringify(submission.ai_extracted_data, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    AI output is advisory only — you must still verify the document manually.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI pre-screen yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workingId === `kyc:${submission.id}:screen`}
                  onClick={() => void rescreenKyc(submission.id)}
                >
                  {workingId === `kyc:${submission.id}:screen` ? "Screening…" : "Run AI pre-screen"}
                </Button>
                <Button
                  size="sm"
                  disabled={workingId === `kyc:${submission.id}:verified`}
                  onClick={() => void reviewKyc(submission.id, "verified")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workingId === `kyc:${submission.id}:rejected`}
                  onClick={() => void reviewKyc(submission.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Agency trust requests</h3>
          <Badge variant="outline">{trustQueue.length} pending</Badge>
        </div>
        {trustQueue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending trust requests.</p>
        ) : (
          trustQueue.map((request) => (
            <div key={request.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium">{formatLabel(request.request_type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.organization?.name || "Organization"}
                    {request.listing?.property?.address
                      ? ` · ${request.listing.property.address}`
                      : ""}
                  </p>
                  {request.public_summary ? (
                    <p className="text-sm text-muted-foreground mt-1">{request.public_summary}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="capitalize">
                  {request.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={workingId === `trust:${request.id}:verified`}
                  onClick={() => void reviewTrust(request.id, "verified")}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workingId === `trust:${request.id}:needs_changes`}
                  onClick={() => void reviewTrust(request.id, "needs_changes")}
                >
                  Needs changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workingId === `trust:${request.id}:rejected`}
                  onClick={() => void reviewTrust(request.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
