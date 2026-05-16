-- Rebrand scheduled automation from the legacy app name to BaytMiftah.
-- Existing production projects may already have the old cron job name from earlier migrations.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  old_job_id BIGINT;
  current_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO old_job_id
  FROM cron.job
  WHERE jobname = 'property' || 'hub-automation-dispatcher'
  LIMIT 1;

  IF old_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(old_job_id);
  END IF;

  SELECT jobid
  INTO current_job_id
  FROM cron.job
  WHERE jobname = 'baytmiftah-automation-dispatcher'
  LIMIT 1;

  IF current_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(current_job_id);
  END IF;

  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url')
    AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    PERFORM cron.schedule(
      'baytmiftah-automation-dispatcher',
      '*/15 * * * *',
      $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/automation-dispatcher',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
          ),
          body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', now())
        ) AS request_id;
      $job$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Cron/Vault tables are not available yet. Schedule baytmiftah-automation-dispatcher after secrets are configured.';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cron schedule could not be renamed automatically. Configure baytmiftah-automation-dispatcher manually after deployment.';
END $$;
