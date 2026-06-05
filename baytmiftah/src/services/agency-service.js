/**
 * Agency Service
 * Handles all agency-related API calls to Supabase Edge Functions
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:54321/functions/v1'

const getAuthToken = () => {
  return localStorage.getItem('auth_token')
}

const headers = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})

export const agencyService = {
  // Agencies
  async getAgencies(filters = {}) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/agencies`, {
      headers: headers(token),
    })
    
    if (!response.ok) throw new Error('Failed to fetch agencies')
    return response.json()
  },

  async getAgency(agencyId) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/agencies/${agencyId}`, {
      headers: headers(token),
    })
    
    if (!response.ok) throw new Error('Failed to fetch agency')
    return response.json()

    if (error) throw error
    return data
  },

  async createAgency(agencyData) {
    const { data, error } = await supabase
      .from('agencies')
      .insert([agencyData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateAgency(agencyId, agencyData) {
    const { data, error } = await supabase
      .from('agencies')
      .update(agencyData)
      .eq('id', agencyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteAgency(agencyId) {
    const { error } = await supabase
      .from('agencies')
      .delete()
      .eq('id', agencyId)

    if (error) throw error
  },

  // Team Members
  async getTeamMembers(agencyId) {
    const { data, error } = await supabase
      .from('agency_members')
      .select('*, user:user_id(*)')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async addTeamMember(agencyId, memberData) {
    const { data, error } = await supabase
      .from('agency_members')
      .insert([{ agency_id: agencyId, ...memberData }])
      .select('*, user:user_id(*)')
      .single()

    if (error) throw error
    return data
  },

  async updateTeamMember(memberId, memberData) {
    const { data, error } = await supabase
      .from('agency_members')
      .update(memberData)
      .eq('id', memberId)
      .select('*, user:user_id(*)')
      .single()

    if (error) throw error
    return data
  },

  async removeTeamMember(memberId) {
    const { error } = await supabase
      .from('agency_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error
  },

  // Properties
  async getAgencyProperties(agencyId) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async assignProperty(propertyId, agencyId) {
    const { data, error } = await supabase
      .from('properties')
      .update({ agency_id: agencyId })
      .eq('id', propertyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Leads
  async getAgencyLeads(agencyId, filters = {}) {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('agency_id', agencyId)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) throw error
    return data
  },

  async assignLead(leadId, agentId) {
    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_to: agentId, status: 'assigned' })
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateLead(leadId, leadData) {
    const { data, error } = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Analytics
  async getAgencyAnalytics(agencyId) {
    const { data, error } = await supabase
      .from('agency_analytics')
      .select('*')
      .eq('agency_id', agencyId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async generateAnalytics(agencyId) {
    const { data, error } = await supabase.rpc(
      'generate_agency_analytics',
      {
        agency_id: agencyId,
      }
    )

    if (error) throw error
    return data
  },

  // Invitations
  async sendTeamInvitation(email, agencyId, role) {
    const { data, error } = await supabase
      .from('agency_invitations')
      .insert([{ email, agency_id: agencyId, role }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async acceptInvitation(invitationId) {
    const { data, error } = await supabase
      .from('agency_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Verification
  async requestVerification(agencyId, documents) {
    const { data, error } = await supabase
      .from('agency_verification_requests')
      .insert([{ agency_id: agencyId, documents, status: 'pending' }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getVerificationStatus(agencyId) {
    const { data, error } = await supabase
      .from('agency_verification_requests')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },
}

export default agencyService
