import type { OfflineConflictRecord, OfflineOutboxEntry } from "./offline-db";

export {};

declare global {
  interface Window {
    desktopAPI?: {
      isDesktop: boolean;
      platform: string;
      sendNotification: (title: string, body: string) => void;
      openExternal: (url: string) => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getAppVersion: () => Promise<string>;
      printDocument: () => Promise<{ success: boolean }>;
      saveExportFile: (
        filename: string,
        data: unknown,
      ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      openImportFile: (
        filters?: Array<{ name: string; extensions: string[] }>,
      ) => Promise<{ success: boolean; filePath?: string; content?: string; canceled?: boolean; error?: string }>;
      onNavigate: (callback: (route: string) => void) => () => void;
      offlineStore?: {
        listOutbox: (organizationId?: string) => Promise<OfflineOutboxEntry[]>;
        upsertOutbox: (entry: OfflineOutboxEntry) => Promise<OfflineOutboxEntry>;
        removeOutbox: (id: string) => Promise<void>;
        saveDraft: <T extends { id: string }>(draft: T) => Promise<T>;
        getDraft: <T extends { id: string }>(id: string) => Promise<T | null>;
        listDrafts: <T>() => Promise<T[]>;
        listConflicts: (organizationId?: string) => Promise<OfflineConflictRecord[]>;
        recordConflict: (conflict: OfflineConflictRecord) => Promise<OfflineConflictRecord>;
        resolveConflict: (id: string) => Promise<void>;
      };
    };
  }
}
