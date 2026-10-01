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

  async listMarketplaceVendors(category: string, limit = 24) {
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
    return data || []
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
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be an integer between 1 and 5')
    }
    if (reviewText.trim().length > 2000) throw new Error('Review must be 2,000 characters or fewer')
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user || session.user.id !== raterId) {
      throw new Error('Rating identity does not match the signed-in user')
    }
    const { data, error } = await supabase.rpc('submit_vendor_rating', {
      p_vendor_id: vendorId,
      p_assignment_id: assignmentId,
      p_rating: rating,
      p_review_text: reviewText.trim() || null,
    })
    if (error) throw error
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
