import type { ExpenseReport } from '../types/expense';

const storageKey = 'kult-expense-report';

export const saveExpenseReport = (report: ExpenseReport): void => {
  localStorage.setItem(storageKey, JSON.stringify(report));
};

export const loadExpenseReport = (): ExpenseReport | null => {
  const storedReport = localStorage.getItem(storageKey);

  if (!storedReport) {
    return null;
  }

  try {
    return JSON.parse(storedReport) as ExpenseReport;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

export const clearExpenseReport = (): void => {
  localStorage.removeItem(storageKey);
};
