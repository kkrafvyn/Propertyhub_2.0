import { useEffect, useState } from "react";
import { FileCheck2, Loader2, ShieldCheck, Stamp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/textarea";
import type { Database } from "../../../lib/database.types";
import {
  trustVerificationService,
  type TrustRequestType,
} from "../../../lib/trust-verification.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

const REQUEST_TYPES: Array<{ value: TrustRequestType; label: string; helper: string }> = [
  {
    value: "business_registration",
    label: "Business registration",
    helper: "Registrar General, agency mandate, or business ownership evidence.",
  },
  {
    value: "ghana_card",
    label: "Ghana Card / agent identity",
    helper: "Identity pack for the responsible agent or owner.",
  },
  {
    value: "property_title",
    label: "Property title / owner authority",
    helper: "Title search, indenture, lease authority, mandate, or owner authorization.",
  },
  {
    value: "address_verification",
    label: "GhanaPostGPS address check",
    helper: "Evidence that the listed location matches the public address.",
  },
  {
    value: "listing_review",
    label: "Listing quality review",
    helper: "Manual review before heavy promotion or paid placement.",
  },
];

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "verified" || status === "passed") return "default";
  if (status === "rejected" || status === "failed") return "destructive";
  if (status === "needs_changes" || status === "warning") return "outline";
  return "secondary";
}

export function GhanaTrustCenter({
  organization,
  currentUserId,
}: {
  organization: Organization;
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [requestType, setRequestType] = useState<TrustRequestType>("business_registration");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSnapshot = async () => {
    try {
      setLoading(true);
      const nextSnapshot = await trustVerificationService.getOrganizationTrustSnapshot(
        organization.id
      );
      setSnapshot(nextSnapshot);
    } catch (error) {
      console.error("Failed to load trust center:", error);
      toast.error("Unable to load trust verification data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, [organization.id]);

  const submitRequest = async () => {
    try {
      setSubmitting(true);
      await trustVerificationService.submitTrustRequest({
        organizationId: organization.id,
        requestType,
        submittedBy: currentUserId,
        internalNotes: notes || null,
        publicSummary: REQUEST_TYPES.find((item) => item.value === requestType)?.helper,
        evidence: {
          market: "Ghana",
          source: "workspace_trust_center",
        },
      });
      setNotes("");
      toast.success("Trust request submitted.");
      await loadSnapshot();
    } catch (error) {
      console.error("Failed to submit trust request:", error);
      toast.error("We couldn't submit that trust request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading Ghana trust center...
      </Card>
    );
  }

  const requests = snapshot?.requests || [];
  const checks = snapshot?.checks || [];
  const documents = snapshot?.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Ghana Trust Center</h1>
          <p className="mt-2 text-muted-foreground">
            Verify agencies, GhanaPostGPS addresses, title evidence, and listing readiness before
            scaling public promotion.
          </p>
        </div>
        <Badge variant={organization.verified ? "default" : "secondary"}>
          {organization.verified ? "Verified agency" : "Agency verification pending"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Verified requests</p>
          <p className="mt-1 text-2xl font-semibold">{snapshot?.verifiedRequests || 0}</p>
        </Card>
        <Card className="p-4">
          <TriangleAlert className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-sm text-muted-foreground">Pending requests</p>
          <p className="mt-1 text-2xl font-semibold">{snapshot?.pendingRequests || 0}</p>
        </Card>
        <Card className="p-4">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Passed listing checks</p>
          <p className="mt-1 text-2xl font-semibold">{snapshot?.passedChecks || 0}</p>
        </Card>
        <Card className="p-4">
          <Stamp className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Public trust docs</p>
          <p className="mt-1 text-2xl font-semibold">{snapshot?.publicDocuments || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Submit verification</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with business registration, Ghana Card, title evidence, and address checks.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-foreground">Request type</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={requestType}
                onChange={(event) => setRequestType(event.target.value as TrustRequestType)}
              >
                {REQUEST_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                {REQUEST_TYPES.find((item) => item.value === requestType)?.helper}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: Business registration certificate uploaded in Documents. Please review for public agency badge."
              />
            </div>

            <Button onClick={() => void submitRequest()} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Trust Request"}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold">Verification Requests</h2>
            {requests.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No trust requests yet. Submit the first one from the form.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.slice(0, 8).map((request: any) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatLabel(request.request_type)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.public_summary || request.internal_notes || "No notes supplied."}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(request.status)}>
                        {formatLabel(request.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Latest Listing Checks</h2>
            {checks.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Listing checks will appear after saving listing quality reviews.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {checks.slice(0, 10).map((check: any) => (
                  <div key={check.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{check.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{check.details}</p>
                      </div>
                      <Badge variant={getStatusVariant(check.status)}>{formatLabel(check.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Public Trust Documents</h2>
            {documents.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Upload agency, mandate, or transaction documents in Documents and mark safe public
                summaries as visible.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {documents.slice(0, 6).map((document: any) => (
                  <div key={document.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <p className="font-medium">{document.title}</p>
                      <p className="text-sm text-muted-foreground">{formatLabel(document.document_type)}</p>
                    </div>
                    <Badge variant={document.public_visibility ? "default" : "secondary"}>
                      {document.public_visibility ? "Public" : "Private"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
