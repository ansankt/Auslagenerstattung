import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ExpenseKeyboardColumn } from '../hooks/useExpenseKeyboardNavigation';
import type { ExpenseReport } from '../types/expense';
import { calculateGross } from '../utils/calculations';
import { formatCurrency } from '../utils/currency';
import { FieldError } from './shared/FieldError';

interface ExpenseRowProps {
  index: number;
  canRemove: boolean;
  onKeyboardNavigation: (
    event: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    column: ExpenseKeyboardColumn,
  ) => void;
  onRegisterKeyboardField: (row: number, column: ExpenseKeyboardColumn) => (element: HTMLInputElement | null) => void;
  onRemove: () => void;
}

export const ExpenseRow = ({
  index,
  canRemove,
  onKeyboardNavigation,
  onRegisterKeyboardField,
  onRemove,
}: ExpenseRowProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ExpenseReport>();
  const expense = useWatch({ control, name: `expenses.${index}` });
  const gross = useMemo(() => calculateGross(expense?.net ?? 0, expense?.vat ?? 0), [expense]);
  const rowErrors = errors.expenses?.[index];
  const dateField = register(`expenses.${index}.date`);
  const receiptField = register(`expenses.${index}.receipt`);
  const descriptionField = register(`expenses.${index}.description`);
  const netField = register(`expenses.${index}.net`, { valueAsNumber: true });
  const vatField = register(`expenses.${index}.vat`, { valueAsNumber: true });

  return (
    <fieldset className="expense-row">
      <legend>Ausgabe {index + 1}</legend>
      <label className="field">
        <span>Datum</span>
        <input
          type="date"
          {...dateField}
          ref={(element) => {
            dateField.ref(element);
            onRegisterKeyboardField(index, 'date')(element);
          }}
          onKeyDown={(event) => onKeyboardNavigation(event, index, 'date')}
          aria-invalid={Boolean(rowErrors?.date)}
        />
        <FieldError message={rowErrors?.date?.message} />
      </label>
      <label className="field">
        <span>Beleg</span>
        <input
          {...receiptField}
          ref={(element) => {
            receiptField.ref(element);
            onRegisterKeyboardField(index, 'receipt')(element);
          }}
          onKeyDown={(event) => onKeyboardNavigation(event, index, 'receipt')}
          aria-invalid={Boolean(rowErrors?.receipt)}
        />
        <FieldError message={rowErrors?.receipt?.message} />
      </label>
      <label className="field wide-field">
        <span>Beschreibung</span>
        <input
          {...descriptionField}
          ref={(element) => {
            descriptionField.ref(element);
            onRegisterKeyboardField(index, 'description')(element);
          }}
          onKeyDown={(event) => onKeyboardNavigation(event, index, 'description')}
        />
      </label>
      <label className="field">
        <span>Netto</span>
        <input
          type="number"
          min="0"
          step="0.01"
          {...netField}
          ref={(element) => {
            netField.ref(element);
            onRegisterKeyboardField(index, 'net')(element);
          }}
          onKeyDown={(event) => onKeyboardNavigation(event, index, 'net')}
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
          {...vatField}
          ref={(element) => {
            vatField.ref(element);
            onRegisterKeyboardField(index, 'vat')(element);
          }}
          onKeyDown={(event) => onKeyboardNavigation(event, index, 'vat')}
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
