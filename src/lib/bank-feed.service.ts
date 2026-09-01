/**
 * BaytMiftah REOS — Bank Feed Service
 *
 * Wraps the `estate_bank_feed_connections` table from:
 *   supabase/migrations/2026082601_bank_feed_connections.sql
 *
 * Current implementation: CSV/statement import path only.
 * Live bank feed provider integration (Mono.co / Plaid) is a planned
 * future integration — see docs/AWS_MIGRATION_PLAN.md for the roadmap.
 *
 * TODO: When a live provider is configured, add provider sync in `syncFeed()`.
 */

import { supabase } from './supabase';

const db = supabase as any;

export type FeedProvider = 'csv_import' | 'mono' | 'plaid' | 'manual';
export type ConnectionStatus = 'active' | 'paused' | 'error' | 'deactivated';

export interface BankFeedConnection {
  id: string;
  estate_id: string;
  bank_name: string;
  account_number_last4: string | null;
  provider: FeedProvider;
  status: ConnectionStatus;
  last_synced_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedTransaction {
  id: string;
  connection_id: string;
  transaction_date: string;
  description: string;
  amount_minor: number;
  currency: string;
  reference: string | null;
  matched_payment_id: string | null;
  is_reconciled: boolean;
  created_at: string;
}

export const bankFeedService = {
  /** Register a new bank feed connection for an estate. */
  async createConnection(input: {
    estateId: string;
    bankName: string;
    accountNumberLast4?: string;
    provider?: FeedProvider;
    createdBy?: string;
  }): Promise<BankFeedConnection> {
    const { data, error } = await db
      .from('estate_bank_feed_connections')
      .insert({
        estate_id: input.estateId,
        bank_name: input.bankName.trim(),
        account_number_last4: input.accountNumberLast4 || null,
        provider: input.provider || 'csv_import',
        status: 'active',
        created_by: input.createdBy || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as BankFeedConnection;
  },

  /** List all connections for a set of estates. */
  async listConnections(
    estateIds: string[],
    filters?: { status?: ConnectionStatus }
  ): Promise<BankFeedConnection[]> {
    if (estateIds.length === 0) return [];

    let query = db
      .from('estate_bank_feed_connections')
      .select('*')
      .in('estate_id', estateIds)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as BankFeedConnection[];
  },

  /**
   * Import CSV-parsed transactions into a feed connection.
   * Each row becomes a `estate_bank_feed_transactions` record.
   *
   * Idempotent: rows with duplicate (connection_id + reference + date) are skipped.
   */
  async importCsvTransactions(
    connectionId: string,
    transactions: Array<{
      transactionDate: string;
      description: string;
      amountMinor: number;
      currency: string;
      reference?: string;
    }>
  ): Promise<{ imported: number; skipped: number }> {
    const rows = transactions.map((t) => ({
      connection_id: connectionId,
      transaction_date: t.transactionDate,
      description: t.description.trim(),
      amount_minor: t.amountMinor,
      currency: t.currency,
      reference: t.reference?.trim() || null,
      is_reconciled: false,
    }));

    // Use upsert with ignoreDuplicates to achieve idempotency
    const { data, error } = await db
      .from('estate_bank_feed_transactions')
      .upsert(rows, { onConflict: 'connection_id,reference,transaction_date', ignoreDuplicates: true })
      .select('id');

    if (error) throw error;

    const imported = (data || []).length;
    return { imported, skipped: rows.length - imported };
  },

  /**
   * Trigger a sync for a live provider connection.
   * Currently stubs with a "not yet configured" message for non-CSV providers.
   *
   * TODO: Implement Mono.co / Plaid API calls when provider credentials are set.
   */
  async syncFeed(connectionId: string): Promise<{ synced: number; message: string }> {
    const { data: conn, error } = await db
      .from('estate_bank_feed_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error) throw error;
    const connection = conn as BankFeedConnection;

    if (connection.provider === 'csv_import') {
      return { synced: 0, message: 'CSV import connections are synced via file upload, not automatic sync.' };
    }

    // TODO: Add live provider sync here
    await db
      .from('estate_bank_feed_connections')
      .update({ last_synced_at: new Date().toISOString(), status: 'active', error_message: null })
      .eq('id', connectionId);

    return {
      synced: 0,
      message: `Live sync for ${connection.provider} is not yet configured. Import via CSV in the meantime.`,
    };
  },

  /** Pause or deactivate a connection. */
  async deactivateConnection(connectionId: string): Promise<void> {
    const { error } = await db
      .from('estate_bank_feed_connections')
      .update({ status: 'deactivated', updated_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) throw error;
  },

  /** Fetch unreconciled transactions for a connection. */
  async getUnreconciledTransactions(connectionId: string): Promise<FeedTransaction[]> {
    const { data, error } = await db
      .from('estate_bank_feed_transactions')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('is_reconciled', false)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return (data || []) as FeedTransaction[];
  },
};
