import { useEffect, useMemo, useState } from "react";
import { MailPlus, Users, Shield, Clock, UserCheck, ChevronDown, UserPlus, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import { EmptyState } from "../../components/ux/EmptyState";
import type { Database } from "../../../lib/database.types";
import { communicationService } from "../../../lib/communication.service";
import { organizationService } from "../../../lib/organization.service";
import {
  WORKSPACE_PERMISSION_LABELS,
} from "../../../lib/workspace-permissions";
import { getWorkspaceRoute, type MemberRole } from "../../../lib/workspace";
import {
  DEPARTMENT_DEFINITIONS,
  getRoleCatalogEntry,
  getRoleLabel,
  groupRolesByDepartment,
  summarizeMemberAccess,
} from "../../../lib/company-model";
import {
  canAssignRole,
  canChangeMemberRole,
  canManageDepartments,
  canManageTeamMembers,
  canRemoveMember,
  getAssignerDepartment,
  getAssignmentPolicySummary,
  getAssignableRoles,
  isDepartmentHeadAssigner,
  type RoleAssignerContext,
} from "../../../lib/role-assignment";
import { PermissionMatrixEditor } from "../../components/workspace/PermissionMatrixEditor";
import { PropertyScopeEditor } from "../../components/workspace/PropertyScopeEditor";
import { ApprovalLimitsEditor } from "../../components/workspace/ApprovalLimitsEditor";
import {
  DepartmentHeadPanel,
  DepartmentHeadScopeBanner,
} from "../../components/workspace/DepartmentHeadPanel";
import { getWorkspaceRoleDescription } from "../../lib/workspace-role-nav";

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  enabled_capabilities?: string[] | null;
};

interface WorkspaceTeamProps {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | null;
  currentPermissions?: string[] | null;
}

function getDisplayName(profile?: { full_name?: string | null; email?: string | null } | null) {
  return profile?.full_name || profile?.email || "Team member";
}

function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  return [];
}

export function WorkspaceTeam({
  organization,
  currentUserId,
  currentRole,
  currentPermissions,
}: WorkspaceTeamProps) {
  const assignerContext: RoleAssignerContext = {
    assignerRole: currentRole,
    assignerPermissions: currentPermissions,
  };
  const canManageTeam = canManageTeamMembers(assignerContext);
  const canManageDepartmentHeads = canManageDepartments(assignerContext);
  const assignerDepartment = getAssignerDepartment(assignerContext);
  const isDeptHead = isDepartmentHeadAssigner(assignerContext);
  const assignableRoles = useMemo(() => getAssignableRoles(assignerContext), [currentRole, currentPermissions]);
  const assignableRoleSet = useMemo(() => new Set(assignableRoles), [assignableRoles]);
  const groupedAssignableRoles = useMemo(() => {
    const grouped = groupRolesByDepartment();
    for (const [department, entries] of grouped.entries()) {
      grouped.set(
        department,
        entries.filter((entry) => assignableRoleSet.has(entry.role)),
      );
    }
    return grouped;
  }, [assignableRoleSet]);

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("property_manager");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    () => (isDeptHead && assignerDepartment ? assignerDepartment : "all"),
  );

  const visibleMembers = useMemo(() => {
    if (departmentFilter === "all") return members;
    return members.filter((member) => {
      const departmentKey = getRoleCatalogEntry(member.role)?.department;
      return departmentKey === departmentFilter;
    });
  }, [members, departmentFilter]);

  useEffect(() => {
    if (assignableRoles.length && !assignableRoles.includes(inviteRole)) {
      setInviteRole(assignableRoles[0] || "property_manager");
    }
  }, [assignableRoles, inviteRole]);

  useEffect(() => {
    void loadTeamData();
  }, [organization.id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [memberData, invitationData, departmentData] = await Promise.all([
        organizationService.getOrganizationMembers(organization.id),
        organizationService.getOrganizationInvitations(organization.id),
        organizationService.getOrganizationDepartments(organization.id),
      ]);
      setMembers(memberData || []);
      setInvitations(invitationData || []);
      setDepartments(departmentData || []);
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
          new Date(invitation.expires_at).getTime() > Date.now(),
      ),
    [invitations],
  );

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageTeam) {
      toast.error("You don't have permission to invite teammates.");
      return;
    }

    if (!canAssignRole(assignerContext, inviteRole)) {
      toast.error("You can't assign that role.");
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter a team member's email.");
      return;
    }

    const alreadyMember = members.some(
      (member) => member.user?.email?.toLowerCase() === normalizedEmail,
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
        role: inviteRole as never,
        appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      setInviteEmail("");
      setInviteRole(assignableRoles[0] || "property_manager");
      await loadTeamData();

      if (result.delivery === "manual_sign_in_required") {
        toast.success(
          "Invite recorded. That teammate already has an account, so they can sign in and use the invite link.",
        );
      } else {
        toast.success("Invitation email sent.");
      }

      try {
        await communicationService.createInAppNotification({
          userId: currentUserId,
          notificationType: "team_invitation_sent",
          subject: `Invitation sent to ${normalizedEmail}`,
          content: `We'll let you know when they join ${organization.name} as ${getRoleLabel(inviteRole)}.`,
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

  const handleRoleChange = async (userId: string, role: MemberRole, currentMemberRole: MemberRole) => {
    if (!canChangeMemberRole(assignerContext, currentMemberRole, role)) {
      toast.error("You can't assign that role.");
      return;
    }

    const catalogEntry = getRoleCatalogEntry(role);
    const department = departments.find(
      (entry) => entry.department_key === catalogEntry?.department,
    );

    try {
      await organizationService.updateMemberRole(
        organization.id,
        userId,
        role,
        department?.id ?? null,
      );
      toast.success("Role updated.");
      await loadTeamData();
    } catch (error) {
      console.error("Failed to update member role:", error);
      toast.error("Unable to update that role.");
    }
  };

  const saveMemberPermissions = async (userId: string, nextPermissions: string[]) => {
    try {
      await organizationService.updateMemberPermissions(organization.id, userId, nextPermissions);
      toast.success("Permissions updated.");
      await loadTeamData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update permissions.");
    }
  };

  const handleRemove = async (userId: string, targetRole: MemberRole, isSelf: boolean) => {
    if (!canRemoveMember(assignerContext, targetRole, isSelf)) {
      toast.error("You can't remove this member.");
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
      toast.error("You don't have permission to revoke invitations.");
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

  const renderRoleOptions = (includeOwner: boolean) =>
    Array.from(groupedAssignableRoles.entries()).flatMap(([departmentKey, entries]) => {
      if (!entries.length) return [];
      const departmentLabel =
        DEPARTMENT_DEFINITIONS.find((entry) => entry.key === departmentKey)?.label || departmentKey;
      const options = entries.map((entry) => (
        <option key={entry.role} value={entry.role}>
          {entry.label}
        </option>
      ));
      if (includeOwner && currentRole === "owner") {
        options.unshift(
          <option key="owner" value="owner">
            Owner / Founder
          </option>,
        );
      }
      return [
        <optgroup key={departmentKey} label={departmentLabel}>
          {options}
        </optgroup>,
      ];
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-ink sm:text-3xl">
            Team & Access Control
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Assign job roles, departments, and permissions. Each teammate sees a workspace tailored
            to their role.
          </p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-ink">Who assigns roles here</p>
            <p className="mt-1 text-sm text-ink-secondary">
              {getAssignmentPolicySummary(assignerContext)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Members"
          value={members.length}
          icon={Users}
          iconColor="primary"
          subtitle="Confirmed organization seats"
        />
        <MetricCard
          title="Pending Invites"
          value={pendingInvitations.length}
          icon={Clock}
          iconColor="amber"
          subtitle="Awaiting user onboarding"
        />
        <MetricCard
          title="Departments"
          value={departments.length}
          icon={Shield}
          iconColor="emerald"
          subtitle="Active org structure"
        />
        <MetricCard
          title="Assignable Roles"
          value={assignableRoles.length}
          icon={UserCheck}
          iconColor="indigo"
          subtitle="Roles you can assign"
        />
      </div>

      {isDeptHead && assignerDepartment ? (
        <DepartmentHeadScopeBanner departmentKey={assignerDepartment} />
      ) : null}

      {canManageDepartmentHeads ? (
        <DepartmentHeadPanel
          organizationId={organization.id}
          departments={departments}
          members={members}
          canManage={canManageDepartmentHeads}
          onUpdated={() => void loadTeamData()}
        />
      ) : null}

      <Card className="border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Invite Team Member</h2>
        </div>
        {!canManageTeam ? (
          <p className="mb-4 text-sm text-ink-secondary">
            You can view the roster, but only authorized managers can invite and assign roles.
          </p>
        ) : null}
        <form
          onSubmit={handleInvite}
          className="grid grid-cols-1 gap-4 md:grid-cols-[1fr,240px,auto]"
        >
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@example.com"
            disabled={!canManageTeam}
          />
          <div>
            <label className="mb-2 block text-xs font-medium text-ink-secondary">Job role</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-surface-border bg-surface-subtle px-4 py-2.5 pr-10 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as MemberRole)}
                disabled={!canManageTeam || !assignableRoles.length}
              >
                {renderRoleOptions(false)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
            {inviteRole ? (
              <p className="mt-1.5 text-[11px] text-ink-muted">
                Department:{" "}
                {DEPARTMENT_DEFINITIONS.find(
                  (entry) => entry.key === getRoleCatalogEntry(inviteRole)?.department,
                )?.label || "—"}
              </p>
            ) : null}
          </div>
          <div className="md:self-end">
            <Button type="submit" disabled={!canManageTeam || submitting || !assignableRoles.length} className="shadow-xs">
              {submitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Pending Invitations</h2>
          <Badge variant="outline">{pendingInvitations.length}</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-surface-border bg-surface-subtle" />
            ))}
          </div>
        ) : pendingInvitations.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-secondary">No pending invitations right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-subtle p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-ink">{invitation.email}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {getRoleLabel(invitation.role)}
                    </Badge>
                    <Badge variant="warning" className="text-[10px]">
                      Pending
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-secondary">
                    Invited by {getDisplayName(invitation.inviter)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancelInvitation(invitation.id)}
                  disabled={!canManageTeam || cancellingInvitationId === invitation.id}
                >
                  {cancellingInvitationId === invitation.id ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">Current Members</h2>
          <div className="flex flex-wrap items-center gap-2">
            {departments.length > 1 ? (
              <select
                className="rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-ink"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.department_key}>
                    {department.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Badge variant="outline">{visibleMembers.length}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-surface-border bg-surface-subtle" />
            ))}
          </div>
        ) : visibleMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="No team members match the selected department filter."
          />
        ) : (
          <div className="space-y-3">
            {visibleMembers.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const displayName = getDisplayName(member.user);
              const memberPermissions = normalizePermissions(member.permissions);
              const access = summarizeMemberAccess(member.role, memberPermissions);
              const roleChangeAllowed =
                canManageTeam &&
                (member.role === "owner"
                  ? currentRole === "owner"
                  : canChangeMemberRole(assignerContext, member.role, member.role));
              const initials =
                displayName
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "TM";

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-subtle p-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                      {initials}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-ink">{displayName}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {access.roleLabel}
                        </Badge>
                        {member.department?.name ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {member.department.name}
                          </Badge>
                        ) : null}
                        {isCurrentUser ? (
                          <Badge variant="secondary" className="text-[10px]">
                            You
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary">{member.user?.email}</p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {getWorkspaceRoleDescription(member.role)}
                      </p>
                      <p className="mt-2 text-[11px] text-ink-muted">
                        Interface access: {access.permissions.slice(0, 4).map((p) => WORKSPACE_PERMISSION_LABELS[p]).join(", ")}
                        {access.permissions.length > 4 ? ` +${access.permissions.length - 4} more` : ""}
                      </p>
                      {canManageTeam && member.role !== "owner" ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExpandedMemberId((current) =>
                                current === member.user_id ? null : member.user_id,
                              )
                            }
                          >
                            {expandedMemberId === member.user_id ? "Hide access" : "Manage access"}
                          </Button>
                        </div>
                      ) : null}
                      {expandedMemberId === member.user_id && canManageTeam ? (
                        <div className="mt-3 space-y-3 border-t border-surface-border pt-3">
                          <PermissionMatrixEditor
                            role={member.role}
                            permissions={memberPermissions}
                            assignerContext={assignerContext}
                            onChange={(next) => void saveMemberPermissions(member.user_id, next)}
                          />
                          <PropertyScopeEditor
                            organizationId={organization.id}
                            userId={member.user_id}
                            role={member.role}
                          />
                          <ApprovalLimitsEditor
                            organizationId={organization.id}
                            userId={member.user_id}
                            memberName={getDisplayName(member.user)}
                            financeApprovalLimitMinor={
                              (member as { finance_approval_limit_minor?: number | null })
                                .finance_approval_limit_minor
                            }
                            maintenanceApprovalLimitMinor={
                              (member as { maintenance_approval_limit_minor?: number | null })
                                .maintenance_approval_limit_minor
                            }
                            canEdit={canManageTeam}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end lg:self-center">
                    <div className="relative">
                      <select
                        className="appearance-none rounded-lg border border-surface-border bg-surface px-3 py-1.5 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(
                            member.user_id,
                            event.target.value as MemberRole,
                            member.role,
                          )
                        }
                        disabled={!roleChangeAllowed}
                      >
                        {member.role === "owner" ? (
                          <option value="owner">Owner / Founder</option>
                        ) : null}
                        {renderRoleOptions(false)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void handleRemove(member.user_id, member.role, isCurrentUser)
                      }
                      disabled={!canRemoveMember(assignerContext, member.role, isCurrentUser)}
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
