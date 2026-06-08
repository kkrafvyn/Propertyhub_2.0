import { callEdgeFunction } from './edge-client'

const highRiskWords = ['urgent cash', 'no documents', 'unverified', 'too good', 'wire only']

export function reviewListingQuality({
  formData,
  mediaCount = 0,
  documentCount = 0,
  checklist = [],
}) {
  const issues = []
  const suggestions = []
  const riskSignals = []

  if (!formData.title?.trim()) issues.push('Add a clear property title.')
  if ((formData.description || '').trim().length < 80) {
    issues.push('Expand the description with light, layout, privacy, and buyer fit.')
    suggestions.push('Add a sentence about views, materials, access, and nearby landmarks.')
  }
  if (!formData.location?.includes(',')) {
    issues.push('Use a specific city and district for location confidence.')
  }
  if (!Number(formData.price)) issues.push('Add a realistic asking price.')
  if (!Number(formData.sqft)) issues.push('Add measured floor area.')
  if (mediaCount < 3) suggestions.push('Upload at least 3 gallery images before publishing.')
  if (documentCount === 0) riskSignals.push('No ownership or mandate document staged.')

  const text = `${formData.title} ${formData.description}`.toLowerCase()
  highRiskWords.forEach((word) => {
    if (text.includes(word)) riskSignals.push(`Potentially risky phrase: "${word}".`)
  })

  const completedChecks = checklist.filter((item) => item.done).length
  const baseScore = Math.round((completedChecks / Math.max(checklist.length, 1)) * 70)
  const mediaScore = Math.min(mediaCount * 5, 15)
  const documentScore = documentCount > 0 ? 10 : 0
  const riskPenalty = riskSignals.length * 8
  const score = Math.max(15, Math.min(98, baseScore + mediaScore + documentScore - riskPenalty))

  const titleSuggestion = formData.location
    ? `${formData.type || 'Premium'} residence in ${formData.location.split(',')[0]}`
    : formData.title || 'Verified premium property listing'

  return {
    score,
    issues,
    suggestions,
    riskSignals,
    titleSuggestion,
    descriptionSuggestion:
      'Lead with the strongest buyer signal, then cover layout, finishes, location confidence, verification status, and viewing readiness.',
    adminReviewNote:
      riskSignals.length > 0
        ? `Review required: ${riskSignals.join(' ')}`
        : 'No major risk signals detected from the staged listing package.',
    source: 'local',
  }
}

export async function reviewListingQualityWithAI(payload) {
  try {
    return await callEdgeFunction('listing-ai', {
      method: 'POST',
      body: payload,
    })
  } catch (error) {
    return {
      ...reviewListingQuality(payload),
      source: 'local',
      error: error.message,
    }
  }
}

export default reviewListingQuality
