import React, { useState } from 'react';
import {
  Percent,
  Plus,
  Calendar,
  Clock,
  Send,
  Printer,
  FileText,
  MessageSquare,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { TaxDeclarationRecord, ClientArchiveRecord } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { TaxMandateScheduler } from './TaxMandateScheduler';
import { EgyptianTaxDeclarationPdfModal } from './EgyptianTaxDeclarationPdfModal';
import { ClientNotificationModal } from './ClientNotificationModal';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { QuickRowActionDropdown } from './common/QuickRowActionDropdown';
import { TaxAppealsDefenseView } from './tax/TaxAppealsDefenseView';

interface TaxTrackerViewProps {
  state: DatabaseState;
}

export const TaxTrackerView: React.FC<TaxTrackerViewProps> = ({ state }) => {
  const [activeMainTab, setActiveMainTab] = useState<'SCHEDULER' | 'DECLARATIONS' | 'APPEALS_DEFENSE'>('SCHEDULER');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedDeclForPdf, setSelectedDeclForPdf] = useState<TaxDeclarationRecord | null>(null);

  // Notification Modal State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTargetClient, setNotifyTargetClient] = useState<ClientArchiveRecord | null>(null);
  const [notifyTargetDecl, setNotifyTargetDecl] = useState<TaxDeclarationRecord | null>(null);

  const activeClient = state.activeClientContext;
  const isClientAutoFilterOn = activeClient?.autoFilterAccountingData && activeClient?.clientId;

  // Form State
  const [formData, setFormData] = useState({
    clientId: activeClient?.clientId || '',
    declarationType: 'VAT_10' as TaxDeclarationRecord['declarationType'],
    period: 'يناير 2026',
    taxYear: 2026,
    dueDate: '2026-02-28',
    salesTaxableAmount: 0,
    vatOutputTax: 0,
    purchasesTaxableAmount: 0,
    vatInputTax: 0,
    netVatPayable: 0,
    netTaxPayable: 0,
    status: 'DRAFT' as TaxDeclarationRecord['status'],
    notes: '',
  });

  const filteredDeclarations = state.taxDeclarations.filter((decl) => {
    if (isClientAutoFilterOn && decl.clientId !== activeClient.clientId) {
      return false;
    }
    const matchesType = selectedType === 'ALL' || decl.declarationType === selectedType;
    const q = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (decl.clientName || '').toLowerCase().includes(q) ||
      (decl.period || '').toLowerCase().includes(q) ||
      (decl.id || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const handleCreateDeclaration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('يرجى اختيار العميل');
      return;
    }

    const client = state.clients.find((c) => c.id === formData.clientId);
    const clientName = client ? client.name : 'عميل غير مسجل';

    db.addTaxDeclaration({
      clientId: formData.clientId,
      clientName,
      declarationType: formData.declarationType,
      period: formData.period,
      taxYear: Number(formData.taxYear) || 2026,
      dueDate: formData.dueDate,
      salesTaxableAmount: Number(formData.salesTaxableAmount) || 0,
      vatOutputTax: Number(formData.vatOutputTax) || 0,
      purchasesTaxableAmount: Number(formData.purchasesTaxableAmount) || 0,
      vatInputTax: Number(formData.vatInputTax) || 0,
      netVatPayable:
        formData.declarationType === 'VAT_10'
          ? Number(formData.vatOutputTax) - Number(formData.vatInputTax)
          : undefined,
      netTaxPayable:
        formData.declarationType !== 'VAT_10' ? Number(formData.netTaxPayable) : undefined,
      status: formData.status,
      notes: formData.notes,
    });

    setIsAddModalOpen(false);
  };

  const handleUpdateStatus = (id: string, newStatus: TaxDeclarationRecord['status']) => {
    db.updateTaxDeclaration(id, { status: newStatus });
  };

  const filterTabs = [
    { id: 'ALL', label: 'كافة النماذج' },
    { id: 'VAT_10', label: 'قيمة مضافة (10)' },
    { id: 'INCOME_27_CORP', label: 'دخل شركات (27)' },
    { id: 'PAYROLL_4', label: 'كسب عمل (4)' },
    { id: 'WHT_41', label: 'خصم وتحصيل (41)' },
  ];

  return (
    <>
      <UnifiedScreenCard
        id="tax-tracker-card"
        title="الإقرارات والالتزامات الضريبية (ETA)"
        subtitle="متابعة استحقاق نماذج مصلحة الضرائب المصرية ومنظومة الفاتورة والإيصال الإلكتروني"
        icon={Percent}
        badge={`${state.taxDeclarations.length} إقرار مسجل`}
        badgeVariant="amber"
        headerControls={
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveMainTab('SCHEDULER')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'SCHEDULER'
                  ? 'bg-white dark:bg-slate-900 text-red-900 dark:text-red-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              الجدول الزمني الذكي
            </button>
            <button
              onClick={() => setActiveMainTab('DECLARATIONS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'DECLARATIONS'
                  ? 'bg-white dark:bg-slate-900 text-red-900 dark:text-red-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              سجل النماذج ({state.taxDeclarations.length})
            </button>
            <button
              onClick={() => setActiveMainTab('APPEALS_DEFENSE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'APPEALS_DEFENSE'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              مساعد الطعون ومذكرات الدفاع (نماذج 19 و 15)
            </button>
          </div>
        }
        primaryAction={
          activeMainTab === 'DECLARATIONS'
            ? {
                id: 'btn-add-tax-decl-main',
                label: 'إقرار جديد',
                icon: Plus,
                onClick: () => setIsAddModalOpen(true),
              }
            : undefined
        }
        actionsDropdown={{
          label: 'إجراءات الضرائب',
          items: [
            {
              id: 'btn-export-official-pdf',
              label: 'تصدير إقرار ضريبي (PDF)',
              icon: Printer,
              onClick: () => {
                setSelectedDeclForPdf(null);
                setIsPdfModalOpen(true);
              },
            },
            {
              id: 'btn-add-decl-dropdown',
              label: 'تسجيل إقرار ضريبي جديد',
              icon: Plus,
              onClick: () => setIsAddModalOpen(true),
            },
            {
              isDivider: true,
              label: '',
            },
            {
              id: 'btn-print-tax-page',
              label: 'طباعة الكشف الحالي',
              icon: Printer,
              onClick: () => window.print(),
            },
          ],
        }}
        searchTerm={activeMainTab === 'DECLARATIONS' ? searchTerm : undefined}
        onSearchChange={activeMainTab === 'DECLARATIONS' ? setSearchTerm : undefined}
        searchPlaceholder="بحث بالشركة، الفترة، أو النموذج..."
        filterTabs={activeMainTab === 'DECLARATIONS' ? filterTabs : undefined}
        activeFilterTab={activeMainTab === 'DECLARATIONS' ? selectedType : undefined}
        onFilterTabChange={activeMainTab === 'DECLARATIONS' ? setSelectedType : undefined}
      >
        {/* TAB 1: SCHEDULER */}
        {activeMainTab === 'SCHEDULER' && <TaxMandateScheduler state={state} />}

        {/* TAB 2: DECLARATIONS */}
        {activeMainTab === 'DECLARATIONS' && (
          <div className="space-y-4">
            {/* Declarations Table - Compact Mode & Zebra Striping */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-right border-collapse text-xs accounting-table">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-1.5 px-2.5">النموذج</th>
                    <th className="py-1.5 px-2.5">اسم الشركة / المنشأة</th>
                    <th className="py-1.5 px-2.5">الفترة الضريبية</th>
                    <th className="py-1.5 px-2.5">تاريخ الاستحقاق</th>
                    <th className="py-1.5 px-2.5">الضريبة المستحقة</th>
                    <th className="py-1.5 px-2.5">الحالة</th>
                    <th className="py-1.5 px-2.5 text-center w-16">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDeclarations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        لا توجد إقرارات ضريبية مسجلة مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredDeclarations.map((decl, idx) => (
                      <tr
                        key={decl.id}
                        className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <td className="py-1.5 px-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold">
                            {decl.declarationType === 'VAT_10'
                              ? 'نموذج 10 ق.م'
                              : decl.declarationType === 'INCOME_27_CORP'
                              ? 'نموذج 27 شركات'
                              : decl.declarationType === 'PAYROLL_4'
                              ? 'نموذج 4 كسب عمل'
                              : decl.declarationType === 'WHT_41'
                              ? 'نموذج 41 خصم'
                              : 'إقرار ضريبي'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {decl.clientName}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400 font-medium">
                          {decl.period} {decl.taxYear}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-red-700 dark:text-red-400">
                          {decl.dueDate}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono font-black text-slate-900 dark:text-slate-100">
                          {formatEgyptianCurrency(decl.netVatPayable || decl.netTaxPayable || 0)}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              decl.status === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : decl.status === 'SUBMITTED_TO_ETA'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                : decl.status === 'READY_TO_SUBMIT'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {decl.status === 'PAID'
                              ? '✓ مسدد'
                              : decl.status === 'SUBMITTED_TO_ETA'
                              ? 'تم التقديم'
                              : decl.status === 'READY_TO_SUBMIT'
                              ? 'جاهز'
                              : 'مسودة'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <QuickRowActionDropdown
                            actions={[
                              {
                                label: 'إشعار العميل (WhatsApp)',
                                icon: MessageSquare,
                                variant: 'primary',
                                onClick: () => {
                                  const client = state.clients.find((c) => c.id === decl.clientId) || {
                                    id: decl.clientId,
                                    name: decl.clientName,
                                    clientCode: 'CL',
                                    clientType: 'PRIMARY',
                                    companyType: 'LLC',
                                    commercialRegistrationNo: '',
                                    taxCardNo: '',
                                    taxOffice: '',
                                    incomeTaxFileNo: '',
                                    vatRegistrationNo: '',
                                    socialInsuranceNo: '',
                                    capital: 0,
                                    partners: [],
                                    contactPerson: '',
                                    phone: '',
                                    email: '',
                                    address: '',
                                    documents: [],
                                    createdAt: '',
                                    updatedAt: '',
                                  };
                                  setNotifyTargetClient(client as any);
                                  setNotifyTargetDecl(decl);
                                  setIsNotifyModalOpen(true);
                                },
                              },
                              {
                                label: 'تصدير نموذج الإقرار (PDF)',
                                icon: FileText,
                                onClick: () => {
                                  setSelectedDeclForPdf(decl);
                                  setIsPdfModalOpen(true);
                                },
                              },
                              {
                                label: 'تحديد كـ "جاهز للتقديم"',
                                icon: Clock,
                                onClick: () => handleUpdateStatus(decl.id, 'READY_TO_SUBMIT'),
                              },
                              {
                                label: 'تحديد كـ "تم التقديم للبوابة"',
                                icon: Send,
                                onClick: () => handleUpdateStatus(decl.id, 'SUBMITTED_TO_ETA'),
                              },
                              {
                                label: 'تحديد كـ "تم السداد بنجاح"',
                                icon: Percent,
                                variant: 'success',
                                onClick: () => handleUpdateStatus(decl.id, 'PAID'),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TAX APPEALS & DEFENSE ENGINE */}
        {activeMainTab === 'APPEALS_DEFENSE' && (
          <TaxAppealsDefenseView state={state} />
        )}
      </UnifiedScreenCard>

      {/* Add Tax Declaration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تسجيل إقرار ضريبي جديد
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeclaration} className="space-y-4 my-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الشركة / العميل *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">-- اختر الشركة --</option>
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نوع الإقرار / النموذج</label>
                  <select
                    value={formData.declarationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        declarationType: e.target.value as TaxDeclarationRecord['declarationType'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="VAT_10">نموذج 10 ضريبة القيمة المضافة</option>
                    <option value="INCOME_27_CORP">نموذج 27 إقرار دخل الشركات</option>
                    <option value="PAYROLL_4">نموذج 4 مرتبات وما في حكمها (كسب عمل)</option>
                    <option value="WHT_41">نموذج 41 خصم وتحصيل تحت حساب الضريبة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الفترة الضريبية</label>
                  <input
                    type="text"
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="مثال: يناير 2026 أو الربع الأول"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">سنة الإقرار</label>
                  <input
                    type="number"
                    value={formData.taxYear}
                    onChange={(e) => setFormData({ ...formData, taxYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">تاريخ نهاية المهلة (Due Date)</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {formData.declarationType === 'VAT_10' ? (
                <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ضريبة المخرجات (مبيعات)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.vatOutputTax || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, vatOutputTax: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ضريبة المدخلات (مشتريات)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.vatInputTax || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, vatInputTax: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">صافي الضريبة المستحقة (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.netTaxPayable || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, netTaxPayable: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  حفظ الإقرار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Egyptian Tax Return Form Official PDF Generator Modal */}
      {isPdfModalOpen && (
        <EgyptianTaxDeclarationPdfModal
          state={state}
          selectedDeclaration={selectedDeclForPdf}
          onClose={() => {
            setIsPdfModalOpen(false);
            setSelectedDeclForPdf(null);
          }}
        />
      )}

      {/* Client WhatsApp / Notification Modal */}
      <ClientNotificationModal
        isOpen={isNotifyModalOpen}
        onClose={() => {
          setIsNotifyModalOpen(false);
          setNotifyTargetClient(null);
          setNotifyTargetDecl(null);
        }}
        client={notifyTargetClient}
        taxDeclaration={notifyTargetDecl}
        officeName={state.officeProfile.officeName}
        auditorName={state.officeProfile.auditorName}
      />
    </>
  );
};
