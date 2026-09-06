import React, { useState, useMemo } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  OracleLedger,
  OracleAccountingPeriod,
  OracleJournalBatch,
  OracleJournalLineItem,
  OracleSegmentDefinition,
  OracleAPInvoice,
  OracleARTransaction,
} from '../../types/oracle';
import { OracleExportService } from '../../services/oracleExportService';
import {
  Building,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Copy,
  Plus,
  ArrowRightLeft,
  Lock,
  Unlock,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Search,
  Check,
  Eye,
  Sliders,
  DollarSign,
  Share2,
} from 'lucide-react';

interface OracleFinancialsHubViewProps {
  state: DatabaseState;
  onReturnToStandardMode: () => void;
  fiscalYear: number;
}

export const OracleFinancialsHubView: React.FC<OracleFinancialsHubViewProps> = ({
  state,
  onReturnToStandardMode,
  fiscalYear,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'DASHBOARD' | 'FLEXFIELDS' | 'GL_BATCHES' | 'PERIODS' | 'SUBLEDGERS' | 'FBDI_EXPORT'
  >('DASHBOARD');

  // Multi-Ledger State
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('LEDGER_01_EAS');
  const ledgers: OracleLedger[] = [
    {
      id: 'LEDGER_01_EAS',
      ledgerName: 'دفتر الأستاذ الرئيسي (معايير المحاسبة المصرية EAS)',
      ledgerNameAr: 'الدفتر الرئيسي - EGP',
      ledgerType: 'PRIMARY',
      currency: 'EGP',
      chartOfAccountsName: 'EAS_5_SEGMENT_COA',
      accountingStandard: 'EAS',
      fiscalCalendarName: 'GREGORIAN_MONTHLY',
      status: 'ACTIVE',
    },
    {
      id: 'LEDGER_02_IFRS',
      ledgerName: 'دفتر التقارير الدولية الموحدة (IFRS / US-GAAP)',
      ledgerNameAr: 'الدفتر الثانوي الموازي - USD',
      ledgerType: 'SECONDARY',
      currency: 'USD',
      chartOfAccountsName: 'EAS_5_SEGMENT_COA',
      accountingStandard: 'IFRS',
      fiscalCalendarName: 'GREGORIAN_MONTHLY',
      revaluationRate: 48.75,
      status: 'ACTIVE',
    },
  ];

  const activeLedger = ledgers.find((l) => l.id === selectedLedgerId) || ledgers[0];

  // Flexfield Segments
  const segments: OracleSegmentDefinition[] = [
    {
      segmentNumber: 1,
      segmentName: 'Company',
      segmentNameAr: 'الشركة / الكيان القانوني',
      codeLength: 2,
      exampleValue: '01',
      description: 'الشركة القابضة والشركات التابعة',
    },
    {
      segmentNumber: 2,
      segmentName: 'CostCenter',
      segmentNameAr: 'مركز التكلفة / الإدارة',
      codeLength: 3,
      exampleValue: '100',
      description: 'الإدارة العامة، الإنتاج، التسويق، المالية',
    },
    {
      segmentNumber: 3,
      segmentName: 'NaturalAccount',
      segmentNameAr: 'الحساب الرئيسي الطبيعي',
      codeLength: 5,
      exampleValue: '11101',
      description: 'حساب الأصول، الالتزامات، حقوق الملكية، الإيرادات، المصروفات',
    },
    {
      segmentNumber: 4,
      segmentName: 'SubAccount',
      segmentNameAr: 'الحساب الفرعي التحليلي',
      codeLength: 3,
      exampleValue: '000',
      description: 'تحليل البنوك، العملاء، خطوط الإنتاج',
    },
    {
      segmentNumber: 5,
      segmentName: 'Intercompany',
      segmentNameAr: 'المعاملات البينية بين الشركات',
      codeLength: 2,
      exampleValue: '00',
      description: 'حسابات التسوية بين الفروع والشركات الشقيقة',
    },
  ];

  // 13 Oracle Accounting Periods
  const [periods, setPeriods] = useState<OracleAccountingPeriod[]>([
    { periodName: 'JAN-26', periodNameAr: 'يناير 2026', periodNumber: 1, fiscalYear, quarter: 'Q1', startDate: `${fiscalYear}-01-01`, endDate: `${fiscalYear}-01-31`, status: 'CLOSED' },
    { periodName: 'FEB-26', periodNameAr: 'فبراير 2026', periodNumber: 2, fiscalYear, quarter: 'Q1', startDate: `${fiscalYear}-02-01`, endDate: `${fiscalYear}-02-28`, status: 'CLOSED' },
    { periodName: 'MAR-26', periodNameAr: 'مارس 2026', periodNumber: 3, fiscalYear, quarter: 'Q1', startDate: `${fiscalYear}-03-01`, endDate: `${fiscalYear}-03-31`, status: 'OPEN' },
    { periodName: 'APR-26', periodNameAr: 'أبريل 2026', periodNumber: 4, fiscalYear, quarter: 'Q2', startDate: `${fiscalYear}-04-01`, endDate: `${fiscalYear}-04-30`, status: 'OPEN' },
    { periodName: 'MAY-26', periodNameAr: 'مايو 2026', periodNumber: 5, fiscalYear, quarter: 'Q2', startDate: `${fiscalYear}-05-01`, endDate: `${fiscalYear}-05-31`, status: 'OPEN' },
    { periodName: 'JUN-26', periodNameAr: 'يونيو 2026', periodNumber: 6, fiscalYear, quarter: 'Q2', startDate: `${fiscalYear}-06-01`, endDate: `${fiscalYear}-06-30`, status: 'OPEN' },
    { periodName: 'JUL-26', periodNameAr: 'يوليو 2026', periodNumber: 7, fiscalYear, quarter: 'Q3', startDate: `${fiscalYear}-07-01`, endDate: `${fiscalYear}-07-31`, status: 'OPEN' },
    { periodName: 'AUG-26', periodNameAr: 'أغسطس 2026', periodNumber: 8, fiscalYear, quarter: 'Q3', startDate: `${fiscalYear}-08-01`, endDate: `${fiscalYear}-08-31`, status: 'OPEN' },
    { periodName: 'SEP-26', periodNameAr: 'سبتمبر 2026', periodNumber: 9, fiscalYear, quarter: 'Q3', startDate: `${fiscalYear}-09-01`, endDate: `${fiscalYear}-09-30`, status: 'OPEN' },
    { periodName: 'OCT-26', periodNameAr: 'أكتوبر 2026', periodNumber: 10, fiscalYear, quarter: 'Q4', startDate: `${fiscalYear}-10-01`, endDate: `${fiscalYear}-10-31`, status: 'OPEN' },
    { periodName: 'NOV-26', periodNameAr: 'نوفمبر 2026', periodNumber: 11, fiscalYear, quarter: 'Q4', startDate: `${fiscalYear}-11-01`, endDate: `${fiscalYear}-11-30`, status: 'OPEN' },
    { periodName: 'DEC-26', periodNameAr: 'ديسمبر 2026', periodNumber: 12, fiscalYear, quarter: 'Q4', startDate: `${fiscalYear}-12-01`, endDate: `${fiscalYear}-12-31`, status: 'OPEN' },
    { periodName: 'ADJ-26', periodNameAr: 'فترة التسويات السنوية 2026 (الفترة 13)', periodNumber: 13, fiscalYear, quarter: 'ADJ', startDate: `${fiscalYear}-12-31`, endDate: `${fiscalYear}-12-31`, status: 'OPEN', isAdjustingPeriod: true },
  ]);

  // Initial Oracle Journal Batches mapped from system transactions
  const initialBatches: OracleJournalBatch[] = useMemo(() => {
    return [
      {
        id: 'BATCH-2026-001',
        batchName: 'JE_BATCH_SALES_REVENUE_0326',
        batchDescription: 'إثبات مبيعات وعمليات النشاط التجاري بالقطاعات الخماسية',
        ledgerId: 'LEDGER_01_EAS',
        periodName: 'MAR-26',
        fiscalYear,
        source: 'RECEIVABLES',
        category: 'RECEIPTS',
        accountingDate: `${fiscalYear}-03-15`,
        status: 'POSTED',
        totalAccountedDebit: 450000,
        totalAccountedCredit: 450000,
        isBalanced: true,
        fundsStatus: 'PASSED',
        postedBy: state.officeProfile.auditorName,
        postedAt: `${fiscalYear}-03-15 14:30`,
        lines: [
          {
            id: 'LINE-1',
            lineNumber: 1,
            companyCode: '01',
            costCenterCode: '100',
            accountCode: '11102',
            subAccountCode: '001',
            intercompanyCode: '00',
            fullCodeCombination: '01-100-11102-001-00',
            accountNameAr: 'البنك التجاري الدولي CIB - ج.م',
            enteredCurrency: 'EGP',
            enteredDebit: 450000,
            enteredCredit: 0,
            exchangeRate: 1.0,
            accountedDebit: 450000,
            accountedCredit: 0,
            lineDescription: 'تحصيل إيرادات مبيعات نقدية وحوالات بنكية',
          },
          {
            id: 'LINE-2',
            lineNumber: 2,
            companyCode: '01',
            costCenterCode: '200',
            accountCode: '41101',
            subAccountCode: '000',
            intercompanyCode: '00',
            fullCodeCombination: '01-200-41101-000-00',
            accountNameAr: 'إيرادات المبيعات والنشاط الرئيسي',
            enteredCurrency: 'EGP',
            enteredDebit: 0,
            enteredCredit: 394736.84,
            exchangeRate: 1.0,
            accountedDebit: 0,
            accountedCredit: 394736.84,
            lineDescription: 'صافي مبيعات البضائع والخدمات',
          },
          {
            id: 'LINE-3',
            lineNumber: 3,
            companyCode: '01',
            costCenterCode: '000',
            accountCode: '21301',
            subAccountCode: '000',
            intercompanyCode: '00',
            fullCodeCombination: '01-000-21301-000-00',
            accountNameAr: 'ضريبة القيمة المضافة 14% المحصلة',
            enteredCurrency: 'EGP',
            enteredDebit: 0,
            enteredCredit: 55263.16,
            exchangeRate: 1.0,
            accountedDebit: 0,
            accountedCredit: 55263.16,
            lineDescription: 'مستحق مصلحة الضرائب المصرية عن مبيعات مارس',
          },
        ],
      },
      {
        id: 'BATCH-2026-002',
        batchName: 'JE_BATCH_DEPRECIATION_Q1',
        batchDescription: 'إهلاك الأصول الثابتة الآلي للربع الأول بنظام دفاتر أوراكل',
        ledgerId: 'LEDGER_01_EAS',
        periodName: 'MAR-26',
        fiscalYear,
        source: 'ASSETS',
        category: 'DEPRECIATION',
        accountingDate: `${fiscalYear}-03-31`,
        status: 'UNPOSTED',
        totalAccountedDebit: 85000,
        totalAccountedCredit: 85000,
        isBalanced: true,
        fundsStatus: 'PASSED',
        lines: [
          {
            id: 'LINE-4',
            lineNumber: 1,
            companyCode: '01',
            costCenterCode: '300',
            accountCode: '52101',
            subAccountCode: '000',
            intercompanyCode: '00',
            fullCodeCombination: '01-300-52101-000-00',
            accountNameAr: 'مصروف إهلاك الأصول الثابتة',
            enteredCurrency: 'EGP',
            enteredDebit: 85000,
            enteredCredit: 0,
            exchangeRate: 1.0,
            accountedDebit: 85000,
            accountedCredit: 0,
            lineDescription: 'قسط إهلاك الآلات والمعدات وحواسب الإدارة',
          },
          {
            id: 'LINE-5',
            lineNumber: 2,
            companyCode: '01',
            costCenterCode: '300',
            accountCode: '12199',
            subAccountCode: '000',
            intercompanyCode: '00',
            fullCodeCombination: '01-300-12199-000-00',
            accountNameAr: 'مجمع إهلاك الأصول الثابتة',
            enteredCurrency: 'EGP',
            enteredDebit: 0,
            enteredCredit: 85000,
            exchangeRate: 1.0,
            accountedDebit: 0,
            accountedCredit: 85000,
            lineDescription: 'مجمع إهلاك أصول الربع الأول 2026',
          },
        ],
      },
    ];
  }, [state, fiscalYear]);

  const [batches, setBatches] = useState<OracleJournalBatch[]>(initialBatches);
  const [selectedBatch, setSelectedBatch] = useState<OracleJournalBatch | null>(batches[0]);

  // Subledgers Sample State (AP & AR)
  const apInvoices: OracleAPInvoice[] = [
    {
      id: 'AP-01',
      invoiceNumber: 'INV-SUP-9821',
      supplierName: 'شركة النصر للمستلزمات الصناعية',
      invoiceDate: `${fiscalYear}-03-10`,
      dueDate: `${fiscalYear}-04-10`,
      currency: 'EGP',
      amount: 175000,
      taxAmount: 24500,
      status: 'VALIDATED',
      matchStatus: '3_WAY_MATCHED',
      poNumber: 'PO-2026-081',
      glDate: `${fiscalYear}-03-10`,
      distributionCode: '01-100-51101-000-00',
    },
    {
      id: 'AP-02',
      invoiceNumber: 'INV-SUP-9822',
      supplierName: 'الشركة الهندسية للتكنولوجيا والبرمجيات',
      invoiceDate: `${fiscalYear}-03-18`,
      dueDate: `${fiscalYear}-04-18`,
      currency: 'USD',
      amount: 4500,
      taxAmount: 0,
      status: 'VALIDATED',
      matchStatus: '3_WAY_MATCHED',
      poNumber: 'PO-2026-094',
      glDate: `${fiscalYear}-03-18`,
      distributionCode: '01-300-52301-000-00',
    },
  ];

  const arTransactions: OracleARTransaction[] = [
    {
      id: 'AR-01',
      trxNumber: 'TRX-2026-0045',
      customerName: 'مجموعة الأهرام للمقاولات والاستثمار',
      trxDate: `${fiscalYear}-03-12`,
      currency: 'EGP',
      totalAmount: 513000,
      status: 'COMPLETE',
      taxExempt: false,
      glDate: `${fiscalYear}-03-12`,
      receivablesAccountCode: '01-000-11301-000-00',
      revenueAccountCode: '01-200-41101-000-00',
    },
  ];

  // Action: Post Batch
  const handlePostBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          return {
            ...b,
            status: 'POSTED',
            postedBy: state.officeProfile.auditorName,
            postedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          };
        }
        return b;
      })
    );
    if (selectedBatch && selectedBatch.id === batchId) {
      setSelectedBatch((prev) => (prev ? { ...prev, status: 'POSTED' } : null));
    }
  };

  // Action: Toggle Period Status
  const handleTogglePeriodStatus = (periodName: string) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.periodName === periodName) {
          const nextStatus = p.status === 'OPEN' ? 'CLOSED' : 'OPEN';
          return { ...p, status: nextStatus };
        }
        return p;
      })
    );
  };

  // Copy SQL script to clipboard
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const handleCopySql = () => {
    const sql = OracleExportService.generateOracleDatabaseSchemaSQL(state);
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Download FBDI CSV
  const handleDownloadFBDI = () => {
    const csv = OracleExportService.generateFBDI_GLInterfaceCSV(batches, activeLedger);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oracle_GL_INTERFACE_${activeLedger.id}_${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Oracle SQL
  const handleDownloadSql = () => {
    const sql = OracleExportService.generateOracleDatabaseSchemaSQL(state);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oracle_19c_21c_Enterprise_Schema_${fiscalYear}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* 1. TOP ORACLE FUSION ENTERPRISE HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0d1527] via-[#1a233a] to-[#0f172a] text-white p-5 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-amber-600 flex items-center justify-center shadow-lg font-black text-lg tracking-wider">
            ORCL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                منظومة أوراكل المالية (Oracle ERP Fusion Financials)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-500/20 text-red-300 border border-red-500/40">
                Enterprise Cloud v26.1
              </span>
            </div>
            <p className="text-xs text-slate-300">
              الهيكل المحاسبي متعدد الدفاتر (Multi-Ledger) وقطاعات الحسابات المرنة (Flexfield Segments)
            </p>
          </div>
        </div>

        {/* Action Controls & Safety Switch */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Ledger Switcher */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <Globe className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedLedgerId}
              onChange={(e) => setSelectedLedgerId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              {ledgers.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.ledgerNameAr} ({l.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Return to Standard Mode Button (100% Safe) */}
          <button
            type="button"
            onClick={onReturnToStandardMode}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600 transition-colors shadow-sm cursor-pointer"
            title="الرجوع للوضع القياسي المباشر دون أي تغيير على بياناتك"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>العودة للوضع القياسي للمكتب</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'DASHBOARD', label: 'المؤشرات التنفيذية (Executive)', icon: Layers },
          { id: 'FLEXFIELDS', label: 'هيكل قطاعات الحسابات (COA Segments)', icon: Sliders },
          { id: 'GL_BATCHES', label: 'الأستاذ العام ودفعات القيود (Oracle GL)', icon: FileSpreadsheet },
          { id: 'PERIODS', label: 'التقويم والفترات المالية (Periods Close)', icon: Calendar },
          { id: 'SUBLEDGERS', label: 'الوحدات الفرعية (AP / AR Subledgers)', icon: Building },
          { id: 'FBDI_EXPORT', label: 'تصدير أوراكل وسكريبت SQL (FBDI & DDL)', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}

      {/* A. EXECUTIVE DASHBOARD */}
      {activeSubTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">الدفتر النشط (Primary Ledger)</span>
                <Globe className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {activeLedger.currency} ({activeLedger.accountingStandard})
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                متطابق مع معايير EAS و IFRS
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">حالة الفترات المحاسبية</span>
                <Calendar className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {periods.filter((p) => p.status === 'OPEN').length} فترة مفتوحة
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                من إجمالي 13 فترة مالية لعام {fiscalYear}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">دفعات قيود اليومية (GL Batches)</span>
                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {batches.length} دفعة قيود
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                {batches.filter((b) => b.status === 'POSTED').length} مرحلة إلى الأستاذ
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">الربط مع الفواتير والضرائب</span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-black text-emerald-600">
                100% متطابق
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                Oracle E-Business Tax Active
              </div>
            </div>
          </div>

          {/* Ledger Architecture Visualizer */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-600" />
              <span>معمارية الدفاتر المحاسبية المزدوجة (Dual Ledger Architecture)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {ledgers.map((l) => (
                <div
                  key={l.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    l.id === selectedLedgerId
                      ? 'border-red-500/80 bg-red-50/20 dark:bg-red-950/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white">{l.ledgerName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700">
                      {l.ledgerType}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>العملة الأساسية:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{l.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المعيار المحاسبي:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{l.accountingStandard}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>دليل الحسابات (COA Structure):</span>
                      <span className="font-mono">{l.chartOfAccountsName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* B. COA FLEXFIELD SEGMENTS */}
      {activeSubTab === 'FLEXFIELDS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                هيكل قطاعات الحسابات الخماسي (Oracle 5-Segment Key Flexfield)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                النظام المعياري لإنشاء وتوليد مجموعات الأكواد التحليلية (Code Combinations ID - CCID)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {segments.map((seg) => (
                <div
                  key={seg.segmentNumber}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold rounded-lg text-[10px]">
                      Segment {seg.segmentNumber}
                    </span>
                    <span className="font-mono font-bold text-slate-500">{seg.codeLength} أرقام</span>
                  </div>
                  <div className="font-black text-slate-900 dark:text-white text-sm">{seg.segmentNameAr}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{seg.segmentName}</div>
                  <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-blue-600">
                    مثال: {seg.exampleValue}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Combination Builder Preview */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  نموذج توليد كود الحساب المركب (Full Code Combination):
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono">
                  Valid Combination
                </span>
              </div>
              <div className="text-center py-2 text-xl sm:text-2xl font-mono font-black tracking-widest text-amber-400" dir="ltr">
                01 - 100 - 11101 - 000 - 00
              </div>
              <div className="text-center text-[11px] text-slate-400">
                [الشركة: 01 - المركز الرئيسي] - [القسم: 100 - الإدارة العامة] - [الحساب: 11101 - النقدية وما في حكمها] - [الفرعي: 000] - [بيني: 00]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C. ORACLE GL JOURNAL BATCHES */}
      {activeSubTab === 'GL_BATCHES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              دفعات قيود الأستاذ العام (Oracle GL Journal Batches)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              الدفتر: {activeLedger.ledgerNameAr}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Batches List */}
            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all text-xs space-y-2 ${
                    selectedBatch?.id === b.id
                      ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{b.batchName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'POSTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {b.status === 'POSTED' ? 'مرحل للأستاذ' : 'غير مرحل'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-1">{b.batchDescription}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
                    <span>الفترة: {b.periodName}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {b.totalAccountedDebit.toLocaleString('ar-EG')} {activeLedger.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Batch Details */}
            {selectedBatch && (
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">
                      تفاصيل الدفعة: {selectedBatch.batchName}
                    </h4>
                    <p className="text-xs text-slate-500">{selectedBatch.batchDescription}</p>
                  </div>

                  {selectedBatch.status !== 'POSTED' && (
                    <button
                      type="button"
                      onClick={() => handlePostBatch(selectedBatch.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ترحيل الدفعة إلى Oracle GL</span>
                    </button>
                  )}
                </div>

                {/* Lines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">السطر</th>
                        <th className="p-2.5">كود الحساب المركب (CCID)</th>
                        <th className="p-2.5">اسم الحساب</th>
                        <th className="p-2.5 text-left">مدين ({activeLedger.currency})</th>
                        <th className="p-2.5 text-left">دائن ({activeLedger.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedBatch.lines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono text-slate-500">{l.lineNumber}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                            {l.fullCodeCombination}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200">
                            {l.accountNameAr}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-600">
                            {l.accountedDebit ? l.accountedDebit.toLocaleString('ar-EG') : '-'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-red-600">
                            {l.accountedCredit ? l.accountedCredit.toLocaleString('ar-EG') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-slate-700 dark:text-slate-300">الإجمالي المتزن</td>
                        <td className="p-2.5 text-left font-mono font-black text-emerald-600">
                          {selectedBatch.totalAccountedDebit.toLocaleString('ar-EG')}
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-red-600">
                          {selectedBatch.totalAccountedCredit.toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. ACCOUNTING PERIODS & CLOSE */}
      {activeSubTab === 'PERIODS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                التقويم المالي وإقفال الفترات (Oracle GL Periods Close Monitor)
              </h3>
              <p className="text-xs text-slate-500">
                التحكم في فتح وإغلاق الفترات المحاسبية الـ 13 ومنع الترحيل في الفترات المغلقة
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold rounded-xl text-xs">
              السنة المالية: {fiscalYear} م
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {periods.map((p) => (
              <div
                key={p.periodName}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-900 dark:text-white text-sm">{p.periodName}</span>
                  <span className="text-[10px] font-bold text-slate-500">{p.quarter}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-bold">{p.periodNameAr}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {p.startDate} إلى {p.endDate}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'OPEN'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p.status === 'OPEN' ? 'مفتوحة للترحيل' : 'فترة مغلقة'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleTogglePeriodStatus(p.periodName)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    title={p.status === 'OPEN' ? 'إغلاق الفترة' : 'فتح الفترة'}
                  >
                    {p.status === 'OPEN' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E. SUBLEDGERS (AP & AR) */}
      {activeSubTab === 'SUBLEDGERS' && (
        <div className="space-y-6">
          {/* AP Invoices Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>فواتير الموردين والمدفوعات (Oracle Payables - AP)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                  <tr>
                    <th className="p-2.5">رقم الفاتورة</th>
                    <th className="p-2.5">المورد</th>
                    <th className="p-2.5">حالة المطابقة (Matching)</th>
                    <th className="p-2.5">كود التوزيع المحاسبي</th>
                    <th className="p-2.5 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="p-2.5 font-mono font-bold">{inv.invoiceNumber}</td>
                      <td className="p-2.5 font-bold">{inv.supplierName}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold rounded-full text-[10px]">
                          3-Way Matched (PO+GRN+INV)
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-blue-600" dir="ltr">{inv.distributionCode}</td>
                      <td className="p-2.5 text-left font-mono font-bold">{inv.amount.toLocaleString('ar-EG')} {inv.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AR Invoices Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>معاملات العملاء والمبيعات (Oracle Receivables - AR)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                  <tr>
                    <th className="p-2.5">رقم المعاملة</th>
                    <th className="p-2.5">العميل</th>
                    <th className="p-2.5">حساب العملاء المدين</th>
                    <th className="p-2.5">حساب الإيراد الدائن</th>
                    <th className="p-2.5 text-left">الإجمالي شامل الضريبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {arTransactions.map((trx) => (
                    <tr key={trx.id}>
                      <td className="p-2.5 font-mono font-bold">{trx.trxNumber}</td>
                      <td className="p-2.5 font-bold">{trx.customerName}</td>
                      <td className="p-2.5 font-mono text-blue-600" dir="ltr">{trx.receivablesAccountCode}</td>
                      <td className="p-2.5 font-mono text-emerald-600" dir="ltr">{trx.revenueAccountCode}</td>
                      <td className="p-2.5 text-left font-mono font-bold">{trx.totalAmount.toLocaleString('ar-EG')} {trx.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* F. ORACLE FBDI EXPORT & SQL SCHEMA GENERATOR */}
      {activeSubTab === 'FBDI_EXPORT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FBDI CSV Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-2xl w-fit">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تصدير ملف أوراكل الرسمي (Oracle GL FBDI Template)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                توليد ملف <code className="font-mono font-bold">GL_INTERFACE.csv</code> الجاهز للرفع والترحيل المباشر في أوراكل كلاود (Oracle ERP Cloud Fusion).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadFBDI}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف GL_INTERFACE.csv</span>
            </button>
          </div>

          {/* Oracle 19c/21c DDL SQL Script Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl w-fit">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                سكريبت قاعدة بيانات أوراكل (Oracle Database 19c/21c DDL & PL/SQL)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                سكريبت SQL كامل لإنشاء الجداول، المفاتيح، القيود، الإجراءات المخزنة وحزم الترحيل على سيرفر Oracle.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'تم نسخ الكود!' : 'نسخ كود SQL'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSql}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف .sql</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
