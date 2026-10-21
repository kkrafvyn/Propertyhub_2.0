import type { Locator, Page } from "@playwright/test";

const DEFAULT_E2E_MARKET = {
  jurisdictionId: "GH",
  country: "Ghana",
  region: "Greater Accra",
  city: "Accra",
  searchLocation: "Accra, Ghana",
  currency: "GHS",
  timezone: "Africa/Accra",
  suggestedLocale: "en",
  defaultListingMode: "rent",
  completedAt: "2020-01-01T00:00:00.000Z",
};

/** Open a route without waiting for slow third-party `load` events. */
export async function openRoute(page: Page, path: string) {
  await page.addInitScript((market) => {
    try {
      if (localStorage.getItem("baytmiftah_onboarding_complete") === "1") return;
      localStorage.setItem("baytmiftah_user_market", JSON.stringify(market));
      localStorage.setItem("baytmiftah_onboarding_complete", "1");
    } catch {
      /* storage blocked */
    }
  }, DEFAULT_E2E_MARKET);
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

/** First-run market picker can appear before auth or app routes. */
export async function dismissMarketGateIfPresent(page: Page) {
  const marketHeading = page.getByRole("heading", {
    name: /where are you looking|choose your market|choose your city/i,
  });
  try {
    await marketHeading.first().waitFor({ state: "visible", timeout: 4000 });
  } catch {
    return;
  }

  for (let step = 0; step < 4; step += 1) {
    const ghana = page.getByRole("button", { name: /Ghana/i }).first();
    if (await ghana.isVisible().catch(() => false)) {
      await ghana.click();
      await page.waitForTimeout(350);
    }

    const accra = page.getByRole("button", { name: /Accra/i }).first();
    if (await accra.isVisible().catch(() => false)) {
      await accra.click();
      await page.waitForTimeout(450);
    }

    const stillOpen = await marketHeading
      .first()
      .isVisible()
      .catch(() => false);
    if (!stillOpen) break;
  }
}

/** Consumer smoke: signed-in shell, login, or market onboarding. */
export function consumerFunnelSurface(page: Page): Locator {
  return page
    .locator("#main-content")
    .or(page.getByRole("heading", { name: /sign in to your account/i }))
    .or(page.getByRole("heading", { name: /sign in/i }))
    .or(page.getByRole("heading", { name: /complete payment/i }))
    .or(page.getByRole("heading", { name: /where are you looking/i }))
    .or(page.getByRole("heading", { name: /choose your market/i }))
    .first();
}
