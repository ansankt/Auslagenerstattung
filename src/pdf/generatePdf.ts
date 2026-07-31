import { PDFDocument, PDFFont, PDFName, StandardFonts, rgb } from 'pdf-lib';
import expenseReportTemplateUrl from '../../basepdf/Auslagenerstattung.pdf?url';
import type { ExpenseReport } from '../types/expense';
import { calculateGross, calculateTotals } from '../utils/calculations';
import { formatCurrency } from '../utils/currency';

const rowFields = [
  ['text_1fjpv', 'text_11dhtk', 'text_21zcnl', 'text_22kptu', 'text_23anuw'],
  ['text_2kirk', 'text_12ygnq', 'text_24mrko', 'text_24tdqy', 'text_24wrhh'],
  ['text_3mwqo', 'text_13uodd', 'text_27cvee', 'text_27arqx', 'text_27cquk'],
  ['text_3twf', 'text_13hmx', 'text_33piln', 'text_33gcfh', 'text_33yyxb'],
  ['text_5nsqq', 'text_15eyoz', 'text_33qnrc', 'text_33ksmy', 'text_33wiuv'],
  ['text_5uton', 'text_15wcxo', 'text_33ahpq', 'text_33gvgh', 'text_33tgwn'],
  ['text_5gbfv', 'text_15nntq', 'text_42tbtf', 'text_53zhbx', 'text_42avss'],
  ['text_5wao', 'text_15bwll', 'text_42jfcy', 'text_42yiqa', 'text_42ojba'],
  ['text_9iybn', 'text_19ganc', 'text_42glss', 'text_42pgvo', 'text_42vcix'],
  ['text_9joft', 'text_19jdyf', 'text_42chbf', 'text_42lotk', 'text_42qors'],
] as const;

const totalFields = {
  net: 'text_55suur',
  vat: 'text_55cyae',
  gross: 'text_55tfid',
} as const;

const detailFields = {
  name: 'text_58ijwj',
  purpose: 'text_59curv',
  paymentMethod: 'text_60nvga',
  accountHolder: 'text_63dzlt',
  iban: 'text_64uvym',
} as const;

export const generatePdf = async (report: ExpenseReport): Promise<Uint8Array> => {
  const templateBytes = await fetch(expenseReportTemplateUrl).then((response) => response.arrayBuffer());
  const pdfDocument = await PDFDocument.load(templateBytes);
  const form = pdfDocument.getForm();
  const page = pdfDocument.getPage(0);
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const smallFontSize = 8;
  const totals = calculateTotals(report.expenses);

  const drawFieldValue = (fieldName: string, value: string): void => {
    if (!value) {
      return;
    }

    const field = form.getTextField(fieldName);
    const widget = field.acroField.getWidgets()[0];
    const rectangle = widget.getRectangle();
    const fontSize = rectangle.height <= 11 ? 8 : 9;
    const text = fitText(value, rectangle.width - 4, fontSize, regularFont);

    page.drawText(text, {
      x: rectangle.x + 2,
      y: rectangle.y + 2,
      size: fontSize,
      font: regularFont,
      color: rgb(0.08, 0.09, 0.11),
    });
  };

  report.expenses.slice(0, rowFields.length).forEach((expense, index) => {
    const [dateField, descriptionField, netField, vatField, grossField] = rowFields[index];
    drawFieldValue(dateField, expense.date);
    drawFieldValue(descriptionField, [expense.receipt, expense.description].filter(Boolean).join(' - '));
    drawFieldValue(netField, formatCurrency(expense.net));
    drawFieldValue(vatField, formatCurrency(expense.vat));
    drawFieldValue(grossField, formatCurrency(calculateGross(expense.net, expense.vat)));
  });

  drawFieldValue(totalFields.net, formatCurrency(totals.net));
  drawFieldValue(totalFields.vat, formatCurrency(totals.vat));
  drawFieldValue(totalFields.gross, formatCurrency(totals.gross));
  drawFieldValue(detailFields.name, report.name);
  drawFieldValue(detailFields.purpose, report.purpose);
  drawFieldValue(detailFields.paymentMethod, report.paymentMethod === 'cash' ? 'Bar' : 'Überweisung');
  drawFieldValue(detailFields.accountHolder, report.bankAccount.accountHolder);
  drawFieldValue(detailFields.iban, report.bankAccount.iban);

  if (report.expenses.length > rowFields.length) {
    page.drawText(`Weitere ${report.expenses.length - rowFields.length} Ausgabe(n) nicht auf Vorlage abbildbar.`, {
      x: 280,
      y: 149,
      size: smallFontSize,
      font: regularFont,
      color: rgb(0.5, 0.1, 0.1),
    });
  }

  page.node.delete(PDFName.of('Annots'));
  pdfDocument.catalog.delete(PDFName.of('AcroForm'));
  return pdfDocument.save();
};

const fitText = (
  value: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
): string => {
  if (font.widthOfTextAtSize(value, fontSize) <= maxWidth) {
    return value;
  }

  const ellipsis = '...';
  let text = value;

  while (text.length > 0 && font.widthOfTextAtSize(`${text}${ellipsis}`, fontSize) > maxWidth) {
    text = text.slice(0, -1);
  }

  return `${text}${ellipsis}`;
};

export const downloadPdf = (bytes: Uint8Array, fileName: string): void => {
  const pdfBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(pdfBuffer).set(bytes);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};
