import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    rpc: mocks.rpcMock,
    from: vi.fn(),
  },
}));

vi.mock("./offline-db", () => ({
  offlineDb: {
    listOutbox: vi.fn(async () => [
      {
        id: "out-1",
        entityType: "maintenance_request",
        organizationId: "org-1",
        payload: { title: "Leak", description: "Kitchen", offline_client_id: "out-1" },
        status: "pending",
        attempts: 0,
        createdAt: "",
        updatedAt: "",
      },
    ]),
    listConflicts: async () => [],
    removeOutbox: vi.fn(),
    upsertOutbox: vi.fn(),
  },
}));

vi.mock("./inspection-sync.service", () => ({
  inspectionSyncService: {
    syncAllPendingQueue: async () => ({ syncedCount: 0, errorsCount: 0 }),
    getOfflineQueue: () => [],
  },
}));

import { workspaceSyncService } from "./workspace-sync.service";

describe("workspaceSyncService maintenance offline", () => {
  beforeEach(() => {
    mocks.rpcMock.mockReset();
    mocks.rpcMock.mockResolvedValue({ error: null });
  });

  it("calls upsert_maintenance_request_offline RPC", async () => {
    await workspaceSyncService.syncAll("org-1");
    expect(mocks.rpcMock).toHaveBeenCalledWith(
      "upsert_maintenance_request_offline",
      expect.objectContaining({
        p_organization_id: "org-1",
        p_offline_client_id: "out-1",
      }),
    );
  });
});
