import { describe, expect, it } from 'vitest';
import { isValidIban, normalizeIban } from './iban';

describe('iban', () => {
  it('normalizes spaces and casing', () => {
    expect(normalizeIban('de89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000');
  });

  it('validates valid IBANs', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('rejects invalid IBANs', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 01')).toBe(false);
  });
});
