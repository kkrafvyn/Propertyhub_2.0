CREATE TABLE IF NOT EXISTS public.saas_organization_entitlements (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  limits JSONB NOT NULL DEFAULT '{}'::JSONB,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT (CURRENT_DATE + 30),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.saas_usage_counters (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period_start DATE NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, metric, period_start)
);
ALTER TABLE public.saas_organization_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members view entitlements" ON public.saas_organization_entitlements FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Organization members view usage" ON public.saas_usage_counters FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=saas_usage_counters.organization_id AND m.user_id=auth.uid()));
GRANT SELECT ON public.saas_organization_entitlements, public.saas_usage_counters TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_saas_usage(p_organization_id UUID, p_metric TEXT, p_quantity BIGINT DEFAULT 1)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_quantity BIGINT;
BEGIN
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Usage quantity must be positive'; END IF;
  INSERT INTO public.saas_usage_counters(organization_id,metric,period_start,quantity) VALUES(p_organization_id,p_metric,CURRENT_DATE,p_quantity)
  ON CONFLICT(organization_id,metric,period_start) DO UPDATE SET quantity=saas_usage_counters.quantity+EXCLUDED.quantity,updated_at=NOW()
  RETURNING quantity INTO current_quantity;
  RETURN current_quantity;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_saas_usage(UUID,TEXT,BIGINT) TO authenticated;