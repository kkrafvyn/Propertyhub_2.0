import { describe, expect, it, vi, beforeEach } from "vitest";
import { PLATFORM_CONSOLE_GRANTS } from "./platform-console-grants";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("./fraud-detection.service", () => ({
  fraudDetectionService: {
    getModerationOverview: vi.fn().mockResolvedValue({ pendingAlerts: 2, openCases: 1 }),
  },
}));

vi.mock("./platform-operations.service", () => ({
  platformOperationsService: {
    checkHealth: vi.fn().mockResolvedValue({ checks: [] }),
    events: vi.fn().mockResolvedValue([]),
  },
}));

import { supabase } from "./supabase";
import { loadStaffCommandCenterSnapshot } from "./platform-admin-dashboard.service";

describe("platform-admin-dashboard.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only grant-scoped domains for staff snapshot", async () => {
    const from = vi.mocked(supabase.from);
    from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };
      if (table === "payment_transactions") {
        chain.select.mockReturnValue({
          ...chain,
          gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
        });
      }
      return chain as never;
    });

    const snapshot = await loadStaffCommandCenterSnapshot([PLATFORM_CONSOLE_GRANTS.moderation]);
    expect(snapshot.moderationOverview).toEqual({ pendingAlerts: 2, openCases: 1 });
    expect(snapshot.health).toBeUndefined();
    expect(snapshot.paymentCount24h).toBeUndefined();
  });
});
