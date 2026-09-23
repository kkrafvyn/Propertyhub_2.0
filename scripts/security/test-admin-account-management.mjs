// Isolated PostgreSQL regression checks. Install @electric-sql/pglite separately
// and pass its dist/index.js path as the first argument. No live database is used.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const admin = '00000000-0000-0000-0000-000000000001';
const member = '00000000-0000-0000-0000-000000000002';
const other = '00000000-0000-0000-0000-000000000003';
const query = (sql, params = []) => db.query(sql, params);
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE authenticator;
    CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'::text$$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('aal', current_setting('test.aal', true))$$;
    CREATE TABLE auth.mfa_factors(user_id uuid, status text);
    CREATE TABLE auth.users(id uuid PRIMARY KEY, deleted_at timestamptz, banned_until timestamptz);
    CREATE TABLE auth.sessions(id uuid DEFAULT gen_random_uuid(), user_id uuid);
    CREATE TABLE auth.refresh_tokens(id int, user_id text);
    CREATE TABLE public.users(id uuid PRIMARY KEY, email text, phone text, verified boolean DEFAULT false, banned boolean DEFAULT false, is_platform_admin boolean DEFAULT false,
      is_platform_manager boolean DEFAULT false, platform_console_grants text[] DEFAULT '{}');
    CREATE TABLE public.organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text UNIQUE,
      description text, email text, phone text, website text, owner_id uuid REFERENCES public.users,
      verified boolean, suspended boolean, business_types text[], company_setup_completed boolean, workspace_kind text);
    CREATE TABLE public.organization_members(organization_id uuid, user_id uuid, role text,
      scope_mode text DEFAULT 'organization', department_id uuid, permissions jsonb DEFAULT '[]', UNIQUE(organization_id,user_id));
    CREATE TABLE public.organization_departments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,department_key text,name text,head_user_id uuid);
    CREATE TABLE public.organization_invitations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,email text,role text,status text,expires_at timestamptz);
    CREATE TABLE public.workspace_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,assigned_to uuid,created_by uuid,title text,status text);
    CREATE TABLE public.operational_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,service text,event_type text,severity text,message text,metadata jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE public.organization_api_keys(id uuid DEFAULT gen_random_uuid(),organization_id uuid,created_by uuid,status text);
    CREATE TABLE public.external_access_grants(id uuid DEFAULT gen_random_uuid(),organization_id uuid,created_by uuid,recipient_email text,revoked_at timestamptz);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid);
    CREATE TABLE public.organization_enrollment_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_user_id uuid, status text DEFAULT 'pending', company_name text, desired_slug text, description text,
      contact_email text, contact_phone text, website text, business_types text[], workspace_kind text,
      organization_id uuid, reviewed_by uuid, reviewed_at timestamptz, review_notes text, updated_at timestamptz);
    CREATE TABLE public.audit_logs(admin_id uuid, action text, target_type text, target_id text, details jsonb);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()), false)$$;
    CREATE FUNCTION public.is_platform_staff() RETURNS boolean LANGUAGE sql AS $$SELECT public.is_platform_admin()$$;
    CREATE FUNCTION public.has_platform_console_grant(text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE FUNCTION public.is_user_kyc_verified(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce((SELECT verified FROM public.users WHERE id=$1), false)$$;
    INSERT INTO public.users(id,email,verified,is_platform_admin) VALUES
      ('${admin}','admin@example.test',true,true),('${member}','member@example.test',true,false),('${other}','other@example.test',false,false);
  `);
  const enrollment = readFileSync(new URL('../../supabase/migrations/2026090902_enrollment_rpc_only_review.sql', import.meta.url), 'utf8');
  await db.exec(enrollment.slice(enrollment.indexOf('CREATE OR REPLACE FUNCTION'), enrollment.indexOf('CREATE OR REPLACE FUNCTION public.reject')));
  await db.exec(readFileSync(new URL('../../supabase/migrations/2026092301_admin_account_management.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/2026092302_admin_account_deletion.sql', import.meta.url), 'utf8'));
  await query('INSERT INTO auth.users(id) SELECT id FROM public.users');
  const actor = (id) => query("SELECT set_config('test.uid', $1, false)", [id]);
  const create = (id, slug) => query("SELECT public.admin_create_user_organization($1,'Test Properties',$2,'property_management') AS id", [id, slug]);
  await actor(member);
  await check('ordinary users cannot create organizations for others', () => assert.rejects(create(other, 'denied'), /active platform admin/));
  await actor(admin);
  await check('unverified owner cannot bypass enrollment KYC', () => assert.rejects(create(other, 'unverified'), /identity verification/));
  await check('invalid slugs are rejected', () => assert.rejects(create(member, 'bad slug'), /slug/));
  let orgId;
  await check('creation provisions owner, approved enrollment and audit atomically', async () => {
    orgId = (await create(member, 'test-company')).rows[0].id;
    assert.equal((await query('SELECT role FROM public.organization_members WHERE organization_id=$1 AND user_id=$2', [orgId,member])).rows[0].role, 'owner');
    assert.equal((await query('SELECT status FROM public.organization_enrollment_requests WHERE organization_id=$1', [orgId])).rows[0].status, 'approved');
    assert.equal((await query("SELECT count(*)::int AS n FROM public.audit_logs WHERE action='admin_create_user_organization'")).rows[0].n, 1);
  });
  await check('duplicate slug fails without leaving a pending enrollment', async () => {
    await assert.rejects(create(member,'test-company'), /taken/);
    assert.equal((await query("SELECT count(*)::int AS n FROM public.organization_enrollment_requests WHERE status='pending'")).rows[0].n,0);
  });
  const assign = (id, role) => query('SELECT public.admin_assign_organization_member($1,$2,$3)',[id,orgId,role]);
  await check('organization owner cannot be demoted', () => assert.rejects(assign(member,'agent'), /cannot be demoted/));
  await check('platform and owner roles cannot be assigned as membership', async () => {
    await assert.rejects(assign(other,'platform_admin'), /supported member role/);
    await assert.rejects(assign(other,'owner'), /supported member role/);
  });
  await check('updating role preserves existing scopes and does not duplicate membership', async () => {
    await assign(other,'agent');
    await query(`UPDATE public.organization_members SET scope_mode='properties', permissions='["read"]'::jsonb WHERE user_id=$1`,[other]);
    await assign(other,'finance_manager');
    const rows = (await query('SELECT role,scope_mode,permissions FROM public.organization_members WHERE user_id=$1',[other])).rows;
    assert.deepEqual(rows,[{role:'finance_manager',scope_mode:'properties',permissions:['read']}]);
  });
  await check('suspended organizations reject assignments', async () => {
    await query('UPDATE public.organizations SET suspended=true WHERE id=$1',[orgId]);
    await assert.rejects(assign(other,'agent'), /Reinstate/);
    await query('UPDATE public.organizations SET suspended=false WHERE id=$1',[orgId]);
  });
  await check('ordinary users cannot assign memberships', async () => {
    await actor(other); await assert.rejects(assign(other,'organization_admin'), /active platform admin/); await actor(admin);
  });
  await check('enrolled admin MFA must be completed', async () => {
    await query("INSERT INTO auth.mfa_factors VALUES ($1,'verified')",[admin]);
    await assert.rejects(assign(other,'agent'), /multi-factor/);
    await query("SELECT set_config('test.aal','aal2',false)");
    await assign(other,'agent');
  });
  await check('banned administrators cannot manage accounts', async () => {
    await query('UPDATE public.users SET banned=true WHERE id=$1',[admin]);
    await assert.rejects(assign(other,'manager'), /active platform admin/);
    await query('UPDATE public.users SET banned=false WHERE id=$1',[admin]);
  });
  const prepare = (id) => query('SELECT public.admin_prepare_account_deletion($1)',[id]);
  const complete = (id) => query('SELECT public.admin_complete_account_deletion($1)',[id]);
  await check('self deletion and organization owner deletion are rejected', async () => {
    await assert.rejects(prepare(admin), /own admin account/);
    await assert.rejects(prepare(member), /ownership/);
  });
  await check('another platform admin cannot be deleted', async () => {
    await query('UPDATE public.users SET is_platform_admin=true WHERE id=$1',[other]);
    await assert.rejects(prepare(other), /Remove platform admin/);
    await query('UPDATE public.users SET is_platform_admin=false WHERE id=$1',[other]);
  });
  await check('nonadmins cannot request or forge deletion state', async () => {
    await actor(member);
    await assert.rejects(prepare(other), /active platform admin/);
    await assert.rejects(query('UPDATE public.users SET account_deleted_at=now() WHERE id=$1',[other]), /active platform admin/);
    await actor(admin);
  });
  await check('pending deletion locks the account and cannot be undone by the ban toggle', async () => {
    await prepare(other);
    await assert.rejects(query('UPDATE public.users SET banned=false WHERE id=$1',[other]), /cannot be reactivated/);
    await assert.rejects(assign(other,'agent'), /active user/);
    await assert.rejects(complete(other), /has not completed/);
    await assert.rejects(query('UPDATE public.organizations SET owner_id=$1 WHERE id=$2',[other,orgId]), /cannot receive organization access/);
  });
  await check('completion retains business rows and retries do not duplicate audit events', async () => {
    await query('UPDATE auth.users SET deleted_at=now() WHERE id=$1',[other]);
    await complete(other); await prepare(other); await complete(other);
    assert.equal((await query('SELECT count(*)::int AS n FROM public.organization_members WHERE user_id=$1',[other])).rows[0].n,1);
    assert.equal((await query('SELECT account_deleted_at IS NOT NULL AS deleted FROM public.users WHERE id=$1',[other])).rows[0].deleted,true);
    assert.equal((await query("SELECT count(*)::int AS n FROM public.audit_logs WHERE action='account_deleted' AND target_id=$1",[other])).rows[0].n,1);
  });
  if(process.argv.includes('--control-plane')) {
    await db.exec(`
      GRANT USAGE ON SCHEMA public,private,auth,storage TO authenticated;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT SELECT ON storage.objects TO authenticated;
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_profile ON public.users FOR SELECT TO authenticated USING(id=auth.uid());
      ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
      CREATE POLICY members_read ON public.organization_members FOR SELECT TO authenticated USING(true);
      ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.organization_departments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tasks_legacy ON public.workspace_tasks FOR ALL TO authenticated USING(true) WITH CHECK(true);
      ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY storage_legacy ON storage.objects FOR SELECT TO authenticated USING(true);
    `);
    await db.exec(readFileSync(new URL('../../supabase/migrations/2026092303_account_access_enforcement.sql', import.meta.url),'utf8'));
    await db.exec(readFileSync(new URL('../../supabase/migrations/2026092304_scoped_administration.sql', import.meta.url),'utf8'));
    const finance='00000000-0000-0000-0000-000000000004', sales='00000000-0000-0000-0000-000000000005', staff='00000000-0000-0000-0000-000000000006';
    for(const id of [finance,sales,staff]) {
      await query('INSERT INTO auth.users(id) VALUES($1)',[id]);
      await query('INSERT INTO public.users(id,email) VALUES($1,$2)',[id,`${id}@example.test`]);
    }
    await query("INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'finance_manager'),($1,$3,'sales_manager'),($1,$4,'finance_officer')",[orgId,finance,sales,staff]);
    await query("INSERT INTO public.organization_departments(organization_id,department_key,name,head_user_id) VALUES($1,'finance','Finance',$2),($1,'sales','Sales',$3)",[orgId,finance,sales]);
    await query("INSERT INTO public.workspace_tasks(organization_id,assigned_to,created_by,title,status) VALUES($1,$2,$2,'Finance task','open'),($1,$3,$3,'Sales task','open')",[orgId,finance,sales]);
    await check('department head cannot change or remove a different department member',async()=>{
      await actor(finance); await query('SET ROLE authenticated');
      await query("UPDATE public.organization_members SET role='finance_officer' WHERE user_id=$1",[sales]);
      await query('DELETE FROM public.organization_members WHERE user_id=$1',[sales]);
      await query('RESET ROLE');
      assert.equal((await query('SELECT role FROM public.organization_members WHERE user_id=$1',[sales])).rows[0].role,'sales_manager');
    });
    await check('department head can change own section role but not privilege overrides',async()=>{
      await query('SET ROLE authenticated');
      await query("UPDATE public.organization_members SET role='collections_officer' WHERE user_id=$1",[staff]);
      await assert.rejects(query(`UPDATE public.organization_members SET permissions='["team:manage"]' WHERE user_id=$1`,[staff]),/custom permissions/);
      await query('RESET ROLE');
      assert.equal((await query('SELECT role FROM public.organization_members WHERE user_id=$1',[staff])).rows[0].role,'collections_officer');
    });
    await check('task and activity RLS hide other departments from a department head',async()=>{
      await query('SET ROLE authenticated');
      assert.deepEqual((await query('SELECT title FROM public.workspace_tasks ORDER BY title')).rows,[{title:'Finance task'}]);
      const rows=(await query('SELECT department_key FROM public.platform_activity')).rows;
      assert(rows.every(r=>r.department_key==='finance'));
      await query('RESET ROLE');
    });
    await check('platform admin sees all sections and organization admins have all permission domains',async()=>{
      await actor(admin); await query('SET ROLE authenticated');
      assert.equal((await query('SELECT * FROM public.workspace_tasks')).rows.length,2);
      assert.equal((await query("SELECT private.workspace_role_has_permission('organization_admin','finance:write') AS allowed")).rows[0].allowed,true);
      assert.equal((await query("SELECT private.workspace_role_has_permission('unrecognized','finance:write') AS allowed")).rows[0].allowed,false);
      await query('RESET ROLE');
    });
    await check('ownership transfer changes owner atomically and preserves the former owner as admin',async()=>{
      await query('UPDATE public.users SET verified=true WHERE id=$1',[staff]);
      await query('SELECT public.admin_transfer_organization_ownership($1,$2)',[orgId,staff]);
      assert.equal((await query('SELECT owner_id FROM public.organizations WHERE id=$1',[orgId])).rows[0].owner_id,staff);
      assert.equal((await query('SELECT role FROM public.organization_members WHERE organization_id=$1 AND user_id=$2',[orgId,member])).rows[0].role,'organization_admin');
      assert.equal((await query('SELECT role FROM public.organization_members WHERE organization_id=$1 AND user_id=$2',[orgId,staff])).rows[0].role,'owner');
    });
    await check('blocking revokes sessions, refresh tokens, REST pre-request access and Storage reads',async()=>{
      await query("INSERT INTO public.organization_api_keys(created_by,status) VALUES($1,'active')",[finance]);
      await query('INSERT INTO public.external_access_grants(created_by) VALUES($1)',[finance]);
      await query('INSERT INTO auth.sessions(user_id) VALUES($1)',[finance]);
      await query('INSERT INTO auth.refresh_tokens VALUES(1,$1)',[finance]);
      await query('INSERT INTO storage.objects(owner_id) VALUES($1)',[finance]);
      await query('UPDATE public.users SET banned=true WHERE id=$1',[finance]);
      assert.equal((await query('SELECT status FROM public.organization_api_keys WHERE created_by=$1',[finance])).rows[0].status,'revoked');
      assert((await query('SELECT revoked_at FROM public.external_access_grants WHERE created_by=$1',[finance])).rows[0].revoked_at);
      assert.equal((await query('SELECT * FROM auth.sessions WHERE user_id=$1',[finance])).rows.length,0);
      assert.equal((await query('SELECT * FROM auth.refresh_tokens WHERE user_id=$1',[finance])).rows.length,0);
      await actor(finance); await query('SET ROLE authenticated');
      await assert.rejects(query('SELECT public.enforce_account_access()'),/revoked/);
      assert.equal((await query('SELECT * FROM public.workspace_tasks')).rows.length,0);
      assert.equal((await query('SELECT * FROM storage.objects')).rows.length,0);
      await query('RESET ROLE');
    });
  }
  console.log(`${passed} isolated PostgreSQL checks passed. Reduced schema; not live RLS/deployment proof.`);
} finally { await db.close(); }
