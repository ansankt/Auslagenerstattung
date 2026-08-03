import type { ReceiptTaxBreakdownDraft } from '../receiptImport/receiptDraft';
import { parseNumberInput } from '../utils/currency';
import { roundMoney } from '../utils/calculations';

interface ReceiptTaxBreakdownProps {
  rows: ReceiptTaxBreakdownDraft[];
  onChange: (rowId: string, field: keyof Omit<ReceiptTaxBreakdownDraft, 'id'>, value: string) => void;
}

export const ReceiptTaxBreakdown = ({ rows, onChange }: ReceiptTaxBreakdownProps) => {
  if (rows.length === 0) {
    return null;
  }

  const totals = rows.reduce(
    (sum, row) => ({
      net: roundMoney(sum.net + parseNumberInput(row.net)),
      vat: roundMoney(sum.vat + parseNumberInput(row.vat)),
      gross: roundMoney(sum.gross + parseNumberInput(row.gross)),
    }),
    { net: 0, vat: 0, gross: 0 },
  );

  return (
    <div className="receipt-tax-breakdown">
      <div className="receipt-tax-breakdown-heading">
        <strong>Steuersätze erkannt</strong>
        <span>Summen werden oben übernommen</span>
      </div>
      <div className="receipt-tax-breakdown-grid">
        <span>Steuersatz</span>
        <span>Netto</span>
        <span>MwSt.</span>
        <span>Brutto</span>
        {rows.map((row) => (
          <div className="receipt-tax-breakdown-row" key={row.id}>
            <label className="field">
              <span>Steuersatz</span>
              <input value={row.rate} onChange={(event) => onChange(row.id, 'rate', event.target.value)} />
            </label>
            <label className="field">
              <span>Netto</span>
              <input value={row.net} onChange={(event) => onChange(row.id, 'net', event.target.value)} />
            </label>
            <label className="field">
              <span>MwSt.</span>
              <input value={row.vat} onChange={(event) => onChange(row.id, 'vat', event.target.value)} />
            </label>
            <label className="field">
              <span>Brutto</span>
              <input value={row.gross} onChange={(event) => onChange(row.id, 'gross', event.target.value)} />
            </label>
          </div>
        ))}
        <div className="receipt-tax-breakdown-total">
          <strong>Summe</strong>
          <span>{totals.net}</span>
          <span>{totals.vat}</span>
          <span>{totals.gross}</span>
        </div>
      </div>
    </div>
  );
};
