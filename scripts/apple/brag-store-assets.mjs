#!/usr/bin/env node
/**
 * BRAG — Browser-Rendered App Store assets Generator.
 * Captures listing screenshots (and optional preview video) using fictional App Review
 * fixture data. Outputs to ../apple-store-assets and marketing/apple/.
 *
 * Usage:
 *   node scripts/apple/brag-store-assets.mjs [--skip-provision] [--variant=workspace|consumer|all]
 *
 * Requires: playwright, sharp, review credentials in secrets/app-review/*.json
 * (run provision-review-*.mjs first, or omit --skip-provision).
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const assetsRoot = path.resolve(root, "../apple-store-assets");
const skipProvision = process.argv.includes("--skip-provision");
const variantArg = process.argv.find((a) => a.startsWith("--variant="));
const variantFilter = variantArg?.split("=")[1] || "all";

const REVIEW_MARKET = {
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

const PORT = Number(process.env.BRAG_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

async function runNode(script) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function readReviewCreds(kind) {
  const file = path.join(root, "secrets/app-review", `${kind}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`Missing ${file}. Run node scripts/apple/provision-review-${kind}.mjs first.`);
    }
    throw e;
  }
}

async function previewReady() {
  try {
    const res = await fetch(BASE, { redirect: "manual" });
    return res.ok || res.status === 304 || res.status === 200;
  } catch {
    return false;
  }
}

async function startPreview() {
  if (await previewReady()) {
    console.log(`Using existing preview at ${BASE}`);
    return () => {};
  }
  if (process.env.BRAG_SKIP_BUILD !== "1") {
    await new Promise((resolve, reject) => {
      const build = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env },
      });
      build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("vite build failed"))));
    });
  }
  const server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    { cwd: root, stdio: "pipe" },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("preview server timeout")), 120_000);
    const onReady = () => {
      clearTimeout(timer);
      resolve();
    };
    server.stdout?.on("data", (buf) => {
      if (/Local:|127\.0\.0\.1/.test(buf.toString())) onReady();
    });
    server.stderr?.on("data", (buf) => {
      if (/Local:|127\.0\.0\.1/.test(buf.toString())) onReady();
    });
    server.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`preview exited ${code}`));
    });
  });
  await new Promise((r) => setTimeout(r, 1500));
  return () => server.kill("SIGTERM");
}

async function dismissChrome(page) {
  const essential = page.getByRole("button", { name: /essential only/i }).first();
  if (await essential.isVisible().catch(() => false)) await essential.click({ timeout: 3000 }).catch(() => {});
  const market = page.getByRole("heading", { name: /where are you looking|choose your market/i }).first();
  if (await market.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Ghana/i }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Accra/i }).first().click().catch(() => {});
  }
}

async function seedMarket(page) {
  await page.addInitScript((market) => {
    try {
      localStorage.setItem("baytmiftah_user_market", JSON.stringify(market));
      localStorage.setItem("baytmiftah_onboarding_complete", "1");
    } catch {
      /* ignore */
    }
  }, REVIEW_MARKET);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await dismissChrome(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 60_000 });
  await dismissChrome(page);
}

async function writeScreenshot(page, outPath, { width, height, jpeg = false }) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(800);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const png = await page.screenshot({ fullPage: false, type: "png" });
  if (jpeg) {
    await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);
  } else {
    await fs.writeFile(outPath, png);
  }
}

async function captureSet(page, shots, meta) {
  const captured = [];
  for (const shot of shots) {
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "domcontentloaded" });
    await dismissChrome(page);
    if (shot.waitMs) await page.waitForTimeout(shot.waitMs);
    const file = path.join(meta.outDir, shot.file);
    await writeScreenshot(page, file, { width: meta.width, height: meta.height, jpeg: meta.jpeg });
    captured.push({ ...shot, file: path.relative(assetsRoot, file) });
    console.log(`  ✓ ${shot.file}`);
  }
  return captured;
}

async function recordPreview(browser, creds, shots, outWebm, { width, height }) {
  const videoDir = path.dirname(outWebm);
  await fs.mkdir(videoDir, { recursive: true });
  const vContext = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: videoDir, size: { width, height } },
  });
  const vPage = await vContext.newPage();
  await seedMarket(vPage);
  if (creds?.email && creds?.password) await login(vPage, creds.email, creds.password);
  for (const shot of shots.slice(0, 5)) {
    await vPage.goto(`${BASE}${shot.path}`, { waitUntil: "domcontentloaded" });
    await dismissChrome(vPage);
    await vPage.waitForTimeout(4000);
  }
  await vContext.close();
  const webms = (await fs.readdir(videoDir)).filter((f) => f.endsWith(".webm"));
  const latest = webms.sort().at(-1);
  if (!latest) return null;
  const src = path.join(videoDir, latest);
  await fs.rename(src, outWebm);
  return path.relative(assetsRoot, outWebm);
}

async function main() {
  if (!skipProvision) {
    if (variantFilter === "all" || variantFilter === "workspace") {
      await runNode("scripts/apple/provision-review-workspace.mjs");
    }
    if (variantFilter === "all" || variantFilter === "consumer") {
      await runNode("scripts/apple/provision-review-consumer.mjs");
    }
  }

  await runNode("scripts/apple/export-store-icons.mjs");

  const stopPreview = await startPreview();
  const browser = await chromium.launch({ headless: true });
  const manifestPath = path.join(assetsRoot, "BRAG-MANIFEST.json");
  let manifest = {
    generator: "scripts/apple/brag-store-assets.mjs",
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Browser-rendered reference captures with fictional App Review dummy data. Label as references in App Store Connect unless replaced with native device captures.",
    baseUrl: BASE,
    variants: {},
  };
  try {
    const prior = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (prior?.variants) manifest.variants = { ...prior.variants };
  } catch {
    /* fresh manifest */
  }

  try {
    if (variantFilter === "all" || variantFilter === "workspace") {
      const creds = await readReviewCreds("workspace");
      const slug = creds.slug || "app-review-demo";
      const context = await browser.newContext({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await seedMarket(page);
      await login(page, creds.email, creds.password);

      const macDir = path.join(assetsRoot, "workspace/screenshots/mac-1280x800");
      const macShots = [
        { path: "/login", file: "01-sign-in.jpg", waitMs: 500 },
        { path: `/workspace/${slug}/leads`, file: "02-leads-pipeline.jpg", waitMs: 1200 },
        { path: `/workspace/${slug}/listings`, file: "03-listings-portfolio.jpg", waitMs: 1200 },
        { path: `/workspace/${slug}`, file: "04-workspace-overview.jpg", waitMs: 1200 },
      ];
      console.log("\nWorkspace (macOS listing 1280×800)…");
      const macCaptured = await captureSet(page, macShots, {
        outDir: macDir,
        width: 1280,
        height: 800,
        jpeg: true,
      });
      const marketingMac = path.join(root, "marketing/apple/workspace/screenshots");
      await fs.mkdir(marketingMac, { recursive: true });
      for (const shot of macShots) {
        await fs.copyFile(path.join(macDir, shot.file), path.join(marketingMac, shot.file));
      }

      const iphoneContext = await browser.newContext({ ...devices["iPhone 14 Pro Max"] });
      const iphonePage = await iphoneContext.newPage();
      await seedMarket(iphonePage);
      await login(iphonePage, creds.email, creds.password);
      const iphoneDir = path.join(assetsRoot, "workspace/screenshots/iphone-6.7-reference");
      const iphoneShots = [
        { path: `/workspace/${slug}/leads`, file: "01-leads.png", waitMs: 1000 },
        { path: `/workspace/${slug}/listings`, file: "02-listings.png", waitMs: 1000 },
      ];
      console.log("\nWorkspace (iPhone 6.7\" reference)…");
      const iphoneCaptured = await captureSet(iphonePage, iphoneShots, {
        outDir: iphoneDir,
        width: 430,
        height: 932,
        jpeg: false,
      });

      const previewWebm = path.join(assetsRoot, "workspace/preview/mac-workspace-preview.webm");
      console.log("\nWorkspace preview video (WebM)…");
      const video = await recordPreview(browser, creds, macShots, previewWebm, { width: 1280, height: 800 });

      manifest.variants.workspace = {
        reviewEmail: creds.email,
        organizationSlug: slug,
        macScreenshots: macCaptured,
        iphoneReferenceScreenshots: iphoneCaptured,
        previewVideo: video,
        listingDraft: "apple-store-assets/workspace/listing-draft.json",
      };
      await context.close();
      await iphoneContext.close();
    }

    if (variantFilter === "all" || variantFilter === "consumer") {
      const creds = await readReviewCreds("consumer");
      const context = await browser.newContext({ ...devices["iPhone 14 Pro Max"] });
      const page = await context.newPage();
      await seedMarket(page);
      await login(page, creds.email, creds.password);

      const phoneDir = path.join(assetsRoot, "consumer/screenshots/iphone-6.7-reference");
      const phoneShots = [
        { path: "/", file: "01-discovery.png", waitMs: 1500 },
        { path: "/search", file: "02-search.png", waitMs: 1200 },
        { path: "/login", file: "03-sign-in.png", waitMs: 500 },
        { path: "/app", file: "04-consumer-portal.png", waitMs: 1200 },
      ];
      console.log("\nConsumer (iPhone 6.7\" reference)…");
      const phoneCaptured = await captureSet(page, phoneShots, {
        outDir: phoneDir,
        width: 430,
        height: 932,
        jpeg: false,
      });

      const macContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const macPage = await macContext.newPage();
      await seedMarket(macPage);
      await login(macPage, creds.email, creds.password);
      const macDir = path.join(assetsRoot, "consumer/screenshots/mac-1280x800");
      const macShots = [
        { path: "/", file: "01-discovery.jpg", waitMs: 1500 },
        { path: "/search", file: "02-search.jpg", waitMs: 1200 },
        { path: "/app", file: "03-consumer-portal.jpg", waitMs: 1200 },
      ];
      console.log("\nConsumer (macOS listing 1280×800)…");
      const macCaptured = await captureSet(macPage, macShots, {
        outDir: macDir,
        width: 1280,
        height: 800,
        jpeg: true,
      });
      const marketingMac = path.join(root, "marketing/apple/consumer/screenshots");
      await fs.mkdir(marketingMac, { recursive: true });
      for (const shot of macShots) {
        await fs.copyFile(path.join(macDir, shot.file), path.join(marketingMac, shot.file));
      }

      const previewWebm = path.join(assetsRoot, "consumer/preview/iphone-consumer-preview.webm");
      const video = await recordPreview(browser, creds, phoneShots, previewWebm, { width: 430, height: 932 });

      manifest.variants.consumer = {
        reviewEmail: creds.email,
        phoneScreenshots: phoneCaptured,
        macScreenshots: macCaptured,
        previewVideo: video,
        listingDraft: "apple-store-assets/consumer/listing-draft.json",
      };
      await context.close();
      await macContext.close();
    }
  } finally {
    await browser.close();
    stopPreview();
  }

  await fs.mkdir(assetsRoot, { recursive: true });
  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n✅ BRAG assets written under ${path.relative(root, assetsRoot)}/`);
  try {
    await runNode("scripts/apple/brag-export-previews.mjs");
  } catch (e) {
    console.warn("Browser preview MP4 export skipped:", e.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
