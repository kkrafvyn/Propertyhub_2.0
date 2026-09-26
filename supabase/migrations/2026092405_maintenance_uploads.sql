-- Bind each upload to an existing, authorized request, including tenant uploads.
CREATE OR REPLACE FUNCTION private.can_upload_maintenance_photo(p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND private.account_access_allowed() AND EXISTS(
   SELECT 1 FROM public.maintenance_requests r JOIN public.organizations o ON o.id=r.organization_id
   WHERE r.organization_id::text=split_part(p_path,'/',1) AND r.id::text=split_part(p_path,'/',2)
     AND p_path ~ '^[^/]+/[^/]+/[^/]+$' AND NOT coalesce(o.suspended,false)
     AND (r.tenant_user_id=auth.uid() OR public.is_platform_admin()
       OR private.is_org_admin(r.organization_id)
       OR private.member_can_access_maintenance(r.organization_id,r.id))
 );
$$;
-- This must see references even after the uploader loses access to the request.
CREATE OR REPLACE FUNCTION private.maintenance_photo_is_linked(p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.maintenance_requests WHERE p_path=ANY(photo_urls));
$$;
REVOKE ALL ON FUNCTION private.can_upload_maintenance_photo(TEXT),private.maintenance_photo_is_linked(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_upload_maintenance_photo(TEXT),private.maintenance_photo_is_linked(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_maintenance_photos(p_request_id UUID,p_paths TEXT[])
RETURNS public.maintenance_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.maintenance_requests; p TEXT; v_paths TEXT[];
BEGIN
 SELECT * INTO r FROM public.maintenance_requests WHERE id=p_request_id FOR UPDATE;
 IF r.id IS NULL OR auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
   RAISE EXCEPTION 'Maintenance request access denied' USING ERRCODE='42501';
 END IF;
 IF coalesce(cardinality(p_paths),0)>10 THEN RAISE EXCEPTION 'Upload at most ten photos'; END IF;
 FOREACH p IN ARRAY coalesce(p_paths,'{}') LOOP
   IF p IS NULL OR p NOT LIKE r.organization_id::text||'/'||r.id::text||'/%'
     OR NOT private.can_upload_maintenance_photo(p)
     OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='maintenance-media' AND name=p) THEN
     RAISE EXCEPTION 'Photo does not belong to this request' USING ERRCODE='42501';
   END IF;
 END LOOP;
 SELECT coalesce(array_agg(path ORDER BY first_position),'{}') INTO v_paths
 FROM (SELECT path,min(position) first_position FROM unnest(coalesce(r.photo_urls,'{}')||coalesce(p_paths,'{}'))
   WITH ORDINALITY AS photos(path,position) GROUP BY path) unique_photos;
 IF cardinality(v_paths)>10 THEN RAISE EXCEPTION 'A maintenance request can have at most ten photos'; END IF;
 IF v_paths=coalesce(r.photo_urls,'{}') THEN RETURN r; END IF;
 UPDATE public.maintenance_requests SET photo_urls=v_paths,updated_at=now()
 WHERE id=p_request_id RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Maintenance update denied' USING ERRCODE='42501'; END IF;
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.append_maintenance_photos(UUID,TEXT[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.append_maintenance_photos(UUID,TEXT[]) TO authenticated;

CREATE POLICY tenant_maintenance_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='maintenance-media' AND private.can_upload_maintenance_photo(name));
-- Existing organization-folder policies must not bypass request authorization.
CREATE POLICY maintenance_upload_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'maintenance-media' OR (owner_id=auth.uid()::text AND private.can_upload_maintenance_photo(name)));
CREATE POLICY maintenance_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'maintenance-media' OR private.can_upload_maintenance_photo(name));
-- Photos are immutable; retries reuse content-addressed paths without overwriting.
CREATE POLICY maintenance_no_overwrite ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'maintenance-media') WITH CHECK(bucket_id<>'maintenance-media');
CREATE POLICY maintenance_unlinked_cleanup ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='maintenance-media' AND owner_id=auth.uid()::text AND NOT private.maintenance_photo_is_linked(name));
CREATE POLICY maintenance_linked_protection ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id<>'maintenance-media' OR (owner_id=auth.uid()::text AND NOT private.maintenance_photo_is_linked(name)));
NOTIFY pgrst,'reload schema';
