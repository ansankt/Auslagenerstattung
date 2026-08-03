import type { FieldArrayWithId } from 'react-hook-form';
import { useExpenseKeyboardNavigation } from '../hooks/useExpenseKeyboardNavigation';
import type { ReceiptImportDraft } from '../receiptImport/receiptDraft';
import type { ExpenseReport } from '../types/expense';
import { ExpenseRow } from './ExpenseRow';
import { MultiReceiptImport } from './MultiReceiptImport';

interface ExpenseTableProps {
  fields: FieldArrayWithId<ExpenseReport, 'expenses', 'id'>[];
  onAddExpense: () => void;
  onImportExpenses: (drafts: ReceiptImportDraft[]) => void;
  onRemoveExpense: (index: number) => void;
}

export const ExpenseTable = ({ fields, onAddExpense, onImportExpenses, onRemoveExpense }: ExpenseTableProps) => {
  const { handleKeyboardNavigation, registerKeyboardField } = useExpenseKeyboardNavigation({
    rowCount: fields.length,
    onAddExpense,
  });

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Ausgaben</h2>
      </div>

      <MultiReceiptImport onApply={onImportExpenses} />

      <div className="expense-list">
        {fields.map((field, index) => (
          <ExpenseRow
            key={field.id}
            index={index}
            canRemove={fields.length > 1}
            onKeyboardNavigation={handleKeyboardNavigation}
            onRegisterKeyboardField={registerKeyboardField}
            onRemove={() => onRemoveExpense(index)}
          />
        ))}
      </div>

      <button className="primary-button add-expense-button" type="button" onClick={onAddExpense}>
        Ausgabe hinzufügen
      </button>
    </section>
  );
};
