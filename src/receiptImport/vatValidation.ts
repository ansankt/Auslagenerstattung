import { formatCurrency, parseNumberInput } from '../utils/currency';
import { roundMoney } from '../utils/calculations';
import type { ReceiptImportDraft } from './receiptDraft';

export type VatPlausibilityStatus = 'ok' | 'warning';

export interface VatPlausibilityResult {
  status: VatPlausibilityStatus;
  message: string;
}

const VAT_RATES = [0, 7, 19] as const;

const hasNumericValue = (value: string): boolean => value.trim().length > 0 && Number.isFinite(Number(value.replace(',', '.')));

const isSameCentAmount = (actual: number, expected: number): boolean => roundMoney(actual) === roundMoney(expected);

export const getVatPlausibility = (draft: ReceiptImportDraft): VatPlausibilityResult | null => {
  if (!hasNumericValue(draft.net) || !hasNumericValue(draft.vat)) {
    return null;
  }

  const net = parseNumberInput(draft.net);
  const vat = parseNumberInput(draft.vat);
  const gross = hasNumericValue(draft.gross) ? parseNumberInput(draft.gross) : null;
  const messages: string[] = [];

  if (net < 0 || vat < 0) {
    return {
      status: 'warning',
      message: 'MwSt.-Prüfung: Netto und MwSt. sollten nicht negativ sein.',
    };
  }

  if (gross !== null && !isSameCentAmount(net + vat, gross)) {
    messages.push(
      `Netto + MwSt. ergibt ${formatCurrency(roundMoney(net + vat))}, erkanntes Brutto ist ${formatCurrency(gross)}.`,
    );
  }

  if (net === 0) {
    if (vat === 0) {
      return {
        status: messages.length > 0 ? 'warning' : 'ok',
        message:
          messages.length > 0
            ? `MwSt.-Prüfung: 0% passt, aber ${messages.join(' ')}`
            : 'MwSt.-Prüfung: 0% passt zu Netto und MwSt.',
      };
    }

    return {
      status: 'warning',
      message: `MwSt.-Prüfung: Bei 0,00 EUR Netto passt eine MwSt. von ${formatCurrency(vat)} nicht.`,
    };
  }

  const matchingRate = VAT_RATES.find((rate) => isSameCentAmount(vat, net * (rate / 100)));

  if (matchingRate !== undefined) {
    return {
      status: messages.length > 0 ? 'warning' : 'ok',
      message:
        messages.length > 0
          ? `MwSt.-Prüfung: ${matchingRate}% passt zu Netto und MwSt., aber ${messages.join(' ')}`
          : `MwSt.-Prüfung: ${matchingRate}% passt zu Netto und MwSt.`,
    };
  }

  const effectiveRate = roundMoney((vat / net) * 100);
  const isPotentialMixedVat = effectiveRate > 7 && effectiveRate < 19 && gross !== null && isSameCentAmount(net + vat, gross);

  return {
    status: 'warning',
    message: isPotentialMixedVat
      ? `MwSt.-Prüfung: ${effectiveRate}% entspricht keinem einzelnen Satz. Bei gemischten 7%/19%-Belegen bitte kurz prüfen.`
      : `MwSt.-Prüfung: ${effectiveRate}% passt nicht zu 0%, 7% oder 19%. Bitte Netto und MwSt. prüfen.${
          messages.length > 0 ? ` ${messages.join(' ')}` : ''
        }`,
  };
};
