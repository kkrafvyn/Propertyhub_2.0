import { supabase } from './supabase';

const db = supabase as any;

export type TrustAccount = {
  id: string;
  organization_id: string;
  estate_id: string | null;
  name: string;
  account_type: 'tenant_security' | 'owner_reserve' | 'operating_segregated' | 'escrow' | 'other';
  bank_name: string | null;
  masked_account_number: string | null;
  balance_minor: number;
  currency: string;
  is_active: boolean;
};

export type TrustLedgerEntry = {
  id: string;
  trust_account_id: string;
  entry_type: 'deposit' | 'disbursement' | 'transfer_in' | 'transfer_out' | 'adjustment';
  amount_minor: number;
  balance_after_minor: number;
  reference_type: string | null;
  reference_id: string | null;
  memo: string | null;
  posted_at: string;
};

export const trustAccountingService = {
  async listAccounts(organizationId: string): Promise<TrustAccount[]> {
    const { data, error } = await db.from('trust_accounts').select('*').eq('organization_id', organizationId).order('name');
    if (error) throw error;
    return data || [];
  },

  async createAccount(input: {
    organizationId: string;
    name: string;
    accountType?: TrustAccount['account_type'];
    estateId?: string;
    bankName?: string;
    maskedAccountNumber?: string;
    currency?: string;
    openingBalanceMinor?: number;
  }) {
    const balance = input.openingBalanceMinor ?? 0;
    const { data, error } = await db.from('trust_accounts').insert({
      organization_id: input.organizationId,
      estate_id: input.estateId || null,
      name: input.name.trim(),
      account_type: input.accountType || 'tenant_security',
      bank_name: input.bankName?.trim() || null,
      masked_account_number: input.maskedAccountNumber?.trim() || null,
      currency: input.currency || 'USD',
      balance_minor: balance,
    }).select('*').single();
    if (error) throw error;

    if (balance !== 0) {
      await this.postEntry({
        trustAccountId: data.id,
        entryType: 'deposit',
        amountMinor: balance,
        memo: 'Opening balance',
      });
    }
    return data as TrustAccount;
  },

  async postEntry(input: {
    trustAccountId: string;
    entryType: TrustLedgerEntry['entry_type'];
    amountMinor: number;
    referenceType?: string;
    referenceId?: string;
    memo?: string;
    postedBy?: string;
  }) {
    const { data: account, error: accountError } = await db.from('trust_accounts').select('*').eq('id', input.trustAccountId).single();
    if (accountError) throw accountError;

    const signedAmount = ['disbursement', 'transfer_out'].includes(input.entryType)
      ? -Math.abs(input.amountMinor)
      : Math.abs(input.amountMinor);
    const balanceAfter = account.balance_minor + signedAmount;

    if (balanceAfter < 0) throw new Error('Trust account balance cannot go negative.');

    const { data: entry, error: entryError } = await db.from('trust_ledger_entries').insert({
      trust_account_id: input.trustAccountId,
      entry_type: input.entryType,
      amount_minor: signedAmount,
      balance_after_minor: balanceAfter,
      reference_type: input.referenceType || null,
      reference_id: input.referenceId || null,
      memo: input.memo?.trim() || null,
      posted_by: input.postedBy || null,
    }).select('*').single();
    if (entryError) throw entryError;

    await db.from('trust_accounts').update({ balance_minor: balanceAfter, updated_at: new Date().toISOString() }).eq('id', input.trustAccountId);
    return entry as TrustLedgerEntry;
  },

  async getLedger(trustAccountId: string): Promise<TrustLedgerEntry[]> {
    const { data, error } = await db.from('trust_ledger_entries').select('*').eq('trust_account_id', trustAccountId).order('posted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTrustSummary(organizationId: string) {
    const accounts = await this.listAccounts(organizationId);
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance_minor, 0);
    const byType = accounts.reduce<Record<string, number>>((acc, a) => {
      acc[a.account_type] = (acc[a.account_type] || 0) + a.balance_minor;
      return acc;
    }, {});
    return { accounts, totalBalance, byType };
  },
};
