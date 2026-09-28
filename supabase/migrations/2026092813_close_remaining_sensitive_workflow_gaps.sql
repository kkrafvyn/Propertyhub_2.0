-- 931c308 follow-up hardening. Additive replacement for deployed sensitive-workflow controls.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION private.sha256_hex(p_value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT SET search_path=public,extensions AS $$
  SELECT encode(digest(convert_to(p_value,'UTF8'),'sha256'),'hex')
$$;
REVOKE ALL ON FUNCTION private.sha256_hex(TEXT) FROM PUBLIC,anon,authenticated;

-- KYC submitters can only create a server-normalized submitted record.
ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS reviewer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
REVOKE INSERT, UPDATE ON public.kyc_submissions FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users manage own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users insert own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users read own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Platform admins update kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Platform staff update kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Platform staff review kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Platform admins review kyc" ON public.kyc_submissions;
CREATE POLICY "Users read own kyc submissions" ON public.kyc_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Trust staff read kyc submissions" ON public.kyc_submissions FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.has_platform_console_grant('trust'));
GRANT SELECT ON public.kyc_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_kyc_review_field_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND auth.role()='service_role' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes OR
    NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
  ) THEN RAISE EXCEPTION 'Trusted KYC providers cannot modify reviewer identity or evidence'; END IF;
  IF TG_OP='UPDATE' AND auth.role()='service_role' AND NEW.status IS DISTINCT FROM OLD.status
    AND (OLD.status NOT IN ('submitted','in_review') OR NEW.status<>'in_review') THEN
    RAISE EXCEPTION 'Trusted KYC providers may only move pending submissions to in_review';
  END IF;
  IF TG_OP='UPDATE' AND auth.role()<>'service_role' AND NOT (public.is_platform_admin() OR public.has_platform_console_grant('trust')) AND (
    NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes OR
    NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN RAISE EXCEPTION 'KYC review fields require platform trust authorization'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_kyc_submission(
  p_document_type TEXT, p_document_number TEXT DEFAULT NULL, p_full_name TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL, p_storage_path TEXT DEFAULT NULL,
  p_context TEXT DEFAULT 'consumer', p_jurisdiction_id TEXT DEFAULT NULL
) RETURNS public.kyc_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.kyc_submissions; v_user UUID := auth.uid(); v_engine TEXT; v_jurisdiction TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_document_type NOT IN ('national_id','passport','drivers_license','ghana_card') THEN RAISE EXCEPTION 'Unsupported KYC document type'; END IF;
  IF COALESCE(p_context,'consumer') NOT IN ('consumer','workspace') THEN RAISE EXCEPTION 'Unsupported KYC context'; END IF;
  IF p_storage_path IS NOT NULL AND split_part(p_storage_path,'/',1) <> v_user::TEXT THEN RAISE EXCEPTION 'KYC document path must belong to the authenticated user'; END IF;
  SELECT COALESCE(NULLIF(to_jsonb(u)->>'country',''),NULLIF(to_jsonb(u)->>'jurisdiction',''),'GH')
    INTO v_jurisdiction FROM public.users u WHERE u.id=v_user;
  SELECT provider_engine INTO v_engine FROM public.platform_kyc_policies WHERE jurisdiction_id=v_jurisdiction AND enabled;
  INSERT INTO public.kyc_submissions(user_id,document_type,document_number,full_name,date_of_birth,status,storage_path,
    reviewer_notes,submitted_at,reviewed_at,context,jurisdiction_id,provider_engine,reviewer_user_id,
    ai_screening_status,ai_confidence_score,ai_recommendation,ai_extracted_data,ai_flags,ai_summary,ai_screened_at,ai_source,
    provider_job_id,provider_reference,provider_status)
  VALUES(v_user,p_document_type,NULLIF(btrim(p_document_number),''),NULLIF(btrim(p_full_name),''),p_date_of_birth,
    'submitted',p_storage_path,NULL,NOW(),NULL,COALESCE(p_context,'consumer'),v_jurisdiction,
    COALESCE(v_engine,'internal-kyc'),NULL,'pending',NULL,NULL,'{}'::JSONB,'{}'::TEXT[],NULL,NULL,NULL,NULL,NULL,NULL)
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.submit_kyc_submission(TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_submission(TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_kyc_submission(p_submission_id UUID,p_status TEXT,p_reviewer_notes TEXT DEFAULT NULL)
RETURNS public.kyc_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,private AS $$
DECLARE v_row public.kyc_submissions;
BEGIN
  IF NOT (public.is_platform_admin() OR public.has_platform_console_grant('trust')) THEN RAISE EXCEPTION 'KYC review requires platform trust permissions'; END IF;
  PERFORM private.require_platform_staff_mfa();
  IF p_status NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'Unsupported KYC review status'; END IF;
  SELECT * INTO v_row FROM public.kyc_submissions WHERE id=p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC submission not found'; END IF;
  IF v_row.status NOT IN ('submitted','in_review') THEN RAISE EXCEPTION 'Only submitted or in-review KYC records may be finalized'; END IF;
  UPDATE public.kyc_submissions SET status=p_status,reviewer_notes=NULLIF(btrim(p_reviewer_notes),''),
    reviewer_user_id=auth.uid(),reviewed_at=NOW() WHERE id=p_submission_id RETURNING * INTO v_row;
  UPDATE public.users SET verified=(p_status='verified'),updated_at=NOW() WHERE id=v_row.user_id;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.review_kyc_submission(UUID,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_kyc_submission(UUID,TEXT,TEXT) TO authenticated;

-- One-time visitor credentials; legacy active QR/PIN pairs are invalidated because they were correlated.
ALTER TABLE public.estate_visitor_passes ADD COLUMN IF NOT EXISTS qr_token_hash TEXT, ADD COLUMN IF NOT EXISTS pin_hash TEXT;
CREATE TABLE IF NOT EXISTS public.estate_visitor_pass_policies(
  pass_type TEXT PRIMARY KEY CHECK(pass_type IN ('guest','delivery','contractor','maintenance','resident_vehicle')),
  default_lifetime_hours INTEGER NOT NULL CHECK(default_lifetime_hours>0),
  max_lifetime_hours INTEGER NOT NULL CHECK(max_lifetime_hours>=default_lifetime_hours),
  max_uses SMALLINT NOT NULL CHECK(max_uses BETWEEN 1 AND 100), tenant_allowed BOOLEAN NOT NULL, multi_use_allowed BOOLEAN NOT NULL);
INSERT INTO public.estate_visitor_pass_policies VALUES
 ('guest',4,12,1,TRUE,FALSE),('delivery',2,4,1,TRUE,FALSE),('contractor',4,24,1,FALSE,FALSE),
 ('maintenance',4,24,1,FALSE,FALSE),('resident_vehicle',24,168,100,FALSE,TRUE)
ON CONFLICT(pass_type) DO NOTHING;
ALTER TABLE public.estate_visitor_pass_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.estate_visitor_pass_policies FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.estate_visitor_pass_attempts(
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, credential_type TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL, attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS estate_visitor_pass_attempts_actor_idx ON public.estate_visitor_pass_attempts(estate_id,actor_user_id,attempted_at DESC);
ALTER TABLE public.estate_visitor_pass_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.estate_visitor_pass_attempts FROM PUBLIC,anon,authenticated;
UPDATE public.estate_visitor_passes SET status=CASE WHEN status='active' THEN 'revoked' ELSE status END,
  pin_code=NULL,qr_payload=NULL,pin_hash=NULL,qr_token_hash=NULL WHERE pin_code IS NOT NULL OR qr_payload IS NOT NULL;
ALTER TABLE public.estate_visitor_passes ALTER COLUMN pin_code DROP NOT NULL;
ALTER TABLE public.estate_visitor_passes ALTER COLUMN qr_payload DROP NOT NULL;
DROP INDEX IF EXISTS public.visitor_passes_pin_idx;
CREATE UNIQUE INDEX IF NOT EXISTS estate_visitor_qr_hash_idx ON public.estate_visitor_passes(qr_token_hash) WHERE qr_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS estate_visitor_pin_hash_idx ON public.estate_visitor_passes(estate_id,pin_hash) WHERE status='active' AND pin_hash IS NOT NULL;
REVOKE INSERT,UPDATE,DELETE ON public.estate_visitor_passes,public.estate_gate_log FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,estate_id,host_unit_id,host_user_id,host_name,visitor_name,visitor_phone,company_name,vehicle_plate,pass_type,
  valid_from,valid_until,max_uses,use_count,status,sms_sent,sms_reference,created_by,created_at,updated_at) ON public.estate_visitor_passes TO authenticated;
DROP POLICY IF EXISTS "Tenant creates own-unit passes" ON public.estate_visitor_passes;
DROP POLICY IF EXISTS "Staff manage visitor passes" ON public.estate_visitor_passes;
DROP POLICY IF EXISTS "Tenant reads own passes" ON public.estate_visitor_passes;
CREATE POLICY "Hosts read own visitor passes" ON public.estate_visitor_passes FOR SELECT TO authenticated USING(host_user_id=auth.uid());
CREATE POLICY "Scoped staff read visitor passes" ON public.estate_visitor_passes FOR SELECT TO authenticated
 USING(private.is_estate_staff(estate_id) AND private.org_member_has_permission(
   (SELECT organization_id FROM public.managed_estates WHERE id=estate_id),'visitor_passes:manage'));
DROP POLICY IF EXISTS "Guard inserts gate log" ON public.estate_gate_log;
DROP POLICY IF EXISTS "Staff reads gate log" ON public.estate_gate_log;
CREATE POLICY "Scoped staff read gate log" ON public.estate_gate_log FOR SELECT TO authenticated
 USING(private.is_estate_staff(estate_id) AND private.org_member_has_permission(
   (SELECT organization_id FROM public.managed_estates WHERE id=estate_id),'visitor_passes:manage'));

CREATE OR REPLACE FUNCTION private.issue_estate_visitor_pass(p_user UUID,p_estate UUID,p_unit UUID,p_visitor TEXT,p_phone TEXT,
  p_type TEXT,p_plate TEXT,p_hours INTEGER,p_uses SMALLINT,p_staff BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,private AS $$
DECLARE v_policy public.estate_visitor_pass_policies; v_estate UUID; v_name TEXT; v_pin TEXT; v_qr TEXT; v_row public.estate_visitor_passes;
BEGIN
  IF p_user IS NULL OR p_estate IS NULL OR p_unit IS NULL THEN RAISE EXCEPTION 'Host, unit and estate are required'; END IF;
  SELECT estate_id INTO v_estate FROM public.estate_units WHERE id=p_unit;
  IF v_estate IS DISTINCT FROM p_estate THEN RAISE EXCEPTION 'Host unit does not belong to estate'; END IF;
  IF p_staff THEN
    IF NOT private.is_estate_staff(p_estate) OR NOT private.org_member_has_permission((SELECT organization_id FROM public.managed_estates WHERE id=p_estate),'visitor_passes:manage') THEN RAISE EXCEPTION 'Scoped visitor-pass capability required'; END IF;
  ELSIF (auth.uid() IS DISTINCT FROM p_user AND auth.role() <> 'service_role') OR NOT EXISTS(SELECT 1 FROM public.unit_occupancies o WHERE o.unit_id=p_unit AND o.user_id=p_user
    AND o.role IN ('tenant','owner') AND o.start_date<=CURRENT_DATE AND (o.end_date IS NULL OR o.end_date>=CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Active occupancy of host unit is required';
  END IF;
  SELECT * INTO v_policy FROM public.estate_visitor_pass_policies WHERE pass_type=p_type;
  IF NOT FOUND OR (NOT p_staff AND NOT v_policy.tenant_allowed) THEN RAISE EXCEPTION 'Pass type is not permitted'; END IF;
  IF COALESCE(p_hours,v_policy.default_lifetime_hours)<1 OR COALESCE(p_hours,v_policy.default_lifetime_hours)>v_policy.max_lifetime_hours
    OR COALESCE(p_uses,1)<1 OR COALESCE(p_uses,1)>v_policy.max_uses OR (COALESCE(p_uses,1)>1 AND NOT v_policy.multi_use_allowed) THEN
    RAISE EXCEPTION 'Pass lifetime or use count is outside policy limits'; END IF;
  SELECT full_name INTO v_name FROM public.users WHERE id=p_user;
  v_pin:=lpad((mod(('x'||encode(gen_random_bytes(4),'hex'))::bit(32)::bigint,900000)+100000)::TEXT,6,'0');
  v_qr:='BM-GATE-'||encode(gen_random_bytes(32),'hex');
  INSERT INTO public.estate_visitor_passes(estate_id,host_unit_id,host_user_id,host_name,visitor_name,visitor_phone,vehicle_plate,pass_type,
    pin_code,qr_payload,pin_hash,qr_token_hash,valid_from,valid_until,max_uses,use_count,status,created_by)
  VALUES(p_estate,p_unit,p_user,COALESCE(NULLIF(btrim(v_name),''),'Resident'),left(COALESCE(NULLIF(btrim(p_visitor),''),'Guest'),120),
    left(NULLIF(btrim(p_phone),''),40),left(NULLIF(btrim(p_plate),''),32),p_type,NULL,NULL,crypt(v_pin,gen_salt('bf',10)),
    private.sha256_hex(v_qr),NOW(),NOW()+make_interval(hours=>COALESCE(p_hours,v_policy.default_lifetime_hours)),
    COALESCE(p_uses,1),0,'active',auth.uid()) RETURNING * INTO v_row;
  RETURN (to_jsonb(v_row)-'pin_code'-'qr_payload'-'pin_hash'-'qr_token_hash')||jsonb_build_object('pin_code',v_pin,'qr_payload',v_qr);
END; $$;
REVOKE ALL ON FUNCTION private.issue_estate_visitor_pass(UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,INTEGER,SMALLINT,BOOLEAN) FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS public.create_estate_visitor_pass(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,SMALLINT);
CREATE FUNCTION public.create_tenant_visitor_pass(p_host_unit_id UUID,p_visitor_name TEXT,p_visitor_phone TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'guest',p_vehicle_plate TEXT DEFAULT NULL,p_valid_hours INTEGER DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_estate UUID;
BEGIN SELECT estate_id INTO v_estate FROM public.estate_units WHERE id=p_host_unit_id;
  RETURN private.issue_estate_visitor_pass(auth.uid(),v_estate,p_host_unit_id,p_visitor_name,p_visitor_phone,p_pass_type,p_vehicle_plate,p_valid_hours,1,FALSE);
END; $$;
CREATE FUNCTION public.create_staff_visitor_pass(p_estate_id UUID,p_host_unit_id UUID,p_visitor_name TEXT,p_visitor_phone TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'guest',p_vehicle_plate TEXT DEFAULT NULL,p_valid_hours INTEGER DEFAULT NULL,p_max_uses SMALLINT DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_host UUID;
BEGIN
  IF NOT private.is_estate_staff(p_estate_id) OR NOT private.org_member_has_permission((SELECT organization_id FROM public.managed_estates WHERE id=p_estate_id),'visitor_passes:manage') THEN RAISE EXCEPTION 'Scoped visitor-pass capability required'; END IF;
  SELECT user_id INTO v_host FROM public.unit_occupancies WHERE unit_id=p_host_unit_id AND role IN('tenant','owner') AND start_date<=CURRENT_DATE
    AND (end_date IS NULL OR end_date>=CURRENT_DATE) ORDER BY start_date DESC LIMIT 1;
  RETURN private.issue_estate_visitor_pass(v_host,p_estate_id,p_host_unit_id,p_visitor_name,p_visitor_phone,p_pass_type,p_vehicle_plate,p_valid_hours,p_max_uses,TRUE);
END; $$;
REVOKE ALL ON FUNCTION public.create_tenant_visitor_pass(UUID,TEXT,TEXT,TEXT,TEXT,INTEGER) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_staff_visitor_pass(UUID,UUID,TEXT,TEXT,TEXT,TEXT,INTEGER,SMALLINT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_visitor_pass(UUID,TEXT,TEXT,TEXT,TEXT,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_visitor_pass(UUID,UUID,TEXT,TEXT,TEXT,TEXT,INTEGER,SMALLINT) TO authenticated;

DROP FUNCTION IF EXISTS public.verify_estate_visitor_pass(UUID,TEXT,UUID,TEXT);
CREATE FUNCTION public.verify_estate_visitor_pass(p_estate_id UUID,p_token_or_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,private AS $$
DECLARE v_actor UUID:=auth.uid(); v_input TEXT:=btrim(COALESCE(p_token_or_pin,'')); v_kind TEXT; v_pass public.estate_visitor_passes; v_name TEXT; v_count INTEGER;
BEGIN
  IF v_actor IS NULL OR NOT private.is_estate_staff(p_estate_id) OR NOT private.org_member_has_permission(
    (SELECT organization_id FROM public.managed_estates WHERE id=p_estate_id),'visitor_passes:manage'
  ) THEN RAISE EXCEPTION 'Estate gate staff authorization required'; END IF;
  IF v_input='' THEN RAISE EXCEPTION 'Visitor credential required'; END IF;
  v_kind:=CASE WHEN v_input~'^BM-GATE-[0-9a-fA-F]{64}$' THEN 'qr' ELSE 'pin' END;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_estate_id::TEXT||':'||v_actor::TEXT,0));
  SELECT count(*) INTO v_count FROM public.estate_visitor_pass_attempts WHERE estate_id=p_estate_id AND actor_user_id=v_actor AND attempted_at>NOW()-INTERVAL '5 minutes';
  IF v_count>=10 THEN INSERT INTO public.estate_visitor_pass_attempts(estate_id,actor_user_id,credential_type,succeeded) VALUES(p_estate_id,v_actor,v_kind,FALSE);
    RETURN jsonb_build_object('success',FALSE,'message','Verification temporarily locked. Try again later.'); END IF;
  SELECT * INTO v_pass FROM public.estate_visitor_passes WHERE estate_id=p_estate_id AND status='active'
    AND CASE WHEN v_kind='qr' THEN qr_token_hash=private.sha256_hex(v_input) ELSE pin_hash=crypt(v_input,pin_hash) END
    AND valid_from<=NOW() AND valid_until>=NOW() AND use_count<max_uses FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.estate_visitor_pass_attempts(estate_id,actor_user_id,credential_type,succeeded) VALUES(p_estate_id,v_actor,v_kind,FALSE);
    RETURN jsonb_build_object('success',FALSE,'message','Invalid or expired visitor pass'); END IF;
  UPDATE public.estate_visitor_passes SET use_count=use_count+1,status=CASE WHEN use_count+1>=max_uses THEN 'used' ELSE 'active' END,updated_at=NOW()
    WHERE id=v_pass.id RETURNING * INTO v_pass;
  SELECT full_name INTO v_name FROM public.users WHERE id=v_actor;
  INSERT INTO public.estate_gate_log(estate_id,pass_id,direction,visitor_name,vehicle_plate,pass_type,guard_user_id,guard_name,verification_method,access_granted,occurred_at)
    VALUES(p_estate_id,v_pass.id,'entry',v_pass.visitor_name,v_pass.vehicle_plate,v_pass.pass_type,v_actor,COALESCE(NULLIF(btrim(v_name),''),'Estate staff'),v_kind,TRUE,NOW());
  INSERT INTO public.estate_visitor_pass_attempts(estate_id,actor_user_id,credential_type,succeeded) VALUES(p_estate_id,v_actor,v_kind,TRUE);
  RETURN jsonb_build_object('success',TRUE,'pass_id',v_pass.id,'visitor_name',v_pass.visitor_name,'message','Access granted for '||v_pass.visitor_name);
END; $$;
REVOKE ALL ON FUNCTION public.verify_estate_visitor_pass(UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_estate_visitor_pass(UUID,TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_estate_gate_log_append_only() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Estate gate logs are append-only'; END; $$;
DROP TRIGGER IF EXISTS trg_estate_gate_log_append_only ON public.estate_gate_log;
CREATE TRIGGER trg_estate_gate_log_append_only BEFORE UPDATE OR DELETE ON public.estate_gate_log FOR EACH ROW EXECUTE FUNCTION public.guard_estate_gate_log_append_only();

-- WhatsApp bot creation reuses the same tenant/occupancy/credential path.
CREATE OR REPLACE FUNCTION public.bot_create_whatsapp_visitor_pass(p_organization_id UUID,p_phone TEXT,p_visitor_name TEXT DEFAULT 'Guest')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user UUID; v_occ RECORD; v_pass JSONB;
BEGIN
  v_user:=public.find_user_id_by_phone(p_phone);
  SELECT o.unit_id,e.id estate_id,e.name estate_name,eu.identifier INTO v_occ FROM public.unit_occupancies o
    JOIN public.estate_units eu ON eu.id=o.unit_id JOIN public.managed_estates e ON e.id=eu.estate_id
    WHERE e.organization_id=p_organization_id AND o.user_id=v_user AND o.role IN('tenant','owner') AND o.start_date<=CURRENT_DATE
      AND (o.end_date IS NULL OR o.end_date>=CURRENT_DATE) ORDER BY o.start_date DESC LIMIT 1;
  IF v_user IS NULL OR v_occ.estate_id IS NULL THEN RETURN jsonb_build_object('success',FALSE,'error','no_active_occupancy'); END IF;
  v_pass:=private.issue_estate_visitor_pass(v_user,v_occ.estate_id,v_occ.unit_id,p_visitor_name,NULL,'guest',NULL,4,1,FALSE);
  RETURN jsonb_build_object('success',TRUE,'passId',v_pass->'id','pinCode',v_pass->'pin_code','qrPayload',v_pass->'qr_payload',
    'validUntil',v_pass->'valid_until','estateName',v_occ.estate_name,'unitLabel',v_occ.identifier,'visitorName',v_pass->'visitor_name');
END; $$;
REVOKE ALL ON FUNCTION public.bot_create_whatsapp_visitor_pass(UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bot_create_whatsapp_visitor_pass(UUID,TEXT,TEXT) TO service_role;

-- Device secrets move out of the ordinary device table; the browser receives only safe metadata.
CREATE TABLE IF NOT EXISTS public.smart_device_credentials(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),device_id UUID NOT NULL REFERENCES public.smart_devices(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,secret_ciphertext TEXT,secret_hash TEXT,provider_reference TEXT,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(device_id,credential_type));
ALTER TABLE public.smart_device_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.smart_device_credentials FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.smart_device_credentials TO service_role;
INSERT INTO public.smart_device_credentials(device_id,credential_type,secret_hash)
SELECT id,'legacy_access_code',private.sha256_hex(access_code) FROM public.smart_devices WHERE access_code IS NOT NULL AND access_code<>''
ON CONFLICT(device_id,credential_type) DO NOTHING;
UPDATE public.smart_devices SET access_code=NULL WHERE access_code IS NOT NULL;
ALTER TABLE public.smart_device_events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'trusted_gateway'
  CHECK(source IN('trusted_gateway','provider_webhook','manual_admin','system'));
REVOKE INSERT,UPDATE,DELETE,SELECT ON public.smart_devices,public.smart_device_events FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.redact_sensitive_json(p_value JSONB)
RETURNS JSONB LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public,private AS $$
DECLARE v_result JSONB; v_item RECORD;
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(p_value)='object' THEN
    SELECT COALESCE(jsonb_object_agg(key,private.redact_sensitive_json(value)),'{}'::JSONB) INTO v_result
    FROM jsonb_each(p_value)
    WHERE lower(key) !~ '(secret|token|password|credential|access[_-]?code|pin|private[_-]?key)';
    RETURN v_result;
  ELSIF jsonb_typeof(p_value)='array' THEN
    v_result:='[]'::JSONB;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_value) LOOP
      v_result:=v_result||jsonb_build_array(private.redact_sensitive_json(v_item.value));
    END LOOP;
    RETURN v_result;
  END IF;
  RETURN p_value;
END; $$;
REVOKE ALL ON FUNCTION private.redact_sensitive_json(JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.redact_sensitive_json(JSONB) TO authenticated,service_role;
CREATE OR REPLACE VIEW public.smart_devices_safe WITH(security_barrier=true) AS
  SELECT id,organization_id,listing_id,lease_id,device_type,label,room,status,
    private.redact_sensitive_json(last_reading) AS last_reading,created_at,updated_at FROM public.smart_devices
  WHERE private.is_org_admin(organization_id) OR EXISTS(SELECT 1 FROM public.resident_home_profiles p
    WHERE p.lease_id=smart_devices.lease_id AND p.tenant_user_id=auth.uid() AND p.smart_access_enabled);
GRANT SELECT ON public.smart_devices_safe TO authenticated;
CREATE OR REPLACE VIEW public.smart_device_events_safe WITH(security_barrier=true) AS
 SELECT e.id,e.device_id,e.event_type,private.redact_sensitive_json(e.payload) AS payload,e.created_at,e.source
 FROM public.smart_device_events e JOIN public.smart_devices d ON d.id=e.device_id
 WHERE private.is_org_admin(d.organization_id) OR EXISTS(SELECT 1 FROM public.resident_home_profiles p
   WHERE p.lease_id=d.lease_id AND p.tenant_user_id=auth.uid() AND p.smart_access_enabled);
GRANT SELECT ON public.smart_device_events_safe TO authenticated;
UPDATE public.resident_home_profiles SET door_access_code=NULL WHERE door_access_code IS NOT NULL;
CREATE OR REPLACE FUNCTION public.clear_resident_home_door_code() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN NEW.door_access_code:=NULL; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_clear_resident_home_door_code ON public.resident_home_profiles;
CREATE TRIGGER trg_clear_resident_home_door_code BEFORE INSERT OR UPDATE OF door_access_code ON public.resident_home_profiles
FOR EACH ROW EXECUTE FUNCTION public.clear_resident_home_door_code();
REVOKE INSERT,UPDATE,DELETE ON public.resident_home_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.resident_home_profiles TO authenticated;
CREATE FUNCTION public.grant_lease_smart_access(p_lease_id UUID)
RETURNS public.resident_home_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_lease public.leases; v_row public.resident_home_profiles;
BEGIN
 SELECT * INTO v_lease FROM public.leases WHERE id=p_lease_id AND status='active';
 IF NOT FOUND OR v_lease.tenant_user_id IS NULL OR NOT private.is_org_admin(v_lease.organization_id) THEN
   RAISE EXCEPTION 'Active lease and organization administrator authorization required';
 END IF;
 INSERT INTO public.resident_home_profiles(lease_id,tenant_user_id,smart_access_enabled,smart_access_granted_at,smart_access_granted_by,smart_access_revoked_at,updated_at)
 VALUES(v_lease.id,v_lease.tenant_user_id,TRUE,NOW(),auth.uid(),NULL,NOW())
 ON CONFLICT(lease_id) DO UPDATE SET tenant_user_id=EXCLUDED.tenant_user_id,smart_access_enabled=TRUE,
   smart_access_granted_at=NOW(),smart_access_granted_by=auth.uid(),smart_access_revoked_at=NULL,updated_at=NOW()
 RETURNING * INTO v_row;
 RETURN v_row;
END; $$;
CREATE FUNCTION public.revoke_lease_smart_access(p_lease_id UUID)
RETURNS public.resident_home_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_lease public.leases; v_row public.resident_home_profiles;
BEGIN
 SELECT * INTO v_lease FROM public.leases WHERE id=p_lease_id;
 IF NOT FOUND OR NOT private.is_org_admin(v_lease.organization_id) THEN RAISE EXCEPTION 'Organization administrator authorization required'; END IF;
 UPDATE public.resident_home_profiles SET smart_access_enabled=FALSE,smart_access_revoked_at=NOW(),smart_access_granted_by=auth.uid(),updated_at=NOW()
 WHERE lease_id=p_lease_id RETURNING * INTO v_row;
 RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.grant_lease_smart_access(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.revoke_lease_smart_access(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_lease_smart_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_lease_smart_access(UUID) TO authenticated;
DROP FUNCTION IF EXISTS public.register_smart_device(UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT);
CREATE FUNCTION public.register_smart_device(p_organization_id UUID,p_device_type TEXT,p_label TEXT,p_listing_id UUID DEFAULT NULL,p_lease_id UUID DEFAULT NULL,p_room TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_row public.smart_devices;
BEGIN
 IF NOT private.is_org_admin(p_organization_id) THEN RAISE EXCEPTION 'Organization administrator authorization required'; END IF;
 IF p_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=p_listing_id AND organization_id=p_organization_id) THEN RAISE EXCEPTION 'Listing does not belong to organization'; END IF;
 IF p_lease_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.leases WHERE id=p_lease_id AND organization_id=p_organization_id) THEN RAISE EXCEPTION 'Lease does not belong to organization'; END IF;
 IF p_listing_id IS NOT NULL AND p_lease_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.leases WHERE id=p_lease_id AND listing_id=p_listing_id) THEN RAISE EXCEPTION 'Listing and lease bindings are inconsistent'; END IF;
 INSERT INTO public.smart_devices(organization_id,listing_id,lease_id,device_type,label,room,status,last_reading)
 VALUES(p_organization_id,p_listing_id,p_lease_id,p_device_type,left(btrim(p_label),120),NULLIF(btrim(p_room),''),'offline','{}'::JSONB) RETURNING * INTO v_row;
 RETURN to_jsonb(v_row)-'access_code';
END; $$;
REVOKE ALL ON FUNCTION public.register_smart_device(UUID,TEXT,TEXT,UUID,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_smart_device(UUID,TEXT,TEXT,UUID,UUID,TEXT) TO authenticated;
CREATE FUNCTION public.append_smart_device_manual_note(p_device_id UUID,p_note TEXT)
RETURNS public.smart_device_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_org UUID; v_row public.smart_device_events;
BEGIN SELECT organization_id INTO v_org FROM public.smart_devices WHERE id=p_device_id;
 IF v_org IS NULL OR NOT private.is_org_admin(v_org) THEN RAISE EXCEPTION 'Device administrator authorization required'; END IF;
 IF p_note IS NULL OR btrim(p_note)='' OR length(p_note)>1000 THEN RAISE EXCEPTION 'Manual note must contain 1-1000 characters'; END IF;
 INSERT INTO public.smart_device_events(device_id,event_type,payload,source,created_at) VALUES(p_device_id,'admin_note',jsonb_build_object('note',btrim(p_note)),'manual_admin',NOW()) RETURNING * INTO v_row;
 RETURN v_row; END; $$;
REVOKE ALL ON FUNCTION public.append_smart_device_manual_note(UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.append_smart_device_manual_note(UUID,TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.append_smart_device_event(p_device_id UUID,p_event_type TEXT,p_payload JSONB DEFAULT '{}'::JSONB)
RETURNS public.smart_device_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_row public.smart_device_events;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Trusted device gateway or provider execution required'; END IF;
  IF p_event_type NOT IN ('door_opened','door_closed','alarm_triggered','camera_offline','meter_reading','device_status') THEN
    RAISE EXCEPTION 'Unsupported trusted telemetry event';
  END IF;
  IF p_payload IS NULL OR octet_length(p_payload::TEXT)>8192 THEN RAISE EXCEPTION 'Telemetry payload exceeds limits'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.smart_devices WHERE id=p_device_id) THEN RAISE EXCEPTION 'Device not found'; END IF;
  INSERT INTO public.smart_device_events(device_id,event_type,payload,source,created_at)
  VALUES(p_device_id,p_event_type,private.redact_sensitive_json(p_payload),'trusted_gateway',NOW()) RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.append_smart_device_event(UUID,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.append_smart_device_event(UUID,TEXT,JSONB) TO service_role;
CREATE FUNCTION public.remove_smart_device(p_device_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_org UUID; BEGIN SELECT organization_id INTO v_org FROM public.smart_devices WHERE id=p_device_id;
 IF v_org IS NULL OR NOT private.is_org_admin(v_org) THEN RAISE EXCEPTION 'Device administrator authorization required'; END IF;
 DELETE FROM public.smart_devices WHERE id=p_device_id; RETURN FOUND; END; $$;
REVOKE ALL ON FUNCTION public.remove_smart_device(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_smart_device(UUID) TO authenticated;

-- Authenticated complaint attribution is always auth.uid(); anonymous requests have bounded payload and an IP-derived throttle key.
CREATE TABLE IF NOT EXISTS public.support_complaint_attempts(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_key TEXT NOT NULL,attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS support_complaint_attempts_recent_idx ON public.support_complaint_attempts(actor_key,attempted_at DESC);
ALTER TABLE public.support_complaint_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_complaint_attempts FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.support_complaints FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS public.submit_support_complaint(UUID,TEXT,TEXT,TEXT,UUID,TEXT);
CREATE FUNCTION public.submit_support_complaint(p_category TEXT,p_subject TEXT,p_description TEXT,p_listing_id UUID DEFAULT NULL,p_contact_email TEXT DEFAULT NULL)
RETURNS public.support_complaints LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user UUID:=auth.uid(); v_headers JSONB; v_key TEXT; v_count INTEGER; v_row public.support_complaints;
BEGIN
 IF p_category IS NULL OR btrim(p_category)='' OR length(p_category)>80 OR p_subject IS NULL OR btrim(p_subject)='' OR length(p_subject)>200
   OR p_description IS NULL OR btrim(p_description)='' OR length(p_description)>10000 THEN RAISE EXCEPTION 'Complaint fields are missing or exceed limits'; END IF;
 BEGIN v_headers:=current_setting('request.headers',TRUE)::JSONB; EXCEPTION WHEN OTHERS THEN v_headers:='{}'::JSONB; END;
 v_key:=CASE WHEN v_user IS NOT NULL THEN 'user:'||v_user::TEXT ELSE 'ip:'||private.sha256_hex(COALESCE(v_headers->>'cf-connecting-ip',v_headers->>'x-real-ip',v_headers->>'x-forwarded-for','unknown')) END;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_key,0));
 SELECT count(*) INTO v_count FROM public.support_complaint_attempts WHERE actor_key=v_key AND attempted_at>NOW()-INTERVAL '1 hour';
 IF v_count>=5 THEN RAISE EXCEPTION 'too many complaints in a short period'; END IF;
 INSERT INTO public.support_complaint_attempts(actor_key) VALUES(v_key);
 INSERT INTO public.support_complaints(user_id,contact_email,category,subject,description,listing_id,status,created_at,updated_at)
 VALUES(v_user,left(NULLIF(btrim(p_contact_email),''),254),btrim(p_category),btrim(p_subject),btrim(p_description),p_listing_id,'open',NOW(),NOW()) RETURNING * INTO v_row;
 RETURN v_row; END; $$;
REVOKE ALL ON FUNCTION public.submit_support_complaint(TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_support_complaint(TEXT,TEXT,TEXT,UUID,TEXT) TO authenticated,anon;
GRANT SELECT ON public.support_complaints TO authenticated;

-- Acceptance scopes and required slugs are database-owned, not client parameters.
ALTER TABLE public.legal_acceptances ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT;
CREATE TABLE IF NOT EXISTS public.legal_policy_bundles(scope TEXT PRIMARY KEY,policy_version TEXT NOT NULL,policies TEXT[] NOT NULL CHECK(cardinality(policies)>0),active BOOLEAN NOT NULL DEFAULT TRUE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE public.legal_policy_bundles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_policy_bundles FROM PUBLIC,anon,authenticated;
INSERT INTO public.legal_policy_bundles VALUES
 ('signup_consumer','2026-09-28-material-coverage',ARRAY['terms','privacy','marketplace-rules','cookies'],TRUE,NOW()),
 ('signup_host','2026-09-28-material-coverage',ARRAY['terms','privacy','marketplace-rules','host-terms','payments','cookies'],TRUE,NOW()),
 ('payment_checkout','2026-09-28-material-coverage',ARRAY['payments','refunds'],TRUE,NOW()),
 ('short_stay_booking','2026-09-28-material-coverage',ARRAY['tenant-guest-rules','payments','refunds'],TRUE,NOW()),
 ('listing_publish','2026-09-28-material-coverage',ARRAY['property-owner-terms','marketplace-rules','non-discrimination'],TRUE,NOW()),
 ('agency_onboarding','2026-09-28-material-coverage',ARRAY['agency-agent-terms','data-processing','trust-verification'],TRUE,NOW()),
 ('personal_host_onboarding','2026-09-28-material-coverage',ARRAY['property-owner-terms','kyc','privacy','data-processing'],TRUE,NOW()),
 ('kyc_submission','2026-09-28-material-coverage',ARRAY['kyc','privacy'],TRUE,NOW()),
 ('account_signup','2026-09-28-material-coverage',ARRAY['terms','privacy','cookies','age-minor-protection'],TRUE,NOW()),
 ('marketplace_use','2026-09-28-material-coverage',ARRAY['terms','marketplace-rules','privacy-rights'],TRUE,NOW()),
 ('lease_application','2026-09-28-material-coverage',ARRAY['terms','tenant-guest-rules','tenant-screening'],TRUE,NOW()),
 ('lease_signature','2026-09-28-material-coverage',ARRAY['e-signatures','terms','privacy'],TRUE,NOW()),
 ('tenant_screening','2026-09-28-material-coverage',ARRAY['tenant-screening','privacy-rights','terms'],TRUE,NOW()),
 ('marketing','2026-09-28-material-coverage',ARRAY['communications-marketing','privacy-rights','cookies'],TRUE,NOW()),
 ('smart_access','2026-09-28-material-coverage',ARRAY['smart-access-security','privacy','location-data'],TRUE,NOW()),
 ('developer_api','2026-09-28-material-coverage',ARRAY['developer-api-terms','privacy','terms'],TRUE,NOW()),
 ('business_workspace','2026-09-28-material-coverage',ARRAY['business-saas-terms','data-processing','privacy-rights'],TRUE,NOW()),
 ('vendor_onboarding','2026-09-28-material-coverage',ARRAY['vendor-terms','professional-credentials','privacy'],TRUE,NOW()),
 ('owner_onboarding','2026-09-28-material-coverage',ARRAY['property-owner-terms','professional-credentials','terms'],TRUE,NOW())
ON CONFLICT(scope) DO UPDATE SET policy_version=EXCLUDED.policy_version,policies=EXCLUDED.policies,active=TRUE,updated_at=NOW();
DROP FUNCTION IF EXISTS public.record_legal_acceptance(UUID,TEXT,TEXT,TEXT[],TEXT);
CREATE FUNCTION public.record_legal_acceptance(p_scope TEXT,p_jurisdiction TEXT DEFAULT NULL)
RETURNS public.legal_acceptances LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_bundle public.legal_policy_bundles; v_row public.legal_acceptances; v_jurisdiction TEXT; v_headers JSONB;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_bundle FROM public.legal_policy_bundles WHERE scope=p_scope AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'No active legal policy bundle for scope'; END IF;
 SELECT COALESCE(NULLIF(to_jsonb(u)->>'country',''),NULLIF(to_jsonb(u)->>'jurisdiction',''),'GH') INTO v_jurisdiction FROM public.users u WHERE id=auth.uid();
 BEGIN v_headers:=current_setting('request.headers',TRUE)::JSONB; EXCEPTION WHEN OTHERS THEN v_headers:='{}'::JSONB; END;
 INSERT INTO public.legal_acceptances(user_id,scope,policy_version,policies,user_agent,accepted_at,jurisdiction_id)
 VALUES(auth.uid(),p_scope,v_bundle.policy_version,v_bundle.policies,v_headers->>'user-agent',NOW(),v_jurisdiction) RETURNING * INTO v_row;
 RETURN v_row; END; $$;
REVOKE ALL ON FUNCTION public.record_legal_acceptance(TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(TEXT,TEXT) TO authenticated;
REVOKE UPDATE,DELETE ON public.legal_acceptances FROM PUBLIC,anon,authenticated;

-- Valuation evidence is trusted-service-only and cross-resource organization binding is derived from records.
ALTER TABLE public.property_valuation_audits ADD COLUMN IF NOT EXISTS model_id TEXT,ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS input_hash TEXT,ADD COLUMN IF NOT EXISTS confidence_calibrated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_of UUID REFERENCES public.property_valuation_audits(id) ON DELETE RESTRICT;
ALTER TABLE public.property_valuation_audits ALTER COLUMN confidence_score_pct DROP NOT NULL, ALTER COLUMN confidence_score_pct DROP DEFAULT;
REVOKE INSERT,UPDATE,DELETE ON public.property_valuation_audits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.property_valuation_audits TO authenticated;
CREATE FUNCTION public.record_property_valuation_audit(p_property_id UUID,p_listing_id UUID,p_property_title TEXT,p_neighborhood TEXT,p_property_type TEXT,
 p_bedrooms INTEGER,p_bathrooms NUMERIC,p_area_sqm NUMERIC,p_purchase_price_ghs NUMERIC,p_predicted_min NUMERIC,p_predicted_optimal NUMERIC,
 p_predicted_max NUMERIC,p_gross_yield NUMERIC,p_net_cap_rate NUMERIC,p_vacancy_weeks NUMERIC,p_model_id TEXT,p_model_version TEXT,
 p_input_snapshot JSONB,p_confidence_score NUMERIC DEFAULT NULL,p_confidence_calibrated BOOLEAN DEFAULT FALSE,p_correction_of UUID DEFAULT NULL)
RETURNS public.property_valuation_audits LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org UUID; v_lorg UUID; v_porg UUID; v_row public.property_valuation_audits;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Trusted valuation service required'; END IF;
 IF p_listing_id IS NOT NULL THEN SELECT organization_id INTO v_lorg FROM public.listings WHERE id=p_listing_id; END IF;
 IF p_property_id IS NOT NULL THEN SELECT organization_id INTO v_porg FROM public.properties WHERE id=p_property_id; END IF;
 IF p_listing_id IS NOT NULL AND v_lorg IS NULL OR p_property_id IS NOT NULL AND v_porg IS NULL THEN RAISE EXCEPTION 'Property or listing not found'; END IF;
 IF v_lorg IS NOT NULL AND v_porg IS NOT NULL AND v_lorg IS DISTINCT FROM v_porg THEN RAISE EXCEPTION 'Property and listing organization mismatch'; END IF;
 IF p_property_id IS NOT NULL AND p_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=p_listing_id AND property_id=p_property_id) THEN RAISE EXCEPTION 'Listing does not reference property'; END IF;
 IF p_correction_of IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.property_valuation_audits WHERE id=p_correction_of AND organization_id=COALESCE(v_lorg,v_porg)) THEN RAISE EXCEPTION 'Correction must reference an audit in the same organization'; END IF;
 v_org:=COALESCE(v_lorg,v_porg); IF v_org IS NULL THEN RAISE EXCEPTION 'Bound property or listing required'; END IF;
 INSERT INTO public.property_valuation_audits(organization_id,property_id,listing_id,property_title,neighborhood,property_type,bedrooms,bathrooms,area_sqm,
 purchase_price_ghs,predicted_monthly_rent_min_ghs,predicted_monthly_rent_optimal_ghs,predicted_monthly_rent_max_ghs,projected_gross_yield_pct,
 projected_net_cap_rate_pct,projected_vacancy_weeks,confidence_score_pct,valuation_summary_json,created_by,created_at,model_id,model_version,input_hash,confidence_calibrated,correction_of)
 VALUES(v_org,p_property_id,p_listing_id,left(p_property_title,200),left(p_neighborhood,120),p_property_type,p_bedrooms,p_bathrooms,p_area_sqm,p_purchase_price_ghs,
 p_predicted_min,p_predicted_optimal,p_predicted_max,p_gross_yield,p_net_cap_rate,p_vacancy_weeks,CASE WHEN p_confidence_calibrated THEN p_confidence_score ELSE NULL END,
 COALESCE(p_input_snapshot,'{}'::JSONB),NULL,NOW(),p_model_id,p_model_version,private.sha256_hex(COALESCE(p_input_snapshot,'{}'::JSONB)::TEXT),COALESCE(p_confidence_calibrated,FALSE),p_correction_of)
 RETURNING * INTO v_row; RETURN v_row; END; $$;
REVOKE ALL ON FUNCTION public.record_property_valuation_audit(UUID,UUID,TEXT,TEXT,TEXT,INTEGER,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT,JSONB,NUMERIC,BOOLEAN,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_property_valuation_audit(UUID,UUID,TEXT,TEXT,TEXT,INTEGER,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT,JSONB,NUMERIC,BOOLEAN,UUID) TO service_role;

-- Webhook secrets live in a service-only table; authenticated access is via safe subscription metadata.
CREATE TABLE IF NOT EXISTS public.organization_webhook_secrets(subscription_id UUID PRIMARY KEY REFERENCES public.organization_webhook_subscriptions(id) ON DELETE CASCADE,
 secret_value TEXT NOT NULL,rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_by UUID REFERENCES public.users(id) ON DELETE SET NULL);
ALTER TABLE public.organization_webhook_subscriptions ADD COLUMN IF NOT EXISTS secret_ref UUID,ADD COLUMN IF NOT EXISTS secret_masked_prefix TEXT,ADD COLUMN IF NOT EXISTS secret_rotated_at TIMESTAMPTZ;
INSERT INTO public.organization_webhook_secrets(subscription_id,secret_value,created_at)
SELECT id,'whsec_'||encode(gen_random_bytes(32),'hex'),created_at FROM public.organization_webhook_subscriptions
 WHERE secret IS NOT NULL AND secret<>'' ON CONFLICT(subscription_id) DO NOTHING;
UPDATE public.organization_webhook_subscriptions SET secret_ref=id,secret_masked_prefix='ROTATE_REQUIRED',secret_rotated_at=NULL,
  secret='moved-to-server-secret-store',status=CASE WHEN status='active' THEN 'paused' ELSE status END
WHERE secret<>'moved-to-server-secret-store';
ALTER TABLE public.organization_webhook_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_webhook_secrets FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.organization_webhook_secrets TO service_role;
REVOKE SELECT,INSERT,UPDATE,DELETE ON public.organization_webhook_subscriptions FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,organization_id,url,description,event_types,status,delivery_success_count,delivery_failure_count,last_delivered_at,created_at,secret_ref,secret_masked_prefix,secret_rotated_at)
 ON public.organization_webhook_subscriptions TO authenticated;
CREATE OR REPLACE VIEW public.organization_webhook_subscriptions_safe WITH(security_invoker=true) AS
 SELECT id,organization_id,url,description,event_types,status,delivery_success_count,delivery_failure_count,last_delivered_at,created_at,secret_masked_prefix,secret_rotated_at
 FROM public.organization_webhook_subscriptions;
GRANT SELECT ON public.organization_webhook_subscriptions_safe TO authenticated;
CREATE OR REPLACE FUNCTION public.create_organization_webhook(p_organization_id UUID,p_url TEXT,p_description TEXT,p_event_types TEXT[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,private AS $$
DECLARE v_secret TEXT; v_row public.organization_webhook_subscriptions%ROWTYPE;
BEGIN
 IF NOT private.org_member_has_permission(p_organization_id,'webhooks:manage') THEN RAISE EXCEPTION 'Webhook management capability required'; END IF;
 IF p_url IS NULL OR p_url !~ '^https://' THEN RAISE EXCEPTION 'Webhook URL must use HTTPS'; END IF;
 v_secret:='whsec_'||encode(gen_random_bytes(32),'hex');
 INSERT INTO public.organization_webhook_subscriptions(organization_id,url,description,event_types,secret,status,secret_masked_prefix,secret_rotated_at)
 VALUES(p_organization_id,p_url,left(btrim(COALESCE(p_description,'')),500),COALESCE(p_event_types,'{}'),'moved-to-server-secret-store','active',left(v_secret,12),NOW()) RETURNING * INTO v_row;
 INSERT INTO public.organization_webhook_secrets(subscription_id,secret_value,created_by) VALUES(v_row.id,v_secret,auth.uid());
 UPDATE public.organization_webhook_subscriptions SET secret_ref=id WHERE id=v_row.id;
 RETURN jsonb_build_object('id',v_row.id,'organization_id',v_row.organization_id,'url',v_row.url,'description',v_row.description,'event_types',v_row.event_types,
  'status',v_row.status,'created_at',v_row.created_at,'secret',v_secret,'secret_masked_prefix',left(v_secret,12)); END; $$;
CREATE FUNCTION public.rotate_organization_webhook_secret(p_subscription_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,private AS $$
DECLARE v_org UUID; v_secret TEXT;
BEGIN SELECT organization_id INTO v_org FROM public.organization_webhook_subscriptions WHERE id=p_subscription_id FOR UPDATE;
 IF v_org IS NULL OR NOT private.org_member_has_permission(v_org,'webhooks:manage') THEN RAISE EXCEPTION 'Webhook management capability required'; END IF;
 v_secret:='whsec_'||encode(gen_random_bytes(32),'hex');
 UPDATE public.organization_webhook_secrets SET secret_value=v_secret,rotated_at=NOW(),created_by=auth.uid() WHERE subscription_id=p_subscription_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Webhook secret record missing'; END IF;
 UPDATE public.organization_webhook_subscriptions SET secret_masked_prefix=left(v_secret,12),secret_rotated_at=NOW(),status='active' WHERE id=p_subscription_id;
 RETURN jsonb_build_object('subscription_id',p_subscription_id,'secret',v_secret,'rotated_at',NOW()); END; $$;
CREATE FUNCTION public.delete_organization_webhook(p_subscription_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_org UUID; BEGIN SELECT organization_id INTO v_org FROM public.organization_webhook_subscriptions WHERE id=p_subscription_id;
 IF v_org IS NULL OR NOT private.org_member_has_permission(v_org,'webhooks:manage') THEN RAISE EXCEPTION 'Webhook management capability required'; END IF;
 DELETE FROM public.organization_webhook_subscriptions WHERE id=p_subscription_id; RETURN FOUND; END; $$;
CREATE FUNCTION public.get_organization_webhook_secret(p_subscription_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_secret TEXT;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Trusted webhook delivery service required'; END IF;
 SELECT secret_value INTO v_secret FROM public.organization_webhook_secrets WHERE subscription_id=p_subscription_id;
 IF v_secret IS NULL THEN RAISE EXCEPTION 'Webhook secret not found'; END IF;
 RETURN v_secret;
END; $$;
REVOKE ALL ON FUNCTION public.create_organization_webhook(UUID,TEXT,TEXT,TEXT[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rotate_organization_webhook_secret(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_organization_webhook(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_organization_webhook_secret(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_webhook(UUID,TEXT,TEXT,TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_organization_webhook_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organization_webhook(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_webhook_secret(UUID) TO service_role;

CREATE OR REPLACE VIEW public.estate_visitor_passes_safe WITH(security_invoker=true) AS
 SELECT id,estate_id,host_unit_id,host_user_id,host_name,visitor_name,visitor_phone,company_name,vehicle_plate,pass_type,valid_from,valid_until,
  max_uses,use_count,status,sms_sent,sms_reference,created_by,created_at,updated_at FROM public.estate_visitor_passes
 WHERE host_user_id=auth.uid() OR (private.is_estate_staff(estate_id) AND private.org_member_has_permission(
   (SELECT organization_id FROM public.managed_estates WHERE id=estate_id),'visitor_passes:manage'));
GRANT SELECT ON public.estate_visitor_passes_safe TO authenticated;
COMMENT ON TABLE public.smart_device_credentials IS 'Credential material for smart devices; inaccessible to browser roles.';
COMMENT ON TABLE public.organization_webhook_secrets IS 'Webhook secrets are readable only by trusted service execution.';