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
} from 'lucide-react';
import { OfficeTreasuryTransaction, ClientArchiveRecord } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';

interface OfficeTreasuryViewProps {
  state: DatabaseState;
}

export const OfficeTreasuryView: React.FC<OfficeTreasuryViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<OfficeTreasuryTransaction | null>(null);

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

  const filteredTransactions = state.treasuryTransactions.filter((tx) => {
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesSearch =
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.clientName && tx.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.procedureTitle && tx.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase());
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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-700" />
            <h2 className="text-lg font-bold text-slate-900">
              خزنة أعمال وحسابات المكتب المستقلة (Office Treasury)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة النقدية والسيولة، تحصيل أتعاب العمليات وإجراءات الأرشيف، سداد الرسوم والمصروفات الحكومية لحساب العملاء، ومصروفات تشغيل المكتب.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => db.exportTableToExcel('TREASURY')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            id="btn-add-treasury-tx"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل حركة خزنة جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">إجمالي أتعاب المكتب</span>
            <div className="text-lg font-black text-emerald-800 font-mono mt-1">
              {formatEgyptianCurrency(totalIncome)}
            </div>
            <span className="text-[10px] text-emerald-600">إيرادات أتعاب محصلة</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">رسوم حكومية للعملاء</span>
            <div className="text-lg font-black text-rose-800 font-mono mt-1">
              {formatEgyptianCurrency(totalGovFeesPaid)}
            </div>
            <span className="text-[10px] text-rose-600">سداد رسوم ودمغات وسجلات</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">مصروفات تشغيل المكتب</span>
            <div className="text-lg font-black text-slate-800 font-mono mt-1">
              {formatEgyptianCurrency(totalOfficeExpenses)}
            </div>
            <span className="text-[10px] text-slate-500">إيجار، مرتبات، خدمات</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-bold block">مسحوبات الشركاء</span>
            <div className="text-lg font-black text-purple-800 font-mono mt-1">
              {formatEgyptianCurrency(totalPartnerDrawings)}
            </div>
            <span className="text-[10px] text-slate-500">توزيعات نقدية خاصة</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-amber-100 font-bold block text-xs">صافي رصيد الخزنة الفعلي</span>
            <div className="text-lg font-black font-mono mt-1">
              {formatEgyptianCurrency(netCashBalance)}
            </div>
            <span className="text-[10px] text-amber-200">السيولة المتاحة بالمكتب</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم السند، اسم العميل، الإجراء، أو البيان..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            كافة الحركات ({state.treasuryTransactions.length})
          </button>
          <button
            onClick={() => setFilterType('INCOME_FEES')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 cursor-pointer ${
              filterType === 'INCOME_FEES'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            مقبوضات أتعاب
          </button>
          <button
            onClick={() => setFilterType('EXPENSE_CLIENT_GOV_FEE')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 cursor-pointer ${
              filterType === 'EXPENSE_CLIENT_GOV_FEE'
                ? 'bg-rose-800 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            رسوم عملاء حكومية
          </button>
          <button
            onClick={() => setFilterType('EXPENSE_OFFICE')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 cursor-pointer ${
              filterType === 'EXPENSE_OFFICE'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            مصروفات المكتب
          </button>
          <button
            onClick={() => setFilterType('PARTNER_DRAWINGS')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 cursor-pointer ${
              filterType === 'PARTNER_DRAWINGS'
                ? 'bg-purple-800 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            مسحوبات الشركاء
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">رقم السند</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4">العميل / الإجراء المرتبط</th>
                <th className="py-3 px-4">بند الخزنة / التصنيف</th>
                <th className="py-3 px-4">طريقة الدفع</th>
                <th className="py-3 px-4 text-left">المبلغ (ج.م)</th>
                <th className="py-3 px-4">البيان والشرح</th>
                <th className="py-3 px-4 text-center">طباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-900">
                    {tx.voucherNumber}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{tx.date}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'INCOME_FEES'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.type === 'EXPENSE_CLIENT_GOV_FEE'
                          ? 'bg-rose-100 text-rose-800'
                          : tx.type === 'EXPENSE_OFFICE'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {tx.type === 'INCOME_FEES'
                        ? '📥 مقبوضات أتعاب'
                        : tx.type === 'EXPENSE_CLIENT_GOV_FEE'
                        ? '📤 رسوم حكومية لحساب عميل'
                        : tx.type === 'EXPENSE_OFFICE'
                        ? '🏢 مصروف تشغيل مكتب'
                        : '💼 مسحوبات شركاء'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {tx.clientName ? (
                      <div>
                        <span className="font-bold text-slate-900 block">{tx.clientName}</span>
                        {tx.procedureTitle && (
                          <span className="text-[10px] text-blue-700 flex items-center gap-1 mt-0.5">
                            <Layers className="w-3 h-3" />
                            {tx.procedureTitle}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">عام (بدون عميل)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{tx.category}</td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {tx.paymentMethod === 'CASH'
                      ? 'نقدي (خزينة)'
                      : tx.paymentMethod === 'BANK_TRANSFER'
                      ? 'تحويل بنكي'
                      : tx.paymentMethod === 'INSTAPAY'
                      ? 'إنستاباي (InstaPay)'
                      : 'شيك'}
                  </td>
                  <td
                    className={`py-2.5 px-4 font-mono font-bold text-left text-sm ${
                      tx.type === 'INCOME_FEES' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {tx.type === 'INCOME_FEES' ? '+' : '-'} {formatEgyptianCurrency(tx.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                    {tx.description || '-'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => setSelectedTxForPrint(tx)}
                      className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="طباعة سند الخزنة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            <div className="space-y-4 my-4 p-5 bg-slate-50 border border-slate-300 rounded-xl">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedTxForPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  window.print();
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
    </div>
  );
};
