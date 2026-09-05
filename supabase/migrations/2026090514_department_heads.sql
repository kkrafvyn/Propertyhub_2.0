-- Department heads: explicit appointment per org department

ALTER TABLE public.organization_departments
  ADD COLUMN IF NOT EXISTS head_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organization_departments_head
  ON public.organization_departments(head_user_id);

COMMENT ON COLUMN public.organization_departments.head_user_id IS
  'User appointed as head of this department; used for delegation UI and audit.';
