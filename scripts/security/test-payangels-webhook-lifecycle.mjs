// Isolated PostgreSQL verification of PayAngels claimed/retry/completion states.
// Provider-issued signature and payment-settlement tests still require staging.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const payloadHash = "a".repeat(64);
const otherHash = "b".repeat(64);
const query = (sql, values = []) => db.query(sql, values);
let passed = 0;
async function check(label, run) {
  await run();
  passed++;
  console.log(`PASS ${label}`);
}
async function claim(id = "charge.success:provider-event-42", digest = payloadHash) {
  const { rows } = await query(
    "SELECT public.claim_payangels_webhook_event($1,$2,$3) AS result",
    [id,digest,"BM-CHECK-42"]
  );
  return rows[0].result;
}
async function finish(id, token, succeeded) {
  const { rows } = await query(
    "SELECT public.finish_payangels_webhook_event($1,$2,$3,$4) AS result",
    [id,token,succeeded,succeeded ? null : "provider timed out"]
  );
  return rows[0].result;
}

try {
  await db.exec(`
    CREATE ROLE service_role;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.role', true),'')
    $$;
    GRANT USAGE ON SCHEMA public,auth TO service_role, authenticated;
  `);
  await db.exec(readFileSync(
    "supabase/migrations/20261123103000_payangels_webhook_retry_state.sql","utf8"
  ));
  await query("SELECT set_config('test.role','service_role',false)");
  await db.exec("SET ROLE service_role");

  const eventId="charge.success:provider-event-42";
  const first=await claim();
  await check("new webhook is claimed with a durable lease",async()=>{
    assert.equal(first.state,"claimed");
    assert.match(first.token,/^[a-f0-9-]{36}$/i);
  });
  await check("duplicate while worker active returns busy, not acknowledged as complete",async()=>{
    assert.equal((await claim()).state,"busy");
  });
  await check("failed handler makes exact event retryable with a new token",async()=>{
    assert.equal(await finish(eventId,first.token,false),true);
    const retry=await claim();
    assert.equal(retry.state,"claimed");
    assert.notEqual(retry.token,first.token);
    assert.equal(await finish(eventId,first.token,true),false);
    assert.equal(await finish(eventId,retry.token,true),true);
  });
  await check("completed event is acknowledged without reprocessing",async()=>{
    assert.equal((await claim()).state,"completed");
  });
  await check("same event ID with conflicting payload hash is rejected",async()=>{
    await assert.rejects(claim(eventId,otherHash),/identity collision/);
  });
  await check("a separate lifecycle event from the same refund may be claimed",async()=>{
    const result=await claim("refund.processed:provider-event-42",otherHash);
    assert.equal(result.state,"claimed");
  });
  console.log(`PASS PayAngels retry state SQL (${passed})`);
} finally {
  await db.close();
}
