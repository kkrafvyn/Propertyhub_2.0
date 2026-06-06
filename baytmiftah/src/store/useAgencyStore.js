import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAgencyStore = create((set, get) => ({
  // State
  agencies: [],
  currentAgency: null,
  teamMembers: [],
  listings: [],
  leads: [],
  analytics: null,
  loading: false,
  error: null,

  // Agency Actions
  setCurrentAgency: (agency) => set({ currentAgency: agency }),

  fetchAgencies: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ agencies: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching agencies:', error)
    } finally {
      set({ loading: false })
    }
  },

  fetchAgencyById: async (agencyId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', agencyId)
        .single()

      if (error) throw error
      set({ currentAgency: data })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching agency:', error)
    } finally {
      set({ loading: false })
    }
  },

  createAgency: async (agencyData) => {
    set({ loading: true, error: null })
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('organizations')
        .insert([
          {
            ...agencyData,
            owner_id: user.id,
            verified: false,
            suspended: false,
            verification_status: 'pending',
          },
        ])
        .select()
        .single()

      if (error) throw error
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
      const { data, error } = await supabase
        .from('organizations')
        .update(agencyData)
        .eq('id', agencyId)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        agencies: state.agencies.map((a) =>
          a.id === agencyId ? data : a
        ),
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
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', agencyId)

      if (error) throw error
      set((state) => ({
        agencies: state.agencies.filter((a) => a.id !== agencyId),
        currentAgency:
          state.currentAgency?.id === agencyId ? null : state.currentAgency,
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting agency:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Team Member Actions
  fetchTeamMembers: async (agencyId) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, user:user_id(*)')
        .eq('organization_id', agencyId)

      if (error) throw error
      set({ teamMembers: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching team members:', error)
    }
  },

  addTeamMember: async (agencyId, memberData) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .insert([
          {
            organization_id: agencyId,
            ...memberData,
          },
        ])
        .select('*, user:user_id(*)')
        .single()

      if (error) throw error
      set((state) => ({
        teamMembers: [...state.teamMembers, data],
      }))
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
      const { data, error } = await supabase
        .from('organization_members')
        .update(memberData)
        .eq('id', memberId)
        .select('*, user:user_id(*)')
        .single()

      if (error) throw error
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.id === memberId ? data : m
        ),
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
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      set((state) => ({
        teamMembers: state.teamMembers.filter((m) => m.id !== memberId),
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error removing team member:', error)
      throw error
    }
  },

  // Listings Actions
  fetchListings: async (agencyId) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', agencyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ listings: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching listings:', error)
    }
  },

  // Leads Actions
  fetchLeads: async (agencyId) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })

      if (error?.code === 'PGRST205') {
        set({ leads: [] })
        return []
      }
      if (error) throw error
      set({ leads: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching leads:', error)
    }
  },

  // Analytics Actions
  fetchAnalytics: async (agencyId) => {
    try {
      const { data, error } = await supabase
        .from('agency_analytics')
        .select('*')
        .eq('agency_id', agencyId)
        .single()

      if (error?.code === 'PGRST205') {
        set({ analytics: null })
        return null
      }
      if (error && error.code !== 'PGRST116') throw error
      set({ analytics: data || null })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching analytics:', error)
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
