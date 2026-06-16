/** Rules-based lead scoring with optional OpenAI enrichment */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonCompletion } from './openai.ts'

export type LeadRow = {
  id?: string
  name?: string
  property?: string
  stage?: string
  value?: number
  phone?: string | null
  email?: string | null
  listing_id?: string | null
  source?: string | null
  buyer_user_id?: string | null
}

const STAGE_SCORE: Record<string, number> = {
  lead: 15,
  contacted: 30,
  viewing: 55,
  offer: 75,
  closed: 95,
}

export function scoreLeadRules(lead: LeadRow) {
  const factors: Record<string, number | string | boolean> = {}
  let score = STAGE_SCORE[lead.stage ?? 'lead'] ?? 15
  factors.stage = lead.stage ?? 'lead'

  if (lead.phone) { score += 8; factors.has_phone = true }
  if (lead.email) { score += 7; factors.has_email = true }
  if (lead.listing_id) { score += 12; factors.listing_linked = true }
  if (lead.buyer_user_id) { score += 10; factors.platform_user = true }

  const value = Number(lead.value ?? 0)
  if (value >= 1_000_000) { score += 12; factors.high_value = true }
  else if (value >= 100_000) { score += 6; factors.mid_value = true }

  const source = String(lead.source ?? '')
  if (source === 'viewing' || source === 'booking') { score += 15; factors.warm_source = true }
  if (source === 'referral') { score += 10; factors.referral = true }

  score = Math.min(100, Math.max(0, score))
  const band = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold'
  factors.band = band
  factors.method = 'rules'

  return { lead_score: score, score_factors: factors }
}

export async function scoreLeadWithAi(lead: LeadRow) {
  const rules = scoreLeadRules(lead)
  const ai = await jsonCompletion<{ score: number; reasons: string[] }>(
    'Score real estate CRM lead intent 0-100 for Ghana market. Return JSON { score, reasons: string[] }.',
    JSON.stringify({
      name: lead.name,
      property: lead.property,
      stage: lead.stage,
      value: lead.value,
      has_phone: Boolean(lead.phone),
      has_email: Boolean(lead.email),
      source: lead.source,
    }),
  )

  if (!ai?.score) return rules

  const blended = Math.round(rules.lead_score * 0.55 + Math.min(100, Math.max(0, ai.score)) * 0.45)
  return {
    lead_score: blended,
    score_factors: {
      ...rules.score_factors,
      method: 'rules+ai',
      ai_reasons: ai.reasons ?? [],
      rules_score: rules.lead_score,
      ai_score: ai.score,
    },
  }
}

export async function persistLeadScore(admin: SupabaseClient, leadId: string, agentId: string, scored: { lead_score: number; score_factors: Record<string, unknown> }) {
  await admin.from('agent_leads').update({
    lead_score: scored.lead_score,
    score_factors: scored.score_factors,
    scored_at: new Date().toISOString(),
  }).eq('id', leadId).eq('agent_id', agentId)
}
