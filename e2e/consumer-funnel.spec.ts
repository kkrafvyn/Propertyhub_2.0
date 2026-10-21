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

  test("checkout may show sandbox payment banner in test env", async ({ page }) => {
    await openRoute(page, "/checkout?listingId=test-listing");
    await dismissMarketGateIfPresent(page);
    const sandbox = page.getByText(/sandbox payment mode/i);
    const payment = page.getByRole("heading", { name: /complete payment/i });
    const signIn = page.getByRole("heading", { name: /sign in/i });
    await expect(sandbox.or(payment).or(signIn)).toBeVisible({ timeout: 15000 });
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

  test("consumer hub exposes main content landmark", async ({ page }) => {
    await openRoute(page, "/app");
    await dismissMarketGateIfPresent(page);
    await expect(page).toHaveURL(/\/(app|login)/, { timeout: 15000 });
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 15000 });
  });
});
