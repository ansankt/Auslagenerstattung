import type { ReceiptExtractionResult } from './receiptExtraction';
import { roundMoney } from '../utils/calculations';
import { parseNumberInput } from '../utils/currency';

export interface ReceiptTaxBreakdownDraft {
  id: string;
  rate: string;
  net: string;
  vat: string;
  gross: string;
}

export interface ReceiptImportDraft {
  date: string;
  receipt: string;
  description: string;
  net: string;
  vat: string;
  gross: string;
  taxRows: ReceiptTaxBreakdownDraft[];
}

export const createDraftFromResult = (result: ReceiptExtractionResult, fallbackName: string): ReceiptImportDraft => ({
  date: result.date?.value ?? '',
  receipt: result.vendor?.value ?? fallbackName,
  description: fallbackName,
  net: result.net?.value === undefined ? '' : String(result.net.value),
  vat: result.vat?.value === undefined ? '' : String(result.vat.value),
  gross: result.gross?.value === undefined ? '' : String(result.gross.value),
  taxRows: result.taxRows.map((row, index) => ({
    id: `${row.rate}-${index}-${row.net}-${row.vat}-${row.gross}`,
    rate: String(row.rate),
    net: String(row.net),
    vat: String(row.vat),
    gross: String(row.gross),
  })),
});

export const recalculateDraftFromTaxRows = (draft: ReceiptImportDraft): ReceiptImportDraft => {
  if (draft.taxRows.length === 0) {
    return draft;
  }

  const totals = draft.taxRows.reduce(
    (sum, row) => ({
      net: roundMoney(sum.net + parseNumberInput(row.net)),
      vat: roundMoney(sum.vat + parseNumberInput(row.vat)),
      gross: roundMoney(sum.gross + parseNumberInput(row.gross)),
    }),
    { net: 0, vat: 0, gross: 0 },
  );

  return {
    ...draft,
    net: String(totals.net),
    vat: String(totals.vat),
    gross: String(totals.gross),
  };
};

export const updateDraftTaxRow = (
  draft: ReceiptImportDraft,
  rowId: string,
  field: keyof Omit<ReceiptTaxBreakdownDraft, 'id'>,
  value: string,
): ReceiptImportDraft =>
  recalculateDraftFromTaxRows({
    ...draft,
    taxRows: draft.taxRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
  });
