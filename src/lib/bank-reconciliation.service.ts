import { supabase } from './supabase';
import { getBankFeedProviderConfig, normaliseBankFeedProvider } from './bank-feed-providers';

type BankAccount = {
  id: string;
  organization_id: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  currency?: string | null;
  opening_balance_minor?: number | null;
  gl_account_id?: string | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type BankStatement = {
  id: string;
  organization_id: string;
  bank_account_id: string;
  statement_date?: string | null;
  opening_balance_minor?: number | null;
  closing_balance_minor?: number | null;
  currency?: string | null;
  total_debits_minor?: number | null;
  total_credits_minor?: number | null;
  transaction_count?: number | null;
  uploaded_by?: string | null;
  reconciliation_completed?: boolean | null;
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  created_at?: string;
};

type BankTransaction = {
  id: string;
  statement_id: string;
  transaction_date?: string | null;
  description?: string | null;
  amount_minor?: number | null;
  transaction_type?: string | null;
  bank_reference?: string | null;
  line_sequence?: number | null;
  is_matched?: boolean | null;
  matched_to_payment_id?: string | null;
  matched_at?: string | null;
  matched_by?: string | null;
  created_at?: string;
};

type ReconciliationVariance = {
  id: string;
  statement_id: string;
  variance_type?: string | null;
  bank_transaction_id?: string | null;
  related_payment_id?: string | null;
  variance_amount_minor?: number | null;
  description?: string | null;
  resolution_status?: string | null;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at?: string;
};

export type BankFeedConnection = {
  id: string;
  organization_id: string;
  bank_account_id: string;
  provider: string;
  provider_account_id: string;
  status: 'active' | 'paused' | 'error' | 'revoked';
  cursor?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
};

export type BankPaymentCandidate = {
  id: string;
  amount_minor?: number | null;
  received_at?: string | null;
  provider_reference?: string | null;
  payment_reference?: string | null;
};

export function rankBankPaymentCandidates(
  transaction: Pick<BankTransaction, 'amount_minor' | 'transaction_date' | 'bank_reference'>,
  payments: BankPaymentCandidate[],
  matchedPaymentIds = new Set<string>()
): BankPaymentCandidate | undefined {
  const transactionReference = transaction.bank_reference?.trim().toLowerCase();
  const transactionDate = transaction.transaction_date ? new Date(transaction.transaction_date).getTime() : 0;

  return payments
    .filter((payment) => !matchedPaymentIds.has(payment.id))
    .map((payment) => {
      const paymentReference = [payment.provider_reference, payment.payment_reference]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      const referenceScore = transactionReference && paymentReference.includes(transactionReference) ? 1000 : 0;
      const amountScore = Math.abs(Number(payment.amount_minor || 0)) === Math.abs(Number(transaction.amount_minor || 0)) ? 100 : 0;
      const paymentDate = payment.received_at ? new Date(payment.received_at).getTime() : transactionDate;
      const dayDistance = transactionDate && paymentDate ? Math.abs(transactionDate - paymentDate) / 86400000 : 365;
      return { payment, score: referenceScore + amountScore - Math.min(dayDistance, 30) };
    })
    .sort((left, right) => right.score - left.score)[0]?.payment;
}

const db = supabase.from as any;

export class BankReconciliationService {
  /**
   * Bank Account Management
   */

  async getBankAccounts(orgId: string) {
    try {
      const { data, error } = await db('bank_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BankAccount[];
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      throw error;
    }
  }

  async createBankAccount(
    orgId: string,
    account: {
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
      currency: string;
      openingBalance: number;
      glAccountId?: string;
      createdBy: string;
    }
  ) {
    try {
      const { data, error } = await db('bank_accounts')
        .insert([{
          organization_id: orgId,
          bank_name: account.bankName,
          account_number: account.accountNumber,
          account_holder_name: account.accountHolderName,
          currency: account.currency,
          opening_balance_minor: account.openingBalance,
          gl_account_id: account.glAccountId,
          is_active: true,
          created_by: account.createdBy
        }])
        .select()
        .single();

      if (error) throw error;
      return data as BankAccount;
    } catch (error) {
      console.error('Error creating bank account:', error);
      throw error;
    }
  }

  async getBankFeedConnections(orgId: string) {
    const { data, error } = await db('bank_feed_connections')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as BankFeedConnection[];
  }

  async connectBankFeed(input: {
    organizationId: string;
    bankAccountId: string;
    provider: string;
    providerAccountId: string;
    createdBy: string;
  }) {
    const providerConfig = getBankFeedProviderConfig(input.provider);
    if (!providerConfig) {
      throw new Error('Unsupported bank feed provider. Please connect a supported provider.');
    }

    if (!input.providerAccountId.trim()) {
      throw new Error('Bank feed provider account identifier is required');
    }

    const providerKey = normaliseBankFeedProvider(input.provider);
    if (!providerKey) {
      throw new Error('The selected provider could not be validated.');
    }

    const { data, error } = await db('bank_feed_connections').upsert({
      organization_id: input.organizationId,
      bank_account_id: input.bankAccountId,
      provider: providerKey,
      provider_account_id: input.providerAccountId.trim(),
      status: 'active',
      created_by: input.createdBy,
    }, { onConflict: 'bank_account_id' }).select('*').single();
    if (error) throw error;
    return data as BankFeedConnection;
  }

  async syncBankFeed(connectionId: string, options?: { cursor?: string; dryRun?: boolean }) {
    const { data, error } = await supabase.functions.invoke('sync-bank-feed', {
      body: { connectionId, cursor: options?.cursor, dryRun: options?.dryRun ?? false },
    });
    if (error) throw error;
    return data as {
      imported: number;
      skipped: number;
      cursor?: string;
      lastSyncedAt: string;
      status?: 'ok' | 'paused' | 'dry-run' | 'not-configured';
      providerMessage?: string;
    };
  }

  /**
   * Bank Statement Upload & Parsing
   */

  async uploadBankStatement(
    orgId: string,
    bankAccountId: string,
    statement: {
      statementDate: string;
      openingBalance: number;
      closingBalance: number;
      currency: string;
      transactions: Array<{
        date: string;
        description: string;
        amount: number;
        type: 'DEBIT' | 'CREDIT';
        reference?: string;
      }>;
      uploadedBy: string;
    }
  ) {
    try {
      const { data: stmtData, error: stmtError } = await db('bank_statements')
        .insert([{
          organization_id: orgId,
          bank_account_id: bankAccountId,
          statement_date: statement.statementDate,
          opening_balance_minor: statement.openingBalance,
          closing_balance_minor: statement.closingBalance,
          currency: statement.currency,
          total_debits_minor: statement.transactions
            .filter(t => t.type === 'DEBIT')
            .reduce((sum, t) => sum + t.amount, 0),
          total_credits_minor: statement.transactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + t.amount, 0),
          transaction_count: statement.transactions.length,
          uploaded_by: statement.uploadedBy
        }])
        .select()
        .single();

      if (stmtError) throw stmtError;
      const stmt = stmtData as BankStatement;

      const txns = statement.transactions.map((txn, idx) => ({
        statement_id: stmt.id,
        transaction_date: txn.date,
        description: txn.description,
        amount_minor: txn.type === 'DEBIT' ? -txn.amount : txn.amount,
        transaction_type: txn.type,
        bank_reference: txn.reference,
        line_sequence: idx + 1
      }));

      const { error: txnError } = await db('bank_transactions')
        .insert(txns);

      if (txnError) throw txnError;
      return stmt;
    } catch (error) {
      console.error('Error uploading bank statement:', error);
      throw error;
    }
  }

  /**
   * Transaction Matching
   */

  async getUnmatchedTransactions(orgId: string, bankAccountId: string) {
    try {
      const { data, error } = await db('bank_transactions')
        .select('*')
        .eq('is_matched', false)
        .in('statement_id', (
          `(${db('bank_statements')
            .select('id')
            .eq('bank_account_id', bankAccountId)})` as any)
        );

      if (error) throw error;
      return data as BankTransaction[];
    } catch (error) {
      console.error('Error fetching unmatched transactions:', error);
      throw error;
    }
  }

  async autoMatchTransactions(statementId: string) {
    try {
      const { data: stmt, error: stmtError } = await db('bank_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (stmtError) throw stmtError;

      const { data: txns, error: txnError } = await db('bank_transactions')
        .select('*')
        .eq('statement_id', statementId)
        .eq('is_matched', false);

      if (txnError) throw txnError;

      const matched = [];
      const unmatched = [];
      const matchedPaymentIds = new Set<string>();

      for (const txn of txns || []) {
        const transactionDate = new Date(txn.transaction_date || stmt.statement_date);
        const windowStart = new Date(transactionDate);
        windowStart.setDate(windowStart.getDate() - 3);
        const windowEnd = new Date(transactionDate);
        windowEnd.setDate(windowEnd.getDate() + 3);
        let paymentQuery = db('unit_payments')
          .select('*')
          .eq('amount_minor', Math.abs(txn.amount_minor))
          .gte('received_at', windowStart.toISOString())
          .lte('received_at', windowEnd.toISOString());

        if (txn.bank_reference) {
          paymentQuery = paymentQuery.or(`provider_reference.eq.${txn.bank_reference},payment_reference.eq.${txn.bank_reference}`);
        }

        const { data: payments } = await paymentQuery.limit(10);
        const payment = rankBankPaymentCandidates(txn, payments || [], matchedPaymentIds);

        if (payment) {
          const { error: updateError } = await db('bank_transactions')
            .update({
              is_matched: true,
              matched_to_payment_id: payment.id,
              matched_at: new Date().toISOString()
            })
            .eq('id', txn.id);

          if (updateError) throw updateError;
          matchedPaymentIds.add(payment.id);
          matched.push({ transaction: txn, payment });
        } else {
          unmatched.push(txn);
        }
      }

      return { matched, unmatched };
    } catch (error) {
      console.error('Error auto-matching transactions:', error);
      throw error;
    }
  }

  async manualMatchTransaction(
    transactionId: string,
    paymentId: string | null,
    userId: string
  ) {
    try {
      const { data, error } = await db('bank_transactions')
        .update({
          is_matched: paymentId !== null,
          matched_to_payment_id: paymentId,
          matched_at: paymentId ? new Date().toISOString() : null,
          matched_by: paymentId ? userId : null
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data as BankTransaction;
    } catch (error) {
      console.error('Error matching transaction:', error);
      throw error;
    }
  }

  /**
   * Reconciliation Variances
   */

  async getReconciliationVariances(statementId: string) {
    try {
      const { data, error } = await db('reconciliation_variances')
        .select('*')
        .eq('statement_id', statementId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReconciliationVariance[];
    } catch (error) {
      console.error('Error fetching reconciliation variances:', error);
      throw error;
    }
  }

  async createVariance(
    statementId: string,
    variance: {
      varianceType: string;
      bankTransactionId?: string;
      relatedPaymentId?: string;
      varianceAmount: number;
      description: string;
    }
  ) {
    try {
      const { data, error } = await db('reconciliation_variances')
        .insert([{
          statement_id: statementId,
          variance_type: variance.varianceType,
          bank_transaction_id: variance.bankTransactionId,
          related_payment_id: variance.relatedPaymentId,
          variance_amount_minor: variance.varianceAmount,
          description: variance.description,
          resolution_status: 'PENDING'
        }])
        .select()
        .single();

      if (error) throw error;
      return data as ReconciliationVariance;
    } catch (error) {
      console.error('Error creating variance:', error);
      throw error;
    }
  }

  async resolveVariance(varianceId: string, resolution: string, userId: string) {
    try {
      const { data, error } = await db('reconciliation_variances')
        .update({
          resolution_status: 'RESOLVED',
          resolution_notes: resolution,
          resolved_by: userId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', varianceId)
        .select()
        .single();

      if (error) throw error;
      return data as ReconciliationVariance;
    } catch (error) {
      console.error('Error resolving variance:', error);
      throw error;
    }
  }

  /**
   * Reconciliation Summary
   */

  async getReconciliationSummary(statementId: string) {
    try {
      const { data: stmt } = await db('bank_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      const { data: txns } = await db('bank_transactions')
        .select('*')
        .eq('statement_id', statementId);

      const { data: variances } = await db('reconciliation_variances')
        .select('*')
        .eq('statement_id', statementId)
        .eq('resolution_status', 'PENDING');

      const matched = (txns || []).filter(t => t.is_matched).length;
      const unmatched = (txns || []).filter(t => !t.is_matched).length;
      const pendingVariances = (variances || []).length;
      const matchRate = (txns && txns.length > 0) ? (matched / txns.length * 100).toFixed(1) : '0';

      return {
        statementDate: stmt?.statement_date,
        openingBalance: stmt?.opening_balance_minor,
        closingBalance: stmt?.closing_balance_minor,
        totalTransactions: txns?.length || 0,
        matchedTransactions: matched,
        unmatchedTransactions: unmatched,
        matchRate: `${matchRate}%`,
        pendingVariances: pendingVariances,
        reconciliationComplete: stmt?.reconciliation_completed || false,
        reconciledAt: stmt?.reconciled_at
      };
    } catch (error) {
      console.error('Error getting reconciliation summary:', error);
      throw error;
    }
  }

  async completeReconciliation(statementId: string, userId: string) {
    try {
      void userId; // The server derives the reconciler from the authenticated session.
      const { data, error } = await supabase.rpc('complete_bank_reconciliation', { p_statement_id: statementId });

      if (error) throw error;
      return data as BankStatement;
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      throw error;
    }
  }

  async getOrganizationPaymentCandidates(organizationId: string, limit = 50): Promise<BankPaymentCandidate[]> {
    const { data: estates, error: estateError } = await supabase
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);
    if (estateError) throw estateError;

    const estateIds = (estates || []).map((row: { id: string }) => row.id);
    if (estateIds.length === 0) return [];

    const { data: units, error: unitError } = await supabase
      .from('estate_units')
      .select('id')
      .in('estate_id', estateIds);
    if (unitError) throw unitError;

    const unitIds = (units || []).map((row: { id: string }) => row.id);
    if (unitIds.length === 0) return [];

    const { data, error } = await supabase
      .from('unit_payments')
      .select('id, amount_minor, received_at, provider_reference, payment_reference')
      .in('unit_id', unitIds)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as BankPaymentCandidate[];
  }
}

export const bankReconciliationService = new BankReconciliationService();
