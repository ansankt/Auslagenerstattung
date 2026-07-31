import { describe, expect, it } from 'vitest';
import { createPdfFileName, formatDateForFileName } from './pdfFileName';

describe('pdfFileName', () => {
  it('formats dates for file names', () => {
    expect(formatDateForFileName(new Date(2026, 6, 31))).toBe('2026-07-31');
  });

  it('creates the requested PDF file name', () => {
    expect(createPdfFileName('Erika Muster', new Date(2026, 6, 31))).toBe(
      'Auslagenerstattung_Erika_Muster_2026-07-31.pdf',
    );
  });

  it('removes characters that are unsafe in file names', () => {
    expect(createPdfFileName('Max/Muster:Test', new Date(2026, 6, 31))).toBe(
      'Auslagenerstattung_Max-Muster-Test_2026-07-31.pdf',
    );
  });
});
