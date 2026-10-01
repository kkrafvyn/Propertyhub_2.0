import { supabase } from './supabase';

type SLAAlert = {
  id: string;
  organization_id: string;
  issue_id?: string | null;
  alert_type?: string | null;
  severity?: string | null;
  triggered_at?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  created_at?: string;
};

type VendorPerformance = {
  id: string;
  organization_id: string;
  vendor_id: string;
  period_month: string;
  total_jobs?: number | null;
  completed_on_time?: number | null;
  completed_late?: number | null;
  incomplete?: number | null;
  average_response_hours?: number | null;
  average_resolution_hours?: number | null;
  quality_rating?: number | null;
  cost_performance?: number | null;
  last_updated?: string | null;
};

type EstateIssue = {
  id: string;
  organization_id: string;
  vendor_id?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  sla_acknowledgement_target?: string | null;
  sla_resolution_target?: string | null;
  status?: string | null;
};

type WorkOrderCost = {
  estimated_cost_minor?: number | null;
  actual_cost_minor?: number | null;
};

const db = supabase.from as any;

export class VendorSLAService {
  /**
   * SLA Monitoring
   */

  async checkAndCreateSLAAlerts(orgId: string) {
    try {
      const { data: issues, error } = await db('estate_issues')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['triaged', 'assigned', 'in_progress'])
        .not('sla_resolution_target', 'is', null);

      if (error) throw error;

      const now = new Date();
      const alerts = [];

      for (const issue of issues || []) {
        if (!issue.acknowledged_at && issue.sla_acknowledgement_target) {
          const ackTarget = new Date(issue.created_at);
          ackTarget.setSeconds(ackTarget.getSeconds() + this.intervalToSeconds(issue.sla_acknowledgement_target));

          if (now > ackTarget) {
            const { data: existing } = await db('sla_alerts')
              .select('id')
              .eq('issue_id', issue.id)
              .eq('alert_type', 'ACKNOWLEDGEMENT_BREACHED')
              .is('resolved_at', null);

            if (!existing || existing.length === 0) {
              alerts.push({
                organization_id: orgId,
                issue_id: issue.id,
                alert_type: 'ACKNOWLEDGEMENT_BREACHED',
                severity: 'HIGH',
                triggered_at: new Date().toISOString()
              });
            }
          }
        }

        if (issue.sla_resolution_target && !issue.resolved_at) {
          const resTarget = new Date(issue.created_at);
          resTarget.setSeconds(resTarget.getSeconds() + this.intervalToSeconds(issue.sla_resolution_target));

          if (now > resTarget) {
            const { data: existing } = await db('sla_alerts')
              .select('id')
              .eq('issue_id', issue.id)
              .eq('alert_type', 'RESOLUTION_BREACHED')
              .is('resolved_at', null);

            if (!existing || existing.length === 0) {
              alerts.push({
                organization_id: orgId,
                issue_id: issue.id,
                alert_type: 'RESOLUTION_BREACHED',
                severity: 'CRITICAL',
                triggered_at: new Date().toISOString()
              });
            }
          } else {
            const timeUntilTarget = resTarget.getTime() - now.getTime();
            if (timeUntilTarget < 3600000) {
              const { data: existing } = await db('sla_alerts')
                .select('id')
                .eq('issue_id', issue.id)
                .eq('alert_type', 'RESOLUTION_PENDING')
                .is('resolved_at', null);

              if (!existing || existing.length === 0) {
                alerts.push({
                  organization_id: orgId,
                  issue_id: issue.id,
                  alert_type: 'RESOLUTION_PENDING',
                  severity: 'HIGH',
                  triggered_at: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      if (alerts.length > 0) {
        const { error: insertError } = await db('sla_alerts')
          .insert(alerts);
        
        if (insertError) throw insertError;
      }

      return alerts;
    } catch (error) {
      console.error('Error checking SLA alerts:', error);
      throw error;
    }
  }

  async getSLAAlerts(orgId: string, filters?: {
    alertType?: string;
    severity?: string;
    acknowledged?: boolean;
  }) {
    try {
      let query = db('sla_alerts')
        .select('*')
        .eq('organization_id', orgId);

      if (filters?.alertType) query = query.eq('alert_type', filters.alertType);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.acknowledged !== undefined) {
        if (filters.acknowledged) {
          query = query.not('acknowledged_at', 'is', null);
        } else {
          query = query.is('acknowledged_at', null);
        }
      }

      const { data, error } = await query.order('triggered_at', { ascending: false });
      if (error) throw error;
      return data as SLAAlert[];
    } catch (error) {
      console.error('Error fetching SLA alerts:', error);
      throw error;
    }
  }

  async acknowledgeSLAAlert(alertId: string, userId: string) {
    const { data, error } = await db('sla_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data as SLAAlert;
  }

  /**
   * Vendor Performance Tracking
   */

  async updateVendorPerformance(orgId: string, vendorId: string, periodMonth: Date) {
    try {
      const monthStart = new Date(periodMonth.getFullYear(), periodMonth.getMonth(), 1);
      const monthEnd = new Date(periodMonth.getFullYear(), periodMonth.getMonth() + 1, 0);

      const { data: workOrders, error } = await db('estate_issues')
        .select('*, work_order_evidence(*), estate_work_orders(estimated_cost_minor, actual_cost_minor)')
        .eq('vendor_id', vendorId)
        .eq('organization_id', orgId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (error) throw error;

      if (!workOrders || workOrders.length === 0) {
        return null;
      }

      const metrics = this.calculateVendorMetrics(workOrders);

      const { data, error: upsertError } = await db('vendor_performance')
        .upsert({
          organization_id: orgId,
          vendor_id: vendorId,
          period_month: monthStart.toISOString().split('T')[0],
          total_jobs: metrics.totalJobs,
          completed_on_time: metrics.completedOnTime,
          completed_late: metrics.completedLate,
          incomplete: metrics.incomplete,
          average_response_hours: metrics.avgResponseHours,
          average_resolution_hours: metrics.avgResolutionHours,
          quality_rating: metrics.qualityRating,
          cost_performance: metrics.costPerformance,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'organization_id,vendor_id,period_month'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      return data as VendorPerformance;
    } catch (error) {
      console.error('Error updating vendor performance:', error);
      throw error;
    }
  }

  calculateVendorMetrics(workOrders: Array<EstateIssue & { estate_work_orders?: WorkOrderCost[] }>) {
    let completedOnTime = 0;
    let completedLate = 0;
    let incomplete = 0;
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let completedCount = 0;
    const costPerformanceSamples: number[] = [];

    for (const wo of workOrders) {
      if (wo.resolved_at) {
        // Calculate if on-time
        const slaDue = new Date(wo.created_at);
        slaDue.setSeconds(slaDue.getSeconds() + this.intervalToSeconds(wo.sla_resolution_target || 'PT48H'));
        const resolvedTime = new Date(wo.resolved_at);

        if (resolvedTime <= slaDue) {
          completedOnTime++;
        } else {
          completedLate++;
        }

        // Resolution time
        const resolutionMs = resolvedTime.getTime() - new Date(wo.created_at).getTime();
        totalResolutionTime += resolutionMs;
        completedCount++;
      } else {
        incomplete++;
      }

      // Response time (if acknowledged)
      if (wo.acknowledged_at) {
        const responseMs = new Date(wo.acknowledged_at).getTime() - new Date(wo.created_at).getTime();
        totalResponseTime += responseMs;
      }

      for (const order of wo.estate_work_orders || []) {
        const estimated = Number(order.estimated_cost_minor);
        const actual = Number(order.actual_cost_minor);
        if (Number.isFinite(estimated) && estimated > 0 && Number.isFinite(actual) && actual > 0) {
          // 100 means on budget; >100 means under budget and <100 means over budget.
          costPerformanceSamples.push(Math.min(999.99, (estimated / actual) * 100));
        }
      }
    }

    return {
      totalJobs: workOrders.length,
      completedOnTime,
      completedLate,
      incomplete,
      avgResponseHours: completedCount > 0 ? (totalResponseTime / completedCount) / 3600000 : 0,
      avgResolutionHours: completedCount > 0 ? (totalResolutionTime / completedCount) / 3600000 : 0,
      qualityRating: completedCount > 0 ? (completedOnTime / completedCount) * 5 : 0,
      costPerformance: costPerformanceSamples.length
        ? Math.round((costPerformanceSamples.reduce((sum, value) => sum + value, 0) / costPerformanceSamples.length) * 100) / 100
        : null
    };
  }

  async getVendorPerformance(orgId: string, vendorId: string, months?: number) {
    try {
      let query = db('vendor_performance')
        .select('*')
        .eq('organization_id', orgId)
        .eq('vendor_id', vendorId);

      if (months) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        query = query.gte('period_month', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('period_month', { ascending: false });
      if (error) throw error;
      return data as VendorPerformance[];
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      throw error;
    }
  }

  /**
   * SLA Dashboard
   */

  async getSLADashboard(orgId: string) {
    try {
      const { data, error } = await db('sla_dashboard_view')
        .select('*')
        .eq('organization_id', orgId)
        .in('sla_status', ['PENDING_RESOLUTION', 'BREACHED_RESOLUTION', 'PENDING_ACK']);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching SLA dashboard:', error);
      throw error;
    }
  }

  /**
   * Helper: Convert PostgreSQL interval to seconds
   */
  private intervalToSeconds(interval: string): number {
    // Parse interval like 'PT48H', 'PT4H', etc.
    const match = interval.match(/PT(\d+)([HM])/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    if (unit === 'H') return value * 3600;
    if (unit === 'M') return value * 60;
    return 0;
  }
}

export const vendorSLAService = new VendorSLAService();
