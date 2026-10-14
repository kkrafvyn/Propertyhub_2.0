import { describe, expect, it } from "vitest";
import { matrixFromJsonText } from "./json-extract";

describe("matrixFromJsonText", () => {
  it("flattens array of objects", () => {
    const matrix = matrixFromJsonText(
      JSON.stringify([
        { estate_name: "Park", unit_identifier: "1" },
        { estate_name: "Park", unit_identifier: "2" },
      ]),
    );
    expect(matrix[0]).toEqual(["estate_name", "unit_identifier"]);
    expect(matrix[1]).toEqual(["Park", "1"]);
  });

  it("reads nested units key", () => {
    const matrix = matrixFromJsonText(
      JSON.stringify({ units: [{ estate: "X", unit: "U9" }] }),
    );
    expect(matrix.length).toBeGreaterThan(1);
  });
});
