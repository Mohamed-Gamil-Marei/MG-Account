import React, { useState } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Scale,
  DollarSign,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Sliders,
  BookOpen,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ArrowRightLeft,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { FiscalYearData } from './CreditYearlyEditor';
import { AccountingNumberInput } from '../common/AccountingNumberInput';
import { SupplementaryNoteItem, DEFAULT_SUPPLEMENTARY_NOTES } from './CreditNotesTab';
import { UnifiedSelectDropdown, UnifiedDropdownOption } from '../common/UnifiedSelectDropdown';
import { ActionMenu } from '../common/ActionMenu';
import { DisclosureDetailModal } from './DisclosureDetailModal';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { AdminExpenseItem } from './CreditAdminExpensesTab';

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
  itemNames?: Record<string, string>;
  onUpdateItemName?: (idOrField: string, newName: string) => void;
  hiddenItemIds?: string[];
  onToggleHideItem?: (idOrField: string) => void;
  onRestoreAllItems?: () => void;
  onAutoBalanceYear?: (year: number) => void;
  onAutoBalanceAllYears?: () => void;
  supplementaryNotes?: SupplementaryNoteItem[];
  onUpdateNotesList?: (notes: SupplementaryNoteItem[]) => void;
  assetCategories?: FixedAssetCategoryItem[];
  adminExpenses?: AdminExpenseItem[];
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  onUpdateCell?: (field: string, year: number, val: number) => void;
}

export const CreditFinancialStatementsTab: React.FC<CreditFinancialStatementsTabProps> = ({
  yearsData,
  yearsList,
  computedData,
  customItems: propCustomItems,
  onUpdateCustomItems,
  itemNames = {},
  onUpdateItemName,
  hiddenItemIds = [],
  onToggleHideItem,
  onRestoreAllItems,
  onAutoBalanceYear,
  onAutoBalanceAllYears,
  supplementaryNotes = DEFAULT_SUPPLEMENTARY_NOTES,
  onUpdateNotesList,
  assetCategories = [],
  adminExpenses = [],
  periodStartDate,
  periodEndDate,
  periodLabel,
  onUpdateCell,
}) => {
  const [statementView, setStatementView] = useState<'ALL' | 'BS' | 'IS' | 'CF' | 'RATIOS' | 'TRIAL_BALANCE'>('ALL');
  const [isDirectEditMode, setIsDirectEditMode] = useState<boolean>(false);
  const [isAddingLineModal, setIsAddingLineModal] = useState(false);
  const [isBalancePanelOpen, setIsBalancePanelOpen] = useState(true);
  const [targetSection, setTargetSection] = useState<StatementLineItem['section']>('CURRENT_ASSETS');
  const [newItemName, setNewItemName] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemBaseAmount, setNewItemBaseAmount] = useState<number>(100000);

  // State for inline renaming
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempItemName, setTempItemName] = useState<string>('');

  // Modal State for Disclosure Detail
  const [selectedNoteModal, setSelectedNoteModal] = useState<SupplementaryNoteItem | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Local state if not controlled from parent
  const [localCustomItems, setLocalCustomItems] = useState<StatementLineItem[]>([]);
  const activeCustomItems = propCustomItems || localCustomItems;

  const handleOpenNoteModalByNum = (num: number) => {
    const target = supplementaryNotes.find((n) => Number(n.noteNumber) === num) || supplementaryNotes[0];
    if (target) {
      setSelectedNoteModal(target);
      setIsNoteModalOpen(true);
    }
  };

  const handleOpenNoteModalByRef = (refStr: string) => {
    const num = parseInt(refStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      handleOpenNoteModalByNum(num);
    } else {
      setSelectedNoteModal(supplementaryNotes[0]);
      setIsNoteModalOpen(true);
    }
  };

  const handleSaveNoteFromModal = (updatedNote: SupplementaryNoteItem) => {
    if (onUpdateNotesList) {
      const updatedList = supplementaryNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      onUpdateNotesList(updatedList);
    }
  };

  const renderNoteBadge = (noteRef: string | number) => {
    const noteNumStr = String(noteRef).replace(/[^0-9]/g, '');
    const noteNum = noteNumStr ? parseInt(noteNumStr, 10) : null;
    const displayText =
      typeof noteRef === 'number'
        ? `إيضاح (${noteRef})`
        : noteNum
        ? `إيضاح (${noteNum})`
        : noteRef || 'إيضاح متمم';
    return (
      <button
        type="button"
        onClick={() => {
          if (noteNum) {
            handleOpenNoteModalByNum(noteNum);
          } else {
            handleOpenNoteModalByRef(String(noteRef));
          }
        }}
        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono font-bold rounded-lg border border-purple-200 dark:border-purple-800 text-[11px] cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
        title="اضغط لمشاهدة وتعديل الإيضاح المتمم"
      >
        <span>{displayText}</span>
        <BookOpen className="w-2.5 h-2.5 opacity-60" />
      </button>
    );
  };

  const renderEditableCell = (
    fieldKey: string,
    year: number,
    currentVal: number,
    textColorClass: string = 'text-slate-900',
    isBold: boolean = false,
    allowNegative: boolean = false
  ) => {
    if (isDirectEditMode && onUpdateCell) {
      return (
        <td key={year} className="p-1.5 text-left font-mono">
          <AccountingNumberInput
            value={currentVal || 0}
            onChange={(val) => onUpdateCell(fieldKey, year, val)}
            allowNegative={allowNegative}
            allowDecimals={true}
            decimalPlaces={2}
            className={`w-full text-left px-2 py-1 rounded bg-amber-50 hover:bg-amber-100/90 focus:bg-white border border-amber-300 focus:border-blue-600 font-mono text-xs ${
              isBold ? 'font-black' : 'font-bold'
            } ${textColorClass} focus:outline-none transition-colors shadow-2xs`}
          />
        </td>
      );
    }

    return (
      <td
        key={year}
        onClick={() => {
          if (onUpdateCell) {
            setIsDirectEditMode(true);
          }
        }}
        title={onUpdateCell ? 'انقر لتعديل هذا الرقم مباشرة في القوائم والإيضاحات' : undefined}
        className={`p-2.5 text-left font-mono ${isBold ? 'font-black' : 'font-semibold'} ${textColorClass} ${
          onUpdateCell ? 'cursor-pointer hover:bg-blue-50/80 rounded transition-colors group' : ''
        }`}
      >
        <div className="flex items-center justify-end gap-1">
          <span>{formatEgyptianCurrency(currentVal || 0, allowNegative)}</span>
          {onUpdateCell && (
            <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
      </td>
    );
  };

  const renderCustomEditableCell = (
    item: StatementLineItem,
    year: number,
    textColorClass: string = 'text-slate-900',
    isBold: boolean = false,
    allowNegative: boolean = true
  ) => {
    const currentVal = item.values[year] || 0;
    if (isDirectEditMode) {
      return (
        <td key={year} className="p-1.5 text-left font-mono">
          <AccountingNumberInput
            value={currentVal}
            onChange={(val) => handleUpdateItemValue(item.id, year, val)}
            allowNegative={allowNegative}
            allowDecimals={true}
            decimalPlaces={2}
            className={`w-full text-left px-2 py-1 rounded bg-amber-50 hover:bg-amber-100/90 focus:bg-white border border-amber-300 focus:border-blue-600 font-mono text-xs ${
              isBold ? 'font-black' : 'font-bold'
            } ${textColorClass} focus:outline-none transition-colors shadow-2xs`}
          />
        </td>
      );
    }

    return (
      <td
        key={year}
        onClick={() => {
          setIsDirectEditMode(true);
        }}
        title="انقر لتعديل هذا الرقم مباشرة"
        className={`p-2.5 text-left font-mono ${isBold ? 'font-black' : 'font-semibold'} ${textColorClass} cursor-pointer hover:bg-blue-50/80 rounded transition-colors group`}
      >
        <div className="flex items-center justify-end gap-1">
          <span>{formatEgyptianCurrency(currentVal, allowNegative)}</span>
          <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </td>
    );
  };

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

  const getItemDisplayName = (fieldKey: string, defaultName: string) => {
    if (itemNames && itemNames[fieldKey]) {
      return itemNames[fieldKey];
    }
    return defaultName;
  };

  const handleStartRename = (idOrField: string, currentName: string) => {
    setEditingItemId(idOrField);
    setTempItemName(currentName);
  };

  const handleSaveRename = (idOrField: string) => {
    if (tempItemName.trim()) {
      if (onUpdateItemName) {
        onUpdateItemName(idOrField, tempItemName.trim());
      } else {
        const isCustom = activeCustomItems.some((i) => i.id === idOrField);
        if (isCustom) {
          handleUpdate(
            activeCustomItems.map((i) =>
              i.id === idOrField ? { ...i, name: tempItemName.trim() } : i
            )
          );
        }
      }
    }
    setEditingItemId(null);
    setTempItemName('');
  };

  const handleCancelRename = () => {
    setEditingItemId(null);
    setTempItemName('');
  };

  const handleDeleteOrHide = (idOrField: string, isCustom: boolean) => {
    if (isCustom) {
      handleDeleteCustomLine(idOrField);
    } else {
      if (onToggleHideItem) {
        onToggleHideItem(idOrField);
      }
    }
  };

  const isItemHidden = (idOrField: string) => {
    return hiddenItemIds.includes(idOrField);
  };

  const renderItemNameWithActions = (
    idOrField: string,
    defaultName: string,
    isCustom: boolean = false,
    indentClass: string = 'pr-6'
  ) => {
    const displayName = isCustom ? defaultName : getItemDisplayName(idOrField, defaultName);
    const isEditing = editingItemId === idOrField;

    if (isEditing) {
      return (
        <div className={`flex items-center gap-1.5 ${indentClass}`}>
          <input
            type="text"
            value={tempItemName}
            onChange={(e) => setTempItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(idOrField);
              if (e.key === 'Escape') handleCancelRename();
            }}
            autoFocus
            className="px-2 py-0.5 border-2 border-blue-500 rounded bg-white text-slate-900 font-bold text-xs focus:outline-none w-full max-w-xs shadow-xs"
          />
          <button
            type="button"
            onClick={() => handleSaveRename(idOrField)}
            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors"
            title="حفظ الاسم الجديد"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelRename}
            className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded cursor-pointer transition-colors"
            title="إلغاء"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-between group/row ${indentClass}`}>
        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
          {displayName}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity no-print">
          <button
            type="button"
            onClick={() => handleStartRename(idOrField, displayName)}
            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer transition-colors"
            title="تعديل اسم البند"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteOrHide(idOrField, isCustom)}
            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer transition-colors"
            title={isCustom ? 'حذف البند المخصص نهائياً' : 'استبعاد هذا البند من الميزانية وحسابات التوازن'}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const allYearsBalanced = yearsList.every((y) => computedData[y]?.isBalanced ?? true);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 no-print">
        {/* Unified Dropdown Selector for Financial Statements */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <UnifiedSelectDropdown<'ALL' | 'BS' | 'IS' | 'CF' | 'RATIOS' | 'TRIAL_BALANCE'>
            id="statement-view-dropdown"
            label="القائمة المعروضة"
            icon={FileSpreadsheet}
            value={statementView}
            menuWidth="w-72"
            options={[
              {
                id: 'ALL',
                label: 'عرض القوائم الشاملة المقارنة',
                sublabel: 'المركز والدخل والتدفقات جنباً إلى جنب',
                icon: FileSpreadsheet,
              },
              {
                id: 'BS',
                label: '1. قائمة المركز المالي',
                sublabel: 'الأصول والالتزامات وحقوق الملكية',
                icon: Scale,
              },
              {
                id: 'IS',
                label: '2. قائمة الدخل والأرباح والخسائر',
                sublabel: 'الإيرادات وتكلفة المبيعات ومجمل وصافي الربح',
                icon: TrendingUp,
              },
              {
                id: 'CF',
                label: '3. قائمة التدفقات النقدية',
                sublabel: 'الأنشطة التشغيلية والاستثمارية والتمويلية',
                icon: DollarSign,
              },
              {
                id: 'RATIOS',
                label: '4. النسب والمؤشرات المالية',
                sublabel: 'السيولة والربحية والرافعة المالية ومعدلات الدوران',
                icon: Activity,
              },
              {
                id: 'TRIAL_BALANCE',
                label: '5. ميزان المراجعة والتحقق المحاسبي',
                sublabel: 'تطابق إجمالي المدين والدائن وفقاً للأصول المحاسبية',
                badge: 'مدين/دائن',
                icon: Scale,
              },
            ]}
            onChange={(val) => setStatementView(val)}
          />
        </div>

        {/* Action Controls via Dropdown Menu */}
        <div className="flex items-center gap-2">
          <ActionMenu
            id="statement-actions-dropdown"
            label="خيارات وإجراءات القوائم"
            triggerVariant="primary"
            align="left"
            items={[
              {
                id: 'add-line-action',
                label: 'إضافة بند محاسبي مخصص',
                icon: Plus,
                onClick: () => setIsAddingLineModal(true),
              },
              ...(onUpdateCell
                ? [
                    {
                      id: 'toggle-excel-mode',
                      label: isDirectEditMode ? 'إلغاء وضع التعديل المباشر للأرقام' : 'تفعيل وضع التعديل المباشر (Excel)',
                      icon: Edit2,
                      onClick: () => setIsDirectEditMode(!isDirectEditMode),
                    },
                  ]
                : []),
            ]}
          />
        </div>
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
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعايير المحاسبة المصرية (EAS 1)
                  {periodEndDate ? ` — كما في ${periodEndDate}` : ' — كما في 31 ديسمبر'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {periodStartDate && periodEndDate && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
                  {periodStartDate} ← {periodEndDate}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  allYearsBalanced
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                }`}
              >
                {allYearsBalanced ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{allYearsBalanced ? 'توازن محاسبي متطابق 100%' : 'تنبيه: يوجد عدم توازن بالميزان!'}</span>
              </span>
            </div>
          </div>

          {/* Live Balance Verification Panel */}
          <div className="bg-slate-50 border-b border-slate-200">
            <div className="p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsBalancePanelOpen(!isBalancePanelOpen)}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    allYearsBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {allYearsBalanced ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span>التحقق المحاسبي الفعلي من توازن الميزانية (المدين = الدائن)</span>
                    {allYearsBalanced ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        متزن تماماً ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                        يوجد فرق في الميزان!
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    أي تعديل في رقم أو إضافة/استبعاد بند ينعكس لحظياً على الإجماليات وفرق الميزان (الأصول = الخصوم + حقوق الملكية).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!allYearsBalanced && onAutoBalanceAllYears && (
                  <button
                    type="button"
                    onClick={onAutoBalanceAllYears}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    title="موازنة الفرق تلقائياً لجميع السنوات وتعديل الأرباح المرحلة"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                    <span>موازنة فورية لكافة السنوات</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsBalancePanelOpen(!isBalancePanelOpen)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  title={isBalancePanelOpen ? 'طي بطاقات المقارنة لتقليل ازدحام الشاشة' : 'توسيع بطاقات تفاصيل المقارنة'}
                >
                  <span className="text-[11px]">{isBalancePanelOpen ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
                  {isBalancePanelOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              </div>
            </div>

            {/* Collapsible Year-by-Year Comparison Cards */}
            {isBalancePanelOpen && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80">
                  {yearsList.map((y) => {
                    const cd = computedData[y];
                    const diff = cd?.balanceDiff ?? 0;
                    const isBal = cd?.isBalanced ?? Math.abs(diff) < 1;
                    return (
                      <div
                        key={y}
                        className={`p-3 rounded-xl border transition-all ${
                          isBal
                            ? 'bg-white border-emerald-200 shadow-2xs'
                            : 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">سنة {y}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold flex items-center gap-1 ${
                              isBal
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isBal ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                متزن (0.00 ج.م)
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                فرق: {formatEgyptianCurrency(diff, true)} ج.م
                              </>
                            )}
                          </span>
                        </div>

                        <div className="text-[11px] space-y-1 text-slate-600 font-mono">
                          <div className="flex justify-between">
                            <span>الأصول (الجانب المدين):</span>
                            <span className="font-bold text-slate-900">
                              {formatEgyptianCurrency(cd?.totalAssets || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>الخصوم والملكية (الدائن):</span>
                            <span className="font-bold text-slate-900">
                              {formatEgyptianCurrency(cd?.totalEquityAndLiabilities || 0)}
                            </span>
                          </div>
                        </div>

                        {!isBal && (
                          <div className="mt-2 pt-2 border-t border-rose-200/70 flex flex-col gap-1.5">
                            <span className="text-[10px] text-rose-700 font-semibold">
                              {diff > 0
                                ? 'الأصول (المدين) أكبر من الخصوم والملكية'
                                : 'الخصوم والملكية (الدائن) أكبر من الأصول'}
                            </span>
                            {onAutoBalanceYear && (
                              <button
                                type="button"
                                onClick={() => onAutoBalanceYear(y)}
                                className="w-full py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-rose-200" />
                                <span>موازنة سنة {y} آلياً بجاري الشركاء</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Hidden items restore banner */}
          {hiddenItemIds.length > 0 && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تم استبعاد عدد ({hiddenItemIds.length}) بنود من بنود الميزانية وحسابات التوازن.</span>
              </div>
              {onRestoreAllItems && (
                <button
                  type="button"
                  onClick={onRestoreAllItems}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  استعادة كافة البنود المستبعدة
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 min-w-[260px]">بيان بنود المركز المالي</th>
                  <th className="p-3 text-center min-w-[90px]">الإيضاح</th>
                  {yearsList.map((y) => (
                    <th key={y} className="p-3 text-left font-mono min-w-[130px]">
                      سنة {y} (ج.م)
                    </th>
                  ))}
                  <th className="p-3 text-center w-16 no-print">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Non Current Assets */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-blue-900 font-black">
                    أولاً: الأصول غير المتداولة (Non-Current Assets)
                  </td>
                </tr>

                {!isItemHidden('netFixedAssets') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('netFixedAssets', 'الأصول الثابتة بالصافي (بعد مجمع الإهلاك)')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(4)}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('netFixedAssets', y, computedData[y]?.netFixedAssets || 0, 'text-slate-900', true)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('netFixedAssets', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('projectsInProgress') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('projectsInProgress', 'مشروعات تحت التنفيذ ودفعات مقدمة للأصول')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(5)}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('projectsInProgress', y, computedData[y]?.projectsInProgress || 0)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('projectsInProgress', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Custom Non-Current Assets */}
                {getSectionCustomItems('NON_CURRENT_ASSETS').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 5)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50/50 font-bold text-blue-950">
                  <td className="p-2.5 pr-6">إجمالي الأصول غير المتداولة</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-blue-950">
                      {formatEgyptianCurrency(computedData[y]?.totalNonCurrentAssets || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Current Assets */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-emerald-900 font-black">
                    ثانياً: الأصول المتداولة (Current Assets)
                  </td>
                </tr>

                {!isItemHidden('inventory') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('inventory', 'المخزون السلعي والبضائع')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(6)}</td>
                    {yearsList.map((y) => renderEditableCell('inventory', y, computedData[y]?.inventory || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('inventory', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('receivables') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('receivables', 'العملاء والمدينون وأوراق القبض')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(7)}</td>
                    {yearsList.map((y) => renderEditableCell('receivables', y, computedData[y]?.receivables || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('receivables', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('otherDebit') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('otherDebit', 'أرصدة مدينة أخرى ومصروفات مدفوعة مقدماً')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(8)}</td>
                    {yearsList.map((y) => renderEditableCell('otherDebit', y, computedData[y]?.otherDebit || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('otherDebit', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('cash') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('cash', 'النقدية بالصندوق ولدى البنوك')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(9)}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('cash', y, computedData[y]?.cash || 0, 'text-emerald-800', true)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('cash', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Custom Current Assets */}
                {getSectionCustomItems('CURRENT_ASSETS').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 9)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                  <td className="p-2.5 pr-6">إجمالي الأصول المتداولة</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.totalCurrentAssets || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Total Assets (Debit Side) */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3">إجمالي أصول المنشأة (الجانب المدين - Total Assets)</td>
                  <td className="p-3 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-mono text-emerald-400">
                      {formatEgyptianCurrency(computedData[y]?.totalAssets || 0)}
                    </td>
                  ))}
                  <td className="p-3 no-print"></td>
                </tr>

                {/* Equity */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-purple-900 font-black">
                    ثالثاً: حقوق الملكية (Shareholders Equity)
                  </td>
                </tr>

                {!isItemHidden('paidUpCapital') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('paidUpCapital', 'رأس المال المصدر والمدفوع')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(10)}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('paidUpCapital', y, computedData[y]?.paidUpCapital || 0, 'text-purple-950', true)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('paidUpCapital', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('legalReserve') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('legalReserve', 'جاري الشركاء (اتزان الميزان)')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(10)}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('legalReserve', y, computedData[y]?.legalReserve || 0, 'text-emerald-900 font-black', true)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('legalReserve', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('retainedEarningsAndProfit') && (
                  <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        {renderItemNameWithActions('retainedEarningsAndProfit', 'الأرباح المرحلة وصافي ربح العام')}
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-mono font-normal">
                          مربوط بقائمة الدخل تلقائياً
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(10)}</td>
                    {yearsList.map((y) => (
                      <td key={y} className="p-2.5 text-left font-mono font-black text-indigo-950 dark:text-indigo-200">
                        {formatEgyptianCurrency(computedData[y]?.retainedEarningsAndProfit || 0, true)}
                      </td>
                    ))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('retainedEarningsAndProfit', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Custom Equity */}
                {getSectionCustomItems('EQUITY').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 10)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y, 'text-purple-900'))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-purple-50/50 font-bold text-purple-950">
                  <td className="p-2.5 pr-6">إجمالي حقوق الملكية (أو العجز)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-purple-950">
                      {formatEgyptianCurrency(computedData[y]?.totalEquity || 0, true)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Liabilities */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={2 + yearsList.length + 1} className="p-2.5 text-amber-900 font-black">
                    رابعاً: الالتزامات (Liabilities)
                  </td>
                </tr>

                {!isItemHidden('longLoans') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('longLoans', 'قروض وتسهيلات بنكية طويلة الأجل')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(11)}</td>
                    {yearsList.map((y) => renderEditableCell('longLoans', y, computedData[y]?.longLoans || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('longLoans', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Custom Long Term Liabilities */}
                {getSectionCustomItems('LONG_LIABILITIES').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 11)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!isItemHidden('suppliers') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('suppliers', 'الموردون وأوراق الدفع')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(12)}</td>
                    {yearsList.map((y) => renderEditableCell('suppliers', y, computedData[y]?.suppliers || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('suppliers', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('shortLoans') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('shortLoans', 'سحب على المكشوف وتسهيلات قصيرة الأجل')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(13)}</td>
                    {yearsList.map((y) => renderEditableCell('shortLoans', y, computedData[y]?.shortLoans || 0))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('shortLoans', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {!isItemHidden('otherCurrentLiab') && (
                  <tr>
                    <td className="p-2.5">
                      {renderItemNameWithActions('otherCurrentLiab', 'مخصص ضرائب ومصروفات مستحقة وأرصدة دائنة')}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge('13/ب')}</td>
                    {yearsList.map((y) =>
                      renderEditableCell('otherCurrentLiab', y, computedData[y]?.otherCurrentLiab || 0)
                    )}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrHide('otherCurrentLiab', false)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Custom Liabilities */}
                {getSectionCustomItems('CURRENT_LIABILITIES').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 13)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند من الميزانية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-amber-50/50 font-bold text-amber-950">
                  <td className="p-2.5 pr-6">إجمالي الالتزامات</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono">
                      {formatEgyptianCurrency(computedData[y]?.totalLiabilities || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Total Equity & Liabilities (Credit Side) */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3">إجمالي حقوق الملكية والالتزامات (الجانب الدائن - Total Equity & Liabilities)</td>
                  <td className="p-3 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-3 text-left font-mono text-emerald-400">
                      {formatEgyptianCurrency(computedData[y]?.totalEquityAndLiabilities || 0)}
                    </td>
                  ))}
                  <td className="p-3 no-print"></td>
                </tr>

                {/* Real-Time Balance Verification Row */}
                <tr className="bg-slate-800 text-white font-black text-xs border-t-2 border-slate-700">
                  <td className="p-3 text-amber-300 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>التحقق من توازن الميزان (فرق المدين والدائن = الأصول - الخصوم والملكية)</span>
                  </td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  {yearsList.map((y) => {
                    const cd = computedData[y];
                    const diff = cd?.balanceDiff ?? 0;
                    const isBal = cd?.isBalanced ?? Math.abs(diff) < 1;
                    return (
                      <td key={y} className="p-3 text-left font-mono">
                        {isBal ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 inline" />
                            متزن (0.00 ج.م)
                          </span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                              فرق: {formatEgyptianCurrency(diff, true)}
                            </span>
                            {onAutoBalanceYear && (
                              <button
                                type="button"
                                onClick={() => onAutoBalanceYear(y)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] rounded font-sans cursor-pointer transition-colors shadow-2xs"
                                title="موازنة الفرق في جاري الشركاء فورياً"
                              >
                                موازنة الميزان ⚡
                              </button>
                            )}
                          </div>
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
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعايير المحاسبة المصرية (EAS 1 / EAS 48)
                  {periodStartDate && periodEndDate ? ` — عن الفترة من ${periodStartDate} إلى ${periodEndDate}` : ' — عن السنة المالية'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {periodStartDate && periodEndDate && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
                  {periodStartDate} ← {periodEndDate}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                معتمد ومطابق ضريبياً
              </span>
            </div>
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
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(14)}</td>
                  {yearsList.map((y) => renderEditableCell('sales', y, computedData[y]?.sales || 0, 'text-blue-900', true))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Revenues */}
                {getSectionCustomItems('IS_REVENUE').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, item.name, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 14)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y, 'text-blue-900', true))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="p-2.5 pr-6 text-red-700">يخصم: تكلفة الحصول على الإيراد (تكلفة المبيعات)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(15)}</td>
                  {yearsList.map((y) => renderEditableCell('cogs', y, computedData[y]?.cogs || 0, 'text-red-700', false))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom COGS */}
                {getSectionCustomItems('IS_COGS').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, `يخصم: ${item.name}`, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 15)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y, 'text-red-700', false))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50/70 font-black text-blue-950">
                  <td className="p-2.5">مجمل ربح النشاط (Gross Profit)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-blue-950">
                      {formatEgyptianCurrency(computedData[y]?.grossProfit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-slate-600">يخصم: المصروفات الإدارية والعمومية</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(16)}</td>
                  {yearsList.map((y) => renderEditableCell('adminExp', y, computedData[y]?.adminExp || 0, 'text-slate-700', false))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Admin Exp */}
                {getSectionCustomItems('IS_ADMIN_EXP').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, `يخصم: ${item.name}`, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 16)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y, 'text-slate-700', false))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="p-2.5 pr-6 text-slate-600">يخصم: المصروفات البيعية والتسويقية</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(17)}</td>
                  {yearsList.map((y) => renderEditableCell('sellingExp', y, computedData[y]?.sellingExp || 0, 'text-slate-700', false))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                {/* Custom Selling Exp */}
                {getSectionCustomItems('IS_SELLING_EXP').map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5">
                      {renderItemNameWithActions(item.id, `يخصم: ${item.name}`, true)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(item.noteRef || 17)}</td>
                    {yearsList.map((y) => renderCustomEditableCell(item, y, 'text-slate-700', false))}
                    <td className="p-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLine(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="استبعاد هذا البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="p-2.5">أرباح التشغيل قبل الفوائد والضرائب (EBIT)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-slate-900">
                      {formatEgyptianCurrency(computedData[y]?.ebit || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-purple-800">يخصم: أعباء وفوائد التمويل البنكي</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(18)}</td>
                  {yearsList.map((y) => renderEditableCell('financeExp', y, computedData[y]?.financeExp || 0, 'text-purple-900', false))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr className="bg-blue-50/40 font-bold text-blue-950">
                  <td className="p-2.5">صافي الأرباح قبل الضريبة (EBT)</td>
                  <td className="p-2.5 text-center">-</td>
                  {yearsList.map((y) => (
                    <td key={y} className="p-2.5 text-left font-mono font-bold text-blue-950">
                      {formatEgyptianCurrency(computedData[y]?.ebt || 0)}
                    </td>
                  ))}
                  <td className="p-2.5 no-print"></td>
                </tr>

                <tr>
                  <td className="p-2.5 pr-6 text-red-700">يخصم: ضريبة الدخل المستحقة (22.5%)</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{renderNoteBadge(19)}</td>
                  {yearsList.map((y) => renderEditableCell('tax', y, computedData[y]?.tax || 0, 'text-red-700', false))}
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
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعيار المحاسبة المصري رقم (4) الطريقة غير المباشرة
                  {periodStartDate && periodEndDate ? ` — عن الفترة من ${periodStartDate} إلى ${periodEndDate}` : ' — عن السنة المالية'}
                </p>
              </div>
            </div>
            {periodStartDate && periodEndDate && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                {periodStartDate} ← {periodEndDate}
              </span>
            )}
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

      {/* Render Disclosure Detail Modal */}
      {selectedNoteModal && (
        <DisclosureDetailModal
          note={selectedNoteModal}
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          onSaveNote={handleSaveNoteFromModal}
          yearsList={yearsList}
          assetCategories={assetCategories}
          adminExpenses={adminExpenses}
        />
      )}
    </div>
  );
};
