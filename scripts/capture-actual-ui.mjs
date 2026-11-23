// Capture REAL browser rendering from the checked-out codebase in CI.
// Screenshots are not design renders. No credentials, synthetic listings, or
// payment operations are used. Backend-dependent pages may show empty states.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

const base = "http://127.0.0.1:5179";
const dir = "visual-screenshots";
mkdirSync(dir, { recursive: true });

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5179", "--strictPort"], {
  env: { ...process.env, VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://test.supabase.co",
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "test-anon-key" },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
server.stdout.on("data", (data) => process.stdout.write(String(data)));
server.stderr.on("data", (data) => process.stderr.write(String(data)));
let browser;
const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Vite preview server did not become ready");
};

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const captures = [
    { name: "01-consumer-home-desktop", route: "/", width: 1440, height: 900, mobile: false, fullPage: true },
    { name: "02-consumer-home-mobile", route: "/", width: 390, height: 844, mobile: true, fullPage: true },
    { name: "03-search-mobile", route: "/search?listingType=rental&q=Accra", width: 390, height: 844, mobile: true, fullPage: true },
    { name: "04-3d-tour-desktop", route: "/visual-tour-preview.html", width: 1440, height: 900, mobile: false, fullPage: true },
    { name: "05-3d-tour-mobile", route: "/visual-tour-preview.html", width: 390, height: 844, mobile: true, fullPage: true },
    { name: "06-signup-mobile", route: "/signup", width: 390, height: 844, mobile: true, fullPage: true },
  ];
  for (const view of captures) {
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: view.mobile ? 2 : 1,
      isMobile: view.mobile,
      hasTouch: view.mobile,
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.warn(`Browser runtime error on ${view.route}: ${err.message}`));
    console.log(`Opening ${view.name} (${view.route})`);
    const response = await page.goto(base + view.route, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status()} on ${view.route}`);
    await page.waitForTimeout(view.route.includes("visual-tour-preview") ? 1000 : 2300);
    if (view.route.includes("visual-tour-preview")) {
      await page.getByRole("heading", { name: "Explore in 3D" }).waitFor();
    } else {
      await page.locator("body").waitFor();
    }
    const target = `${dir}/${view.name}.png`;
    await page.screenshot({ path: target, fullPage: view.fullPage, animations: "disabled", timeout: 20000 });
    console.log(`Captured ${target}, page title: ${await page.title()}`);
    await context.close();
  }
} finally {
  await browser?.close();
  // npm delegates to a child Vite process. Kill the whole process group,
  // otherwise inherited stdout pipes keep the screenshot runner alive.
  if (server.pid) {
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGTERM"); }
  }
}
