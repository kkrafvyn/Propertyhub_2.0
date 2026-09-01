#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const jobs = [
  'scripts/workers/generate-recurring-charges.mjs',
  'scripts/workers/verify-collection-promises.mjs',
  'scripts/workers/process-automation-events.mjs',
  'scripts/workers/estate-operations-worker.mjs',
  'scripts/workers/night-watch-audit.mjs',
  'scripts/workers/process-owner-statement-deliveries.mjs',
  'scripts/workers/process-communication-queue.mjs',
  'scripts/workers/apply-data-retention.mjs',
];

function runJob(relativePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, relativePath)], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve(relativePath);
      else reject(new Error(`${relativePath} exited with code ${code}`));
    });
  });
}

const results = [];
for (const job of jobs) {
  try {
    await runJob(job);
    results.push({ job, status: 'ok' });
  } catch (error) {
    results.push({ job, status: 'failed', error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
process.exit(results.some((r) => r.status === 'failed') ? 1 : 0);
