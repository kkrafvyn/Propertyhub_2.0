import { supabase } from "./supabase";
import { requestMomoPayment } from "./momo-payment.service";

const db = supabase as any;

export type PortfolioLedgerLine = {
  accountCode: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  debitMinor: number;
  creditMinor: number;
};

export type PortfolioFinancialReport = {
  revenueMinor: number;
  expenseMinor: number;
  netIncomeMinor: number;
  cashInflowsMinor: number;
  cashOutflowsMinor: number;
  netCashFlowMinor: number;
  lines: PortfolioLedgerLine[];
};

export type BudgetVariance = {
  category: string;
  period: string;
  budgetMinor: number;
  actualMinor: number;
  varianceMinor: number;
  variancePercent: number | null;
  currency: string;
};

export function aggregatePortfolioLedger(lines: PortfolioLedgerLine[]): PortfolioFinancialReport {
  const revenueMinor = lines
    .filter((line) => line.accountType === "REVENUE")
    .reduce((total, line) => total + line.creditMinor - line.debitMinor, 0);
  const expenseMinor = lines
    .filter((line) => line.accountType === "EXPENSE")
    .reduce((total, line) => total + line.debitMinor - line.creditMinor, 0);
  const cashLines = lines.filter((line) => line.accountType === "ASSET" && /^(1000|1100)$/.test(line.accountCode));
  const cashInflowsMinor = cashLines
    .reduce((total, line) => total + line.debitMinor, 0);
  const cashOutflowsMinor = cashLines
    .reduce((total, line) => total + line.creditMinor, 0);

  return {
    revenueMinor,
    expenseMinor,
    netIncomeMinor: revenueMinor - expenseMinor,
    cashInflowsMinor,
    cashOutflowsMinor,
    netCashFlowMinor: cashInflowsMinor - cashOutflowsMinor,
    lines,
  };
}

export function mapBudgetVariance(row: {
  category: string;
  period: string;
  budget_minor: number;
  actual_minor?: number | null;
  currency: string;
}): BudgetVariance {
  const budgetMinor = Number(row.budget_minor) || 0;
  const actualMinor = Number(row.actual_minor) || 0;
  return {
    category: row.category,
    period: row.period,
    budgetMinor,
    actualMinor,
    varianceMinor: budgetMinor - actualMinor,
    variancePercent: budgetMinor === 0 ? null : ((budgetMinor - actualMinor) / budgetMinor) * 100,
    currency: row.currency,
  };
}

export function validateOwnerPayoutAmount(amountGhs: number) {
  return amountGhs > 0 ? null : "Payout amount must be greater than zero";
}

export function mapPayoutProviderStatus(status: string | undefined) {
  if (status === "SUCCESSFUL") return "paid" as const;
  if (status === "PENDING") return "submitted" as const;
  return "failed" as const;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const estateReportingService = {
  async incomeStatement(estateId: string, startDate: string, endDate: string) {
    const { data, error } = await db.rpc("estate_income_statement", { p_estate_id: estateId, p_start_date: startDate, p_end_date: endDate });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },
  async createOwnerStatement(input: { estateId: string; ownerUserId: string; periodStart: string; periodEnd: string }) {
    const { data, error } = await db.rpc("create_owner_statement_run", { p_estate_id: input.estateId, p_owner_user_id: input.ownerUserId, p_period_start: input.periodStart, p_period_end: input.periodEnd });
    if (error) throw error;
    return data;
  },
  async queueOwnerStatementDelivery(statementRunId: string, channel: "in_app" | "email" | "sms" | "whatsapp") {
    const { data, error } = await db.from("estate_owner_statement_deliveries").insert({ statement_run_id: statementRunId, channel }).select("*").single();
    if (error) throw error;
    return data;
  },

  async listOwnerStatementDeliveries(statementRunId: string) {
    const { data, error } = await db
      .from("estate_owner_statement_deliveries")
      .select("*")
      .eq("statement_run_id", statementRunId)
      .order("queued_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listQueuedStatementDeliveries(limit = 25) {
    const { data, error } = await db
      .from("estate_owner_statement_deliveries")
      .select("*, statement:estate_owner_statement_runs(*, estate:managed_estates(name))")
      .eq("status", "queued")
      .order("queued_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async markStatementDelivery(
    deliveryId: string,
    status: "sent" | "delivered" | "failed",
    options?: { providerReference?: string; errorMessage?: string }
  ) {
    const { data, error } = await db
      .from("estate_owner_statement_deliveries")
      .update({
        status,
        provider_reference: options?.providerReference || null,
        error_message: options?.errorMessage || null,
        delivered_at: status === "delivered" ? new Date().toISOString() : null,
      })
      .eq("id", deliveryId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async processInAppStatementDelivery(deliveryId: string) {
    const { data: delivery, error } = await db
      .from("estate_owner_statement_deliveries")
      .select("*, statement:estate_owner_statement_runs(*, estate:managed_estates(name))")
      .eq("id", deliveryId)
      .single();
    if (error) throw error;
    if (!delivery || delivery.channel !== "in_app") {
      throw new Error("Delivery is not an in-app channel");
    }

    const statement = delivery.statement;
    if (!statement?.owner_user_id) throw new Error("Owner not found for statement");

    const estateName = statement.estate?.name || "Property";
    const amount = ((Number(statement.net_distributable_minor) || 0) / 100).toFixed(2);
    const { communicationService } = await import("./communication.service");

    await communicationService.createInAppNotification({
      userId: statement.owner_user_id,
      notificationType: "owner_statement",
      subject: `Owner statement ready — ${estateName}`,
      content: `Your statement for ${statement.period_start} to ${statement.period_end} is ready. Net distributable: ${statement.currency || "GHS"} ${amount}.`,
      actionUrl: "/app/documents",
      metadata: { statementRunId: statement.id, deliveryId },
      respectPreferences: false,
    });

    await this.markStatementDelivery(deliveryId, "delivered", {
      providerReference: `in_app:${deliveryId.slice(0, 8)}`,
    });

    await db
      .from("estate_owner_statement_runs")
      .update({ status: "delivered" })
      .eq("id", statement.id);

    return delivery;
  },

  async exportOwnerStatementCsv(statementRunId: string) {
    const { data, error } = await db
      .from("estate_owner_statement_runs")
      .select("*, estate:managed_estates(name, currency)")
      .eq("id", statementRunId)
      .single();
    if (error) throw error;
    const run = data as any;
    const rows = [
      ["Property", "Period start", "Period end", "Collections", "Expenses", "Net distributable", "Currency", "Status"],
      [
        run.estate?.name || run.estate_id,
        run.period_start,
        run.period_end,
        run.gross_collections_minor,
        run.expense_minor,
        run.net_distributable_minor,
        run.currency || run.estate?.currency || "GHS",
        run.status,
      ],
    ];
    return rows.map((row) => row.map((value) => csvCell(value)).join(",")).join("\n");
  },

  async getUnitOwnerShares(unitIds: string[]) {
    if (unitIds.length === 0) return [];
    const { data, error } = await db.from("estate_unit_owner_shares").select("*").in("unit_id", unitIds).is("effective_to", null);
    if (error) throw error;
    return data || [];
  },

  async requestDistributionApproval(input: { statementRunId: string; amountMinor: number; requestedBy: string }) {
    if (input.amountMinor < 0) throw new Error("Distribution amount cannot be negative");
    const { data, error } = await db.from("estate_distribution_approvals").insert({
      statement_run_id: input.statementRunId,
      requested_amount_minor: input.amountMinor,
      requested_by: input.requestedBy,
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async listDistributionApprovals(organizationId: string, status?: "pending" | "approved" | "rejected" | "paid") {
    const { data: estates, error: estateError } = await db.from("managed_estates").select("id").eq("organization_id", organizationId);
    if (estateError) throw estateError;
    const estateIds = (estates || []).map((estate: { id: string }) => estate.id);
    if (estateIds.length === 0) return [];
    let query = db.from("estate_distribution_approvals").select("*, statement:estate_owner_statement_runs(*)").in("statement.estate_id", estateIds).order("requested_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async reviewDistributionApproval(approvalId: string, decision: "approved" | "rejected", reviewedBy: string, note?: string) {
    const { data, error } = await db.from("estate_distribution_approvals").update({
      status: decision,
      reviewed_by: reviewedBy,
      review_note: note?.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", approvalId).eq("status", "pending").select("*").single();
    if (error) throw error;
    return data;
  },

  async executeDistributionPayout(input: {
    approvalId: string;
    amountGhs: number;
    destinationPhone: string;
    note?: string;
  }) {
    const amountError = validateOwnerPayoutAmount(input.amountGhs);
    if (amountError) throw new Error(amountError);
    const { data: approval, error: approvalError } = await db
      .from("estate_distribution_approvals")
      .select(`
        id,
        status,
        requested_amount_minor,
        statement:estate_owner_statement_runs(
          estate:managed_estates(organization_id)
        )
      `)
      .eq("id", input.approvalId)
      .eq("status", "approved")
      .single();
    if (approvalError) throw approvalError;
    const organizationId = (
      approval.statement as { estate?: { organization_id?: string } | null } | null
    )?.estate?.organization_id;
    if (!organizationId) throw new Error("Distribution approval is missing organization context");
    const { data: reserved, error: reserveError } = await db.from("estate_distribution_approvals").update({ status: "processing" }).eq("id", approval.id).eq("status", "approved").select("id").maybeSingle();
    if (reserveError) throw reserveError;
    if (!reserved) throw new Error("Distribution is already being processed");

    let providerResult;
    try {
      providerResult = await requestMomoPayment({
        type: "disbursement",
        amount: input.amountGhs,
        phone: input.destinationPhone,
        organizationId,
        approvalId: input.approvalId,
        note: input.note || `Owner distribution ${input.approvalId.slice(0, 8)}`,
      });
    } catch (error) {
      await db.from("estate_distribution_approvals").update({ status: "failed", failure_reason: error instanceof Error ? error.message : "Provider request failed" }).eq("id", input.approvalId).eq("status", "processing");
      throw error;
    }
    const nextStatus = mapPayoutProviderStatus(providerResult.status);

    const { data, error } = await db.from("estate_distribution_approvals").update({
      status: nextStatus,
      payout_reference: providerResult.referenceId,
      provider_status: providerResult.status,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
      failure_reason: nextStatus === "failed" ? providerResult.message || "Provider rejected the disbursement" : null,
    }).eq("id", input.approvalId).eq("status", "processing").select("*").single();
    if (error) throw error;
    return data;
  },

  async getOrganizationIncomeStatement(organizationId: string, startDate: string, endDate: string) {
    const report = await this.portfolioFinancialReport(organizationId, startDate, endDate);
    return {
      revenue_minor: report.revenueMinor,
      expense_minor: report.expenseMinor,
      net_income_minor: report.netIncomeMinor,
      cash_inflows_minor: report.cashInflowsMinor,
      cash_outflows_minor: report.cashOutflowsMinor,
      net_cash_flow_minor: report.netCashFlowMinor,
    };
  },

  async portfolioFinancialReport(organizationId: string, startDate: string, endDate: string) {
    const { data, error } = await db
      .from("journal_entries")
      .select("entry_date, je_lines(debit_amount_minor, credit_amount_minor, coa_accounts(account_code, account_name, account_type))")
      .eq("organization_id", organizationId)
      .eq("status", "POSTED")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate)
      .order("entry_date", { ascending: true });
    if (error) throw error;

    const lines: PortfolioLedgerLine[] = (data || []).flatMap((entry: any) =>
      (entry.je_lines || []).flatMap((line: any) => {
        const account = line.coa_accounts;
        if (!account || !["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(account.account_type)) return [];
        return [{
          accountCode: account.account_code,
          accountName: account.account_name,
          accountType: account.account_type,
          debitMinor: Number(line.debit_amount_minor) || 0,
          creditMinor: Number(line.credit_amount_minor) || 0,
        }];
      })
    );
    return aggregatePortfolioLedger(lines);
  },

  async budgetVariance(estateIds: string[], period?: string) {
    if (estateIds.length === 0) return [];
    let query = db.from("estate_budgets").select("category, period, budget_minor, actual_minor, currency").in("estate_id", estateIds).order("period", { ascending: false });
    if (period) query = query.eq("period", period);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapBudgetVariance);
  },

  async organizationBudgetVariance(organizationId: string, period?: string) {
    const { data: estates, error: estateError } = await db
      .from("managed_estates")
      .select("id")
      .eq("organization_id", organizationId);
    if (estateError) throw estateError;
    return this.budgetVariance((estates || []).map((estate: { id: string }) => estate.id), period);
  },

  async exportPortfolioAuditPack(organizationId: string, startDate: string, endDate: string) {
    const report = await this.portfolioFinancialReport(organizationId, startDate, endDate);
    const rows = [
      ["Account code", "Account name", "Account type", "Debit (minor)", "Credit (minor)"],
      ...report.lines.map((line) => [line.accountCode, line.accountName, line.accountType, line.debitMinor, line.creditMinor]),
    ];
    return rows.map((row) => row.map((value) => csvCell(value)).join(",")).join("\n");
  },
};
