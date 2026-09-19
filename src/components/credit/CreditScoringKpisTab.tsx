import React, { useState, useMemo } from 'react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  TrendingUp,
  Percent,
  Layers,
  Scale,
  Download,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Lock,
  Unlock,
  Settings2,
  Eye,
  EyeOff,
  Coins,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../../utils/excelArabicStyler';
import { FiscalYearData } from './CreditYearlyEditor';
import { UnifiedSelectDropdown } from '../common/UnifiedSelectDropdown';
import { ActionMenu } from '../common/ActionMenu';

export interface CustomCreditRatioItem {
  id: string;
  name: string;
  category: 'PREDICTION' | 'SOLVENCY' | 'LIQUIDITY' | 'PROFITABILITY' | 'COVENANTS';
  benchmark: string;
  values: Record<number, number | string>;
  note?: string;
}

export interface StressScenarioItem {
  id: string;
  title: string;
  profitImpact: string;
  dscr: string;
  result: string;
}

export interface CreditMemoConfig {
  modelType: 'MANUFACTURING' | 'NON_MANUFACTURING';
  annualDebtPrincipalRate: number; // e.g. 20%
  facilityRatio: number; // e.g. 30% of sales
  overdraftRatio: number; // e.g. 60%
  lettersOfCreditRatio: number; // e.g. 40%
  guaranteesText: string;
  covenantsText: string;
  recommendationDecision: 'APPROVED' | 'CONDITIONAL' | 'REVIEW';
  recommendationNote: string;
  stressScenarios: StressScenarioItem[];
}

export const DEFAULT_STRESS_SCENARIOS: StressScenarioItem[] = [
  {
    id: 's1',
    title: 'السيناريو 1: انخفاض المبيعات بنسبة 10%',
    profitImpact: 'تراجع صافي الربح بنسبة 14%',
    dscr: '1.45x (> 1.25x)',
    result: 'صلابة مالية تامة',
  },
  {
    id: 's2',
    title: 'السيناريو 2: ارتفاع تكلفة المبيعات (COGS) بنسبة 5%',
    profitImpact: 'تراجع هامش الربح 3.5%',
    dscr: '1.38x (> 1.25x)',
    result: 'قدرة استيعابية ممتازة',
  },
  {
    id: 's3',
    title: 'السيناريو 3: زيادة أسعار الفائدة المصرفية بمقدار 200 نقطة أساس',
    profitImpact: 'زيادة أعباء التمويل 12%',
    dscr: '1.35x (> 1.25x)',
    result: 'تغطية آمنة دون تعثر',
  },
];

export const DEFAULT_CREDIT_MEMO_CONFIG: CreditMemoConfig = {
  modelType: 'NON_MANUFACTURING',
  annualDebtPrincipalRate: 20,
  facilityRatio: 30,
  overdraftRatio: 60,
  lettersOfCreditRatio: 40,
  guaranteesText:
    'التنازل عن مستحقات أوامر التوريد والعقود لصالح البنك + كفالة تضامنية وشخصية من الشركاء الرئيسيين + تحصيل شيكات العملاء عبر الحساب الجاري + رهن تجاري على أصول ومعدات الشركة.',
  covenantsText:
    'الحفاظ على معدل تداول لا يقل عن 1.30x، ومعدل تغطية خدمة دين (DSCR) لا يقل عن 1.25x، وألا يتجاوز إجمالي الرافعة المالية (D/E) حاجز 1.50x، مع تقديم قوائم مالية ربع سنوية وسنوية مدققة بانتظام.',
  recommendationDecision: 'APPROVED',
  recommendationNote:
    'الشركة مؤهلة للحصول على التسهيلات الائتمانية المطلوبة بملاءة مالية متينة وتدفقات نقدية تشغيلية مطمئنة.',
  stressScenarios: DEFAULT_STRESS_SCENARIOS,
};

export interface CreditScoringKpisTabProps {
  yearsData: Record<number, any>;
  yearsList: number[];
  computedData: Record<number, any>;
  companyName?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  // Flexibility Extensions
  customCreditRatios?: CustomCreditRatioItem[];
  onUpdateCustomCreditRatios?: (ratios: CustomCreditRatioItem[]) => void;
  creditRatioNames?: Record<string, string>;
  onUpdateCreditRatioName?: (id: string, name: string) => void;
  hiddenCreditRatioIds?: string[];
  onToggleHideCreditRatio?: (id: string) => void;
  onRestoreAllCreditRatios?: () => void;
  creditRatioBenchmarks?: Record<string, string>;
  onUpdateCreditRatioBenchmark?: (id: string, benchmark: string) => void;
  manualCreditRatioValues?: Record<string, Record<number, number | string>>;
  onUpdateManualCreditRatioValue?: (id: string, year: number, val: number | string | null) => void;
  creditMemoConfig?: CreditMemoConfig;
  onUpdateCreditMemoConfig?: (config: CreditMemoConfig) => void;
}

export const CreditScoringKpisTab: React.FC<CreditScoringKpisTabProps> = ({
  yearsData,
  yearsList,
  computedData,
  companyName = 'شركة العميل',
  periodStartDate,
  periodEndDate,
  periodLabel,
  customCreditRatios = [],
  onUpdateCustomCreditRatios,
  creditRatioNames = {},
  onUpdateCreditRatioName,
  hiddenCreditRatioIds = [],
  onToggleHideCreditRatio,
  onRestoreAllCreditRatios,
  creditRatioBenchmarks = {},
  onUpdateCreditRatioBenchmark,
  manualCreditRatioValues = {},
  onUpdateManualCreditRatioValue,
  creditMemoConfig = DEFAULT_CREDIT_MEMO_CONFIG,
  onUpdateCreditMemoConfig,
}) => {
  // Local fallbacks if parent is uncontrolled
  const [localCustomRatios, setLocalCustomRatios] = useState<CustomCreditRatioItem[]>(customCreditRatios);
  const [localNames, setLocalNames] = useState<Record<string, string>>(creditRatioNames);
  const [localHiddenIds, setLocalHiddenIds] = useState<string[]>(hiddenCreditRatioIds);
  const [localBenchmarks, setLocalBenchmarks] = useState<Record<string, string>>(creditRatioBenchmarks);
  const [localManualValues, setLocalManualValues] = useState<Record<string, Record<number, number | string>>>(manualCreditRatioValues);
  const [localConfig, setLocalConfig] = useState<CreditMemoConfig>(creditMemoConfig);

  const activeCustomRatios = onUpdateCustomCreditRatios ? customCreditRatios : localCustomRatios;
  const activeNames = onUpdateCreditRatioName ? creditRatioNames : localNames;
  const activeHiddenIds = onToggleHideCreditRatio ? hiddenCreditRatioIds : localHiddenIds;
  const activeBenchmarks = onUpdateCreditRatioBenchmark ? creditRatioBenchmarks : localBenchmarks;
  const activeManualValues = onUpdateManualCreditRatioValue ? manualCreditRatioValues : localManualValues;
  const activeConfig = onUpdateCreditMemoConfig ? creditMemoConfig : localConfig;

  // View & UI Toggles
  const [isDirectEditMode, setIsDirectEditMode] = useState<boolean>(false);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState<boolean>(true);
  const [isPolicyPanelOpen, setIsPolicyPanelOpen] = useState<boolean>(false);
  const [isStressPanelOpen, setIsStressPanelOpen] = useState<boolean>(true);
  const [isMemoPanelOpen, setIsMemoPanelOpen] = useState<boolean>(true);

  // Renaming state
  const [editingRatioId, setEditingRatioId] = useState<string | null>(null);
  const [editingRatioTempName, setEditingRatioTempName] = useState<string>('');

  // Benchmark editing state
  const [editingBenchmarkId, setEditingBenchmarkId] = useState<string | null>(null);
  const [editingBenchmarkTemp, setEditingBenchmarkTemp] = useState<string>('');

  // Add Custom Ratio Modal
  const [isAddRatioModalOpen, setIsAddRatioModalOpen] = useState<boolean>(false);
  const [newRatioName, setNewRatioName] = useState<string>('');
  const [newRatioCategory, setNewRatioCategory] = useState<CustomCreditRatioItem['category']>('LIQUIDITY');
  const [newRatioBenchmark, setNewRatioBenchmark] = useState<string>('≥ 1.00x');
  const [newRatioValues, setNewRatioValues] = useState<Record<number, string>>({});
  const [newRatioNote, setNewRatioNote] = useState<string>('');

  // Add Stress Scenario Modal
  const [isAddScenarioModalOpen, setIsAddScenarioModalOpen] = useState<boolean>(false);
  const [newScenarioTitle, setNewScenarioTitle] = useState<string>('');
  const [newScenarioImpact, setNewScenarioImpact] = useState<string>('');
  const [newScenarioDscr, setNewScenarioDscr] = useState<string>('');
  const [newScenarioResult, setNewScenarioResult] = useState<string>('');

  const updateConfig = (updater: (prev: CreditMemoConfig) => CreditMemoConfig) => {
    const next = updater(activeConfig);
    if (onUpdateCreditMemoConfig) {
      onUpdateCreditMemoConfig(next);
    } else {
      setLocalConfig(next);
    }
  };

  const handleToggleHide = (id: string) => {
    if (onToggleHideCreditRatio) {
      onToggleHideCreditRatio(id);
    } else {
      setLocalHiddenIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handleRestoreAll = () => {
    if (onRestoreAllCreditRatios) {
      onRestoreAllCreditRatios();
    } else {
      setLocalHiddenIds([]);
    }
  };

  const handleSaveRatioName = (id: string) => {
    if (!editingRatioTempName.trim()) {
      setEditingRatioId(null);
      return;
    }
    if (onUpdateCreditRatioName) {
      onUpdateCreditRatioName(id, editingRatioTempName.trim());
    } else {
      setLocalNames((prev) => ({ ...prev, [id]: editingRatioTempName.trim() }));
    }
    // Also check if it's a custom ratio
    const isCustom = activeCustomRatios.some((r) => r.id === id);
    if (isCustom) {
      const updated = activeCustomRatios.map((r) =>
        r.id === id ? { ...r, name: editingRatioTempName.trim() } : r
      );
      if (onUpdateCustomCreditRatios) {
        onUpdateCustomCreditRatios(updated);
      } else {
        setLocalCustomRatios(updated);
      }
    }
    setEditingRatioId(null);
  };

  const handleSaveBenchmark = (id: string) => {
    if (!editingBenchmarkTemp.trim()) {
      setEditingBenchmarkId(null);
      return;
    }
    if (onUpdateCreditRatioBenchmark) {
      onUpdateCreditRatioBenchmark(id, editingBenchmarkTemp.trim());
    } else {
      setLocalBenchmarks((prev) => ({ ...prev, [id]: editingBenchmarkTemp.trim() }));
    }
    const isCustom = activeCustomRatios.some((r) => r.id === id);
    if (isCustom) {
      const updated = activeCustomRatios.map((r) =>
        r.id === id ? { ...r, benchmark: editingBenchmarkTemp.trim() } : r
      );
      if (onUpdateCustomCreditRatios) {
        onUpdateCustomCreditRatios(updated);
      } else {
        setLocalCustomRatios(updated);
      }
    }
    setEditingBenchmarkId(null);
  };

  const handleDeleteCustomRatio = (id: string) => {
    const updated = activeCustomRatios.filter((r) => r.id !== id);
    if (onUpdateCustomCreditRatios) {
      onUpdateCustomCreditRatios(updated);
    } else {
      setLocalCustomRatios(updated);
    }
  };

  const handleUpdateCellValue = (id: string, yr: number, val: string) => {
    const parsed = val === '' ? null : isNaN(Number(val)) ? val : Number(val);
    if (onUpdateManualCreditRatioValue) {
      onUpdateManualCreditRatioValue(id, yr, parsed);
    } else {
      setLocalManualValues((prev) => {
        const next = { ...prev };
        if (!next[id]) next[id] = {};
        if (parsed === null) {
          delete next[id][yr];
        } else {
          next[id][yr] = parsed;
        }
        return next;
      });
    }

    // Also update custom ratio if applicable
    const isCustom = activeCustomRatios.some((r) => r.id === id);
    if (isCustom) {
      const updated = activeCustomRatios.map((r) => {
        if (r.id === id) {
          const nextValues = { ...r.values };
          if (parsed === null) {
            delete nextValues[yr];
          } else {
            nextValues[yr] = parsed;
          }
          return { ...r, values: nextValues };
        }
        return r;
      });
      if (onUpdateCustomCreditRatios) {
        onUpdateCustomCreditRatios(updated);
      } else {
        setLocalCustomRatios(updated);
      }
    }
  };

  const handleResetCellValue = (id: string, yr: number) => {
    handleUpdateCellValue(id, yr, '');
  };

  const handleAddCustomRatio = () => {
    if (!newRatioName.trim()) return;
    const valuesParsed: Record<number, number | string> = {};
    yearsList.forEach((yr) => {
      const raw = newRatioValues[yr];
      if (raw !== undefined && raw.trim() !== '') {
        valuesParsed[yr] = isNaN(Number(raw)) ? raw : Number(raw);
      } else {
        valuesParsed[yr] = 0;
      }
    });

    const newRatio: CustomCreditRatioItem = {
      id: `custom_ratio_${Date.now()}`,
      name: newRatioName.trim(),
      category: newRatioCategory,
      benchmark: newRatioBenchmark.trim() || '—',
      values: valuesParsed,
      note: newRatioNote.trim(),
    };

    const updated = [...activeCustomRatios, newRatio];
    if (onUpdateCustomCreditRatios) {
      onUpdateCustomCreditRatios(updated);
    } else {
      setLocalCustomRatios(updated);
    }

    setNewRatioName('');
    setNewRatioBenchmark('≥ 1.00x');
    setNewRatioValues({});
    setNewRatioNote('');
    setIsAddRatioModalOpen(false);
  };

  const handleAddStressScenario = () => {
    if (!newScenarioTitle.trim()) return;
    const scenario: StressScenarioItem = {
      id: `sc_${Date.now()}`,
      title: newScenarioTitle.trim(),
      profitImpact: newScenarioImpact.trim() || 'تراجع في حدود المقبول',
      dscr: newScenarioDscr.trim() || '1.30x',
      result: newScenarioResult.trim() || 'صلابة مالية',
    };
    updateConfig((prev) => ({
      ...prev,
      stressScenarios: [...prev.stressScenarios, scenario],
    }));
    setNewScenarioTitle('');
    setNewScenarioImpact('');
    setNewScenarioDscr('');
    setNewScenarioResult('');
    setIsAddScenarioModalOpen(false);
  };

  const handleDeleteStressScenario = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      stressScenarios: prev.stressScenarios.filter((s) => s.id !== id),
    }));
  };

  // Calculate Altman Z-score & Banking Ratios for all years
  const metricsByYear = useMemo(() => {
    return yearsList.reduce((acc, yr) => {
      const c = computedData[yr] || {};
      const sales = c.sales || 1;
      const totalAssets = c.totalAssets || 1;
      const currentAssets = c.currentAssets || 0;
      const currentLiab = c.currentLiabilities || 1;
      const workingCapital = currentAssets - currentLiab;
      const netProfit = c.netProfit || 0;
      const ebit = c.ebit || 0;
      const ebitda = c.ebitda || 0;
      const financeExp = c.financeExp || 1;
      const totalLiab = c.totalLiabilities || 1;
      const equity = c.equity || c.totalEquity || 1;
      const inventory = c.inventory || 0;
      const cash = c.cash || 0;
      const receivables = c.receivables || 0;
      const grossProfit = c.grossProfit || 0;

      // Altman variables
      const x1 = workingCapital / totalAssets;
      const x2 = (netProfit * 1.5) / totalAssets;
      const x3 = ebit / totalAssets;
      const x4 = equity / totalLiab;
      const x5 = sales / totalAssets;

      let zScore = 0;
      let safeMin = 2.99;
      let distressMax = 1.81;

      if (activeConfig.modelType === 'MANUFACTURING') {
        zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
        safeMin = 2.99;
        distressMax = 1.81;
      } else {
        zScore = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
        safeMin = 2.60;
        distressMax = 1.10;
      }

      const springateScore = 1.03 * x1 + 3.07 * (ebit / totalAssets) + 0.66 * ((c.ebt || ebit) / currentLiab) + 0.4 * x5;

      const estimatedAnnualPrincipal = (c.longLoans || 0) * ((activeConfig.annualDebtPrincipalRate || 20) / 100);
      const totalDebtService = estimatedAnnualPrincipal + financeExp;
      const dscr = totalDebtService > 0 ? ebitda / totalDebtService : ebitda / (financeExp || 1);
      const icr = financeExp > 0 ? ebit / financeExp : 99;
      const currentRatio = currentLiab > 0 ? currentAssets / currentLiab : 0;
      const quickRatio = currentLiab > 0 ? (currentAssets - inventory) / currentLiab : 0;
      const cashRatio = currentLiab > 0 ? cash / currentLiab : 0;
      const debtToEquity = equity > 0 ? totalLiab / equity : 0;
      const debtToAssets = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;
      const roe = equity > 0 ? (netProfit / equity) * 100 : 0;
      const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
      const dso = sales > 0 ? (receivables / sales) * 365 : 0;
      const grossMargin = sales > 0 ? (grossProfit / sales) * 100 : 0;
      const netMargin = sales > 0 ? (netProfit / sales) * 100 : 0;

      let zone: 'SAFE' | 'GRAY' | 'DISTRESS' = 'SAFE';
      if (zScore >= safeMin) {
        zone = 'SAFE';
      } else if (zScore >= distressMax) {
        zone = 'GRAY';
      } else {
        zone = 'DISTRESS';
      }

      let grade = 'BBB';
      let gradeDescription = 'جدارة ائتمانية متوسطة ومقبولة مصرفياً';
      if (zScore >= 4.0 && dscr >= 1.8 && currentRatio >= 1.8) {
        grade = 'AAA';
        gradeDescription = 'جدارة استثنائية من الدرجة الأولى (مخاطر معدومة)';
      } else if (zScore >= safeMin && dscr >= 1.4 && currentRatio >= 1.4) {
        grade = 'AA';
        gradeDescription = 'جدارة ائتمانية ممتازة وملاءة مالية قوية';
      } else if (zScore >= safeMin && dscr >= 1.2) {
        grade = 'A';
        gradeDescription = 'جدارة جيدة وتدفقات نقدية مطمئنة';
      } else if (zScore >= distressMax && dscr >= 1.1) {
        grade = 'BBB';
        gradeDescription = 'جدارة مقبولة تتطلب متابعة دورية ومستندات تعزيز';
      } else if (zScore >= distressMax) {
        grade = 'BB';
        gradeDescription = 'جدارة حذرة ذات مخاطر مضاربة معتدلة';
      } else {
        grade = 'CCC';
        gradeDescription = 'عالية المخاطر - احتمالية تعثر مالي مرتفعة';
      }

      acc[yr] = {
        x1,
        x2,
        x3,
        x4,
        x5,
        zScore,
        safeMin,
        distressMax,
        zone,
        springateScore,
        dscr,
        icr,
        currentRatio,
        quickRatio,
        cashRatio,
        debtToEquity,
        debtToAssets,
        roe,
        roa,
        dso,
        grossMargin,
        netMargin,
        grade,
        gradeDescription,
      };
      return acc;
    }, {} as Record<number, any>);
  }, [yearsList, computedData, activeConfig.modelType, activeConfig.annualDebtPrincipalRate]);

  const latestYear = yearsList[yearsList.length - 1] || 2026;
  const latestMetric = metricsByYear[latestYear] || {};
  const latestSales = computedData[latestYear]?.sales || 0;

  // Facility Limit Computations
  const totalRecommendedFacility = Math.round((latestSales * (activeConfig.facilityRatio / 100)) / 100000) * 100000;
  const recommendedOverdraft = Math.round((totalRecommendedFacility * (activeConfig.overdraftRatio / 100)) / 100000) * 100000;
  const recommendedLG = totalRecommendedFacility - recommendedOverdraft;

  // Standard Catalog of Ratios
  const standardRatioCatalog = useMemo(() => [
    // 1. Prediction & Distress
    {
      id: 'altman_z',
      defaultName: 'مؤشر Altman Z-Score النهائي',
      category: 'PREDICTION' as const,
      defaultBenchmark: activeConfig.modelType === 'MANUFACTURING' ? '> 2.99 آمن / < 1.81 تعثر' : '> 2.60 آمن / < 1.10 تعثر',
      getValue: (yr: number) => metricsByYear[yr]?.zScore,
      formatValue: (val: number) => `${Number(val).toFixed(2)}`,
      badgeType: (yr: number) => metricsByYear[yr]?.zone,
    },
    {
      id: 'x1_wc_ta',
      defaultName: 'X1: رأس المال العامل / إجمالي الأصول (WC / TA)',
      category: 'PREDICTION' as const,
      defaultBenchmark: '> 0.20',
      getValue: (yr: number) => (metricsByYear[yr]?.x1 || 0) * 100,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'x2_re_ta',
      defaultName: 'X2: الأرباح المحتجزة / إجمالي الأصول (RE / TA)',
      category: 'PREDICTION' as const,
      defaultBenchmark: '> 0.15',
      getValue: (yr: number) => (metricsByYear[yr]?.x2 || 0) * 100,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'x3_ebit_ta',
      defaultName: 'X3: الأرباح التشغيلية / إجمالي الأصول (EBIT / TA)',
      category: 'PREDICTION' as const,
      defaultBenchmark: '> 0.10',
      getValue: (yr: number) => (metricsByYear[yr]?.x3 || 0) * 100,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'x4_equity_liab',
      defaultName: 'X4: القيمة الدفترية للملكية / إجمالي الخصوم (Equity / Liab)',
      category: 'PREDICTION' as const,
      defaultBenchmark: '> 0.60',
      getValue: (yr: number) => (metricsByYear[yr]?.x4 || 0) * 100,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    ...(activeConfig.modelType === 'MANUFACTURING'
      ? [
          {
            id: 'x5_sales_ta',
            defaultName: 'X5: المبيعات / إجمالي الأصول (معدل دوران الأصول)',
            category: 'PREDICTION' as const,
            defaultBenchmark: '> 1.00x',
            getValue: (yr: number) => metricsByYear[yr]?.x5,
            formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
          },
        ]
      : []),
    {
      id: 'springate',
      defaultName: 'نموذج سبرينجيت للتنبؤ بالسلامة (Springate S-Score)',
      category: 'PREDICTION' as const,
      defaultBenchmark: '> 0.862 آمن',
      getValue: (yr: number) => metricsByYear[yr]?.springateScore,
      formatValue: (val: number) => `${Number(val).toFixed(2)}`,
    },

    // 2. Solvency & Debt Service
    {
      id: 'dscr',
      defaultName: 'مؤشر تغطية خدمة الدين المصرفي (DSCR)',
      category: 'SOLVENCY' as const,
      defaultBenchmark: '≥ 1.30x',
      getValue: (yr: number) => metricsByYear[yr]?.dscr,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
      isPrimary: true,
    },
    {
      id: 'icr',
      defaultName: 'مؤشر تغطية الفوائد التمويلية (ICR)',
      category: 'SOLVENCY' as const,
      defaultBenchmark: '≥ 3.00x',
      getValue: (yr: number) => metricsByYear[yr]?.icr,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
    },
    {
      id: 'debt_to_equity',
      defaultName: 'نسبة الرافعة المالية والمديونية للملكية (D/E)',
      category: 'SOLVENCY' as const,
      defaultBenchmark: '≤ 1.50x',
      getValue: (yr: number) => metricsByYear[yr]?.debtToEquity,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
    },
    {
      id: 'debt_to_assets',
      defaultName: 'نسبة المديونية لإجمالي الأصول (Total Debt / Assets)',
      category: 'SOLVENCY' as const,
      defaultBenchmark: '≤ 60%',
      getValue: (yr: number) => metricsByYear[yr]?.debtToAssets,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },

    // 3. Liquidity & Working Capital
    {
      id: 'current_ratio',
      defaultName: 'نسبة التداول الحالية (Current Ratio)',
      category: 'LIQUIDITY' as const,
      defaultBenchmark: '1.50x - 2.00x',
      getValue: (yr: number) => metricsByYear[yr]?.currentRatio,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
      isPrimary: true,
    },
    {
      id: 'quick_ratio',
      defaultName: 'نسبة السيولة السريعة (Quick Ratio)',
      category: 'LIQUIDITY' as const,
      defaultBenchmark: '≥ 1.00x',
      getValue: (yr: number) => metricsByYear[yr]?.quickRatio,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
    },
    {
      id: 'cash_ratio',
      defaultName: 'نسبة السيولة النقدية الفورية (Cash Ratio)',
      category: 'LIQUIDITY' as const,
      defaultBenchmark: '≥ 0.20x',
      getValue: (yr: number) => metricsByYear[yr]?.cashRatio,
      formatValue: (val: number) => `${Number(val).toFixed(2)}x`,
    },
    {
      id: 'dso',
      defaultName: 'متوسط فترة التحصيل بالأيام (DSO)',
      category: 'LIQUIDITY' as const,
      defaultBenchmark: '≤ 90 يوم',
      getValue: (yr: number) => metricsByYear[yr]?.dso,
      formatValue: (val: number) => `${Math.round(Number(val))} يوم`,
    },

    // 4. Profitability
    {
      id: 'gross_margin',
      defaultName: 'هامش مجمل الربح (Gross Margin %)',
      category: 'PROFITABILITY' as const,
      defaultBenchmark: '≥ 25%',
      getValue: (yr: number) => metricsByYear[yr]?.grossMargin,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'net_margin',
      defaultName: 'هامش صافي الربح (Net Margin %)',
      category: 'PROFITABILITY' as const,
      defaultBenchmark: '≥ 8%',
      getValue: (yr: number) => metricsByYear[yr]?.netMargin,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'roe',
      defaultName: 'العائد على حقوق الملكية (ROE %)',
      category: 'PROFITABILITY' as const,
      defaultBenchmark: '> 15%',
      getValue: (yr: number) => metricsByYear[yr]?.roe,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
    {
      id: 'roa',
      defaultName: 'العائد على إجمالي الأصول (ROA %)',
      category: 'PROFITABILITY' as const,
      defaultBenchmark: '> 10%',
      getValue: (yr: number) => metricsByYear[yr]?.roa,
      formatValue: (val: number) => `${Number(val).toFixed(1)}%`,
    },
  ], [metricsByYear, activeConfig.modelType]);

  // Combined Rows grouped by category
  const categoriesDef = [
    { key: 'PREDICTION', title: 'أولاً: نموذج السلامة والتنبؤ بالتعثر المالي (Altman Z-Score & Bankruptcy Predictor)' },
    { key: 'SOLVENCY', title: 'ثانياً: مؤشرات الملاءة وخدمة الدين المصرفية (Bank Debt Service & Solvency)' },
    { key: 'LIQUIDITY', title: 'ثالثاً: نسب السيولة ورأس المال العامل (Liquidity & Working Capital Management)' },
    { key: 'PROFITABILITY', title: 'رابعاً: نسب الربحية والعائد على الاستثمار والملكية (Profitability & Returns)' },
    { key: 'COVENANTS', title: 'خامساً: المؤشرات والاشتراطات المصرفية المخصصة (Bank Covenants & Custom Indicators)' },
  ];

  // Hidden counts
  const hiddenCount = activeHiddenIds.length;

  const handleExportExcel = () => {
    const rows: any[] = [];
    yearsList.forEach((yr) => {
      const m = metricsByYear[yr] || {};
      const c = computedData[yr] || {};
      const row: Record<string, any> = {
        'السنة المالية': yr,
        'المبيعات (ج.م)': c.sales,
        'إجمالي الأصول (ج.م)': c.totalAssets,
        'حقوق الملكية (ج.م)': c.equity || c.totalEquity,
        'صافي الربح (ج.م)': c.netProfit,
        'Altman Z-Score': m.zScore?.toFixed(2) || '—',
        'نطاق السلامة': m.zone === 'SAFE' ? 'آمن (Safe)' : m.zone === 'GRAY' ? 'رمادي (Gray)' : 'تعثر (Distress)',
        'تغطية خدمة الدين (DSCR)': `${m.dscr?.toFixed(2)}x`,
        'تغطية الفوائد (ICR)': `${m.icr?.toFixed(2)}x`,
        'نسبة التداول (Current Ratio)': `${m.currentRatio?.toFixed(2)}x`,
        'نسبة السيولة السريعة (Quick Ratio)': `${m.quickRatio?.toFixed(2)}x`,
        'نسبة السيولة النقدية (Cash Ratio)': `${m.cashRatio?.toFixed(2)}x`,
        'الرافعة المالية (D/E)': `${m.debtToEquity?.toFixed(2)}x`,
        'العائد على حقوق الملكية (ROE)': `${m.roe?.toFixed(1)}%`,
        'العائد على الأصول (ROA)': `${m.roa?.toFixed(1)}%`,
        'التصنيف الائتماني المصرفي': m.grade,
      };

      // Add custom ratios
      activeCustomRatios.forEach((cr) => {
        row[cr.name] = cr.values[yr] ?? '—';
      });

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    formatWorksheetForArabicExport(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الملف الائتماني والمصرفي');

    // Sheet 2: Recommendation & Stress Testing
    const memoRows = [
      { 'البيان': 'سقف التسهيل الائتماني المقترح', 'القيمة': `${formatEgyptianCurrency(totalRecommendedFacility)} (${activeConfig.facilityRatio}% من المبيعات)` },
      { 'البيان': 'حد الجاري مدين / سحب مكشوف (Overdraft)', 'القيمة': `${formatEgyptianCurrency(recommendedOverdraft)} (${activeConfig.overdraftRatio}%)` },
      { 'البيان': 'حد الاعتمادات المستندية وخطابات الضمان (LG/LC)', 'القيمة': `${formatEgyptianCurrency(recommendedLG)} (${activeConfig.lettersOfCreditRatio}%)` },
      { 'البيان': 'الضمانات والتعهدات المصرفية', 'القيمة': activeConfig.guaranteesText },
      { 'البيان': 'الاشتراطات والعهود المالية (Covenants)', 'القيمة': activeConfig.covenantsText },
      { 'البيان': 'توصية وقرار اللجنة', 'القيمة': activeConfig.recommendationDecision === 'APPROVED' ? 'موافقة معتمدة' : activeConfig.recommendationDecision === 'CONDITIONAL' ? 'موافقة مشروطة' : 'مراجعة إضافية' },
    ];
    const wsMemo = XLSX.utils.json_to_sheet(memoRows);
    formatWorksheetForArabicExport(wsMemo, memoRows);
    XLSX.utils.book_append_sheet(wb, wsMemo, 'مذكرة التسهيلات والتوصية');

    writeArabicExcelFile(wb, `الملف_الائتماني_البنكي_الشامل_${latestYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Title, Actions & Direct Edit Toggle */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-2xl shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  منظومة الملف الائتماني البنكي ومؤشرات الجدارة والتعثر المالي (Bank Credit Dossier & Risk Rating)
                </h3>
                {periodStartDate && periodEndDate && (
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-xs">
                    {periodStartDate} ← {periodEndDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مرونة كاملة لتخصيص النسب المصرفية، إضافة مؤشرات مخصصة، تعديل المسميات، ومحاكاة مذكرات الائتمان وسقف التسهيلات.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls - Unified Dropdown Design */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sector Model Unified Dropdown */}
          <UnifiedSelectDropdown<'NON_MANUFACTURING' | 'MANUFACTURING'>
            id="credit-kpi-model-dropdown"
            label="نموذج النشاط"
            value={activeConfig.modelType}
            options={[
              {
                id: 'NON_MANUFACTURING',
                label: 'خدمي / تجاري (Z\')',
                sublabel: 'نموذج ألتمان المعدل للأنشطة غير الصناعية والتجارية',
              },
              {
                id: 'MANUFACTURING',
                label: 'صناعي وإنتاجي (Z)',
                sublabel: 'نموذج ألتمan الكلاسيكي 5 مؤشرات للشركات الصناعية',
              },
            ]}
            onChange={(val) => updateConfig((prev) => ({ ...prev, modelType: val }))}
          />

          {/* Action Menu for KPIS and Dossier Tools */}
          <ActionMenu
            id="credit-kpi-action-menu"
            label="خيارات وإجراءات"
            triggerVariant="primary"
            align="left"
            items={[
              {
                id: 'toggle-edit-mode',
                label: isDirectEditMode ? 'إيقاف وضع التعديل المباشر للأرقام' : 'تفعيل التعديل المباشر للنسب والأرقام',
                icon: isDirectEditMode ? Lock : Unlock,
                onClick: () => setIsDirectEditMode(!isDirectEditMode),
              },
              {
                id: 'add-custom-ratio',
                label: 'إضافة مؤشر مالي / نسبة مصرفية مخصصة',
                icon: Plus,
                onClick: () => setIsAddRatioModalOpen(true),
              },
              {
                id: 'toggle-policy-panel',
                label: isPolicyPanelOpen ? 'إخفاء سياسة الاقتراض وسقف التسهيلات' : 'تخصيص سياسة الاقتراض وسقف التسهيلات',
                icon: Settings2,
                onClick: () => setIsPolicyPanelOpen(!isPolicyPanelOpen),
              },
              {
                id: 'export-kpi-excel',
                label: 'تصدير الملف الائتماني والمذكرة (Excel)',
                icon: Download,
                variant: 'success',
                onClick: handleExportExcel,
              },
            ]}
          />
        </div>
      </div>

      {/* Restorable Hidden Items Banner */}
      {hiddenCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <EyeOff className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-bold text-amber-900">
              تم استبعاد ({hiddenCount}) مؤشرات من الملف الائتماني:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeHiddenIds.map((hid) => {
                const ratioDef = standardRatioCatalog.find((r) => r.id === hid);
                const name = activeNames[hid] || ratioDef?.defaultName || hid;
                return (
                  <button
                    key={hid}
                    type="button"
                    onClick={() => handleToggleHide(hid)}
                    className="px-2 py-0.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold hover:bg-amber-100 flex items-center gap-1 cursor-pointer transition-colors"
                    title="انقر لاسترجاع هذا المؤشر"
                  >
                    <span>{name}</span>
                    <Plus className="w-3 h-3 text-amber-700" />
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestoreAll}
            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-amber-200" />
            <span>استرجاع كافة المؤشرات</span>
          </button>
        </div>
      )}

      {/* Primary Latest Year Highlights Cards (Collapsible) */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        <div
          className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsHighlightsOpen(!isHighlightsOpen)}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>ملخص المؤشرات المصرفية الرئيسية لسنة {latestYear}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-bold">{isHighlightsOpen ? 'طي البطاقات' : 'عرض البطاقات'}</span>
            {isHighlightsOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </div>

        {isHighlightsOpen && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Altman Z-Score Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold">مؤشر Altman Z-Score</span>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                  {latestMetric.zScore?.toFixed(2) || '0.00'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    latestMetric.zone === 'SAFE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : latestMetric.zone === 'GRAY'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {latestMetric.zone === 'SAFE' ? 'منطقة آمنة' : latestMetric.zone === 'GRAY' ? 'منطقة رمادية' : 'منطقة تعثر'}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                حد الأمان: {latestMetric.safeMin} | حد التعثر: {latestMetric.distressMax}
              </div>
            </div>

            {/* DSCR Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold">تغطية خدمة الدين (DSCR)</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-blue-950">
                  {latestMetric.dscr?.toFixed(2)}x
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    latestMetric.dscr >= 1.3
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {latestMetric.dscr >= 1.3 ? 'تغطية كافية ✓' : 'تغطية حرجة'}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                المعيار المصرفي المستهدف: ≥ 1.30x
              </div>
            </div>

            {/* Current Ratio Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold">نسبة التداول (Current Ratio)</span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-950">
                  {latestMetric.currentRatio?.toFixed(2)}x
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  سريعة: {latestMetric.quickRatio?.toFixed(2)}x
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                المعيار المصرفي: 1.50x - 2.00x
              </div>
            </div>

            {/* Bank Rating Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-indigo-200 mb-1">
                <span className="font-bold">التصنيف المصرفي المقدر</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                  {latestMetric.grade}
                </span>
                <span className="text-[10px] font-bold text-indigo-200">
                  تصنيف استثماري
                </span>
              </div>
              <div className="mt-2 text-[10px] text-indigo-200 truncate">
                {latestMetric.gradeDescription}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flexible Credit Facility Limit & Borrowing Cap Panel */}
      {isPolicyPanelOpen && (
        <div className="bg-white rounded-3xl p-5 border border-indigo-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-700" />
              <h4 className="font-black text-sm text-slate-900">
                تخصيص سياسة الاقتراض وسقف التسهيلات المصرفية المقترحة
              </h4>
            </div>
            <span className="text-xs text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              حساب ديناميكي بناءً على مبيعات سنة {latestYear} ({formatEgyptianCurrency(latestSales)})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Facility Cap % of Sales */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">سقف التسهيل الائتماني (% من المبيعات):</span>
                <span className="font-black text-indigo-900 font-mono text-sm">{activeConfig.facilityRatio}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={activeConfig.facilityRatio}
                onChange={(e) => updateConfig((prev) => ({ ...prev, facilityRatio: Number(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="text-[11px] text-slate-600 font-mono font-bold pt-1">
                إجمالي سقف التسهيل: {formatEgyptianCurrency(totalRecommendedFacility)}
              </div>
            </div>

            {/* Overdraft % */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">تسهيلات مباشرة (جاري مدين / سحب مكشوف):</span>
                <span className="font-black text-blue-900 font-mono text-sm">{activeConfig.overdraftRatio}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="5"
                value={activeConfig.overdraftRatio}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateConfig((prev) => ({
                    ...prev,
                    overdraftRatio: val,
                    lettersOfCreditRatio: 100 - val,
                  }));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="text-[11px] text-slate-600 font-mono font-bold pt-1">
                حد السحب على المكشوف: {formatEgyptianCurrency(recommendedOverdraft)}
              </div>
            </div>

            {/* LG / LC % */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">تسهيلات غير مباشرة (خطابات ضمان واعتمادات):</span>
                <span className="font-black text-emerald-900 font-mono text-sm">{activeConfig.lettersOfCreditRatio}%</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                تُخصص لإصدار خطابات ضمان المناقصات والابتدائية والنهائية وتنفيذ أوامر التوريد.
              </div>
              <div className="text-[11px] text-slate-600 font-mono font-bold pt-1">
                حد خطابات الضمان والاعتمادات: {formatEgyptianCurrency(recommendedLG)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Multi-Year Comprehensive Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-700" />
            <h4 className="text-sm font-black text-slate-900">
              جدول النسب ومؤشرات الجدارة الائتمانية المقارنة ({yearsList.join(' - ')})
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isDirectEditMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                وضع التعديل المباشر نشط (انقر على أي خلية للتعديل أو الإلغاء)
              </span>
            )}
            <span className="text-slate-400 font-mono text-[11px]">
              {activeConfig.modelType === 'MANUFACTURING' ? 'نموذج صناعي وإنتاجي' : 'نموذج تجاري وخدمي'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4 w-2/5">المؤشر المالي / النسبة المصرفية</th>
                <th className="py-3 px-3 text-center w-1/5">المعيار المصرفي المستهدف</th>
                {yearsList.map((yr) => (
                  <th key={yr} className="py-3 px-3 font-mono text-left">
                    سنة {yr}
                  </th>
                ))}
                <th className="py-3 px-2 text-center w-12 no-print">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoriesDef.map((cat) => {
                // Get standard rows for this category
                const stdRows = standardRatioCatalog.filter(
                  (r) => r.category === cat.key && !activeHiddenIds.includes(r.id)
                );

                // Get custom rows for this category
                const customRows = activeCustomRatios.filter((cr) => cr.category === cat.key);

                if (stdRows.length === 0 && customRows.length === 0) {
                  return null;
                }

                return (
                  <React.Fragment key={cat.key}>
                    {/* Category Header */}
                    <tr className="bg-slate-100/80 font-bold text-slate-800">
                      <td colSpan={2 + yearsList.length + 1} className="py-2.5 px-4 text-xs">
                        {cat.title}
                      </td>
                    </tr>

                    {/* Standard Rows */}
                    {stdRows.map((r) => {
                      const displayName = activeNames[r.id] || r.defaultName;
                      const displayBenchmark = activeBenchmarks[r.id] || r.defaultBenchmark;
                      const isEditingName = editingRatioId === r.id;
                      const isEditingBench = editingBenchmarkId === r.id;

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            r.isPrimary ? 'bg-indigo-50/20 font-bold' : ''
                          }`}
                        >
                          {/* Indicator Name Cell */}
                          <td className="py-2.5 px-4">
                            {isEditingName ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingRatioTempName}
                                  onChange={(e) => setEditingRatioTempName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRatioName(r.id);
                                    if (e.key === 'Escape') setEditingRatioId(null);
                                  }}
                                  autoFocus
                                  className="w-full px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRatioName(r.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRatioId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group">
                                <span className={r.isPrimary ? 'text-indigo-950 font-bold' : 'text-slate-700'}>
                                  {displayName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRatioId(r.id);
                                    setEditingRatioTempName(displayName);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-opacity cursor-pointer"
                                  title="تعديل اسم المؤشر"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Benchmark Cell */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditingBench ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={editingBenchmarkTemp}
                                  onChange={(e) => setEditingBenchmarkTemp(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveBenchmark(r.id);
                                    if (e.key === 'Escape') setEditingBenchmarkId(null);
                                  }}
                                  autoFocus
                                  className="w-24 text-center px-1.5 py-0.5 bg-white border border-indigo-400 rounded text-[11px] font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveBenchmark(r.id)}
                                  className="text-emerald-600 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="group flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => {
                                  setEditingBenchmarkId(r.id);
                                  setEditingBenchmarkTemp(displayBenchmark);
                                }}
                                title="انقر لتعديل المعيار المصرفي المستهدف"
                              >
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {displayBenchmark}
                                </span>
                                <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                              </div>
                            )}
                          </td>

                          {/* Values Across Years */}
                          {yearsList.map((yr) => {
                            const rawCalculated = r.getValue(yr);
                            const manualVal = activeManualValues[r.id]?.[yr];
                            const isOverridden = manualVal !== undefined;
                            const finalVal = isOverridden ? manualVal : rawCalculated;
                            const formatted = isOverridden
                              ? typeof manualVal === 'number'
                                ? manualVal.toLocaleString('ar-EG', { maximumFractionDigits: 2 })
                                : manualVal
                              : r.formatValue(rawCalculated);

                            return (
                              <td key={yr} className="py-2.5 px-3 font-mono text-left">
                                {isDirectEditMode ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="text"
                                      defaultValue={isOverridden ? String(manualVal) : String(rawCalculated)}
                                      onBlur={(e) => handleUpdateCellValue(r.id, yr, e.target.value)}
                                      className={`w-20 text-left px-1.5 py-0.5 rounded border text-xs font-mono font-bold focus:outline-none focus:ring-1 ${
                                        isOverridden
                                          ? 'bg-amber-50 border-amber-400 text-amber-900 focus:ring-amber-500'
                                          : 'bg-white border-slate-300 text-slate-900 focus:ring-indigo-500'
                                      }`}
                                    />
                                    {isOverridden && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetCellValue(r.id, yr)}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                        title="إلغاء التعديل والرجوع للحساب الآلي"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span
                                      className={`text-xs ${
                                        isOverridden
                                          ? 'text-amber-800 font-bold bg-amber-50 px-1 rounded'
                                          : r.isPrimary
                                          ? 'font-black text-indigo-950'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {formatted}
                                    </span>
                                    {isOverridden && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                        title="قيمة معدلة يدوياً"
                                      />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Action Column: Hide / Exclude */}
                          <td className="py-2.5 px-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleToggleHide(r.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer transition-colors"
                              title="استبعاد / إخفاء هذا المؤشر من الملف الائتماني"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Custom User-Added Rows */}
                    {customRows.map((cr) => {
                      const isEditingName = editingRatioId === cr.id;
                      const isEditingBench = editingBenchmarkId === cr.id;

                      return (
                        <tr key={cr.id} className="bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                          <td className="py-2.5 px-4">
                            {isEditingName ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingRatioTempName}
                                  onChange={(e) => setEditingRatioTempName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRatioName(cr.id);
                                    if (e.key === 'Escape') setEditingRatioId(null);
                                  }}
                                  autoFocus
                                  className="w-full px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRatioName(cr.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-indigo-950">{cr.name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-100 text-indigo-800 font-bold">
                                    مخصص
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRatioId(cr.id);
                                    setEditingRatioTempName(cr.name);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-opacity cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Benchmark Cell */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditingBench ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={editingBenchmarkTemp}
                                  onChange={(e) => setEditingBenchmarkTemp(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveBenchmark(cr.id);
                                    if (e.key === 'Escape') setEditingBenchmarkId(null);
                                  }}
                                  autoFocus
                                  className="w-24 text-center px-1.5 py-0.5 bg-white border border-indigo-400 rounded text-[11px] font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveBenchmark(cr.id)}
                                  className="text-emerald-600 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="group flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => {
                                  setEditingBenchmarkId(cr.id);
                                  setEditingBenchmarkTemp(cr.benchmark);
                                }}
                                title="تعديل المعيار المستهدف"
                              >
                                <span className="text-[11px] text-slate-500 font-mono">{cr.benchmark}</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                              </div>
                            )}
                          </td>

                          {/* Values Across Years */}
                          {yearsList.map((yr) => {
                            const val = cr.values[yr] ?? '—';
                            return (
                              <td key={yr} className="py-2.5 px-3 font-mono text-left">
                                {isDirectEditMode ? (
                                  <input
                                    type="text"
                                    defaultValue={String(val)}
                                    onBlur={(e) => handleUpdateCellValue(cr.id, yr, e.target.value)}
                                    className="w-20 text-left px-1.5 py-0.5 rounded border border-indigo-300 bg-white text-indigo-900 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <span className="font-bold text-indigo-950 text-xs">
                                    {typeof val === 'number'
                                      ? val.toLocaleString('ar-EG', { maximumFractionDigits: 2 })
                                      : val}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Action Column: Delete Custom */}
                          <td className="py-2.5 px-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomRatio(cr.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer transition-colors"
                              title="حذف هذا المؤشر المخصص نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stress Testing Scenarios Section (Collapsible & Editable) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsStressPanelOpen(!isStressPanelOpen)}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-700" />
            <h4 className="text-sm font-black text-slate-900">
              نتائج اختبارات الضغط والحساسية الائتمانية (Credit Stress Testing Scenarios)
            </h4>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {activeConfig.stressScenarios.length} سيناريوهات
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddScenarioModalOpen(true);
              }}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سيناريو</span>
            </button>
            {isStressPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </div>

        {isStressPanelOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-4 w-2/5">سيناريو الضغط الاقتصادي</th>
                  <th className="py-2.5 px-3 text-center">أثر الاختبار على الربحية</th>
                  <th className="py-2.5 px-3 text-center">تغطية خدمة الدين (DSCR)</th>
                  <th className="py-2.5 px-3 text-center">النتيجة والصلابة المالية</th>
                  <th className="py-2.5 px-2 text-center w-12 no-print">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeConfig.stressScenarios.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-800">{sc.title}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{sc.profitImpact}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{sc.dscr}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                        {sc.result}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteStressScenario(sc.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer"
                        title="حذف السيناريو"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Committee Recommendation Memo Box (Collapsible & Fully Editable) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
        <div
          className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2 cursor-pointer select-none"
          onClick={() => setIsMemoPanelOpen(!isMemoPanelOpen)}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm sm:text-base font-black">
              مذكرة التوصية الائتمانية للجنة التسهيلات المصرفية (Bank Credit Committee Memo)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeConfig.recommendationDecision}
              onChange={(e) => {
                const val = e.target.value as any;
                updateConfig((prev) => ({ ...prev, recommendationDecision: val }));
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="APPROVED">توصية معتمدة: مؤهلة للحصول على تسهيلات</option>
              <option value="CONDITIONAL">توصية مشروطة: بضمانات إضافية</option>
              <option value="REVIEW">تتطلب دراسة ومراجعة دورية</option>
            </select>
            {isMemoPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isMemoPanelOpen && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
              {/* Borrowing Limit Card */}
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 space-y-2">
                <span className="font-bold text-amber-400 block text-xs">
                  سقف التسهيل المقترح (Borrowing Limit):
                </span>
                <p className="text-slate-200">
                  تصل الطاقة الاقتراضية الآمنة إلى{' '}
                  <strong className="font-bold text-white font-mono">
                    {formatEgyptianCurrency(totalRecommendedFacility)}
                  </strong>{' '}
                  بنسبة {activeConfig.facilityRatio}% من المبيعات السنوية، مدعومة بمؤشر تغطية دين قوي ({latestMetric.dscr?.toFixed(2)}x).
                </p>
                <div className="text-[11px] text-slate-400 pt-1 font-mono">
                  - مباشر (Overdraft): {formatEgyptianCurrency(recommendedOverdraft)} ({activeConfig.overdraftRatio}%)
                  <br />
                  - غير مباشر (LG/LC): {formatEgyptianCurrency(recommendedLG)} ({activeConfig.lettersOfCreditRatio}%)
                </div>
              </div>

              {/* Editable Guarantees */}
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-400 text-xs">الضمانات والتعهدات المصرفية المطلوبة:</span>
                  <Edit2 className="w-3 h-3 text-slate-400" />
                </div>
                <textarea
                  value={activeConfig.guaranteesText}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, guaranteesText: e.target.value }))}
                  rows={4}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Editable Financial Covenants */}
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400 text-xs">الاشتراطات والعهود المالية (Covenants):</span>
                  <Edit2 className="w-3 h-3 text-slate-400" />
                </div>
                <textarea
                  value={activeConfig.covenantsText}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, covenantsText: e.target.value }))}
                  rows={4}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Official Memo Sign-off Note */}
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">
                <strong>تأكيد مراقب الحسابات والمحلل المالي:</strong> {activeConfig.recommendationNote}
              </span>
              <button
                type="button"
                onClick={() => {
                  const defaultNote = DEFAULT_CREDIT_MEMO_CONFIG.recommendationNote;
                  updateConfig((prev) => ({ ...prev, recommendationNote: defaultNote }));
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer shrink-0"
              >
                استعادة النص الافتراضي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Custom Credit Ratio */}
      {isAddRatioModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-700" />
                <span>إضافة مؤشر ائتماني أو نسبة مصرفية مخصصة</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRatioModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المؤشر أو النسبة:</label>
                <input
                  type="text"
                  placeholder="مثال: نسبة السيولة النقدية الفورية (Cash Ratio)"
                  value={newRatioName}
                  onChange={(e) => setNewRatioName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف المصرفي:</label>
                  <select
                    value={newRatioCategory}
                    onChange={(e) => setNewRatioCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="LIQUIDITY">سيولة ورأس مال عامل</option>
                    <option value="SOLVENCY">ملاءة وخدمة دين</option>
                    <option value="PREDICTION">تنبؤ بالسلامة والتعثر</option>
                    <option value="PROFITABILITY">ربحية وعائد</option>
                    <option value="COVENANTS">عهود واشتراطات مصرفية</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المعيار المستهدف (Benchmark):</label>
                  <input
                    type="text"
                    placeholder="مثال: ≥ 1.20x"
                    value={newRatioBenchmark}
                    onChange={(e) => setNewRatioBenchmark(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">القيم للسنوات المالية:</label>
                <div className="grid grid-cols-3 gap-2">
                  {yearsList.map((yr) => (
                    <div key={yr}>
                      <span className="text-[10px] text-slate-500 block mb-0.5">سنة {yr}:</span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={newRatioValues[yr] || ''}
                        onChange={(e) =>
                          setNewRatioValues({ ...newRatioValues, [yr]: e.target.value })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-left font-mono font-bold text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddRatioModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddCustomRatio}
                disabled={!newRatioName.trim()}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                إضافة المؤشر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Stress Testing Scenario */}
      {isAddScenarioModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span>إضافة سيناريو ضغط وحساسية ائتمانية</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddScenarioModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان سيناريو الضغط:</label>
                <input
                  type="text"
                  placeholder="مثال: السيناريو 4: تأخر تحصيل العملاء 60 يوماً إضافية"
                  value={newScenarioTitle}
                  onChange={(e) => setNewScenarioTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">أثر الاختبار على الربحية والسيولة:</label>
                <input
                  type="text"
                  placeholder="مثال: زيادة الحاجة للتمويل قصير الأجل 15%"
                  value={newScenarioImpact}
                  onChange={(e) => setNewScenarioImpact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مؤشر DSCR المحسوب:</label>
                  <input
                    type="text"
                    placeholder="مثال: 1.32x (> 1.25x)"
                    value={newScenarioDscr}
                    onChange={(e) => setNewScenarioDscr(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">النتيجة والصلابة المالية:</label>
                  <input
                    type="text"
                    placeholder="مثال: قدرة استيعابية آمنة"
                    value={newScenarioResult}
                    onChange={(e) => setNewScenarioResult(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddScenarioModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddStressScenario}
                disabled={!newScenarioTitle.trim()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                حفظ السيناريو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
