import { describe, expect, it } from 'vitest';
import { matchesExpectedMercadoPagoPayment } from '../../supabase/functions/_shared/mercado-pago-payment';

describe('matchesExpectedMercadoPagoPayment', () => {
  it('accepts only the configured BRL amount and collector', () => {
    expect(matchesExpectedMercadoPagoPayment(9.9, 'BRL', 'seller-1', 9.9, 'seller-1')).toBe(true);
    expect(matchesExpectedMercadoPagoPayment(9.9005, 'BRL', 'seller-1', 9.9, 'seller-1')).toBe(true);
  });

  it('rejects missing, non-finite, mismatched and malformed payment values', () => {
    for (const amount of [undefined, null, '9.90', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(matchesExpectedMercadoPagoPayment(amount, 'BRL', 'seller-1', 9.9, 'seller-1')).toBe(false);
    }
    expect(matchesExpectedMercadoPagoPayment(9.9, 'USD', 'seller-1', 9.9, 'seller-1')).toBe(false);
    expect(matchesExpectedMercadoPagoPayment(9.9, 'BRL', 'another-seller', 9.9, 'seller-1')).toBe(false);
    expect(matchesExpectedMercadoPagoPayment(10, 'BRL', 'seller-1', 9.9, 'seller-1')).toBe(false);
  });
});
