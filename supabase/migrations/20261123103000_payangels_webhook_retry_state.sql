-- PayAngels webhook processing is durable and retryable. Do not acknowledge a
-- duplicate until reconciliation has COMPLETED, even if delivery was logged.
-- This state is separate from provider-agnostic webhook_events audit records.
CREATE TABLE IF NOT EXISTS public.payangels_webhook_processing (
  event_id TEXT PRIMARY KEY,
  payload_sha256 TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  lease_token UUID NOT NULL DEFAULT gen_random_uuid(),
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payangels_webhook_processing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payangels_webhook_processing FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_payangels_webhook_event(
  p_event_id TEXT, p_payload_sha256 TEXT, p_reference TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_token UUID := gen_random_uuid();
  v_current public.payangels_webhook_processing%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR p_event_id IS NULL OR length(p_event_id) NOT BETWEEN 1 AND 250
      OR p_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid webhook claim' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.payangels_webhook_processing
    (event_id, payload_sha256, reference, status, attempts, lease_token, lease_until, updated_at)
  VALUES
    (p_event_id, p_payload_sha256, p_reference, 'processing', 1, v_token,
      clock_timestamp() + INTERVAL '5 minutes', clock_timestamp())
  ON CONFLICT (event_id) DO UPDATE SET
    status='processing',
    attempts=public.payangels_webhook_processing.attempts+1,
    lease_token=v_token,
    lease_until=clock_timestamp() + INTERVAL '5 minutes',
    last_error=NULL,
    updated_at=clock_timestamp()
  WHERE public.payangels_webhook_processing.payload_sha256=excluded.payload_sha256
    AND (public.payangels_webhook_processing.status='failed'
      OR (public.payangels_webhook_processing.status='processing'
        AND public.payangels_webhook_processing.lease_until < clock_timestamp()))
  RETURNING * INTO v_current;

  IF FOUND THEN
    RETURN jsonb_build_object('state','claimed','token',v_current.lease_token);
  END IF;
  SELECT * INTO v_current FROM public.payangels_webhook_processing WHERE event_id=p_event_id;
  IF v_current.payload_sha256 IS DISTINCT FROM p_payload_sha256 THEN
    RAISE EXCEPTION 'Webhook event identity collision' USING ERRCODE='23505';
  END IF;
  RETURN jsonb_build_object(
    'state',CASE WHEN v_current.status='completed' THEN 'completed' ELSE 'busy' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_payangels_webhook_event(
  p_event_id TEXT, p_lease_token UUID, p_succeeded BOOLEAN, p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Webhook completion denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.payangels_webhook_processing SET
    status=CASE WHEN p_succeeded THEN 'completed' ELSE 'failed' END,
    completed_at=CASE WHEN p_succeeded THEN clock_timestamp() ELSE NULL END,
    lease_until=NULL,
    last_error=CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error,'Reconciliation failed'),250) END,
    updated_at=clock_timestamp()
  WHERE event_id=p_event_id AND lease_token=p_lease_token AND status='processing';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payangels_webhook_event(TEXT,TEXT,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_payangels_webhook_event(TEXT,UUID,BOOLEAN,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payangels_webhook_event(TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payangels_webhook_event(TEXT,UUID,BOOLEAN,TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
