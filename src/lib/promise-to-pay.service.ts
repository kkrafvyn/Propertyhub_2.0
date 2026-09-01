/**
 * BaytMiftah REOS — Promise-to-Pay Service
 */

import { supabase } from './supabase';
import type { CasePromise } from './collections-case.service';

const db = supabase as any;

export interface PtPSummary {
  totalActive: number;
  totalFulfilled: number;
  totalBroken: number;
  amountPendingMinor: number;
  currency: string;
}

export const promiseToPayService = {
  async getActivePtPs(organizationId: string): Promise<CasePromise[]> {
    const caseIds = await this._getCaseIds(organizationId);
    if (caseIds.length === 0) return [];

    const { data, error } = await db
      .from('estate_promise_to_pay')
      .select('*')
      .in('collection_case_id', caseIds)
      .eq('status', 'active')
      .order('promised_for', { ascending: true });

    if (error) throw error;
    return (data || []) as CasePromise[];
  },

  async getOverduePtPs(organizationId: string): Promise<CasePromise[]> {
    const caseIds = await this._getCaseIds(organizationId);
    if (caseIds.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await db
      .from('estate_promise_to_pay')
      .select('*')
      .in('collection_case_id', caseIds)
      .eq('status', 'active')
      .lt('promised_for', today)
      .order('promised_for', { ascending: true });

    if (error) throw error;
    return (data || []) as CasePromise[];
  },

  async getPtPHistory(organizationId: string, limit = 100): Promise<CasePromise[]> {
    const caseIds = await this._getCaseIds(organizationId);
    if (caseIds.length === 0) return [];

    const { data, error } = await db
      .from('estate_promise_to_pay')
      .select('*')
      .in('collection_case_id', caseIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as CasePromise[];
  },

  async getSummary(organizationId: string): Promise<PtPSummary> {
    const all = await this.getPtPHistory(organizationId);

    const active = all.filter((p) => p.status === 'active');
    const fulfilled = all.filter((p) => p.status === 'fulfilled');
    const broken = all.filter((p) => p.status === 'broken');
    const currency = all[0]?.currency || 'GHS';

    return {
      totalActive: active.length,
      totalFulfilled: fulfilled.length,
      totalBroken: broken.length,
      amountPendingMinor: active.reduce((sum, p) => sum + p.amount_minor, 0),
      currency,
    };
  },

  async _getCaseIds(organizationId: string): Promise<string[]> {
    const { data: estates } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);
    const estateIds = ((estates || []) as any[]).map((e) => e.id);
    if (estateIds.length === 0) return [];

    const { data: cases } = await db
      .from('estate_collection_cases')
      .select('id')
      .in('estate_id', estateIds);
    return ((cases || []) as any[]).map((c) => c.id);
  },
};
