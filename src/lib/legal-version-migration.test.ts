import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENT_VERSION } from './legal-versions';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260922020000_versioned_legal_acceptance.sql');
const bootstrapPath = resolve(process.cwd(), 'migrations_all.sql');
const paymentMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260922030000_atomic_payment_event_apply.sql');
const checkoutMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260922040000_atomic_checkout_reservations.sql');

function versionLiterals(sql: string): string[] {
  const functionStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.record_legal_acceptance()');
  if (functionStart < 0) return [];
  return [...sql.slice(functionStart).matchAll(/'([0-9]{4}-[0-9]{2}-[0-9]{2})'/g)]
    .map(match => match[1]);
}

describe('legal document version migration parity', () => {
  it('keeps the frontend, incremental migration and bootstrap acceptance versions aligned', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    const bootstrap = readFileSync(bootstrapPath, 'utf8');

    expect(versionLiterals(migration)).toEqual(Array(4).fill(LEGAL_DOCUMENT_VERSION));
    expect(versionLiterals(bootstrap)).toEqual(Array(4).fill(LEGAL_DOCUMENT_VERSION));
  });

  it('keeps the atomic payment migration identical to its bootstrap copy', () => {
    const paymentMigration = readFileSync(paymentMigrationPath, 'utf8').trim();
    const bootstrap = readFileSync(bootstrapPath, 'utf8');
    const marker = '-- Serialize repeated/out-of-order Mercado Pago notifications per payment ID.';
    const copyStart = bootstrap.lastIndexOf(marker);
    const checkoutStart = bootstrap.lastIndexOf('-- Prevent concurrent payment preferences for the same account and allow safe link resumption.');

    expect(copyStart).toBeGreaterThanOrEqual(0);
    expect(checkoutStart).toBeGreaterThan(copyStart);
    expect(bootstrap.slice(copyStart, checkoutStart).trim()).toBe(paymentMigration);
  });

  it('keeps the atomic checkout migration identical to its bootstrap copy', () => {
    const checkoutMigration = readFileSync(checkoutMigrationPath, 'utf8').trim();
    const bootstrap = readFileSync(bootstrapPath, 'utf8');
    const marker = '-- Prevent concurrent payment preferences for the same account and allow safe link resumption.';
    const copyStart = bootstrap.lastIndexOf(marker);

    expect(copyStart).toBeGreaterThanOrEqual(0);
    expect(bootstrap.slice(copyStart).trim()).toBe(checkoutMigration);
  });

  it('preserves checkout reservation concurrency, recovery, and terminal-state invariants', () => {
    const checkoutMigration = readFileSync(checkoutMigrationPath, 'utf8');

    expect(checkoutMigration).toContain("pg_advisory_xact_lock(");
    expect(checkoutMigration).toContain("external_reference = EXCLUDED.external_reference");
    expect(checkoutMigration).toContain("preference_id = COALESCE(preference_id, p_preference_id)");
    expect(checkoutMigration).toContain("status = CASE WHEN status = 'completed' THEN status ELSE 'open' END");
    expect(checkoutMigration).toContain("external_reference = p_external_reference");
    expect(checkoutMigration).toContain("GRANT EXECUTE ON FUNCTION public.release_mp_checkout(UUID, TEXT) TO service_role");
    expect(checkoutMigration).toContain("FROM PUBLIC, anon, authenticated;");
  });
});
