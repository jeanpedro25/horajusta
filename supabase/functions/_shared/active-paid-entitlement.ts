export interface CheckoutEntitlementProfile {
  plano?: string | null;
  plano_vencimento?: string | null;
  is_pro?: boolean | null;
  subscription_status?: string | null;
}

/** Mirrors the app's entitlement rule so an active account cannot create a duplicate paid checkout. */
export function hasActivePaidEntitlement(
  profile: CheckoutEntitlementProfile | null | undefined,
  now = new Date(),
): boolean {
  if (!profile) return false;

  const expiration = profile.plano_vencimento ? new Date(profile.plano_vencimento) : null;
  const notExpired = !expiration || Number.isNaN(expiration.getTime()) || expiration > now;
  const paidPlan = profile.plano === "pro" || profile.plano === "anual";
  const activeFlag = profile.is_pro === true ||
    String(profile.subscription_status ?? "").toLowerCase() === "active";

  return notExpired && (paidPlan || activeFlag);
}
