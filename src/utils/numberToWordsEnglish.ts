const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertChunk(num: number): string {
  const parts: string[] = [];
  if (num >= 100) {
    parts.push(`${ONES[Math.floor(num / 100)]} Hundred`);
    num %= 100;
  }
  if (num >= 20) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    parts.push(one > 0 ? `${TENS[ten]}-${ONES[one]}` : TENS[ten]);
  } else if (num > 0) {
    parts.push(ONES[num]);
  }
  return parts.join(' ');
}

export function numberToEnglishWords(
  amount: number,
  currencyName = 'Egyptian Pounds',
  subUnitName = 'Piasters'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `Zero ${currencyName} Only`;
  }

  const absVal = Math.abs(amount);
  const intPart = Math.floor(absVal);
  const decPart = Math.round((absVal - intPart) * 100);

  if (intPart === 0 && decPart === 0) {
    return `Zero ${currencyName} Only`;
  }

  const chunks: string[] = [];
  let rem = intPart;
  let scaleIdx = 0;

  while (rem > 0) {
    const chunk = rem % 1000;
    if (chunk > 0) {
      const words = convertChunk(chunk);
      const scale = SCALES[scaleIdx];
      chunks.unshift(scale ? `${words} ${scale}` : words);
    }
    rem = Math.floor(rem / 1000);
    scaleIdx++;
  }

  let result = chunks.length > 0 ? `${chunks.join(', ')} ${currencyName}` : '';
  if (decPart > 0) {
    const decWords = convertChunk(decPart);
    result += result ? ` and ${decWords} ${subUnitName}` : `${decWords} ${subUnitName}`;
  }

  return `${result} Only`;
}
