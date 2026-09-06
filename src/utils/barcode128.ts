/**
 * Code 128 (ISO/IEC 15417) Linear Barcode Generator
 * Generates crisp, high-contrast, scalable Vector SVG barcodes
 * Compatible with all standard 1D laser scanners, banking optical readers, and mobile scanner apps.
 */

// Code 128 B patterns (modules representing bar/space widths)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=StartA, 104=StartB, 105=StartC, 106=Stop)
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes ASCII string into Code 128 (Subset B)
 */
export function encodeCode128B(text: string): { widths: number[]; checksum: number } {
  const cleanText = text.replace(/[^\x20-\x7E]/g, '-'); // keep printable ASCII
  const charCodes: number[] = [START_B];

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32; // Code 128 B values 0-95
    charCodes.push(code);
  }

  // Calculate Checksum: (START + SUM(index * charCode)) % 103
  let checksumSum = START_B;
  for (let i = 1; i < charCodes.length; i++) {
    checksumSum += i * charCodes[i];
  }
  const checksum = checksumSum % 103;
  charCodes.push(checksum);
  charCodes.push(STOP);

  // Convert to widths array (alternating bar and space)
  const widths: number[] = [];
  for (let i = 0; i < charCodes.length; i++) {
    const pattern = CODE128_PATTERNS[charCodes[i]];
    if (pattern) {
      for (let j = 0; j < pattern.length; j++) {
        widths.push(parseInt(pattern[j], 10));
      }
    }
  }

  return { widths, checksum };
}

/**
 * Generates an SVG string of a Code 128 barcode
 * @param text The string to encode (e.g. CERT-2026-0001)
 * @param options Styling options
 */
export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    width?: number;
    moduleWidth?: number;
    showText?: boolean;
    barColor?: string;
    bgColor?: string;
    fontSize?: number;
    quietZone?: boolean;
  } = {}
): string {
  const {
    height = 42,
    moduleWidth = 1.6,
    showText = true,
    barColor = '#000000',
    bgColor = '#FFFFFF',
    fontSize = 10,
    quietZone = true,
  } = options;

  const { widths } = encodeCode128B(text || 'CERT-2026-0001');

  const totalModules = widths.reduce((a, b) => a + b, 0);
  const quietModules = quietZone ? 10 : 2;
  const totalWidthUnits = (totalModules + quietModules * 2) * moduleWidth;
  const totalHeightUnits = height + (showText ? fontSize + 4 : 0);

  let currentX = quietModules * moduleWidth;
  let isBar = true;
  let rectsSvg = '';

  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] * moduleWidth;
    if (isBar) {
      rectsSvg += `<rect x="${currentX.toFixed(2)}" y="2" width="${w.toFixed(2)}" height="${height}" fill="${barColor}" />`;
    }
    currentX += w;
    isBar = !isBar;
  }

  const textSvg = showText
    ? `<text x="${(totalWidthUnits / 2).toFixed(2)}" y="${(height + fontSize + 2).toFixed(
        2
      )}" text-anchor="middle" font-family="monospace, Courier, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${barColor}" letter-spacing="1.5">${text}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidthUnits.toFixed(2)} ${totalHeightUnits.toFixed(
    2
  )}" width="100%" height="${totalHeightUnits}" style="max-width: ${totalWidthUnits.toFixed(2)}px; display: inline-block;">
    <rect width="100%" height="100%" fill="${bgColor}" />
    ${rectsSvg}
    ${textSvg}
  </svg>`;
}
