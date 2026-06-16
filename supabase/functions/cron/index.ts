/** Scheduled jobs — analytics aggregation, utility billing (CRON_SECRET auth) */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { aggregateAnalyticsFacts } from '../_shared/analytics-aggregate.ts'
import { currentBillingMonth } from '../_shared/utilities.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { runEventAutomations } from '../_shared/event-automation.ts'
import { cronJobUrl } from '../_shared/platform-urls.ts'
import { runFraudScan } from '../_shared/fraud-scan.ts'
import { computeReputationScore } from '../_shared/reputation.ts'

function authorizeCron(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret) return false
  const auth = req.headers.get('Authorization') ?? ''
  if (auth === `Bearer ${secret}`) return true
  const header = req.headers.get('x-cron-secret')
  return header === secret
}

async function generateUtilityBills(admin: ReturnType<typeof createAdminClient>) {
  const month = currentBillingMonth()
  const { data: accounts } = await admin
    .from('utility_accounts')
    .select('*')
    .eq('active', true)
    .eq('utilities_mode', 'billed')

  let count = 0
  for (const account of accounts ?? []) {
    const { data: configs } = await admin
      .from('property_utilities')
      .select('*')
      .eq('property_id', account.property_id)
      .eq('enabled', true)

    for (const config of configs ?? []) {
      const billId = `ub-${crypto.randomUUID().slice(0, 8)}`
      const amount = Number(config.fixed_monthly_fee ?? 0) + Number(config.rate_per_unit ?? 0) * 50
      if (amount <= 0) continue

      const bill = {
        id: billId,
        utility_account_id: account.id,
        utility_type: config.utility_type,
        provider_name: config.provider_name,
        amount,
        usage_units: 50,
        billing_month: month,
        status: 'unpaid',
        due_date: new Date().toISOString().slice(0, 10),
      }
      const { error } = await admin.from('utility_bills').upsert(bill, { onConflict: 'id' })
      if (error) continue
      count++
      await emitPlatformEvent(admin, {
        eventType: 'utility.bill.generated',
        aggregateType: 'utility_bill',
        aggregateId: bill.id,
        actorId: account.user_id,
        payload: bill,
        idempotencyKey: `cron-bill-${bill.id}`,
      })
      if (account.user_id) {
        await runEventAutomations(admin, {
          eventType: 'utility.bill.generated',
          userId: account.user_id,
          payload: bill,
        })
      }
    }
  }
  return count
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'nightly'

  if (req.method === 'GET' && action === 'health') {
    return jsonResponse({
      ok: true,
      cron_configured: Boolean(Deno.env.get('CRON_SECRET')),
      nightly_url: cronJobUrl('nightly'),
      source: 'cron',
    })
  }

  if (req.method !== 'POST') {
    return errorResponse('POST required (except health check)', 405)
  }

  if (!authorizeCron(req)) {
    return errorResponse('Unauthorized — set CRON_SECRET and pass Bearer token', 401)
  }

  const admin = createAdminClient()

  try {
    if (action === 'nightly' || action === 'analytics') {
      const { data: regions } = await admin.from('market_regions').select('id').eq('active', true)
      const regionIds = regions?.map((r) => r.id) ?? ['africa_ghana']
      const results = []
      for (const regionId of regionIds) {
        results.push(await aggregateAnalyticsFacts(admin, regionId))
      }
      return jsonResponse({ ok: true, action: 'analytics', regions: results, source: 'cron' })
    }

    if (action === 'utility_billing') {
      const count = await generateUtilityBills(admin)
      return jsonResponse({ ok: true, action: 'utility_billing', bills_generated: count, source: 'cron' })
    }

    if (action === 'fraud_scan') {
      const result = await runFraudScan(admin)
      return jsonResponse({ ok: true, action: 'fraud_scan', ...result, source: 'cron' })
    }

    if (action === 'reputation_refresh') {
      const { data: users } = await admin.from('user_profiles').select('id').limit(100)
      let updated = 0
      for (const u of users ?? []) {
        await computeReputationScore(admin, u.id)
        updated++
      }
      return jsonResponse({ ok: true, action: 'reputation_refresh', updated, source: 'cron' })
    }

    if (action === 'nightly_full') {
      const { data: regions } = await admin.from('market_regions').select('id').eq('active', true)
      const regionIds = regions?.map((r) => r.id) ?? ['africa_ghana']
      const analytics = []
      for (const regionId of regionIds) {
        analytics.push(await aggregateAnalyticsFacts(admin, regionId))
      }
      const bills = await generateUtilityBills(admin)
      const fraud = await runFraudScan(admin)
      return jsonResponse({
        ok: true,
        action: 'nightly_full',
        analytics,
        bills_generated: bills,
        fraud,
        source: 'cron',
      })
    }

    return errorResponse('Unknown action. Use: nightly, analytics, utility_billing, fraud_scan, reputation_refresh, nightly_full', 404)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Cron job failed', 500)
  }
})
