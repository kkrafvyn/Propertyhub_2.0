-- International expansion: org jurisdiction settings, regional tax profiles, revenue rule scoping

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_jurisdiction TEXT DEFAULT 'GH'
    CHECK (default_jurisdiction IN ('GH','NG','KE','ZA','US','GB','EU','AE','CA','AU','IN','GLOBAL'));

CREATE TABLE IF NOT EXISTS public.organization_country_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_jurisdiction TEXT NOT NULL DEFAULT 'GH'
    CHECK (default_jurisdiction IN ('GH','NG','KE','ZA','US','GB','EU','AE','CA','AU','IN','GLOBAL')),
  default_subdivision TEXT,
  default_currency TEXT CHECK (default_currency IS NULL OR char_length(default_currency) = 3),
  enabled_jurisdictions TEXT[] NOT NULL DEFAULT ARRAY['GH']::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jurisdiction_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id TEXT NOT NULL
    CHECK (jurisdiction_id IN ('GH','NG','KE','ZA','US','GB','EU','AE','CA','AU','IN','GLOBAL')),
  tax_component_id TEXT NOT NULL,
  label TEXT NOT NULL,
  rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (rate_basis_points BETWEEN 0 AND 10000),
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  authority TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (jurisdiction_id, tax_component_id)
);

ALTER TABLE public.revenue_rules
  ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT DEFAULT 'GLOBAL'
    CHECK (jurisdiction_id IN ('GH','NG','KE','ZA','US','GB','EU','AE','CA','AU','IN','GLOBAL'));

CREATE INDEX IF NOT EXISTS revenue_rules_jurisdiction_idx ON public.revenue_rules(jurisdiction_id, rule_key);

-- Seed jurisdiction tax profiles (mirrors country-rules packs)
INSERT INTO public.jurisdiction_tax_profiles (jurisdiction_id, tax_component_id, label, rate_basis_points, applies_to, authority, notes) VALUES
  ('GH', 'vat', 'VAT', 1500, ARRAY['service_fee','short_stay'], 'GRA', NULL),
  ('GH', 'nhil', 'NHIL', 250, ARRAY['service_fee'], 'GRA', NULL),
  ('GH', 'getfund', 'GETFund Levy', 250, ARRAY['service_fee'], 'GRA', NULL),
  ('GH', 'withholding_rent', 'Rent withholding', 800, ARRAY['rent'], 'GRA', '8% non-resident landlords'),
  ('NG', 'vat', 'VAT', 750, ARRAY['service_fee','rent','short_stay'], 'FIRS', NULL),
  ('NG', 'withholding_rent', 'WHT on rent', 1000, ARRAY['rent'], 'FIRS', NULL),
  ('KE', 'vat', 'VAT', 1600, ARRAY['service_fee','short_stay'], 'KRA', NULL),
  ('KE', 'withholding_rent', 'Residential rent WHT', 750, ARRAY['rent'], 'KRA', NULL),
  ('ZA', 'vat', 'VAT', 1500, ARRAY['service_fee','short_stay'], 'SARS', NULL),
  ('US', 'withholding_contractor', '1099-NEC reporting', 0, ARRAY['contractor'], 'IRS', 'Report if ≥ $600'),
  ('GB', 'vat', 'VAT', 2000, ARRAY['service_fee','short_stay'], 'HMRC', 'Residential rent generally exempt'),
  ('EU', 'vat', 'VAT (member state)', 2000, ARRAY['service_fee','short_stay'], 'National', 'MOSS/OSS may apply'),
  ('AE', 'vat', 'VAT', 500, ARRAY['service_fee','short_stay'], 'FTA', NULL),
  ('CA', 'gst', 'GST/HST', 500, ARRAY['service_fee','short_stay'], 'CRA', 'Provincial HST varies'),
  ('AU', 'gst', 'GST', 1000, ARRAY['service_fee','short_stay'], 'ATO', 'Residential rent GST-free'),
  ('IN', 'gst', 'GST', 1800, ARRAY['service_fee','short_stay'], 'CBIC', NULL),
  ('IN', 'withholding_rent', 'TDS on rent', 1000, ARRAY['rent'], 'CBDT', 'Section 194-I thresholds apply')
ON CONFLICT (jurisdiction_id, tax_component_id) DO UPDATE SET
  label = EXCLUDED.label,
  rate_basis_points = EXCLUDED.rate_basis_points,
  applies_to = EXCLUDED.applies_to,
  authority = EXCLUDED.authority,
  notes = EXCLUDED.notes;

ALTER TABLE public.organization_country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage country settings" ON public.organization_country_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_country_settings.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_country_settings.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Anyone read tax profiles" ON public.jurisdiction_tax_profiles FOR SELECT USING (active = TRUE);

GRANT SELECT ON public.jurisdiction_tax_profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.organization_country_settings TO authenticated;
