import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

test.describe("BaytMiftah smoke", () => {
  test("home page loads", async ({ page }) => {
    await openRoute(page, "/");
    await expect(page).toHaveTitle(/BaytMiftah/i);
  });

  test("search page loads", async ({ page }) => {
    await openRoute(page, "/search");
    await expect(page.getByRole("heading", { level: 1, name: /properties for/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await openRoute(page, "/login");
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("search page accepts listing type filter", async ({ page }) => {
    await openRoute(page, "/search?listingType=short_stay");
    await expect(
      page.getByRole("heading", { level: 1, name: /properties for short stay/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/describe what you're looking for/i)).toBeVisible();
  });

  test("property detail route loads or redirects safely", async ({ page }) => {
    await openRoute(page, "/search?listingType=rental");
    const firstLink = page.locator('a[href^="/property/"]').first();
    if (await firstLink.count()) {
      await firstLink.click();
      await expect(page).toHaveURL(/property\//);
    }
  });
});
