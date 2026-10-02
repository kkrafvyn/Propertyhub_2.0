import { supabase } from './supabase'
import type { Database } from './database.types'
import { accountTypeToAppRole } from '../app/lib/auth-routing'

type User = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

export const userService = {
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async updateUser(id: string, updates: UserUpdate) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  async createUserProfile(id: string, email?: string | null, fullName?: string, phone?: string | null) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        email: email || null,
        full_name: fullName,
        phone: phone || null,
      })
      .select()

    if (error) throw error
    return data[0]
  },

  async ensureUserProfile(id: string, email?: string | null, fullName?: string, phone?: string | null) {
    const { data: existing, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (existing) {
      if ((!existing.full_name && fullName) || (!existing.phone && phone) || (!existing.email && email)) {
        return this.updateUser(id, {
          email: existing.email || email || null,
          full_name: existing.full_name || fullName || null,
          phone: existing.phone || phone || null,
        })
      }
      return existing
    }

    return this.createUserProfile(id, email, fullName, phone)
  },

  async hasOrganizationMembership(userId: string) {
    const { count, error } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) throw error
    return (count ?? 0) > 0
  },

  /**
   * Upgrade stale consumer JWT metadata when the user already belongs to a workspace org.
   * Never downgrades host/agent metadata for users without membership.
   */
  async syncAppRoleWithOrgMembership(userId: string) {
    const hasMembership = await this.hasOrganizationMembership(userId)
    if (!hasMembership) return false

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionUser = sessionData.session?.user
    if (!sessionUser || sessionUser.id !== userId) return false

    const metadataRole =
      typeof sessionUser.user_metadata?.role === 'string'
        ? sessionUser.user_metadata.role
        : 'consumer'

    if (metadataRole !== 'consumer') return false

    const { error } = await supabase.auth.updateUser({
      data: {
        role: accountTypeToAppRole('landlord'),
        account_type: 'landlord',
      },
    })

    if (error) {
      console.warn('Unable to sync app role with organization membership:', error.message)
      return false
    }

    return true
  },
}
