-- Owner-bound payout destinations. A profile phone number is not a payout authorization.
CREATE TABLE IF NOT EXISTS public.owner_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('mobile_money', 'bank_transfer')),
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  destination TEXT NOT NULL,
  provider_account_reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'revoked')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS owner_payout_methods_owner_idx
  ON public.owner_payout_methods(owner_user_id, organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS owner_payout_methods_default_idx
  ON public.owner_payout_methods(owner_user_id, organization_id)
  WHERE is_default = TRUE AND status = 'verified';
ALTER TABLE public.owner_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and finance can view payout methods"
ON public.owner_payout_methods
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR private.is_org_admin(organization_id)
  OR private.org_member_has_permission(organization_id, 'finance:read')
);
REVOKE INSERT, UPDATE, DELETE ON public.owner_payout_methods FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.owner_payout_methods TO authenticated;

-- Owners can submit a destination for verification, but cannot self-verify it.
CREATE OR REPLACE FUNCTION public.submit_owner_payout_method(
  p_organization_id UUID,
  p_method_type TEXT,
  p_currency TEXT,
  p_destination TEXT,
  p_provider_account_reference TEXT DEFAULT NULL
)
RETURNS public.owner_payout_methods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method public.owner_payout_methods;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Active organization membership is required';
  END IF;
  IF p_method_type NOT IN ('mobile_money', 'bank_transfer')
    OR p_currency IS NULL OR char_length(upper(p_currency)) <> 3
    OR p_destination IS NULL OR btrim(p_destination) = '' THEN
    RAISE EXCEPTION 'Invalid payout method';
  END IF;

  INSERT INTO public.owner_payout_methods (
    owner_user_id, organization_id, method_type, currency, destination, provider_account_reference
  )
  VALUES (
    auth.uid(), p_organization_id, p_method_type, upper(p_currency), btrim(p_destination),
    NULLIF(btrim(p_provider_account_reference), '')
  )
  RETURNING * INTO v_method;
  RETURN v_method;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_owner_payout_method(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_payout_method(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Only trusted backend jobs may mark a destination verified or revoked.
CREATE OR REPLACE FUNCTION public.verify_owner_payout_method(
  p_method_id UUID,
  p_status TEXT
)
RETURNS public.owner_payout_methods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method public.owner_payout_methods;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Only the payout verification service can verify destinations';
  END IF;
  IF p_status NOT IN ('verified', 'revoked') THEN
    RAISE EXCEPTION 'Invalid payout method verification status';
  END IF;
  IF p_status = 'verified' THEN
    UPDATE public.owner_payout_methods
    SET is_default = FALSE, updated_at = NOW()
    WHERE owner_user_id = (SELECT owner_user_id FROM public.owner_payout_methods WHERE id = p_method_id)
      AND organization_id = (SELECT organization_id FROM public.owner_payout_methods WHERE id = p_method_id)
      AND id <> p_method_id
      AND status = 'verified';
  END IF;
  UPDATE public.owner_payout_methods
  SET status = p_status,
      is_default = (p_status = 'verified'),
      verified_at = CASE WHEN p_status = 'verified' THEN NOW() ELSE NULL END,
      verified_by = CASE WHEN p_status = 'verified' THEN auth.uid() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_method_id
  RETURNING * INTO v_method;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout method not found'; END IF;
  RETURN v_method;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_owner_payout_method(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_owner_payout_method(UUID, TEXT) TO service_role;
