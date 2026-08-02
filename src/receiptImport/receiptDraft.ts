import type { ReceiptExtractionResult } from './receiptExtraction';

export interface ReceiptImportDraft {
  date: string;
  receipt: string;
  description: string;
  net: string;
  vat: string;
  gross: string;
}

export const createDraftFromResult = (result: ReceiptExtractionResult, fallbackName: string): ReceiptImportDraft => ({
  date: result.date?.value ?? '',
  receipt: result.vendor?.value ?? fallbackName,
  description: fallbackName,
  net: result.net?.value === undefined ? '' : String(result.net.value),
  vat: result.vat?.value === undefined ? '' : String(result.vat.value),
  gross: result.gross?.value === undefined ? '' : String(result.gross.value),
});
