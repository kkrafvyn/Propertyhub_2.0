-- Platform backup jobs (Layer 2: offsite copies in Supabase Storage — AWS S3 is a future option).

CREATE TABLE IF NOT EXISTS public.platform_backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  tier TEXT NOT NULL DEFAULT 'manual'
    CHECK (tier IN ('manual', 'scheduled', 'pre-migration')),
  triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  table_count INT NOT NULL DEFAULT 0,
  row_count INT NOT NULL DEFAULT 0,
  critical_table_count INT NOT NULL DEFAULT 0,
  storage_prefix TEXT,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_backup_jobs_started_at
  ON public.platform_backup_jobs (started_at DESC);

COMMENT ON TABLE public.platform_backup_jobs IS
  'Admin-triggered platform backups stored in the platform-backups storage bucket.';

ALTER TABLE public.platform_backup_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins manage backup jobs" ON public.platform_backup_jobs;
CREATE POLICY "Platform admins manage backup jobs"
ON public.platform_backup_jobs FOR ALL
USING (
  public.is_platform_admin()
  OR 'settings' = ANY(
    COALESCE(
      (SELECT platform_console_grants FROM public.users WHERE id = auth.uid()),
      '{}'::TEXT[]
    )
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR 'settings' = ANY(
    COALESCE(
      (SELECT platform_console_grants FROM public.users WHERE id = auth.uid()),
      '{}'::TEXT[]
    )
  )
);

CREATE OR REPLACE FUNCTION public.list_public_base_tables()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('schema_migrations')
  ORDER BY table_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_base_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_base_tables() TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-backups',
  'platform-backups',
  FALSE,
  52428800,
  ARRAY['application/json', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/json', 'text/plain'];

DROP POLICY IF EXISTS "Platform admins read platform backups" ON storage.objects;
CREATE POLICY "Platform admins read platform backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'platform-backups'
  AND (
    public.is_platform_admin()
    OR 'settings' = ANY(
      COALESCE(
        (SELECT platform_console_grants FROM public.users WHERE id = auth.uid()),
        '{}'::TEXT[]
      )
    )
  )
);
