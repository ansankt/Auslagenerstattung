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
  taxRows: ReceiptTaxTableRow[];
  rawText: string;
}

interface AmountCandidate {
  amount: number;
  line: string;
  lineIndex: number;
}

export interface ReceiptTaxTableRow {
  rate: number;
  net: number;
  vat: number;
  gross: number;
  line: string;
}

const datePattern = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;
const textDatePattern =
  /\b(\d{1,2})\.?\s+(januar|februar|maerz|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+(\d{2,4})\b/i;
const amountPattern =
  /(?:€\s*)?(?:-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[,.]\d{2}))(?:\s*(?:€|eur))?|(?:€\s*)-?\d+|-?\d+\s*(?:€|eur)/gi;
const monthNumbers: Record<string, string> = {
  januar: '01',
  februar: '02',
  maerz: '03',
  märz: '03',
  april: '04',
  mai: '05',
  juni: '06',
  juli: '07',
  august: '08',
  september: '09',
  oktober: '10',
  november: '11',
  dezember: '12',
};

const normalizeLine = (line: string): string => line.replace(/\s+/g, ' ').trim();

const buildNormalizedLines = (rawText: string): string[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const normalizedLines: string[] = [];

  for (const line of lines) {
    const previousLine = normalizedLines[normalizedLines.length - 1];

    if (/^(€|eur)$/i.test(line) && previousLine) {
      normalizedLines[normalizedLines.length - 1] = `${previousLine} ${line}`;
      continue;
    }

    normalizedLines.push(line);
  }

  return normalizedLines;
};

const normalizeForSearch = (value: string): string => value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

const cleanVendorName = (value: string): string =>
  value
    .replace(/^[^A-Za-zÄÖÜäöüß]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const parseDate = (value: string): string | null => {
  const match = value.match(datePattern);

  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;

    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const textMatch = value.match(textDatePattern);

  if (!textMatch) {
    return null;
  }

  const [, day, monthName, year] = textMatch;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const month = monthNumbers[monthName.toLowerCase()];

  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const parseAmount = (value: string): number => {
  const compactValue = value.replace(/\s/g, '').replace('€', '').replace(/eur/i, '');
  const normalizedValue = compactValue.includes(',')
    ? compactValue.replace(/\./g, '').replace(',', '.')
    : compactValue.replace(/\.(?=\d{3}(?:\D|$))/g, '');

  return roundMoney(Number(normalizedValue));
};

const includesKeyword = (line: string, keywords: string[]): boolean => {
  const normalizedLine = normalizeForSearch(line);

  return keywords.some((keyword) => normalizedLine.includes(normalizeForSearch(keyword)));
};

const isGrossKeywordLine = (line: string, keywords: string[]): boolean =>
  includesKeyword(line, keywords) && !includesKeyword(line, ['zwischensumme']);

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
  const fullText = normalizeForSearch(lines.join('\n'));
  const knownVendor = rules.knownVendors.find((vendor) =>
    vendor.keywords.some((keyword) => fullText.includes(normalizeForSearch(keyword))),
  );

  if (knownVendor) {
    return {
      value: knownVendor.name,
      confidence: 0.9,
      reason: `Lieferant über bekanntes Muster erkannt: "${knownVendor.name}"`,
    };
  }

  const keywordVendor = lines.find((line) => /^verkauft von\s+.+/i.test(line));

  if (keywordVendor) {
    return {
      value: cleanVendorName(keywordVendor.replace(/^verkauft von\s+/i, '')),
      confidence: 0.86,
      reason: `Lieferant aus "Verkauft von" erkannt: "${keywordVendor}"`,
    };
  }

  const senderIndex = lines.findIndex((line) => includesKeyword(line, ['absender']));
  const senderLine = senderIndex >= 0 ? lines.slice(senderIndex + 1).find(Boolean) : null;

  if (senderLine) {
    return {
      value: cleanVendorName(senderLine),
      confidence: 0.82,
      reason: `Lieferant aus Absender-Block erkannt: "${senderLine}"`,
    };
  }

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
    value: cleanVendorName(vendorLine),
    confidence: 0.58,
    reason: `Lieferant aus den oberen ${rules.vendorLines.preferTopLines} Zeilen geschätzt.`,
  };
};

const collectAmountCandidates = (lines: string[]): AmountCandidate[] =>
  lines.flatMap((line, lineIndex) =>
    [...line.matchAll(amountPattern)]
      .filter((match) => {
        const matchEnd = (match.index ?? 0) + match[0].length;
        const nextCharacter = line[matchEnd] ?? '';

        return nextCharacter !== '%' && !/[./-]/.test(nextCharacter);
      })
      .map((match) => ({
        amount: parseAmount(match[0]),
        line,
        lineIndex,
      })),
  );

const collectLineAmounts = (line: string): number[] => collectAmountCandidates([line]).map((candidate) => candidate.amount);

const getTaxRateFromLine = (line: string, amounts: number[]): number | null => {
  const explicitRateMatch = line.match(/(?:^|\s|[A-Z][.\s]+)(0|7|19)(?:[,.]00)?\s*%/i);

  if (explicitRateMatch) {
    return Number(explicitRateMatch[1]);
  }

  if (/(?:^|\s)[A-Z][.\s]+(?:7|t|th)(?:\s|$)/i.test(line)) {
    return 7;
  }

  const firstAmount = amounts[0];

  return firstAmount !== undefined && [0, 7, 19].includes(firstAmount) ? firstAmount : null;
};

const getTaxRowAmounts = (line: string): { rate: number; amounts: number[] } | null => {
  const amounts = collectLineAmounts(line);
  const rate = getTaxRateFromLine(line, amounts);

  if (rate === null) {
    return null;
  }

  const rowAmounts = amounts[0] === rate && amounts.length >= 4 ? amounts.slice(1) : amounts;

  return rowAmounts.length >= 3 ? { rate, amounts: rowAmounts } : null;
};

const scoreTaxAmountCombination = (rate: number, net: number, vat: number, gross: number): number =>
  Math.abs(roundMoney(net * (rate / 100)) - roundMoney(vat)) + Math.abs(roundMoney(net + vat) - roundMoney(gross));

const repairTaxTableRow = (row: ReceiptTaxTableRow): ReceiptTaxTableRow | null => {
  const expectedVatFromNet = roundMoney(row.net * (row.rate / 100));
  const expectedVatFromGross = roundMoney(row.gross - row.net);

  if (expectedVatFromNet === expectedVatFromGross) {
    return {
      ...row,
      vat: expectedVatFromGross,
    };
  }

  const expectedNetFromGross = roundMoney(row.gross / (1 + row.rate / 100));

  if (expectedNetFromGross === row.net) {
    return {
      ...row,
      vat: roundMoney(row.gross - row.net),
    };
  }

  const expectedGrossFromNet = roundMoney(row.net + row.vat);

  if (roundMoney(row.net * (row.rate / 100)) === row.vat && expectedGrossFromNet !== row.gross) {
    return {
      ...row,
      gross: expectedGrossFromNet,
    };
  }

  return null;
};

const parseTaxTableRow = (line: string, header: string | null): ReceiptTaxTableRow | null => {
  const row = getTaxRowAmounts(line);

  if (!row) {
    return null;
  }

  const { rate, amounts } = row;
  const normalizedHeader = header ? normalizeForSearch(header) : '';
  const nettoIndex = normalizedHeader.indexOf('netto');
  const vatIndex = Math.max(normalizedHeader.lastIndexOf('mwst'), normalizedHeader.lastIndexOf('mhst'));
  const grossIndex = Math.max(normalizedHeader.indexOf('brutto'), normalizedHeader.indexOf('umsatz'));
  const headerOrderedAmounts = amounts.length >= 3 ? amounts.slice(-3) : amounts;
  let headerCandidate: ReceiptTaxTableRow | null = null;

  if (nettoIndex >= 0 && vatIndex >= 0 && grossIndex >= 0 && nettoIndex < vatIndex && vatIndex < grossIndex) {
    headerCandidate = {
      rate,
      net: headerOrderedAmounts[0],
      vat: headerOrderedAmounts[1],
      gross: headerOrderedAmounts[2],
      line,
    };
  }

  if (vatIndex >= 0 && nettoIndex >= 0 && grossIndex >= 0 && vatIndex < nettoIndex && nettoIndex < grossIndex) {
    headerCandidate = {
      rate,
      vat: headerOrderedAmounts[0],
      net: headerOrderedAmounts[1],
      gross: headerOrderedAmounts[2],
      line,
    };
  }

  if (vatIndex >= 0 && grossIndex >= 0 && nettoIndex >= 0 && vatIndex < grossIndex && grossIndex < nettoIndex) {
    headerCandidate = {
      rate,
      vat: headerOrderedAmounts[0],
      gross: headerOrderedAmounts[1],
      net: headerOrderedAmounts[2],
      line,
    };
  }

  const mathCandidates = amounts.flatMap((net, netIndex) =>
    amounts.flatMap((vat, vatIndexCandidate) =>
      amounts
        .map((gross, grossIndexCandidate) => ({ net, vat, gross, grossIndexCandidate }))
        .filter(
          ({ grossIndexCandidate }) =>
            netIndex !== vatIndexCandidate && netIndex !== grossIndexCandidate && vatIndexCandidate !== grossIndexCandidate,
        ),
    ),
  );
  const bestMathCandidate = mathCandidates
    .map((candidate) => ({
      ...candidate,
      score: scoreTaxAmountCombination(rate, candidate.net, candidate.vat, candidate.gross),
    }))
    .sort((a, b) => a.score - b.score)[0];

  if (bestMathCandidate && bestMathCandidate.score <= 0.02) {
    return {
      rate,
      net: bestMathCandidate.net,
      vat: bestMathCandidate.vat,
      gross: bestMathCandidate.gross,
      line,
    };
  }

  if (headerCandidate && scoreTaxAmountCombination(rate, headerCandidate.net, headerCandidate.vat, headerCandidate.gross) <= 0.02) {
    return headerCandidate;
  }

  return headerCandidate ? repairTaxTableRow(headerCandidate) : null;
};

const getTaxTableRows = (lines: string[]): ReceiptTaxTableRow[] => {
  let currentTaxHeader: string | null = null;
  const rows: ReceiptTaxTableRow[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (includesKeyword(line, ['mwst', 'mhst']) && includesKeyword(line, ['netto', 'nett', 'brutto', 'umsatz'])) {
      currentTaxHeader = line;
    }

    const row = parseTaxTableRow(line, currentTaxHeader);

    if (row) {
      rows.push(row);
      continue;
    }

    const amounts = collectLineAmounts(line);

    if (getTaxRateFromLine(line, amounts) === null) {
      continue;
    }

    const continuedLine = [line, ...lines.slice(lineIndex + 1, lineIndex + 3)].join(' ');
    const continuedRow = parseTaxTableRow(continuedLine, currentTaxHeader);

    if (continuedRow) {
      rows.push(continuedRow);
    }
  }

  return rows;
};

const getTaxTableSummary = (
  rows: ReceiptTaxTableRow[],
): Pick<ReceiptExtractionResult, 'net' | 'vat' | 'gross'> | null => {
  if (rows.length === 0) {
    return null;
  }

  return {
    net: {
      value: roundMoney(rows.reduce((sum, row) => sum + row.net, 0)),
      confidence: 0.84,
      reason: `Netto aus Steuertabelle berechnet: ${rows.map((row) => `"${row.line}"`).join(', ')}`,
    },
    vat: {
      value: roundMoney(rows.reduce((sum, row) => sum + row.vat, 0)),
      confidence: 0.86,
      reason: `MwSt. aus Steuertabelle berechnet: ${rows.map((row) => `"${row.line}"`).join(', ')}`,
    },
    gross: {
      value: roundMoney(rows.reduce((sum, row) => sum + row.gross, 0)),
      confidence: 0.84,
      reason: `Brutto aus Steuertabelle berechnet: ${rows.map((row) => `"${row.line}"`).join(', ')}`,
    },
  };
};

const findAmountByKeyword = (
  lines: string[],
  keywords: string[],
  label: string,
): ReceiptExtractionCandidate<number> | null => {
  for (const [lineIndex, line] of lines.entries()) {
    if (label === 'Brutto' ? !isGrossKeywordLine(line, keywords) : !includesKeyword(line, keywords)) {
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

    const nextLines = lines.slice(lineIndex + 1, lineIndex + 5);
    const nextLineAmounts = collectAmountCandidates(nextLines);
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
  const inlineVatSummary = lines.find((line) => {
    const normalizedLine = normalizeForSearch(line);

    return normalizedLine.includes('mwst') && normalizedLine.includes('brutto') && normalizedLine.includes('nett');
  });
  const inlineVatSummaryAmount = inlineVatSummary ? collectLineAmounts(inlineVatSummary)[0] : null;

  if (inlineVatSummaryAmount !== null && inlineVatSummaryAmount !== undefined) {
    return {
      value: inlineVatSummaryAmount,
      confidence: 0.76,
      reason: `MwSt. aus zusammengefasster Steuerzeile erkannt: "${inlineVatSummary}"`,
    };
  }

  const vatTableRows = getTaxTableRows(lines);

  if (vatTableRows.length > 0) {
    return {
      value: roundMoney(vatTableRows.reduce((sum, row) => sum + row.vat, 0)),
      confidence: 0.86,
      reason: `MwSt. aus Steuertabelle berechnet: ${vatTableRows.map((row) => `"${row.line}"`).join(', ')}`,
    };
  }

  const getVatBlockAmount = (lineIndex: number): AmountCandidate | null => {
    const currentLineAmounts = collectAmountCandidates([lines[lineIndex]]);

    if (currentLineAmounts.length > 0) {
      const currentLineAmount = currentLineAmounts[currentLineAmounts.length - 1];

      return { ...currentLineAmount, line: lines[lineIndex] };
    }

    const nextTaxTableLine = lines
      .slice(lineIndex + 1, lineIndex + 4)
      .find((line) => /(?:^|\s)?(?:[A-Z]{1,2}[.\s]+)?(?:7|19)(?:[,.]00)?\s*%/.test(line));
    const nextTaxTableRow = nextTaxTableLine ? parseTaxTableRow(nextTaxTableLine, lines[lineIndex]) : null;

    if (nextTaxTableRow !== null) {
      return { amount: nextTaxTableRow.vat, line: nextTaxTableLine ?? lines[lineIndex], lineIndex };
    }

    const blockLines = [lines[lineIndex]];

    for (const nextLine of lines.slice(lineIndex + 1, lineIndex + 7)) {
      if (includesKeyword(nextLine, keywords) || isGrossKeywordLine(nextLine, defaultReceiptRules.amountKeywords.gross)) {
        break;
      }

      blockLines.push(nextLine);
    }

    const amounts = collectAmountCandidates(blockLines);

    return amounts[amounts.length - 1] ? { ...amounts[amounts.length - 1], line: lines[lineIndex] } : null;
  };

  const vatLines = lines
    .map((line, lineIndex) => ({ line, lineIndex }))
    .filter(({ line }) => includesKeyword(line, keywords) && !includesKeyword(line, ['ohne ust', 'ust. %']));
  const totalVatLine = vatLines.find(({ line }) => includesKeyword(line, ['gesamt']));
  const totalVatAmount = totalVatLine ? getVatBlockAmount(totalVatLine.lineIndex) : null;

  if (totalVatAmount) {
    return {
      value: totalVatAmount.amount,
      confidence: 0.82,
      reason: `MwSt. aus Gesamt-Zeile erkannt: "${totalVatAmount.line}"`,
    };
  }

  const vatAmounts = vatLines
    .map(({ lineIndex }) => getVatBlockAmount(lineIndex))
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

  if (net && gross && !vat) {
    return {
      net,
      vat: {
        value: roundMoney(gross.value - net.value),
        confidence: 0.7,
        reason: 'MwSt. aus Brutto minus Netto berechnet.',
      },
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
  const lines = buildNormalizedLines(rawText);
  const date = extractDate(lines, rules);
  const vendor = extractVendor(lines, rules);
  const taxRows = getTaxTableRows(lines);
  const taxTableSummary = getTaxTableSummary(taxRows);
  const net = taxTableSummary?.net ?? findAmountByKeyword(lines, rules.amountKeywords.net, 'Netto');
  const vat = taxTableSummary?.vat ?? findVatAmount(lines, rules.amountKeywords.vat);
  const gross = taxTableSummary?.gross ?? findAmountByKeyword(lines, rules.amountKeywords.gross, 'Brutto') ?? getHighestAmount(lines);
  const amounts = deriveMissingAmounts(net, vat, gross, rules);

  return {
    date,
    vendor,
    ...amounts,
    taxRows,
    rawText,
  };
};
