-- Idempotent Mercado Pago event ledger. Apply before deploying the hardened webhook.

CREATE TABLE IF NOT EXISTS public.payment_events (
  provider TEXT NOT NULL DEFAULT 'mercado_pago',
  provider_payment_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'anual')),
  status TEXT NOT NULL,
  status_detail TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  preference_id TEXT,
  collector_id TEXT,
  external_reference TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  provider_updated_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entitlement_applied_at TIMESTAMPTZ,
  raw_payload JSONB,
  PRIMARY KEY (provider, provider_payment_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS payment_events_user_received_idx
  ON public.payment_events (user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS payment_events_status_idx
  ON public.payment_events (status, received_at DESC);

COMMENT ON TABLE public.payment_events IS 'Server-managed payment reconciliation and idempotency ledger.';
