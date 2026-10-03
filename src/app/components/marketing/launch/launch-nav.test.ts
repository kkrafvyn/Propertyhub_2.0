import { describe, expect, it } from "vitest";
import { LAUNCH_NAV_LINKS } from "./launch-nav";

describe("launch marketing nav", () => {
  it("includes primary section anchors", () => {
    const hrefs = LAUNCH_NAV_LINKS.map((l) => l.href);
    expect(hrefs).toContain("#platform");
    expect(hrefs).toContain("#product-story");
    expect(hrefs).toContain("#organizations");
    expect(hrefs).toContain("#resident");
  });
});
