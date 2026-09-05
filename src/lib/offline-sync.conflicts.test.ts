import { describe, expect, it } from "vitest";
import { buildConflictRecord, isServerNewer } from "./offline-sync.conflicts";
import type { OfflineOutboxEntry } from "./offline-db";

describe("offline-sync.conflicts", () => {
  it("detects when server row is newer than offline base", () => {
    expect(isServerNewer("2026-09-05T12:00:00.000Z", "2026-09-05T11:00:00.000Z")).toBe(true);
    expect(isServerNewer("2026-09-05T11:00:00.000Z", "2026-09-05T12:00:00.000Z")).toBe(false);
  });

  it("builds a conflict record from outbox entry and server snapshot", () => {
    const entry: OfflineOutboxEntry = {
      id: "outbox-1",
      entityType: "maintenance_update",
      organizationId: "org-1",
      payload: { requestId: "req-1", status: "resolved" },
      createdAt: "2026-09-05T10:00:00.000Z",
      updatedAt: "2026-09-05T10:00:00.000Z",
      attempts: 0,
      baseUpdatedAt: "2026-09-05T09:00:00.000Z",
    };

    const conflict = buildConflictRecord({
      outboxEntry: entry,
      serverSnapshot: { id: "req-1", status: "in_progress", updated_at: "2026-09-05T11:00:00.000Z" },
    });

    expect(conflict.outboxId).toBe("outbox-1");
    expect(conflict.entityType).toBe("maintenance_update");
    expect(conflict.localPayload).toEqual(entry.payload);
    expect(conflict.serverSnapshot.status).toBe("in_progress");
  });
});
