import { supabaseAny as supabase } from './supabase'

export interface Commission {
  id: string
  userId: string
  listingId: string
  dealCaseId?: string
  amount: number
  currency: string
  commissionRate: number
  revenueModel: 'percentage' | 'fixed' | 'tiered'
  status: 'pending' | 'earned' | 'paid' | 'reversed'
  earnedAt: string
  paidAt?: string
  reversedAt?: string
  notes?: string
}

export interface CommissionMetrics {
  totalEarned: number
  totalPending: number
  totalPaid: number
  averageCommissionRate: number
  commissionsCount: number
  payoutRate: number
  topListingsByCommission: any[]
}

export interface PayoutSchedule {
  id: string
  userId: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  nextPayoutDate: string
  lastPayoutDate?: string
  minimumThreshold: number
  bankDetails?: {
    accountHolder: string
    accountNumber: string
    routingNumber: string
    bankName: string
  }
}

class CommissionService {
  /**
   * Get commissions for a user with filtering
   */
  async getCommissions(
    userId: string,
    filters?: {
      status?: Commission['status']
      startDate?: string
      endDate?: string
      currency?: string
    }
  ): Promise<Commission[]> {
    try {
      let query = supabase.from('commissions').select('*').eq('user_id', userId)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.startDate) {
        query = query.gte('earned_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('earned_at', filters.endDate)
      }

      if (filters?.currency) {
        query = query.eq('currency', filters.currency)
      }

      const { data, error } = await query.order('earned_at', { ascending: false })

      if (error) throw error
      return (data || []).map((item) => this.mapCommissionData(item))
    } catch (error) {
      console.error('Error fetching commissions:', error)
      throw error
    }
  }

  /**
   * Calculate metrics for user commissions
   */
  async getCommissionMetrics(userId: string, timeframe: 'month' | 'quarter' | 'year' = 'month'): Promise<CommissionMetrics> {
    try {
      const commissions = await this.getCommissions(userId)

      const now = new Date()
      const startDate = new Date()

      if (timeframe === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      } else if (timeframe === 'quarter') {
        startDate.setMonth(now.getMonth() - 3)
      } else {
        startDate.setFullYear(now.getFullYear() - 1)
      }

      const filteredCommissions = commissions.filter(c => new Date(c.earnedAt) >= startDate)

      const totalEarned = filteredCommissions
        .filter(c => c.status === 'earned' || c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0)

      const totalPending = filteredCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)

      const totalPaid = filteredCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0)

      const rates = filteredCommissions.map(c => c.commissionRate)
      const averageCommissionRate =
        rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0

      // Get top listings
      const listingTotals: Record<string, number> = {}
      filteredCommissions.forEach(c => {
        listingTotals[c.listingId] = (listingTotals[c.listingId] || 0) + c.amount
      })

      const topListingsByCommission = Object.entries(listingTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([listingId, amount]) => ({ listingId, amount }))

      return {
        totalEarned,
        totalPending,
        totalPaid,
        averageCommissionRate,
        commissionsCount: filteredCommissions.length,
        payoutRate: totalEarned > 0 ? (totalPaid / totalEarned) * 100 : 0,
        topListingsByCommission,
      }
    } catch (error) {
      console.error('Error calculating metrics:', error)
      throw error
    }
  }

  /**
   * Record a new commission
   */
  async createCommission(commission: Omit<Commission, 'id'>): Promise<Commission> {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .insert([
          {
            user_id: commission.userId,
            listing_id: commission.listingId,
            deal_case_id: commission.dealCaseId,
            amount: commission.amount,
            currency: commission.currency,
            commission_rate: commission.commissionRate,
            revenue_model: commission.revenueModel,
            status: commission.status,
            earned_at: commission.earnedAt,
            notes: commission.notes,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return this.mapCommissionData(data)
    } catch (error) {
      console.error('Error creating commission:', error)
      throw error
    }
  }

  /**
   * Calculate commission amount based on revenue model
   */
  calculateCommissionAmount(
    salePrice: number,
    commissionRate: number,
    revenueModel: 'percentage' | 'fixed' | 'tiered'
  ): number {
    if (revenueModel === 'percentage') {
      return salePrice * (commissionRate / 100)
    } else if (revenueModel === 'fixed') {
      return commissionRate
    } else if (revenueModel === 'tiered') {
      // Tiered: higher sales = higher commission rate
      let rate = commissionRate
      if (salePrice > 500000) rate = commissionRate + 1
      if (salePrice > 1000000) rate = commissionRate + 2
      return salePrice * (rate / 100)
    }
    return 0
  }

  /**
   * Mark commission as paid
   */
  async markCommissionAsPaid(commissionId: string): Promise<Commission> {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', commissionId)
        .select()
        .single()

      if (error) throw error
      return this.mapCommissionData(data)
    } catch (error) {
      console.error('Error marking commission as paid:', error)
      throw error
    }
  }

  /**
   * Get payout schedule for user
   */
  async getPayoutSchedule(userId: string): Promise<PayoutSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('payout_schedules')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data ? this.mapPayoutSchedule(data) : null
    } catch (error) {
      console.error('Error fetching payout schedule:', error)
      throw error
    }
  }

  /**
   * Update or create payout schedule
   */
  async upsertPayoutSchedule(
    userId: string,
    schedule: Omit<PayoutSchedule, 'id' | 'userId'>
  ): Promise<PayoutSchedule> {
    try {
      const existing = await this.getPayoutSchedule(userId)

      if (existing) {
        const { data, error } = await supabase
          .from('payout_schedules')
          .update({
            frequency: schedule.frequency,
            next_payout_date: schedule.nextPayoutDate,
            minimum_threshold: schedule.minimumThreshold,
            bank_details: schedule.bankDetails,
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return this.mapPayoutSchedule(data)
      } else {
        const { data, error } = await supabase
          .from('payout_schedules')
          .insert([
            {
              user_id: userId,
              frequency: schedule.frequency,
              next_payout_date: schedule.nextPayoutDate,
              minimum_threshold: schedule.minimumThreshold,
              bank_details: schedule.bankDetails,
            },
          ])
          .select()
          .single()

        if (error) throw error
        return this.mapPayoutSchedule(data)
      }
    } catch (error) {
      console.error('Error upserting payout schedule:', error)
      throw error
    }
  }

  /**
   * Get commissions by listing for analysis
   */
  async getCommissionsByListing(
    listingId: string
  ): Promise<Array<Commission & { agentName: string }>> {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(
          `
          *,
          users:user_id (
            full_name
          )
        `
        )
        .eq('listing_id', listingId)

      if (error) throw error

      return (data || []).map(item => ({
        ...this.mapCommissionData(item),
        agentName: item.users?.full_name || 'Unknown',
      }))
    } catch (error) {
      console.error('Error fetching commissions by listing:', error)
      throw error
    }
  }

  /**
   * Generate commission report for date range
   */
  async generateCommissionReport(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    commissions: Commission[]
    summary: {
      totalAmount: number
      totalCommissions: number
      byStatus: Record<string, number>
      byCurrency: Record<string, number>
    }
    byMonth: Record<string, number>
  }> {
    try {
      const commissions = await this.getCommissions(userId, { startDate, endDate })

      const summary = {
        totalAmount: 0,
        totalCommissions: commissions.length,
        byStatus: {} as Record<string, number>,
        byCurrency: {} as Record<string, number>,
      }

      const byMonth: Record<string, number> = {}

      commissions.forEach(c => {
        summary.totalAmount += c.amount
        summary.byStatus[c.status] = (summary.byStatus[c.status] || 0) + 1
        summary.byCurrency[c.currency] = (summary.byCurrency[c.currency] || 0) + c.amount

        const month = new Date(c.earnedAt).toISOString().substring(0, 7)
        byMonth[month] = (byMonth[month] || 0) + c.amount
      })

      return {
        commissions,
        summary,
        byMonth,
      }
    } catch (error) {
      console.error('Error generating commission report:', error)
      throw error
    }
  }

  /**
   * Helper: Map Supabase data to Commission interface
   */
  private mapCommissionData(data: any): Commission {
    return {
      id: data.id,
      userId: data.user_id,
      listingId: data.listing_id,
      dealCaseId: data.deal_case_id,
      amount: data.amount,
      currency: data.currency,
      commissionRate: data.commission_rate,
      revenueModel: data.revenue_model,
      status: data.status,
      earnedAt: data.earned_at,
      paidAt: data.paid_at,
      reversedAt: data.reversed_at,
      notes: data.notes,
    }
  }

  private mapPayoutSchedule(data: any): PayoutSchedule {
    return {
      id: data.id,
      userId: data.user_id,
      frequency: data.frequency,
      nextPayoutDate: data.next_payout_date,
      lastPayoutDate: data.last_payout_date,
      minimumThreshold: data.minimum_threshold,
      bankDetails: data.bank_details,
    }
  }
}

export const commissionService = new CommissionService()
