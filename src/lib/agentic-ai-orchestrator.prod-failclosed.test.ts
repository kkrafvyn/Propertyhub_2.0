import { describe, it, expect, vi, beforeEach } from "vitest";

const ORG_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const fromMock = vi.fn();

vi.mock("./simulation-mode", () => ({
  isDemoSimulationAllowed: () => false,
  isProductionBuild: () => true,
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./ai-tool-allowlist.service", () => ({
  aiToolAllowlistService: {
    assertToolAllowed: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("agentic orchestrator production fail-closed", () => {
  beforeEach(() => {
    fromMock.mockImplementation((table: string) => {
      const emptyChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnValue({
          then: (fn: (v: unknown) => void) => {
            fn(undefined);
            return { catch: () => undefined };
          },
        }),
      };
      if (table === "estate_ai_action_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return emptyChain;
    });
  });

  it("getLedgerEntriesLive returns [] for non-UUID org", async () => {
    const { agenticAIOrchestratorService } = await import("./agentic-ai-orchestrator.service");
    const entries = await agenticAIOrchestratorService.getLedgerEntriesLive("workspace-slug");
    expect(entries).toEqual([]);
  });

  it("getLedgerEntriesLive returns [] when database has no rows", async () => {
    const { agenticAIOrchestratorService } = await import("./agentic-ai-orchestrator.service");
    const entries = await agenticAIOrchestratorService.getLedgerEntriesLive(ORG_UUID);
    expect(entries).toEqual([]);
  });

  it("executeAgentGoal rejects non-UUID organization id", async () => {
    const { agenticAIOrchestratorService } = await import("./agentic-ai-orchestrator.service");
    await expect(
      agenticAIOrchestratorService.executeAgentGoal("FinanceAgent", "Audit ledger", "org-slug")
    ).rejects.toThrow(/Resolve a valid organization/);
  });

  it("executeAgentGoal does not return hardcoded FinanceAgent demo narrative in production", async () => {
    const { agenticAIOrchestratorService } = await import("./agentic-ai-orchestrator.service");
    await expect(
      agenticAIOrchestratorService.executeAgentGoal(
        "FinanceAgent",
        "Audit ledger",
        ORG_UUID
      )
    ).rejects.toThrow(/not connected to a production worker/);
  });
});
