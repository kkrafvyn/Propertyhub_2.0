// Real upload migration against an isolated reduced PostgreSQL schema. Storage
// rows represent object metadata; this does not exercise the live Storage API.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const tenant = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const staff = '00000000-0000-0000-0000-000000000003';
const org = '10000000-0000-0000-0000-000000000001';
const foreignOrg = '10000000-0000-0000-0000-000000000002';
const ownRequest = '20000000-0000-0000-0000-000000000001';
const otherRequest = '20000000-0000-0000-0000-000000000002';
const foreignRequest = '20000000-0000-0000-0000-000000000003';
const path = `${org}/${ownRequest}/photo.jpg`;
const secondPath = `${org}/${ownRequest}/second.jpg`;
const q = (sql, args = []) => db.query(sql, args);
const asUser = async user => {
  await db.exec('RESET ROLE'); await q("SELECT set_config('test.uid',$1,false)", [user]);
  await db.exec('SET ROLE authenticated');
};
const privileged = async callback => {
  await db.exec('RESET ROLE');
  try { return await callback(); } finally { await db.exec('SET ROLE authenticated'); }
};
const upload = (name, owner = tenant) => q("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('maintenance-media',$1,$2)", [name, owner]);
const append = (paths, request = ownRequest) => q('SELECT photo_urls,updated_at FROM public.append_maintenance_photos($1,$2)', [request, paths]);
const remove = name => q('DELETE FROM storage.objects WHERE name=$1 RETURNING name', [name]);
let passed = 0;
const check = async (name, action) => { await action(); passed++; console.log(`PASS ${name}`); };
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA private; CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
    CREATE TABLE public.users(id uuid PRIMARY KEY,banned boolean DEFAULT false);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY,suspended boolean DEFAULT false);
    CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,role text);
    CREATE TABLE public.maintenance_requests(id uuid PRIMARY KEY,organization_id uuid,tenant_user_id uuid,
      assigned_to_user_id uuid,photo_urls text[] DEFAULT '{}',updated_at timestamptz DEFAULT now());
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text,UNIQUE(bucket_id,name));
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE FUNCTION private.account_access_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND NOT banned)$$;
    CREATE FUNCTION private.is_org_admin(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=$1 AND user_id=auth.uid() AND role='owner')$$;
    CREATE FUNCTION private.member_can_access_maintenance(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.maintenance_requests WHERE organization_id=$1 AND id=$2 AND assigned_to_user_id=auth.uid())$$;
    ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    -- Include the legacy broad organization policy to prove the new boundary
    -- cannot be bypassed by that permissive grant.
    CREATE POLICY maintenance_access ON public.maintenance_requests FOR ALL TO authenticated USING(
      tenant_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=maintenance_requests.organization_id AND user_id=auth.uid()));
    CREATE POLICY active_account ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
      USING(private.account_access_allowed()) WITH CHECK(private.account_access_allowed());
    GRANT USAGE ON SCHEMA public,private,auth,storage TO authenticated,anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public,storage TO authenticated;
    INSERT INTO public.users(id) VALUES('${tenant}'),('${other}'),('${staff}');
    INSERT INTO public.organizations(id) VALUES('${org}'),('${foreignOrg}');
    INSERT INTO public.organization_members VALUES('${org}','${staff}','maintenance_technician');
    INSERT INTO public.maintenance_requests(id,organization_id,tenant_user_id,assigned_to_user_id) VALUES
      ('${ownRequest}','${org}','${tenant}','${staff}'),('${otherRequest}','${org}','${other}',NULL),
      ('${foreignRequest}','${foreignOrg}','${other}',NULL);
  `);
  const storageSql = readFileSync(new URL('../../supabase/migrations/2026073114_storage_security_buckets.sql', import.meta.url), 'utf8');
  await db.exec(storageSql.slice(storageSql.indexOf('-- Private maintenance photos bucket'), storageSql.indexOf('-- Organization assets bucket')));
  await db.exec(readFileSync(new URL('../../supabase/migrations/2026092405_maintenance_uploads.sql', import.meta.url), 'utf8'));
  await asUser(tenant);
  await check('tenant uploads to own request but cannot forge organization, request, nested path or owner', async () => {
    await upload(path);
    for (const denied of [`${foreignOrg}/${ownRequest}/bad.jpg`, `${org}/${otherRequest}/bad.jpg`, `${org}/${foreignRequest}/bad.jpg`, `${org}/${ownRequest}/nested/bad.jpg`]) {
      await assert.rejects(upload(denied), /row-level security/);
    }
    await assert.rejects(upload(secondPath, other), /row-level security/);
  });
  await check('legacy organization-folder permission cannot bypass assigned-request scope', async () => {
    await asUser(staff);
    await upload(`${org}/${ownRequest}/staff.jpg`, staff);
    await assert.rejects(upload(`${org}/${otherRequest}/staff.jpg`, staff), /row-level security/);
    await assert.rejects(upload(`${org}/${foreignRequest}/staff.jpg`, staff), /row-level security/);
    await asUser(tenant);
  });
  await check('append requires existing exact-request objects and rolls back mixed invalid batches', async () => {
    await assert.rejects(append([path, `${org}/${ownRequest}/missing.jpg`]), /does not belong/);
    assert.deepEqual((await q('SELECT photo_urls FROM public.maintenance_requests WHERE id=$1', [ownRequest])).rows[0].photo_urls, []);
    await assert.rejects(append([`${org}/${otherRequest}/photo.jpg`]), /does not belong/);
    await assert.rejects(append([null]), /does not belong/);
    await assert.rejects(append([path], otherRequest), /access denied/);
  });
  await check('retries append exactly once, preserve photo order and do not touch timestamps', async () => {
    await upload(secondPath);
    const first = (await append([path, secondPath, path])).rows[0];
    assert.deepEqual(first.photo_urls, [path, secondPath]);
    assert.deepEqual((await append([secondPath, path])).rows[0], first);
  });
  await check('failed-upload cleanup removes only own unlinked objects and protects linked evidence', async () => {
    const tempPath = `${org}/${ownRequest}/temporary.jpg`;
    await upload(tempPath);
    assert.deepEqual((await remove(tempPath)).rows, [{ name: tempPath }]);
    assert.deepEqual((await remove(path)).rows, []);
    assert.deepEqual((await remove(`${org}/${ownRequest}/staff.jpg`)).rows, []);
    await privileged(() => q('UPDATE public.maintenance_requests SET tenant_user_id=$1 WHERE id=$2', [other, ownRequest]));
    assert.equal((await q('SELECT private.maintenance_photo_is_linked($1) AS linked', [path])).rows[0].linked, true);
    assert.deepEqual((await remove(path)).rows, []);
    await privileged(() => q('UPDATE public.maintenance_requests SET tenant_user_id=$1 WHERE id=$2', [tenant, ownRequest]));
  });
  await check('uploads cannot overwrite or move existing evidence', async () => {
    // Deliberately add a permissive legacy UPDATE policy: the restrictive rule wins.
    await privileged(() => db.exec('CREATE POLICY test_legacy_update ON storage.objects FOR UPDATE TO authenticated USING(true) WITH CHECK(true)'));
    assert.deepEqual((await q('UPDATE storage.objects SET name=$1 WHERE name=$2 RETURNING name', [secondPath + '-moved', path])).rows, []);
  });
  await check('photo cap applies to the combined request and blocked accounts cannot append or upload', async () => {
    const more = Array.from({ length: 9 }, (_, i) => `${org}/${ownRequest}/extra-${i}.jpg`);
    for (const name of more) await upload(name);
    await assert.rejects(append(more), /at most ten photos/);
    assert.equal((await append([path])).rows[0].photo_urls.length, 2);
    await privileged(() => q('UPDATE public.users SET banned=true WHERE id=$1', [tenant]));
    await assert.rejects(append([path]), /access denied/);
    await assert.rejects(upload(`${org}/${ownRequest}/blocked.jpg`), /row-level security/);
  });
  await check('anonymous callers cannot append photos', async () => {
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(append([path]), /permission denied/);
  });
  console.log(`${passed} isolated maintenance upload checks passed.`);
} finally { await db.close(); }
