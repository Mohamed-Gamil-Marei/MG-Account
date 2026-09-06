import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/egyptianTaxCalculations';
import {
  runAutomatedJournalAudit,
  AuditFinding,
  AuditFindingType,
  AuditSeverity,
  AuditScanSummary,
} from '../../services/journalAuditEngine';
import { JournalEntry, JournalEntryLine } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Copy,
  Scale,
  Paperclip,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit3,
  FileText,
  Printer,
  Download,
  Send,
  Building,
  Calendar,
  Sparkles,
  ArrowRight,
  Upload,
  Info,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PlusCircle,
  Check,
} from 'lucide-react';

interface JournalAuditScannerViewProps {
  state: DatabaseState;
  onNavigateToJournalEntry?: (entryId: string) => void;
  onSelectTab?: (tabId: string) => void;
}

export const JournalAuditScannerView: React.FC<JournalAuditScannerViewProps> = ({
  state,
  onNavigateToJournalEntry,
  onSelectTab,
}) => {
  // Filter states
  const activeClientId = state.activeClientContext?.clientId || '';
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>(activeClientId || 'ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'ALL'>(
    state.activeClientContext?.selectedFiscalYear || 2026
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<AuditFindingType | 'ALL'>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<AuditSeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [materialityThreshold, setMaterialityThreshold] = useState<number>(50000);

  // Scanning simulation state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [lastScanTime, setLastScanTime] = useState<string>(
    new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  );

  // Modal States
  const [inspectingEntry, setInspectingEntry] = useState<JournalEntry | null>(null);
  const [attachingForEntry, setAttachingForEntry] = useState<JournalEntry | null>(null);
  const [attachmentNameInput, setAttachmentNameInput] = useState<string>('');
  const [auditorResolutionFinding, setAuditorResolutionFinding] = useState<AuditFinding | null>(null);
  const [auditorNoteInput, setAuditorNoteInput] = useState<string>('');

  // Expandable finding card IDs
  const [expandedFindingIds, setExpandedFindingIds] = useState<Set<string>>(new Set());

  // Notification Banner
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Keep client filter in sync if activeClientContext changes
  useEffect(() => {
    if (state.activeClientContext?.clientId) {
      setSelectedClientFilter(state.activeClientContext.clientId);
    }
    if (state.activeClientContext?.selectedFiscalYear) {
      setSelectedYearFilter(state.activeClientContext.selectedFiscalYear);
    }
  }, [state.activeClientContext]);

  // Run audit inspection
  const { findings, summary } = useMemo(() => {
    return runAutomatedJournalAudit(state.journalEntries, {
      clientId: selectedClientFilter === 'ALL' ? null : selectedClientFilter,
      fiscalYear: selectedYearFilter === 'ALL' ? null : selectedYearFilter,
      materialityThreshold,
    });
  }, [state.journalEntries, selectedClientFilter, selectedYearFilter, materialityThreshold]);

  // Filtered findings for display
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // Type Filter
      if (selectedTypeFilter !== 'ALL' && f.type !== selectedTypeFilter) return false;

      // Severity Filter
      if (selectedSeverityFilter !== 'ALL' && f.severity !== selectedSeverityFilter) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSerial = f.entrySerialNumber.toLowerCase().includes(q);
        const matchesDesc = f.entryDescription.toLowerCase().includes(q);
        const matchesClient = (f.clientName || '').toLowerCase().includes(q);
        const matchesTitle = f.title.toLowerCase().includes(q);
        if (!matchesSerial && !matchesDesc && !matchesClient && !matchesTitle) return false;
      }

      return true;
    });
  }, [findings, selectedTypeFilter, selectedSeverityFilter, searchQuery]);

  // Trigger manual deep scan animation
  const handleTriggerScan = () => {
    setIsScanning(true);
    setScanProgress(15);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            setScanProgress(100);
            setLastScanTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
            showSuccessNotification('تم اكتمال الفحص التلقائي الشامل لجميع قيود اليومية بنجاح.');
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  const showSuccessNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4500);
  };

  const toggleExpandFinding = (id: string) => {
    setExpandedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick Action: Save Attachment for an Entry
  const handleSaveAttachment = () => {
    if (!attachingForEntry) return;
    const docName = attachmentNameInput.trim() || `مستند_مؤيد_قيد_${attachingForEntry.serialNumber}.pdf`;

    db.updateJournalEntry(attachingForEntry.id, {
      attachedFileName: docName,
      attachedFileUrl: `https://office-storage.internal/docs/${docName}`,
    });

    db.logAudit(
      'UPDATE',
      `إرفاق مستند داعم للقيد [${attachingForEntry.serialNumber}]: ${docName} عبر مركز الفحص الآلي`
    );

    setAttachingForEntry(null);
    setAttachmentNameInput('');
    showSuccessNotification(`تم حفظ وإرفاق المستند [${docName}] للقيد ${attachingForEntry.serialNumber} بنجاح.`);
  };

  // Quick Action: Auto Post Entry
  const handlePostEntry = (entry: JournalEntry) => {
    db.updateJournalEntry(entry.id, {
      isPosted: true,
    });
    db.logAudit('POST', `ترحيل القيد [${entry.serialNumber}] للأستاذ العام من خلال مركز المراجعة والفحص الآلي`);
    showSuccessNotification(`تم ترحيل القيد ${entry.serialNumber} نهائياً إلى الأستاذ العام.`);
  };

  // Quick Action: Add Auditor Resolution Note
  const handleSaveAuditorNote = () => {
    if (!auditorResolutionFinding) return;
    const note = auditorNoteInput.trim() || 'تمت المراجعة والفحص المكتبي والتحقق من صحة القيد.';

    const entry = state.journalEntries.find((e) => e.id === auditorResolutionFinding.journalEntryId);
    if (entry) {
      const updatedAuditTrail = [
        ...(entry.auditTrail || []),
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          user: state.officeProfile.auditorName || 'المراجع القانوني',
          action: 'UPDATE' as const,
          details: `اعتماد وتوثيق المراجع: ${note}`,
        },
      ];
      db.updateJournalEntry(entry.id, { auditTrail: updatedAuditTrail });
    }

    setAuditorResolutionFinding(null);
    setAuditorNoteInput('');
    showSuccessNotification(`تم توثيق ملاحظة المراجع القانوني وتثبيتها في سجل تدقيق القيد.`);
  };

  // Handle Export / Print
  const handlePrintAuditReport = () => {
    window.print();
  };

  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          label: 'حرج للغاية (Critical)',
          icon: ShieldAlert,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'مخاطر عالية (High)',
          icon: AlertTriangle,
        };
      case 'MEDIUM':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          label: 'متوسط (Medium)',
          icon: Info,
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'تنبيه (Low)',
          icon: Info,
        };
    }
  };

  const getTypeBadge = (type: AuditFindingType) => {
    switch (type) {
      case 'UNBALANCED_ENTRY':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          label: 'عدم توازن محاسبي',
          icon: Scale,
        };
      case 'DUPLICATE_ENTRY':
        return {
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          label: 'قيد مكرر مشبوه',
          icon: Copy,
        };
      case 'MISSING_ATTACHMENT':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          label: 'يفتقر للمستندات المؤيدة',
          icon: Paperclip,
        };
      case 'UNPOSTED_ENTRY':
        return {
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          label: 'مسودة غير مرحلة',
          icon: Layers,
        };
      case 'UNUSUAL_DATE_OR_CUTOFF':
        return {
          bg: 'bg-orange-100 text-orange-900 border-orange-300',
          label: 'تاريخ مستقبلي / قطع',
          icon: Calendar,
        };
      case 'ZERO_VALUE_LINES':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          label: 'أسطر مبالغ صفرية',
          icon: FileText,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          label: 'شذوذ محاسبي',
          icon: AlertTriangle,
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 bg-emerald-100 rounded-lg cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top Banner: Auditor Inspection Center Letterhead */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                معايير المراجعة المصرية (ESA 240 / 320 / 500)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                محرك الفحص والتدقيق الآلي المتقدم
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <span>مركز الفحص الآلي وتحليل قيود اليومية</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              تحليل خوارزمي دقيق لدفاتر اليومية لكشف القيود المتكررة، عدم التوازن المحاسبي، القيود المفتقرة للمستندات المؤيدة، وتوليد مذكرات استيفاء وتنبيهات مباشرة للمراجع القانوني.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isScanning
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-900/30 active:scale-98'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جاري الفحص الشامل...' : '⚡ تشغيل الفحص الآلي الفوري'}</span>
            </button>

            <button
              onClick={handlePrintAuditReport}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>طباعة المذكرة</span>
            </button>
          </div>
        </div>

        {/* Real-time Scanning Progress Bar */}
        {isScanning && (
          <div className="mt-5 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                جاري مسح قيود الدفاتر المحاسبية والتحقق من التكرار والمرفقات...
              </span>
              <span className="font-mono font-bold text-amber-300">{scanProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Letterhead Status Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              <strong>المراجع القانوني:</strong> {state.officeProfile.auditorName || 'أ/ محمد جميل مرعي'}
            </span>
            <span>
              <strong>آخر فحص:</strong> {lastScanTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>محرك فحص المعايير المصرية نشط ومفعل</span>
          </div>
        </div>
      </div>

      {/* Audit Health Overview & KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Health Score Gauge Card */}
        <div
          className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
            summary.healthGrade === 'EXCELLENT'
              ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-500/40 text-white'
              : summary.healthGrade === 'GOOD'
              ? 'bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-500/40 text-white'
              : summary.healthGrade === 'NEEDS_REVIEW'
              ? 'bg-gradient-to-br from-amber-950 to-slate-900 border-amber-500/40 text-white'
              : 'bg-gradient-to-br from-red-950 to-slate-900 border-red-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">مؤشر السلامة والنزاهة</span>
            <ShieldCheck
              className={`w-5 h-5 ${
                summary.healthGrade === 'EXCELLENT'
                  ? 'text-emerald-400'
                  : summary.healthGrade === 'GOOD'
                  ? 'text-indigo-400'
                  : summary.healthGrade === 'NEEDS_REVIEW'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight">{summary.auditHealthScore}%</span>
            <span className="text-[11px] font-bold text-slate-300">درجة الاعتماد</span>
          </div>
          <div className="text-[11px] font-medium text-slate-300 line-clamp-1">{summary.healthLabelAr}</div>
        </div>

        {/* Unbalanced Entries KPI */}
        <button
          onClick={() => setSelectedTypeFilter(selectedTypeFilter === 'UNBALANCED_ENTRY' ? 'ALL' : 'UNBALANCED_ENTRY')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
            summary.unbalancedCount > 0
              ? 'bg-red-50/90 border-red-300 text-red-950 hover:bg-red-100 shadow-xs ring-1 ring-red-400/30'
              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold">قيود غير متوازنة</span>
            <Scale className={`w-4 h-4 ${summary.unbalancedCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black font-mono my-1 text-red-700">
            {summary.unbalancedCount} <span className="text-xs font-normal text-slate-600">قيد</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {summary.unbalancedCount > 0 ? '❌ تخل بميزان المراجعة' : '✅ كافة القيود متوازنة'}
          </div>
        </button>

        {/* Duplicate Entries KPI */}
        <button
          onClick={() => setSelectedTypeFilter(selectedTypeFilter === 'DUPLICATE_ENTRY' ? 'ALL' : 'DUPLICATE_ENTRY')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
            summary.duplicatesCount > 0
              ? 'bg-purple-50/90 border-purple-300 text-purple-950 hover:bg-purple-100 shadow-xs ring-1 ring-purple-400/30'
              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold">قيود مكررة مشبوهة</span>
            <Copy className={`w-4 h-4 ${summary.duplicatesCount > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black font-mono my-1 text-purple-800">
            {summary.duplicatesCount} <span className="text-xs font-normal text-slate-600">حالة</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {summary.duplicatesCount > 0 ? '⚠️ اشتباه تكرار تسجيل فواتير' : '✅ لا يوجد تكرار مسجل'}
          </div>
        </button>

        {/* Missing Attachments KPI */}
        <button
          onClick={() => setSelectedTypeFilter(selectedTypeFilter === 'MISSING_ATTACHMENT' ? 'ALL' : 'MISSING_ATTACHMENT')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
            summary.missingAttachmentsCount > 0
              ? 'bg-amber-50/90 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-xs'
              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold">تفتقر للمرفقات</span>
            <Paperclip className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono my-1 text-amber-800">
            {summary.missingAttachmentsCount} <span className="text-xs font-normal text-slate-600">قيد</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            نسبة التوثيق: {summary.attachmentRate}% من القيود
          </div>
        </button>

        {/* Financial Scrutiny Exposure KPI */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1 text-slate-600">
            <span className="font-bold">المبالغ محل الملاحظات</span>
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black font-mono my-1 text-indigo-950 truncate">
            {formatEgyptianCurrency(summary.flaggedFinancialExposure)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            من إجمالي حجم معاملات: {formatEgyptianCurrency(summary.totalFinancialVolume)}
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Company Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">الشركة محل الفحص:</label>
            <div className="relative">
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 pr-8"
              >
                <option value="ALL">جميع الشركات والعملاء ({state.clients.length})</option>
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Fiscal Year Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">السنة المالية:</label>
            <div className="relative">
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-800 pr-8"
              >
                <option value="ALL">كافة السنوات</option>
                <option value={2026}>2026 (الفترة الحالية)</option>
                <option value={2025}>2025 (السنة المنتهية)</option>
                <option value={2024}>2024</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Anomaly Type Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">نوع الملاحظة:</label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">كافة الملاحظات ({findings.length})</option>
              <option value="UNBALANCED_ENTRY">❌ غير متوازنة ({summary.unbalancedCount})</option>
              <option value="DUPLICATE_ENTRY">⚠️ مكررة مشبوهة ({summary.duplicatesCount})</option>
              <option value="MISSING_ATTACHMENT">📎 بدون مرفقات ({summary.missingAttachmentsCount})</option>
              <option value="UNPOSTED_ENTRY">📝 مسودات غير مرحلة ({summary.unpostedCount})</option>
              <option value="UNUSUAL_DATE_OR_CUTOFF">📅 تواريخ غير معتادة</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">درجة الخطورة:</label>
            <select
              value={selectedSeverityFilter}
              onChange={(e) => setSelectedSeverityFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">جميع الدرجات</option>
              <option value="CRITICAL">🔴 حرج للغاية ({summary.criticalFindingsCount})</option>
              <option value="HIGH">🟠 عالي الخطورة ({summary.highFindingsCount})</option>
              <option value="MEDIUM">🔵 متوسط ({summary.mediumFindingsCount})</option>
              <option value="LOW">⚪ تنبيه ({summary.lowFindingsCount})</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">بحث في القيود:</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="رقم القيد، البيان، العميل..."
                className="w-full p-2 pl-8 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Filter Tags & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500">فلترة سريعة:</span>
            <button
              onClick={() => {
                setSelectedTypeFilter('ALL');
                setSelectedSeverityFilter('ALL');
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedTypeFilter === 'ALL' && selectedSeverityFilter === 'ALL' && !searchQuery
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              عرض الكل ({findings.length})
            </button>
            <button
              onClick={() => {
                setSelectedSeverityFilter('CRITICAL');
                setSelectedTypeFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedSeverityFilter === 'CRITICAL'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              الحرج فقط ({summary.criticalFindingsCount})
            </button>
            <button
              onClick={() => {
                setSelectedTypeFilter('DUPLICATE_ENTRY');
                setSelectedSeverityFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedTypeFilter === 'DUPLICATE_ENTRY'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              المكرر ({summary.duplicatesCount})
            </button>
            <button
              onClick={() => {
                setSelectedTypeFilter('UNBALANCED_ENTRY');
                setSelectedSeverityFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedTypeFilter === 'UNBALANCED_ENTRY'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              غير المتوازن ({summary.unbalancedCount})
            </button>
          </div>

          <div className="text-slate-500 text-[11px] font-medium">
            تم فحص <strong>{summary.totalEntriesScanned}</strong> قيد محاسبي | معروض <strong>{filteredFindings.length}</strong> نتيجة
          </div>
        </div>
      </div>

      {/* Findings List Section */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900">لا توجد ملاحظات أو قيود مخالفة وفق الفلاتر المحددة</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              كافة قيود اليومية المفحوصة متوازنة وموثقة وخالية من التكرار والشبهات المحاسبية وفقاً لمعايير المراجعة المصرية.
            </p>
            <button
              onClick={handleTriggerScan}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة فحص موسع لجميع الدفاتر</span>
            </button>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const sevBadge = getSeverityBadge(finding.severity);
            const typeBadge = getTypeBadge(finding.type);
            const SevIcon = sevBadge.icon;
            const TypeIcon = typeBadge.icon;
            const isExpanded = expandedFindingIds.has(finding.id);

            const correspondingEntry = state.journalEntries.find((e) => e.id === finding.journalEntryId);

            return (
              <div
                key={finding.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  finding.severity === 'CRITICAL'
                    ? 'border-red-300 hover:border-red-400'
                    : finding.severity === 'HIGH'
                    ? 'border-amber-300 hover:border-amber-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Finding Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        finding.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : finding.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${typeBadge.bg}`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {typeBadge.label}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${sevBadge.bg}`}
                        >
                          <SevIcon className="w-3 h-3" />
                          {sevBadge.label}
                        </span>

                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {finding.entrySerialNumber}
                        </span>

                        <span className="text-xs text-slate-500 font-medium">
                          {finding.entryDate}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900">{finding.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <div className="text-left font-mono pl-3 border-l border-slate-200">
                      <div className="text-[10px] text-slate-400 font-sans">قيمة القيد</div>
                      <div className="text-sm font-black text-slate-900">
                        {formatEgyptianCurrency(finding.entryTotalAmount)}
                      </div>
                    </div>

                    {/* Quick Expand Toggle */}
                    <button
                      onClick={() => toggleExpandFinding(finding.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="عرض أو إخفاء التفاصيل"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Finding Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Issue Explanation */}
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                    {finding.description}
                  </p>

                  {/* Auditor Recommendation Box */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/90 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-amber-950">توجيه وتوصية المراجع القانوني (ESA Recommendation):</div>
                      <p className="text-amber-900 leading-relaxed">{finding.recommendation}</p>
                    </div>
                  </div>

                  {/* Expanded Section: Journal Lines & Audit Evidence */}
                  {isExpanded && correspondingEntry && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          أطراف القيد المحاسبي ({correspondingEntry.lines?.length || 0} أسطر):
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {correspondingEntry.isPosted ? '✅ مرحل للأستاذ' : '⏳ مسودة غير مرحلة'}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">كود الحساب</th>
                              <th className="p-2.5">اسم الحساب بالدليل</th>
                              <th className="p-2.5">البيان التحليلي</th>
                              <th className="p-2.5 text-left font-mono">مدين (ج.م)</th>
                              <th className="p-2.5 text-left font-mono">دائن (ج.م)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(correspondingEntry.lines || []).map((l, idx) => (
                              <tr key={l.id || idx} className="hover:bg-slate-50/70">
                                <td className="p-2.5 font-mono text-slate-600">{l.accountCode}</td>
                                <td className="p-2.5 font-bold text-slate-900">{l.accountName}</td>
                                <td className="p-2.5 text-slate-600">{l.description || '-'}</td>
                                <td className="p-2.5 text-left font-mono font-bold text-emerald-800">
                                  {Number(l.debit) > 0 ? formatEgyptianCurrency(Number(l.debit)) : '-'}
                                </td>
                                <td className="p-2.5 text-left font-mono font-bold text-blue-800">
                                  {Number(l.credit) > 0 ? formatEgyptianCurrency(Number(l.credit)) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                            <tr>
                              <td colSpan={3} className="p-2.5 text-left">
                                الإجمالي:
                              </td>
                              <td className="p-2.5 text-left font-mono text-emerald-900">
                                {formatEgyptianCurrency(correspondingEntry.totalDebit)}
                              </td>
                              <td className="p-2.5 text-left font-mono text-blue-900">
                                {formatEgyptianCurrency(correspondingEntry.totalCredit)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Finding Footer Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Inspect Full Entry Details Modal */}
                      {correspondingEntry && (
                        <button
                          onClick={() => setInspectingEntry(correspondingEntry)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>معاينة تفاصيل القيد</span>
                        </button>
                      )}

                      {/* Attach Missing Document Quick Action */}
                      {finding.type === 'MISSING_ATTACHMENT' && correspondingEntry && (
                        <button
                          onClick={() => {
                            setAttachingForEntry(correspondingEntry);
                            setAttachmentNameInput(`فاتورة_مؤيدة_${correspondingEntry.serialNumber}.pdf`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-700" />
                          <span>إرفاق مستند مؤيد فوري</span>
                        </button>
                      )}

                      {/* Post Draft Entry Quick Action */}
                      {finding.type === 'UNPOSTED_ENTRY' && correspondingEntry && !correspondingEntry.isPosted && (
                        <button
                          onClick={() => handlePostEntry(correspondingEntry)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-indigo-700" />
                          <span>ترحيل للأستاذ العام</span>
                        </button>
                      )}

                      {/* Resolve & Record Auditor Note */}
                      <button
                        onClick={() => {
                          setAuditorResolutionFinding(finding);
                          setAuditorNoteInput('تم فحص المستندات المؤيدة ومطابقتها مع الأستاذ العام واعتمد القيد.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>توثيق اعتماد المراجع</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      رقم المعرف: {finding.id}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Quick Attach Document Modal */}
      {attachingForEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Paperclip className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  إرفاق مستند مؤيد للقيد {attachingForEntry.serialNumber}
                </h3>
              </div>
              <button
                onClick={() => setAttachingForEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">{attachingForEntry.description}</div>
                <div className="text-slate-500 mt-1 flex items-center justify-between">
                  <span>التاريخ: {attachingForEntry.date}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatEgyptianCurrency(attachingForEntry.totalDebit)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الملف أو رقم الفاتورة الإلكترونية:</label>
                <input
                  type="text"
                  value={attachmentNameInput}
                  onChange={(e) => setAttachmentNameInput(e.target.value)}
                  placeholder="مثال: فاتورة_مشتريات_رقم_9824.pdf"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-center space-y-2">
                <Upload className="w-6 h-6 text-amber-600 mx-auto" />
                <div className="font-bold text-amber-950">اسحب وأفلت صورة الفاتورة أو إشعار البنك هنا</div>
                <div className="text-[11px] text-amber-800">يدعم PDF, PNG, JPG حتى 25 ميجابايت مع التشفير</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setAttachingForEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveAttachment}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                حفظ وإرفاق المستند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Auditor Resolution & Note Modal */}
      {auditorResolutionFinding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  توثيق اعتماد المراجع القانوني للقيد {auditorResolutionFinding.entrySerialNumber}
                </h3>
              </div>
              <button
                onClick={() => setAuditorResolutionFinding(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{auditorResolutionFinding.title}</div>
                <div className="text-slate-600">{auditorResolutionFinding.description}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظة المراجع القانوني وتبرير الفحص (Auditor Attestation Note):
                </label>
                <textarea
                  rows={3}
                  value={auditorNoteInput}
                  onChange={(e) => setAuditorNoteInput(e.target.value)}
                  placeholder="اكتب ملاحظة التوثيق المهني..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 leading-relaxed"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                سيتم إدراج هذه الملاحظة رسمياً في سجل التدقيق الرقمي للقيد وفي أوراق عمل المراجعة الميدانية (ESA 320).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setAuditorResolutionFinding(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveAuditorNote}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                اعتماد وتثبيت الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Full Entry Detailed Inspection Modal */}
      {inspectingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                  JV
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    تفاصيل قيد اليومية رقم {inspectingEntry.serialNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تاريخ المعاملة: {inspectingEntry.date} | الحالة: {inspectingEntry.isPosted ? 'مرحل' : 'مسودة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Entry Summary Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div>
                  <span className="text-slate-500 font-semibold">البيان والشرح المحاسبي: </span>
                  <span className="font-bold text-slate-900">{inspectingEntry.description}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-500">نوع القيد: </span>
                    <span className="font-bold text-slate-800">{inspectingEntry.entryType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">الشركة / العميل: </span>
                    <span className="font-bold text-slate-800">{inspectingEntry.clientName || 'المركز الرئيسي'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">المستند المرفق: </span>
                    <span className="font-bold text-slate-800">
                      {inspectingEntry.attachedFileName || 'لا يوجد مرفق ⚠️'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">العملة: </span>
                    <span className="font-bold text-slate-800">{inspectingEntry.currency || 'EGP'}</span>
                  </div>
                </div>
              </div>

              {/* Journal Lines Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">جدول أطراف القيد المزدوج:</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">كود الحساب</th>
                        <th className="p-2.5">اسم الحساب</th>
                        <th className="p-2.5">البيان</th>
                        <th className="p-2.5 text-left font-mono">مدين (ج.م)</th>
                        <th className="p-2.5 text-left font-mono">دائن (ج.م)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(inspectingEntry.lines || []).map((l, i) => (
                        <tr key={l.id || i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-600">{l.accountCode}</td>
                          <td className="p-2.5 font-bold text-slate-900">{l.accountName}</td>
                          <td className="p-2.5 text-slate-600">{l.description || '-'}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-800">
                            {Number(l.debit) > 0 ? formatEgyptianCurrency(Number(l.debit)) : '-'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-blue-800">
                            {Number(l.credit) > 0 ? formatEgyptianCurrency(Number(l.credit)) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-left font-bold">
                          المجموع الكلي:
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-emerald-900">
                          {formatEgyptianCurrency(inspectingEntry.totalDebit)}
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-blue-900">
                          {formatEgyptianCurrency(inspectingEntry.totalCredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Audit Trail Log History */}
              {inspectingEntry.auditTrail && inspectingEntry.auditTrail.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    سجل التدقيق والحركات التاريخية (Audit Trail):
                  </h4>
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                    {inspectingEntry.auditTrail.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                        <span className="font-semibold text-slate-900">{rec.details}</span>
                        <span className="font-mono text-slate-400">{rec.timestamp} - {rec.user}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setInspectingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
