-- Migration: 2026081906_field_inspections.sql
-- Description: Offline-First Field Inspection Engine schema with 150-point checklist,
-- photo evidence, GPS geotagging, signatures, and deposit deduction calculator.

CREATE TABLE IF NOT EXISTS public.field_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    property_id UUID,
    listing_id UUID,
    lease_id UUID,
    deal_case_id UUID,
    inspector_id UUID,
    inspector_name TEXT NOT NULL,
    tenant_id UUID,
    tenant_name TEXT,
    tenant_phone TEXT,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('move_in', 'move_out', 'routine', 'pre_lease', 'turnover', 'emergency')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_sync', 'completed', 'signed', 'disputed')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Handover Meter Readings
    electricity_meter_reading NUMERIC(10, 2),
    electricity_meter_photo_url TEXT,
    water_meter_reading NUMERIC(10, 2),
    water_meter_photo_url TEXT,
    generator_hours_reading NUMERIC(10, 2),
    
    -- Summary & Scoring
    total_items_inspected INTEGER DEFAULT 0,
    passed_items_count INTEGER DEFAULT 0,
    damaged_items_count INTEGER DEFAULT 0,
    overall_condition_score NUMERIC(5, 2) DEFAULT 100.00, -- 0 to 100
    inspector_notes TEXT,
    tenant_notes TEXT,
    
    -- Deposit & Financial Reconciliations (in GHS pesewas)
    initial_security_deposit_pesewas BIGINT DEFAULT 0,
    total_deductions_pesewas BIGINT DEFAULT 0,
    net_deposit_refund_pesewas BIGINT DEFAULT 0,
    deduction_summary JSONB DEFAULT '[]'::jsonb,
    
    -- Offline & Device Metadata
    offline_client_id TEXT,
    offline_created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ,
    device_model TEXT,
    app_version TEXT,
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7),
    gps_accuracy_meters NUMERIC(6, 2),
    
    -- Signatures
    inspector_signature_url TEXT,
    inspector_signed_at TIMESTAMPTZ,
    tenant_signature_url TEXT,
    tenant_signed_at TIMESTAMPTZ,
    ghana_card_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Checklist Items (150-point inspection items)
CREATE TABLE IF NOT EXISTS public.field_inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.field_inspections(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'exterior', 'living_room', 'kitchen', 'master_bedroom', 'bathrooms', 'submetering', 'plumbing', 'security'
    item_key TEXT NOT NULL,
    item_label TEXT NOT NULL,
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged', 'missing', 'not_applicable')),
    is_clean BOOLEAN DEFAULT TRUE,
    is_operational BOOLEAN DEFAULT TRUE,
    
    -- Damage & Deductions
    tenant_liability BOOLEAN DEFAULT FALSE,
    estimated_repair_cost_pesewas BIGINT DEFAULT 0,
    damage_description TEXT,
    action_required TEXT, -- 'none', 'cleaning', 'repair', 'replacement', 'artisan_dispatch'
    
    -- Photo Evidence Array
    photos JSONB DEFAULT '[]'::jsonb, -- [{ url: string, timestamp: string, gps: { lat, lng }, caption: string }]
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rapid lookup and offline sync resolution
CREATE INDEX IF NOT EXISTS idx_field_inspections_org ON public.field_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_field_inspections_property ON public.field_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_field_inspections_lease ON public.field_inspections(lease_id);
CREATE INDEX IF NOT EXISTS idx_field_inspections_status ON public.field_inspections(status);
CREATE INDEX IF NOT EXISTS idx_field_inspections_offline ON public.field_inspections(offline_client_id);
CREATE INDEX IF NOT EXISTS idx_field_inspection_items_inspection ON public.field_inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_field_inspection_items_category ON public.field_inspection_items(category);

-- Row Level Security
ALTER TABLE public.field_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view field inspections within organization"
    ON public.field_inspections FOR SELECT
    USING (
        auth.uid() = inspector_id
        OR auth.uid() = tenant_id
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = field_inspections.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Inspectors and Org Members can insert/update field inspections"
    ON public.field_inspections FOR ALL
    USING (
        auth.uid() = inspector_id
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = field_inspections.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access inspection items for visible inspections"
    ON public.field_inspection_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.field_inspections
            WHERE field_inspections.id = field_inspection_items.inspection_id
            AND (
                field_inspections.inspector_id = auth.uid()
                OR field_inspections.tenant_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.organization_members
                    WHERE organization_members.organization_id = field_inspections.organization_id
                    AND organization_members.user_id = auth.uid()
                )
            )
        )
    );
