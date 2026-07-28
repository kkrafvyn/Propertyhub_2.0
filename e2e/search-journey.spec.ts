import { test, expect } from "@playwright/test";

test.describe("Search journey", () => {
  test("loads search page with filters and results shell", async ({ page }) => {
    await page.goto("/search?listingType=rental&q=Accra");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/describe what you're looking for/i)).toBeVisible();
  });

  test("opens property detail from search results when available", async ({ page }) => {
    await page.goto("/search?listingType=rental");
    const propertyLink = page.locator('a[href^="/property/"]').first();
    const count = await propertyLink.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await propertyLink.click();
    await expect(page).toHaveURL(/\/property\//);
  });
});
