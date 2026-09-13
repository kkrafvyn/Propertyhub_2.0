-- Master toggles for marketplace fees and checkout taxes (admin + org overridable).

INSERT INTO public.platform_settings (key, value, description) VALUES
  (
    'platform_fees_enabled',
    'true',
    'Master switch: when false, BaytMiftah platform/service fees are not charged or withheld'
  ),
  (
    'checkout_taxes_enabled',
    'true',
    'Master switch: when false, checkout does not add/show statutory tax estimates (VAT/NHIL/GETFund, rent WHT, etc.)'
  )
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

ALTER TABLE public.organization_country_settings
  ADD COLUMN IF NOT EXISTS collect_platform_fees BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS collect_checkout_taxes BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.organization_country_settings.collect_platform_fees IS
  'When false, this org/workspace does not apply BaytMiftah platform fees (even if platform master is on).';
COMMENT ON COLUMN public.organization_country_settings.collect_checkout_taxes IS
  'When false, this org does not show/collect checkout tax estimates (for operators not authorized to add tax).';
