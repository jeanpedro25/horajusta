import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanoCheckout = 'pro' | 'anual';

export interface CheckoutResult {
  /** URL já selecionada pela Edge Function para o modo ativo (produção ou sandbox). */
  checkout_url: string | null;
  error?: string;
}

export interface EntitlementProfile {
  plano?: string | null;
  plano_vencimento?: string | null;
  is_pro?: boolean | null;
  subscription_status?: string | null;
}

/** A URL de retorno sozinha não concede acesso; é preciso observar o perfil atualizado pelo webhook. */
export function hasPlanAccess(
  profile: EntitlementProfile | null | undefined,
  expectedPlan: PlanoCheckout,
  now = new Date(),
): boolean {
  if (!profile || profile.plano !== expectedPlan || profile.is_pro !== true) return false;
  if (String(profile.subscription_status ?? '').toLowerCase() !== 'active') return false;
  if (!profile.plano_vencimento) return false;
  const expiration = new Date(profile.plano_vencimento);
  return !Number.isNaN(expiration.getTime()) && expiration > now;
}

export function isMercadoPagoCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trustedHost = ['mercadopago.com', 'mercadopago.com.br'].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    return url.protocol === 'https:' && trustedHost && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Cria preferência Checkout Pro no Mercado Pago (Edge Function) e retorna URL de redirecionamento.
 */
export async function iniciarCheckoutMercadoPago(
  supabase: SupabaseClient,
  plano: PlanoCheckout,
): Promise<CheckoutResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { checkout_url: null, error: 'Sua sessão expirou. Entre novamente para continuar.' };
  }
  const headers: Record<string, string> = {};
  headers.Authorization = `Bearer ${session.access_token}`;

  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { plano },
    headers,
  });

  if (error) {
    let message = error.message;
    const context = (error as typeof error & { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json() as { error?: unknown };
        if (typeof body.error === 'string' && body.error.trim()) message = body.error;
      } catch {
        // Fall back to the SDK message when the Edge Function did not return JSON.
      }
    }
    return { checkout_url: null, error: message };
  }
  const payload = data as { checkout_url?: string; error?: string } | null;
  if (payload?.error) {
    return { checkout_url: null, error: payload.error };
  }
  const url = payload?.checkout_url || null;
  if (url && !isMercadoPagoCheckoutUrl(url)) {
    return { checkout_url: null, error: 'O checkout retornou um endereço inválido. Tente novamente mais tarde.' };
  }
  if (!url) return { checkout_url: null, error: 'O checkout não retornou um endereço válido. Tente novamente mais tarde.' };
  return { checkout_url: url };
}
