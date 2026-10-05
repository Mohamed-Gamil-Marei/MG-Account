import React, { useState, useMemo } from 'react';
import {
  Factory,
  Layers,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Cpu,
  Clock,
  Briefcase,
  HelpCircle,
  Building,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord, JournalEntry } from '../../types';

interface IndustrialCostManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  targetClient?: ClientArchiveRecord | null;
}

interface CostCenterItem {
  id: string;
  name: string;
  code: string;
  driverUnits: number; // e.g. Machine Hours or Labor Hours
  producedUnits: number; // عدد الوحدات المنتجة
}

interface OverheadItem {
  id: string;
  name: string;
  accountCode: string;
  amount: number;
}

export const IndustrialCostManagerModal: React.FC<IndustrialCostManagerModalProps> = ({
  isOpen,
  onClose,
  state,
  targetClient,
}) => {
  const activeClientId = targetClient?.id || state.activeClientContext?.clientId;
  const client = state.clients.find((c) => c.id === activeClientId) || targetClient;

  // Cost Allocation Basis
  const [allocationDriver, setAllocationDriver] = useState<'MACHINE_HOURS' | 'LABOR_HOURS' | 'PERCENTAGE'>('MACHINE_HOURS');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Production Cost Centers
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([
    { id: 'cc-1', code: 'CC-101', name: 'خط الإنتاج الرئيسي (أ)', driverUnits: 1200, producedUnits: 5000 },
    { id: 'cc-2', code: 'CC-102', name: 'خط الإنتاج والتشكيل (ب)', driverUnits: 800, producedUnits: 3000 },
    { id: 'cc-3', code: 'CC-103', name: 'عنبر التعبئة والتغليف النهائي', driverUnits: 400, producedUnits: 8000 },
  ]);

  // Indirect Factory Overheads (FOH)
  const [overheads, setOverheads] = useState<OverheadItem[]>([
    { id: 'oh-1', name: 'قوى محركة وكهرباء المصنع الصناعية', accountCode: '3120', amount: 85000 },
    { id: 'oh-2', name: 'وقود وسولار الغلايات والمولدات', accountCode: '3120', amount: 45000 },
    { id: 'oh-3', name: 'صيانة دورية وقطع غيار الماكينات', accountCode: '3130', amount: 32000 },
    { id: 'oh-4', name: 'إهلاك آلات ومعدات الإنتاج الشهري', accountCode: '3140', amount: 55000 },
    { id: 'oh-5', name: 'أجور إشراف ومهندسي الإنتاج المساعدين', accountCode: '3150', amount: 60000 },
  ]);

  // Calculations
  const totalOverheadCost = useMemo(() => {
    return overheads.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [overheads]);

  const totalDriverUnits = useMemo(() => {
    return costCenters.reduce((sum, cc) => sum + (Number(cc.driverUnits) || 0), 0);
  }, [costCenters]);

  // Cost Allocation Rate per Driver Unit (e.g. Rate per Machine Hour)
  const allocationRatePerUnit = useMemo(() => {
    return totalDriverUnits > 0 ? totalOverheadCost / totalDriverUnits : 0;
  }, [totalOverheadCost, totalDriverUnits]);

  // Center Breakdown
  const centersBreakdown = useMemo(() => {
    return costCenters.map((cc) => {
      const shareOfOverhead = totalDriverUnits > 0 ? (cc.driverUnits / totalDriverUnits) * totalOverheadCost : 0;
      const costPerFinishedUnit = cc.producedUnits > 0 ? shareOfOverhead / cc.producedUnits : 0;
      const sharePercentage = totalOverheadCost > 0 ? (shareOfOverhead / totalOverheadCost) * 100 : 0;

      return {
        ...cc,
        shareOfOverhead,
        costPerFinishedUnit,
        sharePercentage,
      };
    });
  }, [costCenters, totalDriverUnits, totalOverheadCost]);

  if (!isOpen) return null;

  const handleAddCostCenter = () => {
    const nextNum = costCenters.length + 1;
    setCostCenters([
      ...costCenters,
      {
        id: `cc-${Date.now()}`,
        code: `CC-10${nextNum}`,
        name: `عنبر تشغيل جديد (${nextNum})`,
        driverUnits: 500,
        producedUnits: 2000,
      },
    ]);
  };

  const handleAddOverhead = () => {
    setOverheads([
      ...overheads,
      {
        id: `oh-${Date.now()}`,
        name: 'بند تكلفة صناعية غير مباشرة إضافي',
        accountCode: '3150',
        amount: 10000,
      },
    ]);
  };

  const handlePostAllocationJournalEntry = () => {
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();

      // Lines for each cost center debit (حساب إنتاج تحت التشغيل WIP لكل مركز تكلفة)
      const debitLines = centersBreakdown.map((cc, idx) => ({
        id: `line-${Date.now()}-cc-${idx}`,
        accountId: 'acc-1132-wip',
        accountCode: '1132',
        accountName: `مخزون إنتاج تحت التشغيل - [${cc.name}]`,
        debit: Math.round(cc.shareOfOverhead),
        credit: 0,
        description: `تحميل أعباء صناعية غير مباشرة (FOH) على أساس ${cc.driverUnits} ساعة تشغيل`,
      }));

      // Credit line for Applied Overheads (حـ/ تكاليف صناعية غير مباشرة محملة)
      const creditLine = {
        id: `line-${Date.now()}-credit-foh`,
        accountId: 'acc-315-foh',
        accountCode: '3150',
        accountName: 'تكاليف صناعية غير مباشرة محملة (FOH Applied)',
        debit: 0,
        credit: Math.round(totalOverheadCost),
        description: `إقفال وتحميل التكاليف الصناعية غير المباشرة على مراكز الإنتاج التابعة لـ ${client?.name || 'المصنع'}`,
      };

      const totalAllocated = Math.round(totalOverheadCost);
      db.addJournalEntry({
        date: now.split('T')[0],
        description: `قيد توزيع وتحميل التكاليف الصناعية غير المباشرة (FOH) على مراكز الإنتاج - ${client ? client.name : 'المصنع'}`,
        isPosted: true,
        entryType: 'ADJUSTING',
        totalDebit: totalAllocated,
        totalCredit: totalAllocated,
        clientId: client?.id,
        clientName: client?.name,
        lines: [...debitLines, creditLine],
      });

      setFeedbackMessage('تم ترحيل قيد تحميل التكاليف الصناعية غير المباشرة على مراكز التكلفة بنجاح!');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      setFeedbackMessage(`خطأ أثناء ترحيل القيد: ${err.message || 'حدث خطأ غير متوقع'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100" dir="rtl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">نظام محاسبة التكاليف ومراكز التكلفة الصناعية</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800">
                  FOH Cost Centers & Allocation
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {client ? `المنشأة المستهدفة: ${client.name} (${client.clientCode})` : 'توزيع الأعباء الصناعية المشتركة وتحديد تكلفة الوحدة المصنعة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {feedbackMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{feedbackMessage}</span>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                إجمالي التكاليف الصناعية غير المباشرة (FOH):
              </span>
              <div className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                {totalOverheadCost.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                إجمالي وحدات أساس التحميل (ساعات العمل/التشغيل):
              </span>
              <div className="text-lg font-black font-mono text-slate-800 dark:text-slate-200">
                {totalDriverUnits.toLocaleString()} ساعة
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                معدل تحميل التكلفة الإضافية لكل ساعة:
              </span>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {allocationRatePerUnit.toFixed(2)} ج.م / ساعة
              </div>
            </div>
          </div>

          {/* Allocation Basis Selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              أساس توزيع وتحميل التكاليف الصناعية:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllocationDriver('MACHINE_HOURS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  allocationDriver === 'MACHINE_HOURS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                ساعات دوران الماكينات (Machine Hours)
              </button>
              <button
                type="button"
                onClick={() => setAllocationDriver('LABOR_HOURS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  allocationDriver === 'LABOR_HOURS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                ساعات العمل المباشر (Direct Labor)
              </button>
            </div>
          </div>

          {/* Two-Column Grid: Overheads List & Production Centers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Overheads (بنود التكاليف المشتركة) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-amber-500" />
                  بنود التكاليف الصناعية غير المباشرة (FOH)
                </span>
                <button
                  type="button"
                  onClick={handleAddOverhead}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند تكلفة</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {overheads.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...overheads];
                          updated[idx].name = e.target.value;
                          setOverheads(updated);
                        }}
                        className="w-full bg-transparent font-bold focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">حـ/ {item.accountCode}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(e) => {
                          const updated = [...overheads];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setOverheads(updated);
                        }}
                        className="w-24 px-2 py-1 text-left font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400">ج.م</span>
                      {overheads.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOverheads(overheads.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Cost Centers (مراكز الإنتاج والتشغيل) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  مراكز التكلفة وخطوط الإنتاج المستهدفة
                </span>
                <button
                  type="button"
                  onClick={handleAddCostCenter}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مركز تكلفة</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {costCenters.map((cc, idx) => (
                  <div
                    key={cc.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={cc.name}
                        onChange={(e) => {
                          const updated = [...costCenters];
                          updated[idx].name = e.target.value;
                          setCostCenters(updated);
                        }}
                        className="font-bold bg-transparent focus:outline-hidden"
                      />
                      <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-sm">
                        {cc.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ساعات التشغيل:</span>
                        <input
                          type="number"
                          min="1"
                          value={cc.driverUnits}
                          onChange={(e) => {
                            const updated = [...costCenters];
                            updated[idx].driverUnits = parseFloat(e.target.value) || 0;
                            setCostCenters(updated);
                          }}
                          className="w-full px-2 py-1 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">الوحدات المنتجة:</span>
                        <input
                          type="number"
                          min="1"
                          value={cc.producedUnits}
                          onChange={(e) => {
                            const updated = [...costCenters];
                            updated[idx].producedUnits = parseFloat(e.target.value) || 0;
                            setCostCenters(updated);
                          }}
                          className="w-full px-2 py-1 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Allocation Results Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2.5 font-bold flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span>نتائج توزيع الأعباء وتكلفة الوحدة المصنعة بكل مركز تكلفة</span>
              <span className="text-[11px] font-mono text-slate-500">
                إجمالي الموزع: {totalOverheadCost.toLocaleString()} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2.5">مركز التكلفة / العنبر</th>
                    <th className="p-2.5">ساعات التشغيل</th>
                    <th className="p-2.5">نسبة التحميل %</th>
                    <th className="p-2.5">الأعباء المحملة (FOH)</th>
                    <th className="p-2.5">كمية الإنتاج</th>
                    <th className="p-2.5">نصيب الوحدة من الأعباء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {centersBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-sans font-bold text-slate-800 dark:text-slate-200">
                        {row.name} ({row.code})
                      </td>
                      <td className="p-2.5">{row.driverUnits.toLocaleString()} س</td>
                      <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                        {row.sharePercentage.toFixed(1)}%
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {Math.round(row.shareOfOverhead).toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5">{row.producedUnits.toLocaleString()} وحدة</td>
                      <td className="p-2.5 font-black text-emerald-600 dark:text-emerald-400">
                        {row.costPerFinishedUnit.toFixed(2)} ج.م / وحدة
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePostAllocationJournalEntry}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>ترحيل قيد تحميل التكاليف الصناعية على الإنتاج (WIP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
