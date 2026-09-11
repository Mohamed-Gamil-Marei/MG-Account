import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Scale,
  ArrowRight,
  HelpCircle,
  Loader2,
  FolderTree,
  Table,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, DatabaseState } from '../../db/localDatabase';
import { Account, AccountCategory, AccountNature } from '../../types';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface TrialBalanceAutoMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onSuccess?: () => void;
}

interface ParsedAccountRow {
  code: string;
  name: string;
  category: AccountCategory;
  nature: AccountNature;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export const TrialBalanceAutoMapperModal: React.FC<TrialBalanceAutoMapperModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'APPLIED'>('UPLOAD');
  const [parsedRows, setParsedRows] = useState<ParsedAccountRow[]>([]);
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'MERGE'>('MERGE');

  if (!isOpen) return null;

  // Smart Category & Nature Classifier based on Arabic & English Keywords
  const guessAccountCategoryAndNature = (name: string, code: string): { category: AccountCategory; nature: AccountNature; standardCode: string } => {
    const cleanName = name.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. By Code Prefix if available
    if (cleanCode.startsWith('1')) return { category: 'ASSETS', nature: cleanCode.startsWith('119') ? 'CREDIT' : 'DEBIT', standardCode: cleanCode };
    if (cleanCode.startsWith('2')) return { category: 'LIABILITIES', nature: 'CREDIT', standardCode: cleanCode };
    if (cleanCode.startsWith('3')) return { category: 'EQUITY', nature: 'CREDIT', standardCode: cleanCode };
    if (cleanCode.startsWith('4')) return { category: 'REVENUES', nature: 'CREDIT', standardCode: cleanCode };
    if (cleanCode.startsWith('5')) return { category: 'EXPENSES', nature: 'DEBIT', standardCode: cleanCode };

    // 2. By Keywords
    if (cleanName.includes('مجمع إهلاك') || cleanName.includes('مخصص إهلاك') || cleanName.includes('accumulated')) {
      return { category: 'ASSETS', nature: 'CREDIT', standardCode: '1190' };
    }
    if (
      cleanName.includes('أصل') ||
      cleanName.includes('أصول') ||
      cleanName.includes('سيارات') ||
      cleanName.includes('مباني') ||
      cleanName.includes('آلات') ||
      cleanName.includes('معدات') ||
      cleanName.includes('أجهزة') ||
      cleanName.includes('عقار') ||
      cleanName.includes('نقدية') ||
      cleanName.includes('خزينة') ||
      cleanName.includes('صندوق') ||
      cleanName.includes('بنك') ||
      cleanName.includes('عملاء') ||
      cleanName.includes('مدينون') ||
      cleanName.includes('مخزون') ||
      cleanName.includes('بضاعة') ||
      cleanName.includes('أوراق قبض') ||
      cleanName.includes('تأمينات') ||
      cleanName.includes('cash') ||
      cleanName.includes('bank') ||
      cleanName.includes('receivable') ||
      cleanName.includes('inventory')
    ) {
      return { category: 'ASSETS', nature: 'DEBIT', standardCode: '1200' };
    }

    if (
      cleanName.includes('مورد') ||
      cleanName.includes('دائن') ||
      cleanName.includes('أوراق دفع') ||
      cleanName.includes('قرض') ||
      cleanName.includes('قروض') ||
      cleanName.includes('تسهيل') ||
      cleanName.includes('سحب على المكشوف') ||
      cleanName.includes('ضرائب مستحقة') ||
      cleanName.includes('تأمينات اجتماعية مستحقة') ||
      cleanName.includes('payable') ||
      cleanName.includes('supplier') ||
      cleanName.includes('loan')
    ) {
      return { category: 'LIABILITIES', nature: 'CREDIT', standardCode: '2100' };
    }

    if (
      cleanName.includes('رأس المال') ||
      cleanName.includes('احتياطي') ||
      cleanName.includes('أرباح مرحلة') ||
      cleanName.includes('أرباح مدورة') ||
      cleanName.includes('جاري الشريك') ||
      cleanName.includes('جاري الشركاء') ||
      cleanName.includes('equity') ||
      cleanName.includes('capital')
    ) {
      return { category: 'EQUITY', nature: 'CREDIT', standardCode: '3100' };
    }

    if (
      cleanName.includes('مبيعات') ||
      cleanName.includes('إيراد') ||
      cleanName.includes('إيرادات') ||
      cleanName.includes('خدمات') ||
      cleanName.includes('أرباح بيع أصول') ||
      cleanName.includes('revenue') ||
      cleanName.includes('sales') ||
      cleanName.includes('income')
    ) {
      return { category: 'REVENUES', nature: 'CREDIT', standardCode: '4100' };
    }

    // Default to expenses if nothing matched
    return { category: 'EXPENSES', nature: 'DEBIT', standardCode: '5300' };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!jsonData || jsonData.length < 2) {
        throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات كافية.');
      }

      // Find Header Row
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] || [];
        const rowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
        if (
          rowStr.includes('حساب') ||
          rowStr.includes('اسم') ||
          rowStr.includes('كود') ||
          rowStr.includes('account') ||
          rowStr.includes('مدين') ||
          rowStr.includes('دائن') ||
          rowStr.includes('debit')
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = (jsonData[headerRowIndex] || []).map((h) => String(h || '').trim().toLowerCase());

      // Identify Column Indexes
      let codeIdx = headers.findIndex((h) => h.includes('كود') || h.includes('رقم') || h.includes('code') || h.includes('no'));
      let nameIdx = headers.findIndex((h) => h.includes('اسم') || h.includes('بيان') || h.includes('name') || h.includes('description') || h.includes('حساب'));
      let opDebitIdx = headers.findIndex((h) => (h.includes('افتتاح') || h.includes('أول')) && h.includes('مدين'));
      let opCreditIdx = headers.findIndex((h) => (h.includes('افتتاح') || h.includes('أول')) && h.includes('دائن'));
      let movDebitIdx = headers.findIndex((h) => (h.includes('حركة') || h.includes('خلال')) && h.includes('مدين'));
      let movCreditIdx = headers.findIndex((h) => (h.includes('حركة') || h.includes('خلال')) && h.includes('دائن'));
      let endDebitIdx = headers.findIndex((h) => (h.includes('ختام') || h.includes('آخر') || h.includes('رصيد')) && h.includes('مدين'));
      let endCreditIdx = headers.findIndex((h) => (h.includes('ختام') || h.includes('آخر') || h.includes('رصيد')) && h.includes('دائن'));

      // Generic fallback for Debit & Credit if specific columns not separated
      if (endDebitIdx === -1 && movDebitIdx === -1) {
        endDebitIdx = headers.findIndex((h) => h.includes('مدين') || h.includes('debit'));
      }
      if (endCreditIdx === -1 && movCreditIdx === -1) {
        endCreditIdx = headers.findIndex((h) => h.includes('دائن') || h.includes('credit'));
      }

      if (nameIdx === -1 && codeIdx !== -1) nameIdx = codeIdx + 1;
      if (nameIdx === -1 && codeIdx === -1) {
        nameIdx = 0;
        codeIdx = 1;
      }

      const rows: ParsedAccountRow[] = [];
      let rowCounter = 1;

      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const nameVal = String(row[nameIdx] || '').trim();
        const codeVal = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : `ACC-${rowCounter}`;

        // Skip total rows
        if (!nameVal || nameVal.includes('مجموع') || nameVal.includes('إجمالي') || nameVal.includes('total')) {
          continue;
        }

        const parseNum = (val: any) => {
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          if (!val) return 0;
          const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
          const n = parseFloat(clean);
          return isNaN(n) ? 0 : n;
        };

        const opDeb = opDebitIdx !== -1 ? parseNum(row[opDebitIdx]) : 0;
        const opCred = opCreditIdx !== -1 ? parseNum(row[opCreditIdx]) : 0;
        const movDeb = movDebitIdx !== -1 ? parseNum(row[movDebitIdx]) : 0;
        const movCred = movCreditIdx !== -1 ? parseNum(row[movCreditIdx]) : 0;
        let endDeb = endDebitIdx !== -1 ? parseNum(row[endDebitIdx]) : 0;
        let endCred = endCreditIdx !== -1 ? parseNum(row[endCreditIdx]) : 0;

        // Auto calculate ending if only movements/opening given
        if (endDeb === 0 && endCred === 0) {
          const net = opDeb - opCred + movDeb - movCred;
          if (net >= 0) endDeb = net;
          else endCred = Math.abs(net);
        }

        const classified = guessAccountCategoryAndNature(nameVal, codeVal);

        rows.push({
          code: codeVal || classified.standardCode,
          name: nameVal,
          category: classified.category,
          nature: classified.nature,
          openingDebit: Math.abs(opDeb),
          openingCredit: Math.abs(opCred),
          movementDebit: Math.abs(movDeb),
          movementCredit: Math.abs(movCred),
          endingDebit: Math.abs(endDeb),
          endingCredit: Math.abs(endCred),
        });

        rowCounter++;
      }

      if (rows.length === 0) {
        throw new Error('لم يتم العثور على حسابات صحيحة بالملف المرفوع.');
      }

      setParsedRows(rows);
      setStep('REVIEW');
    } catch (err: any) {
      setErrorMessage(`خطأ في قراءة وتحليل ملف ميزان المراجعة: ${err?.message || ''}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Totals of parsed rows
  const totals = parsedRows.reduce(
    (acc, r) => ({
      endingDebit: acc.endingDebit + r.endingDebit,
      endingCredit: acc.endingCredit + r.endingCredit,
    }),
    { endingDebit: 0, endingCredit: 0 }
  );

  const isBalanced = Math.abs(totals.endingDebit - totals.endingCredit) < 0.05;

  const handleApplyToSystem = () => {
    setIsProcessing(true);
    try {
      const activeClientId = state.activeClientContext?.clientId;

      // 1. Process Accounts
      parsedRows.forEach((row, idx) => {
        const existingAcc = state.accounts.find(
          (a) => a.code === row.code || a.name.trim() === row.name.trim()
        );

        if (existingAcc) {
          db.updateAccount(existingAcc.id, {
            openingBalanceDebit: row.openingDebit || existingAcc.openingBalanceDebit,
            openingBalanceCredit: row.openingCredit || existingAcc.openingBalanceCredit,
            category: row.category || existingAcc.category,
            nature: row.nature || existingAcc.nature,
          });
        } else {
          db.addAccount({
            code: row.code || `100${idx + 1}`,
            name: row.name,
            category: row.category,
            nature: row.nature,
            level: 2,
            openingBalanceDebit: row.openingDebit || row.endingDebit,
            openingBalanceCredit: row.openingCredit || row.endingCredit,
            isSystem: false,
          });
        }
      });

      setStep('APPLIED');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(`تعذر تطبيق البيانات: ${err?.message || ''}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 text-slate-100 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>المحول الذكي لموازين المراجعة (Universal TB Auto-Mapper)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                استيراد ميزان المراجعة من أي منظومة (SAP, Odoo, QuickBooks, Excel) وتوليد القوائم المالية فوراً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-750 hover:border-blue-500/60 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">اختر أو اسحب ملف ميزان المراجعة (.xlsx, .xls, .csv)</h4>
                  <p className="text-[11px] text-slate-400 max-w-md">
                    يقوم المحرك الذكي باكتشاف ترتيب الأعمدة وتصنيف الحسابات وفق المعايير المصرية (EAS) تلقائياً.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="tb-file-input"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{isProcessing ? 'جاري قراءة وتصنيف الحسابات...' : 'استعراض واختيار الملف'}</span>
                </button>
              </div>

              {/* Supported Software Badges */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <span className="font-bold text-slate-300 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>متوافق كلياً وبدون تعديل مع موازين المراجعة الصادرة من:</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap pt-1 font-mono text-[10px]">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">SAP ERP</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Odoo</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">QuickBooks</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Daftra</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Al-Ameen</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Excel Templates</span>
                </div>
              </div>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Balance Summary Header */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">تم استخراج ({parsedRows.length}) حساب بنجاح</span>
                    {isBalanced ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ميزان متزن تماماً</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>فارق توازن: {Math.abs(totals.endingDebit - totals.endingCredit).toFixed(2)} ج.م</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    راجع الحسابات المصنفة أدناه قبل اعتمادها وتحديث القوائم المالية.
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">إجمالي المدين:</span>
                    <span className="font-bold text-emerald-400">{formatEgyptianCurrency(totals.endingDebit)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">إجمالي الدائن:</span>
                    <span className="font-bold text-blue-400">{formatEgyptianCurrency(totals.endingCredit)}</span>
                  </div>
                </div>
              </div>

              {/* Accounts Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">الكود</th>
                      <th className="p-2.5">اسم الحساب</th>
                      <th className="p-2.5">التصنيف المعياري</th>
                      <th className="p-2.5 text-center">الطبيعة</th>
                      <th className="p-2.5 text-left font-mono">المدين</th>
                      <th className="p-2.5 text-left font-mono">الدائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-slate-400">{r.code}</td>
                        <td className="p-2 font-bold text-white truncate max-w-xs">{r.name}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                            {r.category}
                          </span>
                        </td>
                        <td className="p-2 text-center font-bold text-[10px]">
                          {r.nature === 'DEBIT' ? (
                            <span className="text-emerald-400">مدين</span>
                          ) : (
                            <span className="text-blue-400">دائن</span>
                          )}
                        </td>
                        <td className="p-2 text-left font-mono text-emerald-400">
                          {r.endingDebit > 0 ? r.endingDebit.toLocaleString('ar-EG') : '-'}
                        </td>
                        <td className="p-2 text-left font-mono text-blue-400">
                          {r.endingCredit > 0 ? r.endingCredit.toLocaleString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 50 && (
                <p className="text-[10px] text-slate-500 text-center">
                  يتم عرض أول 50 حساباً من إجمالي {parsedRows.length} حساب تم التعرف عليهم.
                </p>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                >
                  اختيار ملف آخر
                </button>

                <button
                  type="button"
                  onClick={handleApplyToSystem}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>اعتماد الحسابات وتوليد القوائم فوراً</span>
                </button>
              </div>
            </div>
          )}

          {step === 'APPLIED' && (
            <div className="p-8 text-center space-y-4 bg-slate-950/40 rounded-2xl border border-emerald-800/60 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">تم استيراد واعتماد ميزان المراجعة بنجاح تام!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  تم تحديث دليل الحسابات وأرصدة الأستاذ العام وتوليد قائمة المركز المالي، الدخل، والتدفقات النقدية تلقائياً.
                </p>
              </div>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  مشاهدة القوائم وميزان المراجعة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>المعايير: يتوافق مع الدليل المحاسبي المصري الموحد وشجرة حسابات EAS</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
