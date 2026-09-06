import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/egyptianTaxCalculations';
import * as XLSX from 'xlsx';
import {
  Layers,
  Filter,
  RefreshCw,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface AuditSamplingToolProps {
  state: DatabaseState;
  selectedYear: number;
}

export type SamplingPopulationType = 'INVOICES' | 'JOURNAL_ENTRIES' | 'TREASURY' | 'CLIENTS';
export type SamplingMethod = 'STRATIFIED' | 'RANDOM' | 'SYSTEMATIC';

interface SelectedSampleItem {
  id: string;
  refNumber: string;
  date: string;
  description: string;
  amount: number;
  stratum: 'HIGH_VALUE' | 'MEDIUM' | 'LOW';
  auditStatus: 'VERIFIED' | 'EXCEPTION' | 'PENDING';
  auditorNotes: string;
}

export const AuditSamplingTool: React.FC<AuditSamplingToolProps> = ({ state, selectedYear }) => {
  const [populationType, setPopulationType] = useState<SamplingPopulationType>('INVOICES');
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('STRATIFIED');
  const [sampleSize, setSampleSize] = useState<number>(15);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [materialityThreshold, setMaterialityThreshold] = useState<number>(50000);
  const [samples, setSamples] = useState<SelectedSampleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract population based on selection
  const populationData = useMemo(() => {
    switch (populationType) {
      case 'INVOICES':
        return state.invoices.map((inv) => ({
          id: inv.id,
          refNumber: inv.invoiceNumber,
          date: inv.date,
          description: `فاتورة مبيعات - ${inv.partnerName}`,
          amount: inv.grandTotal,
        }));
      case 'JOURNAL_ENTRIES':
        return state.journalEntries.map((je) => ({
          id: je.id,
          refNumber: je.serialNumber,
          date: je.date,
          description: je.description,
          amount: je.totalDebit,
        }));
      case 'TREASURY':
        return state.treasuryTransactions.map((tr) => ({
          id: tr.id,
          refNumber: tr.voucherNumber,
          date: tr.date,
          description: tr.description,
          amount: tr.amount,
        }));
      case 'CLIENTS':
        return state.clients.map((cl) => ({
          id: cl.id,
          refNumber: cl.taxNumber || 'غير محدد',
          date: cl.createdAt?.substring(0, 10) || '2026-01-01',
          description: cl.name,
          amount: cl.capital || 100000,
        }));
      default:
        return [];
    }
  }, [populationType, state]);

  const totalPopulationAmount = useMemo(() => {
    return populationData.reduce((sum, item) => sum + item.amount, 0);
  }, [populationData]);

  // Execute sampling algorithm
  const handleGenerateSamples = () => {
    if (populationData.length === 0) {
      alert('لا توجد بيانات متاحة في مجتمع المعاينة المحدد.');
      return;
    }

    let generated: SelectedSampleItem[] = [];

    if (samplingMethod === 'STRATIFIED') {
      // Stratified by Monetary Amount:
      // 1. All items >= materiality threshold (100% testing)
      const highValueItems = populationData.filter((item) => item.amount >= materialityThreshold);
      const highSamples: SelectedSampleItem[] = highValueItems.map((item) => ({
        id: item.id,
        refNumber: item.refNumber,
        date: item.date,
        description: item.description,
        amount: item.amount,
        stratum: 'HIGH_VALUE',
        auditStatus: 'PENDING',
        auditorNotes: 'بند ذو أهمية نسبية مرتفعة تم اختياره بنسبة 100%',
      }));

      // 2. Sample from remaining medium/low items
      const remainingItems = populationData.filter((item) => item.amount < materialityThreshold);
      const remainingTarget = Math.max(1, sampleSize - highSamples.length);
      
      const shuffled = [...remainingItems].sort(() => 0.5 - Math.random());
      const selectedRemaining = shuffled.slice(0, remainingTarget).map((item) => ({
        id: item.id,
        refNumber: item.refNumber,
        date: item.date,
        description: item.description,
        amount: item.amount,
        stratum: item.amount >= materialityThreshold / 3 ? ('MEDIUM' as const) : ('LOW' as const),
        auditStatus: 'PENDING' as const,
        auditorNotes: 'عينة عشوائية منتظمة ممثلة للطبقات المتوسطة والصغرى',
      }));

      generated = [...highSamples, ...selectedRemaining];
    } else if (samplingMethod === 'SYSTEMATIC') {
      // Systematic interval sampling: step = N / sampleSize
      const step = Math.max(1, Math.floor(populationData.length / sampleSize));
      const sorted = [...populationData].sort((a, b) => b.amount - a.amount);
      const picked: SelectedSampleItem[] = [];

      for (let i = 0; i < sorted.length && picked.length < sampleSize; i += step) {
        const it = sorted[i];
        picked.push({
          id: it.id,
          refNumber: it.refNumber,
          date: it.date,
          description: it.description,
          amount: it.amount,
          stratum: it.amount >= materialityThreshold ? 'HIGH_VALUE' : 'MEDIUM',
          auditStatus: 'PENDING',
          auditorNotes: `عينة منتظمة بالخطوة رقم ${i + 1}`,
        });
      }
      generated = picked;
    } else {
      // Simple random sampling
      const shuffled = [...populationData].sort(() => 0.5 - Math.random());
      generated = shuffled.slice(0, sampleSize).map((item) => ({
        id: item.id,
        refNumber: item.refNumber,
        date: item.date,
        description: item.description,
        amount: item.amount,
        stratum: item.amount >= materialityThreshold ? 'HIGH_VALUE' : 'MEDIUM',
        auditStatus: 'PENDING',
        auditorNotes: 'عينة عشوائية بسيطة',
      }));
    }

    setSamples(generated);
  };

  const handleUpdateStatus = (
    id: string,
    status: 'VERIFIED' | 'EXCEPTION' | 'PENDING',
    notes?: string
  ) => {
    setSamples((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, auditStatus: status, ...(notes !== undefined ? { auditorNotes: notes } : {}) } : s
      )
    );
  };

  const handleExportExcel = () => {
    if (samples.length === 0) {
      alert('يرجى توليد عينات المراجعة أولاً للتصدير.');
      return;
    }

    const rows = samples.map((s, idx) => ({
      'م': idx + 1,
      'رقم المرجع / المستند': s.refNumber,
      'التاريخ': s.date,
      'البيان': s.description,
      'القيمة (ج.م)': s.amount,
      'الطبقة النسبية': s.stratum === 'HIGH_VALUE' ? 'أهمية مرتفعة' : s.stratum === 'MEDIUM' ? 'متوسط' : 'صغير',
      'نتيجة الفحص الميداني': s.auditStatus === 'VERIFIED' ? 'سليم ومطابق' : s.auditStatus === 'EXCEPTION' ? 'مخالفة / انحراف' : 'قيد الفحص',
      'ملاحظات المراجع': s.auditorNotes,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'عينات المراجعة المعتمدة');
    XLSX.writeFile(wb, `ورقة_عمل_عينات_المراجعة_${populationType}_${selectedYear}.xlsx`);
  };

  const filteredSamples = samples.filter((s) =>
    s.refNumber.includes(searchTerm) || s.description.includes(searchTerm) || s.auditorNotes.includes(searchTerm)
  );

  const sampleCoverageAmount = samples.reduce((s, it) => s + it.amount, 0);
  const sampleCoverageRate = totalPopulationAmount > 0 ? (sampleCoverageAmount / totalPopulationAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-700" />
            <h3 className="text-base font-black text-slate-900">
              أداة اختيار واختبار عينات المراجعة الإحصائية والطبقية (Audit Sampling - ESA 530)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سحب واختيار عينات مراجعة عشوائية وطبقية معتمدة مهنياً لفحص فواتير المبيعات، قيود اليومية، ومعاملات الخزينة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>تصدير إكسيل (XLSX)</span>
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">مجتمع العينة (Population):</label>
          <select
            value={populationType}
            onChange={(e) => setPopulationType(e.target.value as SamplingPopulationType)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
          >
            <option value="INVOICES">فواتير المبيعات الإلكترونية ({state.invoices.length})</option>
            <option value="JOURNAL_ENTRIES">قيود اليومية العامة ({state.journalEntries.length})</option>
            <option value="TREASURY">سندات الخزينة والمصروفات ({state.treasuryTransactions.length})</option>
            <option value="CLIENTS">أرصدة العملاء والملفات ({state.clients.length})</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">منهجية المعاينة (Method):</label>
          <select
            value={samplingMethod}
            onChange={(e) => setSamplingMethod(e.target.value as SamplingMethod)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
          >
            <option value="STRATIFIED">معاينة طبقية بالقيمة (Stratified Monetary)</option>
            <option value="RANDOM">معاينة عشوائية بسيطة (Simple Random)</option>
            <option value="SYSTEMATIC">معاينة منتظمة دورية (Systematic Interval)</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">حجم العينة المطلوب (Sample Size):</label>
          <input
            type="number"
            min={1}
            max={populationData.length || 50}
            value={sampleSize}
            onChange={(e) => setSampleSize(Math.max(1, parseInt(e.target.value) || 10))}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">حد الأهمية النسبية (100% فحص):</label>
          <input
            type="number"
            step="5000"
            value={materialityThreshold}
            onChange={(e) => setMaterialityThreshold(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleGenerateSamples}
            className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-indigo-200" />
            <span>سحب العينات وتوليد الورقة</span>
          </button>
        </div>
      </div>

      {/* Coverage KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">إجمالي عدد مجتمع العينة</span>
          <strong className="text-base font-black text-slate-900 font-mono">
            {populationData.length} بند
          </strong>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">إجمالي قيمة المجتمع المالي</span>
          <strong className="text-base font-black text-slate-900 font-mono">
            {formatEgyptianCurrency(totalPopulationAmount)}
          </strong>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">قيمة العينات المختارة للفحص</span>
          <strong className="text-base font-black text-indigo-900 font-mono">
            {formatEgyptianCurrency(sampleCoverageAmount)}
          </strong>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">نسبة التغطية المالية للفحص</span>
          <strong className="text-base font-black text-emerald-700 font-mono">
            {sampleCoverageRate.toFixed(1)}% من إجمالي القيمة
          </strong>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              العينات المسحوبة للفحص المستندي الميداني ({samples.length} عينة):
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في العينات برقم المرجع أو البيان..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        {samples.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            اضغط على زر <strong className="text-indigo-700 font-bold">"سحب العينات وتوليد الورقة"</strong> في الأعلى لتطبيق خوارزمية المعاينة الإحصائية وفق معيار المراجعة المصري رقم (530).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">م</th>
                  <th className="py-2.5 px-3">رقم المرجع / المستند</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">البيان</th>
                  <th className="py-2.5 px-3 text-left font-mono">القيمة (ج.م)</th>
                  <th className="py-2.5 px-3 text-center">الطبقة</th>
                  <th className="py-2.5 px-3 text-center">حالة الفحص</th>
                  <th className="py-2.5 px-3">ملاحظات المراجع الميداني</th>
                  <th className="py-2.5 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSamples.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-900">{s.refNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.date}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{s.description}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      {formatEgyptianCurrency(s.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.stratum === 'HIGH_VALUE' ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                          أهمية كبرى 100%
                        </span>
                      ) : s.stratum === 'MEDIUM' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          متوسط
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          عادي
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.auditStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>مطابق مستندياً</span>
                        </span>
                      ) : s.auditStatus === 'EXCEPTION' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>انحراف / ملاحظة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>قيد الفحص</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.auditorNotes}
                        onChange={(e) => handleUpdateStatus(s.id, s.auditStatus, e.target.value)}
                        placeholder="دون الملاحظات..."
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(s.id, 'VERIFIED')}
                          title="اعتماد كمطابق"
                          className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(s.id, 'EXCEPTION')}
                          title="تسجيل انحراف"
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-700 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
