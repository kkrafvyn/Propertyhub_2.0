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

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type MemberRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"];
type InvitationRole = Database["public"]["Tables"]["organization_invitations"]["Row"]["role"];

interface TeamCollaborationHubProps {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | null;
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
  const canManageTeam = currentRole === "owner" || currentRole === "manager";
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [sharedConversations, setSharedConversations] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
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
      const [memberData, invitationData, inboxData, workflowData, settingsData] =
        await Promise.all([
          organizationService.getOrganizationMembers(organization.id),
          organizationService.getOrganizationInvitations(organization.id),
          messageService.getOrganizationInbox(organization.id),
          automationEngineService.getWorkflows(organization.id),
          whitelabelService.getSettings(organization.id),
        ]);

      setMembers(memberData || []);
      setInvitations(invitationData || []);
      setSharedConversations(inboxData || []);
      setWorkflows(workflowData || []);
      setSettings((current) => ({
        ...current,
        ...settingsData,
      }));
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
