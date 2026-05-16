import { Preferences } from "@capacitor/preferences";

export type MobileOfflineQueueType =
  | "field-note"
  | "listing-photo"
  | "viewing-note"
  | "viewing-request"
  | "buyer-request"
  | "maintenance-report"
  | "message-draft"
  | "offer-draft"
  | "deal-document";

export interface MobileOfflineQueueItem<TPayload = unknown> {
  id: string;
  type: MobileOfflineQueueType;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  retries: number;
  status: "queued" | "syncing" | "failed";
  lastError?: string;
}

export type MobileOfflineQueueProcessor<TPayload = unknown> = (
  item: MobileOfflineQueueItem<TPayload>
) => Promise<void>;

export type MobileOfflineQueueProcessors = Partial<
  Record<MobileOfflineQueueType, MobileOfflineQueueProcessor>
>;

export interface MobileOfflineSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  remaining: number;
}

const QUEUE_KEY = "baytmiftah_mobile_offline_queue";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mobile-queue-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitQueueChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("baytmiftah:offline-queue-change"));
  }
}

async function readRawQueue() {
  try {
    const result = await Preferences.get({ key: QUEUE_KEY });
    if (result.value) return result.value;
  } catch {
    // Fall back to localStorage below for web tests and unsupported native contexts.
  }

  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(QUEUE_KEY) || "[]";
}

async function writeRawQueue(value: string) {
  try {
    await Preferences.set({ key: QUEUE_KEY, value });
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(QUEUE_KEY, value);
    }
  }
}

export const mobileOfflineQueueService = {
  async list<TPayload = unknown>() {
    const rawQueue = await readRawQueue();

    try {
      return JSON.parse(rawQueue) as MobileOfflineQueueItem<TPayload>[];
    } catch {
      return [];
    }
  },

  async count() {
    return (await this.list()).length;
  },

  async enqueue<TPayload>(
    type: MobileOfflineQueueType,
    payload: TPayload
  ): Promise<MobileOfflineQueueItem<TPayload>> {
    const now = new Date().toISOString();
    const item: MobileOfflineQueueItem<TPayload> = {
      id: createId(),
      type,
      payload,
      createdAt: now,
      updatedAt: now,
      retries: 0,
      status: "queued",
    };
    const queue = await this.list<TPayload>();

    await writeRawQueue(JSON.stringify([item, ...queue]));
    emitQueueChange();
    return item;
  },

  async remove(id: string) {
    const queue = await this.list();
    await writeRawQueue(JSON.stringify(queue.filter((item) => item.id !== id)));
    emitQueueChange();
  },

  async clear() {
    await writeRawQueue("[]");
    emitQueueChange();
  },

  async markFailed(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const queue = await this.list();
    const nextQueue = queue.map((item) =>
      item.id === id
        ? {
            ...item,
            retries: item.retries + 1,
            updatedAt: new Date().toISOString(),
            status: "failed" as const,
            lastError: message,
          }
        : item
    );

    await writeRawQueue(JSON.stringify(nextQueue));
    emitQueueChange();
  },

  async sync(processors: MobileOfflineQueueProcessors): Promise<MobileOfflineSyncResult> {
    const queue = await this.list();
    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const queuedItem of queue) {
      if (queuedItem.status === "syncing") {
        skipped += 1;
        continue;
      }

      const processor = processors[queuedItem.type];
      if (!processor) {
        skipped += 1;
        continue;
      }

      const latestQueue = await this.list();
      const item = latestQueue.find((candidate) => candidate.id === queuedItem.id);
      if (!item) continue;

      await writeRawQueue(
        JSON.stringify(
          latestQueue.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  status: "syncing" as const,
                  updatedAt: new Date().toISOString(),
                  lastError: undefined,
                }
              : candidate
          )
        )
      );
      emitQueueChange();

      try {
        await processor(item);
        await this.remove(item.id);
        synced += 1;
      } catch (error) {
        await this.markFailed(item.id, error);
        failed += 1;
      }
    }

    return {
      synced,
      failed,
      skipped,
      remaining: await this.count(),
    };
  },
};
