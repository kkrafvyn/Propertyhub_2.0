import { supabase } from './supabase';

const db = supabase as any;

export type CamAllocationPlan = {
  id: string;
  organization_id: string;
  estate_id: string;
  name: string;
  period_start: string;
  period_end: string;
  total_expense_minor: number;
  currency: string;
  allocation_method: 'pro_rata_sqft' | 'equal_share' | 'fixed_amount' | 'custom';
  status: 'draft' | 'allocated' | 'invoiced' | 'closed';
};

export type CamAllocationLine = {
  id: string;
  plan_id: string;
  unit_id: string;
  square_feet: number;
  share_basis_points: number;
  allocated_minor: number;
  invoiced_at: string | null;
};

export const camBillingService = {
  async listPlans(organizationId: string): Promise<CamAllocationPlan[]> {
    const { data, error } = await db.from('cam_allocation_plans').select('*').eq('organization_id', organizationId).order('period_start', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPlan(input: {
    organizationId: string;
    estateId: string;
    name: string;
    periodStart: string;
    periodEnd: string;
    totalExpenseMinor: number;
    currency?: string;
    allocationMethod?: CamAllocationPlan['allocation_method'];
    createdBy?: string;
  }) {
    const { data, error } = await db.from('cam_allocation_plans').insert({
      organization_id: input.organizationId,
      estate_id: input.estateId,
      name: input.name.trim(),
      period_start: input.periodStart,
      period_end: input.periodEnd,
      total_expense_minor: input.totalExpenseMinor,
      currency: input.currency || 'GHS',
      allocation_method: input.allocationMethod || 'pro_rata_sqft',
      created_by: input.createdBy || null,
    }).select('*').single();
    if (error) throw error;
    return data as CamAllocationPlan;
  },

  async allocateProRata(planId: string, units: Array<{ unitId: string; squareFeet: number }>) {
    const { data: plan, error: planError } = await db.from('cam_allocation_plans').select('*').eq('id', planId).single();
    if (planError) throw planError;

    const totalSqft = units.reduce((sum, u) => sum + u.squareFeet, 0) || 1;
    const lines = units.map((unit) => {
      const share = unit.squareFeet / totalSqft;
      const allocatedMinor = Math.round(plan.total_expense_minor * share);
      return {
        plan_id: planId,
        unit_id: unit.unitId,
        square_feet: unit.squareFeet,
        share_basis_points: Math.round(share * 10000),
        allocated_minor: allocatedMinor,
      };
    });

    await db.from('cam_allocation_lines').delete().eq('plan_id', planId);
    const { data, error } = await db.from('cam_allocation_lines').insert(lines).select('*');
    if (error) throw error;

    await db.from('cam_allocation_plans').update({ status: 'allocated' }).eq('id', planId);
    return data as CamAllocationLine[];
  },

  async allocateEqualShare(planId: string, unitIds: string[]) {
    const { data: plan, error: planError } = await db.from('cam_allocation_plans').select('*').eq('id', planId).single();
    if (planError) throw planError;
    const count = unitIds.length || 1;
    const perUnit = Math.floor(plan.total_expense_minor / count);
    const remainder = plan.total_expense_minor - perUnit * count;

    const lines = unitIds.map((unitId, index) => ({
      plan_id: planId,
      unit_id: unitId,
      square_feet: 0,
      share_basis_points: Math.round(10000 / count),
      allocated_minor: perUnit + (index === 0 ? remainder : 0),
    }));

    await db.from('cam_allocation_lines').delete().eq('plan_id', planId);
    const { data, error } = await db.from('cam_allocation_lines').insert(lines).select('*');
    if (error) throw error;
    await db.from('cam_allocation_plans').update({ status: 'allocated' }).eq('id', planId);
    return data as CamAllocationLine[];
  },

  async getLines(planId: string): Promise<CamAllocationLine[]> {
    const { data, error } = await db.from('cam_allocation_lines').select('*').eq('plan_id', planId);
    if (error) throw error;
    return data || [];
  },

  async markInvoiced(planId: string) {
    const now = new Date().toISOString();
    await db.from('cam_allocation_lines').update({ invoiced_at: now }).eq('plan_id', planId);
    const { data, error } = await db.from('cam_allocation_plans').update({ status: 'invoiced' }).eq('id', planId).select('*').single();
    if (error) throw error;
    return data as CamAllocationPlan;
  },
};
