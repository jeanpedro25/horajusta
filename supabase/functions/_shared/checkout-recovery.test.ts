import { describe, expect, it, vi } from 'vitest';
import { recoverMercadoPagoCheckout } from './checkout-recovery';

const reference = 'user-id|pro|attempt-token';
const goodPreference = {
  id: 'preference-1',
  external_reference: reference,
  init_point: 'https://www.mercadopago.com/checkout/production',
  sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/test',
};

function response(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), { status: ok ? 200 : 503 });
}

describe('recoverMercadoPagoCheckout', () => {
  it('recovers exactly one preference and chooses only the configured environment URL', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ elements: [{ id: goodPreference.id }] }))
      .mockResolvedValueOnce(response(goodPreference));

    await expect(recoverMercadoPagoCheckout(reference, 'test-token', 'sandbox', fetcher))
      .resolves.toEqual({ kind: 'found', id: goodPreference.id, url: goodPreference.sandbox_init_point });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0].toString()).toContain(encodeURIComponent(reference));
  });

  it('does not invent a checkout when search finds none or multiple preferences', async () => {
    const noResults = vi.fn().mockResolvedValueOnce(response({ elements: [] }));
    const duplicates = vi.fn().mockResolvedValueOnce(response({ elements: [{ id: '1' }, { id: '2' }] }));

    await expect(recoverMercadoPagoCheckout(reference, 'token', 'sandbox', noResults))
      .resolves.toEqual({ kind: 'none' });
    await expect(recoverMercadoPagoCheckout(reference, 'token', 'sandbox', duplicates))
      .resolves.toEqual({ kind: 'multiple' });
    expect(duplicates).toHaveBeenCalledTimes(1);
  });

  it('rejects a reference mismatch or an untrusted checkout URL', async () => {
    const referenceMismatch = vi.fn()
      .mockResolvedValueOnce(response({ elements: [{ id: goodPreference.id }] }))
      .mockResolvedValueOnce(response({ ...goodPreference, external_reference: 'other-reference' }));
    const unsafeUrl = vi.fn()
      .mockResolvedValueOnce(response({ elements: [{ id: goodPreference.id }] }))
      .mockResolvedValueOnce(response({ ...goodPreference, init_point: 'https://evil.example/pay' }));

    await expect(recoverMercadoPagoCheckout(reference, 'token', 'production', referenceMismatch))
      .resolves.toEqual({ kind: 'invalid' });
    await expect(recoverMercadoPagoCheckout(reference, 'token', 'production', unsafeUrl))
      .resolves.toEqual({ kind: 'invalid' });
  });

  it('treats provider and network failures as unavailable without releasing the reservation', async () => {
    const providerError = vi.fn().mockResolvedValueOnce(response({}, false));
    const networkError = vi.fn().mockRejectedValueOnce(new Error('network timeout'));

    await expect(recoverMercadoPagoCheckout(reference, 'token', 'sandbox', providerError))
      .resolves.toEqual({ kind: 'unavailable' });
    await expect(recoverMercadoPagoCheckout(reference, 'token', 'sandbox', networkError))
      .resolves.toEqual({ kind: 'unavailable' });
  });
});
