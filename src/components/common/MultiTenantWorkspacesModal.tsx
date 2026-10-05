import React, { useState, useMemo } from 'react';
import {
  Building2,
  Factory,
  Briefcase,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Sparkles,
  Calculator,
  X,
  Lock,
  ChevronDown,
  Trash2,
  ExternalLink,
  Sliders,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord } from '../../types';
import { QuickCompanyModal } from './QuickCompanyModal';
import { AcceleratedDepreciationCalculatorModal } from '../industrial/AcceleratedDepreciationCalculatorModal';
import { IndustrialCostManagerModal } from '../industrial/IndustrialCostManagerModal';

interface MultiTenantWorkspacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

export const MultiTenantWorkspacesModal: React.FC<MultiTenantWorkspacesModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FACTORY' | 'COMMERCIAL' | 'CONTRACTING' | 'SERVICES'>('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedClientForDeprec, setSelectedClientForDeprec] = useState<ClientArchiveRecord | null>(null);
  const [selectedClientForCost, setSelectedClientForCost] = useState<ClientArchiveRecord | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const activeClientId = state.activeClientContext?.clientId;
  const clients = state.clients || [];

  // Helper to determine entity category
  const getEntityCategory = (client: ClientArchiveRecord) => {
    const act = (client.activity || '').toLowerCase();
    const name = (client.name || '').toLowerCase();
    if (act.includes('صناع') || act.includes('مصنع') || act.includes('إنتاج') || name.includes('مصنع') || name.includes('صناعات')) {
      return 'FACTORY';
    }
    if (act.includes('مقاول') || act.includes('تشييد') || act.includes('بناء') || name.includes('مقاولات')) {
      return 'CONTRACTING';
    }
    if (act.includes('خدم') || act.includes('استشار') || act.includes('مهن') || act.includes('برمج')) {
      return 'SERVICES';
    }
    return 'COMMERCIAL';
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return clients.filter((c) => {
      const cat = getEntityCategory(c);
      if (filterType !== 'ALL' && cat !== filterType) return false;
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.taxCardNo && c.taxCardNo.includes(q)) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(q)) ||
        (c.activity && c.activity.toLowerCase().includes(q))
      );
    });
  }, [clients, searchTerm, filterType]);

  // Overall Statistics across all tenants
  const overallStats = useMemo(() => {
    const totalClients = clients.length;
    let factoryCount = 0;
    let commercialCount = 0;
    for (const c of clients) {
      if (getEntityCategory(c) === 'FACTORY') factoryCount++;
      else commercialCount++;
    }
    const totalEntries = state.journalEntries.length;
    return { totalClients, factoryCount, commercialCount, totalEntries };
  }, [clients, state.journalEntries]);

  if (!isOpen) return null;

  const handleSelectWorkspace = (client: ClientArchiveRecord | null) => {
    db.setActiveClient(client ? client.id : null, { autoFilter: true });
    setFeedbackMessage(
      client
        ? `تم التبديل بنجاح إلى مساحة عمل [${client.name}] وتفعيل العزل الصارم للدفاتر والتقارير بنسبة 100%.`
        : 'تم تفعيل العرض الشامل لكافة الكيانات والشركات.'
    );
    setTimeout(() => {
      setFeedbackMessage(null);
      onClose();
    }, 1200);
  };

  const handleApplyIndustrialCOA = (client: ClientArchiveRecord) => {
    const res = db.applyIndustrialChartOfAccounts(client.id);
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleExportClientBackup = (client: ClientArchiveRecord) => {
    try {
      const jsonStr = db.exportClientIsolatedBackup(client.id);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${client.clientCode || 'client'}-${client.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedbackMessage(`تم تصدير نسخة احتياطية معزولة لـ [${client.name}] بنجاح.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage(`خطأ أثناء تصدير النسخة: ${err.message}`);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100" dir="rtl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black">إدارة بيئات عمل الشركات والمصانع المتعددة</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                    Strict Multi-Tenant Sandboxing
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  فصل صارم 100% للقيود والأرصدة وميزان المراجعة مع التبديل السلس بين المصانع والشركات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>تأسيس شركة / مصنع جديد</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback Bar */}
          {feedbackMessage && (
            <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Filters & Search Toolbar */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم المصنع، السجل التجاري، البطاقة الضريبية، أو النشاط..."
                className="w-full text-xs pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Entity Type Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                كافة الكيانات ({overallStats.totalClients})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('FACTORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'FACTORY'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Factory className="w-3.5 h-3.5 text-amber-500" />
                <span>مصانع وإنتاج ({overallStats.factoryCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('COMMERCIAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'COMMERCIAL'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>شركات تجارية وتوريدات ({overallStats.commercialCount})</span>
              </button>
            </div>

            {/* Global Unfiltered View Button */}
            <button
              type="button"
              onClick={() => handleSelectWorkspace(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                !activeClientId
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>عرض شامل لجميع الكيانات</span>
              {!activeClientId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          </div>

          {/* Cards Grid */}
          <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">لا توجد منشآت أو مصانع مطابقة للبحث</p>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>تأسيس أول منشأة الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => {
                  const isActive = client.id === activeClientId;
                  const cat = getEntityCategory(client);
                  const isFactory = cat === 'FACTORY';
                  const clientEntries = state.journalEntries.filter((e) => e.clientId === client.id);

                  return (
                    <div
                      key={client.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isActive
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                      }`}
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isFactory
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              {isFactory ? <Factory className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                                {client.name}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-500">
                                كود: {client.clientCode || 'C-00'} | {client.taxCardNo || 'بدون بطاقة ضريبية'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                              isFactory
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {isFactory ? 'مصنع وإنتاج' : 'شركة وتوريدات'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">
                          النشاط: {client.activity || 'نشاط تجاري / صناعي عام'}
                        </p>

                        {/* Live Micro KPIs */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">القيود المعزولة:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {clientEntries.length} قيد
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">السنة المالية:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {client.fiscalYear || '2026'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {/* Primary Switch Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectWorkspace(client)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>بيئة العمل النشطة حالياً (عزل كامل)</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              <span>التبديل إلى مساحة عمل هذه المنشأة</span>
                            </>
                          )}
                        </button>

                        {/* Industrial Tools Row for Factories */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {isFactory && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedClientForDeprec(client)}
                                title="حساب الإهلاك المعجل 30% لآلات المصنع"
                                className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg font-bold border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Percent className="w-3.5 h-3.5 text-amber-600" />
                                <span>إهلاك 30%</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedClientForCost(client)}
                                title="محاسبة التكاليف ومراكز التشغيل FOH"
                                className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 rounded-lg font-bold border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                <span>التكاليف FOH</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApplyIndustrialCOA(client)}
                                title="تطبيق شجرة الحسابات الصناعية للمصنع"
                                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                            </>
                          )}

                          {/* Standalone Backup Button */}
                          <button
                            type="button"
                            onClick={() => handleExportClientBackup(client)}
                            title="تصدير نسخة احتياطية مستقلة لبيانات هذه المنشأة فقط (JSON)"
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="text-[10px]">نسخة JSON</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 text-xs">
            <span className="text-slate-500 font-mono">
              الكيانات النشطة: {clients.length} | القيود المسجلة: {state.journalEntries.length} قيد
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Company Modal */}
      <QuickCompanyModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCompanyCreated={(newCompany) => {
          handleSelectWorkspace(newCompany);
        }}
      />

      {/* Accelerated Depreciation Modal */}
      <AcceleratedDepreciationCalculatorModal
        isOpen={!!selectedClientForDeprec}
        onClose={() => setSelectedClientForDeprec(null)}
        state={state}
        targetClient={selectedClientForDeprec}
      />

      {/* Industrial Cost Allocation Modal */}
      <IndustrialCostManagerModal
        isOpen={!!selectedClientForCost}
        onClose={() => setSelectedClientForCost(null)}
        state={state}
        targetClient={selectedClientForCost}
      />
    </>
  );
};
