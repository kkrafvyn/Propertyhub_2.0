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

function generateGatePin() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
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

const MOCK_PASSES: VisitorPass[] = [
  {
    id: 'pass_01',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    hostResidentName: 'Dr. Kwame Boateng',
    hostUnitNumber: 'Villa 14',
    hostPhone: '+233 24 555 0192',
    visitorName: 'Kwesi Appiah (Bolt Food Delivery)',
    visitorPhone: '+233 50 882 1044',
    passType: 'delivery',
    qrCodeToken: 'BM-GATE-774910',
    entryPin: '774910',
    vehiclePlate: 'M-22-GR-9012',
    validFrom: '2026-08-18T18:00:00Z',
    validUntil: '2026-08-18T20:30:00Z',
    status: 'used',
    checkInTime: '2026-08-18T18:42:00Z',
    securityGuardName: 'Officer Ibrahim (Gate 1)',
    entryGate: 'Main West Gate',
  },
  {
    id: 'pass_02',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    hostResidentName: 'Mrs. Janet Osei',
    hostUnitNumber: 'Villa 08',
    hostPhone: '+233 20 119 4022',
    visitorName: 'David Mensah (AC Maintenance Technician)',
    visitorPhone: '+233 24 991 3044',
    passType: 'contractor',
    qrCodeToken: 'BM-GATE-391048',
    entryPin: '391048',
    vehiclePlate: 'GT-4019-21',
    validFrom: '2026-08-18T09:00:00Z',
    validUntil: '2026-08-18T18:00:00Z',
    status: 'valid',
    entryGate: 'Service Gate B',
  },
  {
    id: 'pass_03',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    hostResidentName: 'Kofi Mensah',
    hostUnitNumber: 'Villa 22',
    hostPhone: '+233 24 330 9912',
    visitorName: 'Akosua Frimpong (Dinner Guest)',
    visitorPhone: '+233 27 662 1099',
    passType: 'guest_visit',
    qrCodeToken: 'BM-GATE-902144',
    entryPin: '902144',
    vehiclePlate: 'GW-8921-25',
    validFrom: '2026-08-18T19:00:00Z',
    validUntil: '2026-08-18T23:59:00Z',
    status: 'valid',
    entryGate: 'Main West Gate',
  },
];


export const visitorClearanceService = {
  getPasses(): VisitorPass[] {
    throw new Error('Use liveVisitorClearanceService.listPasses for production gate passes.');
  },

  createPass(_input: {
    estateName?: string;
    hostResidentName: string;
    hostUnitNumber: string;
    hostPhone: string;
    visitorName: string;
    visitorPhone?: string;
    passType: PassType;
    vehiclePlate?: string;
    validHours?: number;
  }): VisitorPass {
    throw new Error('Use liveVisitorClearanceService.createPass for production gate passes.');
  },

  verifyAndCheckIn(_tokenOrPin: string, _guardName = 'Officer Mensah'): {
    success: boolean;
    pass?: VisitorPass;
    message: string;
  } {
    throw new Error('Use liveVisitorClearanceService.verifyAndCheckIn for production gate checks.');
  },
};
