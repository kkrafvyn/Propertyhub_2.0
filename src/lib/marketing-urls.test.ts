import { describe, expect, it, vi } from "vitest";
import { appPath, getAppOrigin } from "./marketing-urls";

describe("marketing-urls", () => {
  it("defaults app origin to the main Vercel app URL", () => {
    expect(getAppOrigin()).toBe("https://propertyhub-2-0-ecru.vercel.app");
  });

  it("builds absolute app paths for marketing CTAs", () => {
    vi.stubGlobal("window", { location: { hostname: "baytmiftah-marketing.vercel.app" } });
    expect(appPath("/login")).toBe("https://propertyhub-2-0-ecru.vercel.app/login");
    expect(appPath("/search?listingType=rental")).toBe(
      "https://propertyhub-2-0-ecru.vercel.app/search?listingType=rental",
    );
    vi.unstubAllGlobals();
  });
});
