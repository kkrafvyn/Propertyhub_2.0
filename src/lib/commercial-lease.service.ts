import { supabase } from './supabase';

const db = supabase as any;

export type CommercialEscalation = {
  id: string;
  lease_id: string;
  organization_id: string;
  effective_date: string;
  escalation_type: 'fixed_amount' | 'percentage' | 'cpi' | 'market_review' | 'step_rent';
  value_basis_points: number | null;
  amount_minor: number | null;
  new_rent_minor: number | null;
  status: 'scheduled' | 'applied' | 'skipped' | 'cancelled';
  applied_at: string | null;
  notes: string | null;
};

export const commercialLeaseService = {
  async listEscalations(organizationId: string): Promise<CommercialEscalation[]> {
    const { data, error } = await db.from('commercial_lease_escalations').select('*').eq('organization_id', organizationId).order('effective_date');
    if (error) throw error;
    return data || [];
  },

  async scheduleEscalation(input: {
    leaseId: string;
    organizationId: string;
    effectiveDate: string;
    escalationType: CommercialEscalation['escalation_type'];
    valueBasisPoints?: number;
    amountMinor?: number;
    notes?: string;
    createdBy?: string;
  }) {
    const { data, error } = await db.from('commercial_lease_escalations').insert({
      lease_id: input.leaseId,
      organization_id: input.organizationId,
      effective_date: input.effectiveDate,
      escalation_type: input.escalationType,
      value_basis_points: input.valueBasisPoints ?? null,
      amount_minor: input.amountMinor ?? null,
      notes: input.notes?.trim() || null,
      created_by: input.createdBy || null,
    }).select('*').single();
    if (error) throw error;
    return data as CommercialEscalation;
  },

  async applyEscalation(escalationId: string) {
    const { data: escalation, error } = await db.from('commercial_lease_escalations').select('*').eq('id', escalationId).single();
    if (error) throw error;
    if (escalation.status !== 'scheduled') throw new Error('Escalation is not scheduled.');

    const { data: lease, error: leaseError } = await db.from('leases').select('*').eq('id', escalation.lease_id).single();
    if (leaseError) throw leaseError;

    let newRent = lease.rent_minor;
    if (escalation.escalation_type === 'fixed_amount' && escalation.amount_minor != null) {
      newRent = lease.rent_minor + escalation.amount_minor;
    } else if (escalation.escalation_type === 'percentage' && escalation.value_basis_points != null) {
      newRent = Math.round(lease.rent_minor * (1 + escalation.value_basis_points / 10000));
    } else if (escalation.new_rent_minor != null) {
      newRent = escalation.new_rent_minor;
    }

    await db.from('leases').update({ rent_minor: newRent, updated_at: new Date().toISOString() }).eq('id', lease.id);

    const { data: updated, error: updateError } = await db.from('commercial_lease_escalations').update({
      status: 'applied',
      applied_at: new Date().toISOString(),
      new_rent_minor: newRent,
    }).eq('id', escalationId).select('*').single();
    if (updateError) throw updateError;
    return updated as CommercialEscalation;
  },

  async listDueEscalations(organizationId: string, asOfDate = new Date().toISOString().slice(0, 10)) {
    const { data, error } = await db.from('commercial_lease_escalations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled')
      .lte('effective_date', asOfDate);
    if (error) throw error;
    return data as CommercialEscalation[];
  },
};
