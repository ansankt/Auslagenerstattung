import { describe, expect, it } from 'vitest';
import { getVatPlausibility } from './vatValidation';
import type { ReceiptImportDraft } from './receiptDraft';

const createDraft = (partialDraft: Partial<ReceiptImportDraft>): ReceiptImportDraft => ({
  date: '',
  receipt: '',
  description: '',
  net: '',
  vat: '',
  gross: '',
  ...partialDraft,
});

describe('getVatPlausibility', () => {
  it('accepts valid VAT rates', () => {
    expect(getVatPlausibility(createDraft({ net: '100', vat: '0', gross: '100' }))?.status).toBe('ok');
    expect(getVatPlausibility(createDraft({ net: '100', vat: '7', gross: '107' }))?.status).toBe('ok');
    expect(getVatPlausibility(createDraft({ net: '100', vat: '19', gross: '119' }))?.status).toBe('ok');
  });

  it('warns when VAT does not match an allowed rate', () => {
    const result = getVatPlausibility(createDraft({ net: '100', vat: '25', gross: '125' }));

    expect(result?.status).toBe('warning');
    expect(result?.message).toContain('passt nicht zu 0%, 7% oder 19%');
  });

  it('warns softly for potential mixed VAT receipts', () => {
    const result = getVatPlausibility(createDraft({ net: '729,64', vat: '58,60', gross: '788,24' }));

    expect(result?.status).toBe('warning');
    expect(result?.message).toContain('gemischten 7%/19%-Belegen');
  });

  it('warns when gross does not equal net plus VAT', () => {
    const result = getVatPlausibility(createDraft({ net: '100', vat: '19', gross: '120' }));

    expect(result?.status).toBe('warning');
    expect(result?.message).toContain('Netto + MwSt.');
  });

  it('checks rounded cent values exactly', () => {
    const validResult = getVatPlausibility(createDraft({ net: '38.66', vat: '7.35', gross: '46.01' }));
    const lowVatResult = getVatPlausibility(createDraft({ net: '38.66', vat: '7.34', gross: '46.01' }));
    const lowerVatResult = getVatPlausibility(createDraft({ net: '38.66', vat: '7.33', gross: '46.01' }));

    expect(validResult?.status).toBe('ok');
    expect(lowVatResult?.status).toBe('warning');
    expect(lowVatResult?.message).toContain('Netto + MwSt.');
    expect(lowerVatResult?.status).toBe('warning');
    expect(lowerVatResult?.message).toContain('Netto + MwSt.');
  });

  it('waits until net and VAT are present', () => {
    expect(getVatPlausibility(createDraft({ net: '100' }))).toBeNull();
    expect(getVatPlausibility(createDraft({ vat: '19' }))).toBeNull();
  });
});
