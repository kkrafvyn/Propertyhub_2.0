import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getUserRole } from "../../app/lib/baytmiftah/roles";
import { resolvePostAuthRedirect } from "../../app/lib/auth-routing";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workspace requires an approved application", () => {
  it("does not trust a self-declared host or platform-admin role", () => {
    for (const role of ["host", "landlord", "agent", "platform_admin"]) {
      const identity = { user_metadata: { role } };
      expect(getUserRole(identity)).toBe("consumer");
      expect(resolvePostAuthRedirect(identity, null)).toBe("/app");
    }
  });

  it("public signup only creates consumer identities", () => {
    const signup = source("src/app/pages/auth/Signup.tsx");
    const auth = source("src/app/context/AuthContext.tsx");
    expect(signup).not.toContain("accountType ===");
    expect(signup).not.toContain("type=landlord");
    expect(signup).toContain('const legalScope = "signup_consumer"');
    expect(auth).toContain('role: "consumer"');
    expect(auth).toContain('account_type: "user"');
    expect(auth).not.toContain('accountType === "landlord"');
  });

  it("requires KYC and a platform reviewer before an organization is created", () => {
    const enrollment = source("src/app/pages/workspace/WorkspaceEntry.tsx");
    const dbApproval = source("supabase/migrations/2026092702_close_tenant_mutation_paths.sql");
    const enrollmentService = source("src/lib/enrollment.service.ts");
    expect(enrollment).toContain("canSubmitWorkspaceEnrollment(kyc, operatingJurisdiction)");
    expect(enrollmentService).toContain('status: "pending"');
    expect(dbApproval).toContain("public.is_user_kyc_verified(v_request.requester_user_id)");
    expect(dbApproval).toContain("public.is_platform_admin() OR public.is_platform_staff()");
    expect(dbApproval).toContain("v_request.status <> 'pending'");
    expect(dbApproval).toContain("INSERT INTO public.organization_members");
  });
});
