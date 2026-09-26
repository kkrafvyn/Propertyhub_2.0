import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

test.describe("authenticated upgrade journeys", () => {
  test.skip(
    !process.env.E2E_TEST_USER_EMAIL || !process.env.E2E_TEST_USER_PASSWORD,
    "Authenticated certification requires disposable E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD fixtures",
  );

  test("signs in and preserves protected workspace navigation", async ({ page }) => {
    await openRoute(page, "/login");
    await page.locator('input[type="email"]').fill(process.env.E2E_TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.E2E_TEST_USER_PASSWORD!);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page).not.toHaveURL(/\/login/);

    for (const route of ["/app/workspace-access", "/app/maintenance", "/app/notifications"]) {
      await openRoute(page, route);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("body")).not.toContainText(/application error|failed to load/i);
    }
  });
});
