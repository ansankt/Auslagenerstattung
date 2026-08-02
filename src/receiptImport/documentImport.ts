import { extractReceiptData } from './receiptExtraction';
import type { ReceiptExtractionResult } from './receiptExtraction';
import { extractPdfPageTexts, recognizePdfPageText, recognizeReceiptText } from './ocr';

export interface ReceiptDocumentCandidate {
  id: string;
  fileName: string;
  pageNumber: number | null;
  label: string;
  result: ReceiptExtractionResult;
}

interface ImportReceiptDocumentsOptions {
  onProgress?: (message: string, progress: number) => void;
}

const minimumEmbeddedTextLength = 80;
const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff', 'image/bmp'];

export const splitReceiptTextBlocks = (text: string): string[] => {
  const invoiceHeaderPattern = /(?:^|\n)\s*(?=Rechnung\s*\n+\s*Seite\s+\d+\s+von\s+1\b)/gi;
  const blocks = text
    .split(invoiceHeaderPattern)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.length > 1 ? blocks : [text];
};

const getPageLabel = (fileName: string, pageNumber: number | null, index?: number): string => {
  if (pageNumber === null) {
    return fileName;
  }

  return index === undefined ? `${fileName}, Seite ${pageNumber}` : `${fileName}, Seite ${pageNumber}, Rechnung ${index + 1}`;
};

const createCandidate = (
  fileName: string,
  pageNumber: number | null,
  rawText: string,
  index?: number,
): ReceiptDocumentCandidate => ({
  id: `${fileName}-${pageNumber ?? 'image'}-${index ?? 0}-${crypto.randomUUID()}`,
  fileName,
  pageNumber,
  label: getPageLabel(fileName, pageNumber, index),
  result: extractReceiptData(rawText),
});

const importImageFile = async (
  file: File,
  options: ImportReceiptDocumentsOptions,
): Promise<ReceiptDocumentCandidate[]> => {
  options.onProgress?.(`${file.name} wird erkannt`, 0);
  const rawText = await recognizeReceiptText(file, (progress) => {
    options.onProgress?.(`${file.name} wird erkannt`, progress);
  });

  return [createCandidate(file.name, null, rawText)];
};

const importPdfFile = async (
  file: File,
  options: ImportReceiptDocumentsOptions,
): Promise<ReceiptDocumentCandidate[]> => {
  const pageTexts = await extractPdfPageTexts(file).catch(() => []);
  const embeddedText = pageTexts.join('\n').trim();

  if (embeddedText.length >= minimumEmbeddedTextLength) {
    const hasOnlySinglePageInvoices =
      pageTexts.length > 1 && pageTexts.every((pageText) => /Seite\s+1\s+von\s+1/i.test(pageText));

    if (hasOnlySinglePageInvoices) {
      return pageTexts.flatMap((pageText, pageIndex) =>
        splitReceiptTextBlocks(pageText).map((block, blockIndex) =>
          createCandidate(file.name, pageIndex + 1, block, blockIndex),
        ),
      );
    }

    return splitReceiptTextBlocks(embeddedText).map((block, index) => createCandidate(file.name, null, block, index));
  }

  const candidates: ReceiptDocumentCandidate[] = [];
  const pageCount = Math.max(pageTexts.length, 1);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    options.onProgress?.(`${file.name}, Seite ${pageNumber} wird erkannt`, (pageNumber - 1) / pageCount);
    const rawText = await recognizePdfPageText(file, pageNumber, (progress) => {
      options.onProgress?.(`${file.name}, Seite ${pageNumber} wird erkannt`, (pageNumber - 1 + progress) / pageCount);
    });
    candidates.push(createCandidate(file.name, pageNumber, rawText));
  }

  return candidates;
};

export const importReceiptDocuments = async (
  files: File[],
  options: ImportReceiptDocumentsOptions = {},
): Promise<ReceiptDocumentCandidate[]> => {
  const candidates: ReceiptDocumentCandidate[] = [];

  for (const [fileIndex, file] of files.entries()) {
    options.onProgress?.(`${file.name} wird vorbereitet`, fileIndex / files.length);

    if (file.type === 'application/pdf') {
      candidates.push(...(await importPdfFile(file, options)));
      continue;
    }

    if (imageTypes.includes(file.type)) {
      candidates.push(...(await importImageFile(file, options)));
      continue;
    }

    throw new Error(`${file.name} ist kein unterstütztes PDF oder Bild.`);
  }

  options.onProgress?.('Import abgeschlossen', 1);

  return candidates;
};
