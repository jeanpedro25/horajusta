-- Record an explicit, versioned acceptance of both public legal documents.
-- The existing boolean alone is intentionally not backfilled into this audit record.
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

-- Prevent clients from asserting consent with a direct profile UPDATE.
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
