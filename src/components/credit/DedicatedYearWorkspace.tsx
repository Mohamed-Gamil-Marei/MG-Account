import React, { useState } from 'react';
import {
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Scale,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Table as TableIcon,
  ShieldCheck,
  Edit2,
  Lock,
  Printer,
  Download,
  Award,
  BookOpen,
  ChevronDown,
  Sparkles,
  PieChart,
  Repeat,
} from 'lucide-react';
import { FiscalYearData } from './CreditYearlyEditor';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { AccountingNumberInput } from '../common/AccountingNumberInput';
import {
  SupplementaryNoteItem,
  DEFAULT_SUPPLEMENTARY_NOTES,
} from './CreditNotesTab';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { AdminExpenseItem } from './CreditAdminExpensesTab';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../../utils/excelArabicStyler';
import { UnifiedSelectDropdown } from '../common/UnifiedSelectDropdown';
import { ActionMenu } from '../common/ActionMenu';

interface DedicatedYearWorkspaceProps {
  yearsData: Record<number, FiscalYearData>;
  yearsList: number[];
  computedData: Record<number, any>;
  customItems?: any[];
  itemNames?: Record<string, string>;
  hiddenItemIds?: string[];
  supplementaryNotes?: SupplementaryNoteItem[];
  onUpdateNotesList?: (notes: SupplementaryNoteItem[]) => void;
  assetCategories?: FixedAssetCategoryItem[];
  adminExpenses?: AdminExpenseItem[];
  officeProfile?: any;
  onAutoBalanceYear?: (year: number) => void;
  onAutoBalanceAllYears?: () => void;
  onRollForwardFromPreviousYear?: (year: number) => void;
  onUpdateCell?: (field: string, year: number, val: number) => void;
  onUpdateYearData?: (year: number, partial: Partial<FiscalYearData>) => void;
  initialYear?: number;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
}

export type DedicatedSubSection =
  | 'ALL_IN_ONE'
  | 'INCOME'
  | 'BALANCE_SHEET'
  | 'CASH_FLOW'
  | 'PROFIT_DIST'
  | 'NOTES';

export const DedicatedYearWorkspace: React.FC<DedicatedYearWorkspaceProps> = ({
  yearsData,
  yearsList,
  computedData,
  customItems = [],
  itemNames = {},
  hiddenItemIds = [],
  supplementaryNotes = DEFAULT_SUPPLEMENTARY_NOTES,
  onUpdateNotesList,
  assetCategories = [],
  adminExpenses = [],
  officeProfile,
  onAutoBalanceYear,
  onAutoBalanceAllYears,
  onRollForwardFromPreviousYear,
  onUpdateCell,
  onUpdateYearData,
  initialYear,
  periodStartDate,
  periodEndDate,
  periodLabel,
}) => {
  const [activeYear, setActiveYear] = useState<number>(
    initialYear || yearsList[yearsList.length - 1] || 2026
  );
  const [activeSection, setActiveSection] = useState<DedicatedSubSection>('ALL_IN_ONE');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Profit distribution ratios for this active year
  const [legalReserveRatio, setLegalReserveRatio] = useState<number>(5);
  const [statutoryReserveRatio, setStatutoryReserveRatio] = useState<number>(5);
  const [employeesShareRatio, setEmployeesShareRatio] = useState<number>(10);
  const [boardBonusRatio, setBoardBonusRatio] = useState<number>(5);
  const [dividendsRatio, setDividendsRatio] = useState<number>(60);
  const [retainedRatio, setRetainedRatio] = useState<number>(15);

  const cd = computedData[activeYear];
  const yearData = yearsData[activeYear];
  const onSelectYear = (yr: number) => setActiveYear(yr);

  if (!cd) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        جاري تهيئة وتحميل ملف وبيانات سنة {activeYear}...
      </div>
    );
  }

  const isBalanced = cd.isBalanced ?? Math.abs(cd.balanceDiff || 0) < 0.01;
  const balanceDiff = cd.balanceDiff || 0;

  // Profit calculations for active year
  const np = cd.netProfit || 0;
  const isProfitPositive = np > 0;
  const legalReserveDeduction = isProfitPositive ? Math.round(np * (legalReserveRatio / 100)) : 0;
  const statutoryReserveDeduction = isProfitPositive ? Math.round(np * (statutoryReserveRatio / 100)) : 0;
  const distributableAfterReserves = Math.max(0, np - legalReserveDeduction - statutoryReserveDeduction);
  const employeesShareDeduction = isProfitPositive ? Math.round(distributableAfterReserves * (employeesShareRatio / 100)) : 0;
  const boardBonusDeduction = isProfitPositive ? Math.round(distributableAfterReserves * (boardBonusRatio / 100)) : 0;
  const shareholdersDividends = isProfitPositive ? Math.round(distributableAfterReserves * (dividendsRatio / 100)) : 0;
  const retainedCarriedForward = isProfitPositive
    ? Math.max(0, np - legalReserveDeduction - statutoryReserveDeduction - employeesShareDeduction - boardBonusDeduction - shareholdersDividends)
    : 0;

  // Render quick editable field or formatted number
  const renderFieldCell = (
    fieldKey: string,
    val: number,
    colorClass: string = 'text-slate-900 dark:text-slate-100',
    isBold: boolean = false,
    allowNegative: boolean = false
  ) => {
    if (isEditMode && onUpdateCell) {
      return (
        <AccountingNumberInput
          value={val || 0}
          onChange={(newVal) => onUpdateCell(fieldKey, activeYear, newVal)}
          allowNegative={allowNegative}
          allowDecimals={true}
          decimalPlaces={2}
          className={`w-full max-w-[180px] text-left px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/80 focus:bg-white dark:focus:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono text-xs ${
            isBold ? 'font-black' : 'font-semibold'
          } ${colorClass} focus:outline-none transition-all`}
        />
      );
    }

    return (
      <div className="flex items-center justify-end gap-1.5 group/val">
        <span className={`font-mono ${isBold ? 'font-black' : 'font-semibold'} ${colorClass}`}>
          {formatEgyptianCurrency(val || 0, allowNegative)}
        </span>
        {onUpdateCell && (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            className="p-1 text-slate-300 hover:text-blue-600 opacity-0 group-hover/val:opacity-100 transition-opacity no-print cursor-pointer"
            title="تعديل هذا البند"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  // Export isolated Excel dossier for this active year only
  const handleExportYearDossierExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Income Sheet
    const incomeRows = [
      { 'البيان': 'صافي إيرادات المبيعات والنشاط', 'القيمة (ج.م)': cd.sales, 'الإيضاح': 'إيضاح 14' },
      { 'البيان': 'يخصم: تكلفة الحصول على الإيراد (تكلفة المبيعات)', 'القيمة (ج.م)': -cd.cogs, 'الإيضاح': 'إيضاح 15' },
      { 'البيان': 'مجمل ربح / (خسارة) النشاط', 'القيمة (ج.م)': cd.grossProfit, 'الإيضاح': '-' },
      { 'البيان': 'يخصم: المصروفات العمومية والإدارية والتشغيل', 'القيمة (ج.م)': -cd.adminExp, 'الإيضاح': 'إيضاح 9' },
      { 'البيان': 'يخصم: إهلاك الأصول الثابتة', 'القيمة (ج.م)': -cd.depreciation, 'الإيضاح': 'إيضاح 4' },
      { 'البيان': 'يخصم: أعباء وفوائد التمويل البنكي', 'القيمة (ج.م)': -cd.financeExp, 'الإيضاح': 'إيضاح 12' },
      { 'البيان': 'صافي الأرباح قبل الضريبة (EBT)', 'القيمة (ج.م)': cd.ebt, 'الإيضاح': '-' },
      { 'البيان': 'يخصم: ضريبة الدخل المستحقة', 'القيمة (ج.م)': -cd.tax, 'الإيضاح': 'إيضاح 19' },
      { 'البيان': 'صافي ربح / (خسارة) العام بعد الضريبة (يرحل لحقوق الملكية)', 'القيمة (ج.م)': cd.netProfit, 'الإيضاح': '-' },
    ];
    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    formatWorksheetForArabicExport(wsIncome, incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, `قائمة الدخل ${activeYear}`);

    // 2. Balance Sheet
    const balanceRows = [
      { 'التبويب': 'أصول غير متداولة', 'البيان': 'صافي الأصول الثابتة', 'القيمة (ج.م)': cd.netFixedAssets, 'الإيضاح': 'إيضاح 4' },
      { 'التبويب': 'أصول متداولة', 'البيان': 'المخزون (بضاعة بالمخزن)', 'القيمة (ج.م)': cd.inventory, 'الإيضاح': 'إيضاح 6' },
      { 'التبويب': 'أصول متداولة', 'البيان': 'العملاء وأوراق القبض', 'القيمة (ج.م)': cd.receivables, 'الإيضاح': 'إيضاح 7' },
      { 'التبويب': 'أصول متداولة', 'البيان': 'أرصدة مدينة أخرى وتأمينات', 'القيمة (ج.م)': cd.otherDebit, 'الإيضاح': '-' },
      { 'التبويب': 'أصول متداولة', 'البيان': 'النقدية بالصندوق ولدى البنوك', 'القيمة (ج.م)': cd.cash, 'الإيضاح': 'إيضاح 8' },
      { 'التبويب': 'إجمالي', 'البيان': 'إجمالي الأصول', 'القيمة (ج.م)': cd.totalAssets, 'الإيضاح': '-' },
      { 'التبويب': 'حقوق ملكية', 'البيان': 'رأس المال المدفوع', 'القيمة (ج.م)': cd.paidUpCapital, 'الإيضاح': 'إيضاح 10' },
      { 'التبويب': 'حقوق ملكية', 'البيان': 'الأرباح المرحلة وصافي ربح العام (من قائمة الدخل)', 'القيمة (ج.م)': cd.retainedEarningsAndProfit, 'الإيضاح': 'إيضاح 10' },
      { 'التبويب': 'حقوق ملكية', 'البيان': 'جاري الشركاء (اتزان الميزان)', 'القيمة (ج.م)': cd.legalReserve, 'الإيضاح': 'إيضاح 10' },
      { 'التبويب': 'حقوق ملكية', 'البيان': 'إجمالي حقوق الملكية', 'القيمة (ج.م)': cd.totalEquity, 'الإيضاح': '-' },
      { 'التبويب': 'التزامات', 'البيان': 'قروض وتسهيلات طويلة الأجل', 'القيمة (ج.م)': cd.longLoans, 'الإيضاح': 'إيضاح 11' },
      { 'التبويب': 'التزامات', 'البيان': 'الموردون وأوراق الدفع', 'القيمة (ج.م)': cd.suppliers, 'الإيضاح': 'إيضاح 12' },
      { 'التبويب': 'التزامات', 'البيان': 'تسهيلات ائتمانية قصيرة الأجل (جاري مدين)', 'القيمة (ج.م)': cd.shortLoans, 'الإيضاح': 'إيضاح 13' },
      { 'التبويب': 'التزامات', 'البيان': 'أرصدة دائنة ومخصصات أخرى', 'القيمة (ج.م)': cd.otherCurrentLiab, 'الإيضاح': '-' },
      { 'التبويب': 'إجمالي', 'البيان': 'إجمالي الالتزامات وحقوق الملكية', 'القيمة (ج.م)': cd.totalEquityAndLiabilities, 'الإيضاح': '-' },
      { 'التبويب': 'فحص الاتزان', 'البيان': 'فارق الميزانية (يجب أن يكون 0)', 'القيمة (ج.م)': balanceDiff, 'الإيضاح': isBalanced ? 'متزن 100%' : 'فارق' },
    ];
    const wsBal = XLSX.utils.json_to_sheet(balanceRows);
    formatWorksheetForArabicExport(wsBal, balanceRows);
    XLSX.utils.book_append_sheet(wb, wsBal, `المركز المالي ${activeYear}`);

    // 3. Cash Flow Sheet
    const cfRows = [
      { 'البيان': 'صافي أرباح العام بعد الضريبة', 'القيمة (ج.م)': cd.netProfit },
      { 'البيان': 'يضاف: إهلاك الأصول الثابتة غير النقدي', 'القيمة (ج.م)': cd.depreciation },
      { 'البيان': 'التغير في رأس المال العامل', 'القيمة (ج.م)': -(cd.workingCapitalChange || 0) },
      { 'البيان': 'صافي التدفقات النقدية من الأنشطة التشغيلية', 'القيمة (ج.م)': cd.operatingCashFlow },
      { 'البيان': 'المدفوعات لشراء الأصول الثابتة (CAPEX)', 'القيمة (ج.م)': -(cd.capex || 0) },
      { 'البيان': 'صافي التدفقات النقدية من الأنشطة التمويلية', 'القيمة (ج.م)': cd.financingCashFlow },
    ];
    const wsCF = XLSX.utils.json_to_sheet(cfRows);
    formatWorksheetForArabicExport(wsCF, cfRows);
    XLSX.utils.book_append_sheet(wb, wsCF, `التدفقات النقدية ${activeYear}`);

    // 4. Profit Distribution Sheet
    const pdistRows = [
      { 'البند': 'صافي أرباح العام القابلة للتوزيع', 'النسبة': '100%', 'المبلغ (ج.م)': np },
      { 'البند': 'يقتطع: الاحتياطي القانوني (إلزامي)', 'النسبة': `${legalReserveRatio}%`, 'المبلغ (ج.م)': legalReserveDeduction },
      { 'البند': 'يقتطع: الاحتياطي النظامي', 'النسبة': `${statutoryReserveRatio}%`, 'المبلغ (ج.م)': statutoryReserveDeduction },
      { 'البند': 'حصة العاملين النقدية في الأرباح', 'النسبة': `${employeesShareRatio}%`, 'المبلغ (ج.م)': employeesShareDeduction },
      { 'البند': 'مكافأة أعضاء مجلس الإدارة', 'النسبة': `${boardBonusRatio}%`, 'المبلغ (ج.م)': boardBonusDeduction },
      { 'البند': 'توزيعات الأرباح النقدية للمساهمين والشركاء', 'النسبة': `${dividendsRatio}%`, 'المبلغ (ج.م)': shareholdersDividends },
      { 'البند': 'الأرباح المحتجزة والمرحلة لتدعيم المركز المالي', 'النسبة': `${retainedRatio}%`, 'المبلغ (ج.م)': retainedCarriedForward },
    ];
    const wsPDist = XLSX.utils.json_to_sheet(pdistRows);
    formatWorksheetForArabicExport(wsPDist, pdistRows);
    XLSX.utils.book_append_sheet(wb, wsPDist, `توزيع الأرباح ${activeYear}`);

    // 5. Notes to Financial Statements for this year only
    const notesRows: any[] = [];
    supplementaryNotes.forEach((n) => {
      notesRows.push({
        'رقم الإيضاح': `إيضاح (${n.noteNumber})`,
        'عنوان الإيضاح': n.title,
        'التبويب': n.category,
        'البيان والشرح': n.content.replace(/<[^>]*>?/gm, ''),
      });
    });
    const wsNotes = XLSX.utils.json_to_sheet(notesRows);
    formatWorksheetForArabicExport(wsNotes, notesRows);
    XLSX.utils.book_append_sheet(wb, wsNotes, `الإيضاحات المتممة ${activeYear}`);

    writeArabicExcelFile(wb, `الملف_المالي_المستقل_المعتمد_سنة_${activeYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar: Year Tabs & Quick KPI Badges */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                    الملف المالي المستقل والمعزول — سنة {activeYear}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    ملف محاسبي مستقل 100%
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  قائمة الدخل، المركز المالي، التدفقات النقدية، توزيع الأرباح، وكافة الإيضاحات المتممة (1 - 20) معزولة تماماً لهذه السنة.
                </p>
              </div>
            </div>
          </div>

          {/* Fiscal Years & Action Controls - Unified Design */}
          <div className="flex items-center gap-2 flex-wrap">
            <UnifiedSelectDropdown<number>
              id="dedicated-year-dropdown"
              label="السنة المالية"
              value={activeYear}
              options={yearsList.map((yr) => ({
                id: yr,
                label: `سنة ${yr}`,
                sublabel: `الملف المالي المستقل والمعتمد لسنة ${yr}`,
              }))}
              onChange={(yr) => onSelectYear(yr)}
            />

            {/* Print & Excel Actions for this isolated year via ActionMenu */}
            <div className="no-print">
              <ActionMenu
                id="dedicated-year-actions-menu"
                label="خيارات الملف والسنة"
                triggerVariant="secondary"
                align="left"
                items={[
                  {
                    id: 'export-year-excel',
                    label: `تصدير ملف سنة ${activeYear} كاملاً (Excel)`,
                    icon: Download,
                    variant: 'success',
                    onClick: handleExportYearDossierExcel,
                  },
                  {
                    id: 'print-year-file',
                    label: `طباعة ملف سنة ${activeYear} (مستند معتمد)`,
                    icon: Printer,
                    onClick: () => window.print(),
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Financial Health Indicators for the Active Year */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-right">
          {/* Revenue */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-bold mb-1">إيرادات النشاط والمبيعات</div>
            <div className="text-base sm:text-lg font-black font-mono text-blue-300">
              {formatEgyptianCurrency(cd.sales || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              مجمل الربح: {formatEgyptianCurrency(cd.grossProfit || 0)}
            </div>
          </div>

          {/* Net Profit After Tax */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-bold mb-1 flex items-center justify-between">
              <span>صافي ربح العام بعد الضريبة</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                قائمة الدخل
              </span>
            </div>
            <div
              className={`text-base sm:text-lg font-black font-mono ${
                cd.netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatEgyptianCurrency(cd.netProfit || 0, true)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              هامش صافي الربح: {((cd.netProfit / (cd.sales || 1)) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Total Assets */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-bold mb-1">إجمالي الأصول (الميزانية)</div>
            <div className="text-base sm:text-lg font-black font-mono text-purple-300">
              {formatEgyptianCurrency(cd.totalAssets || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              متداولة: {formatEgyptianCurrency(cd.totalCurrentAssets || 0)}
            </div>
          </div>

          {/* Partner Current Account & Balance State */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              isBalanced
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="text-[11px] font-bold mb-1 flex items-center justify-between">
              <span>جاري الشركاء (اتزان الميزان)</span>
              {isBalanced ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-black">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>متزن 100%</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-black">
                  <AlertTriangle className="w-3 h-3" />
                  <span>فرق {formatEgyptianCurrency(Math.abs(balanceDiff))}</span>
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-white">
              {formatEgyptianCurrency(cd.legalReserve || 0, true)}
            </div>
            <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
              <span>رصيد موازن لحقوق الملكية</span>
              {onAutoBalanceYear && !isBalanced && (
                <button
                  type="button"
                  onClick={() => onAutoBalanceYear(activeYear)}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] font-black cursor-pointer shadow-xs"
                >
                  موازنة فورية
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Section & Workspace Controls: Unified Clean Dropdown Interface */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <UnifiedSelectDropdown<DedicatedSubSection>
            id="dedicated-section-dropdown"
            label="القائمة / القسم المعروض"
            value={activeSection}
            options={[
              {
                id: 'ALL_IN_ONE',
                label: `📋 الملف المالي المتكامل الشامل (سنة ${activeYear})`,
                sublabel: 'عرض الدخل والميزانية والتدفقات وتوزيع الأرباح والإيضاحات',
              },
              {
                id: 'INCOME',
                label: '1. قائمة الدخل والأرباح والخسائر',
                sublabel: 'إيرادات المبيعات وتكلفة النشاط والمصروفات وصافي الربح',
              },
              {
                id: 'BALANCE_SHEET',
                label: '2. قائمة المركز المالي (الميزانية)',
                sublabel: 'الأصول المتداولة وغير المتداولة، حقوق الملكية والالتزامات',
              },
              {
                id: 'CASH_FLOW',
                label: '3. قائمة التدفقات النقدية',
                sublabel: 'التدفقات التشغيلية والاستثمارية (CAPEX) والتمويلية',
              },
              {
                id: 'PROFIT_DIST',
                label: '4. مشروع ومذكرة توزيع الأرباح',
                sublabel: 'الاحتياطي القانوني وحصة العاملين (10%) وتوزيعات المساهمين',
              },
              {
                id: 'NOTES',
                label: '5. الإيضاحات المتممة (1 - 20)',
                sublabel: 'ملحق الإيضاحات والسياسات المحاسبية المعتمدة لهذه السنة',
              },
            ]}
            onChange={(sec) => setActiveSection(sec)}
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <ActionMenu
            id="dedicated-edit-actions-menu"
            label="أدوات الإدخال والاتزان"
            triggerVariant="primary"
            align="left"
            items={[
              ...(onUpdateCell
                ? [
                    {
                      id: 'toggle-cell-edit',
                      label: isEditMode ? 'إنهاء التعديل المباشر وحفظ الأرقام' : 'تفعيل تعديل الأرقام والخلايا مباشرة',
                      icon: isEditMode ? Lock : Edit2,
                      onClick: () => setIsEditMode(!isEditMode),
                    },
                  ]
                : []),
              ...(onAutoBalanceYear
                ? [
                    {
                      id: 'auto-balance-year',
                      label: 'ضبط اتزان الميزانية آلياً (جاري الشركاء)',
                      icon: Scale,
                      variant: isBalanced ? 'success' as const : 'warning' as const,
                      onClick: () => onAutoBalanceYear(activeYear),
                    },
                  ]
                : []),
              ...(onRollForwardFromPreviousYear && yearsList.includes(activeYear - 1)
                ? [
                    {
                      id: 'rollover-from-prev-year',
                      label: `ترحيل ثوابت وأرصدة ${activeYear - 1} إلى ${activeYear}`,
                      icon: Repeat,
                      variant: 'primary' as const,
                      onClick: () => onRollForwardFromPreviousYear(activeYear),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      {/* 3. SECTION 1: INCOME STATEMENT */}
      {(activeSection === 'ALL_IN_ONE' || activeSection === 'INCOME') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  1. قائمة الدخل والأرباح والخسائر — سنة {activeYear} (Income Statement)
                </h3>
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعايير المحاسبة المصرية (EAS 1)
                  {periodStartDate && periodEndDate
                    ? ` — عن الفترة من ${periodStartDate} إلى ${periodEndDate}`
                    : ` — عن السنة المالية المنتهية في 31 ديسمبر ${activeYear}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                صافي الربح: {formatEgyptianCurrency(cd.netProfit || 0, true)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-3 w-1/2">بيان الإيرادات والمصروفات والأرباح</th>
                  <th className="p-3 text-center w-28">الإيضاح</th>
                  <th className="p-3 text-left font-mono w-48">قيمة سنة {activeYear} (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {/* Sales */}
                <tr className="font-bold text-slate-900 dark:text-white bg-slate-50/40 dark:bg-slate-800/20">
                  <td className="p-2.5 pr-4">صافي إيرادات المبيعات والنشاط</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (14)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('sales', cd.sales, 'text-blue-900 dark:text-blue-300', true)}</td>
                </tr>

                {/* COGS */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6 text-rose-700 dark:text-rose-400">
                    يخصم: تكلفة الحصول على الإيراد (تكلفة المبيعات)
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (15)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('cogs', cd.cogs, 'text-rose-700 dark:text-rose-400')}</td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-950 dark:text-blue-200">
                  <td className="p-2.5 pr-4">مجمل ربح / (خسارة) النشاط (Gross Profit)</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-black text-sm text-blue-950 dark:text-blue-200">
                    {formatEgyptianCurrency(cd.grossProfit || 0, true)}
                  </td>
                </tr>

                {/* Admin Expenses */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6 text-slate-600 dark:text-slate-400">
                    يخصم: المصروفات الإدارية والعمومية وتكاليف التشغيل
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (9)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('adminExp', cd.adminExp, 'text-slate-700 dark:text-slate-300')}</td>
                </tr>

                {/* Depreciation */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6 text-slate-600 dark:text-slate-400">
                    يخصم: إهلاك الأصول الثابتة
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (4)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('depreciation', cd.depreciation, 'text-slate-700 dark:text-slate-300')}</td>
                </tr>

                {/* Operating Profit */}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                  <td className="p-2.5 pr-4">أرباح التشغيل قبل الفوائد والضرائب (EBIT)</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(cd.ebit || 0, true)}
                  </td>
                </tr>

                {/* Finance Expenses */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6 text-purple-800 dark:text-purple-400">
                    يخصم: أعباء وفوائد التمويل البنكي
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (12)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('financeExp', cd.financeExp, 'text-purple-800 dark:text-purple-400')}</td>
                </tr>

                {/* EBT */}
                <tr className="bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-950 dark:text-blue-300">
                  <td className="p-2.5 pr-4">صافي الأرباح قبل الضريبة (EBT)</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(cd.ebt || 0, true)}
                  </td>
                </tr>

                {/* Tax */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6 text-rose-700 dark:text-rose-400">
                    يخصم: ضريبة الدخل المستحقة (22.5%)
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (19)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('tax', cd.tax, 'text-rose-700 dark:text-rose-400')}</td>
                </tr>

                {/* Net Profit */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3 pr-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>صافي ربح / (خسارة) العام بعد الضريبة (Net Profit After Tax)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-normal">
                      يرحل تلقائياً لحقوق الملكية
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-400 font-mono">-</td>
                  <td
                    className={`p-3 text-left font-mono text-base ${
                      cd.netProfit < 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {formatEgyptianCurrency(cd.netProfit || 0, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SECTION 2: BALANCE SHEET */}
      {(activeSection === 'ALL_IN_ONE' || activeSection === 'BALANCE_SHEET') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  2. قائمة المركز المالي المستقلة — سنة {activeYear} (Balance Sheet)
                </h3>
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعيار المحاسبة المصري رقم (1) — في 31 ديسمبر {activeYear}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  isBalanced
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {isBalanced ? 'الميزان متزن 100%' : `فارق ميزان: ${formatEgyptianCurrency(Math.abs(balanceDiff))}`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-3 w-1/2">بيان الأصول والالتزامات وحقوق الملكية</th>
                  <th className="p-3 text-center w-28">الإيضاح</th>
                  <th className="p-3 text-left font-mono w-48">قيمة سنة {activeYear} (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {/* ASSETS SECTION HEADER */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  <td colSpan={3} className="p-2.5 pr-4 text-blue-900 dark:text-blue-300">
                    أولاً: الأصول غير المتداولة (Non-Current Assets)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">الأصول الثابتة بالصافي (بعد مجمع الإهلاك)</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (4)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('netFixedAssets', cd.netFixedAssets, 'text-blue-900 dark:text-blue-300', true)}</td>
                </tr>

                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  <td colSpan={3} className="p-2.5 pr-4 text-blue-900 dark:text-blue-300">
                    ثانياً: الأصول المتداولة (Current Assets)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">المخزون السلعي (خام، تحت التشغيل، وتام)</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (6)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('inventory', cd.inventory)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">العملاء وأوراق القبض والمدينون التجاريون</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (7)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('receivables', cd.receivables)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">أرصدة مدينة أخرى وتأمينات ومصروفات مقدمة</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (7-ب)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('otherDebit', cd.otherDebit)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">النقدية بالصندوق ولدى البنوك</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (8)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('cash', cd.cash, 'text-emerald-700 dark:text-emerald-400', true)}</td>
                </tr>

                <tr className="bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-950 dark:text-blue-300">
                  <td className="p-2.5 pr-6">إجمالي الأصول المتداولة</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(cd.totalCurrentAssets || 0)}
                  </td>
                </tr>

                {/* TOTAL ASSETS */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3 pr-4">إجمالي الأصول (Total Assets)</td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-left font-mono text-base text-purple-300">
                    {formatEgyptianCurrency(cd.totalAssets || 0)}
                  </td>
                </tr>

                {/* EQUITY SECTION HEADER */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  <td colSpan={3} className="p-2.5 pr-4 text-emerald-900 dark:text-emerald-300">
                    ثالثاً: حقوق الملكية (Shareholders' Equity)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">رأس المال المصدر والمدفوع</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (10)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('paidUpCapital', cd.paidUpCapital, 'text-slate-900 dark:text-slate-100', true)}</td>
                </tr>

                {/* Retained Earnings and Net Profit (DIRECTLY DERIVED FROM INCOME STATEMENT - READ-ONLY) */}
                <tr className="bg-indigo-50/60 dark:bg-indigo-950/30 font-bold text-indigo-950 dark:text-indigo-200">
                  <td className="p-2.5 pr-6">
                    <div className="flex items-center gap-1.5">
                      <span>الأرباح المرحلة وصافي ربح العام</span>
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-mono font-normal flex items-center gap-1">
                        <Lock className="w-3 h-3 text-indigo-200" />
                        من قائمة الدخل مباشرة: {formatEgyptianCurrency(cd.netProfit || 0, true)}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (10)</td>
                  <td className="p-2.5 text-left font-mono font-black text-indigo-900 dark:text-indigo-300">
                    <div className="flex items-center justify-end gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-400 no-print" title="بند محمي ومربوط آلياً بصافي الربح بعد الضريبة" />
                      <span>{formatEgyptianCurrency(cd.retainedEarningsAndProfit || 0, true)}</span>
                    </div>
                  </td>
                </tr>

                {/* Partner Current Account - جاري الشركاء (Plugging and Balancing row) */}
                <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 font-bold text-emerald-950 dark:text-emerald-200">
                  <td className="p-2.5 pr-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>جاري الشركاء (اتزان الميزان)</span>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-normal">
                          متمم اتزان الميزان المحاسبي
                        </span>
                      </div>
                      {onAutoBalanceYear && !isBalanced && (
                        <button
                          type="button"
                          onClick={() => onAutoBalanceYear(activeYear)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-mono cursor-pointer transition-colors shadow-2xs"
                        >
                          موازنة الآن ⚡
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (10)</td>
                  <td className="p-2.5 text-left font-mono font-black text-emerald-900 dark:text-emerald-300">
                    {renderFieldCell('legalReserve', cd.legalReserve, 'text-emerald-900 dark:text-emerald-300', true, true)}
                  </td>
                </tr>

                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-emerald-950 dark:text-emerald-300">
                  <td className="p-2.5 pr-6">إجمالي حقوق الملكية</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(cd.totalEquity || 0)}
                  </td>
                </tr>

                {/* LIABILITIES SECTION HEADER */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  <td colSpan={3} className="p-2.5 pr-4 text-purple-900 dark:text-purple-300">
                    رابعاً: الالتزامات المتداولة وغير المتداولة (Liabilities)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">قروض وتسهيلات بنكية طويلة الأجل</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (11)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('longLoans', cd.longLoans)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">الموردون وأوراق الدفع والالتزامات التجارية</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (12)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('suppliers', cd.suppliers)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">تسهيلات ائتمانية قصيرة الأجل (سحب على المكشوف)</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (13)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('shortLoans', cd.shortLoans, 'text-rose-800 dark:text-rose-300')}</td>
                </tr>

                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-2.5 pr-6">أرصدة دائنة ومخصصات والتزامات أخرى</td>
                  <td className="p-2.5 text-center text-slate-400 font-mono">إيضاح (13-ب)</td>
                  <td className="p-2.5 text-left">{renderFieldCell('otherCurrentLiab', cd.otherCurrentLiab)}</td>
                </tr>

                <tr className="bg-slate-50/60 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-slate-200">
                  <td className="p-2.5 pr-6">إجمالي الالتزامات (الخصوم)</td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(cd.totalLiabilities || 0)}
                  </td>
                </tr>

                {/* TOTAL EQUITY AND LIABILITIES */}
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="p-3 pr-4">إجمالي الالتزامات وحقوق الملكية (Total Equity & Liabilities)</td>
                  <td className="p-3 text-center text-slate-400">-</td>
                  <td className="p-3 text-left font-mono text-base text-emerald-300">
                    {formatEgyptianCurrency(cd.totalEquityAndLiabilities || 0)}
                  </td>
                </tr>

                {/* BALANCE AUDIT ROW */}
                <tr
                  className={`font-black text-xs ${
                    isBalanced
                      ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <td className="p-3 pr-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>حالة اتزان الميزانية (الأصول - الالتزامات وحقوق الملكية):</span>
                    </div>
                    <span>{isBalanced ? 'مطابقة وموزونة تماماً بنسبة 100%' : 'يوجد فارق يتطلب الضبط'}</span>
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-left font-mono text-sm">
                    {formatEgyptianCurrency(balanceDiff, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SECTION 3: CASH FLOW STATEMENT FOR ACTIVE YEAR */}
      {(activeSection === 'ALL_IN_ONE' || activeSection === 'CASH_FLOW') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  3. قائمة التدفقات النقدية المستقلة — سنة {activeYear} (Cash Flows Statement)
                </h3>
                <p className="text-[11px] text-slate-300">
                  وفقاً لمعيار المحاسبة المصري رقم (4) — الطريقة غير المباشرة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                صافي التدفق التشغيلي: {formatEgyptianCurrency(cd.operatingCashFlow || 0)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-3 w-2/3">بيان بنود التدفقات النقدية</th>
                  <th className="p-3 text-left font-mono w-1/3">مبلغ سنة {activeYear} (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-blue-900 dark:text-blue-300">
                  <td colSpan={2} className="p-2.5 pr-4">
                    أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">صافي أرباح العام بعد الضريبة (من قائمة الدخل)</td>
                  <td className="p-2.5 text-left font-mono font-bold text-blue-950 dark:text-blue-200">
                    {formatEgyptianCurrency(cd.netProfit || 0)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-emerald-700 dark:text-emerald-400">يضاف: إهلاك الأصول الثابتة غير النقدي</td>
                  <td className="p-2.5 text-left font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    +{formatEgyptianCurrency(cd.depreciation || 0)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-slate-600 dark:text-slate-400">
                    التغير في رأس المال العامل (المدينون والمخزون والدائنون)
                  </td>
                  <td className="p-2.5 text-left font-mono text-slate-600 dark:text-slate-400">
                    ({formatEgyptianCurrency(cd.workingCapitalChange || 0)})
                  </td>
                </tr>
                <tr className="bg-emerald-50/60 dark:bg-emerald-950/40 font-bold text-emerald-950 dark:text-emerald-200">
                  <td className="p-2.5 pr-6 font-black">صافي التدفقات النقدية من الأنشطة التشغيلية</td>
                  <td className="p-2.5 text-left font-mono font-black text-emerald-900 dark:text-emerald-300">
                    {formatEgyptianCurrency(cd.operatingCashFlow || 0)}
                  </td>
                </tr>

                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-amber-900 dark:text-amber-300">
                  <td colSpan={2} className="p-2.5 pr-4">
                    ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6 text-rose-700 dark:text-rose-400">المدفوعات لشراء وتحديث الأصول الثابتة (CAPEX)</td>
                  <td className="p-2.5 text-left font-mono text-rose-700 dark:text-rose-400">
                    ({formatEgyptianCurrency(cd.capex || 0)})
                  </td>
                </tr>

                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-purple-900 dark:text-purple-300">
                  <td colSpan={2} className="p-2.5 pr-4">
                    ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 pr-6">سداد/سحب تسهيلات بنكية وتوزيعات</td>
                  <td className="p-2.5 text-left font-mono">
                    {formatEgyptianCurrency(cd.financingCashFlow || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SECTION 4: PROFIT DISTRIBUTION MEMO FOR ACTIVE YEAR */}
      {(activeSection === 'ALL_IN_ONE' || activeSection === 'PROFIT_DIST') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  4. مشروع ومذكرة توزيع الأرباح المقترحة — سنة {activeYear} (Profit Distribution)
                </h3>
                <p className="text-[11px] text-slate-300">
                  وفقاً لأحكام قانون الشركات المصري رقم 159 لسنة 1981 وقرارات الجمعية العمومية
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
              الربح القابل للتوزيع: {formatEgyptianCurrency(np)}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Quick Ratio Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  الاحتياطي القانوني ({legalReserveRatio}% إلزامي):
                </span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-300">
                  {formatEgyptianCurrency(legalReserveDeduction)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  حصة العاملين ({employeesShareRatio}% نقدياً):
                </span>
                <span className="font-mono font-black text-purple-700 dark:text-purple-300">
                  {formatEgyptianCurrency(employeesShareDeduction)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  توزيعات الشركاء ({dividendsRatio}% نقداً):
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                  {formatEgyptianCurrency(shareholdersDividends)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  المرحل لتدعيم المركز المالي:
                </span>
                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
                  {formatEgyptianCurrency(retainedCarriedForward)}
                </span>
              </div>
            </div>

            {/* Distribution Statement Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-right divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5">بيان التوزيع المقترح</th>
                    <th className="p-2.5 text-center">النسبة المعتمدة</th>
                    <th className="p-2.5 text-left font-mono">المبلغ لسنة {activeYear} (ج.م)</th>
                    <th className="p-2.5 text-center">السند القانوني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  <tr className="font-bold bg-blue-50/30">
                    <td className="p-2.5 pr-4">صافي أرباح العام القابلة للتوزيع بعد الضريبة</td>
                    <td className="p-2.5 text-center font-mono font-bold">100%</td>
                    <td className="p-2.5 text-left font-mono font-black text-blue-900 dark:text-blue-300">
                      {formatEgyptianCurrency(np)}
                    </td>
                    <td className="p-2.5 text-center text-slate-500">قائمة الدخل</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pr-6 text-rose-700">يقتطع: الاحتياطي القانوني (مادة 40 ق 159)</td>
                    <td className="p-2.5 text-center font-mono text-rose-700">{legalReserveRatio}%</td>
                    <td className="p-2.5 text-left font-mono text-rose-700 font-bold">
                      ({formatEgyptianCurrency(legalReserveDeduction)})
                    </td>
                    <td className="p-2.5 text-center text-slate-500">إلزامي حتى 50% من رأس المال</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pr-6 text-purple-700">يقتطع: حصة العاملين في الأرباح (مادة 41 ق 159)</td>
                    <td className="p-2.5 text-center font-mono text-purple-700">{employeesShareRatio}%</td>
                    <td className="p-2.5 text-left font-mono text-purple-700 font-bold">
                      ({formatEgyptianCurrency(employeesShareDeduction)})
                    </td>
                    <td className="p-2.5 text-center text-slate-500">نقداً بما لا يجاوز أجور سنة</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pr-6 text-emerald-700">توزيعات نقدية للشركاء والمساهمين</td>
                    <td className="p-2.5 text-center font-mono text-emerald-700">{dividendsRatio}%</td>
                    <td className="p-2.5 text-left font-mono text-emerald-700 font-bold">
                      ({formatEgyptianCurrency(shareholdersDividends)})
                    </td>
                    <td className="p-2.5 text-center text-slate-500">توزيعات نقدية معتمدة</td>
                  </tr>
                  <tr className="bg-indigo-50/60 font-black text-indigo-950">
                    <td className="p-2.5 pr-4">الأرباح المحتجزة والمرحلة لتدعيم الملاءة المالية</td>
                    <td className="p-2.5 text-center font-mono">{retainedRatio}%</td>
                    <td className="p-2.5 text-left font-mono text-indigo-900 text-sm">
                      {formatEgyptianCurrency(retainedCarriedForward)}
                    </td>
                    <td className="p-2.5 text-center text-slate-600">ترحل للمركز المالي</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECTION 5: SUPPLEMENTARY NOTES (1 - 20) FOR ACTIVE YEAR */}
      {(activeSection === 'ALL_IN_ONE' || activeSection === 'NOTES') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  5. الإيضاحات المتممة للقوائم المالية — سنة {activeYear} (Notes 1 to 20)
                </h3>
                <p className="text-[11px] text-slate-300">
                  عرض تحليلي مفصل ومعزول لكافة الإيضاحات الخاصة بالسنة المالية {activeYear} فقط
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold font-mono">
              {supplementaryNotes.length} إيضاحاً معتمداً
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {supplementaryNotes.map((note) => {
              const noteNum = note.noteNumber;

              return (
                <div
                  key={note.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-blue-300 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                        {noteNum}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {note.title}
                      </h4>
                    </div>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                      {note.category}
                    </span>
                  </div>

                  {/* Note Content */}
                  <div
                    className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose prose-slate max-w-none text-right"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />

                  {/* Fixed Assets Note Schedule for this year */}
                  {note.linkedScheduleType === 'FIXED_ASSETS' && (
                    <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>بيان حركة الأصول الثابتة لسنة {activeYear} (مربوط آلياً):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                          <span className="block text-[10px] text-slate-500">التكلفة التقديرية</span>
                          <span className="font-bold">{formatEgyptianCurrency(Math.round(cd.netFixedAssets * 1.35))}</span>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                          <span className="block text-[10px] text-slate-500">إهلاك سنة {activeYear}</span>
                          <span className="font-bold text-rose-600">{formatEgyptianCurrency(cd.depreciation || 0)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                          <span className="block text-[10px] text-slate-500">مجمع الإهلاك</span>
                          <span className="font-bold text-rose-700">{formatEgyptianCurrency(Math.round(cd.netFixedAssets * 0.35))}</span>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200">
                          <span className="block text-[10px] text-blue-700">صافي القيمة الدفترية</span>
                          <span className="font-black text-blue-900 dark:text-blue-300">{formatEgyptianCurrency(cd.netFixedAssets || 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Expenses Note Schedule for this year */}
                  {note.linkedScheduleType === 'ADMIN_EXPENSES' && (
                    <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>إجمالي المصروفات الإدارية والعمومية لسنة {activeYear}:</span>
                        </span>
                        <span className="font-mono font-black text-indigo-900 dark:text-indigo-300">
                          {formatEgyptianCurrency(cd.adminExp || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Custom Breakdown Rows for this specific year */}
                  {note.customBreakdownRows && note.customBreakdownRows.length > 0 && (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          <tr>
                            <th className="py-1.5 px-3">البيان الفرعي للإيضاح</th>
                            <th className="py-1.5 px-3 text-left font-mono">مبلغ سنة {activeYear} (ج.م)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {note.customBreakdownRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono">
                              <td className="py-1.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                                {row.label}
                              </td>
                              <td className="py-1.5 px-3 text-left font-bold text-slate-900 dark:text-slate-100">
                                {formatEgyptianCurrency(row.valuesByYear[activeYear] || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
