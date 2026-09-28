import { describe, expect, it } from 'vitest';
import { getLandingScrollBehavior } from './landing-scroll';

describe('landing section navigation', () => {
  it('avoids animated scrolling when reduced motion is preferred', () => {
    expect(getLandingScrollBehavior(true)).toBe('auto');
  });

  it('keeps smooth scrolling for visitors without a reduced-motion preference', () => {
    expect(getLandingScrollBehavior(false)).toBe('smooth');
  });
});
