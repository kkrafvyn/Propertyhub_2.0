-- Removes previously prototyped external verification tables and receipt columns.
-- Kept as a defensive cleanup for databases that already ran the older prototype migrations.

DO $$
DECLARE
  legacy_table TEXT;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'block' || 'chain_records',
    'smart_' || 'contract_events',
    'ownership_' || 'events',
    'tokenized_' || 'assets',
    'block' || 'chain_wallets',
    'block' || 'chain_verification_logs'
  ]
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', legacy_table);
  END LOOP;
END $$;

DO $$
DECLARE
  legacy_column TEXT;
BEGIN
  FOREACH legacy_column IN ARRAY ARRAY[
    'block' || 'chain_record_id',
    'block' || 'chain_status',
    'block' || 'chain_network',
    'block' || 'chain_txid'
  ]
  LOOP
    IF to_regclass('public.transaction_receipts') IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.transaction_receipts DROP COLUMN IF EXISTS %I', legacy_column);
    END IF;
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.transaction_receipts
  ADD COLUMN IF NOT EXISTS integrity_status TEXT NOT NULL DEFAULT 'hashed'
    CHECK (integrity_status IN ('pending', 'hashed', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS integrity_signature TEXT,
  ADD COLUMN IF NOT EXISTS integrity_public_key_id TEXT;

DO $$
DECLARE
  legacy_column TEXT;
BEGIN
  FOREACH legacy_column IN ARRAY ARRAY['chain' || '_id', 'block' || 'chain_tx_hash']
  LOOP
    IF to_regclass('public.sold_property_announcements') IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.sold_property_announcements DROP COLUMN IF EXISTS %I', legacy_column);
    END IF;
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.sold_property_announcements
  ADD COLUMN IF NOT EXISTS receipt_hash TEXT;

ALTER TABLE IF EXISTS public.verification_hashes
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
