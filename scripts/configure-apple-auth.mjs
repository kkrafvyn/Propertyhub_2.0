#!/usr/bin/env node

/**
 * Enables the Apple provider for the connected Supabase project without
 * persisting the generated Apple client-secret JWT to disk.
 *
 * Required .env values:
 *   SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN,
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_PATH
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require('./load-project-env.cjs');
const env = loadProjectEnv();

const required = [
  'SUPABASE_PROJECT_REF',
  'SUPABASE_ACCESS_TOKEN',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_SERVICES_ID',
  'APPLE_PRIVATE_KEY_PATH',
];
const missing = required.filter((key) => !env[key]?.trim());
if (missing.length) {
  console.error(`Missing required .env values: ${missing.join(', ')}`);
  process.exit(1);
}

let secret;
try {
  secret = execFileSync(process.execPath, ['scripts/generate-apple-client-secret.mjs', '--print'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
} catch {
  console.error('Unable to generate the Apple client-secret JWT.');
  process.exit(1);
}

if (secret.split('.').length !== 3) {
  console.error('Generated Apple client secret is not a JWT.');
  process.exit(1);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_apple_enabled: true,
      external_apple_client_id: env.APPLE_SERVICES_ID.trim(),
      external_apple_secret: secret,
    }),
  },
);

if (!response.ok) {
  console.error(`Failed to enable Apple Auth (${response.status}): ${await response.text()}`);
  process.exit(1);
}

console.log(`Apple Auth enabled for ${env.APPLE_SERVICES_ID.trim()}.`);
console.log('The generated JWT was not written to disk. Rotate it before its Apple expiry.');
