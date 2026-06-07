import { create } from 'zustand'
import agencyService from '../services/agency-service'

export const useAgencyStore = create((set) => ({
  agencies: [],
  currentAgency: null,
  teamMembers: [],
  listings: [],
  leads: [],
  analytics: null,
  loading: false,
  error: null,

  setCurrentAgency: (agency) => set({ currentAgency: agency }),

  fetchAgencies: async () => {
    set({ loading: true, error: null })
    try {
      const data = await agencyService.getAgencies()
      set({ agencies: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching agencies:', error)
      return []
    } finally {
      set({ loading: false })
    }
  },

  fetchAgencyById: async (agencyId) => {
    set({ loading: true, error: null })
    try {
      const data = await agencyService.getAgency(agencyId)
      set({ currentAgency: data })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching agency:', error)
      return null
    } finally {
      set({ loading: false })
    }
  },

  createAgency: async (agencyData) => {
    set({ loading: true, error: null })
    try {
      const data = await agencyService.createAgency(agencyData)
      set((state) => ({
        agencies: [...state.agencies, data],
        currentAgency: data,
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error creating agency:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateAgency: async (agencyId, agencyData) => {
    set({ loading: true, error: null })
    try {
      const data = await agencyService.updateAgency(agencyId, agencyData)
      set((state) => ({
        agencies: state.agencies.map((agency) => (agency.id === agencyId ? data : agency)),
        currentAgency: state.currentAgency?.id === agencyId ? data : state.currentAgency,
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error updating agency:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  deleteAgency: async (agencyId) => {
    set({ loading: true, error: null })
    try {
      await agencyService.deleteAgency(agencyId)
      set((state) => ({
        agencies: state.agencies.filter((agency) => agency.id !== agencyId),
        currentAgency: state.currentAgency?.id === agencyId ? null : state.currentAgency,
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting agency:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  fetchTeamMembers: async (agencyId) => {
    try {
      const data = await agencyService.getTeamMembers(agencyId)
      set({ teamMembers: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching team members:', error)
      return []
    }
  },

  addTeamMember: async (agencyId, memberData) => {
    set({ loading: true, error: null })
    try {
      const data = await agencyService.addTeamMember(agencyId, memberData)
      set((state) => ({ teamMembers: [...state.teamMembers, data] }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error adding team member:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateTeamMember: async (memberId, memberData) => {
    try {
      const data = await agencyService.updateTeamMember(memberId, memberData)
      set((state) => ({
        teamMembers: state.teamMembers.map((member) => (member.id === memberId ? data : member)),
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error updating team member:', error)
      throw error
    }
  },

  removeTeamMember: async (memberId) => {
    try {
      await agencyService.removeTeamMember(memberId)
      set((state) => ({
        teamMembers: state.teamMembers.filter((member) => member.id !== memberId),
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error removing team member:', error)
      throw error
    }
  },

  fetchListings: async (agencyId) => {
    try {
      const data = await agencyService.getAgencyProperties(agencyId)
      set({ listings: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching listings:', error)
      return []
    }
  },

  fetchLeads: async (agencyId) => {
    try {
      const data = await agencyService.getAgencyLeads(agencyId)
      set({ leads: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching leads:', error)
      return []
    }
  },

  fetchAnalytics: async (agencyId) => {
    try {
      const data = await agencyService.getAgencyAnalytics(agencyId)
      set({ analytics: data || null })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching analytics:', error)
      return null
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      agencies: [],
      currentAgency: null,
      teamMembers: [],
      listings: [],
      leads: [],
      analytics: null,
      loading: false,
      error: null,
    }),
}))
