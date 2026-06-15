import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { DEFAULT_REGION_ID } from '../_shared/plugins/types.ts'
import { loadRegionConfigFromDb } from '../_shared/plugins/registry.ts'
import {
  resolveStayType,
  resolveUtilitiesMode,
  generateBillForUtility,
  currentBillingMonth,
  buildUtilityAccountRow,
  type UtilityType,
} from '../_shared/utilities.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { runEventAutomations } from '../_shared/event-automation.ts'

async function createUtilityAccount(
  admin: ReturnType<typeof createAdminClient>,
  params: Parameters<typeof buildUtilityAccountRow>[0],
) {
  const row = buildUtilityAccountRow(params)
  const { error } = await admin.from('utility_accounts').insert(row)
  if (error) throw new Error(error.message)
  return row
}

async function generateBillsForAccount(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
  propertyId: string,
  month: string,
) {
  const { data: configs } = await admin
    .from('property_utilities')
    .select('*')
    .eq('property_id', propertyId)
    .eq('enabled', true)

  const bills = []
  for (const config of configs ?? []) {
    let meter = null
    if (config.billing_model === 'metered') {
      const { data: readings } = await admin
        .from('meter_readings')
        .select('*')
        .eq('utility_account_id', accountId)
        .eq('utility_type', config.utility_type)
        .order('reading_date', { ascending: false })
        .limit(1)
      if (readings?.[0]) {
        meter = readings[0]
      } else {
        meter = { previous_reading: 0, current_reading: 50 + Math.random() * 30 }
      }
    }

    const { amount, usage_units } = generateBillForUtility(config, meter ?? undefined)
    const billId = `ub-${crypto.randomUUID().slice(0, 8)}`
    const bill = {
      id: billId,
      utility_account_id: accountId,
      utility_type: config.utility_type,
      provider_name: config.provider_name,
      amount,
      usage_units,
      billing_month: month,
      status: 'unpaid',
      due_date: new Date().toISOString().slice(0, 10),
    }
    await admin.from('utility_bills').upsert(bill, { onConflict: 'id' })
    bills.push(bill)
  }
  return bills
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'providers') {
        const countryParam = url.searchParams.get('country')
        let country = countryParam ?? 'GH'
        if (!countryParam) {
          try {
            const cfg = await loadRegionConfigFromDb(admin, null, DEFAULT_REGION_ID)
            country = cfg.region.default_country
          } catch { /* keep GH fallback */ }
        }
        const { data } = await admin.from('utility_providers').select('*').eq('country', country).eq('active', true)
        return jsonResponse({ providers: data ?? [], country, source: 'supabase' })
      }

      if (action === 'property_config') {
        const propertyId = url.searchParams.get('property_id')
        if (!propertyId) return errorResponse('property_id required', 400)
        const { data } = await admin.from('property_utilities').select('*').eq('property_id', propertyId).eq('enabled', true)
        return jsonResponse({ utilities: data ?? [], source: 'supabase' })
      }

      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      if (action === 'dashboard') {
        const { data: accounts } = await admin.from('utility_accounts').select('*').eq('user_id', user.id).eq('active', true)
        const accountIds = (accounts ?? []).map((a) => a.id)
        let bills: unknown[] = []
        if (accountIds.length) {
          const { data } = await admin.from('utility_bills').select('*').in('utility_account_id', accountIds).order('created_at', { ascending: false })
          bills = data ?? []
        }
        const unpaid = bills.filter((b: { status: string }) => b.status === 'unpaid')
        const totalDue = unpaid.reduce((s: number, b: { amount: number }) => s + Number(b.amount), 0)
        return jsonResponse({
          accounts: accounts ?? [],
          bills,
          summary: { totalDue, unpaidCount: unpaid.length },
          source: 'supabase',
        })
      }

      if (action === 'bills') {
        const accountId = url.searchParams.get('account_id')
        let q = admin.from('utility_bills').select('*').order('billing_month', { ascending: false })
        if (accountId) q = q.eq('utility_account_id', accountId)
        const { data: accounts } = await admin.from('utility_accounts').select('id').eq('user_id', user.id)
        const ids = (accounts ?? []).map((a) => a.id)
        const { data } = await q.in('utility_account_id', ids)
        return jsonResponse({ bills: data ?? [], source: 'supabase' })
      }

      if (action === 'readings') {
        const accountId = url.searchParams.get('account_id')
        if (!accountId) return errorResponse('account_id required', 400)
        const { data } = await admin.from('meter_readings').select('*').eq('utility_account_id', accountId).order('reading_date', { ascending: false })
        return jsonResponse({ readings: data ?? [], source: 'supabase' })
      }

      if (action === 'prepaid_balances') {
        const accountId = url.searchParams.get('account_id')
        if (!accountId) return errorResponse('account_id required', 400)
        const { data } = await admin.from('utility_prepaid_balances').select('*').eq('utility_account_id', accountId)
        return jsonResponse({ balances: data ?? [], source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      const body = await req.json()

      if (body.action === 'provision_account') {
        const stayType = body.stay_type ?? resolveStayType(body.check_in, body.check_out)
        const utilitiesMode = resolveUtilitiesMode(stayType)
        if (utilitiesMode === 'inclusive') {
          return jsonResponse({ ok: true, utilities_mode: 'inclusive', account: null, message: 'Utilities included in stay price' })
        }
        const account = await createUtilityAccount(admin, {
          userId: body.user_id ?? user.id,
          propertyId: body.property_id,
          leaseId: body.lease_id,
          reservationId: body.reservation_id,
          utilitiesMode,
        })
        return jsonResponse({ ok: true, account, utilities_mode: utilitiesMode })
      }

      if (body.action === 'generate_bills') {
        const month = body.month ?? currentBillingMonth()
        const { data: accounts } = await admin
          .from('utility_accounts')
          .select('*')
          .eq('active', true)
          .eq('utilities_mode', 'billed')

        const allBills = []
        for (const account of accounts ?? []) {
          const bills = await generateBillsForAccount(admin, account.id, account.property_id, month)
          allBills.push(...bills)
          for (const bill of bills) {
            await emitPlatformEvent(admin, {
              eventType: 'utility.bill.generated',
              aggregateType: 'utility_bill',
              aggregateId: bill.id,
              actorId: account.user_id,
              payload: bill,
              idempotencyKey: `bill-gen-${bill.id}`,
            })
            await runEventAutomations(admin, {
              eventType: 'utility.bill.generated',
              userId: account.user_id,
              payload: bill,
            })
          }
        }
        return jsonResponse({ ok: true, bills: allBills, count: allBills.length })
      }

      if (body.action === 'record_reading') {
        const prev = Number(body.previous_reading ?? 0)
        const curr = Number(body.current_reading)
        const unitsUsed = Math.max(0, curr - prev)
        const row = {
          id: `mr-${crypto.randomUUID().slice(0, 8)}`,
          utility_account_id: body.utility_account_id,
          utility_type: body.utility_type as UtilityType,
          previous_reading: prev,
          current_reading: curr,
          units_used: unitsUsed,
          recorded_by: body.recorded_by ?? 'landlord',
          reading_date: body.reading_date ?? new Date().toISOString().slice(0, 10),
        }
        const { error } = await admin.from('meter_readings').insert(row)
        if (error) return errorResponse(error.message, 400)
        await emitPlatformEvent(admin, {
          eventType: 'utility.meter.updated',
          aggregateType: 'meter_reading',
          aggregateId: row.id,
          payload: row,
          idempotencyKey: `meter-${row.id}`,
        })
        return jsonResponse({ ok: true, reading: row })
      }

      if (body.action === 'mark_paid') {
        await admin.from('utility_bills').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: body.payment_id,
        }).eq('id', body.bill_id)
        await emitPlatformEvent(admin, {
          eventType: 'utility.bill.paid',
          aggregateType: 'utility_bill',
          aggregateId: body.bill_id,
          actorId: user.id,
          payload: { payment_id: body.payment_id },
          idempotencyKey: `bill-paid-${body.bill_id}`,
        })
        return jsonResponse({ ok: true, bill_id: body.bill_id })
      }

      if (body.action === 'pay_all') {
        const { data: accounts } = await admin.from('utility_accounts').select('id').eq('user_id', user.id)
        const ids = (accounts ?? []).map((a) => a.id)
        const { data: unpaid } = await admin.from('utility_bills').select('*').in('utility_account_id', ids).eq('status', 'unpaid')
        const total = (unpaid ?? []).reduce((s, b) => s + Number(b.amount), 0)
        return jsonResponse({ ok: true, bill_ids: (unpaid ?? []).map((b) => b.id), total, currency: 'GHS' })
      }

      if (body.action === 'prepaid_topup') {
        const units = Number(body.units)
        const amount = Number(body.amount ?? units * Number(body.rate_per_unit ?? 1.5))
        const row = {
          id: body.id ?? `upb-${crypto.randomUUID().slice(0, 8)}`,
          utility_account_id: body.utility_account_id,
          utility_type: body.utility_type ?? 'electricity',
          units_remaining: units,
          last_top_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { data: existing } = await admin
          .from('utility_prepaid_balances')
          .select('*')
          .eq('utility_account_id', body.utility_account_id)
          .eq('utility_type', row.utility_type)
          .maybeSingle()
        if (existing) {
          row.units_remaining = Number(existing.units_remaining) + units
          row.id = existing.id
        }
        await admin.from('utility_prepaid_balances').upsert(row, { onConflict: 'utility_account_id,utility_type' })
        await emitPlatformEvent(admin, {
          eventType: 'utility.prepaid.topped_up',
          aggregateType: 'utility_account',
          aggregateId: body.utility_account_id,
          actorId: user.id,
          payload: { utility_type: row.utility_type, units, amount },
          idempotencyKey: `prepaid-${row.id}-${Date.now()}`,
        })
        return jsonResponse({ ok: true, balance: row, amount, currency: body.currency ?? 'GHS' })
      }

      if (body.action === 'save_property_config') {
        const id = body.id ?? `pu-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          property_id: body.property_id,
          utility_type: body.utility_type,
          provider_id: body.provider_id,
          provider_name: body.provider_name,
          billing_model: body.billing_model,
          rate_per_unit: body.rate_per_unit ?? 0,
          fixed_monthly_fee: body.fixed_monthly_fee ?? 0,
          enabled: body.enabled ?? true,
          owner_id: user.id,
        }
        await admin.from('property_utilities').upsert(row)
        return jsonResponse({ ok: true, utility: row })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
