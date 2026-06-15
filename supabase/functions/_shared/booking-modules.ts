/** Booking → stay type → module activation (property layer core rule) */

import type { StayType, UtilitiesMode } from './utilities.ts'
import { resolveUtilitiesMode } from './utilities.ts'
import type { createAdminClient } from './supabase.ts'

export interface ActivatedModules {
  utilities: 'off' | 'inclusive' | 'billed'
  utility_account: boolean
  meter_tracking: boolean
  billing_engine: boolean
  tenant_intelligence: boolean
  escrow: boolean
}

export function resolveActivatedModules(stayType: StayType, utilitiesMode: UtilitiesMode): ActivatedModules {
  if (stayType === 'short_term') {
    return {
      utilities: 'inclusive',
      utility_account: false,
      meter_tracking: false,
      billing_engine: false,
      tenant_intelligence: false,
      escrow: true,
    }
  }
  return {
    utilities: utilitiesMode === 'inclusive' ? 'inclusive' : 'billed',
    utility_account: utilitiesMode === 'billed',
    meter_tracking: utilitiesMode === 'billed',
    billing_engine: utilitiesMode === 'billed',
    tenant_intelligence: true,
    escrow: true,
  }
}

export async function persistModuleActivation(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    bookingType: 'reservation' | 'lease'
    bookingId: string
    stayType: StayType
    checkIn: string
    checkOut: string
  },
) {
  const utilitiesMode = resolveUtilitiesMode(params.stayType)
  const modules = resolveActivatedModules(params.stayType, utilitiesMode)
  const row = {
    id: `bma-${crypto.randomUUID().slice(0, 8)}`,
    booking_type: params.bookingType,
    booking_id: params.bookingId,
    stay_type: params.stayType,
    modules,
  }
  await admin.from('booking_module_activations').upsert(row, { onConflict: 'booking_type,booking_id' })
  return { modules, utilitiesMode }
}
