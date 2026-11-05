import { describe, expect, it } from "vitest";
import { EDITORIAL_NAV_LINKS } from "./editorial-nav";
import { MARKETING_FAQ, SAMPLE_PORTFOLIO, WORKFLOW_STAGES } from "./marketing-editorial-data";
import { MarketingHome } from "../../../pages/marketing/MarketingHome";
import { MarketingEditorialHome } from "../../../pages/marketing/MarketingEditorialHome";

describe("marketing editorial homepage data", () => {
  it("uses the conversion-focused editorial page as the public homepage", () => {
    expect(MarketingHome).toBe(MarketingEditorialHome);
  });

  it("exposes anchor targets used in navigation", () => {
    const hrefs = EDITORIAL_NAV_LINKS.map((l) => l.href);
    expect(hrefs).toContain("#product-tour");
    expect(hrefs).toContain("#platform");
    expect(hrefs).toContain("#workflow");
    expect(hrefs).toContain("#features");
    expect(hrefs).toContain("#trust");
    expect(hrefs).toContain("#pricing");
  });

  it("keeps tour sample data self-contained", () => {
    expect(SAMPLE_PORTFOLIO.properties.length).toBeGreaterThan(0);
    expect(WORKFLOW_STAGES.length).toBe(6);
  });

  it("documents faq entries without empty answers", () => {
    for (const item of MARKETING_FAQ) {
      expect(item.q.length).toBeGreaterThan(3);
      expect(item.a.length).toBeGreaterThan(10);
    }
  });

  it("keeps provider brands out of public marketing copy", () => {
    const copy = JSON.stringify(MARKETING_FAQ);
    expect(copy).not.toMatch(/PayAngel|Prembly|Resend|Supabase/i);
  });
});
