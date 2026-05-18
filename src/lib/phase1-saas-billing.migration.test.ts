import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260517120000_phase1_saas_billing.sql"),
  "utf8"
);
const adminUserMigrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260517123000_phase1_admin_user_management.sql"),
  "utf8"
);
const deployScript = readFileSync(
  join(process.cwd(), "scripts/deploySupabasePayments.cjs"),
  "utf8"
);
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
const adminLayout = readFileSync(join(process.cwd(), "src/app/pages/admin/AdminLayout.tsx"), "utf8");
const workspaceSettings = readFileSync(
  join(process.cwd(), "src/app/pages/workspace/WorkspaceSettings.tsx"),
  "utf8"
);
const platformAdminService = readFileSync(
  join(process.cwd(), "src/lib/platform-admin.service.ts"),
  "utf8"
);

describe("Phase 1 SaaS billing migration", () => {
  it("creates the subscription and admin tables with RLS enabled", () => {
    for (const tableName of [
      "subscription_tiers",
      "organization_subscriptions",
      "organization_subscription_payments",
      "subscription_invoices",
      "organization_billing_events",
      "platform_admins",
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migrationSql).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("seeds the exact v3 SaaS pricing and limits", () => {
    expect(migrationSql).toContain("'starter'");
    expect(migrationSql).toContain("20000");
    expect(migrationSql).toContain("3");
    expect(migrationSql).toContain("15");

    expect(migrationSql).toContain("'growth'");
    expect(migrationSql).toContain("50000");
    expect(migrationSql).toContain("10");
    expect(migrationSql).toContain("60");

    expect(migrationSql).toContain("'pro'");
    expect(migrationSql).toContain("120000");
    expect(migrationSql).toContain("NULL");
    expect(migrationSql).toContain("Unlimited agents");
  });

  it("uses platform_admins for admin authorization instead of editable metadata", () => {
    expect(migrationSql).toContain("FROM public.platform_admins admin");
    expect(migrationSql).toContain("COMMENT ON TABLE public.platform_admins");
    expect(adminUserMigrationSql).toContain("private.is_platform_admin()");
    expect(adminUserMigrationSql).toContain("private.can_manage_platform()");
    expect(migrationSql).not.toContain("raw_user_meta_data");
    expect(migrationSql).not.toContain("user_metadata");
  });

  it("provides Phase 1 admin user management and session controls", () => {
    expect(adminUserMigrationSql).toContain("Platform admins can view all users");
    expect(adminUserMigrationSql).toContain("Platform admins can update user access state");
    expect(platformAdminService).toContain("getUserQueue");
    expect(platformAdminService).toContain("updateUserAccessStatus");
    expect(adminLayout).toContain("User Management");
    expect(adminLayout).not.toContain("Admin Surface In Progress");
    expect(workspaceSettings).toContain("Security & Sessions");
    expect(workspaceSettings).toContain('scope: "global"');
  });

  it("enforces payment-required publishing and active listing caps at the database layer", () => {
    expect(migrationSql).toContain("private.enforce_active_listing_limit");
    expect(migrationSql).toContain("A paid subscription is required before publishing active listings");
    expect(migrationSql).toContain("This subscription tier has reached its active listing limit");
  });
});

describe("Phase 1 SaaS deployment wiring", () => {
  it("deploys organization subscription functions with the payment stack", () => {
    expect(deployScript).toContain("initialize-organization-subscription");
    expect(deployScript).toContain("verify-organization-subscription");
    expect(deployScript).toContain("manage-organization-subscription");
    expect(deployScript).toContain("send-organization-invite");
  });

  it("documents the required Paystack plan-code secrets", () => {
    expect(envExample).toContain("PAYSTACK_PLAN_CODE_STARTER=");
    expect(envExample).toContain("PAYSTACK_PLAN_CODE_GROWTH=");
    expect(envExample).toContain("PAYSTACK_PLAN_CODE_PRO=");
  });
});
