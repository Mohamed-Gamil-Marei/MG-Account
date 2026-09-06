/**
 * English Number to Words Converter (Tafqeet in English)
 * Designed for International Financial Statements, Auditor Reports, and Invoices
 */

import { CurrencyCode } from '../types';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const CURRENCY_LABELS: Record<CurrencyCode, { main: string; mainPlural: string; sub: string; subPlural: string }> = {
  EGP: { main: 'Egyptian Pound', mainPlural: 'Egyptian Pounds', sub: 'Piaster', subPlural: 'Piasters' },
  USD: { main: 'US Dollar', mainPlural: 'US Dollars', sub: 'Cent', subPlural: 'Cents' },
  EUR: { main: 'Euro', mainPlural: 'Euros', sub: 'Cent', subPlural: 'Cents' },
  SAR: { main: 'Saudi Riyal', mainPlural: 'Saudi Riyals', sub: 'Halala', subPlural: 'Halalas' },
  AED: { main: 'UAE Dirham', mainPlural: 'UAE Dirhams', sub: 'Fils', subPlural: 'Fils' },
  GBP: { main: 'Pound Sterling', mainPlural: 'Pounds Sterling', sub: 'Penny', subPlural: 'Pence' },
  KWD: { main: 'Kuwaiti Dinar', mainPlural: 'Kuwaiti Dinars', sub: 'Fils', subPlural: 'Fils' },
  QAR: { main: 'Qatari Riyal', mainPlural: 'Qatari Riyals', sub: 'Dirham', subPlural: 'Dirhams' },
  CNY: { main: 'Chinese Yuan', mainPlural: 'Chinese Yuan', sub: 'Fen', subPlural: 'Fen' },
};

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  let str = '';

  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred';
    num %= 100;
    if (num > 0) str += ' and ';
  }

  if (num >= 20) {
    str += TENS[Math.floor(num / 10)];
    if (num % 10 > 0) str += '-' + ONES[num % 10];
  } else if (num > 0) {
    str += ONES[num];
  }

  return str;
}

export function numberToEnglishWords(
  amount: number,
  currencyCode: CurrencyCode = 'EGP'
): string {
  if (isNaN(amount) || amount === 0) {
    const cur = CURRENCY_LABELS[currencyCode] || CURRENCY_LABELS.EGP;
    return `Zero ${cur.mainPlural} Only`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const units = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const cur = CURRENCY_LABELS[currencyCode] || CURRENCY_LABELS.EGP;

  let intWords = '';
  if (integerPart === 0) {
    intWords = 'Zero';
  } else {
    let temp = integerPart;
    let unitIdx = 0;
    const parts: string[] = [];

    while (temp > 0) {
      const chunk = temp % 1000;
      if (chunk > 0) {
        const chunkStr = convertLessThanThousand(chunk);
        const unitName = units[unitIdx];
        parts.unshift(unitName ? `${chunkStr} ${unitName}` : chunkStr);
      }
      temp = Math.floor(temp / 1000);
      unitIdx++;
    }
    intWords = parts.join(', ');
  }

  const mainUnit = integerPart === 1 ? cur.main : cur.mainPlural;
  let result = (isNegative ? 'Minus ' : '') + `${intWords} ${mainUnit}`;

  if (decimalPart > 0) {
    const subWords = convertLessThanThousand(decimalPart);
    const subUnit = decimalPart === 1 ? cur.sub : cur.subPlural;
    result += ` and ${subWords} ${subUnit}`;
  }

  return `${result} Only`;
}
