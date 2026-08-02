import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ReceiptExtractionResult } from '../receiptImport/receiptExtraction';
import { extractReceiptData } from '../receiptImport/receiptExtraction';

export interface ReceiptImportDraft {
  date: string;
  receipt: string;
  description: string;
  net: string;
  vat: string;
  gross: string;
}

interface ReceiptImportProps {
  onApply: (draft: ReceiptImportDraft) => void;
}

const createDraftFromResult = (result: ReceiptExtractionResult, fileName: string): ReceiptImportDraft => ({
  date: result.date?.value ?? '',
  receipt: result.vendor?.value ?? fileName,
  description: fileName,
  net: result.net?.value === undefined ? '' : String(result.net.value),
  vat: result.vat?.value === undefined ? '' : String(result.vat.value),
  gross: result.gross?.value === undefined ? '' : String(result.gross.value),
});

export const ReceiptImport = ({ onApply }: ReceiptImportProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptExtractionResult | null>(null);
  const [draft, setDraft] = useState<ReceiptImportDraft | null>(null);

  const confidenceLabel = useMemo(() => {
    if (!result) {
      return null;
    }

    const confidenceValues = [result.date, result.vendor, result.net, result.vat, result.gross]
      .map((candidate) => candidate?.confidence)
      .filter((confidence): confidence is number => confidence !== undefined);
    const averageConfidence =
      confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length;

    if (averageConfidence >= 0.75) {
      return 'Hohe Trefferwahrscheinlichkeit';
    }

    if (averageConfidence >= 0.55) {
      return 'Bitte kurz prüfen';
    }

    return 'Unsicher erkannt';
  }, [result]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsRecognizing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setDraft(null);

    try {
      const { recognizeReceiptText } = await import('../receiptImport/ocr');
      const rawText = await recognizeReceiptText(file, setProgress);
      const extractedResult = extractReceiptData(rawText);
      setResult(extractedResult);
      setDraft(createDraftFromResult(extractedResult, file.name));
    } catch {
      setError('Der Beleg konnte nicht erkannt werden. Bitte ein gut lesbares Bild oder PDF verwenden.');
    } finally {
      setIsRecognizing(false);
      event.target.value = '';
    }
  };

  const handleDraftChange = (field: keyof ReceiptImportDraft, value: string): void => {
    setDraft((currentDraft) => (currentDraft ? { ...currentDraft, [field]: value } : currentDraft));
  };

  const handleApply = (): void => {
    if (!draft) {
      return;
    }

    onApply(draft);
    setResult(null);
    setDraft(null);
    setError(null);
  };

  const handleCancel = (): void => {
    setResult(null);
    setDraft(null);
    setError(null);
  };

  return (
    <div className="receipt-import">
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,image/*"
        onChange={handleFileChange}
      />
      <button
        className="secondary-button receipt-import-button"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        Beleg erkennen
      </button>

      {isRecognizing ? (
        <div className="receipt-status" role="status">
          <span>Beleg wird erkannt</span>
          <progress value={progress} max={1} />
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {draft && result ? (
        <div className="receipt-preview" aria-label="Erkannte Belegdaten">
          <div className="receipt-preview-heading">
            <strong>Erkannte Werte</strong>
            {confidenceLabel ? <span>{confidenceLabel}</span> : null}
          </div>

          <div className="receipt-preview-grid">
            <label className="field">
              <span>Datum</span>
              <input type="date" value={draft.date} onChange={(event) => handleDraftChange('date', event.target.value)} />
            </label>
            <label className="field">
              <span>Lieferant / Belegname</span>
              <input value={draft.receipt} onChange={(event) => handleDraftChange('receipt', event.target.value)} />
            </label>
            <label className="field">
              <span>Beschreibung</span>
              <input value={draft.description} onChange={(event) => handleDraftChange('description', event.target.value)} />
            </label>
            <label className="field">
              <span>Netto</span>
              <input value={draft.net} onChange={(event) => handleDraftChange('net', event.target.value)} />
            </label>
            <label className="field">
              <span>MwSt.</span>
              <input value={draft.vat} onChange={(event) => handleDraftChange('vat', event.target.value)} />
            </label>
            <label className="field">
              <span>Brutto erkannt</span>
              <input value={draft.gross} onChange={(event) => handleDraftChange('gross', event.target.value)} />
            </label>
          </div>

          <details className="receipt-reasons">
            <summary>Erkennung anzeigen</summary>
            <ul>
              {[result.date, result.vendor, result.net, result.vat, result.gross]
                .filter((candidate) => candidate !== null)
                .map((candidate) => (
                  <li key={candidate.reason}>{candidate.reason}</li>
                ))}
            </ul>
          </details>

          <div className="receipt-preview-actions">
            <button className="primary-button" type="button" onClick={handleApply}>
              Erkannte Werte übernehmen
            </button>
            <button className="secondary-button" type="button" onClick={handleCancel}>
              Verwerfen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
