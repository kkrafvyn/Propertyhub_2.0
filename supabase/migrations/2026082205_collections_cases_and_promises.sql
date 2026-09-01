-- Collections becomes a durable operational workflow instead of a list of
-- reminders. A case is unit-scoped, preserves activity history, and ties every
-- promise-to-pay to its subsequent verification result.
CREATE TABLE public.estate_collection_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE RESTRICT, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','contacted','promise_active','payment_plan','escalated','resolved','closed')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ, escalation_level INTEGER NOT NULL DEFAULT 0 CHECK(escalation_level>=0), created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(estate_id,unit_id,status) DEFERRABLE INITIALLY IMMEDIATE
);
CREATE UNIQUE INDEX estate_collection_case_open_unit ON public.estate_collection_cases(estate_id,unit_id) WHERE status NOT IN ('resolved','closed');
CREATE TABLE public.estate_promise_to_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), collection_case_id UUID NOT NULL REFERENCES public.estate_collection_cases(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0), currency TEXT NOT NULL DEFAULT 'GHS' CHECK(char_length(currency)=3), promised_for DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','fulfilled','broken','cancelled')), verified_payment_id UUID REFERENCES public.unit_payments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL, verified_at TIMESTAMPTZ, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_collection_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), collection_case_id UUID NOT NULL REFERENCES public.estate_collection_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('opened','contacted','reminder_due','promise_created','promise_fulfilled','promise_broken','escalated','resolved','note')),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, note TEXT, metadata JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX collection_cases_estate_status_idx ON public.estate_collection_cases(estate_id,status,next_follow_up_at);
CREATE INDEX collection_promises_due_idx ON public.estate_promise_to_pay(status,promised_for);
ALTER TABLE public.estate_collection_cases ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_promise_to_pay ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_collection_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate finance manages collection cases" ON public.estate_collection_cases FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance manages collection promises" ON public.estate_promise_to_pay FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_collection_cases c WHERE c.id=collection_case_id AND private.can_manage_estate_finance(c.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_collection_cases c WHERE c.id=collection_case_id AND private.can_manage_estate_finance(c.estate_id)));
CREATE POLICY "Estate finance manages collection events" ON public.estate_collection_case_events FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_collection_cases c WHERE c.id=collection_case_id AND private.can_manage_estate_finance(c.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_collection_cases c WHERE c.id=collection_case_id AND private.can_manage_estate_finance(c.estate_id)));
GRANT SELECT,INSERT,UPDATE ON public.estate_collection_cases,public.estate_promise_to_pay,public.estate_collection_case_events TO authenticated;

CREATE OR REPLACE FUNCTION public.create_collection_case(p_unit_id UUID,p_assigned_to_user_id UUID DEFAULT NULL,p_next_follow_up_at TIMESTAMPTZ DEFAULT NULL,p_note TEXT DEFAULT NULL)
RETURNS public.estate_collection_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_estate UUID; v_case public.estate_collection_cases%ROWTYPE;
BEGIN
  SELECT estate_id INTO v_estate FROM public.estate_units WHERE id=p_unit_id;
  IF v_estate IS NULL OR NOT private.can_manage_estate_finance(v_estate) THEN RAISE EXCEPTION 'Not authorised to create collection case'; END IF;
  SELECT * INTO v_case FROM public.estate_collection_cases WHERE estate_id=v_estate AND unit_id=p_unit_id AND status NOT IN ('resolved','closed') LIMIT 1;
  IF FOUND THEN RETURN v_case; END IF;
  INSERT INTO public.estate_collection_cases(estate_id,unit_id,assigned_to_user_id,next_follow_up_at,created_by) VALUES(v_estate,p_unit_id,p_assigned_to_user_id,p_next_follow_up_at,auth.uid()) RETURNING * INTO v_case;
  INSERT INTO public.estate_collection_case_events(collection_case_id,event_type,actor_user_id,note) VALUES(v_case.id,'opened',auth.uid(),p_note);
  RETURN v_case;
END; $$;
CREATE OR REPLACE FUNCTION public.verify_due_collection_promises(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE p public.estate_promise_to_pay%ROWTYPE; v_case public.estate_collection_cases%ROWTYPE; v_paid BIGINT; v_count INTEGER:=0;
BEGIN
  FOR p IN SELECT * FROM public.estate_promise_to_pay WHERE status='active' AND promised_for<=p_as_of_date FOR UPDATE SKIP LOCKED LOOP
    SELECT * INTO v_case FROM public.estate_collection_cases WHERE id=p.collection_case_id;
    SELECT COALESCE(SUM(pay.amount_minor),0) INTO v_paid FROM public.unit_payments pay WHERE pay.unit_id=v_case.unit_id AND pay.currency=p.currency AND pay.received_at::date BETWEEN p.created_at::date AND p.promised_for;
    IF v_paid>=p.amount_minor THEN UPDATE public.estate_promise_to_pay SET status='fulfilled',verified_at=NOW() WHERE id=p.id; UPDATE public.estate_collection_cases SET status='contacted',updated_at=NOW() WHERE id=v_case.id; INSERT INTO public.estate_collection_case_events(collection_case_id,event_type,note) VALUES(v_case.id,'promise_fulfilled','Promise verified against received payments');
    ELSE UPDATE public.estate_promise_to_pay SET status='broken',verified_at=NOW() WHERE id=p.id; UPDATE public.estate_collection_cases SET status='escalated',escalation_level=escalation_level+1,next_follow_up_at=NOW(),updated_at=NOW() WHERE id=v_case.id; INSERT INTO public.estate_collection_case_events(collection_case_id,event_type,note) VALUES(v_case.id,'promise_broken','Promise passed without sufficient received payment'); END IF;
    v_count:=v_count+1;
  END LOOP; RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.create_collection_case(UUID,UUID,TIMESTAMPTZ,TEXT),public.verify_due_collection_promises(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_collection_case(UUID,UUID,TIMESTAMPTZ,TEXT) TO authenticated;
