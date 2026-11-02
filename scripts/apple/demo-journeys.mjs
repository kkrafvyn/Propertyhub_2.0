/**
 * In-app navigation scripts for App Store preview (Playwright only — no app code).
 */

/** @param {import('playwright').Page} page */
export async function dismissTutorialIfPresent(page) {
  const close = page.getByRole("button", { name: /close tutorial|use baytmiftah|skip/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

/** @param {import('playwright').Page} page @param {string} baseURL @param {string} route */
export async function gotoApp(page, baseURL, route) {
  const url = route.startsWith("http")
    ? route
    : `${baseURL.replace(/\/$/, "")}${route.startsWith("/") ? route : `/${route}`}`;
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 120_000 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("ERR_ABORTED") && !msg.includes("NS_BINDING_ABORTED")) throw error;
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => {});
  await dismissMarketGateIfPresent(page);
  await dismissTutorialIfPresent(page);
}

/** @param {import('playwright').Page} page */
export async function dismissMarketGateIfPresent(page) {
  const marketHeading = page.getByRole("heading", {
    name: /where are you looking|choose your market|choose your city/i,
  });
  try {
    await marketHeading.first().waitFor({ state: "visible", timeout: 2500 });
  } catch {
    return;
  }
  for (let step = 0; step < 4; step += 1) {
    const ghana = page.getByRole("button", { name: /Ghana/i }).first();
    if (await ghana.isVisible().catch(() => false)) {
      await ghana.click();
      await page.waitForTimeout(280);
    }
    const accra = page.getByRole("button", { name: /Accra/i }).first();
    if (await accra.isVisible().catch(() => false)) {
      await accra.click();
      await page.waitForTimeout(350);
    }
    if (!(await marketHeading.first().isVisible().catch(() => false))) break;
  }
}

/** @param {import('playwright').Page} page */
export async function slowScroll(page, pixels, steps = 6) {
  const step = pixels / steps;
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(160);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} email
 * @param {string} password
 * @param {string} [nextPath]
 */
export async function loginWithEmail(page, baseURL, email, password, nextPath = "/app") {
  const next = encodeURIComponent(nextPath);
  await gotoApp(page, baseURL, `/login?next=${next}`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45_000 });
  await page.waitForTimeout(900);
  await dismissTutorialIfPresent(page);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseURL
 * @param {import('./load-store-demo-manifest.mjs').StoreDemoManifest} demo
 */
export async function consumerStoreDemoJourney(page, baseURL, demo) {
  await gotoApp(page, baseURL, demo.routes.shortStayProperty);
  await page.waitForURL(/\/property\//, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(600);
  await slowScroll(page, 450);

  const book = page.getByRole("button", { name: /book|reserve|check availability|request/i }).first();
  if (await book.isVisible().catch(() => false)) {
    await book.click();
    await page.waitForTimeout(800);
  }

  await gotoApp(page, baseURL, demo.routes.checkoutShortStay);
  await page.waitForTimeout(900);
  await slowScroll(page, 350);

  await gotoApp(page, baseURL, demo.routes.journeyRental);
  await page.waitForTimeout(900);
  await slowScroll(page, 400);

  if (demo.routes.journeyBooking) {
    await gotoApp(page, baseURL, demo.routes.journeyBooking);
    await page.waitForTimeout(800);
    await slowScroll(page, 350);
  }

  await gotoApp(page, baseURL, "/search?listingType=rental&q=Demo");
  await page.waitForTimeout(600);
  await slowScroll(page, 300);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseURL
 * @param {import('./load-store-demo-manifest.mjs').StoreDemoManifest} demo
 */
export async function workspaceStoreDemoJourney(page, baseURL, demo) {
  const slug = demo.workspace.slug;

  await gotoApp(page, baseURL, `/workspace/${slug}/leads`);
  await page.waitForTimeout(900);
  await slowScroll(page, 550);

  await gotoApp(page, baseURL, `/workspace/${slug}/listings`);
  await page.waitForTimeout(900);
  await slowScroll(page, 500);

  await gotoApp(page, baseURL, `/workspace/${slug}/calendar-operations`);
  await page.waitForTimeout(700);
  await slowScroll(page, 400);

  await gotoApp(page, baseURL, `/workspace/${slug}/leases`);
  await page.waitForTimeout(800);
  await slowScroll(page, 400);

  await gotoApp(page, baseURL, `/workspace/${slug}/payments`);
  await page.waitForTimeout(700);
  await slowScroll(page, 350);
}
