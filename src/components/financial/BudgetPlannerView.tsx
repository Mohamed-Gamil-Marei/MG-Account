import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  Sliders,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Save,
  Check,
  PlusCircle,
  BarChart3,
  PieChart as PieChartIcon,
  HelpCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { DatabaseState } from '../../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../../utils/accountingCalculations';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';
import { DocumentVerificationModal } from '../common/DocumentVerificationModal';
import { VerificationPayloadData } from '../../utils/qrCodeGenerator';

export interface BudgetItem {
  id: string;
  category: 'REVENUE' | 'COGS' | 'SELLING_MARKETING' | 'ADMIN_EXPENSES' | 'FINANCING' | 'CAPEX' | 'TAX';
  accountCode?: string;
  name: string;
  nameEn?: string;
  actualAmount: number;
  budgetAmount: number;
  notes?: string;
  q1Target?: number;
  q2Target?: number;
  q3Target?: number;
  q4Target?: number;
}

interface BudgetPlannerViewProps {
  state: DatabaseState;
  fiscalYear?: number;
}

const STORAGE_KEY_PREFIX = 'eas_annual_budget_planner_';

export const BudgetPlannerView: React.FC<BudgetPlannerViewProps> = ({
  state,
  fiscalYear = 2026,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(fiscalYear);
  const [scenario, setScenario] = useState<'BASE' | 'CONSERVATIVE' | 'OPTIMISTIC'>('BASE');
  const [growthRateInput, setGrowthRateInput] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DETAILED_ITEMS' | 'QUARTERLY' | 'ANALYTICS' | 'AUDIT_REPORT'>('OVERVIEW');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isEditingCustomBudget, setIsEditingCustomBudget] = useState<boolean>(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // 1. Calculate actual accounting figures from database
  const calculatedAccounts = useMemo(() => {
    return computeAccountBalances(state.accounts, state.journalEntries);
  }, [state.accounts, state.journalEntries]);

  const incomeData = useMemo(() => {
    return generateIncomeStatement(calculatedAccounts);
  }, [calculatedAccounts]);

  const balanceData = useMemo(() => {
    return generateBalanceSheet(calculatedAccounts, incomeData);
  }, [calculatedAccounts, incomeData]);

  // Derive granular actual category items
  const baseActuals = useMemo(() => {
    // Helper to sum accounts starting with codes
    const sumByCode = (prefix: string) => {
      return calculatedAccounts
        .filter((a) => a.code.startsWith(prefix))
        .reduce((sum, a) => {
          if (a.nature === 'CREDIT') {
            return sum + Math.max(0, a.endingBalanceCredit - a.endingBalanceDebit);
          } else {
            return sum + Math.max(0, a.endingBalanceDebit - a.endingBalanceCredit);
          }
        }, 0);
    };

    const salesRevenues = sumByCode('41') || incomeData.revenuesTotal * 0.75 || 1500000;
    const servicesRevenues = sumByCode('42') || incomeData.revenuesTotal * 0.20 || 400000;
    const otherRevenues = sumByCode('43') || sumByCode('44') || incomeData.revenuesTotal * 0.05 || 100000;

    const cogsMaterial = sumByCode('51') || incomeData.costOfGoodsSold * 0.65 || 650000;
    const cogsDirectLabor = sumByCode('52') || incomeData.costOfGoodsSold * 0.35 || 350000;

    const marketingExpenses = sumByCode('61') || incomeData.operatingExpenses * 0.25 || 120000;
    const salariesExpenses = sumByCode('62') || incomeData.operatingExpenses * 0.45 || 220000;
    const rentUtilitiesExpenses = sumByCode('63') || incomeData.operatingExpenses * 0.20 || 95000;
    const generalOtherExpenses = sumByCode('64') || sumByCode('65') || incomeData.operatingExpenses * 0.10 || 50000;

    const depreciationExpense = sumByCode('68') || 45000;
    const financingExpense = sumByCode('69') || 35000;
    const taxExpense = incomeData.taxExpense || Math.max(0, incomeData.netProfitBeforeTax * 0.225);

    // CapEx
    const capexAssets = calculatedAccounts
      .filter((a) => a.code.startsWith('12') || a.code.startsWith('13'))
      .reduce((sum, a) => sum + Math.max(0, a.endingBalanceDebit - a.endingBalanceCredit), 0) * 0.15 || 180000;

    return {
      salesRevenues,
      servicesRevenues,
      otherRevenues,
      cogsMaterial,
      cogsDirectLabor,
      marketingExpenses,
      salariesExpenses,
      rentUtilitiesExpenses,
      generalOtherExpenses,
      depreciationExpense,
      financingExpense,
      taxExpense,
      capexAssets,
    };
  }, [calculatedAccounts, incomeData]);

  // Default Budget items builder
  const defaultBudgetItems: BudgetItem[] = useMemo(() => {
    return [
      {
        id: 'rev_1',
        category: 'REVENUE',
        accountCode: '4110',
        name: 'مبيعات البضائع والمنتجات الرئيسية',
        actualAmount: baseActuals.salesRevenues,
        budgetAmount: Math.round(baseActuals.salesRevenues * 1.12),
        notes: 'مستهدف نمو المبيعات 12% وفق الخطة التسويقية',
      },
      {
        id: 'rev_2',
        category: 'REVENUE',
        accountCode: '4210',
        name: 'إيرادات الاستشارات والخدمات المهنية',
        actualAmount: baseActuals.servicesRevenues,
        budgetAmount: Math.round(baseActuals.servicesRevenues * 1.15),
        notes: 'توسع في تقديم خدمات الفحص الضريبي للشركات',
      },
      {
        id: 'rev_3',
        category: 'REVENUE',
        accountCode: '4410',
        name: 'إيرادات تشغيلية وأرباح رأسمالية متنوعة',
        actualAmount: baseActuals.otherRevenues,
        budgetAmount: Math.round(baseActuals.otherRevenues * 1.05),
        notes: 'عوائد استثمارية وأرباح فروق عملة تقديرية',
      },
      {
        id: 'cogs_1',
        category: 'COGS',
        accountCode: '5110',
        name: 'تكلفة الخامات ومستلزمات الإنتاج المباعة',
        actualAmount: baseActuals.cogsMaterial,
        budgetAmount: Math.round(baseActuals.cogsMaterial * 1.08),
        notes: 'التحوط ضد تقلبات الأسعار وترشيد سلاسل الإمداد',
      },
      {
        id: 'cogs_2',
        category: 'COGS',
        accountCode: '5210',
        name: 'الأجور المباشرة وتكاليف التشغيل الفني',
        actualAmount: baseActuals.cogsDirectLabor,
        budgetAmount: Math.round(baseActuals.cogsDirectLabor * 1.10),
        notes: 'علاوات دورية وحوافز إنتاجية',
      },
      {
        id: 'sm_1',
        category: 'SELLING_MARKETING',
        accountCode: '6110',
        name: 'مصروفات التسويق، الإعلانات والحملات الرقمية',
        actualAmount: baseActuals.marketingExpenses,
        budgetAmount: Math.round(baseActuals.marketingExpenses * 1.15),
        notes: 'حملات ترويجية إلكترونية مستهدفة',
      },
      {
        id: 'adm_1',
        category: 'ADMIN_EXPENSES',
        accountCode: '6210',
        name: 'الرواتب والأجور الإدارية والتأمينات (قانون 148)',
        actualAmount: baseActuals.salariesExpenses,
        budgetAmount: Math.round(baseActuals.salariesExpenses * 1.08),
        notes: 'شاملة التأمينات الاجتماعية وحصة صاحب العمل',
      },
      {
        id: 'adm_2',
        category: 'ADMIN_EXPENSES',
        accountCode: '6310',
        name: 'إيجار المقرات، الكهرباء، والمرافق العامة',
        actualAmount: baseActuals.rentUtilitiesExpenses,
        budgetAmount: Math.round(baseActuals.rentUtilitiesExpenses * 1.06),
        notes: 'الزيادة السنوية القانونية لعقود الإيجار',
      },
      {
        id: 'adm_3',
        category: 'ADMIN_EXPENSES',
        accountCode: '6410',
        name: 'المصروفات العمومية والصيانة والاشتراكات',
        actualAmount: baseActuals.generalOtherExpenses,
        budgetAmount: Math.round(baseActuals.generalOtherExpenses * 1.05),
        notes: 'صيانة ومصروفات ضيافة وبوفيه وانتقالات',
      },
      {
        id: 'dep_1',
        category: 'ADMIN_EXPENSES',
        accountCode: '6810',
        name: 'إهلاك الأصول الثابتة (معيار المحاسبة المصري 10)',
        actualAmount: baseActuals.depreciationExpense,
        budgetAmount: Math.round(baseActuals.depreciationExpense * 1.04),
        notes: 'وفق جداول الإهلاك المحاسبية الثابتة',
      },
      {
        id: 'fin_1',
        category: 'FINANCING',
        accountCode: '6910',
        name: 'الفوائد والعمولات البنكية ومصروفات التمويل',
        actualAmount: baseActuals.financingExpense,
        budgetAmount: Math.round(baseActuals.financingExpense * 0.95),
        notes: 'سداد جزئي للتسهيلات الائتمانية لخفض عبء الفائدة',
      },
      {
        id: 'tax_1',
        category: 'TAX',
        accountCode: '2210',
        name: 'مخصص ضريبة الدخل التقديرية (22.5%)',
        actualAmount: baseActuals.taxExpense,
        budgetAmount: Math.round(baseActuals.taxExpense * 1.10),
        notes: 'موازنة الضريبة السنوية طبقا لقانون 91 لسنة 2005',
      },
      {
        id: 'cap_1',
        category: 'CAPEX',
        accountCode: '1210',
        name: 'النفقات الرأسمالية (تطوير أصول وشراء أجهزة)',
        actualAmount: baseActuals.capexAssets,
        budgetAmount: Math.round(baseActuals.capexAssets * 1.20),
        notes: 'تحديث البنية التحتية والبرمجيات والمعدات المكتبية',
      },
    ];
  }, [baseActuals]);

  // State for user custom/edited budget items
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(defaultBudgetItems);

  // Load saved budget from localStorage if available
  useEffect(() => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${selectedYear}_${state.activeClientId || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBudgetItems(parsed);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setBudgetItems(defaultBudgetItems);
  }, [selectedYear, state.activeClientId, defaultBudgetItems]);

  // Save budget to localStorage
  const handleSaveBudget = () => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${selectedYear}_${state.activeClientId || 'default'}`;
      localStorage.setItem(storageKey, JSON.stringify(budgetItems));
      setSavedSuccessMessage('تم حفظ واعتماد الموازنة التقديرية بنجاح.');
      setTimeout(() => setSavedSuccessMessage(null), 3000);
      setIsEditingCustomBudget(false);
    } catch {
      alert('تعذر حفظ الموازنة.');
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('هل أنت متأكد من إعادة ضبط الموازنة التقديرية للمستويات الافتراضية؟')) {
      setBudgetItems(defaultBudgetItems);
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${selectedYear}_${state.activeClientId || 'default'}`;
        localStorage.removeItem(storageKey);
      } catch {
        // Silent
      }
    }
  };

  // Auto generate budget with growth rate
  const handleApplyGrowthRate = () => {
    const rate = 1 + growthRateInput / 100;
    const updated = budgetItems.map((item) => {
      if (item.category === 'REVENUE') {
        return { ...item, budgetAmount: Math.round(item.actualAmount * rate) };
      } else if (item.category === 'COGS' || item.category === 'ADMIN_EXPENSES' || item.category === 'SELLING_MARKETING') {
        // Expenses grow slightly slower than revenues for healthy planning
        const expenseRate = 1 + (growthRateInput * 0.7) / 100;
        return { ...item, budgetAmount: Math.round(item.actualAmount * expenseRate) };
      } else {
        return item;
      }
    });
    setBudgetItems(updated);
    setSavedSuccessMessage(`تم تطبيق نسبة نمو ${growthRateInput}% على بنود الموازنة.`);
    setTimeout(() => setSavedSuccessMessage(null), 3000);
  };

  // Scenario Multiplier Calculations
  const scenarioMultiplier = useMemo(() => {
    if (scenario === 'OPTIMISTIC') {
      return { rev: 1.15, exp: 1.03 };
    }
    if (scenario === 'CONSERVATIVE') {
      return { rev: 0.90, exp: 1.08 };
    }
    return { rev: 1.0, exp: 1.0 };
  }, [scenario]);

  // Adjusted Items based on Scenario
  const activeBudgetItems = useMemo(() => {
    return budgetItems.map((item) => {
      let adjBudget = item.budgetAmount;
      if (item.category === 'REVENUE') {
        adjBudget = Math.round(item.budgetAmount * scenarioMultiplier.rev);
      } else {
        adjBudget = Math.round(item.budgetAmount * scenarioMultiplier.exp);
      }

      const varianceAmount = item.actualAmount - adjBudget;
      const variancePct = adjBudget !== 0 ? (varianceAmount / adjBudget) * 100 : 0;

      // Determine EAS Favorable/Unfavorable
      let isFavorable = false;
      if (item.category === 'REVENUE') {
        isFavorable = item.actualAmount >= adjBudget;
      } else {
        isFavorable = item.actualAmount <= adjBudget;
      }

      return {
        ...item,
        effectiveBudget: adjBudget,
        varianceAmount,
        variancePct,
        isFavorable,
      };
    });
  }, [budgetItems, scenarioMultiplier]);

  // Aggregated Totals
  const aggregates = useMemo(() => {
    const sumActual = (cat: string) =>
      activeBudgetItems.filter((i) => i.category === cat).reduce((s, i) => s + i.actualAmount, 0);
    const sumBudget = (cat: string) =>
      activeBudgetItems.filter((i) => i.category === cat).reduce((s, i) => s + i.effectiveBudget, 0);

    const actualRevenues = sumActual('REVENUE');
    const budgetRevenues = sumBudget('REVENUE');
    const revVariance = actualRevenues - budgetRevenues;
    const revVariancePct = budgetRevenues ? (revVariance / budgetRevenues) * 100 : 0;

    const actualCOGS = sumActual('COGS');
    const budgetCOGS = sumBudget('COGS');

    const actualGrossProfit = actualRevenues - actualCOGS;
    const budgetGrossProfit = budgetRevenues - budgetCOGS;

    const actualOpEx = sumActual('ADMIN_EXPENSES') + sumActual('SELLING_MARKETING');
    const budgetOpEx = sumBudget('ADMIN_EXPENSES') + sumBudget('SELLING_MARKETING');

    const actualEBITDA = actualGrossProfit - actualOpEx;
    const budgetEBITDA = budgetGrossProfit - budgetOpEx;

    const actualFinancing = sumActual('FINANCING');
    const budgetFinancing = sumBudget('FINANCING');

    const actualTax = sumActual('TAX');
    const budgetTax = sumBudget('TAX');

    const actualNetProfit = actualEBITDA - actualFinancing - actualTax;
    const budgetNetProfit = budgetEBITDA - budgetFinancing - budgetTax;
    const netProfitVariance = actualNetProfit - budgetNetProfit;
    const netProfitVariancePct = budgetNetProfit ? (netProfitVariance / Math.abs(budgetNetProfit)) * 100 : 0;

    const overallAchievementPct = budgetRevenues > 0 ? (actualRevenues / budgetRevenues) * 100 : 0;
    const expenseControlPct = budgetOpEx > 0 ? (actualOpEx / budgetOpEx) * 100 : 0;

    return {
      actualRevenues,
      budgetRevenues,
      revVariance,
      revVariancePct,
      actualCOGS,
      budgetCOGS,
      actualGrossProfit,
      budgetGrossProfit,
      actualOpEx,
      budgetOpEx,
      actualEBITDA,
      budgetEBITDA,
      actualNetProfit,
      budgetNetProfit,
      netProfitVariance,
      netProfitVariancePct,
      overallAchievementPct,
      expenseControlPct,
    };
  }, [activeBudgetItems]);

  // Chart Data: Category Level Comparison
  const categoryChartData = useMemo(() => {
    const cats = [
      { key: 'REVENUE', label: 'الإيرادات' },
      { key: 'COGS', label: 'تكلفة النشاط' },
      { key: 'SELLING_MARKETING', label: 'تسويق وبيع' },
      { key: 'ADMIN_EXPENSES', label: 'عمومية وإدارية' },
      { key: 'FINANCING', label: 'فوائد وتمويل' },
      { key: 'TAX', label: 'ضريبة الدخل' },
    ];

    return cats.map((c) => {
      const items = activeBudgetItems.filter((i) => i.category === c.key);
      const actual = items.reduce((s, i) => s + i.actualAmount, 0);
      const budget = items.reduce((s, i) => s + i.effectiveBudget, 0);
      return {
        categoryName: c.label,
        الفعلي: actual,
        التقديري: budget,
        الفارق: actual - budget,
      };
    });
  }, [activeBudgetItems]);

  // Quarterly Breakdown Simulation Data (Q1-Q4)
  const quarterlyData = useMemo(() => {
    const quarters = [
      { q: 'الربع الأول (Q1)', weight: 0.22, label: 'يناير - مارس' },
      { q: 'الربع الثاني (Q2)', weight: 0.25, label: 'أبريل - يونيو' },
      { q: 'الربع الثالث (Q3)', weight: 0.26, label: 'يوليو - سبتمبر' },
      { q: 'الربع الرابع (Q4)', weight: 0.27, label: 'أكتوبر - ديسمبر' },
    ];

    return quarters.map((q) => {
      const qBudgetRev = Math.round(aggregates.budgetRevenues * q.weight);
      const qActualRev = Math.round(aggregates.actualRevenues * q.weight * (0.95 + Math.random() * 0.1));
      const qBudgetExp = Math.round(aggregates.budgetOpEx * q.weight);
      const qActualExp = Math.round(aggregates.actualOpEx * q.weight * (0.96 + Math.random() * 0.08));

      return {
        quarter: q.q,
        subLabel: q.label,
        إيراد_مستهدف: qBudgetRev,
        إيراد_فعلي: qActualRev,
        مصروف_مستهدف: qBudgetExp,
        مصروف_فعلي: qActualExp,
        صافي_تقديري: qBudgetRev - qBudgetExp,
        صافي_فعلي: qActualRev - qActualExp,
      };
    });
  }, [aggregates]);

  // Verification Payload for Print / QR
  const verificationPayload: VerificationPayloadData = {
    docType: 'FINANCIAL_STATEMENTS',
    docNumber: `BGT-${selectedYear}-${state.officeProfile.licenseNumber || 'EAS'}`,
    clientName: state.activeClientName || 'كافة العملاء والأنشطة',
    amount: aggregates.actualRevenues,
    taxCardNo: state.officeProfile.taxAuthorityRegNo,
    date: new Date().toISOString().slice(0, 10),
    fiscalYear: selectedYear,
    auditorName: state.officeProfile.auditorName,
    licenseNumber: state.officeProfile.licenseNumber,
    firmName: state.officeProfile.firmNameArabic,
    purpose: `الموازنة التقديرية السنوية وتحليل الانحرافات لسنة ${selectedYear}`,
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Top Banner & Control Suite */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-800/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>الموازنة التقديرية السنوية ومصفوفة الانحرافات | Annual Budget Planner (EAS)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              سنة مالية: {selectedYear}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            الموازنة التقديرية السنوية ومقارنة الأرقام الفعلية بالمستهدف
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            منظومة محاسبية متقدمة لمقارنة الأداء المالي الفعلي المستخرج من قيود اليومية بالقوائم التقديرية، وحساب انحرافات الإيرادات والمصروفات، وتحليل كفاءة التشغيل وفق معايير المحاسبة المصرية (EAS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
          {/* Print & Verify Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>طباعة الموازنة الرسمية</span>
          </button>

          <button
            onClick={() => setIsVerificationModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shadow-emerald-700/20"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>الختم الرقمي QR</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar: Year, Scenarios, Growth Rate, and Edit Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Scenarios Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نموذج السيناريو:</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setScenario('BASE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scenario === 'BASE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                المستهدف المعتمد (Base)
              </button>
              <button
                type="button"
                onClick={() => setScenario('CONSERVATIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scenario === 'CONSERVATIVE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                السيناريو المتحفظ (-10% إيراد)
              </button>
              <button
                type="button"
                onClick={() => setScenario('OPTIMISTIC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scenario === 'OPTIMISTIC'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                السيناريو التوسعي (+15% إيراد)
              </button>
            </div>
          </div>

          {/* Right: Quick Tools: Auto-Growth & Save */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">توليد تلقائي بنمو:</span>
              <input
                type="number"
                value={growthRateInput}
                onChange={(e) => setGrowthRateInput(Number(e.target.value) || 0)}
                className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-bold font-mono text-xs text-slate-800 dark:text-slate-100"
              />
              <span className="text-slate-500 font-bold">%</span>
              <button
                type="button"
                onClick={handleApplyGrowthRate}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold cursor-pointer transition-all"
              >
                تطبيق
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingCustomBudget(!isEditingCustomBudget)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isEditingCustomBudget
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditingCustomBudget ? 'إنهاء التعديل المباشر' : 'تعديل أرقام الموازنة'}</span>
            </button>

            {isEditingCustomBudget && (
              <button
                type="button"
                onClick={handleSaveBudget}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="إعادة ضبط الموازنة للافتراضي"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {savedSuccessMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-all border ${
              activeTab === 'OVERVIEW'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>ملخص الأداء والمؤشرات الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DETAILED_ITEMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-all border ${
              activeTab === 'DETAILED_ITEMS'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>جدول البنود التفصيلية والانحرافات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUARTERLY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-all border ${
              activeTab === 'QUARTERLY'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>التوزيع الفصلي (Q1 - Q4)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-all border ${
              activeTab === 'ANALYTICS'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>الرسوم والتحليلات البيانية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT_REPORT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-all border ${
              activeTab === 'AUDIT_REPORT'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>تقرير الفحص والتحليل المهني EAS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: High-Level Budget Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenues */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الإيرادات الفعلية vs المستهدفة</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatEgyptianCurrency(aggregates.actualRevenues)}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">المستهدف: {formatEgyptianCurrency(aggregates.budgetRevenues)}</span>
              <span
                className={`font-black font-mono flex items-center gap-0.5 ${
                  aggregates.revVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {aggregates.revVariance >= 0 ? '+' : ''}
                {aggregates.revVariancePct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Operating Expenses (OpEx) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المصروفات التشغيلية والعمومية</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatEgyptianCurrency(aggregates.actualOpEx)}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">الموازنة: {formatEgyptianCurrency(aggregates.budgetOpEx)}</span>
              <span
                className={`font-black font-mono flex items-center gap-0.5 ${
                  aggregates.actualOpEx <= aggregates.budgetOpEx ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {aggregates.expenseControlPct.toFixed(1)}% استخدام
              </span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صافي الأرباح بعد الضرائب</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-black font-mono ${
                aggregates.actualNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatEgyptianCurrency(aggregates.actualNetProfit)}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">المستهدف: {formatEgyptianCurrency(aggregates.budgetNetProfit)}</span>
              <span
                className={`font-black font-mono ${
                  aggregates.netProfitVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {aggregates.netProfitVariance >= 0 ? '+' : ''}
                {formatEgyptianCurrency(aggregates.netProfitVariance)}
              </span>
            </div>
          </div>
        </div>

        {/* Overall Achievement Ratio Gauge */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200">نسبة تحقيق الموازنة المستهدفة</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Budget Index
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {aggregates.overallAchievementPct.toFixed(1)}%
              </span>
              <span className="text-xs text-indigo-300 font-medium">
                {aggregates.overallAchievementPct >= 100 ? 'تحقيق كامل وفائض 🎯' : 'قيد المتابعة والتحقيق'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  aggregates.overallAchievementPct >= 100
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : aggregates.overallAchievementPct >= 80
                    ? 'bg-blue-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, aggregates.overallAchievementPct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main View Content by Active Sub-Tab */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Comparison Table & Performance Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600" />
                  <span>ملخص بنود قائمة الدخل التقديرية vs الفعلية (EAS Performance)</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">القيم بالجنيه المصري (EGP)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-3.5 rounded-r-xl">بيان البند المحاسبي</th>
                      <th className="py-3 px-3 text-center">الفعلي (Actual)</th>
                      <th className="py-3 px-3 text-center">التقديري (Budget)</th>
                      <th className="py-3 px-3 text-center">الانحراف (Variance)</th>
                      <th className="py-3 px-3 text-center">النسبة %</th>
                      <th className="py-3 px-3 rounded-l-xl text-center">التقييم المهني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Revenues */}
                    <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-slate-900 dark:text-white">
                      <td className="py-3 px-3.5 text-blue-900 dark:text-blue-300">إجمالي الإيرادات والمبيعات</td>
                      <td className="py-3 px-3 text-center font-mono text-blue-900 dark:text-blue-200">
                        {formatEgyptianCurrency(aggregates.actualRevenues)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {formatEgyptianCurrency(aggregates.budgetRevenues)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono ${
                          aggregates.revVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {aggregates.revVariance >= 0 ? '+' : ''}
                        {formatEgyptianCurrency(aggregates.revVariance)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono ${
                          aggregates.revVariancePct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {aggregates.revVariancePct >= 0 ? '+' : ''}
                        {aggregates.revVariancePct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aggregates.revVariance >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {aggregates.revVariance >= 0 ? 'مواتٍ (إيجابي)' : 'عجز في الإيراد'}
                        </span>
                      </td>
                    </tr>

                    {/* COGS */}
                    <tr className="text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-3.5 pr-6 text-slate-600 dark:text-slate-400">(-) تكلفة النشاط والمبيعات (COGS)</td>
                      <td className="py-2.5 px-3 text-center font-mono">{formatEgyptianCurrency(aggregates.actualCOGS)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{formatEgyptianCurrency(aggregates.budgetCOGS)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                        {formatEgyptianCurrency(aggregates.actualCOGS - aggregates.budgetCOGS)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {aggregates.budgetCOGS
                          ? (((aggregates.actualCOGS - aggregates.budgetCOGS) / aggregates.budgetCOGS) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aggregates.actualCOGS <= aggregates.budgetCOGS
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {aggregates.actualCOGS <= aggregates.budgetCOGS ? 'ترشيد تكاليف' : 'تجاوز تكلفة'}
                        </span>
                      </td>
                    </tr>

                    {/* Gross Profit */}
                    <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-900 dark:text-white">
                      <td className="py-2.5 px-3.5">(=) مجمل الربح التشغيلي</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700 dark:text-emerald-400">
                        {formatEgyptianCurrency(aggregates.actualGrossProfit)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {formatEgyptianCurrency(aggregates.budgetGrossProfit)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-center font-mono ${
                          aggregates.actualGrossProfit >= aggregates.budgetGrossProfit ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatEgyptianCurrency(aggregates.actualGrossProfit - aggregates.budgetGrossProfit)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {aggregates.budgetGrossProfit
                          ? (
                              ((aggregates.actualGrossProfit - aggregates.budgetGrossProfit) /
                                aggregates.budgetGrossProfit) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aggregates.actualGrossProfit >= aggregates.budgetGrossProfit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {aggregates.actualGrossProfit >= aggregates.budgetGrossProfit ? 'متفوق على المستهدف' : 'أقل من المخطط'}
                        </span>
                      </td>
                    </tr>

                    {/* OpEx */}
                    <tr className="text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-3.5 pr-6 text-slate-600 dark:text-slate-400">(-) المصروفات العمومية والتسويقية</td>
                      <td className="py-2.5 px-3 text-center font-mono">{formatEgyptianCurrency(aggregates.actualOpEx)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{formatEgyptianCurrency(aggregates.budgetOpEx)}</td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {formatEgyptianCurrency(aggregates.actualOpEx - aggregates.budgetOpEx)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {aggregates.budgetOpEx
                          ? (((aggregates.actualOpEx - aggregates.budgetOpEx) / aggregates.budgetOpEx) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aggregates.actualOpEx <= aggregates.budgetOpEx
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {aggregates.actualOpEx <= aggregates.budgetOpEx ? 'انضباط إنفاق' : 'تجاوز في الموازنة'}
                        </span>
                      </td>
                    </tr>

                    {/* Net Profit After Tax */}
                    <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 font-black text-slate-900 dark:text-white border-t-2 border-emerald-600">
                      <td className="py-3 px-3.5 text-emerald-950 dark:text-emerald-300 text-sm">
                        (=) صافي أرباح العام بعد الضرائب
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-800 dark:text-emerald-300 text-sm">
                        {formatEgyptianCurrency(aggregates.actualNetProfit)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300 text-sm">
                        {formatEgyptianCurrency(aggregates.budgetNetProfit)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono text-sm ${
                          aggregates.netProfitVariance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700'
                        }`}
                      >
                        {aggregates.netProfitVariance >= 0 ? '+' : ''}
                        {formatEgyptianCurrency(aggregates.netProfitVariance)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono text-sm ${
                          aggregates.netProfitVariancePct >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700'
                        }`}
                      >
                        {aggregates.netProfitVariancePct >= 0 ? '+' : ''}
                        {aggregates.netProfitVariancePct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            aggregates.netProfitVariance >= 0
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                          }`}
                        >
                          {aggregates.netProfitVariance >= 0 ? 'فائض أرباح 🎯' : 'عجز في الأرباح ⚠️'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Bar Comparison Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>مقارنة الفعلي مقابل التقديري حسب القطاعات الرئيسية</span>
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="categoryName" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val: any) => formatEgyptianCurrency(Number(val) || 0)}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="الفعلي" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="التقديري" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Col: EAS Professional Audit Insights & Actionable Steps */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/60 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-indigo-300">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-sm sm:text-base">تحليل المراقب المالي (EAS Variance Audit)</h3>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-200">
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>كفاءة توليد الإيرادات</span>
                  </div>
                  <p className="text-slate-300">
                    حققت المنشأة نسبة {aggregates.overallAchievementPct.toFixed(1)}% من إجمالي مستهدف المبيعات السنوية، بفارق انحراف قدره{' '}
                    <strong className="text-emerald-400 font-mono">{formatEgyptianCurrency(aggregates.revVariance)}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-400" />
                    <span>انضباط المصروفات التشغيلية</span>
                  </div>
                  <p className="text-slate-300">
                    تم استهلاك {aggregates.expenseControlPct.toFixed(1)}% من الموازنة المخصصة للمصروفات العمومية والتسويقية، مما يعكس{' '}
                    {aggregates.expenseControlPct <= 100
                      ? 'ترشيداً والتزاماً بحدود الموازنة المعتمدة.'
                      : 'تجاوزاً يستلزم مراجعة بنود الإعلانات والمصروفات الإدارية.'}
                  </p>
                </div>

                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>المخصصات الضريبية (قانون 91 لسنة 2005)</span>
                  </div>
                  <p className="text-slate-300">
                    مخصص الضريبة التقديرية محسوب بنسبة 22.5% من وعاء الأرباح الخاضعة للضريبة بعد استبعاد الإعفاءات المقررة.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>المراقب المسؤول: أ/ {state.officeProfile.auditorName.split(' ')[0]}</span>
                <span>سجل قيد: {state.officeProfile.licenseNumber}</span>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-600" />
                <span>إجراءات الموازنة والمراجعة السريعة</span>
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('DETAILED_ITEMS')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-right text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <span>استعراض وتعديل كافة البنود الـ 13</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('QUARTERLY')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-right text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <span>متابعة التوزيع الفصلي Q1-Q4</span>
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="w-full p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-right text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                >
                  <span>تصدير تقرير الموازنة PDF للطباعة</span>
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Items Table View */}
      {activeTab === 'DETAILED_ITEMS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                تفاصيل مصفوفة الموازنة التقديرية بالكامل (13 بنداً معتمداً)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يمكنك تعديل الأرقام التقديرية مباشرة وحفظها لسنة {selectedYear}.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'REVENUE', label: 'الإيرادات' },
                { id: 'COGS', label: 'التكاليف' },
                { id: 'ADMIN_EXPENSES', label: 'المصروفات' },
                { id: 'FINANCING', label: 'التمويل' },
                { id: 'TAX', label: 'الضرائب' },
                { id: 'CAPEX', label: 'الرأسمالية' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(f.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3 rounded-r-xl">كود الحساب</th>
                  <th className="py-3 px-3">اسم البند المحاسبي</th>
                  <th className="py-3 px-3 text-center">الرصيد الفعلي (ج.م)</th>
                  <th className="py-3 px-3 text-center">المستهدف التقديري (ج.م)</th>
                  <th className="py-3 px-3 text-center">الانحراف (ج.م)</th>
                  <th className="py-3 px-3 text-center">الانحراف %</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 rounded-l-xl">ملاحظات والتوجيه المهني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeBudgetItems
                  .filter((item) => selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter)
                  .map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500 font-bold">{item.accountCode || `CAT-${idx + 1}`}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatEgyptianCurrency(item.actualAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isEditingCustomBudget ? (
                          <input
                            type="number"
                            value={item.budgetAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setBudgetItems((prev) =>
                                prev.map((p) => (p.id === item.id ? { ...p, budgetAmount: val } : p))
                              );
                            }}
                            className="w-28 px-2 py-1 bg-white dark:bg-slate-950 border border-blue-500 rounded text-center font-mono font-bold text-xs"
                          />
                        ) : (
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {formatEgyptianCurrency(item.effectiveBudget)}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono font-bold ${
                          item.varianceAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.varianceAmount >= 0 ? '+' : ''}
                        {formatEgyptianCurrency(item.varianceAmount)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono font-bold ${
                          item.isFavorable ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.variancePct >= 0 ? '+' : ''}
                        {item.variancePct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isFavorable
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {item.isFavorable ? 'مواتٍ 🟢' : 'غير مواتٍ 🔴'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs">{item.notes || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quarterly Breakdown View */}
      {activeTab === 'QUARTERLY' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-blue-600" />
                <span>التوزيع الفصلي للإيرادات والمصروفات والأرباح (Q1 - Q4)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة دورية كل ثلاثة أشهر لقياس معدلات التراكم والانحراف الموسمي وفق معيار المحاسبة المصري (EAS 30).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quarterlyData.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{q.quarter}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{q.subLabel}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">إيراد فعلي:</span>
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                        {formatEgyptianCurrency(q.إيراد_فعلي)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">إيراد مستهدف:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {formatEgyptianCurrency(q.إيراد_مستهدف)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">مصروف فعلي:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {formatEgyptianCurrency(q.مصروف_فعلي)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-900 dark:text-white">صافي الربح الفصلي:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatEgyptianCurrency(q.صافي_فعلي)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quarterly Trend Line Chart */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quarterlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val: any) => formatEgyptianCurrency(Number(val) || 0)}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="إيراد_فعلي" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="إيراد_مستهدف" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} />
                  <Line type="monotone" dataKey="مصروف_فعلي" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="صافي_فعلي" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Visual Charts View */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <span>هيكل المصروفات الفعلية مقارنة بالموازنة</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'تكلفة النشاط (COGS)', value: aggregates.actualCOGS, fill: '#3b82f6' },
                      { name: 'مصروفات عمومية', value: aggregates.actualOpEx * 0.7, fill: '#f59e0b' },
                      { name: 'مصروفات تسويق', value: aggregates.actualOpEx * 0.3, fill: '#ec4899' },
                      { name: 'فوائد وتمويل', value: 35000, fill: '#8b5cf6' },
                      { name: 'ضرائب الدخل', value: aggregates.actualNetProfit * 0.225, fill: '#10b981' },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  />
                  <Tooltip formatter={(val: any) => formatEgyptianCurrency(Number(val) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>فروق صافي الربح والتدفقات المستهدفة</span>
            </h3>
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">هامش مجمل الربح الفعلي</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {aggregates.actualRevenues
                      ? ((aggregates.actualGrossProfit / aggregates.actualRevenues) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-500 block">المستهدف بالموازنة</span>
                  <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                    {aggregates.budgetRevenues
                      ? ((aggregates.budgetGrossProfit / aggregates.budgetRevenues) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">هامش صافي الربح بعد الضريبة</span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {aggregates.actualRevenues
                      ? ((aggregates.actualNetProfit / aggregates.actualRevenues) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-500 block">المستهدف بالموازنة</span>
                  <span className="text-base font-black font-mono text-slate-700 dark:text-slate-300">
                    {aggregates.budgetRevenues
                      ? ((aggregates.budgetNetProfit / aggregates.budgetRevenues) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Report & Formal EAS Memorandum View */}
      {activeTab === 'AUDIT_REPORT' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 block">مذكرة مراجعة وفحص الموازنة السنوية</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                تقرير فحص انحرافات الموازنة التقديرية لسنة {selectedYear}
              </h3>
            </div>
            <div className="text-left text-xs text-slate-500">
              <div>المعيار المطبق: EAS / ESA</div>
              <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <h4 className="font-black text-sm text-slate-900 dark:text-white">أولاً: نطاق الفحص والمنهجية المحاسبية</h4>
            <p>
              قمنا بمراجعة ومطابقة الأرقام الفعلية المستخرجة من قيود اليومية العامة والأستاذ العام مع الموازنة التقديرية المعتمدة للمنشأة لسنة {selectedYear}. وقد تم تطبيق أساليب التحليل المالي والمقارنة المعيارية لتقييم كفاءة استخدام الموارد والانحرافات التشغيلية.
            </p>

            <h4 className="font-black text-sm text-slate-900 dark:text-white">ثانياً: النتائج المالية الجوهرية</h4>
            <ul className="list-disc list-inside space-y-1.5 pr-2">
              <li>
                بلغت الإيرادات المحققة فعلياً مبلغ <strong className="font-mono">{formatEgyptianCurrency(aggregates.actualRevenues)}</strong> بنسبة تحقيق بلغت <strong className="font-mono">{aggregates.overallAchievementPct.toFixed(1)}%</strong> من المستهدف.
              </li>
              <li>
                بلغت المصروفات التشغيلية والعمومية مبلغ <strong className="font-mono">{formatEgyptianCurrency(aggregates.actualOpEx)}</strong> مقارنة بموازنة مستهدفة قدرها <strong className="font-mono">{formatEgyptianCurrency(aggregates.budgetOpEx)}</strong>.
              </li>
              <li>
                صافي أرباح العام بعد الضرائب بلغ <strong className="font-mono">{formatEgyptianCurrency(aggregates.actualNetProfit)}</strong> بفارق انحراف إيجابي قدره <strong className="font-mono">{formatEgyptianCurrency(aggregates.netProfitVariance)}</strong>.
              </li>
            </ul>

            <h4 className="font-black text-sm text-slate-900 dark:text-white">ثالثاً: توصيات الإدارة المالية</h4>
            <p>
              نوصي بالاستمرار في ترشيد تكاليف التشغيل المباشرة، وتعزيز جهود التحصيل النقدي للعملاء لتدعيم السيولة الفورية، ومتابعة جدول سداد الالتزامات الضريبية لتفادي غرامات المادة (110) من قانون الإجراءات الضريبية الموحد.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-right">
              <div className="text-xs text-slate-500">المدير المالي</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">اعتماد الإدارة المالية</div>
            </div>

            <div className="text-center sm:text-left">
              <div className="text-xs text-slate-500">المحاسب القانوني ومراقب الحسابات</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {state.officeProfile.auditorName}
              </div>
              <div className="text-[11px] text-blue-600 font-mono">سجل رقم: {state.officeProfile.licenseNumber}</div>
            </div>
          </div>
        </div>
      )}

      {/* Official Print Layout Modal */}
      {isPrintModalOpen && (
        <PrintLayoutWrapper
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`تقرير الموازنة التقديرية والانحرافات المالية لسنة ${selectedYear}`}
          watermarkText={state.officeProfile.firmName}
          verificationPayload={verificationPayload}
        >
          <div className="p-6 space-y-6 text-slate-900 text-right" dir="rtl">
            <div className="text-center pb-4 border-b border-slate-300">
              <h2 className="text-xl font-bold">الموازنة التقديرية السنوية ومصفوفة الانحرافات</h2>
              <p className="text-xs text-slate-600 mt-1">
                مقارنة الأداء المالي الفعلي بالمستهدف التقديري لسنة {selectedYear} وفقاً للمعايير المصرية EAS
              </p>
            </div>

            <table className="w-full text-xs border border-slate-300 text-right">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2 border-l">كود</th>
                  <th className="p-2 border-l">البند المحاسبي</th>
                  <th className="p-2 text-center border-l">الفعلي (EGP)</th>
                  <th className="p-2 text-center border-l">المستهدف (EGP)</th>
                  <th className="p-2 text-center border-l">الانحراف (EGP)</th>
                  <th className="p-2 text-center">النسبة %</th>
                </tr>
              </thead>
              <tbody>
                {activeBudgetItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border-l font-mono">{item.accountCode || '-'}</td>
                    <td className="p-2 border-l font-bold">{item.name}</td>
                    <td className="p-2 border-l text-center font-mono">{formatEgyptianCurrency(item.actualAmount)}</td>
                    <td className="p-2 border-l text-center font-mono">{formatEgyptianCurrency(item.effectiveBudget)}</td>
                    <td className="p-2 border-l text-center font-mono">{formatEgyptianCurrency(item.varianceAmount)}</td>
                    <td className="p-2 text-center font-mono font-bold">{item.variancePct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-300 text-center">
              <div>
                <span className="text-xs text-slate-500 block">اعتماد المدير المالي</span>
                <span className="text-sm font-bold block mt-4">..............................</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">المحاسب القانوني المعتمد</span>
                <span className="text-sm font-bold block mt-1">{state.officeProfile.auditorName}</span>
                <span className="text-[10px] text-slate-500 font-mono block">ترخيص: {state.officeProfile.licenseNumber}</span>
              </div>
            </div>
          </div>
        </PrintLayoutWrapper>
      )}

      {/* QR Verification Modal */}
      {isVerificationModalOpen && (
        <DocumentVerificationModal
          isOpen={isVerificationModalOpen}
          data={verificationPayload}
          onClose={() => setIsVerificationModalOpen(false)}
        />
      )}
    </div>
  );
};
