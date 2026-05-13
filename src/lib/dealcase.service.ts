import { supabase } from './supabase'
import type { Database } from './database.types'

type DealCase = Database['public']['Tables']['deal_cases']['Row']
type DealCaseInsert = Database['public']['Tables']['deal_cases']['Insert']
type DealCaseUpdate = Database['public']['Tables']['deal_cases']['Update']

export const dealCaseService = {
  async createDealCase(dealCase: DealCaseInsert) {
    const { data, error } = await supabase
      .from('deal_cases')
      .insert(dealCase)
      .select()

    if (error) throw error
    return data[0]
  },

  async getDealCasesByUser(userId: string) {
    const { data, error } = await supabase
      .from('deal_cases')
      .select(
        `
        *,
        listing:listings(
          *,
          property:properties(*),
          organization:organizations(name, logo_url, verified)
        ),
        organization:organizations(name, logo_url, verified)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getDealCasesByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('deal_cases')
      .select(
        `
        *,
        listing:listings(
          *,
          property:properties(*),
          organization:organizations(name, logo_url, verified)
        ),
        user:users(full_name, email, phone)
      `
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getDealCaseById(id: string) {
    const { data, error } = await supabase
      .from('deal_cases')
      .select(
        `
        *,
        listing:listings(
          *,
          property:properties(*),
          organization:organizations(*)
        ),
        organization:organizations(*),
        user:users(*)
      `
      )
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async updateDealCase(id: string, updates: DealCaseUpdate) {
    const { data, error } = await supabase
      .from('deal_cases')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  async assignDealCase(id: string, assignedTo: string) {
    return this.updateDealCase(id, {
      assigned_to: assignedTo,
      pipeline_stage: 'contacted',
      last_contacted_at: new Date().toISOString(),
      last_stage_updated_at: new Date().toISOString(),
    })
  },

  async approveDealCase(id: string) {
    return this.updateDealCase(id, {
      status: 'approved',
      pipeline_stage: 'qualified',
      last_stage_updated_at: new Date().toISOString(),
    })
  },

  async rejectDealCase(id: string) {
    return this.updateDealCase(id, {
      status: 'rejected',
      pipeline_stage: 'lost',
      last_stage_updated_at: new Date().toISOString(),
    })
  },

  async closeDealCase(id: string) {
    return this.updateDealCase(id, {
      status: 'closed',
      pipeline_stage: 'won',
      last_stage_updated_at: new Date().toISOString(),
    })
  },

  async updatePipeline(
    id: string,
    updates: Pick<
      DealCaseUpdate,
      'pipeline_stage' | 'priority' | 'next_follow_up_at' | 'last_contacted_at'
    >
  ) {
    return this.updateDealCase(id, {
      ...updates,
      last_stage_updated_at: new Date().toISOString(),
    })
  },
}
