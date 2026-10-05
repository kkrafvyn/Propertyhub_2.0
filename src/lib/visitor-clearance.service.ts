/**
 * BaytMiftah REOS — QR Visitor Gate Clearance & Security Kiosk Service
 * 
 * Generates time-limited QR access passes for estate guests, delivery drivers
 * (Bolt Food, Yango, Ghana Post), and contractors. Handles security gate validation,
 * automated resident voice/push notifications, and estate gate logbook auditing.
 */

import { supabase } from './supabase';

export type PassType = 'guest_visit' | 'delivery' | 'contractor' | 'resident_vehicle';
export type PassStatus = 'valid' | 'used' | 'expired' | 'revoked';

export interface VisitorPass {
  id: string;
  estateId: string;
  estateName: string;
  hostResidentName: string;
  hostUnitNumber: string; // e.g. "Villa 14"
  hostPhone: string;
  visitorName: string;
  visitorPhone?: string;
  passType: PassType;
  qrCodeToken: string; // e.g. "BM-GATE-849102"
  entryPin: string; // 6-digit backup PIN e.g. "849102"
  vehiclePlate?: string; // e.g. "GN-4892-24"
  validFrom: string;
  validUntil: string;
  status: PassStatus;
  checkInTime?: string;
  checkOutTime?: string;
  securityGuardName?: string;
  entryGate: string;
}

export function mapPassTypeToDb(passType: PassType): 'guest' | 'delivery' | 'contractor' | 'resident_vehicle' | 'maintenance' {
  if (passType === 'guest_visit') return 'guest';
  return passType;
}

export function mapDbPassType(passType: string): PassType {
  if (passType === 'guest') return 'guest_visit';
  if (passType === 'maintenance') return 'contractor';
  if (passType === 'delivery' || passType === 'contractor' || passType === 'resident_vehicle') return passType;
  return 'guest_visit';
}

export function mapDbPassStatus(status: string): PassStatus {
  if (status === 'active') return 'valid';
  if (status === 'used' || status === 'expired' || status === 'revoked') return status;
  return 'valid';
}

export function mapDbVisitorPass(row: any, estateName = '', unitIdentifier?: string): VisitorPass {
  return {
    id: row.id,
    estateId: row.estate_id,
    estateName,
    hostResidentName: row.host_name,
    hostUnitNumber: unitIdentifier || row.host_unit_id || 'Unit',
    hostPhone: '',
    visitorName: row.visitor_name,
    visitorPhone: row.visitor_phone || undefined,
    passType: mapDbPassType(row.pass_type),
    qrCodeToken: row.qr_payload,
    entryPin: row.pin_code,
    vehiclePlate: row.vehicle_plate || undefined,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: mapDbPassStatus(row.status),
    checkInTime: row.use_count > 0 ? row.updated_at : undefined,
    entryGate: 'Estate gate',
  };
}

export const liveVisitorClearanceService = {
  async listPasses(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await (supabase as any).from('estate_visitor_passes_safe').select('*').in('estate_id', estateIds).order('valid_until', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPass(input: {
    estateId: string;
    hostUnitId: string;
    visitorName: string;
    visitorPhone?: string;
    passType: PassType;
    vehiclePlate?: string;
    validHours?: number;
  }) {
    const { data, error } = await (supabase as any).rpc('create_staff_visitor_pass', {
      p_estate_id: input.estateId,
      p_host_unit_id: input.hostUnitId,
      p_visitor_name: input.visitorName.trim(),
      p_visitor_phone: input.visitorPhone?.trim() || null,
      p_pass_type: mapPassTypeToDb(input.passType),
      p_vehicle_plate: input.vehiclePlate?.trim() || null,
      p_valid_hours: input.validHours ?? null,
      p_max_uses: 1,
    });
    if (error) throw error;
    return data;
  },

  async verifyAndCheckIn(input: { estateId: string; tokenOrPin: string; guardUserId?: string; guardName?: string; method?: 'qr' | 'pin' }) {
    const cleaned = input.tokenOrPin.trim();
    if (!cleaned) throw new Error('QR token or PIN is required');
    const { data, error } = await (supabase as any).rpc('verify_estate_visitor_pass', {
      p_estate_id: input.estateId,
      p_token_or_pin: cleaned,
    });
    if (error) throw error;
    return data ?? { success: false, message: 'Invalid or already-used visitor pass.' };
  },
};
