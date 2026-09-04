import { describe, expect, it } from "vitest";
import { isBackupExpired, parseBackupTimestamp, resolveAutoTier } from "./retention.mjs";

describe("backup retention", () => {
  it("parses backup folder timestamps", () => {
    const parsed = parseBackupTimestamp("2026-09-03T22-01-10-242Z_full_daily");
    expect(parsed?.toISOString()).toBe("2026-09-03T22:01:10.242Z");
  });

  it("expires daily backups after 30 days", () => {
    const backupId = "2026-07-01T10-00-00-000Z_full_daily";
    const now = new Date("2026-09-03T10:00:00.000Z");
    expect(isBackupExpired("daily", backupId, now)).toBe(true);
  });

  it("never expires pre-migration backups", () => {
    const backupId = "2020-01-01T10-00-00-000Z_pre-migration_pre-migration";
    expect(isBackupExpired("pre-migration", backupId, new Date())).toBe(false);
  });

  it("resolves monthly tier on the first UTC day", () => {
    expect(resolveAutoTier(new Date("2026-09-01T12:00:00.000Z"))).toBe("monthly");
  });

  it("resolves weekly tier on Sundays", () => {
    expect(resolveAutoTier(new Date("2026-09-06T12:00:00.000Z"))).toBe("weekly");
  });

  it("defaults to daily tier on ordinary weekdays", () => {
    expect(resolveAutoTier(new Date("2026-09-02T12:00:00.000Z"))).toBe("daily");
  });
});
