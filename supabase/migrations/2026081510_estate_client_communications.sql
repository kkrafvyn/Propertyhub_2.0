-- Estate-wide communication hub. Delivery rows are queued here; external channels
-- must only be marked sent/delivered by a confirmed provider callback.
ALTER TABLE public.estate_notices DROP CONSTRAINT IF EXISTS estate_notices_channels_check;
ALTER TABLE public.estate_notices ADD CONSTRAINT estate_notices_channels_check
  CHECK (channels <@ ARRAY['sms', 'email', 'in_app', 'whatsapp', 'push']::TEXT[]);
ALTER TABLE public.estate_notice_deliveries DROP CONSTRAINT IF EXISTS estate_notice_deliveries_channel_check;
ALTER TABLE public.estate_notice_deliveries ADD CONSTRAINT estate_notice_deliveries_channel_check
  CHECK (channel IN ('sms', 'email', 'in_app', 'whatsapp', 'push'));

CREATE OR REPLACE FUNCTION public.send_estate_notice(
  p_estate_id UUID,
  p_subject TEXT,
  p_body TEXT,
  p_channels TEXT[],
  p_audience_role TEXT,
  p_sent_by UUID
)
RETURNS public.estate_notices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE notice_row public.estate_notices;
BEGIN
  IF NOT private.is_estate_staff(p_estate_id) THEN RAISE EXCEPTION 'Not authorised to send estate notices'; END IF;
  IF length(trim(COALESCE(p_subject, ''))) = 0 OR length(trim(COALESCE(p_body, ''))) = 0 THEN RAISE EXCEPTION 'Subject and message are required'; END IF;
  IF COALESCE(array_length(p_channels, 1), 0) = 0 OR NOT (p_channels <@ ARRAY['sms', 'email', 'in_app', 'whatsapp', 'push']::TEXT[]) THEN RAISE EXCEPTION 'Select valid delivery channels'; END IF;
  IF p_audience_role NOT IN ('all', 'owner', 'tenant', 'buyer') THEN RAISE EXCEPTION 'Invalid recipient audience'; END IF;
  INSERT INTO public.estate_notices (estate_id, audience_json, subject, body, channels, sent_by_user_id, sent_at)
  VALUES (p_estate_id, jsonb_build_object('role', p_audience_role), p_subject, p_body, p_channels, p_sent_by, NOW()) RETURNING * INTO notice_row;
  INSERT INTO public.estate_notice_deliveries (notice_id, user_id, channel, status)
  SELECT notice_row.id, occupancy.user_id, channel_name, 'queued'
  FROM public.unit_occupancies occupancy
  JOIN public.estate_units unit ON unit.id = occupancy.unit_id
  CROSS JOIN unnest(p_channels) AS channel_name
  WHERE unit.estate_id = p_estate_id AND occupancy.end_date IS NULL
    AND (p_audience_role = 'all' OR occupancy.role = p_audience_role)
  ON CONFLICT (notice_id, user_id, channel) DO NOTHING;
  RETURN notice_row;
END;
$$;
REVOKE ALL ON FUNCTION public.send_estate_notice(UUID, TEXT, TEXT, TEXT[], TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_estate_notice(UUID, TEXT, TEXT, TEXT[], TEXT, UUID) TO authenticated;
