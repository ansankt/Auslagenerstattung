import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createDraftFromResult } from '../receiptImport/receiptDraft';
import type { ReceiptImportDraft } from '../receiptImport/receiptDraft';
import { getReceiptImportReview } from '../receiptImport/importReview';

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
  const [needsApplyConfirmation, setNeedsApplyConfirmation] = useState(false);
  const importReviews = useMemo(
    () => drafts.map((item) => ({ id: item.id, review: getReceiptImportReview(item.draft) })),
    [drafts],
  );
  const reviewCounts = useMemo(
    () =>
      importReviews.reduce(
        (counts, item) => ({
          ok: counts.ok + (item.review.status === 'ok' ? 1 : 0),
          warning: counts.warning + (item.review.status === 'warning' ? 1 : 0),
          incomplete: counts.incomplete + (item.review.status === 'incomplete' ? 1 : 0),
        }),
        { ok: 0, warning: 0, incomplete: 0 },
      ),
    [importReviews],
  );
  const hasReviewIssues = reviewCounts.warning > 0 || reviewCounts.incomplete > 0;

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
    setNeedsApplyConfirmation(false);

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
    setNeedsApplyConfirmation(false);
    setDrafts((currentDrafts) =>
      currentDrafts.map((item) => (item.id === id ? { ...item, draft: { ...item.draft, [field]: value } } : item)),
    );
  };

  const handleRemove = (id: string): void => {
    setNeedsApplyConfirmation(false);
    setDrafts((currentDrafts) => currentDrafts.filter((item) => item.id !== id));
  };

  const handleApply = (): void => {
    if (drafts.length === 0) {
      return;
    }

    if (hasReviewIssues && !needsApplyConfirmation) {
      setNeedsApplyConfirmation(true);
      return;
    }

    onApply(drafts.map((item) => item.draft));
    setDrafts([]);
    setStatus(null);
    setError(null);
    setNeedsApplyConfirmation(false);
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
            <span>
              {reviewCounts.ok} passt, {reviewCounts.warning} prüfen, {reviewCounts.incomplete} unvollständig
            </span>
          </div>

          <div className="multi-receipt-table">
            {drafts.map((item) => {
              const importReview = importReviews.find((reviewItem) => reviewItem.id === item.id)?.review;

              return (
                <fieldset className="multi-receipt-row" key={item.id}>
                  <legend>
                    <span>{item.source}</span>
                    {importReview ? (
                      <span className={`receipt-import-badge is-${importReview.status}`}>
                        <span className="receipt-import-light" aria-hidden="true" />
                        {importReview.label}
                      </span>
                    ) : null}
                  </legend>
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
                  {importReview ? (
                    <p className={`receipt-import-check is-${importReview.status}`}>
                      <span className="receipt-import-light" aria-hidden="true" />
                      <strong>{importReview.label}</strong>
                      <span>{importReview.message}</span>
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>

          {needsApplyConfirmation ? (
            <div className="receipt-import-confirmation" role="alert">
              <strong>Vor dem Übernehmen prüfen</strong>
              <span>
                {reviewCounts.warning + reviewCounts.incomplete} Belegposition(en) haben noch Hinweise. Klicke erneut auf
                "Import übernehmen", wenn du sie trotzdem übernehmen möchtest.
              </span>
            </div>
          ) : null}

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
