import { supabase } from './supabase'
import type { Database, Json } from './database.types'

type FraudAlertRow = Database['public']['Tables']['fraud_alerts']['Row']

type WorkspaceFraudAlertType =
  | 'duplicate_listing'
  | 'suspicious_lead'
  | 'price_mismatch'
  | 'image_reuse'
  | 'fake_listing'
  | 'scam_pattern'

type WorkspaceFraudSeverity = 'low' | 'medium' | 'high' | 'critical'
type WorkspaceFraudStatus = 'active' | 'investigating' | 'resolved' | 'dismissed'

export interface FraudScanSummary {
  duplicateListings: number
  suspiciousLeads: number
  imageIssues: number
  totalAlertsCreated: number
}

export interface WorkspaceFraudAlert {
  id: string
  alert_type: WorkspaceFraudAlertType
  severity: WorkspaceFraudSeverity
  title: string
  description: string
  evidence: Json | null
  status: WorkspaceFraudStatus
  created_at: string
  resolved_at?: string
}

const ALERT_TYPE_LABELS: Record<WorkspaceFraudAlertType, string> = {
  duplicate_listing: 'Duplicate Listing',
  suspicious_lead: 'Suspicious Lead',
  price_mismatch: 'Price Mismatch',
  image_reuse: 'Image Reuse',
  fake_listing: 'Fake Listing',
  scam_pattern: 'Scam Pattern',
}

function normalizeAlertType(alertType: string | null): WorkspaceFraudAlertType {
  switch (alertType) {
    case 'duplicate_listing':
      return 'duplicate_listing'
    case 'suspicious_lead':
      return 'suspicious_lead'
    case 'price_mismatch':
      return 'price_mismatch'
    case 'image_reuse':
    case 'duplicate_image':
      return 'image_reuse'
    case 'fake_listing':
    case 'suspicious_listing':
      return 'fake_listing'
    case 'scam_pattern':
    case 'suspicious_account':
    case 'fraud_transaction':
    case 'spam_behavior':
    default:
      return 'scam_pattern'
  }
}

function normalizeSeverity(severity: string | null): WorkspaceFraudSeverity {
  if (severity === 'low' || severity === 'high' || severity === 'critical') {
    return severity
  }

  return 'medium'
}

function normalizeStatus(status: string | null): WorkspaceFraudStatus {
  switch (status) {
    case 'resolved':
      return 'resolved'
    case 'dismissed':
    case 'rejected':
      return 'dismissed'
    case 'investigating':
    case 'reviewed':
    case 'approved':
      return 'investigating'
    case 'active':
    case 'pending':
    default:
      return 'active'
  }
}

function toWorkspaceAlert(row: FraudAlertRow): WorkspaceFraudAlert {
  const alertType = normalizeAlertType(row.alert_type)
  const status = normalizeStatus(row.status)
  const title = row.title || ALERT_TYPE_LABELS[alertType]

  return {
    id: row.id,
    alert_type: alertType,
    severity: normalizeSeverity(row.severity),
    title,
    description: row.description || 'This item was flagged for review.',
    evidence: row.evidence,
    status,
    created_at: row.created_at || new Date(0).toISOString(),
    resolved_at: row.resolved_at || undefined,
  }
}

function summarizeAlerts(alerts: WorkspaceFraudAlert[]): FraudScanSummary {
  return {
    duplicateListings: alerts.filter((alert) => alert.alert_type === 'duplicate_listing').length,
    suspiciousLeads: alerts.filter((alert) => alert.alert_type === 'suspicious_lead').length,
    imageIssues: alerts.filter((alert) => alert.alert_type === 'image_reuse').length,
    totalAlertsCreated: alerts.filter(
      (alert) => alert.status === 'active' || alert.status === 'investigating'
    ).length,
  }
}

export const enhancedFraudDetectionService = {
  async getFraudAlerts(
    organizationId: string,
    status?: WorkspaceFraudStatus,
    limit = 100
  ): Promise<WorkspaceFraudAlert[]> {
    let query = supabase
      .from('fraud_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(toWorkspaceAlert)
  },

  async runComprehensiveFraudScan(organizationId: string): Promise<FraudScanSummary> {
    const alerts = await this.getFraudAlerts(organizationId, undefined, 500)
    return summarizeAlerts(alerts)
  },

  async updateAlertStatus(alertId: string, status: WorkspaceFraudStatus) {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', alertId)
      .select('*')
      .single()

    if (error) throw error
    return toWorkspaceAlert(data)
  },
}
