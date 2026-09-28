
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  salario_base NUMERIC DEFAULT 0,
  carga_horaria_diaria NUMERIC DEFAULT 8,
  hora_extra_percentual NUMERIC DEFAULT 50,
  plano TEXT DEFAULT 'free' CHECK (plano IN ('free', 'pro')),
  onboarding_completo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create registros_ponto table
CREATE TABLE public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada TIMESTAMPTZ NOT NULL,
  saida TIMESTAMPTZ,
  intervalo_minutos INTEGER DEFAULT 60,
  observacao TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registros" ON public.registros_ponto FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own registros" ON public.registros_ponto FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own registros" ON public.registros_ponto FOR UPDATE USING (auth.uid() = user_id);

-- Create registros_ponto_historico table
CREATE TABLE public.registros_ponto_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.registros_ponto_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own historico" ON public.registros_ponto_historico
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.registros_ponto rp WHERE rp.id = registro_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own historico" ON public.registros_ponto_historico
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.registros_ponto rp WHERE rp.id = registro_id AND rp.user_id = auth.uid())
  );

-- Create alertas table
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registro_id UUID NOT NULL REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('hora_extra', 'sem_intervalo', 'jornada_excessiva', 'intervalo_curto')),
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alertas" ON public.alertas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alertas" ON public.alertas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alertas" ON public.alertas FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_registros_ponto_user_data ON public.registros_ponto(user_id, data);
CREATE INDEX idx_alertas_user_lido ON public.alertas(user_id, lido);



-- Add columns for manual editing and file attachments
ALTER TABLE public.registros_ponto
  ADD COLUMN IF NOT EXISTS anexo_url text,
  ADD COLUMN IF NOT EXISTS editado_manualmente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS editado_em timestamptz,
  ADD COLUMN IF NOT EXISTS editado_por uuid;

-- Create storage bucket for atestados
INSERT INTO storage.buckets (id, name, public)
VALUES ('atestados', 'atestados', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own files
CREATE POLICY "Users can upload atestados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'atestados' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can view their own files
CREATE POLICY "Users can view own atestados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'atestados' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can delete their own files
CREATE POLICY "Users can delete own atestados"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'atestados' AND (storage.foldername(name))[1] = auth.uid()::text);


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intervalo_almoco integer NOT NULL DEFAULT 60;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.alertas WHERE user_id = auth.uid();
  DELETE FROM public.registros_ponto_historico WHERE registro_id IN (SELECT id FROM public.registros_ponto WHERE user_id = auth.uid());
  DELETE FROM public.registros_ponto WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- Add banco de horas config to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS modo_trabalho text NOT NULL DEFAULT 'horas_extras',
  ADD COLUMN IF NOT EXISTS prazo_compensacao_dias integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS regra_conversao text NOT NULL DEFAULT '1.5x',
  ADD COLUMN IF NOT EXISTS limite_banco_horas integer;

-- Create banco_horas table
CREATE TABLE public.banco_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL,
  minutos integer NOT NULL,
  expira_em timestamptz NOT NULL,
  nota text,
  registro_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own banco_horas" ON public.banco_horas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own banco_horas" ON public.banco_horas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own banco_horas" ON public.banco_horas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own banco_horas" ON public.banco_horas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aceite_termos boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN empresa text;


ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_jornada text NOT NULL DEFAULT 'jornada_fixa',
  ADD COLUMN IF NOT EXISTS dias_trabalhados_semana integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS horario_entrada_padrao time,
  ADD COLUMN IF NOT EXISTS horario_saida_padrao time,
  ADD COLUMN IF NOT EXISTS escala_tipo text,
  ADD COLUMN IF NOT EXISTS escala_dias_trabalho integer,
  ADD COLUMN IF NOT EXISTS escala_dias_folga integer,
  ADD COLUMN IF NOT EXISTS escala_inicio date,
  ADD COLUMN IF NOT EXISTS turno_a_inicio time,
  ADD COLUMN IF NOT EXISTS turno_a_fim time,
  ADD COLUMN IF NOT EXISTS turno_b_inicio time,
  ADD COLUMN IF NOT EXISTS turno_b_fim time,
  ADD COLUMN IF NOT EXISTS turno_c_inicio time,
  ADD COLUMN IF NOT EXISTS turno_c_fim time,
  ADD COLUMN IF NOT EXISTS alternancia_turno text NOT NULL DEFAULT 'manual';


-- Make atestados bucket private
UPDATE storage.buckets SET public = false WHERE id = 'atestados';

-- Deny UPDATE and DELETE on audit table
CREATE POLICY "No one can update historico"
ON public.registros_ponto_historico
FOR UPDATE
TO public
USING (false);

CREATE POLICY "No one can delete historico"
ON public.registros_ponto_historico
FOR DELETE
TO public
USING (false);

-- 1. Make atestados bucket private
UPDATE storage.buckets SET public = false WHERE id = 'atestados';

-- 2. Drop existing public-role policies and recreate as deny for historico UPDATE/DELETE
DROP POLICY IF EXISTS "No one can update historico" ON public.registros_ponto_historico;
DROP POLICY IF EXISTS "No one can delete historico" ON public.registros_ponto_historico;

CREATE POLICY "No one can update historico"
ON public.registros_ponto_historico
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No one can delete historico"
ON public.registros_ponto_historico
FOR DELETE
TO authenticated
USING (false);

-- 3. Fix all RLS policies from public to authenticated role

-- registros_ponto
ALTER POLICY "Users can insert own registros" ON public.registros_ponto TO authenticated;
ALTER POLICY "Users can update own registros" ON public.registros_ponto TO authenticated;
ALTER POLICY "Users can view own registros" ON public.registros_ponto TO authenticated;

-- registros_ponto_historico
ALTER POLICY "Users can insert own historico" ON public.registros_ponto_historico TO authenticated;
ALTER POLICY "Users can view own historico" ON public.registros_ponto_historico TO authenticated;

-- alertas
ALTER POLICY "Users can insert own alertas" ON public.alertas TO authenticated;
ALTER POLICY "Users can update own alertas" ON public.alertas TO authenticated;
ALTER POLICY "Users can view own alertas" ON public.alertas TO authenticated;

-- profiles
ALTER POLICY "Users can insert own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can view own profile" ON public.profiles TO authenticated;

ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS atestado_periodo text;


ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS manha_entrada time;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS manha_saida time;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS manha_estado text DEFAULT 'pendente';
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS manha_atestado_url text;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS tarde_entrada time;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS tarde_saida time;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS tarde_estado text DEFAULT 'pendente';
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS tarde_atestado_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_ponto_manha_estado_check') THEN
    ALTER TABLE public.registros_ponto ADD CONSTRAINT registros_ponto_manha_estado_check CHECK (manha_estado IN ('pendente','registrado','atestado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_ponto_tarde_estado_check') THEN
    ALTER TABLE public.registros_ponto ADD CONSTRAINT registros_ponto_tarde_estado_check CHECK (tarde_estado IN ('pendente','registrado','atestado'));
  END IF;
END $$;



CREATE TABLE IF NOT EXISTS public.marcacoes_ponto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida_intervalo', 'volta_intervalo', 'saida_final')),
  horario TIMESTAMPTZ NOT NULL,
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('botao', 'manual', 'correcao')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marcacoes_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marcacoes" ON public.marcacoes_ponto
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marcacoes" ON public.marcacoes_ponto
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marcacoes" ON public.marcacoes_ponto
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_marcacoes_user_data ON public.marcacoes_ponto(user_id, data DESC);



CREATE TABLE IF NOT EXISTS public.ferias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_direito INTEGER DEFAULT 30,
  tipo TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'agendada',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_ferias" ON public.ferias
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ferias_user ON public.ferias(user_id, data_inicio DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_admissao DATE,
  ADD COLUMN IF NOT EXISTS data_vencimento_ferias DATE;



ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banco_horas_saldo_inicial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banco_horas_saldo_inicial_data DATE;

CREATE TABLE IF NOT EXISTS public.compensacoes_banco_horas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  minutos INTEGER NOT NULL,
  tipo TEXT DEFAULT 'dia_completo',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.compensacoes_banco_horas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_compensacoes" ON public.compensacoes_banco_horas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



CREATE TABLE public.feriados_locais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  nome TEXT NOT NULL,
  recorrente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feriados_locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_feriados_locais" ON public.feriados_locais
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- Fix feriados_locais policy: change from public to authenticated
DROP POLICY IF EXISTS "users_own_feriados_locais" ON public.feriados_locais;

CREATE POLICY "users_own_feriados_locais" ON public.feriados_locais
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN descontos_fixos numeric NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN vale_alimentacao numeric NOT NULL DEFAULT 0,
  ADD COLUMN auxilio_combustivel numeric NOT NULL DEFAULT 0,
  ADD COLUMN bonificacoes numeric NOT NULL DEFAULT 0,
  ADD COLUMN plano_saude numeric NOT NULL DEFAULT 0,
  ADD COLUMN adiantamentos numeric NOT NULL DEFAULT 0,
  ADD COLUMN outros_descontos_detalhados numeric NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN dia_fechamento_folha integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.dia_fechamento_folha IS '0 = mês civil (dia 1-31). Qualquer outro valor (1-28) = dia de corte da folha.';

ALTER TABLE public.profiles ADD COLUMN hora_extra_percentual_feriado numeric DEFAULT 100;


ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS historico_importado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS historico_inicio DATE;


CREATE OR REPLACE FUNCTION public.delete_my_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.marcacoes_ponto WHERE user_id = auth.uid();
  DELETE FROM public.banco_horas WHERE user_id = auth.uid();
  DELETE FROM public.compensacoes_banco_horas WHERE user_id = auth.uid();
  DELETE FROM public.feriados_locais WHERE user_id = auth.uid();
  DELETE FROM public.ferias WHERE user_id = auth.uid();
  DELETE FROM public.alertas WHERE user_id = auth.uid();
  DELETE FROM public.registros_ponto_historico WHERE registro_id IN (SELECT id FROM public.registros_ponto WHERE user_id = auth.uid());
  DELETE FROM public.registros_ponto WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$;

ALTER TABLE public.marcacoes_ponto DROP CONSTRAINT marcacoes_ponto_origem_check;
ALTER TABLE public.marcacoes_ponto ADD CONSTRAINT marcacoes_ponto_origem_check 
  CHECK (origem = ANY (ARRAY['botao'::text, 'manual'::text, 'correcao'::text, 'importacao_automatica'::text]));

-- Final bootstrap hardening. Keep in sync with
-- supabase/migrations/20260922000000_harden_definer_search_paths.sql.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_my_account();

CREATE FUNCTION public.delete_my_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22004';
  END IF;

  DELETE FROM public.marcacoes_ponto WHERE user_id = target_user_id;
  DELETE FROM public.banco_horas WHERE user_id = target_user_id;
  DELETE FROM public.compensacoes_banco_horas WHERE user_id = target_user_id;
  DELETE FROM public.feriados_locais WHERE user_id = target_user_id;
  DELETE FROM public.ferias WHERE user_id = target_user_id;
  DELETE FROM public.alertas WHERE user_id = target_user_id;
  DELETE FROM public.registros_ponto_historico
  WHERE registro_id IN (
    SELECT id FROM public.registros_ponto WHERE user_id = target_user_id
  );
  DELETE FROM public.registros_ponto WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(UUID) TO service_role;

-- Block new medical-attachment uploads while the account-deletion workflow
-- inventories and removes the user's Storage prefix.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_deletion_pending BOOLEAN NOT NULL DEFAULT false;

REVOKE UPDATE (account_deletion_pending)
  ON public.profiles FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can upload atestados" ON storage.objects;
CREATE POLICY "Users can upload atestados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'atestados'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.account_deletion_pending IS FALSE
  )
);

-- Versioned acceptance of both public legal documents; legacy boolean is not backfilled.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aceite_termos_versao TEXT,
  ADD COLUMN IF NOT EXISTS aceite_termos_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aceite_privacidade_versao TEXT,
  ADD COLUMN IF NOT EXISTS aceite_privacidade_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  termos_versao TEXT NOT NULL,
  privacidade_versao TEXT NOT NULL,
  aceito_em TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, termos_versao, privacidade_versao)
);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (aceite_termos) ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  aceite_termos_versao,
  aceite_termos_em,
  aceite_privacidade_versao,
  aceite_privacidade_em
) ON public.profiles FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_legal_acceptance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
  acceptance_time TIMESTAMPTZ := now();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET aceite_termos = TRUE,
      aceite_termos_versao = '2026-09-22',
      aceite_termos_em = acceptance_time,
      aceite_privacidade_versao = '2026-09-22',
      aceite_privacidade_em = acceptance_time
  WHERE id = actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.legal_acceptances (user_id, termos_versao, privacidade_versao, aceito_em)
  VALUES (actor_id, '2026-09-22', '2026-09-22', acceptance_time)
  ON CONFLICT (user_id, termos_versao, privacidade_versao) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_legal_acceptance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance() TO authenticated;

COMMENT ON TABLE public.legal_acceptances IS
  'Append-only audit of the exact public Terms and Privacy Policy versions explicitly accepted by each account.';

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

