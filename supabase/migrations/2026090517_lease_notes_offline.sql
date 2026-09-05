-- Lease notes for workspace staff + offline idempotency keys

CREATE TABLE IF NOT EXISTS public.lease_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_body TEXT NOT NULL CHECK (char_length(trim(note_body)) > 0),
  note_type TEXT NOT NULL DEFAULT 'general'
    CHECK (note_type IN ('general', 'internal', 'renewal', 'move_out', 'compliance')),
  offline_client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_notes_offline_client
  ON public.lease_notes (offline_client_id)
  WHERE offline_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lease_notes_lease
  ON public.lease_notes (lease_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lease_notes_org
  ON public.lease_notes (organization_id, created_at DESC);

ALTER TABLE public.lease_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view lease notes"
  ON public.lease_notes FOR SELECT
  USING (
    public.is_platform_admin()
    OR private.member_can_access_lease(organization_id, lease_id)
    OR author_user_id = auth.uid()
  );

CREATE POLICY "Org members insert lease notes"
  ON public.lease_notes FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR (
      author_user_id = auth.uid()
      AND private.member_can_access_lease(organization_id, lease_id)
    )
  );

CREATE POLICY "Authors update own lease notes"
  ON public.lease_notes FOR UPDATE
  USING (author_user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Authors delete own lease notes"
  ON public.lease_notes FOR DELETE
  USING (author_user_id = auth.uid() OR public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_notes TO authenticated;
