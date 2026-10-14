import { describe, expect, it } from "vitest";
import { applyHeaderMapping, mapHeaders } from "./import-column-mapping";

describe("import-column-mapping", () => {
  it("maps property and unit synonyms for estates", () => {
    const raw = [
      ["Property", "Unit Number", "Block"],
      ["Sunset", "A1", "B"],
    ];
    const mapped = applyHeaderMapping(raw, "estates_units");
    expect(mapped[0]).toContain("estate_name");
    expect(mapped[0]).toContain("unit_identifier");
    const { missing, confidence } = mapHeaders(raw[0], "estates_units");
    expect(missing).not.toContain("estate_name");
    expect(confidence).toBeGreaterThan(0.5);
  });
});
