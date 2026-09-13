-- Fix ensure_default_workspace_channels participant column name.

CREATE OR REPLACE FUNCTION public.ensure_default_workspace_channels(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_name TEXT;
  v_desc TEXT;
  v_conversation_id UUID;
  v_defaults TEXT[][] := ARRAY[
    ARRAY['general', 'General', 'Company-wide updates and coordination'],
    ARRAY['maintenance', 'Maintenance', 'Work orders, inspections, and field updates'],
    ARRAY['listings', 'Listings', 'Inventory, marketing, and leasing discussion']
  ];
  v_row TEXT[];
BEGIN
  FOREACH v_row SLICE 1 IN ARRAY v_defaults LOOP
    v_slug := v_row[1];
    v_name := v_row[2];
    v_desc := v_row[3];

    IF EXISTS (
      SELECT 1 FROM public.workspace_channels
      WHERE organization_id = p_organization_id AND slug = v_slug
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.conversations (conversation_type, organization_id)
    VALUES ('channel', p_organization_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.workspace_channels (
      organization_id, conversation_id, slug, name, description, is_private, created_by
    ) VALUES (
      p_organization_id, v_conversation_id, v_slug, v_name, v_desc, FALSE, auth.uid()
    );

    INSERT INTO public.conversation_participants (conversation_id, user_id, participant_role)
    SELECT v_conversation_id, m.user_id, 'member'
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
