import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  Users,
  Building,
  DollarSign,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Shield,
  Edit2,
  Trash2,
  ExternalLink,
  Check,
  Send,
  Zap,
} from 'lucide-react';
import {
  TaxMandateTask,
  TaxMandateStatus,
  TaxMandateType,
  ClientArchiveRecord,
} from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface TaxMandateSchedulerProps {
  state: DatabaseState;
}

export const TaxMandateScheduler: React.FC<TaxMandateSchedulerProps> = ({ state }) => {
  const [activeViewMode, setActiveViewMode] = useState<'LIST' | 'PIPELINE' | 'CALENDAR_GUIDE'>('LIST');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTaxType, setFilterTaxType] = useState<string>('ALL');
  const [filterClientId, setFilterClientId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [selectedMandateForAction, setSelectedMandateForAction] = useState<TaxMandateTask | null>(null);

  // Status Action Form
  const [newTargetStatus, setNewTargetStatus] = useState<TaxMandateStatus>('SUBMITTED');
  const [etaRefInput, setEtaRefInput] = useState('');
  const [receiptNoInput, setReceiptNoInput] = useState('');
  const [actualTaxInput, setActualTaxInput] = useState<number>(0);
  const [actionNotesInput, setActionNotesInput] = useState('');

  // New Mandate Form
  const [mandateFormData, setMandateFormData] = useState({
    clientId: state.clients[0]?.id || '',
    mandateTitle: '',
    taxType: 'VAT_10' as TaxMandateType,
    periodName: 'شهر مارس 2026',
    taxYear: 2026,
    deadlineDate: '2026-04-30',
    reminderDaysBefore: 7,
    assignedTo: state.officeProfile.auditorName || 'محمد جميل مرعي',
    priority: 'HIGH' as TaxMandateTask['priority'],
    estimatedTaxAmount: 0,
    notes: '',
  });

  // Batch Generator Form
  const [batchTaxType, setBatchTaxType] = useState<TaxMandateType>('VAT_10');
  const [batchPeriodName, setBatchPeriodName] = useState('شهر مارس 2026');
  const [batchDeadline, setBatchDeadline] = useState('2026-04-30');
  const [batchYear, setBatchYear] = useState(2026);

  const mandates = state.taxMandates || [];
  const today = new Date().toISOString().slice(0, 10);

  // Days remaining calculation & urgency helper
  const getDeadlineUrgency = (deadlineDate: string, status: TaxMandateStatus) => {
    if (status === 'PAID' || status === 'SUBMITTED') {
      return { days: 0, label: 'مكتمل ومقدم', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', isDone: true };
    }

    const todayDate = new Date(today);
    const targetDate = new Date(deadlineDate);
    const diffTime = targetDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, label: `متأخر بـ ${Math.abs(diffDays)} يوم ⚠️`, color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold', isOverdue: true };
    } else if (diffDays === 0) {
      return { days: 0, label: 'يستحق اليوم ⚡', color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold', isUrgent: true };
    } else if (diffDays <= 3) {
      return { days: diffDays, label: `متبقي ${diffDays} أيام عاجل ⏳`, color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold', isUrgent: true };
    } else if (diffDays <= 7) {
      return { days: diffDays, label: `متبقي ${diffDays} أيام`, color: 'bg-yellow-50 text-yellow-800 border-yellow-300' };
    } else {
      return { days: diffDays, label: `متبقي ${diffDays} يوم`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Urgent alerts for upcoming deadlines within 7 days
  const urgentMandates = mandates.filter((m) => {
    if (m.status === 'PAID' || m.status === 'SUBMITTED') return false;
    const diffTime = new Date(m.deadlineDate).getTime() - new Date(today).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  // Filtered mandates
  const filteredMandates = mandates.filter((m) => {
    const matchesStatus = filterStatus === 'ALL' || m.status === filterStatus;
    const matchesType = filterTaxType === 'ALL' || m.taxType === filterTaxType;
    const matchesClient = filterClientId === 'ALL' || m.clientId === filterClientId;
    const matchesSearch =
      m.mandateTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.mandateCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.assignedTo && m.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.periodName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesType && matchesClient && matchesSearch;
  });

  // Tax Types mapping
  const taxTypeNames: Record<TaxMandateType, { title: string; color: string }> = {
    VAT_10: { title: 'القيمة المضافة (نموذج 10)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    INCOME_27_CORP: { title: 'ضريبة دخل شركات (نموذج 27)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    INCOME_28_INDIV: { title: 'دخل أشخاص طبيعيين (نموذج 28)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    PAYROLL_4: { title: 'كسب عمل ومرتبات (نموذج 4)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ANNUAL_PAYROLL: { title: 'التسوية السنوية للمرتبات', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    WHT_41: { title: 'خصم وتحصيل (نموذج 41)', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    STAMP_TAX: { title: 'ضريبة الدمغة', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    REAL_ESTATE_TAX: { title: 'ضريبة عقارية', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    TAX_AUDIT_SESSION: { title: 'جلسة فحص / لجنة طعن', color: 'bg-red-50 text-red-700 border-red-200' },
    OTHER: { title: 'تكليف والتزام ضريبي', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  };

  const statusDefinitions: Record<TaxMandateStatus, { title: string; badge: string; step: number }> = {
    NOT_STARTED: { title: 'لم يبدأ ⚪', badge: 'bg-slate-100 text-slate-700 border-slate-300', step: 1 },
    COLLECTING_DOCS: { title: 'جمع المستندات والفواتير 📥', badge: 'bg-blue-100 text-blue-800 border-blue-300', step: 2 },
    RECONCILING: { title: 'المطابقة والفحص ⚖️', badge: 'bg-amber-100 text-amber-800 border-amber-300', step: 3 },
    READY_TO_SUBMIT: { title: 'جاهز للرفع والاعتماد 🚀', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', step: 4 },
    SUBMITTED: { title: 'تم التقديم بالبوابة 📑', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', step: 5 },
    PAID: { title: 'تم السداد بالكامل ✅', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', step: 6 },
    OVERDUE: { title: 'متأخر ومتجاوز ❌', badge: 'bg-rose-100 text-rose-800 border-rose-300', step: 0 },
  };

  // Add Mandate Submit
  const handleAddMandateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = state.clients.find((c) => c.id === mandateFormData.clientId);
    if (!selectedClient) {
      alert('يرجى اختيار العميل');
      return;
    }

    const title =
      mandateFormData.mandateTitle.trim() ||
      `${taxTypeNames[mandateFormData.taxType].title} - ${mandateFormData.periodName}`;

    db.addTaxMandate({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      mandateTitle: title,
      taxType: mandateFormData.taxType,
      periodName: mandateFormData.periodName,
      taxYear: Number(mandateFormData.taxYear),
      deadlineDate: mandateFormData.deadlineDate,
      reminderDaysBefore: Number(mandateFormData.reminderDaysBefore),
      assignedTo: mandateFormData.assignedTo,
      status: 'NOT_STARTED',
      priority: mandateFormData.priority,
      estimatedTaxAmount: Number(mandateFormData.estimatedTaxAmount) || 0,
      notes: mandateFormData.notes,
    });

    setIsAddModalOpen(false);
  };

  // Batch Generation Submit
  const handleBatchGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const count = db.batchGenerateMandates(
      batchTaxType,
      batchPeriodName,
      batchDeadline,
      Number(batchYear)
    );

    alert(`تم توليد وجدولة (${count}) تكليف ضريبي بنجاح لكافة عملاء المكتب الأساسيين.`);
    setIsBatchModalOpen(false);
  };

  // Open Quick Status Update Modal
  const handleOpenStatusModal = (mandate: TaxMandateTask) => {
    setSelectedMandateForAction(mandate);
    setNewTargetStatus(
      mandate.status === 'NOT_STARTED'
        ? 'COLLECTING_DOCS'
        : mandate.status === 'COLLECTING_DOCS'
        ? 'RECONCILING'
        : mandate.status === 'RECONCILING'
        ? 'READY_TO_SUBMIT'
        : mandate.status === 'READY_TO_SUBMIT'
        ? 'SUBMITTED'
        : 'PAID'
    );
    setEtaRefInput(mandate.etaSubmissionRef || '');
    setReceiptNoInput(mandate.receiptNumber || '');
    setActualTaxInput(mandate.actualTaxAmount || mandate.estimatedTaxAmount || 0);
    setActionNotesInput(mandate.notes || '');
    setIsStatusUpdateModalOpen(true);
  };

  // Submit Status Update
  const handleStatusUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMandateForAction) return;

    db.updateTaxMandate(selectedMandateForAction.id, {
      status: newTargetStatus,
      etaSubmissionRef: etaRefInput || undefined,
      receiptNumber: receiptNoInput || undefined,
      actualTaxAmount: Number(actualTaxInput) || undefined,
      notes: actionNotesInput || undefined,
    });

    setIsStatusUpdateModalOpen(false);
    setSelectedMandateForAction(null);
  };

  const handleDeleteMandate = (mandate: TaxMandateTask) => {
    if (confirm(`هل أنت متأكد من حذف التكليف الضريبي [${mandate.mandateCode}] ${mandate.mandateTitle}؟`)) {
      db.deleteTaxMandate(mandate.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Urgent Notifications Banner */}
      {urgentMandates.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 rounded-2xl border border-rose-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <span>تنبيه المواعيد الضريبية العاجلة: يوجد ({urgentMandates.length}) استحقاقات وتكليفات ضريبية وشيكة!</span>
              </h4>
              <p className="text-[11px] text-rose-700 mt-0.5">
                يرجى استيفاء الإقرارات ونماذج الخصم وسداد المستحقات لتفادي غرامات التأخير ومقابل التأخير المنصوص عليه بقانون الإجراءات 206 لسنة 2020.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-200 text-rose-900">
              {urgentMandates.length} تكليف عاجل
            </span>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-700" />
            <h3 className="text-sm font-bold text-slate-900">جدول التكليفات والمواعيد الضريبية (Tax Mandates Scheduler)</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            متابعة دقيقة لمواعيد تقديم إقرارات القيمة المضافة، ضريبة الدخل، المرتبات، ونموذج 41 مع العد التنازلي ونظام المراحل
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewMode === 'LIST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قائمة التكليفات
            </button>
            <button
              onClick={() => setActiveViewMode('PIPELINE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewMode === 'PIPELINE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مراحل الإنجاز (Kanban)
            </button>
            <button
              onClick={() => setActiveViewMode('CALENDAR_GUIDE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewMode === 'CALENDAR_GUIDE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              التقويم الضريبي الرسمي 🏛️
            </button>
          </div>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>توليد جماعي دوري</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>جدولة تكليف ضريبي</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Shown in List and Pipeline modes) */}
      {activeViewMode !== 'CALENDAR_GUIDE' && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في التكليفات والعملاء..."
              className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none font-medium"
            >
              <option value="ALL">كافة حالات التنفيذ</option>
              <option value="NOT_STARTED">لم يبدأ بعد</option>
              <option value="COLLECTING_DOCS">جمع المستندات والفواتير</option>
              <option value="RECONCILING">المطابقة والفحص</option>
              <option value="READY_TO_SUBMIT">جاهز للتقديم والاعتماد</option>
              <option value="SUBMITTED">تم التقديم بالبوابة</option>
              <option value="PAID">تم السداد بالكامل</option>
            </select>
          </div>

          {/* Tax Type Filter */}
          <div>
            <select
              value={filterTaxType}
              onChange={(e) => setFilterTaxType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none font-medium"
            >
              <option value="ALL">كافة أنواع الضرائب</option>
              <option value="VAT_10">القيمة المضافة (نموذج 10)</option>
              <option value="INCOME_27_CORP">دخل شركات (نموذج 27)</option>
              <option value="INCOME_28_INDIV">دخل أفراد (نموذج 28)</option>
              <option value="PAYROLL_4">كسب عمل ومرتبات (نموذج 4)</option>
              <option value="WHT_41">خصم وتحصيل (نموذج 41)</option>
              <option value="ANNUAL_PAYROLL">تسوية المرتبات السنوية</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none font-medium truncate"
            >
              <option value="ALL">كافة العملاء والمنشآت</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Count Badge */}
          <div className="flex items-center justify-between sm:justify-end gap-2 px-2 text-slate-500 font-medium">
            <span>النتائج: {filteredMandates.length} تكليف</span>
          </div>
        </div>
      )}

      {/* VIEW 1: LIST VIEW */}
      {activeViewMode === 'LIST' && (
        <div className="space-y-3">
          {filteredMandates.length > 0 ? (
            filteredMandates.map((m) => {
              const urgency = getDeadlineUrgency(m.deadlineDate, m.status);
              const typeInfo = taxTypeNames[m.taxType] || taxTypeNames.OTHER;
              const statusInfo = statusDefinitions[m.status] || statusDefinitions.NOT_STARTED;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-indigo-700">
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {m.mandateCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">{m.mandateTitle}</h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${typeInfo.color}`}>
                          {typeInfo.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.badge}`}>
                          {statusInfo.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-800">
                          <Building className="w-3 h-3 text-slate-400" />
                          {m.clientName}
                        </span>
                        <span>• الفترة: {m.periodName} ({m.taxYear})</span>
                        <span>• المسؤول: {m.assignedTo}</span>
                        {m.estimatedTaxAmount ? (
                          <span className="font-mono font-bold text-emerald-800">
                            • التقدير: {formatEgyptianCurrency(m.estimatedTaxAmount)}
                          </span>
                        ) : null}
                      </div>

                      {/* Reference badges if submitted/paid */}
                      {(m.etaSubmissionRef || m.receiptNumber) && (
                        <div className="flex items-center gap-2 text-[10px] font-mono mt-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          {m.etaSubmissionRef && <span>رقم الإشعار بالبوابة: {m.etaSubmissionRef}</span>}
                          {m.receiptNumber && <span>• رقم إيصال السداد: {m.receiptNumber}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Countdown & Action buttons */}
                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 block">تاريخ الاستحقاق: {m.deadlineDate}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded border inline-block mt-0.5 ${urgency.color}`}>
                        {urgency.label}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenStatusModal(m)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="تحديث المرحلة وحالة التقديم"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تحديث المرحلة</span>
                    </button>

                    <button
                      onClick={() => handleDeleteMandate(m)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="حذف التكليف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h5 className="text-xs font-bold text-slate-700">لا توجد تكليفات مطابقة لمعايير البحث</h5>
              <p className="text-[11px] text-slate-400 mt-1">
                استخدم زر "توليد جماعي دوري" لإنشاء التكليفات الدورية تلقائياً أو "جدولة تكليف ضريبي" لإضافة تكليف مخصص.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PIPELINE / KANBAN VIEW */}
      {activeViewMode === 'PIPELINE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: 'NOT_STARTED', title: 'لم يبدأ', color: 'border-slate-300 bg-slate-50' },
            { key: 'COLLECTING_DOCS', title: 'جمع المستندات', color: 'border-blue-300 bg-blue-50/40' },
            { key: 'RECONCILING', title: 'المطابقة والفحص', color: 'border-amber-300 bg-amber-50/40' },
            { key: 'READY_TO_SUBMIT', title: 'جاهز للتقديم', color: 'border-indigo-300 bg-indigo-50/40' },
            { key: 'SUBMITTED', title: 'تم التقديم / مسدد', color: 'border-emerald-300 bg-emerald-50/40' },
          ].map((col) => {
            const colMandates = filteredMandates.filter((m) =>
              col.key === 'SUBMITTED' ? m.status === 'SUBMITTED' || m.status === 'PAID' : m.status === col.key
            );

            return (
              <div key={col.key} className={`p-3 rounded-2xl border ${col.color} space-y-2.5 flex flex-col`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-xs text-slate-800">{col.title}</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {colMandates.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                  {colMandates.map((m) => {
                    const urgency = getDeadlineUrgency(m.deadlineDate, m.status);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleOpenStatusModal(m)}
                        className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-500">{m.mandateCode}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${urgency.color}`}>
                            {urgency.label}
                          </span>
                        </div>

                        <span className="font-bold text-slate-900 block text-xs line-clamp-2">
                          {m.mandateTitle}
                        </span>

                        <span className="text-[11px] text-slate-600 block truncate">
                          {m.clientName}
                        </span>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>{m.periodName}</span>
                          <span>الاستحقاق: {m.deadlineDate}</span>
                        </div>
                      </div>
                    );
                  })}

                  {colMandates.length === 0 && (
                    <div className="p-4 text-center text-slate-400 italic text-[11px]">
                      لا توجد تكليفات
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: OFFICIAL EGYPTIAN TAX CALENDAR GUIDE */}
      {activeViewMode === 'CALENDAR_GUIDE' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  التقويم الضريبي السنوي المعتمد لمصلحة الضرائب المصرية (قانون 206 لسنة 2020)
                </h4>
                <p className="text-[11px] text-slate-500">
                  المواعيد القانونية الإلزامية لتقديم الإقرارات وسداد الفروق الضريبية
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
              <h5 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <span>1. إقرارات ضريبة القيمة المضافة (نموذج 10)</span>
              </h5>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>الموعد القانوني:</strong> شهرياً، خلال الشهر التالي لانتهاء الفترة الضريبية (مثال: إقرار شهر يناير يُقدم ويسدد بحد أقصى 28 فبراير).
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>الالتزام الإلكتروني:</strong> يقدم حصراً عبر منظومة الفاتورة والإيصال الإلكتروني والبوابة الرسمية لمصلحة الضرائب.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2">
              <h5 className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                <span>2. إقرارات ضريبة الدخل السنوية (شركات وأفراد)</span>
              </h5>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>الأشخاص الطبيعيون (نموذج 28):</strong> من أول يناير حتى 31 مارس من كل عام.
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>الأشخاص الاعتبارية / الشركات (نموذج 27):</strong> من أول يناير حتى 30 أبريل، أو خلال 4 أشهر من تاريخ انتهاء السنة المالية.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
              <h5 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <span>3. نموذج 41 خصم وتحصيل تحت حساب الضريبة</span>
              </h5>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>الموعد القانوني:</strong> ربع سنوي بحد أقصى نهاية الشهر التالي لانتهاء الربع (أبريل - يوليو - أكتوبر - يناير).
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>البيانات:</strong> حصر كامل للتعاملات مع الموردين والمقاولين وإشعارات الخصم (1%، 3%، 5%).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
              <h5 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                <span>4. ضريبة كسب العمل والمرتبات (نموذج 4 والتسوية السنوية)</span>
              </h5>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>نموذج 4 كسب عمل:</strong> ربع سنوي في (أبريل - يوليو - أكتوبر - يناير).
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>التسوية السنوية للمرتبات:</strong> تقدم في شهر يناير من كل عام متضمنة إجمالي الأجور والاستقطاعات لجميع العاملين.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Custom Mandate */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-bold text-slate-900">جدولة تكليف والتزام ضريبي جديد</h4>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMandateSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">العميل / المنشأة *</label>
                <select
                  required
                  value={mandateFormData.clientId}
                  onChange={(e) => setMandateFormData({ ...mandateFormData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان التكليف (اختياري)</label>
                <input
                  type="text"
                  value={mandateFormData.mandateTitle}
                  onChange={(e) => setMandateFormData({ ...mandateFormData, mandateTitle: e.target.value })}
                  placeholder="اتركه فارغاً للتوليد التلقائي حسب نوع الضريبة والفترة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الالتزام الضريبي</label>
                  <select
                    value={mandateFormData.taxType}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, taxType: e.target.value as TaxMandateType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="VAT_10">القيمة المضافة (نموذج 10)</option>
                    <option value="INCOME_27_CORP">دخل شركات (نموذج 27)</option>
                    <option value="INCOME_28_INDIV">دخل أفراد (نموذج 28)</option>
                    <option value="PAYROLL_4">كسب عمل (نموذج 4)</option>
                    <option value="WHT_41">خصم وتحصيل (نموذج 41)</option>
                    <option value="ANNUAL_PAYROLL">تسوية سنوية مرتبات</option>
                    <option value="STAMP_TAX">ضريبة دمغة</option>
                    <option value="REAL_ESTATE_TAX">ضريبة عقارية</option>
                    <option value="TAX_AUDIT_SESSION">جلسة فحص / طعن</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفترة الضريبية</label>
                  <input
                    type="text"
                    value={mandateFormData.periodName}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, periodName: e.target.value })}
                    placeholder="مثال: شهر مارس 2026، الربع الأول 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق القانوني *</label>
                  <input
                    type="date"
                    required
                    value={mandateFormData.deadlineDate}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, deadlineDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المحاسب المسؤول</label>
                  <input
                    type="text"
                    value={mandateFormData.assignedTo}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الضريبة التقديرية المتوقعة (ج.م)</label>
                  <input
                    type="number"
                    value={mandateFormData.estimatedTaxAmount || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, estimatedTaxAmount: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">درجة الأهمية / الأولوية</label>
                  <select
                    value={mandateFormData.priority}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="CRITICAL">حرجة وقصوى (Critical)</option>
                    <option value="HIGH">عالية (High)</option>
                    <option value="MEDIUM">متوسطة (Medium)</option>
                    <option value="LOW">عادية (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات والتزامات الفحص</label>
                <textarea
                  rows={2}
                  value={mandateFormData.notes}
                  onChange={(e) => setMandateFormData({ ...mandateFormData, notes: e.target.value })}
                  placeholder="أي ملاحظات خاصة بالفاتورة الإلكترونية، الخصومات السابقة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>حفظ وجدولة التكليف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Generator */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">توليد جماعي للتكليفات الضريبية الدورية</h4>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-600 my-3 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 leading-relaxed">
              يقوم هذا المعالج بإنشاء وتكليف دوري آلي لكافة عملاء المكتب الأساسيين (المسجلين كعملاء دائمين) وفق التاريخ والفترة المحددة.
            </p>

            <form onSubmit={handleBatchGenerate} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع التكليف الدوري</label>
                <select
                  value={batchTaxType}
                  onChange={(e) => setBatchTaxType(e.target.value as TaxMandateType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="VAT_10">إقرار ضريبة القيمة المضافة الشهري (نموذج 10)</option>
                  <option value="WHT_41">نموذج 41 خصم وتحصيل ربع سنوي</option>
                  <option value="PAYROLL_4">نموذج 4 كسب عمل ومرتبات ربع سنوي</option>
                  <option value="INCOME_27_CORP">إقرار ضريبة الدخل السنوي للشركات</option>
                  <option value="ANNUAL_PAYROLL">التسوية السنوية لضريبة كسب العمل</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفترة الضريبية</label>
                  <input
                    type="text"
                    required
                    value={batchPeriodName}
                    onChange={(e) => setBatchPeriodName(e.target.value)}
                    placeholder="مثال: شهر مارس 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">السنة الضريبية</label>
                  <input
                    type="number"
                    required
                    value={batchYear}
                    onChange={(e) => setBatchYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق القانوني</label>
                <input
                  type="date"
                  required
                  value={batchDeadline}
                  onChange={(e) => setBatchDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>توليد التكليفات للجميع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Status / Mark as Submitted or Paid */}
      {isStatusUpdateModalOpen && selectedMandateForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">تحديث حالة ومرحلة التكليف الضريبي</h4>
              </div>
              <button
                onClick={() => setIsStatusUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-xs">{selectedMandateForAction.mandateTitle}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {selectedMandateForAction.clientName} • {selectedMandateForAction.periodName}
              </span>
            </div>

            <form onSubmit={handleStatusUpdateSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الحالة / المرحلة الجديدة *</label>
                <select
                  value={newTargetStatus}
                  onChange={(e) => setNewTargetStatus(e.target.value as TaxMandateStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="NOT_STARTED">1. لم يبدأ بعد ⚪</option>
                  <option value="COLLECTING_DOCS">2. جمع المستندات والفواتير 📥</option>
                  <option value="RECONCILING">3. المطابقة والفحص والفاتورة الإلكترونية ⚖️</option>
                  <option value="READY_TO_SUBMIT">4. جاهز للرفع والاعتماد 🚀</option>
                  <option value="SUBMITTED">5. تم التقديم بالبوابة الرسمية 📑</option>
                  <option value="PAID">6. تم السداد وإصدار الإيصال ✅</option>
                </select>
              </div>

              {(newTargetStatus === 'SUBMITTED' || newTargetStatus === 'PAID') && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الإشعار / المرجع ببوابة الضرائب (ETA Ref)</label>
                  <input
                    type="text"
                    value={etaRefInput}
                    onChange={(e) => setEtaRefInput(e.target.value)}
                    placeholder="مثال: ETA-SUB-2026-981240"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              )}

              {newTargetStatus === 'PAID' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم إيصال السداد البنكي / الحكومي</label>
                  <input
                    type="text"
                    value={receiptNoInput}
                    onChange={(e) => setReceiptNoInput(e.target.value)}
                    placeholder="مثال: REC-NBE-849201"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">الضريبة الفعلية المسددة / المستحقة (ج.م)</label>
                <input
                  type="number"
                  value={actualTaxInput || ''}
                  onChange={(e) => setActualTaxInput(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات التنفيذ</label>
                <input
                  type="text"
                  value={actionNotesInput}
                  onChange={(e) => setActionNotesInput(e.target.value)}
                  placeholder="ملاحظات المراجع أو المحاسب..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusUpdateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد التحديث</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
