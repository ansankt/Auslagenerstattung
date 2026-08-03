import { describe, expect, it } from 'vitest';
import { createDraftFromResult, updateDraftTaxRow } from './receiptDraft';
import type { ReceiptExtractionResult } from './receiptExtraction';

const createResult = (): ReceiptExtractionResult => ({
  date: null,
  vendor: null,
  net: { value: 21.74, confidence: 0.84, reason: 'Netto aus Steuertabelle berechnet.' },
  vat: { value: 1.55, confidence: 0.86, reason: 'MwSt. aus Steuertabelle berechnet.' },
  gross: { value: 23.29, confidence: 0.84, reason: 'Brutto aus Steuertabelle berechnet.' },
  taxRows: [
    { rate: 7, net: 21.49, vat: 1.5, gross: 22.99, line: 'A 7% 21,49 1,50 22,99' },
    { rate: 19, net: 0.25, vat: 0.05, gross: 0.3, line: 'B 19% 0,25 0,05 0,30' },
  ],
  rawText: '',
});

describe('receiptDraft', () => {
  it('keeps recognized tax rows editable in the draft', () => {
    const draft = createDraftFromResult(createResult(), 'Scannen 3.pdf');

    expect(draft.taxRows).toHaveLength(2);
    expect(draft.taxRows[0]).toMatchObject({ rate: '7', net: '21.49', vat: '1.5', gross: '22.99' });
    expect(draft.taxRows[1]).toMatchObject({ rate: '19', net: '0.25', vat: '0.05', gross: '0.3' });
  });

  it('recalculates draft totals when a tax row changes', () => {
    const draft = createDraftFromResult(createResult(), 'Scannen 3.pdf');
    const updatedDraft = updateDraftTaxRow(draft, draft.taxRows[0].id, 'vat', '1.51');

    expect(updatedDraft.net).toBe('21.74');
    expect(updatedDraft.vat).toBe('1.56');
    expect(updatedDraft.gross).toBe('23.29');
  });
});
