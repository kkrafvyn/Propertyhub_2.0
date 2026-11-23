// Isolated PGlite regression tests run against the actual SQL migrations.
// This is NOT a substitute for a 3-user staging Supabase RLS/Realtime test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const ids = {
  org: "10000000-0000-0000-0000-000000000001",
  p1: "20000000-0000-0000-0000-000000000001",
  p2: "20000000-0000-0000-0000-000000000002",
  p3: "20000000-0000-0000-0000-000000000003",
  p4: "20000000-0000-0000-0000-000000000004",
  l1: "30000000-0000-0000-0000-000000000001",
  l2: "30000000-0000-0000-0000-000000000002",
  l3: "30000000-0000-0000-0000-000000000003",
  l4: "30000000-0000-0000-0000-000000000004",
  u1: "40000000-0000-0000-0000-000000000001",
  u2: "40000000-0000-0000-0000-000000000002",
  u3: "40000000-0000-0000-0000-000000000003",
  c1: "50000000-0000-0000-0000-000000000001",
  c2: "50000000-0000-0000-0000-000000000002",
};
const sql = (file) => readFileSync(`supabase/migrations/${file}`, "utf8");
const query = (text, params = []) => db.query(text, params);
let passed = 0;
async function verify(name, fn) { await fn(); console.log(`PASS ${name}`); passed++; }

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.uid', true),'')::uuid
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.role', true),'')
    $$;
    CREATE TABLE public.organizations(id uuid PRIMARY KEY, slug text, verified boolean);
    CREATE TABLE public.properties(id uuid PRIMARY KEY, category text, bedrooms int,
      bathrooms int, city text, region text, country text, address text,
      latitude double precision, longitude double precision, amenities text[]);
    CREATE TABLE public.listings(id uuid PRIMARY KEY, property_id uuid REFERENCES public.properties,
      organization_id uuid REFERENCES public.organizations, status text,
      visibility text, listing_type text, featured boolean,
      price numeric, currency text, published_at timestamptz);
    CREATE TABLE public.conversations(id uuid PRIMARY KEY,
      conversation_type text, participant_1_id uuid, participant_2_id uuid);
    CREATE TABLE public.conversation_participants(conversation_id uuid, user_id uuid);
    CREATE TABLE public.blocked_users(blocker_id uuid, blocked_id uuid);
    CREATE TABLE public.messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id uuid, conversation_id uuid, content text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY pub_org ON public.organizations FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY pub_property ON public.properties FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY pub_listings ON public.listings FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
      WITH CHECK (sender_id = auth.uid());
    CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING(true);
    GRANT USAGE ON SCHEMA public, auth, private TO anon, authenticated;
    GRANT SELECT ON public.organizations, public.properties, public.listings TO anon, authenticated;
    GRANT SELECT, INSERT ON public.messages TO authenticated;
    INSERT INTO public.organizations VALUES ('${ids.org}','realty-ltd',true);
    INSERT INTO public.properties VALUES
      ('${ids.p1}','apartment',2,2,'Accra','Greater Accra','Ghana','Airport City',5.604,-0.185,ARRAY['parking','furnished']),
      ('${ids.p2}','apartment',3,2,'Accra','Greater Accra','Ghana','East Legon',5.652,-0.153,ARRAY['parking']),
      ('${ids.p3}','office',0,1,'Kumasi','Ashanti','Ghana','Adum',6.687,-1.63,ARRAY['parking']),
      ('${ids.p4}','house',3,2,'Accra','Greater Accra','Ghana','Hidden',5.601,-0.18,ARRAY['parking']);
    INSERT INTO public.listings VALUES
      ('${ids.l1}','${ids.p1}','${ids.org}','listed','public','rental',false,2000,'GHS',now()-interval '1 day'),
      ('${ids.l2}','${ids.p2}','${ids.org}','listed','public','rental',true,1000,'GHS',now()),
      ('${ids.l3}','${ids.p3}','${ids.org}','listed','public','sale',false,900,'USD',now()-interval '2 days'),
      ('${ids.l4}','${ids.p4}','${ids.org}','listed','private','sale',false,100,'GHS',now());
    INSERT INTO public.conversations VALUES
      ('${ids.c1}','direct','${ids.u1}','${ids.u2}'),
      ('${ids.c2}','direct','${ids.u1}','${ids.u3}');
    INSERT INTO public.conversation_participants VALUES
      ('${ids.c1}','${ids.u1}'), ('${ids.c1}','${ids.u2}'),
      ('${ids.c2}','${ids.u1}'), ('${ids.c2}','${ids.u3}');
    INSERT INTO public.blocked_users VALUES ('${ids.u3}','${ids.u1}');
  `);
  await db.exec(sql("20261123101000_public_search_server_pagination.sql"));
  await db.exec(sql("20261123102000_message_abuse_block_rate.sql"));

  await db.exec("SET ROLE anon");
  await verify("public search returns only published/visible rows and exact total", async () => {
    const result = (await query("SELECT public.search_public_listing_ids(p_limit=>2,p_offset=>0) AS result")).rows[0].result;
    assert.equal(result.total,3);
    assert.equal(result.ids.length,2);
    assert.deepEqual(result.ids,[ids.l2,ids.l1]);
    const second = (await query("SELECT public.search_public_listing_ids(p_limit=>2,p_offset=>2) AS result")).rows[0].result;
    assert.deepEqual(second.ids,[ids.l3]);
  });
  await verify("search filters amenities/currency and geographic bounds on server", async () => {
    const result=(await query(`SELECT public.search_public_listing_ids(
      p_currency=>'GHS',p_amenities=>ARRAY['parking','furnished'],
      p_bounds=>'{"north":5.7,"south":5.5,"east":0,"west":-0.3}'::jsonb
    ) AS result`)).rows[0].result;
    assert.deepEqual(result.ids,[ids.l1]);
    assert.equal(result.total,1);
  });
  await verify("price ordering stays inside one currency and invalid limits fail", async () => {
    const result=(await query("SELECT public.search_public_listing_ids(p_sort=>'price_asc',p_currency=>'GHS') AS result")).rows[0].result;
    assert.deepEqual(result.ids,[ids.l2,ids.l1]);
    await assert.rejects(query("SELECT public.search_public_listing_ids(p_limit=>999)"),/Invalid public search parameters/);
  });

  await db.exec("RESET ROLE");
  await query("SELECT set_config('test.uid',$1,false),set_config('test.role','authenticated',false)", [ids.u1]);
  await db.exec("SET ROLE authenticated");
  await verify("blocked direct messages fail at the SQL boundary", async () => {
    await assert.rejects(query("INSERT INTO public.messages(sender_id,conversation_id,content) VALUES($1,$2,$3)",[ids.u1,ids.c2,"hello"]), /cannot receive messages/);
  });
  await verify("forged sender and empty messages are rejected", async () => {
    await assert.rejects(query("INSERT INTO public.messages(sender_id,conversation_id,content) VALUES($1,$2,$3)",[ids.u2,ids.c1,"hello"]), /Authenticated sender is required|row-level security/);
    await assert.rejects(query("INSERT INTO public.messages(sender_id,conversation_id,content) VALUES($1,$2,$3)",[ids.u1,ids.c1," "]), /1 to 4000/);
  });
  await verify("20 authenticated messages per minute, never 21", async () => {
    for(let i=0;i<20;i++) await query("INSERT INTO public.messages(sender_id,conversation_id,content) VALUES($1,$2,$3)",[ids.u1,ids.c1,`Message ${i}`]);
    await assert.rejects(query("INSERT INTO public.messages(sender_id,conversation_id,content) VALUES($1,$2,$3)",[ids.u1,ids.c1,"one more"]), /Too many messages/);
  });

  console.log(`PASS isolated marketplace SQL regressions (${passed})`);
} finally {
  await db.close();
}
