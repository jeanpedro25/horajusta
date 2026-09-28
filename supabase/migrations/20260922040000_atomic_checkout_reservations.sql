-- Prevent concurrent payment preferences for the same account and allow safe link resumption.

CREATE TABLE IF NOT EXISTS public.payment_checkouts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'anual')),
  external_reference TEXT UNIQUE,
  preference_id TEXT UNIQUE,
  checkout_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('creating', 'open', 'completed', 'cancelled', 'rejected', 'refunded', 'charged_back')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_checkouts_open_data CHECK (
    status <> 'open' OR (preference_id IS NOT NULL AND checkout_url IS NOT NULL)
  )
);

ALTER TABLE public.payment_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_checkouts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_mp_checkout(p_plan TEXT)
RETURNS TABLE (reserved BOOLEAN, preference_id TEXT, checkout_url TEXT, checkout_plan TEXT, external_reference TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
  current_status TEXT;
  current_plan TEXT;
  current_preference_id TEXT;
  current_checkout_url TEXT;
  current_external_reference TEXT;
  new_external_reference TEXT;
  profile_row RECORD;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_plan IS NULL OR p_plan NOT IN ('pro', 'anual') THEN
    RAISE EXCEPTION 'invalid plan' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mp-checkout:' || actor_id::TEXT, 0)
  );

  SELECT plano, plano_vencimento, is_pro, subscription_status
  INTO profile_row
  FROM public.profiles
  WHERE id = actor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;
  IF (COALESCE(profile_row.plano IN ('pro', 'anual'), FALSE)
      OR COALESCE(profile_row.is_pro, FALSE)
      OR lower(COALESCE(profile_row.subscription_status, '')) = 'active')
     AND (profile_row.plano_vencimento IS NULL OR profile_row.plano_vencimento > now()) THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT c.status, c.plan, c.preference_id, c.checkout_url, c.external_reference
  INTO current_status, current_plan, current_preference_id, current_checkout_url, current_external_reference
  FROM public.payment_checkouts AS c
  WHERE c.user_id = actor_id
  FOR UPDATE;

  IF FOUND AND current_status IN ('creating', 'open') THEN
    IF current_status = 'open' AND current_preference_id IS NOT NULL AND current_checkout_url IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, current_preference_id, current_checkout_url, current_plan, current_external_reference;
    ELSE
      -- An interrupted provider request can be recovered by searching its stable external_reference.
      RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, current_plan, current_external_reference;
    END IF;
    RETURN;
  END IF;

  new_external_reference := actor_id::TEXT || '|' || p_plan || '|' || pg_catalog.gen_random_uuid()::TEXT;
  INSERT INTO public.payment_checkouts (user_id, plan, external_reference, preference_id, checkout_url, status, created_at, updated_at)
  VALUES (actor_id, p_plan, new_external_reference, NULL, NULL, 'creating', now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        external_reference = EXCLUDED.external_reference,
        preference_id = NULL,
        checkout_url = NULL,
        status = 'creating',
        created_at = now(),
        updated_at = now();

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, p_plan, new_external_reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_mp_checkout(p_preference_id TEXT, p_checkout_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_preference_id IS NULL OR p_preference_id = '' OR p_checkout_url IS NULL
     OR p_checkout_url !~ '^https://([[:alnum:]-]+\.)*mercadopago\.com(\.br)?/' THEN
    RAISE EXCEPTION 'invalid checkout result' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_checkouts
  SET preference_id = p_preference_id,
      checkout_url = p_checkout_url,
      status = CASE WHEN status = 'completed' THEN status ELSE 'open' END,
      updated_at = now()
  WHERE user_id = actor_id AND (
    status = 'creating' OR (status IN ('open', 'completed') AND preference_id = p_preference_id)
  );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout reservation not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_mp_checkout(p_user_id UUID, p_status TEXT DEFAULT 'cancelled')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_status IS NULL OR p_status NOT IN ('cancelled', 'rejected') THEN
    RAISE EXCEPTION 'invalid terminal checkout status' USING ERRCODE = '22023';
  END IF;
  UPDATE public.payment_checkouts
  SET status = p_status, updated_at = now()
  WHERE user_id = p_user_id AND status = 'creating';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_mp_checkout(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_mp_checkout(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_mp_checkout(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_mp_checkout(TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.release_mp_checkout(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_mp_checkout(UUID, TEXT) TO service_role;

COMMENT ON TABLE public.payment_checkouts IS
  'One active Checkout Pro preference per account; rows are private and mutated only through reservation RPCs or the service-role webhook.';

CREATE OR REPLACE FUNCTION public.apply_mp_payment_event(
  p_payment_id TEXT,
  p_user_id UUID,
  p_plan TEXT,
  p_status TEXT,
  p_status_detail TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_preference_id TEXT,
  p_collector_id TEXT,
  p_external_reference TEXT,
  p_approved_at TIMESTAMPTZ,
  p_provider_updated_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_raw_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_updated_at TIMESTAMPTZ;
  existing_entitlement_applied_at TIMESTAMPTZ;
  transaction_time TIMESTAMPTZ := now();
BEGIN
  IF (SELECT auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_payment_id IS NULL OR p_payment_id = '' OR p_user_id IS NULL
    OR p_plan IS NULL OR p_plan NOT IN ('pro', 'anual') OR p_status IS NULL OR p_status = ''
    OR p_provider_updated_at IS NULL THEN
    RAISE EXCEPTION 'invalid payment event' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'approved' AND (p_approved_at IS NULL OR p_expires_at IS NULL) THEN
    RAISE EXCEPTION 'approved payment requires valid entitlement dates' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mercado_pago:' || p_payment_id, 0)
  );

  SELECT provider_updated_at, entitlement_applied_at
  INTO existing_updated_at, existing_entitlement_applied_at
  FROM public.payment_events
  WHERE provider = 'mercado_pago' AND provider_payment_id = p_payment_id
  FOR UPDATE;

  IF FOUND AND existing_updated_at IS NOT NULL AND p_provider_updated_at <= existing_updated_at THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.payment_events (
    provider, provider_payment_id, user_id, plan, status, status_detail,
    amount, currency, preference_id, collector_id, external_reference,
    approved_at, provider_updated_at, received_at, entitlement_applied_at, raw_payload
  ) VALUES (
    'mercado_pago', p_payment_id, p_user_id, p_plan, p_status, p_status_detail,
    p_amount, p_currency, p_preference_id, p_collector_id, p_external_reference,
    p_approved_at, p_provider_updated_at, transaction_time,
    CASE WHEN p_status = 'approved'
      THEN COALESCE(existing_entitlement_applied_at, transaction_time)
      ELSE existing_entitlement_applied_at END,
    p_raw_payload
  )
  ON CONFLICT (provider, provider_payment_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    status_detail = EXCLUDED.status_detail,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    preference_id = EXCLUDED.preference_id,
    collector_id = EXCLUDED.collector_id,
    external_reference = EXCLUDED.external_reference,
    approved_at = EXCLUDED.approved_at,
    provider_updated_at = EXCLUDED.provider_updated_at,
    received_at = EXCLUDED.received_at,
    entitlement_applied_at = EXCLUDED.entitlement_applied_at,
    raw_payload = EXCLUDED.raw_payload;

  IF p_status = 'approved' THEN
    UPDATE public.profiles
    SET plano = p_plan,
        plano_vencimento = p_expires_at,
        plano_payment_id = p_payment_id,
        is_pro = TRUE,
        subscription_status = 'active'
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'payment profile not found' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.payment_checkouts
    SET status = 'completed',
        preference_id = COALESCE(preference_id, p_preference_id),
        updated_at = transaction_time
    WHERE user_id = p_user_id
      AND (preference_id = p_preference_id OR (preference_id IS NULL AND external_reference = p_external_reference))
      AND status IN ('creating', 'open');
  ELSIF p_status IN ('refunded', 'charged_back', 'cancelled', 'rejected') THEN
    UPDATE public.profiles
    SET plano = 'free',
        plano_vencimento = transaction_time,
        is_pro = FALSE,
        subscription_status = p_status
    WHERE id = p_user_id
      AND plano_payment_id = p_payment_id;
    UPDATE public.payment_checkouts
    SET status = p_status,
        preference_id = COALESCE(preference_id, p_preference_id),
        updated_at = transaction_time
    WHERE user_id = p_user_id
      AND (preference_id = p_preference_id OR (preference_id IS NULL AND external_reference = p_external_reference))
      AND status IN ('creating', 'open');
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_mp_payment_event(
  TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_mp_payment_event(
  TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) TO service_role;

COMMENT ON FUNCTION public.apply_mp_payment_event(
  TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) IS 'Atomically serializes a Mercado Pago payment snapshot and applies its entitlement only if newer.';
