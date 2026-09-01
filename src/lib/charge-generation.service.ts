/**
 * BaytMiftah REOS — Charge Generation Service
 *
 * Wraps the `run_due_estate_charge_schedules` RPC deployed in:
 *   supabase/migrations/2026082202_recurring_charge_execution.sql
 *
 * The DB function handles vacancy-awareness and idempotency.
 * This service is the TypeScript wrapper called by:
 *   - scripts/workers/generate-recurring-charges.mjs (scheduled runner)
 *   - Manual trigger from the Finance UI (ChargeTemplateAdmin)
 */

import { supabase } from './supabase';

const db = supabase as any;

export interface ChargeGenerationRun {
  id: string;
  estate_id: string;
  run_date: string;
  charges_generated: number;
  charges_skipped: number;
  errors: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface GenerationSummary {
  totalGenerated: number;
  totalSkipped: number;
  estatesProcessed: number;
  runDate: string;
}

export const chargeGenerationService = {
  /**
   * Run due recurring charge schedules for all estates in an organisation.
   * Calls the `run_due_estate_charge_schedules` DB function which handles
   * idempotency (won't duplicate charges for the same period).
   */
  async runDueCharges(input: {
    organizationId: string;
    asOfDate?: string;
    triggeredBy?: string;
  }): Promise<GenerationSummary> {
    const runDate = input.asOfDate || new Date().toISOString().slice(0, 10);

    const { data: estates, error: estateError } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', input.organizationId);
    if (estateError) throw estateError;

    const estateIds = ((estates || []) as any[]).map((e: any) => e.id);
    if (estateIds.length === 0) {
      return { totalGenerated: 0, totalSkipped: 0, estatesProcessed: 0, runDate };
    }

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const estateId of estateIds) {
      const { data, error } = await db.rpc('run_due_estate_charge_schedules', {
        p_estate_id: estateId,
        p_as_of_date: runDate,
        p_triggered_by: input.triggeredBy || null,
      });

      if (error) {
        console.error(`Failed to run charges for estate ${estateId}:`, error);
        continue;
      }

      if (data) {
        totalGenerated += data.charges_generated || 0;
        totalSkipped += data.charges_skipped || 0;
      }
    }

    return {
      totalGenerated,
      totalSkipped,
      estatesProcessed: estateIds.length,
      runDate,
    };
  },

  /**
   * Fetch the history of charge generation runs for an organisation's estates.
   * Used to display the audit log in the Finance UI.
   */
  async getGenerationHistory(
    organizationId: string,
    limit = 50
  ): Promise<ChargeGenerationRun[]> {
    const { data: estates } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);

    const estateIds = ((estates || []) as any[]).map((e: any) => e.id);
    if (estateIds.length === 0) return [];

    const { data, error } = await db
      .from('estate_charge_generation_runs')
      .select('*')
      .in('estate_id', estateIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ChargeGenerationRun[];
  },

  /**
   * Get upcoming scheduled charges that are due within the next N days.
   * Lets finance teams preview what will be generated before running.
   */
  async getScheduledCharges(
    organizationId: string,
    withinDays = 30
  ): Promise<Array<{ estate_id: string; unit_id: string; amount_minor: number; due_date: string; charge_type: string }>> {
    const { data: estates } = await db
      .from('managed_estates')
      .select('id')
      .eq('organization_id', organizationId);

    const estateIds = ((estates || []) as any[]).map((e: any) => e.id);
    if (estateIds.length === 0) return [];

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + withinDays);

    const { data, error } = await db
      .from('estate_charge_templates')
      .select('*, estate_units!inner(estate_id)')
      .in('estate_units.estate_id', estateIds)
      .eq('is_active', true)
      .lte('effective_from', futureDate.toISOString().slice(0, 10));

    if (error) throw error;
    return (data || []) as any[];
  },
};
