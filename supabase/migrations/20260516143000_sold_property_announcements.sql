-- Public sold-property announcement feed.
-- Keeps private payment details in property_transactions while publishing a
-- privacy-safe sale event with a hashed buyer identity and receipt hash proof.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.sold_property_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.property_transactions(id) ON DELETE CASCADE,
  property_label TEXT NOT NULL,
  city TEXT,
  region TEXT,
  listing_type TEXT NOT NULL DEFAULT 'sale',
  sold_amount_minor BIGINT,
  currency TEXT NOT NULL DEFAULT 'GHS',
  buyer_hash TEXT NOT NULL,
  receipt_hash TEXT,
  verification_url TEXT,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sold_property_announcements_announced_at
ON public.sold_property_announcements(announced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sold_property_announcements_listing
ON public.sold_property_announcements(listing_id);

CREATE INDEX IF NOT EXISTS idx_sold_property_announcements_city
ON public.sold_property_announcements(city, region, announced_at DESC);

ALTER TABLE public.sold_property_announcements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.sold_property_announcements TO anon, authenticated;

DROP POLICY IF EXISTS "Sold announcements are public" ON public.sold_property_announcements;
CREATE POLICY "Sold announcements are public"
ON public.sold_property_announcements FOR SELECT
USING (TRUE);

CREATE OR REPLACE FUNCTION public.handle_successful_property_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  listing_record RECORD;
  property_record RECORD;
  organization_name TEXT;
  receipt_hash_value TEXT;
  receipt_verification_url TEXT;
  receipt_integrity_status TEXT;
  sale_finalized BOOLEAN;
  buyer_digest TEXT;
  reference_digest TEXT;
BEGIN
  IF NEW.status <> 'success' THEN
    RETURN NEW;
  END IF;

  SELECT
    listings.id,
    listings.listing_type,
    listings.status,
    listings.price,
    listings.currency,
    listings.organization_id,
    listings.property_id
  INTO listing_record
  FROM public.listings
  WHERE listings.id = NEW.listing_id;

  IF NOT FOUND OR listing_record.listing_type <> 'sale' THEN
    RETURN NEW;
  END IF;

  sale_finalized :=
    NEW.purpose = 'purchase_installment'
    OR lower(coalesce(NEW.metadata->>'sale_finalized', '')) IN ('true', '1', 'yes', 'final', 'finalized', 'sold');

  IF NOT sale_finalized THEN
    RETURN NEW;
  END IF;

  SELECT
    properties.address,
    properties.city,
    properties.region
  INTO property_record
  FROM public.properties
  WHERE properties.id = NEW.property_id;

  SELECT organizations.name
  INTO organization_name
  FROM public.organizations
  WHERE organizations.id = NEW.organization_id;

  SELECT
    transaction_receipts.receipt_sha256,
    transaction_receipts.verification_url,
    transaction_receipts.integrity_status
  INTO receipt_hash_value, receipt_verification_url, receipt_integrity_status
  FROM public.transaction_receipts
  WHERE transaction_receipts.transaction_id = NEW.id
  ORDER BY transaction_receipts.updated_at DESC
  LIMIT 1;

  buyer_digest :=
    '0x' || left(encode(extensions.digest(NEW.payer_user_id::TEXT || ':' || NEW.id::TEXT, 'sha256'), 'hex'), 40);
  reference_digest :=
    '0x' || left(encode(extensions.digest(NEW.provider_reference, 'sha256'), 'hex'), 24);

  INSERT INTO public.sold_property_announcements (
    listing_id,
    property_id,
    organization_id,
    transaction_id,
    property_label,
    city,
    region,
    listing_type,
    sold_amount_minor,
    currency,
    buyer_hash,
    receipt_hash,
    verification_url,
    announced_at,
    metadata
  )
  VALUES (
    NEW.listing_id,
    NEW.property_id,
    NEW.organization_id,
    NEW.id,
    coalesce(property_record.address, 'Sold property'),
    property_record.city,
    property_record.region,
    listing_record.listing_type,
    NEW.amount_minor,
    NEW.currency,
    buyer_digest,
    receipt_hash_value,
    receipt_verification_url,
    coalesce(NEW.paid_at, NOW()),
    jsonb_build_object(
      'organizationName', organization_name,
      'provider', NEW.provider,
      'purpose', NEW.purpose,
      'referenceHash', reference_digest,
      'saleFinalized', sale_finalized,
      'integrityStatus', receipt_integrity_status
    )
  )
  ON CONFLICT (transaction_id) DO UPDATE
  SET
    sold_amount_minor = EXCLUDED.sold_amount_minor,
    currency = EXCLUDED.currency,
    receipt_hash = coalesce(EXCLUDED.receipt_hash, sold_property_announcements.receipt_hash),
    verification_url = coalesce(EXCLUDED.verification_url, sold_property_announcements.verification_url),
    metadata = sold_property_announcements.metadata || EXCLUDED.metadata;

  UPDATE public.listings
  SET
    status = 'sold',
    visibility = 'hidden',
    featured = FALSE,
    updated_at = NOW()
  WHERE listings.id = NEW.listing_id
    AND listings.status <> 'sold';

  IF NEW.deal_case_id IS NOT NULL THEN
    UPDATE public.deal_cases
    SET
      status = 'closed',
      updated_at = NOW()
    WHERE deal_cases.id = NEW.deal_case_id
      AND deal_cases.case_type = 'purchase_offer';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announce_successful_property_sale ON public.property_transactions;
CREATE TRIGGER announce_successful_property_sale
AFTER INSERT OR UPDATE OF status, purpose, metadata
ON public.property_transactions
FOR EACH ROW
WHEN (NEW.status = 'success')
EXECUTE FUNCTION public.handle_successful_property_sale();

CREATE OR REPLACE FUNCTION public.sync_sold_announcement_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.sold_property_announcements
  SET
    receipt_hash = coalesce(NEW.receipt_sha256, receipt_hash),
    verification_url = coalesce(NEW.verification_url, verification_url),
    metadata = metadata || jsonb_build_object(
      'receiptId', NEW.id,
      'receiptHash', NEW.receipt_sha256,
      'integrityStatus', NEW.integrity_status
    )
  WHERE transaction_id = NEW.transaction_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sold_announcement_receipt ON public.transaction_receipts;
CREATE TRIGGER sync_sold_announcement_receipt
AFTER INSERT OR UPDATE OF receipt_sha256, integrity_status, verification_url
ON public.transaction_receipts
FOR EACH ROW
EXECUTE FUNCTION public.sync_sold_announcement_receipt();

COMMENT ON TABLE public.sold_property_announcements IS
  'Public sold-property feed with hashed buyer identities and internal receipt integrity metadata.';
