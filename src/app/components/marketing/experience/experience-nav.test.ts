import { describe, expect, it } from "vitest";
import { EXPERIENCE_NAV_LINKS } from "./experience-nav";

describe("EXPERIENCE_NAV_LINKS", () => {
  it("points to in-page story chapters", () => {
    const hashes = EXPERIENCE_NAV_LINKS.filter((l) => l.href.startsWith("#")).map((l) => l.href);
    expect(hashes).toContain("#chapter-operating");
    expect(hashes).toContain("#chapter-leasing");
    expect(hashes).toContain("#chapter-resident");
  });

  it("includes company route", () => {
    expect(EXPERIENCE_NAV_LINKS.some((l) => l.href === "/about")).toBe(true);
  });
});
