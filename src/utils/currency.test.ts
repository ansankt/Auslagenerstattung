import { describe, expect, it } from 'vitest';
import { formatCurrency, parseNumberInput } from './currency';

describe('currency', () => {
  it('formats Euro values for German users', () => {
    expect(formatCurrency(1234.5)).toBe('1.234,50 €');
  });

  it('parses decimal comma input', () => {
    expect(parseNumberInput('12,34')).toBe(12.34);
  });
});
