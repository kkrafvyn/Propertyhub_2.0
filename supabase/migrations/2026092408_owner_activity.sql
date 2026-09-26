-- Stable cursor ordering for the owner's current activity. Definer reads must
-- enforce agreement, organization, property and recipient scope on every source.
CREATE OR REPLACE FUNCTION public.get_owner_property_activity_page(
 p_owner_user_id UUID DEFAULT NULL,p_property_id UUID DEFAULT NULL,p_limit INTEGER DEFAULT 40,
 p_before_at TIMESTAMPTZ DEFAULT NULL,p_before_id TEXT DEFAULT NULL
)
RETURNS TABLE(id TEXT,event_type TEXT,title TEXT,detail TEXT,amount_minor BIGINT,currency TEXT,
 property_id UUID,created_at TIMESTAMPTZ,href_hint TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_owner UUID:=coalesce(p_owner_user_id,auth.uid());
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='An active authenticated account is required';
 END IF;
 IF v_owner<>auth.uid() AND NOT public.is_platform_admin() THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Not authorized';
 END IF;
 IF (p_before_at IS NULL)<>(p_before_id IS NULL) OR p_before_id='' OR NOT isfinite(p_before_at) THEN
  RAISE EXCEPTION 'A valid timestamp and event ID are required together';
 END IF;
 RETURN QUERY
 WITH owned AS (
  SELECT a.id AS agreement_id,a.property_id,a.managing_organization_id,a.permissions
  FROM public.property_management_agreements a
  WHERE a.owner_user_id=v_owner AND a.status='active'
    AND (p_property_id IS NULL OR a.property_id=p_property_id)
    AND private.owner_has_property_scope(v_owner,a.managing_organization_id,a.property_id)
 ), events AS (
  SELECT 'statement:'||s.id::text AS id,'payment'::text AS event_type,'Owner statement ready'::text AS title,
    'Period '||s.period_start::text||' to '||s.period_end::text AS detail,
    s.net_distributable_minor AS amount_minor,s.currency,o.property_id,s.created_at,'financials'::text AS href_hint
  FROM public.estate_owner_statement_runs s
  JOIN public.managed_estates e ON e.id=s.estate_id
  JOIN owned o ON o.property_id=e.property_id AND o.managing_organization_id=e.organization_id
  WHERE s.owner_user_id=v_owner AND s.status IN('approved','queued','delivered','failed')
    AND coalesce(o.permissions->>'view_financials','true')='true'
  UNION ALL
  SELECT 'issue:'||i.id::text,'maintenance',coalesce(i.title,'Maintenance issue'),
    'Status: '||coalesce(i.status,'open')||' / Priority: '||coalesce(i.priority,'normal'),
    NULL::bigint,e.currency,o.property_id,i.created_at,'maintenance'
  FROM public.estate_issues i
  JOIN public.managed_estates e ON e.id=i.estate_id
  JOIN owned o ON o.property_id=e.property_id AND o.managing_organization_id=e.organization_id
  WHERE coalesce(o.permissions->>'view_maintenance','true')='true'
  UNION ALL
  SELECT 'wo:'||w.id::text,'contractor','Work order update',
    'Status: '||w.status||coalesce(' / '||left(w.notes,120),''),
    coalesce(w.actual_cost_minor,w.estimated_cost_minor),e.currency,o.property_id,
    coalesce(w.updated_at,w.created_at),'maintenance'
  FROM public.estate_work_orders w
  JOIN public.managed_estates e ON e.id=w.estate_id
  JOIN owned o ON o.property_id=e.property_id AND o.managing_organization_id=e.organization_id
  WHERE coalesce(o.permissions->>'view_maintenance','true')='true'
  UNION ALL
  SELECT 'approval:'||x.id::text,'expense',x.title,coalesce(x.description,x.status),
    x.amount_minor,x.currency,o.property_id,x.created_at,'approvals'
  FROM public.owner_expense_approvals x
  JOIN owned o ON o.agreement_id=x.agreement_id AND o.managing_organization_id=x.organization_id
    AND (x.property_id IS NULL OR x.property_id=o.property_id)
  WHERE x.owner_user_id=v_owner AND coalesce(o.permissions->>'approve_expenses','true')='true'
 )
 SELECT e.* FROM events e
 WHERE e.created_at IS NOT NULL AND (p_before_at IS NULL OR (e.created_at,e.id)<(p_before_at,p_before_id))
 ORDER BY e.created_at DESC,e.id DESC
 LIMIT greatest(1,least(coalesce(p_limit,40),101));
END; $$;
REVOKE ALL ON FUNCTION public.get_owner_property_activity_page(UUID,UUID,INTEGER,TIMESTAMPTZ,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_owner_property_activity_page(UUID,UUID,INTEGER,TIMESTAMPTZ,TEXT) TO authenticated;

-- Existing clients receive the same corrected boundary checks.
CREATE OR REPLACE FUNCTION public.get_owner_property_activity(
 p_owner_user_id UUID DEFAULT NULL,p_property_id UUID DEFAULT NULL,p_limit INTEGER DEFAULT 40
)
RETURNS TABLE(id TEXT,event_type TEXT,title TEXT,detail TEXT,amount_minor BIGINT,currency TEXT,
 property_id UUID,created_at TIMESTAMPTZ,href_hint TEXT)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT * FROM public.get_owner_property_activity_page(p_owner_user_id,p_property_id,p_limit,NULL,NULL);
$$;
REVOKE ALL ON FUNCTION public.get_owner_property_activity(UUID,UUID,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_owner_property_activity(UUID,UUID,INTEGER) TO authenticated;
NOTIFY pgrst,'reload schema';
