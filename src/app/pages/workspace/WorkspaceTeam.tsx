import { useEffect, useMemo, useState } from "react";
import { MailPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Database } from "../../../lib/database.types";
import { communicationService } from "../../../lib/communication.service";
import { organizationService } from "../../../lib/organization.service";
import { getSeatLimitState, subscriptionService } from "../../../lib/subscription.service";
import { getWorkspaceRoute } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type MemberRole = "owner" | "manager" | "agent" | "analyst";
type InvitationRole = Database["public"]["Tables"]["organization_invitations"]["Row"]["role"];

interface WorkspaceTeamProps {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | null;
}

const MEMBER_ROLE_OPTIONS: MemberRole[] = ["owner", "manager", "agent", "analyst"];
const INVITATION_ROLE_OPTIONS: InvitationRole[] = ["manager", "agent", "analyst"];

function getDisplayName(profile?: { full_name?: string | null; email?: string | null } | null) {
  return profile?.full_name || profile?.email || "Team member";
}

export function WorkspaceTeam({
  organization,
  currentUserId,
  currentRole,
}: WorkspaceTeamProps) {
  const canManageTeam = currentRole === "owner" || currentRole === "manager";
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [billingOverview, setBillingOverview] = useState<any | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("agent");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

  useEffect(() => {
    void loadTeamData();
  }, [organization.id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [memberData, invitationData, billingData] = await Promise.all([
        organizationService.getOrganizationMembers(organization.id),
        organizationService.getOrganizationInvitations(organization.id),
        subscriptionService.getOrganizationBillingOverview(organization.id),
      ]);
      setMembers(memberData || []);
      setInvitations(invitationData || []);
      setBillingOverview(billingData);
    } catch (error) {
      console.error("Failed to load team data:", error);
      toast.error("Unable to load team members.");
    } finally {
      setLoading(false);
    }
  };

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          invitation.status === "pending" &&
          new Date(invitation.expires_at).getTime() > Date.now()
      ),
    [invitations]
  );

  const activeSeatUsage = members.length + pendingInvitations.length;
  const seatLimit = getSeatLimitState({
    tier: billingOverview?.tier ?? null,
    activeMembers: members.length,
    pendingInvitations: pendingInvitations.length,
  });
  const seatLimitLabel = seatLimit.isUnlimited ? "Unlimited" : String(seatLimit.limit);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageTeam) {
      toast.error("Only owners and managers can manage the team.");
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter a team member's email.");
      return;
    }

    if (seatLimit.isAtLimit) {
      toast.error("This subscription tier has reached its seat limit. Upgrade billing first.");
      return;
    }

    const alreadyMember = members.some(
      (member) => member.user?.email?.toLowerCase() === normalizedEmail
    );
    if (alreadyMember) {
      toast.error("That user is already part of this organization.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await organizationService.sendInvitation({
        organizationId: organization.id,
        email: normalizedEmail,
        role: inviteRole,
        appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      setInviteEmail("");
      setInviteRole("agent");
      await loadTeamData();

      if (result.delivery === "manual_sign_in_required") {
        toast.success(
          "Invite recorded. That teammate already has an account, so they can sign in and use the invite link."
        );
      } else {
        toast.success("Invitation email sent.");
      }

      try {
        await communicationService.createInAppNotification({
          userId: currentUserId,
          notificationType: "team_invitation_sent",
          subject: `Invitation sent to ${normalizedEmail}`,
          content: `We'll let you know when they join ${organization.name} as a ${inviteRole}.`,
          actionUrl: getWorkspaceRoute(organization.slug, "team"),
        });
      } catch (notificationError) {
        console.error("Failed to create invite notification:", notificationError);
      }
    } catch (error) {
      console.error("Failed to send invite:", error);
      toast.error("We couldn't send that invitation right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    if (!canManageTeam) {
      toast.error("Only owners and managers can manage the team.");
      return;
    }

    try {
      await organizationService.updateMemberRole(organization.id, userId, role);
      toast.success("Role updated.");
      await loadTeamData();
    } catch (error) {
      console.error("Failed to update member role:", error);
      toast.error("Unable to update that role.");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!canManageTeam) {
      toast.error("Only owners and managers can manage the team.");
      return;
    }

    const targetMember = members.find((member) => member.user_id === userId);
    if (targetMember?.role === "owner") {
      toast.error("Owners can't be removed from this screen.");
      return;
    }

    if (!confirm("Remove this member from the organization?")) {
      return;
    }

    try {
      await organizationService.removeMember(organization.id, userId);
      toast.success("Member removed.");
      await loadTeamData();
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("We couldn't remove that member.");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!canManageTeam) {
      toast.error("Only owners and managers can manage the team.");
      return;
    }

    try {
      setCancellingInvitationId(invitationId);
      await organizationService.cancelInvitation(invitationId);
      toast.success("Invitation revoked.");
      await loadTeamData();
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      toast.error("We couldn't revoke that invitation.");
    } finally {
      setCancellingInvitationId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Team</h1>
        <p className="text-muted-foreground mt-2">
          Manage who can access {organization.name}, invite new teammates, and keep onboarding in
          one place.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MailPlus className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Invite Team Member</h2>
        </div>
        {!canManageTeam && (
          <p className="text-sm text-muted-foreground mb-4">
            You can view the roster, but only owners and managers can change team access.
          </p>
        )}
        <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-foreground">Team seats</p>
              <p className="text-muted-foreground">
                {activeSeatUsage} used
                {seatLimit.isUnlimited ? " on an unlimited plan" : ` of ${seatLimitLabel}`}
                . Pending invitations count toward this limit.
              </p>
            </div>
            <Badge variant={seatLimit.isAtLimit ? "destructive" : "outline"}>
              {billingOverview?.tier?.name || "Subscription"} plan
            </Badge>
          </div>
          {seatLimit.isAtLimit && (
            <p className="mt-3 text-destructive">
              Upgrade from Billing before inviting another teammate.
            </p>
          )}
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
            <label className="block mb-2 text-sm text-foreground">Role</label>
            <select
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as InvitationRole)}
              disabled={!canManageTeam}
            >
              {INVITATION_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:self-end">
            <Button type="submit" disabled={!canManageTeam || submitting || seatLimit.isAtLimit}>
              {submitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pending Invitations</h2>
          <Badge>{pendingInvitations.length}</Badge>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm py-8 text-center">Loading invites...</div>
        ) : pendingInvitations.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8 text-center">
            No pending invitations right now.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="p-4 bg-secondary/30 rounded-lg flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold">{invitation.email}</h3>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                    <Badge>Pending</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Invited by {getDisplayName(invitation.inviter)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires {new Date(invitation.expires_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void handleCancelInvitation(invitation.id)}
                    disabled={!canManageTeam || cancellingInvitationId === invitation.id}
                  >
                    {cancellingInvitationId === invitation.id ? "Revoking..." : "Revoke"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Members</h2>
          <Badge>{members.length}</Badge>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm py-8 text-center">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8 text-center">
            No members were found for this organization.
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="p-4 bg-secondary/30 rounded-lg flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{getDisplayName(member.user)}</h3>
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                      {isCurrentUser && <Badge>You</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{member.user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <select
                      className="px-4 py-3 rounded-lg border border-border bg-input-background"
                      value={member.role}
                      onChange={(event) =>
                        void handleRoleChange(member.user_id, event.target.value as MemberRole)
                      }
                      disabled={!canManageTeam || member.role === "owner"}
                    >
                      {MEMBER_ROLE_OPTIONS.map((role) => (
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
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
