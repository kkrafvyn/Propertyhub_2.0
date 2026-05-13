import { supabase } from './supabase'

export const geointelligenceService = {
  // Get location scores
  async getLocationScore(city: string, region: string) {
    const { data, error } = await supabase
      .from('location_scores')
      .select('*')
      .eq('city', city)
      .eq('region', region)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    return data || {
      safety_score: 0,
      investment_score: 0,
      accessibility_score: 0,
      overall_score: 0
    }
  },

  // Calculate location score
  async calculateLocationScore(city: string, region: string, latitude: number, longitude: number) {
    // In production: use external APIs (Google Places, crime data, etc.)
    const scores = {
      safety_score: 3.5 + Math.random(),
      investment_score: 3.8 + Math.random(),
      accessibility_score: 4.0 + Math.random(),
      walkability_score: 3.6 + Math.random(),
      school_proximity_score: 3.9 + Math.random(),
      healthcare_proximity_score: 4.1 + Math.random()
    }
    
    const overall = (
      scores.safety_score +
      scores.investment_score +
      scores.accessibility_score +
      scores.walkability_score +
      scores.school_proximity_score +
      scores.healthcare_proximity_score
    ) / 6
    
    const { data, error } = await supabase
      .from('location_scores')
      .upsert({
        city,
        region,
        latitude,
        longitude,
        ...scores,
        overall_score: Math.round(overall * 100) / 100,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)
      .eq('region', region)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get nearby services
  async getNearbyServices(propertyId: string, serviceTypes?: string[]) {
    let query = supabase
      .from('nearby_services')
      .select('*')
      .eq('property_id', propertyId)
    
    if (serviceTypes && serviceTypes.length > 0) {
      query = query.in('service_type', serviceTypes)
    }
    
    const { data, error } = await query.order('distance_meters')
    if (error) throw error
    return data
  },

  // Add nearby service
  async addNearbyService(
    propertyId: string,
    serviceType: string,
    serviceName: string,
    distanceMeters: number,
    latitude: number,
    longitude: number
  ) {
    const { data, error } = await supabase
      .from('nearby_services')
      .insert({
        property_id: propertyId,
        service_type: serviceType,
        service_name: serviceName,
        distance_meters: distanceMeters,
        latitude,
        longitude
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get location summary
  async getLocationSummary(city: string, region: string) {
    const [scores, heatmap, analytics] = await Promise.all([
      this.getLocationScore(city, region),
      this.getDemandHeatmap(city, region),
      supabase
        .from('market_analytics')
        .select('*')
        .eq('location', city)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ])
    
    return {
      location: { city, region },
      scores,
      heatmap: heatmap.data || [],
      market_analytics: analytics.data
    }
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
    
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw error
    return { data }
  },

  // Update heatmap data
  async updateHeatmapData(
    city: string,
    region: string,
    latitude: number,
    longitude: number,
    demandLevel: string,
    supplyLevel: string,
    priceLevel: string,
    listingCount: number
  ) {
    const { data, error } = await supabase
      .from('heatmap_data')
      .upsert({
        city,
        region,
        latitude,
        longitude,
        demand_level: demandLevel,
        supply_level: supplyLevel,
        price_level: priceLevel,
        listing_count: listingCount,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Calculate heatmap for region
  async calculateRegionHeatmap(city: string, region: string) {
    // Get all listings in region
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        price,
        status,
        properties(latitude, longitude, bedrooms)
      `)
      .eq('status', 'listed')
    
    if (!listings || listings.length === 0) return null
    
    // Group by grid cells (simplified - use quadtree in production)
    const cellSize = 0.005 // ~500m
    const grid: Record<string, any[]> = {}
    
    listings.forEach(listing => {
      if (!listing.properties?.latitude) return
      
      const latCell = Math.floor(listing.properties.latitude / cellSize)
      const lngCell = Math.floor(listing.properties.longitude / cellSize)
      const key = `${latCell},${lngCell}`
      
      if (!grid[key]) grid[key] = []
      grid[key].push(listing)
    })
    
    // Calculate demand levels for each cell
    const heatmaps = []
    
    for (const [key, cellListings] of Object.entries(grid)) {
      const [latCell, lngCell] = key.split(',').map(Number)
      const latitude = latCell * cellSize
      const longitude = lngCell * cellSize
      
      const demandLevel = cellListings.length > 50 ? 'very_high' : 
                         cellListings.length > 20 ? 'high' :
                         cellListings.length > 10 ? 'medium' :
                         cellListings.length > 5 ? 'low' : 'very_low'
      
      const avgPrice = cellListings.reduce((sum, l) => sum + l.price, 0) / cellListings.length
      const priceLevel = avgPrice > 1000000 ? 'luxury' :
                        avgPrice > 500000 ? 'premium' :
                        avgPrice > 200000 ? 'mid_range' : 'budget'
      
      heatmaps.push({
        city,
        region,
        latitude,
        longitude,
        demand_level: demandLevel,
        supply_level: 'medium',
        price_level: priceLevel,
        listing_count: cellListings.length
      })
    }
    
    // Store heatmaps
    if (heatmaps.length > 0) {
      const { error } = await supabase
        .from('heatmap_data')
        .upsert(heatmaps.map(h => ({
          ...h,
          updated_at: new Date().toISOString()
        })))
      
      if (error) throw error
    }
    
    return heatmaps
  },

  // Get properties within radius
  async getPropertiesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ) {
    // Simplified: use bounding box (production should use PostGIS)
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta)
    
    if (error) throw error
    return data
  }
}
