// Real, isolated PostgreSQL tests. Does not connect to the deployed database.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin='00000000-0000-0000-0000-000000000001', member='00000000-0000-0000-0000-000000000002', other='00000000-0000-0000-0000-000000000003';
let passed=0;
const q=(sql,params=[])=>db.query(sql,params);
const actor=async(id,aal='aal2')=>{await q("SELECT set_config('test.uid',$1,false),set_config('test.aal',$2,false)",[id,aal]);};
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const document={hero:{eyebrow:'Property operations',title:'Every property.',secondLine:'One clear picture.',description:'Connected portfolio operations.',images:['residences','interior','community','architecture','commercial']},seo:{title:'BaytMiftah',description:'Property operations'},faq:[{q:'How do I start?',a:'Create an account.'}],finalCta:{title:'Get started',description:'Create a workspace.'},sections:[]};
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE SCHEMA private;
    ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('aal',current_setting('test.aal',true))$$;
    CREATE TABLE public.users(id uuid PRIMARY KEY, role text DEFAULT 'consumer', email text, banned boolean DEFAULT false, is_platform_admin boolean DEFAULT false,is_platform_manager boolean DEFAULT false,platform_console_grants text[] DEFAULT '{}',updated_at timestamptz,account_deleted_at timestamptz,account_deletion_requested_at timestamptz);
    CREATE TABLE public.organization_members(user_id uuid, organization_id uuid, role text);
    CREATE TABLE public.audit_logs(admin_id uuid,action text,target_type text,target_id text,details jsonb);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT is_platform_admin AND NOT banned FROM public.users WHERE id=auth.uid()),false)$$;
    INSERT INTO public.users(id,email,is_platform_admin) VALUES('${admin}','admin@example.test',true),('${member}','member@example.test',false),('${other}','other@example.test',false);
    INSERT INTO public.organization_members VALUES('${member}','00000000-0000-0000-0000-000000000004','finance');
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
    GRANT SELECT,UPDATE ON public.users TO authenticated;
  `);
  const guard=readFileSync('supabase/migrations/2026092704_harden_document_admin_and_activity_controls.sql','utf8');
  await db.exec(guard.slice(guard.indexOf('CREATE OR REPLACE FUNCTION private.require_account_admin'),guard.indexOf('CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns')));
  await db.exec(readFileSync('supabase/migrations/2026101101_marketing_editor_and_app_roles.sql','utf8').replace(/^\uFEFF/,''));
  await db.exec(readFileSync('supabase/migrations/2026101102_marketing_app_roles_rpc_acl.sql','utf8'));
  await check('Supabase default grants do not expose admin publishing or role RPCs to anonymous visitors',async()=>{
    const rows=(await q("SELECT proname,has_function_privilege('anon',p.oid,'EXECUTE') AS allowed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname IN ('admin_assign_platform_role','admin_save_platform_role','admin_delete_platform_role','admin_save_marketing_draft','admin_publish_marketing_page')")).rows;
    assert.equal(rows.length,5);assert.ok(rows.every(row=>!row.allowed));
  });
  await actor(admin);
  const roleId=(await q("SELECT public.admin_save_platform_role(NULL,'Support specialist','App-wide support',ARRAY['support','users'],0) AS id")).rows[0].id;
  await check('assigning a named role synchronizes grants without altering organization roles',async()=>{
    await q('SELECT public.admin_assign_platform_role($1,$2)',[member,roleId]);
    const row=(await q('SELECT * FROM public.users WHERE id=$1',[member])).rows[0];
    assert.equal(row.platform_role_id,roleId); assert.equal(row.role,'consumer'); assert.equal(row.is_platform_manager,true); assert.deepEqual(row.platform_console_grants,['support','users']);
    assert.equal((await q('SELECT role FROM public.organization_members WHERE user_id=$1',[member])).rows[0].role,'finance');
  });
  await check('editing role permissions propagates to assigned users atomically',async()=>{
    await q("SELECT public.admin_save_platform_role($1,'Support specialist','Support only',ARRAY['support'],1)",[roleId]);
    assert.deepEqual((await q('SELECT platform_console_grants FROM public.users WHERE id=$1',[member])).rows[0].platform_console_grants,['support']);
    await assert.rejects(q("SELECT public.admin_save_platform_role($1,'Stale edit','',ARRAY['revenue'],1)",[roleId]),/Reload/);
    assert.deepEqual((await q('SELECT platform_console_grants FROM public.users WHERE id=$1',[member])).rows[0].platform_console_grants,['support']);
  });
  await check('assigned roles cannot be deleted, and removal revokes grants',async()=>{
    await assert.rejects(q('SELECT public.admin_delete_platform_role($1,2)',[roleId]),/assignments/);
    await q('SELECT public.admin_assign_platform_role($1,NULL)',[member]);
    const row=(await q('SELECT * FROM public.users WHERE id=$1',[member])).rows[0];assert.equal(row.platform_role_id,null);assert.equal(row.is_platform_manager,false);assert.deepEqual(row.platform_console_grants,[]);
  });
  await check('direct grants detach named roles and are not overridden by later role edits',async()=>{
    await q('SELECT public.admin_assign_platform_role($1,$2)',[member,roleId]);
    await q("SELECT public.admin_set_user_platform_access($1,false,ARRAY['trust'])",[member]);
    await q("SELECT public.admin_save_platform_role($1,'Support specialist','',ARRAY['support','users'],2)",[roleId]);
    const row=(await q('SELECT * FROM public.users WHERE id=$1',[member])).rows[0];assert.equal(row.platform_role_id,null);assert.deepEqual(row.platform_console_grants,['trust']);
  });
  await check('self-assignment, banned users, deleted users and unsupported permissions are rejected',async()=>{
    await assert.rejects(q('SELECT public.admin_assign_platform_role($1,$2)',[admin,roleId]),/own app role/);
    await q('UPDATE public.users SET banned=true WHERE id=$1',[other]);
    await assert.rejects(q('SELECT public.admin_assign_platform_role($1,$2)',[other,roleId]),/active user/);
    await assert.rejects(q("SELECT public.admin_save_platform_role(NULL,'Invalid','',ARRAY['superadmin'],0)"),/supported/);
    await assert.rejects(q("SELECT public.admin_save_platform_role(NULL,'Invalid','',ARRAY[NULL]::text[],0)"),/supported/);
    await q('UPDATE public.users SET banned=false,account_deleted_at=now() WHERE id=$1',[other]);
    await assert.rejects(q('SELECT public.admin_assign_platform_role($1,$2)',[other,roleId]),/active user/);
  });
  await check('account deletion removes the role link and prevents later definition edits from regranting access',async()=>{
    await q('SELECT public.admin_assign_platform_role($1,$2)',[member,roleId]);
    await q("UPDATE public.users SET account_deletion_requested_at=now(),platform_console_grants='{}',is_platform_manager=false WHERE id=$1",[member]);
    assert.equal((await q('SELECT platform_role_id FROM public.users WHERE id=$1',[member])).rows[0].platform_role_id,null);
    await q("SELECT public.admin_save_platform_role($1,'Support specialist','',ARRAY['support'],3)",[roleId]);
    assert.deepEqual((await q('SELECT platform_console_grants FROM public.users WHERE id=$1',[member])).rows[0].platform_console_grants,[]);
    await q('UPDATE public.users SET account_deletion_requested_at=NULL WHERE id=$1',[member]);
  });
  await check('delegates cannot create roles, publish marketing, or forge a user role link',async()=>{
    await actor(member);await db.exec('SET ROLE authenticated');
    await assert.rejects(q("SELECT public.admin_save_platform_role(NULL,'Escalation','',ARRAY['revenue'],0)"),/active platform admin/);
    await assert.rejects(q('SELECT public.admin_publish_marketing_page(0)'),/active platform admin/);
    await assert.rejects(q('UPDATE public.users SET platform_role_id=$1 WHERE id=$2',[roleId,member]),/active platform admin/);
    assert.equal((await q('SELECT * FROM public.platform_roles')).rows.length,0);
    assert.equal((await q('SELECT * FROM public.marketing_page_drafts')).rows.length,0);
    await db.exec('RESET ROLE');
  });
  await check('admin changes require MFA, even without enrolled factors',async()=>{
    await actor(admin,'aal1');await assert.rejects(q("SELECT public.admin_save_platform_role(NULL,'No MFA','',ARRAY['support'],0)"),/multi-factor/);
    await assert.rejects(q('SELECT public.admin_save_marketing_draft($1,0)',[document]),/multi-factor/);
    await actor(admin);
  });
  await check('saving a marketing draft does not publish it',async()=>{
    assert.equal((await q('SELECT public.admin_save_marketing_draft($1,0) AS revision',[document])).rows[0].revision,1);
    assert.equal((await q('SELECT * FROM public.marketing_page_published')).rows.length,0);
    await assert.rejects(q('SELECT public.admin_save_marketing_draft($1,0)',[document]),/Reload/);
  });
  await check('invalid images and empty FAQ bodies are rejected on the server',async()=>{
    const invalid=structuredClone(document);invalid.hero.images[0]='https://example.test/injected.svg';
    await assert.rejects(q('SELECT public.admin_save_marketing_draft($1,1)',[invalid]),/licensed photos/);
    invalid.hero.images=[...document.hero.images];invalid.faq[0].a='';
    await assert.rejects(q('SELECT public.admin_save_marketing_draft($1,1)',[invalid]),/FAQ text/);
  });
  await check('publishing checks revision and exposes only published content to anonymous visitors',async()=>{
    await assert.rejects(q('SELECT public.admin_publish_marketing_page(0)'),/Reload/);
    await q('SELECT public.admin_publish_marketing_page(1)');
    await db.exec('SET ROLE anon');assert.deepEqual((await q('SELECT document FROM public.marketing_page_published')).rows[0].document,document);
    await assert.rejects(q('SELECT * FROM public.marketing_page_drafts'),/permission denied/);
    await assert.rejects(q("UPDATE public.marketing_page_published SET document='{}'"),/permission denied/);
    await db.exec('RESET ROLE');
  });
  await check('deleting an unassigned role and publishing changes leave an audit trail',async()=>{
    await actor(admin);await q('SELECT public.admin_delete_platform_role($1,4)',[roleId]);
    const actions=(await q('SELECT action FROM public.audit_logs')).rows.map(row=>row.action);
    for(const action of ['admin_save_platform_role','admin_assign_platform_role','admin_delete_platform_role','admin_save_marketing_draft','admin_publish_marketing_page'])assert(actions.includes(action));
  });
  console.log(`${passed} app-role and marketing PostgreSQL checks passed.`);
} finally {await db.close();}
