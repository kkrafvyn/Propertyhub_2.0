/**
 * IndexedDB persistence for offline workspace drafts and sync outbox.
 * On Electron desktop, delegates to SQLite via window.desktopAPI.offlineStore.
 */

import { getOfflineStorageBackend } from "./offline-storage";

export type OfflineEntityType =
  | "maintenance_request"
  | "maintenance_update"
  | "maintenance_assign"
  | "lease_note"
  | "finance_statement_draft"
  | "finance_distribution_request"
  | "inspection";

export type OfflineOutboxEntry = {
  id: string;
  entityType: OfflineEntityType;
  organizationId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string | null;
  baseUpdatedAt?: string | null;
  status?: "pending" | "conflict";
};

export type OfflineConflictRecord = {
  id: string;
  outboxId: string;
  entityType: OfflineEntityType;
  organizationId: string;
  localPayload: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string | null;
};

const DB_NAME = "baytmiftah_offline";
const DB_VERSION = 2;
const OUTBOX_STORE = "outbox";
const DRAFTS_STORE = "drafts";
const CONFLICTS_STORE = "conflicts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        outbox.createIndex("entityType", "entityType", { unique: false });
        outbox.createIndex("organizationId", "organizationId", { unique: false });
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CONFLICTS_STORE)) {
        const conflicts = db.createObjectStore(CONFLICTS_STORE, { keyPath: "id" });
        conflicts.createIndex("organizationId", "organizationId", { unique: false });
        conflicts.createIndex("outboxId", "outboxId", { unique: false });
      }
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error ?? new Error("IndexedDB request failed"));
        } else {
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
        }
      })
      .catch(reject);
  });
}

const indexedDbBackend = {
  isSupported() {
    return typeof indexedDB !== "undefined";
  },

  async listOutbox(organizationId?: string) {
    if (!this.isSupported()) return [] as OfflineOutboxEntry[];

    const db = await openDb();
    return new Promise<OfflineOutboxEntry[]>((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, "readonly");
      const store = tx.objectStore(OUTBOX_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = (request.result as OfflineOutboxEntry[]) || [];
        resolve(
          organizationId
            ? rows.filter((row) => row.organizationId === organizationId)
            : rows,
        );
      };
      request.onerror = () => reject(request.error);
    });
  },

  async upsertOutbox(entry: OfflineOutboxEntry) {
    if (!this.isSupported()) return entry;
    await withStore(OUTBOX_STORE, "readwrite", (store) => store.put(entry));
    return entry;
  },

  async removeOutbox(id: string) {
    if (!this.isSupported()) return;
    await withStore(OUTBOX_STORE, "readwrite", (store) => store.delete(id));
  },

  async saveDraft<T extends { id: string }>(draft: T) {
    if (!this.isSupported()) return draft;
    await withStore(DRAFTS_STORE, "readwrite", (store) => store.put(draft));
    return draft;
  },

  async getDraft<T extends { id: string }>(id: string) {
    if (!this.isSupported()) return null;
    return withStore<T | undefined>(DRAFTS_STORE, "readonly", (store) => store.get(id));
  },

  async listDrafts<T>() {
    if (!this.isSupported()) return [] as T[];
    return withStore<T[]>(DRAFTS_STORE, "readonly", (store) => store.getAll());
  },

  async listConflicts(organizationId?: string) {
    if (!this.isSupported()) return [] as OfflineConflictRecord[];

    const db = await openDb();
    return new Promise<OfflineConflictRecord[]>((resolve, reject) => {
      const tx = db.transaction(CONFLICTS_STORE, "readonly");
      const store = tx.objectStore(CONFLICTS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = (request.result as OfflineConflictRecord[]) || [];
        resolve(
          organizationId
            ? rows.filter((row) => row.organizationId === organizationId && !row.resolvedAt)
            : rows.filter((row) => !row.resolvedAt),
        );
      };
      request.onerror = () => reject(request.error);
    });
  },

  async recordConflict(conflict: OfflineConflictRecord) {
    if (!this.isSupported()) return conflict;
    await withStore(CONFLICTS_STORE, "readwrite", (store) => store.put(conflict));
    return conflict;
  },

  async resolveConflict(id: string) {
    if (!this.isSupported()) return;
    const existing = await withStore<OfflineConflictRecord | undefined>(
      CONFLICTS_STORE,
      "readonly",
      (store) => store.get(id),
    );
    if (!existing) return;
    await withStore(CONFLICTS_STORE, "readwrite", (store) =>
      store.put({ ...existing, resolvedAt: new Date().toISOString() }),
    );
  },
};

export const offlineDb = {
  isSupported() {
    return indexedDbBackend.isSupported() || getOfflineStorageBackend() !== null;
  },

  async listOutbox(organizationId?: string) {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.listOutbox(organizationId);
    return indexedDbBackend.listOutbox(organizationId);
  },

  async upsertOutbox(entry: OfflineOutboxEntry) {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.upsertOutbox(entry);
    return indexedDbBackend.upsertOutbox(entry);
  },

  async removeOutbox(id: string) {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.removeOutbox(id);
    return indexedDbBackend.removeOutbox(id);
  },

  async saveDraft<T extends { id: string }>(draft: T) {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.saveDraft(draft);
    return indexedDbBackend.saveDraft(draft);
  },

  async getDraft<T extends { id: string }>(id: string) {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.getDraft<T>(id);
    return indexedDbBackend.getDraft<T>(id);
  },

  async listDrafts<T>() {
    const backend = getOfflineStorageBackend();
    if (backend) return backend.listDrafts<T>();
    return indexedDbBackend.listDrafts<T>();
  },

  async listConflicts(organizationId?: string) {
    const backend = getOfflineStorageBackend();
    if (backend?.listConflicts) return backend.listConflicts(organizationId);
    return indexedDbBackend.listConflicts(organizationId);
  },

  async recordConflict(conflict: OfflineConflictRecord) {
    const backend = getOfflineStorageBackend();
    if (backend?.recordConflict) return backend.recordConflict(conflict);
    return indexedDbBackend.recordConflict(conflict);
  },

  async resolveConflict(id: string) {
    const backend = getOfflineStorageBackend();
    if (backend?.resolveConflict) return backend.resolveConflict(id);
    return indexedDbBackend.resolveConflict(id);
  },
};
