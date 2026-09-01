import { describe, expect, it } from "vitest";
import { isMarketingPublicPath, isMarketingSite, resolveSiteMode } from "./site-mode";

describe("site-mode", () => {
  it("treats baytmiftah.com as marketing", () => {
    expect(resolveSiteMode("baytmiftah.com")).toBe("marketing");
    expect(resolveSiteMode("www.baytmiftah.com")).toBe("marketing");
    expect(isMarketingSite("baytmiftah.com")).toBe(true);
  });

  it("treats app subdomain as product app", () => {
    expect(resolveSiteMode("app.baytmiftah.com")).toBe("app");
    expect(isMarketingSite("app.baytmiftah.com")).toBe(false);
  });

  it("defaults localhost to app unless VITE_SITE_MODE is set", () => {
    expect(resolveSiteMode("localhost")).toBe("app");
    expect(resolveSiteMode("127.0.0.1")).toBe("app");
  });

  it("treats the baytmiftah-marketing Vercel project as marketing", () => {
    expect(resolveSiteMode("baytmiftah-marketing.vercel.app")).toBe("marketing");
    expect(resolveSiteMode("baytmiftah-marketing-mca3288ud-krafvyn.vercel.app")).toBe("marketing");
    expect(isMarketingSite("baytmiftah-marketing.vercel.app")).toBe(true);
  });

  it("keeps the app Vercel project on consumer mode", () => {
    expect(resolveSiteMode("propertyhub-2-0.vercel.app")).toBe("app");
    expect(resolveSiteMode("baytmiftah-phjg2gys9-krafvyn.vercel.app")).toBe("app");
  });
});

describe("isMarketingPublicPath", () => {
  it("includes marketing content routes", () => {
    expect(isMarketingPublicPath("/")).toBe(true);
    expect(isMarketingPublicPath("/contact")).toBe(true);
    expect(isMarketingPublicPath("/legal/privacy")).toBe(true);
    expect(isMarketingPublicPath("/explorer")).toBe(true);
    expect(isMarketingPublicPath("/search")).toBe(false);
  });
});
