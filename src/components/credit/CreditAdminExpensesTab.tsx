import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  TrendingDown,
  Percent,
  DollarSign,
  Download,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import * as XLSX from 'xlsx';
import { AccountingNumberInput } from '../common/AccountingNumberInput';

export interface AdminExpenseItem {
  id: string;
  name: string;
  category: string;
  valuesByYear: Record<number, number>;
  isCustom?: boolean;
  notes?: string;
}

export const DEFAULT_ADMIN_EXPENSES: AdminExpenseItem[] = [
  {
    id: 'exp_1',
    name: 'أجور ورواتب ومكافآت العاملين بالإدارة',
    category: 'تكاليف عمالة',
    valuesByYear: { 2024: 450000, 2025: 520000, 2026: 620000 },
  },
  {
    id: 'exp_2',
    name: 'حصة الشركة في التأمينات الاجتماعية',
    category: 'تكاليف عمالة',
    valuesByYear: { 2024: 75000, 2025: 86000, 2026: 102000 },
  },
  {
    id: 'exp_3',
    name: 'بدلات وانتقالات ومصاريف سفر الإدارة',
    category: 'انتقالات وسفر',
    valuesByYear: { 2024: 40000, 2025: 48000, 2026: 58000 },
  },
  {
    id: 'exp_4',
    name: 'إيجار المقرات الإدارية والفروع',
    category: 'إيجارات ومرافق',
    valuesByYear: { 2024: 120000, 2025: 135000, 2026: 150000 },
  },
  {
    id: 'exp_5',
    name: 'صيانة وترميمات ونظافة وأمن وحراسة',
    category: 'خدمات وصيانة',
    valuesByYear: { 2024: 35000, 2025: 42000, 2026: 50000 },
  },
  {
    id: 'exp_6',
    name: 'أتعاب استشارات مهنية وقانونية ومحاسبية ومراجعة',
    category: 'استشارات مهنية',
    valuesByYear: { 2024: 50000, 2025: 60000, 2026: 75000 },
  },
  {
    id: 'exp_7',
    name: 'عمولات ومصروفات بنكية وخدمات مصرفية',
    category: 'مصاريف بنكية',
    valuesByYear: { 2024: 25000, 2025: 30000, 2026: 38000 },
  },
  {
    id: 'exp_8',
    name: 'أدوات كتابية ومطبوعات ومستلزمات مكتبية',
    category: 'مستلزمات إدارية',
    valuesByYear: { 2024: 18000, 2025: 22000, 2026: 28000 },
  },
  {
    id: 'exp_9',
    name: 'كهرباء ومياه وإنارة وغاز المقرات',
    category: 'إيجارات ومرافق',
    valuesByYear: { 2024: 28000, 2025: 34000, 2026: 42000 },
  },
  {
    id: 'exp_10',
    name: 'اتصالات وإنترنت واشتراكات برمجيات وسحابة',
    category: 'تقنية واتصالات',
    valuesByYear: { 2024: 22000, 2025: 28000, 2026: 35000 },
  },
  {
    id: 'exp_11',
    name: 'ضيافة وبوفيه واستقبال عملاء ووفود',
    category: 'مصروفات عامة',
    valuesByYear: { 2024: 15000, 2025: 18000, 2026: 22000 },
  },
  {
    id: 'exp_12',
    name: 'ضرائب عقارية ورسوم وتراخيص حكومية واشتراكات غرف',
    category: 'رسوم حكومية',
    valuesByYear: { 2024: 20000, 2025: 24000, 2026: 30000 },
  },
  {
    id: 'exp_13',
    name: 'مصروفات إدارية وعمومية أخرى متنوعة',
    category: 'مصروفات عامة',
    valuesByYear: { 2024: 30000, 2025: 35000, 2026: 45000 },
  },
];

interface CreditAdminExpensesTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  expenseItems: AdminExpenseItem[];
  onUpdateExpenseItems: (items: AdminExpenseItem[]) => void;
  onResetExpenses?: () => void;
}

export const CreditAdminExpensesTab: React.FC<CreditAdminExpensesTabProps> = ({
  yearsList,
  computedData,
  expenseItems,
  onUpdateExpenseItems,
  onResetExpenses,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(
    yearsList[yearsList.length - 1] || 2026
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('مصروفات عامة');
  const [newItemBaseAmount, setNewItemBaseAmount] = useState<number>(30000);
  const [newItemNotes, setNewItemNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Calculate annual totals
  const totalExpensesByYear = yearsList.reduce((acc, yr) => {
    const total = expenseItems.reduce((sum, item) => sum + (item.valuesByYear[yr] || 0), 0);
    return { ...acc, [yr]: total };
  }, {} as Record<number, number>);

  // Add new Expense Item
  const handleAddExpenseItem = () => {
    if (!newItemName.trim()) return;

    const newId = `admin_exp_${Date.now()}`;
    const valuesByYear: Record<number, number> = {};

    yearsList.forEach((yr, idx) => {
      // Small automated growth factor based on position
      const factor = 1 + (idx - (yearsList.length - 1)) * 0.12;
      valuesByYear[yr] = Math.round(newItemBaseAmount * Math.max(0.4, factor));
    });

    const newItem: AdminExpenseItem = {
      id: newId,
      name: newItemName.trim(),
      category: newItemCategory.trim() || 'مصروفات عامة',
      valuesByYear,
      isCustom: true,
      notes: newItemNotes.trim(),
    };

    onUpdateExpenseItems([...expenseItems, newItem]);
    setNewItemName('');
    setNewItemCategory('مصروفات عامة');
    setNewItemBaseAmount(30000);
    setNewItemNotes('');
    setIsAddingNew(false);
  };

  // Delete Expense Item
  const handleDeleteItem = (id: string) => {
    const updated = expenseItems.filter((i) => i.id !== id);
    onUpdateExpenseItems(updated);
  };

  // Update specific year value
  const handleUpdateItemValue = (id: string, yr: number, val: number) => {
    const updated = expenseItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          valuesByYear: {
            ...item.valuesByYear,
            [yr]: val,
          },
        };
      }
      return item;
    });
    onUpdateExpenseItems(updated);
  };

  // Start editing item metadata
  const handleStartEdit = (item: AdminExpenseItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
  };

  // Save edit item metadata
  const handleSaveEdit = (id: string) => {
    const updated = expenseItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: editName.trim() || item.name,
          category: editCategory.trim() || item.category,
        };
      }
      return item;
    });
    onUpdateExpenseItems(updated);
    setEditingId(null);
  };

  // Export G&A Expenses Schedule to Excel
  const handleExportExpensesExcel = () => {
    const wb = XLSX.utils.book_new();

    const rows = expenseItems.map((item, idx) => {
      const rowData: Record<string, any> = {
        'م': idx + 1,
        'بند المصروف الإداري والعمومي': item.name,
        'التصنيف النوعي': item.category,
      };

      yearsList.forEach((yr) => {
        const val = item.valuesByYear[yr] || 0;
        const sales = computedData[yr]?.sales || 1;
        const ratio = ((val / sales) * 100).toFixed(2) + '%';
        rowData[`مبلغ سنة ${yr} (ج.م)`] = val;
        rowData[`نسبة سنة ${yr} من المبيعات`] = ratio;
      });

      return rowData;
    });

    // Add Totals row
    const totalsRow: Record<string, any> = {
      'م': 'الإجمالي',
      'بند المصروف الإداري والعمومي': 'إجمالي المصروفات الإدارية والعمومية',
      'التصنيف النوعي': 'المجموع العام',
    };
    yearsList.forEach((yr) => {
      const tot = totalExpensesByYear[yr] || 0;
      const sales = computedData[yr]?.sales || 1;
      const ratio = ((tot / sales) * 100).toFixed(2) + '%';
      totalsRow[`مبلغ سنة ${yr} (ج.م)`] = tot;
      totalsRow[`نسبة سنة ${yr} من المبيعات`] = ratio;
    });
    rows.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات الإدارية والعمومية');
    XLSX.writeFile(wb, `جدول_المصروفات_الإدارية_والعمومية_${selectedYear}.xlsx`);
  };

  const currentYearSales = computedData[selectedYear]?.sales || 10000000;
  const currentYearTotalExp = totalExpensesByYear[selectedYear] || 0;
  const currentYearExpRatio = ((currentYearTotalExp / currentYearSales) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                جدول المصروفات الإدارية والعمومية المقارن (G&A Expenses Schedule)
              </h2>
              <p className="text-xs text-slate-500">
                جدول قابل للتخصيص الكامل لحساب وتحليل بنود المصاريف الإدارية والعمالة وترحيل إجماليها مباشرة إلى قائمة الدخل.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة بند مصروف جديد
          </button>

          <button
            type="button"
            onClick={handleExportExpensesExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير جدول المصاريف (Excel)
          </button>

          {onResetExpenses && (
            <button
              type="button"
              onClick={onResetExpenses}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="استعادة البنود القياسية الافتراضية"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              استعادة الافتراضي
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            إجمالي المصروفات الإدارية لسنة {selectedYear}:
          </span>
          <div className="text-xl font-black text-indigo-900 font-mono mt-1">
            {formatEgyptianCurrency(currentYearTotalExp)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            مرحل تلقائياً إلى قائمة الدخل
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            نسبة المصروفات الإدارية من المبيعات ({selectedYear}):
          </span>
          <div className="text-xl font-black text-blue-700 font-mono mt-1">
            %{currentYearExpRatio}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            مقارنة بمبيعات قدرها {formatEgyptianCurrency(currentYearSales)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            عدد بنود المصروفات المعتمدة:
          </span>
          <div className="text-xl font-black text-slate-800 font-mono mt-1">
            {expenseItems.length} بنداً تفصيلياً
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            تحديث فوري ومباشر في كافة القوائم
          </span>
        </div>
      </div>

      {/* Add New Expense Modal */}
      {isAddingNew && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-700" />
              إضافة بند مصروفات إدارية وعمومية مخصص
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                اسم بند المصروف:
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="مثال: اشتراكات تراخيص برمجية دورية"
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                التصنيف النوعي:
              </label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="تكاليف عمالة">تكاليف عمالة وأجور</option>
                <option value="إيجارات ومرافق">إيجارات ومرافق وخدمات</option>
                <option value="انتقالات وسفر">انتقالات وسفر وبدلات</option>
                <option value="استشارات مهنية">استشارات مهنية وقانونية</option>
                <option value="مصاريف بنكية">مصاريف وعمولات بنكية</option>
                <option value="تقنية واتصالات">تقنية واتصالات وبرمجيات</option>
                <option value="رسوم حكومية">رسوم حكومية وتراخيص</option>
                <option value="مصروفات عامة">مصروفات عامة وإدارية أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                المبلغ التقديري الأساسي (ج.م) [يقبل كسور وسالب]:
              </label>
              <AccountingNumberInput
                value={newItemBaseAmount}
                onChange={(val) => setNewItemBaseAmount(val)}
                allowNegative={true}
                allowDecimals={true}
                decimalPlaces={2}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAddExpenseItem}
              className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              حفظ وإدراج البند
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-700" />
            بيان وتفصيل المصروفات الإدارية والعمومية للسنوات المالية المقارنة
          </h3>
          <span className="text-xs text-slate-500">
            يمكنك تعديل أي قيمة مباشرة داخل خلايا الجدول لتحديث القوائم المالية فوراً
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">م</th>
                <th className="py-3 px-4 min-w-[220px]">بند المصروف الإداري والعمومي</th>
                <th className="py-3 px-3 min-w-[120px]">التصنيف النوعي</th>
                {yearsList.map((yr) => (
                  <th key={yr} className="py-3 px-3 min-w-[140px] text-center bg-blue-50/50">
                    مبلغ {yr} (ج.م)
                  </th>
                ))}
                <th className="py-3 px-3 w-20 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseItems.map((item, idx) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs font-bold border border-indigo-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.isCustom && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                              مخصص
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white outline-none"
                        />
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                          {item.category}
                        </span>
                      )}
                    </td>

                    {/* Years values */}
                    {yearsList.map((yr) => {
                      const val = item.valuesByYear[yr] || 0;
                      return (
                        <td key={yr} className="py-2.5 px-3 text-center">
                          <AccountingNumberInput
                            value={val}
                            onChange={(newVal) => handleUpdateItemValue(item.id, yr, newVal)}
                            allowNegative={true}
                            allowDecimals={true}
                            decimalPlaces={2}
                            className="w-full text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-indigo-300 focus:border-indigo-600 rounded-lg px-2 py-1 outline-none transition-colors"
                          />
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            title="حفظ التعديل"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-slate-100 rounded cursor-pointer"
                            title="تعديل المسمى والتصنيف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          title="حذف هذا البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-indigo-900 text-white font-bold border-t-2 border-indigo-950">
                <td className="py-3 px-3 text-center">∑</td>
                <td className="py-3 px-4 font-black text-sm">
                  إجمالي المصروفات الإدارية والعمومية (المرحل لقائمة الدخل)
                </td>
                <td className="py-3 px-3 text-indigo-200 text-[11px]">
                  المجموع الكلي المعتمد
                </td>
                {yearsList.map((yr) => (
                  <td key={yr} className="py-3 px-3 text-center font-mono font-black text-sm">
                    {formatEgyptianCurrency(totalExpensesByYear[yr] || 0)}
                  </td>
                ))}
                <td className="py-3 px-3 text-center text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
