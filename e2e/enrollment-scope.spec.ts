import { test, expect } from "@playwright/test";
import { openRoute } from "./helpers";

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.describe("Enrollment & scope (public smoke)", () => {
  test("enrollment status page requires sign-in", async ({ page }) => {
    await openRoute(page, "/enrollment");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
  });

  test("footer links to workspace enrollment status", async ({ page }) => {
    await openRoute(page, "/");
    await dismissCookieBanner(page);
    const link = page.getByRole("link", { name: /workspace enrollment/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/enrollment");
  });

  test("site map lists workspace enrollment", async ({ page }) => {
    await openRoute(page, "/sitemap");
    await dismissCookieBanner(page);
    await expect(
      page.getByRole("article").getByRole("link", { name: /workspace enrollment/i }),
    ).toBeVisible();
  });

  test("workspace entry requires sign-in", async ({ page }) => {
    await openRoute(page, "/workspace");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
  });
});
