import { supabase } from './supabase'
import { Database } from './database.types'
import { listingService } from './listing.service'

type AISearch = Database['public']['Tables']['ai_searches']['Row']
type AIRecommendation = Database['public']['Tables']['ai_recommendations']['Row']

export const aiAssistantService = {
  // Natural language search - parse user query into filters
  async parseSearchQuery(query: string) {
    // In production, integrate with Claude/GPT for NLP
    // This is a basic implementation showing the pattern
    const filters: Record<string, any> = {}
    
    // Simple keyword matching (replace with real NLP in production)
    const lower = query.toLowerCase()
    
    // Extract price range
    const priceMatch = query.match(/(?:under|below|less than)\s+(\d+)/i)
    if (priceMatch) filters.priceMax = parseInt(priceMatch[1])
    
    const priceRangeMatch = query.match(/(\d+).*to.*(\d+)/i)
    if (priceRangeMatch) {
      filters.priceMin = parseInt(priceRangeMatch[1])
      filters.priceMax = parseInt(priceRangeMatch[2])
    }
    
    // Extract bedrooms
    const bedroomMatch = query.match(/(\d+)\s*(?:bed|br|bedroom)/i)
    if (bedroomMatch) filters.bedrooms = parseInt(bedroomMatch[1])

    const bathroomMatch = query.match(/(\d+)\s*(?:bath|bathroom)/i)
    if (bathroomMatch) filters.bathrooms = parseInt(bathroomMatch[1])

    if (/(rent|rental|monthly)/i.test(query)) filters.listingType = 'rental'
    if (/(lease|leasing)/i.test(query)) filters.listingType = 'lease'
    if (/(buy|sale|purchase|own)/i.test(query)) filters.listingType = 'sale'

    if (/(apartment|flat|condo)/i.test(query)) filters.propertyType = 'apartment'
    if (/(house|home|villa|duplex)/i.test(query)) filters.propertyType = 'house'
    if (/(office|workspace)/i.test(query)) filters.propertyType = 'office'
    if (/(commercial|shop|retail)/i.test(query)) filters.propertyType = 'commercial'
    if (/(warehouse|storage|logistics)/i.test(query)) filters.propertyType = 'warehouse'
    if (/(car\s*park|carpark|parking|parking lot)/i.test(query)) filters.propertyType = 'car_park'
    if (/(office complex|business park|corporate campus)/i.test(query)) filters.propertyType = 'office_complex'
    if (/(land|plot)/i.test(query)) filters.propertyType = 'land'
    
    const locationSuggestions = await listingService.getLocationSuggestions(query, 8).catch(() => [])
    for (const suggestion of locationSuggestions) {
      const terms = [
        suggestion.label,
        suggestion.neighborhood,
        suggestion.city,
        suggestion.region,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())

      if (terms.some((term) => lower.includes(term))) {
        filters.location = suggestion.label
        break
      }
    }
    
    return filters
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
    const recommendations = listings.map(listing => ({
      user_id: userId,
      listing_id: listing.id,
      reason: `Matches your preferred criteria`,
      confidence_score: 0.85
    }))
    
    const { error: insertError } = await supabase
      .from('ai_recommendations')
      .insert(recommendations)
    
    if (insertError) throw insertError
    return recommendations
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
  }
}
