-- Occupancy lifecycle: a unit keeps its history while residents change.
CREATE TABLE public.estate_move_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occupancy_id UUID NOT NULL REFERENCES public.unit_occupancies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('move_in', 'move_out', 'renewal', 'handover')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meter_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX estate_move_events_occupancy_idx ON public.estate_move_events(occupancy_id, occurred_at DESC);
ALTER TABLE public.estate_move_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate staff manage move events" ON public.estate_move_events FOR ALL USING (EXISTS (SELECT 1 FROM public.unit_occupancies o JOIN public.estate_units u ON u.id=o.unit_id WHERE o.id=estate_move_events.occupancy_id AND private.is_estate_staff(u.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.unit_occupancies o JOIN public.estate_units u ON u.id=o.unit_id WHERE o.id=estate_move_events.occupancy_id AND private.is_estate_staff(u.estate_id)));
CREATE POLICY "Residents view own move events" ON public.estate_move_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.unit_occupancies o WHERE o.id=estate_move_events.occupancy_id AND o.user_id=auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.estate_move_events TO authenticated;
