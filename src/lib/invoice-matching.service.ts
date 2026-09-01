/**
 * BaytMiftah REOS — Invoice Matching Service (Procure-to-Pay)
 * Uses estate_vendor_bills + evaluate_procurement_invoice_match RPC
 */

import { supabase } from './supabase';

const db = supabase as any;

export type MatchStatus = 'matched' | 'variance' | 'blocked' | 'approved' | 'rejected';

export interface ProcurementInvoiceMatch {
  id: string;
  vendor_bill_id: string;
  purchase_order_id: string | null;
  po_total_minor: number;
  received_total_minor: number;
  invoice_total_minor: number;
  variance_minor: number;
  tolerance_minor: number;
  status: MatchStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface MatchEvaluation {
  vendorBillId: string;
  purchaseOrderId: string | null;
  poTotalMinor: number;
  receivedTotalMinor: number;
  invoiceTotalMinor: number;
  varianceMinor: number;
  withinTolerance: boolean;
  status: MatchStatus;
}

export const invoiceMatchingService = {
  async evaluateMatch(vendorBillId: string, toleranceMinor = 0): Promise<MatchEvaluation> {
    const { data, error } = await db.rpc('evaluate_procurement_invoice_match', {
      p_vendor_bill_id: vendorBillId,
      p_tolerance_minor: toleranceMinor,
    });
    if (error) throw error;

    const match = data as ProcurementInvoiceMatch;
    return {
      vendorBillId,
      purchaseOrderId: match.purchase_order_id,
      poTotalMinor: Number(match.po_total_minor) || 0,
      receivedTotalMinor: Number(match.received_total_minor) || 0,
      invoiceTotalMinor: Number(match.invoice_total_minor) || 0,
      varianceMinor: Number(match.variance_minor) || 0,
      withinTolerance: match.status === 'matched' || match.status === 'approved',
      status: match.status,
    };
  },

  async listMatches(vendorBillIds: string[]): Promise<ProcurementInvoiceMatch[]> {
    if (vendorBillIds.length === 0) return [];
    const { data, error } = await db
      .from('estate_procurement_invoice_matches')
      .select('*')
      .in('vendor_bill_id', vendorBillIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ProcurementInvoiceMatch[];
  },

  async getPendingReview(organizationId: string): Promise<ProcurementInvoiceMatch[]> {
    const { data: estates } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);
    const estateIds = ((estates || []) as any[]).map((e) => e.id);
    if (estateIds.length === 0) return [];

    const { data: bills } = await db
      .from('estate_vendor_bills')
      .select('id')
      .in('estate_id', estateIds);
    const billIds = ((bills || []) as any[]).map((b) => b.id);
    if (billIds.length === 0) return [];

    const { data, error } = await db
      .from('estate_procurement_invoice_matches')
      .select('*')
      .in('vendor_bill_id', billIds)
      .in('status', ['variance', 'blocked'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ProcurementInvoiceMatch[];
  },

  async approveVariance(matchId: string, approvedBy: string, notes?: string): Promise<void> {
    const { error } = await db
      .from('estate_procurement_invoice_matches')
      .update({
        status: 'approved',
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', matchId);
    if (error) throw error;
    void notes;
  },

  async rejectMatch(matchId: string, rejectedBy: string): Promise<void> {
    const { error } = await db
      .from('estate_procurement_invoice_matches')
      .update({
        status: 'rejected',
        reviewed_by: rejectedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', matchId);
    if (error) throw error;
  },

  /** @deprecated Use evaluateMatch with vendor bill id */
  async listInvoices(_purchaseOrderIds: string[]) {
    return [];
  },
};
