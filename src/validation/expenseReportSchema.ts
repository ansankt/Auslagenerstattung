import { z } from 'zod';
import { isValidIban } from '../utils/iban';

const expenseSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1, 'Datum ist erforderlich.'),
  receipt: z.string().min(1, 'Beleg ist erforderlich.'),
  description: z.string(),
  net: z.coerce.number().positive('Nettobetrag muss größer als 0 sein.'),
  vat: z.coerce.number().min(0, 'MwSt. darf nicht negativ sein.'),
});

export const expenseReportSchema = z
  .object({
    name: z.string().min(1, 'Name ist erforderlich.'),
    purpose: z.string(),
    paymentMethod: z.enum(['cash', 'bankTransfer']),
    bankAccount: z.object({
      accountHolder: z.string(),
      iban: z.string(),
    }),
    expenses: z.array(expenseSchema).min(1, 'Mindestens eine Ausgabe ist erforderlich.'),
  })
  .superRefine((report, context) => {
    if (report.paymentMethod !== 'bankTransfer') {
      return;
    }

    if (!report.bankAccount.accountHolder.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bankAccount', 'accountHolder'],
        message: 'Kontoinhaber ist erforderlich.',
      });
    }

    if (!isValidIban(report.bankAccount.iban)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bankAccount', 'iban'],
        message: 'Bitte eine gültige IBAN eingeben.',
      });
    }
  });
