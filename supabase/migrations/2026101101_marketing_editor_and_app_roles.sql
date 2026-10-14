-- App-wide named roles and marketing publishing. No organization role/membership changes.
CREATE TABLE public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  grants TEXT[] NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX platform_roles_name_unique ON public.platform_roles (lower(trim(name)));
ALTER TABLE public.users ADD COLUMN platform_role_id UUID REFERENCES public.platform_roles(id);
CREATE INDEX users_platform_role_id_idx ON public.users(platform_role_id) WHERE platform_role_id IS NOT NULL;
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_admin_read_roles ON public.platform_roles FOR SELECT TO authenticated USING (public.is_platform_admin());
REVOKE ALL ON public.platform_roles FROM anon, authenticated;
GRANT SELECT ON public.platform_roles TO authenticated;

CREATE OR REPLACE FUNCTION private.protect_platform_role_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Account deletion automatically drops the role link; restoration never re-grants it.
  IF NEW.account_deletion_requested_at IS NOT NULL OR NEW.account_deleted_at IS NOT NULL THEN
    NEW.platform_role_id := NULL;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.platform_role_id IS NOT NULL THEN PERFORM private.require_account_admin(); END IF;
  ELSIF NEW.platform_role_id IS DISTINCT FROM OLD.platform_role_id THEN
    PERFORM private.require_account_admin();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_platform_role_link() FROM PUBLIC;
CREATE TRIGGER protect_platform_role_link BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION private.protect_platform_role_link();

CREATE OR REPLACE FUNCTION private.validate_platform_role_grants(p_grants TEXT[])
RETURNS VOID LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF p_grants IS NULL OR cardinality(p_grants) = 0 OR EXISTS (
    SELECT 1 FROM unnest(p_grants) g WHERE g IS NULL OR g <> ALL(ARRAY[
      'users','organizations','listings','moderation','trust','support','revenue','settings',
      'integrations','ai_governance','payments','communications'
    ])
  ) THEN RAISE EXCEPTION 'Choose at least one supported app permission'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_platform_role_grants(TEXT[]) FROM PUBLIC;

-- Direct grant changes detach a named role, so later role edits cannot override them.
CREATE OR REPLACE FUNCTION public.admin_set_user_platform_access(
  p_user_id UUID,
  p_is_platform_admin BOOLEAN,
  p_grants TEXT[] DEFAULT '{}'
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_before public.users;
  v_after public.users;
  v_grants TEXT[];
  v_invalid_grants TEXT[];
BEGIN
  PERFORM private.require_account_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'A platform admin cannot change their own platform access';
  END IF;

  SELECT * INTO v_before FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_before.account_deleted_at IS NOT NULL OR v_before.account_deletion_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'Platform access cannot be granted to an account pending deletion';
  END IF;
  IF COALESCE(v_before.banned, FALSE) AND COALESCE(p_is_platform_admin, FALSE) THEN
    RAISE EXCEPTION 'Restore the account before promoting it to platform admin';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT grant_name ORDER BY grant_name), '{}'::TEXT[])
    INTO v_grants
    FROM unnest(COALESCE(p_grants, '{}'::TEXT[])) AS grant_name;
  SELECT COALESCE(array_agg(grant_name), '{}'::TEXT[])
    INTO v_invalid_grants
    FROM unnest(v_grants) AS grant_name
    WHERE grant_name <> ALL(ARRAY[
      'users','organizations','listings','moderation','trust','support','revenue','settings',
      'integrations','ai_governance','payments','communications'
    ]);
  IF CARDINALITY(v_invalid_grants) > 0 THEN
    RAISE EXCEPTION 'Unsupported platform grants: %', array_to_string(v_invalid_grants, ', ');
  END IF;

  UPDATE public.users
  SET is_platform_admin = COALESCE(p_is_platform_admin, FALSE),
      platform_console_grants = CASE WHEN COALESCE(p_is_platform_admin, FALSE) THEN '{}'::TEXT[] ELSE v_grants END,
      is_platform_manager = CASE WHEN COALESCE(p_is_platform_admin, FALSE) THEN FALSE ELSE CARDINALITY(v_grants) > 0 END,
      platform_role_id = NULL,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'admin_set_user_platform_access', 'user', p_user_id::TEXT,
    jsonb_build_object(
      'before', jsonb_build_object('is_platform_admin', v_before.is_platform_admin, 'grants', v_before.platform_console_grants),
      'after', jsonb_build_object('is_platform_admin', v_after.is_platform_admin, 'grants', v_after.platform_console_grants)
    ));
  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_platform_access(UUID,BOOLEAN,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_platform_access(UUID,BOOLEAN,TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_platform_role(p_user_id UUID, p_role_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_role public.platform_roles; v_user public.users;
BEGIN
  PERFORM private.require_account_admin();
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own app role'; END IF;
  IF p_role_id IS NOT NULL THEN
    SELECT * INTO v_role FROM public.platform_roles WHERE id = p_role_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'App role not found'; END IF;
  END IF;
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.is_platform_admin THEN RAISE EXCEPTION 'Manage platform admin access in the existing user access controls'; END IF;
  IF p_role_id IS NOT NULL AND (COALESCE(v_user.banned, FALSE) OR v_user.account_deleted_at IS NOT NULL OR v_user.account_deletion_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Choose an active user';
  END IF;
  IF p_role_id IS NULL AND v_user.platform_role_id IS NULL THEN RAISE EXCEPTION 'This user has no named app role to remove'; END IF;
  PERFORM public.admin_set_user_platform_access(p_user_id, FALSE, COALESCE(v_role.grants, '{}'::TEXT[]));
  UPDATE public.users SET platform_role_id = p_role_id WHERE id = p_user_id;
  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES(auth.uid(), 'admin_assign_platform_role', 'user', p_user_id::TEXT, jsonb_build_object('before_role',v_user.platform_role_id,'after_role',p_role_id));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_platform_role(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_platform_role(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_platform_role(p_id UUID, p_name TEXT, p_description TEXT, p_grants TEXT[], p_expected_revision INTEGER)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id UUID; v_user UUID; v_role public.platform_roles; v_grants TEXT[];
BEGIN
  PERFORM private.require_account_admin();
  PERFORM private.validate_platform_role_grants(p_grants);
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 80 OR p_description IS NULL OR length(p_description) > 500 THEN RAISE EXCEPTION 'Enter a role name (2–80 characters) and description (up to 500)'; END IF;
  SELECT array_agg(DISTINCT g ORDER BY g) INTO v_grants FROM unnest(p_grants) g;
  IF p_id IS NULL THEN
    INSERT INTO public.platform_roles(name,description,grants,created_by) VALUES(trim(p_name),p_description,v_grants,auth.uid()) RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_role FROM public.platform_roles WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR p_expected_revision IS DISTINCT FROM v_role.revision THEN RAISE EXCEPTION 'The role changed. Reload before saving'; END IF;
    IF EXISTS (SELECT 1 FROM public.users WHERE platform_role_id = p_id AND (id = auth.uid() OR is_platform_admin)) THEN RAISE EXCEPTION 'A named role cannot modify platform admin access'; END IF;
    UPDATE public.platform_roles SET name=trim(p_name),description=p_description,grants=v_grants,revision=revision+1,updated_at=NOW() WHERE id=p_id;
    -- Keep existing client checks, RLS functions and API grants in sync atomically.
    FOR v_user IN SELECT id FROM public.users WHERE platform_role_id=p_id ORDER BY id FOR UPDATE LOOP
      PERFORM public.admin_set_user_platform_access(v_user,FALSE,v_grants);
      UPDATE public.users SET platform_role_id=p_id WHERE id=v_user;
    END LOOP;
    v_id := p_id;
  END IF;
  INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'admin_save_platform_role','platform_role',v_id::TEXT,jsonb_build_object('name',trim(p_name),'grants',v_grants));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_platform_role(UUID,TEXT,TEXT,TEXT[],INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_platform_role(UUID,TEXT,TEXT,TEXT[],INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_platform_role(p_id UUID, p_expected_revision INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_role public.platform_roles;
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO v_role FROM public.platform_roles WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR p_expected_revision IS DISTINCT FROM v_role.revision THEN RAISE EXCEPTION 'The role changed. Reload before deleting'; END IF;
  IF EXISTS(SELECT 1 FROM public.users WHERE platform_role_id=p_id) THEN RAISE EXCEPTION 'Remove all user assignments before deleting this role'; END IF;
  DELETE FROM public.platform_roles WHERE id=p_id;
  INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'admin_delete_platform_role','platform_role',p_id::TEXT,jsonb_build_object('name',v_role.name));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_platform_role(UUID,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_platform_role(UUID,INTEGER) TO authenticated;

-- Drafts are private; public visitors can only read the explicitly published document.
CREATE TABLE public.marketing_page_drafts (
  id TEXT PRIMARY KEY CHECK(id='homepage'), document JSONB NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.marketing_page_published (
  id TEXT PRIMARY KEY CHECK(id='homepage'), document JSONB NOT NULL,
  revision INTEGER NOT NULL, published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.marketing_page_drafts(id) VALUES('homepage');
ALTER TABLE public.marketing_page_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_page_published ENABLE ROW LEVEL SECURITY;
CREATE POLICY marketing_admin_read_drafts ON public.marketing_page_drafts FOR SELECT TO authenticated USING(public.is_platform_admin());
CREATE POLICY marketing_public_read_published ON public.marketing_page_published FOR SELECT TO anon, authenticated USING(TRUE);
REVOKE ALL ON public.marketing_page_drafts, public.marketing_page_published FROM anon, authenticated;
GRANT SELECT ON public.marketing_page_drafts TO authenticated;
GRANT SELECT ON public.marketing_page_published TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_marketing_document(p_document JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_path TEXT; v_text JSONB; v_item JSONB; v_images JSONB; v_limit INTEGER;
BEGIN
  IF p_document IS NULL OR jsonb_typeof(p_document)<>'object' OR octet_length(p_document::TEXT)>64000 THEN RAISE EXCEPTION 'Invalid marketing document'; END IF;
  FOREACH v_path IN ARRAY ARRAY['hero.eyebrow','hero.title','hero.secondLine','hero.description','seo.title','seo.description','finalCta.title','finalCta.description'] LOOP
    v_text := p_document #> string_to_array(v_path,'.');
    v_limit := CASE WHEN v_path LIKE '%.description' THEN 500 WHEN v_path IN ('seo.title','finalCta.title') THEN 150 ELSE 100 END;
    IF v_text IS NULL OR jsonb_typeof(v_text)<>'string' OR length(trim(v_text #>> '{}')) NOT BETWEEN 1 AND v_limit THEN RAISE EXCEPTION 'Invalid marketing text: %',v_path; END IF;
  END LOOP;
  v_images := p_document #> '{hero,images}';
  IF v_images IS NULL OR jsonb_typeof(v_images)<>'array' THEN RAISE EXCEPTION 'Invalid photo selection'; END IF;
  IF jsonb_array_length(v_images) NOT BETWEEN 4 AND 5 OR
    (SELECT COUNT(DISTINCT img) FROM jsonb_array_elements_text(v_images) img) <> jsonb_array_length(v_images) OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(v_images) img WHERE jsonb_typeof(img)<>'string' OR COALESCE(img #>> '{}','') NOT IN ('residences','interior','community','architecture','commercial')
    ) THEN RAISE EXCEPTION 'Choose 4–5 different licensed photos'; END IF;
  IF COALESCE(jsonb_typeof(p_document->'faq'),'null')<>'array' OR COALESCE(jsonb_typeof(p_document->'sections'),'null')<>'array' THEN RAISE EXCEPTION 'Invalid FAQ or sections'; END IF;
  IF jsonb_array_length(p_document->'faq') NOT BETWEEN 1 AND 12 OR jsonb_array_length(p_document->'sections')>8 THEN RAISE EXCEPTION 'Invalid FAQ or section count'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_document->'faq') LOOP
    IF jsonb_typeof(v_item->'q') IS DISTINCT FROM 'string' OR length(trim(v_item->>'q')) NOT BETWEEN 1 AND 200 OR
      jsonb_typeof(v_item->'a') IS DISTINCT FROM 'string' OR length(trim(v_item->>'a')) NOT BETWEEN 1 AND 1500 THEN RAISE EXCEPTION 'Invalid FAQ text'; END IF;
  END LOOP;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_document->'sections') LOOP
    IF jsonb_typeof(v_item->'title') IS DISTINCT FROM 'string' OR length(trim(v_item->>'title')) NOT BETWEEN 1 AND 150 OR
      jsonb_typeof(v_item->'body') IS DISTINCT FROM 'string' OR length(trim(v_item->>'body')) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Invalid section text'; END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_marketing_document(JSONB) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_save_marketing_draft(p_document JSONB,p_expected_revision INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_revision INTEGER;
BEGIN
  PERFORM private.require_account_admin();
  PERFORM private.validate_marketing_document(p_document);
  UPDATE public.marketing_page_drafts SET document=p_document,revision=revision+1,updated_at=NOW() WHERE id='homepage' AND revision=p_expected_revision RETURNING revision INTO v_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'The draft changed. Reload before saving'; END IF;
  INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details) VALUES(auth.uid(),'admin_save_marketing_draft','marketing_page','homepage',jsonb_build_object('revision',v_revision));
  RETURN v_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_marketing_draft(JSONB,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_marketing_draft(JSONB,INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_publish_marketing_page(p_expected_revision INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_draft public.marketing_page_drafts;
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO v_draft FROM public.marketing_page_drafts WHERE id='homepage' FOR UPDATE;
  IF NOT FOUND OR p_expected_revision IS DISTINCT FROM v_draft.revision THEN RAISE EXCEPTION 'The draft changed. Reload before publishing'; END IF;
  PERFORM private.validate_marketing_document(v_draft.document);
  INSERT INTO public.marketing_page_published(id,document,revision) VALUES('homepage',v_draft.document,v_draft.revision)
    ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document,revision=EXCLUDED.revision,published_at=NOW();
  INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details) VALUES(auth.uid(),'admin_publish_marketing_page','marketing_page','homepage',jsonb_build_object('revision',v_draft.revision));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_publish_marketing_page(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_publish_marketing_page(INTEGER) TO authenticated;
CREATE POLICY platform_admin_read_marketing_role_audit ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_platform_admin() AND action IN (
    'admin_save_platform_role','admin_assign_platform_role','admin_delete_platform_role',
    'admin_save_marketing_draft','admin_publish_marketing_page'
  ));
