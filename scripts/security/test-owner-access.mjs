// Isolated PostgreSQL regression checks. No production credentials or data.
// Pass the separately installed @electric-sql/pglite dist/index.js path.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [admin, owner, head, outsider, platform] = [1,2,3,4,5].map(id);
const [org, foreignOrg, unit] = [10,11,12].map(id);
const [a,b,c,d,e,foreignProperty] = [20,21,22,23,24,25].map(id);
const estate = id(30);
const query = (sql, params=[]) => db.query(sql,params);
const readMigration = (name) => readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8');
const functionSql = (name, migration) => {
  const sql = readMigration(migration);
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start>=0,`Fixture function ${name} exists`);
  return sql.slice(start,sql.indexOf('$$;',start)+3);
};
const actor = (who) => query("SELECT set_config('test.uid',$1,false)",[who]);
const add = (property, target=owner, organization=org, estateId=null, mode='company_managed', rpc='add_owner_property_access') =>
  query(`SELECT (public.${rpc}($1,$2,$3,$4,$5)).*`,[property,target,organization,estateId,mode]);
const count = async (table, property) => (await query(`SELECT count(*)::int AS n FROM public.${table} WHERE property_id=$1`,[property])).rows[0].n;
let passed=0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz);
    CREATE TABLE public.users(id uuid PRIMARY KEY,banned boolean DEFAULT false,account_deletion_requested_at timestamptz,
      account_deleted_at timestamptz,is_platform_admin boolean DEFAULT false);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY,suspended boolean DEFAULT false);
    CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,role text,scope_mode text DEFAULT 'properties',PRIMARY KEY(organization_id,user_id));
    CREATE TABLE public.properties(id uuid PRIMARY KEY,organization_id uuid REFERENCES public.organizations);
    CREATE TABLE public.managed_estates(id uuid PRIMARY KEY,organization_id uuid REFERENCES public.organizations,property_id uuid REFERENCES public.properties);
    CREATE TABLE public.organization_units(id uuid PRIMARY KEY,organization_id uuid REFERENCES public.organizations);
    CREATE TABLE public.organization_unit_properties(organization_unit_id uuid,property_id uuid);
    CREATE TABLE public.maintenance_requests(organization_id uuid,assigned_to_user_id uuid,property_id uuid);
    CREATE TABLE public.estate_work_orders(estate_id uuid,assigned_to_user_id uuid);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
      SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()),false) $$;
    CREATE FUNCTION public.is_platform_staff() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.has_platform_console_grant(text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    INSERT INTO public.users(id,is_platform_admin) VALUES('${admin}',false),('${owner}',false),('${head}',false),('${outsider}',false),('${platform}',true);
    INSERT INTO auth.users(id) SELECT id FROM public.users;
    INSERT INTO public.organizations VALUES('${org}',false),('${foreignOrg}',false);
    INSERT INTO public.organization_members VALUES('${org}','${admin}','organization_admin','organization'),('${org}','${owner}','property_owner','properties'),
      ('${org}','${head}','finance_manager','organization'),('${foreignOrg}','${outsider}','organization_admin','organization');
    INSERT INTO public.properties VALUES('${a}','${org}'),('${b}','${org}'),('${c}','${org}'),('${d}','${org}'),('${e}','${org}'),('${foreignProperty}','${foreignOrg}');
    INSERT INTO public.managed_estates VALUES('${estate}','${org}','${b}');
    INSERT INTO public.organization_units VALUES('${unit}','${org}');
    INSERT INTO public.organization_unit_properties VALUES('${unit}','${e}');
  `);
  await db.exec(functionSql('private.account_access_allowed','2026092303_account_access_enforcement.sql'));
  await db.exec(functionSql('private.is_org_admin','2026092304_scoped_administration.sql'));
  await db.exec(`CREATE FUNCTION private.can_manage_organization_members(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT private.is_org_admin($1) $$;`);
  await db.exec(readMigration('2026090513_member_property_scopes.sql'));
  const units = readMigration('2026090516_org_hierarchy_offline_rls.sql');
  const unitStart = units.indexOf('CREATE TABLE IF NOT EXISTS public.organization_member_unit_scopes');
  await db.exec(units.slice(unitStart,units.indexOf(';',unitStart)+1));
  await db.exec(functionSql('private.member_can_access_property','2026090704_fix_private_rls_function_grants.sql'));
  const agreements = readMigration('2026091312_owner_oversight_layer.sql');
  await db.exec(agreements.slice(0,agreements.indexOf('-- Owner expense'))
    .replaceAll("private.org_member_has_permission(managing_organization_id, 'team:manage')",'private.is_org_admin(managing_organization_id)'));
  const modes = readMigration('2026082206_owner_reporting_operations_and_automation.sql');
  await db.exec(modes.slice(modes.indexOf('CREATE TABLE public.estate_property_management_modes'),modes.indexOf('CREATE TABLE public.estate_owner_statement_runs')));
  await db.exec(`GRANT USAGE ON SCHEMA public,private,auth TO authenticated,anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    INSERT INTO public.organization_member_unit_scopes VALUES('${org}','${owner}','${unit}',NOW());`);
  await db.exec(readMigration('2026092401_owner_access.sql'));
  await db.exec('SET ROLE authenticated');
  await actor(admin);

  await check('adding B preserves A, unit scopes and selected management mode', async () => {
    await add(a); await add(b,owner,org,estate,'hybrid');
    const scopes = (await query('SELECT property_id FROM public.organization_member_property_scopes WHERE user_id=$1 ORDER BY property_id',[owner])).rows;
    assert.deepEqual(scopes.map(r=>r.property_id),[a,b]);
    assert.equal((await query('SELECT unit_id FROM public.organization_member_unit_scopes WHERE user_id=$1',[owner])).rows[0].unit_id,unit);
    assert.equal((await query('SELECT management_mode FROM public.estate_property_management_modes')).rows[0].management_mode,'hybrid');
    await actor(owner);
    for (const property of [a,b,e]) assert.equal((await query('SELECT private.member_can_access_property($1,$2) AS allowed',[org,property])).rows[0].allowed,true);
    assert.equal((await query('SELECT private.member_can_access_property($1,$2) AS allowed',[org,c])).rows[0].allowed,false);
    await actor(admin);
  });
  await check('retry returns the same agreement and preserves configured thresholds', async () => {
    const original = (await add(b,owner,org,estate,'hybrid')).rows[0];
    await query('UPDATE public.property_management_agreements SET auto_approve_below_minor=123 WHERE id=$1',[original.id]);
    const retry = (await add(b,owner,org,estate,'hybrid')).rows[0];
    assert.equal(retry.id,original.id); assert.equal(Number(retry.auto_approve_below_minor),123);
    assert.equal(await count('property_management_agreements',b),1);
    assert.equal(await count('organization_member_property_scopes',b),1);
  });
  await check('ordinary owners, department heads and foreign administrators cannot assign access', async () => {
    for (const who of [owner,head,outsider]) { await actor(who); await assert.rejects(add(c),/Only organization administrators/); }
    await actor(owner); await assert.rejects(add(c,owner,org,null,'hybrid','upsert_property_management_agreement'),/Only organization administrators/);
    await actor(admin);
    assert.equal(await count('organization_member_property_scopes',c),0);
  });
  await check('property, estate and owner membership must match the organization', async () => {
    await assert.rejects(add(foreignProperty),/Property must belong/);
    await assert.rejects(add(a,owner,org,estate),/Estate must match/);
    await assert.rejects(add(c,outsider),/organization member first/);
    await assert.rejects(add(c,owner,org,null,'invalid'),/Invalid management mode/);
  });
  await check('agreement failure rolls back the preceding property-scope insertion', async () => {
    await db.exec(`RESET ROLE; CREATE FUNCTION public.reject_test_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.property_id='${c}' THEN RAISE EXCEPTION 'injected agreement failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_test_agreement BEFORE INSERT ON public.property_management_agreements FOR EACH ROW EXECUTE FUNCTION public.reject_test_agreement(); SET ROLE authenticated;`);
    await assert.rejects(add(c),/injected agreement failure/);
    assert.equal(await count('organization_member_property_scopes',c),0);
    assert.equal(await count('property_management_agreements',c),0);
    await db.exec('RESET ROLE; DROP TRIGGER reject_test_agreement ON public.property_management_agreements; SET ROLE authenticated;');
  });
  await check('mode failure rolls back both the agreement and access', async () => {
    await db.exec(`RESET ROLE; INSERT INTO public.managed_estates VALUES('${id(31)}','${org}','${d}');
      CREATE FUNCTION public.reject_test_mode() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected mode failure'; END $$;
      CREATE TRIGGER reject_test_mode BEFORE INSERT ON public.estate_property_management_modes FOR EACH ROW EXECUTE FUNCTION public.reject_test_mode(); SET ROLE authenticated;`);
    await assert.rejects(add(d),/injected mode failure/);
    assert.equal(await count('organization_member_property_scopes',d),0);
    assert.equal(await count('property_management_agreements',d),0);
    await db.exec('RESET ROLE; DROP TRIGGER reject_test_mode ON public.estate_property_management_modes; SET ROLE authenticated;');
  });
  await check('parallel submitted additions and retries never lose or duplicate scopes', async () => {
    await Promise.all([add(c),add(d),add(c),add(d)]);
    for (const property of [a,b,c,d]) {
      assert.equal(await count('organization_member_property_scopes',property),1);
      assert.equal(await count('property_management_agreements',property),1);
    }
  });
  await check('existing organization scope is preserved and assigned-work changes are explicit', async () => {
    await add(a,admin);
    assert.equal((await query('SELECT scope_mode FROM public.organization_members WHERE user_id=$1',[admin])).rows[0].scope_mode,'organization');
    await query("UPDATE public.organization_members SET scope_mode='assigned_work' WHERE user_id=$1",[owner]);
    await assert.rejects(add(e),/scope explicitly/);
    await query("UPDATE public.organization_members SET scope_mode='properties' WHERE user_id=$1",[owner]);
  });
  await check('blocked/deleting owners and blocked callers are denied', async () => {
    await query('UPDATE public.users SET banned=true WHERE id=$1',[owner]);
    await assert.rejects(add(e),/active account/);
    await query('UPDATE public.users SET banned=false,account_deletion_requested_at=NOW() WHERE id=$1',[owner]);
    await assert.rejects(add(e),/active account/);
    await query('UPDATE public.users SET account_deletion_requested_at=NULL WHERE id=$1',[owner]);
    await query('UPDATE public.users SET banned=true WHERE id=$1',[admin]);
    await assert.rejects(add(e),/active authenticated/);
    await query('UPDATE public.users SET banned=false WHERE id=$1',[admin]);
  });
  await check('platform admins can assign access but suspended organizations cannot receive it', async () => {
    await actor(platform); await add(e);
    await query('UPDATE public.organizations SET suspended=true WHERE id=$1',[org]);
    await assert.rejects(add(a),/Organization must be active/);
    await query('UPDATE public.organizations SET suspended=false WHERE id=$1',[org]);
    await actor(admin);
  });
  await check('direct agreement insertion and identity changes cannot bypass the checked RPC', async () => {
    await assert.rejects(query('INSERT INTO public.property_management_agreements(property_id,owner_user_id,managing_organization_id) VALUES($1,$2,$3)',[a,outsider,org]),/permission denied/);
    await assert.rejects(query('UPDATE public.property_management_agreements SET owner_user_id=$1',[outsider]),/permission denied/);
    await actor(head);
    assert.equal((await query('UPDATE public.property_management_agreements SET auto_approve_below_minor=999 RETURNING id')).rows.length,0);
    await actor(admin);
    assert.ok((await query('UPDATE public.property_management_agreements SET auto_approve_below_minor=999 RETURNING id')).rows.length>0);
  });
  await check('anonymous callers cannot execute either API', async () => {
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(add(a),/permission denied/);
    await assert.rejects(add(a,owner,org,null,'company_managed','upsert_property_management_agreement'),/permission denied/);
  });
  console.log(`${passed} owner-access PostgreSQL checks passed. PGlite serializes queries; live multi-connection lock contention remains a deployment check.`);
} finally { await db.close(); }
