ALTER TABLE public.estate_import_jobs
  ADD COLUMN IF NOT EXISTS source_format TEXT,
  ADD COLUMN IF NOT EXISTS extraction_method TEXT,
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(4, 2);
