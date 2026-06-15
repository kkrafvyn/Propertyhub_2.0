/** Utility Management Engine — billing calculations & stay rules */

export type UtilityType = 'electricity' | 'water' | 'internet' | 'gas'
export type BillingModel = 'metered' | 'flat' | 'prepaid'
export type StayType = 'short_term' | 'long_term'
export type UtilitiesMode = 'inclusive' | 'billed'

export const SHORT_STAY_MAX_DAYS = 30

export function daysBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function resolveStayType(checkIn: string, checkOut: string, maxDays = SHORT_STAY_MAX_DAYS): StayType {
  return daysBetween(checkIn, checkOut) < maxDays ? 'short_term' : 'long_term'
}

export function resolveUtilitiesMode(stayType: StayType): UtilitiesMode {
  return stayType === 'short_term' ? 'inclusive' : 'billed'
}

export function calculateMeteredBill(
  previousReading: number,
  currentReading: number,
  ratePerUnit: number,
): { unitsUsed: number; amount: number } {
  const unitsUsed = Math.max(0, currentReading - previousReading)
  const amount = Math.round(unitsUsed * ratePerUnit * 100) / 100
  return { unitsUsed, amount }
}

export function calculateFlatBill(fixedMonthlyFee: number): { unitsUsed: number | null; amount: number } {
  return { unitsUsed: null, amount: fixedMonthlyFee }
}

export function calculatePrepaidDeduction(
  unitsRemaining: number,
  unitsUsed: number,
): { unitsRemaining: number; amount: number; ratePerUnit: number } {
  const deducted = Math.min(unitsRemaining, unitsUsed)
  return {
    unitsRemaining: Math.max(0, unitsRemaining - unitsUsed),
    amount: deducted,
    ratePerUnit: 0,
  }
}

export interface PropertyUtilityRow {
  utility_type: UtilityType
  provider_name: string
  billing_model: BillingModel
  rate_per_unit: number
  fixed_monthly_fee: number
}

export function generateBillForUtility(
  config: PropertyUtilityRow,
  meter?: { previous_reading: number; current_reading: number },
): { amount: number; usage_units: number | null } {
  if (config.billing_model === 'flat') {
    const { amount, unitsUsed } = calculateFlatBill(Number(config.fixed_monthly_fee))
    return { amount, usage_units: unitsUsed }
  }
  if (config.billing_model === 'metered' && meter) {
    const { unitsUsed, amount } = calculateMeteredBill(
      Number(meter.previous_reading),
      Number(meter.current_reading),
      Number(config.rate_per_unit),
    )
    return { amount, usage_units: unitsUsed }
  }
  if (config.billing_model === 'prepaid') {
    return { amount: 0, usage_units: 0 }
  }
  return { amount: Number(config.fixed_monthly_fee), usage_units: null }
}

export function currentBillingMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function utilityTypeLabel(type: UtilityType, regionLabel?: string): string {
  if (regionLabel) return regionLabel
  const labels: Record<UtilityType, string> = {
    electricity: 'Electricity',
    water: 'Water',
    internet: 'Internet',
    gas: 'Gas',
  }
  return labels[type] ?? type
}

export interface UtilityAccountParams {
  userId: string
  propertyId: string
  leaseId?: string
  reservationId?: string
  utilitiesMode: UtilitiesMode
}

export function buildUtilityAccountRow(params: UtilityAccountParams) {
  return {
    id: `ua-${crypto.randomUUID().slice(0, 8)}`,
    user_id: params.userId,
    property_id: params.propertyId,
    lease_id: params.leaseId ?? null,
    reservation_id: params.reservationId ?? null,
    active: params.utilitiesMode === 'billed',
    utilities_mode: params.utilitiesMode,
  }
}
