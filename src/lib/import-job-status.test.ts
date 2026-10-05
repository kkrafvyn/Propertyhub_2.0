import { describe, expect, it } from "vitest";
import { importJobStatusVariant, resolveImportJobStatus } from "./import-job-status";

describe("resolveImportJobStatus", () => {
  it("marks partial success", () => {
    expect(resolveImportJobStatus(10, 7, 3)).toBe("partially_imported");
  });

  it("marks full failure when zero imported", () => {
    expect(resolveImportJobStatus(5, 0, 5)).toBe("failed");
  });
});

describe("importJobStatusVariant", () => {
  it("maps partially imported to secondary", () => {
    expect(importJobStatusVariant("partially_imported")).toBe("secondary");
  });
});
