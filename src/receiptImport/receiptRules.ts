export interface ReceiptExtractionRules {
  dateKeywords: string[];
  knownVendors: Array<{
    name: string;
    keywords: string[];
  }>;
  vendorLines: {
    preferTopLines: number;
    ignoreKeywords: string[];
  };
  amountKeywords: {
    net: string[];
    vat: string[];
    gross: string[];
  };
  vatRates: number[];
}

export const defaultReceiptRules: ReceiptExtractionRules = {
  dateKeywords: ['rechnungsdatum', 'datum', 'belegdatum', 'leistungsdatum'],
  knownVendors: [
    { name: 'FRISTO', keywords: ['fristo'] },
    { name: 'Backstube Wünsche', keywords: ['backstube wuensche', 'backstube wünsche', 'wuensche', 'wünsche'] },
    { name: 'LIDL', keywords: ['lidl', 'lid]'] },
    { name: 'EDEKA', keywords: ['edeka'] },
  ],
  vendorLines: {
    preferTopLines: 8,
    ignoreKeywords: [
      'rechnung',
      'quittung',
      'kassenbon',
      'steuer',
      'ust-id',
      'kundenservice',
      'seite',
      'details',
      'rechnungsnummer',
      'rechnungsdatum',
      'empfaenger',
      'lieferanschrift',
      'rechnungsadresse',
    ],
  },
  amountKeywords: {
    net: ['netto', 'nettobetrag', 'zwischensumme', 'warenwert'],
    vat: ['mwst', 'ust.', 'ust ', 'umsatzsteuer', 'mehrwertsteuer'],
    gross: ['brutto', 'gesamtbetrag', 'gesamtpreis', 'gesamtsumme', 'rechnungsbetrag', 'zahlbetrag', 'summe', 'endbetrag', 'zu zahlen'],
  },
  vatRates: [0, 7, 19],
};
