// Real PostgreSQL policies and RPCs in an isolated database; no live accounts/files.
// Pass an external @electric-sql/pglite/dist/index.js path to reuse a local install.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [claimant, reviewer, stranger, platform, blocked, head] = [1, 2, 3, 4, 5, 6].map(id);
const [org, otherOrg, listing, privateListing] = [10, 11, 20, 21].map(id);
const path = (n, user = claimant, target = listing) => `${user}/${target}/${id(n)}.pdf`;
const readMigration = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8').replace(/^\uFEFF/, '');
const q = (sql, params = []) => db.query(sql, params);
const actor = async (user, role = 'authenticated') => {
  await db.exec('RESET ROLE');
  await q("SELECT set_config('test.uid',$1,false)", [user || '']);
  await db.exec(`SET ROLE ${role}`);
};
const fixture = async (sql, params = []) => { await db.exec('RESET ROLE'); return q(sql, params); };
const upload = (name, metadata = { size: 12, mimetype: 'application/pdf' }) => q("INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('claim-evidence',$1,$2)", [name, JSON.stringify(metadata)]);
const submit = (paths = [], target = listing) => q('SELECT * FROM public.submit_property_listing_claim($1,$2,$3)', [target, 'Proof attached', JSON.stringify(paths)]);
const review = (claimId, status, note = null) => q('SELECT * FROM public.review_property_listing_claim($1,$2,$3)', [claimId, status, note]);
const resubmit = (claimId, paths, note = 'Additional proof') => q('SELECT * FROM public.resubmit_property_listing_claim($1,$2,$3)', [claimId, note, JSON.stringify(paths)]);
let passed = 0;
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA public,auth,private,storage TO authenticated,anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,deleted_at timestamptz,banned_until timestamptz);
    CREATE TABLE public.users(id uuid PRIMARY KEY,banned boolean DEFAULT false,account_deletion_requested_at timestamptz,is_platform_admin boolean DEFAULT false);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY,suspended boolean DEFAULT false);
    CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,role text);
    CREATE TABLE public.properties(id uuid PRIMARY KEY);
    CREATE TABLE public.listings(id uuid PRIMARY KEY,property_id uuid,organization_id uuid,status text,visibility text);
    CREATE TABLE public.notification_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,organization_id uuid,notification_type text,channel text,subject text,content text,delivered boolean,delivered_at timestamptz);
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb,UNIQUE(bucket_id,name));
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
    -- Deliberately simulate a legacy permissive policy to exercise restrictive guards.
    CREATE POLICY legacy_broad_access ON storage.objects FOR ALL TO public USING(true) WITH CHECK(true);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()),false)$$;
    CREATE FUNCTION public.is_platform_staff() RETURNS boolean LANGUAGE sql AS $$SELECT public.is_platform_admin()$$;
    CREATE FUNCTION private.org_member_has_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
    INSERT INTO public.users(id,is_platform_admin,banned) VALUES ${[claimant,reviewer,stranger,platform,blocked,head].map(user => `('${user}',${user === platform},${user === blocked})`).join(',')};
    INSERT INTO auth.users(id) SELECT id FROM public.users;
    INSERT INTO public.organizations(id) VALUES('${org}'),('${otherOrg}');
    INSERT INTO public.organization_members VALUES('${org}','${reviewer}','organization_admin'),('${otherOrg}','${stranger}','owner'),('${org}','${head}','head_property_management');
    INSERT INTO public.listings VALUES('${listing}',null,'${org}','listed','public'),('${privateListing}',null,'${org}','draft','private');
  `);
  const account = readMigration('2026092303_account_access_enforcement');
  await db.exec(account.slice(0, account.indexOf('-- Preserve an existing')));
  const scope = readMigration('2026092304_scoped_administration');
  await db.exec(scope.slice(0, scope.indexOf('CREATE OR REPLACE FUNCTION private.role_department')));
  const prior = readMigration('2026091310_property_claim_membership_channels');
  await db.exec(prior.slice(prior.indexOf('CREATE TABLE IF NOT EXISTS public.property_listing_claims'), prior.indexOf('CREATE TABLE IF NOT EXISTS public.organization_membership_requests')));
  await db.exec(readMigration('2026092404_claim_evidence'));
  await actor(claimant);
  await check('valid private evidence upload; foreign, malformed and private-listing uploads denied', async () => {
    await upload(path(30));
    await assert.rejects(upload(path(31, stranger)), /row-level security/);
    await assert.rejects(upload(`${claimant}/bad/path.pdf`), /row-level security/);
    await assert.rejects(upload(path(32, claimant, privateListing)), /row-level security/);
  });
  await check('anonymous legacy storage grants cannot read or upload claim evidence', async () => {
    await actor(null, 'anon');
    assert.equal((await q("SELECT * FROM storage.objects WHERE bucket_id='claim-evidence'")).rows.length, 0);
    await assert.rejects(upload(path(33)), /row-level security/);
    await actor(claimant);
  });
  await check('direct claim writes and private listing submissions are denied', async () => {
    await assert.rejects(q("INSERT INTO public.property_listing_claims(listing_id,organization_id,claimant_user_id) VALUES($1,$2,$3)",[listing,org,claimant]), /permission denied/);
    await assert.rejects(submit([],privateListing), /Listing unavailable/);
  });
  await check('evidence rejects nonarrays, nonstrings, duplicates, missing and foreign files', async () => {
    for (const payload of [null, {}, [123], [path(30),path(30)], [path(90)], [path(30,stranger)], Array.from({length:6},(_,i)=>path(100+i))]) {
      await assert.rejects(submit(payload), /Evidence|evidence|Duplicate|five/);
    }
  });
  await check('actual stored size and MIME must be verifiable and within the bucket limits', async () => {
    for (const [n, metadata] of [[40,{}],[41,{size:0,mimetype:'application/pdf'}],[42,{size:10485761,mimetype:'application/pdf'}],[43,{size:12,mimetype:'image/png'}]]) {
      await upload(path(n),metadata);
      await assert.rejects(submit([path(n)]), /Evidence/);
    }
  });
  let claimId;
  await check('submission links evidence and notifies organization reviewers atomically', async () => {
    claimId = (await submit([path(30)])).rows[0].id;
    const notices = (await fixture('SELECT user_id,delivered FROM public.notification_logs')).rows;
    assert.deepEqual(notices,[{user_id:reviewer,delivered:true}]);
    await actor(claimant);
    await assert.rejects(submit([path(30)]), /duplicate key/);
  });
  await check('linked evidence is immutable and cannot be removed by its uploader', async () => {
    assert.equal((await q("DELETE FROM storage.objects WHERE name=$1 RETURNING id",[path(30)])).rows.length,0);
    assert.equal((await q("UPDATE storage.objects SET metadata='{}' WHERE name=$1 RETURNING id",[path(30)])).rows.length,0);
    assert.equal((await q("DELETE FROM storage.objects WHERE name=$1 RETURNING id",[path(40)])).rows.length,1);
  });
  await check('foreign executives and department heads cannot read or review another section claim', async () => {
    for (const user of [stranger,head]) {
      await actor(user);
      assert.equal((await q('SELECT * FROM public.property_listing_claims')).rows.length,0);
      assert.equal((await q("SELECT * FROM storage.objects WHERE name=$1",[path(30)])).rows.length,0);
      await assert.rejects(review(claimId,'approved'), /not authorized/);
    }
  });
  await check('organization reviewers read submitted evidence and must explain needs-info', async () => {
    await actor(reviewer);
    assert.equal((await q("SELECT * FROM storage.objects WHERE name=$1",[path(30)])).rows.length,1);
    assert.equal((await q("SELECT * FROM storage.objects WHERE name=$1",[path(41)])).rows.length,0);
    await assert.rejects(review(claimId,'needs_info'), /Explain/);
    await review(claimId,'needs_info','Please add the ownership letter');
    await review(claimId,'needs_info','Please add the ownership letter');
    assert.equal((await fixture('SELECT count(*)::int AS n FROM public.notification_logs WHERE user_id=$1',[claimant])).rows[0].n,1);
  });
  await check('resubmission belongs to the claimant, retains old evidence and needs a response', async () => {
    await actor(stranger);
    await assert.rejects(resubmit(claimId,[path(30)]), /Only your claims/);
    await actor(claimant);
    await assert.rejects(resubmit(claimId,[]), /retained/);
    await assert.rejects(resubmit(claimId,[path(30)],' '), /response/);
    await upload(path(50));
    await resubmit(claimId,[path(30),path(50)]);
    assert.equal((await q('SELECT status FROM public.property_listing_claims WHERE id=$1',[claimId])).rows[0].status,'pending');
    await assert.rejects(resubmit(claimId,[path(30),path(50)]), /Only your claims/);
  });
  await check('blocked identities cannot read evidence or act using a retained session', async () => {
    await fixture('UPDATE public.users SET banned=true WHERE id=$1',[claimant]);
    await actor(claimant);
    assert.equal((await q('SELECT * FROM public.property_listing_claims')).rows.length,0);
    assert.equal((await q("SELECT * FROM storage.objects WHERE name=$1",[path(30)])).rows.length,0);
    await assert.rejects(q('SELECT public.withdraw_property_listing_claim($1)',[claimId]), /Active account/);
    await fixture('UPDATE public.users SET banned=false WHERE id=$1',[claimant]);
  });
  await check('suspended organizations reject reviewer actions and claimant resubmission', async () => {
    await actor(reviewer); await review(claimId,'needs_info','Please clarify');
    await fixture('UPDATE public.organizations SET suspended=true WHERE id=$1',[org]);
    await actor(reviewer); await assert.rejects(review(claimId,'approved'), /not authorized/);
    await actor(claimant); await assert.rejects(resubmit(claimId,[path(30),path(50)]), /Organization unavailable/);
    await fixture('UPDATE public.organizations SET suspended=false WHERE id=$1',[org]);
  });
  await check('platform administrators can review but self-review remains forbidden', async () => {
    await fixture("INSERT INTO public.organization_members VALUES($1,$2,'organization_admin')",[org,claimant]);
    await actor(claimant); await assert.rejects(review(claimId,'approved'), /not authorized/);
    await actor(platform); await review(claimId,'approved');
    await assert.rejects(review(claimId,'rejected'), /Invalid claim transition/);
    await actor(claimant); await assert.rejects(q('SELECT public.withdraw_property_listing_claim($1)',[claimId]), /cannot be withdrawn/);
  });
  console.log(`${passed} claim evidence database checks passed`);
} catch (error) {
  console.error(`FAIL after ${passed} checks: ${error.message}`);
  if (error.detail) console.error(error.detail);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally { await db.close(); }
