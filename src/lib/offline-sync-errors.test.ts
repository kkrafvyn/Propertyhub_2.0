import { describe, expect, it } from "vitest";
import { isPermanentSyncError } from "./offline-sync-errors";

describe("isPermanentSyncError", () => {
  it("treats authorization errors as permanent", () => {
    expect(isPermanentSyncError("Not authorized to sync maintenance", 0)).toBe(true);
  });

  it("treats high attempt count as permanent", () => {
    expect(isPermanentSyncError("network timeout", 4)).toBe(true);
  });
});
