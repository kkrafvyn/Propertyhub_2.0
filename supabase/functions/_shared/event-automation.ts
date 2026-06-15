/** Event-driven automations — notifications & actions on platform events */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notifyUser } from './notifications.ts'

export interface AutomationContext {
  eventType: string
  userId?: string | null
  payload?: Record<string, unknown>
}

export async function runEventAutomations(admin: SupabaseClient, ctx: AutomationContext) {
  const { eventType, userId, payload = {} } = ctx
  if (!userId) return

  switch (eventType) {
    case 'payment.completed': {
      const purpose = String(payload.purpose ?? '')
      await notifyUser(admin, {
        userId,
        type: 'payment',
        title: 'Payment received',
        body: `Your ${purpose.replace(/_/g, ' ')} payment of GHS ${Number(payload.amount ?? 0).toLocaleString()} was successful.`,
        link: purpose === 'utility' ? '/renter/utilities' : '/renter/payments',
      })
      break
    }
    case 'utility.bill.generated': {
      await notifyUser(admin, {
        userId,
        type: 'utility',
        title: 'New utility bill',
        body: `A utility bill of GHS ${Number(payload.amount ?? 0).toLocaleString()} is ready.`,
        link: '/renter/utilities',
      })
      break
    }
    case 'utility.bill.paid': {
      await notifyUser(admin, {
        userId,
        type: 'utility',
        title: 'Utility bill paid',
        body: 'Your utility payment has been recorded. Thank you!',
        link: '/renter/utilities',
      })
      break
    }
    case 'booking.created': {
      await notifyUser(admin, {
        userId,
        type: 'booking',
        title: 'Booking confirmed',
        body: payload.utilities_mode === 'inclusive'
          ? 'Your stay is booked — all utilities included.'
          : 'Your long-term stay is booked — utility billing is active.',
        link: '/trips',
      })
      break
    }
    case 'tenant.risk_updated': {
      const band = String(payload.risk_band ?? 'standard')
      if (band === 'elevated' || band === 'high_risk') {
        await notifyUser(admin, {
          userId,
          type: 'credit',
          title: 'Housing credit update',
          body: `Your risk band is now "${band.replace(/_/g, ' ')}". Pay on time to improve your score.`,
          link: '/renter',
        })
      }
      break
    }
    default:
      break
  }
}
