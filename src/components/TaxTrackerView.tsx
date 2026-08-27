import React, { useState } from 'react';
import {
  Percent,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  Building,
  Clock,
  Send,
  CreditCard,
} from 'lucide-react';
import { TaxDeclarationRecord } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface TaxTrackerViewProps {
  state: DatabaseState;
}

export const TaxTrackerView: React.FC<TaxTrackerViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    declarationType: 'VAT_10' as TaxDeclarationRecord['declarationType'],
    period: 'يناير 2026',
    taxYear: 2026,
    dueDate: '2026-02-28',
    salesTaxableAmount: 0,
    vatOutputTax: 0,
    purchasesTaxableAmount: 0,
    vatInputTax: 0,
    netVatPayable: 0,
    grossTaxableIncome: 0,
    netTaxPayable: 0,
    status: 'READY_TO_SUBMIT' as TaxDeclarationRecord['status'],
    notes: '',
  });

  const filteredDeclarations = state.taxDeclarations.filter((t) => {
    const matchesType = selectedType === 'ALL' || t.declarationType === selectedType;
    const matchesSearch =
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.period.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCalculateVat = (sales: number, purchases: number) => {
    const output = sales * 0.14;
    const input = purchases * 0.14;
    const net = Math.max(0, output - input);
    setFormData((prev) => ({
      ...prev,
      salesTaxableAmount: sales,
      vatOutputTax: output,
      purchasesTaxableAmount: purchases,
      vatInputTax: input,
      netVatPayable: net,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = state.clients.find((c) => c.id === formData.clientId);
    if (!client) {
      alert('يرجى اختيار العميل من القائمة');
      return;
    }

    db.addTaxDeclaration({
      clientId: client.id,
      clientName: client.name,
      declarationType: formData.declarationType,
      period: formData.period,
      taxYear: formData.taxYear,
      dueDate: formData.dueDate,
      status: formData.status,
      salesTaxableAmount: formData.salesTaxableAmount,
      vatOutputTax: formData.vatOutputTax,
      purchasesTaxableAmount: formData.purchasesTaxableAmount,
      vatInputTax: formData.vatInputTax,
      netVatPayable: formData.netVatPayable,
      grossTaxableIncome: formData.grossTaxableIncome,
      netTaxPayable: formData.netTaxPayable || formData.netVatPayable,
      notes: formData.notes,
    });

    setIsAddModalOpen(false);
  };

  const handleUpdateStatus = (decl: TaxDeclarationRecord, newStatus: TaxDeclarationRecord['status']) => {
    db.updateTaxDeclaration(decl.id, {
      status: newStatus,
      submissionDate: newStatus === 'SUBMITTED_TO_ETA' || newStatus === 'PAID' ? new Date().toISOString().slice(0, 10) : undefined,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Percent className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">
              منظومة متابعة الإقرارات والالتزامات الضريبية (Tax Tracker)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مواعيد استحقاق نماذج مصلحة الضرائب المصرية (نموذج 10 قيمة مضافة، نموذج 27 شركات، نموذج 4 كسب عمل، ونموذج 41 خصم).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => db.exportTableToExcel('TAXES')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            id="btn-add-tax-declaration"
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل إقرار ضريبي جديد</span>
          </button>
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
            placeholder="بحث باسم الشركة أو الفترة الضريبية..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              selectedType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            كافة النماذج ({state.taxDeclarations.length})
          </button>
          <button
            onClick={() => setSelectedType('VAT_10')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              selectedType === 'VAT_10' ? 'bg-red-800 text-white' : 'bg-red-50 text-red-700'
            }`}
          >
            قيمة مضافة (نم 10)
          </button>
          <button
            onClick={() => setSelectedType('INCOME_27_CORP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              selectedType === 'INCOME_27_CORP' ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-700'
            }`}
          >
            دخل شركات (نم 27)
          </button>
          <button
            onClick={() => setSelectedType('PAYROLL_4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              selectedType === 'PAYROLL_4' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            كسب عمل (نم 4)
          </button>
          <button
            onClick={() => setSelectedType('WHT_41')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              selectedType === 'WHT_41' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-700'
            }`}
          >
            خصم وتحصيل (نم 41)
          </button>
        </div>
      </div>

      {/* Tax Declarations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">النموذج الضريبي</th>
                <th className="py-3 px-4">اسم الشركة / الممول</th>
                <th className="py-3 px-4">الفترة والضريبة</th>
                <th className="py-3 px-4">تاريخ الاستحقاق</th>
                <th className="py-3 px-4 text-left">مبلغ الضريبة (ج.م)</th>
                <th className="py-3 px-4">حالة الإقرار</th>
                <th className="py-3 px-4 text-center">إجراءات المتابعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeclarations.map((decl) => (
                <tr key={decl.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex flex-col gap-0.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-[11px] w-fit">
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
                      <span className="text-[10px] text-slate-400 font-mono">
                        {decl.id.startsWith('tax-') ? `TAX-ETA-${decl.id.slice(4, 12)}` : decl.id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{decl.clientName}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {decl.period} {decl.taxYear}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-red-700">
                    {decl.dueDate}
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-left text-slate-900">
                    {formatEgyptianCurrency(decl.netVatPayable || decl.netTaxPayable || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        decl.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : decl.status === 'SUBMITTED_TO_ETA'
                          ? 'bg-blue-100 text-blue-800'
                          : decl.status === 'READY_TO_SUBMIT'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {decl.status === 'PAID'
                        ? '✓ تم السداد'
                        : decl.status === 'SUBMITTED_TO_ETA'
                        ? 'تم التقديم بالبوابة'
                        : decl.status === 'READY_TO_SUBMIT'
                        ? 'جاهز للتقديم'
                        : 'مسودة'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {decl.status !== 'PAID' && (
                        <button
                          onClick={() => handleUpdateStatus(decl, 'PAID')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          تأكيد السداد
                        </button>
                      )}
                      {decl.status === 'DRAFT' && (
                        <button
                          onClick={() => handleUpdateStatus(decl, 'READY_TO_SUBMIT')}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          اعتماد جاهز
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tax Declaration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل إقرار ضريبي جديد بالمنظومة
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
              <div>
                <label className="block text-slate-700 font-bold mb-1">الشركة / الممول *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="">-- اختر الشركة --</option>
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.taxCardNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الإقرار</label>
                  <select
                    value={formData.declarationType}
                    onChange={(e) =>
                      setFormData({ ...formData, declarationType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="VAT_10">نموذج 10 (ضريبة القيمة المضافة)</option>
                    <option value="INCOME_27_CORP">نموذج 27 (إقرار دخل الشركات)</option>
                    <option value="PAYROLL_4">نموذج 4 (ضريبة كسب العمل والرواتب)</option>
                    <option value="WHT_41">نموذج 41 (ضريبة الخصم والتحصيل أ.ت.ص)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفترة الضريبية</label>
                  <input
                    type="text"
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="مثال: يناير 2026 أو الربع الأول"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق القانوني</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">حالة الإقرار</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900"
                  >
                    <option value="READY_TO_SUBMIT">جاهز للتقديم بالبوابة</option>
                    <option value="SUBMITTED_TO_ETA">تم التقديم</option>
                    <option value="PAID">تم السداد</option>
                    <option value="DRAFT">مسودة</option>
                  </select>
                </div>
              </div>

              {/* Specific VAT fields */}
              {formData.declarationType === 'VAT_10' && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                  <div className="font-bold text-red-950">بيانات احتساب ضريبة القيمة المضافة 14%:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-medium">مبيعات خاضعة (ج.م)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.salesTaxableAmount || ''}
                        onChange={(e) =>
                          handleCalculateVat(Number(e.target.value), formData.purchasesTaxableAmount)
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium">مشتريات ومدخلات (ج.م)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.purchasesTaxableAmount || ''}
                        onChange={(e) =>
                          handleCalculateVat(formData.salesTaxableAmount, Number(e.target.value))
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-red-900 pt-1 border-t border-red-200">
                    <span>صافي الضريبة واجبة السداد (14%):</span>
                    <span className="font-mono">{formatEgyptianCurrency(formData.netVatPayable)}</span>
                  </div>
                </div>
              )}

              {formData.declarationType !== 'VAT_10' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ الضريبة الإجمالي (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.netTaxPayable || ''}
                    onChange={(e) => setFormData({ ...formData, netTaxPayable: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              )}

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
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  حفظ الإقرار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
