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

const MOCK_ARTISANS: VettedArtisan[] = [
  {
    id: 'art_01',
    fullName: 'Master Samuel Appiah',
    trade: 'plumber',
    rating: 4.9,
    jobsCompleted: 84,
    phone: '+233 24 881 9022',
    momoNetwork: 'MTN MoMo',
    momoNumber: '+233 24 881 9022',
    ghanaCardVerified: true,
    baseCalloutFeeGhs: 150.0,
  },
  {
    id: 'art_02',
    fullName: 'Ing. Daniel Ofori (Certified ECG Electrician)',
    trade: 'electrician',
    rating: 4.95,
    jobsCompleted: 112,
    phone: '+233 20 449 1044',
    momoNetwork: 'Telecel Cash',
    momoNumber: '+233 20 449 1044',
    ghanaCardVerified: true,
    baseCalloutFeeGhs: 200.0,
  },
  {
    id: 'art_03',
    fullName: 'Kelvin Tawiah (Carrier / Daikin Specialist)',
    trade: 'hvac_ac',
    rating: 4.85,
    jobsCompleted: 67,
    phone: '+233 50 112 8890',
    momoNetwork: 'MTN MoMo',
    momoNumber: '+233 50 112 8890',
    ghanaCardVerified: true,
    baseCalloutFeeGhs: 180.0,
  },
  {
    id: 'art_04',
    fullName: 'Master Kwadwo Boateng (Cat & Perkins Generator Tech)',
    trade: 'generator_tech',
    rating: 5.0,
    jobsCompleted: 45,
    phone: '+233 24 339 0182',
    momoNetwork: 'MTN MoMo',
    momoNumber: '+233 24 339 0182',
    ghanaCardVerified: true,
    baseCalloutFeeGhs: 250.0,
  },
];

const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo_101',
    title: 'Master Bathroom Shower Pressure & Mixer Valve Leak',
    description: 'Cold water pipe joint leaking behind tiles, causing low pressure to upper floor.',
    trade: 'plumber',
    estateName: 'East Legon Hills Luxury Enclave',
    unitIdentifier: 'Villa 14',
    reportedBy: 'Ama Ampomah (Tenant)',
    artisanId: 'art_01',
    artisanName: 'Master Samuel Appiah',
    artisanPhone: '+233 24 881 9022',
    artisanMomoNumber: '+233 24 881 9022',
    status: 'completed_pending_review',
    priority: 'urgent',
    estimatedCostGhs: 650.0,
    laborCostGhs: 250.0,
    materialsCostGhs: 400.0,
    finalCostGhs: 650.0,
    beforePhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&auto=format&fit=crop&q=80',
    reportedAt: '2026-08-17T10:00:00Z',
    completedAt: '2026-08-18T14:30:00Z',
  },
  {
    id: 'wo_102',
    title: 'Living Room 2.5HP Inverter AC Not Cooling',
    description: 'Compressor clicking on and off. Suspected R410A gas top-up or capacitor fault.',
    trade: 'hvac_ac',
    estateName: 'East Legon Hills Luxury Enclave',
    unitIdentifier: 'Villa 15',
    reportedBy: 'Kofi Mensah (Tenant)',
    artisanId: 'art_03',
    artisanName: 'Kelvin Tawiah',
    artisanPhone: '+233 50 112 8890',
    artisanMomoNumber: '+233 50 112 8890',
    status: 'in_progress',
    priority: 'high',
    estimatedCostGhs: 480.0,
    reportedAt: '2026-08-18T08:15:00Z',
  },
  {
    id: 'wo_103',
    title: 'Perimeter Security Solar Floodlights Tripping Breaker',
    description: 'West Gate solar invertor line shorting during evening switchover.',
    trade: 'electrician',
    estateName: 'East Legon Hills Luxury Enclave',
    unitIdentifier: 'Common Area Gate 1',
    reportedBy: 'Facility Team',
    status: 'new_ticket',
    priority: 'urgent',
    estimatedCostGhs: 350.0,
    reportedAt: '2026-08-18T16:00:00Z',
  },
];

const STORAGE_WORK_ORDERS_KEY = 'bm_work_orders_list';
const DEMO_DATA_ENABLED = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

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

  async releaseLivePayout(input: { workOrderId: string; artisanId: string; amountGhs: number; momoNumber: string; momoProvider: 'mtn' | 'telecel' | 'airteltigo'; initiatedBy: string }) {
    if (input.amountGhs <= 0) throw new Error('Payout amount must be greater than zero');
    const { data: release, error: releaseError } = await supabase.from('estate_momo_escrow_releases').insert({ work_order_id: input.workOrderId, artisan_id: input.artisanId, amount_pesewas: Math.round(input.amountGhs * 100), momo_number: input.momoNumber, momo_provider: input.momoProvider, initiated_by: input.initiatedBy, momo_status: 'pending' }).select('*').single();
    if (releaseError) throw releaseError;
    try {
      const result = await requestMomoPayment({ type: 'disbursement', amount: input.amountGhs, phone: input.momoNumber, workOrderId: input.workOrderId });
      const status = result.status === 'SUCCESSFUL' ? 'successful' : result.status === 'FAILED' ? 'failed' : 'submitted';
      await supabase.from('estate_momo_escrow_releases').update({ momo_status: status, provider_reference: result.referenceId, released_at: status === 'successful' ? new Date().toISOString() : null }).eq('id', release.id);
      if (status === 'successful') await supabase.from('estate_contractor_work_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', input.workOrderId);
      return { ...release, momo_status: status, provider_reference: result.referenceId };
    } catch (error) {
      await supabase.from('estate_momo_escrow_releases').update({ momo_status: 'failed', failure_reason: error instanceof Error ? error.message : 'Provider request failed' }).eq('id', release.id);
      throw error;
    }
  },

  getArtisans(): VettedArtisan[] {
    return DEMO_DATA_ENABLED ? MOCK_ARTISANS : [];
  },

  getWorkOrders(): WorkOrder[] {
    if (!DEMO_DATA_ENABLED || typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_WORK_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  createWorkOrder(input: {
    title: string;
    description: string;
    trade: ArtisanTrade;
    unitIdentifier: string;
    priority: WorkOrder['priority'];
    estimatedCostGhs: number;
    artisanId?: string;
  }): WorkOrder {
    if (!DEMO_DATA_ENABLED) throw new Error('Use the live estate contractor workflow for production dispatch.');
    const artisan = MOCK_ARTISANS.find((a) => a.id === input.artisanId);

    const newOrder: WorkOrder = {
      id: `wo_${Date.now()}`,
      title: input.title,
      description: input.description,
      trade: input.trade,
      estateName: 'East Legon Hills Luxury Enclave',
      unitIdentifier: input.unitIdentifier,
      reportedBy: 'Estate Manager',
      artisanId: artisan?.id,
      artisanName: artisan?.fullName,
      artisanPhone: artisan?.phone,
      artisanMomoNumber: artisan?.momoNumber,
      status: artisan ? 'dispatched' : 'new_ticket',
      priority: input.priority,
      estimatedCostGhs: input.estimatedCostGhs,
      reportedAt: new Date().toISOString(),
    };

    const existing = this.getWorkOrders();
    const updated = [newOrder, ...existing];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_WORK_ORDERS_KEY, JSON.stringify(updated));
    }
    return newOrder;
  },

  approveAndReleaseMoMo(orderId: string): WorkOrder {
    if (!DEMO_DATA_ENABLED) throw new Error('Use the live estate payment workflow for production payouts.');
    const list = this.getWorkOrders();
    const order = list.find((o) => o.id === orderId);
    if (!order) throw new Error('Work order not found');

    const updated: WorkOrder = {
      ...order,
      status: 'paid_via_momo',
      payoutReference: `MOMO-REL-${Date.now()}`,
    };

    const updatedList = list.map((o) => (o.id === order.id ? updated : o));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_WORK_ORDERS_KEY, JSON.stringify(updatedList));
    }
    return updated;
  },
};
