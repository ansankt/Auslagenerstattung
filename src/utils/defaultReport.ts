import type { ExpenseReport } from '../types/expense';

export const createEmptyExpense = () => ({
  id: crypto.randomUUID(),
  date: '',
  receipt: '',
  description: '',
  net: 0,
  vat: 0,
});

export const createDefaultReport = (): ExpenseReport => ({
  name: '',
  purpose: '',
  paymentMethod: 'cash',
  bankAccount: {
    accountHolder: '',
    iban: '',
  },
  expenses: [createEmptyExpense()],
});
