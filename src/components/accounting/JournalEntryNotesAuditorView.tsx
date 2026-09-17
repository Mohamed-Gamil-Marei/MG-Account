import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowLeftRight,
  Download,
  RotateCcw,
  Check,
  Building,
  Scale,
  DollarSign,
  HelpCircle,
  FileText,
  Save,
  Layers,
  ChevronDown,
  X,
  PlusCircle,
  Eye,
  RefreshCw,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  JournalNotesAuditEngine,
  RawJournalRow,
  AuditedJournalRow,
  AuditSummaryStats,
  AuditIssueCategory,
} from '../../services/journalNotesAuditService';
import { DatabaseState, db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { JournalEntry, JournalEntryLine } from '../../types';

interface JournalEntryNotesAuditorViewProps {
  state?: DatabaseState;
  onNavigateToJournal?: () => void;
}

export const JournalEntryNotesAuditorView: React.FC<JournalEntryNotesAuditorViewProps> = ({
  state,
  onNavigateToJournal,
}) => {
  const [rows, setRows] = useState<AuditedJournalRow[]>([]);
  const [stats, setStats] = useState<AuditSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'ERRORS_ONLY' | AuditIssueCategory>('ALL');
  const [selectedRowForCorrection, setSelectedRowForCorrection] = useState<AuditedJournalRow | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load sample dataset
  const handleLoadSampleDataset = () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sample = JournalNotesAuditEngine.getSampleMisallocatedDataset();
      const result = JournalNotesAuditEngine.auditDataset(sample);
      setRows(result.auditedRows);
      setStats(result.stats);
      setFileName('نموذج_تجريبي_أخطاء_توجيه_شائعة.xlsx');
      setSuccessNotice('تم تحميل النموذج التجريبي وفحصه بنجاح! راجع الأخطاء المكتشفة والتوجيه المقترح.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء تحميل النموذج التجريبي.');
    } finally {
      setIsLoading(false);
    }
  };

  // Audit current system entries from DatabaseState
  const handleAuditCurrentSystemEntries = () => {
    if (!state || !state.journalEntries || state.journalEntries.length === 0) {
      setErrorMessage('لا توجد قيود يومية مسجلة حالياً في قاعدة بيانات المنظومة لفحصها.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const convertedRows: RawJournalRow[] = [];
      let rowCounter = 1;

      state.journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          convertedRows.push({
            id: `sys-${entry.id}-${line.id}`,
            originalRowIndex: rowCounter++,
            entryNo: entry.entryNumber || `قيد-${entry.id.substring(0, 5)}`,
            date: entry.date,
            accountCode: line.accountCode || '',
            accountName: line.accountName || 'حساب غير محدد',
            narration: line.description || entry.description || '',
            debit: line.debit || 0,
            credit: line.credit || 0,
            reference: entry.referenceNumber,
          });
        });
      });

      const result = JournalNotesAuditEngine.auditDataset(convertedRows);
      setRows(result.auditedRows);
      setStats(result.stats);
      setFileName(`قيود_المنظومة_الحالية_${state.journalEntries.length}_قيد.db`);
      setSuccessNotice(`تم فحص عدد ${convertedRows.length} سطر محاسبي من قيود المنظومة.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء فحص قيود المنظومة.');
    } finally {
      setIsLoading(false);
    }
  };

  // Process File Upload
  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const parsed = await JournalNotesAuditEngine.parseUploadedFile(file);
      if (parsed.length === 0) {
        throw new Error('لم يتم العثور على أي أسطر قيود قابلة للقراءة في هذا الملف.');
      }
      const result = JournalNotesAuditEngine.auditDataset(parsed);
      setRows(result.auditedRows);
      setStats(result.stats);
      setFileName(file.name);
      setSuccessNotice(`تم استيراد وفحص ${parsed.length} سطر بنجاح، واكتشاف ${result.stats.flaggedErrorsCount} توجيه مخالف.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر استيراد أو معالجة الملف. يرجى التأكد من صيغة الإكسيل أو CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // One-click apply suggestion
  const handleApplySuggestedReclassification = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            userOverriddenAccount: r.audit.suggestedAccountName,
            isResolved: true,
          };
        }
        return r;
      })
    );
  };

  // Manual Account Override
  const handleManualAccountOverride = (rowId: string, newAccount: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            userOverriddenAccount: newAccount,
            isResolved: true,
          };
        }
        return r;
      })
    );
  };

  // Reset Row to original
  const handleResetRowResolution = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            userOverriddenAccount: undefined,
            isResolved: false,
          };
        }
        return r;
      })
    );
  };

  // Export to Excel
  const handleExportReport = () => {
    if (rows.length === 0 || !stats) return;
    JournalNotesAuditEngine.exportAuditReportToExcel(rows, stats);
  };

  // Import resolved entries into App Database
  const handleSaveCorrectedEntriesToApp = async () => {
    if (rows.length === 0) return;

    try {
      // Group by entryNo
      const entryGroups = new Map<string, AuditedJournalRow[]>();
      rows.forEach((r) => {
        const list = entryGroups.get(r.entryNo) || [];
        list.push(r);
        entryGroups.set(r.entryNo, list);
      });

      let addedCount = 0;

      entryGroups.forEach((groupLines, entryNo) => {
        const firstLine = groupLines[0];
        const lines: JournalEntryLine[] = groupLines.map((gl, idx) => ({
          id: `line-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          accountId: gl.accountCode || 'acc-gen',
          accountCode: gl.userOverriddenAccount ? (gl.accountCode || '5000') : (gl.audit.hasIssue ? gl.audit.suggestedAccountCode : gl.accountCode),
          accountName: gl.userOverriddenAccount || (gl.audit.hasIssue ? gl.audit.suggestedAccountName : gl.accountName),
          description: gl.narration,
          debit: gl.debit || 0,
          credit: gl.credit || 0,
        }));

        const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
        const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);

        db.addJournalEntry({
          date: firstLine.date || new Date().toISOString().split('T')[0],
          description: `قيد مرحل من فاحص التوجيه: ${firstLine.narration || entryNo}`,
          entryType: 'GENERAL',
          isPosted: false,
          lines,
          totalDebit,
          totalCredit,
        });
        addedCount++;
      });

      setSuccessNotice(`تم استيراد وترحيل عدد ${addedCount} قيد محاسبي مصحح إلى قاعدة بيانات المنظومة بنجاح!`);
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء حفظ القيود المصححة بالمنظومة: ' + err?.message);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Category filter
      if (activeCategoryFilter === 'ERRORS_ONLY' && !r.audit.hasIssue) {
        return false;
      }
      if (
        activeCategoryFilter !== 'ALL' &&
        activeCategoryFilter !== 'ERRORS_ONLY' &&
        r.audit.category !== activeCategoryFilter
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEntry = r.entryNo.toLowerCase().includes(q);
        const matchAccount = r.accountName.toLowerCase().includes(q);
        const matchNarr = r.narration.toLowerCase().includes(q);
        const matchIssue = r.audit.categoryLabel.toLowerCase().includes(q);
        const matchSuggested = r.audit.suggestedAccountName.toLowerCase().includes(q);

        if (!matchEntry && !matchAccount && !matchNarr && !matchIssue && !matchSuggested) {
          return false;
        }
      }

      return true;
    });
  }, [rows, activeCategoryFilter, searchQuery]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center border border-indigo-500/30 shadow-inner">
                <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  فاحص ومُصحّح توجيه القيود الذكي
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
                    Notes & Narration AI Auditor
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80">
                  فحص دلالي ومطابقة شرح القيود (Notes / Narration) مع الحسابات المسجلة لكشف أخطاء التوجيه والرسملة وإعادة التوجيه المحاسبي السليم
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف قيود (Excel / CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleDataset}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-indigo-200 border border-indigo-700/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تحميل نموذج به أخطاء توجيه شائعة لاختبار المحرك فوراً"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>نموذج تجريبي بأخطاء شائعة</span>
            </button>

            {state && state.journalEntries && state.journalEntries.length > 0 && (
              <button
                type="button"
                onClick={handleAuditCurrentSystemEntries}
                className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="فحص كافة قيود اليومية المسجلة بالدورة المحاسبية الحالية"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>فحص قيود المنظومة الحالية ({state.journalEntries.length})</span>
              </button>
            )}

            {rows.length > 0 && (
              <button
                type="button"
                onClick={handleExportReport}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="تصدير تقرير التدقيق وشيت القيود المصححة للإكسيل"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State / Drag & Drop Upload Zone if no rows */}
      {rows.length === 0 && !isLoading && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                اسحب وأسقط ملف مخرجات القيود (Excel أو CSV) هنا
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                يدعم ملفات إكسيل الصادرة من SAP، أو Odoo، أو كويك بوكس، أو شيتات إكسيل مخصصة.
                يتعرف المحرك تلقائياً على الأعمدة (رقم القيد، التاريخ، الحساب، البيان، المدين، الدائن).
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                يدعم .xlsx و .xls و .csv
              </span>
              <span className="text-xs text-slate-400 font-bold">أو</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSampleDataset();
                }}
                className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors"
              >
                جرب بنموذج معد مسبقاً ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            جاري قراءة الملف وتطبيق قواعد التدقيق المحاسبي الدلالي على البيان...
          </p>
        </div>
      )}

      {/* Stats Summary Dashboard */}
      {stats && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">إجمالي السطور</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900 dark:text-white">{stats.totalRows}</span>
              <span className="text-[10px] text-slate-400">({stats.totalEntriesCount} قيد)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              توجيه مخالف (أخطاء)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.flaggedErrorsCount}</span>
              <span className="text-[10px] text-slate-500">
                ({Math.round((stats.flaggedErrorsCount / Math.max(stats.totalRows, 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold block">مخالفات حرجة</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.highSeverityCount}</span>
              <span className="text-[10px] text-slate-400">سطر حرج</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              توجيه سليم
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.cleanRowsCount}</span>
              <span className="text-[10px] text-slate-400">سطر مطابق</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-200 dark:border-indigo-900/60 shadow-2xs col-span-2">
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold block">
              إجمالي المبالغ الخاضعة لإعادة التوجيه
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                {formatEgyptianCurrency(stats.totalDiscrepancyAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      {rows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم القيد، البيان، الحساب، أو نوع المخالفة..."
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveCorrectedEntriesToApp}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="حفظ كافة القيود المصححة كقيود يومية رسمية في المنظومة"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ القيود بالمنظومة</span>
              </button>

              <button
                type="button"
                onClick={handleExportReport}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير تقرير الإكسيل</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRows([]);
                  setStats(null);
                  setFileName(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
                title="إفراغ الشاشة والبدء من جديد"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-bold ml-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              التصفية:
            </span>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              الكل ({rows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ERRORS_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCategoryFilter === 'ERRORS_ONLY'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>الأخطاء والتوجيه المخالف فقط ({stats?.flaggedErrorsCount || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('CAPITAL_VS_EXPENSE')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'CAPITAL_VS_EXPENSE'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              أصول ومصروفات رأسمالية
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('CLIENT_SUPPLIER_MIX')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'CLIENT_SUPPLIER_MIX'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              خلط عملاء وموردين
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('CUSTODY_VS_EXPENSE')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'CUSTODY_VS_EXPENSE'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              عهد وسلف عاملين
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('PREPAID_MISALLOCATION')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'PREPAID_MISALLOCATION'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              مصروفات مقدمة
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('PARTNER_DRAWINGS')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'PARTNER_DRAWINGS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              مسحوبات الشركاء
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('TAX_WITHHOLDING_MIX')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                activeCategoryFilter === 'TAX_WITHHOLDING_MIX'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              ضرائب وخصم وإضافة
            </button>
          </div>
        </div>
      )}

      {/* Main Audited Entries Table */}
      {rows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <span>قائمة السطور المفحوصة (عرض {filteredRows.length} من {rows.length})</span>
              {fileName && (
                <span className="text-[11px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {fileName}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              انقر على أي سطر لعرض قيد التسوية العكسي والتصحيحي
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5 font-bold w-16 text-center">القيد</th>
                  <th className="p-2.5 font-bold w-20">التاريخ</th>
                  <th className="p-2.5 font-bold min-w-[200px]">البيان والشرح (Notes)</th>
                  <th className="p-2.5 font-bold min-w-[170px]">الحساب المسجل حالياً</th>
                  <th className="p-2.5 font-bold w-24 text-left">المبلغ (ج.م)</th>
                  <th className="p-2.5 font-bold min-w-[220px]">نتيجة الفحص والتوجيه المقترح</th>
                  <th className="p-2.5 font-bold w-28 text-center">الإجراء والتصحيح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRows.map((row) => {
                  const hasIssue = row.audit.hasIssue;
                  const isResolved = row.isResolved || !!row.userOverriddenAccount;
                  const currentAccount = row.userOverriddenAccount || row.accountName;
                  const amount = Math.max(row.debit || 0, row.credit || 0);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        hasIssue && !isResolved
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : isResolved
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      {/* Entry No */}
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                          {row.entryNo}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Narration */}
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {row.narration}
                        </div>
                        {row.audit.matchedKeywords && row.audit.matchedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.audit.matchedKeywords.map((kw, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 font-semibold"
                              >
                                دلالة: {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Current Account */}
                      <td className="p-2.5">
                        <div className="flex flex-col">
                          <span
                            className={`font-bold text-xs ${
                              hasIssue && !isResolved
                                ? 'line-through text-rose-600 dark:text-rose-400'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {row.accountName}
                          </span>
                          {row.accountCode && (
                            <span className="text-[10px] font-mono text-slate-400">
                              كود: {row.accountCode}
                            </span>
                          )}

                          {isResolved && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              تم التوجيه إلى: {row.userOverriddenAccount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-2.5 text-left font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{formatEgyptianCurrency(amount)}</div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {(row.debit || 0) > 0 ? 'مدين' : 'دائن'}
                        </span>
                      </td>

                      {/* Audit Result & Recommendation */}
                      <td className="p-2.5">
                        {hasIssue ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  row.audit.severity === 'HIGH'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                }`}
                              >
                                {row.audit.categoryLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                دقة {row.audit.confidenceScore}%
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                              {row.audit.issueDescription}
                            </p>

                            <div className="text-[11px] bg-indigo-50/70 dark:bg-indigo-950/40 p-1.5 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold block">
                                التوجيه الصحيح المقترح:
                              </span>
                              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                                {row.audit.suggestedAccountName}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                المرجع: {row.audit.accountingStandardRef}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>توجيه سليم ومطابق للمعيار</span>
                          </div>
                        )}
                      </td>

                      {/* Action & Correction Button */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          {hasIssue && (
                            <>
                              {!isResolved ? (
                                <button
                                  type="button"
                                  onClick={() => handleApplySuggestedReclassification(row.id)}
                                  className="w-full px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  title="اعتماد التوجيه المقترح لهذا السطر"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>قبول التوجيه</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleResetRowResolution(row.id)}
                                  className="w-full px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] transition-colors cursor-pointer"
                                  title="إلغاء التعديل والعودة للأصل"
                                >
                                  تراجع للأصل
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedRowForCorrection(row)}
                                className="w-full px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                title="عرض قيد التسوية العكسي المزدوج"
                              >
                                <ArrowLeftRight className="w-3 h-3 text-indigo-500" />
                                <span>قيد التسوية</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correction Entry Modal */}
      {selectedRowForCorrection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  قيد التسوية وإعادة التوجيه المحاسبي المقترح
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowForCorrection(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>القيد الأصلي: {selectedRowForCorrection.entryNo}</span>
                  <span className="font-mono text-slate-500">{selectedRowForCorrection.date}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">البيان: </span>
                  {selectedRowForCorrection.narration}
                </p>
                <p className="text-rose-600 dark:text-rose-400 font-medium">
                  <span className="font-semibold">المخالفة: </span>
                  {selectedRowForCorrection.audit.issueDescription}
                </p>
              </div>

              {/* Adjusting Double Entry Voucher */}
              <div className="border border-indigo-200 dark:border-indigo-900/80 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-indigo-50 dark:bg-indigo-950/60 p-2.5 border-b border-indigo-200 dark:border-indigo-900 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>نموذج قيد اليومية التصحيحي (Adjusting Entry)</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                    المبلغ: {formatEgyptianCurrency(Math.max(selectedRowForCorrection.debit || 0, selectedRowForCorrection.credit || 0))}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 text-xs space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60">
                    <div>
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold block">
                        من حـ/ {selectedRowForCorrection.audit.suggestedCorrectionEntry.debitAccount} (مدين)
                      </span>
                      <span className="text-[10px] text-slate-500">إثبات الأصل / المصروف الصحيح طبقاً للمعيار</span>
                    </div>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatEgyptianCurrency(selectedRowForCorrection.audit.suggestedCorrectionEntry.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60">
                    <div>
                      <span className="text-rose-800 dark:text-rose-300 font-bold block">
                        إلى حـ/ {selectedRowForCorrection.audit.suggestedCorrectionEntry.creditAccount} (دائن)
                      </span>
                      <span className="text-[10px] text-slate-500">استبعاد وإلغاء التوجيه الخاطئ السابق</span>
                    </div>
                    <span className="font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                      {formatEgyptianCurrency(selectedRowForCorrection.audit.suggestedCorrectionEntry.amount)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-300">الشرح الموصى به: </span>
                    {selectedRowForCorrection.audit.suggestedCorrectionEntry.explanation}
                  </div>
                </div>
              </div>

              {/* Action in modal */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApplySuggestedReclassification(selectedRowForCorrection.id);
                    setSelectedRowForCorrection(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>اعتماد هذا التصحيح في الملف</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRowForCorrection(null)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNotesAuditorView;
