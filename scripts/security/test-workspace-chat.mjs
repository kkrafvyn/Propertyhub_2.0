// Isolated PostgreSQL checks using the real workspace-chat migration and a
// reduced schema. Pass a separately installed PGlite dist/index.js as argv[2].
// PGlite serializes connections: queued requests below verify idempotency and
// uniqueness, not overlapping PostgreSQL transactions/advisory-lock scheduling.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const owner = '00000000-0000-0000-0000-000000000001';
const peer = '00000000-0000-0000-0000-000000000002';
const third = '00000000-0000-0000-0000-000000000003';
const outsider = '00000000-0000-0000-0000-000000000004';
const admin = '00000000-0000-0000-0000-000000000005';
const blocked = '00000000-0000-0000-0000-000000000006';
const organization = '10000000-0000-0000-0000-000000000001';
const foreignOrganization = '10000000-0000-0000-0000-000000000002';
const query = (sql, params = []) => db.query(sql, params);
const asUser = async (id) => {
  await db.exec('RESET ROLE');
  await query("SELECT set_config('test.uid', $1, false)", [id]);
  await db.exec('SET ROLE authenticated');
};
const privileged = async (fn) => {
  await db.exec('RESET ROLE');
  try { return await fn(); } finally { await db.exec('SET ROLE authenticated'); }
};
const channel = (slug, isPrivate = false) => query(
  'SELECT * FROM public.create_workspace_channel($1,$2,$3,NULL,$4)', [organization, slug, slug, isPrivate],
);
const openDirect = (target = peer, org = organization) => query(
  'SELECT public.open_workspace_direct_message($1,$2) AS id', [org, target],
);
const page = (id, before = null, limit = 81) => query(
  'SELECT * FROM public.list_workspace_messages($1,$2,$3,$4)',
  [id, before ? before.created_at.toISOString() : null, before?.id ?? null, limit],
);
const counts = () => privileged(async () => (await query(`SELECT
  (SELECT count(*)::int FROM public.conversations) AS conversations,
  (SELECT count(*)::int FROM public.workspace_channels) AS channels,
  (SELECT count(*)::int FROM public.conversation_participants) AS participants`)).rows[0]);
let passed = 0;
async function check(name, run) { await run(); passed += 1; console.log(`PASS ${name}`); }

try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.uid', true), '')::uuid
    $$;
    CREATE TABLE public.users(id uuid PRIMARY KEY, banned boolean NOT NULL DEFAULT false,
      account_deletion_requested_at timestamptz, is_platform_admin boolean NOT NULL DEFAULT false);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY, suspended boolean NOT NULL DEFAULT false);
    CREATE TABLE public.organization_members(organization_id uuid REFERENCES public.organizations,
      user_id uuid REFERENCES public.users, role text NOT NULL, PRIMARY KEY(organization_id,user_id));
    CREATE TABLE public.conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_1_id uuid NOT NULL REFERENCES public.users, participant_2_id uuid NOT NULL REFERENCES public.users,
      conversation_type text NOT NULL, organization_id uuid REFERENCES public.organizations,
      property_id uuid, unit_id uuid, listing_id uuid, lead_id uuid, deal_id uuid, lease_id uuid,
      booking_id uuid, maintenance_issue_id uuid, work_order_id uuid, customer_id uuid,
      created_by uuid REFERENCES public.users, created_at timestamptz NOT NULL DEFAULT now(),
      CHECK(participant_1_id < participant_2_id));
    CREATE TABLE public.workspace_channels(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES public.organizations,
      conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations ON DELETE CASCADE,
      slug text NOT NULL, name text NOT NULL, description text, is_private boolean NOT NULL DEFAULT false,
      created_by uuid REFERENCES public.users, UNIQUE(organization_id,slug));
    CREATE TABLE public.conversation_participants(conversation_id uuid REFERENCES public.conversations ON DELETE CASCADE,
      user_id uuid REFERENCES public.users, participant_role text DEFAULT 'member', is_muted boolean DEFAULT false,
      PRIMARY KEY(conversation_id,user_id));
    CREATE TABLE public.messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid REFERENCES public.conversations ON DELETE CASCADE, sender_id uuid REFERENCES public.users,
      content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      message_type text NOT NULL DEFAULT 'text', is_deleted boolean NOT NULL DEFAULT false);
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT coalesce((SELECT is_platform_admin FROM public.users WHERE id=auth.uid()), false)
    $$;
    CREATE FUNCTION private.account_access_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND NOT banned AND account_deletion_requested_at IS NULL)
    $$;
    CREATE FUNCTION private.org_member_has_permission(uuid,text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=$1 AND user_id=auth.uid() AND role IN ('owner','organization_admin'))
    $$;
    CREATE FUNCTION public.user_participates_in_conversation(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=$1 AND user_id=auth.uid())
    $$;
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workspace_channels ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY conversation_read ON public.conversations FOR SELECT TO authenticated USING(public.user_participates_in_conversation(id) OR public.is_platform_admin());
    CREATE POLICY conversation_insert ON public.conversations FOR INSERT TO authenticated WITH CHECK(auth.uid() IS NOT NULL);
    CREATE POLICY conversation_update ON public.conversations FOR UPDATE TO authenticated USING(public.user_participates_in_conversation(id));
    CREATE POLICY channel_management ON public.workspace_channels FOR ALL TO authenticated USING(private.org_member_has_permission(organization_id,'team:manage')) WITH CHECK(private.org_member_has_permission(organization_id,'team:manage'));
    CREATE POLICY participant_read ON public.conversation_participants FOR SELECT TO authenticated USING(public.user_participates_in_conversation(conversation_id));
    CREATE POLICY participant_insert ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK(auth.uid() IS NOT NULL);
    CREATE POLICY participant_update ON public.conversation_participants FOR UPDATE TO authenticated USING(user_id=auth.uid());
    CREATE POLICY message_read ON public.messages FOR SELECT TO authenticated USING(public.user_participates_in_conversation(conversation_id) OR public.is_platform_admin());
    CREATE POLICY message_insert ON public.messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid() AND public.user_participates_in_conversation(conversation_id));
    CREATE POLICY message_update ON public.messages FOR UPDATE TO authenticated USING(sender_id=auth.uid());
    GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    INSERT INTO public.users(id,banned,is_platform_admin) VALUES
      ('${owner}',false,false),('${peer}',false,false),('${third}',false,false),
      ('${outsider}',false,false),('${admin}',false,true),('${blocked}',true,false);
    INSERT INTO public.organizations(id) VALUES('${organization}'),('${foreignOrganization}');
    INSERT INTO public.organization_members VALUES
      ('${organization}','${owner}','owner'),('${organization}','${peer}','agent'),
      ('${organization}','${third}','agent'),('${organization}','${blocked}','agent'),
      ('${foreignOrganization}','${outsider}','owner');
    CREATE FUNCTION public.test_participant_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
      IF current_setting('test.fail_participant', true) = 'yes' THEN RAISE EXCEPTION 'Injected participant failure'; END IF;
      RETURN NEW;
    END;$$;
    CREATE TRIGGER test_participant_failure BEFORE INSERT ON public.conversation_participants
      FOR EACH ROW EXECUTE FUNCTION public.test_participant_failure();
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/2026092402_workspace_chat.sql', import.meta.url), 'utf8'));
  await asUser(owner);
  let publicChannel;
  let privateChannel;
  let direct;

  await check('channel creation includes all active teammates and creator; private channel only creator', async () => {
    publicChannel = (await channel('operations')).rows[0];
    privateChannel = (await channel('private', true)).rows[0];
    assert.equal((await query('SELECT count(*)::int AS n FROM public.conversation_participants WHERE conversation_id=$1', [publicChannel.conversation_id])).rows[0].n, 3);
    assert.deepEqual((await query('SELECT user_id FROM public.conversation_participants WHERE conversation_id=$1', [privateChannel.conversation_id])).rows, [{ user_id: owner }]);
  });
  await check('duplicate channel slug and participant failure roll back all records', async () => {
    const before = await counts();
    await assert.rejects(channel('operations'), /duplicate key/);
    assert.deepEqual(await counts(), before);
    await query("SELECT set_config('test.fail_participant','yes',false)");
    await assert.rejects(channel('rollback'), /Injected participant failure/);
    await query("SELECT set_config('test.fail_participant','no',false)");
    assert.deepEqual(await counts(), before);
  });
  await check('default channels seed idempotently and late teammates join existing public channels', async () => {
    await query('SELECT public.ensure_default_workspace_channels($1)', [organization]);
    const before = await counts();
    await query('SELECT public.ensure_default_workspace_channels($1)', [organization]);
    assert.deepEqual(await counts(), before);
    await privileged(() => query('DELETE FROM public.conversation_participants WHERE user_id=$1', [third]));
    await asUser(third);
    await query('SELECT public.ensure_default_workspace_channels($1)', [organization]);
    assert.equal((await query('SELECT count(*)::int AS n FROM public.conversation_participants WHERE user_id=$1', [third])).rows[0].n, 4);
    await asUser(owner);
  });
  await check('ordinary members cannot create arbitrary channels; foreign and anonymous callers denied', async () => {
    await asUser(peer);
    await assert.rejects(channel('denied'), /management permission/);
    await asUser(outsider);
    await assert.rejects(channel('foreign'), /membership required/);
    await assert.rejects(query('SELECT public.ensure_default_workspace_channels($1)', [organization]), /membership required/);
    await asUser('');
    await db.exec('SET ROLE anon');
    await assert.rejects(query('SELECT public.ensure_default_workspace_channels($1)', [organization]), /permission denied/);
    await asUser(owner);
  });
  await check('direct participant failure leaves no orphan conversation', async () => {
    const before = await counts();
    await query("SELECT set_config('test.fail_participant','yes',false)");
    await assert.rejects(openDirect(), /Injected participant failure/);
    await query("SELECT set_config('test.fail_participant','no',false)");
    assert.deepEqual(await counts(), before);
  });
  await check('queued DM opens and reverse-pair retries return a single canonical thread', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => openDirect()));
    direct = results[0].rows[0].id;
    assert.equal(new Set(results.map(result => result.rows[0].id)).size, 1);
    await asUser(peer);
    assert.equal((await openDirect(owner)).rows[0].id, direct);
    const pair = await privileged(async () => (await query('SELECT workspace_direct_key FROM public.conversations WHERE id=$1', [direct])).rows[0].workspace_direct_key);
    assert.equal(pair, `${owner}:${peer}`);
    await assert.rejects(privileged(() => query(
      "INSERT INTO public.conversations(conversation_type,organization_id,workspace_direct_key) VALUES('direct',$1,$2)", [organization, pair],
    )), /duplicate key/);
    await asUser(owner);
  });
  await check('same-organization unrelated user cannot join or read a private DM or private channel', async () => {
    await asUser(third);
    await assert.rejects(query('INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES($1,$2)', [direct, third]), /row-level security/);
    await assert.rejects(page(direct), /access denied/);
    await assert.rejects(page(privateChannel.conversation_id), /access denied/);
    assert.deepEqual((await query('SELECT id FROM public.conversations WHERE id=$1', [direct])).rows, []);
    await asUser(owner);
  });
  await check('REST cannot forge channel/canonical DM or change protected participant identities', async () => {
    await assert.rejects(query("INSERT INTO public.conversations(conversation_type,organization_id) VALUES('channel',$1)", [organization]), /row-level security/);
    await assert.rejects(query("INSERT INTO public.conversations(conversation_type,organization_id,workspace_direct_key) VALUES('direct',$1,'forged')", [organization]), /row-level security/);
    await assert.rejects(query('UPDATE public.conversations SET workspace_direct_key=NULL WHERE id=$1', [direct]), /identity is immutable/);
    await assert.rejects(query('UPDATE public.workspace_channels SET conversation_id=$1 WHERE id=$2', [direct, publicChannel.id]), /identity and visibility are immutable/);
    await assert.rejects(query('UPDATE public.workspace_channels SET is_private=false WHERE id=$1', [privateChannel.id]), /identity and visibility are immutable/);
    await assert.rejects(query('UPDATE public.conversation_participants SET user_id=$1 WHERE conversation_id=$2 AND user_id=$3', [third, direct, owner]), /identity cannot be changed/);
    await query('UPDATE public.conversation_participants SET is_muted=true WHERE conversation_id=$1 AND user_id=$2', [direct, owner]);
    assert.equal((await query('SELECT is_muted FROM public.conversation_participants WHERE conversation_id=$1 AND user_id=$2', [direct, owner])).rows[0].is_muted, true);
  });
  await check('foreign teammate, self, blocked teammate and blocked actor are rejected', async () => {
    await assert.rejects(openDirect(outsider), /active teammate/);
    await assert.rejects(openDirect(owner), /another teammate/);
    await assert.rejects(openDirect(blocked), /active teammate/);
    await asUser(outsider);
    await assert.rejects(openDirect(peer), /membership required/);
    await asUser(blocked);
    await assert.rejects(openDirect(peer), /revoked/);
    await assert.rejects(page(direct), /access denied/);
    await asUser(owner);
  });
  await check('more than 80 messages page newest-first with stable timestamp ties and no duplicates or omissions', async () => {
    await privileged(() => query(`INSERT INTO public.messages(id,conversation_id,sender_id,content,created_at)
      SELECT ('20000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, $1, $2, 'message ' || n,
        '2026-09-24 12:00:00+00'::timestamptz + (n / 3) * interval '1 second' FROM generate_series(1,185) n`, [direct, owner]));
    let rows = (await page(direct)).rows;
    assert.equal(rows.length, 81);
    assert.equal(rows[0].content, 'message 185');
    const all = rows.slice(0,80);
    // A new arrival must not shift the older page's position like OFFSET does.
    await query("INSERT INTO public.messages(conversation_id,sender_id,content,created_at) VALUES($1,$2,'new arrival','2026-09-25')", [direct, owner]);
    while (rows.length > 80) {
      rows = (await page(direct, all.at(-1))).rows;
      all.push(...rows.slice(0,80));
    }
    assert.equal(all.length,185);
    assert.equal(new Set(all.map(row => row.id)).size,185);
    assert.deepEqual(all.map(row => row.content), Array.from({length:185}, (_,i) => `message ${185-i}`));
    assert.equal((await page(direct)).rows[0].content,'new arrival');
  });
  await check('soft-deleted messages and malformed cursors cannot produce misleading history', async () => {
    const message = (await page(direct)).rows[0];
    await query('UPDATE public.messages SET is_deleted=true WHERE id=$1', [message.id]);
    assert.equal((await page(direct)).rows[0].content,'message 185');
    await assert.rejects(query('SELECT * FROM public.list_workspace_messages($1,NULL,$2,81)', [direct,message.id]), /Invalid message cursor/);
    await assert.rejects(page(direct,null,102), /Invalid message cursor/);
  });
  await check('revoked membership and suspended organization deny protected read and new creation', async () => {
    await privileged(() => query('DELETE FROM public.organization_members WHERE organization_id=$1 AND user_id=$2', [organization,peer]));
    await asUser(peer);
    await assert.rejects(page(direct), /access denied/);
    assert.deepEqual((await query('SELECT id FROM public.messages WHERE conversation_id=$1', [direct])).rows, []);
    await asUser(owner);
    await privileged(() => query('UPDATE public.organizations SET suspended=true WHERE id=$1', [organization]));
    await assert.rejects(page(direct), /access denied/);
    await assert.rejects(channel('suspended'), /Workspace unavailable/);
    await privileged(() => query('UPDATE public.organizations SET suspended=false WHERE id=$1', [organization]));
  });
  await check('legacy exact-pair thread is adopted without merging contextual or personal history', async () => {
    const ids = await privileged(async () => {
      const personal = (await query("INSERT INTO public.conversations(conversation_type) VALUES('direct') RETURNING id")).rows[0].id;
      const contextual = (await query("INSERT INTO public.conversations(conversation_type,organization_id,property_id) VALUES('direct',$1,gen_random_uuid()) RETURNING id",[organization])).rows[0].id;
      const legacy = (await query("INSERT INTO public.conversations(conversation_type,organization_id) VALUES('direct',$1) RETURNING id",[organization])).rows[0].id;
      for (const id of [personal,contextual,legacy]) {
        await query('INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES($1,$2),($1,$3)',[id,owner,third]);
      }
      return {personal,contextual,legacy};
    });
    const before = await counts();
    assert.equal((await openDirect(third)).rows[0].id,ids.legacy);
    assert.deepEqual(await counts(), before);
    await privileged(async () => {
      const untouched = (await query('SELECT workspace_direct_key FROM public.conversations WHERE id=ANY($1::uuid[])',[ [ids.personal,ids.contextual] ])).rows;
      assert.deepEqual(untouched,[{workspace_direct_key:null},{workspace_direct_key:null}]);
    });
  });
  console.log(`${passed} isolated workspace chat checks passed.`);
  console.log('Limit: run a two-connection PostgreSQL test before claiming overlapping-transaction concurrency verification.');
} finally {
  await db.close();
}
