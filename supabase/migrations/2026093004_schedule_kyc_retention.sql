CREATE OR REPLACE FUNCTION public.purge_expired_kyc_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  IF current_user <> 'postgres' AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  DELETE FROM public.kyc_provider_webhook_events
  WHERE received_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_kyc_webhook_events() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE existing_job BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    SELECT jobid INTO existing_job FROM cron.job WHERE jobname='purge-kyc-webhook-events';
    IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
    PERFORM cron.schedule(
      'purge-kyc-webhook-events',
      '17 3 * * *',
      'SELECT public.purge_expired_kyc_webhook_events()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'KYC webhook retention schedule registration requires manual follow-up: %', SQLERRM;
END;
$$;
