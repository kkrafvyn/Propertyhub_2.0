#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];
const warnings = [];
const passes = [];
const legacySpacedBrand = ["Property", "Hub"].join(" ");
const legacyCompactBrand = ["Property", "Hub"].join("");
const legacySlugBrand = "property" + "hub";

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(filePath(relativePath));
}

function pass(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function checkContains(relativePath, needle, label) {
  if (!exists(relativePath)) {
    fail(`${label}: missing ${relativePath}`);
    return;
  }

  if (!read(relativePath).includes(needle)) {
    fail(`${label}: ${relativePath} does not contain ${needle}`);
    return;
  }

  pass(label);
}

function checkNotContains(relativePath, needle, label) {
  if (!exists(relativePath)) {
    fail(`${label}: missing ${relativePath}`);
    return;
  }

  if (read(relativePath).includes(needle)) {
    fail(`${label}: ${relativePath} still contains ${needle}`);
    return;
  }

  pass(label);
}

function normalizeAndroidSdkDir(value) {
  return value
    .replace(/^sdk\.dir\s*=\s*/, "")
    .replace(/\\\\/g, "\\")
    .replace(/\\:/g, ":")
    .trim();
}

function getAndroidSdkPath() {
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    return process.env.ANDROID_HOME;
  }

  if (process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)) {
    return process.env.ANDROID_SDK_ROOT;
  }

  const localProperties = filePath("android/local.properties");
  if (fs.existsSync(localProperties)) {
    const line = fs
      .readFileSync(localProperties, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith("sdk.dir="));

    if (line) {
      const sdkPath = normalizeAndroidSdkDir(line);
      if (fs.existsSync(sdkPath)) return sdkPath;
    }
  }

  return null;
}

function checkPackage() {
  const packageJson = JSON.parse(read("package.json"));

  if (packageJson.name === "baytmiftah") {
    pass("Package metadata uses BaytMiftah name");
  } else {
    fail(`Package metadata should be baytmiftah. Current name: ${packageJson.name || "<missing>"}`);
  }

  if (packageJson.dependencies?.["@supabase/ssr"]) {
    fail("Remove unused @supabase/ssr to avoid the old cookie advisory.");
  } else {
    pass("Unused @supabase/ssr dependency removed");
  }

  if (packageJson.scripts?.["prod:env:check"] === "node scripts/checkProductionEnv.cjs") {
    pass("Production environment checker script documented in package.json");
  } else {
    fail("package.json should expose prod:env:check for launch credential validation.");
  }

  if (packageJson.scripts?.["qa:local"]) {
    pass("Local QA script is available");
  } else {
    fail("package.json should expose qa:local for repeatable launch checks.");
  }

  const viteVersion = packageJson.devDependencies?.vite || "";
  if (!/6\.(4\.[2-9]|[5-9]\.)/.test(viteVersion)) {
    warn(`Vite should stay on 6.4.2 or newer in the v6 line. Current range: ${viteVersion}`);
  } else {
    pass("Vite is on patched v6 release line");
  }
}

function checkNativeFiles() {
  checkContains("vercel.json", '"destination": "/index.html"', "Vercel SPA fallback rewrite");
  checkContains("capacitor.config.ts", 'appId: "com.baytmiftah.app"', "Capacitor BaytMiftah app ID");
  checkContains("capacitor.config.ts", 'appName: "BaytMiftah"', "Capacitor BaytMiftah app name");
  checkContains("android/app/build.gradle", 'applicationId "com.baytmiftah.app"', "Android BaytMiftah application ID");
  checkContains("android/app/src/main/res/values/strings.xml", "<string name=\"app_name\">BaytMiftah</string>", "Android BaytMiftah app label");
  checkContains("ios/App/App.xcodeproj/project.pbxproj", "PRODUCT_BUNDLE_IDENTIFIER = com.baytmiftah.app;", "iOS BaytMiftah bundle ID");
  checkContains("public/manifest.webmanifest", '"name": "BaytMiftah"', "Web manifest BaytMiftah name");
  checkContains("ios/App/App/Info.plist", "NSCameraUsageDescription", "iOS camera usage description");
  checkContains("ios/App/App/Info.plist", "NSLocationWhenInUseUsageDescription", "iOS location usage description");
  checkContains("ios/App/App/Info.plist", "NSFaceIDUsageDescription", "iOS Face ID usage description");
  checkContains("ios/App/App/PrivacyInfo.xcprivacy", "NSPrivacyCollectedDataTypes", "iOS privacy manifest");
  checkContains("ios/App/App/PrivacyInfo.xcprivacy", "NSPrivacyCollectedDataTypeUserID", "iOS account identifier disclosure");
  checkContains("ios/App/App/PrivacyInfo.xcprivacy", "NSPrivacyCollectedDataTypeOtherUserContent", "iOS user content disclosure");
  checkContains(
    "ios/App/App/PrivacyInfo.xcprivacy",
    "NSPrivacyAccessedAPICategoryUserDefaults",
    "iOS UserDefaults required-reason API declaration"
  );
  checkContains(
    "ios/App/App.xcodeproj/project.pbxproj",
    "PrivacyInfo.xcprivacy in Resources",
    "iOS privacy manifest is included in target resources"
  );
  checkContains("android/app/src/main/AndroidManifest.xml", "android.permission.POST_NOTIFICATIONS", "Android notification permission");
  checkContains("android/app/src/main/AndroidManifest.xml", "android.permission.CAMERA", "Android camera permission");
  checkContains("android/app/src/main/AndroidManifest.xml", "android.permission.ACCESS_FINE_LOCATION", "Android fine location permission");

  const sdkPath = getAndroidSdkPath();
  if (sdkPath) {
    pass(`Android SDK path exists: ${sdkPath}`);
  } else {
    fail("Android SDK path is missing. Set ANDROID_HOME, ANDROID_SDK_ROOT, or android/local.properties.");
  }
}

function checkEnvHygiene() {
  checkContains(".gitignore", ".env.local", "Local env files are ignored");
  checkContains(".env.example", "FCM_PROJECT_ID=", "FCM env placeholders documented");
  checkContains(".env.example", "APNS_BUNDLE_ID=com.baytmiftah.app", "APNS env placeholders documented");
  checkContains(".env.example", "WEB_PUSH_PRIVATE_KEY=", "Web push secret placeholder documented");
  checkContains(".env.example", "WEB_PUSH_CONTACT_EMAIL=mailto:support@baytmiftah.app", "BaytMiftah support contact documented");
  checkContains(".env.example", "PAYSTACK_PLAN_CODE_STARTER=", "Paystack Starter plan code documented");
  checkContains(".env.example", "PAYSTACK_PLAN_CODE_GROWTH=", "Paystack Growth plan code documented");
  checkContains(".env.example", "PAYSTACK_PLAN_CODE_PRO=", "Paystack Pro plan code documented");
  checkContains(".env.example", "PAYSTACK_DEFAULT_ESCROW_RECIPIENT_CODE=", "Paystack escrow recipient fallback documented");
  checkContains(".env.example", "STRIPE_SECRET_KEY=", "Stripe secret placeholder documented");
  checkContains(".env.example", "STRIPE_WEBHOOK_SECRET=", "Stripe webhook secret placeholder documented");
  checkContains(".env.example", "AUDIT_RSA_PRIVATE_KEY_PEM=", "Audit RSA private key placeholder documented");
  checkContains(".env.example", "AUDIT_RSA_PUBLIC_KEY_PEM=", "Audit RSA public key placeholder documented");
  checkContains(".env.example", "ANCHOR_JOB_SECRET=", "Audit anchoring job secret documented");
  checkContains(".env.example", "GITHUB_ANCHOR_REPO=", "Audit anchoring repo placeholder documented");
  checkContains(".env.example", "VITE_CONDITION_REPORT_MEDIA_BUCKET=condition-report-media", "Condition report media bucket documented");
  checkContains(".env.example", "TTLOCK_COMMAND_ENDPOINT=", "TTLock endpoint placeholder documented");
  checkContains(".env.example", "YALE_COMMAND_ENDPOINT=", "Yale endpoint placeholder documented");
  checkContains(".env.example", "TUYA_COMMAND_ENDPOINT=", "Tuya endpoint placeholder documented");
  checkContains(".env.example", "EDGE_RATE_LIMIT_MAX_REQUESTS=30", "Edge rate limit placeholder documented");
  checkContains(".env.example", "FLUTTERWAVE_SECRET_KEY=", "Flutterwave secret placeholder documented");
  checkContains(".env.example", "FLUTTERWAVE_WEBHOOK_SECRET_HASH=", "Flutterwave webhook secret placeholder documented");
  checkContains(".env.example", "IT_CONSORTIUM_MERCHANT_ID=", "IT Consortium merchant placeholder documented");

  const externalSecrets = [
    "WEB_PUSH_PRIVATE_KEY",
    "FCM_PROJECT_ID",
    "FCM_ACCESS_TOKEN",
    "FCM_SERVER_KEY",
    "APNS_BEARER_TOKEN",
    "APNS_BUNDLE_ID",
    "RESEND_API_KEY",
    "PAYSTACK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "AUDIT_RSA_PRIVATE_KEY_PEM",
    "AUDIT_RSA_PUBLIC_KEY_PEM",
    "ANCHOR_JOB_SECRET",
    "FLUTTERWAVE_SECRET_KEY",
    "FLUTTERWAVE_WEBHOOK_SECRET_HASH",
  ];

  if (process.env.IT_CONSORTIUM_ENABLED === "true") {
    externalSecrets.push("IT_CONSORTIUM_API_KEY", "IT_CONSORTIUM_MERCHANT_ID");
  }

  const missing = externalSecrets.filter((key) => !process.env[key]);
  if (missing.length) {
    warn(`External production secrets not present in this shell: ${missing.join(", ")}`);
  } else {
    pass("External production secrets are present in this shell");
  }
}

function checkReleaseDocs() {
  checkContains(
    "docs/deployment/RELEASE_HARDENING_CHECKLIST.md",
    "Counsel sign-off",
    "Release hardening checklist"
  );
  checkContains(
    "docs/deployment/APP_STORE_RELEASE.md",
    "Google Play Data safety",
    "App store disclosure guide"
  );
  checkContains(
    "supabase/queries/production_rls_audit.sql",
    "relrowsecurity",
    "Supabase RLS audit query"
  );
  checkContains(
    "docs/deployment/PRODUCTION_PROVIDER_ACTIVATION.md",
    "Paystack Ghana Lane",
    "Production provider activation runbook"
  );
  checkContains(
    "docs/deployment/RELEASE_HARDENING_CHECKLIST.md",
    "npm run prod:env:check",
    "Production env checker included in release checklist"
  );
  checkContains(
    "scripts/checkProductionEnv.cjs",
    "Production environment check passed",
    "Production environment checker implementation"
  );
}

function checkBranding() {
  const brandedFiles = [
    "index.html",
    "README.md",
    "public/manifest.webmanifest",
    "src/app/components/Navbar.tsx",
    "src/app/pages/legal/LegalPage.tsx",
    "src/app/mobile/MobileAppShell.tsx",
    "docs/deployment/APP_STORE_RELEASE.md",
  ];

  for (const brandedFile of brandedFiles) {
    checkContains(brandedFile, "BaytMiftah", `BaytMiftah branding in ${brandedFile}`);
    checkNotContains(brandedFile, legacySpacedBrand, `Legacy spaced brand removed from ${brandedFile}`);
    checkNotContains(brandedFile, legacyCompactBrand, `Legacy compact brand removed from ${brandedFile}`);
    checkNotContains(brandedFile, legacySlugBrand, `Legacy slug brand removed from ${brandedFile}`);
  }

  checkContains("src/lib/mobile-deep-link.service.ts", "baytmiftah", "BaytMiftah slug branding in deep links");
  checkNotContains("src/lib/mobile-deep-link.service.ts", legacySpacedBrand, "Legacy spaced brand removed from deep links");
  checkNotContains("src/lib/mobile-deep-link.service.ts", legacyCompactBrand, "Legacy compact brand removed from deep links");
  checkNotContains("src/lib/mobile-deep-link.service.ts", legacySlugBrand, "Legacy slug brand removed from deep links");
}

checkPackage();
checkBranding();
checkNativeFiles();
checkEnvHygiene();
checkReleaseDocs();

for (const message of passes) {
  console.log(`[pass] ${message}`);
}

for (const message of warnings) {
  console.warn(`[warn] ${message}`);
}

for (const message of failures) {
  console.error(`[fail] ${message}`);
}

if (failures.length) {
  process.exitCode = 1;
}
