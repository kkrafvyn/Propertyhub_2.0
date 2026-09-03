-- WhatsApp bot: tenant lookup, gate passes, maintenance, manager escalation

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.find_user_id_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT public.normalize_phone_digits(p_phone) AS digits
  )
  SELECT u.id
  FROM public.users u
  CROSS JOIN normalized n
  WHERE n.digits <> ''
    AND public.normalize_phone_digits(COALESCE(u.phone, '')) <> ''
    AND (
      public.normalize_phone_digits(u.phone) = n.digits
      OR right(public.normalize_phone_digits(u.phone), 9) = right(n.digits, 9)
    )
  ORDER BY u.updated_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_whatsapp_bot_context(
  p_organization_id UUID,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ctx JSONB := '{}'::jsonb;
  v_outstanding BIGINT := 0;
  v_lease RECORD;
  v_occ RECORD;
BEGIN
  v_user_id := public.find_user_id_by_phone(p_phone);
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    l.id,
    l.rent_minor,
    l.currency,
    l.next_rent_due_at,
    l.listing_id,
    COALESCE(p.title, p.address, 'Unit') AS unit_label,
    COALESCE(p.city, '') AS city
  INTO v_lease
  FROM public.leases l
  LEFT JOIN public.listings li ON li.id = l.listing_id
  LEFT JOIN public.properties p ON p.id = li.property_id
  WHERE l.organization_id = p_organization_id
    AND l.tenant_user_id = v_user_id
    AND l.status = 'active'
  ORDER BY l.created_at DESC
  LIMIT 1;

  SELECT
    o.unit_id,
    u.identifier,
    e.id AS estate_id,
    e.name AS estate_name,
    e.currency
  INTO v_occ
  FROM public.unit_occupancies o
  JOIN public.estate_units u ON u.id = o.unit_id
  JOIN public.managed_estates e ON e.id = u.estate_id
  WHERE e.organization_id = p_organization_id
    AND o.user_id = v_user_id
    AND o.role = 'tenant'
    AND o.end_date IS NULL
  ORDER BY o.start_date DESC
  LIMIT 1;

  SELECT COALESCE(SUM(GREATEST(c.amount_minor - COALESCE(alloc.paid_minor, 0), 0)), 0)
  INTO v_outstanding
  FROM public.unit_occupancies o
  JOIN public.estate_units u ON u.id = o.unit_id
  JOIN public.managed_estates e ON e.id = u.estate_id
  JOIN public.unit_charges c ON c.unit_id = u.id
  LEFT JOIN (
    SELECT charge_id, SUM(amount_minor) AS paid_minor
    FROM public.payment_allocations
    GROUP BY charge_id
  ) alloc ON alloc.charge_id = c.id
  WHERE e.organization_id = p_organization_id
    AND o.user_id = v_user_id
    AND o.role = 'tenant'
    AND o.end_date IS NULL;

  SELECT jsonb_build_object(
    'tenantUserId', v_user_id,
    'tenantName', COALESCE(u.full_name, split_part(u.email, '@', 1), 'Resident'),
    'unitLabel', COALESCE(v_occ.identifier, v_lease.unit_label, 'Unit'),
    'estateName', COALESCE(v_occ.estate_name, v_lease.city, 'Your property'),
    'estateId', v_occ.estate_id,
    'leaseId', v_lease.id,
    'listingId', v_lease.listing_id,
    'currency', COALESCE(v_occ.currency, v_lease.currency, 'GHS'),
    'outstandingMinor', COALESCE(v_outstanding, 0),
    'rentMinor', COALESCE(v_lease.rent_minor, 0),
    'nextDueDate', v_lease.next_rent_due_at,
    'paymentPath', CASE
      WHEN v_lease.id IS NOT NULL THEN '/app/payments?lease=' || v_lease.id::text
      ELSE '/app/payments'
    END,
    'openTickets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', mr.id,
        'title', mr.title,
        'status', mr.status,
        'priority', mr.priority
      ) ORDER BY mr.created_at DESC)
      FROM public.maintenance_requests mr
      WHERE mr.organization_id = p_organization_id
        AND mr.tenant_user_id = v_user_id
        AND mr.status IN ('open', 'in_progress')
      LIMIT 5
    ), '[]'::jsonb)
  )
  INTO v_ctx
  FROM public.users u
  WHERE u.id = v_user_id;

  RETURN v_ctx;
END;
$$;

CREATE OR REPLACE FUNCTION public.bot_create_whatsapp_visitor_pass(
  p_organization_id UUID,
  p_phone TEXT,
  p_visitor_name TEXT DEFAULT 'Guest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_occ RECORD;
  v_pin TEXT;
  v_token TEXT;
  v_pass_id UUID;
  v_valid_until TIMESTAMPTZ;
  v_host_name TEXT;
BEGIN
  v_user_id := public.find_user_id_by_phone(p_phone);
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found');
  END IF;

  SELECT u.full_name INTO v_host_name FROM public.users u WHERE u.id = v_user_id;

  SELECT
    o.unit_id,
    eu.identifier,
    e.id AS estate_id,
    e.name AS estate_name
  INTO v_occ
  FROM public.unit_occupancies o
  JOIN public.estate_units eu ON eu.id = o.unit_id
  JOIN public.managed_estates e ON e.id = eu.estate_id
  WHERE e.organization_id = p_organization_id
    AND o.user_id = v_user_id
    AND o.role = 'tenant'
    AND o.end_date IS NULL
  ORDER BY o.start_date DESC
  LIMIT 1;

  IF v_occ.estate_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_occupancy');
  END IF;

  v_pin := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
  v_token := 'BM-GATE-' || v_pin;
  v_valid_until := NOW() + INTERVAL '6 hours';

  INSERT INTO public.estate_visitor_passes (
    estate_id,
    host_unit_id,
    host_user_id,
    host_name,
    visitor_name,
    pass_type,
    pin_code,
    qr_payload,
    valid_from,
    valid_until,
    status
  ) VALUES (
    v_occ.estate_id,
    v_occ.unit_id,
    v_user_id,
    COALESCE(v_host_name, 'Resident'),
    COALESCE(NULLIF(trim(p_visitor_name), ''), 'Guest'),
    'guest',
    v_pin,
    v_token,
    NOW(),
    v_valid_until,
    'active'
  )
  RETURNING id INTO v_pass_id;

  RETURN jsonb_build_object(
    'success', true,
    'passId', v_pass_id,
    'pinCode', v_pin,
    'qrPayload', v_token,
    'validUntil', v_valid_until,
    'estateName', v_occ.estate_name,
    'unitLabel', v_occ.identifier,
    'visitorName', COALESCE(NULLIF(trim(p_visitor_name), ''), 'Guest')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bot_create_whatsapp_maintenance(
  p_organization_id UUID,
  p_phone TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_lease RECORD;
  v_ticket_id UUID;
  v_title TEXT;
  v_desc TEXT;
BEGIN
  v_user_id := public.find_user_id_by_phone(p_phone);
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found');
  END IF;

  v_desc := COALESCE(NULLIF(trim(p_description), ''), 'Issue reported via WhatsApp');
  v_title := left(v_desc, 80);

  SELECT l.id, l.listing_id
  INTO v_lease
  FROM public.leases l
  WHERE l.organization_id = p_organization_id
    AND l.tenant_user_id = v_user_id
    AND l.status = 'active'
  ORDER BY l.created_at DESC
  LIMIT 1;

  INSERT INTO public.maintenance_requests (
    tenant_user_id,
    organization_id,
    lease_id,
    listing_id,
    title,
    description,
    priority,
    status
  ) VALUES (
    v_user_id,
    p_organization_id,
    v_lease.id,
    v_lease.listing_id,
    v_title,
    v_desc,
    CASE WHEN v_desc ~* '(leak|flood|fire|gas|emergency)' THEN 'urgent' ELSE 'normal' END,
    'open'
  )
  RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticketId', v_ticket_id,
    'title', v_title,
    'status', 'open'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bot_escalate_whatsapp_to_manager(
  p_organization_id UUID,
  p_phone TEXT,
  p_message TEXT DEFAULT 'Tenant requested manager support via WhatsApp'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_manager_id UUID;
  v_tenant_name TEXT;
  v_notified INT := 0;
BEGIN
  v_user_id := public.find_user_id_by_phone(p_phone);
  SELECT COALESCE(full_name, email, 'Tenant') INTO v_tenant_name FROM public.users WHERE id = v_user_id;

  FOR v_manager_id IN
    SELECT m.user_id
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.role IN ('owner', 'manager')
    LIMIT 5
  LOOP
    INSERT INTO public.notification_logs (
      user_id,
      notification_type,
      channel,
      subject,
      content,
      notification_category,
      action_url,
      metadata,
      delivered,
      delivered_at
    ) VALUES (
      v_manager_id,
      'whatsapp_manager_escalation',
      'in_app',
      'WhatsApp support request',
      COALESCE(v_tenant_name, 'A tenant') || ': ' || COALESCE(NULLIF(trim(p_message), ''), 'Requested estate manager'),
      'Maintenance',
      '/workspace',
      jsonb_build_object('senderPhone', p_phone, 'tenantUserId', v_user_id),
      true,
      NOW()
    );
    v_notified := v_notified + 1;
  END LOOP;

  RETURN jsonb_build_object('success', v_notified > 0, 'notifiedCount', v_notified);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_phone_digits(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_id_by_phone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bot_create_whatsapp_visitor_pass(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bot_create_whatsapp_maintenance(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bot_escalate_whatsapp_to_manager(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_whatsapp_bot_context(UUID, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.bot_create_whatsapp_visitor_pass(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.bot_create_whatsapp_maintenance(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.bot_escalate_whatsapp_to_manager(UUID, TEXT, TEXT) TO service_role;
