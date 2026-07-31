-- Legal acceptances audit trail and support complaints

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  policy_version text NOT NULL,
  policies text[] NOT NULL DEFAULT '{}',
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_id_idx ON public.legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS legal_acceptances_scope_idx ON public.legal_acceptances(scope);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own legal acceptances"
  ON public.legal_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own legal acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can read all legal acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.support_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  contact_email text,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  listing_id uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_complaints_status_idx ON public.support_complaints(status);
CREATE INDEX IF NOT EXISTS support_complaints_user_id_idx ON public.support_complaints(user_id);

ALTER TABLE public.support_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaints"
  ON public.support_complaints FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can read own complaints"
  ON public.support_complaints FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can manage complaints"
  ON public.support_complaints FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT SELECT, INSERT ON public.support_complaints TO anon, authenticated;
