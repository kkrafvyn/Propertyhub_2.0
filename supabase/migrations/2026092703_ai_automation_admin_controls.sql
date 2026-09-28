-- Restrict AI alert and automation event writes to organization administrators.
-- Org members may still read, but they may not create, update, or trigger operational state changes.

DROP POLICY IF EXISTS "Members access automation events" ON public.estate_automation_events;
DROP POLICY IF EXISTS "Members access AI alerts" ON public.estate_ai_watch_alerts;

CREATE POLICY "Org admins manage automation events"
ON public.estate_automation_events
FOR ALL
USING (private.is_org_admin(organization_id))
WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "Org admins manage AI alerts"
ON public.estate_ai_watch_alerts
FOR ALL
USING (private.is_org_admin(organization_id))
WITH CHECK (private.is_org_admin(organization_id));

-- Keep the permission boundary explicit even when the caller is authenticated.
REVOKE ALL ON TABLE public.estate_automation_events, public.estate_ai_watch_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estate_automation_events, public.estate_ai_watch_alerts TO authenticated;
