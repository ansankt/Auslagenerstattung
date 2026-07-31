import type { Expense, ExpenseTotals } from '../types/expense';

export const calculateGross = (net: number, vat: number): number => roundMoney(net + vat);

export const calculateTotals = (expenses: Expense[]): ExpenseTotals =>
  expenses.reduce<ExpenseTotals>(
    (totals, expense) => ({
      net: roundMoney(totals.net + expense.net),
      vat: roundMoney(totals.vat + expense.vat),
      gross: roundMoney(totals.gross + calculateGross(expense.net, expense.vat)),
    }),
    { net: 0, vat: 0, gross: 0 },
  );

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
