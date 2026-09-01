-- Durable bank-feed connections and idempotent provider sync state.
CREATE TABLE IF NOT EXISTS public.bank_feed_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error','revoked')),
  cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_account_id),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS public.bank_feed_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.bank_feed_connections(id) ON DELETE CASCADE,
  provider_transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEBIT','CREDIT')),
  bank_reference TEXT,
  imported_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS bank_feed_connections_org_idx ON public.bank_feed_connections(organization_id, status);
CREATE INDEX IF NOT EXISTS bank_feed_transactions_connection_idx ON public.bank_feed_transactions(connection_id, transaction_date DESC);

ALTER TABLE public.bank_feed_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_feed_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members manage bank feed connections" ON public.bank_feed_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = bank_feed_connections.organization_id AND m.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = bank_feed_connections.organization_id AND m.user_id = auth.uid())
);
CREATE POLICY "Organization members view bank feed transactions" ON public.bank_feed_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bank_feed_connections c JOIN public.organization_members m ON m.organization_id = c.organization_id WHERE c.id = bank_feed_transactions.connection_id AND m.user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_feed_connections TO authenticated;
GRANT SELECT ON public.bank_feed_transactions TO authenticated;