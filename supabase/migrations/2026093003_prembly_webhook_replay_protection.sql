CREATE TABLE IF NOT EXISTS public.kyc_provider_webhook_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL,
  event_token TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_token)
);

ALTER TABLE public.kyc_provider_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kyc_provider_webhook_events FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_kyc_provider_webhook_events_received
  ON public.kyc_provider_webhook_events(received_at);

COMMENT ON TABLE public.kyc_provider_webhook_events IS
  'Server-only replay protection for signed KYC provider callbacks; payloads are intentionally not retained.';

CREATE OR REPLACE FUNCTION public.purge_expired_kyc_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  DELETE FROM public.kyc_provider_webhook_events
  WHERE received_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_kyc_webhook_events() FROM PUBLIC, anon, authenticated;
