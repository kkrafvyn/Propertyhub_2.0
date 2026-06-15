/** Build Supabase Edge Function URLs for webhooks and cron */

export function getSupabaseProjectUrl(): string {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  return url.replace(/\/$/, '')
}

export function edgeFunctionUrl(fn: string, params?: Record<string, string>): string {
  const base = `${getSupabaseProjectUrl()}/functions/v1/${fn}`
  if (!params || !Object.keys(params).length) return base
  const qs = new URLSearchParams(params).toString()
  return `${base}?${qs}`
}

export function paymentWebhookUrls() {
  return {
    paystack: edgeFunctionUrl('payments', { action: 'webhook_paystack' }),
    stripe: edgeFunctionUrl('payments', { action: 'webhook_stripe' }),
    razorpay: edgeFunctionUrl('payments', { action: 'webhook_razorpay' }),
  }
}

export function cronJobUrl(action = 'nightly') {
  return edgeFunctionUrl('cron', { action })
}
