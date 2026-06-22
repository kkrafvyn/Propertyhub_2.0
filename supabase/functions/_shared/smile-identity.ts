/** Smile Identity — hosted KYC links (Ghana / Africa). */

export type SmileConfig = {
  partnerId: string
  apiKey: string
  sandbox: boolean
  siteUrl: string
  companyName: string
  privacyUrl: string
  logoUrl?: string
}

export function getSmileConfig(): SmileConfig | null {
  const partnerId = Deno.env.get('SMILE_PARTNER_ID')?.trim()
  const apiKey = Deno.env.get('SMILE_API_KEY')?.trim()
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://phub-sigma.vercel.app').replace(/\/$/, '')
  if (!partnerId || !apiKey) return null
  return {
    partnerId,
    apiKey,
    sandbox: Deno.env.get('SMILE_SANDBOX') !== 'false',
    siteUrl,
    companyName: Deno.env.get('SMILE_COMPANY_NAME')?.trim() || 'BaytMiftah',
    privacyUrl: Deno.env.get('SMILE_PRIVACY_URL')?.trim() || `${siteUrl}/privacy`,
    logoUrl: Deno.env.get('SMILE_LOGO_URL')?.trim() || undefined,
  }
}

export function smileApiBase(sandbox: boolean) {
  return sandbox ? 'https://testapi.smileidentity.com' : 'https://api.smileidentity.com'
}

export async function generateSmileSignature(apiKey: string, partnerId: string, timestamp: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const message = `${timestamp}${partnerId}sid_request`
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export async function createSmileLink(opts: {
  config: SmileConfig
  userId: string
  jobId: string
  entityName: string
  callbackUrl: string
  redirectUrl: string
}) {
  const { config, userId, jobId, entityName, callbackUrl, redirectUrl } = opts
  const timestamp = new Date().toISOString()
  const signature = await generateSmileSignature(config.apiKey, config.partnerId, timestamp)
  const body: Record<string, unknown> = {
    partner_id: config.partnerId,
    signature,
    timestamp,
    name: `BaytMiftah KYC — ${entityName}`.slice(0, 80),
    company_name: config.companyName,
    data_privacy_policy_url: config.privacyUrl,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    is_single_use: true,
    user_id: userId,
    id_types: [
      {
        country: Deno.env.get('SMILE_ID_COUNTRY')?.trim() || 'GH',
        id_type: Deno.env.get('SMILE_ID_TYPE')?.trim() || 'GHANA_CARD',
        verification_method: Deno.env.get('SMILE_VERIFICATION_METHOD')?.trim() || 'doc_verification',
      },
    ],
    partner_params: {
      user_id: userId,
      job_id: jobId,
      kyc_record_id: jobId,
    },
  }
  if (config.logoUrl) body.logo_url = config.logoUrl

  const res = await fetch(`${smileApiBase(config.sandbox)}/v1/smile_links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = payload?.message || payload?.error || `Smile API ${res.status}`
    throw new Error(String(msg))
  }
  return {
    link: String(payload.link ?? payload.link_url ?? ''),
    refId: String(payload.ref_id ?? payload.refId ?? ''),
  }
}

/** Map Smile result codes to internal KYC status. */
export function mapSmileResultToKycStatus(resultCode: string | number | undefined) {
  const code = String(resultCode ?? '')
  if (code === '0810' || code.startsWith('081')) return 'verified'
  if (code.startsWith('09') || code === '0811') return 'rejected'
  return 'pending_review'
}
