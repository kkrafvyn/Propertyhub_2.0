-- Enterprise property-operations backbone: assets, metering, procurement, budgets and contracts.
CREATE TABLE public.estate_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, asset_type TEXT NOT NULL, location TEXT, serial_number TEXT, condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','poor','out_of_service')),
  warranty_expires_on DATE, replacement_cost_minor BIGINT, currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE, unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('water','electricity','generator','solar','gas','other')), identifier TEXT NOT NULL, unit_of_measure TEXT NOT NULL DEFAULT 'kWh', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id, identifier)
);
CREATE TABLE public.estate_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), meter_id UUID NOT NULL REFERENCES public.estate_meters(id) ON DELETE CASCADE, reading_value NUMERIC(18,3) NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','estimated','iot')), evidence_path TEXT, recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE, category TEXT NOT NULL, period TEXT NOT NULL, budget_minor BIGINT NOT NULL CHECK (budget_minor >= 0), actual_minor BIGINT NOT NULL DEFAULT 0 CHECK (actual_minor >= 0), currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3), created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id, category, period)
);
CREATE TABLE public.estate_procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE, asset_id UUID REFERENCES public.estate_assets(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT, amount_minor BIGINT, currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3), status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','ordered','received','invoiced','paid','rejected','cancelled')), requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL, approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE, vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  contract_type TEXT NOT NULL, title TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE, notice_days INTEGER NOT NULL DEFAULT 30 CHECK (notice_days >= 0), value_minor BIGINT, currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3), document_path TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated')), owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX estate_assets_estate_idx ON public.estate_assets(estate_id, active);
CREATE INDEX estate_meters_estate_idx ON public.estate_meters(estate_id, active);
CREATE INDEX estate_meter_readings_meter_idx ON public.estate_meter_readings(meter_id, read_at DESC);
CREATE INDEX estate_procurement_estate_idx ON public.estate_procurement_requests(estate_id, status);
CREATE INDEX estate_contracts_estate_idx ON public.estate_contracts(estate_id, end_date);
ALTER TABLE public.estate_assets ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_meters ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_meter_readings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_budgets ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_procurement_requests ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate staff manage assets" ON public.estate_assets FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Estate staff manage meters" ON public.estate_meters FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Estate staff manage meter readings" ON public.estate_meter_readings FOR ALL USING (EXISTS(SELECT 1 FROM public.estate_meters m WHERE m.id=meter_id AND private.is_estate_staff(m.estate_id))) WITH CHECK (EXISTS(SELECT 1 FROM public.estate_meters m WHERE m.id=meter_id AND private.is_estate_staff(m.estate_id)));
CREATE POLICY "Estate finance manages budgets" ON public.estate_budgets FOR ALL USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate staff manage procurement" ON public.estate_procurement_requests FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Estate staff manage contracts" ON public.estate_contracts FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
GRANT SELECT, INSERT, UPDATE ON public.estate_assets, public.estate_meters, public.estate_meter_readings, public.estate_budgets, public.estate_procurement_requests, public.estate_contracts TO authenticated;
