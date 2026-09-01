-- Developer API keys, webhook subscriptions, and delivery logs (durable persistence)

CREATE TABLE public.organization_api_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  key_prefix      TEXT        NOT NULL,
  key_hash        TEXT        NOT NULL,
  scopes          TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ
);

CREATE TABLE public.organization_webhook_subscriptions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url                     TEXT        NOT NULL,
  description             TEXT,
  event_types             TEXT[]      NOT NULL DEFAULT '{}',
  secret                  TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failing')),
  delivery_success_count  INTEGER     NOT NULL DEFAULT 0,
  delivery_failure_count  INTEGER     NOT NULL DEFAULT 0,
  last_delivered_at       TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.webhook_delivery_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID        NOT NULL REFERENCES public.organization_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type        TEXT        NOT NULL,
  payload           JSONB       NOT NULL DEFAULT '{}'::JSONB,
  status_code       INTEGER,
  response_body     TEXT,
  duration_ms       INTEGER,
  status            TEXT        NOT NULL CHECK (status IN ('success', 'failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organization_api_keys_org_idx ON public.organization_api_keys(organization_id, status);
CREATE INDEX organization_webhooks_org_idx ON public.organization_webhook_subscriptions(organization_id, status);
CREATE INDEX webhook_delivery_logs_sub_idx ON public.webhook_delivery_logs(subscription_id, created_at DESC);

ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage API keys"
  ON public.organization_api_keys FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_api_keys.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_api_keys.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "Org members read API keys"
  ON public.organization_api_keys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_api_keys.organization_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org admins manage webhooks"
  ON public.organization_webhook_subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_webhook_subscriptions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_webhook_subscriptions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "Org members read webhooks"
  ON public.organization_webhook_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_webhook_subscriptions.organization_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members read webhook delivery logs"
  ON public.webhook_delivery_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_webhook_subscriptions w
    JOIN public.organization_members m ON m.organization_id = w.organization_id
    WHERE w.id = webhook_delivery_logs.subscription_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org admins insert webhook delivery logs"
  ON public.webhook_delivery_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_webhook_subscriptions w
    JOIN public.organization_members m ON m.organization_id = w.organization_id
    WHERE w.id = webhook_delivery_logs.subscription_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager')
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.organization_api_keys,
  public.organization_webhook_subscriptions,
  public.webhook_delivery_logs
TO authenticated;
