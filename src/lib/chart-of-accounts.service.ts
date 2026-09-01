/**
 * BaytMiftah REOS — Chart of Accounts Service
 *
 * Wraps the `coa_accounts` table deployed in:
 *   supabase/migrations/20260821_general_ledger_foundation.sql
 *
 * Accounts are immutable (codes cannot change, accounts cannot be deleted —
 * only archived). This enforces the accounting integrity required by the spec.
 */

import { supabase } from './supabase';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type BalanceType = 'DEBIT' | 'CREDIT';

export interface CoaAccount {
  id: string;
  organization_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType | null;
  balance_type: BalanceType | null;
  parent_account_id: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoaAccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitTotalMinor: number;
  creditTotalMinor: number;
  netBalanceMinor: number;
}

export interface ChartValidationResult {
  valid: boolean;
  errors: string[];
}

const db = supabase as any;

export const chartOfAccountsService = {
  /** Create a new COA account. Account code is permanent once created. */
  async createAccount(input: {
    organizationId: string;
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    balanceType: BalanceType;
    description?: string;
    parentAccountId?: string;
    createdBy?: string;
  }): Promise<CoaAccount> {
    if (!input.accountCode.trim()) throw new Error('Account code is required.');
    if (!input.accountName.trim()) throw new Error('Account name is required.');

    // Enforce code uniqueness within the organisation
    const { data: existing } = await db
      .from('coa_accounts')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('account_code', input.accountCode.trim())
      .maybeSingle();

    if (existing) {
      throw new Error(`Account code "${input.accountCode}" already exists for this organisation.`);
    }

    const { data, error } = await db
      .from('coa_accounts')
      .insert({
        organization_id: input.organizationId,
        account_code: input.accountCode.trim(),
        account_name: input.accountName.trim(),
        account_type: input.accountType,
        balance_type: input.balanceType,
        description: input.description?.trim() || null,
        parent_account_id: input.parentAccountId || null,
        is_active: true,
        created_by: input.createdBy || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as CoaAccount;
  },

  /** Update mutable fields (name and description only; code is immutable). */
  async updateAccount(
    accountId: string,
    update: { accountName?: string; description?: string }
  ): Promise<CoaAccount> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (update.accountName !== undefined) patch.account_name = update.accountName.trim();
    if (update.description !== undefined) patch.description = update.description.trim() || null;

    const { data, error } = await db
      .from('coa_accounts')
      .update(patch)
      .eq('id', accountId)
      .select('*')
      .single();

    if (error) throw error;
    return data as CoaAccount;
  },

  /** Soft-delete an account (set is_active = false). Cannot be undone easily. */
  async archiveAccount(accountId: string, _reason?: string): Promise<void> {
    const { error } = await db
      .from('coa_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', accountId);
    if (error) throw error;
  },

  /** List all accounts for an organisation, optionally filtered. */
  async listAccounts(
    organizationId: string,
    filters?: {
      accountType?: AccountType;
      isActive?: boolean;
      parentAccountId?: string | null;
    }
  ): Promise<CoaAccount[]> {
    let query = db
      .from('coa_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('account_code', { ascending: true });

    if (filters?.accountType) query = query.eq('account_type', filters.accountType);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
    if (filters?.parentAccountId !== undefined) {
      if (filters.parentAccountId === null) {
        query = query.is('parent_account_id', null);
      } else {
        query = query.eq('parent_account_id', filters.parentAccountId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CoaAccount[];
  },

  /** Fetch a single account by its ID. */
  async getAccount(accountId: string): Promise<CoaAccount> {
    const { data, error } = await db
      .from('coa_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    if (error) throw error;
    return data as CoaAccount;
  },

  /**
   * Get balance per account as of a given date by summing posted journal
   * entry lines. Returns an array of account balances.
   */
  async getAccountBalances(
    organizationId: string,
    asOfDate?: string
  ): Promise<CoaAccountBalance[]> {
    const dateLimit = asOfDate || new Date().toISOString().slice(0, 10);

    const { data: accounts, error: accountsError } = await db
      .from('coa_accounts')
      .select('id, account_code, account_name')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;
    if (!accounts || accounts.length === 0) return [];

    const accountIds = accounts.map((a: any) => a.id);

    const { data: lines, error: linesError } = await db
      .from('journal_entry_lines')
      .select('account_id, debit_amount_minor, credit_amount_minor, journal_entries!inner(status, entry_date)')
      .in('account_id', accountIds)
      .eq('journal_entries.status', 'POSTED')
      .lte('journal_entries.entry_date', dateLimit);

    if (linesError) throw linesError;

    const balanceMap: Record<string, { debit: number; credit: number }> = {};
    for (const line of (lines || []) as any[]) {
      if (!balanceMap[line.account_id]) balanceMap[line.account_id] = { debit: 0, credit: 0 };
      balanceMap[line.account_id].debit += line.debit_amount_minor || 0;
      balanceMap[line.account_id].credit += line.credit_amount_minor || 0;
    }

    return accounts.map((a: any) => {
      const b = balanceMap[a.id] || { debit: 0, credit: 0 };
      return {
        accountId: a.id,
        accountCode: a.account_code,
        accountName: a.account_name,
        debitTotalMinor: b.debit,
        creditTotalMinor: b.credit,
        netBalanceMinor: b.debit - b.credit,
      };
    });
  },

  /**
   * Validate chart structure: no orphaned parent references, all codes
   * unique within the organisation.
   */
  async validateChartStructure(organizationId: string): Promise<ChartValidationResult> {
    const accounts = await this.listAccounts(organizationId);
    const errors: string[] = [];
    const idSet = new Set(accounts.map((a) => a.id));
    const codeSet = new Map<string, number>();

    for (const a of accounts) {
      // Check parent exists
      if (a.parent_account_id && !idSet.has(a.parent_account_id)) {
        errors.push(`Account ${a.account_code} references a non-existent parent.`);
      }
      // Check code uniqueness
      codeSet.set(a.account_code, (codeSet.get(a.account_code) || 0) + 1);
    }

    for (const [code, count] of codeSet.entries()) {
      if (count > 1) errors.push(`Duplicate account code: ${code}`);
    }

    return { valid: errors.length === 0, errors };
  },
};
