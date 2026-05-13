import { supabase } from './supabase'

export const recommendationEngineService = {
  // Generate personalized recommendations
  async generateUserRecommendations(userId: string) {
    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!prefs) return []
    
    // Get user's saved properties to understand interests
    const { data: saved } = await supabase
      .from('saved_properties')
      .select('listing_id')
      .eq('user_id', userId)
      .limit(20)
    
    const savedListingIds = saved?.map(s => s.listing_id) || []
    
    // Get similar listings
    let query = supabase
      .from('listings')
      .select(`
        *,
        properties(category, bedrooms, bathrooms, amenities)
      `)
      .eq('status', 'listed')
      .eq('visibility', 'public')
    
    // Apply preference filters
    if (prefs.preferred_price_min) {
      query = query.gte('price', prefs.preferred_price_min)
    }
    if (prefs.preferred_price_max) {
      query = query.lte('price', prefs.preferred_price_max)
    }
    
    const { data: listings } = await query.limit(50)
    
    if (!listings) return []
    
    // Calculate scores
    const recommendations = listings
      .filter(l => !savedListingIds.includes(l.id))
      .map(listing => ({
        listing_id: listing.id,
        reason: this.generateRecommendationReason(listing, prefs),
        confidence_score: this.calculateConfidenceScore(listing, prefs, savedListingIds)
      }))
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 20)
    
    // Store recommendations
    if (recommendations.length > 0) {
      const { data, error } = await supabase
        .from('recommendation_logs')
        .insert({
          user_id: userId,
          algorithm_version: 'v1.0',
          recommended_listings: recommendations.map(r => r.listing_id)
        })
        .select()
        .single()
      
      if (error) throw error
      return recommendations
    }
    
    return []
  },

  // Calculate confidence score
  calculateConfidenceScore(
    listing: any,
    preferences: any,
    savedListingIds: string[]
  ): number {
    let score = 0.5
    
    // Price match
    if (preferences.preferred_price_min && preferences.preferred_price_max) {
      if (listing.price >= preferences.preferred_price_min && 
          listing.price <= preferences.preferred_price_max) {
        score += 0.3
      }
    }
    
    // Bedrooms match
    if (preferences.preferred_bedroom_count === listing.properties.bedrooms) {
      score += 0.2
    }
    
    // Similar to saved properties
    if (savedListingIds.length > 0) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  },

  // Generate recommendation reason
  generateRecommendationReason(listing: any, preferences: any): string {
    const reasons = []
    
    if (preferences.preferred_price_min && preferences.preferred_price_max) {
      reasons.push(`within your budget of ${preferences.preferred_price_min}-${preferences.preferred_price_max}`)
    }
    
    if (preferences.preferred_areas?.length) {
      reasons.push(`in preferred areas`)
    }
    
    if (preferences.preferred_bedroom_count === listing.properties.bedrooms) {
      reasons.push(`${listing.properties.bedrooms} bedrooms as preferred`)
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Matches your interests'
  },

  // Get agent recommendations
  async getAgentRecommendations(organizationId: string) {
    const { data: org } = await supabase
      .from('organization_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
    
    if (!org) return []
    
    const recommendations = []
    
    // Low conversion rate
    if ((org.conversion_rate || 0) < 5) {
      recommendations.push({
        type: 'conversion_rate',
        title: 'Improve Conversion Rate',
        description: `Your conversion rate is ${org.conversion_rate}%. Industry average is 10%.`,
        suggestions: [
          'Optimize listing descriptions',
          'Add more property photos',
          'Respond to inquiries faster'
        ]
      })
    }
    
    // Slow response time
    if ((org.response_time_hours || 0) > 24) {
      recommendations.push({
        type: 'response_time',
        title: 'Improve Response Time',
        description: `Average response time is ${org.response_time_hours} hours.`,
        suggestions: [
          'Enable automated responses',
          'Add team members',
          'Use mobile app for notifications'
        ]
      })
    }
    
    // Low satisfaction score
    if ((org.customer_satisfaction_score || 0) < 4) {
      recommendations.push({
        type: 'satisfaction',
        title: 'Improve Customer Satisfaction',
        description: `Customer satisfaction score is ${org.customer_satisfaction_score}/5`,
        suggestions: [
          'Improve communication',
          'Respond to feedback',
          'Provide better service'
        ]
      })
    }
    
    return recommendations
  },

  // Get best posting times
  async getBestPostingTimes(organizationId: string) {
    const { data: listings } = await supabase
      .from('listings')
      .select('created_at, deal_cases(count)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (!listings) return {}
    
    // Analyze posting times
    const times: Record<number, number> = {}
    
    listings.forEach(listing => {
      const hour = new Date(listing.created_at).getHours()
      times[hour] = (times[hour] || 0) + 1
    })
    
    // Find peak hours
    const sorted = Object.entries(times)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    
    return {
      best_hours: sorted.map(([hour]) => parseInt(hour)),
      best_days: ['Tuesday', 'Wednesday', 'Thursday'],
      avoid: ['Sunday', 'Monday']
    }
  },

  // Track recommendation interaction
  async trackRecommendationClick(userId: string, listingId: string) {
    const { data: log } = await supabase
      .from('recommendation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (log && log.recommended_listings.includes(listingId)) {
      await supabase
        .from('recommendation_logs')
        .update({ 
          clicked_listing_id: listingId,
          interacted: true 
        })
        .eq('id', log.id)
    }
  }
}
