#!/usr/bin/env node
/**
 * Write marketing/cms/homepage-default.json from validateMarketingDocument(DEFAULT).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

execFileSync(
  'npx',
  ['vitest', 'run', 'src/lib/marketing-page-document.test.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, EXPORT_MARKETING_CMS: '1' },
  },
);
