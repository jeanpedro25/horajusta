-- Read-only administration primitives and profile entitlement hardening.
-- Apply incrementally after comparing this migration with the live schema.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);

ALTER TABLE private.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.user_roles FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
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
    'totalUsers', (SELECT count(*) FROM public.profiles),
    'newUsers30d', (
      SELECT count(*) FROM public.profiles
      WHERE created_at >= now() - interval '30 days'
    ),
    'activeUsers30d', (
      SELECT count(DISTINCT user_id) FROM public.marcacoes_ponto
      WHERE deleted_at IS NULL AND data >= current_date - 29
    ),
    'paidUsers', (
      SELECT count(*) FROM public.profiles
      WHERE (plano IN ('pro', 'anual') OR is_pro OR subscription_status = 'active')
        AND (plano_vencimento IS NULL OR plano_vencimento > now())
    ),
    'completedOnboarding', (
      SELECT count(*) FROM public.profiles WHERE onboarding_completo IS TRUE
    ),
    'expiring7d', (
      SELECT count(*) FROM public.profiles
      WHERE plano_vencimento > now()
        AND plano_vencimento <= now() + interval '7 days'
    ),
    'pointRecords30d', (
      SELECT count(*) FROM public.marcacoes_ponto
      WHERE deleted_at IS NULL AND data >= current_date - 29
    ),
    'activity', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', days.day::date, 'users', days.users)
        ORDER BY days.day
      ), '[]'::jsonb)
      FROM (
        SELECT series.day, count(DISTINCT marks.user_id) AS users
        FROM generate_series(current_date - 13, current_date, interval '1 day') AS series(day)
        LEFT JOIN public.marcacoes_ponto AS marks
          ON marks.data = series.day::date
          AND marks.deleted_at IS NULL
        GROUP BY series.day
      ) AS days
    ),
    'plans', (
      SELECT jsonb_build_object(
        'free', count(*) FILTER (WHERE plano IS NULL OR plano = 'free'),
        'monthly', count(*) FILTER (WHERE plano = 'pro'),
        'annual', count(*) FILTER (WHERE plano = 'anual')
      )
      FROM public.profiles
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(
  search_term TEXT DEFAULT NULL,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  plan TEXT,
  subscription_status TEXT,
  plan_expires_at TIMESTAMPTZ,
  onboarding_complete BOOLEAN,
  last_activity DATE,
  total_count BIGINT
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
      p.subscription_status,
      p.plano_vencimento,
      p.onboarding_completo
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
    COALESCE(filtered.onboarding_completo, false),
    activity.last_activity,
    count(*) OVER ()
  FROM filtered
  LEFT JOIN LATERAL (
    SELECT max(m.data) AS last_activity
    FROM public.marcacoes_ponto AS m
    WHERE m.user_id = filtered.id AND m.deleted_at IS NULL
  ) AS activity ON true
  ORDER BY filtered.created_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(page_limit, 1), 100)
  OFFSET GREATEST(page_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) TO authenticated;

-- Users may update settings, but never account identity, trial origin or billing state.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  aceite_termos,
  adiantamentos,
  alternancia_turno,
  auxilio_combustivel,
  banco_horas_saldo_inicial,
  banco_horas_saldo_inicial_data,
  bonificacoes,
  carga_horaria_diaria,
  data_admissao,
  data_vencimento_ferias,
  descontos_fixos,
  dia_fechamento_folha,
  dias_trabalhados_semana,
  empresa,
  escala_dias_folga,
  escala_dias_trabalho,
  escala_inicio,
  escala_tipo,
  historico_importado,
  historico_inicio,
  hora_extra_percentual,
  hora_extra_percentual_feriado,
  horario_entrada_padrao,
  horario_saida_padrao,
  intervalo_almoco,
  limite_banco_horas,
  modo_trabalho,
  nome,
  onboarding_completo,
  outros_descontos_detalhados,
  plano_saude,
  prazo_compensacao_dias,
  regra_conversao,
  salario_base,
  tipo_jornada,
  turno_a_fim,
  turno_a_inicio,
  turno_b_fim,
  turno_b_inicio,
  turno_c_fim,
  turno_c_inicio,
  vale_alimentacao
) ON public.profiles TO authenticated;

-- Profile creation is normally handled by the auth trigger. This fallback can only insert the caller's id.
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT INSERT (id) ON public.profiles TO authenticated;

COMMENT ON TABLE private.user_roles IS 'Privileged roles managed only through trusted SQL/service operations.';
COMMENT ON FUNCTION public.admin_dashboard_snapshot() IS 'Read-only aggregated administration metrics.';
COMMENT ON FUNCTION public.admin_list_users(TEXT, INTEGER, INTEGER) IS 'Read-only, paginated user administration projection.';
