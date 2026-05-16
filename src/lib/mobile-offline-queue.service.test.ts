import { beforeEach, describe, expect, it, vi } from "vitest";
import { mobileOfflineQueueService } from "./mobile-offline-queue.service";

const preferenceStore = vi.hoisted(() => new Map<string, string>());

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: preferenceStore.get(key) || null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferenceStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      preferenceStore.delete(key);
    }),
  },
}));

describe("mobileOfflineQueueService", () => {
  beforeEach(() => {
    preferenceStore.clear();
  });

  it("syncs handled queue items and keeps unhandled items queued", async () => {
    const processor = vi.fn(async () => undefined);

    await mobileOfflineQueueService.enqueue("field-note", { note: "Front gate code captured" });
    await mobileOfflineQueueService.enqueue("buyer-request", { note: "Needs diaspora support" });

    const result = await mobileOfflineQueueService.sync({
      "field-note": processor,
    });

    expect(processor).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      synced: 1,
      failed: 0,
      skipped: 1,
      remaining: 1,
    });
    expect(await mobileOfflineQueueService.count()).toBe(1);
  });

  it("marks failed items for retry when a processor throws", async () => {
    const processor = vi.fn(async () => {
      throw new Error("Network unavailable");
    });

    const item = await mobileOfflineQueueService.enqueue("field-note", {
      note: "Needs retry",
    });

    const result = await mobileOfflineQueueService.sync({
      "field-note": processor,
    });
    const [queuedItem] = await mobileOfflineQueueService.list();

    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    expect(queuedItem.id).toBe(item.id);
    expect(queuedItem.status).toBe("failed");
    expect(queuedItem.retries).toBe(1);
    expect(queuedItem.lastError).toBe("Network unavailable");
  });
});
