import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from "../legal-config";

const root = process.cwd();
const migration = readFileSync(
  path.join(root, "supabase/migrations/2026092813_close_remaining_sensitive_workflow_gaps.sql"),
  "utf8",
);
const kyc = readFileSync(path.join(root, "src/lib/kyc.service.ts"), "utf8");
const visitor = readFileSync(path.join(root, "src/lib/visitor-clearance.service.ts"), "utf8");
const smart = readFileSync(path.join(root, "src/lib/smart-device.service.ts"), "utf8");
const legal = readFileSync(path.join(root, "src/lib/legal-acceptance.service.ts"), "utf8");
const webhooks = readFileSync(path.join(root, "src/lib/developer-api.service.ts"), "utf8");
const priorMigration = readFileSync(path.join(root, "supabase/migrations/2026092712_server_controlled_sensitive_workflows.sql"), "utf8");
const electronMain = readFileSync(path.join(root, "electron/main.cjs"), "utf8");
const supabaseClient = readFileSync(path.join(root, "src/lib/supabase.ts"), "utf8");
const electronCallbackSource = readFileSync(path.join(root, "electron/auth-callback.cjs"), "utf8");
const parseElectronAuthCallback = createRequire(import.meta.url)(path.join(root, "electron/auth-callback.cjs")) as
  (url: string) => { type: string; code: string; state: string } | null;

describe("2026092813 sensitive workflow follow-up", () => {
  it("closes KYC self-verification and limits review transitions to authorized finalization", () => {
    expect(migration).toMatch(/REVOKE INSERT, UPDATE ON public\.kyc_submissions FROM PUBLIC, anon, authenticated/i);
    expect(migration).toMatch(/submit_kyc_submission[\s\S]*?'submitted'[\s\S]*reviewer_user_id[\s\S]*NOW\(\)/i);
    expect(kyc).toMatch(/rpc\("submit_kyc_submission"/i);
    expect(migration).toMatch(/PERFORM private\.require_platform_staff_mfa\(\)/i);
    expect(migration).toMatch(/v_row\.status NOT IN \('submitted','in_review'\)/i);
    expect(migration).toMatch(/reviewer_user_id=auth\.uid\(\),reviewed_at=NOW\(\)/i);
  });

  it("binds tenant and staff passes, independent credentials, bounded policy, and anti-guessing", () => {
    expect(migration).toMatch(/create_tenant_visitor_pass[\s\S]*p_host_unit_id UUID[\s\S]*auth\.uid\(\)/i);
    expect(migration).toMatch(/create_staff_visitor_pass[\s\S]*visitor_passes:manage/i);
    expect(migration).toMatch(/o\.start_date<=CURRENT_DATE[\s\S]*o\.end_date IS NULL OR o\.end_date>=CURRENT_DATE/i);
    expect(migration).toMatch(/BM-GATE-'\|\|encode\(gen_random_bytes\(32\),'hex'\)/i);
    expect(migration).toMatch(/crypt\(v_pin,gen_salt\('bf',10\)\)/i);
    expect(migration).toMatch(/estate_visitor_pass_policies[\s\S]*max_lifetime_hours[\s\S]*max_uses/i);
    expect(migration).toMatch(/v_count>=10[\s\S]*Verification temporarily locked/i);
    expect(migration).toMatch(/guard_user_id,guard_name,verification_method,access_granted,occurred_at\)[\s\S]*v_actor[\s\S]*NOW\(\)/i);
    expect(migration).toMatch(/trg_estate_gate_log_append_only[\s\S]*BEFORE UPDATE OR DELETE/i);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.bot_create_whatsapp_visitor_pass/i);
    expect(visitor).toMatch(/create_staff_visitor_pass/i);
    expect(visitor).toMatch(/estate_visitor_passes_safe/i);
  });

  it("isolates device secrets and labels human notes separately from trusted telemetry", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.smart_device_credentials/i);
    expect(migration).toMatch(/REVOKE INSERT,UPDATE,DELETE,SELECT ON public\.smart_devices,public\.smart_device_events FROM PUBLIC,anon,authenticated/i);
    expect(migration).toMatch(/private\.redact_sensitive_json\(last_reading\)/i);
    expect(migration).toMatch(/private\.redact_sensitive_json\(e\.payload\)/i);
    expect(migration).toMatch(/Listing does not belong to organization/i);
    expect(migration).toMatch(/Lease does not belong to organization/i);
    expect(migration).toMatch(/'manual_admin'/i);
    expect(migration).toMatch(/auth\.role\(\)<>'service_role'/i);
    expect(smart).toMatch(/smart_devices_safe/i);
    expect(smart).toMatch(/smart_device_events_safe/i);
    expect(smart).not.toMatch(/\.from\("smart_devices"\)/i);
    expect(smart).not.toMatch(/\.from\("smart_device_events"\)/i);
  });

  it("prevents complaint and legal acceptance forgery", () => {
    expect(migration).toMatch(/submit_support_complaint\(p_category TEXT,p_subject TEXT,p_description TEXT/i);
    expect(migration).toMatch(/v_user UUID:=auth\.uid\(\)/i);
    expect(migration).toMatch(/legal_policy_bundles[\s\S]*INSERT INTO public\.legal_acceptances[\s\S]*v_bundle\.policy_version[\s\S]*v_bundle\.policies/i);
    expect(migration).toMatch(/record_legal_acceptance\(p_scope TEXT,p_jurisdiction TEXT DEFAULT NULL\)/i);
    expect(legal).not.toMatch(/p_user_id:/i);
    expect(legal).not.toMatch(/p_policy_version:/i);
    expect(legal).not.toMatch(/p_policies:/i);
    expect(migration).toContain(`'${LEGAL_POLICY_VERSION}'`);
    for (const scope of Object.keys(ACCEPTANCE_SCOPES)) {
      expect(migration).toContain(`('${scope}','${LEGAL_POLICY_VERSION}'`);
    }
  });

  it("makes valuation and webhook evidence server-authoritative", () => {
    expect(migration).toMatch(/REVOKE INSERT,UPDATE,DELETE ON public\.property_valuation_audits FROM PUBLIC,anon,authenticated/i);
    expect(migration).toMatch(/auth\.role\(\)<>'service_role'/i);
    expect(migration).toMatch(/input_hash/i);
    expect(migration).toMatch(/correction_of UUID REFERENCES/i);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.organization_webhook_secrets/i);
    expect(migration).toMatch(/organization_webhook_subscriptions_safe/i);
    expect(migration).toMatch(/rotate_organization_webhook_secret/i);
    expect(migration).toMatch(/get_organization_webhook_secret[\s\S]*auth\.role\(\)<>'service_role'/i);
    expect(webhooks).toMatch(/organization_webhook_subscriptions_safe/i);
    expect(webhooks).toMatch(/rotate_organization_webhook_secret/i);
  });

  it("correlates Electron callbacks to code/state and preserves PKCE", () => {
    expect(supabaseClient).toMatch(/flowType:\s*['"]pkce['"]/i);
    expect(electronCallbackSource).toMatch(/const state = parsed\.searchParams\.get\("bm_state"\)/i);
    expect(parseElectronAuthCallback("baytmiftah://auth/callback?code=auth-code&bm_state=nonce")).toEqual({
      type: "code", code: "auth-code", state: "nonce",
    });
    expect(parseElectronAuthCallback("baytmiftah://auth/callback?code=auth-code")).toBeNull();
    expect(parseElectronAuthCallback("baytmiftah://auth/callback?code=auth-code&bm_state=nonce&access_token=raw")).toBeNull();
    expect(parseElectronAuthCallback("baytmiftah://auth/callback?code=auth-code&bm_state=nonce#refresh_token=raw")).toBeNull();
    expect(electronMain).toMatch(/webContents\.send\("auth:oauth-callback", payload\)/i);
    expect(migration).toContain("931c308 follow-up hardening");
    expect(priorMigration).toMatch(/p_listing_id UUID,\s+p_lease_id UUID,\s+p_device_type TEXT/i);
    expect(priorMigration).toMatch(/p_user_id UUID,\s+p_category TEXT/i);
  });

  it("contains no direct browser writes for the protected workflow tables", () => {
    expect(kyc).not.toMatch(/\.from\("kyc_submissions"\)\s*\.insert/i);
    expect(visitor).not.toMatch(/\.from\('estate_visitor_passes'\)\s*\.(insert|update|delete)/i);
    expect(smart).not.toMatch(/\.from\("smart_(devices|device_events)"\)\s*\.(insert|update|delete)/i);
    expect(legal).not.toMatch(/\.from\("(legal_acceptances|support_complaints)"\)\s*\.(insert|update|delete)/i);
    expect(webhooks).not.toMatch(/\.from\('organization_webhook_subscriptions'\)\s*\.(insert|update|delete)/i);
  });
});
