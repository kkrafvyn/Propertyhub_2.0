-- Owner-operator, reporting, operational incident and automation foundations.
-- Provider delivery remains queued until a configured provider confirms receipt.
CREATE TABLE public.estate_property_management_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL UNIQUE REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  management_mode TEXT NOT NULL CHECK(management_mode IN ('self_managed','company_managed','hybrid')),
  managing_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_owner_statement_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, period_start DATE NOT NULL, period_end DATE NOT NULL, currency TEXT NOT NULL DEFAULT 'GHS',
  gross_collections_minor BIGINT NOT NULL DEFAULT 0, expense_minor BIGINT NOT NULL DEFAULT 0, net_distributable_minor BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','queued','delivered','failed')), approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id,owner_user_id,period_start,period_end)
);
CREATE TABLE public.estate_owner_statement_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), statement_run_id UUID NOT NULL REFERENCES public.estate_owner_statement_runs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('in_app','email','sms','whatsapp')), status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','delivered','failed')),
  provider_reference TEXT, error_message TEXT, queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), delivered_at TIMESTAMPTZ
);
CREATE TABLE public.estate_root_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  title TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'investigating' CHECK(status IN ('investigating','mitigating','resolved','closed')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.estate_issues ADD COLUMN IF NOT EXISTS root_incident_id UUID REFERENCES public.estate_root_incidents(id) ON DELETE SET NULL;
CREATE TABLE public.estate_automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID, payload JSONB NOT NULL DEFAULT '{}'::JSONB, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE TABLE public.estate_ai_watch_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')), title TEXT NOT NULL, evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','approved','dismissed','resolved')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX owner_statement_runs_estate_idx ON public.estate_owner_statement_runs(estate_id,period_end DESC);
CREATE INDEX automation_events_due_idx ON public.estate_automation_events(status,next_attempt_at);
CREATE INDEX ai_watch_alerts_org_idx ON public.estate_ai_watch_alerts(organization_id,status,created_at DESC);
ALTER TABLE public.estate_property_management_modes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_owner_statement_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_owner_statement_deliveries ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_root_incidents ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_automation_events ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_ai_watch_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and staff view management mode" ON public.estate_property_management_modes FOR SELECT USING(owner_user_id=auth.uid() OR private.is_estate_staff(estate_id));
CREATE POLICY "Owners and staff manage management mode" ON public.estate_property_management_modes FOR ALL USING(owner_user_id=auth.uid() OR private.is_estate_staff(estate_id)) WITH CHECK(owner_user_id=auth.uid() OR private.is_estate_staff(estate_id));
CREATE POLICY "Owners and finance view owner statements" ON public.estate_owner_statement_runs FOR SELECT USING(owner_user_id=auth.uid() OR private.can_manage_estate_finance(estate_id));
CREATE POLICY "Finance manages owner statements" ON public.estate_owner_statement_runs FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Statement delivery access" ON public.estate_owner_statement_deliveries FOR SELECT USING(EXISTS(SELECT 1 FROM public.estate_owner_statement_runs s WHERE s.id=statement_run_id AND (s.owner_user_id=auth.uid() OR private.can_manage_estate_finance(s.estate_id))));
CREATE POLICY "Finance manages statement delivery" ON public.estate_owner_statement_deliveries FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_owner_statement_runs s WHERE s.id=statement_run_id AND private.can_manage_estate_finance(s.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_owner_statement_runs s WHERE s.id=statement_run_id AND private.can_manage_estate_finance(s.estate_id)));
CREATE POLICY "Staff manages root incidents" ON public.estate_root_incidents FOR ALL USING(private.is_estate_staff(estate_id)) WITH CHECK(private.is_estate_staff(estate_id));
CREATE POLICY "Members access automation events" ON public.estate_automation_events FOR ALL USING(EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Members access AI alerts" ON public.estate_ai_watch_alerts FOR ALL USING(EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE ON public.estate_property_management_modes,public.estate_owner_statement_runs,public.estate_owner_statement_deliveries,public.estate_root_incidents,public.estate_automation_events,public.estate_ai_watch_alerts TO authenticated;

CREATE OR REPLACE FUNCTION public.create_owner_statement_run(p_estate_id UUID,p_owner_user_id UUID,p_period_start DATE,p_period_end DATE)
RETURNS public.estate_owner_statement_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_gross BIGINT; v_expenses BIGINT; v_currency TEXT; v_statement public.estate_owner_statement_runs%ROWTYPE;
BEGIN
 IF NOT private.can_manage_estate_finance(p_estate_id) THEN RAISE EXCEPTION 'Not authorised to create owner statements'; END IF;
 SELECT currency INTO v_currency FROM public.managed_estates WHERE id=p_estate_id;
 SELECT COALESCE(SUM(a.amount_minor),0) INTO v_gross FROM public.payment_allocations a JOIN public.unit_payments p ON p.id=a.payment_id JOIN public.unit_charges c ON c.id=a.charge_id JOIN public.estate_units u ON u.id=c.unit_id JOIN public.unit_occupancies o ON o.unit_id=u.id WHERE u.estate_id=p_estate_id AND o.user_id=p_owner_user_id AND o.role='owner' AND p.received_at::date BETWEEN p_period_start AND p_period_end;
 SELECT COALESCE(SUM(b.amount_minor),0) INTO v_expenses FROM public.estate_vendor_bills b WHERE b.estate_id=p_estate_id AND b.status='paid' AND b.paid_at::date BETWEEN p_period_start AND p_period_end;
 INSERT INTO public.estate_owner_statement_runs(estate_id,owner_user_id,period_start,period_end,currency,gross_collections_minor,expense_minor,net_distributable_minor) VALUES(p_estate_id,p_owner_user_id,p_period_start,p_period_end,v_currency,v_gross,v_expenses,v_gross-v_expenses) ON CONFLICT(estate_id,owner_user_id,period_start,period_end) DO UPDATE SET gross_collections_minor=EXCLUDED.gross_collections_minor,expense_minor=EXCLUDED.expense_minor,net_distributable_minor=EXCLUDED.net_distributable_minor RETURNING * INTO v_statement;
 RETURN v_statement;
END; $$;
CREATE OR REPLACE FUNCTION public.estate_income_statement(p_estate_id UUID,p_start_date DATE,p_end_date DATE)
RETURNS TABLE(total_revenue_minor BIGINT,total_expense_minor BIGINT,net_income_minor BIGINT,currency TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,private AS $$
 SELECT COALESCE((SELECT SUM(a.amount_minor) FROM public.payment_allocations a JOIN public.unit_payments p ON p.id=a.payment_id JOIN public.unit_charges c ON c.id=a.charge_id JOIN public.estate_units u ON u.id=c.unit_id WHERE u.estate_id=p_estate_id AND p.received_at::date BETWEEN p_start_date AND p_end_date),0)::BIGINT,COALESCE((SELECT SUM(amount_minor) FROM public.estate_vendor_bills WHERE estate_id=p_estate_id AND status='paid' AND paid_at::date BETWEEN p_start_date AND p_end_date),0)::BIGINT,COALESCE((SELECT SUM(a.amount_minor) FROM public.payment_allocations a JOIN public.unit_payments p ON p.id=a.payment_id JOIN public.unit_charges c ON c.id=a.charge_id JOIN public.estate_units u ON u.id=c.unit_id WHERE u.estate_id=p_estate_id AND p.received_at::date BETWEEN p_start_date AND p_end_date),0)::BIGINT-COALESCE((SELECT SUM(amount_minor) FROM public.estate_vendor_bills WHERE estate_id=p_estate_id AND status='paid' AND paid_at::date BETWEEN p_start_date AND p_end_date),0)::BIGINT,(SELECT currency FROM public.managed_estates WHERE id=p_estate_id); $$;
REVOKE ALL ON FUNCTION public.create_owner_statement_run(UUID,UUID,DATE,DATE),public.estate_income_statement(UUID,DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owner_statement_run(UUID,UUID,DATE,DATE),public.estate_income_statement(UUID,DATE,DATE) TO authenticated;
