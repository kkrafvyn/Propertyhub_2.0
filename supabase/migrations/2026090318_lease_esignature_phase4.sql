-- Phase 4: e-sign reminders + notification tracking

ALTER TABLE public.esignature_requests
  ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS esignature_pending_reminder_idx
  ON public.esignature_requests (status, expires_at)
  WHERE status IN ('sent', 'viewed', 'partially_signed');

COMMENT ON COLUMN public.esignature_requests.reminder_count IS 'Number of tenant reminders sent for unsigned envelope';
COMMENT ON COLUMN public.esignature_requests.last_reminder_at IS 'Last reminder dispatch timestamp';

-- Pending reminders: sent 24h+ ago, max 3 reminders, 2-day gap between reminders
CREATE OR REPLACE FUNCTION public.get_esignature_reminder_candidates(p_stale_before TIMESTAMPTZ DEFAULT NOW() - INTERVAL '2 days')
RETURNS SETOF public.esignature_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.*
  FROM public.esignature_requests e
  WHERE e.status IN ('sent', 'viewed', 'partially_signed')
    AND e.reminder_count < 3
    AND (e.expires_at IS NULL OR e.expires_at > NOW())
    AND (
      (e.last_reminder_at IS NULL AND e.created_at < NOW() - INTERVAL '24 hours')
      OR (e.last_reminder_at IS NOT NULL AND e.last_reminder_at < p_stale_before)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_esignature_reminder_candidates(TIMESTAMPTZ) TO service_role;
