-- Note: Supabase CLI was not available in this environment, so this migration
-- file was added manually to continue the repo's timestamped migration sequence.

CREATE TABLE IF NOT EXISTS public.buyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  buyer_label TEXT NOT NULL,
  location TEXT NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('rental', 'sale', 'lease')),
  property_type TEXT,
  budget_min INTEGER CHECK (budget_min IS NULL OR budget_min >= 0),
  budget_max INTEGER CHECK (budget_max IS NULL OR budget_max >= 0),
  bedrooms INTEGER CHECK (bedrooms IS NULL OR bedrooms >= 0),
  notes TEXT NOT NULL,
  channel TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_requests_public_created_at
ON public.buyer_requests(is_public, created_at DESC);

ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.buyer_requests TO anon, authenticated;
GRANT INSERT ON public.buyer_requests TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read public buyer requests"
ON public.buyer_requests;
CREATE POLICY "Anyone can read public buyer requests"
ON public.buyer_requests FOR SELECT
USING (is_public = TRUE);

DROP POLICY IF EXISTS "Anyone can create public buyer requests"
ON public.buyer_requests;
CREATE POLICY "Anyone can create public buyer requests"
ON public.buyer_requests FOR INSERT
WITH CHECK (
  is_public = TRUE
  AND char_length(trim(title)) >= 4
  AND char_length(trim(buyer_label)) >= 2
  AND char_length(trim(location)) >= 2
  AND char_length(trim(notes)) >= 12
  AND (user_id IS NULL OR user_id = auth.uid())
);
