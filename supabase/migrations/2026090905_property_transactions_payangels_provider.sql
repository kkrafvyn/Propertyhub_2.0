-- Live DB was bootstrapped from 010_paystack_property_payments; align provider CHECK with PayAngels-only code.

UPDATE public.property_transactions
SET provider = 'payangels'
WHERE provider = 'paystack';

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_provider_check;

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_provider_check
  CHECK (provider IN ('payangels'));
