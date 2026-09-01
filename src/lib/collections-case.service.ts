/**
 * BaytMiftah REOS — Collections Case Service
 * Aligned with supabase/migrations/2026082205_collections_cases_and_promises.sql
 */

import { supabase } from './supabase';

const db = supabase as any;

export type CaseStatus =
  | 'open'
  | 'contacted'
  | 'promise_active'
  | 'payment_plan'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type ContactChannel = 'sms' | 'whatsapp' | 'email' | 'phone' | 'in_person' | 'letter';

export interface CollectionCase {
  id: string;
  estate_id: string;
  unit_id: string;
  status: CaseStatus;
  assigned_to_user_id: string | null;
  next_follow_up_at: string | null;
  escalation_level: number;
  opened_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Enriched client-side when available */
  total_outstanding_minor?: number;
  currency?: string;
  unit_label?: string;
}

export interface CaseEvent {
  id: string;
  collection_case_id: string;
  event_type: string;
  actor_user_id: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  channel?: ContactChannel | null;
}

export interface CasePromise {
  id: string;
  collection_case_id: string;
  amount_minor: number;
  currency: string;
  promised_for: string;
  status: 'active' | 'fulfilled' | 'broken' | 'cancelled';
  verified_at: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface CaseDetail {
  case: CollectionCase;
  events: CaseEvent[];
  promises: CasePromise[];
}

function mapEvent(row: any): CaseEvent {
  const metadata = (row.metadata || {}) as Record<string, unknown>;
  return {
    ...row,
    metadata,
    channel: (metadata.channel as ContactChannel) || null,
  };
}

export const collectionsCaseService = {
  async openCase(input: {
    unitId: string;
    assignedToUserId?: string;
    nextFollowUpAt?: string;
    note?: string;
  }): Promise<CollectionCase> {
    const { data, error } = await db.rpc('create_collection_case', {
      p_unit_id: input.unitId,
      p_assigned_to_user_id: input.assignedToUserId || null,
      p_next_follow_up_at: input.nextFollowUpAt || null,
      p_note: input.note || null,
    });
    if (error) throw error;
    return data as CollectionCase;
  },

  async assignCase(caseId: string, userId: string, assignedBy?: string): Promise<void> {
    const { error } = await db
      .from('estate_collection_cases')
      .update({ assigned_to_user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', caseId);
    if (error) throw error;
    await this.logEvent(caseId, 'note', assignedBy, null, `Assigned to ${userId}`);
  },

  async logContactAttempt(input: {
    caseId: string;
    actorUserId?: string;
    channel: ContactChannel;
    note?: string;
    nextFollowUpAt?: string;
  }): Promise<CaseEvent> {
    const event = await this.logEvent(
      input.caseId,
      'contacted',
      input.actorUserId,
      input.channel,
      input.note
    );

    await db
      .from('estate_collection_cases')
      .update({
        status: 'contacted',
        next_follow_up_at: input.nextFollowUpAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.caseId);

    return event;
  },

  async createPromise(input: {
    caseId: string;
    amountMinor: number;
    currency: string;
    promisedFor: string;
    createdBy?: string;
    notes?: string;
  }): Promise<CasePromise> {
    const { data, error } = await db
      .from('estate_promise_to_pay')
      .insert({
        collection_case_id: input.caseId,
        amount_minor: input.amountMinor,
        currency: input.currency,
        promised_for: input.promisedFor,
        status: 'active',
        created_by: input.createdBy || null,
        notes: input.notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    await db
      .from('estate_collection_cases')
      .update({
        status: 'promise_active',
        next_follow_up_at: `${input.promisedFor}T09:00:00Z`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.caseId);

    await this.logEvent(input.caseId, 'promise_created', input.createdBy, null, input.notes);
    return data as CasePromise;
  },

  async fulfillPromise(promiseId: string, verifiedBy?: string): Promise<void> {
    const { data: promise, error } = await db
      .from('estate_promise_to_pay')
      .update({
        status: 'fulfilled',
        verified_at: new Date().toISOString(),
        verified_by: verifiedBy || null,
      })
      .eq('id', promiseId)
      .select('collection_case_id')
      .single();
    if (error) throw error;
    if (promise) {
      await this.logEvent(promise.collection_case_id, 'promise_fulfilled', verifiedBy, null, null);
    }
  },

  async breachPromise(promiseId: string, triggeredBy?: string): Promise<void> {
    const { data: promise, error } = await db
      .from('estate_promise_to_pay')
      .update({ status: 'broken', verified_at: new Date().toISOString() })
      .eq('id', promiseId)
      .select('collection_case_id')
      .single();
    if (error) throw error;
    if (promise) {
      const { data: current } = await db
        .from('estate_collection_cases')
        .select('escalation_level')
        .eq('id', promise.collection_case_id)
        .single();

      await db
        .from('estate_collection_cases')
        .update({
          status: 'escalated',
          escalation_level: (Number(current?.escalation_level) || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promise.collection_case_id);

      await this.logEvent(
        promise.collection_case_id,
        'promise_broken',
        triggeredBy,
        null,
        'Payment not received by promised date'
      );
    }
  },

  async escalateCase(caseId: string, reason: string, escalatedBy?: string): Promise<void> {
    const { data: current } = await db
      .from('estate_collection_cases')
      .select('escalation_level')
      .eq('id', caseId)
      .single();

    const { error } = await db
      .from('estate_collection_cases')
      .update({
        status: 'escalated',
        escalation_level: (Number(current?.escalation_level) || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId);
    if (error) throw error;
    await this.logEvent(caseId, 'escalated', escalatedBy, null, reason);
  },

  async closeAsPaid(caseId: string, closedBy?: string): Promise<void> {
    await db
      .from('estate_collection_cases')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId);
    await this.logEvent(caseId, 'resolved', closedBy, null, 'Arrears cleared');
  },

  async writeOff(caseId: string, reason: string, closedBy?: string): Promise<void> {
    await db
      .from('estate_collection_cases')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId);
    await this.logEvent(caseId, 'note', closedBy, null, `Written off: ${reason}`);
  },

  async getCaseDetail(caseId: string): Promise<CaseDetail> {
    const [caseRes, eventsRes, promisesRes] = await Promise.all([
      db.from('estate_collection_cases').select('*').eq('id', caseId).single(),
      db
        .from('estate_collection_case_events')
        .select('*')
        .eq('collection_case_id', caseId)
        .order('created_at', { ascending: true }),
      db
        .from('estate_promise_to_pay')
        .select('*')
        .eq('collection_case_id', caseId)
        .order('created_at', { ascending: false }),
    ]);
    if (caseRes.error) throw caseRes.error;
    return {
      case: caseRes.data as CollectionCase,
      events: (eventsRes.data || []).map(mapEvent),
      promises: (promisesRes.data || []) as CasePromise[],
    };
  },

  async getCase(caseId: string): Promise<CollectionCase> {
    const { data, error } = await db.from('estate_collection_cases').select('*').eq('id', caseId).single();
    if (error) throw error;
    return data as CollectionCase;
  },

  async listCases(
    organizationId: string,
    filters?: { status?: CaseStatus; assignedToUserId?: string; estateId?: string; openOnly?: boolean }
  ): Promise<CollectionCase[]> {
    const { data: estates } = await db
      .from('managed_estates')
      .select('id, name, currency')
      .eq('organization_id', organizationId);
    const estateRows = (estates || []) as any[];
    const estateIds = estateRows.map((e) => e.id);
    if (estateIds.length === 0) return [];

    let query = db
      .from('estate_collection_cases')
      .select('*, estate_units(identifier)')
      .in('estate_id', estateIds)
      .order('updated_at', { ascending: false });

    if (filters?.openOnly !== false) {
      query = query.not('status', 'in', '("resolved","closed")');
    }
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.assignedToUserId) query = query.eq('assigned_to_user_id', filters.assignedToUserId);
    if (filters?.estateId) query = query.eq('estate_id', filters.estateId);

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as any[]).map((row) => ({
      ...row,
      unit_label: row.estate_units?.identifier || row.unit_id?.slice(0, 8),
      currency: estateRows.find((e) => e.id === row.estate_id)?.currency || 'GHS',
    })) as CollectionCase[];
  },

  async logEvent(
    caseId: string,
    eventType: string,
    actorUserId?: string,
    channel?: ContactChannel | null,
    note?: string | null
  ): Promise<CaseEvent> {
    const metadata = channel ? { channel } : {};
    const { data, error } = await db
      .from('estate_collection_case_events')
      .insert({
        collection_case_id: caseId,
        event_type: eventType,
        actor_user_id: actorUserId || null,
        note: note || null,
        metadata,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapEvent(data);
  },
};
