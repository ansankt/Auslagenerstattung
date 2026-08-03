import type { ReceiptImportDraft } from './receiptDraft';
import { getVatPlausibility } from './vatValidation';

export type ReceiptImportReviewStatus = 'ok' | 'warning' | 'incomplete';

export interface ReceiptImportReview {
  status: ReceiptImportReviewStatus;
  label: string;
  message: string;
}

const isNumericValue = (value: string): boolean =>
  value.trim().length > 0 && Number.isFinite(Number(value.replace(',', '.')));

export const getReceiptImportReview = (draft: ReceiptImportDraft): ReceiptImportReview => {
  const missingFields = [
    draft.date ? null : 'Datum',
    draft.receipt.trim() ? null : 'Lieferant / Belegname',
    isNumericValue(draft.net) ? null : 'Netto',
    isNumericValue(draft.vat) ? null : 'MwSt.',
  ].filter((field): field is string => field !== null);

  if (missingFields.length > 0) {
    return {
      status: 'incomplete',
      label: 'Unvollständig',
      message: `Es fehlen: ${missingFields.join(', ')}.`,
    };
  }

  const vatPlausibility = getVatPlausibility(draft);

  if (vatPlausibility?.status === 'warning') {
    return {
      status: 'warning',
      label: 'Bitte prüfen',
      message: vatPlausibility.message,
    };
  }

  if (!isNumericValue(draft.gross)) {
    return {
      status: 'warning',
      label: 'Bitte prüfen',
      message: 'Brutto wurde nicht erkannt. Netto und MwSt. werden trotzdem übernommen.',
    };
  }

  return {
    status: 'ok',
    label: 'Passt',
    message: vatPlausibility?.message ?? 'Die wichtigsten Werte sind vollständig und plausibel.',
  };
};
