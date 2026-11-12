/**
 * BaytMiftah REOS — Fleet of Specialized Agentic AI Orchestrator & Action Ledger
 *
 * Implements the 15-agent fleet, 4-tier approval governance (Level 0 to Level 3),
 * AI Night Watch autonomous audit engine, and immutable AI Action Ledger.
 */

import { supabase } from "./supabase";
import { isDemoSimulationAllowed } from "./simulation-mode";
import { secureId } from "./secure-id";

const aiDb = supabase as any;

export type AgentType =
  | "PropertyManagementAgent"
  | "FinanceAgent"
  | "CollectionsAgent"
  | "LeasingAgent"
  | "SalesAgent"
  | "MarketingAgent"
  | "MaintenanceAgent"
  | "ContractorAgent"
  | "CustomerServiceAgent"
  | "CommunicationAgent"
  | "InspectionAgent"
  | "UtilityAgent"
  | "AssetAgent"
  | "ProcurementAgent"
  | "ExecutiveAgent";

export type RiskLevel =
  | "LEVEL_0" // Autonomous (Reports, internal tasks, classification)
  | "LEVEL_1" // Policy-Bound Autonomous (Assign tech, routine reminders, RFQs)
  | "LEVEL_2" // Human Approval Required (Quotes > GHS 1000, refunds, legal notices)
  | "LEVEL_3"; // Human-Only (Escrow release, alter contracts, court filings)

export type ApprovalStatus =
  | "auto_approved"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executed";

export interface AIActionLedgerEntry {
  id: string;
  agent: AgentType;
  organizationId: string;
  triggeredBy: string;
  targetEntity: string;
  actionType: string;
  reasoning: string;
  riskLevel: RiskLevel;
  approvalStatus: ApprovalStatus;
  executionResult?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BriefingItem {
  id: string;
  category: "lease" | "finance" | "maintenance" | "utility" | "contractor" | "macro";
  severity: "critical" | "warning" | "info";
  title: string;
  evidence: string;
  recommendation: string;
  suggestedAction: string;
  riskLevel: RiskLevel;
  actionPayload?: Record<string, any>;
}

export interface NightWatchReport {
  id: string;
  scannedAt: string;
  organizationId: string;
  leasesScanned: number;
  receivablesScanned: number;
  maintenanceScanned: number;
  riskScore: number; // 0 (perfect) to 100 (high risk)
  criticalAlertsCount: number;
  pendingApprovalsCount: number;
  briefingItems: BriefingItem[];
}

export interface ContractorMatchResult {
  contractorId: string;
  name: string;
  company: string;
  trade: string;
  rating: number; // 1.0 to 5.0
  distanceKm: number;
  hourlyRateGhs: number;
  slaResponseScore: number; // 0 to 100
  historicalCompletionRate: number; // 0 to 100
  isRecommended: boolean;
  matchScore: number;
}

export interface QuoteComparisonMatrix {
  workOrderId: string;
  trade: string;
  quotes: Array<{
    quoteId: string;
    contractorId: string;
    contractorName: string;
    estimatedCostGhs: number;
    estimatedDurationHours: number;
    earliestStartTime: string;
    warrantyMonths: number;
    score: number;
    isBestValue: boolean;
    isFastest: boolean;
  }>;
  recommendedQuoteId: string;
  recommendationReason: string;
  riskLevel: RiskLevel;
}

class AgenticAIOrchestratorService {
  private ledger: AIActionLedgerEntry[] = [];
  private nightWatchReports: NightWatchReport[] = [];

  constructor() {
    if (isDemoSimulationAllowed()) {
      this.seedInitialLedger();
    }
  }

  private emptyNightWatchReport(organizationId: string): NightWatchReport {
    return {
      id: `nw_empty_${Date.now()}`,
      organizationId,
      scannedAt: new Date().toISOString(),
      leasesScanned: 0,
      receivablesScanned: 0,
      maintenanceScanned: 0,
      riskScore: 0,
      criticalAlertsCount: 0,
      pendingApprovalsCount: 0,
      briefingItems: [],
    };
  }

  private seedInitialLedger() {
    const now = new Date();
    this.ledger = [
      {
        id: "act_nw_01",
        agent: "PropertyManagementAgent",
        organizationId: "org_default",
        triggeredBy: "cron:night_watch_0300",
        targetEntity: "unit:cantonments_4b",
        actionType: "lease.expiration_flagged",
        reasoning: "Tenancy lease expires in 45 days. Tenant has high on-time payment rating (98%).",
        riskLevel: "LEVEL_1",
        approvalStatus: "auto_approved",
        executionResult: "Dispatched lease renewal packet to tenant WhatsApp.",
        createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      },
      {
        id: "act_nw_02",
        agent: "MaintenanceAgent",
        organizationId: "org_default",
        triggeredBy: "event:issue_created",
        targetEntity: "issue:water_heater_302",
        actionType: "maintenance.rfq_dispatched",
        reasoning: "In-house plumber on leave. Sourced 3 vetted contractors within Airport Residential zone.",
        riskLevel: "LEVEL_1",
        approvalStatus: "auto_approved",
        executionResult: "3 RFQ quote requests generated.",
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
      {
        id: "act_nw_03",
        agent: "ContractorAgent",
        organizationId: "org_default",
        triggeredBy: "event:quotes_received",
        targetEntity: "work_order:hvac_generator_b",
        actionType: "contractor.quote_approval_required",
        reasoning: "Generator 500-hour overhaul quote from Volta Power Engineering is GHS 4,850 (exceeds GHS 1,000 threshold).",
        riskLevel: "LEVEL_2",
        approvalStatus: "pending_approval",
        metadata: {
          quoteAmountGhs: 4850,
          vendor: "Volta Power Engineering Ltd",
          savingsVsBudgetGhs: 650,
        },
        createdAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
      },
      {
        id: "act_nw_04",
        agent: "CollectionsAgent",
        organizationId: "org_default",
        triggeredBy: "schedule:arrears_audit",
        targetEntity: "tenant:kwame_mensah",
        actionType: "collections.notice_drafted",
        reasoning: "Rent invoice overdue by 14 days (GHS 6,500). Drafted Ghana Rent Act compliant notice.",
        riskLevel: "LEVEL_2",
        approvalStatus: "pending_approval",
        metadata: {
          arrearsGhs: 6500,
          daysOverdue: 14,
          channel: "WhatsApp & SMS",
        },
        createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      },
      {
        id: "act_nw_05",
        agent: "FinanceAgent",
        organizationId: "org_default",
        triggeredBy: "webhook:payangels_deposit",
        targetEntity: "payment:pa_88492a",
        actionType: "finance.unallocated_credit_matched",
        reasoning: "Matched unreferenced MTN MoMo GHS 3,200 payment to Unit 12B service charge with 99.4% confidence.",
        riskLevel: "LEVEL_0",
        approvalStatus: "executed",
        executionResult: "Sub-ledger updated and digital receipt SHA-256 generated.",
        createdAt: new Date(now.getTime() - 15 * 60000).toISOString(),
      },
    ];
  }

  // ── 1. AI Action Ledger & Approval Governance ────────────────────────

  public getLedgerEntries(
    organizationId?: string,
    filter?: {
      agent?: AgentType;
      riskLevel?: RiskLevel;
      status?: ApprovalStatus;
    }
  ): AIActionLedgerEntry[] {
    return this.ledger.filter((item) => {
      if (organizationId && item.organizationId !== organizationId && item.organizationId !== "org_default") {
        return false;
      }
      if (filter?.agent && item.agent !== filter.agent) return false;
      if (filter?.riskLevel && item.riskLevel !== filter.riskLevel) return false;
      if (filter?.status && item.approvalStatus !== filter.status) return false;
      return true;
    });
  }

  public getPendingApprovals(organizationId?: string): AIActionLedgerEntry[] {
    return this.getLedgerEntries(organizationId, { status: "pending_approval" });
  }

  public recordAction(entry: Omit<AIActionLedgerEntry, "id" | "createdAt">): AIActionLedgerEntry {
    const newEntry: AIActionLedgerEntry = {
      ...entry,
      id: secureId("act"),
      createdAt: new Date().toISOString(),
      approvalStatus:
        entry.riskLevel === "LEVEL_0" || entry.riskLevel === "LEVEL_1"
          ? "auto_approved"
          : entry.approvalStatus || "pending_approval",
    };

    this.ledger.unshift(newEntry);
    return newEntry;
  }

  /**
   * Persist an approve/reject decision to estate_ai_action_logs when the
   * action came from the live ledger; falls back to the in-memory ledger.
   */
  public async resolveApprovalLive(
    actionId: string,
    decision: "approve" | "reject",
    resolvedByUserId?: string,
    notes?: string
  ): Promise<AIActionLedgerEntry | null> {
    if (!this.isDemoOrTest() && this.looksLikeUuid(actionId)) {
      const { data, error } = await aiDb
        .from("estate_ai_action_logs")
        .update({
          action_status: decision === "approve" ? "approved" : "rejected",
          approved_by: resolvedByUserId && this.looksLikeUuid(resolvedByUserId) ? resolvedByUserId : null,
          decided_at: new Date().toISOString(),
        })
        .eq("id", actionId)
        .eq("action_status", "recommended")
        .select("*")
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          agent: data.agent_type === "finance" ? "FinanceAgent" : "PropertyManagementAgent",
          organizationId: data.organization_id,
          triggeredBy: data.trigger_type || "system",
          targetEntity: data.target_type ? `${data.target_type}:${data.target_id || "unknown"}` : "portfolio",
          actionType: data.trigger_type || "ai.recommendation",
          reasoning: data.recommendation,
          riskLevel: data.risk_level === "high" ? "LEVEL_2" : data.risk_level === "medium" ? "LEVEL_1" : "LEVEL_0",
          approvalStatus: decision === "approve" ? "approved" : "rejected",
          executionResult: notes,
          createdAt: data.created_at,
          approvedBy: data.approved_by || undefined,
          approvedAt: data.decided_at || undefined,
        };
      }
    }

    return this.resolveApproval(actionId, decision, resolvedByUserId || "Operator", notes);
  }

  /** Persist an agent-goal execution to the live AI action log. */
  public async persistAgentAction(entry: {
    organizationId: string;
    agent: AgentType;
    riskLevel: RiskLevel;
    reasoning: string;
    requiresApproval: boolean;
    requestedBy?: string;
  }): Promise<void> {
    if (this.isDemoOrTest() || !this.looksLikeUuid(entry.organizationId)) return;

    const agentType =
      entry.agent === "FinanceAgent" || entry.agent === "CollectionsAgent"
        ? "finance"
        : entry.agent === "ExecutiveAgent"
          ? "executive"
          : entry.agent === "CommunicationAgent" || entry.agent === "CustomerServiceAgent"
            ? "communications"
            : "operations";

    await aiDb
      .from("estate_ai_action_logs")
      .insert({
        organization_id: entry.organizationId,
        agent_type: agentType,
        risk_level: entry.riskLevel === "LEVEL_2" || entry.riskLevel === "LEVEL_3" ? "high" : entry.riskLevel === "LEVEL_1" ? "medium" : "low",
        trigger_type: "agent_goal",
        recommendation: entry.reasoning,
        action_status: entry.requiresApproval ? "recommended" : "executed",
        requested_by: entry.requestedBy && this.looksLikeUuid(entry.requestedBy) ? entry.requestedBy : null,
      })
      .then(() => undefined)
      .catch(() => undefined);
  }

  public resolveApproval(
    actionId: string,
    decision: "approve" | "reject",
    resolvedBy: string,
    notes?: string
  ): AIActionLedgerEntry | null {
    const item = this.ledger.find((l) => l.id === actionId);
    if (!item) return null;

    if (item.riskLevel === "LEVEL_3") {
      throw new Error("LEVEL_3 actions require explicit direct human software execution and cannot be approved through generic AI triggers.");
    }

    item.approvalStatus = decision === "approve" ? "approved" : "rejected";
    item.approvedBy = resolvedBy;
    item.approvedAt = new Date().toISOString();
    item.executionResult =
      decision === "approve"
        ? `Recommendation approved by ${resolvedBy}. No worker action was dispatched. ${notes || ""}`
        : `Rejected by ${resolvedBy}: Action cancelled. Reason: ${notes || "Manager discretion"}`;

    return { ...item };
  }

  // ── 2. AI Night Watch Autonomous Audit Runner ───────────────────────

  public runNightWatchAudit(organizationId: string = "org_default"): NightWatchReport {
    const now = new Date().toISOString();

    const briefingItems: BriefingItem[] = [
      {
        id: "brief_01",
        category: "lease",
        severity: "warning",
        title: "3 Leases Expiring Within 60 Days (GHS 38,000/mo Roll)",
        evidence: "Units 4B, 7A in Cantonments and 12B in Airport Residential reach lease end by Oct 2026.",
        recommendation: "Issue AI-customized lease renewal packages with 5% index adjustment.",
        suggestedAction: "Dispatch Renewal Packages",
        riskLevel: "LEVEL_1",
        actionPayload: { units: ["4B", "7A", "12B"], adjustmentPct: 5 },
      },
      {
        id: "brief_02",
        category: "finance",
        severity: "critical",
        title: "GHS 24,500 Overdue Across 4 Units (> 14 Days)",
        evidence: "3 residential tenants and 1 retail unit have missed their grace period.",
        recommendation: "Trigger WhatsApp follow-up cadence for low-risk tenants; escalate high-risk accounts to Collections Officer.",
        suggestedAction: "Send Ghana Rent Act Compliant Notices",
        riskLevel: "LEVEL_2",
        actionPayload: { amountGhs: 24500, unitsCount: 4 },
      },
      {
        id: "brief_03",
        category: "maintenance",
        severity: "critical",
        title: "HVAC Breaching SLA in Block C",
        evidence: "Ticket #WO-842 logged 36 hours ago for penthouse AC failure has exceeded 24-hour SLA.",
        recommendation: "Approve Volta Cooling Services quote (GHS 1,450) and auto-dispatch gate pass.",
        suggestedAction: "Approve Quote & Dispatch Gate Pass",
        riskLevel: "LEVEL_2",
        actionPayload: { workOrderId: "WO-842", quoteGhs: 1450, vendor: "Volta Cooling" },
      },
      {
        id: "brief_04",
        category: "utility",
        severity: "warning",
        title: "Water Meter Spike in Block A (Potential Hidden Leak)",
        evidence: "Sub-meter #WM-04 recorded 450% baseline consumption over 48 hours without occupant increase.",
        recommendation: "Dispatch Estate Officer for urgent physical inspection before billing cycle closes.",
        suggestedAction: "Create Urgent Inspection Task",
        riskLevel: "LEVEL_1",
        actionPayload: { meterId: "WM-04", spikePercent: 450 },
      },
      {
        id: "brief_05",
        category: "macro",
        severity: "info",
        title: "Bank of Ghana Reference Rate Updated: ₵15.85 / USD",
        evidence: "USD/GHS moved +0.4% over 24 hours. Foreign currency indexed leases adjusted within +/- 5% collar.",
        recommendation: "No manual action required. Dual-currency invoices automatically synchronized.",
        suggestedAction: "View FX Hedging Matrix",
        riskLevel: "LEVEL_0",
      },
    ];

    const report: NightWatchReport = {
      id: `nw_${Date.now()}`,
      scannedAt: now,
      organizationId,
      leasesScanned: 64,
      receivablesScanned: 142,
      maintenanceScanned: 19,
      riskScore: 24, // Low-Medium operational risk
      criticalAlertsCount: 2,
      pendingApprovalsCount: 2,
      briefingItems,
    };

    this.nightWatchReports.unshift(report);
    return report;
  }

  public getLatestNightWatchReport(organizationId: string = "org_default"): NightWatchReport {
    if (this.nightWatchReports.length === 0) {
      if (isDemoSimulationAllowed()) {
        return this.runNightWatchAudit(organizationId);
      }
      return this.emptyNightWatchReport(organizationId);
    }
    return this.nightWatchReports[0];
  }

  private isDemoOrTest(): boolean {
    return isDemoSimulationAllowed();
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  /** Live portfolio scan using Supabase estate data (falls back to demo in test mode). */
  public async runNightWatchAuditLive(organizationId: string): Promise<NightWatchReport> {
    if (this.isDemoOrTest()) {
      return this.runNightWatchAudit(organizationId);
    }
    if (!this.looksLikeUuid(organizationId)) {
      return this.emptyNightWatchReport(organizationId);
    }

    const now = new Date().toISOString();
    const briefingItems: BriefingItem[] = [];
    let leasesScanned = 0;
    let receivablesScanned = 0;
    let maintenanceScanned = 0;

    const { data: estates } = await aiDb
      .from("managed_estates")
      .select("id, name, currency")
      .eq("organization_id", organizationId);
    const estateRows = (estates || []) as any[];
    const estateIds = estateRows.map((e) => e.id);
    const currency = estateRows[0]?.currency || "GHS";

    if (estateIds.length > 0) {
      const { data: units } = await aiDb.from("estate_units").select("id").in("estate_id", estateIds);
      const unitIds = ((units || []) as any[]).map((u) => u.id);
      leasesScanned = unitIds.length;

      if (unitIds.length > 0) {
        const { data: charges } = await aiDb
          .from("estate_charges")
          .select("amount_minor, status, unit_id")
          .in("unit_id", unitIds);
        const chargeRows = (charges || []) as any[];
        receivablesScanned = chargeRows.length;
        const overdue = chargeRows.filter((c) => c.status === "overdue");
        const overdueTotal = overdue.reduce((sum, c) => sum + (Number(c.amount_minor) || 0), 0);
        if (overdue.length > 0) {
          briefingItems.push({
            id: `brief_overdue_${Date.now()}`,
            category: "finance",
            severity: overdueTotal > 100000 ? "critical" : "warning",
            title: `${overdue.length} overdue charge(s) totalling ${(overdueTotal / 100).toFixed(2)} ${currency}`,
            evidence: "Estate charge ledger shows balances past due date.",
            recommendation: "Open Collections Cases and trigger promise-to-pay follow-up cadence.",
            suggestedAction: "Review arrears queue",
            riskLevel: overdueTotal > 100000 ? "LEVEL_2" : "LEVEL_1",
            actionPayload: { overdueCount: overdue.length, overdueMinor: overdueTotal },
          });
        }
      }

      const { data: issues } = await aiDb
        .from("estate_issues")
        .select("id, title, priority, status, created_at")
        .in("estate_id", estateIds);
      const openIssues = ((issues || []) as any[]).filter(
        (i) => !["resolved", "closed"].includes(i.status)
      );
      maintenanceScanned = openIssues.length;
      const urgentIssues = openIssues.filter((i) => i.priority === "urgent");
      if (urgentIssues.length > 0) {
        briefingItems.push({
          id: `brief_maint_${Date.now()}`,
          category: "maintenance",
          severity: "critical",
          title: `${urgentIssues.length} urgent maintenance issue(s) open`,
          evidence: urgentIssues.map((i) => i.title).slice(0, 3).join("; "),
          recommendation: "Dispatch contractor RFQ or assign in-house technician.",
          suggestedAction: "Open Service Desk queue",
          riskLevel: "LEVEL_2",
          actionPayload: { issueIds: urgentIssues.map((i) => i.id) },
        });
      }

      const { data: openCases } = await aiDb
        .from("estate_collection_cases")
        .select("id, status, escalation_level")
        .in("estate_id", estateIds)
        .not("status", "in", '("resolved","closed")');
      if (((openCases || []) as any[]).length > 0) {
        briefingItems.push({
          id: `brief_coll_${Date.now()}`,
          category: "finance",
          severity: "warning",
          title: `${(openCases as any[]).length} active collection case(s)`,
          evidence: "Cases remain open in estate_collection_cases.",
          recommendation: "Verify promise-to-pay dates and log contact attempts.",
          suggestedAction: "Open Collections Cases",
          riskLevel: "LEVEL_1",
        });
      }
    }

    if (briefingItems.length === 0) {
      briefingItems.push({
        id: `brief_clear_${Date.now()}`,
        category: "macro",
        severity: "info",
        title: "Portfolio scan complete — no critical alerts",
        evidence: `Scanned ${leasesScanned} units and ${receivablesScanned} receivable rows.`,
        recommendation: "Continue scheduled Night Watch monitoring.",
        suggestedAction: "No action required",
        riskLevel: "LEVEL_0",
      });
    }

    const criticalAlertsCount = briefingItems.filter((b) => b.severity === "critical").length;
    const pendingApprovalsCount = briefingItems.filter((b) =>
      ["LEVEL_2", "LEVEL_3"].includes(b.riskLevel)
    ).length;
    const riskScore = Math.min(100, criticalAlertsCount * 25 + pendingApprovalsCount * 10);

    const report: NightWatchReport = {
      id: `nw_${Date.now()}`,
      scannedAt: now,
      organizationId,
      leasesScanned,
      receivablesScanned,
      maintenanceScanned,
      riskScore,
      criticalAlertsCount,
      pendingApprovalsCount,
      briefingItems,
    };

    for (const item of briefingItems.filter((b) => b.severity !== "info")) {
      void aiDb
        .from("estate_ai_action_logs")
        .insert({
          organization_id: organizationId,
          agent_type: item.category === "maintenance" ? "operations" : "finance",
          risk_level: item.severity === "critical" ? "high" : "medium",
          trigger_type: "night_watch",
          recommendation: `${item.title}. ${item.recommendation}`,
          action_status: "recommended",
        })
        .then(() => undefined)
        .catch(() => undefined);
    }

    this.nightWatchReports.unshift(report);
    return report;
  }

  public async getLedgerEntriesLive(organizationId: string): Promise<AIActionLedgerEntry[]> {
    if (this.isDemoOrTest()) {
      if (!this.looksLikeUuid(organizationId)) {
        return this.getLedgerEntries(organizationId);
      }
    } else if (!this.looksLikeUuid(organizationId)) {
      return [];
    }

    const { data, error } = await aiDb
      .from("estate_ai_action_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data?.length) {
      if (this.isDemoOrTest()) {
        return this.getLedgerEntries(organizationId);
      }
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      agent: row.agent_type === "finance" ? "FinanceAgent" : "PropertyManagementAgent",
      organizationId: row.organization_id,
      triggeredBy: row.trigger_type || "system",
      targetEntity: row.target_type ? `${row.target_type}:${row.target_id || "unknown"}` : "portfolio",
      actionType: row.trigger_type || "ai.recommendation",
      reasoning: row.recommendation,
      riskLevel:
        row.risk_level === "high"
          ? "LEVEL_2"
          : row.risk_level === "medium"
            ? "LEVEL_1"
            : "LEVEL_0",
      approvalStatus:
        row.action_status === "recommended"
          ? "pending_approval"
          : row.action_status === "approved"
            ? "approved"
            : row.action_status === "rejected"
              ? "rejected"
              : "executed",
      createdAt: row.created_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.decided_at || undefined,
    }));
  }

  // ── 3. Contractor Matching & RFQ Matrix Engine ───────────────────────

  public matchContractors(
    trade: string,
    location: string = "Accra",
    maxResults: number = 3
  ): ContractorMatchResult[] {
    if (!isDemoSimulationAllowed()) return [];

    const mockContractors: ContractorMatchResult[] = [
      {
        contractorId: "cnt_volta_01",
        name: "Emmanuel Addo",
        company: "Volta Power & Cooling Solutions",
        trade: "HVAC / Generator Electrical",
        rating: 4.9,
        distanceKm: 2.4,
        hourlyRateGhs: 120,
        slaResponseScore: 97,
        historicalCompletionRate: 99,
        isRecommended: true,
        matchScore: 98,
      },
      {
        contractorId: "cnt_accra_plumb",
        name: "Kofi Owusu",
        company: "Apex Precision Plumbing Ltd",
        trade: "Plumbing & Borehole Hydraulics",
        rating: 4.8,
        distanceKm: 3.8,
        hourlyRateGhs: 95,
        slaResponseScore: 94,
        historicalCompletionRate: 96,
        isRecommended: true,
        matchScore: 94,
      },
      {
        contractorId: "cnt_goldcoast_gen",
        name: "Samuel Mensah",
        company: "Gold Coast Electro-Mechanical",
        trade: "HVAC / Electrical / Generator",
        rating: 4.6,
        distanceKm: 5.1,
        hourlyRateGhs: 110,
        slaResponseScore: 89,
        historicalCompletionRate: 92,
        isRecommended: false,
        matchScore: 88,
      },
      {
        contractorId: "cnt_quickfix_mason",
        name: "Isaac Tetteh",
        company: "Tetteh & Sons Masonry & Roofing",
        trade: "Masonry & Structural Waterproofing",
        rating: 4.7,
        distanceKm: 4.2,
        hourlyRateGhs: 80,
        slaResponseScore: 91,
        historicalCompletionRate: 95,
        isRecommended: true,
        matchScore: 92,
      },
    ];

    return mockContractors
      .filter((c) => c.trade.toLowerCase().includes(trade.toLowerCase()) || trade === "all")
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  }

  public generateQuoteComparisonMatrix(
    workOrderId: string,
    trade: string = "HVAC"
  ): QuoteComparisonMatrix {
    const contractors = this.matchContractors(trade, "Accra", 3);

    const quotes = contractors.map((c, index) => {
      const baseCost = trade.toLowerCase().includes("hvac") ? 1400 : 750;
      const costVariance = index === 0 ? 1450 : index === 1 ? 1680 : 1380;
      return {
        quoteId: `qt_${workOrderId}_${c.contractorId}`,
        contractorId: c.contractorId,
        contractorName: `${c.company} (${c.name})`,
        estimatedCostGhs: costVariance,
        estimatedDurationHours: index === 0 ? 4 : index === 1 ? 6 : 8,
        earliestStartTime: index === 0 ? "Today at 2:00 PM" : "Tomorrow at 9:00 AM",
        warrantyMonths: index === 0 ? 6 : index === 1 ? 12 : 3,
        score: c.matchScore,
        isBestValue: index === 0,
        isFastest: index === 0,
      };
    });

    const bestQuote = quotes[0];
    const riskLevel: RiskLevel = bestQuote && bestQuote.estimatedCostGhs > 1000 ? "LEVEL_2" : "LEVEL_1";

    return {
      workOrderId,
      trade,
      quotes,
      recommendedQuoteId: bestQuote?.quoteId || "",
      recommendationReason: `${bestQuote?.contractorName} has highest SLA response (97%) with immediate 2:00 PM arrival and 6-month warranty on replacement parts.`,
      riskLevel,
    };
  }

  // ── 4. Domain Agent Direct Execution Interface ───────────────────────

  public async executeAgentGoal(
    agent: AgentType,
    goalPrompt: string,
    organizationId: string = "org_default"
  ): Promise<{
    agent: AgentType;
    summary: string;
    actionTaken: string;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    data: any;
  }> {
    if (this.looksLikeUuid(organizationId) && !this.isDemoOrTest()) {
      if (agent !== "ExecutiveAgent") {
        throw new Error(`${agent} execution is not connected to a production worker. Use the live operational module for this task.`);
      }
      const { aiToolAllowlistService } = await import("./ai-tool-allowlist.service");
      await aiToolAllowlistService.assertToolAllowed(organizationId, `${agent.toLowerCase()}_goal`, agent);

      const report = await this.runNightWatchAuditLive(organizationId);
      return {
        agent,
        summary: `Scanned ${report.leasesScanned} units, ${report.receivablesScanned} receivable rows, and ${report.maintenanceScanned} open maintenance items.`,
        actionTaken: "Analysis completed. No operational action was executed.",
        riskLevel: report.criticalAlertsCount > 0 ? "LEVEL_2" : report.pendingApprovalsCount > 0 ? "LEVEL_1" : "LEVEL_0",
        requiresApproval: false,
        data: report,
      };
    }

    if (!this.isDemoOrTest()) {
      throw new Error(
        "Resolve a valid organization before running agents. Wait for the workspace to finish loading or refresh the page."
      );
    }

    let summary = "";
    let actionTaken = "";
    let riskLevel: RiskLevel = "LEVEL_1";
    let requiresApproval = false;
    let data: any = {};

    switch (agent) {
      case "PropertyManagementAgent":
        summary = "Scanned all managed units across organization estates. Detected 2 upcoming vacancies and 1 unassigned move-out inspection.";
        actionTaken = "Generated turnover checklist and queued inspection for Estate Officer.";
        riskLevel = "LEVEL_1";
        data = { vacancies: 2, inspectionScheduled: "Unit 14C" };
        break;

      case "FinanceAgent":
        summary = "Audited recent bank & MoMo settlement batches. Reconciled 48 charges with zero variance.";
        actionTaken = "All ledger balances balanced against Pay Angels processor tokens.";
        riskLevel = "LEVEL_0";
        data = { reconciledBatches: 3, totalProcessedGhs: 142800 };
        break;

      case "CollectionsAgent":
        summary = "Prioritized 8 overdue accounts based on tenant payment score & contract expiry.";
        actionTaken = "Drafted 5 gentle reminders and prepared 3 formal notices for manager sign-off.";
        riskLevel = "LEVEL_2";
        requiresApproval = true;
        data = { noticesPrepared: 3, remindersSent: 5 };
        break;

      case "LeasingAgent":
        summary = "Audited 4 draft tenancy agreements against Ghana Rent Act 1963 (Act 220).";
        actionTaken = "All agreements adhere to the 6-month advance rent cap and structural warranty clauses.";
        riskLevel = "LEVEL_1";
        data = { leasesAudited: 4, complianceGrade: "A+" };
        break;

      case "MaintenanceAgent":
        summary = "Classified 3 new maintenance requests: 2 plumbing, 1 electrical generator issue.";
        actionTaken = "Assigned electrical job to in-house technician and created RFQs for plumbing.";
        riskLevel = "LEVEL_1";
        data = { assignedJobs: 1, rfqsDispatched: 2 };
        break;

      case "ContractorAgent":
        const matrix = this.generateQuoteComparisonMatrix("WO-URGENT-89", "HVAC");
        summary = `Compared 3 contractor quotes for HVAC overhaul. Selected ${matrix.quotes[0]?.contractorName} at GHS ${matrix.quotes[0]?.estimatedCostGhs}.`;
        actionTaken = "Pushed recommendation to Level 2 Approval Queue for manager sign-off.";
        riskLevel = matrix.riskLevel;
        requiresApproval = matrix.riskLevel === "LEVEL_2";
        data = matrix;
        break;

      case "UtilityAgent":
        summary = "Audited 124 sub-meter readings across estate. Validated consumption vs ECG/GWCL tariff tiers.";
        actionTaken = "Generated dual-currency utility charges for monthly billing batch.";
        riskLevel = "LEVEL_1";
        data = { metersValidated: 124, anomaliesDetected: 1 };
        break;

      case "AssetAgent": {
        let dueSoon = 0;
        if (this.looksLikeUuid(organizationId)) {
          const { data: estates } = await aiDb.from("managed_estates").select("id").eq("organization_id", organizationId);
          const estateIds = ((estates || []) as any[]).map((e) => e.id);
          if (estateIds.length > 0) {
            const horizon = new Date();
            horizon.setDate(horizon.getDate() + 30);
            const { data: assets } = await aiDb
              .from("estate_assets")
              .select("id, name, next_service_due, condition")
              .in("estate_id", estateIds);
            const due = ((assets || []) as any[]).filter(
              (a) => a.next_service_due && a.next_service_due <= horizon.toISOString().slice(0, 10)
            );
            dueSoon = due.length;
            data = { assetsScanned: (assets || []).length, dueSoon, sample: due.slice(0, 5).map((a: any) => a.name) };
          }
        }
        summary = `Scanned estate asset registry. ${dueSoon} asset(s) due for service within 30 days.`;
        actionTaken = dueSoon > 0 ? "Queued preventive maintenance calendar events for due assets." : "No overdue asset services.";
        riskLevel = dueSoon > 0 ? "LEVEL_1" : "LEVEL_0";
        break;
      }

      case "ExecutiveAgent":
        const nightWatch = this.runNightWatchAudit(organizationId);
        summary = `Synthesized executive operations briefing. Overall operational risk score: ${nightWatch.riskScore}/100.`;
        actionTaken = "Identified 2 critical action items for management review.";
        riskLevel = "LEVEL_0";
        data = nightWatch;
        break;

      default:
        summary = `Agent ${agent} analyzed goal: "${goalPrompt}".`;
        actionTaken = "Operation executed within authorized policy constraints.";
        riskLevel = "LEVEL_1";
        data = { timestamp: new Date().toISOString() };
        break;
    }

    this.recordAction({
      agent,
      organizationId,
      triggeredBy: `user_prompt:${goalPrompt.substring(0, 30)}`,
      targetEntity: `agent_goal:${agent}`,
      actionType: `${agent.toLowerCase()}.executed`,
      reasoning: summary,
      riskLevel,
      approvalStatus: requiresApproval ? "pending_approval" : "auto_approved",
      executionResult: actionTaken,
      metadata: data,
    });

    await this.persistAgentAction({
      organizationId,
      agent,
      riskLevel,
      reasoning: `${summary} ${actionTaken}`.trim(),
      requiresApproval,
    });

    return {
      agent,
      summary,
      actionTaken,
      riskLevel,
      requiresApproval,
      data,
    };
  }
}

export const agenticAIOrchestratorService = new AgenticAIOrchestratorService();
