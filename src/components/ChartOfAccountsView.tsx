import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  UploadCloud,
  LayoutList,
  Network,
} from 'lucide-react';
import { Account, AccountCategory, AccountNature } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { computeAccountBalances } from '../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { QuickRowActionDropdown } from './common/QuickRowActionDropdown';

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

  const categories = [
    { id: 'ALL', label: 'كافة الحسابات' },
    { id: 'ASSETS', label: '1. الأصول' },
    { id: 'LIABILITIES', label: '2. الالتزامات' },
    { id: 'EQUITY', label: '3. حقوق الملكية' },
    { id: 'REVENUES', label: '4. الإيرادات' },
    { id: 'EXPENSES', label: '5. المصروفات' },
  ];

  const filteredAccounts = calculatedAccounts.filter((acc) => {
    const matchesCategory = selectedCategory === 'ALL' || acc.category === selectedCategory;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenAdd = (parentAccount?: Account) => {
    if (parentAccount) {
      const childLevel = parentAccount.level + 1;
      const siblings = state.accounts.filter((a) => a.parentId === parentAccount.id);
      const nextSiblingIndex = siblings.length + 1;
      const suggestedCode = `${parentAccount.code}${nextSiblingIndex < 10 ? '0' : ''}${nextSiblingIndex}`;

      setFormData({
        code: suggestedCode,
        name: '',
        category: parentAccount.category,
        nature: parentAccount.nature,
        level: childLevel,
        parentId: parentAccount.id,
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

  const handleSubmitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    if (editingAccount) {
      db.updateAccount(editingAccount.id, {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        nature: formData.nature,
        level: formData.level,
        parentId: formData.parentId || undefined,
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
        parentId: formData.parentId || undefined,
        openingBalanceDebit: Number(formData.openingBalanceDebit) || 0,
        openingBalanceCredit: Number(formData.openingBalanceCredit) || 0,
        description: formData.description,
      });
    }

    setIsAddModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (acc: Account) => {
    const hasChildren = state.accounts.some((a) => a.parentId === acc.id);
    if (hasChildren) {
      alert('لا يمكن حذف هذا الحساب لوجود حسابات فرعية متفرعة منه. يرجى حذف الفروع أولاً.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف الحساب "${acc.name}" (${acc.code})؟`)) {
      db.deleteAccount(acc.id);
    }
  };

  return (
    <>
      <UnifiedScreenCard
        id="chart-of-accounts-card"
        title="دليل وشجرة الحسابات الموحدة"
        subtitle="الهيكل المالي المعتمد وفق معايير المحاسبة المصرية (EAS)"
        icon={FolderTree}
        badge={`${filteredAccounts.length} حساب`}
        badgeVariant="emerald"
        primaryAction={{
          id: 'btn-add-account-main',
          label: 'حساب جديد',
          icon: Plus,
          onClick: () => handleOpenAdd(),
        }}
        actionMenuItems={[
          {
            id: 'btn-toggle-tree-view',
            label: viewMode === 'TREE' ? 'عرض الجدول المفصل' : 'عرض الشجرة الهرمية',
            icon: viewMode === 'TREE' ? LayoutList : Network,
            onClick: () => setViewMode(viewMode === 'TREE' ? 'TABLE' : 'TREE'),
          },
          {
            id: 'btn-add-root-account',
            label: 'إضافة حساب رئيسي',
            icon: Plus,
            onClick: () => handleOpenAdd(),
          },
          {
            isDivider: true,
            label: '',
            onClick: () => {},
          },
          {
            id: 'btn-export-excel-coa',
            label: 'تصدير الدليل (Excel)',
            icon: FileSpreadsheet,
            onClick: () => {
              const csvContent =
                'data:text/csv;charset=utf-8,\uFEFF' +
                'كود الحساب,اسم الحساب,التصنيف,الطبيعة,المستوى,الرصيد الافتتاحي مدين,الرصيد الافتتاحي دائن,الرصيد الحالي\n' +
                filteredAccounts
                  .map(
                    (a) =>
                      `"${a.code}","${a.name}","${a.category}","${a.nature}",${a.level},${a.openingBalanceDebit || 0},${a.openingBalanceCredit || 0},${a.currentBalance || 0}`
                  )
                  .join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `chart_of_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            },
          },
          {
            id: 'btn-print-coa',
            label: 'طباعة الشجرة والدليل',
            icon: Printer,
            onClick: () => window.print(),
          },
        ]}
        headerControls={
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('TREE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'TREE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              شجري
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              جدول
            </button>
          </div>
        }
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث بكود الحساب أو الاسم..."
        filterTabs={categories}
        activeFilterTab={selectedCategory}
        onFilterTabChange={setSelectedCategory}
      >
        {/* Content View - Compact Mode & Zebra Striping */}
        {viewMode === 'TABLE' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-right border-collapse text-xs accounting-table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="py-1.5 px-2.5">كود الحساب</th>
                  <th className="py-1.5 px-2.5">اسم الحساب</th>
                  <th className="py-1.5 px-2.5">التصنيف</th>
                  <th className="py-1.5 px-2.5">الطبيعة</th>
                  <th className="py-1.5 px-2.5">المستوى</th>
                  <th className="py-1.5 px-2.5">افتتاحي</th>
                  <th className="py-1.5 px-2.5">حركة مدين</th>
                  <th className="py-1.5 px-2.5">حركة دائن</th>
                  <th className="py-1.5 px-2.5">الرصيد الختامي</th>
                  <th className="py-1.5 px-2.5 text-center w-16">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                    } ${acc.level === 1 ? 'font-bold' : ''}`}
                  >
                    <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                      {acc.code}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ marginRight: `${(acc.level - 1) * 10}px` }}></span>
                        <span className={acc.level === 1 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {acc.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400">
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
                    <td className="py-1.5 px-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          acc.nature === 'DEBIT'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      م {acc.level}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">
                      {formatEgyptianCurrency(
                        acc.nature === 'DEBIT'
                          ? acc.openingBalanceDebit
                          : acc.openingBalanceCredit
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {formatEgyptianCurrency(acc.movementDebit || 0)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {formatEgyptianCurrency(acc.movementCredit || 0)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatEgyptianCurrency(acc.currentBalance || 0)}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <QuickRowActionDropdown
                        actions={[
                          {
                            label: 'تفريغ حساب فرعي',
                            icon: Plus,
                            variant: 'primary',
                            onClick: () => handleOpenAdd(acc),
                          },
                          {
                            label: 'تعديل الحساب',
                            icon: Edit2,
                            onClick: () => {
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
                            },
                          },
                          {
                            label: 'حذف الحساب',
                            icon: Trash2,
                            variant: 'danger',
                            onClick: () => handleDeleteAccount(acc),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Hierarchical Tree View */
          <div className="space-y-3">
            {filteredAccounts
              .filter((a) => a.level === 1)
              .map((mainAcc) => {
                const childrenL2 = filteredAccounts.filter((a) => a.parentId === mainAcc.id);
                return (
                  <div key={mainAcc.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                    {/* Level 1 Header */}
                    <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-emerald-400 border border-emerald-500/30">
                          {mainAcc.code}
                        </span>
                        <span className="font-bold text-xs sm:text-sm">{mainAcc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-300 font-medium">
                          {mainAcc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                        </span>
                        <QuickRowActionDropdown
                          buttonClassName="text-white bg-slate-800 border-slate-700 hover:bg-slate-700"
                          actions={[
                            {
                              label: 'تفريغ حساب فرعي',
                              icon: Plus,
                              variant: 'primary',
                              onClick: () => handleOpenAdd(mainAcc),
                            },
                            {
                              label: 'تعديل الحساب الرئيسي',
                              icon: Edit2,
                              onClick: () => {
                                setEditingAccount(mainAcc);
                                setFormData({
                                  code: mainAcc.code,
                                  name: mainAcc.name,
                                  category: mainAcc.category,
                                  nature: mainAcc.nature,
                                  level: mainAcc.level,
                                  parentId: mainAcc.parentId || '',
                                  openingBalanceDebit: mainAcc.openingBalanceDebit || 0,
                                  openingBalanceCredit: mainAcc.openingBalanceCredit || 0,
                                  description: mainAcc.description || '',
                                });
                                setIsAddModalOpen(true);
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Children Level 2 */}
                    <div className="p-2.5 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                      {childrenL2.map((l2Acc) => {
                        const childrenL3 = filteredAccounts.filter((a) => a.parentId === l2Acc.id);
                        return (
                          <div key={l2Acc.id} className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  {l2Acc.code}
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{l2Acc.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {formatEgyptianCurrency(l2Acc.currentBalance || 0)}
                                </span>
                                <QuickRowActionDropdown
                                  actions={[
                                    {
                                      label: 'إضافة حساب تحليلي',
                                      icon: Plus,
                                      variant: 'primary',
                                      onClick: () => handleOpenAdd(l2Acc),
                                    },
                                    {
                                      label: 'تعديل الحساب',
                                      icon: Edit2,
                                      onClick: () => {
                                        setEditingAccount(l2Acc);
                                        setFormData({
                                          code: l2Acc.code,
                                          name: l2Acc.name,
                                          category: l2Acc.category,
                                          nature: l2Acc.nature,
                                          level: l2Acc.level,
                                          parentId: l2Acc.parentId || '',
                                          openingBalanceDebit: l2Acc.openingBalanceDebit || 0,
                                          openingBalanceCredit: l2Acc.openingBalanceCredit || 0,
                                          description: l2Acc.description || '',
                                        });
                                        setIsAddModalOpen(true);
                                      },
                                    },
                                    {
                                      label: 'حذف الحساب',
                                      icon: Trash2,
                                      variant: 'danger',
                                      onClick: () => handleDeleteAccount(l2Acc),
                                    },
                                  ]}
                                />
                              </div>
                            </div>

                            {/* Level 3 Analytical Accounts */}
                            {childrenL3.length > 0 && (
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {childrenL3.map((l3Acc) => (
                                  <div
                                    key={l3Acc.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        {l3Acc.code}
                                      </span>
                                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {l3Acc.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                                        {formatEgyptianCurrency(l3Acc.currentBalance || 0)}
                                      </span>
                                      <QuickRowActionDropdown
                                        actions={[
                                          {
                                            label: 'تعديل',
                                            icon: Edit2,
                                            onClick: () => {
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
                                            },
                                          },
                                          {
                                            label: 'حذف',
                                            icon: Trash2,
                                            variant: 'danger',
                                            onClick: () => handleDeleteAccount(l3Acc),
                                          },
                                        ]}
                                      />
                                    </div>
                                  </div>
                                ))}
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
      </UnifiedScreenCard>

      {/* Add / Edit Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingAccount ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد بالدليل'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAccount} className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">كود الحساب *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: 1101"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المستوى المحاسبي</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value={1}>1. رئيسي (أول)</option>
                    <option value={2}>2. عام (ثان)</option>
                    <option value={3}>3. فرعي مساعد (ثالث)</option>
                    <option value={4}>4. تحليلي نهائي (رابع)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم الحساب *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: البنك التجاري الدولي CIB - حساب جاري"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">تبويب القوائم المالية</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AccountCategory })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="ASSETS">الأصول (Assets)</option>
                    <option value="LIABILITIES">الالتزامات (Liabilities)</option>
                    <option value="EQUITY">حقوق الملكية (Equity)</option>
                    <option value="REVENUES">الإيرادات (Revenues)</option>
                    <option value="EXPENSES">المصروفات والتكاليف (Expenses)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">طبيعة الحساب</label>
                  <select
                    value={formData.nature}
                    onChange={(e) =>
                      setFormData({ ...formData, nature: e.target.value as AccountNature })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="DEBIT">مدين بطبيعته (Debit)</option>
                    <option value="CREDIT">دائن بطبيعته (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الحساب الأب (Parent Account)</label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">-- بدون حساب أب (حساب رئيسي) --</option>
                  {state.accounts
                    .filter((a) => !editingAccount || a.id !== editingAccount.id)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} (مستوى {acc.level})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">رصيد افتتاحي مدين (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.openingBalanceDebit}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalanceDebit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">رصيد افتتاحي دائن (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.openingBalanceCredit}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalanceCredit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">شرح وتفاصيل الحساب</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات محاسبية إضافية..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
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
    </>
  );
};
