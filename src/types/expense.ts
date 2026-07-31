export type PaymentMethod = 'cash' | 'bankTransfer';

export interface Expense {
  id: string;
  date: string;
  receipt: string;
  description: string;
  net: number;
  vat: number;
}

export interface BankAccount {
  accountHolder: string;
  iban: string;
}

export interface ExpenseReport {
  name: string;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount: BankAccount;
  expenses: Expense[];
}

export interface ExpenseTotals {
  net: number;
  vat: number;
  gross: number;
}
