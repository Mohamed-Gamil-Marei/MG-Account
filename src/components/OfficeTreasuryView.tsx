import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Coins,
  Building2,
  Calendar,
  Layers,
  Printer,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { OfficeTreasuryTransaction, ClientArchiveRecord } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { QuickRowActionDropdown } from './common/QuickRowActionDropdown';
import { DirectWhatsAppProcedureModal } from './common/DirectWhatsAppProcedureModal';

interface OfficeTreasuryViewProps {
  state: DatabaseState;
}

export const OfficeTreasuryView: React.FC<OfficeTreasuryViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<OfficeTreasuryTransaction | null>(null);
  const [whatsAppTx, setWhatsAppTx] = useState<OfficeTreasuryTransaction | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'INCOME_FEES' as OfficeTreasuryTransaction['type'],
    amount: 0,
    category: 'أتعاب مراجعة وتدقيق قوائم مالية سنوية',
    description: '',
    paymentMethod: 'CASH' as OfficeTreasuryTransaction['paymentMethod'],
    clientId: '',
    clientName: '',
    procedureId: '',
    procedureTitle: '',
  });

  const totalIncome = state.treasuryTransactions
    .filter((t) => t.type === 'INCOME_FEES')
    .reduce((s, t) => s + t.amount, 0);

  const totalGovFeesPaid = state.treasuryTransactions
    .filter((t) => t.type === 'EXPENSE_CLIENT_GOV_FEE')
    .reduce((s, t) => s + t.amount, 0);

  const totalOfficeExpenses = state.treasuryTransactions
    .filter((t) => t.type === 'EXPENSE_OFFICE')
    .reduce((s, t) => s + t.amount, 0);

  const totalPartnerDrawings = state.treasuryTransactions
    .filter((t) => t.type === 'PARTNER_DRAWINGS')
    .reduce((s, t) => s + t.amount, 0);

  const netCashBalance = totalIncome - totalGovFeesPaid - totalOfficeExpenses - totalPartnerDrawings;

  const filteredTransactions = (state.treasuryTransactions || []).filter((tx) => {
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesSearch =
      (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.clientName && tx.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.procedureTitle && tx.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.voucherNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const selectedClientRecord = state.clients.find((c) => c.id === formData.clientId);
  const clientProcedures = selectedClientRecord?.procedures || [];

  const handleClientSelectChange = (clientId: string) => {
    const cl = state.clients.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      clientId,
      clientName: cl ? cl.name : '',
      procedureId: '',
      procedureTitle: '',
    });
  };

  const handleProcedureSelectChange = (procedureId: string) => {
    const prc = clientProcedures.find((p) => p.id === procedureId);
    setFormData({
      ...formData,
      procedureId,
      procedureTitle: prc ? prc.title : '',
      category: prc ? (formData.type === 'INCOME_FEES' ? `أتعاب: ${prc.title}` : `رسوم: ${prc.title}`) : formData.category,
      description: prc ? `مرتبط بالإجراء [${prc.title}] - كود [${prc.procedureCode}]` : formData.description,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const selectedClient = state.clients.find((c) => c.id === formData.clientId);

    db.addTreasuryTransaction({
      date: formData.date,
      type: formData.type,
      amount: Number(formData.amount),
      category: formData.category,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
      clientId: formData.clientId || undefined,
      clientName: selectedClient ? selectedClient.name : formData.clientName || undefined,
      procedureId: formData.procedureId || undefined,
      procedureTitle: formData.procedureTitle || undefined,
      recordedBy: state.officeProfile.auditorName || 'محمد جميل مرعي',
    });

    // If linked to a procedure, update that procedure's collected fee / gov expense in state
    if (formData.clientId && formData.procedureId) {
      if (formData.type === 'INCOME_FEES') {
        db.updateClientProcedure(formData.clientId, formData.procedureId, {}, {
          addFeeCollected: Number(formData.amount),
          feePaymentMethod: formData.paymentMethod,
        });
      } else if (formData.type === 'EXPENSE_CLIENT_GOV_FEE') {
        db.updateClientProcedure(formData.clientId, formData.procedureId, {}, {
          addGovFeePaid: Number(formData.amount),
          govFeePaymentMethod: formData.paymentMethod,
        });
      }
    }

    setIsAddModalOpen(false);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      type: 'INCOME_FEES',
      amount: 0,
      category: 'أتعاب مراجعة وتدقيق قوائم مالية سنوية',
      description: '',
      paymentMethod: 'CASH',
      clientId: '',
      clientName: '',
      procedureId: '',
      procedureTitle: '',
    });
  };

  return (
    <>
      <UnifiedScreenCard
      title="خزنة أعمال وحسابات المكتب"
      description="إدارة النقدية والسيولة، تحصيل الأتعاب، وسداد الرسوم الحكومية"
      icon={Wallet}
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          <ScreenActionToolbar
            modelType="TREASURY"
            title="سجلات حركة خزنة المكتب"
            count={filteredTransactions.length}
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            id="btn-add-treasury-tx"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>حركة خزنة جديدة</span>
          </button>
        </div>
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="بحث برقم السند، اسم العميل، الإجراء، أو البيان..."
      filterTabs={[
        { id: 'ALL', label: `كافة الحركات (${state.treasuryTransactions.length})` },
        { id: 'INCOME_FEES', label: 'مقبوضات أتعاب' },
        { id: 'EXPENSE_CLIENT_GOV_FEE', label: 'رسوم عملاء حكومية' },
        { id: 'EXPENSE_OFFICE', label: 'مصروفات المكتب' },
        { id: 'PARTNER_DRAWINGS', label: 'مسحوبات الشركاء' },
      ]}
      activeFilterTab={filterType}
      onFilterTabChange={setFilterType}
    >
      <div className="space-y-4">
        {/* KPI Row Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-emerald-700 text-[11px] block">إجمالي المقبوضات</span>
              <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">
                {formatEgyptianCurrency(totalIncome)}
              </span>
            </div>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-rose-700 text-[11px] block">رسوم حكومية</span>
              <span className="text-base font-black text-rose-900 font-mono mt-0.5 block">
                {formatEgyptianCurrency(totalGovFeesPaid)}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-600 text-[11px] block">مصروفات التشغيل</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                {formatEgyptianCurrency(totalOfficeExpenses)}
              </span>
            </div>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>

          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-purple-700 text-[11px] block">مسحوبات الشركاء</span>
              <span className="text-base font-black text-purple-900 font-mono mt-0.5 block">
                {formatEgyptianCurrency(totalPartnerDrawings)}
              </span>
            </div>
            <Coins className="w-4 h-4 text-purple-600" />
          </div>

          <div className="col-span-2 lg:col-span-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white p-3 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-amber-100 text-[11px] block">صافي رصيد الخزنة</span>
              <span className="text-base font-black font-mono mt-0.5 block">
                {formatEgyptianCurrency(netCashBalance)}
              </span>
            </div>
            <Wallet className="w-4 h-4 text-amber-200" />
          </div>
        </div>

        {/* Transactions Table - Compact Mode & Zebra Striping */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs accounting-table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-1.5 px-2.5">رقم السند</th>
                  <th className="py-1.5 px-2.5">التاريخ</th>
                  <th className="py-1.5 px-2.5">نوع الحركة</th>
                  <th className="py-1.5 px-2.5">العميل / الإجراء</th>
                  <th className="py-1.5 px-2.5">التصنيف</th>
                  <th className="py-1.5 px-2.5">طريقة الدفع</th>
                  <th className="py-1.5 px-2.5 text-left">المبلغ</th>
                  <th className="py-1.5 px-2.5">البيان</th>
                  <th className="py-1.5 px-2.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-mono font-bold text-amber-900 dark:text-amber-400">
                      {tx.voucherNumber}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">{tx.date}</td>
                    <td className="py-1.5 px-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.type === 'INCOME_FEES'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : tx.type === 'EXPENSE_CLIENT_GOV_FEE'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : tx.type === 'EXPENSE_OFFICE'
                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                        }`}
                      >
                        {tx.type === 'INCOME_FEES'
                          ? '📥 أتعاب'
                          : tx.type === 'EXPENSE_CLIENT_GOV_FEE'
                          ? '📤 رسوم عميل'
                          : tx.type === 'EXPENSE_OFFICE'
                          ? '🏢 تشغيل'
                          : '💼 مسحوبات'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5">
                      {tx.clientName ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{tx.clientName}</span>
                          {tx.procedureTitle && (
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                              <Layers className="w-3 h-3" />
                              {tx.procedureTitle}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">عام (بدون عميل)</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-900 dark:text-slate-100">{tx.category}</td>
                    <td className="py-1.5 px-2.5 text-slate-500 dark:text-slate-400">
                      {tx.paymentMethod === 'CASH'
                        ? 'نقدي'
                        : tx.paymentMethod === 'BANK_TRANSFER'
                        ? 'تحويل بنكي'
                        : tx.paymentMethod === 'INSTAPAY'
                        ? 'إنستاباي'
                        : 'شيك'}
                    </td>
                    <td
                      className={`py-1.5 px-2.5 font-mono font-bold text-left text-xs ${
                        tx.type === 'INCOME_FEES' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'INCOME_FEES' ? '+' : '-'} {formatEgyptianCurrency(tx.amount)}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-[180px] truncate">
                      {tx.description || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <QuickRowActionDropdown
                        title="خيارات السند"
                        actions={[
                          {
                            label: 'طباعة سند الخزنة',
                            icon: Printer,
                            variant: 'primary',
                            onClick: () => setSelectedTxForPrint(tx),
                          },
                          {
                            label: 'إرسال إشعار وسند واتساب مباشر',
                            icon: MessageSquare,
                            variant: 'success',
                            onClick: () => setWhatsAppTx(tx),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UnifiedScreenCard>

      {/* Voucher Print Modal */}
      {selectedTxForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-slate-900">سند خزنة رسمي معتمد</h3>
              </div>
              <button
                onClick={() => setSelectedTxForPrint(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Voucher Content */}
            <div id="office-treasury-voucher-print" className="space-y-4 my-4 p-5 bg-slate-50 border border-slate-300 rounded-xl">
              <div className="text-center border-b border-slate-200 pb-3">
                <h4 className="font-bold text-sm text-slate-900">{state.officeProfile.name}</h4>
                <p className="text-[11px] text-slate-600">محاسب قانوني ومراجع حسابات • {state.officeProfile.auditorName}</p>
                <div className="mt-2 inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-bold text-xs">
                  {selectedTxForPrint.type === 'INCOME_FEES' ? 'سند قبض أتعاب مهنية' : 'سند صرف نقدي / بنكي'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">رقم السند:</span>
                  <span className="font-mono font-bold text-slate-900 mr-1">{selectedTxForPrint.voucherNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">التاريخ:</span>
                  <span className="font-mono font-bold text-slate-900 mr-1">{selectedTxForPrint.date}</span>
                </div>
                {selectedTxForPrint.clientName && (
                  <div className="col-span-2">
                    <span className="text-slate-500">العميل / المنشأة:</span>
                    <span className="font-bold text-slate-900 mr-1">{selectedTxForPrint.clientName}</span>
                  </div>
                )}
                {selectedTxForPrint.procedureTitle && (
                  <div className="col-span-2">
                    <span className="text-slate-500">الإجراء المرتبط:</span>
                    <span className="font-bold text-blue-800 mr-1">{selectedTxForPrint.procedureTitle}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-slate-500">طريقة الدفع:</span>
                  <span className="font-bold text-slate-900 mr-1">{selectedTxForPrint.paymentMethod}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>المبلغ بالأرقام:</span>
                  <span className="font-mono text-emerald-800 text-base">{formatEgyptianCurrency(selectedTxForPrint.amount)}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  <span>المبلغ بالحروف: </span>
                  <span className="font-bold text-slate-800">{numberToArabicWords(selectedTxForPrint.amount)}</span>
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <span>البيان: </span>
                  <span className="text-slate-800">{selectedTxForPrint.description || selectedTxForPrint.category}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-3">أمين الخزنة / المحاسب:</span>
                  <span className="font-bold text-slate-800">{selectedTxForPrint.recordedBy || 'محمد جميل مرعي'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-3">اعتماد المحاسب القانوني:</span>
                  <span className="font-bold text-emerald-800">معتمد ومسجل بالسجلات ✅</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 no-print">
              <button
                onClick={() => setSelectedTxForPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => setWhatsAppTx(selectedTxForPrint)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="إرسال سند الخزنة عبر كود الواتساب المباشر"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>إرسال واتساب مباشر</span>
              </button>
              <button
                onClick={() => {
                  const styleId = 'voucher-print-style';
                  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
                  if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                  }
                  styleEl.innerHTML = `
                    @page {
                      size: A4 portrait;
                      margin: 10mm 12mm;
                    }
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #office-treasury-voucher-print, #office-treasury-voucher-print * {
                        visibility: visible !important;
                      }
                      #office-treasury-voucher-print {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 650px !important;
                        margin: 0 auto !important;
                        padding: 24px !important;
                        background: white !important;
                        box-shadow: none !important;
                        border: 2px solid #334155 !important;
                        border-radius: 8px !important;
                      }
                    }
                  `;
                  setTimeout(() => {
                    window.print();
                  }, 120);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل حركة جديدة بخزنة المكتب
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الحركة *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setFormData({
                        ...formData,
                        type: t,
                        category:
                          t === 'INCOME_FEES'
                            ? 'أتعاب مراجعة وتدقيق قوائم مالية سنوية'
                            : t === 'EXPENSE_CLIENT_GOV_FEE'
                            ? 'رسوم ومصروفات حكومية لحساب العميل'
                            : t === 'EXPENSE_OFFICE'
                            ? 'إيجار مقر المكتب والفروع'
                            : 'مسحوبات أرباح المحاسب القانوني',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="INCOME_FEES">📥 مقبوضات أتعاب مهنية (إيراد)</option>
                    <option value="EXPENSE_CLIENT_GOV_FEE">📤 سداد رسوم حكومية لحساب عميل (مصروف عميل)</option>
                    <option value="EXPENSE_OFFICE">🏢 مصروفات تشغيلية للمكتب (مصروف مكتب)</option>
                    <option value="PARTNER_DRAWINGS">💼 مسحوبات الشركاء (توزيعات)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الحركة *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder="مثال: 15000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">طريقة السداد / القبض</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMethod: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="CASH">نقدي بالخزينة</option>
                    <option value="BANK_TRANSFER">تحويل بنكي / إيداع</option>
                    <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                    <option value="CHEQUE">شيك بنكي مقبول الدفع</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">العميل المرتبط (اختياري)</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleClientSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">-- بدون ارتباط بعميل (مصروف عام للمكتب) --</option>
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.taxCardNo || 'بدون رقم ضريبي'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Procedure Selector if Client is Selected */}
              {formData.clientId && clientProcedures.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الإجراء / المعاملة من أرشيف العميل</label>
                  <select
                    value={formData.procedureId}
                    onChange={(e) => handleProcedureSelectChange(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900"
                  >
                    <option value="">-- بدون ربط بإجراء محدد --</option>
                    {clientProcedures.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.procedureCode}] {p.title} (أتعاب: {formatEgyptianCurrency(p.agreedFees)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">التصنيف والبند *</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="مثال: أتعاب فحص ضريبي ضريبة القيمة المضافة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البيان والشرح التفصيلي</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات الحركة..."
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  تسجيل الحركة بالخزنة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Direct In-App WhatsApp Procedure Modal */}
      {whatsAppTx && (
        <DirectWhatsAppProcedureModal
          isOpen={Boolean(whatsAppTx)}
          onClose={() => setWhatsAppTx(null)}
          initialContext={{
            procedureType: 'TREASURY_RECEIPT',
            title: `سند خزينة (${whatsAppTx.type === 'INCOME_FEES' ? 'قبض أتعاب' : 'صرف'}) #${whatsAppTx.id}`,
            clientName: whatsAppTx.clientName || 'العميل المستلم',
            referenceCode: whatsAppTx.id,
            amount: whatsAppTx.amount,
            periodOrDate: whatsAppTx.date,
            customNotes: `${whatsAppTx.category} - ${whatsAppTx.description || ''} (طريقة السداد: ${whatsAppTx.paymentMethod})`,
          }}
          state={state}
        />
      )}
    </>
  );
};
