-- Restrict platform-wide operational events to platform staff only.

DROP POLICY IF EXISTS "Organization members view operational events" ON public.operational_events;

CREATE POLICY "Organization members view operational events"
ON public.operational_events FOR SELECT
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = operational_events.organization_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Platform staff view platform operational events"
ON public.operational_events FOR SELECT
USING (
  organization_id IS NULL
  AND public.is_platform_staff()
);

NOTIFY pgrst, 'reload schema';
