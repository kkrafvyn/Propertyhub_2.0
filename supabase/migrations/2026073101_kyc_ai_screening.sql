-- AI-assisted KYC pre-screening fields

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS ai_screening_status TEXT DEFAULT 'pending'
    CHECK (ai_screening_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT
    CHECK (ai_recommendation IS NULL OR ai_recommendation IN ('approve', 'review', 'reject')),
  ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_flags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_screened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_source TEXT;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_ai_recommendation
  ON public.kyc_submissions(ai_recommendation)
  WHERE status IN ('submitted', 'in_review');
