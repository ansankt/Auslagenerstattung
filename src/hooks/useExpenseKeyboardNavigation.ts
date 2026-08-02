import { useCallback, useRef } from 'react';

export const expenseKeyboardColumns = ['date', 'receipt', 'description', 'net', 'vat'] as const;

export type ExpenseKeyboardColumn = (typeof expenseKeyboardColumns)[number];

type ExpenseInputElement = HTMLInputElement;

interface UseExpenseKeyboardNavigationOptions {
  rowCount: number;
  onAddExpense: () => void;
}

interface FieldPosition {
  row: number;
  column: ExpenseKeyboardColumn;
}

const getColumnIndex = (column: ExpenseKeyboardColumn): number => expenseKeyboardColumns.indexOf(column);

const isTextCaretAtStart = (input: ExpenseInputElement): boolean =>
  input.selectionStart === null || input.selectionStart === 0;

const isTextCaretAtEnd = (input: ExpenseInputElement): boolean =>
  input.selectionStart === null || input.selectionStart === input.value.length;

export const useExpenseKeyboardNavigation = ({
  rowCount,
  onAddExpense,
}: UseExpenseKeyboardNavigationOptions) => {
  const inputRefs = useRef<Map<string, ExpenseInputElement>>(new Map());

  const getFieldKey = ({ row, column }: FieldPosition): string => `${row}:${column}`;

  const registerKeyboardField = useCallback(
    (row: number, column: ExpenseKeyboardColumn) => (element: ExpenseInputElement | null): void => {
      const fieldKey = getFieldKey({ row, column });

      if (element) {
        inputRefs.current.set(fieldKey, element);
        return;
      }

      inputRefs.current.delete(fieldKey);
    },
    [],
  );

  const focusField = useCallback((row: number, column: ExpenseKeyboardColumn): void => {
    const element = inputRefs.current.get(getFieldKey({ row, column }));
    element?.focus();
    element?.select();
  }, []);

  const focusPosition = useCallback(
    (position: FieldPosition): void => {
      window.setTimeout(() => focusField(position.row, position.column), 0);
    },
    [focusField],
  );

  const moveToPosition = useCallback(
    ({ row, column }: FieldPosition): void => {
      if (row < 0) {
        return;
      }

      if (row >= rowCount) {
        onAddExpense();
        focusPosition({ row, column });
        return;
      }

      focusField(row, column);
    },
    [focusField, focusPosition, onAddExpense, rowCount],
  );

  const getHorizontalPosition = useCallback(
    (row: number, column: ExpenseKeyboardColumn, direction: 1 | -1): FieldPosition => {
      const currentColumnIndex = getColumnIndex(column);
      const nextColumnIndex = currentColumnIndex + direction;

      if (nextColumnIndex >= 0 && nextColumnIndex < expenseKeyboardColumns.length) {
        return { row, column: expenseKeyboardColumns[nextColumnIndex] };
      }

      if (direction > 0) {
        return { row: row + 1, column: expenseKeyboardColumns[0] };
      }

      return { row: row - 1, column: expenseKeyboardColumns[expenseKeyboardColumns.length - 1] };
    },
    [],
  );

  const handleKeyboardNavigation = useCallback(
    (event: React.KeyboardEvent<ExpenseInputElement>, row: number, column: ExpenseKeyboardColumn): void => {
      const input = event.currentTarget;
      const currentColumnIndex = getColumnIndex(column);
      let nextPosition: FieldPosition | null = null;

      if (event.key === 'Enter') {
        nextPosition = getHorizontalPosition(row, column, event.shiftKey ? -1 : 1);
      }

      if (event.key === 'Tab') {
        nextPosition = getHorizontalPosition(row, column, event.shiftKey ? -1 : 1);
      }

      if (event.key === 'ArrowRight' && isTextCaretAtEnd(input)) {
        nextPosition = getHorizontalPosition(row, column, 1);
      }

      if (event.key === 'ArrowLeft' && isTextCaretAtStart(input)) {
        nextPosition = getHorizontalPosition(row, column, -1);
      }

      if (event.key === 'ArrowDown') {
        nextPosition = { row: row + 1, column };
      }

      if (event.key === 'ArrowUp') {
        nextPosition = { row: row - 1, column: expenseKeyboardColumns[currentColumnIndex] };
      }

      if (!nextPosition) {
        return;
      }

      event.preventDefault();
      moveToPosition(nextPosition);
    },
    [getHorizontalPosition, moveToPosition],
  );

  return {
    handleKeyboardNavigation,
    registerKeyboardField,
  };
};
