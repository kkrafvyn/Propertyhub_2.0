import { test, expect } from "@playwright/test";
import { dismissMarketGateIfPresent, openRoute } from "./helpers";

test.describe("Admin acceptance smoke (unauthenticated)", () => {
  test("admin login route is reachable", async ({ page }) => {
    await openRoute(page, "/admin");
    await dismissMarketGateIfPresent(page);
    const signIn = page.getByRole("heading", { name: /sign in/i });
    const adminShell = page.getByRole("heading", { name: /platform command center|admin|overview/i });
    await expect(signIn.or(adminShell)).toBeVisible({ timeout: 15000 });
  });

  test("operations health page loads or gates auth", async ({ page }) => {
    await openRoute(page, "/admin/operations");
    await dismissMarketGateIfPresent(page);
    const healthHeading = page.getByRole("heading", { name: /system operations|sign in/i });
    await expect(healthHeading.first()).toBeVisible({ timeout: 15000 });
  });
});
