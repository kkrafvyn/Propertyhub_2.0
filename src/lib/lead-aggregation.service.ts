import { supabase } from './supabase';

export interface AggregatedLead {
  id: string;
  organizationId: string;
  listingId: string;
  source: 'mls' | 'zillow' | 'realtor' | 'internal' | 'website' | 'referral';
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  message?: string;
  interestedPrice?: number;
  requestedTimeframe?: string;
  qualityScore: number; // 0-100 based on data completeness
  leadScore: number; // 0-100 based on likelihood to convert
  status: 'new' | 'contacted' | 'qualified' | 'viewing_scheduled' | 'negotiation' | 'won' | 'lost';
  assignedTo?: string; // Agent ID
  tags: string[];
  duplicateOf?: string; // If merged with another lead
  createdAt: string;
  updatedAt: string;
}

export interface LeadSource {
  source: string;
  totalLeads: number;
  convertedLeads: number;
  averageQualityScore: number;
  conversionRate: number;
}

interface LeadScoringFactors {
  hasPhone: boolean;
  hasEmail: boolean;
  hasMessage: boolean;
  completedProfile: boolean;
  previousBuyer: boolean;
  timeframe: string; // 'immediate' | 'soon' | 'later'
  priceRange: boolean;
}

class LeadAggregationService {
  /**
   * Create a new aggregated lead
   */
  async createLead(
    organizationId: string,
    listingId: string,
    leadData: {
      source: 'mls' | 'zillow' | 'realtor' | 'internal' | 'website' | 'referral';
      name: string;
      email: string;
      phone: string;
      message?: string;
      interestedPrice?: number;
      requestedTimeframe?: string;
      tags?: string[];
    }
  ): Promise<AggregatedLead> {
    const qualityScore = this.calculateQualityScore(leadData);
    const leadScore = await this.calculateLeadScore(organizationId, leadData);

    const { data, error } = await supabase
      .from('aggregated_leads')
      .insert({
        organization_id: organizationId,
        listing_id: listingId,
        source: leadData.source,
        lead_name: leadData.name,
        lead_email: leadData.email,
        lead_phone: leadData.phone,
        message: leadData.message,
        interested_price: leadData.interestedPrice,
        requested_timeframe: leadData.requestedTimeframe,
        quality_score: qualityScore,
        lead_score: leadScore,
        status: 'new',
        tags: leadData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create lead:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get leads for an organization
   */
  async getLeads(
    organizationId: string,
    filters?: {
      status?: string;
      source?: string;
      minScore?: number;
      sortBy?: 'leadScore' | 'createdAt' | 'quality';
    },
    limit = 50,
    offset = 0
  ) {
    let query = supabase
      .from('aggregated_leads')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.minScore) {
      query = query.gte('lead_score', filters.minScore);
    }

    // Sort
    const sortColumn =
      filters?.sortBy === 'leadScore'
        ? 'lead_score'
        : filters?.sortBy === 'quality'
          ? 'quality_score'
          : 'created_at';

    query = query.order(sortColumn, { ascending: false });

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch leads:', error);
      return [];
    }

    return data;
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, status: AggregatedLead['status']) {
    const { error } = await supabase
      .from('aggregated_leads')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to update lead:', error);
      throw error;
    }
  }

  /**
   * Assign lead to agent
   */
  async assignLeadToAgent(leadId: string, agentId: string) {
    const { error } = await supabase
      .from('aggregated_leads')
      .update({
        assigned_to: agentId,
        status: 'contacted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to assign lead:', error);
      throw error;
    }
  }

  /**
   * Find and merge duplicate leads
   */
  async findDuplicates(organizationId: string): Promise<Array<{ leadId: string; duplicateOf: string; confidence: number }>> {
    const leads = await this.getLeads(organizationId, undefined, 1000, 0);
    const duplicates: Array<{ leadId: string; duplicateOf: string; confidence: number }> = [];

    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const lead1 = leads[i];
        const lead2 = leads[j];

        // Check if already marked as duplicate
        if (lead1.duplicate_of === lead2.id) continue;

        const confidence = this.calculateDuplicateConfidence(lead1, lead2);
        if (confidence > 0.85) {
          duplicates.push({
            leadId: lead2.id,
            duplicateOf: lead1.id,
            confidence,
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Merge duplicate leads
   */
  async mergeDuplicates(primaryLeadId: string, duplicateLeadId: string) {
    // Update duplicate to point to primary
    await supabase
      .from('aggregated_leads')
      .update({
        duplicate_of: primaryLeadId,
        status: 'merged',
      })
      .eq('id', duplicateLeadId);

    // You might want to merge conversation history, etc.
  }

  /**
   * Get lead analytics by source
   */
  async getLeadAnalyticsBySource(organizationId: string): Promise<LeadSource[]> {
    const { data, error } = await supabase.rpc('get_lead_analytics_by_source', {
      org_id: organizationId,
    });

    if (error) {
      console.error('Failed to fetch lead analytics:', error);
      return [];
    }

    return data;
  }

  /**
   * Get leads trending (most recent)
   */
  async getLeadsTrending(organizationId: string, hoursBack = 24, limit = 20) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('aggregated_leads')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', since)
      .order('lead_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch trending leads:', error);
      return [];
    }

    return data;
  }

  /**
   * Send automated follow-up to lead
   */
  async sendFollowUp(leadId: string, message: string) {
    // This would integrate with communication service
    const { data: lead, error: leadError } = await supabase
      .from('aggregated_leads')
      .select('lead_email, lead_phone, lead_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      throw leadError;
    }

    // Send email (via communication service)
    // await communicationService.sendEmail({
    //   to: lead.lead_email,
    //   subject: 'Update on Your Property Interest',
    //   body: message
    // });

    // Update lead status
    await supabase
      .from('aggregated_leads')
      .update({
        status: 'contacted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);
  }

  /**
   * Calculate quality score based on data completeness
   */
  private calculateQualityScore(leadData: {
    name: string;
    email: string;
    phone: string;
    message?: string;
  }): number {
    let score = 0;

    if (leadData.name && leadData.name.length > 2) score += 25;
    if (leadData.email && leadData.email.includes('@')) score += 25;
    if (leadData.phone && leadData.phone.length >= 10) score += 25;
    if (leadData.message && leadData.message.length > 10) score += 25;

    return Math.min(100, score);
  }

  /**
   * Calculate lead score (conversion probability)
   */
  private async calculateLeadScore(
    organizationId: string,
    leadData: {
      name: string;
      email: string;
      phone: string;
      message?: string;
      interestedPrice?: number;
      requestedTimeframe?: string;
    }
  ): Promise<number> {
    let score = 50; // Base score

    // Quality factors
    if (leadData.email) score += 10;
    if (leadData.phone) score += 10;
    if (leadData.message && leadData.message.length > 50) score += 5;

    // Intent factors
    if (leadData.requestedTimeframe === 'immediate') score += 15;
    if (leadData.requestedTimeframe === 'soon') score += 10;
    if (leadData.interestedPrice) score += 10;

    // Historical factors
    const { data: history } = await supabase
      .from('aggregated_leads')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('lead_email', leadData.email)
      .single();

    if (history?.status === 'won') score += 20;
    if (history?.status === 'qualified') score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate duplicate confidence (0-1)
   */
  private calculateDuplicateConfidence(lead1: any, lead2: any): number {
    let confidence = 0;

    // Email match = high confidence
    if (lead1.lead_email && lead2.lead_email && lead1.lead_email === lead2.lead_email) {
      confidence += 0.7;
    }

    // Phone match
    if (lead1.lead_phone && lead2.lead_phone && this.normalizePhone(lead1.lead_phone) === this.normalizePhone(lead2.lead_phone)) {
      confidence += 0.5;
    }

    // Name match (fuzzy)
    if (lead1.lead_name && lead2.lead_name) {
      const match = this.calculateNameSimilarity(lead1.lead_name, lead2.lead_name);
      if (match > 0.8) {
        confidence += 0.4;
      }
    }

    return Math.min(1, confidence);
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Calculate name similarity using Levenshtein distance
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase();
    const s2 = name2.toLowerCase();

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}

export const leadAggregationService = new LeadAggregationService();
