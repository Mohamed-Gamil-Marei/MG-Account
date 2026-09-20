import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  ShieldAlert,
  Activity,
  TrendingUp,
  Printer,
  BarChart3,
  AlertOctagon,
  Zap,
  CheckCircle,
  Coins,
} from 'lucide-react';
import {
  JournalNotesAuditEngine,
  RawJournalRow,
  AuditedJournalRow,
  AuditSummaryStats,
  AuditIssueCategory,
  ForensicAuditAnalysisResult,
  ForensicAnomaly,
  BenfordDigitStat,
} from '../../services/journalNotesAuditService';
import { DatabaseState, db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { JournalEntry, JournalEntryLine } from '../../types';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface JournalEntryNotesAuditorViewProps {
  state?: DatabaseState;
  onNavigateToJournal?: () => void;
  initialMainTab?: 'DIRECTION_AUDIT' | 'FORENSIC_FRAUD_AUDIT';
}

export const JournalEntryNotesAuditorView: React.FC<JournalEntryNotesAuditorViewProps> = ({
  state,
  onNavigateToJournal,
  initialMainTab = 'DIRECTION_AUDIT',
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'DIRECTION_AUDIT' | 'FORENSIC_FRAUD_AUDIT'>(
    initialMainTab
  );
  const [rows, setRows] = useState<AuditedJournalRow[]>([]);
  const [stats, setStats] = useState<AuditSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Filters & Search for Direction Audit
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'ERRORS_ONLY' | AuditIssueCategory>('ALL');
  const [selectedRowForCorrection, setSelectedRowForCorrection] = useState<AuditedJournalRow | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filters & Search for Forensic Fraud Audit
  const [forensicSeverityFilter, setForensicSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [forensicSearchQuery, setForensicSearchQuery] = useState('');
  const [isForensicPrintModalOpen, setIsForensicPrintModalOpen] = useState(false);
  const [isAuditPrintModalOpen, setIsAuditPrintModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoLoadedRef = useRef(false);

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

  // Auto-load system entries on initial mount if available and rows empty
  useEffect(() => {
    if (!hasAutoLoadedRef.current && state?.journalEntries && state.journalEntries.length > 0 && rows.length === 0) {
      hasAutoLoadedRef.current = true;
      handleAuditCurrentSystemEntries();
    }
  }, [state?.journalEntries]);

  // Export to Excel (Full Audit Report)
  const handleExportReport = () => {
    if (rows.length === 0 || !stats) return;
    JournalNotesAuditEngine.exportAuditReportToExcel(rows, stats);
  };

  // Export to Excel (Dedicated Errors & Suggested Adjusting Entries Only)
  const handleExportErrorsOnly = () => {
    if (rows.length === 0 || !stats) return;
    JournalNotesAuditEngine.exportErrorsAndAdjustmentsOnly(
      rows,
      stats,
      fileName || undefined
    );
  };

  // Export to Excel (Original Structure with Audit Annotations, Forensic Red Flags & Benford sheets)
  const handleExportOriginalWithAudit = () => {
    if (rows.length === 0 || !stats) return;
    JournalNotesAuditEngine.exportOriginalWithAuditAnnotations(
      rows,
      stats,
      fileName || undefined,
      forensicResult
    );
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

  // Direction Audit Filtered rows
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

  // Forensic Fraud & Benford Analysis Results
  const forensicResult = useMemo<ForensicAuditAnalysisResult>(() => {
    return JournalNotesAuditEngine.analyzeForensics(rows);
  }, [rows]);

  // Filtered Forensic Anomalies
  const filteredForensicAnomalies = useMemo(() => {
    return forensicResult.anomalies.filter((a) => {
      if (forensicSeverityFilter !== 'ALL' && a.severity !== forensicSeverityFilter) {
        return false;
      }
      if (forensicSearchQuery.trim()) {
        const q = forensicSearchQuery.toLowerCase().trim();
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchAcc = (a.accountName || '').toLowerCase().includes(q);
        const matchDesc = (a.description || '').toLowerCase().includes(q);
        const matchEntry = (a.entryNo || '').toLowerCase().includes(q);
        const matchRec = (a.recommendation || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAcc && !matchDesc && !matchEntry && !matchRec) {
          return false;
        }
      }
      return true;
    });
  }, [forensicResult.anomalies, forensicSeverityFilter, forensicSearchQuery]);

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
                  المنظومة الموحدة لتدقيق القيود والرقابة الجنائية المالية
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 font-mono">
                    ISA 240 & Benford Sentinel
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80">
                  كشف أخطاء التوجيه والرسملة | رصد شبهات الغش والتدليس واختراق الرقابة الداخلية | التحليل الرقمي بقانون بنفورد
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportOriginalWithAudit}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="تصدير ملف الإكسيل الشامل متضمناً: الشيت الأصلي بملاحظات الفحص، وشيت الأخطاء برقم الصف، وشيت القيود المصححة للترحيل، وشيت التدليس وبنفورد"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير الإكسيل الشامل (كافة الشيتات)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportErrorsOnly}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="تصدير شيت مستقل يقتصر على السطور والقيود التي بها مشكلة مع أرقام الصفوف وقيد التسوية المصحح"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>شيت الأخطاء والتسويات فقط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAuditPrintModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="معاينة وطباعة تقرير الفحص والتوجيه المحاسبي وقائمة الأخطاء والتسويات (PDF)"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>طباعة تقرير الفحص</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsForensicPrintModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="طباعة ملف تقرير التدقيق الجنائي وشبهات التدليس المعتمد (ISA 240)"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>تقرير الرقابة الجنائية</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Master Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMainTab('DIRECTION_AUDIT')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'DIRECTION_AUDIT'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-md border border-indigo-200 dark:border-indigo-900'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
          <span>فحص وتصحيح توجيه القيود والبيان (Direction & Narration)</span>
          {stats && stats.flaggedErrorsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
              {stats.flaggedErrorsCount} توجيه مخالف
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('FORENSIC_FRAUD_AUDIT')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'FORENSIC_FRAUD_AUDIT'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>الرقابة الجنائية وكشف الغش والتدليس (ISA 240 & Benford's Law)</span>
          {rows.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                forensicResult.overallRiskScore > 40
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-white/20 text-white'
              }`}
            >
              مؤشر المخاطر: {forensicResult.overallRiskScore}% ({forensicResult.anomalies.length} شبهة)
            </span>
          )}
        </button>
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

      {/* Direction Audit Tab View */}
      {activeMainTab === 'DIRECTION_AUDIT' && (
        <div className="space-y-4 animate-in fade-in duration-150">
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
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                onClick={handleExportOriginalWithAudit}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تصدير الشيت الشامل بجميع الشيتات (الأصل، تقرير الأخطاء برقم الصف، القيود المصححة، وشيتات التدليس وبنفورد)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span>تصدير الشيت الشامل (كافة الشيتات)</span>
              </button>

              <button
                type="button"
                onClick={handleExportErrorsOnly}
                className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تصدير شيت منفصل للأخطاء وقيود التسوية فقط"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>شيت الأخطاء والتسويات فقط</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAuditPrintModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="معاينة وطباعة تقرير الفحص والتوجيه المحاسبي وقائمة الأخطاء والتسويات (PDF)"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>طباعة تقرير الفحص</span>
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
        </div>
      )}

      {/* Forensic Fraud Sentinel View (ISA 240 & Benford's Law) */}
      {activeMainTab === 'FORENSIC_FRAUD_AUDIT' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {rows.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                يرجى رفع ملف قيود أو فحص قيود المنظومة لتشغيل رادار التدليس وبنفورد
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يقوم محرك الرقابة الجنائية بمطابقة القيود مع معيار التدقيق الدولي ISA 240، وقانون الدفع غير النقدي (حد الـ 20,000 كاش)، وتحليل الأرقام الدائرية، وقانون بنفورد الرقمي.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  رفع ملف قيود الآن
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  تجربة النموذج الشامل
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Forensic Metric Scorecards (6 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Overall Risk Score */}
                <div
                  className={`rounded-xl p-3 border shadow-2xs ${
                    forensicResult.overallRiskScore > 40
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
                      : forensicResult.overallRiskScore > 20
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60'
                  }`}
                >
                  <span className="text-[11px] font-bold block flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    مؤشر مخاطر التدليس
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-2xl font-black font-mono ${
                        forensicResult.overallRiskScore > 40
                          ? 'text-rose-700 dark:text-rose-300'
                          : forensicResult.overallRiskScore > 20
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {forensicResult.overallRiskScore}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {forensicResult.riskLevel}
                    </span>
                  </div>
                </div>

                {/* 2. Critical Red Flags */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    مخالفات رقابية حرجة
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {forensicResult.criticalCount}
                    </span>
                    <span className="text-[10px] text-slate-400">مؤشر حرج</span>
                  </div>
                </div>

                {/* 3. High Severity / Cash Violations */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold block flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    مخالفات نقدية ومرتفعة
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {forensicResult.highCount}
                    </span>
                    <span className="text-[10px] text-slate-400">مؤشر مرتفع</span>
                  </div>
                </div>

                {/* 4. Smurfing Count */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-purple-200 dark:border-purple-900/60 shadow-2xs">
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold block flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    شبهات تفتيت المبالغ
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                      {forensicResult.smurfingCount}
                    </span>
                    <span className="text-[10px] text-slate-400">حالة تجزئة</span>
                  </div>
                </div>

                {/* 5. Round Numbers Count */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
                  <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold block flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                    أرقام دائرية متكلفة
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {forensicResult.roundNumbersCount}
                    </span>
                    <span className="text-[10px] text-slate-400">مبالغ مصطنعة</span>
                  </div>
                </div>

                {/* 6. Benford Deviations */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold block flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    شذوذ قانون بنفورد
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {forensicResult.benfordAnomaliesCount}
                    </span>
                    <span className="text-[10px] text-slate-400">أرقام شاذة</span>
                  </div>
                </div>
              </div>

              {/* Benford's Law First Digit Interactive Distribution */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        التحليل الإحصائي الرقمي لقانون بنفورد (Benford's Law Distribution)
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono">
                          First-Digit Law
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        مقارنة التوزيع الطبيعي اللوغاريتمي المتوقع مع التكرار الفعلي لمبالغ القيود المفحوصة لاكتشاف القيود الوهمية المصطنعة يدوياً
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                      الفعلي
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
                      المتوقع ببنفورد
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      شذوذ إحصائي
                    </span>
                  </div>
                </div>

                {/* Benford Columns (Digits 1 to 9) */}
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2.5 pt-2">
                  {forensicResult.benfordStats.map((b) => {
                    const isAnomalous = b.isAnomalous;
                    const heightPercent = Math.min(Math.round(b.actualPercentage * 2.2), 100);

                    return (
                      <div
                        key={b.digit}
                        className={`rounded-xl p-2.5 border text-center transition-all flex flex-col justify-between ${
                          isAnomalous
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/80 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        {/* Digit Header */}
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                            {b.digit}
                          </span>
                          {isAnomalous && (
                            <span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold animate-pulse">
                              شذوذ
                            </span>
                          )}
                        </div>

                        {/* Visual Bar Container */}
                        <div className="my-3 h-28 flex items-end justify-center relative px-2">
                          {/* Expected Reference Mark */}
                          <div
                            className="absolute left-0 right-0 border-t-2 border-dashed border-slate-400 z-10"
                            style={{ bottom: `${Math.min(Math.round(b.expectedPercentage * 2.2), 100)}%` }}
                            title={`المتوقع: ${b.expectedPercentage}%`}
                          />

                          {/* Actual Bar */}
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 shadow-sm ${
                              isAnomalous
                                ? 'bg-gradient-to-t from-rose-600 to-red-400'
                                : 'bg-gradient-to-t from-indigo-700 to-indigo-500'
                            }`}
                            style={{ height: `${Math.max(heightPercent, 8)}%` }}
                            title={`الفعلي: ${b.actualPercentage}%`}
                          />
                        </div>

                        {/* Stat Details */}
                        <div className="space-y-1 text-[10px] font-mono border-t border-slate-200 dark:border-slate-700 pt-1.5">
                          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold">
                            <span>الفعلي:</span>
                            <span>{b.actualPercentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>المتوقع:</span>
                            <span>{b.expectedPercentage}%</span>
                          </div>
                          <div
                            className={`text-[9px] font-bold ${
                              isAnomalous
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            انحراف: {b.deviation > 0 ? `+${b.deviation}` : b.deviation}%
                          </div>
                          <div className="text-[9px] text-slate-400">
                            ({b.actualCount} قيد)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit Standard Guidance Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-100">سند الفحص الجنائي (ISA 240): </span>
                    أثبتت أبحاث مراجعة الحسابات الجنائية أن الأرقام المصطنعة أو المفبركة في الدفاتر تبتعد بشكل ملحوظ عن قانون بنفورد الإحصائي (الذي يشترط بدء الرقم 1 بنسبة 30.1% وتناقصه تدريجياً حتى الرقم 9 بنسبة 4.6%). ارتفاع انحراف رقم معين عن 8% يمثل قرينة قوية تستدعي مراجعة وفحص أصول المستندات الورقية لتلك القيود.
                  </p>
                </div>
              </div>

              {/* Forensic Red Flag Radar Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-3 p-4">
                {/* Radar Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      رادار مؤشرات الشبهة والتدليس واختراق الرقابة (Forensic Red Flags)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold">
                        {filteredForensicAnomalies.length} شبهة
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      حصر شامل لكافة القيود المنطوية على شبهة تفتيت، أو أرقام دائرية، أو سحوبات نقدية كاش مخالفة للقانون، أو سحوبات شركاء دون إذن
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportOriginalWithAudit}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير إكسيل شامل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsForensicPrintModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة تقرير الرقابة</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={forensicSearchQuery}
                      onChange={(e) => setForensicSearchQuery(e.target.value)}
                      placeholder="بحث في شبهات التدليس، الحساب، أو المعيار..."
                      className="w-full pl-3 pr-9 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    {forensicSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setForensicSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Severity Filter Pills */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setForensicSeverityFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        forensicSeverityFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      الكل ({forensicResult.anomalies.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setForensicSeverityFilter('CRITICAL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        forensicSeverityFilter === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>حرج جداً ({forensicResult.criticalCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForensicSeverityFilter('HIGH')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        forensicSeverityFilter === 'HIGH'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80'
                      }`}
                    >
                      مرتفع ({forensicResult.highCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setForensicSeverityFilter('MEDIUM')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        forensicSeverityFilter === 'MEDIUM'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80'
                      }`}
                    >
                      متوسط ({forensicResult.mediumCount})
                    </button>
                  </div>
                </div>

                {/* Radar Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 w-16 text-center">الصف</th>
                        <th className="p-2.5 w-24">رقم القيد</th>
                        <th className="p-2.5 w-24">التاريخ</th>
                        <th className="p-2.5 w-44">الحساب والشرح</th>
                        <th className="p-2.5 text-left w-28">المبلغ</th>
                        <th className="p-2.5 w-24 text-center">الخطورة</th>
                        <th className="p-2.5">مؤشر التدليس وتفصيل الشبهة</th>
                        <th className="p-2.5 w-64">توصية وإجراء الفحص الميداني الموصى به</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredForensicAnomalies.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            لا توجد مؤشرات تدليس أو شبهات تطابق معايير البحث والتصفية المحددة.
                          </td>
                        </tr>
                      ) : (
                        filteredForensicAnomalies.map((anomaly) => (
                          <tr
                            key={anomaly.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              anomaly.severity === 'CRITICAL'
                                ? 'bg-rose-50/40 dark:bg-rose-950/30'
                                : anomaly.severity === 'HIGH'
                                ? 'bg-amber-50/30 dark:bg-amber-950/20'
                                : ''
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                              {anomaly.rowIndex}
                            </td>

                            <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-200">
                              {anomaly.entryNo}
                            </td>

                            <td className="p-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                              {anomaly.date}
                            </td>

                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {anomaly.accountName}
                              </span>
                              <span className="text-[10px] text-slate-400 block line-clamp-2 mt-0.5">
                                {anomaly.description}
                              </span>
                            </td>

                            <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white">
                              {formatEgyptianCurrency(anomaly.amount)}
                            </td>

                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  anomaly.severity === 'CRITICAL'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300'
                                    : anomaly.severity === 'HIGH'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                                    : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300'
                                }`}
                              >
                                {anomaly.severity === 'CRITICAL'
                                  ? 'حرج جداً'
                                  : anomaly.severity === 'HIGH'
                                  ? 'مرتفع'
                                  : 'متوسط'}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <div className="space-y-1">
                                <span className="font-bold text-rose-700 dark:text-rose-300 text-xs block">
                                  {anomaly.title}
                                </span>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                  {anomaly.description}
                                </p>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                                  السند: {anomaly.standardRef}
                                </span>
                              </div>
                            </td>

                            <td className="p-2.5">
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                  إجراء التحقق الموصى به:
                                </span>
                                {anomaly.recommendation}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Forensic Print Report Modal (PrintLayoutWrapper) */}
      {isForensicPrintModalOpen && (
        <PrintLayoutWrapper
          title="تقرير الفحص الجنائي المالي وشبهات التدليس (ISA 240 & Benford Sentinel)"
          subTitle="تقرير فحص المخالفات الرقابية الحرجة وشبهات اصطناع القيود واختراق الصلاحيات"
          fileName={`Forensic-Audit-Report-${new Date().toISOString().split('T')[0]}.pdf`}
          onClose={() => setIsForensicPrintModalOpen(false)}
        >
          <div className="space-y-6 text-slate-800" dir="rtl">
            {/* Header Executive Summary */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">إجمالي القيود والسطور:</span>
                <span className="font-bold text-sm">{rows.length} سطر</span>
              </div>
              <div>
                <span className="text-slate-500 block">مؤشر مخاطر التدليس العام:</span>
                <span className="font-black text-sm text-rose-700">{forensicResult.overallRiskScore}% ({forensicResult.riskLevel})</span>
              </div>
              <div>
                <span className="text-slate-500 block">مخالفات رقابية حرجة:</span>
                <span className="font-bold text-sm text-rose-700">{forensicResult.criticalCount} مخالفة</span>
              </div>
              <div>
                <span className="text-slate-500 block">شبهات التفتيت والأرقام الدائرية:</span>
                <span className="font-bold text-sm">{forensicResult.smurfingCount + forensicResult.roundNumbersCount} حالة</span>
              </div>
            </div>

            {/* Benford Summary in Print */}
            <div>
              <h4 className="font-bold text-sm mb-2 border-b pb-1 text-slate-900">
                نتائج التحليل الإحصائي لقانون بنفورد (Benford's Law First-Digit Analysis)
              </h4>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2">الرقم الأول</th>
                    <th className="p-2 text-center">النسبة المتوقعة</th>
                    <th className="p-2 text-center">النسبة الفعلية</th>
                    <th className="p-2 text-center">عدد التكرارات</th>
                    <th className="p-2 text-center">نسبة الانحراف</th>
                    <th className="p-2 text-center">التقييم الجنائي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {forensicResult.benfordStats.map((b) => (
                    <tr key={b.digit} className={b.isAnomalous ? 'bg-rose-50 font-bold' : ''}>
                      <td className="p-2 font-mono">{b.digit}</td>
                      <td className="p-2 text-center font-mono">{b.expectedPercentage}%</td>
                      <td className="p-2 text-center font-mono">{b.actualPercentage}%</td>
                      <td className="p-2 text-center font-mono">{b.actualCount}</td>
                      <td className="p-2 text-center font-mono">{b.deviation}%</td>
                      <td className="p-2 text-center">
                        {b.isAnomalous ? (
                          <span className="text-rose-700 font-bold">شذوذ إحصائي (تكرار غير طبيعي)</span>
                        ) : (
                          <span className="text-emerald-700">توزيع طبيعي</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Anomalies Table in Print */}
            <div>
              <h4 className="font-bold text-sm mb-2 border-b pb-1 text-slate-900">
                سجل مؤشرات الشبهة والتدليس واختراق الرقابة (ISA 240 Forensic Red Flags)
              </h4>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 w-12 text-center">الصف</th>
                    <th className="p-2 w-20">رقم القيد</th>
                    <th className="p-2 w-28">الحساب المسجل</th>
                    <th className="p-2 text-left w-24">المبلغ</th>
                    <th className="p-2 w-20 text-center">الخطورة</th>
                    <th className="p-2">طبيعة الشبهة والتفاصيل</th>
                    <th className="p-2 w-48">إجراء الفحص الميداني الموصى به</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {forensicResult.anomalies.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2 text-center font-mono">{a.rowIndex}</td>
                      <td className="p-2 font-mono font-bold">{a.entryNo}</td>
                      <td className="p-2">{a.accountName}</td>
                      <td className="p-2 text-left font-mono">{formatEgyptianCurrency(a.amount)}</td>
                      <td className="p-2 text-center font-bold">
                        {a.severity === 'CRITICAL' ? 'حرج' : a.severity === 'HIGH' ? 'مرتفع' : 'متوسط'}
                      </td>
                      <td className="p-2">
                        <span className="font-bold block text-slate-900">{a.title}</span>
                        <span className="text-[11px] text-slate-600 block">{a.description}</span>
                        <span className="text-[10px] text-slate-500 block">المرجع: {a.standardRef}</span>
                      </td>
                      <td className="p-2 text-[11px]">{a.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Auditor Signature Block */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 text-xs">
              <div>
                <span className="font-bold block">مُعد التقرير (فاحص الحسابات الجنائي):</span>
                <span className="block mt-6 text-slate-400">...................................................</span>
              </div>
              <div className="text-left">
                <span className="font-bold block">اعتماد الشريك المسؤول / المراجع العام:</span>
                <span className="block mt-6 text-slate-400">...................................................</span>
              </div>
            </div>
          </div>
        </PrintLayoutWrapper>
      )}

      {/* Direction Audit Print Report Modal (PrintLayoutWrapper) */}
      {isAuditPrintModalOpen && stats && (
        <PrintLayoutWrapper
          title="تقرير الفحص والتوجيه المحاسبي وقائمة الأخطاء وقيود التسوية"
          subTitle="تقرير فحص أخطاء التوجيه المحاسبي الدلالي للقيود وتحديد قيود التسوية المقترحة"
          fileName={`Audit-Direction-Report-${new Date().toISOString().split('T')[0]}.pdf`}
          onClose={() => setIsAuditPrintModalOpen(false)}
        >
          <div className="space-y-6 text-slate-800" dir="rtl">
            {/* Header Executive Summary */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">إجمالي السطور المفحوصة:</span>
                <span className="font-bold text-sm">{stats.totalRows} سطر ({stats.totalEntriesCount} قيد)</span>
              </div>
              <div>
                <span className="text-slate-500 block">السطور ذات التوجيه المخالف:</span>
                <span className="font-black text-sm text-rose-700">{stats.flaggedErrorsCount} سطر</span>
              </div>
              <div>
                <span className="text-slate-500 block">مخالفات حرجة (High):</span>
                <span className="font-bold text-sm text-amber-700">{stats.highSeverityCount} سطر</span>
              </div>
              <div>
                <span className="text-slate-500 block">إجمالي المبالغ الخاضعة للتوجيه:</span>
                <span className="font-black text-sm text-indigo-700">{formatEgyptianCurrency(stats.totalDiscrepancyAmount)}</span>
              </div>
            </div>

            {/* Flagged Errors & Suggested Adjusting Entries */}
            <div>
              <h4 className="font-bold text-sm mb-2 border-b pb-1 text-slate-900">
                جدول السطور والقيود التي بها مشاكل توجيه مع قيود التسوية المقترحة
              </h4>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 w-12 text-center">الصف</th>
                    <th className="p-2 w-20">رقم القيد</th>
                    <th className="p-2 w-28">الحساب الخطأ</th>
                    <th className="p-2">البيان في الملف</th>
                    <th className="p-2 text-left w-24">المبلغ</th>
                    <th className="p-2 w-32">نوع الخطأ</th>
                    <th className="p-2 w-32">التوجيه الصحيح</th>
                    <th className="p-2 w-48">قيد التسوية المقترح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows
                    .filter((r) => r.audit.hasIssue)
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 text-center font-mono">{r.originalRowIndex}</td>
                        <td className="p-2 font-mono font-bold">{r.entryNo}</td>
                        <td className="p-2 text-rose-700 font-bold">{r.accountName}</td>
                        <td className="p-2 text-[11px]">{r.narration}</td>
                        <td className="p-2 text-left font-mono font-bold">
                          {formatEgyptianCurrency(Math.max(r.debit || 0, r.credit || 0))}
                        </td>
                        <td className="p-2 text-[11px] text-amber-800">{r.audit.categoryLabel}</td>
                        <td className="p-2 text-[11px] text-emerald-800 font-bold">
                          {r.userOverriddenAccount || r.audit.suggestedAccountName}
                        </td>
                        <td className="p-2 text-[10px] space-y-0.5">
                          <div className="text-emerald-700 font-bold">
                            من حـ/ {r.audit.suggestedCorrectionEntry.debitAccount}
                          </div>
                          <div className="text-rose-700 font-bold">
                            إلى حـ/ {r.audit.suggestedCorrectionEntry.creditAccount}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Auditor Signature Block */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 text-xs">
              <div>
                <span className="font-bold block">مُعد التقرير (فاحص التوجيه المحاسبي):</span>
                <span className="block mt-6 text-slate-400">...................................................</span>
              </div>
              <div className="text-left">
                <span className="font-bold block">اعتماد مدير المراجعة / الشريك المسؤول:</span>
                <span className="block mt-6 text-slate-400">...................................................</span>
              </div>
            </div>
          </div>
        </PrintLayoutWrapper>
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
