-- Blockchain Verification Layer for BaytMiftah
-- Polygon Network Integration for Document & Ownership Verification
-- Run this in Supabase SQL Editor after 003_tier2_schema.sql is complete

-- ============================================================================
-- BLOCKCHAIN RECORDS TABLE
-- ============================================================================
-- Stores all blockchain transaction records for property verification
CREATE TABLE IF NOT EXISTS public.blockchain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  transaction_hash TEXT UNIQUE NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 137, -- Polygon mainnet
  block_number BIGINT,
  timestamp BIGINT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  record_type TEXT NOT NULL CHECK (record_type IN ('ownership', 'document', 'escrow', 'title_deed', 'lease_agreement')),
  data_hash TEXT NOT NULL, -- SHA-256 hash of the document
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'finalized', 'failed')),
  confirmation_count INTEGER DEFAULT 0,
  gas_used NUMERIC,
  transaction_cost NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- ============================================================================
-- VERIFICATION HASHES TABLE
-- ============================================================================
-- Stores document hashes for verification without storing the document itself
CREATE TABLE IF NOT EXISTS public.verification_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('title_deed', 'lease_agreement', 'inspection_report', 'utility_bill', 'id_verification')),
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  hash_value TEXT NOT NULL,
  blockchain_record_id UUID REFERENCES public.blockchain_records(id),
  verified BOOLEAN DEFAULT false,
  verification_timestamp TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, document_id, hash_value)
);

-- ============================================================================
-- SMART CONTRACT EVENTS TABLE
-- ============================================================================
-- Logs all smart contract interactions and state changes
CREATE TABLE IF NOT EXISTS public.smart_contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('escrow', 'ownership', 'lease', 'franchise')),
  event_name TEXT NOT NULL,
  event_signature TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT,
  log_index INTEGER,
  indexed_params JSONB,
  decoded_params JSONB,
  event_timestamp BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OWNERSHIP EVENTS TABLE
-- ============================================================================
-- Tracks property ownership transfers and verification on blockchain
CREATE TABLE IF NOT EXISTS public.ownership_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  ownership_percentage NUMERIC(5,2) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('transfer', 'mint', 'burn', 'approve', 'dispute')),
  transaction_hash TEXT,
  block_number BIGINT,
  timestamp BIGINT,
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TOKENIZED ASSETS TABLE
-- ============================================================================
-- Represents properties as blockchain tokens for fractional ownership
CREATE TABLE IF NOT EXISTS public.tokenized_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  token_contract_address TEXT UNIQUE NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  total_supply NUMERIC NOT NULL,
  decimals INTEGER DEFAULT 18,
  chain_id INTEGER DEFAULT 137,
  mint_transaction_hash TEXT,
  minted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'active', 'paused', 'burned')),
  metadata_uri TEXT,
  dividend_enabled BOOLEAN DEFAULT false,
  transferable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOCKCHAIN WALLETS TABLE
-- ============================================================================
-- Stores wallet addresses for users and organizations
CREATE TABLE IF NOT EXISTS public.blockchain_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER DEFAULT 137,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('metamask', 'ledger', 'hardware', 'custodial')),
  verified BOOLEAN DEFAULT false,
  verification_signature TEXT,
  is_primary BOOLEAN DEFAULT false,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, chain_id)
);

-- ============================================================================
-- BLOCKCHAIN VERIFICATION LOGS TABLE
-- ============================================================================
-- Audit trail for verification activities
CREATE TABLE IF NOT EXISTS public.blockchain_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blockchain_record_id UUID REFERENCES public.blockchain_records(id),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('document_hash', 'ownership', 'transaction', 'contract_state')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'failed')),
  verification_details JSONB,
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDICES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_blockchain_records_org_property ON public.blockchain_records(organization_id, property_id);
CREATE INDEX idx_blockchain_records_tx_hash ON public.blockchain_records(transaction_hash);
CREATE INDEX idx_blockchain_records_status ON public.blockchain_records(status);
CREATE INDEX idx_verification_hashes_org_doc ON public.verification_hashes(organization_id, document_id);
CREATE INDEX idx_verification_hashes_hash ON public.verification_hashes(hash_value);
CREATE INDEX idx_smart_contract_events_org ON public.smart_contract_events(organization_id);
CREATE INDEX idx_smart_contract_events_tx ON public.smart_contract_events(transaction_hash);
CREATE INDEX idx_ownership_events_property ON public.ownership_events(organization_id, property_id);
CREATE INDEX idx_tokenized_assets_org ON public.tokenized_assets(organization_id);
CREATE INDEX idx_tokenized_assets_contract ON public.tokenized_assets(token_contract_address);
CREATE INDEX idx_blockchain_wallets_address ON public.blockchain_wallets(wallet_address);
CREATE INDEX idx_blockchain_wallets_user ON public.blockchain_wallets(user_id);
CREATE INDEX idx_verification_logs_org ON public.blockchain_verification_logs(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all blockchain tables
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokenized_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_verification_logs ENABLE ROW LEVEL SECURITY;

-- Blockchain Records Policies
CREATE POLICY "Users can view blockchain records for their organization"
ON public.blockchain_records FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert blockchain records for their organization"
ON public.blockchain_records FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update blockchain records for their organization"
ON public.blockchain_records FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Verification Hashes Policies
CREATE POLICY "Users can view verification hashes for their organization"
ON public.verification_hashes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert verification hashes for their organization"
ON public.verification_hashes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Smart Contract Events Policies
CREATE POLICY "Users can view smart contract events for their organization"
ON public.smart_contract_events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Ownership Events Policies
CREATE POLICY "Users can view ownership events for their organization"
ON public.ownership_events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Tokenized Assets Policies
CREATE POLICY "Users can view tokenized assets for their organization"
ON public.tokenized_assets FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Blockchain Wallets Policies
CREATE POLICY "Users can view their own blockchain wallets"
ON public.blockchain_wallets FOR SELECT
USING (
  user_id = auth.uid() OR 
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own blockchain wallets"
ON public.blockchain_wallets FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own blockchain wallets"
ON public.blockchain_wallets FOR UPDATE
USING (
  user_id = auth.uid()
);

-- Verification Logs Policies
CREATE POLICY "Users can view blockchain verification logs for their organization"
ON public.blockchain_verification_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AUDIT TRAIL
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blockchain_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_blockchain_records_timestamp
BEFORE UPDATE ON public.blockchain_records
FOR EACH ROW
EXECUTE FUNCTION public.update_blockchain_records_timestamp();

-- System can insert blockchain records
CREATE POLICY "System can insert blockchain records"
ON public.blockchain_records FOR INSERT
WITH CHECK (true);

-- System can insert verification hashes
CREATE POLICY "System can insert verification hashes"
ON public.verification_hashes FOR INSERT
WITH CHECK (true);

-- System can insert smart contract events
CREATE POLICY "System can insert smart contract events"
ON public.smart_contract_events FOR INSERT
WITH CHECK (true);

-- System can insert ownership events
CREATE POLICY "System can insert ownership events"
ON public.ownership_events FOR INSERT
WITH CHECK (true);

-- System can insert tokenized assets
CREATE POLICY "System can insert tokenized assets"
ON public.tokenized_assets FOR INSERT
WITH CHECK (true);

-- System can insert blockchain verification logs
CREATE POLICY "System can insert blockchain verification logs"
ON public.blockchain_verification_logs FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.blockchain_records IS 'Master table for blockchain verification records on Polygon network';
COMMENT ON TABLE public.verification_hashes IS 'Document hashes for verification without storing full documents';
COMMENT ON TABLE public.smart_contract_events IS 'Logs of smart contract interactions and state changes';
COMMENT ON TABLE public.ownership_events IS 'Property ownership transfers recorded on blockchain';
COMMENT ON TABLE public.tokenized_assets IS 'Properties tokenized as blockchain assets for fractional ownership';
COMMENT ON TABLE public.blockchain_wallets IS 'Wallet addresses for users and organizations';
COMMENT ON TABLE public.blockchain_verification_logs IS 'Audit trail for verification activities';
