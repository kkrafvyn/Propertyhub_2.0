import { supabase } from "./supabase";
import { offlineDb, type OfflineOutboxEntry } from "./offline-db";
import { inspectionSyncService } from "./inspection-sync.service";
import { buildConflictRecord, isServerNewer } from "./offline-sync.conflicts";

export type SyncResult = {
  synced: number;
  /** @deprecated use retryableFailures + permanentFailures */
  failed: number;
  pending: number;
  conflicts: number;
  retryableFailures: number;
  permanentFailures: number;
};

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function createOutboxEntry(input: {
  entityType: OfflineOutboxEntry["entityType"];
  organizationId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt?: string | null;
}): OfflineOutboxEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    entityType: input.entityType,
    organizationId: input.organizationId,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    baseUpdatedAt: input.baseUpdatedAt ?? null,
    status: "pending",
  };
}

async function checkMaintenanceConflict(requestId: string, entry: OfflineOutboxEntry) {
  if (!entry.baseUpdatedAt) return null;

  const { data: current, error } = await supabase
    .from("maintenance_requests")
    .select("id, status, updated_at, vendor_id, resolved_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!current) return null;

  if (isServerNewer(current.updated_at, entry.baseUpdatedAt)) {
    const conflict = buildConflictRecord({ outboxEntry: entry, serverSnapshot: current });
    await offlineDb.recordConflict(conflict);
    await offlineDb.upsertOutbox({ ...entry, status: "conflict", updatedAt: new Date().toISOString() });
    return conflict;
  }

  return null;
}

export const workspaceSyncService = {
  isOnline,
  isOfflineSupported: () => offlineDb.isSupported(),

  async getPendingCount(organizationId?: string) {
    const [outboxRows, inspectionQueue, conflicts] = await Promise.all([
      offlineDb.listOutbox(organizationId),
      Promise.resolve(inspectionSyncService.getOfflineQueue().length),
      offlineDb.listConflicts(organizationId),
    ]);
    const pendingOutbox = outboxRows.filter((row) => row.status !== "conflict").length;
    return pendingOutbox + inspectionQueue + conflicts.length;
  },

  async getConflictCount(organizationId?: string) {
    const conflicts = await offlineDb.listConflicts(organizationId);
    return conflicts.length;
  },

  async listConflicts(organizationId?: string) {
    return offlineDb.listConflicts(organizationId);
  },

  async resolveConflict(
    conflictId: string,
    strategy: "keep_server" | "overwrite_server" | "retry_local",
  ) {
    const conflicts = await offlineDb.listConflicts();
    const conflict = conflicts.find((row) => row.id === conflictId);
    if (!conflict) return;

    const overwrite = strategy === "overwrite_server" || strategy === "retry_local";

    if (strategy === "keep_server") {
      await offlineDb.removeOutbox(conflict.outboxId);
    } else if (overwrite) {
      const outbox = await offlineDb.listOutbox();
      const entry = outbox.find((row) => row.id === conflict.outboxId);
      if (entry) {
        const serverUpdatedAt = conflict.serverSnapshot.updated_at;
        await offlineDb.upsertOutbox({
          ...entry,
          status: "pending",
          baseUpdatedAt:
            typeof serverUpdatedAt === "string" ? serverUpdatedAt : entry.baseUpdatedAt,
          attempts: 0,
          lastError: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await offlineDb.resolveConflict(conflictId);
  },

  async queueMaintenanceCreate(input: {
    organizationId: string;
    payload: Record<string, unknown>;
  }) {
    const entry = createOutboxEntry({
      entityType: "maintenance_request",
      organizationId: input.organizationId,
      payload: input.payload,
    });
    entry.payload = {
      ...input.payload,
      organization_id: input.organizationId,
      offline_client_id: entry.id,
    };
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async queueMaintenanceUpdate(input: {
    organizationId: string;
    requestId: string;
    payload: Record<string, unknown>;
    baseUpdatedAt?: string | null;
  }) {
    const entry = createOutboxEntry({
      entityType: "maintenance_update",
      organizationId: input.organizationId,
      payload: { requestId: input.requestId, ...input.payload },
      baseUpdatedAt: input.baseUpdatedAt,
    });
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async queueMaintenanceAssign(input: {
    organizationId: string;
    requestId: string;
    vendorId: string;
    baseUpdatedAt?: string | null;
  }) {
    const entry = createOutboxEntry({
      entityType: "maintenance_assign",
      organizationId: input.organizationId,
      payload: {
        requestId: input.requestId,
        vendorId: input.vendorId,
        status: "in_progress",
      },
      baseUpdatedAt: input.baseUpdatedAt,
    });
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async queueLeaseNote(input: {
    organizationId: string;
    payload: Record<string, unknown>;
  }) {
    const entry = createOutboxEntry({
      entityType: "lease_note",
      organizationId: input.organizationId,
      payload: input.payload,
    });
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async queueFinanceStatementDraft(input: {
    organizationId: string;
    payload: {
      estateId: string;
      ownerUserId: string;
      periodStart: string;
      periodEnd: string;
      offlineClientId?: string;
    };
  }) {
    const entry = createOutboxEntry({
      entityType: "finance_statement_draft",
      organizationId: input.organizationId,
      payload: {
        ...input.payload,
        offlineClientId: input.payload.offlineClientId || crypto.randomUUID(),
      },
    });
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async queueFinanceDistributionRequest(input: {
    organizationId: string;
    payload: {
      statementRunId: string;
      offlineClientId?: string;
    };
  }) {
    const entry = createOutboxEntry({
      entityType: "finance_distribution_request",
      organizationId: input.organizationId,
      payload: { statementRunId: input.payload.statementRunId },
    });
    entry.payload = {
      statementRunId: input.payload.statementRunId,
      offlineClientId: input.payload.offlineClientId || entry.id,
    };
    await offlineDb.upsertOutbox(entry);
    return entry;
  },

  async syncAll(organizationId?: string): Promise<SyncResult> {
    if (!isOnline()) {
      const pending = await this.getPendingCount(organizationId);
      const conflicts = await this.getConflictCount(organizationId);
      return {
        synced: 0,
        failed: 0,
        pending,
        conflicts,
        retryableFailures: 0,
        permanentFailures: 0,
      };
    }

    let synced = 0;
    let retryableFailures = 0;
    let permanentFailures = 0;
    let syncConflicts = 0;

    const outbox = (await offlineDb.listOutbox(organizationId)).filter(
      (entry) => entry.status !== "conflict",
    );

    for (const entry of outbox) {
      try {
        if (entry.entityType === "maintenance_request") {
          const payload = entry.payload as Record<string, unknown>;
          const { error } = await supabase.from("maintenance_requests").upsert(payload as never, {
            onConflict: "organization_id,offline_client_id",
            ignoreDuplicates: false,
          });
          if (error) throw error;
        } else if (entry.entityType === "maintenance_update") {
          const { requestId, ...updates } = entry.payload as { requestId: string };
          const conflict = await checkMaintenanceConflict(requestId, entry);
          if (conflict) {
            syncConflicts += 1;
            continue;
          }
          let updateQuery = supabase
            .from("maintenance_requests")
            .update(updates as never)
            .eq("id", requestId);
          if (entry.baseUpdatedAt) {
            updateQuery = updateQuery.eq("updated_at", entry.baseUpdatedAt);
          }
          const { data: updatedRow, error } = await updateQuery.select("id").maybeSingle();
          if (error) throw error;
          if (!updatedRow && entry.baseUpdatedAt) {
            syncConflicts += 1;
            await checkMaintenanceConflict(requestId, entry);
            continue;
          }
        } else if (entry.entityType === "maintenance_assign") {
          const { requestId, vendorId, status } = entry.payload as {
            requestId: string;
            vendorId: string;
            status: string;
          };
          const conflict = await checkMaintenanceConflict(requestId, entry);
          if (conflict) {
            syncConflicts += 1;
            continue;
          }
          let assignQuery = supabase
            .from("maintenance_requests")
            .update({
              vendor_id: vendorId,
              status,
              updated_at: new Date().toISOString(),
            } as never)
            .eq("id", requestId);
          if (entry.baseUpdatedAt) {
            assignQuery = assignQuery.eq("updated_at", entry.baseUpdatedAt);
          }
          const { data: assignedRow, error } = await assignQuery.select("id").maybeSingle();
          if (error) throw error;
          if (!assignedRow && entry.baseUpdatedAt) {
            syncConflicts += 1;
            await checkMaintenanceConflict(requestId, entry);
            continue;
          }
        } else if (entry.entityType === "lease_note") {
          const { error } = await supabase.from("lease_notes").upsert(entry.payload as never, {
            onConflict: "offline_client_id",
          });
          if (error) throw error;
        } else if (entry.entityType === "finance_statement_draft") {
          const payload = entry.payload as {
            estateId: string;
            ownerUserId: string;
            periodStart: string;
            periodEnd: string;
          };
          const { error } = await supabase.rpc("create_owner_statement_run", {
            p_estate_id: payload.estateId,
            p_owner_user_id: payload.ownerUserId,
            p_period_start: payload.periodStart,
            p_period_end: payload.periodEnd,
          });
          if (error) throw error;
        } else if (entry.entityType === "finance_distribution_request") {
          const payload = entry.payload as {
            statementRunId: string;
            offlineClientId?: string;
          };
          const { error } = await supabase.rpc("request_distribution_approval", {
            p_statement_run_id: payload.statementRunId,
            p_client_request_id: payload.offlineClientId || entry.id,
          });
          if (error) throw error;
        }
        await offlineDb.removeOutbox(entry.id);
        synced += 1;
      } catch (error) {
        retryableFailures += 1;
        await offlineDb.upsertOutbox({
          ...entry,
          attempts: entry.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    try {
      const inspectionResult = await inspectionSyncService.syncAllPendingQueue();
      synced += inspectionResult.syncedCount;
      retryableFailures += inspectionResult.errorsCount;
    } catch (inspectionError) {
      retryableFailures += 1;
      console.error("Inspection sync failed:", inspectionError);
    }

    const pending = await this.getPendingCount(organizationId);
    const conflicts = (await this.getConflictCount(organizationId)) + syncConflicts;
    const failed = retryableFailures + permanentFailures;
    return {
      synced,
      failed,
      pending,
      conflicts,
      retryableFailures,
      permanentFailures,
    };
  },

  subscribe(onChange: () => void) {
    if (typeof window === "undefined") return () => undefined;

    const handleOnline = () => {
      void this.syncAll().finally(onChange);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  },
};
