import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ExpenseReport } from '../types/expense';
import { calculateGross } from '../utils/calculations';
import { formatCurrency } from '../utils/currency';
import { FieldError } from './shared/FieldError';

interface ExpenseRowProps {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

export const ExpenseRow = ({ index, canRemove, onRemove }: ExpenseRowProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ExpenseReport>();
  const expense = useWatch({ control, name: `expenses.${index}` });
  const gross = useMemo(() => calculateGross(expense?.net ?? 0, expense?.vat ?? 0), [expense]);
  const rowErrors = errors.expenses?.[index];

  return (
    <fieldset className="expense-row">
      <legend>Ausgabe {index + 1}</legend>
      <label className="field">
        <span>Datum</span>
        <input type="date" {...register(`expenses.${index}.date`)} aria-invalid={Boolean(rowErrors?.date)} />
        <FieldError message={rowErrors?.date?.message} />
      </label>
      <label className="field">
        <span>Beleg</span>
        <input {...register(`expenses.${index}.receipt`)} aria-invalid={Boolean(rowErrors?.receipt)} />
        <FieldError message={rowErrors?.receipt?.message} />
      </label>
      <label className="field wide-field">
        <span>Beschreibung</span>
        <input {...register(`expenses.${index}.description`)} />
      </label>
      <label className="field">
        <span>Netto</span>
        <input
          type="number"
          min="0"
          step="0.01"
          {...register(`expenses.${index}.net`, { valueAsNumber: true })}
          aria-invalid={Boolean(rowErrors?.net)}
        />
        <FieldError message={rowErrors?.net?.message} />
      </label>
      <label className="field">
        <span>MwSt.</span>
        <input
          type="number"
          min="0"
          step="0.01"
          {...register(`expenses.${index}.vat`, { valueAsNumber: true })}
          aria-invalid={Boolean(rowErrors?.vat)}
        />
        <FieldError message={rowErrors?.vat?.message} />
      </label>
      <div className="gross-cell">
        <span>Brutto</span>
        <strong>{formatCurrency(gross)}</strong>
      </div>
      <button className="danger-button" type="button" onClick={onRemove} disabled={!canRemove}>
        Entfernen
      </button>
    </fieldset>
  );
};
