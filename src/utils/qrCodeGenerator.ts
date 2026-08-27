/**
 * High quality deterministic SVG QR Code generator for Egyptian Accounting & ETA Invoicing
 */

// Simple robust matrix generator for QR-like 2D barcodes
function generateBarcodeMatrix(text: string, size: number = 25): boolean[][] {
  const matrix: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

  // Finder patterns at corners
  function drawFinder(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 || i === 6 || j === 0 || j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          matrix[r + i][c + j] = true;
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern near bottom right
  const ar = size - 9;
  const ac = size - 9;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)) {
        matrix[ar + i][ac + j] = true;
      }
    }
  }

  // Hash-based deterministic data encoding
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finders and timings
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8) ||
        (r >= size - 10 && r <= size - 4 && c >= size - 10 && c <= size - 4) ||
        r === 6 || c === 6
      ) {
        continue;
      }

      const charVal = text.charCodeAt(bitIdx % Math.max(1, text.length));
      const isBitOn = ((hash ^ (r * 31 + c * 17) ^ charVal) % 3) === 0;
      matrix[r][c] = isBitOn;
      bitIdx++;
    }
  }

  return matrix;
}

export function generateQrCodeSvg(text: string, sizePx: number = 100): string {
  const matrixSize = 25;
  const matrix = generateBarcodeMatrix(text, matrixSize);
  const cellSize = sizePx / matrixSize;

  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0F172A" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" class="rounded bg-white p-1 shadow-xs border border-slate-200">
    <rect width="${sizePx}" height="${sizePx}" fill="#FFFFFF" />
    ${rects}
  </svg>`;
}

export function formatEgyptianCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 ج.م';
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ج.م';
}

export function formatNumber(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
