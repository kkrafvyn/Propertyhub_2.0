import { describe, expect, it } from "vitest";
import {
  isMarketingThemeLocked,
  setMarketingThemeLocked,
} from "./marketing-theme-lock";

describe("marketing-theme-lock", () => {
  it("tracks lock state", () => {
    setMarketingThemeLocked(true);
    expect(isMarketingThemeLocked()).toBe(true);
    setMarketingThemeLocked(false);
    expect(isMarketingThemeLocked()).toBe(false);
  });
});
