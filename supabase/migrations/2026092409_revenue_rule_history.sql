CREATE TABLE IF NOT EXISTS public.revenue_rule_history(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_rule_id UUID NOT NULL REFERENCES public.revenue_rules(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenue_rule_history_lookup
  ON public.revenue_rule_history(rule_key, changed_at DESC);

ALTER TABLE public.revenue_rule_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY revenue_rule_history_read ON public.revenue_rule_history
  FOR SELECT TO authenticated
  USING(public.is_platform_admin());
CREATE POLICY revenue_rule_history_service ON public.revenue_rule_history
  AS RESTRICTIVE FOR ALL TO authenticated
  USING(false) WITH CHECK(false);
GRANT SELECT ON public.revenue_rule_history TO authenticated;
GRANT ALL ON public.revenue_rule_history TO service_role;

CREATE OR REPLACE FUNCTION private.record_revenue_rule_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row JSONB; v_id UUID; v_key TEXT;
BEGIN
  v_row := to_jsonb(COALESCE(NEW, OLD));
  v_id := COALESCE(NEW.id, OLD.id);
  v_key := COALESCE(NEW.rule_key, OLD.rule_key);
  INSERT INTO public.revenue_rule_history(revenue_rule_id,rule_key,operation,snapshot,changed_by)
  VALUES(v_id,v_key,lower(TG_OP),v_row,auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS revenue_rule_history_insert ON public.revenue_rules;
DROP TRIGGER IF EXISTS revenue_rule_history_update ON public.revenue_rules;
DROP TRIGGER IF EXISTS revenue_rule_history_delete ON public.revenue_rules;
CREATE TRIGGER revenue_rule_history_insert AFTER INSERT ON public.revenue_rules
  FOR EACH ROW EXECUTE FUNCTION private.record_revenue_rule_history();
CREATE TRIGGER revenue_rule_history_update AFTER UPDATE ON public.revenue_rules
  FOR EACH ROW EXECUTE FUNCTION private.record_revenue_rule_history();
CREATE TRIGGER revenue_rule_history_delete AFTER DELETE ON public.revenue_rules
  FOR EACH ROW EXECUTE FUNCTION private.record_revenue_rule_history();

CREATE OR REPLACE FUNCTION public.preview_revenue_rule_change(
  p_rule_key TEXT,
  p_base_minor INTEGER,
  p_currency TEXT DEFAULT 'GHS',
  p_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_rule public.revenue_rules; v_amount INTEGER := 0;
BEGIN
  IF p_base_minor IS NULL OR p_base_minor < 0 OR p_base_minor > 2147483647 THEN
    RAISE EXCEPTION 'Base amount is invalid';
  END IF;
  SELECT * INTO v_rule FROM public.revenue_rules
  WHERE rule_key=p_rule_key AND currency=p_currency AND enabled
    AND (effective_from IS NULL OR effective_from<=p_at)
    AND (effective_until IS NULL OR effective_until>=p_at)
  ORDER BY effective_from DESC NULLS LAST, updated_at DESC LIMIT 1;
  IF v_rule.id IS NULL THEN
    RETURN jsonb_build_object('ruleKey',p_rule_key,'baseMinor',p_base_minor,'amountMinor',0,'matched',false,'at',p_at);
  END IF;
  v_amount := CASE v_rule.fee_type
    WHEN 'fixed' THEN COALESCE(v_rule.fee_value,0)::INTEGER
    WHEN 'percentage' THEN round(p_base_minor * COALESCE(v_rule.fee_value,0) / 100)::INTEGER
    ELSE 0
  END;
  v_amount := GREATEST(COALESCE(v_rule.min_fee,0)::INTEGER,v_amount);
  IF v_rule.max_fee IS NOT NULL THEN v_amount := LEAST(v_amount,v_rule.max_fee::INTEGER); END IF;
  RETURN jsonb_build_object('ruleKey',p_rule_key,'baseMinor',p_base_minor,'amountMinor',v_amount,'matched',true,'at',p_at,'rule',to_jsonb(v_rule));
END;
$$;
REVOKE ALL ON FUNCTION public.preview_revenue_rule_change(TEXT,INTEGER,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_revenue_rule_change(TEXT,INTEGER,TEXT,TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst,'reload schema';
