-- Harden document signing, privileged admin enforcement, and org-member write boundaries.

-- 1) Admin actions must always require AAL2, even when the platform admin has no MFA factor enrolled.
CREATE OR REPLACE FUNCTION private.require_account_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND is_platform_admin
      AND NOT COALESCE(banned, FALSE)
  ) THEN
    RAISE EXCEPTION 'Only an active platform admin can manage accounts';
  END IF;

  IF COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Complete multi-factor authentication before managing accounts';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.require_account_admin() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Not authorized to update this user';
    END IF;

    IF public.is_platform_admin() AND COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
      RAISE EXCEPTION 'Platform admin changes require AAL2 authentication';
    END IF;

    IF auth.uid() = OLD.id AND NOT public.is_platform_admin() THEN
      IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
        RAISE EXCEPTION 'Cannot modify platform admin flag';
      END IF;
      IF NEW.banned IS DISTINCT FROM OLD.banned THEN
        RAISE EXCEPTION 'Cannot modify banned status';
      END IF;
      IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        RAISE EXCEPTION 'Cannot modify verified status';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_privileged_columns ON public.users;
CREATE TRIGGER trg_protect_users_privileged_columns
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_users_privileged_columns();

-- 2) Document signing state is server-controlled. Direct client writes to signature state are denied.
REVOKE INSERT, UPDATE, DELETE ON public.document_signatures FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.organization_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organization_documents TO authenticated;
GRANT SELECT ON public.document_signatures TO authenticated;

DROP POLICY IF EXISTS "Accessible users can create signatures" ON public.document_signatures;
CREATE POLICY "No client document signature writes"
ON public.document_signatures
FOR INSERT
WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Organization members can manage documents" ON public.organization_documents;
CREATE POLICY "Document authors and org members may read documents"
ON public.organization_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_documents.organization_id
      AND membership.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.deal_cases deal_case
    WHERE deal_case.id = organization_documents.deal_case_id
      AND deal_case.user_id = auth.uid()
  )
  OR public_visibility = TRUE
);

CREATE OR REPLACE FUNCTION public.guard_document_signing_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
      OR NEW.signed_by_user_id IS DISTINCT FROM OLD.signed_by_user_id
      OR NEW.signed_by_name IS DISTINCT FROM OLD.signed_by_name
      OR NEW.signature_method IS DISTINCT FROM OLD.signature_method
      OR NEW.public_visibility IS DISTINCT FROM OLD.public_visibility
      OR NEW.signed_copy_bucket IS DISTINCT FROM OLD.signed_copy_bucket
      OR NEW.signed_copy_path IS DISTINCT FROM OLD.signed_copy_path
    )
      AND current_setting('role', true) <> 'service_role'
      AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Document signing state is server-controlled; use the hardened signing RPC only';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_document_signing_state ON public.organization_documents;
CREATE TRIGGER trg_guard_document_signing_state
BEFORE UPDATE ON public.organization_documents
FOR EACH ROW
EXECUTE FUNCTION public.guard_document_signing_state();

-- Server-side signing RPC: same-user or authorized org-member-only, with signed-state updates locked to the backend.
CREATE OR REPLACE FUNCTION public.record_document_signature(
  p_document_id UUID,
  p_signer_user_id UUID,
  p_signer_name TEXT,
  p_signer_email TEXT,
  p_signer_role TEXT,
  p_signature_type TEXT,
  p_signature_value TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document public.organization_documents%ROWTYPE;
  v_signer_user_id UUID := p_signer_user_id;
  v_signer_name TEXT := NULLIF(btrim(p_signer_name), '');
  v_signer_email TEXT := NULLIF(lower(btrim(p_signer_email)), '');
  v_signature_type TEXT := COALESCE(NULLIF(btrim(p_signature_type), ''), 'typed');
  v_signature_value TEXT := COALESCE(NULLIF(btrim(p_signature_value), ''), v_signer_name, 'Signed');
  v_signed_at TIMESTAMPTZ := NOW();
BEGIN
  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'Document identifier is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to sign documents';
  END IF;

  IF v_signer_name IS NULL THEN
    RAISE EXCEPTION 'Signer name is required';
  END IF;

  SELECT * INTO v_document
  FROM public.organization_documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  IF v_signer_user_id IS NULL THEN
    v_signer_user_id := auth.uid();
  END IF;

  IF v_signer_user_id IS DISTINCT FROM auth.uid()
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id = v_document.organization_id
        AND membership.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.deal_cases deal_case
      WHERE deal_case.id = v_document.deal_case_id
        AND deal_case.user_id = auth.uid()
    ) THEN
    RAISE EXCEPTION 'You are not authorized to record this signature';
  END IF;

  INSERT INTO public.document_signatures (
    document_id,
    signer_user_id,
    signer_name,
    signer_email,
    signer_role,
    signature_type,
    signature_value,
    signed_at
  )
  VALUES (
    v_document.id,
    v_signer_user_id,
    v_signer_name,
    v_signer_email,
    COALESCE(NULLIF(btrim(p_signer_role), ''), 'client'),
    v_signature_type,
    v_signature_value,
    v_signed_at
  );

  UPDATE public.organization_documents
  SET status = 'signed',
      signed_at = v_signed_at,
      signed_by_user_id = v_signer_user_id,
      signed_by_name = v_signer_name,
      signature_method = v_signature_type,
      updated_at = v_signed_at
  WHERE id = v_document.id;

  INSERT INTO public.document_activity_logs (
    document_id,
    actor_user_id,
    action,
    details,
    created_at
  )
  VALUES (
    v_document.id,
    v_signer_user_id,
    'document_signed',
    jsonb_build_object(
      'signer_name', v_signer_name,
      'signer_role', COALESCE(NULLIF(btrim(p_signer_role), ''), 'client'),
      'signature_type', v_signature_type
    ),
    v_signed_at
  );

  RETURN jsonb_build_object(
    'document_id', v_document.id,
    'status', 'signed',
    'signed_at', v_signed_at,
    'signer_name', v_signer_name,
    'signer_role', COALESCE(NULLIF(btrim(p_signer_role), ''), 'client')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_document_signature(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_document_signature(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3) Restrict field activity logs to the actor who created them.
DROP POLICY IF EXISTS "Organization members can manage field activity logs" ON public.field_activity_logs;
CREATE POLICY "Users can create their own field activity logs"
ON public.field_activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 4) Automation and AI alert writes remain admin-scoped; read permissions stay limited to org members.
DROP POLICY IF EXISTS "Org admins manage automation events" ON public.estate_automation_events;
DROP POLICY IF EXISTS "Org admins manage AI alerts" ON public.estate_ai_watch_alerts;

CREATE POLICY "Org admins insert automation events" ON public.estate_automation_events FOR INSERT WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "Org admins update automation events" ON public.estate_automation_events FOR UPDATE USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "Org members view automation events"
ON public.estate_automation_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = estate_automation_events.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins insert AI alerts" ON public.estate_ai_watch_alerts FOR INSERT WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "Org admins update AI alerts" ON public.estate_ai_watch_alerts FOR UPDATE USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "Org members view AI alerts"
ON public.estate_ai_watch_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = estate_ai_watch_alerts.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own field activity logs"
ON public.field_activity_logs
FOR UPDATE
USING (user_id = auth.uid() OR private.is_org_admin(organization_id))
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view org field activity logs"
ON public.field_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = field_activity_logs.organization_id
      AND membership.user_id = auth.uid()
  )
);

-- 4) Calendar sync connections and agent availability rules must be scoped to the owning user, not any org member.
DROP POLICY IF EXISTS "Members can manage calendar sync connections" ON public.calendar_sync_connections;
CREATE POLICY "Users manage their own calendar sync connections"
ON public.calendar_sync_connections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organization members can manage availability" ON public.agent_availability_rules;
CREATE POLICY "Users manage their own availability, or org admins/team managers"
ON public.agent_availability_rules
FOR ALL
USING (
  user_id = auth.uid()
  OR private.is_org_admin(organization_id)
  OR private.org_member_has_permission(organization_id, 'team:manage')
)
WITH CHECK (
  user_id = auth.uid()
  OR private.is_org_admin(organization_id)
  OR private.org_member_has_permission(organization_id, 'team:manage')
);
