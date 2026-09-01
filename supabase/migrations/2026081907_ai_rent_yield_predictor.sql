-- Migration: 2026081907_ai_rent_yield_predictor.sql
-- Description: AI Rent Yield Predictor and micro-market appraisal intelligence for Ghana real estate.

CREATE TABLE IF NOT EXISTS public.market_neighborhood_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_name TEXT NOT NULL UNIQUE,
    region TEXT NOT NULL DEFAULT 'Greater Accra',
    tier TEXT NOT NULL CHECK (tier IN ('ultra_luxury', 'prime_executive', 'middle_income', 'emerging_suburb', 'industrial_commercial')),
    median_price_per_sqm_usd NUMERIC(10, 2) NOT NULL,
    median_monthly_rent_2bed_ghs NUMERIC(10, 2) NOT NULL,
    average_gross_rental_yield_pct NUMERIC(5, 2) NOT NULL,
    average_occupancy_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 88.00,
    typical_days_on_market INTEGER NOT NULL DEFAULT 45,
    annual_appreciation_forecast_pct NUMERIC(5, 2) NOT NULL DEFAULT 9.50,
    generator_premium_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    borehole_premium_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial Ghana Prime Micro-Market Benchmarks
INSERT INTO public.market_neighborhood_benchmarks 
(neighborhood_name, region, tier, median_price_per_sqm_usd, median_monthly_rent_2bed_ghs, average_gross_rental_yield_pct, average_occupancy_rate_pct, typical_days_on_market, annual_appreciation_forecast_pct, generator_premium_pct, borehole_premium_pct)
VALUES
('Airport Residential Area', 'Greater Accra', 'ultra_luxury', 3200.00, 38000.00, 11.20, 92.00, 28, 12.50, 20.00, 12.00),
('Cantonments', 'Greater Accra', 'ultra_luxury', 3400.00, 42000.00, 11.80, 94.00, 24, 13.00, 22.00, 12.00),
('East Legon (Ambassadorial Enclave)', 'Greater Accra', 'prime_executive', 2400.00, 28000.00, 10.50, 90.00, 32, 11.00, 18.00, 10.00),
('Labone', 'Greater Accra', 'prime_executive', 2600.00, 30000.00, 10.80, 91.00, 30, 11.50, 18.00, 11.00),
('Ridge Financial Enclave', 'Greater Accra', 'ultra_luxury', 3100.00, 36000.00, 10.90, 89.00, 35, 10.50, 20.00, 12.00),
('Dzorwulu', 'Greater Accra', 'prime_executive', 2100.00, 22000.00, 9.80, 88.00, 38, 9.50, 16.00, 10.00),
('Osu (Ringway Estates)', 'Greater Accra', 'prime_executive', 2300.00, 25000.00, 10.20, 90.00, 34, 10.00, 18.00, 10.00),
('Spintex Road / Coastal', 'Greater Accra', 'middle_income', 1200.00, 12000.00, 8.50, 85.00, 45, 8.00, 15.00, 14.00),
('Tema Community 6 & 11', 'Greater Accra', 'middle_income', 1100.00, 11000.00, 8.20, 86.00, 48, 7.50, 15.00, 12.00),
('Ahodwo / Nhyiaeso (Kumasi)', 'Ashanti', 'prime_executive', 1400.00, 14000.00, 9.40, 87.00, 42, 9.00, 18.00, 12.00),
('Takoradi Beach Road / Airport Ridge', 'Western', 'prime_executive', 1600.00, 18000.00, 10.10, 89.00, 36, 9.80, 20.00, 14.00)
ON CONFLICT (neighborhood_name) DO UPDATE SET
    median_price_per_sqm_usd = EXCLUDED.median_price_per_sqm_usd,
    median_monthly_rent_2bed_ghs = EXCLUDED.median_monthly_rent_2bed_ghs,
    average_gross_rental_yield_pct = EXCLUDED.average_gross_rental_yield_pct,
    updated_at = NOW();

-- Property Valuation Audits Log
CREATE TABLE IF NOT EXISTS public.property_valuation_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    property_id UUID,
    listing_id UUID,
    property_title TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    property_type TEXT NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 2,
    bathrooms NUMERIC(3, 1) NOT NULL DEFAULT 2.0,
    area_sqm NUMERIC(8, 2) NOT NULL DEFAULT 120.00,
    purchase_price_ghs NUMERIC(14, 2) NOT NULL,
    
    -- Feature Inputs
    has_generator BOOLEAN DEFAULT TRUE,
    has_borehole BOOLEAN DEFAULT TRUE,
    has_pool BOOLEAN DEFAULT FALSE,
    has_security_post BOOLEAN DEFAULT TRUE,
    has_solar_inverter BOOLEAN DEFAULT FALSE,
    is_furnished BOOLEAN DEFAULT FALSE,
    
    -- AI Model Predictions
    predicted_monthly_rent_min_ghs NUMERIC(12, 2) NOT NULL,
    predicted_monthly_rent_optimal_ghs NUMERIC(12, 2) NOT NULL,
    predicted_monthly_rent_max_ghs NUMERIC(12, 2) NOT NULL,
    projected_gross_yield_pct NUMERIC(5, 2) NOT NULL,
    projected_net_cap_rate_pct NUMERIC(5, 2) NOT NULL,
    projected_vacancy_weeks NUMERIC(4, 1) NOT NULL,
    confidence_score_pct NUMERIC(5, 2) NOT NULL DEFAULT 94.00,
    valuation_summary_json JSONB DEFAULT '{}'::jsonb,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuation_audits_org ON public.property_valuation_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_valuation_audits_neighborhood ON public.property_valuation_audits(neighborhood);

-- RLS
ALTER TABLE public.market_neighborhood_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_valuation_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market benchmarks"
    ON public.market_neighborhood_benchmarks FOR SELECT
    USING (true);

CREATE POLICY "Org members can view and create property valuation audits"
    ON public.property_valuation_audits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = property_valuation_audits.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );
