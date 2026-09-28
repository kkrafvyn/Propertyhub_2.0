-- AI evidence is immutable after creation; approval transitions require explicit capability.
CREATE OR REPLACE FUNCTION public.guard_ai_alert_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF current_user NOT IN ('postgres', 'service_role') AND (
      NEW.agent_name IS DISTINCT FROM OLD.agent_name
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.severity IS DISTINCT FROM OLD.severity
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.evidence IS DISTINCT FROM OLD.evidence
      OR NEW.approval_required IS DISTINCT FROM OLD.approval_required
    ) THEN
      RAISE EXCEPTION 'AI alert evidence is immutable';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      AND current_user NOT IN ('postgres', 'service_role')
      AND NOT private.org_member_has_permission(OLD.organization_id, 'ai:approve_action') THEN
      RAISE EXCEPTION 'AI action approval capability is required';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ai_alert_integrity ON public.estate_ai_watch_alerts;
CREATE TRIGGER trg_guard_ai_alert_integrity
BEFORE UPDATE ON public.estate_ai_watch_alerts
FOR EACH ROW
EXECUTE FUNCTION public.guard_ai_alert_integrity();

-- Interactive producers may enqueue only explicitly permitted event types; workers own execution metadata.
CREATE OR REPLACE FUNCTION public.guard_automation_event_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND current_user NOT IN ('postgres', 'service_role') THEN
    IF NEW.event_type IS NULL OR btrim(NEW.event_type) = '' OR jsonb_typeof(NEW.payload) <> 'object' THEN
      RAISE EXCEPTION 'Automation events require a valid type and object payload';
    END IF;
    IF NEW.event_type = 'resident_broadcast'
      AND NOT private.org_member_has_permission(NEW.organization_id, 'communications:broadcast') THEN
      RAISE EXCEPTION 'Broadcast capability is required for resident broadcasts';
    END IF;
    IF NOT private.org_member_has_permission(NEW.organization_id, 'automation:enqueue')
      AND NOT private.is_org_admin(NEW.organization_id) THEN
      RAISE EXCEPTION 'Automation enqueue capability is required';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_automation_event_input ON public.estate_automation_events;
CREATE TRIGGER trg_guard_automation_event_input
BEFORE INSERT ON public.estate_automation_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_automation_event_input();
