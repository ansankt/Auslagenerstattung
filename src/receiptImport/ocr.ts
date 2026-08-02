import { createWorker } from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff', 'image/bmp'];

const renderPdfFirstPage = async (file: File): Promise<HTMLCanvasElement> => {
  const data = await file.arrayBuffer();
  const pdfDocument = await getDocument({ data }).promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas konnte nicht erstellt werden.');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, canvasContext: context, viewport }).promise;

  return canvas;
};

const getOcrSource = async (file: File): Promise<File | HTMLCanvasElement> => {
  if (acceptedImageTypes.includes(file.type)) {
    return file;
  }

  if (file.type === 'application/pdf') {
    return renderPdfFirstPage(file);
  }

  throw new Error('Bitte ein Bild oder eine PDF-Datei auswählen.');
};

export const recognizeReceiptText = async (
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  const source = await getOcrSource(file);
  const worker = await createWorker('deu+eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(message.progress);
      }
    },
  });

  try {
    const result = await worker.recognize(source);

    return result.data.text;
  } finally {
    await worker.terminate();
  }
};
