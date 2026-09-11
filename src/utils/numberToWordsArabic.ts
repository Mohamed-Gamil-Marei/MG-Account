/**
 * Arabic Number to Words Converter (Tafqeet / تفقيط الأرقام بالجنيه المصري)
 * مصمم خصيصاً للتعاملات المالية والقانونية والشهادات والشيكات المصرية
 */

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertChunk(num: number): string {
  if (num === 0) return '';
  let result = '';

  const h = Math.floor(num / 100);
  const remainder = num % 100;

  if (h > 0) {
    result += hundreds[h];
  }

  if (remainder > 0) {
    if (result !== '') result += ' و';

    if (remainder < 20) {
      result += ones[remainder];
    } else {
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      if (o > 0) {
        result += ones[o] + ' و' + tens[t];
      } else {
        result += tens[t];
      }
    }
  }

  return result;
}

export function numberToArabicWords(amount: number, currency: string = 'جنيه مصري', subUnit: string = 'قرش'): string {
  if (amount === 0 || isNaN(amount)) {
    return `فقط صفر ${currency} لا غير`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let words = '';

  if (integerPart === 0) {
    words = 'صفر';
  } else {
    const billions = Math.floor(integerPart / 1000000000);
    const millions = Math.floor((integerPart % 1000000000) / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    const parts: string[] = [];

    if (billions > 0) {
      if (billions === 1) parts.push('مليار');
      else if (billions === 2) parts.push('ملياران');
      else if (billions >= 3 && billions <= 10) parts.push(convertChunk(billions) + ' مليارات');
      else parts.push(convertChunk(billions) + ' مليار');
    }

    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else if (millions >= 3 && millions <= 10) parts.push(convertChunk(millions) + ' ملايين');
      else parts.push(convertChunk(millions) + ' مليون');
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(convertChunk(thousands) + ' آلاف');
      else parts.push(convertChunk(thousands) + ' ألف');
    }

    if (remainder > 0) {
      parts.push(convertChunk(remainder));
    }

    words = parts.join(' و');
  }

  let finalOutput = `فقط وقدره ${words} ${currency}اً`;

  if (decimalPart > 0) {
    finalOutput += ` و${convertChunk(decimalPart)} ${subUnit}اً`;
  }

  finalOutput += ' لا غير';

  if (isNegative) {
    finalOutput = 'سالب ' + finalOutput;
  }

  return finalOutput;
}

/**
 * Sanitizes Arabic financial tafqeet strings to guarantee no duplicates of
 * "فقط وقدره" at the start or "لا غير" at the end.
 */
export function cleanArabicTafqeet(text: string): string {
  if (!text) return '';
  let res = text.trim();
  // Strip duplicate or repeated "فقط وقدره" / "فقط"
  res = res.replace(/^(فقط\s*(وقدره)?\s*)+/g, 'فقط وقدره ');
  // Strip duplicate "لا غير"
  res = res.replace(/(\s*لا غير\.?)+$/g, ' لا غير.');
  return res.trim();
}
