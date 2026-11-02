#!/usr/bin/env node
/**
 * Seed Supabase marketing_page_drafts + marketing_page_published with repo defaults.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (service role bypasses RLS).
 *
 *   node scripts/marketing/publish-homepage-default.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from '../load-project-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JSON_PATH = path.join(ROOT, 'marketing', 'cms', 'homepage-default.json');

const env = loadProjectEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!fs.existsSync(JSON_PATH)) {
  console.error(`Missing ${path.relative(ROOT, JSON_PATH)} — run: npm run marketing:export-default`);
  process.exit(1);
}

const document = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await supabase.from('marketing_page_drafts').select('revision').eq('id', 'homepage').maybeSingle();
const revision = (existing?.revision ?? 0) + 1;

const { error: draftError } = await supabase.from('marketing_page_drafts').upsert({
  id: 'homepage',
  document,
  revision,
  updated_at: new Date().toISOString(),
});
if (draftError) {
  console.error('Draft upsert failed:', draftError.message);
  process.exit(1);
}

const { error: pubError } = await supabase.from('marketing_page_published').upsert({
  id: 'homepage',
  document,
  revision,
  published_at: new Date().toISOString(),
});
if (pubError) {
  console.error('Published upsert failed:', pubError.message);
  process.exit(1);
}

console.log(`Marketing homepage default published at revision ${revision}.`);
