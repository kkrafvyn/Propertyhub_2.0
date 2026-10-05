/**
 * BaytMiftah REOS â€” Utility Sub-Metering & Generator Fuel Split Service
 * 
 * Provides automated PURC Ghana tariff calculation (ECG electricity & GWCL water),
 * central standby generator diesel fuel split per unit/floor-area, OCR photo reading capture,
 * and automated Mobile Money utility invoice generation.
 */

import { supabase } from './supabase';

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
  unitOfMeasure: 'kWh' | 'mÂ³' | 'litres' | 'hours';
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
    unitOfMeasure: row.meter_type === 'gwcl_water' ? 'mÂ³' : row.meter_type === 'generator' ? 'hours' : 'kWh',
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

// â”€â”€ Ghana PURC Standard Utility Tariffs (Q3 2026 Reference) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    bandName: 'GWCL Residential (0 - 5 mÂ³)',
    minUnits: 0,
    maxUnits: 5,
    ratePerUnitGhs: 6.80,
    serviceChargeMonthlyGhs: 15.0,
    effectiveFrom: '2026-06-01',
  },
  {
    utilityType: 'water',
    bandName: 'GWCL Standard (6+ mÂ³)',
    minUnits: 6,
    maxUnits: 99999,
    ratePerUnitGhs: 11.50,
    serviceChargeMonthlyGhs: 25.0,
    effectiveFrom: '2026-06-01',
  },
];

/** Tariff helpers shared by the live utility sub-metering UI. */
export const utilitySubmeterService = {
  calculatePurcCharge,
};
