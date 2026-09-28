-- Trusted step-up sessions are created only by a server-side AAL2-verified RPC.
ALTER TABLE public.privileged_step_up
  ADD COLUMN IF NOT EXISTS target_resource_id UUID,
  ADD COLUMN IF NOT EXISTS target_action TEXT;

DROP POLICY IF EXISTS "Users manage own step-up sessions" ON public.privileged_step_up;
REVOKE INSERT, UPDATE, DELETE ON public.privileged_step_up FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.privileged_step_up TO authenticated;

CREATE POLICY "Users read own active step-up sessions"
ON public.privileged_step_up
FOR SELECT
USING (
  user_id = auth.uid()
  AND revoked_at IS NULL
  AND expires_at > NOW()
);

CREATE OR REPLACE FUNCTION public.create_privileged_step_up(
  p_organization_id UUID,
  p_purpose TEXT,
  p_reason TEXT DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 15,
  p_target_resource_id UUID DEFAULT NULL,
  p_target_action TEXT DEFAULT NULL
)
RETURNS public.privileged_step_up
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.privileged_step_up;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'AAL2 authentication is required for high-risk actions';
  END IF;

  IF p_organization_id IS NULL OR p_purpose IS NULL OR btrim(p_purpose) = '' THEN
    RAISE EXCEPTION 'Organization and purpose are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members membership
    JOIN public.organizations organization_row ON organization_row.id = membership.organization_id
    WHERE membership.organization_id = p_organization_id
      AND membership.user_id = auth.uid()
      AND NOT COALESCE(organization_row.suspended, FALSE)
  ) THEN
    RAISE EXCEPTION 'Active organization membership is required';
  END IF;

  IF p_ttl_minutes IS NULL OR p_ttl_minutes NOT BETWEEN 1 AND 15 THEN
    RAISE EXCEPTION 'Step-up expiry must be between 1 and 15 minutes';
  END IF;

  INSERT INTO public.privileged_step_up (
    organization_id,
    user_id,
    purpose,
    reason,
    confirmed_at,
    expires_at,
    target_resource_id,
    target_action
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    btrim(p_purpose),
    NULLIF(btrim(p_reason), ''),
    NOW(),
    NOW() + make_interval(mins => p_ttl_minutes),
    p_target_resource_id,
    NULLIF(btrim(p_target_action), '')
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;
REVOKE ALL ON FUNCTION public.create_privileged_step_up(UUID, TEXT, TEXT, INTEGER, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_privileged_step_up(UUID, TEXT, TEXT, INTEGER, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_privileged_step_up(p_step_up_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.privileged_step_up
  SET revoked_at = NOW()
  WHERE id = p_step_up_id
    AND user_id = auth.uid()
    AND revoked_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_privileged_step_up(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_privileged_step_up(UUID) TO authenticated;

-- Missing allowlist rows are not implicit permission to invoke an AI tool.
COMMENT ON TABLE public.ai_tool_allowlist IS 'An explicit enabled=true row is required before an AI tool may run.';
