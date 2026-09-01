-- Migration: AI Lease Analyzer & Ghana Rent Act (Act 220) Compliance Engine
-- Backs src/lib/ai-lease-analyzer.service.ts and AILeaseAnalyzer.tsx

-- ─────────────────────────────────────────────
-- 1. Lease Audit Records
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_lease_audits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link to deal/tenancy context (optional — standalone audits allowed)
  deal_case_id        UUID        REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  estate_id           UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  -- Raw draft submitted for analysis
  draft_text          TEXT        NOT NULL,
  -- Analysis outputs
  compliance_score    SMALLINT    NOT NULL DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  compliance_grade    TEXT        NOT NULL DEFAULT 'F' CHECK (compliance_grade IN ('A','B','C','D','F')),
  is_advance_rent_compliant BOOLEAN NOT NULL DEFAULT FALSE,
  advance_months_detected   SMALLINT,        -- months of advance rent found in draft
  -- Redline output
  redlined_text       TEXT,                  -- AI-generated compliant replacement
  -- Audit metadata
  audited_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  ai_model_version    TEXT        NOT NULL DEFAULT 'ghana-rent-act-v1',
  status              TEXT        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','audited','signed','archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. Clause-Level Audit Flags
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_lease_audit_flags (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        UUID    NOT NULL REFERENCES public.estate_lease_audits(id) ON DELETE CASCADE,
  rule_code       TEXT    NOT NULL,          -- e.g. 'ADVANCE_RENT_LIMIT', 'ILLEGAL_LOCKOUT'
  severity        TEXT    NOT NULL CHECK (severity IN ('critical','warning','info')),
  description     TEXT    NOT NULL,          -- Human-readable flag description
  offending_text  TEXT,                      -- Excerpt from draft that triggered the flag
  suggestion      TEXT,                      -- AI-generated compliant replacement clause
  section_ref     TEXT,                      -- Ghana Rent Act section reference e.g. "Section 25"
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. E-Signature Records
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_lease_signatures (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id            UUID        NOT NULL REFERENCES public.estate_lease_audits(id) ON DELETE CASCADE,
  signer_user_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  signer_name         TEXT        NOT NULL,
  signer_role         TEXT        NOT NULL CHECK (signer_role IN ('tenant','landlord','agent','witness')),
  -- Ghana Card NIA verification
  ghana_card_number   TEXT,                  -- Stored as hash in production — never plaintext
  nia_verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  nia_verified_at     TIMESTAMPTZ,
  -- Cryptographic signature
  document_hash_sha256 TEXT       NOT NULL,  -- SHA256 of the final redlined text at sign time
  signature_data      TEXT        NOT NULL,  -- Base64 drawn signature or typed name hash
  ip_address          TEXT,
  user_agent          TEXT,
  signed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (audit_id, signer_user_id, signer_role)
);

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX lease_audits_estate_idx       ON public.estate_lease_audits(estate_id, created_at DESC);
CREATE INDEX lease_audits_deal_case_idx    ON public.estate_lease_audits(deal_case_id);
CREATE INDEX lease_audit_flags_audit_idx   ON public.estate_lease_audit_flags(audit_id, severity);
CREATE INDEX lease_signatures_audit_idx    ON public.estate_lease_signatures(audit_id);

-- ─────────────────────────────────────────────
-- 5. Auto-update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER lease_audits_updated_at
  BEFORE UPDATE ON public.estate_lease_audits
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ─────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.estate_lease_audits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_lease_audit_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_lease_signatures  ENABLE ROW LEVEL SECURITY;

-- Estate staff: full CRUD on audits in their estate
CREATE POLICY "Staff manage lease audits"
  ON public.estate_lease_audits FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

-- Tenant: read audit where their deal case
CREATE POLICY "Tenant reads own lease audit"
  ON public.estate_lease_audits FOR SELECT
  USING (
    deal_case_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.deal_cases dc
      WHERE dc.id = deal_case_id AND dc.user_id = auth.uid()
    )
  );

-- Flags follow parent audit access
CREATE POLICY "Audit flags visible with audit"
  ON public.estate_lease_audit_flags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.estate_lease_audits a
    WHERE a.id = audit_id
      AND (private.is_estate_staff(a.estate_id) OR (
        a.deal_case_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.deal_cases dc
          WHERE dc.id = a.deal_case_id AND dc.user_id = auth.uid()
        )
      ))
  ));

CREATE POLICY "Staff manage audit flags"
  ON public.estate_lease_audit_flags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estate_lease_audits a
    WHERE a.id = audit_id AND private.is_estate_staff(a.estate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estate_lease_audits a
    WHERE a.id = audit_id AND private.is_estate_staff(a.estate_id)
  ));

-- Signatures: any signer can insert their own; estate staff read all
CREATE POLICY "Signer inserts own signature"
  ON public.estate_lease_signatures FOR INSERT
  WITH CHECK (signer_user_id = auth.uid());

CREATE POLICY "Signer reads own signature"
  ON public.estate_lease_signatures FOR SELECT
  USING (signer_user_id = auth.uid());

CREATE POLICY "Staff reads all signatures for estate"
  ON public.estate_lease_signatures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.estate_lease_audits a
    WHERE a.id = audit_id AND private.is_estate_staff(a.estate_id)
  ));

-- ─────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.estate_lease_audits,
  public.estate_lease_audit_flags,
  public.estate_lease_signatures
TO authenticated;
