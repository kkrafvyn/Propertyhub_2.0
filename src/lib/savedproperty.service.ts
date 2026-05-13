import { supabase } from './supabase'
import type { Database } from './database.types'

export const savedPropertyService = {
  async getSavedProperties(userId: string) {
    const { data, error } = await supabase
      .from('saved_properties')
      .select(
        `
        id,
        created_at,
        listing:listings(
          *,
          property:properties(*),
          organization:organizations(name, logo_url, verified)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async toggleSavedProperty(userId: string, listingId: string) {
    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single()

    if (existing) {
      // Remove
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId)

      if (error) throw error
      return { saved: false }
    } else {
      // Add
      const { error } = await supabase
        .from('saved_properties')
        .insert({ user_id: userId, listing_id: listingId })

      if (error) throw error
      return { saved: true }
    }
  },

  async isPropertySaved(userId: string, listingId: string) {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  },
}
