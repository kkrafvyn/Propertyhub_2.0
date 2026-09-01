import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentFleetService } from "./agent-fleet.service";

describe("AgentFleetService", () => {
  describe("Leasing Agent — scoreLeaseApplication", () => {
    it("should classify low rent-to-income ratio as LOW risk and recommend approval", async () => {
      const result = await agentFleetService.scoreLeaseApplication({
        applicationId: "app-001",
        monthlyIncomeGhs: 30000,
        monthlyRentGhs: 6000, // 20%
        hasGuarantor: true,
        employmentType: "formal_salaried",
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.riskTier).toBe("LOW");
      expect(result.recommendation).toBe("APPROVE");
      expect(result.suggestedDepositMonths).toBe(1);
      expect(result.rentToIncomeRatio).toBe(20);
    });

    it("should classify high rent burden as HIGH or CRITICAL risk and recommend review/reject", async () => {
      const result = await agentFleetService.scoreLeaseApplication({
        applicationId: "app-002",
        monthlyIncomeGhs: 5000,
        monthlyRentGhs: 4000, // 80%
        hasGuarantor: false,
      });

      expect(result.overallScore).toBeLessThan(60);
      expect(["HIGH", "CRITICAL"]).toContain(result.riskTier);
      expect(["MANUAL_REVIEW", "REJECT"]).toContain(result.recommendation);
      expect(result.suggestedDepositMonths).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Collections Agent — evaluateArrearsStrategy", () => {
    it("should recommend gentle reminder for fresh delinquency without prior breaches", async () => {
      const strategy = await agentFleetService.evaluateArrearsStrategy({
        unitId: "unit-101",
        tenantName: "Ama Mensah",
        totalArrearsMinor: 250000, // GH₵ 2,500
        daysOverdue: 7,
        priorPtPBreaches: 0,
      });

      expect(strategy.recommendedStrategy).toBe("GENTLE_REMINDER");
      expect(strategy.suggestedInstallmentCount).toBe(1);
      expect(strategy.firstPaymentDueGhs).toBe(2500);
      expect(strategy.outreachScript).toContain("gentle reminder");
    });

    it("should recommend structured 3-part PtP for moderate delinquency", async () => {
      const strategy = await agentFleetService.evaluateArrearsStrategy({
        unitId: "unit-102",
        tenantName: "Kwame Darko",
        totalArrearsMinor: 600000, // GH₵ 6,000
        daysOverdue: 35,
        priorPtPBreaches: 0,
      });

      expect(strategy.recommendedStrategy).toBe("STRUCTURED_PTP");
      expect(strategy.suggestedInstallmentCount).toBe(3);
      expect(strategy.firstPaymentDueGhs).toBe(2000);
      expect(strategy.outreachScript).toContain("payment plan");
    });

    it("should recommend formal legal notice for chronic delinquency", async () => {
      const strategy = await agentFleetService.evaluateArrearsStrategy({
        unitId: "unit-103",
        tenantName: "Kofi Owusu",
        totalArrearsMinor: 1500000, // GH₵ 15,000
        daysOverdue: 90,
        priorPtPBreaches: 3,
      });

      expect(strategy.recommendedStrategy).toBe("LEGAL_NOTICE");
      expect(strategy.outreachScript).toContain("Formal Notice");
    });
  });
});
