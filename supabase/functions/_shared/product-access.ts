import { getTrialAccess } from './trial-access.ts';

export interface ProductAccessProfile {
  plano?: string | null;
  plano_vencimento?: string | null;
  is_pro?: boolean | null;
  subscription_status?: string | null;
  created_at?: string | null;
}

/** Mirrors the app's PRO/trial policy for server-side exports. */
export function hasProductAccess(
  profile: ProductAccessProfile | null | undefined,
  now = new Date(),
): boolean {
  if (!profile) return false;

  const rawExpiration = profile.plano_vencimento?.trim();
  let notExpired = !rawExpiration;
  if (rawExpiration) {
    const expiration = new Date(rawExpiration);
    if (Number.isNaN(expiration.getTime())) return false;
    notExpired = expiration > now;
  }

  const paidPlan = profile.plano === 'pro' || profile.plano === 'anual';
  const activeGrant = profile.is_pro === true ||
    String(profile.subscription_status ?? '').toLowerCase() === 'active';
  if (notExpired && (paidPlan || activeGrant)) return true;

  return getTrialAccess(profile.created_at, now).active;
}
