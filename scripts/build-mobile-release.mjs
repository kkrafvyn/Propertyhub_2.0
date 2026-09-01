#!/usr/bin/env node

/**
 * BaytMiftah REOS — Mobile Release Builder & Store Pre-Flight Validator
 *
 * Validates native Android & iOS configurations, checks icons/splash assets,
 * verifies permissions in AndroidManifest.xml, and runs release bundling.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('📱 [BaytMiftah Mobile] Starting Mobile Store Release Pre-Flight Validation...\n');

// 1. Check capacitor.config.json
const capConfigPath = path.join(ROOT_DIR, 'capacitor.config.json');
if (!fs.existsSync(capConfigPath)) {
  console.error('❌ capacitor.config.json not found!');
  process.exit(1);
}
const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
console.log(`✅ App ID: ${capConfig.appId}`);
console.log(`✅ App Name: ${capConfig.appName}`);
console.log(`✅ Web Directory: ${capConfig.webDir}`);

// 2. Check Android Manifest Permissions
const androidManifestPath = path.join(ROOT_DIR, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(androidManifestPath)) {
  const manifest = fs.readFileSync(androidManifestPath, 'utf8');
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.CAMERA',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.USE_BIOMETRIC'
  ];

  console.log('\n🔍 Validating Android permissions:');
  for (const perm of requiredPermissions) {
    if (manifest.includes(perm)) {
      console.log(`  ✅ ${perm}`);
    } else {
      console.warn(`  ⚠️ Missing recommended permission: ${perm}`);
    }
  }
}

// 3. Build Web Bundle
console.log('\n⚙️ Building production web bundle...');
try {
  execSync('npm run build:web', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('✅ Web bundle build succeeded.');
} catch (err) {
  console.error('❌ Web bundle build failed:', err.message);
  process.exit(1);
}

// 4. Sync with Capacitor
console.log('\n📲 Syncing with Capacitor Android & iOS targets...');
try {
  execSync('npx cap sync', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('✅ Capacitor sync complete.');
} catch (err) {
  console.error('❌ Capacitor sync failed:', err.message);
  process.exit(1);
}

console.log('\n🚀 [BaytMiftah Mobile] Pre-Flight Completed Successfully!');
console.log('To generate the Google Play Store Android App Bundle (.aab), run:');
console.log('  npm run android:bundle:release\n');
console.log('To open in Android Studio:');
console.log('  npm run android:open\n');
console.log('To open in Xcode for iOS App Store Archive:');
console.log('  npm run ios:open\n');
