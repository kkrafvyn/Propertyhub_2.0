CREATE OR REPLACE FUNCTION private.validate_revenue_rule_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.effective_from IS NOT NULL AND NEW.effective_until IS NOT NULL
    AND NEW.effective_until < NEW.effective_from THEN
    RAISE EXCEPTION 'Revenue rule effective_until must be on or after effective_from';
  END IF;
  IF NEW.min_fee IS NOT NULL AND NEW.max_fee IS NOT NULL AND NEW.max_fee < NEW.min_fee THEN
    RAISE EXCEPTION 'Revenue rule max_fee must be on or after min_fee';
  END IF;
  IF NEW.fee_type IN ('fixed','percentage') AND COALESCE(NEW.fee_value,0) < 0 THEN
    RAISE EXCEPTION 'Revenue rule fee_value cannot be negative';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.revenue_rules existing
    WHERE existing.id <> NEW.id
      AND existing.rule_key = NEW.rule_key
      AND existing.currency = NEW.currency
      AND existing.jurisdiction_id IS NOT DISTINCT FROM NEW.jurisdiction_id
      AND tstzrange(existing.effective_from, existing.effective_until, '[]')
          && tstzrange(NEW.effective_from, NEW.effective_until, '[]')
  ) THEN
    RAISE EXCEPTION 'Revenue rule effective period overlaps an existing rule for this key, currency, and jurisdiction';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_revenue_rule_integrity ON public.revenue_rules;
CREATE TRIGGER validate_revenue_rule_integrity
  BEFORE INSERT OR UPDATE ON public.revenue_rules
  FOR EACH ROW EXECUTE FUNCTION private.validate_revenue_rule_integrity();
REVOKE ALL ON FUNCTION private.validate_revenue_rule_integrity() FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
