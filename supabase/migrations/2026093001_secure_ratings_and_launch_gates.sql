-- Server-authoritative rating workflows and jurisdiction launch gates.

CREATE OR REPLACE FUNCTION private.guard_maintenance_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.tenant_rating IS DISTINCT FROM OLD.tenant_rating
     OR NEW.tenant_rating_comment IS DISTINCT FROM OLD.tenant_rating_comment THEN
    IF auth.uid() IS DISTINCT FROM OLD.tenant_user_id THEN
      RAISE EXCEPTION 'Only the request tenant may submit a maintenance rating';
    END IF;
    IF OLD.status <> 'resolved' OR NEW.status <> 'resolved' THEN
      RAISE EXCEPTION 'Only resolved maintenance requests may be rated';
    END IF;
    IF OLD.tenant_rating IS NOT NULL THEN
      RAISE EXCEPTION 'Maintenance ratings are final';
    END IF;
    IF NEW.tenant_rating IS NULL OR NEW.tenant_rating NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    IF char_length(COALESCE(NEW.tenant_rating_comment, '')) > 2000 THEN
      RAISE EXCEPTION 'Rating comment is too long';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_maintenance_rating() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_maintenance_rating ON public.maintenance_requests;
CREATE TRIGGER guard_maintenance_rating BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION private.guard_maintenance_rating();

CREATE OR REPLACE FUNCTION public.submit_maintenance_rating(p_request_id UUID, p_rating INTEGER, p_comment TEXT DEFAULT NULL)
RETURNS public.maintenance_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.maintenance_requests;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 OR char_length(COALESCE(p_comment, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid maintenance rating';
  END IF;
  UPDATE public.maintenance_requests
  SET tenant_rating=p_rating, tenant_rating_comment=NULLIF(trim(p_comment), ''), updated_at=NOW()
  WHERE id=p_request_id AND tenant_user_id=auth.uid() AND status='resolved' AND tenant_rating IS NULL
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Eligible unrated maintenance request not found'; END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_maintenance_rating(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_maintenance_rating(UUID, INTEGER, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Booking parties can submit reviews" ON public.booking_reviews;
REVOKE INSERT ON public.booking_reviews FROM authenticated;
CREATE OR REPLACE FUNCTION public.submit_booking_review(p_booking_id UUID, p_reviewer_role TEXT, p_rating INTEGER, p_comment TEXT DEFAULT NULL)
RETURNS public.booking_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE booking public.short_stay_bookings; result public.booking_reviews;
BEGIN
  IF auth.uid() IS NULL OR p_reviewer_role NOT IN ('guest','host') OR p_rating NOT BETWEEN 1 AND 5
     OR char_length(COALESCE(p_comment, '')) > 2000 THEN RAISE EXCEPTION 'Invalid booking review'; END IF;
  SELECT * INTO booking FROM public.short_stay_bookings WHERE id=p_booking_id AND status='completed';
  IF booking.id IS NULL THEN RAISE EXCEPTION 'Completed booking not found'; END IF;
  IF p_reviewer_role='guest' AND booking.guest_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the booking guest may submit a guest review';
  END IF;
  IF p_reviewer_role='host' AND NOT EXISTS (
    SELECT 1 FROM public.organization_members member
    WHERE member.organization_id=booking.organization_id AND member.user_id=auth.uid()
      AND member.role IN ('owner','manager','agent')
  ) THEN RAISE EXCEPTION 'Only authorized host staff may submit a host review'; END IF;
  INSERT INTO public.booking_reviews(booking_id,reviewer_user_id,reviewer_role,rating,comment)
  VALUES(p_booking_id,auth.uid(),p_reviewer_role,p_rating,NULLIF(trim(p_comment),'')) RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_booking_review(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_booking_review(UUID, TEXT, INTEGER, TEXT) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.vendor_ratings FROM authenticated;
CREATE OR REPLACE FUNCTION public.submit_vendor_rating(p_vendor_id UUID, p_assignment_id UUID, p_rating INTEGER, p_review_text TEXT DEFAULT NULL)
RETURNS public.vendor_ratings LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment public.vendor_assignments; result public.vendor_ratings;
BEGIN
  IF auth.uid() IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR char_length(COALESCE(p_review_text,'')) > 2000 THEN
    RAISE EXCEPTION 'Invalid vendor rating';
  END IF;
  SELECT * INTO assignment FROM public.vendor_assignments
  WHERE id=p_assignment_id AND vendor_id=p_vendor_id AND status='completed';
  IF assignment.id IS NULL THEN RAISE EXCEPTION 'Completed vendor assignment not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members member
    WHERE member.organization_id=assignment.organization_id AND member.user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Only assignment organization members may rate this vendor';
  END IF;
  INSERT INTO public.vendor_ratings(vendor_id,rater_id,assignment_id,rating,review_text)
  VALUES(p_vendor_id,auth.uid(),p_assignment_id,p_rating,NULLIF(trim(p_review_text),'')) RETURNING * INTO result;
  UPDATE public.vendors SET rating_avg=(SELECT round(avg(vr.rating)::numeric,2) FROM public.vendor_ratings vr WHERE vr.vendor_id=p_vendor_id), updated_at=NOW()
  WHERE id=p_vendor_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_vendor_rating(UUID, UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_vendor_rating(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- International activation remains closed until a platform administrator records legal approval.
CREATE TABLE IF NOT EXISTS public.platform_jurisdiction_launch_approvals (
  jurisdiction_id TEXT PRIMARY KEY,
  policy_version TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
ALTER TABLE public.platform_jurisdiction_launch_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_admin_manage_jurisdiction_approvals ON public.platform_jurisdiction_launch_approvals
FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_jurisdiction_launch_approvals TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_enrollment_jurisdiction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.operating_jurisdiction := upper(trim(NEW.operating_jurisdiction));
  IF NEW.operating_jurisdiction <> 'GH' AND NOT EXISTS (
    SELECT 1 FROM public.platform_jurisdiction_launch_approvals approval
    WHERE approval.jurisdiction_id=NEW.operating_jurisdiction
  ) THEN RAISE EXCEPTION 'This jurisdiction is not approved for production enrollment'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_enrollment_jurisdiction() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_enrollment_jurisdiction ON public.organization_enrollment_requests;
CREATE TRIGGER guard_enrollment_jurisdiction BEFORE INSERT OR UPDATE OF operating_jurisdiction
ON public.organization_enrollment_requests FOR EACH ROW EXECUTE FUNCTION private.guard_enrollment_jurisdiction();

NOTIFY pgrst, 'reload schema';
