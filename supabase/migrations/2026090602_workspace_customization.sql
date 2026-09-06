-- Workspace customization: default home, nav visibility, terminology (in setup_metadata)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_home_slug TEXT;

COMMENT ON COLUMN public.organizations.default_home_slug IS
  'Optional org-wide landing page slug override for workspace home redirect.';
