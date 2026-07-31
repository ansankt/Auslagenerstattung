import type { ExpenseTotals } from '../types/expense';
import { formatCurrency } from '../utils/currency';

interface SummaryProps {
  totals: ExpenseTotals;
}

export const Summary = ({ totals }: SummaryProps) => (
  <section className="panel summary-panel">
    <h2>Summen</h2>
    <dl className="summary-list">
      <div>
        <dt>Netto</dt>
        <dd>{formatCurrency(totals.net)}</dd>
      </div>
      <div>
        <dt>MwSt.</dt>
        <dd>{formatCurrency(totals.vat)}</dd>
      </div>
      <div className="total-row">
        <dt>Brutto</dt>
        <dd>{formatCurrency(totals.gross)}</dd>
      </div>
    </dl>
  </section>
);
