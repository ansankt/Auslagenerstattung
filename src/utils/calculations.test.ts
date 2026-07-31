import { describe, expect, it } from 'vitest';
import { calculateGross, calculateTotals } from './calculations';

describe('calculations', () => {
  it('calculates gross from net and VAT', () => {
    expect(calculateGross(10.25, 1.95)).toBe(12.2);
  });

  it('calculates net, VAT and gross totals', () => {
    expect(
      calculateTotals([
        { id: '1', date: '2026-07-31', receipt: 'A1', description: '', net: 10, vat: 1.9 },
        { id: '2', date: '2026-07-31', receipt: 'A2', description: '', net: 20, vat: 3.8 },
      ]),
    ).toEqual({ net: 30, vat: 5.7, gross: 35.7 });
  });
});
