import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..", "..");

describe("audit remediation migrations", () => {
  it("defines offline maintenance RPC and hardened WhatsApp claim", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20261004140000_audit_remediation_phase3.sql"),
      "utf8",
    );
    expect(sql).toMatch(/upsert_maintenance_request_offline/);
    expect(sql).toMatch(/claimed := FALSE/);
    expect(sql).toMatch(/length\(trim\(p_wa_message_id\)\) = 0/);
  });

  it("defines session revoke and booking lifecycle RPCs", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20261004120000_production_remediation_phase2.sql"),
      "utf8",
    );
    expect(sql).toMatch(/revoke_user_auth_session/);
    expect(sql).toMatch(/check_in_short_stay_booking/);
  });

  it("closes the audited privilege, booking, tenant, token, and notification paths", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20261004180000_security_remediation_phase4.sql"),
      "utf8",
    );
    expect(sql).toMatch(/NEW\.platform_console_grants IS DISTINCT FROM OLD\.platform_console_grants/);
    expect(sql).toMatch(/NEW\.is_platform_manager IS DISTINCT FROM OLD\.is_platform_manager/);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.short_stay_bookings FROM authenticated, anon/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_booking_cancellation\(UUID, BIGINT\) TO service_role/);
    expect(sql).toMatch(/t\.amount_minor=v_booking\.total_minor/);
    expect(sql).toMatch(/v_lease\.organization_id <> p_organization_id/);
    expect(sql).toMatch(/private\.can_manage_organization_members\(p_organization_id\)/);
    expect(sql).toMatch(/Notification delivery state is server controlled/);
  });
});
