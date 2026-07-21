import { test, expect } from "@playwright/test";

test.describe("BaytMiftah smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
  });

  test("search page loads", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("search page accepts listing type filter", async ({ page }) => {
    await page.goto("/search?listingType=short_stay");
    await expect(page.getByText(/short stay|properties|results/i).first()).toBeVisible();
  });

  test("property detail route loads or redirects safely", async ({ page }) => {
    await page.goto("/search?listingType=rental");
    const firstLink = page.locator('a[href^="/property/"]').first();
    if (await firstLink.count()) {
      await firstLink.click();
      await expect(page).toHaveURL(/property\//);
    }
  });
});
