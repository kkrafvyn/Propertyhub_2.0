import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

// Chromium touch emulation only. Physical iOS/Android QA is a separate gate.
test.describe("Mobile consumer accessibility smoke", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });

  test("signup is consumer-only with a separate reviewed workspace application", async ({ page }) => {
    await openRoute(page, "/signup?type=landlord");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /full name/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /manage properties/i })).toHaveCount(0);
    await expect(page.getByRole("group", { name: /account purpose/i })).toHaveCount(0);
  });

  test("search keeps mobile viewport usable without document-level horizontal overflow", async ({ page }) => {
    await openRoute(page, "/search?listingType=rental&q=Accra");
    await expect(page.getByRole("heading", { level: 1, name: /properties for rent/i })).toBeVisible();
    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 2
    )).toBeTruthy();
  });
});
