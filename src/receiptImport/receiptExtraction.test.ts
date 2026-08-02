import { describe, expect, it } from 'vitest';
import { extractReceiptData } from './receiptExtraction';

describe('extractReceiptData', () => {
  it('extracts common receipt fields from OCR text', () => {
    const result = extractReceiptData(`
      Muster Lieferant GmbH
      Rechnung
      Rechnungsdatum 31.07.2026
      Nettobetrag 100,00 €
      MwSt. 19,00 €
      Gesamtbetrag 119,00 €
    `);

    expect(result.date?.value).toBe('2026-07-31');
    expect(result.vendor?.value).toBe('Muster Lieferant GmbH');
    expect(result.net?.value).toBe(100);
    expect(result.vat?.value).toBe(19);
    expect(result.gross?.value).toBe(119);
  });

  it('derives net and VAT from gross when only gross is available', () => {
    const result = extractReceiptData(`
      Beispiel Markt
      Datum 01.08.2026
      Summe 119,00 €
    `);

    expect(result.net?.value).toBe(100);
    expect(result.vat?.value).toBe(19);
    expect(result.gross?.value).toBe(119);
  });

  it('handles supermarket receipts with multiple VAT lines', () => {
    const result = extractReceiptData(`
      TRIVANOVIC SUPERMARKT
      Hauptplatz. 4
      82131 Gauting
      Summe 11,12 €
      Bar 11,12 €
      Netto-Umsatz 10,37 €
      7,00% MwSt. 0,71 €
      19,00% MwSt. 0,04 €
      Brutto-Umsatz 11,12 €
      Datum : 18.07.2026 Zeit : 15:05
    `);

    expect(result.date?.value).toBe('2026-07-18');
    expect(result.vendor?.value).toBe('TRIVANOVIC SUPERMARKT');
    expect(result.net?.value).toBe(10.37);
    expect(result.vat?.value).toBe(0.75);
    expect(result.gross?.value).toBe(11.12);
  });
});
