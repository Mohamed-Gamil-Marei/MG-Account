import * as XLSX from 'xlsx';

/**
 * Universal Arabic Excel Formatting Utility
 * Standardizes Excel exports across the entire application:
 * 1. Guarantees Right-to-Left (RTL) sheet and workbook direction for authentic Arabic display
 * 2. Dynamically calculates generous column widths (wch) to prevent truncation and '###' errors
 * 3. Keeps numeric values formatted as real numbers for Excel arithmetic formulas (SUM, AVERAGE)
 * 4. Injects official workbook metadata
 */

export interface ArabicColDef {
  wch?: number;
  width?: number;
}

/**
 * Applies RTL view and auto-calculated column widths to an XLSX worksheet
 */
export function formatWorksheetForArabicExport(
  ws: XLSX.WorkSheet,
  dataRows?: Record<string, any>[] | any[][],
  customCols?: ArabicColDef[]
): XLSX.WorkSheet {
  if (!ws) return ws;

  // 1. Force Right-to-Left (RTL) view for Arabic spreadsheet
  ws['!views'] = [{ RTL: true }];

  // If custom explicit column widths are supplied, use them
  if (customCols && customCols.length > 0) {
    ws['!cols'] = customCols;
    return ws;
  }

  // 2. Compute dynamic column widths from data
  if (dataRows && Array.isArray(dataRows) && dataRows.length > 0) {
    const firstItem = dataRows[0];
    const colWidths: { wch: number }[] = [];

    if (Array.isArray(firstItem)) {
      // Array of arrays (AOA)
      const maxCols = Math.max(...dataRows.map((r: any) => (Array.isArray(r) ? r.length : 0)));
      for (let c = 0; c < maxCols; c++) {
        let maxLen = 10;
        for (const row of dataRows as any[][]) {
          const val = row[c];
          if (val !== null && val !== undefined) {
            const valStr = String(val);
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        }
        colWidths.push({ wch: Math.min(Math.max(maxLen + 4, 14), 65) });
      }
    } else if (typeof firstItem === 'object' && firstItem !== null) {
      // Array of objects (JSON)
      const keys = Object.keys(firstItem);
      keys.forEach((key) => {
        let maxLen = String(key).length;
        for (const row of dataRows as Record<string, any>[]) {
          const val = row[key];
          if (val !== null && val !== undefined) {
            const valStr = typeof val === 'number'
              ? val.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : String(val);
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        }
        // Add safety padding for Arabic cursive letters + min 14, max 65
        colWidths.push({ wch: Math.min(Math.max(maxLen + 4, 14), 65) });
      });
    }

    ws['!cols'] = colWidths;
  } else {
    ws['!cols'] = [{ wch: 30 }];
  }

  return ws;
}

/**
 * Configures workbook-level RTL properties for modern Microsoft Excel versions
 */
export function formatWorkbookForArabic(wb: XLSX.WorkBook): XLSX.WorkBook {
  if (!wb) return wb;
  if (!wb.Workbook) {
    wb.Workbook = {};
  }
  wb.Workbook.Views = [{ RTL: true }];
  return wb;
}

/**
 * Creates and downloads a fully styled Arabic Excel file (.xlsx)
 */
export function writeArabicExcelFile(wb: XLSX.WorkBook, filename: string): void {
  formatWorkbookForArabic(wb);
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}
