import type { ExpenseReport, ExpenseTotals } from '../types/expense';
import { formatCurrency } from '../utils/currency';

interface PdfPreviewProps {
  report: ExpenseReport;
  totals: ExpenseTotals;
  error: string | null;
  onDownload: () => void;
}

export const PdfPreview = ({ report, totals, error, onDownload }: PdfPreviewProps) => (
  <section className="panel pdf-panel">
    <h2>PDF</h2>
    <div className="pdf-preview" aria-label="PDF Vorschau">
      <strong>Auslagenformular</strong>
      <span>{report.name || 'Name'}</span>
      <span>{report.purpose || 'Zweck'}</span>
      <span>{report.expenses.length} Ausgabe(n)</span>
      <b>{formatCurrency(totals.gross)}</b>
    </div>
    {error ? <p className="form-error">{error}</p> : null}
    <button className="primary-button full-width-button" type="button" onClick={onDownload}>
      PDF herunterladen
    </button>
  </section>
);
