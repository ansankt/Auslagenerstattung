export interface ReceiptExtractionRules {
  dateKeywords: string[];
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
  vendorLines: {
    preferTopLines: 8,
    ignoreKeywords: ['rechnung', 'quittung', 'kassenbon', 'steuer', 'ust-id', 'kundenservice'],
  },
  amountKeywords: {
    net: ['netto', 'nettobetrag', 'zwischensumme', 'warenwert'],
    vat: ['mwst', 'ust', 'umsatzsteuer', 'mehrwertsteuer'],
    gross: ['brutto', 'gesamtbetrag', 'gesamt', 'summe', 'endbetrag', 'zu zahlen'],
  },
  vatRates: [0, 7, 19],
};
