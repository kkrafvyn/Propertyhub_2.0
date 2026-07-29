import type { Page } from "@playwright/test";

/** Open a route without waiting for slow third-party `load` events. */
export async function openRoute(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}
