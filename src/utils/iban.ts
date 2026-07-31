const moveCountryCodeToEnd = (iban: string): string => iban.slice(4) + iban.slice(0, 4);

const charToNumber = (char: string): string => {
  const charCode = char.charCodeAt(0);

  if (charCode >= 65 && charCode <= 90) {
    return String(charCode - 55);
  }

  return char;
};

export const normalizeIban = (iban: string): string => iban.replace(/\s/g, '').toUpperCase();

export const isValidIban = (iban: string): boolean => {
  const normalizedIban = normalizeIban(iban);

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizedIban)) {
    return false;
  }

  const numericIban = moveCountryCodeToEnd(normalizedIban)
    .split('')
    .map(charToNumber)
    .join('');

  let remainder = 0;
  for (const digit of numericIban) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
};
