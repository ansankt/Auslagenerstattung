import { describe, expect, it } from 'vitest';
import { splitReceiptTextBlocks } from './documentImport';

describe('splitReceiptTextBlocks', () => {
  it('splits machine-readable PDFs with multiple single-page invoice blocks', () => {
    const blocks = splitReceiptTextBlocks(`
      Rechnung
      Seite 1 von 1
      Rechnungsnummer A
      Zahlbetrag 10,00 €
      Rechnung
      Seite 1 von 1
      Rechnungsnummer B
      Zahlbetrag 20,00 €
    `);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Rechnungsnummer A');
    expect(blocks[1]).toContain('Rechnungsnummer B');
  });

  it('keeps ordinary multi-page invoices together', () => {
    const blocks = splitReceiptTextBlocks(`
      R E C H N U N G
      Seite 1 von 2
      Netto Gesamt 100,00 €
      Seite 2 von 2
      Endbetrag 119,00 €
    `);

    expect(blocks).toHaveLength(1);
  });
});
