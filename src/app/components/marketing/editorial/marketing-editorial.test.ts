import { describe, expect, it } from "vitest";
import { EDITORIAL_NAV_LINKS } from "./editorial-nav";
import { MARKETING_FAQ, SAMPLE_PORTFOLIO, WORKFLOW_STAGES } from "./marketing-editorial-data";

describe("marketing editorial homepage data", () => {
  it("exposes anchor targets used in navigation", () => {
    const hrefs = EDITORIAL_NAV_LINKS.map((l) => l.href);
    expect(hrefs).toContain("#product-tour");
    expect(hrefs).toContain("#for-teams");
    expect(hrefs).toContain("#resident");
    expect(hrefs).toContain("#getting-started");
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
});
