import { supabase } from '../lib/supabase'
import { createReferralInDb, fetchReferralByUserId } from '../lib/supabase-db'

function generateCode(name = 'BM') {
  const slug = String(name).replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'BM'
  return `${slug}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function getOrCreateReferralCode() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      let row = await fetchReferralByUserId(user.id)
      if (!row) {
        row = await createReferralInDb({
          referrerId: user.id,
          code: generateCode(user.user_metadata?.display_name || user.email),
        })
      }
      if (row) return { code: row.code, uses: row.uses ?? 0, source: 'supabase' }
    }
  }

  try {
    let code = localStorage.getItem('baytmiftah_referral_code')
    if (!code) {
      code = generateCode()
      localStorage.setItem('baytmiftah_referral_code', code)
    }
    const uses = Number(localStorage.getItem('baytmiftah_referral_uses') || 0)
    return { code, uses, source: 'local' }
  } catch {
    return { code: generateCode(), uses: 0, source: 'local' }
  }
}

export function referralLink(code) {
  const base = import.meta.env.VITE_SITE_URL || window.location.origin
  return `${base}/signup?ref=${encodeURIComponent(code)}`
}

export default { getOrCreateReferralCode, referralLink }
