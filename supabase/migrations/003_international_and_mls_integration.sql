-- Currency rates table (for caching exchange rates)
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "from" VARCHAR(3) NOT NULL,
  "to" VARCHAR(3) NOT NULL,
  rate DECIMAL(15, 8) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE("from", "to")
);

-- MLS credentials (encrypted API keys)
CREATE TABLE IF NOT EXISTS mls_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('mls', 'zillow', 'realtor')),
  api_key VARCHAR(500) NOT NULL,
  api_secret VARCHAR(500),
  account_id VARCHAR(255),
  sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- External listings (from MLS, Zillow, Realtor)
CREATE TABLE IF NOT EXISTS external_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('mls', 'zillow', 'realtor')),
  linked_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  title VARCHAR(500),
  description TEXT,
  price DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  bedrooms INT,
  bathrooms DECIMAL(4, 1),
  property_type VARCHAR(100),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  square_feet INT,
  images TEXT[],
  agent_name VARCHAR(255),
  agent_email VARCHAR(255),
  agent_phone VARCHAR(20),
  list_date DATE,
  sale_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'expired')),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, external_id)
);

-- Listing sync jobs (track sync operations)
CREATE TABLE IF NOT EXISTS listing_sync_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('mls', 'zillow', 'realtor')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  listings_sync INT DEFAULT 0,
  listings_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Aggregated leads (from all sources)
CREATE TABLE IF NOT EXISTS aggregated_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('mls', 'zillow', 'realtor', 'internal', 'website', 'referral')),
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  lead_phone VARCHAR(20) NOT NULL,
  message TEXT,
  interested_price DECIMAL(15, 2),
  requested_timeframe VARCHAR(100),
  quality_score INT DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  lead_score INT DEFAULT 50 CHECK (lead_score >= 0 AND lead_score <= 100),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiation', 'won', 'lost', 'merged')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duplicate_of UUID REFERENCES aggregated_leads(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fraud alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES external_listings(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES aggregated_leads(id) ON DELETE SET NULL,
  alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('duplicate_listing', 'suspicious_lead', 'price_mismatch', 'image_reuse', 'fake_listing', 'scam_pattern')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_provider VARCHAR(100),
  payment_method VARCHAR(50) CHECK (payment_method IN ('card', 'bank_transfer', 'mobile_money', 'wallet', 'crypto', 'buy_now_pay_later')),
  external_transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(external_transaction_id)
);

-- User payment methods (saved cards/wallets)
CREATE TABLE IF NOT EXISTS user_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_provider VARCHAR(100),
  method_details JSONB,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_currency_rates_from_to ON currency_rates("from", "to");
CREATE INDEX IF NOT EXISTS idx_mls_credentials_org ON mls_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_listings_org ON external_listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_listings_provider ON external_listings(provider);
CREATE INDEX IF NOT EXISTS idx_listing_sync_jobs_org ON listing_sync_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_listing_sync_jobs_status ON listing_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_aggregated_leads_org ON aggregated_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_aggregated_leads_source ON aggregated_leads(source);
CREATE INDEX IF NOT EXISTS idx_aggregated_leads_status ON aggregated_leads(status);
CREATE INDEX IF NOT EXISTS idx_aggregated_leads_email ON aggregated_leads(lead_email);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_org ON fraud_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON user_payment_methods(user_id);

-- RLS Policies
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mls_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS: Currency rates are public
DROP POLICY IF EXISTS currency_rates_public ON currency_rates;
CREATE POLICY currency_rates_public ON currency_rates FOR SELECT USING (true);

-- RLS: MLS credentials - org members only
DROP POLICY IF EXISTS mls_credentials_select ON mls_credentials;
CREATE POLICY mls_credentials_select ON mls_credentials FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mls_credentials_update ON mls_credentials;
CREATE POLICY mls_credentials_update ON mls_credentials FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS: External listings - org members only
DROP POLICY IF EXISTS external_listings_select ON external_listings;
CREATE POLICY external_listings_select ON external_listings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS: Aggregated leads - org members only
DROP POLICY IF EXISTS aggregated_leads_select ON aggregated_leads;
CREATE POLICY aggregated_leads_select ON aggregated_leads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS aggregated_leads_insert ON aggregated_leads;
CREATE POLICY aggregated_leads_insert ON aggregated_leads FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS: Fraud alerts - org admins only
DROP POLICY IF EXISTS fraud_alerts_select ON fraud_alerts;
CREATE POLICY fraud_alerts_select ON fraud_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS: Payment transactions - user's own only
DROP POLICY IF EXISTS payment_transactions_select ON payment_transactions;
CREATE POLICY payment_transactions_select ON payment_transactions FOR SELECT
  USING (user_id = auth.uid());

-- RLS: User payment methods - user's own only
DROP POLICY IF EXISTS user_payment_methods_select ON user_payment_methods;
CREATE POLICY user_payment_methods_select ON user_payment_methods FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_payment_methods_insert ON user_payment_methods;
CREATE POLICY user_payment_methods_insert ON user_payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Helper function for lead analytics
CREATE OR REPLACE FUNCTION get_lead_analytics_by_source(org_id UUID)
RETURNS TABLE (
  source VARCHAR,
  total_leads BIGINT,
  converted_leads BIGINT,
  average_quality_score DECIMAL,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.source,
    COUNT(al.id)::BIGINT as total_leads,
    COUNT(CASE WHEN al.status IN ('won', 'negotiation') THEN 1 END)::BIGINT as converted_leads,
    AVG(al.quality_score)::DECIMAL as average_quality_score,
    (COUNT(CASE WHEN al.status IN ('won', 'negotiation') THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(al.id), 0))::DECIMAL as conversion_rate
  FROM aggregated_leads al
  WHERE al.organization_id = org_id
  GROUP BY al.source;
END;
$$ LANGUAGE plpgsql;
