-- Security remediation: prevent client-side review/payment-provider privilege escalation.

-- KYC submitters may create and read their own submission, but review state is trusted-only.
DROP POLICY IF EXISTS "Users manage own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users insert own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users read own kyc" ON public.kyc_submissions;
CREATE POLICY "Users insert own kyc" ON public.kyc_submissions FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own kyc" ON public.kyc_submissions FOR SELECT
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_kyc_review_field_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() AND (
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes OR
    NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR
    NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN
    RAISE EXCEPTION 'KYC review fields are controlled by platform administrators';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_kyc_review_field_mutation ON public.kyc_submissions;
CREATE TRIGGER trg_prevent_kyc_review_field_mutation
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.prevent_kyc_review_field_mutation();
REVOKE UPDATE ON public.kyc_submissions FROM authenticated;
GRANT SELECT, INSERT ON public.kyc_submissions TO authenticated;

-- Only finance-capable organization roles may manage bank-feed connections.
DROP POLICY IF EXISTS "Organization members manage bank feed connections" ON public.bank_feed_connections;
CREATE POLICY "Finance roles manage bank feed connections" ON public.bank_feed_connections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = bank_feed_connections.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'manager', 'finance_manager', 'finance_officer', 'head_property_management')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = bank_feed_connections.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'manager', 'finance_manager', 'finance_officer', 'head_property_management')
  )
);

-- The free-form audit RPC is server-only; trusted Edge Functions should write audit events.
REVOKE EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, JSONB) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Public organization assets must be inert image formats. Existing SVG objects require review/removal.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'organization-assets';

-- Default property media to private; public listing delivery should use explicit signed/public policy later.
UPDATE storage.buckets
SET public = FALSE
WHERE id = 'property-media';