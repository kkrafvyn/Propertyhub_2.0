-- Private receipts bucket for payment receipt downloads.
-- Receipts are generated server-side and accessed via signed URLs or
-- authenticated storage reads for payers and organization members.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'receipts',
  'receipts',
  FALSE,
  1048576,
  ARRAY['text/plain']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authorized users can view payment receipts" ON storage.objects;
CREATE POLICY "Authorized users can view payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    EXISTS (
      SELECT 1
      FROM public.transaction_receipts receipt
      JOIN public.property_transactions property_transaction
        ON property_transaction.id = receipt.transaction_id
      WHERE receipt.storage_bucket = 'receipts'
        AND receipt.storage_path = name
        AND property_transaction.payer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id::text = (storage.foldername(name))[1]
        AND membership.user_id = auth.uid()
    )
  )
);
