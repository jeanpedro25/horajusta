-- Fix admin_list_users: email column type mismatch (varchar vs text)
-- and improve overall admin dashboard functionality

-- Drop existing functions to recreate with correct types
DROP FUNCTION IF EXISTS public.admin_list_users(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  search_term TEXT DEFAULT NULL,
  page_limit  INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  email               VARCHAR,   -- match auth.users.email type (varchar 255)
  created_at          TIMESTAMPTZ,
  plan                TEXT,
  subscription_status TEXT,
  plan_expires_at     TIMESTAMPTZ,
  onboarding_complete BOOLEAN,
  last_activity       DATE,
  total_count         BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.nome,
      u.email,
      p.created_at,
      p.plano,
      COALESCE(p.subscription_status, 'none') AS subscription_status,
      p.plano_vencimento,
      COALESCE(p.onboarding_completo, false)  AS onboarding_completo
    FROM public.profiles AS p
    JOIN auth.users AS u ON u.id = p.id
    WHERE search_term IS NULL
      OR btrim(search_term) = ''
      OR p.nome ILIKE '%' || btrim(search_term) || '%'
      OR u.email ILIKE '%' || btrim(search_term) || '%'
  )
  SELECT
    filtered.id,
    filtered.nome,
    filtered.email,
    filtered.created_at,
    filtered.plano,
    filtered.subscription_status,
    filtered.plano_vencimento,
    filtered.onboarding_completo,
    activity.last_activity,
    count(*) OVER ()
  FROM filtered
  LEFT JOIN LATERAL (
    SELECT max(m.data) AS last_activity
    FROM public.marcacoes_ponto AS m
    WHERE m.user_id = filtered.id AND m.deleted_at IS NULL
  ) AS activity ON true
  ORDER BY filtered.created_at DESC NULLS LAST
  LIMIT  LEAST(GREATEST(page_limit, 1), 100)
  OFFSET GREATEST(page_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) TO authenticated;

-- Admin: get single user details (for user detail modal)
CREATE OR REPLACE FUNCTION public.admin_get_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id',               p.id,
    'nome',             p.nome,
    'email',            u.email,
    'empresa',          p.empresa,
    'plano',            p.plano,
    'is_pro',           COALESCE(p.is_pro, false),
    'subscription_status', COALESCE(p.subscription_status, 'none'),
    'plano_vencimento', p.plano_vencimento,
    'onboarding_completo', COALESCE(p.onboarding_completo, false),
    'created_at',       p.created_at,
    'data_admissao',    p.data_admissao,
    'total_marcacoes',  (
      SELECT count(*) FROM public.marcacoes_ponto m
      WHERE m.user_id = p.id AND m.deleted_at IS NULL
    ),
    'last_activity', (
      SELECT max(m.data) FROM public.marcacoes_ponto m
      WHERE m.user_id = p.id AND m.deleted_at IS NULL
    ),
    'providers',        (
      SELECT jsonb_agg(DISTINCT i.provider)
      FROM auth.identities i WHERE i.user_id = p.id
    )
  )
  INTO result
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_get_user(UUID) TO authenticated;

-- Admin: get recent signups for last N days
CREATE OR REPLACE FUNCTION public.admin_signup_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  day   DATE,
  count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    series.day::date,
    count(p.id) AS count
  FROM generate_series(
    current_date - (days_back - 1),
    current_date,
    interval '1 day'
  ) AS series(day)
  LEFT JOIN public.profiles p ON p.created_at::date = series.day::date
  GROUP BY series.day
  ORDER BY series.day;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_signup_trend(INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_signup_trend(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) IS 'Paginated user list for admin. Fixed varchar/text mismatch on email column.';
COMMENT ON FUNCTION public.admin_get_user(UUID)                      IS 'Detailed single-user projection for admin modal.';
COMMENT ON FUNCTION public.admin_signup_trend(INTEGER)               IS 'Daily signup trend for admin charts.';
