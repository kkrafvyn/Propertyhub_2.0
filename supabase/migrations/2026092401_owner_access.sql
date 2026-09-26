-- Add owner property access and its agreement in one transaction. Scope replacement
-- remains an explicit team-management action; this operation never deletes scopes.
CREATE OR REPLACE FUNCTION public.add_owner_property_access(
  p_property_id UUID,
  p_owner_user_id UUID,
  p_managing_organization_id UUID,
  p_estate_id UUID DEFAULT NULL,
  p_management_mode TEXT DEFAULT 'company_managed'
)
RETURNS public.property_management_agreements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row public.property_management_agreements;
  v_scope TEXT;
  v_estate_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='An active authenticated account is required';
  END IF;
  IF NOT private.is_org_admin(p_managing_organization_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Only organization administrators can assign owner access';
  END IF;
  IF p_management_mode IS NULL OR p_management_mode NOT IN ('self_managed','company_managed','hybrid') THEN
    RAISE EXCEPTION 'Invalid management mode';
  END IF;

  -- Keep organization, account, property and membership identity stable throughout
  -- the transaction. The member lock serializes competing additions for one owner.
  PERFORM 1 FROM public.organizations
    WHERE id=p_managing_organization_id AND NOT COALESCE(suspended,FALSE) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization must be active'; END IF;

  PERFORM 1 FROM public.users WHERE id=p_owner_user_id AND NOT COALESCE(banned,FALSE)
    AND account_deletion_requested_at IS NULL AND account_deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner must have an active account'; END IF;
  PERFORM 1 FROM auth.users WHERE id=p_owner_user_id AND deleted_at IS NULL
    AND (banned_until IS NULL OR banned_until<=NOW()) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner must have an active account'; END IF;

  SELECT scope_mode INTO v_scope FROM public.organization_members
    WHERE organization_id=p_managing_organization_id AND user_id=p_owner_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Add the owner as an organization member first'; END IF;
  IF v_scope='assigned_work' THEN
    RAISE EXCEPTION 'Change this member to property or organization scope explicitly before assigning owner access';
  END IF;

  PERFORM 1 FROM public.properties
    WHERE id=p_property_id AND organization_id=p_managing_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property must belong to the managing organization'; END IF;

  IF p_estate_id IS NOT NULL THEN
    SELECT id INTO v_estate_id FROM public.managed_estates
      WHERE id=p_estate_id AND property_id=p_property_id
        AND organization_id=p_managing_organization_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Estate must match the property and managing organization'; END IF;
  ELSE
    -- Never reuse another property merely because it has the same owner.
    SELECT id INTO v_estate_id FROM public.managed_estates
      WHERE property_id=p_property_id AND organization_id=p_managing_organization_id
      ORDER BY id LIMIT 1 FOR SHARE;
  END IF;

  INSERT INTO public.organization_member_property_scopes(organization_id,user_id,property_id)
    VALUES(p_managing_organization_id,p_owner_user_id,p_property_id)
    ON CONFLICT (organization_id,user_id,property_id) DO NOTHING;

  INSERT INTO public.property_management_agreements AS existing
    (property_id,estate_id,owner_user_id,managing_organization_id,status)
    VALUES(p_property_id,v_estate_id,p_owner_user_id,p_managing_organization_id,'active')
    ON CONFLICT (property_id,owner_user_id,managing_organization_id) WHERE status='active'
    DO UPDATE SET estate_id=COALESCE(EXCLUDED.estate_id,existing.estate_id),updated_at=NOW()
    RETURNING * INTO v_row;

  IF v_estate_id IS NOT NULL THEN
    INSERT INTO public.estate_property_management_modes
      (estate_id,owner_user_id,management_mode,managing_organization_id,updated_at)
      VALUES(v_estate_id,p_owner_user_id,p_management_mode,p_managing_organization_id,NOW())
      ON CONFLICT (estate_id) DO UPDATE SET owner_user_id=EXCLUDED.owner_user_id,
        management_mode=EXCLUDED.management_mode,
        managing_organization_id=EXCLUDED.managing_organization_id,updated_at=NOW();
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.add_owner_property_access(UUID,UUID,UUID,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_owner_property_access(UUID,UUID,UUID,UUID,TEXT) TO authenticated;

-- Older clients and membership-claim approval use the same checked transaction.
-- The previous helper allowed any user to name themselves as an owner.
CREATE OR REPLACE FUNCTION public.upsert_property_management_agreement(
  p_property_id UUID,
  p_owner_user_id UUID,
  p_managing_organization_id UUID,
  p_estate_id UUID DEFAULT NULL,
  p_management_mode TEXT DEFAULT 'company_managed'
)
RETURNS public.property_management_agreements
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT public.add_owner_property_access(p_property_id,p_owner_user_id,
    p_managing_organization_id,p_estate_id,p_management_mode);
$$;
REVOKE ALL ON FUNCTION public.upsert_property_management_agreement(UUID,UUID,UUID,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.upsert_property_management_agreement(UUID,UUID,UUID,UUID,TEXT) TO authenticated;

-- Direct agreement creation cannot bypass the atomic access operation. Settings
-- remain editable, but clients cannot redirect an agreement to another identity.
DROP POLICY IF EXISTS "Org executives manage management agreements" ON public.property_management_agreements;
CREATE POLICY "Org executives manage management agreements" ON public.property_management_agreements
  FOR ALL TO authenticated USING(private.is_org_admin(managing_organization_id))
  WITH CHECK(private.is_org_admin(managing_organization_id));
REVOKE INSERT,UPDATE ON public.property_management_agreements FROM authenticated,anon;
GRANT UPDATE(permissions,auto_approve_below_minor,owner_approve_below_minor,
  dual_approve_above_minor,reporting_cadence,status,ends_at,updated_at)
  ON public.property_management_agreements TO authenticated;

NOTIFY pgrst,'reload schema';
