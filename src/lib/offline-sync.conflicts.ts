import type { OfflineOutboxEntry } from "./offline-db";

export type OfflineConflictRecord = {
  id: string;
  outboxId: string;
  entityType: OfflineOutboxEntry["entityType"];
  organizationId: string;
  localPayload: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string | null;
};

export function isServerNewer(serverUpdatedAt: string | null | undefined, baseUpdatedAt: string | null | undefined) {
  if (!serverUpdatedAt || !baseUpdatedAt) return false;
  return new Date(serverUpdatedAt).getTime() > new Date(baseUpdatedAt).getTime();
}

export function buildConflictRecord(input: {
  outboxEntry: OfflineOutboxEntry;
  serverSnapshot: Record<string, unknown>;
}): OfflineConflictRecord {
  return {
    id: crypto.randomUUID(),
    outboxId: input.outboxEntry.id,
    entityType: input.outboxEntry.entityType,
    organizationId: input.outboxEntry.organizationId,
    localPayload: input.outboxEntry.payload,
    serverSnapshot: input.serverSnapshot,
    detectedAt: new Date().toISOString(),
  };
}
