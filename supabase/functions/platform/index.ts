import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { loadRegionConfigFromDb, buildFallbackRegionConfig } from '../_shared/plugins/registry.ts'
import { resolveRegionId, DEFAULT_REGION_ID, type WalletPurpose } from '../_shared/plugins/types.ts'
import { createPartnerApiKey, extractApiKey, verifyPartnerApiKey } from '../_shared/api-gateway.ts'
import { aggregateAnalyticsFacts } from '../_shared/analytics-aggregate.ts'
import { paymentWebhookUrls, cronJobUrl } from '../_shared/platform-urls.ts'

/** Production-scale service manifest — API Gateway routing map */
const ARCHITECTURE_LAYERS = {
  clients: ['Web App', 'Mobile App', 'Landlord Dashboard', 'Admin Console', 'Partner API'],
  gateway: {
    id: 'api_gateway',
    name: 'API Gateway',
    description: 'Auth, rate limit, routing — Supabase Edge Functions',
    path: '/functions/v1',
  },
  core: [
    { id: 'identity', name: 'Identity & Auth', fn: 'auth', capabilities: ['users', 'roles', 'capabilities'] },
    { id: 'property', name: 'Property Service', fn: 'marketplace', capabilities: ['listings', 'search', 'availability'] },
    { id: 'booking', name: 'Booking Service', fn: 'reservations', capabilities: ['short_stay', 'long_stay', 'module_activation'] },
    { id: 'utility', name: 'Utility Engine', fn: 'utilities', capabilities: ['metering', 'billing', 'prepaid', 'plugins'] },
    { id: 'payment', name: 'Payment Service', fn: 'payments', capabilities: ['rent', 'utility', 'escrow', 'multi_currency'] },
    { id: 'wallet', name: 'Wallet & Ledger', fn: 'wallet', capabilities: ['rent_wallet', 'utility_wallet', 'escrow'] },
    { id: 'ledger', name: 'Transaction Ledger', fn: 'platform', capabilities: ['append_only', 'idempotent', 'ACID'] },
    { id: 'tenant', name: 'Tenant Intelligence', fn: 'tenant', capabilities: ['credit_score', 'risk_band', 'deposit_calc'] },
  ],
  infrastructure: [
    { id: 'events', name: 'Event Bus', fn: 'events', capabilities: ['booking.created', 'payment.completed', 'utility.meter.updated'] },
    { id: 'notifications', name: 'Notification Service', fn: 'communications', capabilities: ['sms', 'email', 'push'] },
    { id: 'marketplace', name: 'Marketplace Services', fn: 'marketplace', capabilities: ['services', 'jobs'] },
    { id: 'intelligence', name: 'AI Intelligence', fn: 'intelligence', capabilities: ['pricing', 'fraud', 'valuation'] },
    { id: 'analytics', name: 'Analytics & Warehouse', fn: 'intelligence', capabilities: ['rent_trends', 'utility_benchmarks', 'default_rates'] },
  ],
  integrations: [
    { partner: 'Paystack', region: 'Africa', module: 'payment' },
    { partner: 'Stripe', region: 'US/EU', module: 'payment' },
    { partner: 'Razorpay', region: 'India', module: 'payment' },
    { partner: 'ECG / Manual', region: 'Ghana', module: 'utility' },
    { partner: 'Smart Meter APIs', region: 'EU', module: 'utility' },
    { partner: 'Twilio / Email', region: 'Global', module: 'communications' },
  ],
}

const CORE_SERVICES = [
  ...ARCHITECTURE_LAYERS.core,
  ...ARCHITECTURE_LAYERS.infrastructure,
].map((s) => ({
  id: s.id,
  name: s.name,
  path: `/functions/v1/${s.fn}`,
  capabilities: s.capabilities,
}))

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    const partnerKey = extractApiKey(req)
    if (partnerKey && action !== 'gateway' && action !== 'architecture' && action !== 'services') {
      const verified = await verifyPartnerApiKey(admin, partnerKey)
      if (!verified.ok) return errorResponse(verified.message, verified.status)
    }

    if (req.method === 'GET') {
      if (action === 'architecture') {
        return jsonResponse({
          ...ARCHITECTURE_LAYERS,
          philosophy: 'Everything is a service. Nothing is hardcoded per country.',
          booking_flow: 'Booking → Stay Type → Activates Modules (utilities off for short stay)',
          source: 'platform',
        })
      }

      if (action === 'gateway') {
        return jsonResponse({
          gateway: ARCHITECTURE_LAYERS.gateway,
          routes: CORE_SERVICES,
          auth: 'Bearer JWT via Supabase Auth',
          partner_auth: 'X-Api-Key: bm_live_…',
          webhooks: paymentWebhookUrls(),
          cron: { nightly: cronJobUrl('nightly_full'), auth: 'Bearer CRON_SECRET' },
          source: 'platform',
        })
      }

      if (action === 'services') {
        return jsonResponse({ services: CORE_SERVICES, architecture: 'api-first', source: 'platform' })
      }

      if (action === 'analytics') {
        const { data } = await admin.from('analytics_facts').select('*').order('recorded_at', { ascending: false }).limit(20)
        return jsonResponse({ facts: data ?? [], source: 'supabase' })
      }

      if (action === 'api_keys') {
        const user = await getUserFromRequest(req)
        if (!user) return errorResponse('Authentication required', 401)
        const { data } = await admin
          .from('platform_api_keys')
          .select('id, name, key_prefix, scopes, rate_limit_per_minute, last_used_at, active, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        return jsonResponse({ keys: data ?? [], source: 'supabase' })
      }

      if (action === 'regions') {
        const { data } = await admin.from('market_regions').select('*').eq('active', true).order('launch_phase')
        const regions = data?.length ? data : [buildFallbackRegionConfig(DEFAULT_REGION_ID).region]
        return jsonResponse({ regions, source: data?.length ? 'supabase' : 'fallback' })
      }

      const country = url.searchParams.get('country')
      const regionId = url.searchParams.get('region')
      const resolved = resolveRegionId(country, regionId)

      if (action === 'plugins' || action === 'resolve') {
        let config
        try {
          config = await loadRegionConfigFromDb(admin, country, regionId)
        } catch {
          config = buildFallbackRegionConfig(resolved)
        }

        if (action === 'plugins') {
          return jsonResponse({ region_id: resolved, modules: config.modules, source: 'supabase' })
        }

        return jsonResponse({
          region: config.region,
          plugins: config.modules,
          scaling: { strategy: 'region_by_region', tiers: ['africa', 'asia', 'western'], current: config.region.tier },
          source: 'supabase',
        })
      }

      return errorResponse('Unsupported action. Use: architecture, gateway, services, regions, plugins, resolve, analytics', 404)
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      const body = await req.json()

      if (body.action === 'ensure_wallets') {
        const purposes: WalletPurpose[] = body.purposes ?? ['general', 'rent', 'utility', 'escrow']
        const currency = body.currency ?? 'GHS'
        const wallets = []

        for (const purpose of purposes) {
          const id = `wal-${purpose.slice(0, 4)}-${user.id.slice(0, 8)}`
          const row = {
            id,
            owner_type: 'user',
            owner_id: user.id,
            currency,
            wallet_purpose: purpose,
            available_balance: 0,
            pending_balance: 0,
          }
          await admin.from('wallets').upsert(row, { onConflict: 'owner_type,owner_id,currency,wallet_purpose' })
          wallets.push(row)
        }

        return jsonResponse({ ok: true, wallets, source: 'supabase' })
      }

      if (body.action === 'create_api_key') {
        const result = await createPartnerApiKey(admin, user.id, body.name ?? 'Partner key', body.scopes ?? ['read'])
        return jsonResponse({ ok: true, ...result, message: 'Store this key securely — it will not be shown again.' })
      }

      if (body.action === 'revoke_api_key') {
        await admin.from('platform_api_keys').update({ active: false }).eq('id', body.key_id).eq('user_id', user.id)
        return jsonResponse({ ok: true, revoked: body.key_id })
      }

      if (body.action === 'aggregate_analytics') {
        const result = await aggregateAnalyticsFacts(admin, body.region_id ?? DEFAULT_REGION_ID)
        return jsonResponse({ ok: true, ...result, source: 'supabase' })
      }

      if (body.action === 'save_payout_rule') {
        const row = {
          property_id: body.property_id,
          owner_user_id: user.id,
          platform_fee_pct: Number(body.platform_fee_pct ?? 5),
          landlord_split_pct: Number(body.landlord_split_pct ?? 95),
          auto_payout: body.auto_payout ?? true,
        }
        await admin.from('property_payout_rules').upsert(row)
        return jsonResponse({ ok: true, rule: row })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
