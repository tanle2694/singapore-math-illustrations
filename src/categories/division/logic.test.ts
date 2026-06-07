import { describe, it, expect } from 'vitest';
import { computeDivision } from './logic';

describe('computeDivision', () => {
  it('computes exact division with no remainder', () => {
    const r = computeDivision(12, 4);
    expect(r.quotient).toBe(3);
    expect(r.remainder).toBe(0);
  });

  it('computes division with remainder', () => {
    const r = computeDivision(14, 3);
    expect(r.quotient).toBe(4);
    expect(r.remainder).toBe(2);
  });

  it('handles divisor equal to total', () => {
    const r = computeDivision(5, 5);
    expect(r.quotient).toBe(1);
    expect(r.remainder).toBe(0);
  });

  it('handles divisor of 1', () => {
    const r = computeDivision(17, 1);
    expect(r.quotient).toBe(17);
    expect(r.remainder).toBe(0);
  });

  it('satisfies total = quotient * divisor + remainder', () => {
    const cases = [
      { total: 14, divisor: 3 },
      { total: 20, divisor: 7 },
      { total: 1, divisor: 1 },
      { total: 99, divisor: 10 },
    ];
    for (const { total, divisor } of cases) {
      const { quotient, remainder } = computeDivision(total, divisor);
      expect(quotient * divisor + remainder).toBe(total);
    }
  });
});
