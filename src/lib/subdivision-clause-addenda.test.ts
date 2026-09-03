import { describe, expect, it } from "vitest";
import {
  getSubdivisionClauseAddendum,
  listAddendaForJurisdiction,
  SUBDIVISION_CLAUSE_ADDENDA,
} from "./country-rules/subdivision-clause-addenda";

describe("subdivision-clause-addenda", () => {
  it("resolves Lagos addendum with Ejari-style tenancy clauses", () => {
    const addendum = getSubdivisionClauseAddendum("NG", "LA");
    expect(addendum?.title).toContain("Lagos");
    expect(addendum?.clauses.some((c) => c.includes("six"))).toBe(true);
  });

  it("resolves Dubai Ejari pack", () => {
    const addendum = getSubdivisionClauseAddendum("AE", "DXB");
    expect(addendum?.title).toContain("Ejari");
    expect(addendum?.registrations).toContain("Ejari registration");
  });

  it("covers 20+ subdivision addenda", () => {
    expect(SUBDIVISION_CLAUSE_ADDENDA.length).toBeGreaterThanOrEqual(20);
    expect(listAddendaForJurisdiction("US").length).toBeGreaterThanOrEqual(2);
  });
});
