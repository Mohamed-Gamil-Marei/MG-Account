import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Play,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Layers,
  Sparkles,
  Printer,
  RefreshCw,
  FileText,
  FileCode,
  Calendar,
  DollarSign,
  Info,
  CheckSquare,
  Square,
  ChevronDown,
  ArrowUpDown,
  FileCheck2,
  Zap,
  Building,
  Activity,
  Award,
  Clock,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  ExcelAuditRow,
  ColumnMappingConfig,
  BenfordAnalysisResult,
  UnsupervisedMlAnomaly,
  AuditClusterSummary,
  ExcelAuditDatasetSummary,
  ExcelAuditSeverity,
  ExcelAnomalyCategory,
  OfficeProfile,
} from '../../types';
import { DatabaseState } from '../../db/localDatabase';
import {
  parseExcelFile,
  autoDetectHeaderAndMapping,
  normalizeRowsFromSheet,
  calculateBenfordDistribution,
  runUnsupervisedMlAudit,
  getBenchmarkDemoDataset,
  generateStandardExcelTemplate,
  exportAuditReportToExcel,
  exportAuditReportToWord,
} from '../../utils/excelAuditEngine';
import { OfficialReportHeader } from '../common/OfficialReportHeader';

interface SmartExcelAuditSentinelViewProps {
  state: DatabaseState;
}

export const SmartExcelAuditSentinelView: React.FC<SmartExcelAuditSentinelViewProps> = ({ state }) => {
  const officeProfile: OfficeProfile = state.officeProfile;

  // File & Sheet State
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetsData, setSheetsData] = useState<Record<string, any[][]>>({});
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);

  // Normalized Audit Data
  const [rows, setRows] = useState<ExcelAuditRow[]>([]);
  const [benfordResult, setBenfordResult] = useState<BenfordAnalysisResult | null>(null);
  const [anomalies, setAnomalies] = useState<UnsupervisedMlAnomaly[]>([]);
  const [clusters, setClusters] = useState<AuditClusterSummary[]>([]);
  const [summary, setSummary] = useState<ExcelAuditDatasetSummary | null>(null);

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState<'ANOMALIES' | 'BENFORD' | 'CLUSTERS' | 'AI_MEMO' | 'RAW_DATA'>('ANOMALIES');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ExcelAuditSeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExcelAnomalyCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with Benchmark Demo Dataset on first mount for instant rich visualization
  useEffect(() => {
    handleLoadBenchmarkDemo();
  }, []);

  /**
   * Loads the authentic Benchmark Demo Dataset with realistic corporate audit cases
   */
  const handleLoadBenchmarkDemo = () => {
    setIsLoading(true);
    try {
      const demo = getBenchmarkDemoDataset();
      setFileName(demo.fileName);
      setSheetNames(['ميزان_حركات_الشركة_2026']);
      setActiveSheet('ميزان_حركات_الشركة_2026');
      setAvailableColumns(['تاريخ', 'رقم المستند', 'الحساب', 'البيان', 'الجهة', 'المبلغ', 'مدين', 'دائن', 'التصنيف']);
      setColumnMapping(demo.mapping);
      setHeaderRowIndex(0);
      setRows(demo.rows);

      // Run Benford & ML
      const benford = calculateBenfordDistribution(demo.rows);
      setBenfordResult(benford);

      const mlResult = runUnsupervisedMlAudit(demo.rows, benford);
      setAnomalies(mlResult.anomalies);
      setClusters(mlResult.clusters);

      const critCount = mlResult.anomalies.filter((a) => a.severity === 'CRITICAL').length;
      const highCount = mlResult.anomalies.filter((a) => a.severity === 'HIGH').length;
      const medCount = mlResult.anomalies.filter((a) => a.severity === 'MEDIUM').length;
      const lowCount = mlResult.anomalies.filter((a) => a.severity === 'LOW').length;

      const datasetSummary: ExcelAuditDatasetSummary = {
        fileName: demo.fileName,
        sheetName: 'ميزان_حركات_الشركة_2026',
        totalRows: demo.rows.length,
        validRowsCount: demo.rows.length,
        skippedRowsCount: 0,
        totalGrossAmount: mlResult.datasetSummary.totalGrossAmount || 0,
        meanAmount: mlResult.datasetSummary.meanAmount || 0,
        medianAmount: mlResult.datasetSummary.medianAmount || 0,
        stdDeviation: mlResult.datasetSummary.stdDeviation || 0,
        minAmount: mlResult.datasetSummary.minAmount || 0,
        maxAmount: mlResult.datasetSummary.maxAmount || 0,
        mappedColumns: [
          { key: 'dateCol', labelAr: 'التاريخ', column: 'تاريخ', confidence: 100 },
          { key: 'amountCol', labelAr: 'المبلغ', column: 'المبلغ', confidence: 100 },
          { key: 'descriptionCol', labelAr: 'البيان', column: 'البيان', confidence: 100 },
          { key: 'docNoCol', labelAr: 'رقم المستند', column: 'رقم المستند', confidence: 98 },
          { key: 'entityCol', labelAr: 'الجهة / الطرف', column: 'الجهة', confidence: 95 },
          { key: 'accountCol', labelAr: 'الحساب', column: 'الحساب', confidence: 98 },
        ],
        anomaliesCount: {
          total: mlResult.anomalies.length,
          critical: critCount,
          high: highCount,
          medium: medCount,
          low: lowCount,
        },
        benfordResult: benford,
        clusters: mlResult.clusters,
        overallRiskScore: mlResult.datasetSummary.overallRiskScore || 65,
        aiExecutiveMemo: `مذكرة تقييم مخاطر التدقيق وفحص المعاملات المالية:
1. بيئة الرقابة والامتثال: أظهر الفحص الإلكتروني الشامل وجود مؤشرات خطر جوهرية تستدعي التوسع في إجراءات الفحص التحليلي والمستندي (معيار ESA 240). تبين وجود عمليتين متتاليتين بمبالغ (49,850 ج.م و 49,600 ج.م) بفارق زمني 24 ساعة، وهو ما يمثل شبهة قوية لتجزئة المدفوعات للالتفاف حول السقف القانوني للإلزام بالدفع غير النقدي (قانون 18 لسنة 2019) وتفادي موافقة الإدارة العليا.
2. فحص قانون بنفورد: أظهر التوزيع التكراري للأرقام الأولى تشوهاً إحصائياً واضحاً في الرقم (7) حيث سجل 21.4% مقارنة بالنسبة النظرية الطبيعية (5.8%)، بانحراف معياري ملموس يعكس تدخلاً تقديرياً مصطنعاً في إدخال مبالغ دورية لبعض الموردين.
3. تكرار السداد المزدوج: تم رصد فاتورة مسددة ومسجلة مرتين برقم (INV-2026-8902) لذات المورد (شركة السويدي للكابلات) بقيمة 64,500 ج.م، مما يستلزم مراجعة فورية لكشف الحساب البنكي للتأكد من عدم صرف الشيك مرتين.
4. التوصية المهنية: عدم اعتماد ميزان الحركات في وضعه الحالي وتكليف فريق الفحص الميداني باستيفاء أصول الفواتير الضريبية وتوقيعات الاستلام المخزني للبنود الحرجة قبل إبداء الرأي النهائي في القوائم المالية.`,
        aiSuggestedAuditProcedures: [
          'إجراء مطابقة بنكية ومصادقة خارجية مع الموردين الذين تجاوزت معاملاتهم حد العزل الشاذ.',
          'التحقق من سندات الصرف المجزأة تحت 50,000 ج.م ومطابقتها مع كشوف حساب البنك ومذكرات التوريد.',
          'فحص قيود العطلات الأسبوعية ومطابقة توقيت الإدخال بسجل المستخدمين (Audit Log).',
          'استبعاد القيود المكررة بعد التحقق من حركة الخزينة أو دفتر الشيكات الصادرة.',
        ],
        auditDate: new Date().toISOString().split('T')[0],
        auditorName: officeProfile.auditorName || 'محمد جميل مرعي',
        firmName: officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات',
      };

      setSummary(datasetSummary);
    } catch (err: any) {
      console.error('Benchmark load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles user file upload (Drag & Drop or file dialog)
   */
  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      setFileName(file.name);
      setSheetNames(parsed.sheetNames);
      setSheetsData(parsed.sheetsData);
      setActiveSheet(parsed.defaultSheet);

      // Process default sheet
      processSheetData(parsed.sheetsData[parsed.defaultSheet], parsed.defaultSheet, file.name);
    } catch (err: any) {
      console.error('File parse error:', err);
      alert(err.message || 'حدث خطأ أثناء معالجة وقراءة ملف الإكسيل.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Processes sheet data, auto-detects header, normalizes rows, runs Benford & ML
   */
  const processSheetData = (rawSheetData: any[][], sheetTitle: string, currentFileName: string) => {
    if (!rawSheetData || rawSheetData.length === 0) {
      alert('الصفحة المحددة لا تحتوي على أي بيانات.');
      return;
    }

    const detected = autoDetectHeaderAndMapping(rawSheetData);
    setHeaderRowIndex(detected.headerRowIndex);
    setAvailableColumns(detected.availableColumns);
    setColumnMapping(detected.mapping);

    // Normalize rows
    const normalized = normalizeRowsFromSheet(rawSheetData, detected.headerRowIndex, detected.mapping);
    setRows(normalized);

    if (normalized.length === 0) {
      alert('لم يتم العثور على أسطر بيانات صالحة بعد استبعاد الترويسة والأسطر الفارغة.');
      return;
    }

    // Benford calculation
    const benford = calculateBenfordDistribution(normalized);
    setBenfordResult(benford);

    // Unsupervised ML Anomaly Detection
    const ml = runUnsupervisedMlAudit(normalized, benford);
    setAnomalies(ml.anomalies);
    setClusters(ml.clusters);

    const critCount = ml.anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = ml.anomalies.filter((a) => a.severity === 'HIGH').length;
    const medCount = ml.anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const lowCount = ml.anomalies.filter((a) => a.severity === 'LOW').length;

    const mappedColsSummary: { key: string; labelAr: string; column: string; confidence: number }[] = [];
    const labelsMap: Record<string, string> = {
      dateCol: 'التاريخ',
      amountCol: 'المبلغ',
      debitCol: 'مدين',
      creditCol: 'دائن',
      descriptionCol: 'البيان',
      docNoCol: 'رقم المستند',
      accountCol: 'الحساب',
      entityCol: 'الجهة',
      categoryCol: 'التصنيف',
    };

    (Object.keys(detected.mapping) as (keyof ColumnMappingConfig)[]).forEach((k) => {
      const item = detected.mapping[k];
      if (item?.detectedColumn) {
        mappedColsSummary.push({
          key: k,
          labelAr: labelsMap[k] || k,
          column: item.detectedColumn,
          confidence: item.confidence,
        });
      }
    });

    const datasetSummary: ExcelAuditDatasetSummary = {
      fileName: currentFileName,
      sheetName: sheetTitle,
      totalRows: normalized.length,
      validRowsCount: normalized.length,
      skippedRowsCount: rawSheetData.length - (detected.headerRowIndex + 1 + normalized.length),
      totalGrossAmount: ml.datasetSummary.totalGrossAmount || 0,
      meanAmount: ml.datasetSummary.meanAmount || 0,
      medianAmount: ml.datasetSummary.medianAmount || 0,
      stdDeviation: ml.datasetSummary.stdDeviation || 0,
      minAmount: ml.datasetSummary.minAmount || 0,
      maxAmount: ml.datasetSummary.maxAmount || 0,
      mappedColumns: mappedColsSummary,
      anomaliesCount: {
        total: ml.anomalies.length,
        critical: critCount,
        high: highCount,
        medium: medCount,
        low: lowCount,
      },
      benfordResult: benford,
      clusters: ml.clusters,
      overallRiskScore: ml.datasetSummary.overallRiskScore || 50,
      auditDate: new Date().toISOString().split('T')[0],
      auditorName: officeProfile.auditorName || 'محمد جميل مرعي',
      firmName: officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات',
    };

    setSummary(datasetSummary);
  };

  /**
   * Switches to another sheet inside the uploaded workbook
   */
  const handleSelectSheet = (sheetName: string) => {
    setActiveSheet(sheetName);
    const data = sheetsData[sheetName];
    if (data) {
      processSheetData(data, sheetName, fileName);
    }
  };

  /**
   * Updates a single column mapping manually if the auditor overrides
   */
  const handleUpdateMapping = (fieldKey: keyof ColumnMappingConfig, newColName: string) => {
    if (!columnMapping) return;
    const updated = {
      ...columnMapping,
      [fieldKey]: {
        detectedColumn: newColName || null,
        confidence: newColName ? 100 : 0,
        isManualOverride: true,
      },
    };
    setColumnMapping(updated);

    // Re-normalize rows with updated mapping
    const activeData = sheetsData[activeSheet];
    if (activeData) {
      const normalized = normalizeRowsFromSheet(activeData, headerRowIndex, updated);
      setRows(normalized);
      const benford = calculateBenfordDistribution(normalized);
      setBenfordResult(benford);
      const ml = runUnsupervisedMlAudit(normalized, benford);
      setAnomalies(ml.anomalies);
      setClusters(ml.clusters);
    }
  };

  /**
   * Downloads the standardized Excel template (.xlsx)
   */
  const handleDownloadTemplate = () => {
    try {
      const blob = generateStandardExcelTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قالب_فحص_البيانات_المحاسبية_المعياري_2026.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Template download error:', err);
      alert('تعذر تحميل القالب، يرجى المحاولة مرة أخرى.');
    }
  };

  /**
   * Exports full audit results to multi-sheet Excel (.xlsx)
   */
  const handleExportExcel = () => {
    if (!summary || !benfordResult) return;
    try {
      const blob = exportAuditReportToExcel(summary, anomalies, benfordResult, rows);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير_المراجعة_الجنائية_${summary.fileName.replace(/\.[^/.]+$/, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Excel export error:', err);
      alert('تعذر تصدير تقرير الإكسيل.');
    }
  };

  /**
   * Exports full audit results to Microsoft Word (.doc)
   */
  const handleExportWord = () => {
    if (!summary || !benfordResult) return;
    try {
      const blob = exportAuditReportToWord(summary, anomalies, benfordResult);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `مذكرة_المراجعة_الرقابية_${summary.fileName.replace(/\.[^/.]+$/, '')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Word export error:', err);
      alert('تعذر تصدير تقرير الوورد.');
    }
  };

  /**
   * Calls Gemini API on backend to synthesize an advanced Senior Partner Auditor memo
   */
  const handleGenerateAiMemo = async () => {
    if (!summary || !benfordResult) return;
    setIsAiLoading(true);
    try {
      const anomaliesSample = anomalies.slice(0, 15).map((a) => ({
        rowIndex: a.rowIndex,
        amount: a.row.amount,
        entity: a.row.entity,
        account: a.row.account,
        docNo: a.row.docNo,
        title: a.title,
        severity: a.severity,
        score: a.score,
        reason: a.mathematicalReason,
      }));

      const res = await fetch('/api/ai/audit-excel-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: {
            fileName: summary.fileName,
            totalRows: summary.totalRows,
            totalGrossAmount: summary.totalGrossAmount,
            benfordConformity: benfordResult.conformityLevel,
            benfordMad: benfordResult.meanAbsoluteDeviation,
            overallRiskScore: summary.overallRiskScore,
            criticalCount: summary.anomaliesCount.critical,
            highCount: summary.anomaliesCount.high,
          },
          anomaliesSample,
          benfordStats: benfordResult.digitStats,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const memoText = data.data.executiveMemo || '';
        const procedures = data.data.substantiveProcedures || [];
        setSummary((prev) => (prev ? { ...prev, aiExecutiveMemo: memoText, aiSuggestedAuditProcedures: procedures } : prev));
        setActiveTab('AI_MEMO');
      } else {
        // Use fallback professional memo
        const fallbackMemo = `مذكرة تقييم المراجعة الإلكترونية والرقابة الداخلية (EAS 240):
1. مخاطر الرقابة: أظهر الفحص الآلي لعينة البيانات وجود (${summary.anomaliesCount.critical}) عمليات حرجة و (${summary.anomaliesCount.high}) عمليات مرتفعة الخطورة تمثل انحرافاً عن الضوابط المالية المعتادة.
2. تشوهات بنفورد: سجل التوزيع انحرافاً في الأرقام البادئة، مما يستدعي طلب دفاتر اليومية العامة ومطابقتها مع كشوف الحسابات البنكية.
3. توصية المراجع: إلزام فريق المراجعة باستيفاء أصول الفواتير الإلكترونية وعقود التوريد قبل إبداء الرأي النهائي.`;
        setSummary((prev) => (prev ? { ...prev, aiExecutiveMemo: fallbackMemo } : prev));
      }
    } catch (err: any) {
      console.error('AI Memo error:', err);
      alert('تم اعتماد المذكرة الرقابية المدمجة.');
    } finally {
      setIsAiLoading(false);
    }
  };

  /**
   * Toggles manual verification status on an individual anomaly
   */
  const handleToggleVerifyAnomaly = (anomalyId: string) => {
    setAnomalies((prev) =>
      prev.map((a) => {
        if (a.id === anomalyId) {
          const updated = !a.isManuallyVerified;
          return {
            ...a,
            isManuallyVerified: updated,
            verificationVerdict: updated ? 'JUSTIFIED_LEGITIMATE' : 'UNCHECKED',
          };
        }
        return a;
      })
    );
  };

  /**
   * Updates auditor notes on a specific anomaly
   */
  const handleUpdateAuditorNotes = (anomalyId: string, notes: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === anomalyId ? { ...a, auditorNotes: notes } : a))
    );
  };

  /**
   * Filtered anomalies according to severity, category, and search query
   */
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = (searchQuery || '').toLowerCase().trim();
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchParty = (a.row?.entity || '').toLowerCase().includes(q);
        const matchAccount = (a.row?.account || '').toLowerCase().includes(q);
        const matchDoc = (a.row?.docNo || '').toLowerCase().includes(q);
        const matchDesc = (a.row?.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchParty && !matchAccount && !matchDoc && !matchDesc) return false;
      }
      return true;
    });
  }, [anomalies, severityFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-right min-w-0" dir="rtl">
      {/* 1. Top Executive Banner & System Identity */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>التعلم الآلي غير الخاضع للإشراف (Unsupervised ML)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
              قانون بنفورد (Benford's Law)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
              الذكاء القابل للتفسير (XAI)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold">
              معايير المراجعة المصرية (ESA 240)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400 shrink-0" />
            <span>مختبر المراجعة والتدقيق الجنائي الذكي لملفات الإكسيل</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            محرك مراجعة إلكتروني متكامل يقرأ أي ملف إكسيل أو CSV بأي ترتيب للترويسة، ويفحص البيانات لاكتشاف التلاعب والعمليات المكررة وتجزئة المدفوعات والكسور الدائرية والشواذ الإحصائية مع استخراج تقارير Word و Excel و PDF معتمدة.
          </p>
        </div>

        {/* Action Controls Suite */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            id="btn-excel-upload"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="رفع ملف إكسيل أو CSV من جهازك"
          >
            <Upload className="w-4 h-4" />
            <span>رفع ملف إكسيل / CSV</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessFile(file);
            }}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            onClick={handleDownloadTemplate}
            id="btn-excel-template"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="تحميل قالب إكسيل قياسي جاهز للإدخال والملء"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تحميل القالب الجاهز</span>
          </button>

          <button
            onClick={handleLoadBenchmarkDemo}
            id="btn-excel-demo"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="تحميل بيانات تجريبية مع شواذ إحصائية لاختبار النظام"
          >
            <Play className="w-3.5 h-3.5" />
            <span>اختبار تجريبي افتراضي</span>
          </button>
        </div>
      </div>

      {/* 2. File Upload Dropzone (Compact & Drag-Over Aware) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleProcessFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all text-center cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-300 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
        }`}
      >
        <div className="flex items-center gap-3 text-right">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              اسحب وأفلت أي ملف إكسيل (.xlsx, .xls) أو CSV هنا، أو انقر للاختيار
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يدعم النظام الملفات بأي ترتيب للأعمدة، وأي أسماء ترويسة، والأرقام باللغة الإنجليزية أو العربية الشرقية.
            </p>
          </div>
        </div>

        {/* Current Active File Snippet */}
        {summary && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs shrink-0 text-right">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              XLS
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                {summary.fileName}
              </div>
              <div className="text-[10px] text-slate-500">
                {summary.validRowsCount} حركة • {summary.totalGrossAmount.toLocaleString('ar-EG')} ج.م
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Multi-Sheet Selector & Smart Column Mapping Bar */}
      {summary && columnMapping && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Sheet Tabs */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>صفحة العمل المفحوصة:</span>
              </span>
              {sheetNames.map((sName) => (
                <button
                  key={sName}
                  onClick={() => handleSelectSheet(sName)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    activeSheet === sName
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sName}
                </button>
              ))}
            </div>

            {/* Column Mapping Review Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsMappingModalOpen(!isMappingModalOpen)}
                className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                <span>تعديل مطابقة الأعمدة ({summary.mappedColumns.length} عمود)</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isMappingModalOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Column Mapping Overrides Drawer */}
          {isMappingModalOpen && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold">مطابقة وتعيين الأعمدة المكتشفة تلقائياً (يمكنك التغيير يدوياً):</span>
                <span className="text-[11px] text-indigo-500 font-mono">سطر الترويسة المعتمد: السطر {headerRowIndex + 1}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { key: 'dateCol', label: 'تاريخ العملية' },
                  { key: 'amountCol', label: 'صافي المبلغ' },
                  { key: 'descriptionCol', label: 'البيان والشرح' },
                  { key: 'docNoCol', label: 'رقم المستند / الفاتورة' },
                  { key: 'accountCol', label: 'الحساب المحاسبي' },
                  { key: 'entityCol', label: 'العميل / المورد / الجهة' },
                  { key: 'debitCol', label: 'مدين (Debit)' },
                  { key: 'creditCol', label: 'دائن (Credit)' },
                ].map(({ key, label }) => {
                  const currentVal = (columnMapping as any)?.[key]?.detectedColumn || '';
                  const conf = (columnMapping as any)?.[key]?.confidence || 0;
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{label}</span>
                        {conf > 0 && (
                          <span className={`text-[10px] font-mono ${conf >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {conf}%
                          </span>
                        )}
                      </label>
                      <select
                        value={currentVal}
                        onChange={(e) => handleUpdateMapping(key as any, e.target.value)}
                        className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- غير محدد --</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Top KPI Cards: Risk, Benford, Anomalies, Population */}
      {summary && benfordResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* A. Overall Audit Risk Gauge */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مؤشر الخطر الرقابي الإجمالي</span>
              <div className={`p-2 rounded-xl ${
                summary.overallRiskScore >= 70
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : summary.overallRiskScore >= 40
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {summary.overallRiskScore}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 100</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md mr-auto ${
                summary.overallRiskScore >= 70
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : summary.overallRiskScore >= 40
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {summary.overallRiskScore >= 70 ? 'مرتفع وحرج' : summary.overallRiskScore >= 40 ? 'متوسط ومقيد' : 'منخفض ومستقر'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.overallRiskScore >= 70
                    ? 'bg-rose-500'
                    : summary.overallRiskScore >= 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${summary.overallRiskScore}%` }}
              />
            </div>
          </div>

          {/* B. Benford's Law Conformity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مطابقة قانون بنفورد (MAD)</span>
              <div className={`p-2 rounded-xl ${
                benfordResult.conformityLevel === 'NON_CONFORMING'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {benfordResult.conformityLevel === 'CLOSE'
                  ? 'مطابقة وثيقة'
                  : benfordResult.conformityLevel === 'ACCEPTABLE'
                  ? 'مطابقة مقبولة'
                  : benfordResult.conformityLevel === 'MARGINAL'
                  ? 'انحراف حدي'
                  : 'انحراف وتشويه غير طبيعي'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>معدل الانحراف (MAD): <strong className="font-mono text-slate-700 dark:text-slate-300">{benfordResult.meanAbsoluteDeviation}</strong></span>
              {benfordResult.distortedDigits.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  تشوه رقم: [{benfordResult.distortedDigits.join(', ')}]
                </span>
              )}
            </div>
          </div>

          {/* C. Flagged Anomalies Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الشواذ والملاحظات المرصودة</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {summary.anomaliesCount.total}
              </span>
              <span className="text-xs text-slate-400 font-bold">عملية للمراجعة اليدوية</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold">
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {summary.anomaliesCount.critical} حرج
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {summary.anomaliesCount.high} عالي
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {summary.anomaliesCount.medium} متوسط
              </span>
            </div>
          </div>

          {/* D. Population Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المجتمع المالي المفحوص</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {summary.totalGrossAmount.toLocaleString('ar-EG')} ج.م
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{summary.validRowsCount} حركة محاسبية</span>
              <span>المتوسط: {summary.meanAmount.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main View Tabs & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: 'ANOMALIES', label: 'سجل الملاحظات والشواذ', icon: ShieldAlert, badge: anomalies.length },
            { id: 'BENFORD', label: 'تحليل قانون بنفورد', icon: Activity, badge: benfordResult?.distortedDigits.length || 0 },
            { id: 'CLUSTERS', label: 'الشرائح والتوزيع الإحصائي', icon: Layers, badge: null },
            { id: 'AI_MEMO', label: 'مذكرة الذكاء الاصطناعي (XAI)', icon: Sparkles, badge: 'AI' },
            { id: 'RAW_DATA', label: 'كامل البيانات المستخرجة', icon: FileSpreadsheet, badge: rows.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Export Suite Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={handleExportWord}
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="تصدير مذكرة المراجعة الرسمية بصيغة Word (.doc)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>تقرير Word</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="تصدير مصنف إكسيل شامل لجميع النتائج (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="طباعة تقرير المراجعة المعتمد أو حفظه كـ PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* 6. Active Tab Content Rendering */}

      {/* ========================================================================= */}
      {/* TAB 1: ANOMALIES & SUBSTANTIVE AUDIT CHECKLIST                            */}
      {/* ========================================================================= */}
      {activeTab === 'ANOMALIES' && (
        <div className="space-y-4">
          {/* Filters & Search Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالطرف، الحساب، رقم المستند، نوع الشذوذ..."
                className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            {/* Severity Filter Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-500 font-bold ml-1">الخطورة:</span>
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sev === 'ALL' ? 'الكل' : sev === 'CRITICAL' ? 'حرج' : sev === 'HIGH' ? 'مرتفع' : sev === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                </button>
              ))}
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">جميع أصناف الشواذ ({anomalies.length})</option>
                <option value="STRUCTURING_THRESHOLD">تجزئة وتفادي حدود المدفوعات</option>
                <option value="EXACT_DUPLICATE">تكرار سداد متطابق</option>
                <option value="FUZZY_DUPLICATE">تكرار مشبوه في ذات اليوم</option>
                <option value="ISOLATION_OUTLIER">شواذ العزل الإحصائي (Extreme LOF)</option>
                <option value="BENFORD_DEVIATION">مخالفة قانون بنفورد</option>
                <option value="WEEKEND_OFF_HOURS">ترحيل في عطلات أسبوعية</option>
                <option value="ROUND_NUMBER">أرقام دائرية بدون ضرائب</option>
                <option value="RELATIVE_SIZE_SPIKE">طفرة غير متناسبة (RSF)</option>
              </select>
            </div>
          </div>

          {/* Anomalies List */}
          {filteredAnomalies.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                لا توجد شواذ أو ملاحظات مطابقة للتصفية المحددة
              </h3>
              <p className="text-xs text-slate-400">
                جرب تغيير خيارات التصفية أو البحث لعرض باقي الملاحظات.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map((anom, idx) => (
                <div
                  key={anom.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all ${
                    anom.isManuallyVerified
                      ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : anom.severity === 'CRITICAL'
                      ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                      : anom.severity === 'HIGH'
                      ? 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        anom.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : anom.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {anom.severity === 'CRITICAL' ? 'خطر حرج جداً' : anom.severity === 'HIGH' ? 'خطر مرتفع' : 'خطر متوسط'}
                      </span>

                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                        سطر الملف: {anom.rowIndex}
                      </span>

                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {anom.title}
                      </h4>
                    </div>

                    {/* Amount & Date Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                          {anom.row.amount.toLocaleString('ar-EG')} ج.م
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {anom.row.date} • {anom.row.docNo || 'بدون مستند'}
                        </div>
                      </div>

                      {/* Manual Verification Checkbox Button */}
                      <button
                        onClick={() => handleToggleVerifyAnomaly(anom.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                          anom.isManuallyVerified
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                        title="تأكيد قيام المراجع بالتحقق المستندي اليدوي"
                      >
                        {anom.isManuallyVerified ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-white" />
                            <span>تم الفحص اليدوي</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 text-slate-400" />
                            <span>تعليم كمفحوص</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-3 text-xs bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">الطرف / الجهة:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{anom.row.entity || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">الحساب المحاسبي:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{anom.row.account || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">البيان والشرح بالأصل:</span>
                      <span className="text-slate-700 dark:text-slate-300">{anom.row.description || '-'}</span>
                    </div>
                  </div>

                  {/* Explainable AI & Audit Directives */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-indigo-900 dark:text-indigo-300 block font-bold">التفسير الرياضي والإحصائي (XAI Reason):</strong>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed mt-0.5">
                          {anom.mathematicalReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/50">
                      <Building className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-900 dark:text-amber-300 block font-bold">المرجعية المهنية والرقابية (ESA 240 & Law):</strong>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed mt-0.5">
                          {anom.auditingInterpretation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-900 dark:text-emerald-300 block font-bold">إجراء الفحص المستندي الإلزامي المطلوب من المراجع:</strong>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed mt-0.5 font-semibold">
                          {anom.mandatoryManualAuditStep}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auditor Verification Notes Input */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">ملاحظات وقرار المراجع:</span>
                    <input
                      type="text"
                      value={anom.auditorNotes || ''}
                      onChange={(e) => handleUpdateAuditorNotes(anom.id, e.target.value)}
                      placeholder="أدخل نتيجة الفحص اليدوي (مثال: تم فحص أصل الفاتورة الإلكترونية والتأكد من مطابقة السداد)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BENFORD'S LAW INTERACTIVE ANALYSIS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'BENFORD' && benfordResult && (
        <div className="space-y-6">
          {/* Benford Overview Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <span>نتائج اختبار قانون بنفورد للأرقام الأولى (Benford's Law First-Digit Analysis)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  يقيس هذا الاختبار التردد الطبيعي لظهور الأرقام البادئة من (1 إلى 9) مقارنة بالنسبة اللوغاريتمية المعيارية، لرصد أي تلاعب أو فبركة اصطناعية للأرقام المحاسبية.
                </p>
              </div>

              <div className="text-left shrink-0">
                <span className="text-xs font-bold text-slate-400 block">إجمالي العينة المفحوصة (&ge; 10 ج.م):</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {benfordResult.totalEvaluatedAmounts} حركة
                </span>
              </div>
            </div>

            {/* Benford Graphic Visual Comparison Bars */}
            <div className="grid grid-cols-9 gap-2 pt-4 pb-2 border-t border-slate-100 dark:border-slate-800">
              {benfordResult.digitStats.map((d) => (
                <div key={d.digit} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{d.actualPercentage}%</span>
                  
                  {/* Bar Visualizer */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end justify-center p-1 relative group">
                    {/* Theoretical Line marker */}
                    <div
                      className="absolute w-full border-t-2 border-indigo-400/80 z-10"
                      style={{ bottom: `${Math.min(100, (d.expectedPercentage / 35) * 100)}%` }}
                      title={`النسبة النظرية: ${d.expectedPercentage}%`}
                    />

                    {/* Actual Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${
                        d.isAnomalous
                          ? 'bg-rose-500 shadow-md shadow-rose-500/20'
                          : 'bg-indigo-600 dark:bg-indigo-500'
                      }`}
                      style={{ height: `${Math.min(100, (d.actualPercentage / 35) * 100)}%` }}
                    />
                  </div>

                  {/* Digit Label */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                    d.isAnomalous
                      ? 'bg-rose-500 text-white animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {d.digit}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">نظري: {d.expectedPercentage}%</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 text-xs pt-2 text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600"></span>
                <span>النسبة الفعلية المحققة بالملف</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-400"></span>
                <span>النسبة النظرية المستهدفة لقانون بنفورد</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500"></span>
                <span>انحراف شاذ يستوجب الفحص</span>
              </span>
            </div>
          </div>

          {/* Detailed Benford Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-100">
              جدول الحسابات الإحصائية التفصيلية لقانون بنفورد (Goodness of Fit & Z-Score)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">الرقم البادئ (Digit)</th>
                    <th className="p-3">التكرار الفعلي بالملف</th>
                    <th className="p-3">النسبة الفعلية (%)</th>
                    <th className="p-3">النسبة المعيارية بنفورد (%)</th>
                    <th className="p-3">الانحراف المطلق (%)</th>
                    <th className="p-3">معامل Z-Score</th>
                    <th className="p-3 text-center">التقييم الرقابي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {benfordResult.digitStats.map((d) => (
                    <tr
                      key={d.digit}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                        d.isAnomalous ? 'bg-rose-50/30 dark:bg-rose-950/20 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{d.digit}</td>
                      <td className="p-3 font-mono">{d.actualCount}</td>
                      <td className="p-3 font-mono">{d.actualPercentage}%</td>
                      <td className="p-3 font-mono text-slate-500">{d.expectedPercentage}%</td>
                      <td className="p-3 font-mono">
                        <span className={Math.abs(d.deviation) > 5 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {d.deviation > 0 ? `+${d.deviation}` : d.deviation}%
                        </span>
                      </td>
                      <td className="p-3 font-mono">{d.zScore}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          d.isAnomalous
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {d.isAnomalous ? 'انحراف يستوجب التدقيق' : 'طبيعي ومطابق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUANTILE CLUSTERS & STRATIFICATION                                 */}
      {/* ========================================================================= */}
      {activeTab === 'CLUSTERS' && summary && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>تقسيم شرائح المجتمع المحاسبي (Statistical Population Stratification)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                وفقاً لمعيار المراجعة المصري ESA 530، يتم تصنيف المجتمع المالي إلى طبقات وشرائح متجانسة لتركيز الفحص الميداني على العمليات ذات الأهمية النسبية والشواذ الإحصائية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {clusters.map((c) => (
                <div
                  key={c.clusterName}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {c.clusterLabelAr}
                    </span>
                    {c.outliersCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                        {c.outliersCount} شواذ
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {c.totalSum.toLocaleString('ar-EG')} ج.م
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>العدد: {c.count} حركة</span>
                      <span>المتوسط: {c.meanAmount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between">
                    <span>المدى: {c.minAmount.toLocaleString('ar-EG')} ج.م</span>
                    <span>إلى {c.maxAmount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPLAINABLE AI AUDIT MEMO (GEMINI ENGINE)                          */}
      {/* ========================================================================= */}
      {activeTab === 'AI_MEMO' && summary && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span>مذكرة مراقب الحسابات المدعومة بالذكاء الاصطناعي القابل للتفسير (XAI Memo)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  صياغة مهنية متوافقة مع معايير المراجعة المصرية (ESA 240 / 315 / 500) وقانون تنظيم المدفوعات غير النقدية رقم 18 لسنة 2019.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleGenerateAiMemo}
                  disabled={isAiLoading}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>{isAiLoading ? 'جارٍ صياغة المذكرة بالذكاء...' : 'تحديث المذكرة بالذكاء الاصطناعي'}</span>
                </button>

                <button
                  onClick={() => {
                    if (summary.aiExecutiveMemo) {
                      navigator.clipboard.writeText(summary.aiExecutiveMemo);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? 'تم النسخ!' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>

            {/* Memo Content Box */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-serif shadow-inner">
              {summary.aiExecutiveMemo || 'انقر على زر "تحديث المذكرة بالذكاء الاصطناعي" لصياغة تقييم تفصيلي للملف.'}
            </div>

            {/* Substantive Procedures Checklist */}
            {summary.aiSuggestedAuditProcedures && summary.aiSuggestedAuditProcedures.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>إجراءات الفحص والتحقق اليدوي الموصى بها قبل اعتماد القوائم المالية:</span>
                </h4>
                <div className="space-y-2">
                  {summary.aiSuggestedAuditProcedures.map((proc, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {pIdx + 1}
                      </span>
                      <span className="font-semibold leading-relaxed">{proc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RAW EXTRACTED & NORMALIZED DATA GRID                                */}
      {/* ========================================================================= */}
      {activeTab === 'RAW_DATA' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs space-y-2">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              جميع الحركات المستخرجة والمطابقة من الملف ({rows.length} حركة)
            </span>
            <span className="text-[11px] text-slate-500">
              الأسطر الملونة بالأحمر تشير إلى عمليات رصدها النظام كشواذ إحصائية تستوجب الفحص
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">السطر</th>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">رقم المستند</th>
                  <th className="p-2.5">اسم الطرف / الجهة</th>
                  <th className="p-2.5">الحساب المحاسبي</th>
                  <th className="p-2.5">البيان والشرح</th>
                  <th className="p-2.5">المبلغ (ج.م)</th>
                  <th className="p-2.5 text-center">حالة الفحص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                      r.hasWarnings ? 'bg-rose-50/40 dark:bg-rose-950/20 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono text-slate-500">{r.rowIndex}</td>
                    <td className="p-2.5 font-mono">{r.date}</td>
                    <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{r.docNo}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.entity}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{r.account}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">{r.description}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                      {r.amount.toLocaleString('ar-EG')}
                    </td>
                    <td className="p-2.5 text-center">
                      {r.hasWarnings ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                          مرصود به شذوذ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          مطابق مبدئياً
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Official Printable Modal (PDF / A4 Certified View) */}
      {isPrintModalOpen && summary && benfordResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:p-0">
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm">معاينة تقرير المراجعة والتدقيق الجنائي للطباعة (A4)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (Ctrl + P)</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Official Report Header */}
            <OfficialReportHeader
              documentTitle="تقرير المراجعة والتدقيق الجنائي الذكي لملفات الإكسيل والشركات"
              documentSubtitle="تحليل متقدم بالتعلم الآلي غير الخاضع للإشراف وقانون بنفورد (ESA 240 / Law 18-2019)"
              referenceNumber={`AUD-EXCEL-${new Date().getFullYear()}-${summary.totalRows}`}
              date={summary.auditDate}
            />

            {/* Meta Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div>الملف: <strong>{summary.fileName}</strong></div>
              <div>الحركات: <strong>{summary.validRowsCount}</strong></div>
              <div>القيمة: <strong>{summary.totalGrossAmount.toLocaleString('ar-EG')} ج.م</strong></div>
              <div>الخطر: <strong>{summary.overallRiskScore} / 100</strong></div>
            </div>

            {/* AI Executive Memo */}
            {summary.aiExecutiveMemo && (
              <div className="space-y-2 border-t pt-4">
                <h4 className="font-bold text-xs text-slate-800 border-r-2 border-indigo-600 pr-2">
                  رأي ومذكرة المراجع العام (XAI Memo):
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {summary.aiExecutiveMemo}
                </div>
              </div>
            )}

            {/* Benford Summary */}
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-bold text-xs text-slate-800 border-r-2 border-indigo-600 pr-2">
                نتائج فحص قانون بنفورد (Benford First-Digit):
              </h4>
              <table className="w-full text-xs text-right border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-center">الرقم</th>
                    <th className="border border-slate-300 p-1.5 text-center">الفعلي</th>
                    <th className="border border-slate-300 p-1.5 text-center">النسبة الفعلية</th>
                    <th className="border border-slate-300 p-1.5 text-center">النسبة النظرية</th>
                    <th className="border border-slate-300 p-1.5 text-center">الانحراف</th>
                    <th className="border border-slate-300 p-1.5 text-center">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {benfordResult.digitStats.map((d) => (
                    <tr key={d.digit}>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{d.digit}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{d.actualCount}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{d.actualPercentage}%</td>
                      <td className="border border-slate-300 p-1.5 text-center">{d.expectedPercentage}%</td>
                      <td className="border border-slate-300 p-1.5 text-center">{d.deviation > 0 ? `+${d.deviation}` : d.deviation}%</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        {d.isAnomalous ? 'انحراف شاذ' : 'طبيعي'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Critical Anomalies Table */}
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-bold text-xs text-slate-800 border-r-2 border-indigo-600 pr-2">
                سجل العمليات الشاذة والملاحظات التي تستوجب المراجعة اليدوية:
              </h4>
              <table className="w-full text-xs text-right border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-center">م</th>
                    <th className="border border-slate-300 p-1.5 text-center">السطر</th>
                    <th className="border border-slate-300 p-1.5">التاريخ</th>
                    <th className="border border-slate-300 p-1.5">الطرف / الحساب</th>
                    <th className="border border-slate-300 p-1.5 text-center">المبلغ</th>
                    <th className="border border-slate-300 p-1.5 text-center">الخطورة</th>
                    <th className="border border-slate-300 p-1.5">نوع الشذوذ وإجراء الفحص اليدوي</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.slice(0, 30).map((a, i) => (
                    <tr key={a.id}>
                      <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{a.rowIndex}</td>
                      <td className="border border-slate-300 p-1.5">{a.row.date}</td>
                      <td className="border border-slate-300 p-1.5 font-bold">{a.row.entity}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                        {a.row.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        {a.severity === 'CRITICAL' ? 'حرج' : a.severity === 'HIGH' ? 'مرتفع' : 'متوسط'}
                      </td>
                      <td className="border border-slate-300 p-1.5">
                        <strong>{a.title}</strong>
                        <div className="text-[10px] text-slate-600 mt-0.5">{a.mandatoryManualAuditStep}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signatures */}
            <div className="pt-8 flex items-center justify-between text-xs text-center border-t">
              <div className="w-1/3">
                <p className="font-bold">المراجع المنفذ / مدقق البيانات</p>
                <div className="h-14"></div>
                <p>.......................................</p>
              </div>
              <div className="w-1/3">
                <p className="font-bold">مراقب الحسابات / الشريك المسؤول</p>
                <p className="font-bold text-slate-800 mt-1">{officeProfile.auditorName || 'أ/ محمد جميل مرعي'}</p>
                <div className="h-10"></div>
                <p>[خاتم وتوقيع المكتب المعتمد]</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
