-- SLA rules keep estate issue response predictable and make breaches visible.

CREATE TABLE public.estate_issue_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_minutes INTEGER NOT NULL CHECK (target_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, priority)
);

CREATE OR REPLACE FUNCTION public.set_estate_issue_sla_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  target_minutes_value INTEGER;
BEGIN
  IF NEW.sla_target_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT target_minutes INTO target_minutes_value
  FROM public.estate_issue_sla_policies
  WHERE estate_id = NEW.estate_id AND priority = NEW.priority;
  target_minutes_value := COALESCE(target_minutes_value, CASE NEW.priority
    WHEN 'urgent' THEN 240
    WHEN 'high' THEN 1440
    WHEN 'normal' THEN 4320
    ELSE 10080
  END);
  NEW.sla_target_at := NEW.created_at + make_interval(mins => target_minutes_value);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_estate_issue_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.estate_issue_events (issue_id, event_type, payload_json)
    VALUES (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER estate_issue_set_sla_target
BEFORE INSERT ON public.estate_issues
FOR EACH ROW EXECUTE FUNCTION public.set_estate_issue_sla_target();

CREATE TRIGGER estate_issue_status_audit
AFTER UPDATE ON public.estate_issues
FOR EACH ROW EXECUTE FUNCTION public.log_estate_issue_status_change();

ALTER TABLE public.estate_issue_sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate staff can view SLA policies" ON public.estate_issue_sla_policies FOR SELECT USING (private.is_estate_staff(estate_id));
CREATE POLICY "Estate managers can manage SLA policies" ON public.estate_issue_sla_policies FOR ALL USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estate_issue_sla_policies TO authenticated;
