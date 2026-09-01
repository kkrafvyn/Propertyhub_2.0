import { supabase } from './supabase';

type COAAccount = {
  id: string;
  organization_id: string;
  account_code: string;
  account_name: string;
  account_type?: string | null;
  balance_type?: string | null;
  parent_account_id?: string | null;
  is_active?: boolean;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type JournalEntry = {
  id: string;
  organization_id: string;
  entry_date: string;
  description: string;
  reference_number?: string | null;
  status?: string | null;
  created_by?: string | null;
  posted_by?: string | null;
  posted_at?: string | null;
  reversed_entry_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type JELine = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount_minor?: number | null;
  credit_amount_minor?: number | null;
  line_description?: string | null;
  line_number?: number | null;
  created_at?: string;
};

type GLPostingRule = {
  id: string;
  organization_id: string;
  rule_name?: string | null;
  source_type?: string | null;
  account_id?: string | null;
  transaction_type?: string | null;
  created_at?: string;
};

type AccountingPeriod = {
  id: string;
  organization_id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  fiscal_year?: number | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

const db = supabase.from as any;

export const isClosedPeriodError = (error: unknown) => {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: string }).message || '')
      : '';
  return message.toLowerCase().includes('closed accounting period');
};

export class GeneralLedgerService {
  /**
   * Accounting periods
   */

  async getAccountingPeriods(orgId: string) {
    const { data, error } = await db('accounting_periods')
      .select('*')
      .eq('organization_id', orgId)
      .order('period_start', { ascending: false });

    if (error) throw error;
    return data as AccountingPeriod[];
  }

  async createAccountingPeriod(
    orgId: string,
    payload: {
      periodName: string;
      periodStart: string;
      periodEnd: string;
      fiscalYear?: number;
      notes?: string;
      createdBy: string;
    }
  ) {
    const { data, error } = await supabase.rpc('create_accounting_period', {
      p_organization_id: orgId,
      p_period_name: payload.periodName,
      p_period_start: payload.periodStart,
      p_period_end: payload.periodEnd,
      p_fiscal_year: payload.fiscalYear ?? null,
      p_notes: payload.notes ?? null,
      p_created_by: payload.createdBy
    });

    if (error) throw error;
    return data as AccountingPeriod;
  }

  async closeAccountingPeriod(periodId: string, closedBy: string) {
    const { data, error } = await supabase.rpc('close_accounting_period', {
      p_period_id: periodId,
      p_closed_by: closedBy
    });

    if (error) throw error;
    return data as AccountingPeriod;
  }

  async assertEntryDateCanPost(orgId: string, entryDate: string) {
    const { error } = await supabase.rpc('assert_accounting_period_open', {
      p_organization_id: orgId,
      p_entry_date: entryDate
    });

    if (error) throw error;
  }

  /**
   * Chart of Accounts Operations
   */
  
  async getChartOfAccounts(orgId: string, accountType?: string) {
    try {
      let query = db('coa_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('account_code', { ascending: true });
      
      if (accountType) {
        query = query.eq('account_type', accountType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as COAAccount[];
    } catch (error) {
      console.error('Error fetching COA:', error);
      throw error;
    }
  }

  async getAccountByCode(orgId: string, code: string) {
    const { data, error } = await db('coa_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('account_code', code)
      .single();
    
    if (error) throw error;
    return data as COAAccount;
  }

  async createAccount(orgId: string, account: Omit<COAAccount, 'id' | 'created_at' | 'updated_at'> & { created_by: string }) {
    if (!orgId || !account.account_code?.trim() || !account.account_name?.trim()) {
      throw new Error('Organization, account code, and account name are required');
    }
    if (!['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'INCOME'].includes(String(account.account_type || '').toUpperCase())) {
      throw new Error('Invalid account type');
    }
    if (!['DEBIT', 'CREDIT'].includes(String(account.balance_type || '').toUpperCase())) {
      throw new Error('Invalid account balance type');
    }

    const { data, error } = await db('coa_accounts')
      .insert([{
        organization_id: orgId,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        balance_type: account.balance_type,
        parent_account_id: account.parent_account_id,
        is_active: true,
        description: account.description,
        created_by: account.created_by
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as COAAccount;
  }

  async updateAccount(accountId: string, updates: Partial<COAAccount>) {
    if (!accountId) throw new Error('Account ID is required');
    const safeUpdates: Partial<Pick<COAAccount, 'account_name' | 'description'>> = {};
    if (updates.account_name !== undefined) {
      if (!updates.account_name.trim()) throw new Error('Account name cannot be empty');
      safeUpdates.account_name = updates.account_name.trim();
    }
    if (updates.description !== undefined) safeUpdates.description = updates.description?.trim() || null;
    if (Object.keys(safeUpdates).length === 0) throw new Error('No editable account fields supplied');

    const { data, error } = await db('coa_accounts')
      .update(safeUpdates)
      .eq('id', accountId)
      .select()
      .single();
    
    if (error) throw error;
    return data as COAAccount;
  }

  /**
   * Journal Entry Operations
   */

  async createJournalEntry(
    orgId: string,
    entry: {
      entryDate: string;
      description: string;
      referenceNumber?: string;
      lines: Array<{
        accountId: string;
        debitAmount?: number; // in minor units
        creditAmount?: number;
        description?: string;
      }>;
      createdBy: string;
    }
  ) {
    await this.assertEntryDateCanPost(orgId, entry.entryDate);

    if (!entry.description?.trim() || entry.lines.length < 2) {
      throw new Error('A journal description and at least two lines are required');
    }

    for (const line of entry.lines) {
      const debit = Number(line.debitAmount || 0);
      const credit = Number(line.creditAmount || 0);
      if (!line.accountId || debit < 0 || credit < 0 || (debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error('Each journal line must contain exactly one positive debit or credit amount');
      }
    }

    const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
    
    if (totalDebit !== totalCredit) {
      throw new Error(`Unbalanced entry: Debits (${totalDebit}) ≠ Credits (${totalCredit})`);
    }

    const { data: jeData, error: jeError } = await db('journal_entries')
      .insert([{
        organization_id: orgId,
        entry_date: entry.entryDate,
        description: entry.description,
        reference_number: entry.referenceNumber,
        status: 'DRAFT',
        created_by: entry.createdBy
      }])
      .select()
      .single();
    
    if (jeError) throw jeError;
    const je = jeData as JournalEntry;

    const lines = entry.lines.map((line, index) => ({
      journal_entry_id: je.id,
      account_id: line.accountId,
      debit_amount_minor: line.debitAmount || null,
      credit_amount_minor: line.creditAmount || null,
      line_description: line.description,
      line_number: index + 1
    }));

    const { error: linesError } = await db('je_lines')
      .insert(lines);
    
    if (linesError) throw linesError;
    return je;
  }

  async getJournalEntries(orgId: string, filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
  }) {
    let query = db('journal_entries')
      .select('*')
      .eq('organization_id', orgId);
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('entry_date', filters.startDate);
    if (filters?.endDate) query = query.lte('entry_date', filters.endDate);
    
    const { data, error } = await query.order('entry_date', { ascending: false });
    if (error) throw error;
    return data as JournalEntry[];
  }

  async getJournalEntryDetail(jeId: string) {
    const { data: jeData, error: jeError } = await db('journal_entries')
      .select('*')
      .eq('id', jeId)
      .single();
    
    if (jeError) throw jeError;

    const { data: linesData, error: linesError } = await db('je_lines')
      .select('*, coa_accounts(account_code, account_name)')
      .eq('journal_entry_id', jeId)
      .order('line_number', { ascending: true });
    
    if (linesError) throw linesError;

    return {
      entry: jeData as JournalEntry,
      lines: linesData as (JELine & { coa_accounts: any })[]
    };
  }

  async postJournalEntry(jeId: string, userId: string) {
    void userId; // The server derives the actor from the authenticated session.
    const { data, error } = await supabase.rpc('post_journal_entry', { p_journal_entry_id: jeId });
    
    if (error) throw error;
    return data as JournalEntry;
  }

  async reverseJournalEntry(jeId: string, userId: string) {
    void userId; // The server derives the actor from the authenticated session.
    const { data, error } = await supabase.rpc('reverse_journal_entry', { p_journal_entry_id: jeId });
    if (error) throw error;
    return data as JournalEntry;
  }

  /**
   * Trial Balance
   */

  async getTrialBalance(orgId: string, asOfDate?: string) {
    const balanceDate = asOfDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc(
      'calculate_trial_balance',
      {
        p_org_id: orgId,
        p_as_of_date: balanceDate
      }
    );
    
    if (error) throw error;
    return (data || []).map((row: any) => ({
      account_id: row.account_id,
      account_code: row.account_code,
      account_name: row.account_name,
      account_type: row.account_type,
      debit_balance_minor: Number(row.debit_minor) || 0,
      credit_balance_minor: Number(row.credit_minor) || 0,
      net_balance_minor: Number(row.net_balance_minor) || 0,
    }));
  }

  async getBalanceSheet(orgId: string, asOfDate?: string) {
    const rows = await this.getTrialBalance(orgId, asOfDate);
    const assets = rows.filter((r) => r.account_type === 'ASSET');
    const liabilities = rows.filter((r) => r.account_type === 'LIABILITY');
    const equity = rows.filter((r) => r.account_type === 'EQUITY');

    const sumNet = (items: typeof rows) =>
      items.reduce((total, row) => total + (row.net_balance_minor || 0), 0);

    const totalAssets = sumNet(assets);
    const totalLiabilities = sumNet(liabilities);
    const totalEquity = sumNet(equity);

    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      assets,
      liabilities,
      equity,
      totalAssetsMinor: totalAssets,
      totalLiabilitiesMinor: totalLiabilities,
      totalEquityMinor: totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 1,
    };
  }

  async getIncomeStatement(orgId: string, asOfDate?: string) {
    const rows = await this.getTrialBalance(orgId, asOfDate);
    const revenue = rows.filter((r) => r.account_type === 'REVENUE');
    const expense = rows.filter((r) => r.account_type === 'EXPENSE');
    const sumNet = (items: typeof rows) =>
      items.reduce((total, row) => total + (row.net_balance_minor || 0), 0);
    const revenueMinor = sumNet(revenue);
    const expenseMinor = sumNet(expense);
    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      revenue,
      expense,
      revenueMinor,
      expenseMinor,
      netIncomeMinor: revenueMinor - expenseMinor,
    };
  }

  async getCashFlow(orgId: string, asOfDate?: string) {
    const rows = await this.getTrialBalance(orgId, asOfDate);
    const cash = rows.filter(
      (r) => r.account_type === 'ASSET' && /cash|bank|1000|1100/i.test(`${r.account_code} ${r.account_name}`)
    );
    const inflowsMinor = cash.reduce((sum, row) => sum + (row.debit_balance_minor || 0), 0);
    const outflowsMinor = cash.reduce((sum, row) => sum + (row.credit_balance_minor || 0), 0);
    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      cash,
      cashInflowsMinor: inflowsMinor,
      cashOutflowsMinor: outflowsMinor,
      netCashFlowMinor: inflowsMinor - outflowsMinor,
    };
  }

  /**
   * Account Balance
   */

  async getAccountBalance(orgId: string, accountId: string, asOfDate?: string) {
    const { data: account } = await supabase
      .from('coa_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', orgId)
      .single();
    
    if (!account) throw new Error('Account not found');

    const balanceDate = asOfDate || new Date().toISOString().split('T')[0];

    // Get all posted journal entries up to date with lines for this account
    const { data: lines, error } = await supabase
      .from('je_lines')
      .select('debit_amount_minor, credit_amount_minor')
      .eq('account_id', accountId)
      .eq('journal_entry_id', (
        supabase
          .from('journal_entries')
          .select('id')
          .eq('organization_id', orgId)
          .eq('status', 'POSTED')
          .lte('entry_date', balanceDate)
      ) as any);
    
    if (error) throw error;

    const balance = (lines as any[]).reduce((sum, line) => {
      const debit = line.debit_amount_minor || 0;
      const credit = line.credit_amount_minor || 0;
      
      if (account.balance_type === 'DEBIT') {
        return sum + debit - credit;
      } else {
        return sum + credit - debit;
      }
    }, 0);

    return balance;
  }

  /**
   * GL Posting Rules
   */

  async getGLPostingRules(orgId: string) {
    const { data, error } = await supabase
      .from('gl_posting_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data as GLPostingRule[];
  }

  async createGLPostingRule(
    orgId: string,
    rule: {
      eventType: string;
      debitAccountId: string;
      creditAccountId: string;
      descriptionTemplate: string;
      createdBy: string;
    }
  ) {
    const { data, error } = await supabase
      .from('gl_posting_rules')
      .insert([{
        organization_id: orgId,
        event_type: rule.eventType,
        debit_account_id: rule.debitAccountId,
        credit_account_id: rule.creditAccountId,
        description_template: rule.descriptionTemplate,
        is_active: true,
        created_by: rule.createdBy
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as GLPostingRule;
  }

  /**
   * Auto-posting when events occur
   */

  async autoPostChargeToGL(chargeId: string, orgId: string, userId: string) {
    try {
      // Get the charge
      const { data: charge, error: chargeError } = await supabase
        .from('unit_charges')
        .select('*')
        .eq('id', chargeId)
        .single();
      
      if (chargeError) throw chargeError;

      // Get the rule
      const { data: rule, error: ruleError } = await supabase
        .from('gl_posting_rules')
        .select('*')
        .eq('organization_id', orgId)
        .eq('event_type', 'charge_created')
        .eq('is_active', true)
        .single();
      
      if (ruleError) throw ruleError;

      // Create journal entry
      const je = await this.createJournalEntry(orgId, {
        entryDate: new Date().toISOString().split('T')[0],
        description: `Charge: ${charge.type} - ${charge.description || 'Unit charge'}`,
        referenceNumber: `CHG-${chargeId.slice(0, 8)}`,
        lines: [
          { accountId: rule.debit_account_id, debitAmount: charge.amount_minor },
          { accountId: rule.credit_account_id, creditAmount: charge.amount_minor }
        ],
        createdBy: userId
      });

      // Post immediately
      await this.postJournalEntry(je.id, userId);
      return je;
    } catch (error) {
      console.error('Error auto-posting charge:', error);
      throw error;
    }
  }
}

export const generalLedgerService = new GeneralLedgerService();
