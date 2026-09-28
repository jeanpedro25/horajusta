export const LEGAL_DOCUMENT_VERSION = '2026-09-22';

export interface LegalAcceptanceProfile {
  aceite_termos?: boolean | null;
  aceite_termos_versao?: string | null;
  aceite_termos_em?: string | null;
  aceite_privacidade_versao?: string | null;
  aceite_privacidade_em?: string | null;
}

export function hasCurrentLegalAcceptance(
  profile: LegalAcceptanceProfile | null | undefined,
): boolean {
  return Boolean(
    profile?.aceite_termos === true &&
      profile.aceite_termos_versao === LEGAL_DOCUMENT_VERSION &&
      Boolean(profile.aceite_termos_em) &&
      profile.aceite_privacidade_versao === LEGAL_DOCUMENT_VERSION &&
      Boolean(profile.aceite_privacidade_em),
  );
}
