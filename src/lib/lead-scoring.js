const STAGE_SCORE = {
  lead: 15,
  contacted: 30,
  viewing: 55,
  offer: 75,
  closed: 95,
}

export function scoreLeadLocal(lead) {
  const factors = {}
  let score = STAGE_SCORE[lead.stage] ?? 15
  factors.stage = lead.stage ?? 'lead'
  if (lead.phone) { score += 8; factors.has_phone = true }
  if (lead.email) { score += 7; factors.has_email = true }
  if (lead.listing_id) { score += 12; factors.listing_linked = true }
  const value = Number(lead.value ?? 0)
  if (value >= 1_000_000) { score += 12; factors.high_value = true }
  else if (value >= 100_000) { score += 6; factors.mid_value = true }
  score = Math.min(100, Math.max(0, score))
  factors.band = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold'
  factors.method = 'rules'
  return { lead_score: score, score_factors: factors }
}

export function enrichLeadsWithScores(leads) {
  return leads.map((lead) => {
    if (lead.lead_score != null) return lead
    const scored = scoreLeadLocal(lead)
    return { ...lead, ...scored }
  })
}
