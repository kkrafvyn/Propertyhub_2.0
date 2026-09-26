// Runs the production SQL against an isolated PostgreSQL fixture; no live data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [owner,other,admin,org,foreignOrg,a,b,estateA,estateB,foreignEstate,agreementA,agreementB] = [1,2,3,10,11,20,21,30,31,32,40,41].map(id);
const at = '2026-09-24T10:00:00Z';
const query = (sql,params=[]) => db.query(sql,params);
const migration = name => readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8');
const functionSql = (name,file) => {
  const text=migration(file),start=text.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start>=0);
  return text.slice(start,text.indexOf('$$;',start)+3);
};
const actor = user => query("SELECT set_config('test.uid',$1,false)",[user]);
const page = async (property=null,limit=40,cursor=null,user=owner) => (await query(
  'SELECT * FROM public.get_owner_property_activity_page($1,$2,$3,$4,$5)',
  [user,property,limit,cursor?.created_at??null,cursor?.id??null])).rows;
let passed=0;
const reset = async () => {
  await db.exec(`RESET ROLE;
    DELETE FROM public.estate_owner_statement_runs; DELETE FROM public.estate_issues;
    DELETE FROM public.estate_work_orders; DELETE FROM public.owner_expense_approvals;
    UPDATE public.users SET banned=false; UPDATE public.organizations SET suspended=false;
    UPDATE public.property_management_agreements SET status='active',permissions='{}';
    DELETE FROM public.organization_members; INSERT INTO public.organization_members VALUES('${org}','${owner}','properties');
    DELETE FROM public.organization_member_property_scopes;
    INSERT INTO public.organization_member_property_scopes VALUES('${org}','${owner}','${a}'),('${org}','${owner}','${b}');
    SET ROLE authenticated;`);
  await actor(owner);
};
const check = async (name,fn) => { await reset(); await fn(); passed++; console.log(`PASS ${name}`); };
const issue = (estate=estateA,n=50,time=at) => query('INSERT INTO public.estate_issues(id,estate_id,title,status,created_at) VALUES($1,$2,\'Maintenance\',\'open\',$3)',[id(n),estate,time]);
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA private; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE public.users(id uuid PRIMARY KEY,banned boolean DEFAULT false,account_deletion_requested_at timestamptz,account_deleted_at timestamptz,is_platform_admin boolean DEFAULT false);
    CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY,suspended boolean DEFAULT false);
    CREATE TABLE public.properties(id uuid PRIMARY KEY,organization_id uuid);
    CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,scope_mode text);
    CREATE TABLE public.organization_member_property_scopes(organization_id uuid,user_id uuid,property_id uuid);
    CREATE TABLE public.organization_units(id uuid PRIMARY KEY,organization_id uuid);
    CREATE TABLE public.organization_member_unit_scopes(organization_id uuid,user_id uuid,unit_id uuid);
    CREATE TABLE public.organization_unit_properties(organization_unit_id uuid,property_id uuid);
    CREATE TABLE public.managed_estates(id uuid PRIMARY KEY,organization_id uuid,property_id uuid,currency text DEFAULT 'GHS');
    CREATE TABLE public.property_management_agreements(id uuid PRIMARY KEY,owner_user_id uuid,property_id uuid,managing_organization_id uuid,status text,permissions jsonb);
    CREATE TABLE public.estate_issues(id uuid PRIMARY KEY,estate_id uuid,title text,status text,priority text,created_at timestamptz);
    CREATE TABLE public.estate_work_orders(id uuid PRIMARY KEY,estate_id uuid,status text,notes text,actual_cost_minor bigint,estimated_cost_minor bigint,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE public.estate_owner_statement_runs(id uuid PRIMARY KEY,estate_id uuid,owner_user_id uuid,status text,period_start date,period_end date,net_distributable_minor bigint,currency text,created_at timestamptz);
    CREATE TABLE public.owner_expense_approvals(id uuid PRIMARY KEY,agreement_id uuid,owner_user_id uuid,organization_id uuid,property_id uuid,title text,description text,amount_minor bigint,currency text,status text,created_at timestamptz);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()),false) $$;
    INSERT INTO public.users(id,is_platform_admin) VALUES('${owner}',false),('${other}',false),('${admin}',true);
    INSERT INTO auth.users(id) SELECT id FROM public.users;
    INSERT INTO public.organizations(id) VALUES('${org}'),('${foreignOrg}');
    INSERT INTO public.properties VALUES('${a}','${org}'),('${b}','${org}');
    INSERT INTO public.managed_estates(id,organization_id,property_id) VALUES('${estateA}','${org}','${a}'),('${estateB}','${org}','${b}'),('${foreignEstate}','${foreignOrg}','${a}');
    INSERT INTO public.property_management_agreements VALUES('${agreementA}','${owner}','${a}','${org}','active','{}'),('${agreementB}','${owner}','${b}','${org}','active','{}');
    GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
  `);
  await db.exec(functionSql('private.account_access_allowed','2026092303_account_access_enforcement.sql'));
  await db.exec(functionSql('private.owner_has_property_scope','2026092403_owner_digests.sql'));
  await db.exec(migration('2026092408_owner_activity.sql'));

  await check('cursor returns all 103 events once when many share a timestamp',async () => {
    for(let n=100;n<202;n++) await issue(estateA,n);
    await issue(estateA,202,'2026-09-23T10:00:00Z');
    const first=await page(a,40),second=await page(a,40,first.at(-1)),third=await page(a,40,second.at(-1));
    assert.equal(first.length,40); assert.equal(second.length,40); assert.equal(third.length,23);
    assert.equal(new Set([...first,...second,...third].map(row=>row.id)).size,103);
    assert.equal((await page(a,40,third.at(-1))).length,0);
    assert.ok(first[0].id>first[1].id);
  });
  await check('statements bind to their actual property once and exclude drafts',async () => {
    await query('INSERT INTO public.estate_owner_statement_runs VALUES($1,$2,$3,\'approved\',\'2026-09-01\',\'2026-09-30\',123,\'GHS\',$4)',[id(60),estateB,owner,at]);
    assert.equal((await page(a)).length,0);
    assert.equal((await page()).length,1);
    assert.equal((await page(b))[0].property_id,b);
    await query("UPDATE public.estate_owner_statement_runs SET status='draft'");
    assert.equal((await page()).length,0);
  });
  await check('property filtering covers maintenance and excludes mismatched organizations',async () => {
    await issue(); await issue(estateB,51); await issue(foreignEstate,52);
    assert.equal((await page()).length,2);
    assert.deepEqual((await page(a)).map(row=>row.property_id),[a]);
  });
  await check('approval agreement, property, organization and permission boundaries are enforced',async () => {
    await query('INSERT INTO public.owner_expense_approvals VALUES($1,$2,$3,$4,$5,\'Expense\',NULL,123,\'GHS\',\'pending\',$6)',[id(60),agreementA,owner,org,a,at]);
    assert.equal((await page()).length,1);
    await query('UPDATE public.owner_expense_approvals SET organization_id=$1',[foreignOrg]); assert.equal((await page()).length,0);
    await query('UPDATE public.owner_expense_approvals SET organization_id=$1,property_id=$2',[org,b]); assert.equal((await page()).length,0);
    await query('UPDATE public.owner_expense_approvals SET property_id=NULL'); assert.equal((await page())[0].property_id,a);
    await query('UPDATE public.property_management_agreements SET permissions=$1',[{approve_expenses:false}]); assert.equal((await page()).length,0);
  });
  await check('maintenance permission suppresses issues and actual work-order cost takes precedence',async () => {
    await issue();
    await query('INSERT INTO public.estate_work_orders VALUES($1,$2,\'completed\',NULL,0,999,$3,$3)',[id(60),estateA,at]);
    assert.equal((await page()).find(row=>row.event_type==='contractor').amount_minor,0);
    await query('UPDATE public.property_management_agreements SET permissions=$1',[{view_maintenance:'invalid'}]);
    assert.equal((await page()).length,0);
  });
  await check('revoked membership and property scopes prevent definer access',async () => {
    await issue(); await query('DELETE FROM public.organization_member_property_scopes'); assert.equal((await page()).length,0);
    await query("UPDATE public.organization_members SET scope_mode='organization'"); assert.equal((await page()).length,1);
    await query('DELETE FROM public.organization_members'); assert.equal((await page()).length,0);
  });
  await check('ended agreements and suspended organizations disappear immediately',async () => {
    await issue(); await query("UPDATE public.property_management_agreements SET status='ended'"); assert.equal((await page()).length,0);
    await query("UPDATE public.property_management_agreements SET status='active'");
    await query('UPDATE public.organizations SET suspended=true'); assert.equal((await page()).length,0);
  });
  await check('other users cannot impersonate an owner but active platform admins can inspect',async () => {
    await issue(); await actor(other); await assert.rejects(page(),/Not authorized/);
    await actor(admin); assert.equal((await page()).length,1);
    await query('UPDATE public.users SET banned=true WHERE id=$1',[admin]);
    await assert.rejects(page(),/active authenticated/);
  });
  await check('legacy API shares boundaries and malformed cursors fail clearly',async () => {
    await issue();
    assert.equal((await query('SELECT * FROM public.get_owner_property_activity($1,$2,$3)',[owner,a,40])).rows.length,1);
    await query('DELETE FROM public.organization_members');
    assert.equal((await query('SELECT * FROM public.get_owner_property_activity($1,$2,$3)',[owner,a,40])).rows.length,0);
    await assert.rejects(query('SELECT * FROM public.get_owner_property_activity_page($1,NULL,40,$2,NULL)',[owner,at]),/required together/);
    await db.exec('RESET ROLE; SET ROLE anon'); await assert.rejects(page(),/permission denied/);
  });
  console.log(`${passed} owner-activity PostgreSQL checks passed.`);
} finally { await db.close(); }
