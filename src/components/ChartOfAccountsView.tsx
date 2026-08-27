import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Check,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Account, AccountCategory, AccountNature } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface ChartOfAccountsViewProps {
  state: DatabaseState;
}

export const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TREE' | 'TABLE'>('TREE');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'ASSETS' as AccountCategory,
    nature: 'DEBIT' as AccountNature,
    level: 3,
    parentId: '',
    openingBalanceDebit: 0,
    openingBalanceCredit: 0,
    description: '',
  });

  const calculatedAccounts = computeAccountBalances(state.accounts, state.journalEntries);

  const categories: { id: string; name: string }[] = [
    { id: 'ALL', name: 'كافة الحسابات (شامل)' },
    { id: 'ASSETS', name: '1. الأصول (متداولة وغير متداولة)' },
    { id: 'LIABILITIES', name: '2. الالتزامات (طويلة وقصيرة الأجل)' },
    { id: 'EQUITY', name: '3. حقوق الملكية ورأس المال' },
    { id: 'REVENUES', name: '4. الإيرادات والمبيعات' },
    { id: 'EXPENSES', name: '5. التكاليف والمصروفات' },
  ];

  const filteredAccounts = calculatedAccounts.filter((acc) => {
    const matchesCategory = selectedCategory === 'ALL' || acc.category === selectedCategory;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const handleOpenAdd = (parent?: Account) => {
    if (parent) {
      const children = state.accounts.filter((a) => a.parentId === parent.id);
      const nextCode = `${parent.code}${children.length + 1}0`;
      setFormData({
        code: nextCode,
        name: '',
        category: parent.category,
        nature: parent.nature,
        level: parent.level + 1,
        parentId: parent.id,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: '',
      });
    } else {
      setFormData({
        code: '',
        name: '',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 3,
        parentId: '',
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: '',
      });
    }
    setEditingAccount(null);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert('يرجى إدخال كود الحساب واسمه بالكامل');
      return;
    }

    if (editingAccount) {
      db.updateAccount(editingAccount.id, {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        nature: formData.nature,
        level: formData.level,
        parentId: formData.parentId || null,
        openingBalanceDebit: Number(formData.openingBalanceDebit) || 0,
        openingBalanceCredit: Number(formData.openingBalanceCredit) || 0,
        description: formData.description,
      });
    } else {
      db.addAccount({
        code: formData.code,
        name: formData.name,
        category: formData.category,
        nature: formData.nature,
        level: formData.level,
        parentId: formData.parentId || null,
        openingBalanceDebit: Number(formData.openingBalanceDebit) || 0,
        openingBalanceCredit: Number(formData.openingBalanceCredit) || 0,
        description: formData.description,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = (acc: Account) => {
    if (acc.isSystem) {
      alert('لا يمكن حذف الحسابات الرئيسية للنظام المحاسبي المصري الموحد.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف الحساب [${acc.code}] ${acc.name}؟`)) {
      db.deleteAccount(acc.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              دليل وشجرة الحسابات المصرية الموحدة
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            هيكل الحسابات الموحد المعتمد في مصر (أصول، التزامات، حقوق ملكية، إيرادات، ومصروفات) مع إمكانية التخصيص الكامل.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('TREE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'TREE'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              العرض الشجري
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض الجدول التفصيلي
            </button>
          </div>

          <button
            onClick={() => db.exportTableToExcel('ACCOUNTS')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            id="btn-add-new-account"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم كود الحساب أو اسم الحساب..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content View */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-3 px-4">كود الحساب</th>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">الطبيعة</th>
                  <th className="py-3 px-4">المستوى</th>
                  <th className="py-3 px-4">الرصيد الافتتاحي</th>
                  <th className="py-3 px-4">حركة مدين</th>
                  <th className="py-3 px-4">حركة دائن</th>
                  <th className="py-3 px-4">الرصيد الختامي الحالي</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      acc.level === 1 ? 'bg-slate-50/60 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span style={{ marginRight: `${(acc.level - 1) * 12}px` }}></span>
                        <span className={acc.level === 1 ? 'text-slate-900 font-bold' : 'text-slate-700'}>
                          {acc.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {acc.category === 'ASSETS'
                        ? 'أصول'
                        : acc.category === 'LIABILITIES'
                        ? 'التزامات'
                        : acc.category === 'EQUITY'
                        ? 'حقوق ملكية'
                        : acc.category === 'REVENUES'
                        ? 'إيرادات'
                        : 'مصروفات'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          acc.nature === 'DEBIT'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">
                      مستوى {acc.level}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {formatEgyptianCurrency(
                        acc.nature === 'DEBIT'
                          ? acc.openingBalanceDebit
                          : acc.openingBalanceCredit
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {formatEgyptianCurrency(acc.movementDebit || 0)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {formatEgyptianCurrency(acc.movementCredit || 0)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {formatEgyptianCurrency(acc.currentBalance || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setFormData({
                              code: acc.code,
                              name: acc.name,
                              category: acc.category,
                              nature: acc.nature,
                              level: acc.level,
                              parentId: acc.parentId || '',
                              openingBalanceDebit: acc.openingBalanceDebit || 0,
                              openingBalanceCredit: acc.openingBalanceCredit || 0,
                              description: acc.description || '',
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100 cursor-pointer"
                          title="تعديل الحساب"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!acc.isSystem && (
                          <button
                            onClick={() => handleDelete(acc)}
                            className="p-1 text-slate-500 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      ) : (
        /* Hierarchical Tree View */
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          {filteredAccounts.filter((a) => a.level === 1).map((mainAcc) => {
            const childrenL2 = filteredAccounts.filter((a) => a.parentId === mainAcc.id);
            return (
              <div key={mainAcc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Level 1 Header */}
                <div className="bg-slate-800 text-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-900/80 px-2.5 py-0.5 rounded text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      {mainAcc.code}
                    </span>
                    <span className="font-bold text-sm">{mainAcc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-300">
                      طبيعة: {mainAcc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                    </span>
                    <button
                      onClick={() => handleOpenAdd(mainAcc)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تفريغ حساب فرعي</span>
                    </button>
                  </div>
                </div>

                {/* Children Level 2 */}
                <div className="p-3 space-y-2 bg-slate-50/50">
                  {childrenL2.map((l2Acc) => {
                    const childrenL3 = filteredAccounts.filter((a) => a.parentId === l2Acc.id);
                    return (
                      <div key={l2Acc.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {l2Acc.code}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{l2Acc.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAdd(l2Acc)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>إضافة حساب تحليلي</span>
                            </button>
                          </div>
                        </div>

                        {/* Level 3 Analytical Accounts */}
                        {childrenL3.length > 0 ? (
                          <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {childrenL3.map((l3Acc) => (
                              <div
                                key={l3Acc.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold text-slate-600">
                                      {l3Acc.code}
                                    </span>
                                    <span className="text-xs font-medium text-slate-800">
                                      {l3Acc.name}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900">
                                    {formatEgyptianCurrency(l3Acc.currentBalance || 0)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingAccount(l3Acc);
                                      setFormData({
                                        code: l3Acc.code,
                                        name: l3Acc.name,
                                        category: l3Acc.category,
                                        nature: l3Acc.nature,
                                        level: l3Acc.level,
                                        parentId: l3Acc.parentId || '',
                                        openingBalanceDebit: l3Acc.openingBalanceDebit || 0,
                                        openingBalanceCredit: l3Acc.openingBalanceCredit || 0,
                                        description: l3Acc.description || '',
                                      });
                                      setIsAddModalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 py-1 italic">
                            لا توجد حسابات فرعية مندرجة حتى الآن.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingAccount ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد إلى دليل الحسابات'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كود الحساب المحاسبي *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: 1210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الحساب باللغة العربية *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: البنك التجاري الدولي جاري"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التصنيف المحاسبي</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AccountCategory })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="ASSETS">1. الأصول</option>
                    <option value="LIABILITIES">2. الالتزامات</option>
                    <option value="EQUITY">3. حقوق الملكية</option>
                    <option value="REVENUES">4. الإيرادات</option>
                    <option value="EXPENSES">5. المصروفات والتكاليف</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">طبيعة الحساب</label>
                  <select
                    value={formData.nature}
                    onChange={(e) =>
                      setFormData({ ...formData, nature: e.target.value as AccountNature })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="DEBIT">مدين (Debit)</option>
                    <option value="CREDIT">دائن (Credit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رصيد افتتاحي مدين (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.openingBalanceDebit}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalanceDebit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رصيد افتتاحي دائن (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.openingBalanceCredit}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalanceCredit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شرح وتفاصيل الحساب</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات محاسبية إضافية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
