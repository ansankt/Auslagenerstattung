import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { ExpenseTable } from './components/ExpenseTable';
import { PaymentSection } from './components/PaymentSection';
import { PdfPreview } from './components/PdfPreview';
import { PersonalData } from './components/PersonalData';
import { Summary } from './components/Summary';
import { generatePdf, downloadPdf } from './pdf/generatePdf';
import type { ExpenseReport } from './types/expense';
import { calculateTotals } from './utils/calculations';
import { createDefaultReport, createEmptyExpense } from './utils/defaultReport';
import { createPdfFileName } from './utils/pdfFileName';
import { clearExpenseReport, loadExpenseReport, saveExpenseReport } from './utils/storage';
import { expenseReportSchema } from './validation/expenseReportSchema';

export const App = () => {
  const methods = useForm<ExpenseReport>({
    mode: 'onBlur',
    resolver: zodResolver(expenseReportSchema),
    defaultValues: loadExpenseReport() ?? createDefaultReport(),
  });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { control, handleSubmit, reset, watch } = methods;
  const expenses = watch('expenses');
  const report = watch();
  const totals = useMemo(() => calculateTotals(expenses), [expenses]);
  const expenseFields = useFieldArray({ control, name: 'expenses' });

  useEffect(() => {
    const subscription = watch((currentReport) => {
      saveExpenseReport(currentReport as ExpenseReport);
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  const handleReset = (): void => {
    clearExpenseReport();
    reset(createDefaultReport());
    setPdfError(null);
  };

  const handleAddExpense = (): void => {
    expenseFields.append(createEmptyExpense());
  };

  const handleRemoveExpense = (index: number): void => {
    if (expenseFields.fields.length > 1) {
      expenseFields.remove(index);
    }
  };

  const handlePdfDownload = handleSubmit(async (validReport) => {
    setPdfError(null);
    try {
      const pdfBytes = await generatePdf(validReport);
      downloadPdf(pdfBytes, createPdfFileName(validReport.name));
    } catch (error) {
      console.error('PDF generation failed', error);
      setPdfError('Die PDF konnte nicht erstellt werden. Bitte versuche es erneut.');
    }
  }, () => {
    setPdfError('Bitte korrigiere die markierten Felder, bevor die PDF erstellt wird.');
  });

  return (
    <FormProvider {...methods}>
      <main className="app-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Kult Auslagen</p>
            <h1>Auslagenformular</h1>
          </div>
          <button className="secondary-button" type="button" onClick={handleReset}>
            Formular zurücksetzen
          </button>
        </header>

        <form className="form-layout">
          <section className="form-stack" aria-label="Formulareingaben">
            <PersonalData />
            <ExpenseTable
              fields={expenseFields.fields}
              onAddExpense={handleAddExpense}
              onRemoveExpense={handleRemoveExpense}
            />
            <PaymentSection />
          </section>

          <aside className="side-panel" aria-label="Zusammenfassung und PDF">
            <Summary totals={totals} />
            <PdfPreview report={report} totals={totals} error={pdfError} onDownload={handlePdfDownload} />
          </aside>
        </form>
      </main>
    </FormProvider>
  );
};
