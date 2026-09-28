import { describe, expect, it } from 'vitest';
import { hasCurrentLegalAcceptance, LEGAL_DOCUMENT_VERSION } from './legal-versions';

describe('hasCurrentLegalAcceptance', () => {
  it('accepts only when both current documents have server-recorded timestamps', () => {
    const accepted = {
      aceite_termos: true,
      aceite_termos_versao: LEGAL_DOCUMENT_VERSION,
      aceite_termos_em: '2026-09-22T12:00:00.000Z',
      aceite_privacidade_versao: LEGAL_DOCUMENT_VERSION,
      aceite_privacidade_em: '2026-09-22T12:00:00.000Z',
    };
    expect(hasCurrentLegalAcceptance(accepted)).toBe(true);
    expect(hasCurrentLegalAcceptance({ ...accepted, aceite_privacidade_em: null })).toBe(false);
    expect(hasCurrentLegalAcceptance({ ...accepted, aceite_termos_versao: 'old-version' })).toBe(false);
  });

  it('does not treat the legacy boolean as proof of current-version acceptance', () => {
    expect(hasCurrentLegalAcceptance({ aceite_termos: true })).toBe(false);
    expect(hasCurrentLegalAcceptance(null)).toBe(false);
  });
});
