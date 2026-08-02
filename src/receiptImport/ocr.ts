import { createWorker } from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff', 'image/bmp'];

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht geladen werden.'));
    };
    image.src = url;
  });

const findContentBounds = (imageData: ImageData) => {
  const { data, width, height } = imageData;
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const brightness = data[offset] + data[offset + 1] + data[offset + 2];

      if (brightness > 120) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right <= left || bottom <= top) {
    return { left: 0, top: 0, right: width, bottom: height };
  }

  return {
    left: Math.max(0, left - 8),
    top: Math.max(0, top - 8),
    right: Math.min(width, right + 8),
    bottom: Math.min(height, bottom + 8),
  };
};

const preprocessCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const sourceContext = sourceCanvas.getContext('2d');

  if (!sourceContext) {
    throw new Error('Canvas konnte nicht gelesen werden.');
  }

  const bounds = findContentBounds(sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height));
  const cropWidth = bounds.right - bounds.left;
  const cropHeight = bounds.bottom - bounds.top;
  const scale = 3;
  const outputCanvas = document.createElement('canvas');
  const outputContext = outputCanvas.getContext('2d');

  if (!outputContext) {
    throw new Error('Canvas konnte nicht erstellt werden.');
  }

  outputCanvas.width = cropWidth * scale;
  outputCanvas.height = cropHeight * scale;
  outputContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    cropWidth,
    cropHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height,
  );

  const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));
    const threshold = contrasted > 145 ? 255 : 0;
    data[index] = threshold;
    data[index + 1] = threshold;
    data[index + 2] = threshold;
  }

  outputContext.putImageData(imageData, 0, 0);

  return outputCanvas;
};

const renderImage = async (file: File): Promise<HTMLCanvasElement> => {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas konnte nicht erstellt werden.');
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  return canvas;
};

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

  return preprocessCanvas(canvas);
};

const getOcrSource = async (file: File): Promise<File | HTMLCanvasElement> => {
  if (acceptedImageTypes.includes(file.type)) {
    return preprocessCanvas(await renderImage(file));
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
    langPath: '/tessdata',
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
