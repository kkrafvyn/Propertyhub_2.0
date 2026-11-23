import { describe, expect, it } from "vitest";
import { normalizeMatterportTourUrl } from "./virtual-tour";

describe("real 3D virtual tour links", () => {
  const canonical = "https://my.matterport.com/show/?m=AbCdEf12345";
  it("accepts a real Matterport model link and drops tracking parameters", () => {
    expect(normalizeMatterportTourUrl(canonical)).toBe(canonical);
    expect(normalizeMatterportTourUrl(canonical + "&play=1&utm_source=bad")).toBe(canonical);
    expect(normalizeMatterportTourUrl(canonical.replace("show/", "show"))).toBe(canonical);
  });
  it("rejects spoofed domains, scripts, insecure protocols and duplicate IDs", () => {
    for (const url of [
      "javascript:alert(1)", "http://my.matterport.com/show/?m=AbCdEf12345",
      "https://my.matterport.com.evil.example/show/?m=AbCdEf12345",
      "https://evil.example/@my.matterport.com/show/?m=AbCdEf12345",
      "https://my.matterport.com/show/?m=INVALID!!",
      canonical + "&m=AbCdEf12345", "https://my.matterport.com/other/?m=AbCdEf12345",
    ]) {
      expect(normalizeMatterportTourUrl(url)).toBe(null);
    }
  });
  it("displays no tour until a provider link is present", () => {
    expect(normalizeMatterportTourUrl(null)).toBe(null);
    expect(normalizeMatterportTourUrl("")).toBe(null);
  });
});
