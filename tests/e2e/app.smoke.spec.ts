import { expect, test } from "@playwright/test";
import { installMockBackend } from "./support/mockBackend";

const pageErrorsByPage = new WeakMap<object, string[]>();
const consoleLogsByPage = new WeakMap<object, string[]>();

test.beforeEach(async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleLogs: string[] = [];
  pageErrorsByPage.set(page, pageErrors);
  consoleLogsByPage.set(page, consoleLogs);
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    consoleLogs.push(`${message.type()}: ${message.text()}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  const mockLogs = await page.evaluate(() => window.__BAYTMIFTAH_MOCK_LOGS__ || []);
  console.log("mock logs", JSON.stringify(mockLogs, null, 2));
  console.log("page url", page.url());
  console.log("page text", await page.locator("body").innerText().catch(() => ""));
  console.log("page errors", JSON.stringify(pageErrorsByPage.get(page) || [], null, 2));
  console.log("console logs", JSON.stringify(consoleLogsByPage.get(page) || [], null, 2));
});

test("serves hardened headers on app documents", async ({ page }) => {
  await installMockBackend(page, "public");

  const response = await page.goto("/login");
  const headers = response?.headers() || {};

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("renders auth entry points and protects workspace routes", async ({ page }) => {
  await installMockBackend(page, "public");

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
});

test("renders public marketplace search and property detail with live-backed mock data", async ({
  page,
}) => {
  await installMockBackend(page, "public");

  await page.goto("/search?q=East%20Legon&listingType=sale");
  await expect(
    page.getByPlaceholder("Search by city, neighborhood, address, or GhanaPostGPS")
  ).toHaveValue("East Legon");
  await expect(page.getByText("5 Palm Avenue")).toBeVisible();
  await expect(page.getByText("Showing 1-1 of 1 properties").first()).toBeVisible();

  await page.goto("/property/listing-east-legon-sale");
  await expect(page.getByText("5 Palm Avenue, Accra").first()).toBeVisible();
  await expect(page.getByText("Safe Payment Milestones")).toBeVisible();
  await expect(page.getByText("Similar Properties")).toBeVisible();
});

test("renders public discovery boards and accepts a buyer request post", async ({ page }) => {
  await installMockBackend(page, "public");

  await page.goto("/guides");
  await expect(page.getByRole("heading", { name: /Neighborhood guides built from live marketplace activity/i })).toBeVisible();
  await expect(page.getByText("East Legon, Accra")).toBeVisible();

  await page.goto("/market-trends");
  await expect(page.getByRole("heading", { name: /Live pricing and demand snapshots across public Ghana markets/i })).toBeVisible();
  await expect(page.getByText("Accra, Greater Accra").first()).toBeVisible();

  await page.goto("/buyer-requests");
  await expect(page.getByRole("heading", { name: "Recent buyer requests" })).toBeVisible();
  await page.getByLabel("Location").fill("Labone, Accra");
  await page
    .locator("#buyer-request-notes")
    .fill("Need a verified 2-bedroom apartment with backup power and a July move timeline.");
  await page.getByRole("button", { name: "Post Request" }).click();
  await expect(page.getByText("Need to buy apartment in Labone, Accra")).toBeVisible();
  await expect(page.getByText("Labone, Accra", { exact: true })).toBeVisible();
});

test("renders workspace billing for an authenticated organization owner", async ({ page }) => {
  await installMockBackend(page, "workspace");

  await page.goto("/workspace/prime-estates/billing");
  await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  await expect(page.getByText("Current subscription")).toBeVisible();
  await expect(page.getByText("GH₵1,990/mo", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Billing events" })).toBeVisible();
});

test("handles subscription provider return verification", async ({ page }) => {
  await installMockBackend(page, "workspace");

  await page.goto("/workspace?billing=verify&reference=mock_subscription_reference");
  await expect(page).toHaveURL(/\/workspace\/prime-estates/);
  await expect(page.getByText("Prime Estates").first()).toBeVisible();
});

test("starts property checkout through provider fallback path", async ({ page }) => {
  await installMockBackend(page, "workspace");

  await page.goto("/property/listing-east-legon-sale");
  await page.getByRole("button", { name: "Secure Property Payment" }).click();
  await page.getByLabel("Amount (GHS)").fill("2500");
  await page.getByLabel("Payment Gateway").selectOption("stripe");
  await page.getByLabel("Payer Name").fill("Kojo Buyer");
  await page.getByLabel("Phone").fill("+233271112223");
  await page.getByRole("button", { name: "Continue to Stripe" }).click();

  await expect(page).toHaveURL(/\/app\/payments\?checkout=mock_property_reference/);
});

test("supports workspace listing CRUD actions in the mock browser flow", async ({ page }) => {
  await installMockBackend(page, "workspace");
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/workspace/prime-estates/listings");
  await expect(page.getByRole("heading", { name: "Listings" })).toBeVisible();
  await expect(page.getByText("5 Palm Avenue")).toBeVisible();

  await page.getByRole("button", { name: "Edit Details" }).first().click();
  await page.getByLabel("Neighborhood").first().fill("East Legon Hills");
  await page.getByRole("button", { name: "Save Changes" }).first().click();
  await expect(page.getByText("Listing and property details updated.")).toBeVisible();

  await page.getByRole("button", { name: "Archive" }).first().click();
  await expect(page.getByText("Listing archived.")).toBeVisible();
});

test("renders admin escrow controls for an authenticated platform admin", async ({ page }) => {
  await installMockBackend(page, "admin");

  await page.goto("/admin/escrow");
  await expect(page.getByRole("heading", { level: 1, name: "Escrow Control", exact: true })).toBeVisible();
  await expect(page.getByText("Prime Estates")).toBeVisible();
  await expect(page.getByText("Document gate", { exact: true })).toBeVisible();
});

test("renders admin launch readiness controls for gated production workstreams", async ({ page }) => {
  await installMockBackend(page, "admin");

  await page.goto("/admin/launch");
  await expect(page.getByRole("heading", { level: 1, name: "Launch Readiness", exact: true })).toBeVisible();
  await expect(page.getByText("Run payment provider sandbox matrix")).toBeVisible();
  await expect(page.getByText("Approve Ghana Card and liveness vendor")).toBeVisible();
  await expect(page.getByText("External Provider Readiness")).toBeVisible();
  await expect(page.getByText("Paystack", { exact: true })).toBeVisible();
});

test("keeps mobile and tablet discovery layouts usable", async ({ page }) => {
  await installMockBackend(page, "public");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/search?q=East%20Legon&listingType=sale");
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  await expect(page.getByText("5 Palm Avenue")).toBeVisible();

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/buyer-requests");
  await expect(page.getByRole("heading", { name: "Recent buyer requests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse Listings" })).toBeVisible();
});
