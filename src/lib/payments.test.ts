import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasPlanAccess, iniciarCheckoutMercadoPago, isMercadoPagoCheckoutUrl } from './payments';

const now = new Date('2026-09-22T12:00:00.000Z');
const activeMonthly = {
  plano: 'pro',
  plano_vencimento: '2026-10-22T12:00:00.000Z',
  is_pro: true,
  subscription_status: 'active',
};

describe('hasPlanAccess', () => {
  it('accepts only the requested, active, unexpired plan', () => {
    expect(hasPlanAccess(activeMonthly, 'pro', now)).toBe(true);
    expect(hasPlanAccess(activeMonthly, 'anual', now)).toBe(false);
  });

  it('does not grant access based on a checkout return without webhook entitlement', () => {
    expect(hasPlanAccess(null, 'pro', now)).toBe(false);
    expect(hasPlanAccess({ ...activeMonthly, is_pro: false }, 'pro', now)).toBe(false);
    expect(hasPlanAccess({ ...activeMonthly, subscription_status: 'pending' }, 'pro', now)).toBe(false);
  });

  it('rejects missing, invalid, or expired entitlement dates', () => {
    expect(hasPlanAccess({ ...activeMonthly, plano_vencimento: null }, 'pro', now)).toBe(false);
    expect(hasPlanAccess({ ...activeMonthly, plano_vencimento: 'not-a-date' }, 'pro', now)).toBe(false);
    expect(hasPlanAccess({ ...activeMonthly, plano_vencimento: now.toISOString() }, 'pro', now)).toBe(false);
  });
});

describe('isMercadoPagoCheckoutUrl', () => {
  it('allows HTTPS Mercado Pago checkout hosts, including sandbox', () => {
    expect(isMercadoPagoCheckoutUrl('https://www.mercadopago.com.br/checkout/start?id=1')).toBe(true);
    expect(isMercadoPagoCheckoutUrl('https://sandbox.mercadopago.com/checkout/pay?id=1')).toBe(true);
  });

  it('rejects non-HTTPS, deceptive domains, and malformed URLs', () => {
    expect(isMercadoPagoCheckoutUrl('http://www.mercadopago.com.br/checkout')).toBe(false);
    expect(isMercadoPagoCheckoutUrl('https://mercadopago.com.br.attacker.example/checkout')).toBe(false);
    expect(isMercadoPagoCheckoutUrl('https://attacker.example/?next=mercadopago.com.br')).toBe(false);
    expect(isMercadoPagoCheckoutUrl('not a url')).toBe(false);
  });
});

describe('iniciarCheckoutMercadoPago', () => {
  it('requires a session and sends only the selected plan with the bearer token', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { checkout_url: 'https://www.mercadopago.com/checkout/start' },
      error: null,
    });
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'session-token' } } }) },
      functions: { invoke },
    } as unknown as SupabaseClient;

    const result = await iniciarCheckoutMercadoPago(client, 'pro');

    expect(result.checkout_url).toBe('https://www.mercadopago.com/checkout/start');
    expect(invoke).toHaveBeenCalledWith('create-payment', {
      body: { plano: 'pro' },
      headers: { Authorization: 'Bearer session-token' },
    });
  });

  it('accepts only the server-selected checkout_url, never a raw provider environment fallback', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/start' },
      error: null,
    });
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'session-token' } } }) },
      functions: { invoke },
    } as unknown as SupabaseClient;

    const result = await iniciarCheckoutMercadoPago(client, 'pro');

    expect(result.checkout_url).toBeNull();
    expect(result.error).toMatch(/não retornou um endereço válido/i);
  });

  it('does not call the payment function when the session has expired', async () => {
    const invoke = vi.fn();
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      functions: { invoke },
    } as unknown as SupabaseClient;

    const result = await iniciarCheckoutMercadoPago(client, 'anual');

    expect(result.error).toMatch(/sessão expirou/i);
    expect(invoke).not.toHaveBeenCalled();
  });
});
