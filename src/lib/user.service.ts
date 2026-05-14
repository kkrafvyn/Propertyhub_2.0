import { supabase } from './supabase'
import type { Database } from './database.types'

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
}
