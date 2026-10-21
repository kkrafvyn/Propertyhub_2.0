import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Building2, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import {
  propertyListingClaimService,
  type PropertyListingClaim,
} from "../../../lib/property-listing-claim.service";
import {
  membershipRequestService,
  type OrganizationMembershipRequest,
} from "../../../lib/membership-request.service";
import { TRUST_LABELS } from "../../../lib/legal-disclaimers";
import { ConsumerHubChrome, PageHeader, PageLayout } from "../../components/ux";
import { ownerOversightService } from "../../../lib/owner-oversight.service";
import { organizationService } from "../../../lib/organization.service";

export function ConsumerWorkspaceAccessPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const claimListingId = searchParams.get("claimListing")?.trim() || "";
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<PropertyListingClaim[]>([]);
  const [requests, setRequests] = useState<OrganizationMembershipRequest[]>([]);
  const [claimNote, setClaimNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [resubmitting, setResubmitting] = useState<PropertyListingClaim | null>(null);
  const [orgSlug, setOrgSlug] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ownerOversightPath, setOwnerOversightPath] = useState<string | null>(null);

  const reload = async () => {
    if (!user?.id) return;
    const [claimRows, requestRows, memberships, agreements] = await Promise.all([
      propertyListingClaimService.getMyClaims(user.id),
      membershipRequestService.getMyRequests(user.id),
      organizationService.getUserOrganizations(user.id).catch(() => []),
      ownerOversightService.listMyAgreements(user.id).catch(() => []),
    ]);
    setClaims(claimRows);
    setRequests(requestRows);
    const ownerMembership = (memberships || []).find(
      (row: any) =>
        row.role === "property_owner" ||
        agreements.some((a) => a.managing_organization_id === row.organization?.id),
    );
    setOwnerOversightPath(
      ownerMembership?.organization?.slug
        ? `/workspace/${ownerMembership.organization.slug}/owner-oversight`
        : null,
    );
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void reload()
      .catch((error) => toast.error(error.message || "Failed to load access requests"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const submitClaim = async () => {
    if (submitting) return;
    const listingId = resubmitting?.listing_id || claimListingId;
    if (!listingId) {
      toast.error("Open a listing and select Claim this property");
      return;
    }
    setSubmitting(true);
    let uploaded: string[] = [];
    try {
      if ((resubmitting?.evidence_storage_paths.length || 0) + evidenceFiles.length > 5) {
        throw new Error('At most five evidence files per claim');
      }
      if (resubmitting && !claimNote.trim()) throw new Error('Add a response to the reviewer');
      uploaded = await propertyListingClaimService.uploadEvidence(listingId, evidenceFiles);
      if (resubmitting) await propertyListingClaimService.resubmitClaim(resubmitting.id, claimNote, [...resubmitting.evidence_storage_paths, ...uploaded]);
      else await propertyListingClaimService.submitClaim({
        listingId,
        claimantNote: claimNote,
        evidenceStoragePaths: uploaded,
      });
      uploaded = [];
      toast.success("Claim submitted for review");
      setClaimNote("");
      setEvidenceFiles([]);
      setResubmitting(null);
      await reload().catch(() => toast.error('Your claim was submitted, but the list could not refresh. Reload this page.'));
    } catch (error: any) {
      try {
        await propertyListingClaimService.removeUnsubmittedEvidence(uploaded);
      } catch {
        toast.error('Some uploaded files could not be cleaned up. Contact support if this persists.');
      }
      toast.error(error.message || "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  const submitJoin = async () => {
    if (!user?.id || !orgSlug.trim()) return;
    setSubmitting(true);
    try {
      const org = await membershipRequestService.findOrganizationBySlug(orgSlug);
      if (!org) throw new Error("Organization not found for that slug");
      if (org.suspended) throw new Error("That organization is suspended");
      const approvedClaim = claims.find((claim) => claim.status === "approved" && claim.organization_id === org.id);
      await membershipRequestService.submitRequest({
        organizationId: org.id,
        userId: user.id,
        message: joinMessage,
        requestedRole: "property_owner",
        propertyListingClaimId: approvedClaim?.id || null,
      });
      toast.success("Membership request sent");
      setJoinMessage("");
      await reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to request membership");
    } finally {
      setSubmitting(false);
    }
  };

  const approvedClaim = claims.find((claim) => claim.status === "approved");
  const enrollHref = approvedClaim
    ? `${WORKSPACE_ENTRY_PATH}?claimId=${approvedClaim.id}`
    : WORKSPACE_ENTRY_PATH;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <PageLayout variant="consumer">
      <ConsumerHubChrome activeSection="overview">
      <PageHeader
        title="Own property? Use the workspace"
        description="Claim a listing, create your landlord workspace, or request to join an existing company."
      />

      {ownerOversightPath ? (
        <Card className="p-5 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-emerald-500/20 bg-emerald-500/[0.04]">
          <div>
            <h2 className="font-semibold">Owner Oversight is ready</h2>
            <p className="text-sm text-muted-foreground">
              Your management company membership is active. Open transparency for your assets.
            </p>
          </div>
          <Link to={ownerOversightPath}>
            <Button>Open Owner Oversight</Button>
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Claim a listing
          </h2>
          <p className="text-sm text-muted-foreground">
            {TRUST_LABELS.listing_quality_score.disclaimer} Claim review unlocks access
            workflows; it does not transfer legal title.
          </p>
          {resubmitting?.listing_id || claimListingId ? (
            <p className="text-xs font-mono text-muted-foreground">Listing: {resubmitting?.listing_id || claimListingId}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tip: open a property page and tap <strong>Claim this property</strong>.
            </p>
          )}
          <Input
            value={claimNote}
            disabled={submitting}
            maxLength={10000}
            onChange={(e) => setClaimNote(e.target.value)}
            placeholder="Optional note / evidence summary"
          />
          {resubmitting && <p className="text-sm">Responding to: {resubmitting.reviewer_note}. Previously submitted evidence ({resubmitting.evidence_storage_paths.length} files) will be retained.</p>}
          <label className="block text-sm">Evidence (PDF or images, up to five files, 10 MB each)
            <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" disabled={submitting} onChange={event=>{setEvidenceFiles(Array.from(event.target.files||[]));event.target.value='';}} />
          </label>
          <p className="text-xs text-muted-foreground">{evidenceFiles.map(file=>file.name).join(', ')}</p>
          <Button onClick={() => void submitClaim()} disabled={submitting || !(claimListingId||resubmitting)}>
            <Send className="h-4 w-4 mr-1" /> {submitting?'Submitting…':resubmitting?'Resubmit claim':'Submit claim'}
          </Button>
          {resubmitting && <Button variant="outline" disabled={submitting} onClick={() => { setResubmitting(null); setClaimNote(''); setEvidenceFiles([]); }}>Cancel response</Button>}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Create your own workspace</h2>
          <p className="text-sm text-muted-foreground">
            Start landlord / company enrollment with KYC. Approved claims are attached when present.
          </p>
          {approvedClaim ? (
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved claim ready to attach
            </p>
          ) : null}
          <Link to={enrollHref}>
            <Button>Continue to workspace enrollment</Button>
          </Link>
        </Card>

        <Card className="p-5 space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Request to join an existing company</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="Organization slug (e.g. siabanku)"
            />
            <Input
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Why you need access"
            />
          </div>
          <Button onClick={() => void submitJoin()} disabled={submitting || !orgSlug.trim()}>
            Request membership
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card className="app-surface-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Your claims</h3>
          {claims.length === 0 ? (
            <p className="text-xs text-muted-foreground">No claims yet.</p>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="text-xs border border-border rounded-lg p-2">
                <div className="font-medium capitalize">{claim.status}</div>
                <div className="text-muted-foreground font-mono">{claim.listing_id}</div>
                {claim.reviewer_note && <p className="mt-2">Reviewer: {claim.reviewer_note}</p>}
                {claim.status==='needs_info' && <Button size="sm" variant="outline" onClick={()=>{setResubmitting(claim);setClaimNote('');setEvidenceFiles([]);window.scrollTo({top:0,behavior:'smooth'});}}>Respond with more information</Button>}
              </div>
            ))
          )}
        </Card>
        <Card className="app-surface-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Membership requests</h3>
          {requests.length === 0 ? (
            <p className="text-xs text-muted-foreground">No membership requests yet.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="text-xs border border-border rounded-lg p-2 space-y-1">
                <div className="font-medium capitalize">{request.status}</div>
                <div className="text-muted-foreground">
                  {request.organization?.name || request.organization_id}
                </div>
                {request.status === "approved" && request.organization?.slug ? (
                  <Link
                    className="text-primary hover:underline"
                    to={`/workspace/${request.organization.slug}/owner-oversight`}
                  >
                    Open Owner Oversight
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </Card>
      </div>
      </ConsumerHubChrome>
    </PageLayout>
  );
}
