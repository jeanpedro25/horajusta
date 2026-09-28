import { describe, expect, it } from 'vitest';
import { addCalendarMonths } from '../../supabase/functions/_shared/entitlement-period';

describe('addCalendarMonths', () => {
  it('clamps a monthly renewal from the 31st to the last day of February', () => {
    expect(addCalendarMonths(new Date('2025-01-31T10:30:00.000Z'), 1).toISOString())
      .toBe('2025-02-28T10:30:00.000Z');
  });

  it('clamps to 30 days for a target month with 30 days', () => {
    expect(addCalendarMonths(new Date('2025-03-31T10:30:00.000Z'), 1).toISOString())
      .toBe('2025-04-30T10:30:00.000Z');
  });

  it('clamps an annual period from leap day to the last day of February', () => {
    expect(addCalendarMonths(new Date('2024-02-29T10:30:00.000Z'), 12).toISOString())
      .toBe('2025-02-28T10:30:00.000Z');
  });

  it('preserves the time and ordinary day when no clamping is needed', () => {
    expect(addCalendarMonths(new Date('2025-05-15T22:45:12.123Z'), 1).toISOString())
      .toBe('2025-06-15T22:45:12.123Z');
  });

  it('rejects invalid dates and non-integer periods', () => {
    expect(() => addCalendarMonths(new Date('invalid'), 1)).toThrow('invalid_entitlement_period');
    expect(() => addCalendarMonths(new Date('2025-01-01T00:00:00.000Z'), 1.5)).toThrow('invalid_entitlement_period');
  });
});
