// Isolated PostgreSQL tests: no credentials, live database or message providers.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [owner, other, admin] = [1,2,3].map(id);
const [org, foreignOrg, property, foreignProperty, estate, agreement] = [10,11,20,21,30,40].map(id);
const query = (sql, params=[]) => db.query(sql,params);
const run = async (at='2026-03-09T12:00:00Z') => (await query('SELECT public.deliver_owner_digests($1) AS sent',[at])).rows[0].sent;
const receipt = async () => (await query('SELECT *,extract(epoch FROM period_end-period_start)/3600 AS hours FROM public.owner_digest_deliveries ORDER BY created_at')).rows[0];
const reset = async () => db.exec(`
  RESET ROLE;
  DELETE FROM public.owner_digest_deliveries; DELETE FROM public.notification_logs;
  DELETE FROM public.owner_expense_approvals; DELETE FROM public.estate_work_orders;
  DELETE FROM public.property_management_agreements WHERE id<>'${agreement}';
  UPDATE public.property_management_agreements SET status='active',permissions='{}',reporting_cadence='daily_digest';
  UPDATE public.owner_oversight_notification_prefs SET daily_digest=true,weekly_digest=false,digest_timezone='America/New_York';
  UPDATE public.users SET banned=false,account_deleted_at=NULL,account_deletion_requested_at=NULL;
  UPDATE auth.users SET deleted_at=NULL,banned_until=NULL;
  UPDATE public.organizations SET suspended=false;
  UPDATE public.notification_preferences SET in_app_enabled=true,notification_frequency='daily';
  DELETE FROM public.organization_members;
  INSERT INTO public.organization_members VALUES('${org}','${owner}','properties');
  DELETE FROM public.organization_member_property_scopes;
  INSERT INTO public.organization_member_property_scopes VALUES('${org}','${owner}','${property}');
  DELETE FROM public.organization_member_unit_scopes;
  SELECT set_config('test.uid','',false);
  SET ROLE service_role;
`);
let passed=0;
const check = async (name, fn) => { await reset(); await fn(); passed++; console.log(`PASS ${name}`); };
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA private;
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
    CREATE TABLE public.managed_estates(id uuid PRIMARY KEY,organization_id uuid,property_id uuid);
    CREATE TABLE public.property_management_agreements(id uuid PRIMARY KEY,owner_user_id uuid,property_id uuid,managing_organization_id uuid,status text,reporting_cadence text,permissions jsonb);
    CREATE TABLE public.estate_work_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),estate_id uuid,updated_at timestamptz,created_at timestamptz);
    CREATE TABLE public.owner_expense_approvals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agreement_id uuid,owner_user_id uuid,organization_id uuid,property_id uuid,created_at timestamptz,status text);
    CREATE TABLE public.owner_oversight_notification_prefs(user_id uuid PRIMARY KEY,daily_digest boolean,weekly_digest boolean);
    CREATE TABLE public.notification_preferences(user_id uuid PRIMARY KEY,in_app_enabled boolean,notification_frequency text);
    CREATE TABLE public.notification_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,notification_type text,channel text,subject text,content text,delivered boolean,
      delivered_at timestamptz,action_url text,notification_category text);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
      SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()),false) $$;
    CREATE FUNCTION private.record_platform_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN coalesce(NEW,OLD); END $$;
    INSERT INTO public.users(id,is_platform_admin) VALUES('${owner}',false),('${other}',false),('${admin}',true);
    INSERT INTO auth.users(id) SELECT id FROM public.users;
    INSERT INTO public.organizations VALUES('${org}',false),('${foreignOrg}',false);
    INSERT INTO public.properties VALUES('${property}','${org}'),('${foreignProperty}','${foreignOrg}');
    INSERT INTO public.managed_estates VALUES('${estate}','${org}','${property}'),('${id(31)}','${foreignOrg}','${property}');
    INSERT INTO public.property_management_agreements VALUES('${agreement}','${owner}','${property}','${org}','active','daily_digest','{}');
    INSERT INTO public.owner_oversight_notification_prefs VALUES('${owner}',true,false);
    INSERT INTO public.notification_preferences VALUES('${owner}',true,'daily');
    GRANT USAGE ON SCHEMA public,private,auth TO authenticated,anon,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public,auth TO service_role;
  `);
  const accountMigration=readFileSync(new URL('../../supabase/migrations/2026092303_account_access_enforcement.sql',import.meta.url),'utf8');
  const start=accountMigration.indexOf('CREATE OR REPLACE FUNCTION private.account_access_allowed(');
  await db.exec(accountMigration.slice(start,accountMigration.indexOf('$$;',start)+3));
  await db.exec(readFileSync(new URL('../../supabase/migrations/2026092403_owner_digests.sql',import.meta.url),'utf8'));

  await check('spring DST previous day is 23 hours bounded by local midnights',async () => {
    assert.equal(await run(),1);
    const row=await receipt();
    assert.equal(new Date(row.period_start).toISOString(),'2026-03-08T05:00:00.000Z');
    assert.equal(new Date(row.period_end).toISOString(),'2026-03-09T04:00:00.000Z');
    assert.equal(Number(row.hours),23);
  });
  await check('autumn DST previous day is 25 hours',async () => {
    assert.equal(await run('2026-11-02T12:00:00Z'),1);
    assert.equal(Number((await receipt()).hours),25);
  });
  await check('weekly report covers the previous complete Monday-to-Monday local week',async () => {
    await query("UPDATE public.owner_oversight_notification_prefs SET daily_digest=false,weekly_digest=true");
    await query("UPDATE public.property_management_agreements SET reporting_cadence='weekly'");
    assert.equal(await run('2026-03-11T12:00:00Z'),1);
    const row=await receipt();
    assert.equal(new Date(row.period_start).toISOString(),'2026-03-02T05:00:00.000Z');
    assert.equal(new Date(row.period_end).toISOString(),'2026-03-09T04:00:00.000Z');
    assert.equal(Number(row.hours),167);
    assert.equal(await run('2026-03-15T12:00:00Z'),0);
  });
  await check('fractional time zones use local calendar boundaries',async () => {
    await query("UPDATE public.owner_oversight_notification_prefs SET digest_timezone='Asia/Kathmandu'");
    assert.equal(await run('2026-09-24T00:00:00Z'),1);
    const row=await receipt();
    assert.equal(new Date(row.period_start).toISOString(),'2026-09-22T18:15:00.000Z');
    assert.equal(new Date(row.period_end).toISOString(),'2026-09-23T18:15:00.000Z');
  });
  await check('actual reporting windows include the start and exclude the end',async () => {
    for(const at of ['2026-03-08T04:59:59.999Z','2026-03-08T05:00:00Z','2026-03-09T03:59:59.999Z','2026-03-09T04:00:00Z']) {
      await query('INSERT INTO public.estate_work_orders(estate_id,updated_at,created_at) VALUES($1,$2,$2)',[estate,at]);
      await query("INSERT INTO public.owner_expense_approvals(agreement_id,owner_user_id,organization_id,property_id,created_at,status) VALUES($1,$2,$3,$4,$5,'pending')",[agreement,owner,org,property,at]);
    }
    await run();
    const log=(await query('SELECT content FROM public.notification_logs')).rows[0];
    assert.match(log.content,/2 work orders last updated, 2 expense requests created. Currently 4 pending approvals/);
  });
  await check('owner and global notification opt-outs suppress delivery',async () => {
    await query('UPDATE public.owner_oversight_notification_prefs SET daily_digest=false,weekly_digest=false');
    assert.equal(await run(),0);
    await query('UPDATE public.owner_oversight_notification_prefs SET daily_digest=true');
    await query('UPDATE public.notification_preferences SET in_app_enabled=false');
    assert.equal(await run(),0);
    await query("UPDATE public.notification_preferences SET in_app_enabled=true,notification_frequency='never'");
    assert.equal(await run(),0);
    assert.equal((await query('SELECT * FROM public.notification_logs')).rows.length,0);
  });
  await check('agreement cadence is respected separately from owner preference',async () => {
    await query("UPDATE public.property_management_agreements SET reporting_cadence='weekly'");
    assert.equal(await run(),0);
    await query('UPDATE public.owner_oversight_notification_prefs SET weekly_digest=true');
    assert.equal(await run(),1);
    assert.equal((await receipt()).cadence,'weekly');
  });
  await check('retries, parallel submissions and a time-zone change deduplicate a local period',async () => {
    const counts=await Promise.all([run(),run(),run()]);
    assert.equal(counts.reduce((a,b)=>a+b,0),1);
    await query("UPDATE public.owner_oversight_notification_prefs SET digest_timezone='Europe/London'");
    assert.equal(await run(),0);
    assert.equal((await query('SELECT * FROM public.notification_logs')).rows.length,1);
    assert.equal((await query('SELECT * FROM public.owner_digest_deliveries')).rows.length,1);
  });
  await check('unrelated estates, expenses and mismatched organization rows cannot affect a digest',async () => {
    await query('INSERT INTO public.estate_work_orders(estate_id,created_at) VALUES($1,$2)',[id(31),'2026-03-08T12:00:00Z']);
    await query("INSERT INTO public.owner_expense_approvals(agreement_id,owner_user_id,organization_id,property_id,created_at,status) VALUES($1,$2,$3,$4,$5,'pending')",[agreement,owner,foreignOrg,property,'2026-03-08T12:00:00Z']);
    await query("INSERT INTO public.owner_expense_approvals(agreement_id,owner_user_id,organization_id,property_id,created_at,status) VALUES($1,$2,$3,$4,$5,'pending')",[agreement,owner,org,foreignProperty,'2026-03-08T12:00:00Z']);
    await query("INSERT INTO public.property_management_agreements VALUES($1,$2,$3,$4,'active','daily_digest','{}')",[id(41),owner,foreignProperty,org]);
    await run();
    assert.match((await query('SELECT content FROM public.notification_logs')).rows[0].content,/0 work orders last updated, 0 expense requests created. Currently 0 pending approvals/);
  });
  await check('disabled or malformed agreement permissions suppress protected counts',async () => {
    await query('INSERT INTO public.estate_work_orders(estate_id,created_at) VALUES($1,$2)',[estate,'2026-03-08T12:00:00Z']);
    await query("INSERT INTO public.owner_expense_approvals(agreement_id,owner_user_id,organization_id,property_id,created_at,status) VALUES($1,$2,$3,$4,$5,'pending')",[agreement,owner,org,property,'2026-03-08T12:00:00Z']);
    await query("UPDATE public.property_management_agreements SET permissions='{" + '"view_maintenance":false,"approve_expenses":"malformed"' + "}'");
    await run();
    assert.match((await query('SELECT content FROM public.notification_logs')).rows[0].content,/0 work orders last updated, 0 expense requests created. Currently 0 pending approvals/);
  });
  await check('blocked/deleted accounts, ended agreements and suspended organizations receive no digest',async () => {
    for(const [sql,clear] of [
      ['UPDATE public.users SET banned=true','UPDATE public.users SET banned=false'],
      ['UPDATE public.users SET account_deletion_requested_at=NOW()','UPDATE public.users SET account_deletion_requested_at=NULL'],
      ['UPDATE auth.users SET banned_until=NOW()+INTERVAL \'1 day\'','UPDATE auth.users SET banned_until=NULL'],
      ['UPDATE auth.users SET deleted_at=NOW()','UPDATE auth.users SET deleted_at=NULL'],
      ["UPDATE public.property_management_agreements SET status='ended'","UPDATE public.property_management_agreements SET status='active'"],
      ['UPDATE public.organizations SET suspended=true','UPDATE public.organizations SET suspended=false'],
    ]) { await query(sql); assert.equal(await run(),0); await query(clear); }
  });
  await check('a receipt failure rolls back its notification and a retry delivers once',async () => {
    await db.exec(`RESET ROLE; CREATE FUNCTION public.reject_digest_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt failure'; END $$;
      CREATE TRIGGER reject_digest_receipt BEFORE INSERT ON public.owner_digest_deliveries FOR EACH ROW EXECUTE FUNCTION public.reject_digest_receipt(); SET ROLE service_role;`);
    await assert.rejects(run(),/injected receipt failure/);
    assert.equal((await query('SELECT * FROM public.notification_logs')).rows.length,0);
    await db.exec('RESET ROLE; DROP TRIGGER reject_digest_receipt ON public.owner_digest_deliveries; SET ROLE service_role;');
    assert.equal(await run(),1); assert.equal(await run(),0);
  });
  await check('revoked membership or property access suppresses delivery despite active agreement',async () => {
    await query('DELETE FROM public.organization_members');
    assert.equal(await run(),0);
    await query("INSERT INTO public.organization_members VALUES($1,$2,'properties')",[org,owner]);
    await query('DELETE FROM public.organization_member_property_scopes');
    assert.equal(await run(),0);
    await query("UPDATE public.organization_members SET scope_mode='assigned_work'");
    assert.equal(await run(),0);
    await query("UPDATE public.organization_members SET scope_mode='organization'");
    assert.equal(await run(),1);
  });
  await check('valid unit scopes grant access but foreign organization units do not',async () => {
    await query('DELETE FROM public.organization_member_property_scopes');
    await query('INSERT INTO public.organization_units VALUES($1,$2)',[id(60),foreignOrg]);
    await query('INSERT INTO public.organization_member_unit_scopes VALUES($1,$2,$3)',[org,owner,id(60)]);
    await query('INSERT INTO public.organization_unit_properties VALUES($1,$2)',[id(60),property]);
    assert.equal(await run(),0);
    await query('UPDATE public.organization_units SET organization_id=$1',[org]);
    assert.equal(await run(),1);
  });
  await check('invalid time zones and null run times fail clearly',async () => {
    await assert.rejects(query("UPDATE public.owner_oversight_notification_prefs SET digest_timezone='Moon/Base'"),/valid IANA/);
    await assert.rejects(run(null),/finite digest run time/);
  });
  await check('receipts are private and blocked readers or callers cannot bypass service authorization',async () => {
    await run();
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await query("SELECT set_config('test.uid',$1,false)",[owner]);
    assert.equal((await query('SELECT * FROM public.owner_digest_deliveries')).rows.length,1);
    await assert.rejects(run(),/permission denied/);
    await query("SELECT set_config('test.uid',$1,false)",[other]);
    assert.equal((await query('SELECT * FROM public.owner_digest_deliveries')).rows.length,0);
    await db.exec(`RESET ROLE; UPDATE public.users SET banned=true WHERE id='${owner}'; SET ROLE authenticated;`);
    await query("SELECT set_config('test.uid',$1,false)",[owner]);
    assert.equal((await query('SELECT * FROM public.owner_digest_deliveries')).rows.length,0);
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(run(),/permission denied/);
  });
  console.log(`${passed} owner-digest PostgreSQL checks passed. No external delivery performed; PGlite serializes concurrent submissions.`);
} finally { await db.close(); }
