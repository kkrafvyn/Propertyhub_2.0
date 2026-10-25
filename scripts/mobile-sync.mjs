#!/usr/bin/env node

/**
 * Build web bundle + Capacitor sync for consumer or business mobile app.
 * Usage: node scripts/mobile-sync.mjs [consumer|business]
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const variant = process.argv[2] || 'consumer';
if (!['consumer', 'business'].includes(variant)) {
  console.error('Usage: node scripts/mobile-sync.mjs [consumer|business]');
  process.exit(1);
}

const configFile = `capacitor.config.${variant}.json`;
const configPath = path.join(ROOT, configFile);

if (!fs.existsSync(configPath)) {
  console.error(`❌ Missing ${configFile}`);
  process.exit(1);
}

const env = {
  ...process.env,
  MOBILE_APP: variant,
  VITE_MOBILE_APP: variant,
};

if (variant === 'business' && env.MOBILE_SYNC_SKIP_PROVISION !== '1') {
  execFileSync(process.execPath, ['scripts/provision-mobile-business.mjs'], { cwd: ROOT, stdio: 'inherit' });
}

// Regenerate launch assets before copying the selected app into native projects.
execFileSync(process.execPath, ['scripts/export-brand-icons.mjs'], { cwd: ROOT, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/apple/export-store-icons.mjs'], { cwd: ROOT, stdio: 'inherit' });

console.log(`\n📱 Syncing ${variant} mobile app (${configFile})…\n`);

execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: ROOT, stdio: 'inherit', env });

// Capacitor CLI prefers capacitor.config.ts over .json when both exist — write both.
const variantConfig = fs.readFileSync(configPath, 'utf8');
const parsed = JSON.parse(variantConfig);
const jsonPath = path.join(ROOT, 'capacitor.config.json');
const originalJsonConfig = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : null;
fs.writeFileSync(jsonPath, variantConfig);

const tsPath = path.join(ROOT, 'capacitor.config.ts');
const tsBackupPath = path.join(ROOT, 'capacitor.config.ts.sync-backup');
const hadTs = fs.existsSync(tsPath);
if (hadTs) {
  fs.copyFileSync(tsPath, tsBackupPath);
}
fs.writeFileSync(
  tsPath,
  `import type { CapacitorConfig } from "@capacitor/cli";\n\nconst config: CapacitorConfig = ${JSON.stringify(parsed, null, 2)} as CapacitorConfig;\n\nexport default config;\n`,
);

try {
  const capacitorCommand = env.MOBILE_SYNC_COPY_ONLY === '1' ? 'copy' : 'sync';
  execFileSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', capacitorCommand], { cwd: ROOT, stdio: 'inherit', env });
} finally {
  if (originalJsonConfig === null) {
    fs.rmSync(jsonPath, { force: true });
  } else {
    fs.writeFileSync(jsonPath, originalJsonConfig);
  }
  if (hadTs && fs.existsSync(tsBackupPath)) {
    fs.renameSync(tsBackupPath, tsPath);
  }
}

const config = parsed;
console.log(`\n✅ ${config.appName} (${config.appId}) synced`);
console.log(`   Android: ${config.android?.path || 'android'}`);
console.log(`   iOS: ${config.ios?.path || 'ios'}`);
