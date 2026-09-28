import { describe, expect, it } from 'vitest';
import {
  ANNUAL_SAVINGS_CENTS,
  formatBRLCents,
  getPlanDurationLabel,
  isPaidPlanId,
  PLAN_CATALOG,
} from './plan-catalog';

describe('single source of truth for PRO plans', () => {
  it('keeps prices and access durations aligned with the product offer', () => {
    expect(PLAN_CATALOG.pro.amountCents).toBe(990);
    expect(PLAN_CATALOG.pro.durationMonths).toBe(1);
    expect(PLAN_CATALOG.anual.amountCents).toBe(8990);
    expect(PLAN_CATALOG.anual.durationMonths).toBe(12);
    expect(getPlanDurationLabel('pro')).toBe('1 mês');
    expect(getPlanDurationLabel('anual')).toBe('12 meses');
  });

  it('calculates and formats the annual saving from catalog prices', () => {
    expect(ANNUAL_SAVINGS_CENTS).toBe(2890);
    expect(formatBRLCents(ANNUAL_SAVINGS_CENTS)).toBe('R$ 28,90');
  });

  it('rejects unknown or inherited object keys as plan identifiers', () => {
    expect(isPaidPlanId('pro')).toBe(true);
    expect(isPaidPlanId('anual')).toBe(true);
    expect(isPaidPlanId('free')).toBe(false);
    expect(isPaidPlanId('toString')).toBe(false);
    expect(isPaidPlanId(null)).toBe(false);
  });
});
