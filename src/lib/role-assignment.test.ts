import { describe, expect, it } from "vitest";
import {
  canAssignRole,
  canManageDepartments,
  canManageTeamMembers,
  getAssignableRoles,
  isDepartmentHeadAssigner,
} from "./role-assignment";

describe("role assignment", () => {
  it("allows owners to assign any non-owner role and owner role", () => {
    expect(canAssignRole({ assignerRole: "owner" }, "property_manager")).toBe(true);
    expect(canAssignRole({ assignerRole: "owner" }, "owner")).toBe(true);
  });

  it("blocks managers from assigning owner", () => {
    expect(canAssignRole({ assignerRole: "manager" }, "owner")).toBe(false);
    expect(canAssignRole({ assignerRole: "manager" }, "property_manager")).toBe(true);
  });

  it("allows organization admins to assign across departments", () => {
    const roles = getAssignableRoles({ assignerRole: "organization_admin" });
    expect(roles).toContain("finance_manager");
    expect(roles).toContain("sales_agent");
    expect(roles).not.toContain("owner");
  });

  it("allows department heads to assign within their department only", () => {
    expect(canAssignRole({ assignerRole: "sales_manager" }, "sales_agent")).toBe(true);
    expect(canAssignRole({ assignerRole: "sales_manager" }, "finance_officer")).toBe(false);
  });

  it("grants team management through explicit permission", () => {
    expect(
      canManageTeamMembers({ assignerRole: "analyst", assignerPermissions: ["team:manage"] }),
    ).toBe(true);
  });

  it("identifies department heads and department management rights", () => {
    expect(isDepartmentHeadAssigner({ assignerRole: "sales_manager" })).toBe(true);
    expect(isDepartmentHeadAssigner({ assignerRole: "organization_admin" })).toBe(false);
    expect(canManageDepartments({ assignerRole: "owner" })).toBe(true);
    expect(canManageDepartments({ assignerRole: "sales_manager" })).toBe(false);
  });
});
