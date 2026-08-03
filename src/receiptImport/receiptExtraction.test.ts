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

  it('handles invoices with sender blocks and integer Euro amounts', () => {
    const result = extractReceiptData(`
      Rechnung.
      Absender:
      Ella Raatikainen, Jonathan Olowookere – GbR
      Rechnungsdatum: 30.07.26
      Rechnungsbetrag
      760
      €
      Der Rechnungsbetrag beinhaltet keine Mehrwertsteuer (§19 UstG).
    `);

    expect(result.date?.value).toBe('2026-07-30');
    expect(result.vendor?.value).toBe('Ella Raatikainen, Jonathan Olowookere – GbR');
    expect(result.gross?.value).toBe(760);
  });

  it('handles Amazon-style invoice summaries', () => {
    const result = extractReceiptData(`
      Rechnung
      USt. %
      Zwischensumme
      (ohne USt.)
      USt.
      7%
      50,27 €
      3,52 €
      Gesamtpreis
      53,79 €
      Verkauft von One Solution GmbH
      Rechnungsdatum
      /Lieferdatum
      15 Juli 2026
      Zahlbetrag
      53,79 €
    `);

    expect(result.date?.value).toBe('2026-07-15');
    expect(result.vendor?.value).toBe('One Solution GmbH');
    expect(result.net?.value).toBe(50.27);
    expect(result.vat?.value).toBe(3.52);
    expect(result.gross?.value).toBe(53.79);
  });

  it('handles multi-page supplier invoice totals', () => {
    const result = extractReceiptData(`
      Früchte Feldbrach GmbH - Karwendelstr. 13 - 82024 Taufkirchen
      Rechnungsdatum: 25.07.2026
      R E C H N U N G
      Netto Gesamt €:
      729,64
      Zwischensumme €:
      729,64
      USt. 7%:
      666,98
      46,69
      USt. 19%:
      62,66
      11,91
      Endbetrag €:
      788,24
    `);

    expect(result.date?.value).toBe('2026-07-25');
    expect(result.vendor?.value).toBe('Früchte Feldbrach GmbH - Karwendelstr. 13 - 82024 Taufkirchen');
    expect(result.net?.value).toBe(729.64);
    expect(result.vat?.value).toBe(58.6);
    expect(result.gross?.value).toBe(788.24);
  });

  it('derives zero VAT for reverse-charge style invoices', () => {
    const result = extractReceiptData(`
      Rechnung
      Rechnungsnummer: 5654334084
      31. Juli 2026
      Google Cloud
      Zwischensumme in EUR
      4,13
      €
      Umsatzsteuer (0%)
      0,00
      €
      Gesamtsumme in EUR
      4,13
      €
    `);

    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(4.13);
    expect(result.vat?.value).toBe(0);
    expect(result.gross?.value).toBe(4.13);
  });

  it('handles OCR text from scanned Fristo receipts', () => {
    const result = extractReceiptData(`
      ©.” \\FRISTO
      Starnberger Str. 38a
      82131 Gauting
      SUMME : EUR 46,01
      Kartenzahlung E 46.01
      A. 19,00 38,66 7,55 46,01
      31.07.26 14:57 Uhr
    `);

    expect(result.vendor?.value).toBe('FRISTO');
    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(38.66);
    expect(result.vat?.value).toBe(7.35);
    expect(result.gross?.value).toBe(46.01);
  });

  it('handles OCR text from scanned bakery receipts with inline VAT summaries', () => {
    const result = extractReceiptData(`
      Aackstubel | } Wünsche
      Summe: 39,90 €
      MwSt BRUTTO NETT
      7,00% 2,61 € 39,90 € 37,29 €
      31.07.2026 16:58:30
    `);

    expect(result.vendor?.value).toBe('Backstube Wünsche');
    expect(result.date?.value).toBe('2026-07-31');
    expect(result.vat?.value).toBe(2.61);
    expect(result.gross?.value).toBe(39.9);
  });

  it('handles OCR text from scanned Lidl receipts', () => {
    const result = extractReceiptData(`
      wf LIDL
      zu zahlen 23,82
      Karte 23,82
      MHSTX MWST + Netto = Brutto
      A 7% 1,56 22,26 23.82
      31.07.2026 15:47
    `);

    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(22.26);
    expect(result.vat?.value).toBe(1.56);
    expect(result.gross?.value).toBe(23.82);
  });

  it('handles real OCR text from scanned Lidl receipts with damaged summary rows', () => {
    const result = extractReceiptData(`
      U \\' Starnberger Straße 38
      P 82131 Gauting
      > EUR
      Sonnenblumenöl 1,79 x 8 14,32 A
      Brötchen Weizen 0,19 x 10 1,904
      Brötchen Kaiser 0,19 x 40 7,60 A
      zu zahlen 23,82
      Karte 23,82
      MWSTX MWST + Netto = Brutto
      A 7% 1,56 22,26 23,82
      Sune  1S6 2,26 23,62
      i {ade dir die Lid] Plus App herunter |
      3612 wii 31.07.26 15:47
      K-U-N-D-E-N-B-E-L-E-G
      Betrag 23,82 EUR
      31.07.2026 15:47 T-ID 60162672
    `);

    expect(result.vendor?.value).toBe('LIDL');
    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(22.26);
    expect(result.vat?.value).toBe(1.56);
    expect(result.gross?.value).toBe(23.82);
  });

  it('handles Lidl tax table rows split across OCR lines', () => {
    const result = extractReceiptData(`
      LIDL
      zu zahlen 23,82
      MWSTX MWST + Netto = Brutto
      A 7%
      1,56 22,26 23,82
      Sune  1S6 2,26 23,62
      31.07.26 15:47
    `);

    expect(result.net?.value).toBe(22.26);
    expect(result.vat?.value).toBe(1.56);
    expect(result.gross?.value).toBe(23.82);
  });

  it('handles OCR text from scanned Edeka receipts with two tax rows', () => {
    const result = extractReceiptData(`
      EDEKA
      SUMME € 23,29
      EC-Cash £ 23,29
      Datum 31.07.26 16:00 Uhr
      MWST NETTO MwSt UMSATZ
      A 7% 21,49 1,50 22,99
      BR 19% 0,25 0,05 0,30
    `);

    expect(result.vendor?.value).toBe('EDEKA');
    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(21.74);
    expect(result.vat?.value).toBe(1.55);
    expect(result.gross?.value).toBe(23.29);
    expect(result.taxRows).toEqual([
      expect.objectContaining({ rate: 7, net: 21.49, vat: 1.5, gross: 22.99 }),
      expect.objectContaining({ rate: 19, net: 0.25, vat: 0.05, gross: 0.3 }),
    ]);
  });

  it('uses arithmetic to parse tax table rows when OCR damages the header order', () => {
    const result = extractReceiptData(`
      LIDL
      zu zahlen 23,82
      MHSIX irgendwas Tabelle
      A 7% 1,56 22,26 23,82
      31.07.2026 15:47
    `);

    expect(result.net?.value).toBe(22.26);
    expect(result.vat?.value).toBe(1.56);
    expect(result.gross?.value).toBe(23.82);
  });

  it('repairs OCR-damaged VAT values when net and gross still match the tax rate', () => {
    const result = extractReceiptData(`
      EDEKA
      SUMME € 23,29
      EC-Cash € 23,29
      Must NETTO MwSt UMSATZ
      A Th 21,49 1,90 22,99
      B 19% 0,25 0,05 0,30
      Datum 31.07.26 16:00 Uhr
    `);

    expect(result.vendor?.value).toBe('EDEKA');
    expect(result.date?.value).toBe('2026-07-31');
    expect(result.net?.value).toBe(21.74);
    expect(result.vat?.value).toBe(1.55);
    expect(result.gross?.value).toBe(23.29);
  });
});
