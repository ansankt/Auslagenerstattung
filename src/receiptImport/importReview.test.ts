import { describe, expect, it } from 'vitest';
import { getReceiptImportReview } from './importReview';
import type { ReceiptImportDraft } from './receiptDraft';

const createDraft = (partialDraft: Partial<ReceiptImportDraft>): ReceiptImportDraft => ({
  date: '2026-07-31',
  receipt: 'FRISTO',
  description: 'Scannen.pdf',
  net: '38.66',
  vat: '7.35',
  gross: '46.01',
  taxRows: [],
  ...partialDraft,
});

describe('getReceiptImportReview', () => {
  it('marks complete and plausible drafts as ok', () => {
    expect(getReceiptImportReview(createDraft({}))).toMatchObject({
      status: 'ok',
      label: 'Passt',
    });
  });

  it('marks missing required import values as incomplete', () => {
    const review = getReceiptImportReview(createDraft({ date: '', receipt: '', net: '' }));

    expect(review.status).toBe('incomplete');
    expect(review.message).toContain('Datum');
    expect(review.message).toContain('Lieferant / Belegname');
    expect(review.message).toContain('Netto');
  });

  it('marks implausible VAT values as warning', () => {
    const review = getReceiptImportReview(createDraft({ vat: '7.34' }));

    expect(review.status).toBe('warning');
    expect(review.label).toBe('Bitte prüfen');
    expect(review.message).toContain('Netto + MwSt.');
  });

  it('marks missing gross values as warning only', () => {
    const review = getReceiptImportReview(createDraft({ gross: '' }));

    expect(review.status).toBe('warning');
    expect(review.message).toContain('Brutto wurde nicht erkannt');
  });
});
