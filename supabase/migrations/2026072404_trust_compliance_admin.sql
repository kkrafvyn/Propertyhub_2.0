-- Platform admin access for KYC and trust verification review

DROP POLICY IF EXISTS "Platform admins review kyc" ON public.kyc_submissions;
CREATE POLICY "Platform admins review kyc" ON public.kyc_submissions FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins update kyc" ON public.kyc_submissions;
CREATE POLICY "Platform admins update kyc" ON public.kyc_submissions FOR UPDATE
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins review trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform admins review trust requests" ON public.trust_verification_requests FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins update trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform admins update trust requests" ON public.trust_verification_requests FOR UPDATE
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());
