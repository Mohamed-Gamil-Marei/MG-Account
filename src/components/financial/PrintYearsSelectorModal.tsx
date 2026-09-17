import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Printer,
  X,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRightLeft,
  Eye,
  Settings2,
} from 'lucide-react';

export interface PrintYearsConfig {
  mode: 'SINGLE_YEAR' | 'CUSTOM_COMPARISON' | 'MULTI_YEARS';
  primaryYear: number;
  comparisonYear: number;
  selectedYears: number[];
}

interface PrintYearsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: PrintYearsConfig;
  onApplyConfig: (config: PrintYearsConfig) => void;
  onPrintNow?: () => void;
}

const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const PrintYearsSelectorModal: React.FC<PrintYearsSelectorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
  onPrintNow,
}) => {
  const [mode, setMode] = useState<PrintYearsConfig['mode']>(currentConfig.mode || 'CUSTOM_COMPARISON');
  const [primaryYear, setPrimaryYear] = useState<number>(currentConfig.primaryYear || 2026);
  const [comparisonYear, setComparisonYear] = useState<number>(
    currentConfig.comparisonYear || (currentConfig.primaryYear ? currentConfig.primaryYear - 1 : 2025)
  );
  const [selectedYears, setSelectedYears] = useState<number[]>(
    currentConfig.selectedYears?.length
      ? currentConfig.selectedYears
      : [currentConfig.primaryYear || 2026, currentConfig.primaryYear ? currentConfig.primaryYear - 1 : 2025]
  );

  if (!isOpen) return null;

  const toggleYearSelection = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length === 1) {
        alert('يجب اختيار سنة واحدة على الأقل');
        return;
      }
      setSelectedYears(selectedYears.filter((y) => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
    }
  };

  const handleSaveAndApply = (triggerPrint: boolean = false) => {
    let effectiveYears: number[] = [];
    if (mode === 'SINGLE_YEAR') {
      effectiveYears = [primaryYear];
    } else if (mode === 'CUSTOM_COMPARISON') {
      effectiveYears = [primaryYear, comparisonYear].sort((a, b) => b - a);
    } else {
      effectiveYears = selectedYears.sort((a, b) => b - a);
    }

    const config: PrintYearsConfig = {
      mode,
      primaryYear,
      comparisonYear,
      selectedYears: effectiveYears,
    };

    onApplyConfig(config);
    onClose();

    if (triggerPrint && onPrintNow) {
      setTimeout(() => {
        onPrintNow();
      }, 300);
    }
  };

  // Quick preset shortcuts
  const applyPreset = (presetType: 'CURRENT_SINGLE' | 'STANDARD_COMP' | 'THREE_YEARS' | 'FIVE_YEARS') => {
    if (presetType === 'CURRENT_SINGLE') {
      setMode('SINGLE_YEAR');
      setPrimaryYear(2026);
      setSelectedYears([2026]);
    } else if (presetType === 'STANDARD_COMP') {
      setMode('CUSTOM_COMPARISON');
      setPrimaryYear(2026);
      setComparisonYear(2025);
      setSelectedYears([2026, 2025]);
    } else if (presetType === 'THREE_YEARS') {
      setMode('MULTI_YEARS');
      setPrimaryYear(2026);
      setSelectedYears([2026, 2025, 2024]);
    } else if (presetType === 'FIVE_YEARS') {
      setMode('MULTI_YEARS');
      setPrimaryYear(2026);
      setSelectedYears([2026, 2025, 2024, 2023, 2022]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                تخصيص سنوات التقرير والطباعة (سنة محددة / مقارنة / سنوات متعددة)
              </h2>
              <p className="text-xs text-slate-300">
                تحكم كامل في أعمدة السنوات بالقوائم المالية مع خيار طباعة سنة منفردة أو نطاق متعدد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Presets Ribbon */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              نماذج سريعة جاهزة للطباعة:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('CURRENT_SINGLE')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                  mode === 'SINGLE_YEAR' && primaryYear === 2026
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                سنة 2026 فقط
              </button>
              <button
                type="button"
                onClick={() => applyPreset('STANDARD_COMP')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                  mode === 'CUSTOM_COMPARISON' && primaryYear === 2026 && comparisonYear === 2025
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                2026 مع مقارنة 2025
              </button>
              <button
                type="button"
                onClick={() => applyPreset('THREE_YEARS')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                  mode === 'MULTI_YEARS' && selectedYears.length === 3
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                مقارنة ثلاثية (3 سنوات)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('FIVE_YEARS')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                  mode === 'MULTI_YEARS' && selectedYears.length >= 5
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                مقارنة خماسية (5 سنوات)
              </button>
            </div>
          </div>

          {/* Mode Selection Radios */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-900 dark:text-slate-100 block">
              اختر نمط العرض والطباعة المطلوب:
            </label>

            {/* Option 1: Single Year */}
            <div
              onClick={() => setMode('SINGLE_YEAR')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'SINGLE_YEAR'
                  ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="print_years_mode"
                  checked={mode === 'SINGLE_YEAR'}
                  onChange={() => setMode('SINGLE_YEAR')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      1. طباعة سنة محددة واحدة فقط (بدون سنة مقارنة)
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                      أعرض مساحة وأسهل قراءة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يقوم بحذف عمود المقارنة نهائياً وعرض وطباعة أرقام السنة المحددة بعمود واحد متسع، وهو ممتاز للقوائم الداخلية أو الفترات المالية الأولى.
                  </p>

                  {mode === 'SINGLE_YEAR' && (
                    <div className="pt-3 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        اختر السنة المطلوبة:
                      </span>
                      <select
                        value={primaryYear}
                        onChange={(e) => setPrimaryYear(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold font-mono text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y}>
                            السنة المالية {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option 2: Custom Comparative Year */}
            <div
              onClick={() => setMode('CUSTOM_COMPARISON')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'CUSTOM_COMPARISON'
                  ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="print_years_mode"
                  checked={mode === 'CUSTOM_COMPARISON'}
                  onChange={() => setMode('CUSTOM_COMPARISON')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      2. سنة رئيسية مع سنة مقارنة مخصصة (Comparative Year)
                    </span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold">
                      معايير المحاسبة (EAS 1)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يتيح لك اختيار سنة الأساس بحرية وتحديد سنة المقارنة التي تفضلها (مثل مقارنة 2026 بـ 2024 أو 2023) بدلاً من الإجبار على سنة سابقة واحدة فقط.
                  </p>

                  {mode === 'CUSTOM_COMPARISON' && (
                    <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          سنة الأساس (السنة الحالية):
                        </label>
                        <select
                          value={primaryYear}
                          onChange={(e) => setPrimaryYear(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold font-mono text-slate-900 dark:text-slate-100"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          سنة المقارنة المختارة:
                        </label>
                        <select
                          value={comparisonYear}
                          onChange={(e) => setComparisonYear(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold font-mono text-slate-900 dark:text-slate-100"
                        >
                          {AVAILABLE_YEARS.filter((y) => y !== primaryYear).map((y) => (
                            <option key={y} value={y}>
                              {y} (سنة المقارنة)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option 3: Multi-Years Comparative Range */}
            <div
              onClick={() => setMode('MULTI_YEARS')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'MULTI_YEARS'
                  ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="print_years_mode"
                  checked={mode === 'MULTI_YEARS'}
                  onChange={() => setMode('MULTI_YEARS')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      3. مقارنة لسنوات متعددة (Multi-Year Series - من 3 إلى 5 سنوات)
                    </span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md font-bold">
                      للبنوك والائتمان والاستثمار
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يعرض ويطبع عدة سنوات متتالية في جدول واحد متكامل، لتقديم ملف مالي متكامل لجهات التمويل أو إدارة الشركة.
                  </p>

                  {mode === 'MULTI_YEARS' && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        حدد السنوات المراد إدراجها بالأعمدة:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_YEARS.map((y) => {
                          const isChecked = selectedYears.includes(y);
                          return (
                            <button
                              key={y}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleYearSelection(y);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                                isChecked
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${isChecked ? 'opacity-100' : 'opacity-20'}`}
                              />
                              <span>{y}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview of Header Columns */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              معاينة شكل أعمدة الجدول في الطباعة:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <div className="bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200">
                البيان (Description)
              </div>
              <div className="bg-slate-200 dark:bg-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200">
                الإيضاح
              </div>
              {mode === 'SINGLE_YEAR' && (
                <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                  31 ديسمبر {primaryYear} (عمود منفرد)
                </div>
              )}
              {mode === 'CUSTOM_COMPARISON' && (
                <>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                    31 ديسمبر {primaryYear} (الأساس)
                  </div>
                  <div className="bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                    31 ديسمبر {comparisonYear} (المقارنة)
                  </div>
                </>
              )}
              {mode === 'MULTI_YEARS' &&
                selectedYears
                  .slice()
                  .sort((a, b) => b - a)
                  .map((yr, idx) => (
                    <div
                      key={yr}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${
                        idx === 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white'
                      }`}
                    >
                      31 ديسمبر {yr}
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveAndApply(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition-all"
            >
              تطبيق على الشاشة
            </button>
            <button
              type="button"
              onClick={() => handleSaveAndApply(true)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>تطبيق وطباعة فورية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
