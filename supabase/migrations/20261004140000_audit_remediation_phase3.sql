-- Audit remediation phase 3: offline maintenance RPC, WhatsApp claim hardening.

CREATE OR REPLACE FUNCTION public.upsert_maintenance_request_offline(
  p_organization_id UUID,
  p_offline_client_id TEXT,
  p_payload JSONB
)
RETURNS public.maintenance_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.maintenance_requests;
  v_row public.maintenance_requests;
  v_tenant UUID;
  v_title TEXT;
  v_description TEXT;
  v_priority TEXT;
BEGIN
  IF p_offline_client_id IS NULL OR length(trim(p_offline_client_id)) = 0 THEN
    RAISE EXCEPTION 'offline_client_id is required';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = p_organization_id
        AND m.user_id = auth.uid()
    )
    OR (p_payload->>'tenant_user_id')::UUID = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to sync maintenance for this organization';
  END IF;

  SELECT * INTO v_existing
  FROM public.maintenance_requests
  WHERE organization_id = p_organization_id
    AND offline_client_id = trim(p_offline_client_id)
  LIMIT 1;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_tenant := COALESCE((p_payload->>'tenant_user_id')::UUID, auth.uid());
  v_title := COALESCE(nullif(trim(p_payload->>'title'), ''), 'Maintenance request');
  v_description := COALESCE(nullif(trim(p_payload->>'description'), ''), v_title);
  v_priority := COALESCE(nullif(trim(p_payload->>'priority'), ''), 'normal');

  IF v_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_priority := 'normal';
  END IF;

  INSERT INTO public.maintenance_requests (
    organization_id,
    offline_client_id,
    tenant_user_id,
    lease_id,
    listing_id,
    title,
    description,
    priority,
    status,
    photo_urls
  )
  VALUES (
    p_organization_id,
    trim(p_offline_client_id),
    v_tenant,
    NULLIF(p_payload->>'lease_id', '')::UUID,
    NULLIF(p_payload->>'listing_id', '')::UUID,
    v_title,
    v_description,
    v_priority,
    'open',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'photo_urls')),
      ARRAY[]::TEXT[]
    )
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_maintenance_request_offline(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_maintenance_request_offline(UUID, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_inbound_message(
  p_organization_id UUID,
  p_wa_message_id TEXT
)
RETURNS TABLE (claimed BOOLEAN, inbound_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_wa_message_id IS NULL OR length(trim(p_wa_message_id)) = 0 THEN
    claimed := FALSE;
    inbound_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.whatsapp_inbound_messages (
      organization_id,
      wa_message_id,
      sender_phone,
      message_text,
      bot_replied,
      processing_status
    )
    VALUES (
      p_organization_id,
      p_wa_message_id,
      'pending',
      '',
      FALSE,
      'processing'
    )
    RETURNING id INTO v_id;
    claimed := TRUE;
    inbound_id := v_id;
  EXCEPTION
    WHEN unique_violation THEN
      claimed := FALSE;
      inbound_id := NULL;
  END;
  RETURN NEXT;
END;
$$;
