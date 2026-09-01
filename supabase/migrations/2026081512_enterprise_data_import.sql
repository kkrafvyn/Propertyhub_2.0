CREATE TABLE public.estate_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('estates_units')), file_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','approved','imported','failed')),
  total_rows INTEGER NOT NULL DEFAULT 0, valid_rows INTEGER NOT NULL DEFAULT 0, imported_rows INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), imported_at TIMESTAMPTZ
);
CREATE TABLE public.estate_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES public.estate_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL, payload_json JSONB NOT NULL, validation_errors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], imported BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(job_id,row_number)
);
ALTER TABLE public.estate_import_jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_import_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization managers manage estate import jobs" ON public.estate_import_jobs FOR ALL USING (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
CREATE POLICY "Organization managers manage estate import rows" ON public.estate_import_rows FOR ALL USING (EXISTS(SELECT 1 FROM public.estate_import_jobs j JOIN public.organization_members m ON m.organization_id=j.organization_id WHERE j.id=job_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS(SELECT 1 FROM public.estate_import_jobs j JOIN public.organization_members m ON m.organization_id=j.organization_id WHERE j.id=job_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.estate_import_jobs, public.estate_import_rows TO authenticated;
