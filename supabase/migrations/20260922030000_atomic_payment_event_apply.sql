-- Serialize repeated/out-of-order Mercado Pago notifications per payment ID.

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

  -- A retry or an older API snapshot must never roll back a newer status.
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
  ELSIF p_status IN ('refunded', 'charged_back', 'cancelled', 'rejected') THEN
    UPDATE public.profiles
    SET plano = 'free',
        plano_vencimento = transaction_time,
        is_pro = FALSE,
        subscription_status = p_status
    WHERE id = p_user_id
      AND plano_payment_id = p_payment_id;
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
