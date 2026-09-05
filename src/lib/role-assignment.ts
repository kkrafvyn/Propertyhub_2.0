import type { MemberRole } from "./workspace";
import {
  getInvitableRoles,
  getRoleCatalogEntry,
  type DepartmentKey,
} from "./company-model";

const EXECUTIVE_ROLES = new Set<MemberRole>(["owner", "managing_director", "organization_admin"]);
const TEAM_MANAGER_ROLES = new Set<MemberRole>([
  "owner",
  "managing_director",
  "organization_admin",
  "manager",
  "head_property_management",
  "sales_manager",
  "finance_manager",
  "customer_service_manager",
  "marketing_manager",
  "facilities_manager",
]);

export type RoleAssignerContext = {
  assignerRole: MemberRole | null | undefined;
  assignerPermissions?: string[] | null;
};

export function canManageTeamMembers(context: RoleAssignerContext): boolean {
  const role = context.assignerRole;
  if (!role) return false;
  if (EXECUTIVE_ROLES.has(role)) return true;
  if (TEAM_MANAGER_ROLES.has(role)) return true;
  return (context.assignerPermissions || []).includes("team:manage");
}

export function canAssignRole(
  context: RoleAssignerContext,
  targetRole: MemberRole,
): boolean {
  if (!canManageTeamMembers(context)) return false;

  const assignerRole = context.assignerRole;
  if (!assignerRole) return false;

  if (targetRole === "owner") {
    return assignerRole === "owner";
  }

  if (EXECUTIVE_ROLES.has(assignerRole)) {
    return true;
  }

  const targetEntry = getRoleCatalogEntry(targetRole);
  if (!targetEntry) return false;

  if (EXECUTIVE_ROLES.has(targetRole)) {
    return false;
  }

  const assignerEntry = getRoleCatalogEntry(assignerRole);
  if (!assignerEntry) return false;

  return assignerEntry.department === targetEntry.department;
}

export function getAssignableRoles(context: RoleAssignerContext): MemberRole[] {
  return getInvitableRoles()
    .map((entry) => entry.role)
    .filter((role) => canAssignRole(context, role));
}

export function getAssignableRolesByDepartment(context: RoleAssignerContext) {
  const assignable = new Set(getAssignableRoles(context));
  const grouped = new Map<DepartmentKey, MemberRole[]>();

  for (const entry of getInvitableRoles()) {
    if (!assignable.has(entry.role)) continue;
    const list = grouped.get(entry.department) || [];
    list.push(entry.role);
    grouped.set(entry.department, list);
  }

  return grouped;
}

export function canChangeMemberRole(
  context: RoleAssignerContext,
  currentMemberRole: MemberRole,
  nextRole: MemberRole,
): boolean {
  if (currentMemberRole === "owner" && nextRole !== "owner") {
    return context.assignerRole === "owner";
  }
  return canAssignRole(context, nextRole);
}

export function canRemoveMember(
  context: RoleAssignerContext,
  targetRole: MemberRole,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (targetRole === "owner") return false;
  return canManageTeamMembers(context);
}

export function getAssignmentPolicySummary(context: RoleAssignerContext): string {
  const role = context.assignerRole;
  if (role === "owner") {
    return "As owner, you can assign any job role. Only you can assign the owner role.";
  }
  if (role === "organization_admin" || role === "managing_director") {
    return "You can assign operational roles across departments. Only the owner can assign the owner role.";
  }
  if (canManageTeamMembers(context)) {
    const department = getAssignerDepartment(context);
    const label = department
      ? DEPARTMENT_LABELS[department] || department
      : "your department";
    return `As department head, you can invite and assign roles within ${label} only.`;
  }
  return "You can view the team roster but cannot change roles.";
}

const DEPARTMENT_LABELS: Partial<Record<DepartmentKey, string>> = {
  executive: "Executive",
  property: "Property Operations",
  sales: "Sales & Leasing",
  finance: "Finance",
  maintenance: "Maintenance",
  support: "Customer Service",
  procurement: "Procurement",
  administration: "Administration",
  analytics: "Analytics",
};

const DEPARTMENT_HEAD_ROLES = new Set<MemberRole>([
  "head_property_management",
  "sales_manager",
  "finance_manager",
  "facilities_manager",
  "customer_service_manager",
  "marketing_manager",
]);

export function getAssignerDepartment(
  context: RoleAssignerContext,
): DepartmentKey | null {
  const role = context.assignerRole;
  if (!role) return null;
  return getRoleCatalogEntry(role)?.department ?? null;
}

export function isExecutiveAssigner(context: RoleAssignerContext): boolean {
  const role = context.assignerRole;
  return Boolean(role && EXECUTIVE_ROLES.has(role));
}

export function isDepartmentHeadAssigner(context: RoleAssignerContext): boolean {
  const role = context.assignerRole;
  if (!role || EXECUTIVE_ROLES.has(role)) return false;
  return DEPARTMENT_HEAD_ROLES.has(role);
}

export function canManageDepartments(context: RoleAssignerContext): boolean {
  return isExecutiveAssigner(context);
}
