import { supabase } from './supabase'

export const marketIntelligenceService = {
  // Get market analytics for a location
  async getMarketAnalytics(location: string, period = 'monthly', propertyType?: string) {
    let query = supabase
      .from('market_analytics')
      .select('*')
      .eq('location', location)
      .eq('period', period)
      .order('created_at', { ascending: false })
      .limit(12)
    
    if (propertyType) {
      query = query.eq('property_type', propertyType)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Calculate and store market analytics (run periodically)
  async calculateMarketAnalytics(location: string, propertyType: string, listingType: string) {
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        price,
        created_at,
        status,
        properties(category)
      `)
      .eq('status', 'listed')
      .eq('visibility', 'public')
    
    if (!listings || listings.length === 0) return null
    
    const prices = listings.map(l => l.price)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    
    // Calculate price trend (simplified)
    const recentListings = listings.filter(l => {
      const date = new Date(l.created_at)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return date > thirtyDaysAgo
    })
    
    const trend = recentListings.length > 0 ? 2.5 : -1.5
    
    const { data, error } = await supabase
      .from('market_analytics')
      .insert({
        period: 'monthly',
        location,
        property_type: propertyType,
        listing_type: listingType,
        avg_price: Math.round(avgPrice),
        median_price: Math.round(medianPrice),
        price_trend: trend,
        avg_listing_days: 30,
        occupancy_rate: 0.85,
        total_listings: listings.length,
        new_listings: recentListings.length,
        sold_listings: 0
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get location trends
  async getLocationTrends(city: string, region?: string) {
    let query = supabase
      .from('location_trends')
      .select('*')
      .eq('city', city)
    
    if (region) {
      query = query.eq('region', region)
    }
    
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data
  },

  // Update location trends
  async updateLocationTrends(city: string, region: string, trends: Partial<any>) {
    const { data, error } = await supabase
      .from('location_trends')
      .upsert({
        city,
        region,
        ...trends,
        updated_at: new Date().toISOString()
      }, { onConflict: 'city,region' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get organization insights
  async getOrganizationInsights(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    
    if (error) throw error
    return data || await this.createOrganizationInsights(organizationId)
  },

  // Create organization insights
  async createOrganizationInsights(organizationId: string) {
    // Calculate current stats
    const { data: listings } = await supabase
      .from('listings')
      .select('id, status')
      .eq('organization_id', organizationId)
    
    const activeListings = listings?.filter(l => l.status === 'listed').length || 0
    
    const { data, error } = await supabase
      .from('organization_insights')
      .insert({
        organization_id: organizationId,
        total_listings: listings?.length || 0,
        active_listings: activeListings,
        total_revenue: 0,
        conversion_rate: 0,
        avg_lead_quality: 0,
        response_time_hours: 0,
        customer_satisfaction_score: 0
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update organization insights (run periodically)
  async updateOrganizationInsights(organizationId: string) {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, status, created_at')
      .eq('organization_id', organizationId)
    
    const { data: dealCases } = await supabase
      .from('deal_cases')
      .select('status')
      .eq('organization_id', organizationId)
    
    const activeListings = listings?.filter(l => l.status === 'listed').length || 0
    const approvedCases = dealCases?.filter(d => d.status === 'approved').length || 0
    const conversionRate = listings && listings.length > 0 
      ? (approvedCases / listings.length) * 100 
      : 0
    
    const { data, error } = await supabase
      .from('organization_insights')
      .upsert({
        organization_id: organizationId,
        total_listings: listings?.length || 0,
        active_listings: activeListings,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get best performing listings
  async getBestPerformingListings(organizationId: string, limit = 10) {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        price,
        listing_type,
        status,
        created_at,
        property:properties(address, city, region),
        deal_cases(count)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  async getTopLocations(limit = 5) {
    const { data, error } = await supabase
      .from('location_trends')
      .select('*')
      .order('growth_rate', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  // Get market trends forecast (simplified)
  async getMarketForecast(location: string, forecastDays = 90) {
    // Get historical data
    const { data: analytics } = await supabase
      .from('market_analytics')
      .select('*')
      .eq('location', location)
      .order('created_at', { ascending: false })
      .limit(12)
    
    if (!analytics || analytics.length < 3) return null
    
    // Simple trend extrapolation
    const trend = analytics[0].price_trend || 0
    const forecast = []
    
    for (let i = 0; i < forecastDays; i += 30) {
      const daysAhead = i
      forecast.push({
        date: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
        predicted_avg_price: Math.round((analytics[0].avg_price || 0) * (1 + trend / 100)),
        confidence: 0.75
      })
    }
    
    return forecast
  },

  // Get demand heatmap
  async getDemandHeatmap(city: string, region?: string) {
    let query = supabase
      .from('heatmap_data')
      .select('*')
      .eq('city', city)
    
    if (region) {
      query = query.eq('region', region)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }
}
