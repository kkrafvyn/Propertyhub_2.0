import { describe, expect, it } from "vitest";
import { workspaceRoleRequiresMfa } from "./mfa";

describe("workspaceRoleRequiresMfa", () => {
  it("requires MFA for finance write roles", () => {
    expect(workspaceRoleRequiresMfa("finance_officer")).toBe(true);
    expect(workspaceRoleRequiresMfa("collections_officer")).toBe(false);
  });

  it("requires MFA for team managers", () => {
    expect(workspaceRoleRequiresMfa("sales_manager")).toBe(true);
    expect(workspaceRoleRequiresMfa("agent")).toBe(false);
  });

  it("requires MFA for operational leadership roles", () => {
    expect(workspaceRoleRequiresMfa("manager")).toBe(true);
    expect(workspaceRoleRequiresMfa("owner")).toBe(true);
    expect(workspaceRoleRequiresMfa("managing_director")).toBe(true);
  });

  it("honours custom permission grants", () => {
    expect(workspaceRoleRequiresMfa("analyst", ["finance:write"])).toBe(true);
  });
});
