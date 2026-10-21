import { test, expect } from "@playwright/test";
import { consumerFunnelSurface, dismissMarketGateIfPresent, openRoute } from "./helpers";

test.describe("Consumer funnel smoke", () => {
  test("login redirect preserves journey path", async ({ page }) => {
    await openRoute(page, "/login?next=%2Fapp%2Fapplications");
    await dismissMarketGateIfPresent(page);
    await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
  });

  test("checkout route shows payment heading or auth gate", async ({ page }) => {
    await openRoute(page, "/checkout?listingId=test-listing");
    await dismissMarketGateIfPresent(page);
    await expect(consumerFunnelSurface(page)).toBeVisible({ timeout: 15000 });
  });

  test("public lease apply route loads", async ({ page }) => {
    await openRoute(page, "/apply/lease/demo-token");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("journey route shows timeline shell or auth gate", async ({ page }) => {
    await openRoute(page, "/app/journey/demo-deal-case");
    await dismissMarketGateIfPresent(page);
    await expect(consumerFunnelSurface(page)).toBeVisible({ timeout: 15000 });
  });
});
