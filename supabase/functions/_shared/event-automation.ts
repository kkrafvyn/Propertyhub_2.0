/** Event-driven automations — DB rules with hardcoded fallback */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { notifyUser } from './notifications.ts'

export interface AutomationContext {
  eventType: string
  userId?: string | null
  payload?: Record<string, unknown>
}

interface AutomationRule {
  id: string
  event_type: string
  action_type: string
  title_template: string
  body_template: string
  link_template: string | null
  condition: Record<string, unknown>
  enabled: boolean
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

function matchesCondition(rule: AutomationRule, payload: Record<string, unknown>): boolean {
  const cond = rule.condition ?? {}
  const bands = cond.risk_bands as string[] | undefined
  if (bands?.length) {
    const band = String(payload.risk_band ?? '')
    if (!bands.includes(band)) return false
  }
  return true
}

function payloadVars(eventType: string, payload: Record<string, unknown>): Record<string, string | number> {
  const purpose = String(payload.purpose ?? '').replace(/_/g, ' ')
  const utilitiesMessage = payload.utilities_mode === 'inclusive'
    ? 'all utilities included'
    : 'utility billing is active'
  return {
    purpose,
    amount: Number(payload.amount ?? 0),
    risk_band: String(payload.risk_band ?? '').replace(/_/g, ' '),
    utilities_message: utilitiesMessage,
  }
}

async function loadRules(admin: SupabaseClient, eventType: string): Promise<AutomationRule[]> {
  const { data } = await admin
    .from('event_automation_rules')
    .select('*')
    .eq('event_type', eventType)
    .eq('enabled', true)
    .order('priority', { ascending: false })

  return (data ?? []) as AutomationRule[]
}

async function runRule(
  admin: SupabaseClient,
  rule: AutomationRule,
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  if (rule.action_type !== 'notify_user') return

  const vars = payloadVars(eventType, payload)
  const title = interpolate(rule.title_template, vars)
  const body = interpolate(rule.body_template, vars)
  let link = rule.link_template ?? '/renter'
  if (String(payload.purpose) === 'utility' && eventType === 'payment.completed') {
    link = '/renter/utilities'
  }

  const typeMap: Record<string, string> = {
    'payment.completed': 'payment',
    'utility.bill.generated': 'utility',
    'utility.bill.paid': 'utility',
    'booking.created': 'booking',
    'tenant.risk_updated': 'credit',
    'iot.motion_detected': 'system',
    'iot.device_offline': 'system',
    'iot.leak_detected': 'system',
  }

  await notifyUser(admin, {
    userId,
    type: typeMap[eventType] ?? 'system',
    title,
    body,
    link,
  })
}

/** Hardcoded fallback when DB rules table is empty or unavailable */
async function runFallbackAutomations(admin: SupabaseClient, ctx: AutomationContext) {
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
          link: '/renter/credit',
        })
      }
      break
    }
    case 'iot.motion_detected':
    case 'iot.device_offline':
    case 'iot.leak_detected': {
      await notifyUser(admin, {
        userId,
        type: 'system',
        title: eventType.replace('iot.', '').replace(/[._]/g, ' '),
        body: payload.device_id ? `Device ${payload.device_id}` : 'Smart home alert',
        link: '/my-home',
      })
      break
    }
    default:
      break
  }
}

export async function runEventAutomations(admin: SupabaseClient, ctx: AutomationContext) {
  const { eventType, userId, payload = {} } = ctx
  if (!userId) return

  try {
    const rules = await loadRules(admin, eventType)
    if (rules.length === 0) {
      await runFallbackAutomations(admin, ctx)
      return
    }

    for (const rule of rules) {
      if (!matchesCondition(rule, payload)) continue
      await runRule(admin, rule, userId, eventType, payload)
    }
  } catch {
    await runFallbackAutomations(admin, ctx)
  }
}
