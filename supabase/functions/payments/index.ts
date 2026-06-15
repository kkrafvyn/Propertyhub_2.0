import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { createCheckout } from '../_shared/payments.ts'
import { checkoutViaAdapter } from '../_shared/plugins/payment-adapter.ts'
import { loadRegionConfigFromDb } from '../_shared/plugins/registry.ts'
import { handleStripeWebhook, handlePaystackWebhook, handleRazorpayWebhook } from '../_shared/webhooks.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { finalizePayment } from '../_shared/payment-completion.ts'
import { paymentWebhookUrls } from '../_shared/platform-urls.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const admin = createAdminClient()

  if (req.method === 'POST' && url.searchParams.get('action') === 'webhook_stripe') {
    const result = await handleStripeWebhook(req, admin)
    return jsonResponse({ received: result.ok }, result.status)
  }
  if (req.method === 'POST' && url.searchParams.get('action') === 'webhook_paystack') {
    const result = await handlePaystackWebhook(req, admin)
    return jsonResponse({ received: result.ok }, result.status)
  }
  if (req.method === 'POST' && url.searchParams.get('action') === 'webhook_razorpay') {
    const result = await handleRazorpayWebhook(req, admin)
    return jsonResponse({ received: result.ok }, result.status)
  }

  if (req.method === 'GET') {
    const action = url.searchParams.get('action')
    if (action === 'config') {
      const stripe = Boolean(Deno.env.get('STRIPE_SECRET_KEY'))
      const paystack = Boolean(Deno.env.get('PAYSTACK_SECRET_KEY'))
      const razorpay = Boolean(Deno.env.get('RAZORPAY_KEY_SECRET'))
      return jsonResponse({
        stripe,
        paystack,
        razorpay,
        ready: stripe || paystack || razorpay,
        ussd: paystack,
        site_url: Deno.env.get('SITE_URL') ?? null,
        webhooks: paymentWebhookUrls(),
        webhook_events: {
          paystack: ['charge.success'],
          stripe: ['checkout.session.completed'],
          razorpay: ['payment.captured', 'payment_link.paid'],
        },
      })
    }
    if (action === 'insurance') {
      const { data } = await admin.from('insurance_products').select('*')
      const products = (data ?? []).map((r) => ({
        id: r.id, name: r.name, provider: r.provider, premium: r.premium, coverage: r.coverage,
      }))
      return jsonResponse({ products, source: 'supabase' })
    }
    if (action === 'mortgage_partners') {
      const { data } = await admin.from('mortgage_partners').select('*')
      return jsonResponse({ partners: data ?? [], source: 'supabase' })
    }
  }

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  try {
    if (req.method === 'GET') {
      const action = url.searchParams.get('action')

      if (action === 'history') {
        const { data } = await admin.from('payment_records').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
        return jsonResponse({ payments: data ?? [], source: 'supabase' })
      }

      if (action === 'finance_dashboard') {
        const { data: escrow } = await admin.from('escrow_accounts').select('funded')
        const escrowTotal = escrow?.reduce((s, e) => s + Number(e.funded ?? 0), 0) ?? 0
        const { count } = await admin.from('commission_settlements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        const { count: partners } = await admin.from('mortgage_partners').select('*', { count: 'exact', head: true })
        return jsonResponse({
          summary: { escrowTotal, pendingCommissions: count ?? 0, mortgagePartners: partners ?? 0 },
          source: 'supabase',
        })
      }

      if (action === 'escrow') {
        const { data } = await admin.from('escrow_accounts').select('*')
        const escrow = (data ?? []).map((r) => ({
          id: r.id, property: r.property, amount: r.amount, funded: r.funded, status: r.status, provider: r.provider,
        }))
        return jsonResponse({ escrow, source: 'supabase' })
      }

      if (action === 'commissions') {
        const { data } = await admin.from('commission_settlements').select('*')
        const settlements = (data ?? []).map((r) => ({
          id: r.id, agent: r.agent_name, property: r.property, amount: r.amount, status: r.status, provider: r.provider, paidAt: r.paid_at,
        }))
        return jsonResponse({ settlements, source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'ussd_initiate') {
        const ussd = body.ussd_code ?? `*713*33*${String(body.payment_id ?? '').slice(-8)}#`
        await admin.from('payment_records').insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          purpose: 'rent_ussd',
          amount: Number(body.amount) || 0,
          currency: 'GHS',
          provider: 'paystack_ussd',
          status: 'pending',
          metadata: { payment_id: body.payment_id, phone: body.phone, ussd_code: ussd },
        }).catch((e) => console.error('ussd record failed', e.message))
        return jsonResponse({
          ok: true,
          ussd,
          message: 'Dial the USSD code on your phone to complete mobile money payment.',
        })
      }

      if (body.action === 'insurance_quote') {
        const propertyValue = Number(body.property_value) || 500000
        const premium = Math.round(propertyValue * 0.0025)
        const { data } = await admin.from('insurance_quotes').insert({
          user_id: user.id,
          product_id: body.product_id,
          property_value: propertyValue,
          coverage_type: body.coverage_type ?? 'building',
          premium_estimate: premium,
          status: 'quoted',
        }).select('*').single()
        return jsonResponse({ ok: true, quote: data ?? { premium_estimate: premium, status: 'quoted' } })
      }

      if (body.action === 'create_checkout' || body.action === 'create_boost') {
        const purpose = body.action === 'create_boost' ? 'featured_boost' : body.purpose
        const amount = Number(body.amount) || (body.action === 'create_boost' ? 299 : 0)
        const currency = body.currency ?? 'GHS'
        let regionConfig
        try {
          regionConfig = await loadRegionConfigFromDb(admin, body.country, body.region_id)
        } catch {
          regionConfig = null
        }
        const provider = (body.provider ?? (currency === 'INR' ? 'razorpay' : currency === 'GHS' ? 'paystack' : 'stripe')) as 'stripe' | 'paystack' | 'razorpay'

        if (!amount || amount <= 0) return errorResponse('Invalid amount')

        const recordId = crypto.randomUUID()
        const baseSuccess = body.success_path ?? '/payments/success'
        const successPath = `${baseSuccess}${baseSuccess.includes('?') ? '&' : '?'}payment_id=${recordId}`
        const metadata = {
          purpose,
          payment_id: recordId,
          ...(body.metadata ?? {}),
          listing_id: body.listing_id ?? body.metadata?.listing_id,
          rent_payment_id: body.metadata?.rent_payment_id ?? body.rent_payment_id,
          settlement_id: body.metadata?.settlement_id,
          escrow_id: body.metadata?.escrow_id,
          bill_id: body.metadata?.bill_id,
          bill_ids: body.metadata?.bill_ids,
        }

        const checkout = regionConfig
          ? await checkoutViaAdapter(regionConfig, {
              purpose,
              amount,
              currency,
              userId: user.id,
              userEmail: user.email ?? 'user@baytmiftah.com',
              metadata,
              successPath,
              cancelPath: body.cancel_path ?? '/payments/cancel',
            }, provider === 'razorpay' || provider === 'paystack' || provider === 'stripe' ? provider : undefined)
          : await createCheckout({
              purpose,
              amount,
              currency,
              provider,
              userId: user.id,
              userEmail: user.email ?? 'user@baytmiftah.com',
              metadata,
              successPath,
              cancelPath: body.cancel_path ?? '/payments/cancel',
            })

        const record = {
          id: recordId,
          user_id: user.id,
          purpose,
          amount,
          currency,
          provider: checkout?.provider ?? provider,
          provider_ref: checkout?.provider_ref ?? null,
          status: checkout ? 'pending' : 'demo',
          metadata,
        }

        await admin.from('payment_records').insert(record).catch((e) => console.error('payment record insert failed', e.message))

        await emitPlatformEvent(admin, {
          eventType: 'payment.initiated',
          aggregateType: 'payment',
          aggregateId: record.id,
          actorId: user.id,
          payload: { purpose, amount, currency, provider: record.provider },
          idempotencyKey: `payment-init-${record.id}`,
        })

        if (checkout?.checkout_url) {
          return jsonResponse({ ok: true, checkout_url: checkout.checkout_url, provider: checkout.provider, payment_id: record.id })
        }

        return jsonResponse({
          ok: true, checkout_url: null, provider, payment_id: record.id,
          message: 'Payment queued — set STRIPE_SECRET_KEY and PAYSTACK_SECRET_KEY in Edge Function secrets.',
        })
      }

      if (body.action === 'confirm_checkout' || body.action === 'confirm_demo') {
        const paymentId = body.payment_id
        if (!paymentId) return errorResponse('payment_id required', 400)
        const result = await finalizePayment(admin, {
          paymentId,
          userId: user.id,
          metadata: { payment_id: paymentId, ...(body.metadata ?? {}) },
        })
        return jsonResponse({ ok: result.ok, payment_id: paymentId, status: 'completed', already_done: result.alreadyDone })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
