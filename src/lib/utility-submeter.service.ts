/**
 * BaytMiftah REOS — Utility Sub-Metering & Generator Fuel Split Service
 * 
 * Provides automated PURC Ghana tariff calculation (ECG electricity & GWCL water),
 * central standby generator diesel fuel split per unit/floor-area, OCR photo reading capture,
 * and automated Mobile Money utility invoice generation.
 */

import { supabase } from './supabase';
import { isDemoSimulationAllowed } from './simulation-mode';

export type UtilityType = 'electricity' | 'water' | 'generator_diesel' | 'solar_pv' | 'gas';

export interface UtilityMeter {
  id: string;
  estateId: string;
  estateName: string;
  unitId?: string;
  unitIdentifier?: string; // e.g. "Unit 302" or "Common Area Central"
  meterNumber: string;
  utilityType: UtilityType;
  meterModel: string; // e.g. "Holley Prepayment Meter" or "Zenner Multijet Water Meter"
  location: string;
  status: 'active' | 'tampered' | 'offline' | 'needs_calibration';
  lastReading: number;
  lastReadAt: string;
  unitOfMeasure: 'kWh' | 'm³' | 'litres' | 'hours';
  isCommonArea: boolean;
}

export interface MeterReadingRecord {
  id: string;
  meterId: string;
  meterNumber: string;
  unitIdentifier?: string;
  utilityType: UtilityType;
  previousReading: number;
  currentReading: number;
  consumption: number;
  tariffPerUnitGhs: number; // e.g. 1.85 GHS per kWh
  subtotalGhs: number;
  generatorFuelContributionGhs?: number;
  totalDueGhs: number;
  readAt: string;
  readBy: string;
  evidencePhotoUrl?: string;
  ocrConfidence?: number;
  invoiceStatus: 'draft' | 'issued' | 'paid_momo' | 'overdue';
  momoPaymentRef?: string;
}

export interface GeneratorFuelRun {
  id: string;
  estateId: string;
  runDate: string;
  startHours: number;
  endHours: number;
  hoursRun: number;
  litresConsumed: number;
  dieselPricePerLitreGhs: number; // e.g. 14.50 GHS
  totalFuelCostGhs: number;
  ecgOutageReason: string;
  splitMethod: 'by_floor_area' | 'equal_split' | 'by_kwh_consumption';
  chargePerUnitGhs: number;
}

export interface PurcTariffConfig {
  utilityType: UtilityType;
  bandName: string;
  minUnits: number;
  maxUnits: number;
  ratePerUnitGhs: number;
  serviceChargeMonthlyGhs: number;
  effectiveFrom: string;
}

const utilityDb = supabase as any;

export const liveUtilitySubmeterService = {
  async listMeters(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await utilityDb.from('estate_utility_meters').select('*').in('estate_id', estateIds).eq('is_active', true).order('serial_number');
    if (error) throw error;
    return data || [];
  },
  async listReadings(meterIds: string[]) {
    if (!meterIds.length) return [];
    const { data, error } = await utilityDb.from('estate_utility_meter_readings').select('*').in('meter_id', meterIds).order('reading_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async recordReading(input: { meterId: string; currentReading: number; recordedBy: string; readingDate?: string; photoUrl?: string; notes?: string }) {
    if (!Number.isFinite(input.currentReading) || input.currentReading < 0) throw new Error('A non-negative meter reading is required');
    const { data: meter, error: meterError } = await utilityDb.from('estate_utility_meters').select('id').eq('id', input.meterId).single();
    if (meterError || !meter) throw meterError || new Error('Meter not found');
    const { data: previous } = await utilityDb.from('estate_utility_meter_readings').select('current_reading').eq('meter_id', input.meterId).order('reading_date', { ascending: false }).limit(1).maybeSingle();
    if (previous && input.currentReading < Number(previous.current_reading)) throw new Error('Current reading cannot be lower than the previous reading');
    const { data, error } = await utilityDb.from('estate_utility_meter_readings').insert({ meter_id: input.meterId, current_reading: input.currentReading, previous_reading: Number(previous?.current_reading || 0), reading_date: input.readingDate || new Date().toISOString().slice(0, 10), recorded_by: input.recordedBy, photo_url: input.photoUrl || null, notes: input.notes?.trim() || null }).select('*').single();
    if (error) throw error;
    return data;
  },
  async listInvoices(unitId: string) {
    const { data, error } = await utilityDb.from('estate_utility_invoices').select('*').eq('unit_id', unitId).order('billing_period_end', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async listGeneratorRuns(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await utilityDb.from('estate_generator_runs').select('*').in('estate_id', estateIds).order('run_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async logGeneratorRun(input: {
    estateId: string;
    hoursRun: number;
    litresConsumed: number;
    dieselPricePerLitreGhs: number;
    notes?: string;
    occupiedUnits: number;
    recordedBy?: string;
  }) {
    if (input.hoursRun <= 0 || input.litresConsumed <= 0 || input.dieselPricePerLitreGhs <= 0) {
      throw new Error('Hours, litres, and diesel price must be greater than zero');
    }
    const occupied = Math.max(1, Math.round(input.occupiedUnits));
    const totalCostPesewas = Math.round(input.litresConsumed * input.dieselPricePerLitreGhs * 100);
    const costPerUnitPesewas = Math.max(1, Math.round(totalCostPesewas / occupied));
    const { data, error } = await utilityDb
      .from('estate_generator_runs')
      .insert({
        estate_id: input.estateId,
        runtime_hours: input.hoursRun,
        litres_consumed: input.litresConsumed,
        cost_per_litre_ghs: input.dieselPricePerLitreGhs,
        total_cost_pesewas: totalCostPesewas,
        occupied_units: occupied,
        cost_per_unit_pesewas: costPerUnitPesewas,
        notes: input.notes?.trim() || null,
        recorded_by: input.recordedBy || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  async issueInvoice(input: {
    readingId: string;
    meterId: string;
    unitId?: string;
    unitsConsumed: number;
    rateGhsPerUnit: number;
    amountPesewas: number;
    periodStart: string;
    periodEnd: string;
  }) {
    if (input.amountPesewas <= 0) throw new Error('Invoice amount must be greater than zero');
    const { data, error } = await utilityDb
      .from('estate_utility_invoices')
      .insert({
        reading_id: input.readingId,
        meter_id: input.meterId,
        unit_id: input.unitId || null,
        billing_period_start: input.periodStart,
        billing_period_end: input.periodEnd,
        units_consumed: input.unitsConsumed,
        rate_ghs_per_unit: input.rateGhsPerUnit,
        amount_pesewas: input.amountPesewas,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  async markInvoiceDispatched(invoiceId: string, momoReference?: string) {
    const { data, error } = await utilityDb
      .from('estate_utility_invoices')
      .update({
        momo_dispatch_status: 'dispatched',
        momo_reference: momoReference || null,
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

export function calculatePurcCharge(utilityType: UtilityType, units: number): { tariffRate: number; total: number } {
  const tariff = DEFAULT_PURC_TARIFFS.find(
    (t) => t.utilityType === utilityType && units >= t.minUnits && units <= t.maxUnits
  ) || DEFAULT_PURC_TARIFFS.find((t) => t.utilityType === utilityType) || {
    ratePerUnitGhs: 1.85,
    serviceChargeMonthlyGhs: 20.0,
  };

  const cost = units * tariff.ratePerUnitGhs + tariff.serviceChargeMonthlyGhs;
  return {
    tariffRate: tariff.ratePerUnitGhs,
    total: Math.round(cost * 100) / 100,
  };
}

function mapMeterType(meterType: string): UtilityType {
  if (meterType === 'gwcl_water') return 'water';
  if (meterType === 'generator') return 'generator_diesel';
  return 'electricity';
}

export function mapDbMeterToUtilityMeter(row: any, estateName = ''): UtilityMeter {
  return {
    id: row.id,
    estateId: row.estate_id,
    estateName,
    unitId: row.unit_id || undefined,
    unitIdentifier: row.label || row.serial_number,
    meterNumber: row.serial_number,
    utilityType: mapMeterType(row.meter_type),
    meterModel: row.tariff_band || 'Standard',
    location: row.label || 'Estate meter',
    status: row.is_active ? 'active' : 'offline',
    lastReading: 0,
    lastReadAt: row.created_at || new Date().toISOString(),
    unitOfMeasure: row.meter_type === 'gwcl_water' ? 'm³' : row.meter_type === 'generator' ? 'hours' : 'kWh',
    isCommonArea: !row.unit_id,
  };
}

export function mapDbGeneratorRun(row: any): GeneratorFuelRun {
  const totalFuelCostGhs = Number(row.total_cost_pesewas || 0) / 100;
  const occupied = Number(row.occupied_units || 1);
  return {
    id: row.id,
    estateId: row.estate_id,
    runDate: row.run_date,
    startHours: 0,
    endHours: Number(row.runtime_hours || 0),
    hoursRun: Number(row.runtime_hours || 0),
    litresConsumed: Number(row.litres_consumed || 0),
    dieselPricePerLitreGhs: Number(row.cost_per_litre_ghs || 0),
    totalFuelCostGhs,
    ecgOutageReason: row.notes || 'ECG outage',
    splitMethod: 'equal_split',
    chargePerUnitGhs: Number(row.cost_per_unit_pesewas || 0) / 100 || totalFuelCostGhs / Math.max(1, occupied),
  };
}

export async function loadOrganizationUtilityData(organizationId: string) {
  const { estateOperationsService } = await import('./estate-operations.service');
  const estates = await estateOperationsService.getEstates(organizationId);
  const estateIds = estates.map((estate) => estate.id);
  if (!estateIds.length) return { meters: [] as UtilityMeter[], readings: [] as MeterReadingRecord[], genRuns: [] as GeneratorFuelRun[], occupiedUnits: 0 };

  const units = await estateOperationsService.getUnits(estateIds);
  const occupancies = await estateOperationsService.getOccupancies(units.map((unit) => unit.id));
  const occupiedUnits = new Set(occupancies.filter((row) => !row.end_date && row.role === 'tenant').map((row) => row.unit_id)).size;

  const dbMeters = await liveUtilitySubmeterService.listMeters(estateIds);
  const estateNameById = new Map(estates.map((estate) => [estate.id, estate.name]));
  const meters = dbMeters.map((row: any) => mapDbMeterToUtilityMeter(row, estateNameById.get(row.estate_id) || ''));
  const meterIds = dbMeters.map((row: any) => row.id);
  const dbReadings = meterIds.length ? await liveUtilitySubmeterService.listReadings(meterIds) : [];
  const invoicesByMeter = new Map<string, any[]>();
  for (const meter of dbMeters) {
    if (meter.unit_id) {
      const invoices = await liveUtilitySubmeterService.listInvoices(meter.unit_id);
      invoicesByMeter.set(meter.id, invoices);
    }
  }

  const readings: MeterReadingRecord[] = dbReadings.map((row: any) => {
    const meter = meters.find((m) => m.id === row.meter_id);
    const consumption = Number(row.units_consumed) || Math.max(0, Number(row.current_reading) - Number(row.previous_reading));
    const { tariffRate, total } = calculatePurcCharge(meter?.utilityType || 'electricity', consumption);
    const invoice = (invoicesByMeter.get(row.meter_id) || []).find((inv: any) => inv.reading_id === row.id);
    return {
      id: row.id,
      meterId: row.meter_id,
      meterNumber: meter?.meterNumber || '',
      unitIdentifier: meter?.unitIdentifier,
      utilityType: meter?.utilityType || 'electricity',
      previousReading: Number(row.previous_reading) || 0,
      currentReading: Number(row.current_reading) || 0,
      consumption,
      tariffPerUnitGhs: invoice ? Number(invoice.rate_ghs_per_unit) : tariffRate,
      subtotalGhs: invoice ? Number(invoice.amount_pesewas) / 100 : total,
      totalDueGhs: invoice ? Number(invoice.amount_pesewas) / 100 : total,
      readAt: row.reading_date || row.created_at,
      readBy: row.recorded_by || 'System',
      evidencePhotoUrl: row.photo_url || undefined,
      ocrConfidence: row.ocr_confidence ? Number(row.ocr_confidence) : undefined,
      invoiceStatus: invoice?.momo_dispatch_status === 'paid' ? 'paid_momo' : invoice ? 'issued' : 'draft',
      momoPaymentRef: invoice?.momo_reference || undefined,
    };
  });

  const latestByMeter = new Map<string, MeterReadingRecord>();
  for (const reading of readings) {
    if (!latestByMeter.has(reading.meterId)) latestByMeter.set(reading.meterId, reading);
  }
  const metersWithReadings = meters.map((meter) => {
    const latest = latestByMeter.get(meter.id);
    return latest
      ? { ...meter, lastReading: latest.currentReading, lastReadAt: latest.readAt }
      : meter;
  });

  const dbRuns = await liveUtilitySubmeterService.listGeneratorRuns(estateIds);
  return { meters: metersWithReadings, readings, genRuns: dbRuns.map(mapDbGeneratorRun), occupiedUnits };
}

// ── Ghana PURC Standard Utility Tariffs (Q3 2026 Reference) ─────────────────
export const DEFAULT_PURC_TARIFFS: PurcTariffConfig[] = [
  {
    utilityType: 'electricity',
    bandName: 'Residential Lifeline (0 - 50 kWh)',
    minUnits: 0,
    maxUnits: 50,
    ratePerUnitGhs: 0.95,
    serviceChargeMonthlyGhs: 12.0,
    effectiveFrom: '2026-06-01',
  },
  {
    utilityType: 'electricity',
    bandName: 'Residential Standard (51 - 300 kWh)',
    minUnits: 51,
    maxUnits: 300,
    ratePerUnitGhs: 1.82,
    serviceChargeMonthlyGhs: 24.5,
    effectiveFrom: '2026-06-01',
  },
  {
    utilityType: 'electricity',
    bandName: 'Residential High-End / Estate (301+ kWh)',
    minUnits: 301,
    maxUnits: 99999,
    ratePerUnitGhs: 2.35,
    serviceChargeMonthlyGhs: 45.0,
    effectiveFrom: '2026-06-01',
  },
  {
    utilityType: 'water',
    bandName: 'GWCL Residential (0 - 5 m³)',
    minUnits: 0,
    maxUnits: 5,
    ratePerUnitGhs: 6.80,
    serviceChargeMonthlyGhs: 15.0,
    effectiveFrom: '2026-06-01',
  },
  {
    utilityType: 'water',
    bandName: 'GWCL Standard (6+ m³)',
    minUnits: 6,
    maxUnits: 99999,
    ratePerUnitGhs: 11.50,
    serviceChargeMonthlyGhs: 25.0,
    effectiveFrom: '2026-06-01',
  },
];

// Initial mock dataset for high-end Ghanaian estates
const MOCK_METERS: UtilityMeter[] = [
  {
    id: 'mtr_01',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    unitId: 'u_101',
    unitIdentifier: 'Villa 14',
    meterNumber: 'ECG-ACC-984210',
    utilityType: 'electricity',
    meterModel: 'Holley Smart STS Keypad',
    location: 'Exterior Distribution Board A',
    status: 'active',
    lastReading: 4820.5,
    lastReadAt: '2026-08-15T09:00:00Z',
    unitOfMeasure: 'kWh',
    isCommonArea: false,
  },
  {
    id: 'mtr_02',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    unitId: 'u_102',
    unitIdentifier: 'Villa 15',
    meterNumber: 'ECG-ACC-984211',
    utilityType: 'electricity',
    meterModel: 'Holley Smart STS Keypad',
    location: 'Exterior Distribution Board A',
    status: 'active',
    lastReading: 5190.2,
    lastReadAt: '2026-08-15T09:15:00Z',
    unitOfMeasure: 'kWh',
    isCommonArea: false,
  },
  {
    id: 'mtr_03',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    unitId: 'u_common',
    unitIdentifier: 'Central Common Facilities & Security Gate',
    meterNumber: 'ECG-ACC-COM-01',
    utilityType: 'electricity',
    meterModel: 'Schneider Electric PowerLogic',
    location: 'Main Substation Gate 1',
    status: 'active',
    lastReading: 12450.0,
    lastReadAt: '2026-08-15T08:30:00Z',
    unitOfMeasure: 'kWh',
    isCommonArea: true,
  },
  {
    id: 'mtr_04',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    unitId: 'u_101',
    unitIdentifier: 'Villa 14',
    meterNumber: 'GWCL-W-449102',
    utilityType: 'water',
    meterModel: 'Zenner Multijet Brass',
    location: 'Front Garden Boundary Pit',
    status: 'active',
    lastReading: 142.8,
    lastReadAt: '2026-08-15T09:05:00Z',
    unitOfMeasure: 'm³',
    isCommonArea: false,
  },
  {
    id: 'mtr_05',
    estateId: 'est_01',
    estateName: 'East Legon Hills Luxury Enclave',
    unitId: 'u_gen',
    unitIdentifier: 'Cat 350kVA Central Diesel Generator',
    meterNumber: 'GEN-CAT-350-01',
    utilityType: 'generator_diesel',
    meterModel: 'Deep Sea Electronics 7320 Controller',
    location: 'Generator Powerhouse Block B',
    status: 'active',
    lastReading: 894.0,
    lastReadAt: '2026-08-17T22:00:00Z',
    unitOfMeasure: 'hours',
    isCommonArea: true,
  },
];

const MOCK_READINGS: MeterReadingRecord[] = [
  {
    id: 'rdg_101',
    meterId: 'mtr_01',
    meterNumber: 'ECG-ACC-984210',
    unitIdentifier: 'Villa 14',
    utilityType: 'electricity',
    previousReading: 4520.0,
    currentReading: 4820.5,
    consumption: 300.5,
    tariffPerUnitGhs: 1.82,
    subtotalGhs: 546.91,
    generatorFuelContributionGhs: 185.0,
    totalDueGhs: 731.91,
    readAt: '2026-08-15T09:00:00Z',
    readBy: 'Emmanuel Addo (Facility Engineer)',
    evidencePhotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    ocrConfidence: 97.4,
    invoiceStatus: 'issued',
  },
  {
    id: 'rdg_102',
    meterId: 'mtr_04',
    meterNumber: 'GWCL-W-449102',
    unitIdentifier: 'Villa 14',
    utilityType: 'water',
    previousReading: 128.0,
    currentReading: 142.8,
    consumption: 14.8,
    tariffPerUnitGhs: 11.5,
    subtotalGhs: 170.2,
    totalDueGhs: 170.2,
    readAt: '2026-08-15T09:05:00Z',
    readBy: 'Emmanuel Addo (Facility Engineer)',
    ocrConfidence: 98.8,
    invoiceStatus: 'paid_momo',
    momoPaymentRef: 'MOMO-20260816-77821',
  },
];

const MOCK_GEN_RUNS: GeneratorFuelRun[] = [
  {
    id: 'gen_run_01',
    estateId: 'est_01',
    runDate: '2026-08-17',
    startHours: 888.0,
    endHours: 894.0,
    hoursRun: 6.0,
    litresConsumed: 210.0,
    dieselPricePerLitreGhs: 14.80,
    totalFuelCostGhs: 3108.0,
    ecgOutageReason: 'ECG 33kV Substation Feed Tripped during heavy rain',
    splitMethod: 'by_floor_area',
    chargePerUnitGhs: 194.25, // 3,108 GHS divided across 16 occupied units
  },
];
const DEMO_DATA_ENABLED = isDemoSimulationAllowed();

const STORAGE_METERS_KEY = 'bm_submeters_list';
const STORAGE_READINGS_KEY = 'bm_meter_readings_list';
const STORAGE_GEN_RUNS_KEY = 'bm_generator_runs_list';

export const utilitySubmeterService = {
  getMeters(): UtilityMeter[] {
    if (!DEMO_DATA_ENABLED || typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_METERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getReadings(): MeterReadingRecord[] {
    if (!DEMO_DATA_ENABLED || typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_READINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getGeneratorRuns(): GeneratorFuelRun[] {
    if (!DEMO_DATA_ENABLED || typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_GEN_RUNS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  calculatePurcCharge,

  recordReading(input: {
    meterId: string;
    currentReading: number;
    readBy: string;
    evidencePhotoUrl?: string;
    includeGeneratorSplit?: boolean;
    generatorFuelContributionGhs?: number;
  }): MeterReadingRecord {
    const meters = this.getMeters();
    const meter = meters.find((m) => m.id === input.meterId);
    if (!meter) throw new Error('Meter not found');

    const prevReading = meter.lastReading;
    const consumption = Math.max(0, Math.round((input.currentReading - prevReading) * 10) / 10);
    const { tariffRate, total: subtotal } = this.calculatePurcCharge(meter.utilityType, consumption);
    const genSplit = input.includeGeneratorSplit ? input.generatorFuelContributionGhs || 185.0 : 0;
    const totalDue = Math.round((subtotal + genSplit) * 100) / 100;

    const newReading: MeterReadingRecord = {
      id: `rdg_${Date.now()}`,
      meterId: meter.id,
      meterNumber: meter.meterNumber,
      unitIdentifier: meter.unitIdentifier,
      utilityType: meter.utilityType,
      previousReading: prevReading,
      currentReading: input.currentReading,
      consumption,
      tariffPerUnitGhs: tariffRate,
      subtotalGhs: subtotal,
      generatorFuelContributionGhs: genSplit > 0 ? genSplit : undefined,
      totalDueGhs: totalDue,
      readAt: new Date().toISOString(),
      readBy: input.readBy,
      evidencePhotoUrl: input.evidencePhotoUrl,
      ocrConfidence: 98.2,
      invoiceStatus: 'issued',
    };

    // Update meter last reading
    const updatedMeters = meters.map((m) =>
      m.id === meter.id
        ? {
            ...m,
            lastReading: input.currentReading,
            lastReadAt: new Date().toISOString(),
          }
        : m
    );

    const existingReadings = this.getReadings();
    const updatedReadings = [newReading, ...existingReadings];

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_METERS_KEY, JSON.stringify(updatedMeters));
      localStorage.setItem(STORAGE_READINGS_KEY, JSON.stringify(updatedReadings));
    }

    return newReading;
  },

  logGeneratorRun(input: {
    estateId: string;
    hoursRun: number;
    litresConsumed: number;
    dieselPricePerLitreGhs: number;
    ecgOutageReason: string;
    totalOccupiedUnits: number;
  }): GeneratorFuelRun {
    const totalCost = input.litresConsumed * input.dieselPricePerLitreGhs;
    const perUnit = Math.round((totalCost / Math.max(1, input.totalOccupiedUnits)) * 100) / 100;

    const newRun: GeneratorFuelRun = {
      id: `gen_run_${Date.now()}`,
      estateId: input.estateId,
      runDate: new Date().toISOString().slice(0, 10),
      startHours: 894.0,
      endHours: 894.0 + input.hoursRun,
      hoursRun: input.hoursRun,
      litresConsumed: input.litresConsumed,
      dieselPricePerLitreGhs: input.dieselPricePerLitreGhs,
      totalFuelCostGhs: Math.round(totalCost * 100) / 100,
      ecgOutageReason: input.ecgOutageReason,
      splitMethod: 'by_floor_area',
      chargePerUnitGhs: perUnit,
    };

    const existing = this.getGeneratorRuns();
    const updated = [newRun, ...existing];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GEN_RUNS_KEY, JSON.stringify(updated));
    }
    return newRun;
  },
};
