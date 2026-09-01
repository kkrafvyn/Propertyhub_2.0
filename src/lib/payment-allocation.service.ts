/**
 * BaytMiftah REOS — Payment Allocation Service
 *
 * Wraps the deterministic payment-allocation RPC deployed in:
 *   supabase/migrations/2026082203_deterministic_payment_allocation.sql
 *
 * Core rule: one payment can satisfy multiple charges (oldest-first by default).
 * Every allocation is deterministic and auditable; reversals create offset records.
 */

import { supabase } from './supabase';

const db = supabase as any;

export type AllocationStrategy = 'oldest_first' | 'priority_order' | 'manual';

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  charge_id: string;
  allocated_amount_minor: number;
  currency: string;
  strategy: AllocationStrategy;
  allocated_by: string | null;
  reversed: boolean;
  reversal_reason: string | null;
  created_at: string;
}

export interface AllocationResult {
  paymentId: string;
  totalAllocatedMinor: number;
  remainingMinor: number;
  allocations: PaymentAllocation[];
}

export interface PendingPayment {
  id: string;
  unit_id: string;
  amount_minor: number;
  currency: string;
  payment_date: string;
  reference: string | null;
  allocated_minor: number;
  unallocated_minor: number;
}

export const paymentAllocationService = {
  /**
   * Auto-allocate a payment using the DB RPC (oldest-first deterministic).
   * The RPC handles the full waterfall: deducts from each charge in due-date order.
   */
  async allocatePayment(input: {
    paymentId: string;
    allocatedBy?: string;
    strategy?: AllocationStrategy;
    manualAllocations?: Array<{ chargeId: string; amountMinor: number }>;
  }): Promise<AllocationResult> {
    if (input.strategy === 'manual' && input.manualAllocations?.length) {
      return this._applyManualAllocations(input.paymentId, input.manualAllocations, input.allocatedBy);
    }

    // Use deterministic DB RPC for oldest_first / priority_order
    const { data, error } = await db.rpc('record_estate_payment_auto_allocate', {
      p_payment_id: input.paymentId,
      p_actor_id: input.allocatedBy || null,
    });
    if (error) throw error;

    const result = data as { allocated_minor: number; remaining_minor: number; allocations: PaymentAllocation[] };
    return {
      paymentId: input.paymentId,
      totalAllocatedMinor: result.allocated_minor,
      remainingMinor: result.remaining_minor,
      allocations: result.allocations || [],
    };
  },

  /** Apply explicit manual allocations for a payment. */
  async _applyManualAllocations(
    paymentId: string,
    allocations: Array<{ chargeId: string; amountMinor: number }>,
    allocatedBy?: string
  ): Promise<AllocationResult> {
    const rows = allocations.map((a) => ({
      payment_id: paymentId,
      charge_id: a.chargeId,
      allocated_amount_minor: a.amountMinor,
      strategy: 'manual' as AllocationStrategy,
      allocated_by: allocatedBy || null,
      reversed: false,
    }));

    const { data, error } = await db
      .from('estate_payment_allocations')
      .insert(rows)
      .select('*');
    if (error) throw error;

    const totalAllocated = rows.reduce((sum, r) => sum + r.allocated_amount_minor, 0);
    return {
      paymentId,
      totalAllocatedMinor: totalAllocated,
      remainingMinor: 0,
      allocations: (data || []) as PaymentAllocation[],
    };
  },

  /** Get full allocation history for a payment. */
  async getAllocationHistory(paymentId: string): Promise<PaymentAllocation[]> {
    const { data, error } = await db
      .from('estate_payment_allocations')
      .select('*')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as PaymentAllocation[];
  },

  /** Reverse an individual allocation (creates an offset record). */
  async reverseAllocation(input: {
    allocationId: string;
    reason: string;
    reversedBy: string;
  }): Promise<void> {
    const { data: original, error: fetchError } = await db
      .from('estate_payment_allocations')
      .select('*')
      .eq('id', input.allocationId)
      .single();
    if (fetchError) throw fetchError;
    if (!original) throw new Error('Allocation not found.');
    if (original.reversed) throw new Error('Allocation is already reversed.');

    const { error: insertError } = await db
      .from('estate_payment_allocations')
      .insert({
        payment_id: original.payment_id,
        charge_id: original.charge_id,
        allocated_amount_minor: -original.allocated_amount_minor,
        currency: original.currency,
        strategy: original.strategy,
        allocated_by: input.reversedBy,
        reversed: true,
        reversal_reason: input.reason,
      });
    if (insertError) throw insertError;

    // Mark original as reversed
    await db
      .from('estate_payment_allocations')
      .update({ reversed: true, reversal_reason: input.reason, updated_at: new Date().toISOString() })
      .eq('id', input.allocationId);
  },

  /**
   * List payments that have unallocated amounts for an organisation.
   * Useful for the "pending allocation" queue in Finance UI.
   */
  async getPendingAllocations(organizationId: string): Promise<PendingPayment[]> {
    // Fetch payments via estate unit linkage
    const { data: estates } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);
    const estateIds = ((estates || []) as any[]).map((e: any) => e.id);
    if (estateIds.length === 0) return [];

    const { data: units } = await db
      .from('estate_units')
      .select('id')
      .in('estate_id', estateIds);
    const unitIds = ((units || []) as any[]).map((u: any) => u.id);
    if (unitIds.length === 0) return [];

    const { data, error } = await db
      .from('estate_payments')
      .select('id, unit_id, amount_minor, currency, payment_date, provider_reference')
      .in('unit_id', unitIds)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false });
    if (error) throw error;

    const payments = (data || []) as any[];
    if (payments.length === 0) return [];

    // Get allocation totals
    const paymentIds = payments.map((p: any) => p.id);
    const { data: allocs } = await db
      .from('estate_payment_allocations')
      .select('payment_id, allocated_amount_minor')
      .in('payment_id', paymentIds)
      .eq('reversed', false);

    const allocMap: Record<string, number> = {};
    for (const a of (allocs || []) as any[]) {
      allocMap[a.payment_id] = (allocMap[a.payment_id] || 0) + a.allocated_amount_minor;
    }

    return payments
      .map((p: any) => {
        const allocatedMinor = allocMap[p.id] || 0;
        return {
          id: p.id,
          unit_id: p.unit_id,
          amount_minor: p.amount_minor,
          currency: p.currency,
          payment_date: p.payment_date,
          reference: p.provider_reference || null,
          allocated_minor: allocatedMinor,
          unallocated_minor: p.amount_minor - allocatedMinor,
        };
      })
      .filter((p) => p.unallocated_minor > 0);
  },
};
