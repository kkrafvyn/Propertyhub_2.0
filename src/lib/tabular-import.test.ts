import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readImportFileAsMatrix } from "./tabular-import";
import { fileExtension } from "./document-import/spreadsheet";
import { parseEstateUnitsTable } from "./estate-import.service";

describe("tabular-import", () => {
  it("detects file extensions", () => {
    expect(fileExtension("units.XLSX")).toBe("xlsx");
    expect(fileExtension("noext")).toBe("");
  });

  it("reads CSV files", async () => {
    const file = new File(["estate_name,unit\nPark,A1\n"], "units.csv", { type: "text/csv" });
    const matrix = await readImportFileAsMatrix(file);
    expect(matrix[0]).toEqual(["estate_name", "unit"]);
    expect(parseEstateUnitsTable(matrix)).toHaveLength(1);
  });

  it("reads xlsx files from first sheet", async () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["estate_name", "unit_identifier"],
      ["Sunset", "B2"],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Units");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([buffer], "units.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const matrix = await readImportFileAsMatrix(file);
    expect(matrix[1]).toEqual(["Sunset", "B2"]);
    const rows = parseEstateUnitsTable(matrix);
    expect(rows[0].estateName).toBe("Sunset");
    expect(rows[0].errors).toHaveLength(0);
  });
});
