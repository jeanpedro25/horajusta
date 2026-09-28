import { describe, expect, it } from 'vitest';
import { buildCorsHeaders } from './cors';

describe('buildCorsHeaders', () => {
  it('allows the configured app origin and declares checkout preflight methods', () => {
    const headers = buildCorsHeaders('https://preview.horajusta.app', 'https://preview.horajusta.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://preview.horajusta.app');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toContain('authorization');
    expect(headers['Access-Control-Allow-Headers']).toContain('content-type');
  });

  it('does not reflect an untrusted request origin', () => {
    const headers = buildCorsHeaders('https://attacker.example', 'https://horajusta.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://horajusta.app');
    expect(headers.Vary).toBe('Origin');
  });

  it('normalizes APP_URL paths and trailing slashes to the browser origin', () => {
    const headers = buildCorsHeaders('https://preview.horajusta.app', 'https://preview.horajusta.app/review/');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://preview.horajusta.app');
  });

  it('fails closed when APP_URL is malformed', () => {
    const headers = buildCorsHeaders('https://attacker.example', 'not a URL');
    expect(headers['Access-Control-Allow-Origin']).toBe('null');
  });

  it('preserves non-default ports as part of the allowed origin', () => {
    const headers = buildCorsHeaders('http://localhost:4173', 'http://localhost:4173/preview');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:4173');
  });
});
