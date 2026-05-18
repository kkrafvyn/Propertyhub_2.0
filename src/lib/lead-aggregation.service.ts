import { supabase } from './supabase'
import type { Database } from './database.types'

type AggregatedLeadRow = Database['public']['Tables']['aggregated_leads']['Row']

type LeadSource = 'mls' | 'zillow' | 'realtor' | 'internal' | 'website' | 'referral'
type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'viewing_scheduled'
  | 'negotiation'
  | 'won'
  | 'lost'

export interface AggregatedLead extends Omit<AggregatedLeadRow, 'source' | 'status'> {
  source: LeadSource
  status: LeadStatus
}

function normalizeLeadSource(source: string | null): LeadSource {
  switch (source) {
    case 'mls':
    case 'zillow':
    case 'realtor':
    case 'referral':
    case 'website':
      return source
    default:
      return 'internal'
  }
}

function normalizeLeadStatus(status: string | null): LeadStatus {
  switch (status) {
    case 'contacted':
    case 'qualified':
    case 'viewing_scheduled':
    case 'negotiation':
    case 'won':
    case 'lost':
      return status
    default:
      return 'new'
  }
}

function toAggregatedLead(row: AggregatedLeadRow): AggregatedLead {
  return {
    ...row,
    quality_score: row.quality_score ?? 50,
    lead_score: row.lead_score ?? 50,
    tags: row.tags || [],
    source: normalizeLeadSource(row.source),
    status: normalizeLeadStatus(row.status),
  }
}

export const leadAggregationService = {
  async getLeads(
    organizationId: string,
    status?: LeadStatus,
    limit = 100
  ): Promise<AggregatedLead[]> {
    let query = supabase
      .from('aggregated_leads')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(toAggregatedLead)
  },

  async updateLeadStatus(leadId: string, status: LeadStatus) {
    const { data, error } = await supabase
      .from('aggregated_leads')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select('*')
      .single()

    if (error) throw error
    return toAggregatedLead(data)
  },

  async sendFollowUp(leadId: string, message: string) {
    const followUpNote = message.trim()
    if (!followUpNote) return null

    const { data, error } = await supabase
      .from('aggregated_leads')
      .update({
        status: 'contacted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select('*')
      .single()

    if (error) throw error

    return {
      lead: toAggregatedLead(data),
      message: followUpNote,
    }
  },
}
