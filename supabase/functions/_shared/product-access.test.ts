import { describe, expect, it } from 'vitest';
import { hasProductAccess } from './product-access';

const now = new Date('2026-09-22T12:00:00.000Z');

describe('hasProductAccess', () => {
  it('accepts a current paid plan or a manual active grant', () => {
    expect(hasProductAccess({ plano: 'pro', plano_vencimento: '2026-10-22T12:00:00Z' }, now)).toBe(true);
    expect(hasProductAccess({ plano: 'anual', is_pro: true, plano_vencimento: null }, now)).toBe(true);
  });

  it('rejects expired or malformed entitlements and flags without a valid expiration', () => {
    expect(hasProductAccess({ plano: 'pro', plano_vencimento: '2026-09-22T11:59:59Z' }, now)).toBe(false);
    expect(hasProductAccess({ subscription_status: 'active', plano_vencimento: 'not-a-date' }, now)).toBe(false);
    expect(hasProductAccess({ is_pro: true, plano_vencimento: 'not-a-date' }, now)).toBe(false);
    expect(hasProductAccess({ plano: 'free', created_at: '2026-09-22T11:00:00Z', plano_vencimento: 'not-a-date' }, now)).toBe(false);
  });

  it('keeps the seven-day trial and rejects old, future or invalid account dates', () => {
    expect(hasProductAccess({ plano: 'free', created_at: '2026-09-18T12:00:00Z' }, now)).toBe(true);
    expect(hasProductAccess({ plano: 'free', created_at: '2026-09-15T11:59:59Z' }, now)).toBe(false);
    expect(hasProductAccess({ plano: 'free', created_at: '2026-09-23T12:00:00Z' }, now)).toBe(false);
    expect(hasProductAccess({ plano: 'free', created_at: 'invalid' }, now)).toBe(false);
  });
});
