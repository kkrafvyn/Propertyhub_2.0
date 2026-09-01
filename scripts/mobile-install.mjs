#!/usr/bin/env node

/**
 * Install debug APK for consumer or business variant with sane Windows defaults.
 * Usage: node scripts/mobile-install.mjs [consumer|business]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const variant = process.argv[2] || 'consumer';
const task = process.argv[3] === 'bundle' ? 'bundleRelease' : 'installDebug';
if (!['consumer', 'business'].includes(variant)) {
  console.error('Usage: node scripts/mobile-install.mjs [consumer|business] [bundle]');
  process.exit(1);
}

const androidDir = variant === 'business' ? 'android-business' : 'android';
const gradlew = path.join(ROOT, androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

if (!fs.existsSync(gradlew)) {
  console.error(`❌ Missing ${androidDir}/gradlew — run mobile:${variant}:sync first`);
  process.exit(1);
}

const javaCandidates = [
  process.env.JAVA_HOME,
  'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot',
  'C:\\Program Files\\Android\\Android Studio\\jbr',
].filter(Boolean);

const javaHome =
  javaCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'bin', 'java.exe'))) ||
  javaCandidates[0];

const sdkRoot =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
};

console.log(`\n📲 Running ${task} for ${variant} (${androidDir})…`);
console.log(`   JAVA_HOME=${javaHome}`);
console.log(`   ANDROID_HOME=${sdkRoot}\n`);

execSync(process.platform === 'win32' ? `gradlew.bat ${task}` : `./gradlew ${task}`, {
  cwd: path.join(ROOT, androidDir),
  stdio: 'inherit',
  env,
});

console.log(`\n✅ ${variant} ${task} finished`);
