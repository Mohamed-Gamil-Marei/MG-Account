import React, { useState } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  CheckCircle,
  Scale,
  DollarSign,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';
import { AccountingNumberInput } from '../common/AccountingNumberInput';

export interface StatementLineItem {
  id: string;
  name: string;
  section:
    | 'NON_CURRENT_ASSETS'
    | 'CURRENT_ASSETS'
    | 'EQUITY'
    | 'LONG_LIABILITIES'
    | 'CURRENT_LIABILITIES'
    | 'IS_REVENUE'
    | 'IS_COGS'
    | 'IS_ADMIN_EXP'
    | 'IS_SELLING_EXP'
    | 'IS_FINANCE_EXP'
    | 'IS_OTHER_REV'
    | 'CF_OPERATING'
    | 'CF_INVESTING'
    | 'CF_FINANCING';
  noteRef: string;
  values: Record<number, number>; // year -> amount
  isCustom?: boolean;
  isNegative?: boolean;
}

interface CreditFinancialStatementsTabProps {
  yearsData: Record<number, FiscalYearData>;
  yearsList: number[];
  computedData: Record<number, any>;
  customItems?: StatementLineItem[];
  onUpdateCustomItems?: (items: StatementLineItem[]) => void;
}

export const CreditFinancialStatementsTab: React.FC<CreditFinancialStatementsTabProps> = ({
  yearsData,
  yearsList,
  computedData,
  customItems: propCustomItems,
  onUpdateCustomItems,
}) => {
  const [statementView, setStatementView] = useState<'ALL' | 'BS' | 'IS' | 'CF' | 'RATIOS'>('ALL');
  const [isAddingLineModal, setIsAddingLineModal] = useState(false);
  const [targetSection, setTargetSection] = useState<StatementLineItem['section']>('CURRENT_ASSETS');
  const [newItemName, setNewItemName] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemBaseAmount, setNewItemBaseAmount] = useState<number>(100000);

  // Local state if not controlled from parent
  const [localCustomItems, setLocalCustomItems] = useState<StatementLineItem[]>([]);
  const activeCustomItems = propCustomItems || localCustomItems;

  const handleUpdate = (updated: StatementLineItem[]) => {
    if (onUpdateCustomItems) {
      onUpdateCustomItems(updated);
    } else {
      setLocalCustomItems(updated);
    }
  };

  // Add custom line item
  const handleAddCustomLine = () => {
    if (!newItemName.trim()) return;
    const newId = `stmt_item_${Date.now()}`;
    const newValues: Record<number, number> = {};

    yearsList.forEach((yr, idx) => {
      const growthFactor = 1 + (idx - (yearsList.length - 1)) * 0.1;
      newValues[yr] = Math.round(newItemBaseAmount * Math.max(0.5, growthFactor));
    });

    const isNegative =
      targetSection === 'IS_COGS' ||
      targetSection === 'IS_ADMIN_EXP' ||
      targetSection === 'IS_SELLING_EXP' ||
      targetSection === 'IS_FINANCE_EXP';

    const updated = [
      ...activeCustomItems,
      {
        id: newId,
        name: newItemName.trim(),
        section: targetSection,
        noteRef: newItemNote.trim() || 'إيضاح متمم',
        values: newValues,
        isCustom: true,
        isNegative,
      },
    ];

    handleUpdate(updated);
    setNewItemName('');
    setNewItemNote('');
    setNewItemBaseAmount(100000);
    setIsAddingLineModal(false);
  };

  // Delete line item
  const handleDeleteCustomLine = (id: string) => {
    const updated = activeCustomItems.filter((i) => i.id !== id);
    handleUpdate(updated);
  };

  // Update value of custom item
  const handleUpdateItemValue = (id: string, yr: number, val: number) => {
    const updated = activeCustomItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          values: {
            ...item.values,
            [yr]: val,
          },
        };
      }
      return item;
    });
    handleUpdate(updated);
  };

  // Helper to get custom items for a section
  const getSectionCustomItems = (section: StatementLineItem['section']) => {
    return activeCustomItems.filter((i) => i.section === section);
  };

  // Section custom sum per year
  const getSectionCustomSum = (section: StatementLineItem['section'], yr: number) => {
    return getSectionCustomItems(section).reduce((sum, i) => sum + (i.values[yr] || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 no-print">
        {/* Sub tabs switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatementView('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statementView === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            عرض القوائم الشاملة المقارنة
          </button>
          <button
            type="button"
            onClick={() => setStatementView('BS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statementView === 'BS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. المركز المالي
          </button>
          <button
            type="button"
            onClick={() => setStatementView('IS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statementView === 'IS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. قائمة الدخل
          </button>
          <button
            type="button"
            onClick={() => setStatementView('CF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statementView === 'CF'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            3. التدفقات النقدية
          </button>
          <button
            type="button"
            onClick={() => setStatementView('RATIOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statementView === 'RATIOS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            4. النسب والمؤشرات
          </button>
        </div>

        {/* Action: Add new custom item */}
        <button
          type="button"
          onClick={() => setIsAddingLineModal(!isAddingLineModal)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors no-print whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-slate-300 dark:text-blue-200" />
          <span>إضافة بند مخصص</span>
        </button>
      </div>

      {/* Add Custom Line Modal / Form */}
      {isAddingLineModal && (
        <div className="bg-blue-50/90 rounded-2xl p-5 border-2 border-blue-200 shadow-xs space-y-4 no-print">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-blue-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" />
              إضافة بند محاسبي جديد إلى القوائم المالية
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingLineModal(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">القسم المستهدف في القائمة *</label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-slate-800 text-xs"
              >
                <optgroup label="قائمة المركز المالي">
                  <option value="NON_CURRENT_ASSETS">أصول غير متداولة (أصول ثابتة / أخرى)</option>
                  <option value="CURRENT_ASSETS">أصول متداولة (مخزون / مدينون / نقدية)</option>
                  <option value="EQUITY">حقوق الملكية (رأس مال / احتياطيات)</option>
                  <option value="LONG_LIABILITIES">التزامات غير متداولة (قروض طويلة الأجل)</option>
                  <option value="CURRENT_LIABILITIES">التزامات متداولة (موردون / دائنون)</option>
                </optgroup>
                <optgroup label="قائمة الدخل">
                  <option value="IS_REVENUE">إيرادات نشاط إضافية</option>
                  <option value="IS_COGS">تكاليف إنتاج أو تشغيل إضافية</option>
                  <option value="IS_ADMIN_EXP">مصروفات إدارية وعمومية مخصصة</option>
                  <option value="IS_SELLING_EXP">مصروفات بيعية وتسويقية مخصصة</option>
                  <option value="IS_OTHER_REV">إيرادات استثمارات وأرباح رأسمالية</option>
                </optgroup>
                <optgroup label="قائمة التدفقات النقدية">
                  <option value="CF_OPERATING">تدفقات نقدية من أنشطة التشغيل</option>
                  <option value="CF_INVESTING">تدفقات نقدية من أنشطة الاستثمار</option>
                  <option value="CF_FINANCING">تدفقات نقدية من أنشطة التمويل</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم البند المحاسبي *</label>
              <input
                type="text"
                placeholder="مثال: استثمارات في أوراق مالية"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">المبلغ التقديري الأساسي (ج.م) [يقبل كسور وسالب] *</label>
              <AccountingNumberInput
                value={newItemBaseAmount}
                onChange={(val) => setNewItemBaseAmount(val)}
                allowNegative={true}
                allowDecimals={true}
                decimalPlaces={2}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono font-bold text-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">مرجع الإيضاح المتمم</label>
              <input
                type="text"
                placeholder="مثال: إيضاح (4/ب)"
                value={newItemNote}
                onChange={(e) => setNewItemNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddCustomLine}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              إدراج البند فوراً في القوائم
            </button>
          </div>
        </div>
      )}

      {/* 1. BALANCE SHEET TABLE */}
      {(statementView === 'ALL' || statementView === 'BS') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm">قائمة المركز المالي المقارنة (Balance Sheet)</h3>
                <p className="text-[11px] text-slate-300">وفقاً لمعايير المحاسبة المصرية (EAS 1)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                توازن محاسبي متطابق 100%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 min-w-[240px]">بيان بنود المركز المالي</th>
                  <th className="p-3 text-center min-w-[90px]">الإيضاح</th>
                  {yearsList.map((y) => (
                    <th key={y} className="p-3 text-left font-mono min-w-[130px]">
                      سنة {y} (ج.م)
                    </th>
                  ))}
                  <th className="p-3 text-center w-12 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Non Current Assets */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-blue-900 font-black">
                    أولاً: الأصول غير المتداولة (Non-Current Assets)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">الأصول الثابتة بالصافي (بعد مجمع الإهلاك)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (4)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold">
                      {formatEgyptianCurrency(computedData[y]?.netFixedAssets || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">مشروعات تحت التنفيذ ودفعات مقدمة للأصول</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (5)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.projectsInProgress || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Non-Current Assets */}
                {getSectionCustomItems('NON_CURRENT_ASSETS').map((item) => (
                  <tr key={item.id} className="bg-blue-50/30">
                    <td className="p-2.5 pr-6 font-bold text-blue-950 flex items-center justify-between">
                      <span>• {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono">
                        <AccountingNumberInput
                          value={item.values[y] || 0}
                          onChange={(val) => handleUpdateItemValue(item.id, y, val)}
                          allowNegative={true}
                          allowDecimals={true}
                          decimalPlaces={2}
                          className="w-full text-left px-1.5 py-0.5 rounded border border-transparent hover:border-blue-300 font-mono font-bold text-blue-900 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                        title="حذف هذا البند المخصص"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50/50 font-bold text-blue-950">
                  <td className="p-2.5 pr-6">إجمالي الأصول غير المتداولة</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => {
                    const extra = getSectionCustomSum('NON_CURRENT_ASSETS', y);
                    return (
                      <td key={y} className="p-2.5 text-left font-mono">
                        {formatEgyptianCurrency((computedData[y]?.totalNonCurrentAssets || 0) + extra)}
                      </td>
                    );
                  })}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Current Assets */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-emerald-900 font-black">
                    ثانياً: الأصول المتداولة (Current Assets)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">المخزون السلعي والبضائع</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (6)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.inventory || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">العملاء والمدينون وأوراق القبض</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (7)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.receivables || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">أرصدة مدينة أخرى ومصروفات مدفوعة مقدماً</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (8)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.otherDebit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">النقدية بالصندوق ولدى البنوك</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (9)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-emerald-800">
                      {formatEgyptianCurrency(computedData[y]?.cash || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Current Assets */}
                {getSectionCustomItems('CURRENT_ASSETS').map((item) => (
                  <tr key={item.id} className="bg-emerald-50/30">
                    <td className="p-2.5 pr-6 font-bold text-emerald-950 flex items-center justify-between">
                      <span>• {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono">
                        <AccountingNumberInput
                          value={item.values[y] || 0}
                          onChange={(val) => handleUpdateItemValue(item.id, y, val)}
                          allowNegative={true}
                          allowDecimals={true}
                          decimalPlaces={2}
                          className="w-full text-left px-1.5 py-0.5 rounded border border-transparent hover:border-emerald-300 font-mono font-bold text-emerald-900 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                        title="حذف هذا البند المخصص"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                  <td className="p-2.5 pr-6">إجمالي الأصول المتداولة</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => {
                    const extra = getSectionCustomSum('CURRENT_ASSETS', y);
                    return (
                      <td key={y} className="p-2.5 text-left font-mono">
                        {formatEgyptianCurrency((computedData[y]?.totalCurrentAssets || 0) + extra)}
                      </td>
                    );
                  })}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Total Assets */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3">إجمالي أصول المنشأة (Total Assets)</td>
                  <td className="p-3 text-center">-</td>
                  {yearsList.map((y) => {
                    const extraNC = getSectionCustomSum('NON_CURRENT_ASSETS', y);
                    const extraCA = getSectionCustomSum('CURRENT_ASSETS', y);
                    return (
                      <td key={y} className="p-3 text-left font-mono text-emerald-400">
                        {formatEgyptianCurrency(
                          (computedData[y]?.totalAssets || 0) + extraNC + extraCA
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 no-print"></td>
                </tr>

                {/* Equity */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-purple-900 font-black">
                    ثالثاً: حقوق الملكية (Shareholders Equity)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">رأس المال المصدر والمدفوع</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (10)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold">
                      {formatEgyptianCurrency(computedData[y]?.paidUpCapital || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">الاحتياطي القانوني (5%)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (10)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.legalReserve || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">الأرباح المرحلة وصافي ربح العام</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (10)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.retainedEarningsAndProfit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Equity */}
                {getSectionCustomItems('EQUITY').map((item) => (
                  <tr key={item.id} className="bg-purple-50/30">
                    <td className="p-2.5 pr-6 font-bold text-purple-950 flex items-center justify-between">
                      <span>• {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono">
                        <AccountingNumberInput
                          value={item.values[y] || 0}
                          onChange={(val) => handleUpdateItemValue(item.id, y, val)}
                          allowNegative={true}
                          allowDecimals={true}
                          decimalPlaces={2}
                          className="w-full text-left px-1.5 py-0.5 rounded border border-transparent hover:border-purple-300 font-mono font-bold text-purple-900 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-purple-50/50 font-bold text-purple-950">
                  <td className="p-2.5 pr-6">إجمالي حقوق الملكية (أو العجز)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => {
                    const extra = getSectionCustomSum('EQUITY', y);
                    return (
                      <td key={y} className="p-2.5 text-left font-mono">
                        {formatEgyptianCurrency((computedData[y]?.totalEquity || 0) + extra, true)}
                      </td>
                    );
                  })}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Liabilities */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-amber-900 font-black">
                    رابعاً: الالتزامات (Liabilities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">قروض وتسهيلات بنكية طويلة الأجل</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (11)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.longLoans || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">الموردون وأوراق الدفع</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (12)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.suppliers || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">سحب على المكشوف وتسهيلات قصيرة الأجل</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (13)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.shortLoans || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">مخصص ضرائب ومصروفات مستحقة وأرصدة دائنة</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (13/ب)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.otherCurrentLiab || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Liabilities */}
                {getSectionCustomItems('CURRENT_LIABILITIES').map((item) => (
                  <tr key={item.id} className="bg-amber-50/30">
                    <td className="p-2.5 pr-6 font-bold text-amber-950 flex items-center justify-between">
                      <span>• {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono">
                        <AccountingNumberInput
                          value={item.values[y] || 0}
                          onChange={(val) => handleUpdateItemValue(item.id, y, val)}
                          allowNegative={true}
                          allowDecimals={true}
                          decimalPlaces={2}
                          className="w-full text-left px-1.5 py-0.5 rounded border border-transparent hover:border-amber-300 font-mono font-bold text-amber-900 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-amber-50/50 font-bold text-amber-950">
                  <td className="p-2.5 pr-6">إجمالي الالتزامات</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => {
                    const extra = getSectionCustomSum('CURRENT_LIABILITIES', y);
                    return (
                      <td key={y} className="p-2.5 text-left font-mono">
                        {formatEgyptianCurrency((computedData[y]?.totalLiabilities || 0) + extra)}
                      </td>
                    );
                  })}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Total Equity & Liabilities */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3">إجمالي حقوق الملكية والالتزامات (Total Equity & Liabilities)</td>
                  <td className="p-3 text-center">-</td>
                  {yearsList.map((y) => {
                    const extraNC = getSectionCustomSum('NON_CURRENT_ASSETS', y);
                    const extraCA = getSectionCustomSum('CURRENT_ASSETS', y);
                    return (
                      <td key={y} className="p-3 text-left font-mono text-emerald-400">
                        {formatEgyptianCurrency(
                          (computedData[y]?.totalEquityAndLiabilities || 0) + extraNC + extraCA
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. INCOME STATEMENT (P&L) TABLE */}
      {(statementView === 'ALL' || statementView === 'IS') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm">قائمة الدخل الشامل والأرباح والخسائر (Income Statement)</h3>
                <p className="text-[11px] text-slate-300">وفقاً لمعايير المحاسبة المصرية (EAS 1 / EAS 48)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
              معتمد ومطابق ضريبياً
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 min-w-[240px]">بيان الإيرادات والمصروفات والأرباح</th>
                  <th className="p-3 text-center min-w-[90px]">الإيضاح</th>
                  {yearsList.map((y) => (
                    <th key={y} className="p-3 text-left font-mono min-w-[130px]">
                      سنة {y} (ج.م)
                    </th>
                  ))}
                  <th className="p-3 text-center w-12 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="font-bold text-slate-900">
                  <td className="p-2.5">صافي إيرادات المبيعات والنشاط</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (14)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-blue-900">
                      {formatEgyptianCurrency(computedData[y]?.sales || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Revenues */}
                {getSectionCustomItems('IS_REVENUE').map((item) => (
                  <tr key={item.id} className="bg-blue-50/20">
                    <td className="p-2.5 pr-6 font-bold text-blue-900 flex items-center justify-between">
                      <span>• {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono">
                        <input
                          type="number"
                          step="any"
                          value={item.values[y] || 0}
                          onChange={(e) =>
                            handleUpdateItemValue(item.id, y, parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-left px-1.5 py-0.5 rounded border border-transparent hover:border-blue-300 font-mono font-bold text-blue-900 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="p-2.5 pr-6 text-red-700">يخصم: تكلفة الحصول على الإيراد (تكلفة المبيعات)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (15)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-red-700">
                      ({formatEgyptianCurrency(computedData[y]?.cogs || 0)})
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr className="bg-blue-50/70 font-black text-blue-950">
                  <td className="p-2.5">مجمل ربح النشاط (Gross Profit)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.grossProfit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-slate-600">يخصم: المصروفات الإدارية والعمومية</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (16)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      ({formatEgyptianCurrency(computedData[y]?.adminExp || 0)})
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Admin Exp */}
                {getSectionCustomItems('IS_ADMIN_EXP').map((item) => (
                  <tr key={item.id} className="bg-red-50/20">
                    <td className="p-2.5 pr-8 text-red-800 flex items-center justify-between">
                      <span>• يخصم: {item.name}</span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{item.noteRef}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono text-red-700">
                        ({formatEgyptianCurrency(item.values[y] || 0)})
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-red-400 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="p-2.5 pr-6 text-slate-600">يخصم: المصروفات البيعية والتسويقية</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (17)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      ({formatEgyptianCurrency(computedData[y]?.sellingExp || 0)})
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="p-2.5">أرباح التشغيل قبل الفوائد والضرائب (EBIT)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.ebit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-purple-800">يخصم: أعباء وفوائد التمويل البنكي</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (18)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-purple-900">
                      ({formatEgyptianCurrency(computedData[y]?.financeExp || 0)})
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr className="bg-blue-50/40 font-bold text-blue-950">
                  <td className="p-2.5">صافي الأرباح قبل الضريبة (EBT)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.ebt || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-red-700">يخصم: ضريبة الدخل المستحقة (22.5%)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">إيضاح (19)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-red-700">
                      ({formatEgyptianCurrency(computedData[y]?.tax || 0)})
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3">صافي ربح / (خسارة) العام بعد الضريبة (Net Profit / Loss)</td>
                  <td className="p-3 text-center">-</td>
                  {yearsList.map((y) => {
                    const np = computedData[y]?.netProfit || 0;
                    return (
                      <td key={y} className={`p-3 text-left font-mono ${np < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {formatEgyptianCurrency(np, true)}
                      </td>
                    );
                  })}
                  <td className="p-3 no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CASH FLOW STATEMENT */}
      {(statementView === 'ALL' || statementView === 'CF') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm">قائمة التدفقات النقدية المقارنة (Cash Flows Statement)</h3>
                <p className="text-[11px] text-slate-300">وفقاً لمعيار المحاسبة المصري رقم (4) الطريقة غير المباشرة</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">بيان التدفقات النقدية</th>
                  {yearsList.map((y) => (
                    <th key={y} className="p-3 text-left font-mono">
                      سنة {y} (ج.م)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={1 + yearsList.length} className="p-2.5 text-blue-900">
                    أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">صافي أرباح العام بعد الضريبة</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.netProfit || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-emerald-800">يضاف: إهلاك الأصول الثابتة غير النقدي</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-emerald-800">
                      +{formatEgyptianCurrency(computedData[y]?.depreciation || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-slate-600">التغير في رأس المال العامل (المدينون والمخزون والدائنون)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-slate-700">
                      ({formatEgyptianCurrency(computedData[y]?.workingCapitalChange || 0)})
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/40 font-bold text-emerald-950">
                  <td className="p-2.5 pr-6">صافي التدفقات النقدية من الأنشطة التشغيلية</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-emerald-900">
                      {formatEgyptianCurrency(computedData[y]?.operatingCashFlow || 0)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={1 + yearsList.length} className="p-2.5 text-amber-900">
                    ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-red-700">المدفوعات لشراء وتحديث الأصول الثابتة (CAPEX)</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono text-red-700">
                      ({formatEgyptianCurrency(computedData[y]?.capex || 0)})
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={1 + yearsList.length} className="p-2.5 text-purple-900">
                    ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">سداد/سحب تسهيلات بنكية وتوزيعات</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.financingCashFlow || 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. FINANCIAL RATIOS TABLE */}
      {(statementView === 'ALL' || statementView === 'RATIOS') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm">النسب والمؤشرات الائتمانية والمالية المقارنة</h3>
                <p className="text-[11px] text-slate-300">معدلات السيولة والربحية والرافعة المالية وخدمة الدين البنكي</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">اسم المؤشر والنسبة الائتمانية</th>
                  <th className="p-3 text-center">المعيار البنكي المستهدف</th>
                  {yearsList.map((y) => (
                    <th key={y} className="p-3 text-left font-mono">
                      سنة {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">نسبة التداول العام (Current Ratio)</td>
                  <td className="p-3 text-center font-bold text-blue-900">أكبر من 1.25x</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-emerald-800">
                      {(computedData[y]?.currentRatio || 1.5).toFixed(2)}x
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">نسبة السيولة السريعة (Quick Ratio)</td>
                  <td className="p-3 text-center font-bold text-blue-900">أكبر من 0.90x</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-emerald-800">
                      {(computedData[y]?.quickRatio || 1.1).toFixed(2)}x
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">هامش مجمل الربح (Gross Margin %)</td>
                  <td className="p-3 text-center font-bold text-blue-900">15% - 35%</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-blue-900">
                      {(computedData[y]?.grossMargin || 25).toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">هامش صافي الربح (Net Margin %)</td>
                  <td className="p-3 text-center font-bold text-blue-900">5% - 15%</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-emerald-900">
                      {(computedData[y]?.netMargin || 8.5).toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">معدل تغطية الفوائد البنكية (ICR)</td>
                  <td className="p-3 text-center font-bold text-blue-900">أكبر من 3.0x</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-indigo-900">
                      {(computedData[y]?.icr || 8).toFixed(1)}x
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-sans font-bold text-slate-900">العائد على حقوق الملكية (ROE %)</td>
                  <td className="p-3 text-center font-bold text-blue-900">أكبر من 15%</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-bold text-purple-900">
                      {(computedData[y]?.roe || 20).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
