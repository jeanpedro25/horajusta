-- Harden SECURITY DEFINER routines against object shadowing on writable schemas.
-- Keep every referenced relation/function schema-qualified with an empty search_path.

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

-- Remove the legacy authenticated RPC: direct calls bypass the Edge Function's
-- Storage cleanup and can orphan uploaded medical documents.
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
