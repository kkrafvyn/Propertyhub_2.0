-- Remove Stripe from integration catalog surfaced to workspaces (PayAngels is the payment rail).
UPDATE public.integration_catalog
SET is_active = FALSE
WHERE slug = 'stripe-ach'
   OR name ILIKE '%stripe%';
