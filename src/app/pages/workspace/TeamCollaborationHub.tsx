import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, MailPlus, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
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
  const [settings, setSettings] = useState({
    auto_lead_assignment: false,
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    push_notifications_enabled: true,
  });

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
      <div>
        <h1 className="text-3xl font-semibold">Team Collaboration Hub</h1>
        <p className="text-muted-foreground mt-2">
          Real-time view of your team roster, shared inbox collaboration, workflow activity, and
          workspace delivery settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Members</p>
          <p className="text-2xl font-semibold mt-1">
            {members.filter((member) => member.role).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Invitations</p>
          <p className="text-2xl font-semibold mt-1">{pendingInvitations.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Shared Inbox Threads</p>
          <p className="text-2xl font-semibold mt-1">{sharedConversations.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Automation Workflows</p>
          <p className="text-2xl font-semibold mt-1">{workflows.length}</p>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        {[
          { key: "overview", label: "Overview" },
          { key: "members", label: "Members" },
          { key: "requests", label: "Claims & Requests" },
          { key: "management", label: "Management" },
          { key: "permissions", label: "Permissions" },
          { key: "settings", label: "Settings" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            <h2 className="text-lg font-semibold">Property listing claims</h2>
            {propertyClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claims on your listings yet.</p>
            ) : (
              propertyClaims.map((claim) => (
                <div key={claim.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{claim.status}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{claim.listing_id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{claim.claimant_note || "No claimant note"}</p>
                  <div className="flex gap-2">{(claim.evidence_storage_paths||[]).map((path:string,index:number)=><Button key={path} size="sm" variant="outline" onClick={()=>void propertyListingClaimService.evidenceUrl(path).then(url=>window.open(url,'_blank','noopener,noreferrer')).catch(error=>toast.error(error.message))}>Evidence {index+1}</Button>)}</div>
                  {canManageTeam && ["pending", "needs_info"].includes(claim.status) ? (
                    <div className="flex flex-wrap gap-2">
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
                        onClick={() => {
                          const note=window.prompt('What information does the claimant need to provide?');
                          if(!note?.trim())return;
                          void propertyListingClaimService
                            .reviewClaim({ claimId: claim.id, status: "needs_info", reviewerNote:note })
                            .then(() => loadData())
                            .then(() => toast.success("Requested more info"))
                            .catch((error) => toast.error(error.message || "Review failed"));
                        }}
                      >
                        Needs info
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
                <select
                  id="hub-role"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as InvitationRole)}
                  disabled={!canManageTeam}
                >
                  {INVITATION_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:self-end">
                <Button type="submit" disabled={!canManageTeam || submittingInvite}>
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
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="px-4 py-3 rounded-lg border border-border bg-input-background"
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
                      </select>
                      <Button
                        variant="outline"
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
            <h2 className="text-lg font-semibold">Company-managed properties</h2>
            <p className="text-sm text-muted-foreground">
              Link an owner member to an estate property, set management mode, and unlock Owner Oversight
              transparency for that asset.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block mb-2 text-sm">Estate / property</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background"
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
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm">Owner member</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background"
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
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm">Management mode</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background"
                  value={mgmtForm.mode}
                  onChange={(e) =>
                    setMgmtForm((c) => ({ ...c, mode: e.target.value as ManagementMode }))
                  }
                  disabled={!canManageTeam}
                >
                  <option value="company_managed">Company managed</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="self_managed">Self managed</option>
                </select>
              </div>
            </div>
            <Button onClick={() => void handleCreateManagementAgreement()} disabled={!canManageTeam || savingAgreement}>
              {savingAgreement ? "Saving…" : "Save management agreement"}
            </Button>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Active agreements</h3>
            {agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No management agreements yet.</p>
            ) : (
              agreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {agreement.property?.address || agreement.property_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Owner {agreement.owner_user_id.slice(0, 8)}… · Auto-approve below{" "}
                      {(agreement.auto_approve_below_minor / 100).toLocaleString()} · Owner gate{" "}
                      {(agreement.owner_approve_below_minor / 100).toLocaleString()}
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
            <h2 className="text-lg font-semibold">Collaboration Settings</h2>
            {[
              {
                key: "auto_lead_assignment",
                label: "Auto lead assignment",
                description: "Automatically assign new deal cases when they arrive.",
              },
              {
                key: "email_notifications_enabled",
                label: "Email notifications",
                description: "Allow workspace-level email delivery for collaboration updates.",
              },
              {
                key: "sms_notifications_enabled",
                label: "SMS notifications",
                description: "Allow SMS delivery for urgent workspace updates.",
              },
              {
                key: "push_notifications_enabled",
                label: "Push notifications",
                description: "Allow push delivery for supported devices and browsers.",
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings[item.key as keyof typeof settings])}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
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
        <Card className="p-6 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-60" />
          Collaboration data will appear here once your organization has team members.
        </Card>
      )}
    </div>
  );
}
