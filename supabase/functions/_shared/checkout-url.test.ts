import { describe, expect, it } from 'vitest';
import { isMercadoPagoCheckoutUrl, selectCheckoutUrl } from './checkout-url';

const preference = {
  init_point: 'https://www.mercadopago.com/checkout/production',
  sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/test',
};

describe('selectCheckoutUrl', () => {
  it('uses production by default to preserve existing deployment behavior', () => {
    expect(selectCheckoutUrl(preference, undefined)).toBe(preference.init_point);
    expect(selectCheckoutUrl(preference, 'production')).toBe(preference.init_point);
  });

  it('selects sandbox only when explicitly configured', () => {
    expect(selectCheckoutUrl(preference, 'sandbox')).toBe(preference.sandbox_init_point);
  });

  it('fails closed if the selected environment URL is missing', () => {
    expect(selectCheckoutUrl({ init_point: preference.init_point }, 'sandbox')).toBeNull();
  });

  it('rejects lookalike, credential-bearing, and non-HTTPS checkout URLs', () => {
    expect(isMercadoPagoCheckoutUrl('https://mercadopago.com.attacker.example/checkout')).toBe(false);
    expect(isMercadoPagoCheckoutUrl('https://user@www.mercadopago.com/checkout')).toBe(false);
    expect(isMercadoPagoCheckoutUrl('http://www.mercadopago.com/checkout')).toBe(false);
    expect(selectCheckoutUrl({ init_point: 'https://attacker.example/checkout' }, 'production')).toBeNull();
  });
});
