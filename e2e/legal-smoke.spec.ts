import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

test.describe("Legal pages smoke", () => {
  test("terms page loads", async ({ page }) => {
    await openRoute(page, "/terms");
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
  });

  test("privacy page loads", async ({ page }) => {
    await openRoute(page, "/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });

  test("legal centre payments policy loads", async ({ page }) => {
    await openRoute(page, "/legal/payments");
    await expect(
      page.getByRole("heading", { name: /payments & transaction processing policy/i }),
    ).toBeVisible();
  });
});
