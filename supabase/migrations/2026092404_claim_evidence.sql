-- Private claim evidence, guarded transitions and in-app review updates.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('claim-evidence','claim-evidence',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Restrictive boundaries protect this private bucket even if an older broad
-- permissive Storage policy exists. Linked evidence is immutable.
CREATE OR REPLACE FUNCTION private.claim_evidence_access(p_name TEXT,p_operation TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RETURN false; END IF;
 IF p_operation='read' THEN
  RETURN split_part(p_name,'/',1)=auth.uid()::text OR EXISTS(
   SELECT 1 FROM public.property_listing_claims c WHERE c.evidence_storage_paths ? p_name
    AND split_part(p_name,'/',1)=c.claimant_user_id::text AND split_part(p_name,'/',2)=c.listing_id::text
    AND private.is_org_admin(c.organization_id));
 END IF;
 IF split_part(p_name,'/',1)<>auth.uid()::text THEN RETURN false; END IF;
 IF p_operation='delete' THEN
  RETURN NOT EXISTS(SELECT 1 FROM public.property_listing_claims c WHERE c.evidence_storage_paths ? p_name
   AND split_part(p_name,'/',1)=c.claimant_user_id::text AND split_part(p_name,'/',2)=c.listing_id::text);
 END IF;
 IF p_operation='upload' THEN
  IF p_name !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$' THEN RETURN false; END IF;
  RETURN EXISTS(SELECT 1 FROM public.listings l JOIN public.organizations o ON o.id=l.organization_id
   WHERE l.id=split_part(p_name,'/',2)::uuid AND NOT coalesce(o.suspended,false)
    AND ((l.status='listed' AND l.visibility='public') OR private.is_org_admin(l.organization_id)
      OR EXISTS(SELECT 1 FROM public.property_listing_claims c WHERE c.listing_id=l.id AND c.claimant_user_id=auth.uid() AND c.status='needs_info')));
 END IF;
 RETURN false;
END; $$;
REVOKE ALL ON FUNCTION private.claim_evidence_access(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.claim_evidence_access(TEXT,TEXT) TO anon,authenticated;
CREATE POLICY claim_evidence_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='claim-evidence' AND private.claim_evidence_access(name,'upload'));
CREATE POLICY claim_evidence_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='claim-evidence' AND private.claim_evidence_access(name,'read'));
CREATE POLICY claim_evidence_cleanup ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='claim-evidence' AND private.claim_evidence_access(name,'delete'));
CREATE POLICY claim_evidence_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO public
 USING(bucket_id<>'claim-evidence' OR private.claim_evidence_access(name,'read'));
CREATE POLICY claim_evidence_upload_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO public
 WITH CHECK(bucket_id<>'claim-evidence' OR private.claim_evidence_access(name,'upload'));
CREATE POLICY claim_evidence_delete_boundary ON storage.objects AS RESTRICTIVE FOR DELETE TO public
 USING(bucket_id<>'claim-evidence' OR private.claim_evidence_access(name,'delete'));
CREATE POLICY claim_evidence_immutable ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
 USING(bucket_id<>'claim-evidence') WITH CHECK(bucket_id<>'claim-evidence');

CREATE OR REPLACE FUNCTION private.validate_claim_evidence(p_paths JSONB,p_listing UUID,p_claimant UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_path TEXT; v_metadata JSONB; v_mime TEXT;
BEGIN
 IF p_paths IS NULL OR jsonb_typeof(p_paths)<>'array' THEN RAISE EXCEPTION 'Evidence must be an array of storage paths'; END IF;
 IF jsonb_array_length(p_paths)>5 THEN RAISE EXCEPTION 'Attach at most five evidence files'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_paths) AS entry WHERE jsonb_typeof(entry)<>'string') THEN RAISE EXCEPTION 'Evidence paths must be strings'; END IF;
 IF (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_paths))<>jsonb_array_length(p_paths) THEN RAISE EXCEPTION 'Duplicate evidence paths are not allowed'; END IF;
 FOR v_path IN SELECT jsonb_array_elements_text(p_paths) LOOP
  IF v_path NOT LIKE p_claimant::text||'/'||p_listing::text||'/%' OR
   v_path !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$' THEN
   RAISE EXCEPTION 'Evidence must be an uploaded file belonging to this claimant and listing';
  END IF;
  SELECT metadata INTO v_metadata FROM storage.objects WHERE bucket_id='claim-evidence' AND name=v_path FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evidence file is missing; upload it again'; END IF;
  IF jsonb_typeof(v_metadata->'size') IS DISTINCT FROM 'number' THEN
   RAISE EXCEPTION 'Evidence size could not be verified; upload it again';
  END IF;
  IF (v_metadata->>'size')::numeric NOT BETWEEN 1 AND 10485760 THEN
   RAISE EXCEPTION 'Evidence files must be non-empty and at most 10 MB';
  END IF;
  v_mime := CASE split_part(v_path,'.',2) WHEN 'pdf' THEN 'application/pdf' WHEN 'jpg' THEN 'image/jpeg' WHEN 'png' THEN 'image/png' WHEN 'webp' THEN 'image/webp' END;
  IF v_metadata->>'mimetype' IS DISTINCT FROM v_mime THEN
   RAISE EXCEPTION 'Evidence file format does not match its storage path';
  END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION private.validate_claim_evidence(JSONB,UUID,UUID) FROM PUBLIC;

REVOKE INSERT,UPDATE,DELETE ON public.property_listing_claims FROM PUBLIC,authenticated,anon;
DROP POLICY IF EXISTS "Claimants manage own property listing claims" ON public.property_listing_claims;
DROP POLICY IF EXISTS "Platform staff manage property listing claims" ON public.property_listing_claims;
CREATE POLICY "Claimants read own property listing claims" ON public.property_listing_claims FOR SELECT TO authenticated USING(claimant_user_id=auth.uid());
CREATE POLICY claim_review_visibility ON public.property_listing_claims AS RESTRICTIVE FOR SELECT TO public
 USING(auth.uid() IS NOT NULL AND private.account_access_allowed() AND (claimant_user_id=auth.uid() OR private.is_org_admin(organization_id)));
DROP POLICY IF EXISTS "Org executives view property listing claims" ON public.property_listing_claims;
CREATE POLICY "Org executives view property listing claims" ON public.property_listing_claims FOR SELECT TO authenticated USING(private.is_org_admin(organization_id));
CREATE OR REPLACE FUNCTION private.notify_claim_reviewers(p_claim public.property_listing_claims,p_event TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.notification_logs(user_id,organization_id,notification_type,channel,subject,content,delivered,delivered_at)
 SELECT m.user_id,p_claim.organization_id,'claim_review','in_app','Property claim '||p_event,
  'A property claim is ready for review. Open Claims & Requests in your workspace.',true,now()
 FROM public.organization_members m WHERE m.organization_id=p_claim.organization_id
  AND m.role IN('owner','organization_admin','managing_director') AND m.user_id<>p_claim.claimant_user_id;
$$;
REVOKE ALL ON FUNCTION private.notify_claim_reviewers(public.property_listing_claims,TEXT) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.submit_property_listing_claim(p_listing_id UUID,p_claimant_note TEXT DEFAULT NULL,p_evidence_storage_paths JSONB DEFAULT '[]')
RETURNS public.property_listing_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.listings; c public.property_listing_claims;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=p_listing_id;
 IF l.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=l.organization_id AND NOT coalesce(suspended,false)) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 IF NOT (l.status='listed' AND l.visibility='public') AND NOT private.is_org_admin(l.organization_id) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 IF length(coalesce(p_claimant_note,''))>10000 THEN RAISE EXCEPTION 'Claim note is too long'; END IF;
 PERFORM private.validate_claim_evidence(p_evidence_storage_paths,p_listing_id,auth.uid());
 INSERT INTO public.property_listing_claims(listing_id,property_id,organization_id,claimant_user_id,claimant_note,evidence_storage_paths)
 VALUES(l.id,l.property_id,l.organization_id,auth.uid(),nullif(trim(p_claimant_note),''),p_evidence_storage_paths) RETURNING * INTO c;
 PERFORM private.notify_claim_reviewers(c,'submitted');
 RETURN c;
END; $$;
CREATE OR REPLACE FUNCTION public.resubmit_property_listing_claim(p_claim_id UUID,p_note TEXT,p_paths JSONB)
RETURNS public.property_listing_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.property_listing_claims;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.property_listing_claims WHERE id=p_claim_id AND claimant_user_id=auth.uid() FOR UPDATE;
 IF c.id IS NULL OR c.status<>'needs_info' THEN RAISE EXCEPTION 'Only your claims awaiting information can be resubmitted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=c.organization_id AND NOT coalesce(suspended,false)) THEN RAISE EXCEPTION 'Organization unavailable'; END IF;
 IF length(trim(coalesce(p_note,''))) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Add a response to the reviewer'; END IF;
 PERFORM private.validate_claim_evidence(p_paths,c.listing_id,c.claimant_user_id);
 IF NOT p_paths @> c.evidence_storage_paths THEN RAISE EXCEPTION 'Previously submitted evidence must be retained'; END IF;
 UPDATE public.property_listing_claims SET status='pending',claimant_note=trim(p_note),evidence_storage_paths=p_paths,updated_at=now()
 WHERE id=c.id RETURNING * INTO c;
 PERFORM private.notify_claim_reviewers(c,'resubmitted');
 RETURN c;
END; $$;
CREATE OR REPLACE FUNCTION public.withdraw_property_listing_claim(p_claim_id UUID)
RETURNS public.property_listing_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.property_listing_claims;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 UPDATE public.property_listing_claims SET status='withdrawn',updated_at=now()
 WHERE id=p_claim_id AND claimant_user_id=auth.uid() AND status IN('pending','needs_info') RETURNING * INTO c;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Claim cannot be withdrawn'; END IF;
 RETURN c;
END; $$;
CREATE OR REPLACE FUNCTION public.review_property_listing_claim(p_claim_id UUID,p_status TEXT,p_reviewer_note TEXT DEFAULT NULL)
RETURNS public.property_listing_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.property_listing_claims;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.property_listing_claims WHERE id=p_claim_id FOR UPDATE;
 IF c.id IS NULL OR NOT private.is_org_admin(c.organization_id) OR auth.uid()=c.claimant_user_id THEN RAISE EXCEPTION 'Claim review not authorized' USING ERRCODE='42501'; END IF;
 IF c.status NOT IN('pending','needs_info') OR p_status IS NULL OR p_status NOT IN('approved','rejected','needs_info') THEN RAISE EXCEPTION 'Invalid claim transition'; END IF;
 IF p_status='needs_info' AND length(trim(coalesce(p_reviewer_note,'')))=0 THEN RAISE EXCEPTION 'Explain what information is needed'; END IF;
 IF length(coalesce(p_reviewer_note,''))>10000 THEN RAISE EXCEPTION 'Review note is too long'; END IF;
 IF c.status=p_status AND c.reviewer_note IS NOT DISTINCT FROM nullif(trim(p_reviewer_note),'') THEN RETURN c; END IF;
 UPDATE public.property_listing_claims SET status=p_status,reviewer_note=nullif(trim(p_reviewer_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 WHERE id=c.id RETURNING * INTO c;
 INSERT INTO public.notification_logs(user_id,organization_id,notification_type,channel,subject,content,delivered,delivered_at)
 VALUES(c.claimant_user_id,c.organization_id,'claim_review','in_app','Property claim updated','Your claim is '||p_status||'. Open Workspace Access to review the response.',true,now());
 RETURN c;
END; $$;
REVOKE ALL ON FUNCTION public.submit_property_listing_claim(UUID,TEXT,JSONB),public.resubmit_property_listing_claim(UUID,TEXT,JSONB),public.withdraw_property_listing_claim(UUID),public.review_property_listing_claim(UUID,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_property_listing_claim(UUID,TEXT,JSONB),public.resubmit_property_listing_claim(UUID,TEXT,JSONB),public.withdraw_property_listing_claim(UUID),public.review_property_listing_claim(UUID,TEXT,TEXT) TO authenticated;
NOTIFY pgrst,'reload schema';
