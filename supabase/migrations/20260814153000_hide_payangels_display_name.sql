-- Hide payment-provider brands from admin and other user-facing gateway labels.
UPDATE public.payment_gateways
SET display_name = 'Secure checkout'
WHERE display_name ILIKE '%payangel%'
   OR display_name ILIKE '%paystack%'
   OR display_name ILIKE '%stripe%';

INSERT INTO public.payment_gateways (
  gateway_key,
  display_name,
  enabled,
  fee_type,
  fee_value,
  supported_currencies,
  supported_regions,
  api_status,
  sort_order
)
VALUES (
  'payangels',
  'Secure checkout',
  TRUE,
  'percentage',
  1.5,
  ARRAY['GHS', 'NGN', 'ZAR', 'KES', 'USD'],
  ARRAY['GH', 'NG', 'ZA', 'KE', 'GLOBAL'],
  'unknown',
  1
)
ON CONFLICT (gateway_key) DO UPDATE
SET display_name = EXCLUDED.display_name;
