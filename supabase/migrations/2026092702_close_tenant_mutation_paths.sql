-- Close direct mutation paths that bypass financial and workflow RPCs.

CREATE OR REPLACE FUNCTION private.require_platform_staff_mfa()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
    RAISE EXCEPTION 'Active platform staff account required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.mfa_factors f
    WHERE f.user_id = auth.uid() AND f.status = 'verified'
  ) AND COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Complete multi-factor authentication before platform operations';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.require_platform_staff_mfa() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_request public.organization_enrollment_requests%ROWTYPE;
  v_org UUID;
  v_slug TEXT;
  v_personal BOOLEAN;
BEGIN
  IF NOT (public.is_platform_admin() OR public.is_platform_staff() OR public.has_platform_console_grant('organizations')) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment approval required';
  END IF;
  PERFORM private.require_platform_staff_mfa();
  SELECT * INTO v_request FROM public.organization_enrollment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'Pending enrollment request not found'; END IF;
  IF NOT public.is_user_kyc_verified(v_request.requester_user_id) THEN
    RAISE EXCEPTION 'Applicant identity verification (KYC) must be approved before workspace access is granted';
  END IF;
  v_personal := COALESCE(v_request.workspace_kind, 'company') = 'personal';
  v_slug := lower(trim(v_request.desired_slug));
  IF v_slug IS NULL OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid workspace slug'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations o WHERE lower(o.slug) = v_slug) THEN RAISE EXCEPTION 'Workspace slug already taken'; END IF;
  INSERT INTO public.organizations(name,slug,description,email,phone,website,owner_id,verified,suspended,business_types,company_setup_completed,workspace_kind)
  VALUES(v_request.company_name,v_slug,v_request.description,v_request.contact_email,v_request.contact_phone,v_request.website,
    v_request.requester_user_id,TRUE,FALSE,CASE WHEN v_personal THEN ARRAY['property_owner']::TEXT[] ELSE COALESCE(v_request.business_types,'{}') END,
    v_personal,COALESCE(v_request.workspace_kind,'company')) RETURNING id INTO v_org;
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(v_org,v_request.requester_user_id,'owner');
  UPDATE public.organization_enrollment_requests SET status='approved',organization_id=v_org,reviewed_by=auth.uid(),
    reviewed_at=NOW(),review_notes=p_review_notes,updated_at=NOW() WHERE id=p_request_id;
  RETURN v_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT (public.is_platform_admin() OR public.is_platform_staff() OR public.has_platform_console_grant('organizations')) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment review required';
  END IF;
  PERFORM private.require_platform_staff_mfa();
  UPDATE public.organization_enrollment_requests SET status='rejected',reviewed_by=auth.uid(),
    reviewed_at=NOW(),review_notes=p_review_notes,updated_at=NOW()
  WHERE id=p_request_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending enrollment request not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_wallet_payout_request(
  p_request_id UUID,
  p_action TEXT,
  p_processor_note TEXT DEFAULT NULL
)
RETURNS public.wallet_payout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  request_row public.wallet_payout_requests;
  wallet_row public.user_wallets;
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO request_row FROM public.wallet_payout_requests WHERE id=p_request_id FOR UPDATE;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Payout request not found'; END IF;
  IF request_row.status NOT IN ('pending','approved','processing') THEN RAISE EXCEPTION 'Payout request is not processable'; END IF;
  SELECT * INTO wallet_row FROM public.user_wallets WHERE id=request_row.wallet_id FOR UPDATE;

  IF p_action='approve' THEN
    UPDATE public.wallet_payout_requests SET status='approved',processor_note=COALESCE(p_processor_note,processor_note),
      processed_by=auth.uid(),updated_at=NOW() WHERE id=p_request_id RETURNING * INTO request_row;
  ELSIF p_action='mark_paid' THEN
    UPDATE public.wallet_payout_requests SET status='paid',processor_note=COALESCE(p_processor_note,processor_note),
      processed_by=auth.uid(),processed_at=NOW(),updated_at=NOW() WHERE id=p_request_id RETURNING * INTO request_row;
    INSERT INTO public.wallet_ledger(wallet_id,entry_type,amount_minor,balance_available_minor,balance_pending_minor,reference_type,reference_id,description)
      VALUES(wallet_row.id,'payout',request_row.amount_minor,wallet_row.available_minor,wallet_row.pending_minor,
        'wallet_payout_request',request_row.id,'Payout disbursed');
  ELSIF p_action='reject' THEN
    UPDATE public.user_wallets SET available_minor=wallet_row.available_minor+request_row.amount_minor,updated_at=NOW()
      WHERE id=wallet_row.id RETURNING * INTO wallet_row;
    UPDATE public.wallet_payout_requests SET status='rejected',processor_note=COALESCE(p_processor_note,processor_note),
      processed_by=auth.uid(),processed_at=NOW(),updated_at=NOW() WHERE id=p_request_id RETURNING * INTO request_row;
    INSERT INTO public.wallet_ledger(wallet_id,entry_type,amount_minor,balance_available_minor,balance_pending_minor,reference_type,reference_id,description)
      VALUES(wallet_row.id,'release',request_row.amount_minor,wallet_row.available_minor,wallet_row.pending_minor,
        'wallet_payout_request',request_row.id,'Payout request rejected, funds released');
  ELSE
    RAISE EXCEPTION 'Unsupported payout action';
  END IF;
  RETURN request_row;
END;
$$;
REVOKE ALL ON FUNCTION public.process_wallet_payout_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_wallet_payout_request(UUID, TEXT, TEXT) TO authenticated;

-- Escrow state transitions must go through release_escrow_hold().
DROP POLICY IF EXISTS "Org managers can update escrow holds" ON public.escrow_holds;
DROP POLICY IF EXISTS "Users can view their escrow holds" ON public.escrow_holds;
CREATE POLICY "Active users can view scoped escrow holds"
  ON public.escrow_holds FOR SELECT TO authenticated
  USING (private.account_access_allowed() AND (
    payer_user_id = auth.uid() OR public.is_platform_admin() OR
    EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.organization_id=escrow_holds.organization_id AND m.user_id=auth.uid()
        AND m.role IN ('owner','organization_admin','managing_director','manager'))
  ));
REVOKE ALL ON public.escrow_holds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.escrow_holds TO authenticated;

-- Payout requests are created through request_wallet_payout(), which reserves
-- funds and writes the wallet ledger atomically. Clients may only read their rows.
DROP POLICY IF EXISTS "Users can manage their payout requests" ON public.wallet_payout_requests;
CREATE POLICY "Users can view their payout requests"
  ON public.wallet_payout_requests FOR SELECT TO authenticated
  USING (private.account_access_allowed() AND (user_id = auth.uid() OR public.is_platform_admin()));
REVOKE ALL ON public.wallet_payout_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wallet_payout_requests TO authenticated;

-- Prevent arbitrary organization-wallet creation through the definer RPC.
CREATE OR REPLACE FUNCTION public.ensure_organization_wallet(
  p_organization_id UUID,
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS public.organization_wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wallet_row public.organization_wallets;
  actor_role TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Account access has been revoked'; END IF;
    SELECT m.role INTO actor_role FROM public.organization_members m
    WHERE m.organization_id = p_organization_id AND m.user_id = auth.uid();
    IF NOT public.is_platform_admin() AND COALESCE(actor_role,'') NOT IN
      ('owner','organization_admin','managing_director','manager','finance_manager','finance_officer','collections_officer') THEN
      RAISE EXCEPTION 'Finance membership required for organization wallet access';
    END IF;
  END IF;
  IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid currency';
  END IF;

  SELECT * INTO wallet_row FROM public.organization_wallets
  WHERE organization_id = p_organization_id AND currency = p_currency FOR UPDATE;
  IF wallet_row.id IS NOT NULL THEN RETURN wallet_row; END IF;

  INSERT INTO public.organization_wallets (organization_id, currency)
  VALUES (p_organization_id, p_currency)
  ON CONFLICT (organization_id, currency) DO UPDATE SET updated_at = NOW()
  RETURNING * INTO wallet_row;
  RETURN wallet_row;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_organization_wallet(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_organization_wallet(UUID, TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.request_wallet_payout(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_payout(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.release_escrow_hold(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow_hold(UUID, TEXT) TO authenticated;

-- Usage is an internal metering operation, not a client-controlled counter.
REVOKE ALL ON FUNCTION public.increment_saas_usage(UUID, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_saas_usage(UUID, TEXT, BIGINT) TO service_role;

-- Preventive maintenance is a scheduled worker operation. Never expose a global
-- scheduler across all tenants to arbitrary authenticated users.
REVOKE ALL ON FUNCTION public.run_due_preventive_maintenance(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_due_preventive_maintenance(DATE) TO service_role;

-- Every external-access grant must bind its resource to the grant organization.
CREATE OR REPLACE FUNCTION private.guard_external_access_resource_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  resource_org UUID;
BEGIN
  IF NEW.resource_type = 'maintenance_request' THEN
    SELECT mr.organization_id INTO resource_org
    FROM public.maintenance_requests mr WHERE mr.id = NEW.resource_id;
  ELSIF NEW.resource_type = 'estate_work_order' THEN
    SELECT e.organization_id INTO resource_org
    FROM public.estate_work_orders w
    JOIN public.managed_estates e ON e.id = w.estate_id
    WHERE w.id = NEW.resource_id;
  ELSE
    RAISE EXCEPTION 'Unsupported external-access resource type';
  END IF;

  IF resource_org IS NULL OR resource_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'External-access resource must belong to the grant organization';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_external_access_resource_org() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_external_access_resource_org ON public.external_access_grants;
CREATE TRIGGER guard_external_access_resource_org
  BEFORE INSERT OR UPDATE OF organization_id, resource_type, resource_id
  ON public.external_access_grants
  FOR EACH ROW EXECUTE FUNCTION private.guard_external_access_resource_org();

-- The grant's tenant boundary is checked again when a contractor updates a
-- maintenance request, so stale or malformed grants cannot cross organizations.
CREATE OR REPLACE FUNCTION public.update_external_maintenance_status(
  p_token TEXT,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_grant RECORD;
BEGIN
  SELECT * INTO v_grant FROM public.validate_external_access_token(p_token) LIMIT 1;
  IF v_grant IS NULL OR v_grant.resource_type <> 'maintenance_request' THEN RETURN FALSE; END IF;
  IF p_status NOT IN ('open', 'in_progress', 'resolved', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.maintenance_requests mr
  SET status = p_status,
      description = CASE WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN mr.description || E'\n\n[Contractor note] ' || left(trim(p_note), 2000)
        ELSE mr.description END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE mr.resolved_at END,
      updated_at = NOW()
  WHERE mr.id = v_grant.resource_id
    AND mr.organization_id = v_grant.organization_id;
  RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_external_maintenance_by_token(p_token TEXT)
RETURNS TABLE(id UUID,title TEXT,description TEXT,status TEXT,priority TEXT,label TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_grant RECORD;
BEGIN
  SELECT * INTO v_grant FROM public.validate_external_access_token(p_token) LIMIT 1;
  IF v_grant IS NULL OR v_grant.resource_type <> 'maintenance_request' THEN RETURN; END IF;
  RETURN QUERY SELECT mr.id,mr.title,mr.description,mr.status,mr.priority,v_grant.label
    FROM public.maintenance_requests mr
    WHERE mr.id=v_grant.resource_id AND mr.organization_id=v_grant.organization_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_external_maintenance_status(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_external_maintenance_status(TEXT, TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_external_maintenance_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_external_maintenance_by_token(TEXT) TO anon, authenticated;

-- Only organization administrators may manage provider configuration; regular
-- members must not be able to read integration tokens in config JSON.
DROP POLICY IF EXISTS "Org members manage integrations" ON public.organization_integrations;
REVOKE ALL ON public.organization_integrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_integrations TO authenticated;
CREATE POLICY "Org administrators manage integrations"
  ON public.organization_integrations FOR ALL TO authenticated
  USING (private.is_org_admin(organization_id))
  WITH CHECK (private.is_org_admin(organization_id));

-- E-signature state is changed by trusted signing/provider workflows. Members
-- can read requests; only organization admins can create a draft; updates are
-- reserved for service_role and SECURITY DEFINER workflow functions.
DROP POLICY IF EXISTS "Organization members access esignature requests" ON public.esignature_requests;
CREATE POLICY "Organization members view esignature requests"
  ON public.esignature_requests FOR SELECT TO authenticated
  USING (private.account_access_allowed() AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = esignature_requests.organization_id AND m.user_id = auth.uid()
  ));
CREATE POLICY "Organization members create own e-signature drafts"
  ON public.esignature_requests FOR INSERT TO authenticated
  WITH CHECK (
    private.account_access_allowed()
    AND status = 'draft'
    AND created_by = auth.uid()
    AND provider_request_id IS NULL
    AND signing_url IS NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = esignature_requests.organization_id
        AND m.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = esignature_requests.lease_id
        AND l.organization_id = esignature_requests.organization_id
    )
  );
REVOKE ALL ON public.esignature_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.esignature_requests TO authenticated;
GRANT INSERT ON public.esignature_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.esignature_requests TO service_role;

-- Remove inherited broad grants from legacy schema resets before restoring the
-- limited API operations expected by current workspace clients.
REVOKE ALL ON public.leases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leases TO authenticated;
REVOKE ALL ON public.maintenance_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.maintenance_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.send_esignature_request(p_request_id UUID)
RETURNS public.esignature_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_request public.esignature_requests%ROWTYPE;
  v_lease public.leases%ROWTYPE;
  v_signers JSONB;
  v_tenant_email TEXT;
  v_next_signer JSONB;
  v_allowed BOOLEAN;
  v_base_url TEXT := 'https://app.baytmiftah.com';
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_request FROM public.esignature_requests WHERE id=p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.status <> 'draft' OR v_request.provider='docusign'
      OR (v_request.expires_at IS NOT NULL AND v_request.expires_at <= NOW()) THEN
    RAISE EXCEPTION 'Signature request is not an eligible native draft';
  END IF;
  SELECT * INTO v_lease FROM public.leases WHERE id=v_request.lease_id FOR UPDATE;
  IF NOT FOUND OR v_lease.organization_id IS DISTINCT FROM v_request.organization_id THEN
    RAISE EXCEPTION 'Signature request lease does not belong to its organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=v_request.organization_id AND m.user_id=auth.uid()
      AND (v_request.created_by=auth.uid() OR m.role IN ('owner','organization_admin','managing_director'))) THEN
    RAISE EXCEPTION 'Not authorized to send this signature request';
  END IF;
  SELECT lower(email) INTO v_tenant_email FROM public.users WHERE id=v_lease.tenant_user_id;
  v_signers := public.ensure_esignature_signer_tokens(v_request.signers);
  IF jsonb_typeof(v_signers) <> 'array' OR jsonb_array_length(v_signers)=0 OR v_tenant_email IS NULL THEN
    RAISE EXCEPTION 'Signature request must include the lease tenant';
  END IF;

  FOR v_next_signer IN SELECT value FROM jsonb_array_elements(v_signers) LOOP
    IF lower(COALESCE(v_next_signer->>'email','')) = v_tenant_email THEN CONTINUE; END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members m JOIN public.users u ON u.id=m.user_id
      WHERE m.organization_id=v_request.organization_id
        AND m.role IN ('owner','organization_admin','managing_director')
        AND lower(u.email)=lower(v_next_signer->>'email')
    ) INTO v_allowed;
    IF NOT v_allowed THEN RAISE EXCEPTION 'Signer must be the lease tenant or an organization administrator'; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_signers) s WHERE lower(s->>'email')=v_tenant_email) THEN
    RAISE EXCEPTION 'Signature request must include the lease tenant';
  END IF;

  SELECT s INTO v_next_signer FROM jsonb_array_elements(v_signers) s
  WHERE COALESCE(s->>'status','pending') <> 'signed'
  ORDER BY COALESCE(NULLIF(s->>'routing_order','')::INT,999),s->>'email' LIMIT 1;
  IF v_next_signer IS NULL OR v_request.public_sign_token IS NULL THEN RAISE EXCEPTION 'Signing token is unavailable'; END IF;
  UPDATE public.esignature_requests SET signers=v_signers,status='sent',
    provider_request_id='native_'||p_request_id::TEXT,
    signing_url=v_base_url||'/sign/'||public_sign_token||'?st='||(v_next_signer->>'signer_token'),
    updated_at=NOW()
  WHERE id=p_request_id RETURNING * INTO v_request;
  RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION public.send_esignature_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_esignature_request(UUID) TO authenticated;

-- Guard sensitive lease terms. Tenant signing is allowed only after a matching
-- trusted e-sign workflow has reached completed; routine renewal requests stay scoped.
CREATE OR REPLACE FUNCTION private.guard_lease_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  org_admin BOOLEAN;
  esign_evidence BOOLEAN := FALSE;
  document_evidence BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL AND auth.role()='service_role' THEN RETURN NEW; END IF;
  org_admin := private.is_org_admin(OLD.organization_id) OR public.is_platform_admin();

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.tenant_user_id IS DISTINCT FROM OLD.tenant_user_id OR
     NEW.listing_id IS DISTINCT FROM OLD.listing_id OR
     NEW.deal_case_id IS DISTINCT FROM OLD.deal_case_id OR
     NEW.start_date IS DISTINCT FROM OLD.start_date OR
     NEW.end_date IS DISTINCT FROM OLD.end_date OR
     NEW.rent_minor IS DISTINCT FROM OLD.rent_minor OR
     NEW.currency IS DISTINCT FROM OLD.currency OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.next_rent_due_at IS DISTINCT FROM OLD.next_rent_due_at THEN
    IF NOT org_admin THEN RAISE EXCEPTION 'Only organization administrators may change lease identity, rent, dates, or status'; END IF;
  END IF;

  IF NEW.renewal_status IS DISTINCT FROM OLD.renewal_status OR NEW.renewal_notice_at IS DISTINCT FROM OLD.renewal_notice_at THEN
    IF auth.uid()=OLD.tenant_user_id AND OLD.renewal_status='none' AND NEW.renewal_status='requested'
       AND NEW.renewal_notice_at IS NOT NULL THEN
      NULL;
    ELSIF NOT org_admin THEN
      RAISE EXCEPTION 'Only the tenant may request renewal; only organization administrators may decide it';
    END IF;
  END IF;

  IF NEW.signing_status IS DISTINCT FROM OLD.signing_status OR NEW.signed_at IS DISTINCT FROM OLD.signed_at THEN
    SELECT EXISTS (SELECT 1 FROM public.esignature_requests e
      WHERE e.lease_id=OLD.id AND e.status='completed' AND e.signed_at IS NOT NULL)
    INTO esign_evidence;
    SELECT EXISTS (SELECT 1 FROM public.document_signatures ds
        JOIN public.organization_documents d ON d.id=ds.document_id
        WHERE d.deal_case_id=OLD.deal_case_id AND ds.signer_user_id=auth.uid() AND d.status='signed')
    INTO document_evidence;
    IF NOT org_admin AND NOT (
      NEW.signing_status='signed' AND (
        (auth.uid()=OLD.tenant_user_id AND (esign_evidence OR document_evidence)) OR
        (auth.uid() IS NULL AND auth.role()='anon' AND esign_evidence)
      )
    ) THEN
      RAISE EXCEPTION 'Lease signing state is controlled by the verified signature workflow';
    END IF;
    IF NOT org_admin AND NEW.signing_status='signed' THEN
      NEW.signed_at := COALESCE(OLD.signed_at, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_lease_sensitive_fields() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_lease_sensitive_fields ON public.leases;
CREATE TRIGGER guard_lease_sensitive_fields BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION private.guard_lease_sensitive_fields();

CREATE OR REPLACE FUNCTION private.guard_lease_creation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL AND auth.role()='service_role' THEN RETURN NEW; END IF;
  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=NEW.organization_id AND m.user_id=auth.uid()
      AND m.role IN ('owner','organization_admin','managing_director','manager','property_manager','agent')
  ) THEN RAISE EXCEPTION 'Authorized organization lease role required'; END IF;
  IF NEW.deal_case_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.deal_cases d
    JOIN public.listings l ON l.id=d.listing_id
    WHERE d.id=NEW.deal_case_id AND d.organization_id=NEW.organization_id
      AND d.listing_id=NEW.listing_id AND d.user_id=NEW.tenant_user_id
      AND d.status IN ('approved','closed')
      AND l.organization_id=NEW.organization_id
  ) THEN RAISE EXCEPTION 'Lease must match an approved deal case, tenant and organization listing'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_lease_creation() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_lease_creation ON public.leases;
CREATE TRIGGER guard_lease_creation BEFORE INSERT ON public.leases
  FOR EACH ROW EXECUTE FUNCTION private.guard_lease_creation();

CREATE OR REPLACE FUNCTION public.mark_lease_signed(p_lease_id UUID)
RETURNS public.leases LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_lease public.leases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_lease FROM public.leases WHERE id=p_lease_id FOR UPDATE;
  IF NOT FOUND OR v_lease.tenant_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the lease tenant can mark their lease signed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.document_signatures ds
    JOIN public.organization_documents d ON d.id=ds.document_id
    WHERE d.deal_case_id=v_lease.deal_case_id
      AND ds.signer_user_id=auth.uid()
      AND d.status='signed'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.esignature_requests e
    WHERE e.lease_id=v_lease.id AND e.status='completed'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(e.signers) s
        WHERE lower(s->>'email')=(SELECT lower(email) FROM public.users WHERE id=auth.uid())
          AND s->>'status'='signed')
  ) THEN
    RAISE EXCEPTION 'A completed signature for this lease is required';
  END IF;
  UPDATE public.leases SET signing_status='signed',signed_at=COALESCE(signed_at,NOW()),updated_at=NOW()
    WHERE id=p_lease_id RETURNING * INTO v_lease;
  RETURN v_lease;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_lease_signed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_lease_signed(UUID) TO authenticated;

-- Maintenance users can edit request content, but ownership, assignment, and
-- workflow fields require an organization manager. Tenants can only edit their
-- own content/rating fields.
CREATE OR REPLACE FUNCTION private.guard_maintenance_request_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_role TEXT;
BEGIN
  IF auth.uid() IS NULL AND auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT m.role INTO actor_role FROM public.organization_members m
    WHERE m.organization_id = OLD.organization_id AND m.user_id = auth.uid();

    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
       NEW.tenant_user_id IS DISTINCT FROM OLD.tenant_user_id OR
       NEW.lease_id IS DISTINCT FROM OLD.lease_id OR
       NEW.listing_id IS DISTINCT FROM OLD.listing_id OR
       NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'Maintenance request ownership and property links cannot be changed directly';
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status OR
        NEW.assigned_to_user_id IS DISTINCT FROM OLD.assigned_to_user_id OR
        NEW.priority IS DISTINCT FROM OLD.priority) AND
       COALESCE(actor_role, '') NOT IN ('owner', 'organization_admin', 'managing_director', 'manager', 'property_manager', 'head_property_management', 'estate_officer')
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only organization managers may change maintenance workflow fields';
    END IF;

    IF auth.uid() = OLD.tenant_user_id AND (
      NEW.status IS DISTINCT FROM OLD.status OR
      NEW.assigned_to_user_id IS DISTINCT FROM OLD.assigned_to_user_id OR
      NEW.priority IS DISTINCT FROM OLD.priority OR
      NEW.organization_id IS DISTINCT FROM OLD.organization_id
    ) THEN
      RAISE EXCEPTION 'Tenants cannot change maintenance workflow or ownership fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_maintenance_request_mutation() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_maintenance_request_mutation ON public.maintenance_requests;
CREATE TRIGGER guard_maintenance_request_mutation
  BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION private.guard_maintenance_request_mutation();

NOTIFY pgrst, 'reload schema';
