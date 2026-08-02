import { calculateGross, roundMoney } from '../utils/calculations';
import type { ReceiptExtractionRules } from './receiptRules';
import { defaultReceiptRules } from './receiptRules';

export interface ReceiptExtractionCandidate<TValue> {
  value: TValue;
  confidence: number;
  reason: string;
}

export interface ReceiptExtractionResult {
  date: ReceiptExtractionCandidate<string> | null;
  vendor: ReceiptExtractionCandidate<string> | null;
  net: ReceiptExtractionCandidate<number> | null;
  vat: ReceiptExtractionCandidate<number> | null;
  gross: ReceiptExtractionCandidate<number> | null;
  rawText: string;
}

interface AmountCandidate {
  amount: number;
  line: string;
  lineIndex: number;
}

const datePattern = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;
const amountPattern = /(?:€\s*)?(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[,.]\d{2}))(?:\s*€)?/g;

const normalizeLine = (line: string): string => line.replace(/\s+/g, ' ').trim();

const normalizeForSearch = (value: string): string => value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

const parseDate = (value: string): string | null => {
  const match = value.match(datePattern);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;

  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const parseAmount = (value: string): number => {
  const normalizedValue = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace('€', '');

  return roundMoney(Number(normalizedValue));
};

const includesKeyword = (line: string, keywords: string[]): boolean => {
  const normalizedLine = normalizeForSearch(line);

  return keywords.some((keyword) => normalizedLine.includes(normalizeForSearch(keyword)));
};

const extractDate = (lines: string[], rules: ReceiptExtractionRules): ReceiptExtractionCandidate<string> | null => {
  const keywordLine = lines.find((line) => includesKeyword(line, rules.dateKeywords) && parseDate(line));

  if (keywordLine) {
    return {
      value: parseDate(keywordLine) ?? '',
      confidence: 0.86,
      reason: `Datum aus Zeile mit passendem Stichwort erkannt: "${keywordLine}"`,
    };
  }

  const firstDateLine = lines.find((line) => parseDate(line));

  if (!firstDateLine) {
    return null;
  }

  return {
    value: parseDate(firstDateLine) ?? '',
    confidence: 0.62,
    reason: `Erstes plausibles Datum im Beleg erkannt: "${firstDateLine}"`,
  };
};

const extractVendor = (lines: string[], rules: ReceiptExtractionRules): ReceiptExtractionCandidate<string> | null => {
  const preferredLines = lines.slice(0, rules.vendorLines.preferTopLines);
  const vendorLine = preferredLines.find((line) => {
    const hasLetters = /[A-Za-zÄÖÜäöüß]{3,}/.test(line);
    const hasIgnoredKeyword = includesKeyword(line, rules.vendorLines.ignoreKeywords);
    const isMostlyNumbers = line.replace(/\D/g, '').length > line.length / 2;

    return hasLetters && !hasIgnoredKeyword && !isMostlyNumbers;
  });

  if (!vendorLine) {
    return null;
  }

  return {
    value: vendorLine,
    confidence: 0.58,
    reason: `Lieferant aus den oberen ${rules.vendorLines.preferTopLines} Zeilen geschätzt.`,
  };
};

const collectAmountCandidates = (lines: string[]): AmountCandidate[] =>
  lines.flatMap((line, lineIndex) =>
    [...line.matchAll(amountPattern)].map((match) => ({
      amount: parseAmount(match[0]),
      line,
      lineIndex,
    })),
  );

const findAmountByKeyword = (
  lines: string[],
  keywords: string[],
  label: string,
): ReceiptExtractionCandidate<number> | null => {
  for (const [lineIndex, line] of lines.entries()) {
    if (!includesKeyword(line, keywords)) {
      continue;
    }

    const amounts = collectAmountCandidates([line]);
    const amount = amounts[amounts.length - 1];

    if (amount) {
      return {
        value: amount.amount,
        confidence: 0.82,
        reason: `${label} aus Zeile mit passendem Stichwort erkannt: "${line}"`,
      };
    }

    const nextLine = lines[lineIndex + 1];
    const nextLineAmounts = nextLine ? collectAmountCandidates([nextLine]) : [];
    const nextLineAmount = nextLineAmounts[0] ?? null;

    if (nextLineAmount) {
      return {
        value: nextLineAmount.amount,
        confidence: 0.7,
        reason: `${label} aus Folgezeile nach passendem Stichwort erkannt: "${line}"`,
      };
    }
  }

  return null;
};

const findVatAmount = (lines: string[], keywords: string[]): ReceiptExtractionCandidate<number> | null => {
  const vatAmounts = lines
    .filter((line) => includesKeyword(line, keywords))
    .map((line) => {
      const normalizedLine = normalizeForSearch(line);
      const keywordIndex = keywords
        .map((keyword) => normalizedLine.indexOf(normalizeForSearch(keyword)))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0];
      const textAfterKeyword = keywordIndex === undefined ? line : line.slice(keywordIndex);
      const amounts = collectAmountCandidates([textAfterKeyword]);
      const amount = amounts[amounts.length - 1];

      return amount ? { ...amount, line } : null;
    })
    .filter((candidate): candidate is AmountCandidate => candidate !== null);

  if (vatAmounts.length === 0) {
    return null;
  }

  if (vatAmounts.length === 1) {
    const [vatAmount] = vatAmounts;

    return {
      value: vatAmount.amount,
      confidence: 0.82,
      reason: `MwSt. aus Zeile mit passendem Stichwort erkannt: "${vatAmount.line}"`,
    };
  }

  return {
    value: roundMoney(vatAmounts.reduce((sum, candidate) => sum + candidate.amount, 0)),
    confidence: 0.78,
    reason: `Mehrere MwSt.-Zeilen erkannt und addiert: ${vatAmounts.map((candidate) => `"${candidate.line}"`).join(', ')}`,
  };
};

const getHighestAmount = (lines: string[]): ReceiptExtractionCandidate<number> | null => {
  const amountCandidates = collectAmountCandidates(lines)
    .filter((candidate) => candidate.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const highestAmount = amountCandidates[0];

  if (!highestAmount) {
    return null;
  }

  return {
    value: highestAmount.amount,
    confidence: 0.55,
    reason: `Größter erkannter Betrag als Brutto geschätzt: "${highestAmount.line}"`,
  };
};

const deriveMissingAmounts = (
  net: ReceiptExtractionCandidate<number> | null,
  vat: ReceiptExtractionCandidate<number> | null,
  gross: ReceiptExtractionCandidate<number> | null,
  rules: ReceiptExtractionRules,
): Pick<ReceiptExtractionResult, 'net' | 'vat' | 'gross'> => {
  if (net && vat && !gross) {
    return {
      net,
      vat,
      gross: {
        value: calculateGross(net.value, vat.value),
        confidence: 0.72,
        reason: 'Brutto aus Netto plus MwSt. berechnet.',
      },
    };
  }

  if (gross && vat && !net) {
    return {
      net: {
        value: roundMoney(gross.value - vat.value),
        confidence: 0.72,
        reason: 'Netto aus Brutto minus MwSt. berechnet.',
      },
      vat,
      gross,
    };
  }

  if (gross && !net && !vat) {
    const vatRate = rules.vatRates[rules.vatRates.length - 1] ?? 19;
    const derivedNet = roundMoney(gross.value / (1 + vatRate / 100));

    return {
      net: {
        value: derivedNet,
        confidence: 0.42,
        reason: `Netto aus Brutto mit ${vatRate}% MwSt. geschätzt.`,
      },
      vat: {
        value: roundMoney(gross.value - derivedNet),
        confidence: 0.42,
        reason: `MwSt. aus Brutto mit ${vatRate}% MwSt. geschätzt.`,
      },
      gross,
    };
  }

  return { net, vat, gross };
};

export const extractReceiptData = (
  rawText: string,
  rules: ReceiptExtractionRules = defaultReceiptRules,
): ReceiptExtractionResult => {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const date = extractDate(lines, rules);
  const vendor = extractVendor(lines, rules);
  const net = findAmountByKeyword(lines, rules.amountKeywords.net, 'Netto');
  const vat = findVatAmount(lines, rules.amountKeywords.vat);
  const gross = findAmountByKeyword(lines, rules.amountKeywords.gross, 'Brutto') ?? getHighestAmount(lines);
  const amounts = deriveMissingAmounts(net, vat, gross, rules);

  return {
    date,
    vendor,
    ...amounts,
    rawText,
  };
};
