-- ============================================================
-- Migration: Fix missing FKs and add critical indexes
-- Apply via Supabase Studio → SQL Editor
-- ============================================================

-- 1. banco_horas — add FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'banco_horas_user_id_fkey'
  ) THEN
    ALTER TABLE public.banco_horas
      ADD CONSTRAINT banco_horas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. compensacoes_banco_horas — add FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'compensacoes_banco_horas_user_id_fkey'
  ) THEN
    ALTER TABLE public.compensacoes_banco_horas
      ADD CONSTRAINT compensacoes_banco_horas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. ferias — add FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ferias_user_id_fkey'
  ) THEN
    ALTER TABLE public.ferias
      ADD CONSTRAINT ferias_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. feriados_locais — add FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feriados_locais_user_id_fkey'
  ) THEN
    ALTER TABLE public.feriados_locais
      ADD CONSTRAINT feriados_locais_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. marcacoes_ponto — add FK to profiles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marcacoes_ponto_user_id_fkey'
  ) THEN
    ALTER TABLE public.marcacoes_ponto
      ADD CONSTRAINT marcacoes_ponto_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Add missing index on banco_horas (user_id + data) for monthly queries
CREATE INDEX IF NOT EXISTS idx_banco_horas_user_data
  ON public.banco_horas(user_id, data DESC);

-- 7. Add missing index on compensacoes_banco_horas
CREATE INDEX IF NOT EXISTS idx_compensacoes_user_data
  ON public.compensacoes_banco_horas(user_id, data DESC);

-- 8. Add index on ferias user_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_ferias_user_data
  ON public.ferias(user_id, data_inicio DESC);

-- 9. Add index on alertas user_id + created_at for dashboard
CREATE INDEX IF NOT EXISTS idx_alertas_user_created
  ON public.alertas(user_id, created_at DESC);

-- 10. Partial index: active (non-deleted) marcacoes only — most queries filter deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_marcacoes_user_data_active
  ON public.marcacoes_ponto(user_id, data DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_banco_horas_user_data IS 'Fast monthly banco_horas queries per user';
COMMENT ON INDEX public.idx_marcacoes_user_data_active IS 'Covers the most common active marcacoes lookup pattern';
