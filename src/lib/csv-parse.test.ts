import { describe, expect, it } from "vitest";
import { csvCell, csvHeaderMap, parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"hello, world","say ""hi"""');
    expect(rows).toEqual([
      ["a", "b"],
      ["hello, world", 'say "hi"'],
    ]);
  });

  it("handles empty cells and CRLF", () => {
    const rows = parseCsv("x,y\r\n1,\r\n,2");
    expect(rows).toEqual([
      ["x", "y"],
      ["1", ""],
      ["", "2"],
    ]);
  });

  it("maps headers to cells", () => {
    const rows = parseCsv("estate_name,unit\nPark,A1");
    const map = csvHeaderMap(rows[0]);
    expect(csvCell(rows[1], map, "estate_name")).toBe("Park");
    expect(csvCell(rows[1], map, "unit")).toBe("A1");
  });
});
