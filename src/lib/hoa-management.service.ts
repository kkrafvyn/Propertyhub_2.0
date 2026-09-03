import { supabase } from './supabase';

const db = supabase as any;

export type HoaAssociation = {
  id: string;
  organization_id: string;
  estate_id: string | null;
  name: string;
  legal_name: string | null;
  address: string | null;
  board_contact_email: string | null;
  monthly_dues_minor: number;
  currency: string;
  status: 'active' | 'inactive' | 'dissolved';
  created_at: string;
};

export type HoaViolation = {
  id: string;
  association_id: string;
  member_id: string | null;
  unit_id: string | null;
  violation_type: string;
  description: string;
  status: 'open' | 'notice_sent' | 'cured' | 'fined' | 'closed' | 'appealed';
  fine_minor: number;
  currency: string;
  reported_at: string;
  due_date: string | null;
  resolved_at: string | null;
};

export type HoaAssessment = {
  id: string;
  association_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  total_amount_minor: number;
  currency: string;
  status: 'draft' | 'issued' | 'partially_collected' | 'collected' | 'void';
  due_date: string | null;
};

export const hoaManagementService = {
  async listAssociations(organizationId: string): Promise<HoaAssociation[]> {
    const { data, error } = await db
      .from('hoa_associations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createAssociation(input: {
    organizationId: string;
    name: string;
    estateId?: string;
    legalName?: string;
    address?: string;
    boardContactEmail?: string;
    monthlyDuesMinor?: number;
    currency?: string;
  }) {
    const { data, error } = await db.from('hoa_associations').insert({
      organization_id: input.organizationId,
      estate_id: input.estateId || null,
      name: input.name.trim(),
      legal_name: input.legalName?.trim() || null,
      address: input.address?.trim() || null,
      board_contact_email: input.boardContactEmail?.trim() || null,
      monthly_dues_minor: input.monthlyDuesMinor ?? 0,
      currency: input.currency || 'GHS',
    }).select('*').single();
    if (error) throw error;
    return data as HoaAssociation;
  },

  async listMembers(associationId: string) {
    const { data, error } = await db.from('hoa_members').select('*').eq('association_id', associationId).order('member_name');
    if (error) throw error;
    return data || [];
  },

  async addMember(input: {
    associationId: string;
    memberName: string;
    memberEmail?: string;
    unitId?: string;
    role?: string;
  }) {
    const { data, error } = await db.from('hoa_members').insert({
      association_id: input.associationId,
      member_name: input.memberName.trim(),
      member_email: input.memberEmail?.trim().toLowerCase() || null,
      unit_id: input.unitId || null,
      role: input.role || 'owner',
    }).select('*').single();
    if (error) throw error;
    return data;
  },

  async listViolations(associationId: string): Promise<HoaViolation[]> {
    const { data, error } = await db.from('hoa_violations').select('*').eq('association_id', associationId).order('reported_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createViolation(input: {
    associationId: string;
    violationType: string;
    description: string;
    memberId?: string;
    unitId?: string;
    fineMinor?: number;
    currency?: string;
    createdBy?: string;
  }) {
    const { data, error } = await db.from('hoa_violations').insert({
      association_id: input.associationId,
      violation_type: input.violationType.trim(),
      description: input.description.trim(),
      member_id: input.memberId || null,
      unit_id: input.unitId || null,
      fine_minor: input.fineMinor ?? 0,
      currency: input.currency || 'GHS',
      created_by: input.createdBy || null,
    }).select('*').single();
    if (error) throw error;
    return data as HoaViolation;
  },

  async updateViolationStatus(violationId: string, status: HoaViolation['status']) {
    const patch: Record<string, unknown> = { status };
    if (['cured', 'closed', 'fined'].includes(status)) patch.resolved_at = new Date().toISOString();
    const { data, error } = await db.from('hoa_violations').update(patch).eq('id', violationId).select('*').single();
    if (error) throw error;
    return data as HoaViolation;
  },

  async listAssessments(associationId: string): Promise<HoaAssessment[]> {
    const { data, error } = await db.from('hoa_assessments').select('*').eq('association_id', associationId).order('period_start', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createAssessment(input: {
    associationId: string;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    totalAmountMinor: number;
    currency?: string;
    dueDate?: string;
    createdBy?: string;
    memberAllocations: Array<{ memberId?: string; unitId?: string; amountMinor: number }>;
  }) {
    const { data: assessment, error } = await db.from('hoa_assessments').insert({
      association_id: input.associationId,
      period_label: input.periodLabel.trim(),
      period_start: input.periodStart,
      period_end: input.periodEnd,
      total_amount_minor: input.totalAmountMinor,
      currency: input.currency || 'GHS',
      due_date: input.dueDate || null,
      status: 'issued',
      created_by: input.createdBy || null,
    }).select('*').single();
    if (error) throw error;

    if (input.memberAllocations.length > 0) {
      const { error: lineError } = await db.from('hoa_assessment_lines').insert(
        input.memberAllocations.map((row) => ({
          assessment_id: assessment.id,
          member_id: row.memberId || null,
          unit_id: row.unitId || null,
          amount_minor: row.amountMinor,
        }))
      );
      if (lineError) throw lineError;
    }
    return assessment as HoaAssessment;
  },

  async getAssessmentLines(assessmentId: string) {
    const { data, error } = await db.from('hoa_assessment_lines').select('*').eq('assessment_id', assessmentId);
    if (error) throw error;
    return data || [];
  },
};
