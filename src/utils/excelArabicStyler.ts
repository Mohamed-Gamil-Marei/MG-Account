import * as XLSX from 'xlsx';

export interface ColumnWidthSpec {
  wch: number;
}

export function formatWorksheetForArabicExport(
  worksheet: XLSX.WorkSheet,
  _rows: Record<string, unknown>[],
  columnWidths?: ColumnWidthSpec[]
): void {
  worksheet['!views'] = [{ RTL: true }];
  if (columnWidths && columnWidths.length > 0) {
    worksheet['!cols'] = columnWidths;
  }
}

export function writeArabicExcelFile(workbook: XLSX.WorkBook, fileName: string): void {
  workbook.Workbook = {
    Views: [{ RTL: true }],
  };
  XLSX.writeFile(workbook, fileName);
}
