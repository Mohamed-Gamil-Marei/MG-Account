import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Layers,
  Database,
  Search,
  Check,
  Building2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { JournalEntry, JournalEntryLine, Account, ExcelImportAuditLog } from '../types';
import { TemplateGeneratorService } from '../services/TemplateGeneratorService';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface ExcelImportManagerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'JOURNAL_ENTRIES' | 'GENERAL_LEDGER' | 'CHART_OF_ACCOUNTS';
  onImportComplete?: (summary: { entriesCount: number; linesCount: number }) => void;
}

interface ParsedRawRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

interface GroupedJournalEntry {
  groupKey: string; // Ref or Date
  date: string;
  serialNumber?: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  errors: string[];
}

export const ExcelImportManager: React.FC<ExcelImportManagerProps> = ({
  isOpen,
  onClose,
  defaultMode = 'JOURNAL_ENTRIES',
  onImportComplete,
}) => {
  const [activeMode, setActiveMode] = useState<'JOURNAL_ENTRIES' | 'GENERAL_LEDGER' | 'CHART_OF_ACCOUNTS'>(defaultMode);
  const [step, setStep] = useState<'UPLOAD' | 'MAP_COLUMNS' | 'PREVIEW' | 'SUCCESS'>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Column Mapping State
  const [colMap, setColMap] = useState<Record<string, string>>({
    date: '',
    refNumber: '',
    accountCode: '',
    accountName: '',
    debit: '',
    credit: '',
    description: '',
    currency: '',
    exchangeRate: '',
    costCenter: '',
  });

  // Processed Grouped Entries
  const [parsedEntries, setParsedEntries] = useState<GroupedJournalEntry[]>([]);
  const [targetClientId, setTargetClientId] = useState<string>(db.getState().activeClientContext?.clientId || '');
  const [autoCreateMissingAccounts, setAutoCreateMissingAccounts] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingAccounts = db.getState().accounts;
  const clients = db.getState().clients;

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    if (activeMode === 'JOURNAL_ENTRIES') {
      TemplateGeneratorService.downloadJournalEntriesTemplate();
    } else if (activeMode === 'GENERAL_LEDGER') {
      TemplateGeneratorService.downloadGeneralLedgerTemplate();
    } else {
      TemplateGeneratorService.downloadJournalEntriesTemplate();
    }
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة.');
      }

      const headers = Object.keys(jsonRows[0]);
      setFileHeaders(headers);
      setRawRows(jsonRows);

      // Auto-detect column mapping
      const initialMap: Record<string, string> = { ...colMap };
      headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (lower.includes('تاريخ') || lower.includes('date')) initialMap.date = h;
        else if (lower.includes('مرجع') || lower.includes('سند') || lower.includes('ref') || lower.includes('قيد')) initialMap.refNumber = h;
        else if (lower.includes('كود') || lower.includes('code') || lower.includes('حساب')) {
          if (lower.includes('اسم') || lower.includes('name')) initialMap.accountName = h;
          else initialMap.accountCode = h;
        } else if (lower.includes('اسم') || lower.includes('name') || lower.includes('حساب')) initialMap.accountName = h;
        else if (lower.includes('مدين') || lower.includes('debit')) initialMap.debit = h;
        else if (lower.includes('دائن') || lower.includes('credit')) initialMap.credit = h;
        else if (lower.includes('بيان') || lower.includes('شرح') || lower.includes('desc')) initialMap.description = h;
        else if (lower.includes('عملة') || lower.includes('currency')) initialMap.currency = h;
        else if (lower.includes('صرف') || lower.includes('rate')) initialMap.exchangeRate = h;
        else if (lower.includes('مركز') || lower.includes('cost')) initialMap.costCenter = h;
      });

      setColMap(initialMap);
      setStep('MAP_COLUMNS');
    } catch (e: any) {
      setErrorMessage(e.message || 'تعذر قراءة ملف الإكسل. يرجى التأكد من سلامة الملف وصيغته.');
    } finally {
      setIsParsing(false);
    }
  };

  const processMappingAndValidate = () => {
    if (!colMap.debit && !colMap.credit) {
      alert('يجب تحديد عمود المدين أو عمود الدائن على الأقل.');
      return;
    }

    const groups: Record<string, GroupedJournalEntry> = {};

    rawRows.forEach((row, idx) => {
      const rowDateRaw = colMap.date ? row[colMap.date] : '';
      let formattedDate = new Date().toISOString().slice(0, 10);
      if (rowDateRaw) {
        if (rowDateRaw instanceof Date) {
          formattedDate = rowDateRaw.toISOString().slice(0, 10);
        } else {
          const str = String(rowDateRaw).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) formattedDate = str;
        }
      }

      const refVal = colMap.refNumber ? String(row[colMap.refNumber] || '').trim() : '';
      const groupKey = refVal ? `${formattedDate}_${refVal}` : `${formattedDate}_ROW_${Math.floor(idx / 2)}`;

      const code = colMap.accountCode ? String(row[colMap.accountCode] || '').trim() : '';
      const name = colMap.accountName ? String(row[colMap.accountName] || '').trim() : '';
      const debitNum = colMap.debit ? Math.max(0, Number(row[colMap.debit]) || 0) : 0;
      const creditNum = colMap.credit ? Math.max(0, Number(row[colMap.credit]) || 0) : 0;
      const lineDesc = colMap.description ? String(row[colMap.description] || '').trim() : '';
      const currency = colMap.currency ? String(row[colMap.currency] || 'EGP').trim().toUpperCase() : 'EGP';
      const exchangeRate = colMap.exchangeRate ? Number(row[colMap.exchangeRate]) || 1.0 : 1.0;

      // Find matched account in database
      const matchedAcc = existingAccounts.find((a) => a.code === code || a.name.trim() === name.trim());

      const line: JournalEntryLine = {
        id: `imp-line-${idx}-${Date.now()}`,
        accountId: matchedAcc?.id || (code ? `acc-${code}` : `acc-gen-${idx}`),
        accountCode: code || matchedAcc?.code || '1999',
        accountName: name || matchedAcc?.name || 'حساب مستورد من الإكسل',
        debit: debitNum,
        credit: creditNum,
        currency: currency as any,
        exchangeRate: exchangeRate,
        description: lineDesc,
      };

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          date: formattedDate,
          serialNumber: refVal || undefined,
          description: lineDesc || `قيد مستورد من إكسل - ${formattedDate}`,
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: false,
          errors: [],
        };
      }

      groups[groupKey].lines.push(line);
      groups[groupKey].totalDebit += debitNum;
      groups[groupKey].totalCredit += creditNum;
    });

    // Check balance for each entry
    const entriesList = Object.values(groups).map((entry) => {
      const diff = Math.abs(entry.totalDebit - entry.totalCredit);
      const isBal = diff < 0.01 && entry.lines.length >= 2;
      const errs: string[] = [];
      if (diff >= 0.01) {
        errs.push(`القيد غير متوازن: المدين (${entry.totalDebit.toLocaleString()} ج.م) لا يساوي الدائن (${entry.totalCredit.toLocaleString()} ج.م) - الفرق: ${diff.toFixed(2)} ج.م`);
      }
      if (entry.lines.length < 2) {
        errs.push('القيد يحتوي على طرف واحد فقط، يجب أن يحتوي على طرفين على الأقل.');
      }
      return {
        ...entry,
        isBalanced: isBal,
        errors: errs,
      };
    });

    setParsedEntries(entriesList);
    setStep('PREVIEW');
  };

  // Generate Automatic Balancing Adjustment Entry Lines for Unbalanced Entries
  const handleAutoBalanceAllEntries = () => {
    // Ensure balancing suspense account exists
    const balancingAccountCode = '3999';
    const balancingAccountName = 'فروق تسوية الأرصدة الافتتاحية والمستوردة';
    const accExists = existingAccounts.some((a) => a.code === balancingAccountCode);
    if (!accExists) {
      db.addAccount({
        code: balancingAccountCode,
        name: balancingAccountName,
        category: 'EQUITY',
        nature: 'CREDIT',
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'حساب وسيط لتسوية الفروق الحسابية الناتجة عن استيراد الأرصدة والقيود من ملفات إكسل',
      });
    }

    setParsedEntries((prev) =>
      prev.map((entry) => {
        const diff = entry.totalDebit - entry.totalCredit;
        if (Math.abs(diff) < 0.01 && entry.lines.length >= 2) {
          return entry; // Already balanced
        }

        const newLines = [...entry.lines];
        let addedDebit = 0;
        let addedCredit = 0;

        if (Math.abs(diff) >= 0.01) {
          if (diff > 0) {
            // Debit > Credit -> Add credit line
            addedCredit = diff;
            newLines.push({
              id: `adj-bal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              accountId: `acc-${balancingAccountCode}`,
              accountCode: balancingAccountCode,
              accountName: balancingAccountName,
              debit: 0,
              credit: diff,
              currency: 'EGP',
              exchangeRate: 1.0,
              description: `قيد تسوية آلي لضبط توازن القيد (فرق: ${diff.toFixed(2)} ج.م)`,
            });
          } else {
            // Credit > Debit -> Add debit line
            const posDiff = Math.abs(diff);
            addedDebit = posDiff;
            newLines.push({
              id: `adj-bal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              accountId: `acc-${balancingAccountCode}`,
              accountCode: balancingAccountCode,
              accountName: balancingAccountName,
              debit: posDiff,
              credit: 0,
              currency: 'EGP',
              exchangeRate: 1.0,
              description: `قيد تسوية آلي لضبط توازن القيد (فرق: ${posDiff.toFixed(2)} ج.م)`,
            });
          }
        }

        const newTotalDebit = entry.totalDebit + addedDebit;
        const newTotalCredit = entry.totalCredit + addedCredit;

        return {
          ...entry,
          lines: newLines,
          totalDebit: newTotalDebit,
          totalCredit: newTotalCredit,
          isBalanced: true,
          errors: [],
        };
      })
    );

    alert('تم توليد قيود التسوية وتصحيح التوازن المحاسبي لجميع القيود بنجاح عبر حساب (3999 - فروق تسوية الأرصدة)!');
  };

  const handleConfirmFinalImport = () => {
    if (parsedEntries.length === 0) return;

    const targetClient = clients.find((c) => c.id === targetClientId);
    let importedCount = 0;
    let totalLinesCount = 0;
    let totalGrossAmount = 0;

    parsedEntries.forEach((entry) => {
      // Auto-create missing accounts in Chart of Accounts if enabled
      if (autoCreateMissingAccounts) {
        entry.lines.forEach((l) => {
          const exists = existingAccounts.some((a) => a.code === l.accountCode || a.id === l.accountId);
          if (!exists && l.accountCode) {
            const isDebitNature = l.accountCode.startsWith('1') || l.accountCode.startsWith('5');
            const cat = l.accountCode.startsWith('1')
              ? 'ASSETS'
              : l.accountCode.startsWith('2')
              ? 'LIABILITIES'
              : l.accountCode.startsWith('3')
              ? 'EQUITY'
              : l.accountCode.startsWith('4')
              ? 'REVENUES'
              : 'EXPENSES';

            db.addAccount({
              code: l.accountCode,
              name: l.accountName,
              category: cat,
              nature: isDebitNature ? 'DEBIT' : 'CREDIT',
              level: 3,
              openingBalanceDebit: 0,
              openingBalanceCredit: 0,
              description: 'حساب تم إنشاؤه تلقائياً أثناء استيراد دفتر الأستاذ من الإكسل',
            });
          }
        });
      }

      db.addJournalEntry({
        date: entry.date,
        description: entry.description,
        lines: entry.lines,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        isPosted: true,
        entryType: 'GENERAL',
        clientId: targetClientId || undefined,
        clientName: targetClient?.name,
      });

      importedCount++;
      totalLinesCount += entry.lines.length;
      totalGrossAmount += entry.totalDebit;
    });

    // Save Audit Trail Log
    const auditRecord: ExcelImportAuditLog = {
      id: `audit-imp-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fileName: selectedFile?.name || 'Excel_Import.xlsx',
      fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '12 KB',
      importType: activeMode,
      importedBy: 'محمد جميل مرعي',
      entriesAddedCount: importedCount,
      linesCount: totalLinesCount,
      totalAmount: totalGrossAmount,
      companyId: targetClientId || undefined,
      companyName: targetClient?.name || 'عام - كافة الشركات',
      status: 'SUCCESS',
      details: `تم استيراد ${importedCount} قيد محاسبي بعدد ${totalLinesCount} طرف قيد بنجاح.`,
    };

    const curPrefs = db.getState().preferences;
    const existingLogs = curPrefs.excelImportLogs || [];
    db.updatePreferences({ excelImportLogs: [auditRecord, ...existingLogs] });

    setStep('SUCCESS');
    if (onImportComplete) {
      onImportComplete({ entriesCount: importedCount, linesCount: totalLinesCount });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileHeaders([]);
    setRawRows([]);
    setParsedEntries([]);
    setStep('UPLOAD');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalDebitsAll = parsedEntries.reduce((acc, e) => acc + e.totalDebit, 0);
  const totalCreditsAll = parsedEntries.reduce((acc, e) => acc + e.totalCredit, 0);
  const unbalancedCount = parsedEntries.filter((e) => !e.isBalanced).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs my-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>منظومة استيراد دفاتر الأستاذ والقيود من الإكسل</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Excel Import Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                استيراد القيود وموازين المراجعة تلقائياً مع معالجة الأعمدة والتحقق المحاسبي من التوازن والتسوية.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1.5 rounded-xl hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Step Navigation */}
        <div className="grid grid-cols-4 gap-2 my-5 text-center font-bold">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
              step === 'UPLOAD' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span>1. رفع الملف والنموذج</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
              step === 'MAP_COLUMNS' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span>2. مطابقة الأعمدة</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
              step === 'PREVIEW' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span>3. المعاينة والتدقيق</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
              step === 'SUCCESS' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span>4. اكتمال الترحيل</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-xs text-rose-600 font-bold underline">
              إغلاق
            </button>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'UPLOAD' && (
          <div className="space-y-6">
            {/* Import Mode Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block">حدد نوع البيانات المراد استيرادها:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('JOURNAL_ENTRIES')}
                  className={`p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                    activeMode === 'JOURNAL_ENTRIES'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-sm">دفتر قيود اليومية العامة</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    استيراد القيود المركبة وتواريخها والمراجع وأطراف المدين والدائن.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('GENERAL_LEDGER')}
                  className={`p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                    activeMode === 'GENERAL_LEDGER'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-sm">دفتر الأستاذ وميزان المراجعة</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    استيراد أرصدة الحركات والافتتاحيات وتحديث موازين المراجعة.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('CHART_OF_ACCOUNTS')}
                  className={`p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                    activeMode === 'CHART_OF_ACCOUNTS'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-sm">شجرة الحسابات المحاسبية</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    استيراد الأكواد والمسميات وتبويب الأصول والخصوم والمصروفات.
                  </div>
                </button>
              </div>
            </div>

            {/* Template Download Box */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-blue-950">هل تحتاج إلى نموذج إكسل جاهز؟</div>
                  <div className="text-blue-800 text-[11px]">
                    حمّل النموذج المعتمد المنسق مسبقاً بالأعمدة والتعليمات لتعبئة بياناتك بسهولة.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>تحميل النموذج المعتمد (.xlsx)</span>
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-10 text-center bg-emerald-50/20 hover:bg-emerald-50/40 transition-all cursor-pointer space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">اسحب وأفلت ملف الإكسل هنا، أو انقر للاختيار</h3>
                <p className="text-xs text-slate-500 mt-1">يدعم ملفات Excel (.xlsx, .xls) و ملفات الجداول CSV</p>
              </div>
              <div className="inline-block px-4 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs">
                استعراض الملفات من جهازك
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MAP COLUMNS */}
        {step === 'MAP_COLUMNS' && (
          <div className="space-y-6">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                قام النظام بالتعرف الآلي على الأعمدة. يرجى مراجعة وتأكيد مطابقة كل حقل محاسبي مع العمود المناسب في ملف الإكسل المرفوع:
              </div>
            </div>

            {/* Target Client Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block">ربط البيانات بالمنشأة / العميل المستهدف:</span>
              <select
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- عام (بدون تخصيص عميل محدد) --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.clientCode}) - {c.companyType}
                  </option>
                ))}
              </select>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>تاريخ القيد / الحركة *</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 rounded">مطلوب</span>
                </label>
                <select
                  value={colMap.date}
                  onChange={(e) => setColMap({ ...colMap, date: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود التاريخ --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ref Number */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800">رقم المرجع / السند (Ref No)</label>
                <select
                  value={colMap.refNumber}
                  onChange={(e) => setColMap({ ...colMap, refNumber: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختياري (تجميع القيود) --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Code */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800">كود الحساب المحاسبي</label>
                <select
                  value={colMap.accountCode}
                  onChange={(e) => setColMap({ ...colMap, accountCode: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود الكود --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Name */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800">اسم الحساب المحاسبي</label>
                <select
                  value={colMap.accountName}
                  onChange={(e) => setColMap({ ...colMap, accountName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود الاسم --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Debit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>المبلغ المدين (Debit) *</span>
                  <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 rounded">مطلوب</span>
                </label>
                <select
                  value={colMap.debit}
                  onChange={(e) => setColMap({ ...colMap, debit: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود المدين --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>المبلغ الدائن (Credit) *</span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 rounded">مطلوب</span>
                </label>
                <select
                  value={colMap.credit}
                  onChange={(e) => setColMap({ ...colMap, credit: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود الدائن --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800">البيان والشرح</label>
                <select
                  value={colMap.description}
                  onChange={(e) => setColMap({ ...colMap, description: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختر عمود الشرح --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost Center */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800">مركز التكلفة (Cost Center)</label>
                <select
                  value={colMap.costCenter}
                  onChange={(e) => setColMap({ ...colMap, costCenter: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- اختياري --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options Checkbox */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateMissingAccounts}
                  onChange={(e) => setAutoCreateMissingAccounts(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-slate-800">
                  إنشاء الحسابات غير الموجودة تلقائياً في شجرة الحسابات أثناء الاستيراد
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('UPLOAD')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                رجوع
              </button>

              <button
                type="button"
                onClick={processMappingAndValidate}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>متابعة ومعاينة القيود المستخرجة ({rawRows.length} صف)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & VALIDATION */}
        {step === 'PREVIEW' && (
          <div className="space-y-5">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 text-[10px] block">إجمالي القيود المستخلصة:</span>
                <span className="text-lg font-black text-slate-900 font-mono">{parsedEntries.length} قيد</span>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="text-blue-600 text-[10px] block">إجمالي المدين:</span>
                <span className="text-lg font-black text-blue-900 font-mono">{formatEgyptianCurrency(totalDebitsAll)}</span>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-amber-600 text-[10px] block">إجمالي الدائن:</span>
                <span className="text-lg font-black text-amber-900 font-mono">{formatEgyptianCurrency(totalCreditsAll)}</span>
              </div>
              <div
                className={`p-3.5 border rounded-2xl ${
                  unbalancedCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[10px] block">حالة التوازن المحاسبي:</span>
                <span className="text-sm font-black flex items-center gap-1 mt-0.5">
                  {unbalancedCount === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>كافة القيود متزنة (100%)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{unbalancedCount} قيد غير متزن!</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Unbalanced warning and Auto-Balancing Quick Tool */}
            {unbalancedCount > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-rose-900">
                      يوجد {unbalancedCount} قيد محاسبي غير متوازن بين المدين والدائن
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      يمكنك استخدام ميزة التوليد التلقائي لقيود التسوية لإضافة أطراف موازنة تلقائياً في حساب فروق الأرصدة (3999).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoBalanceAllEntries}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 shadow-xs cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>توليد قيود التسوية وضبط التوازن آلياً (Auto-Balance)</span>
                </button>
              </div>
            )}

            {/* Entries Preview List */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">التاريخ والمرجع</th>
                    <th className="p-2.5">البيان</th>
                    <th className="p-2.5">عدد الأطراف</th>
                    <th className="p-2.5 text-left text-blue-700">المدين</th>
                    <th className="p-2.5 text-left text-amber-700">الدائن</th>
                    <th className="p-2.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedEntries.map((entry, idx) => (
                    <tr key={idx} className={!entry.isBalanced ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-800">{entry.date}</div>
                        {entry.serialNumber && (
                          <div className="text-[10px] font-mono text-slate-500">{entry.serialNumber}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-700 font-medium">{entry.description}</td>
                      <td className="p-2.5 font-mono text-slate-600">{entry.lines.length} طرف</td>
                      <td className="p-2.5 font-mono font-bold text-left text-blue-700">
                        {formatEgyptianCurrency(entry.totalDebit)}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-left text-amber-700">
                        {formatEgyptianCurrency(entry.totalCredit)}
                      </td>
                      <td className="p-2.5 text-center">
                        {entry.isBalanced ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            متزن ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            غير متزن ✕
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('MAP_COLUMNS')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                تعديل مطابقة الأعمدة
              </button>

              <button
                type="button"
                onClick={handleConfirmFinalImport}
                disabled={parsedEntries.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد وترحيل {parsedEntries.length} قيد إلى دفتر اليومية والأستاذ</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">تم استيراد وترحيل البيانات بنجاح!</h3>
              <p className="text-xs text-slate-600 mt-1">
                تم تحديث دفتر اليومية العامة وحسابات الأستاذ العام وتوثيق عملية الاستيراد في سجل التدقيق المعتمد.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                استيراد ملف آخر
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer"
              >
                إغلاق والعودة للدفاتر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
