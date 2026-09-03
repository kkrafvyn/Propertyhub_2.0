-- PayAngels is the worldwide primary payment rail for BaytMiftah international expansion.

UPDATE public.integration_catalog
SET
  name = 'PayAngels',
  category = 'payments',
  description = 'Worldwide payment collection, escrow, and disbursements — primary rail for all BaytMiftah markets.',
  supported_regions = ARRAY['global'],
  requires_credentials = TRUE,
  sort_order = 1
WHERE slug = 'payangels';

-- Deprioritize Stripe ACH to optional/legacy in catalog ordering
UPDATE public.integration_catalog
SET sort_order = 90, description = 'Optional legacy US ACH — PayAngels is the primary worldwide rail.'
WHERE slug = 'stripe-ach';
