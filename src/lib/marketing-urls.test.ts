import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appPath, getAppOrigin } from "./marketing-urls";

describe("marketing-urls", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_APP_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PUBLIC_APP_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults app origin to the production app hostname", () => {
    expect(getAppOrigin()).toBe("https://app.baytmiftah.com");
  });

  it("builds absolute app paths for marketing CTAs", () => {
    vi.stubGlobal("window", { location: { hostname: "baytmiftah-marketing.vercel.app" } });
    expect(appPath("/login")).toBe("https://app.baytmiftah.com/login");
    expect(appPath("/search?listingType=rental")).toBe(
      "https://app.baytmiftah.com/search?listingType=rental",
    );
    vi.unstubAllGlobals();
  });
});
