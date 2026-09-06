import React, { useState } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { JournalAuditScannerView } from './audit/JournalAuditScannerView';
import { AuditSamplingTool } from './audit/AuditSamplingTool';
import { AuditConfirmationsGenerator } from './audit/AuditConfirmationsGenerator';
import { InternalControlRiskMatrix } from './audit/InternalControlRiskMatrix';
import {
  FileCheck2,
  Scale,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Building,
  UserCheck,
  ShieldCheck,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface AuditWorkingPapersProps {
  state: DatabaseState;
}

interface AuditTestItem {
  id: string;
  category: string;
  procedureText: string;
  sampleSize: string;
  result: 'SATISFACTORY' | 'DEFICIENCY' | 'NOT_APPLICABLE' | 'PENDING';
  auditorInitials: string;
  workPaperRef: string;
  notes: string;
}

export const AuditWorkingPapersView: React.FC<AuditWorkingPapersProps> = ({ state }) => {
  const [selectedClient, setSelectedClient] = useState<string>(state.clients[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [activeSection, setActiveSection] = useState<string>('MATERIALITY');

  // Materiality benchmark inputs (ESA 320)
  const [benchmarkBase, setBenchmarkBase] = useState<'REVENUE' | 'ASSETS' | 'PROFIT' | 'EQUITY'>('REVENUE');
  const [baseAmount, setBaseAmount] = useState<number>(14500000);
  const [materialityPercentage, setMaterialityPercentage] = useState<number>(1.0); // 1% of revenue
  const [performanceMaterialityRate, setPerformanceMaterialityRate] = useState<number>(70); // 70% of overall
  const [trivialThresholdRate, setTrivialThresholdRate] = useState<number>(5); // 5% of overall

  // Calculations for Materiality Matrix
  const overallMateriality = (baseAmount * materialityPercentage) / 100;
  const performanceMateriality = (overallMateriality * performanceMaterialityRate) / 100;
  const clearlyTrivialThreshold = (overallMateriality * trivialThresholdRate) / 100;

  // Pre-configured ESA working paper items
  const [auditProcedures, setAuditProcedures] = useState<AuditTestItem[]>([
    // Cash & Banks
    {
      id: 'ap-1',
      category: 'CASH_BANKS',
      procedureText: 'إرسال واستلام مصادقات البنوك المباشرة (Bank Confirmations) لجميع الحسابات النشطة والمجمدة والضمانات البنكية.',
      sampleSize: '100% (كافة البنوك)',
      result: 'SATISFACTORY',
      auditorInitials: 'م.ج',
      workPaperRef: 'WP-A101',
      notes: 'تم استلام ردود 4 بنوك ومطابقتها مع مذكرات تسوية البنك دون فروق.',
    },
    {
      id: 'ap-2',
      category: 'CASH_BANKS',
      procedureText: 'إجراء الجرد الفعلي المفاجئ للنقدية بالصندوق ومطابقة محضر الجرد مع رصيد الأستاذ في تاريخ الميزانية.',
      sampleSize: 'خزينة المركز الرئيسي',
      result: 'SATISFACTORY',
      auditorInitials: 'م.ج',
      workPaperRef: 'WP-A102',
      notes: 'تم عمل محضر جرد معتمد من أمين الخزينة ورئيس الحسابات.',
    },

    // Receivables
    {
      id: 'ap-3',
      category: 'RECEIVABLES',
      procedureText: 'إرسال مصادقات أرصدة العملاء (إيجابية وسلبية) وفحص الردود وإجراء اختبارات بديلة للعملاء الذين لم يردوا.',
      sampleSize: '75% من إجمالي الرصيد',
      result: 'SATISFACTORY',
      auditorInitials: 'أ.ح',
      workPaperRef: 'WP-B201',
      notes: 'نسبة الردود بلغت 82%، وتم عمل اختبار السداد اللاحق للباقي.',
    },
    {
      id: 'ap-4',
      category: 'RECEIVABLES',
      procedureText: 'فحص دراسة مخصص الخسائر الائتمانية المتوقعة (ECL) وفق معيار المحاسبة المصري رقم (47) وتحليل أعمار الديون.',
      sampleSize: 'كامل المحفظة',
      result: 'SATISFACTORY',
      auditorInitials: 'م.ج',
      workPaperRef: 'WP-B202',
      notes: 'المخصص المكون كافٍ ومطابق لمصفوفة التعثر التاريخية للشركة.',
    },

    // Inventory
    {
      id: 'ap-5',
      category: 'INVENTORY',
      procedureText: 'حضور وملاحظة إجراءات جرد المخزون الفعلي في نهاية العام وإجراء عينات عد عكسي (Test Counts).',
      sampleSize: '40 عينة بند رئيسي',
      result: 'SATISFACTORY',
      auditorInitials: 'س.ع',
      workPaperRef: 'WP-C301',
      notes: 'تم مطابقة عينات الجرد مع كروت الصنف وسجلات المخازن.',
    },
    {
      id: 'ap-6',
      category: 'INVENTORY',
      procedureText: 'اختبار تقييم المخزون بالتكلفة أو صافي القيمة البيعية القابلة للتحقق أيهما أقل (معيار EAS 2) ومخصص الركود.',
      sampleSize: '25 بند ذو حركة بطيئة',
      result: 'DEFICIENCY',
      auditorInitials: 'س.ع',
      workPaperRef: 'WP-C302',
      notes: 'يوجد ركود في قطع غيار بقيمة 45,000 ج.م يلزم تكوين مخصص هبوط أسعار لها.',
    },

    // Fixed Assets
    {
      id: 'ap-7',
      category: 'FIXED_ASSETS',
      procedureText: 'فحص مستندي لإضافات الأصول الثابتة خلال العام والتأكد من فواتير الشراء وشهادات الاستلام وتسجيل الملكية.',
      sampleSize: 'كافة العمليات > 50,000 ج.م',
      result: 'SATISFACTORY',
      auditorInitials: 'م.ج',
      workPaperRef: 'WP-D401',
      notes: 'تم فحص فواتير شراء الآلات ومطابقتها مع منظومة الفاتورة الإلكترونية.',
    },
    {
      id: 'ap-8',
      category: 'FIXED_ASSETS',
      procedureText: 'إعادة احتساب مجمع إهلاك الأصول ومطابقة نسب الإهلاك مع السياسات المحاسبية المعتمدة (معيار EAS 10).',
      sampleSize: '100% من الأصول',
      result: 'SATISFACTORY',
      auditorInitials: 'أ.ح',
      workPaperRef: 'WP-D402',
      notes: 'حساب الإهلاك دقيق ومتسق مع السنوات السابقة.',
    },

    // Revenues & Cut-off
    {
      id: 'ap-9',
      category: 'REVENUES',
      procedureText: 'إجراء اختبارات القطع (Sales Cut-off Test) لفواتير المبيعات الصادرة قبل وبعد تاريخ الميزانية بـ 10 أيام.',
      sampleSize: '50 فاتورة وإذن تسليم',
      result: 'SATISFACTORY',
      auditorInitials: 'م.ج',
      workPaperRef: 'WP-E501',
      notes: 'الفواتير مسجلة في الفترات الصحيحة ومطابقة لأذون خروج البضاعة.',
    },
    {
      id: 'ap-10',
      category: 'PAYABLES',
      procedureText: 'البحث عن التزامات غير مسجلة (Search for Unrecorded Liabilities) بفحص مدفوعات وفواتير ما بعد الميزانية.',
      sampleSize: 'كافة المدفوعات اللاحقة',
      result: 'SATISFACTORY',
      auditorInitials: 'أ.ح',
      workPaperRef: 'WP-F601',
      notes: 'لم يتم العثور على التزامات تخص العام المنتهي غير مسجلة.',
    },
  ]);

  const client = state.clients.find((c) => c.id === selectedClient) || state.clients[0];

  const handleStatusToggle = (id: string) => {
    setAuditProcedures((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextResult: AuditTestItem['result'] =
          item.result === 'SATISFACTORY'
            ? 'DEFICIENCY'
            : item.result === 'DEFICIENCY'
            ? 'PENDING'
            : item.result === 'PENDING'
            ? 'NOT_APPLICABLE'
            : 'SATISFACTORY';
        return { ...item, result: nextResult };
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const completedCount = auditProcedures.filter((p) => p.result === 'SATISFACTORY').length;
  const deficiencyCount = auditProcedures.filter((p) => p.result === 'DEFICIENCY').length;
  const pendingCount = auditProcedures.filter((p) => p.result === 'PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              معايير المراجعة المصرية (ESA 320 / 330 / 500)
            </span>
            <span className="text-slate-400 text-xs font-mono">ملف المراجعة السنوي المعتمد (Engagement Binder)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            منظومة أوراق عمل المراجعة الميدانية والأهمية النسبية
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            توثيق كامل لإجراءات المراجعة الميدانية، مصفوفة الأهمية النسبية، أدلة الإثبات واختبارات الرقابة والتحقق
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScreenActionToolbar
            modelType="AUDIT_PAPERS"
            title="أوراق عمل المراجعة الميدانية والأهمية النسبية"
            showImport={false}
          />
        </div>
      </div>

      {/* Control Navigation & Client Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">الشركة محل المراجعة:</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
            >
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">السنة المالية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
            >
              <option value={2026}>2026 (مراجعة فترية)</option>
              <option value={2025}>2025 (مراجعة سنوية نهائية)</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveSection('MATERIALITY')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'MATERIALITY'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مصفوفة الأهمية النسبية (ESA 320)
          </button>
          <button
            onClick={() => setActiveSection('PROCEDURES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'PROCEDURES'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أوراق العمل الميدانية ({auditProcedures.length})
          </button>
          <button
            onClick={() => setActiveSection('SAMPLING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'SAMPLING'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            عينات المراجعة (ESA 530)
          </button>
          <button
            onClick={() => setActiveSection('CONFIRMATIONS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'CONFIRMATIONS'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المصادقات الخارجية (ESA 505)
          </button>
          <button
            onClick={() => setActiveSection('INTERNAL_CONTROL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'INTERNAL_CONTROL'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الرقابة الداخلية والمخاطر (ESA 315)
          </button>
          <button
            onClick={() => setActiveSection('JOURNAL_SCAN')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'JOURNAL_SCAN'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs'
                : 'text-amber-900 hover:text-amber-950 bg-amber-50/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>فحص القيود (ESA 240)</span>
          </button>
        </div>
      </div>

      {/* View: Audit Sampling Tool (ESA 530) */}
      {activeSection === 'SAMPLING' && (
        <AuditSamplingTool state={state} selectedYear={selectedYear} />
      )}

      {/* View: External Confirmations Generator (ESA 505) */}
      {activeSection === 'CONFIRMATIONS' && (
        <AuditConfirmationsGenerator state={state} selectedYear={selectedYear} />
      )}

      {/* View: Internal Control & Risk Matrix (ESA 315) */}
      {activeSection === 'INTERNAL_CONTROL' && (
        <InternalControlRiskMatrix state={state} selectedYear={selectedYear} />
      )}

      {/* View 0: Automated Journal Inspection Scanner */}
      {activeSection === 'JOURNAL_SCAN' && (
        <div className="space-y-6">
          <JournalAuditScannerView state={state} />
        </div>
      )}

      {/* View 1: Materiality Matrix Section */}
      {activeSection === 'MATERIALITY' && (
        <div className="space-y-6">
          {/* Top Materiality KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1 text-slate-500">
                <span className="text-xs font-semibold">الأهمية النسبية للتخطيط (Overall Materiality)</span>
                <Scale className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black font-mono text-indigo-950 mt-2">
                {formatEgyptianCurrency(overallMateriality)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                بنسبة {materialityPercentage}% من أساس {benchmarkBase === 'REVENUE' ? 'الإيرادات' : 'الأصول'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1 text-indigo-900">
                <span className="text-xs font-bold">أهمية الأداء التشغيلية (Performance Materiality)</span>
                <ClipboardList className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-2xl font-black font-mono text-indigo-900 mt-2">
                {formatEgyptianCurrency(performanceMateriality)}
              </div>
              <div className="text-[11px] text-indigo-700 mt-1 font-medium">
                تمثل {performanceMaterialityRate}% من الأهمية الكلية لتقليل مخاطر التجميع
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xs">
              <div className="flex items-center justify-between mb-1 text-slate-300">
                <span className="text-xs font-bold">حد الأخطاء الهامشية غير الجوهرية (Trivial)</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-amber-300">
                {formatEgyptianCurrency(clearlyTrivialThreshold)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                أي خطأ دون هذا الحد ({trivialThresholdRate}%) لا يتطلب تسوية أو تجميع في قائمة الفروق
              </div>
            </div>
          </div>

          {/* Materiality Calculator Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>محددات ومعايير احتساب الأهمية النسبية طبقاً لدليل معايير المراجعة المصرية رقم (320)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">أساس القياس المعياري (Benchmark)</label>
                <select
                  value={benchmarkBase}
                  onChange={(e) => setBenchmarkBase(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="REVENUE">إجمالي الإيرادات (0.5% - 2%)</option>
                  <option value="ASSETS">إجمالي الأصول (1% - 2%)</option>
                  <option value="PROFIT">صافي الربح قبل الضريبة (5% - 10%)</option>
                  <option value="EQUITY">حقوق الملكية (1% - 5%)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">قيمة الأساس المعياري (ج.م)</label>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">نسبة الأهمية المختارة (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={materialityPercentage}
                  onChange={(e) => setMaterialityPercentage(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">نسبة أهمية الأداء (%)</label>
                <input
                  type="number"
                  value={performanceMaterialityRate}
                  onChange={(e) => setPerformanceMaterialityRate(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-900 block mb-1">مبررات وحكم مراقب الحسابات المهني (Professional Judgment):</strong>
              تم تحديد الأهمية النسبية بناءً على إجمالي الإيرادات نظراً لاستقرار النشاط التجاري للشركة وعدم وجود تقلبات حادة في نتائج الأعمال، وتعتبر هذه النسبة كافية لتغطية مخاطر التحريف الجوهري بالقوائم المالية.
            </div>
          </div>
        </div>
      )}

      {/* View 2: Working Papers & Procedures List */}
      {activeSection === 'PROCEDURES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Summary status header */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800">حالة اختبارات وأوراق العمل:</span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                {completedCount} مكتمل وسليم
              </span>
              {deficiencyCount > 0 && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-bold">
                  {deficiencyCount} ملاحظات / انحرافات
                </span>
              )}
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                  {pendingCount} قيد التنفيذ
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              انقر على رمز الحالة في أي سطر لتعديل نتيجة الفحص
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 w-20">كود الورقة</th>
                  <th className="p-3">إجراء المراجعة والاختبار الميداني (ESA Checklist)</th>
                  <th className="p-3 w-36">حجم العينة المحددة</th>
                  <th className="p-3 w-32 text-center">نتيجة الفحص</th>
                  <th className="p-3 w-20 text-center">المراجع</th>
                  <th className="p-3">ملاحظات ونتائج الاختبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditProcedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-indigo-900">
                      {proc.workPaperRef}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 leading-relaxed">
                      {proc.procedureText}
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {proc.sampleSize}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleStatusToggle(proc.id)}
                        className={`px-3 py-1 rounded-full font-bold text-[10px] cursor-pointer transition-all ${
                          proc.result === 'SATISFACTORY'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : proc.result === 'DEFICIENCY'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : proc.result === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {proc.result === 'SATISFACTORY' && '✓ سليم ومعتمد'}
                        {proc.result === 'DEFICIENCY' && '⚠ يوجد ملاحظة'}
                        {proc.result === 'PENDING' && '⏳ قيد المتابعة'}
                        {proc.result === 'NOT_APPLICABLE' && '— لا ينطبق'}
                      </button>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">
                      {proc.auditorInitials}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] leading-relaxed">
                      {proc.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auditor Sign-off Footer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="font-bold text-slate-900">
              اعتماد الشريك المسؤول ومراقب الحسابات: أ/ {state.officeProfile.auditorName}
            </div>
            <div className="text-slate-500 text-[11px]">
              رقم القيد بسجل المحاسبين والمراجعين: {state.officeProfile.licenseNumber} • معايير المراجعة المصرية
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
            تم استيفاء أدلة الإثبات الكافية والمناسبة (Sufficient Appropriate Audit Evidence)
          </span>
        </div>
      </div>
    </div>
  );
};
