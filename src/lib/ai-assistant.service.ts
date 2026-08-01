import { supabase } from './supabase'
import { Database } from './database.types'
import { clientIntegrations } from './integrations'
import { AI_ASSISTANT_DISCLAIMER, TRUST_LABELS } from './legal-disclaimers'

export type AiSource = 'openai' | 'qwen' | 'local'

type AISearch = Database['public']['Tables']['ai_searches']['Row']
type AIRecommendation = Database['public']['Tables']['ai_recommendations']['Row']

function parseSearchQueryLocally(query: string) {
  const filters: Record<string, any> = {}
  const lower = query.toLowerCase()

  const priceMatch = query.match(/(?:under|below|less than)\s+(\d+)/i)
  if (priceMatch) filters.priceMax = parseInt(priceMatch[1])

  const priceRangeMatch = query.match(/(\d+).*to.*(\d+)/i)
  if (priceRangeMatch) {
    filters.priceMin = parseInt(priceRangeMatch[1])
    filters.priceMax = parseInt(priceRangeMatch[2])
  }

  const bedroomMatch = query.match(/(\d+)\s*(?:bed|br|bedroom)/i)
  if (bedroomMatch) filters.bedrooms = parseInt(bedroomMatch[1])

  const bathroomMatch = query.match(/(\d+)\s*(?:bath|bathroom)/i)
  if (bathroomMatch) filters.bathrooms = parseInt(bathroomMatch[1])

  if (/(rent|rental|monthly)/i.test(query)) filters.listingType = 'rental'
  if (/(lease|leasing)/i.test(query)) filters.listingType = 'lease'
  if (/(buy|sale|purchase|own)/i.test(query)) filters.listingType = 'sale'
  if (/(short stay|airbnb|nightly|weekend stay|vacation)/i.test(query)) filters.listingType = 'short_stay'

  if (/(apartment|flat|condo)/i.test(query)) filters.propertyType = 'apartment'
  if (/(house|home|villa|duplex)/i.test(query)) filters.propertyType = 'house'
  if (/(office|workspace)/i.test(query)) filters.propertyType = 'office'
  if (/(commercial|shop|retail)/i.test(query)) filters.propertyType = 'commercial'
  if (/(land|plot)/i.test(query)) filters.propertyType = 'land'

  const locations = ['legon', 'osu', 'cantonments', 'accra', 'kumasi', 'tema', 'east legon', 'airport']
  for (const loc of locations) {
    if (lower.includes(loc)) filters.location = loc
  }

  return filters
}

const FAQ_ENTRIES: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ['escrow', 'hold', 'release'],
    answer:
      `Payment holds may apply until agreed milestones are met. ${TRUST_LABELS.payment_hold.disclaimer}`,
  },
  {
    keywords: ['kyc', 'verify', 'verification', 'identity'],
    answer:
      `KYC helps confirm identity before high-value actions. Upload a government ID in Settings → Verification. ${TRUST_LABELS.id_checked.disclaimer}`,
  },
  {
    keywords: ['rent', 'lease', 'tenant'],
    answer:
      'For rentals, apply from the listing page, track your application in My BaytMiftah, and sign your lease digitally once approved. Rent schedules and maintenance requests are available in the Leases and Maintenance sections.',
  },
  {
    keywords: ['booking', 'short stay', 'check-in', 'guest'],
    answer:
      'Short-stay bookings can be instant or request-to-book depending on the host. After payment you receive confirmation, check-in instructions, and can message the host from Messages.',
  },
  {
    keywords: ['offer', 'purchase', 'buy', 'negotiate'],
    answer:
      'To buy a property, schedule a viewing, submit an offer from the listing page, and respond to counter-offers in your Applications workflow. Deposits and closing steps are tracked in Documents and Payments.',
  },
  {
    keywords: ['maintenance', 'repair', 'fix'],
    answer:
      'Tenants can submit maintenance requests with photos from My BaytMiftah → Maintenance. You will see status updates as the property manager assigns a vendor and completes the job.',
  },
  {
    keywords: ['refund', 'cancel', 'cancellation'],
    answer:
      'Cancellation and refund rules depend on the listing type and host/agency policy. Check your booking or deal case timeline for the applicable policy and contact support if you need help.',
  },
  {
    keywords: ['document', 'sign', 'lease agreement', 'contract'],
    answer:
      'Documents appear in My BaytMiftah → Documents grouped by folder. Pending items that require your signature are highlighted — open the document and use Sign when you are ready.',
  },
]

function pickFaqAnswer(question: string) {
  const lower = question.toLowerCase()
  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) {
      return entry.answer
    }
  }
  return null
}

function listingTypeLabel(listingType?: string) {
  switch (listingType) {
    case 'sale':
      return 'for sale'
    case 'lease':
      return 'for lease'
    case 'short_stay':
      return 'for short stays'
    default:
      return 'for rent'
  }
}

export const aiAssistantService = {
  async parseSearchQuery(query: string) {
    if (clientIntegrations.supabase.configured) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-search-query', {
          body: { query },
        })

        if (!error && data && typeof data === 'object' && 'filters' in data) {
          return (data as { filters: Record<string, unknown> }).filters
        }
      } catch (error) {
        console.warn('AI search edge function unavailable, using local parser:', error)
      }
    }

    return parseSearchQueryLocally(query)
  },

  // Log search query
  async logSearch(
    userId: string,
    organizationId: string | null,
    query: string,
    resultsCount?: number
  ) {
    const filters = await this.parseSearchQuery(query)
    
    const { data, error } = await supabase
      .from('ai_searches')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        query,
        parsed_filters: filters,
        results_count: resultsCount ?? null,
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getSearchHistory(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('ai_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getSavedSearches(userId: string) {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async saveSearch(params: {
    userId: string
    organizationId?: string | null
    name: string
    query: string
    filters: Record<string, any>
    alerts?: boolean
  }) {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: params.userId,
        organization_id: params.organizationId || null,
        name: params.name,
        query: params.query,
        filters: params.filters,
        alerts: params.alerts ?? false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteSavedSearch(savedSearchId: string) {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', savedSearchId)

    if (error) throw error
  },

  async toggleSavedSearchAlert(savedSearchId: string, alerts: boolean) {
    const { data, error } = await supabase
      .from('saved_searches')
      .update({
        alerts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', savedSearchId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get AI recommendations for user
  async getRecommendations(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select(`
        *,
        listing:listings(
          *,
          property:properties(*),
          organization:organizations(name, logo_url, verified)
        )
      `)
      .eq('user_id', userId)
      .order('confidence_score', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Generate recommendations based on user preferences
  async generateRecommendations(userId: string) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!prefs) return []
    
    // Find matching listings
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'listed')
      .eq('visibility', 'public')
    
    if (prefs.preferred_price_min) {
      query = query.gte('price', prefs.preferred_price_min)
    }
    if (prefs.preferred_price_max) {
      query = query.lte('price', prefs.preferred_price_max)
    }
    
    const { data: listings, error } = await query.limit(20)
    if (error) throw error
    
    // Create recommendations with confidence scores
    const recommendations = (listings || []).map(listing => ({
      user_id: userId,
      listing_id: listing.id,
      reason: `Matches your preferred criteria`,
      confidence_score: this.calculateMatchConfidence(listing, prefs)
    }))
    
    const { error: insertError } = await supabase
      .from('ai_recommendations')
      .insert(recommendations)
    
    if (insertError) throw insertError
    return recommendations
  },

  calculateMatchConfidence(listing: { price?: number | null }, preferences: Record<string, any>) {
    let score = 0.5

    if (
      preferences.preferred_price_min &&
      preferences.preferred_price_max &&
      listing.price != null &&
      listing.price >= preferences.preferred_price_min &&
      listing.price <= preferences.preferred_price_max
    ) {
      score += 0.35
    }

    return Math.min(Math.round(score * 100) / 100, 1)
  },

  // Track recommendation click
  async trackRecommendationClick(recommendationId: string) {
    const { error } = await supabase
      .from('ai_recommendations')
      .update({ clicked: true })
      .eq('id', recommendationId)
    
    if (error) throw error
  },

  // Update user preferences
  async updatePreferences(userId: string, preferences: Partial<any>) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  generateListingDescription(input: {
    address?: string
    city?: string
    region?: string
    category?: string
    bedrooms?: number | null
    bathrooms?: number | null
    squareMeters?: number | null
    amenities?: string[]
    listingType?: string
    price?: number | null
    currency?: string
  }) {
    const location = [input.address, input.city, input.region].filter(Boolean).join(', ') || 'Ghana'
    const category = input.category || 'property'
    const beds = input.bedrooms ? `${input.bedrooms}-bedroom ` : ''
    const baths = input.bathrooms ? `${input.bathrooms} bathroom` : ''
    const size = input.squareMeters ? `${input.squareMeters} sqm` : ''
    const amenityList = (input.amenities || []).filter(Boolean)
    const priceLine =
      input.price && input.price > 0
        ? `Listed ${listingTypeLabel(input.listingType)} at ${input.currency || 'GHS'} ${input.price.toLocaleString()}.`
        : `Available ${listingTypeLabel(input.listingType)}.`

    const paragraphs = [
      `Discover this ${beds}${category} ${listingTypeLabel(input.listingType)} in ${location}. ${priceLine}`,
      [
        beds && `${input.bedrooms} bedrooms`,
        baths,
        size,
      ]
        .filter(Boolean)
        .join(' · ') || 'Flexible layout with practical living space.',
      amenityList.length > 0
        ? `Highlights include ${amenityList.slice(0, 6).join(', ')}.`
        : 'Well positioned for convenient access to local amenities and transport.',
      'Contact the listing team to arrange a viewing or request more details.',
    ]

    return paragraphs.filter(Boolean).join('\n\n')
  },

  summarizeDocument(title: string, content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim()
    if (!normalized) {
      return `No readable content found in "${title}".`
    }

    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 24)

    const summaryPoints = (sentences.length > 0 ? sentences : [normalized]).slice(0, 4)
    const wordCount = normalized.split(/\s+/).length

    return [
      `Summary of "${title}" (${wordCount} words):`,
      ...summaryPoints.map((point, index) => `${index + 1}. ${point}`),
      summaryPoints.length >= 4
        ? 'Review the full document before signing or making a payment.'
        : 'Open the full document for complete terms and obligations.',
    ].join('\n')
  },

  answerFaq(question: string, context?: string) {
    const contextual = pickFaqAnswer(question)
    if (contextual) return `${contextual}\n\n${AI_ASSISTANT_DISCLAIMER}`

    if (context === 'documents') {
      return `Open Documents in My BaytMiftah to preview, download, or sign agreements. Ask about a specific document type such as lease, offer, or receipt.\n\n${AI_ASSISTANT_DISCLAIMER}`
    }

    if (context === 'payments') {
      return `Your wallet shows balances, payment holds, and transaction history. ${TRUST_LABELS.payment_hold.disclaimer}\n\n${AI_ASSISTANT_DISCLAIMER}`
    }

    if (context === 'maintenance') {
      return `Describe the issue, add photos if possible, and submit a maintenance request. Urgent issues like water leaks or security problems should be flagged in your message.\n\n${AI_ASSISTANT_DISCLAIMER}`
    }

    if (context === 'property') {
      return `Ask about neighborhood fit, commute, pricing, or next steps for this listing. You can schedule a viewing or message the host/agency directly from the property page.\n\n${AI_ASSISTANT_DISCLAIMER}`
    }

    if (context === 'kyc') {
      return `Use a clear photo of your Ghana Card, passport, or national ID with all corners visible. Match your legal name exactly, avoid glare, and prefer JPG/PNG. Reviews are typically completed within 1–2 business days. ${TRUST_LABELS.id_checked.disclaimer}\n\n${AI_ASSISTANT_DISCLAIMER}`
    }

    return `BaytMiftah AI can help with search, documents, payments, bookings, and maintenance. Try asking about verification, offers, leases, or refunds.\n\n${AI_ASSISTANT_DISCLAIMER}`
  },

  /** Ask the AI assistant (OpenAI when configured, local FAQ fallback otherwise). */
  async askAssistant(params: {
    message: string
    context?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }): Promise<{ answer: string; source: AiSource }> {
    if (clientIntegrations.supabase.configured) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: {
            action: 'chat',
            message: params.message,
            context: params.context,
            history: params.history,
          },
        })

        if (!error && data && typeof data === 'object' && 'answer' in data) {
          const payload = data as { answer: string; source?: AiSource }
          const source: AiSource =
            payload.source === 'openai' || payload.source === 'qwen'
              ? payload.source
              : 'local'
          return {
            answer: payload.answer,
            source,
          }
        }
      } catch (error) {
        console.warn('AI assistant edge function unavailable, using local FAQ:', error)
      }
    }

    return {
      answer: this.answerFaq(params.message, params.context),
      source: 'local',
    }
  },

  async generateListingDescriptionRemote(input: Parameters<typeof this.generateListingDescription>[0]) {
    if (clientIntegrations.ai.enhanced && clientIntegrations.supabase.configured) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: { action: 'describe_listing', listing: input },
        })
        if (!error && data && typeof data === 'object' && 'answer' in data) {
          return (data as { answer: string }).answer
        }
      } catch (error) {
        console.warn('Remote listing description failed, using template:', error)
      }
    }

    return this.generateListingDescription(input)
  },
}
