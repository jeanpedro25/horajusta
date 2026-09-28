import { describe, expect, it } from 'vitest';
import { getTrialAccess } from './trial-access';

const start = new Date('2026-09-22T12:00:00.000Z');

describe('getTrialAccess', () => {
  it('grants seven days from account creation and counts any partial day as remaining', () => {
    expect(getTrialAccess(start.toISOString(), start)).toEqual({ active: true, daysRemaining: 7 });
    expect(getTrialAccess(start.toISOString(), new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)))
      .toEqual({ active: true, daysRemaining: 1 });
    expect(getTrialAccess(start.toISOString(), new Date(start.getTime() + 6.99 * 24 * 60 * 60 * 1000)))
      .toEqual({ active: true, daysRemaining: 1 });
  });

  it('ends access at the exact seven-day boundary', () => {
    expect(getTrialAccess(start.toISOString(), new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)))
      .toEqual({ active: false, daysRemaining: 0 });
  });

  it('fails closed for missing, malformed, or future account creation dates', () => {
    expect(getTrialAccess(null, start)).toEqual({ active: false, daysRemaining: 0 });
    expect(getTrialAccess('not-a-date', start)).toEqual({ active: false, daysRemaining: 0 });
    expect(getTrialAccess(new Date(start.getTime() + 1000).toISOString(), start))
      .toEqual({ active: false, daysRemaining: 0 });
    expect(getTrialAccess(start.toISOString(), new Date(Number.NaN)))
      .toEqual({ active: false, daysRemaining: 0 });
  });
});
