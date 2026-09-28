import { isMercadoPagoCheckoutUrl, selectCheckoutUrl } from './checkout-url.ts';

export type CheckoutRecoveryResult =
  | { kind: 'found'; id: string; url: string }
  | { kind: 'none' | 'multiple' | 'unavailable' | 'invalid' };

export async function recoverMercadoPagoCheckout(
  externalReference: string,
  accessToken: string,
  mode: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<CheckoutRecoveryResult> {
  try {
    const searchUrl = new URL('https://api.mercadopago.com/checkout/preferences/search');
    searchUrl.searchParams.set('external_reference', externalReference);
    searchUrl.searchParams.set('limit', '10');
    const searchResponse = await fetcher(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!searchResponse.ok) return { kind: 'unavailable' };

    const searchResult = await searchResponse.json() as { elements?: Array<{ id?: string | number }> };
    const elements = Array.isArray(searchResult.elements) ? searchResult.elements : [];
    if (!elements.length) return { kind: 'none' };
    if (elements.length !== 1 || !elements[0]?.id) return { kind: 'multiple' };

    const preferenceId = String(elements[0].id);
    const preferenceResponse = await fetcher(
      `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(preferenceId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!preferenceResponse.ok) return { kind: 'unavailable' };

    const preference = await preferenceResponse.json() as Record<string, unknown>;
    if (String(preference.external_reference ?? '') !== externalReference) return { kind: 'invalid' };
    const url = selectCheckoutUrl(preference, mode);
    if (!url || !isMercadoPagoCheckoutUrl(url) || String(preference.id ?? '') !== preferenceId) {
      return { kind: 'invalid' };
    }
    return { kind: 'found', id: preferenceId, url };
  } catch {
    return { kind: 'unavailable' };
  }
}
