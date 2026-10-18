/**
 * تفقيط المبالغ المالية باللغة العربية الفصحى للجنيه المصري والقرش
 */

const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = [
  '',
  'عشرة',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertThreeDigits(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (rem > 0) {
    if (rem < 20) {
      parts.push(ONES[rem]);
    } else {
      const u = rem % 10;
      const t = Math.floor(rem / 10);
      if (u > 0) {
        parts.push(`${ONES[u]} و${TENS[t]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' و');
}

export function numberToArabicWords(amount: number, currencyLabel = 'جنيه مصري', subCurrencyLabel = 'قرش'): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return `صفر ${currencyLabel} فقط لا غير`;
  }

  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const millions = Math.floor(integerPart / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const ones = integerPart % 1_000;

  const sections: string[] = [];

  if (millions > 0) {
    if (millions === 1) sections.push('مليون');
    else if (millions === 2) sections.push('مليونان');
    else if (millions >= 3 && millions <= 10) sections.push(`${convertThreeDigits(millions)} ملايين`);
    else sections.push(`${convertThreeDigits(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) sections.push('ألف');
    else if (thousands === 2) sections.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) sections.push(`${convertThreeDigits(thousands)} آلاف`);
    else sections.push(`${convertThreeDigits(thousands)} ألف`);
  }

  if (ones > 0) {
    sections.push(convertThreeDigits(ones));
  }

  const mainText = sections.length > 0 ? `${sections.join(' و')} ${currencyLabel}` : '';
  const subText = decimalPart > 0 ? `${convertThreeDigits(decimalPart)} ${subCurrencyLabel}` : '';

  const combined = [mainText, subText].filter(Boolean).join(' و');
  return `فقط وقدره ${combined} لا غير`;
}
