import type { MemberRole } from "./workspace";
import { getMemberPermissions } from "./workspace-permissions";

export type ApprovalDomain = "finance" | "maintenance";

export type MemberApprovalProfile = {
  role: MemberRole | string | null;
  permissions?: string[] | null;
  financeApprovalLimitMinor?: number | null;
  maintenanceApprovalLimitMinor?: number | null;
};

const UNLIMITED_ROLES = new Set<string>([
  "owner",
  "managing_director",
  "organization_admin",
  "head_property_management",
  "finance_manager",
]);

export function getApprovalLimitMinor(
  member: MemberApprovalProfile,
  domain: ApprovalDomain,
): number | null {
  if (member.role && UNLIMITED_ROLES.has(member.role)) {
    return null;
  }

  const raw =
    domain === "finance"
      ? member.financeApprovalLimitMinor
      : member.maintenanceApprovalLimitMinor;

  if (raw == null) return 0;
  return Math.max(0, raw);
}

export function canApproveAmount(
  member: MemberApprovalProfile,
  domain: ApprovalDomain,
  amountMinor: number,
): boolean {
  const permissions = getMemberPermissions(
    (member.role || "analyst") as MemberRole,
    member.permissions,
  );

  if (domain === "finance" && !permissions.includes("finance:write")) {
    return false;
  }

  if (domain === "maintenance" && !permissions.includes("tasks:write")) {
    return false;
  }

  const limit = getApprovalLimitMinor(member, domain);
  if (limit === null) return true;
  return amountMinor <= limit;
}

export function formatApprovalLimit(limitMinor: number | null, currency = "GHS") {
  if (limitMinor === null) return "No limit";
  if (limitMinor === 0) return "Cannot approve";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
  }).format(limitMinor / 100);
}

export function resolveWorkOrderApprovalAmountMinor(input: {
  approvalType: "quote" | "budget" | "completion" | "chargeable_cost";
  estimatedCostMinor?: number | null;
  actualCostMinor?: number | null;
  quoteTotalMinor?: number;
}): number {
  switch (input.approvalType) {
    case "quote":
      return input.quoteTotalMinor ?? 0;
    case "budget":
      return input.estimatedCostMinor ?? 0;
    case "completion":
    case "chargeable_cost":
      return input.actualCostMinor ?? input.estimatedCostMinor ?? 0;
    default:
      return 0;
  }
}
