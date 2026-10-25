#!/usr/bin/env node

/**
 * Provisions native projects for the BaytMiftah Workspace (business) mobile app.
 * Clones consumer android/ → android-business/ and ios/ → ios-business/ with new IDs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONSUMER_PACKAGE = 'com.baymiftah.app';
const BUSINESS_PACKAGE = 'com.baymiftah.workspace';
const BUSINESS_ICON_BG = '#0B2545';

const SKIP_DIRS = new Set(['.gradle', 'build', '.idea', 'local.properties']);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = from instanceof RegExp ? content.replace(from, to) : content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content);
}

function applyBusinessLauncherIcons(dest) {
  const foregroundSrc = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable-v24', 'ic_launcher_foreground_workspace.xml');
  const foregroundDest = path.join(dest, 'app', 'src', 'main', 'res', 'drawable-v24', 'ic_launcher_foreground_workspace.xml');

  if (fs.existsSync(foregroundSrc)) {
    fs.mkdirSync(path.dirname(foregroundDest), { recursive: true });
    fs.copyFileSync(foregroundSrc, foregroundDest);
  }

  for (const launcherFile of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const launcherPath = path.join(dest, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26', launcherFile);
    replaceInFile(launcherPath, [
      [/@drawable\/ic_launcher_foreground(?:_workspace)*/g, '@drawable/ic_launcher_foreground_workspace'],
    ]);
  }

  const brandSrc = path.join(ROOT, 'public', 'brand', 'app-icon-workspace.svg');
  const brandDest = path.join(dest, 'app', 'src', 'main', 'assets', 'public', 'brand', 'app-icon-workspace.svg');
  if (fs.existsSync(brandSrc)) {
    fs.mkdirSync(path.dirname(brandDest), { recursive: true });
    fs.copyFileSync(brandSrc, brandDest);
  }
}

function applyBusinessSplash(dest) {
  const colorsPath = path.join(dest, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
  const splashDir = path.join(dest, 'app', 'src', 'main', 'res', 'drawable');

  if (!fs.existsSync(colorsPath)) {
    fs.mkdirSync(path.dirname(colorsPath), { recursive: true });
    fs.writeFileSync(
      colorsPath,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_background">${BUSINESS_ICON_BG}</color>\n</resources>\n`,
    );
  } else {
    replaceInFile(colorsPath, [['#0F2922', BUSINESS_ICON_BG]]);
  }

  for (const file of ['splash.xml', 'splash_logo.xml']) {
    const src = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable', file);
    const target = path.join(splashDir, file);
    if (fs.existsSync(src)) {
      fs.mkdirSync(splashDir, { recursive: true });
      fs.copyFileSync(src, target);
    }
  }
}

function provisionAndroidBusiness() {
  const src = path.join(ROOT, 'android');
  const dest = path.join(ROOT, 'android-business');

  if (!fs.existsSync(src)) {
    console.error('❌ android/ not found. Run: npx cap add android');
    process.exit(1);
  }

  if (fs.existsSync(dest)) {
    console.log('ℹ️  android-business/ already exists — refreshing branding only');
  } else {
    console.log('📁 Creating android-business/ from android/ …');
    copyDir(src, dest);
  }

  replaceInFile(path.join(dest, 'app', 'build.gradle'), [
    [CONSUMER_PACKAGE, BUSINESS_PACKAGE],
  ]);

  replaceInFile(path.join(dest, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), [
    ['<string name="app_name">BaytMiftah</string>', '<string name="app_name">BaytMiftah Workspace</string>'],
    ['<string name="title_activity_main">BaytMiftah</string>', '<string name="title_activity_main">BaytMiftah Workspace</string>'],
    [CONSUMER_PACKAGE, BUSINESS_PACKAGE],
  ]);

  replaceInFile(path.join(dest, 'app', 'src', 'main', 'res', 'values', 'ic_launcher_background.xml'), [
    ['#0F2922', BUSINESS_ICON_BG],
  ]);

  replaceInFile(path.join(dest, 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_background.xml'), [
    ['#0F2922', BUSINESS_ICON_BG],
  ]);

  const oldActivity = path.join(dest, 'app', 'src', 'main', 'java', 'com', 'baymiftah', 'app', 'MainActivity.java');
  const newActivityDir = path.join(dest, 'app', 'src', 'main', 'java', 'com', 'baymiftah', 'workspace');
  const newActivity = path.join(newActivityDir, 'MainActivity.java');

  if (fs.existsSync(oldActivity)) {
    fs.mkdirSync(newActivityDir, { recursive: true });
    fs.writeFileSync(
      newActivity,
      `package ${BUSINESS_PACKAGE};\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {}\n`,
    );
    fs.rmSync(path.join(dest, 'app', 'src', 'main', 'java', 'com', 'baymiftah', 'app'), {
      recursive: true,
      force: true,
    });
  }

  applyBusinessLauncherIcons(dest);
  applyBusinessSplash(dest);

  console.log(`✅ Android business app: ${BUSINESS_PACKAGE}`);
}

function provisionIosBusiness() {
  const src = path.join(ROOT, 'ios');
  const dest = path.join(ROOT, 'ios-business');

  if (!fs.existsSync(src)) {
    console.log('ℹ️  ios/ not found — skipping ios-business');
    return;
  }

  if (!fs.existsSync(dest)) {
    console.log('📁 Creating ios-business/ from ios/ …');
    copyDir(src, dest);
  } else {
    console.log('ℹ️  ios-business/ already exists — refreshing bundle ID');
  }

  const pbx = path.join(dest, 'App', 'App.xcodeproj', 'project.pbxproj');
  replaceInFile(pbx, [[CONSUMER_PACKAGE, BUSINESS_PACKAGE]]);

  const infoPlist = path.join(dest, 'App', 'App', 'Info.plist');
  replaceInFile(infoPlist, [
    ['<string>Property Hub</string>', '<string>BaytMiftah Workspace</string>'],
    ['<string>BaytMiftah</string>', '<string>BaytMiftah Workspace</string>'],
  ]);

  console.log(`✅ iOS business app: ${BUSINESS_PACKAGE}`);
}

console.log('📱 Provisioning BaytMiftah Workspace native projects…\n');
provisionAndroidBusiness();
provisionIosBusiness();
console.log('\nDone. Run: npm run mobile:business:sync');
