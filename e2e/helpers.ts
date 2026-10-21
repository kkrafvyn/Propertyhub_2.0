import type { Locator, Page } from "@playwright/test";

/** Open a route without waiting for slow third-party `load` events. */
export async function openRoute(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

/** First-run market picker can appear before auth or app routes. */
export async function dismissMarketGateIfPresent(page: Page) {
  const ghana = page.getByRole("button", { name: /Ghana/i }).first();
  try {
    await ghana.waitFor({ state: "visible", timeout: 4000 });
    await ghana.click();
    await page.waitForTimeout(300);
  } catch {
    /* no market gate */
  }
}

/** Consumer smoke: signed-in shell, login, or market onboarding. */
export function consumerFunnelSurface(page: Page): Locator {
  return page
    .locator("#main-content")
    .or(page.getByRole("heading", { name: /sign in to your account/i }))
    .or(page.getByRole("heading", { name: /sign in/i }))
    .or(page.getByRole("heading", { name: /complete payment/i }))
    .or(page.getByRole("heading", { name: /where are you looking/i }))
    .or(page.getByRole("heading", { name: /choose your market/i }));
}
