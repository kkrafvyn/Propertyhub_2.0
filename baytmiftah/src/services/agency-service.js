/**
 * Agency Service
 * Handles agency-related calls through Supabase Edge Functions only.
 */

import { callEdgeFunction } from './edge-client'

const agencyRequest = (options = {}) => callEdgeFunction('agencies', options)

export const agencyService = {
  async getAgencies(filters = {}) {
    return agencyRequest({
      query: {
        action: 'list',
        verified: filters.verified,
        slug: filters.slug,
      },
    })
  },

  async getAgency(agencyId) {
    return agencyRequest({ allowAnonymous: true, query: { action: 'get', agencyId } })
  },

  async createAgency(agencyData) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'create' },
      body: agencyData,
    })
  },

  async updateAgency(agencyId, agencyData) {
    return agencyRequest({
      method: 'PUT',
      query: { action: 'update', agencyId },
      body: agencyData,
    })
  },

  async deleteAgency(agencyId) {
    return agencyRequest({
      method: 'DELETE',
      query: { action: 'delete', agencyId },
    })
  },

  async getTeamMembers(agencyId) {
    return agencyRequest({ query: { action: 'team', agencyId } })
  },

  async addTeamMember(agencyId, memberData) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'add-team-member', agencyId },
      body: memberData,
    })
  },

  async updateTeamMember(memberId, memberData) {
    return agencyRequest({
      method: 'PUT',
      query: { action: 'update-team-member', memberId },
      body: memberData,
    })
  },

  async removeTeamMember(memberId) {
    return agencyRequest({
      method: 'DELETE',
      query: { action: 'remove-team-member', memberId },
    })
  },

  async getPendingVerificationAgencies() {
    return agencyRequest({ query: { action: 'pending-verification' } })
  },

  async approveAgency(agencyId, reviewerId = null) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'approve', agencyId },
      body: { reviewerId },
    })
  },

  async rejectAgency(agencyId) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'reject', agencyId },
    })
  },

  async getAgencyProperties(agencyId) {
    return agencyRequest({ query: { action: 'properties', agencyId } })
  },

  async assignProperty(propertyId, agencyId) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'assign-property', propertyId, agencyId },
    })
  },

  async getAgencyLeads(agencyId, filters = {}) {
    return agencyRequest({
      query: {
        action: 'leads',
        agencyId,
        status: filters.status,
        assigned_to: filters.assigned_to,
      },
    })
  },

  async assignLead(leadId, agentId) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'assign-lead', leadId },
      body: { agentId },
    })
  },

  async updateLead(leadId, leadData) {
    return agencyRequest({
      method: 'PUT',
      query: { action: 'update-lead', leadId },
      body: leadData,
    })
  },

  async getAgencyAnalytics(agencyId) {
    return agencyRequest({ query: { action: 'analytics', agencyId } })
  },

  async generateAnalytics(agencyId) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'generate-analytics', agencyId },
    })
  },

  async sendTeamInvitation(email, agencyId, role) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'invite', agencyId },
      body: { email, role },
    })
  },

  async acceptInvitation(invitationId) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'accept-invitation', invitationId },
    })
  },

  async requestVerification(agencyId, documents) {
    return agencyRequest({
      method: 'POST',
      query: { action: 'request-verification', agencyId },
      body: { documents },
    })
  },

  async getVerificationStatus(agencyId) {
    return agencyRequest({ query: { action: 'verification-status', agencyId } })
  },
}

export default agencyService
