-- BaytMiftah P0 Phase 1: Vendor SLA Tracking
-- Enhances work order management with SLA monitoring, vendor performance metrics, and alerts

-- Enhance estate_issues with SLA fields
ALTER TABLE IF EXISTS public.estate_issues
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sla_acknowledgement_target INTERVAL DEFAULT INTERVAL '4 hours',
ADD COLUMN IF NOT EXISTS sla_resolution_target INTERVAL DEFAULT INTERVAL '48 hours',
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_breach_reason TEXT;

-- SLA Alert tracking
CREATE TABLE IF NOT EXISTS public.sla_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES public.estate_issues(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ACKNOWLEDGEMENT_PENDING', 'ACKNOWLEDGEMENT_BREACHED', 'RESOLUTION_PENDING', 'RESOLUTION_BREACHED')),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  escalated_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Vendor performance scorecards (materialized from work orders)
CREATE TABLE IF NOT EXISTS public.vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,  -- First day of month for aggregation
  total_jobs INT NOT NULL DEFAULT 0,
  completed_on_time INT NOT NULL DEFAULT 0,
  completed_late INT NOT NULL DEFAULT 0,
  incomplete INT NOT NULL DEFAULT 0,
  average_response_hours NUMERIC(10, 2),
  average_resolution_hours NUMERIC(10, 2),
  quality_rating NUMERIC(3, 1),
  cost_performance NUMERIC(5, 2),  -- Average cost vs industry benchmark
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, vendor_id, period_month)
);

-- Work order evidence/photos for completion tracking
CREATE TABLE IF NOT EXISTS public.work_order_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.estate_issues(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('BEFORE_PHOTO', 'AFTER_PHOTO', 'INVOICE', 'RECEIPT', 'NOTE', 'VIDEO')),
  file_path TEXT,
  file_url TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sla_alerts_org ON public.sla_alerts(organization_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_status ON public.sla_alerts(alert_type, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_vendor_perf_org ON public.vendor_performance(organization_id, vendor_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_work_order_evidence ON public.work_order_evidence(issue_id);

-- RLS Policies
ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_evidence ENABLE ROW LEVEL SECURITY;

-- Organizations can read SLA alerts
CREATE POLICY "org_can_read_sla_alerts" ON public.sla_alerts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Operations role can manage SLA alerts
CREATE POLICY "ops_can_manage_sla_alerts" ON public.sla_alerts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'operations')
    )
  );

-- Organizations can read vendor performance
CREATE POLICY "org_can_read_vendor_perf" ON public.vendor_performance
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can read work order evidence
CREATE POLICY "org_can_read_evidence" ON public.work_order_evidence
  FOR SELECT USING (
    issue_id IN (
      SELECT id FROM public.estate_issues 
      WHERE estate_id IN (
        SELECT estate_id FROM public.managed_estates 
        WHERE organization_id IN (
          SELECT organization_id FROM public.workspace_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Operations can upload evidence
CREATE POLICY "ops_can_upload_evidence" ON public.work_order_evidence
  FOR INSERT WITH CHECK (
    issue_id IN (
      SELECT id FROM public.estate_issues 
      WHERE estate_id IN (
        SELECT estate_id FROM public.managed_estates 
        WHERE organization_id IN (
          SELECT organization_id FROM public.workspace_members 
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'operations', 'technician')
        )
      )
    )
  );

-- Materialized view for SLA Dashboard (refresh hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.sla_dashboard_view AS
SELECT 
  me.organization_id,
  ei.id as issue_id,
  ei.title,
  ei.status,
  ei.priority,
  ei.created_at,
  ei.sla_acknowledgement_target,
  ei.sla_resolution_target,
  ei.acknowledged_at,
  ei.sla_breached_at,
  CASE 
    WHEN ei.acknowledged_at IS NULL THEN 'PENDING_ACK'
    WHEN ei.resolved_at IS NULL AND (NOW() > ei.created_at + ei.sla_resolution_target) THEN 'BREACHED_RESOLUTION'
    WHEN ei.resolved_at IS NULL THEN 'PENDING_RESOLUTION'
    WHEN ei.resolved_at <= ei.created_at + ei.sla_resolution_target THEN 'MET'
    ELSE 'MISSED'
  END as sla_status,
  NOW() - ei.created_at as time_elapsed,
  ei.sla_resolution_target - (NOW() - ei.created_at) as time_remaining,
  v.business_name as vendor_name,
  vp.quality_rating,
  vp.completed_on_time::float / NULLIF(vp.total_jobs, 0) as vendor_on_time_pct
FROM public.estate_issues ei
JOIN public.managed_estates me ON me.id = ei.estate_id
LEFT JOIN public.vendors v ON ei.vendor_id = v.id
LEFT JOIN public.vendor_performance vp ON v.id = vp.vendor_id 
  AND vp.organization_id = me.organization_id
  AND vp.period_month = DATE_TRUNC('month', NOW())::DATE;

CREATE INDEX IF NOT EXISTS idx_sla_dashboard_view_org ON public.sla_dashboard_view(organization_id);
