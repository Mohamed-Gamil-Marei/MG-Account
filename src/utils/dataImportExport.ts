import * as XLSX from 'xlsx';
import { DatabaseState, db } from '../db/localDatabase';

export type ModelType =
  | 'ALL_DATA'
  | 'ACCOUNTS'
  | 'JOURNAL'
  | 'CLIENTS'
  | 'TREASURY'
  | 'TAXES'
  | 'CERTIFICATES'
  | 'INVOICES'
  | 'FEASIBILITY'
  | 'CREDIT_SIM';

export type ExportFormat = 'EXCEL' | 'XLSX' | 'CSV' | 'JSON' | 'TXT';

export function triggerFileDownload(content: string | Blob, fileName: string, mimeType = 'application/json;charset=utf-8;'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportModelData(
  model: ModelType | string,
  format: ExportFormat,
  state: DatabaseState,
  _customDocument?: any
): { success: boolean; fileName: string; message: string } {
  const datePart = new Date().toISOString().slice(0, 10);
  const ext = format === 'EXCEL' || format === 'XLSX' ? 'xlsx' : format === 'CSV' ? 'csv' : format === 'TXT' ? 'txt' : 'json';
  const fileName = `MG_CPA_${model}_${datePart}.${ext}`;

  let dataToExport: any;
  switch (model) {
    case 'ALL_DATA':
      dataToExport = state;
      break;
    case 'ACCOUNTS':
      dataToExport = state.accounts;
      break;
    case 'JOURNAL':
      dataToExport = state.journalEntries;
      break;
    case 'CLIENTS':
      dataToExport = state.clients;
      break;
    case 'TREASURY':
      dataToExport = state.treasuryTransactions;
      break;
    case 'TAXES':
      dataToExport = state.taxDeclarations;
      break;
    case 'CERTIFICATES':
      dataToExport = state.certificates;
      break;
    case 'INVOICES':
      dataToExport = state.invoices;
      break;
    case 'FEASIBILITY':
      dataToExport = state.feasibilityStudies;
      break;
    case 'CREDIT_SIM':
      dataToExport = state.creditSimulations;
      break;
    default:
      dataToExport = state;
  }

  if (format === 'JSON' || format === 'TXT') {
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    triggerFileDownload(jsonStr, fileName, format === 'JSON' ? 'application/json;charset=utf-8;' : 'text/plain;charset=utf-8;');
    return { success: true, fileName, message: 'تم تصدير البيانات بنجاح' };
  }

  const wb = XLSX.utils.book_new();
  if (model === 'ALL_DATA') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.accounts || []), 'Accounts');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.clients || []), 'Clients');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.journalEntries || []), 'JournalEntries');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.treasuryTransactions || []), 'Treasury');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.invoices || []), 'Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.taxDeclarations || []), 'Taxes');
  } else {
    const rows = Array.isArray(dataToExport) ? dataToExport : [dataToExport];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), model);
  }

  if (format === 'CSV') {
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(firstSheet);
    triggerFileDownload(csv, fileName, 'text/csv;charset=utf-8;');
  } else {
    XLSX.writeFile(wb, fileName);
  }

  return { success: true, fileName, message: 'تم تصدير الملف بنجاح' };
}

export async function importModelData(
  file: File,
  targetModel: ModelType
): Promise<{ success: boolean; message: string; importedCount?: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json' || ext === 'txt') {
    const text = await file.text();
    if (targetModel === 'ALL_DATA') {
      try {
        const res = await db.restoreFullBackupJson(text);
        return {
          success: true,
          message: res.message || 'تمت استعادة النسخة الاحتياطية بنجاح!',
          importedCount: res.clientsRestored + res.entriesRestored,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'فشلت استعادة النسخة الاحتياطية.',
        };
      }
    }
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.data || [];
    if (targetModel === 'CLIENTS' && Array.isArray(items)) {
      db.batchAddClients(items);
      return { success: true, message: `تم استيراد ${items.length} عميل بنجاح.`, importedCount: items.length };
    }
    if (targetModel === 'ACCOUNTS' && Array.isArray(items)) {
      const result = db.batchImportAccounts(items);
      if (result.errors.length > 0 && result.imported === 0) {
        return {
          success: false,
          message: `فشل استيراد الحسابات:\n${result.errors.slice(0, 5).join('\n')}`,
        };
      }
      return {
        success: true,
        message: `تم استيراد ${result.imported} حساب بنجاح.${result.failed > 0 ? ` (تم تخطي ${result.failed} أخطاء/تكرارات)` : ''}`,
        importedCount: result.imported,
      };
    }
    return { success: true, message: 'تم استيراد ملف البيانات بنجاح.' };
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

  if (targetModel === 'CLIENTS') {
    db.batchAddClients(rows as any);
  } else if (targetModel === 'ACCOUNTS') {
    const result = db.batchImportAccounts(rows);
    if (result.errors.length > 0 && result.imported === 0) {
      return {
        success: false,
        message: `فشل استيراد الحسابات من ملف الإكسل:\n${result.errors.slice(0, 5).join('\n')}`,
      };
    }
    return {
      success: true,
      message: `تم استيراد ${result.imported} حساب بنجاح.${result.failed > 0 ? ` (تم تخطي ${result.failed} أخطاء/تكرارات)` : ''}`,
      importedCount: result.imported,
    };
  }

  return {
    success: true,
    message: `تم استيراد ${rows.length} سجل إلى ${targetModel} بنجاح.`,
    importedCount: rows.length,
  };
}
