import { describe, it, expect, beforeEach } from "vitest";
import {
  agenticAIOrchestratorService,
  type AgentType,
  type RiskLevel,
} from "./agentic-ai-orchestrator.service";

describe("Agentic AI Orchestrator Service", () => {
  it("retrieves seeded AI action ledger entries", () => {
    const entries = agenticAIOrchestratorService.getLedgerEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty("agent");
    expect(entries[0]).toHaveProperty("riskLevel");
    expect(entries[0]).toHaveProperty("approvalStatus");
  });

  it("filters pending Level 2 approvals", () => {
    const pending = agenticAIOrchestratorService.getPendingApprovals();
    expect(Array.isArray(pending)).toBe(true);
    expect(pending.every((p) => p.approvalStatus === "pending_approval")).toBe(true);
  });

  it("resolves a Level 2 approval with decision and notes", () => {
    const pending = agenticAIOrchestratorService.getPendingApprovals();
    expect(pending.length).toBeGreaterThan(0);

    const targetAction = pending[0];
    const resolved = agenticAIOrchestratorService.resolveApproval(
      targetAction.id,
      "approve",
      "Executive Manager",
      "Approved for immediate execution"
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.approvalStatus).toBe("approved");
    expect(resolved?.approvedBy).toBe("Executive Manager");
    expect(resolved?.executionResult).toContain("Approved by Executive Manager");
  });

  it("rejects approval when decision is reject", () => {
    const newAction = agenticAIOrchestratorService.recordAction({
      agent: "CollectionsAgent",
      organizationId: "org_test",
      triggeredBy: "manual_test",
      targetEntity: "tenant:test_tenant",
      actionType: "collections.eviction_warning",
      reasoning: "Tenant overdue by 60 days.",
      riskLevel: "LEVEL_2",
      approvalStatus: "pending_approval",
    });

    const rejected = agenticAIOrchestratorService.resolveApproval(
      newAction.id,
      "reject",
      "Head of PM",
      "Payment promise received via phone"
    );

    expect(rejected?.approvalStatus).toBe("rejected");
    expect(rejected?.approvedBy).toBe("Head of PM");
    expect(rejected?.executionResult).toContain("Payment promise received");
  });

  it("throws error if attempting to resolve a Level 3 action through generic trigger", () => {
    const level3Action = agenticAIOrchestratorService.recordAction({
      agent: "FinanceAgent",
      organizationId: "org_test",
      triggeredBy: "manual_test",
      targetEntity: "escrow:esc_99482",
      actionType: "escrow.release_funds",
      reasoning: "Release GHS 50,000 security deposit.",
      riskLevel: "LEVEL_3",
      approvalStatus: "pending_approval",
    });

    expect(() => {
      agenticAIOrchestratorService.resolveApproval(
        level3Action.id,
        "approve",
        "Manager"
      );
    }).toThrow(/LEVEL_3 actions require explicit direct human software execution/);
  });

  it("executes AI Night Watch audit and produces structured briefing items", () => {
    const report = agenticAIOrchestratorService.runNightWatchAudit("org_test_estate");
    expect(report).toBeDefined();
    expect(report.leasesScanned).toBeGreaterThan(0);
    expect(report.receivablesScanned).toBeGreaterThan(0);
    expect(report.briefingItems.length).toBeGreaterThanOrEqual(4);
    expect(report.briefingItems.some((b) => b.category === "lease")).toBe(true);
    expect(report.briefingItems.some((b) => b.category === "maintenance")).toBe(true);
  });

  it("matches contractors and generates quote comparison matrix", () => {
    const matrix = agenticAIOrchestratorService.generateQuoteComparisonMatrix(
      "WO-842",
      "HVAC"
    );

    expect(matrix.workOrderId).toBe("WO-842");
    expect(matrix.quotes.length).toBeGreaterThan(0);
    expect(matrix.recommendedQuoteId).toBeTruthy();
    expect(matrix.recommendationReason).toContain("SLA response");
    expect(matrix.riskLevel).toBe("LEVEL_2"); // Quote > GHS 1,000
  });

  it("executes domain agent goal and records to action ledger", async () => {
    const result = await agenticAIOrchestratorService.executeAgentGoal(
      "PropertyManagementAgent",
      "Check unit vacancies and turnover inspections",
      "org_test"
    );

    expect(result.agent).toBe("PropertyManagementAgent");
    expect(result.summary).toBeTruthy();
    expect(result.actionTaken).toBeTruthy();

    const ledger = agenticAIOrchestratorService.getLedgerEntries("org_test");
    expect(ledger.some((l) => l.agent === "PropertyManagementAgent")).toBe(true);
  });
});
