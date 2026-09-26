// Offline-First Field Inspection Engine Service
// Supports offline draft creation, IndexedDB / LocalStorage syncing, photo attachments, and deposit deduction math.

import { supabase } from './supabase';
import {
  INSPECTION_CATEGORIES,
  type InspectionCategoryKey,
} from './inspection-checklist.data';
import { secureId } from './secure-id';

export type InspectionCondition =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'damaged'
  | 'missing'
  | 'not_applicable';

export interface InspectionPhoto {
  id: string;
  url: string; // Base64 data URL when offline, CDN URL when synced
  timestamp: string;
  caption?: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface FieldInspectionItemState {
  id?: string;
  itemKey: string;
  category: InspectionCategoryKey;
  itemLabel: string;
  condition: InspectionCondition;
  isClean: boolean;
  isOperational: boolean;
  tenantLiability: boolean;
  estimatedRepairCostPesewas: number; // in GHS Pesewas
  damageDescription?: string;
  actionRequired: 'none' | 'cleaning' | 'repair' | 'replacement' | 'artisan_dispatch';
  photos: InspectionPhoto[];
}

export interface FieldInspectionDraft {
  id: string;
  offlineClientId: string;
  organizationId: string;
  propertyId?: string;
  listingId?: string;
  leaseId?: string;
  propertyName: string;
  inspectorId: string;
  inspectorName: string;
  tenantName: string;
  tenantPhone: string;
  inspectionType: 'move_in' | 'move_out' | 'routine' | 'pre_lease' | 'turnover' | 'emergency';
  status: 'draft' | 'in_progress' | 'pending_sync' | 'completed' | 'signed' | 'disputed';
  
  // Meter readings
  electricityMeterReading?: number;
  electricityMeterPhotoUrl?: string;
  waterMeterReading?: number;
  waterMeterPhotoUrl?: string;
  generatorHoursReading?: number;
  
  // Notes & Signatures
  inspectorNotes?: string;
  tenantNotes?: string;
  inspectorSignatureUrl?: string;
  inspectorSignedAt?: string;
  tenantSignatureUrl?: string;
  tenantSignedAt?: string;
  ghanaCardNumber?: string;
  
  // Financials & Deductions
  initialSecurityDepositPesewas: number;
  
  // GPS & device info
  gpsLatitude?: number;
  gpsLongitude?: number;
  
  // Items map
  items: Record<string, FieldInspectionItemState>;
  
  // Sync flags
  syncStatus: 'synced' | 'pending_offline' | 'syncing' | 'error';
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'baytmiftah_offline_inspection_';
const QUEUE_KEY = 'baytmiftah_offline_inspection_queue';

export const inspectionSyncService = {
  /**
   * Create a new blank inspection draft pre-filled with all 150 checklist points
   */
  createBlankInspection(params: {
    organizationId: string;
    propertyName: string;
    inspectorId: string;
    inspectorName: string;
    tenantName?: string;
    tenantPhone?: string;
    inspectionType: FieldInspectionDraft['inspectionType'];
    propertyId?: string;
    listingId?: string;
    leaseId?: string;
    initialSecurityDepositPesewas?: number;
  }): FieldInspectionDraft {
    const id = secureId('insp');
    const offlineClientId = secureId('device');
    const now = new Date().toISOString();

    const items: Record<string, FieldInspectionItemState> = {};

    INSPECTION_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => {
        items[item.key] = {
          itemKey: item.key,
          category: item.category,
          itemLabel: item.label,
          condition: 'good',
          isClean: true,
          isOperational: true,
          tenantLiability: false,
          estimatedRepairCostPesewas: 0,
          damageDescription: '',
          actionRequired: item.defaultAction,
          photos: [],
        };
      });
    });

    const draft: FieldInspectionDraft = {
      id,
      offlineClientId,
      organizationId: params.organizationId,
      propertyId: params.propertyId,
      listingId: params.listingId,
      leaseId: params.leaseId,
      propertyName: params.propertyName,
      inspectorId: params.inspectorId,
      inspectorName: params.inspectorName,
      tenantName: params.tenantName || '',
      tenantPhone: params.tenantPhone || '',
      inspectionType: params.inspectionType,
      status: 'draft',
      initialSecurityDepositPesewas: params.initialSecurityDepositPesewas || 0,
      items,
      syncStatus: 'pending_offline',
      createdAt: now,
      updatedAt: now,
    };

    this.saveLocalDraft(draft);
    return draft;
  },

  /**
   * Calculate summary metrics, score and deposit deduction
   */
  calculateInspectionSummary(draft: FieldInspectionDraft) {
    const itemList = Object.values(draft.items);
    const totalItems = itemList.length;

    let passedCount = 0;
    let damagedCount = 0;
    let totalDeductionsPesewas = 0;

    const deductions: Array<{ itemKey: string; label: string; costPesewas: number; description: string }> = [];

    itemList.forEach((item) => {
      if (item.condition === 'excellent' || item.condition === 'good') {
        passedCount++;
      } else if (item.condition === 'damaged' || item.condition === 'poor' || item.condition === 'missing') {
        damagedCount++;
        if (item.tenantLiability && item.estimatedRepairCostPesewas > 0) {
          totalDeductionsPesewas += item.estimatedRepairCostPesewas;
          deductions.push({
            itemKey: item.itemKey,
            label: item.itemLabel,
            costPesewas: item.estimatedRepairCostPesewas,
            description: item.damageDescription || `${item.condition.toUpperCase()} condition requiring ${item.actionRequired}`,
          });
        }
      }
    });

    const overallScore = totalItems > 0 ? Math.round((passedCount / totalItems) * 100) : 100;
    const netDepositRefundPesewas = Math.max(0, draft.initialSecurityDepositPesewas - totalDeductionsPesewas);

    return {
      totalItems,
      passedCount,
      damagedCount,
      overallScore,
      totalDeductionsPesewas,
      netDepositRefundPesewas,
      deductions,
    };
  },

  /**
   * Save draft to local browser storage
   */
  saveLocalDraft(draft: FieldInspectionDraft): void {
    try {
      draft.updatedAt = new Date().toISOString();
      const storageKey = `${STORAGE_KEY_PREFIX}${draft.id}`;
      localStorage.setItem(storageKey, JSON.stringify(draft));

      // Add to offline sync queue if pending
      const queue = this.getOfflineQueue();
      if (!queue.includes(draft.id)) {
        queue.push(draft.id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (e) {
      console.warn('Failed to save inspection draft to localStorage', e);
    }
  },

  /**
   * Retrieve a specific draft by ID
   */
  getLocalDraft(id: string): FieldInspectionDraft | null {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as FieldInspectionDraft;
    } catch {
      return null;
    }
  },

  /**
   * List all locally saved drafts
   */
  listLocalDrafts(organizationId?: string): FieldInspectionDraft[] {
    const drafts: FieldInspectionDraft[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw) as FieldInspectionDraft;
            if (!organizationId || draft.organizationId === organizationId) {
              drafts.push(draft);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read local inspection drafts', e);
    }

    return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  /**
   * Delete a local draft
   */
  deleteLocalDraft(id: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
      const queue = this.getOfflineQueue().filter((item) => item !== id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to remove draft', e);
    }
  },

  /**
   * Get queue of unsynced inspection IDs
   */
  getOfflineQueue(): string[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },

  /**
   * Synchronize an inspection draft to Supabase backend
   */
  async syncInspectionToCloud(draft: FieldInspectionDraft): Promise<{ success: boolean; error?: string }> {
    try {
      const summary = this.calculateInspectionSummary(draft);

      const payload = {
        organization_id: draft.organizationId,
        property_id: draft.propertyId || null,
        listing_id: draft.listingId || null,
        lease_id: draft.leaseId || null,
        inspector_name: draft.inspectorName,
        tenant_name: draft.tenantName || null,
        tenant_phone: draft.tenantPhone || null,
        inspection_type: draft.inspectionType,
        status: draft.status === 'draft' ? 'completed' : draft.status,
        completed_at: draft.status === 'completed' || draft.status === 'signed' ? new Date().toISOString() : null,
        electricity_meter_reading: draft.electricityMeterReading || null,
        electricity_meter_photo_url: draft.electricityMeterPhotoUrl || null,
        water_meter_reading: draft.waterMeterReading || null,
        water_meter_photo_url: draft.waterMeterPhotoUrl || null,
        generator_hours_reading: draft.generatorHoursReading || null,
        total_items_inspected: summary.totalItems,
        passed_items_count: summary.passedCount,
        damaged_items_count: summary.damagedCount,
        overall_condition_score: summary.overallScore,
        inspector_notes: draft.inspectorNotes || null,
        tenant_notes: draft.tenantNotes || null,
        initial_security_deposit_pesewas: draft.initialSecurityDepositPesewas,
        total_deductions_pesewas: summary.totalDeductionsPesewas,
        net_deposit_refund_pesewas: summary.netDepositRefundPesewas,
        deduction_summary: summary.deductions,
        offline_client_id: draft.offlineClientId,
        synced_at: new Date().toISOString(),
        inspector_signature_url: draft.inspectorSignatureUrl || null,
        inspector_signed_at: draft.inspectorSignedAt || null,
        tenant_signature_url: draft.tenantSignatureUrl || null,
        tenant_signed_at: draft.tenantSignedAt || null,
        ghana_card_number: draft.ghanaCardNumber || null,
        gps_latitude: draft.gpsLatitude || null,
        gps_longitude: draft.gpsLongitude || null,
      };

      const { data: inspectionRecord, error: inspError } = await supabase
        .from('field_inspections')
        .insert(payload)
        .select('id')
        .single();

      if (inspError) {
        throw inspError;
      }

      // Sync items
      if (inspectionRecord?.id) {
        const itemRows = Object.values(draft.items).map((item) => ({
          inspection_id: inspectionRecord.id,
          category: item.category,
          item_key: item.itemKey,
          item_label: item.itemLabel,
          condition: item.condition,
          is_clean: item.isClean,
          is_operational: item.isOperational,
          tenant_liability: item.tenantLiability,
          estimated_repair_cost_pesewas: item.estimatedRepairCostPesewas,
          damage_description: item.damageDescription || null,
          action_required: item.actionRequired,
          photos: item.photos,
        }));

        const { error: itemsError } = await supabase
          .from('field_inspection_items')
          .insert(itemRows);

        if (itemsError) {
          console.warn('Inspection items sync error:', itemsError);
        }
      }

      // Mark local draft as synced
      draft.syncStatus = 'synced';
      draft.lastSyncedAt = new Date().toISOString();
      this.saveLocalDraft(draft);

      // Remove from offline queue
      const queue = this.getOfflineQueue().filter((id) => id !== draft.id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      return { success: true };
    } catch (error: any) {
      console.warn('Sync failed, keeping in offline queue for retry', error);
      draft.syncStatus = 'error';
      this.saveLocalDraft(draft);
      return { success: false, error: error?.message || 'Network sync error' };
    }
  },

  /**
   * Sync all pending items in offline queue
   */
  async syncAllPendingQueue(): Promise<{ syncedCount: number; errorsCount: number }> {
    const queue = this.getOfflineQueue();
    let syncedCount = 0;
    let errorsCount = 0;

    for (const draftId of queue) {
      const draft = this.getLocalDraft(draftId);
      if (draft && draft.syncStatus !== 'synced') {
        const res = await this.syncInspectionToCloud(draft);
        if (res.success) {
          syncedCount++;
        } else {
          errorsCount++;
        }
      }
    }

    return { syncedCount, errorsCount };
  },
};
