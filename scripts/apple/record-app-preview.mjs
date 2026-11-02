#!/usr/bin/env node
/**
 * Record App Store app preview from live in-app UI only (no device frames / brag).
 *
 * Usage:
 *   node scripts/apple/record-app-preview.mjs consumer [--demo]
 *   node scripts/apple/record-app-preview.mjs workspace [--demo]
 *
 * --demo  Use secrets/app-review/store-demo.json (fictional booking/leads flows).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { encodeAppleAppPreview } from "./encode-app-preview.mjs";
import { loadStoreDemoManifest } from "./load-store-demo-manifest.mjs";
import {
  consumerStoreDemoJourney,
  workspaceStoreDemoJourney,
  dismissMarketGateIfPresent,
  slowScroll,
  gotoApp,
} from "./demo-journeys.mjs";
import { extractConnectScreenshots } from "./extract-connect-screenshots.mjs";
import { seedAuthOnContext } from "./auth-session-for-capture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const DEFAULT_MARKET = {
  jurisdictionId: "GH",
  country: "Ghana",
  region: "Greater Accra",
  city: "Accra",
  searchLocation: "Accra, Ghana",
  currency: "GHS",
  timezone: "Africa/Accra",
  suggestedLocale: "en",
  defaultListingMode: "rent",
  completedAt: "2020-01-01T00:00:00.000Z",
};

/** @param {import('playwright').Page} page */
async function seedMarket(page) {
  await page.addInitScript((market) => {
    try {
      localStorage.setItem("baytmiftah_user_market", JSON.stringify(market));
      localStorage.setItem("baytmiftah_onboarding_complete", "1");
    } catch {
      /* ignore */
    }
  }, DEFAULT_MARKET);
}

/** @param {import('playwright').Page} page @param {string} baseURL */
async function consumerJourneyBasic(page, baseURL) {
  await gotoApp(page, baseURL, "/search?listingType=rental&q=Accra");
  await page.getByRole("heading", { level: 1, name: /properties for rent/i }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await slowScroll(page, 900);

  const propertyLink = page.locator('a[href^="/property/"]').first();
  if (await propertyLink.count()) {
    await propertyLink.click();
    await page.waitForURL(/\/property\//, { timeout: 15_000 });
    await page.waitForTimeout(600);
    await slowScroll(page, 700);
  }

  await gotoApp(page, baseURL, "/search?listingType=short_stay");
  await page.waitForTimeout(400);
  await slowScroll(page, 400);
}

/** @param {import('playwright').Page} page @param {string} baseURL */
async function workspaceJourneyBasic(page, baseURL) {
  const email =
    process.env.APPLE_PREVIEW_WORKSPACE_EMAIL?.trim() ||
    process.env.E2E_TEST_USER_EMAIL?.trim();
  const password =
    process.env.APPLE_PREVIEW_WORKSPACE_PASSWORD?.trim() ||
    process.env.E2E_TEST_USER_PASSWORD?.trim();
  const orgSlug = process.env.APPLE_PREVIEW_ORG_SLUG?.trim();

  if (email && password) {
    await gotoApp(page, baseURL, "/login?next=%2Fworkspace");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForURL(/\/(workspace|app)/, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await gotoApp(page, baseURL, "/workspace");
    await page.waitForTimeout(1200);
  }

  if (orgSlug) {
    await gotoApp(page, baseURL, `/workspace/${orgSlug}/listings`);
    await page.waitForTimeout(800);
    await slowScroll(page, 600);
    await gotoApp(page, baseURL, `/workspace/${orgSlug}/leads`);
    await page.waitForTimeout(800);
    await slowScroll(page, 500);
  }
}

/** @param {string} dir */
function newestVideoFile(dir) {
  const files = readdirSync(dir)
    .filter((f) => /\.webm$|\.mp4$/i.test(f))
    .map((f) => ({ f, m: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return files[0]?.f ? path.join(dir, files[0].f) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const variant = args.find((a) => a === "consumer" || a === "workspace");
  const manifest = await loadStoreDemoManifest();
  const useDemo = args.includes("--demo") || (Boolean(manifest) && !args.includes("--no-demo"));
  const demo = useDemo ? manifest : null;

  if (!variant) {
    console.error("Usage: node scripts/apple/record-app-preview.mjs <consumer|workspace> [--demo|--no-demo]");
    process.exit(1);
  }
  const baseURL = useDemo
    ? demo?.baseURL || "https://app.baytmiftah.com"
    : process.env.PLAYWRIGHT_BASE_URL?.trim() ||
      demo?.baseURL ||
      "https://app.baytmiftah.com";

  if (useDemo && !demo) {
    console.error("Missing secrets/app-review/store-demo.json — run: npm run apple:provision-store-demo");
    process.exit(1);
  }

  const sourceDir = path.join(ROOT, "marketing", "apple", variant, "source");
  mkdirSync(sourceDir, { recursive: true });

  const headed = args.includes("--headed");
  const browser = await chromium.launch({ headless: !headed });
  const device = devices["iPhone 14 Pro Max"];

  const context = await browser.newContext({
    ...device,
    recordVideo: {
      dir: sourceDir,
      size: { width: device.viewport.width, height: device.viewport.height },
    },
    locale: "en-US",
    colorScheme: "light",
  });

  if (demo) {
    const creds =
      variant === "consumer"
        ? [demo.consumer.email, demo.consumer.password]
        : [demo.workspace.email, demo.workspace.password];
    await seedAuthOnContext(context, creds[0], creds[1]);
  }

  const page = await context.newPage();
  await seedMarket(page);

  console.log(
    `Recording ${variant} in-app preview from ${baseURL}${demo ? " (store demo data)" : ""} …`,
  );

  if (demo && variant === "consumer") {
    await consumerStoreDemoJourney(page, baseURL, demo);
  } else if (demo && variant === "workspace") {
    await workspaceStoreDemoJourney(page, baseURL, demo);
  } else if (variant === "consumer") {
    await consumerJourneyBasic(page, baseURL);
  } else {
    await workspaceJourneyBasic(page, baseURL);
  }

  await page.waitForTimeout(1200);
  await context.close();
  await browser.close();

  const rawCapture = newestVideoFile(sourceDir);
  if (!rawCapture) {
    console.error("No video file captured.");
    process.exit(1);
  }

  const canonicalRaw = path.join(sourceDir, "in-app-preview.webm");
  if (rawCapture !== canonicalRaw) {
    try {
      renameSync(rawCapture, canonicalRaw);
    } catch {
      execFileSync(
        `ffmpeg -y -i ${JSON.stringify(rawCapture)} -c copy ${JSON.stringify(canonicalRaw)}`,
        { shell: true, stdio: "inherit" },
      );
    }
  }

  const outMain = path.join(ROOT, "marketing", "apple", variant, "app-preview.mp4");
  encodeAppleAppPreview(canonicalRaw, outMain);
  const outUpload = path.join(ROOT, "marketing", "apple", variant, "connect-upload", "app-preview.mp4");
  mkdirSync(path.dirname(outUpload), { recursive: true });
  copyFileSync(outMain, outUpload);

  if (demo) {
    extractConnectScreenshots(variant, outMain);
    console.log(`Updated in-app screenshots in marketing/apple/${variant}/connect-upload/`);
  }

  console.log(`Done. Upload: marketing/apple/${variant}/connect-upload/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
