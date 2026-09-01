#!/usr/bin/env node

/**
 * Build web bundle + Capacitor sync for consumer or business mobile app.
 * Usage: node scripts/mobile-sync.mjs [consumer|business]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

if (variant === 'business') {
  execSync('node scripts/provision-mobile-business.mjs', { cwd: ROOT, stdio: 'inherit' });
}

const env = {
  ...process.env,
  MOBILE_APP: variant,
  VITE_MOBILE_APP: variant,
};

console.log(`\n📱 Syncing ${variant} mobile app (${configFile})…\n`);

execSync('npm run build:web', { cwd: ROOT, stdio: 'inherit', env });

// Capacitor CLI reads capacitor.config.json — copy the variant config before sync.
const variantConfig = fs.readFileSync(configPath, 'utf8');
fs.writeFileSync(path.join(ROOT, 'capacitor.config.json'), variantConfig);

execSync('npx cap sync', { cwd: ROOT, stdio: 'inherit', env });

const config = JSON.parse(variantConfig);
console.log(`\n✅ ${config.appName} (${config.appId}) synced`);
console.log(`   Android: ${config.android?.path || 'android'}`);
console.log(`   iOS: ${config.ios?.path || 'ios'}`);
