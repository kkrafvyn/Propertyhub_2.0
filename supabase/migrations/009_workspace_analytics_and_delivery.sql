-- Advanced workspace access, saved searches, and web push readiness
-- Note: Supabase CLI was not available in this environment, so this migration
-- file was added manually to continue the repo's numbered migration sequence.

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  query TEXT,
  filters JSONB,
  alerts BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created_at
ON public.saved_searches(user_id, created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mobile_devices
  DROP CONSTRAINT IF EXISTS mobile_devices_device_type_check;

ALTER TABLE public.mobile_devices
  ADD CONSTRAINT mobile_devices_device_type_check
  CHECK (device_type IN ('ios', 'android', 'web'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.market_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.location_trends TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_branding TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.automation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.location_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.heatmap_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Users can manage their saved searches" ON public.saved_searches;
CREATE POLICY "Users can manage their saved searches"
ON public.saved_searches FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view market analytics" ON public.market_analytics;
CREATE POLICY "Authenticated users can view market analytics"
ON public.market_analytics FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view location trends" ON public.location_trends;
CREATE POLICY "Authenticated users can view location trends"
ON public.location_trends FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view location scores" ON public.location_scores;
CREATE POLICY "Authenticated users can view location scores"
ON public.location_scores FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view heatmap data" ON public.heatmap_data;
CREATE POLICY "Authenticated users can view heatmap data"
ON public.heatmap_data FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members can view organization insights" ON public.organization_insights;
CREATE POLICY "Members can view organization insights"
ON public.organization_insights FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_insights.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can write organization insights" ON public.organization_insights;
CREATE POLICY "Members can write organization insights"
ON public.organization_insights FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_insights.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update organization insights" ON public.organization_insights;
CREATE POLICY "Members can update organization insights"
ON public.organization_insights FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_insights.organization_id
      AND organization_member.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_insights.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can view organization settings" ON public.organization_settings;
CREATE POLICY "Members can view organization settings"
ON public.organization_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_settings.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can write organization settings" ON public.organization_settings;
CREATE POLICY "Managers can write organization settings"
ON public.organization_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_settings.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update organization settings" ON public.organization_settings;
CREATE POLICY "Managers can update organization settings"
ON public.organization_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_settings.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_settings.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Members can view organization branding" ON public.organization_branding;
CREATE POLICY "Members can view organization branding"
ON public.organization_branding FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_branding.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can write organization branding" ON public.organization_branding;
CREATE POLICY "Managers can write organization branding"
ON public.organization_branding FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_branding.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update organization branding" ON public.organization_branding;
CREATE POLICY "Managers can update organization branding"
ON public.organization_branding FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_branding.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = organization_branding.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Members can view automation workflows" ON public.automation_workflows;
CREATE POLICY "Members can view automation workflows"
ON public.automation_workflows FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = automation_workflows.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can create automation workflows" ON public.automation_workflows;
CREATE POLICY "Managers can create automation workflows"
ON public.automation_workflows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = automation_workflows.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update automation workflows" ON public.automation_workflows;
CREATE POLICY "Managers can update automation workflows"
ON public.automation_workflows FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = automation_workflows.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = automation_workflows.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can delete automation workflows" ON public.automation_workflows;
CREATE POLICY "Managers can delete automation workflows"
ON public.automation_workflows FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = automation_workflows.organization_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Members can view automation logs" ON public.automation_logs;
CREATE POLICY "Members can view automation logs"
ON public.automation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_workflows workflow
    JOIN public.organization_members organization_member
      ON organization_member.organization_id = workflow.organization_id
    WHERE workflow.id = automation_logs.workflow_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can create automation logs" ON public.automation_logs;
CREATE POLICY "Managers can create automation logs"
ON public.automation_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.automation_workflows workflow
    JOIN public.organization_members organization_member
      ON organization_member.organization_id = workflow.organization_id
    WHERE workflow.id = automation_logs.workflow_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update automation logs" ON public.automation_logs;
CREATE POLICY "Managers can update automation logs"
ON public.automation_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_workflows workflow
    JOIN public.organization_members organization_member
      ON organization_member.organization_id = workflow.organization_id
    WHERE workflow.id = automation_logs.workflow_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.automation_workflows workflow
    JOIN public.organization_members organization_member
      ON organization_member.organization_id = workflow.organization_id
    WHERE workflow.id = automation_logs.workflow_id
      AND organization_member.user_id = auth.uid()
      AND organization_member.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Users can manage their own mobile devices" ON public.mobile_devices;
CREATE POLICY "Users can manage their own mobile devices"
ON public.mobile_devices FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.mobile_devices mobile_device
    WHERE mobile_device.id = push_subscriptions.device_id
      AND mobile_device.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.mobile_devices mobile_device
    WHERE mobile_device.id = push_subscriptions.device_id
      AND mobile_device.user_id = auth.uid()
  )
);
