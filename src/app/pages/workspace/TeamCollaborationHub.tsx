import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, MailPlus, MessageSquare, RefreshCw, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { Database } from "../../../lib/database.types";
import { automationEngineService } from "../../../lib/automation-engine.service";
import { messageService } from "../../../lib/message.service";
import { organizationService } from "../../../lib/organization.service";
import { whitelabelService } from "../../../lib/whitelabel.service";

import { propertyListingClaimService } from "../../../lib/property-listing-claim.service";
import { membershipRequestService } from "../../../lib/membership-request.service";
import { canWorkspace } from "../../../lib/workspace-permissions";
import type { MemberRole as ExtendedMemberRole } from "../../../lib/workspace";
import { estateOperationsService } from "../../../lib/estate-operations.service";
import {
  ownerOversightService,
  type PropertyManagementAgreement,
} from "../../../lib/owner-oversight.service";
import type { ManagementMode } from "../../../lib/owner-operator.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type MemberRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"];
type InvitationRole = Database["public"]["Tables"]["organization_invitations"]["Row"]["role"];

interface TeamCollaborationHubProps {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | ExtendedMemberRole | null;
}

const INVITATION_ROLE_OPTIONS: InvitationRole[] = ["manager", "agent", "analyst"];

const ROLE_CAPABILITIES: Record<string, string[]> = {
  owner: ["Team management", "Permission changes", "Workflow control", "Billing and branding"],
  manager: ["Team invites", "Listings and lead oversight", "Workflow updates"],
  agent: ["Listings", "Shared inbox replies", "Deal handling"],
  analyst: ["Reporting", "Insights", "Read-only workspace visibility"],
};

function getDisplayName(profile?: { full_name?: string | null; email?: string | null } | null) {
  return profile?.full_name || profile?.email || "Team member";
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export default function TeamCollaborationHub({
  organization,
  currentUserId,
  currentRole,
}: TeamCollaborationHubProps) {
  // Organization-wide claims, agreements and workflow settings belong to
  // organization administrators. Department management lives in WorkspaceTeam.
  const canManageTeam = ["owner", "organization_admin", "managing_director", "platform_admin"].includes(currentRole || "");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [sharedConversations, setSharedConversations] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [propertyClaims, setPropertyClaims] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<PropertyManagementAgreement[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [mgmtForm, setMgmtForm] = useState({
    estateId: "",
    ownerUserId: "",
    mode: "company_managed" as ManagementMode,
  });
  const [savingAgreement, setSavingAgreement] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("agent");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [needsInfoClaim, setNeedsInfoClaim] = useState<{ id: string; note: string } | null>(null);
  const [submittingInfoRequest, setSubmittingInfoRequest] = useState(false);
  const [settings, setSettings] = useState({
    auto_lead_assignment: false,
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    push_notifications_enabled: true,
  });

  const handleRequestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needsInfoClaim || !needsInfoClaim.note.trim()) {
      toast.error("Please specify what information is needed.");
      return;
    }
    setSubmittingInfoRequest(true);
    try {
      await propertyListingClaimService.reviewClaim({
        claimId: needsInfoClaim.id,
        status: "needs_info",
        reviewerNote: needsInfoClaim.note.trim(),
      });
      toast.success("Requested additional information from claimant.");
      setNeedsInfoClaim(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit request.");
    } finally {
      setSubmittingInfoRequest(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [memberData, invitationData, inboxData, workflowData, settingsData, claimData, membershipData, agreementData, estateData] =
        await Promise.all([
          organizationService.getOrganizationMembers(organization.id),
          organizationService.getOrganizationInvitations(organization.id),
          messageService.getOrganizationInbox(organization.id),
          automationEngineService.getWorkflows(organization.id),
          whitelabelService.getSettings(organization.id),
          propertyListingClaimService.getOrganizationClaims(organization.id).catch(() => []),
          membershipRequestService.getOrganizationRequests(organization.id).catch(() => []),
          ownerOversightService.listOrganizationAgreements(organization.id).catch(() => []),
          estateOperationsService.getEstates(organization.id).catch(() => []),
        ]);

      setMembers(memberData || []);
      setInvitations(invitationData || []);
      setSharedConversations(inboxData || []);
      setWorkflows(workflowData || []);
      setPropertyClaims(claimData || []);
      setMembershipRequests(membershipData || []);
      setAgreements(agreementData || []);
      setEstates(estateData || []);
      setSettings((current) => ({
        ...current,
        ...settingsData,
      }));
      if (!mgmtForm.estateId && estateData?.[0]?.id) {
        setMgmtForm((current) => ({ ...current, estateId: estateData[0].id }));
      }
    } catch (error) {
      console.error("Failed to load collaboration hub:", error);
      toast.error("We couldn't load the collaboration hub right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          invitation.status === "pending" &&
          new Date(invitation.expires_at).getTime() > Date.now()
      ),
    [invitations]
  );

  const recentActivity = useMemo(() => {
    const threadActivity = sharedConversations.map((conversation) => {
      const latestMessage =
        conversation.conversation?.messages?.[conversation.conversation.messages.length - 1] || null;

      return {
        id: `thread-${conversation.id}`,
        label: conversation.deal_case?.listing?.property?.address || "Shared inbox thread",
        detail: latestMessage?.content || "Conversation created",
        timestamp: latestMessage?.created_at || conversation.updated_at,
        type: "thread",
      };
    });

    const workflowActivity = workflows
      .filter((workflow) => workflow.last_executed_at)
      .map((workflow) => ({
        id: `workflow-${workflow.id}`,
        label: workflow.name,
        detail: `${workflow.execution_count || 0} runs • ${workflow.enabled ? "enabled" : "disabled"}`,
        timestamp: workflow.last_executed_at,
        type: "workflow",
      }));

    return [...threadActivity, ...workflowActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [sharedConversations, workflows]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageTeam) {
      toast.error("Only owners and managers can invite teammates.");
      return;
    }

    try {
      setSubmittingInvite(true);
      await organizationService.sendInvitation({
        organizationId: organization.id,
        email: inviteEmail,
        role: inviteRole,
        appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setInviteEmail("");
      toast.success("Invitation sent.");
      await loadData();
    } catch (error) {
      console.error("Failed to invite teammate:", error);
      toast.error("We couldn't send that invitation.");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleCreateManagementAgreement = async () => {
    if (!canManageTeam) {
      toast.error("Only organization administrators can set management agreements.");
      return;
    }
    const estate = estates.find((row) => row.id === mgmtForm.estateId);
    if (!estate?.property_id) {
      toast.error("Select an estate linked to a property.");
      return;
    }
    if (!mgmtForm.ownerUserId) {
      toast.error("Select the property owner member.");
      return;
    }
    setSavingAgreement(true);
    try {
      await ownerOversightService.ensureOwnerScopedMembership({
        organizationId: organization.id,
        userId: mgmtForm.ownerUserId,
        propertyId: estate.property_id,
        estateId: estate.id,
        mode: mgmtForm.mode,
      });
      toast.success("Management agreement saved. Owner Oversight is now active for that property.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save management agreement");
    } finally {
      setSavingAgreement(false);
    }
  };

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    try {
      await organizationService.updateMemberRole(organization.id, userId, role);
      toast.success("Role updated.");
      await loadData();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("We couldn't update that role.");
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await organizationService.removeMember(organization.id, userId);
      toast.success("Member removed.");
      await loadData();
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("We couldn't remove that teammate.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await whitelabelService.updateSettings(organization.id, settings);
      toast.success("Collaboration settings updated.");
    } catch (error) {
      console.error("Failed to save collaboration settings:", error);
      toast.error("We couldn't save those settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Team Collaboration Hub</h1>
                <Badge variant="outline" className="text-xs">
                  {members.length} {members.length === 1 ? "Member" : "Members"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage organization members, role permissions, listing claims, and management agreements.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManageTeam && (
            <Button
              size="sm"
              onClick={() => setActiveTab("members")}
              className="gap-1.5 text-xs"
            >
              <MailPlus className="w-3.5 h-3.5" />
              Invite Teammate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          onClick={() => setActiveTab("members")}
          className="p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm group flex items-center gap-3"
        >
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Members</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {members.filter((member) => member.role).length}
            </p>
          </div>
        </Card>
        <Card
          onClick={() => setActiveTab("overview")}
          className="p-4 cursor-pointer transition-all hover:border-amber-400/40 hover:shadow-sm group flex items-center gap-3"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending Invites</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{pendingInvitations.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inbox Threads</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{sharedConversations.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Workflows</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{workflows.filter(w => w.enabled).length}<span className="text-sm font-normal text-muted-foreground ml-1">/ {workflows.length}</span></p>
          </div>
        </Card>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: "overview", label: "Overview" },
            { key: "members", label: "Members", count: members.length },
            {
              key: "requests",
              label: "Requests",
              count:
                propertyClaims.filter((c) => c.status === "pending").length +
                membershipRequests.filter((r) => r.status === "pending").length,
            },
            { key: "management", label: "Management", count: agreements.length },
            { key: "permissions", label: "Roles" },
            { key: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading collaboration data...</Card>
      ) : null}

      {!loading && activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Collaboration Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                New shared inbox traffic and workflow execution will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{entry.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{entry.detail}</p>
                      </div>
                      <Badge variant="outline">{formatRelativeTime(entry.timestamp)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Invites</h2>
            {pendingInvitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites right now.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === "requests" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Listing Claims</h2>
            {propertyClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claims on your listings yet.</p>
            ) : (
              propertyClaims.map((claim) => (
                <div key={claim.id} className="border border-border rounded-lg p-3.5 space-y-2.5 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{claim.status}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={claim.listing_id}>
                      Listing #{claim.listing_id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{claim.claimant_note || "No note provided"}</p>
                  {(claim.evidence_storage_paths || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {claim.evidence_storage_paths.map((path: string, index: number) => (
                        <Button
                          key={path}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5"
                          onClick={() =>
                            void propertyListingClaimService
                              .evidenceUrl(path)
                              .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
                              .catch((error) => toast.error(error.message))
                          }
                        >
                          Document {index + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  {canManageTeam && ["pending", "needs_info"].includes(claim.status) ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          void propertyListingClaimService
                            .reviewClaim({ claimId: claim.id, status: "approved" })
                            .then(() => loadData())
                            .then(() => toast.success("Claim approved"))
                            .catch((error) => toast.error(error.message || "Review failed"))
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNeedsInfoClaim({ id: claim.id, note: "" })}
                      >
                        Needs Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void propertyListingClaimService
                            .reviewClaim({ claimId: claim.id, status: "rejected" })
                            .then(() => loadData())
                            .then(() => toast.success("Claim rejected"))
                            .catch((error) => toast.error(error.message || "Review failed"))
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </Card>

          <Card className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Membership requests</h2>
            {membershipRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No join requests yet.</p>
            ) : (
              membershipRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{request.status}</span>
                    <span className="text-[11px] text-muted-foreground">{request.requested_role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{request.message || "No message"}</p>
                  {canManageTeam && request.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void membershipRequestService
                            .reviewRequest({
                              requestId: request.id,
                              status: "approved",
                              role: request.requested_role || "property_owner",
                            })
                            .then(() => loadData())
                            .then(() => toast.success("Membership approved"))
                            .catch((error) => toast.error(error.message || "Review failed"))
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void membershipRequestService
                            .reviewRequest({ requestId: request.id, status: "rejected" })
                            .then(() => loadData())
                            .then(() => toast.success("Membership rejected"))
                            .catch((error) => toast.error(error.message || "Review failed"))
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === "members" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MailPlus className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Invite Teammate</h2>
            </div>
            <form
              onSubmit={handleInvite}
              className="grid grid-cols-1 md:grid-cols-[1fr,180px,auto] gap-4"
            >
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
                disabled={!canManageTeam}
              />
              <div>
                <label htmlFor="hub-role" className="block mb-2 text-sm text-foreground">
                  Role
                </label>
                <NativeSelectControl
                  id="hub-role"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as InvitationRole)}
                  disabled={!canManageTeam}
                >
                  {INVITATION_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </NativeSelectControl>
              </div>
              <div className="md:self-end">
                <Button type="submit" disabled={!canManageTeam || submittingInvite} className="h-10">
                  {submittingInvite ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              return (
                <Card key={member.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{getDisplayName(member.user)}</h3>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                        {isCurrentUser && <Badge>You</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{member.user?.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <NativeSelectControl
                        className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(member.user_id, event.target.value as MemberRole)
                        }
                        disabled={!canManageTeam || member.role === "owner"}
                      >
                        {Object.keys(ROLE_CAPABILITIES).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </NativeSelectControl>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => void handleRemove(member.user_id)}
                        disabled={!canManageTeam || member.role === "owner" || isCurrentUser}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!loading && activeTab === "management" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Property Management</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Property / estate</label>
                <NativeSelectControl
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={mgmtForm.estateId}
                  onChange={(e) => setMgmtForm((c) => ({ ...c, estateId: e.target.value }))}
                  disabled={!canManageTeam}
                >
                  <option value="">Select estate</option>
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                      {!estate.property_id ? " (no property link)" : ""}
                    </option>
                  ))}
                </NativeSelectControl>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Owner member</label>
                <NativeSelectControl
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={mgmtForm.ownerUserId}
                  onChange={(e) => setMgmtForm((c) => ({ ...c, ownerUserId: e.target.value }))}
                  disabled={!canManageTeam}
                >
                  <option value="">Select owner</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {getDisplayName(member.profile || member.user)} ({member.role})
                    </option>
                  ))}
                </NativeSelectControl>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Management mode</label>
                <NativeSelectControl
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={mgmtForm.mode}
                  onChange={(e) =>
                    setMgmtForm((c) => ({ ...c, mode: e.target.value as ManagementMode }))
                  }
                  disabled={!canManageTeam}
                >
                  <option value="company_managed">Company managed</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="self_managed">Self managed</option>
                </NativeSelectControl>
              </div>
            </div>
            <Button onClick={() => void handleCreateManagementAgreement()} disabled={!canManageTeam || savingAgreement}>
              {savingAgreement ? "Saving…" : "Save management agreement"}
            </Button>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-foreground">Active Management Agreements</h3>
            {agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active property management agreements on file.</p>
            ) : (
              agreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3.5 text-sm bg-card"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {agreement.property?.address || agreement.property_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-approval up to {(agreement.auto_approve_below_minor / 100).toLocaleString()} · Owner review required above {(agreement.owner_approve_below_minor / 100).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {agreement.status}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === "permissions" && (
        <div className="space-y-4">
          {Object.entries(ROLE_CAPABILITIES).map(([role, capabilities]) => (
            <Card key={role} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold capitalize">{role}</h2>
              </div>
              <div className="grid gap-3">
                {capabilities.map((capability) => (
                  <div key={capability} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{capability}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && activeTab === "settings" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Notification Settings</h2>
            {[
              {
                key: "auto_lead_assignment",
                label: "Auto-assign leads",
                description: "New enquiries are automatically routed to available agents.",
              },
              {
                key: "email_notifications_enabled",
                label: "Email notifications",
                description: "Receive updates and alerts via email.",
              },
              {
                key: "sms_notifications_enabled",
                label: "SMS notifications",
                description: "Receive urgent alerts via text message.",
              },
              {
                key: "push_notifications_enabled",
                label: "Push notifications",
                description: "Receive alerts on your device or browser.",
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(settings[item.key as keyof typeof settings])}
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      [item.key]: !current[item.key as keyof typeof current],
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    Boolean(settings[item.key as keyof typeof settings]) ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      Boolean(settings[item.key as keyof typeof settings]) ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => void handleSaveSettings()} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" onClick={() => void loadData()}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {!loading && members.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
          <p className="text-xs text-muted-foreground mt-1">Invite your first teammate using the Members tab.</p>
        </Card>
      )}

      {/* Claim Needs Info Dialog */}
      <Dialog open={Boolean(needsInfoClaim)} onOpenChange={(open) => !open && setNeedsInfoClaim(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Information</DialogTitle>
            <DialogDescription>
              Specify what documentation or evidence the claimant must provide to verify their listing claim.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestInfoSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="claim-reviewer-note" className="block text-xs font-semibold text-foreground mb-1.5">
                Claimant Instructions / Required Documents
              </label>
              <Textarea
                id="claim-reviewer-note"
                rows={3}
                value={needsInfoClaim?.note || ""}
                onChange={(e) =>
                  setNeedsInfoClaim((prev) => (prev ? { ...prev, note: e.target.value } : null))
                }
                placeholder="e.g. Please upload proof of ownership deed, utility bill, or signed agency representation agreement."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNeedsInfoClaim(null)}
                disabled={submittingInfoRequest}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingInfoRequest || !needsInfoClaim?.note?.trim()}>
                {submittingInfoRequest ? "Submitting..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
