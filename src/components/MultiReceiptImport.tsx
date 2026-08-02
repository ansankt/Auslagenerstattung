import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createDraftFromResult } from '../receiptImport/receiptDraft';
import type { ReceiptImportDraft } from '../receiptImport/receiptDraft';
import { getVatPlausibility } from '../receiptImport/vatValidation';

interface MultiReceiptDraft {
  id: string;
  source: string;
  draft: ReceiptImportDraft;
}

interface MultiReceiptImportProps {
  onApply: (drafts: ReceiptImportDraft[]) => void;
}

export const MultiReceiptImport = ({ onApply }: MultiReceiptImportProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<MultiReceiptDraft[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setStatus('Belege werden vorbereitet');
    setError(null);
    setDrafts([]);

    try {
      const { importReceiptDocuments } = await import('../receiptImport/documentImport');
      const candidates = await importReceiptDocuments(files, {
        onProgress: (message, nextProgress) => {
          setStatus(message);
          setProgress(nextProgress);
        },
      });
      setDrafts(
        candidates.map((candidate) => ({
          id: candidate.id,
          source: candidate.label,
          draft: createDraftFromResult(candidate.result, candidate.label),
        })),
      );
    } catch (importError) {
      const errorMessage = importError instanceof Error ? ` (${importError.message})` : '';
      setError(`Die Belege konnten nicht importiert werden.${errorMessage}`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleDraftChange = (id: string, field: keyof ReceiptImportDraft, value: string): void => {
    setDrafts((currentDrafts) =>
      currentDrafts.map((item) => (item.id === id ? { ...item, draft: { ...item.draft, [field]: value } } : item)),
    );
  };

  const handleRemove = (id: string): void => {
    setDrafts((currentDrafts) => currentDrafts.filter((item) => item.id !== id));
  };

  const handleApply = (): void => {
    if (drafts.length === 0) {
      return;
    }

    onApply(drafts.map((item) => item.draft));
    setDrafts([]);
    setStatus(null);
    setError(null);
  };

  return (
    <div className="multi-receipt-import">
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={handleFileChange}
      />
      <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
        Belege importieren
      </button>

      {isImporting ? (
        <div className="receipt-status" role="status">
          <span>{status}</span>
          <progress value={progress} max={1} />
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {drafts.length > 0 ? (
        <div className="multi-receipt-preview" aria-label="Import-Vorschau">
          <div className="receipt-preview-heading">
            <strong>{drafts.length} erkannte Belegposition(en)</strong>
            <span>Vor dem Übernehmen prüfen</span>
          </div>

          <div className="multi-receipt-table">
            {drafts.map((item) => {
              const vatPlausibility = getVatPlausibility(item.draft);

              return (
                <fieldset className="multi-receipt-row" key={item.id}>
                  <legend>{item.source}</legend>
                  <label className="field">
                    <span>Datum</span>
                    <input
                      type="date"
                      value={item.draft.date}
                      onChange={(event) => handleDraftChange(item.id, 'date', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Lieferant / Belegname</span>
                    <input
                      value={item.draft.receipt}
                      onChange={(event) => handleDraftChange(item.id, 'receipt', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Beschreibung</span>
                    <input
                      value={item.draft.description}
                      onChange={(event) => handleDraftChange(item.id, 'description', event.target.value)}
                    />
                  </label>
                  <label className="field amount-field">
                    <span>Netto</span>
                    <input value={item.draft.net} onChange={(event) => handleDraftChange(item.id, 'net', event.target.value)} />
                  </label>
                  <label className="field amount-field">
                    <span>MwSt.</span>
                    <input value={item.draft.vat} onChange={(event) => handleDraftChange(item.id, 'vat', event.target.value)} />
                  </label>
                  <label className="field amount-field">
                    <span>Brutto</span>
                    <input
                      value={item.draft.gross}
                      onChange={(event) => handleDraftChange(item.id, 'gross', event.target.value)}
                    />
                  </label>
                  <button className="danger-button multi-receipt-remove-button" type="button" onClick={() => handleRemove(item.id)}>
                    Entfernen
                  </button>
                  {vatPlausibility ? (
                    <p className={`receipt-vat-check is-${vatPlausibility.status}`}>{vatPlausibility.message}</p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>

          <div className="receipt-preview-actions">
            <button className="primary-button" type="button" onClick={handleApply}>
              Import übernehmen
            </button>
            <button className="secondary-button" type="button" onClick={() => setDrafts([])}>
              Verwerfen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
