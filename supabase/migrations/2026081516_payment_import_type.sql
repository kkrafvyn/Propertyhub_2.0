ALTER TABLE public.estate_import_jobs DROP CONSTRAINT IF EXISTS estate_import_jobs_import_type_check;
ALTER TABLE public.estate_import_jobs ADD CONSTRAINT estate_import_jobs_import_type_check CHECK (import_type IN ('estates_units','occupancies','opening_charges','payments'));
