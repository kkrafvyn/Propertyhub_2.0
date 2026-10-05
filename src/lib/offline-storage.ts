import type { OfflineConflictRecord, OfflineOutboxEntry } from "./offline-db";

export type OfflineStorageBackend = {
  listOutbox: (organizationId?: string) => Promise<OfflineOutboxEntry[]>;
  upsertOutbox: (entry: OfflineOutboxEntry) => Promise<OfflineOutboxEntry>;
  removeOutbox: (id: string) => Promise<void>;
  saveDraft: <T extends { id: string }>(draft: T) => Promise<T>;
  getDraft: <T extends { id: string }>(id: string) => Promise<T | null>;
  listDrafts: <T>() => Promise<T[]>;
  listConflicts?: (organizationId?: string) => Promise<OfflineConflictRecord[]>;
  recordConflict?: (conflict: OfflineConflictRecord) => Promise<OfflineConflictRecord>;
  resolveConflict?: (id: string) => Promise<void>;
  clearAll?: () => Promise<void>;
};

export function getOfflineStorageBackend(): OfflineStorageBackend | null {
  if (typeof window === "undefined") return null;
  return window.desktopAPI?.offlineStore ?? null;
}

export function usesDesktopOfflineStore() {
  return getOfflineStorageBackend() !== null;
}
