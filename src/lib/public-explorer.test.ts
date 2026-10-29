import { describe, expect, it } from "vitest";
import { formatPublicUnitId, parsePublicUnitListingSuffix } from "./public-explorer";

describe("public-explorer", () => {
  it("formats stable unit codes from listing ids", () => {
    expect(formatPublicUnitId("aad17bb4-9e9c-4508-a285-f6f2dea7ffd1")).toBe("BM-UNIT-A7FFD1");
  });

  it("parses BM-UNIT codes", () => {
    expect(parsePublicUnitListingSuffix("BM-UNIT-A7FFD1")).toBe("A7FFD1");
  });
});
