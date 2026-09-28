-- Guard the existing statement-delivery workflow after direct statement updates were revoked.
CREATE OR REPLACE FUNCTION public.transition_owner_statement_status(
  p_statement_id UUID,
  p_next_status TEXT
)
RETURNS public.estate_owner_statement_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statement public.estate_owner_statement_runs;
BEGIN
  SELECT * INTO v_statement
  FROM public.estate_owner_statement_runs
  WHERE id = p_statement_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.can_manage_estate_finance(v_statement.estate_id) THEN
    RAISE EXCEPTION 'Finance capability is required for statement transitions';
  END IF;
  IF p_next_status NOT IN ('queued', 'delivered', 'failed') THEN
    RAISE EXCEPTION 'Unsupported owner statement transition';
  END IF;
  IF p_next_status = 'delivered' AND v_statement.status NOT IN ('queued', 'approved') THEN
    RAISE EXCEPTION 'Only queued or approved statements can be delivered';
  END IF;

  UPDATE public.estate_owner_statement_runs
  SET status = p_next_status
  WHERE id = p_statement_id
  RETURNING * INTO v_statement;
  RETURN v_statement;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_owner_statement_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_owner_statement_status(UUID, TEXT) TO authenticated;