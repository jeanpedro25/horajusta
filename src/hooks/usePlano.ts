import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTrialAccess } from '../../supabase/functions/_shared/trial-access';

export type PlanoStatus = 'pro' | 'anual' | 'trial' | 'expirado';

export interface PlanoInfo {
  status: PlanoStatus;
  isPro: boolean;
  isTrial: boolean;
  isExpirado: boolean;
  diasRestantesTrial: number;
  /** Acesso irrestrito: plano pago ativo, flags no perfil, ou trial de 7 dias */
  podeUsarPro: boolean;
}

export function usePlano(): PlanoInfo {
  const { profile, user } = useAuth();

  return useMemo(() => {
    const agora = new Date();
    const rawVenc = (profile as { plano_vencimento?: string | null })?.plano_vencimento;
    const vencimento = rawVenc ? new Date(rawVenc) : null;
    const vencimentoValido = vencimento && !Number.isNaN(vencimento.getTime());
    const vencimentoMalformado = Boolean(rawVenc) && !vencimentoValido;

    if (vencimentoMalformado) {
      return {
        status: 'expirado',
        isPro: false,
        isTrial: false,
        isExpirado: true,
        diasRestantesTrial: 0,
        podeUsarPro: false,
      };
    }

    const planoId = profile?.plano;
    const ehPlanoPago = planoId === 'pro' || planoId === 'anual';
    const isProFlag = (profile as { is_pro?: boolean })?.is_pro === true;
    const subAtivo =
      String((profile as { subscription_status?: string | null })?.subscription_status || '')
        .toLowerCase() === 'active';

    const planoPagoAtivo = ehPlanoPago && !vencimentoMalformado && (!vencimentoValido || vencimento! > agora);
    const flagsAtivas =
      (isProFlag || subAtivo) && !vencimentoMalformado && (!vencimentoValido || vencimento! > agora);

    if (planoPagoAtivo || flagsAtivas) {
      const st: PlanoStatus =
        planoId === 'anual' ? 'anual' : planoId === 'pro' ? 'pro' : 'pro';
      return {
        status: st,
        isPro: true,
        isTrial: false,
        isExpirado: false,
        diasRestantesTrial: 0,
        podeUsarPro: true,
      };
    }

    const trial = getTrialAccess(profile?.created_at || user?.created_at, agora);
    if (trial.active) {
      return {
        status: 'trial',
        isPro: false,
        isTrial: true,
        isExpirado: false,
        diasRestantesTrial: trial.daysRemaining,
        podeUsarPro: true,
      };
    }

    return {
      status: 'expirado',
      isPro: false,
      isTrial: false,
      isExpirado: true,
      diasRestantesTrial: 0,
      podeUsarPro: false,
    };
  }, [profile, user]);
}
