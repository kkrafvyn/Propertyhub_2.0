-- Migration: Company Launchpad — White-Label App Platform
-- Backs src/lib/whitelabel-platform.service.ts and CompanyLaunchpad.tsx

-- ─────────────────────────────────────────────
-- 1. White-Label App Configurations
-- ─────────────────────────────────────────────
CREATE TABLE public.whitelabel_apps (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Branding
  app_name            TEXT        NOT NULL,
  tagline             TEXT,
  logo_url            TEXT,
  favicon_url         TEXT,
  -- Color palette (CSS hex values)
  color_primary       TEXT        NOT NULL DEFAULT '#1a73e8'
                       CHECK (color_primary ~ '^#[0-9A-Fa-f]{6}$'),
  color_secondary     TEXT        NOT NULL DEFAULT '#34a853'
                       CHECK (color_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  color_accent        TEXT        NOT NULL DEFAULT '#fbbc04'
                       CHECK (color_accent ~ '^#[0-9A-Fa-f]{6}$'),
  -- Typography
  font_family         TEXT        NOT NULL DEFAULT 'Inter',
  -- Domain
  custom_domain       TEXT,
  ssl_status          TEXT        NOT NULL DEFAULT 'not_configured'
                       CHECK (ssl_status IN ('not_configured','pending_dns','verifying','active','error')),
  ssl_certificate_expires_at TIMESTAMPTZ,
  -- Module feature flags (stored as JSONB for flexibility)
  active_modules      JSONB       NOT NULL DEFAULT '{
    "gate_clearance": true,
    "utility_metering": true,
    "ai_lease": true,
    "contractor_momo": true,
    "owner_portal": true,
    "resident_app": true
  }'::jsonb,
  -- App store metadata
  google_play_url     TEXT,
  apple_store_url     TEXT,
  -- Status
  is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at        TIMESTAMPTZ,
  -- Audit
  created_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id)       -- One white-label config per org
);

-- ─────────────────────────────────────────────
-- 2. DNS / Domain Verification Records
-- ─────────────────────────────────────────────
CREATE TABLE public.whitelabel_domain_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          UUID        NOT NULL REFERENCES public.whitelabel_apps(id) ON DELETE CASCADE,
  record_type     TEXT        NOT NULL CHECK (record_type IN ('CNAME','TXT','A','AAAA')),
  record_name     TEXT        NOT NULL,           -- e.g. "@" or "www"
  record_value    TEXT        NOT NULL,           -- Target value to configure at registrar
  purpose         TEXT        NOT NULL CHECK (purpose IN ('domain_verification','ssl_verification','routing')),
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. Publish / Build History
-- ─────────────────────────────────────────────
CREATE TABLE public.whitelabel_build_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          UUID        NOT NULL REFERENCES public.whitelabel_apps(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL CHECK (event_type IN ('publish','unpublish','domain_change','theme_change','module_toggle')),
  triggered_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  snapshot_json   JSONB,                          -- Full config snapshot at time of event
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. Auto-update timestamps
-- ─────────────────────────────────────────────
CREATE TRIGGER whitelabel_apps_updated_at
  BEFORE UPDATE ON public.whitelabel_apps
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX whitelabel_apps_org_idx          ON public.whitelabel_apps(organization_id);
CREATE INDEX whitelabel_domain_records_app_idx ON public.whitelabel_domain_records(app_id, is_verified);
CREATE INDEX whitelabel_build_events_app_idx  ON public.whitelabel_build_events(app_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.whitelabel_apps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelabel_domain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelabel_build_events  ENABLE ROW LEVEL SECURITY;

-- Organization owner / admin: full CRUD
CREATE POLICY "Org admins manage whitelabel app"
  ON public.whitelabel_apps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ));

-- Org members: read-only access
CREATE POLICY "Org members read whitelabel app"
  ON public.whitelabel_apps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org admins manage domain records"
  ON public.whitelabel_domain_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.whitelabel_apps a
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE a.id = app_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whitelabel_apps a
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE a.id = app_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  ));

CREATE POLICY "Org members read domain records"
  ON public.whitelabel_domain_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whitelabel_apps a
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE a.id = app_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org admins read build events"
  ON public.whitelabel_build_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whitelabel_apps a
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE a.id = app_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  ));

-- System / service role inserts build events
CREATE POLICY "Service role inserts build events"
  ON public.whitelabel_build_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whitelabel_apps a
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE a.id = app_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  ));

-- ─────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.whitelabel_apps,
  public.whitelabel_domain_records,
  public.whitelabel_build_events
TO authenticated;
