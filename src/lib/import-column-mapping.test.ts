import { describe, expect, it } from "vitest";
import {
  buildMappedMatrix,
  isMappingComplete,
  mapHeaders,
  matrixHasCanonicalHeaders,
  mergeHeaderMapping,
} from "./import-column-mapping";

describe("import-column-mapping", () => {
  it("maps property and unit synonyms for estates", () => {
    const raw = [
      ["Property", "Unit Number", "Block"],
      ["Sunset", "A1", "B"],
    ];
    const mapped = buildMappedMatrix(raw, "estates_units");
    expect(mapped[0]).toContain("estate_name");
    expect(mapped[0]).toContain("unit_identifier");
    expect(mapped[1][0]).toBe("Sunset");
    const { missing, confidence } = mapHeaders(raw[0], "estates_units");
    expect(missing).not.toContain("estate_name");
    expect(confidence).toBeGreaterThan(0.5);
  });

  it("partial manual override keeps auto-mapped columns", () => {
    const raw = [
      ["Property", "WrongCol", "Block"],
      ["Sunset", "A1", "B"],
    ];
    const auto = mapHeaders(raw[0], "estates_units");
    expect(auto.missing).toContain("unit_identifier");
    const overrides = { unit_identifier: 1 };
    const mapped = buildMappedMatrix(raw, "estates_units", overrides);
    expect(mapped[0]).toEqual(expect.arrayContaining(["estate_name", "unit_identifier", "block"]));
    expect(mapped[1]).toEqual(["Sunset", "A1", "B"]);
  });

  it("mergeHeaderMapping lets overrides win", () => {
    const merged = mergeHeaderMapping({ estate_name: 0, unit_identifier: 1 }, { unit_identifier: 2 });
    expect(merged.unit_identifier).toBe(2);
    expect(merged.estate_name).toBe(0);
  });

  it("detects canonical AI matrix", () => {
    const ai = [
      ["estate_name", "unit_identifier"],
      ["Park", "U1"],
    ];
    expect(matrixHasCanonicalHeaders(ai, "estates_units")).toBe(true);
    expect(buildMappedMatrix(ai, "estates_units")[1]).toEqual(["Park", "U1"]);
  });

  it("reports mapping complete when required fields mapped", () => {
    const raw = [
      ["Property", "Unit"],
      ["A", "1"],
    ];
    expect(isMappingComplete(raw, "estates_units")).toBe(true);
  });

  it("maps vendor-style payment headers", () => {
    const raw = [
      ["Property Name", "Unit #", "Charge ID", "Amount", "Method", "Reference"],
      ["E1", "U2", "c-1", "100", "momo", "ref-1"],
    ];
    const mapped = buildMappedMatrix(raw, "payments");
    expect(isMappingComplete(raw, "payments")).toBe(true);
    expect(mapped[0]).toEqual(
      expect.arrayContaining(["estate_name", "unit_identifier", "charge_id", "amount", "method", "reference"]),
    );
  });

  it("maps bank feed narration and txn date synonyms", () => {
    const raw = [
      ["Txn Date", "Narration", "Amount", "Dr/Cr", "Ref"],
      ["2024-01-01", "Rent", "500", "DR", "R1"],
    ];
    expect(isMappingComplete(raw, "bank_feed")).toBe(true);
    const mapped = buildMappedMatrix(raw, "bank_feed");
    expect(mapped[0]).toContain("date");
    expect(mapped[0]).toContain("description");
  });

  it("maps opening charge aliases", () => {
    const raw = [
      ["Property", "Unit", "Amount", "Due Date", "Charge Type", "Description"],
      ["E", "1", "50", "2024-06-01", "rent", "Arrears"],
    ];
    expect(isMappingComplete(raw, "opening_charges")).toBe(true);
  });
});
