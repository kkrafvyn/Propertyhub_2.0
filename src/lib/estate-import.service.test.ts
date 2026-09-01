import { describe, expect, it } from "vitest";
import { parseEstateUnitsCsv } from "./estate-import.service";

describe("estate import CSV validation", () => {
  it("accepts estate and unit rows with optional building fields", () => {
    expect(parseEstateUnitsCsv("estate_name,unit_identifier,block,floor\nPalm Court,A-101,A,1")).toEqual([
      { rowNumber: 2, estateName: "Palm Court", unitIdentifier: "A-101", block: "A", floor: "1", errors: [] },
    ]);
  });

  it("accepts compatibility headers and reports records that cannot be imported", () => {
    const rows = parseEstateUnitsCsv("estate,unit\nRidge View,\n,Unit 3");
    expect(rows[0].errors).toEqual(["Unit identifier is required"]);
    expect(rows[1].errors).toEqual(["Estate name is required"]);
  });

  it("returns no rows when only headers are provided", () => {
    expect(parseEstateUnitsCsv("estate_name,unit_identifier")).toEqual([]);
  });
});
