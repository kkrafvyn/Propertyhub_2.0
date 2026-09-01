/**
 * BaytMiftah REOS — Charge Template Service
 *
 * Wraps the `estate_charge_templates` table from:
 *   supabase/migrations/2026081502_estate_recurring_charges.sql
 *
 * Charge templates define the blueprint for recurring charges on a property
 * or unit level. The generation worker (`charge-generation.service.ts`) reads
 * these templates to create actual charge records on schedule.
 */

import { supabase } from './supabase';

const db = supabase as any;

export type ChargeType =
  | 'rent'
  | 'service_charge'
  | 'water'
  | 'electricity'
  | 'levy'
  | 'penalty'
  | 'repair'
  | 'custom';

export type ChargeFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_off';

export interface ChargeTemplate {
  id: string;
  estate_id: string;
  unit_id: string | null;
  name: string;
  charge_type: ChargeType;
  frequency: ChargeFrequency;
  amount_minor: number;
  currency: string;
  gl_account_id: string | null;
  description: string | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const chargeTemplateService = {
  /** Create a new charge template for an estate or specific unit. */
  async createTemplate(input: {
    estateId: string;
    unitId?: string;
    name: string;
    chargeType: ChargeType;
    frequency: ChargeFrequency;
    amountMinor: number;
    currency: string;
    glAccountId?: string;
    description?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    createdBy?: string;
  }): Promise<ChargeTemplate> {
    if (!input.name.trim()) throw new Error('Charge template name is required.');
    if (input.amountMinor <= 0) throw new Error('Amount must be greater than zero.');

    const { data, error } = await db
      .from('estate_charge_templates')
      .insert({
        estate_id: input.estateId,
        unit_id: input.unitId || null,
        name: input.name.trim(),
        charge_type: input.chargeType,
        frequency: input.frequency,
        amount_minor: input.amountMinor,
        currency: input.currency,
        gl_account_id: input.glAccountId || null,
        description: input.description?.trim() || null,
        is_active: true,
        effective_from: input.effectiveFrom || new Date().toISOString().slice(0, 10),
        effective_to: input.effectiveTo || null,
        created_by: input.createdBy || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ChargeTemplate;
  },

  /** Update a template's mutable fields. */
  async updateTemplate(
    templateId: string,
    update: Partial<Pick<ChargeTemplate, 'name' | 'amount_minor' | 'description' | 'gl_account_id' | 'effective_to'>>
  ): Promise<ChargeTemplate> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (update.name !== undefined) patch.name = update.name.trim();
    if (update.amount_minor !== undefined) patch.amount_minor = update.amount_minor;
    if (update.description !== undefined) patch.description = update.description?.trim() || null;
    if (update.gl_account_id !== undefined) patch.gl_account_id = update.gl_account_id;
    if (update.effective_to !== undefined) patch.effective_to = update.effective_to;

    const { data, error } = await db
      .from('estate_charge_templates')
      .update(patch)
      .eq('id', templateId)
      .select('*')
      .single();
    if (error) throw error;
    return data as ChargeTemplate;
  },

  /** Soft-delete a template (set is_active = false). */
  async archiveTemplate(templateId: string): Promise<void> {
    const { error } = await db
      .from('estate_charge_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', templateId);
    if (error) throw error;
  },

  /** List all templates for a set of estate IDs. */
  async listTemplates(
    estateIds: string[],
    filters?: { isActive?: boolean; chargeType?: ChargeType; unitId?: string }
  ): Promise<ChargeTemplate[]> {
    if (estateIds.length === 0) return [];

    let query = db
      .from('estate_charge_templates')
      .select('*')
      .in('estate_id', estateIds)
      .order('name', { ascending: true });

    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
    if (filters?.chargeType) query = query.eq('charge_type', filters.chargeType);
    if (filters?.unitId) query = query.eq('unit_id', filters.unitId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ChargeTemplate[];
  },

  /** Get a single template by ID. */
  async getTemplate(templateId: string): Promise<ChargeTemplate> {
    const { data, error } = await db
      .from('estate_charge_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    if (error) throw error;
    return data as ChargeTemplate;
  },
};
