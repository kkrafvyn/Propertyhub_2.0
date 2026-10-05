/**
 * BaytMiftah REOS — Contractor MoMo Dispatch & Work Order Suite Service
 * 
 * Manages vetted Ghanaian artisans (Plumbers, Electricians, HVAC, Painters),
 * work order dispatch with GPS coordinates, before/after photo inspection verification,
 * and automated Mobile Money (MTN MoMo / Telecel Cash) escrow payout release.
 */

import { supabase } from './supabase';
import { requestMomoPayment } from './momo-payment.service';

export type ArtisanTrade = 'plumber' | 'electrician' | 'hvac_ac' | 'painter' | 'carpenter' | 'masonry' | 'generator_tech';

export type WorkOrderStatus = 'new_ticket' | 'dispatched' | 'in_progress' | 'completed_pending_review' | 'paid_via_momo';

export interface VettedArtisan {
  id: string;
  fullName: string;
  trade: ArtisanTrade;
  rating: number; // e.g. 4.9
  jobsCompleted: number;
  phone: string;
  momoNetwork: 'MTN MoMo' | 'Telecel Cash' | 'AT Money';
  momoNumber: string;
  ghanaCardVerified: boolean;
  baseCalloutFeeGhs: number; // e.g. 150 GHS
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  trade: ArtisanTrade;
  estateName: string;
  unitIdentifier: string; // e.g. "Villa 14"
  reportedBy: string; // Tenant or Facility Manager
  artisanId?: string;
  artisanName?: string;
  artisanPhone?: string;
  artisanMomoNumber?: string;
  status: WorkOrderStatus;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedCostGhs: number;
  finalCostGhs?: number;
  materialsCostGhs?: number;
  laborCostGhs?: number;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  materialsReceiptUrl?: string;
  reportedAt: string;
  completedAt?: string;
  payoutReference?: string;
}

export const contractorDispatchService = {
  async getLiveArtisans(estateIds: string[]): Promise<VettedArtisan[]> {
    if (!estateIds.length) return [];
    const { data, error } = await supabase.from('estate_artisans').select('*').in('estate_id', estateIds).eq('is_active', true).order('rating', { ascending: false });
    if (error) throw error;
    return (data || []).map((artisan: any) => ({ id: artisan.id, fullName: artisan.full_name, trade: artisan.trade === 'hvac' ? 'hvac_ac' : artisan.trade, rating: Number(artisan.rating || 0), jobsCompleted: artisan.jobs_completed || 0, phone: artisan.phone, momoNetwork: artisan.momo_provider === 'telecel' ? 'Telecel Cash' : artisan.momo_provider === 'airteltigo' ? 'AT Money' : 'MTN MoMo', momoNumber: artisan.momo_number || artisan.phone, ghanaCardVerified: Boolean(artisan.ghana_card_verified), baseCalloutFeeGhs: 0 }));
  },

  async getLiveWorkOrders(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await supabase.from('estate_contractor_work_orders').select('*, artisan:estate_artisans(*)').in('estate_id', estateIds).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  mapLiveWorkOrder(order: any, estateName = ''): WorkOrder {
    return {
      id: order.id,
      title: order.title,
      description: order.description || '',
      trade: order.trade === 'hvac' ? 'hvac_ac' : order.trade,
      estateName,
      unitIdentifier: order.unit_identifier || order.unit_id || 'Common area',
      reportedBy: 'Estate operations',
      artisanId: order.artisan_id,
      artisanName: order.artisan?.full_name,
      artisanPhone: order.artisan?.phone,
      artisanMomoNumber: order.artisan?.momo_number,
      status:
        order.status === 'paid'
          ? 'paid_via_momo'
          : order.status === 'inspection_review' || order.status === 'completed'
            ? 'completed_pending_review'
            : order.status === 'in_progress'
              ? 'in_progress'
              : order.status === 'assigned'
                ? 'dispatched'
                : 'new_ticket',
      priority: order.priority === 'emergency' ? 'urgent' : order.priority,
      estimatedCostGhs: Number(order.estimate_pesewas || 0) / 100,
      finalCostGhs: order.final_cost_pesewas ? Number(order.final_cost_pesewas) / 100 : undefined,
      beforePhotoUrl: order.before_photo_url || undefined,
      afterPhotoUrl: order.after_photo_url || undefined,
      reportedAt: order.created_at,
      completedAt: order.completed_at || undefined,
      payoutReference: order.payout_reference || undefined,
    };
  },

  async createLiveWorkOrder(input: {
    estateId: string;
    title: string;
    description: string;
    trade: ArtisanTrade;
    unitId?: string;
    artisanId?: string;
    priority: WorkOrder['priority'];
    estimatedCostGhs: number;
    createdBy?: string;
  }) {
    const trade = input.trade === 'hvac_ac' ? 'hvac' : input.trade;
    const priority = input.priority === 'urgent' ? 'emergency' : input.priority;
    const estimatePesewas = Math.round(Math.max(0, input.estimatedCostGhs) * 100);
    const { data, error } = await (supabase as any)
      .from('estate_contractor_work_orders')
      .insert({
        estate_id: input.estateId,
        unit_id: input.unitId || null,
        artisan_id: input.artisanId || null,
        title: input.title.trim(),
        description: input.description.trim() || null,
        trade,
        priority,
        status: input.artisanId ? 'assigned' : 'new',
        estimate_pesewas: estimatePesewas || null,
        assigned_at: input.artisanId ? new Date().toISOString() : null,
        created_by: input.createdBy || null,
      })
      .select('*, artisan:estate_artisans(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async releaseLivePayout(input: { workOrderId: string; organizationId: string; artisanId: string; amountGhs: number; momoNumber: string; momoProvider: 'mtn' | 'telecel' | 'airteltigo'; initiatedBy: string }) {
    if (!input.organizationId?.trim()) throw new Error('organizationId is required for PayAngels payouts');
    if (input.amountGhs <= 0) throw new Error('Payout amount must be greater than zero');
    const { data: release, error: releaseError } = await supabase.from('estate_momo_escrow_releases').insert({ work_order_id: input.workOrderId, artisan_id: input.artisanId, amount_pesewas: Math.round(input.amountGhs * 100), momo_number: input.momoNumber, momo_provider: input.momoProvider, initiated_by: input.initiatedBy, momo_status: 'pending' }).select('*').single();
    if (releaseError) throw releaseError;
    try {
      const result = await requestMomoPayment({
        type: 'disbursement',
        amount: input.amountGhs,
        phone: input.momoNumber,
        workOrderId: input.workOrderId,
        organizationId: input.organizationId.trim(),
      });
      const status = result.status === 'SUCCESSFUL' ? 'successful' : result.status === 'FAILED' ? 'failed' : 'submitted';
      await supabase.from('estate_momo_escrow_releases').update({ momo_status: status, provider_reference: result.referenceId, released_at: status === 'successful' ? new Date().toISOString() : null }).eq('id', release.id);
      if (status === 'successful') await supabase.from('estate_contractor_work_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', input.workOrderId);
      return { ...release, momo_status: status, provider_reference: result.referenceId };
    } catch (error) {
      await supabase.from('estate_momo_escrow_releases').update({ momo_status: 'failed', failure_reason: error instanceof Error ? error.message : 'Provider request failed' }).eq('id', release.id);
      throw error;
    }
  },
};
