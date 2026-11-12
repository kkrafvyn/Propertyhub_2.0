import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const owner = "10000000-0000-0000-0000-000000000001";
const support = "10000000-0000-0000-0000-000000000002";
const communications = "10000000-0000-0000-0000-000000000003";
const customer = "10000000-0000-0000-0000-000000000004";
const org = "20000000-0000-0000-0000-000000000001";
const source = "30000000-0000-0000-0000-000000000001";
let db: PGlite;
async function login(id: string, aal = "aal2", active = true) {
  await db.query(
    `SELECT set_config('test.user',$1,false),set_config('test.aal',$2,false),set_config('test.active',$3,false)`,
    [id, aal, String(active)],
  );
}
async function create(
  category = "support",
  sourceId: string | null = null,
  account: string | null = customer,
) {
  return db.query<{ id: string }>(
    `SELECT public.admin_create_support_case('Account needs review',$1,$2,$3,$4,'Evidence and next steps recorded') AS id`,
    [category, account, org, sourceId],
  );
}
describe("platform admin operations database permissions and workflows", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('aal',current_setting('test.aal',true)) $$;
      CREATE TABLE public.users(id uuid PRIMARY KEY,is_platform_admin boolean DEFAULT false,platform_console_grants text[] DEFAULT '{}',banned boolean DEFAULT false,account_deletion_requested_at timestamptz,full_name text,email text);
      CREATE TABLE public.organizations(id uuid PRIMARY KEY);
      CREATE FUNCTION private.account_access_allowed() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.active',true)='true' $$;
      CREATE FUNCTION public.has_platform_console_grant(p_grant text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT coalesce((SELECT is_platform_admin OR p_grant=ANY(platform_console_grants) FROM public.users WHERE id=auth.uid()),false) $$;
      CREATE TABLE public.communication_delivery_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,recipient_user_id uuid,status text,conversation_id uuid,message_id uuid,channel text,attempt_number integer,provider_reference text,error_message text,attempted_at timestamptz DEFAULT now());
      CREATE TABLE public.payment_transactions(id uuid PRIMARY KEY,user_id uuid);
      CREATE TABLE public.estate_ai_action_logs(id uuid PRIMARY KEY,organization_id uuid,action_status text,approved_by uuid,decided_at timestamptz);
      CREATE TABLE public.ai_agent_controls(organization_id uuid,agent_name text,enabled boolean,daily_action_budget integer,updated_by uuid,updated_at timestamptz,PRIMARY KEY(organization_id,agent_name));
      ALTER TABLE public.ai_agent_controls ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,auth TO authenticated;
      GRANT SELECT ON public.ai_agent_controls TO authenticated;
      CREATE TABLE public.organization_members(organization_id uuid REFERENCES public.organizations(id),user_id uuid REFERENCES public.users(id),role text);
      CREATE TABLE public.ai_org_controls(organization_id uuid REFERENCES public.organizations(id),globally_enabled boolean);
      CREATE TABLE public.ai_tool_allowlist(organization_id uuid REFERENCES public.organizations(id),tool_name text,enabled boolean);
      CREATE TABLE public.property_transactions(id uuid PRIMARY KEY,organization_id uuid REFERENCES public.organizations(id),payer_user_id uuid REFERENCES public.users(id),provider_reference text UNIQUE,amount_minor bigint,status text);
      CREATE TABLE public.property_refunds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),transaction_id uuid REFERENCES public.property_transactions(id),organization_id uuid,amount_minor bigint,status text);
      ALTER TABLE public.property_transactions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.property_refunds ENABLE ROW LEVEL SECURITY;
      CREATE TABLE public.notification_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),notification_type text,channel text,subject text,content text,delivered boolean,delivered_at timestamptz,read boolean);
      CREATE TABLE auth.mfa_factors(id uuid PRIMARY KEY,user_id uuid REFERENCES public.users(id));
      CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES public.users(id));
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,auth TO service_role;
    `);
    const migration = await readFile(
      join(
        import.meta.dirname,
        "../../supabase/migrations/20261110130000_platform_admin_operations.sql",
      ),
      "utf8",
    );
    await db.exec(migration);
    for(const filename of ['20261110140000_admin_workflow_execution.sql','20261110150000_support_files_and_recovery.sql','20261110160000_payment_execution_locks.sql']){
      await db.exec(await readFile(join(import.meta.dirname,'../../supabase/migrations',filename),'utf8'));
    }
  }, 30000);
  beforeEach(async () => {
    await db.exec(
      "RESET ROLE; TRUNCATE public.users,public.organizations,public.communication_delivery_attempts,public.payment_transactions,public.estate_ai_action_logs,public.ai_agent_controls CASCADE;",
    );
    await db.query(
      `INSERT INTO public.users(id,is_platform_admin,platform_console_grants) VALUES($1,true,'{}'),($2,false,'{support}'),($3,false,'{communications}'),($4,false,'{}')`,
      [owner, support, communications, customer],
    );
    await db.query("INSERT INTO public.organizations VALUES($1)", [org]);
    await db.query(
      "INSERT INTO public.communication_delivery_attempts(id,organization_id,recipient_user_id,status) VALUES($1,$2,$3,'failed')",
      [source, org, customer],
    );
    await login(owner);
    await db.exec("SET ROLE authenticated");
  });
  afterAll(async () => {
    await db?.close();
  });
  it("rejects missing MFA, inactive accounts, and users without the required grant", async () => {
    await login(owner, "aal1");
    await expect(create()).rejects.toThrow(/denied/);
    await login(owner, "aal2", false);
    await expect(create()).rejects.toThrow(/denied/);
    await login(customer);
    await expect(create()).rejects.toThrow(/denied/);
    await login(communications);
    await expect(
      db.query("SELECT public.admin_set_ai_control($1,'finance',true,10)", [
        org,
      ]),
    ).rejects.toThrow(/required/);
  });
  it("derives retry account and organization from the failed delivery, and prevents duplicate active reviews", async () => {
    await login(communications);
    const result = await create("delivery_retry", source, owner);
    const rows = await db.query(
      "SELECT account_id,organization_id FROM public.platform_support_cases WHERE id=$1",
      [result.rows[0].id],
    );
    expect(rows.rows[0]).toEqual({
      account_id: customer,
      organization_id: org,
    });
    await expect(create("delivery_retry", source)).rejects.toThrow(
      /already exists/,
    );
  });
  it("restricts case reads by category and prevents direct table writes", async () => {
    await create();
    await create("delivery_retry", source);
    await login(communications);
    expect(
      (await db.query("SELECT category FROM public.platform_support_cases"))
        .rows,
    ).toEqual([{ category: "delivery_retry" }]);
    await expect(
      db.exec("UPDATE public.platform_support_cases SET status='resolved'"),
    ).rejects.toThrow(/permission denied/);
    await login(customer);
    expect(
      (await db.query("SELECT * FROM public.platform_support_case_events"))
        .rows,
    ).toHaveLength(0);
  });
  it("records case assignment and history, rejecting stale edits and invalid assignees", async () => {
    const id = (await create()).rows[0].id;
    await expect(
      db.query(
        "SELECT public.admin_update_support_case($1,1,'in_progress',$2,'Assigned')",
        [id, customer],
      ),
    ).rejects.toThrow(/staff member/);
    await db.query(
      "SELECT public.admin_update_support_case($1,1,'in_progress',$2,'Identity checks started')",
      [id, support],
    );
    await expect(
      db.query(
        "SELECT public.admin_update_support_case($1,1,'resolved',$2,'Old edit')",
        [id, support],
      ),
    ).rejects.toThrow(/changed/);
    expect(
      (
        await db.query(
          "SELECT * FROM public.platform_support_case_events WHERE case_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("records MFA recovery without modifying account access or authenticators", async () => {
    const id = (await create("mfa_recovery")).rows[0].id;
    await login(support);
    await expect(
      db.query(
        "SELECT public.admin_update_support_case($1,1,'resolved',$2,'Identity evidence recorded')",
        [id, support],
      ),
    ).rejects.toThrow(/owner/);
    await login(owner);
    await db.query(
      "SELECT public.admin_update_support_case($1,1,'resolved',$2,'Owner review completed; no automatic reset')",
      [id, owner],
    );
    expect(
      (
        await db.query(
          "SELECT account_id,source_id FROM public.platform_support_cases WHERE id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({ account_id: customer, source_id: customer });
    await expect(create("mfa_recovery", null, null)).rejects.toThrow(
      /existing account/,
    );
  });
  it("audits AI decisions and rejects repeat decisions", async () => {
    await db.exec("RESET ROLE");
    await db.query(
      "INSERT INTO public.estate_ai_action_logs(id,organization_id,action_status) VALUES($1,$2,'recommended')",
      [source, org],
    );
    await db.exec("SET ROLE authenticated");
    await db.query(
      "SELECT public.admin_decide_ai_action($1,'approved','Reviewed the recommendation')",
      [source],
    );
    await expect(
      db.query(
        "SELECT public.admin_decide_ai_action($1,'rejected','Second decision is stale')",
        [source],
      ),
    ).rejects.toThrow(/already been reviewed/);
    expect(
      (await db.query("SELECT * FROM public.platform_ai_review_events")).rows,
    ).toHaveLength(1);
  });
  it("validates budgets and records the authenticated operator", async () => {
    await expect(
      db.query("SELECT public.admin_set_ai_control($1,'finance',true,-1)", [
        org,
      ]),
    ).rejects.toThrow(/daily budget/);
    await db.query("SELECT public.admin_set_ai_control($1,'finance',false,0)", [
      org,
    ]);
    expect(
      (
        await db.query(
          "SELECT enabled,daily_action_budget,updated_by FROM public.ai_agent_controls",
        )
      ).rows[0],
    ).toEqual({ enabled: false, daily_action_budget: 0, updated_by: owner });
  });
});
