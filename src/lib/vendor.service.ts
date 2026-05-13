import { supabase } from './supabase'

export const vendorService = {
  // Register vendor
  async registerVendor(
    userId: string,
    businessName: string,
    businessCategory: string,
    phone: string,
    email: string,
    serviceAreas: string[]
  ) {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        user_id: userId,
        business_name: businessName,
        business_category: businessCategory,
        phone,
        email,
        service_areas: serviceAreas,
        availability_status: 'available'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get vendor profile
  async getVendor(vendorId: string) {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        services:vendor_services(*)
      `)
      .eq('id', vendorId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get verified vendors by category
  async getVerifiedVendors(category: string, limit = 20) {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        services:vendor_services(*)
      `)
      .eq('business_category', category)
      .eq('verified', true)
      .order('rating_avg', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Add vendor service
  async addService(
    vendorId: string,
    serviceName: string,
    description: string,
    basePrice: number,
    estimatedDurationHours: number
  ) {
    const { data, error } = await supabase
      .from('vendor_services')
      .insert({
        vendor_id: vendorId,
        service_name: serviceName,
        description,
        base_price: basePrice,
        estimated_duration_hours: estimatedDurationHours
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Create vendor assignment (job)
  async createAssignment(
    organizationId: string,
    propertyId: string,
    vendorId: string,
    serviceType: string,
    description: string,
    requestedDate: Date
  ) {
    const { data, error } = await supabase
      .from('vendor_assignments')
      .insert({
        organization_id: organizationId,
        property_id: propertyId,
        vendor_id: vendorId,
        service_type: serviceType,
        description,
        requested_date: requestedDate.toISOString(),
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get vendor assignments
  async getAssignments(organizationId: string, status?: string) {
    let query = supabase
      .from('vendor_assignments')
      .select(`
        *,
        vendor:vendors(*),
        property:properties(*)
      `)
      .eq('organization_id', organizationId)
      .order('requested_date', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Update assignment status
  async updateAssignmentStatus(assignmentId: string, status: string) {
    const updateData: Record<string, any> = { status }
    
    if (status === 'completed') {
      updateData.completed_date = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('vendor_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Rate vendor
  async rateVendor(
    vendorId: string,
    raterId: string,
    assignmentId: string,
    rating: number,
    reviewText: string
  ) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }
    
    const { data, error } = await supabase
      .from('vendor_ratings')
      .insert({
        vendor_id: vendorId,
        rater_id: raterId,
        assignment_id: assignmentId,
        rating,
        review_text: reviewText
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Update vendor average rating
    const { data: ratings } = await supabase
      .from('vendor_ratings')
      .select('rating')
      .eq('vendor_id', vendorId)
    
    if (ratings) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      await supabase
        .from('vendors')
        .update({ rating_avg: Math.round(avgRating * 100) / 100 })
        .eq('id', vendorId)
    }
    
    return data
  },

  // Get vendor ratings
  async getVendorRatings(vendorId: string) {
    const { data, error } = await supabase
      .from('vendor_ratings')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Update vendor status
  async updateVendorStatus(vendorId: string, status: 'available' | 'busy' | 'unavailable') {
    const { data, error } = await supabase
      .from('vendors')
      .update({ availability_status: status })
      .eq('id', vendorId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Search vendors by location and service
  async searchVendors(serviceAreas: string[], category: string, limit = 20) {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        services:vendor_services(*)
      `)
      .eq('business_category', category)
      .eq('verified', true)
      .eq('availability_status', 'available')
      .overlaps('service_areas', serviceAreas)
      .order('rating_avg', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }
}
