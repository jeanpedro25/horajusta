import { describe, expect, it } from 'vitest';
import {
  buildMercadoPagoManifest,
  hmacSha256Hex,
  isFreshMercadoPagoTimestamp,
  matchesMercadoPagoDataId,
  parseMercadoPagoSignature,
  safeEqualHex,
  verifyMercadoPagoSignature,
} from './mercado-pago-signature';

describe('Mercado Pago webhook signature helpers', () => {
  it('parses named fields regardless of order and whitespace', () => {
    expect(parseMercadoPagoSignature(`v1=${'a'.repeat(64)}, ts=1780000000`)).toEqual({
      ts: '1780000000',
      v1: 'a'.repeat(64),
    });
  });

  it('rejects malformed timestamps and non-SHA256 signatures', () => {
    expect(parseMercadoPagoSignature('ts=soon,v1=abcdef')).toBeNull();
    expect(parseMercadoPagoSignature('ts=1780000000,v1=abcdef')).toBeNull();
    expect(parseMercadoPagoSignature(`ts=1780000000,ts=1780000001,v1=${'a'.repeat(64)}`)).toBeNull();
    expect(parseMercadoPagoSignature(null)).toBeNull();
  });

  it('builds the documented manifest and normalizes alphanumeric IDs to lowercase', () => {
    expect(buildMercadoPagoManifest('ORD01ABC', 'req-123', '1780000000'))
      .toBe('id:ord01abc;request-id:req-123;ts:1780000000;');
  });

  it('requires the signed query ID to match the body ID without case sensitivity', () => {
    expect(matchesMercadoPagoDataId('ORD01ABC', 'ord01abc')).toBe(true);
    expect(matchesMercadoPagoDataId('payment-1', 'payment-2')).toBe(false);
    expect(matchesMercadoPagoDataId('', '')).toBe(false);
  });

  it('accepts recent seconds or millisecond timestamps and rejects stale/future values', () => {
    const now = 1_780_000_000_000;
    expect(isFreshMercadoPagoTimestamp('1780000000', now)).toBe(true);
    expect(isFreshMercadoPagoTimestamp('1780000000000', now)).toBe(true);
    expect(isFreshMercadoPagoTimestamp('1779999699', now)).toBe(false);
    expect(isFreshMercadoPagoTimestamp('1780000301', now)).toBe(false);
    expect(isFreshMercadoPagoTimestamp('1.78e9', now)).toBe(false);
  });

  it('compares hex signatures safely and rejects malformed values', () => {
    expect(safeEqualHex('ABCD', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abc')).toBe(false);
    expect(safeEqualHex('xyz', 'xyz')).toBe(false);
  });

  it('verifies a real HMAC over the documented manifest', async () => {
    const manifest = 'id:12345;request-id:req-123;ts:1780000000;';
    const digest = await hmacSha256Hex('test-secret', manifest);
    expect(digest).toMatch(/^[a-f\d]{64}$/);
    expect(await verifyMercadoPagoSignature(
      'test-secret', '12345', 'req-123', `ts=1780000000,v1=${digest}`, 1_780_000_000_000,
    )).toBe(true);
    expect(await verifyMercadoPagoSignature(
      'wrong-secret', '12345', 'req-123', `ts=1780000000,v1=${digest}`, 1_780_000_000_000,
    )).toBe(false);
  });
});
