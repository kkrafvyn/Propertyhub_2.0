-- Public rental application intake with staff-controlled approval.
CREATE TABLE IF NOT EXISTS public.estate_lease_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  applicant_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  public_token TEXT NOT NULL UNIQUE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  household_size INTEGER NOT NULL DEFAULT 1 CHECK (household_size > 0),
  employment_summary TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','screening','approved','rejected','withdrawn')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lease_applications_estate_status_idx ON public.estate_lease_applications(estate_id, status, submitted_at DESC);
ALTER TABLE public.estate_lease_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public applicants view own application" ON public.estate_lease_applications FOR SELECT USING (applicant_user_id = auth.uid());
CREATE POLICY "Estate staff manage applications" ON public.estate_lease_applications FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
GRANT SELECT, INSERT ON public.estate_lease_applications TO anon;
GRANT SELECT, INSERT, UPDATE ON public.estate_lease_applications TO authenticated;