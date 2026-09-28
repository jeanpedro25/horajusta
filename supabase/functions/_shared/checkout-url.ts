interface MercadoPagoPreferenceUrls {
  init_point?: unknown;
  sandbox_init_point?: unknown;
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

/** Production is the default; sandbox must be selected explicitly and never falls back to production. */
export function selectCheckoutUrl(
  preference: MercadoPagoPreferenceUrls,
  mode: string | undefined,
): string | null {
  const candidate = mode === 'sandbox' ? preference.sandbox_init_point : preference.init_point;
  return typeof candidate === 'string' && candidate.trim() && isMercadoPagoCheckoutUrl(candidate.trim())
    ? candidate.trim()
    : null;
}
