import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

test.describe("Search journey", () => {
  test("loads search page with filters and results shell", async ({ page }) => {
    await openRoute(page, "/search?listingType=rental&q=Accra");
    await expect(
      page.getByRole("heading", { level: 1, name: /properties for rent in accra/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/describe what you're looking for/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /search with ai/i })).toBeVisible();
  });

  test("opens property detail from search results when available", async ({ page }) => {
    await openRoute(page, "/search?listingType=rental");
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
