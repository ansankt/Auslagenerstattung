const invalidFileNameCharacters = /[<>:"/\\|?*\u0000-\u001F]/g;

const sanitizeFileNamePart = (value: string): string =>
  value.trim().replace(invalidFileNameCharacters, '-').replace(/\s+/g, '_') || 'Unbekannt';

export const formatDateForFileName = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const createPdfFileName = (name: string, createdAt = new Date()): string =>
  `Auslagenerstattung_${sanitizeFileNamePart(name)}_${formatDateForFileName(createdAt)}.pdf`;
