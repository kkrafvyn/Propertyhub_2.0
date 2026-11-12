-- Rename legacy Paystack-era refund payload column to provider-neutral name.
-- PayAngels is the sole payment rail; column stores raw provider JSON.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_refunds'
      AND column_name = 'paystack_response'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_refunds'
      AND column_name = 'provider_response'
  ) THEN
    ALTER TABLE public.property_refunds
      RENAME COLUMN paystack_response TO provider_response;
  END IF;
END $$;
