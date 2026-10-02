import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MailPlus,
  Users,
  Shield,
  Clock,
  UserCheck,
  ChevronDown,
  UserPlus,
  Info,
  Search,
  Sparkles,
  RefreshCw,
  X,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
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
import { SectionOperationsPanel } from "../../components/workspace/SectionOperationsPanel";

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
  const [departments, setDepartments] = useState<any[]>([]);
  const assignerContext: RoleAssignerContext = {
    assignerRole: currentRole,
    assignerPermissions: currentPermissions,
    headDepartmentKeys: departments.filter((entry) => entry.head_user_id === currentUserId).map((entry) => entry.department_key),
  };
  const canManageTeam = canManageTeamMembers(assignerContext);
  const canManageDepartmentHeads = canManageDepartments(assignerContext);
  const assignerDepartment = getAssignerDepartment(assignerContext);
  const isDeptHead = isDepartmentHeadAssigner(assignerContext);
  const assignableRoles = useMemo(() => getAssignableRoles(assignerContext), [currentRole, currentPermissions, departments, currentUserId]);
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("property_manager");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    () => (isDeptHead && assignerDepartment ? assignerDepartment : "all"),
  );

  const visibleMembers = useMemo(() => {
    let result = members;
    if (departmentFilter !== "all") {
      result = result.filter((member) => {
        const departmentKey = getRoleCatalogEntry(member.role)?.department;
        return departmentKey === departmentFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((member) => {
        const name = getDisplayName(member.user).toLowerCase();
        const email = (member.user?.email || "").toLowerCase();
        const role = (member.role || "").toLowerCase();
        const roleLabel = getRoleLabel(member.role).toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q) || roleLabel.includes(q);
      });
    }
    return result;
  }, [members, departmentFilter, searchQuery]);

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
    <div className="space-y-8">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-500/10 via-primary/5 to-surface/80 border border-purple-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20 shadow-xs">
                <Shield className="w-3.5 h-3.5" />
                Enterprise Access Governance
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
              Team & Access Control
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-2xl leading-relaxed">
              Assign multi-tier job roles, departmental hierarchies, and granular permissions for {organization.name}. Teammates see a personalized workspace strictly scoped to their credentials.{" "}
              <Link to="/workspace-roles" className="text-primary hover:underline font-medium">
                Role glossary
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadTeamData()}
              className="flex items-center gap-1.5 border-surface-border/80 bg-surface/60 backdrop-blur-xs hover:bg-surface"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Role Policy Banner ── */}
      <Card variant="glass" className="border border-purple-500/20 bg-purple-500/5 p-4 rounded-2xl shadow-xs">
        <div className="flex gap-3 items-center">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              Role Assignment Policy
            </p>
            <p className="mt-0.5 text-xs text-ink-secondary leading-relaxed">
              {getAssignmentPolicySummary(assignerContext)}
            </p>
          </div>
        </div>
      </Card>

      {/* ── KPI Grid with Halo Glows ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Members"
          value={members.length}
          icon={Users}
          iconColor="primary"
          glow="primary"
          subtitle="Confirmed organization seats"
        />
        <MetricCard
          title="Pending Invites"
          value={pendingInvitations.length}
          icon={Clock}
          iconColor="amber"
          glow="amber"
          subtitle="Awaiting onboarding"
        />
        <MetricCard
          title="Departments"
          value={departments.length}
          icon={Shield}
          iconColor="emerald"
          glow="emerald"
          subtitle="Active operational units"
        />
        <MetricCard
          title="Assignable Roles"
          value={assignableRoles.length}
          icon={UserCheck}
          iconColor="purple"
          glow="purple"
          subtitle="Roles within your delegation"
        />
      </div>

      {isDeptHead && assignerDepartment ? (
        <DepartmentHeadScopeBanner departmentKey={assignerDepartment} />
      ) : null}

      <SectionOperationsPanel organizationId={organization.id} />

      {canManageDepartmentHeads ? (
        <DepartmentHeadPanel
          organizationId={organization.id}
          departments={departments}
          members={members}
          canManage={canManageDepartmentHeads}
          onUpdated={() => void loadTeamData()}
        />
      ) : null}

      {/* ── Invite Teammate Card ── */}
      <Card variant="glass" className="border border-surface-border/80 bg-surface/80 backdrop-blur-md p-6 rounded-2xl shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Invite Team Member</h2>
              <p className="text-xs text-ink-muted">Send an instant onboarding link with pre-assigned permissions</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {assignableRoles.length} Roles Delegable
          </Badge>
        </div>
        {!canManageTeam ? (
          <p className="mb-4 text-xs text-ink-secondary bg-surface-subtle/50 p-3 rounded-xl border border-surface-border">
            You are viewing the team roster in read-only mode. Only authorized administrators can invite teammates and modify roles.
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
            placeholder="colleague@example.com"
            disabled={!canManageTeam}
            className="rounded-xl"
          />
          <div>
            <label className="mb-2 block text-xs font-medium text-ink-secondary">Job role</label>
            <div className="relative">
              <NativeSelectControl
                className="w-full appearance-none rounded-xl border border-surface-border bg-surface-subtle px-4 py-2.5 pr-10 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as MemberRole)}
                disabled={!canManageTeam || !assignableRoles.length}
              >
                {renderRoleOptions(false)}
              </NativeSelectControl>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
            {inviteRole ? (
              <p className="mt-1.5 text-[11px] text-ink-muted flex items-center gap-1">
                <span>Dept:</span>
                <span className="font-semibold text-ink-secondary">
                  {DEPARTMENT_DEFINITIONS.find(
                    (entry) => entry.key === getRoleCatalogEntry(inviteRole)?.department,
                  )?.label || "—"}
                </span>
              </p>
            ) : null}
          </div>
          <div className="md:self-end">
            <Button
              type="submit"
              disabled={!canManageTeam || submitting || !assignableRoles.length}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <MailPlus className="w-4 h-4 mr-1.5" />
              <span>{submitting ? "Sending..." : "Send Invite"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Pending Invitations ── */}
      <Card variant="glass" className="border border-surface-border/80 bg-surface/80 backdrop-blur-md p-6 rounded-2xl shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-ink">Pending Invitations</h2>
          </div>
          <Badge variant="outline" className="text-xs">{pendingInvitations.length}</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-surface-border bg-surface-subtle" />
            ))}
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-secondary bg-surface-subtle/30 rounded-xl border border-surface-border/60">
            No pending invitations right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-4 rounded-2xl border border-surface-border/80 bg-surface/90 p-4 shadow-2xs hover:shadow-xs transition-all lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-ink">{invitation.email}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {getRoleLabel(invitation.role)}
                    </Badge>
                    <Badge variant="warning" className="text-[10px]">
                      Pending Acceptance
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Invited by {getDisplayName(invitation.inviter)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancelInvitation(invitation.id)}
                  disabled={!canManageTeam || cancellingInvitationId === invitation.id}
                  className="hover:border-red-500/50 hover:text-red-600 rounded-xl transition-colors"
                >
                  {cancellingInvitationId === invitation.id ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Current Members Roster ── */}
      <Card variant="glass" className="border border-surface-border/80 bg-surface/80 backdrop-blur-md p-6 rounded-2xl shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-ink font-display">Active Team Members</h2>
              <Badge variant="outline" className="text-xs">{visibleMembers.length}</Badge>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">Manage member roles, security clearance, and access boundaries</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Search */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, role..."
                className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-surface-subtle border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {departments.length > 1 ? (
              <NativeSelectControl
                className="rounded-xl border border-surface-border bg-surface-subtle px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.department_key}>
                    {department.name}
                  </option>
                ))}
              </NativeSelectControl>
            ) : null}
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
                  className="flex flex-col gap-4 rounded-2xl border border-surface-border/80 bg-surface/90 hover:border-purple-500/40 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-200 lg:flex-row lg:items-start lg:justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/15 via-primary/10 to-indigo-500/15 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-2xs group-hover:scale-105 transition-transform">
                      {initials}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{displayName}</h3>
                        <Badge variant="outline" className="text-[10px] font-semibold border-purple-500/20 bg-purple-500/5 text-purple-700 dark:text-purple-300">
                          {access.roleLabel}
                        </Badge>
                        {member.department?.name ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {member.department.name}
                          </Badge>
                        ) : null}
                        {isCurrentUser ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary">{member.user?.email}</p>
                      <p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
                        {getWorkspaceRoleDescription(member.role)}
                      </p>
                      <p className="mt-2 text-[11px] text-ink-muted">
                        <span className="font-medium text-ink-secondary">Interface access:</span> {access.permissions.slice(0, 4).map((p) => WORKSPACE_PERMISSION_LABELS[p]).join(", ")}
                        {access.permissions.length > 4 ? ` +${access.permissions.length - 4} more` : ""}
                      </p>
                      {canManageDepartmentHeads && member.role !== "owner" ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs border-surface-border/80 hover:bg-surface-subtle"
                            onClick={() =>
                              setExpandedMemberId((current) =>
                                current === member.user_id ? null : member.user_id,
                              )
                            }
                          >
                            <SlidersHorizontal className="w-3 h-3 mr-1.5 text-ink-muted" />
                            {expandedMemberId === member.user_id ? "Hide access matrix" : "Manage access permissions"}
                          </Button>
                        </div>
                      ) : null}
                      {expandedMemberId === member.user_id && canManageDepartmentHeads ? (
                        <div className="mt-4 space-y-4 border-t border-surface-border/80 pt-4 bg-surface-subtle/30 -mx-4 -mb-4 p-4 rounded-b-2xl">
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

                  <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                    <div className="relative">
                      <NativeSelectControl
                        className="appearance-none rounded-xl border border-surface-border bg-surface-subtle px-3 py-1.5 pr-8 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
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
                      </NativeSelectControl>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs hover:border-red-500/50 hover:text-red-600 transition-colors"
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
