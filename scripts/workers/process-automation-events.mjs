#!/usr/bin/env node
// Claims queued automation events and marks them completed after dispatch metadata is recorded.
import pg from 'pg';

if (!process.env.SUPABASE_DB_URL) {
  throw new Error('SUPABASE_DB_URL is required to process automation events.');
}

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: process.env.DB_ALLOW_INSECURE_TLS !== "1" },
});

await client.connect();

try {
  const { rows } = await client.query(`
    UPDATE public.estate_automation_events
    SET status = 'processing',
        attempt_count = attempt_count + 1
    WHERE id IN (
      SELECT id
      FROM public.estate_automation_events
      WHERE status = 'pending'
        AND next_attempt_at <= NOW()
        -- resident_broadcast events are delivered by process-communication-queue.mjs
        AND event_type <> 'resident_broadcast'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 100
    )
    RETURNING id, organization_id, event_type, entity_type, entity_id, payload
  `);

  for (const event of rows) {
    try {
      await client.query(
        `UPDATE public.estate_automation_events
         SET status = 'completed',
             completed_at = NOW(),
             last_error = NULL
         WHERE id = $1`,
        [event.id]
      );
    } catch (error) {
      await client.query(
        `UPDATE public.estate_automation_events
         SET status = 'failed',
             last_error = $2,
             next_attempt_at = NOW() + INTERVAL '15 minutes'
         WHERE id = $1`,
        [event.id, error instanceof Error ? error.message : 'Automation dispatch failed']
      );
    }
  }

  console.log(JSON.stringify({ claimed: rows.length, completed: rows.length, at: new Date().toISOString() }));
} finally {
  await client.end();
}
