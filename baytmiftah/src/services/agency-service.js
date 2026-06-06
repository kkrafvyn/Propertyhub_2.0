/**
 * Agency Service
 * Handles all agency-related API calls to Supabase Edge Functions
 */

import { supabase } from '../lib/supabase'

async function invokeFunction(name, options = {}) {
  const { data, error } = await supabase.functions.invoke(name, options)
  if (error) throw error
  return data
}

export const agencyService = {
  // Agencies
  async getAgencies(filters = {}) {
    let query = supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.verified !== undefined) query = query.eq('verified', filters.verified)
    if (filters.slug) query = query.eq('slug', filters.slug)

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async getAgency(agencyId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', agencyId)
      .single()

    if (error) throw error
    return data
  },

  async createAgency(agencyData) {
    try {
      return await invokeFunction('agencies', {
        body: agencyData,
      })
    } catch (functionError) {
      if (!String(functionError.message || '').toLowerCase().includes('function')) {
        throw functionError
      }
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert([agencyData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateAgency(agencyId, agencyData) {
    const { data, error } = await supabase
      .from('organizations')
      .update(agencyData)
      .eq('id', agencyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteAgency(agencyId) {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', agencyId)

    if (error) throw error
  },

  // Team Members
  async getTeamMembers(agencyId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*, user:user_id(*)')
      .eq('organization_id', agencyId)

    if (error) throw error
    return data
  },

  async getPendingVerificationAgencies() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('verification_status', 'pending')
      .order('verification_submitted_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async approveAgency(agencyId, reviewerId = null) {
    const payload = {
      verified: true,
      suspended: false,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
    }

    if (reviewerId) payload.verified_by = reviewerId

    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', agencyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async rejectAgency(agencyId) {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        verified: false,
        verification_status: 'rejected',
      })
      .eq('id', agencyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async addTeamMember(agencyId, memberData) {
    const { data, error } = await supabase
      .from('organization_members')
      .insert([{ organization_id: agencyId, ...memberData }])
      .select('*, user:user_id(*)')
      .single()

    if (error) throw error
    return data
  },

  async updateTeamMember(memberId, memberData) {
    const { data, error } = await supabase
      .from('organization_members')
      .update(memberData)
      .eq('id', memberId)
      .select('*, user:user_id(*)')
      .single()

    if (error) throw error
    return data
  },

  async removeTeamMember(memberId) {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error
  },

  // Properties
  async getAgencyProperties(agencyId) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', agencyId)
      .order('created_at', { ascending: false })

    if (error?.code === 'PGRST205') return []
    if (error) throw error
    return data
  },

  async assignProperty(propertyId, agencyId) {
    const { data, error } = await supabase
      .from('properties')
      .update({ organization_id: agencyId })
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

    if (error?.code === 'PGRST205') return []
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST202') return null
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST205') return null
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

    if (error?.code === 'PGRST205') return null
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },
}

export default agencyService
