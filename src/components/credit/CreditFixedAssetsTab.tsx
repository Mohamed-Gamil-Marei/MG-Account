import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  TrendingDown,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  DollarSign,
  Download,
  Percent,
  Calculator,
  Building,
  Info,
  Repeat,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import * as XLSX from 'xlsx';
import { AccountingNumberInput } from '../common/AccountingNumberInput';
import { UnifiedSelectDropdown } from '../common/UnifiedSelectDropdown';
import { ActionMenu } from '../common/ActionMenu';

export interface FixedAssetCategoryItem {
  id: string;
  name: string;
  depRate: number; // percentage e.g. 5, 10, 15, 20, 25
  depreciationType: string;
  valuesByYear: Record<
    number,
    {
      costStart: number;
      additions: number;
      disposals: number;
      accumStart: number;
      accumDisposals?: number;
      customDepExpense?: number; // optional override
    }
  >;
  isCustom?: boolean;
}

export const DEFAULT_ASSET_CATEGORIES: FixedAssetCategoryItem[] = [
  {
    id: 'asset_1',
    name: 'الاراضي',
    depRate: 0,
    depreciationType: 'بدون إهلاك',
    valuesByYear: {
      2024: { costStart: 68000, additions: 0, disposals: 0, accumStart: 0, customDepExpense: 0 },
      2025: { costStart: 68000, additions: 0, disposals: 0, accumStart: 0, customDepExpense: 0 },
      2026: { costStart: 68000, additions: 0, disposals: 0, accumStart: 0, customDepExpense: 0 },
    },
  },
  {
    id: 'asset_2',
    name: 'مباني وتجهيزات',
    depRate: 10,
    depreciationType: 'العمر 10 سنوات (قسط ثابت)',
    valuesByYear: {
      2024: { costStart: 14974000, additions: 0, disposals: 0, accumStart: 704200, customDepExpense: 0 },
      2025: { costStart: 14974000, additions: 0, disposals: 0, accumStart: 704200, customDepExpense: 0 },
      2026: { costStart: 14974000, additions: 0, disposals: 0, accumStart: 704200, customDepExpense: 0 },
    },
  },
  {
    id: 'asset_3',
    name: 'الالات ومعدات',
    depRate: 10,
    depreciationType: 'العمر 10 سنوات (قسط ثابت)',
    valuesByYear: {
      2024: { costStart: 17842500, additions: 0, disposals: 0, accumStart: 1413037, customDepExpense: 2208763 },
      2025: { costStart: 17842500, additions: 0, disposals: 0, accumStart: 3621800, customDepExpense: 2208763 },
      2026: { costStart: 17842500, additions: 0, disposals: 0, accumStart: 5829800, customDepExpense: 2208763 },
    },
  },
];

interface CreditFixedAssetsTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  assetCategories: FixedAssetCategoryItem[];
  onUpdateAssetCategories: (items: FixedAssetCategoryItem[]) => void;
  onResetAssets?: () => void;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
}

export const CreditFixedAssetsTab: React.FC<CreditFixedAssetsTabProps> = ({
  yearsList,
  computedData,
  assetCategories,
  onUpdateAssetCategories,
  onResetAssets,
  periodStartDate,
  periodEndDate,
  periodLabel,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(
    yearsList[yearsList.length - 1] || 2026
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newDepRate, setNewDepRate] = useState<number>(10);
  const [newCostStart, setNewCostStart] = useState<number>(200000);
  const [newAdditions, setNewAdditions] = useState<number>(20000);
  const [newAccumStart, setNewAccumStart] = useState<number>(40000);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepRate, setEditDepRate] = useState<number>(10);

  // Helper to compute rows for a specific year
  const getCalculatedRowsForYear = (yr: number) => {
    return assetCategories.map((cat) => {
      const yrData = cat.valuesByYear?.[yr] || {
        costStart: 100000,
        additions: 0,
        disposals: 0,
        accumStart: 20000,
        accumDisposals: 0,
      };

      const costEnd = (yrData.costStart || 0) + (yrData.additions || 0) - (yrData.disposals || 0);

      // Automated depreciation calculation based on depRate %
      const calculatedDep =
        cat.depRate > 0 ? Math.round(costEnd * (cat.depRate / 100)) : 0;
      const depExpense =
        yrData.customDepExpense !== undefined
          ? yrData.customDepExpense
          : calculatedDep;

      const accumDisposals = yrData.accumDisposals || 0;
      const accumEnd = (yrData.accumStart || 0) + depExpense - accumDisposals;
      const netBookValue = Math.max(0, costEnd - accumEnd);

      return {
        ...cat,
        costStart: yrData.costStart || 0,
        additions: yrData.additions || 0,
        disposals: yrData.disposals || 0,
        costEnd,
        accumStart: yrData.accumStart || 0,
        accumDisposals,
        depExpense,
        accumEnd,
        netBookValue,
      };
    });
  };

  const calculatedRows = getCalculatedRowsForYear(selectedYear);

  // Totals for selected year
  const totalCostStart = calculatedRows.reduce((sum, r) => sum + r.costStart, 0);
  const totalAdditions = calculatedRows.reduce((sum, r) => sum + r.additions, 0);
  const totalDisposals = calculatedRows.reduce((sum, r) => sum + r.disposals, 0);
  const totalCostEnd = calculatedRows.reduce((sum, r) => sum + r.costEnd, 0);
  const totalAccumStart = calculatedRows.reduce((sum, r) => sum + r.accumStart, 0);
  const totalDepExpense = calculatedRows.reduce((sum, r) => sum + r.depExpense, 0);
  const totalAccumEnd = calculatedRows.reduce((sum, r) => sum + r.accumEnd, 0);
  const totalNetValue = calculatedRows.reduce((sum, r) => sum + r.netBookValue, 0);

  // Add Asset Row
  const handleAddAsset = () => {
    if (!newAssetName.trim()) return;

    const newId = `asset_${Date.now()}`;
    const valuesByYear: Record<number, any> = {};

    yearsList.forEach((yr, idx) => {
      const factor = 1 + (idx - (yearsList.length - 1)) * 0.1;
      valuesByYear[yr] = {
        costStart: Math.round(newCostStart * Math.max(0.5, factor)),
        additions: Math.round(newAdditions * Math.max(0.5, factor)),
        disposals: 0,
        accumStart: Math.round(newAccumStart * Math.max(0.5, factor)),
        accumDisposals: 0,
      };
    });

    const newItem: FixedAssetCategoryItem = {
      id: newId,
      name: newAssetName.trim(),
      depRate: newDepRate,
      depreciationType:
        newDepRate === 0
          ? 'بدون إهلاك'
          : `قسط ثابت ${newDepRate}%`,
      valuesByYear,
      isCustom: true,
    };

    onUpdateAssetCategories([...assetCategories, newItem]);
    setNewAssetName('');
    setNewDepRate(10);
    setNewCostStart(200000);
    setNewAdditions(20000);
    setNewAccumStart(40000);
    setIsAddingNew(false);
  };

  // Delete Asset
  const handleDeleteAsset = (id: string) => {
    const updated = assetCategories.filter((i) => i.id !== id);
    onUpdateAssetCategories(updated);
  };

  // Update Field Value
  const handleUpdateFieldValue = (
    id: string,
    field: 'costStart' | 'additions' | 'disposals' | 'accumStart' | 'depRate',
    value: number
  ) => {
    const updated = assetCategories.map((item) => {
      if (item.id === id) {
        if (field === 'depRate') {
          return {
            ...item,
            depRate: value,
            depreciationType: value === 0 ? 'بدون إهلاك' : `قسط ثابت ${value}%`,
          };
        }

        const currentYr = item.valuesByYear?.[selectedYear] || {
          costStart: 0,
          additions: 0,
          disposals: 0,
          accumStart: 0,
        };

        return {
          ...item,
          valuesByYear: {
            ...item.valuesByYear,
            [selectedYear]: {
              ...currentYr,
              [field]: value,
            },
          },
        };
      }
      return item;
    });

    onUpdateAssetCategories(updated);
  };

  // Start edit metadata
  const handleStartEdit = (cat: FixedAssetCategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDepRate(cat.depRate);
  };

  // Save edit metadata
  const handleSaveEdit = (id: string) => {
    const updated = assetCategories.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: editName.trim() || item.name,
          depRate: editDepRate,
          depreciationType:
            editDepRate === 0
              ? 'بدون إهلاك'
              : `قسط ثابت ${editDepRate}%`,
        };
      }
      return item;
    });
    onUpdateAssetCategories(updated);
    setEditingId(null);
  };

  // Automatic Rollover Logic: Closing balances of year T become opening balances of year T+1
  const handleRollForwardFromPrevYear = (targetYear: number) => {
    const prevYear = targetYear - 1;
    if (!yearsList.includes(prevYear)) return;

    const updated = assetCategories.map((cat) => {
      const prevData = cat.valuesByYear?.[prevYear] || {
        costStart: 0,
        additions: 0,
        disposals: 0,
        accumStart: 0,
        accumDisposals: 0,
      };

      const costEndPrev = (prevData.costStart || 0) + (prevData.additions || 0) - (prevData.disposals || 0);
      const depPrev = prevData.customDepExpense !== undefined
        ? prevData.customDepExpense
        : (cat.depRate > 0 ? Math.round(costEndPrev * (cat.depRate / 100)) : 0);
      const accumEndPrev = (prevData.accumStart || 0) + depPrev - (prevData.accumDisposals || 0);

      const targetCurrent = cat.valuesByYear?.[targetYear] || {
        costStart: 0,
        additions: 0,
        disposals: 0,
        accumStart: 0,
        accumDisposals: 0,
      };

      return {
        ...cat,
        valuesByYear: {
          ...cat.valuesByYear,
          [targetYear]: {
            ...targetCurrent,
            costStart: costEndPrev,
            accumStart: accumEndPrev,
          },
        },
      };
    });

    onUpdateAssetCategories(updated);
  };

  const handleRollForwardAllYears = () => {
    let currentCats = [...assetCategories];
    const sorted = [...yearsList].sort((a, b) => a - b);

    for (let i = 1; i < sorted.length; i++) {
      const prevYr = sorted[i - 1];
      const currYr = sorted[i];

      currentCats = currentCats.map((cat) => {
        const prevData = cat.valuesByYear?.[prevYr] || {
          costStart: 0,
          additions: 0,
          disposals: 0,
          accumStart: 0,
          accumDisposals: 0,
        };
        const costEndPrev = (prevData.costStart || 0) + (prevData.additions || 0) - (prevData.disposals || 0);
        const depPrev = prevData.customDepExpense !== undefined
          ? prevData.customDepExpense
          : (cat.depRate > 0 ? Math.round(costEndPrev * (cat.depRate / 100)) : 0);
        const accumEndPrev = (prevData.accumStart || 0) + depPrev - (prevData.accumDisposals || 0);

        const currData = cat.valuesByYear?.[currYr] || {
          costStart: 0,
          additions: 0,
          disposals: 0,
          accumStart: 0,
          accumDisposals: 0,
        };

        return {
          ...cat,
          valuesByYear: {
            ...cat.valuesByYear,
            [currYr]: {
              ...currData,
              costStart: costEndPrev,
              accumStart: accumEndPrev,
            },
          },
        };
      });
    }

    onUpdateAssetCategories(currentCats);
  };

  // Dedicated Excel Export
  const handleExportAssetsExcel = () => {
    const wb = XLSX.utils.book_new();

    yearsList.forEach((yr) => {
      const rowsYear = getCalculatedRowsForYear(yr);
      const sheetData = rowsYear.map((r, idx) => ({
        'م': idx + 1,
        'بيان الأصل الثابت': r.name,
        'نسبة الإهلاك السنوية': r.depRate === 0 ? '0%' : `${r.depRate}%`,
        'طريقة الإهلاك': r.depreciationType,
        'تكلفة أول الفترة': r.costStart,
        'إضافات العام': r.additions,
        'استبعادات العام': r.disposals,
        'إجمالي التكلفة آخر الفترة': r.costEnd,
        'مجمع إهلاك أول الفترة': r.accumStart,
        'إهلاك العام المحسوب': r.depExpense,
        'مجمع إهلاك آخر الفترة': r.accumEnd,
        'صافي القيمة الدفترية': r.netBookValue,
      }));

      // Add Totals
      const totCostStart = rowsYear.reduce((s, r) => s + r.costStart, 0);
      const totAdd = rowsYear.reduce((s, r) => s + r.additions, 0);
      const totDisp = rowsYear.reduce((s, r) => s + r.disposals, 0);
      const totCostEnd = rowsYear.reduce((s, r) => s + r.costEnd, 0);
      const totAccumStart = rowsYear.reduce((s, r) => s + r.accumStart, 0);
      const totDep = rowsYear.reduce((s, r) => s + r.depExpense, 0);
      const totAccumEnd = rowsYear.reduce((s, r) => s + r.accumEnd, 0);
      const totNet = rowsYear.reduce((s, r) => s + r.netBookValue, 0);

      sheetData.push({
        'م': 0,
        'بيان الأصل الثابت': 'إجمالي الأصول الثابتة ومجمع الإهلاك',
        'نسبة الإهلاك السنوية': '-',
        'طريقة الإهلاك': 'المجموع الكلي',
        'تكلفة أول الفترة': totCostStart,
        'إضافات العام': totAdd,
        'استبعادات العام': totDisp,
        'إجمالي التكلفة آخر الفترة': totCostEnd,
        'مجمع إهلاك أول الفترة': totAccumStart,
        'إهلاك العام المحسوب': totDep,
        'مجمع إهلاك آخر الفترة': totAccumEnd,
        'صافي القيمة الدفترية': totNet,
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, `إهلاك الأصول ${yr}`);
    });

    XLSX.writeFile(wb, `جدول_إهلاك_وحركة_الأصول_الثابتة_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                جدول إهلاك وحركة الأصول الثابتة التفاعلي (معيار المحاسبة المصري 10)
              </h2>
              <p className="text-xs text-slate-500">
                حساب آلي ودقيق لإهلاك كل أصل بناءً على نسبة الإهلاك المحددة، مع ترحيل صافي القيمة الدفترية إلى الميزانية وقسط الإهلاك إلى قائمة الدخل.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls - Unified Dropdown Design */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Unified Year Dropdown */}
          <UnifiedSelectDropdown<number>
            id="fixed-assets-year-dropdown"
            label="سنة العرض"
            value={selectedYear}
            options={yearsList.map((yr) => ({
              id: yr,
              label: `سنة ${yr}`,
              sublabel: `حركة وإهلاك أصول ${yr}`,
            }))}
            onChange={(yr) => setSelectedYear(yr)}
          />

          {/* Action Menu */}
          <ActionMenu
            id="fixed-assets-action-menu"
            label="خيارات وإجراءات"
            triggerVariant="primary"
            align="left"
            items={[
              {
                id: 'add-asset',
                label: 'إضافة أصل ثابت جديد',
                icon: Plus,
                onClick: () => setIsAddingNew(true),
              },
              {
                id: 'export-assets-excel',
                label: 'تصدير جدول الإهلاك (Excel)',
                icon: Download,
                variant: 'success',
                onClick: handleExportAssetsExcel,
              },
              {
                id: 'rollover-prev-year',
                label: `ترحيل أرصدة السنة السابقة (${selectedYear - 1}) إلى (${selectedYear})`,
                icon: Repeat,
                disabled: !yearsList.includes(selectedYear - 1),
                onClick: () => handleRollForwardFromPrevYear(selectedYear),
              },
              {
                id: 'rollover-all-years',
                label: 'ترحيل مجمع الإهلاك والتكلفة عبر كل السنوات بالتتابع',
                icon: RefreshCw,
                onClick: handleRollForwardAllYears,
              },
              ...(onResetAssets
                ? [
                    {
                      id: 'reset-assets',
                      label: 'استعادة القيم والبنود القياسية',
                      icon: RefreshCw,
                      onClick: onResetAssets,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      {/* KPI Cards for Selected Year */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            إجمالي التكلفة التاريخية ({selectedYear}):
          </span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {formatEgyptianCurrency(totalCostEnd)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            إضافات العام: {formatEgyptianCurrency(totalAdditions)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            قسط إهلاك العام ({selectedYear}):
          </span>
          <div className="text-lg font-black text-amber-700 font-mono mt-1">
            {formatEgyptianCurrency(totalDepExpense)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            مرحل تلقائياً لقائمة الدخل
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            مجمع الإهلاك حتى نهاية ({selectedYear}):
          </span>
          <div className="text-lg font-black text-rose-700 font-mono mt-1">
            {formatEgyptianCurrency(totalAccumEnd)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            مجمع أول المدة: {formatEgyptianCurrency(totalAccumStart)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs bg-blue-50/30 border-blue-200">
          <span className="text-xs text-blue-900 font-bold block">
            صافي القيمة الدفترية ({selectedYear}):
          </span>
          <div className="text-xl font-black text-blue-900 font-mono mt-1">
            {formatEgyptianCurrency(totalNetValue)}
          </div>
          <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">
            مرحل للميزانية العمومية والإيضاحات
          </span>
        </div>
      </div>

      {/* Add New Asset Form */}
      {isAddingNew && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-blue-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" />
              إضافة أصل ثابت جديد أو توسعة رأسمالية
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                اسم الأصل الثابت:
              </label>
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="مثال: خط تعبئة وتغليف آلي"
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                نسبة الإهلاك السنوية %:
              </label>
              <AccountingNumberInput
                value={newDepRate}
                onChange={(val) => setNewDepRate(val)}
                allowNegative={false}
                allowDecimals={true}
                decimalPlaces={2}
                placeholder="10"
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                تكلفة أول المدة (ج.م):
              </label>
              <AccountingNumberInput
                value={newCostStart}
                onChange={(val) => setNewCostStart(val)}
                allowNegative={true}
                allowDecimals={true}
                decimalPlaces={2}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                مجمع إهلاك أول المدة:
              </label>
              <AccountingNumberInput
                value={newAccumStart}
                onChange={(val) => setNewAccumStart(val)}
                allowNegative={true}
                allowDecimals={true}
                decimalPlaces={2}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600 font-mono"
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
              onClick={handleAddAsset}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              حفظ الأصل واحتساب الإهلاك
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Table for Active Fiscal Year */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-black text-slate-800">
              جدول حركة وإهلاك الأصول الثابتة {periodEndDate ? `كما في ${periodEndDate}` : `للسنة المالية ${selectedYear}`}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {periodStartDate && periodEndDate && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[11px]">
                {periodStartDate} ← {periodEndDate}
              </span>
            )}
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>القيم محسوبة تفاعلياً وتعديل أي رقم يحدّث المعادلة المحاسبية فوراً</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-8 text-center">م</th>
                <th className="py-3 px-3 min-w-[200px]">بيان الأصل الثابت</th>
                <th className="py-3 px-2 w-20 text-center">نسبة الإهلاك</th>
                <th className="py-3 px-3 min-w-[120px] text-center">تكلفة أول الفترة</th>
                <th className="py-3 px-3 min-w-[110px] text-center">إضافات العام</th>
                <th className="py-3 px-3 min-w-[110px] text-center">استبعادات</th>
                <th className="py-3 px-3 min-w-[130px] text-center bg-slate-200/60">
                  إجمالي التكلفة
                </th>
                <th className="py-3 px-3 min-w-[120px] text-center">مجمع أول الفترة</th>
                <th className="py-3 px-3 min-w-[120px] text-center bg-amber-50 text-amber-900">
                  إهلاك العام
                </th>
                <th className="py-3 px-3 min-w-[120px] text-center bg-rose-50 text-rose-900">
                  مجمع آخر الفترة
                </th>
                <th className="py-3 px-3 min-w-[140px] text-center bg-blue-100 text-blue-950 font-black">
                  صافي القيمة الدفترية
                </th>
                <th className="py-3 px-2 w-16 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculatedRows.map((cat, idx) => {
                const isEditing = editingId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs font-bold border border-blue-300 rounded-lg px-2 py-1 bg-white outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>{cat.name}</span>
                          {cat.isCustom && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                              مخصص
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Dep Rate */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editDepRate}
                          onChange={(e) => setEditDepRate(parseFloat(e.target.value) || 0)}
                          className="w-14 text-center text-xs font-bold border border-blue-300 rounded px-1 py-1"
                        />
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            cat.depRate === 0
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {cat.depRate}%
                        </span>
                      )}
                    </td>

                    {/* Cost Start */}
                    <td className="py-2.5 px-2 text-center">
                      <AccountingNumberInput
                        value={cat.costStart}
                        onChange={(val) => handleUpdateFieldValue(cat.id, 'costStart', val)}
                        allowNegative={true}
                        allowDecimals={true}
                        decimalPlaces={2}
                        className="w-full text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-600 rounded-lg px-1.5 py-1 outline-none transition-colors"
                      />
                    </td>

                    {/* Additions */}
                    <td className="py-2.5 px-2 text-center">
                      <AccountingNumberInput
                        value={cat.additions}
                        onChange={(val) => handleUpdateFieldValue(cat.id, 'additions', val)}
                        allowNegative={true}
                        allowDecimals={true}
                        decimalPlaces={2}
                        className="w-full text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-600 rounded-lg px-1.5 py-1 outline-none transition-colors text-emerald-800"
                      />
                    </td>

                    {/* Disposals */}
                    <td className="py-2.5 px-2 text-center">
                      <AccountingNumberInput
                        value={cat.disposals}
                        onChange={(val) => handleUpdateFieldValue(cat.id, 'disposals', val)}
                        allowNegative={true}
                        allowDecimals={true}
                        decimalPlaces={2}
                        className="w-full text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-600 rounded-lg px-1.5 py-1 outline-none transition-colors text-rose-800"
                      />
                    </td>

                    {/* Cost End (Calculated) */}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-100/60">
                      {formatEgyptianCurrency(cat.costEnd, true)}
                    </td>

                    {/* Accum Start */}
                    <td className="py-2.5 px-2 text-center">
                      <AccountingNumberInput
                        value={cat.accumStart}
                        onChange={(val) => handleUpdateFieldValue(cat.id, 'accumStart', val)}
                        allowNegative={true}
                        allowDecimals={true}
                        decimalPlaces={2}
                        className="w-full text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-600 rounded-lg px-1.5 py-1 outline-none transition-colors text-amber-900"
                      />
                    </td>

                    {/* Dep Expense of Year (Calculated automatically based on % rate) */}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-amber-800 bg-amber-50/60">
                      {formatEgyptianCurrency(cat.depExpense, true)}
                    </td>

                    {/* Accum End (Calculated) */}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-rose-800 bg-rose-50/60">
                      {formatEgyptianCurrency(cat.accumEnd, true)}
                    </td>

                    {/* Net Book Value (Calculated) */}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-blue-900 bg-blue-50/80">
                      {formatEgyptianCurrency(cat.netBookValue, true)}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            title="حفظ التعديل"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer"
                            title="تعديل المسمى والنسبة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(cat.id)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          title="حذف هذا الأصل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Totals Summary Row */}
              <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-950">
                <td className="py-3 px-3 text-center">∑</td>
                <td className="py-3 px-3 text-sm">إجمالي الأصول الثابتة والإهلاك</td>
                <td className="py-3 px-2 text-center text-slate-400">-</td>
                <td className="py-3 px-3 text-center font-mono">
                  {formatEgyptianCurrency(totalCostStart)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-emerald-400">
                  {formatEgyptianCurrency(totalAdditions)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-rose-400">
                  {formatEgyptianCurrency(totalDisposals)}
                </td>
                <td className="py-3 px-3 text-center font-mono bg-slate-800 text-amber-300">
                  {formatEgyptianCurrency(totalCostEnd)}
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  {formatEgyptianCurrency(totalAccumStart)}
                </td>
                <td className="py-3 px-3 text-center font-mono bg-amber-950 text-amber-300">
                  {formatEgyptianCurrency(totalDepExpense)}
                </td>
                <td className="py-3 px-3 text-center font-mono bg-rose-950 text-rose-300">
                  {formatEgyptianCurrency(totalAccumEnd)}
                </td>
                <td className="py-3 px-3 text-center font-mono bg-blue-900 text-white text-sm">
                  {formatEgyptianCurrency(totalNetValue)}
                </td>
                <td className="py-3 px-2 text-center text-emerald-400">
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
