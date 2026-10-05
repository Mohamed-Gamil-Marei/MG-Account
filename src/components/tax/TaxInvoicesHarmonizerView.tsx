import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Percent,
  Search,
  Check,
  RefreshCw,
  FolderCheck,
  Layers,
  HelpCircle,
  X,
  FileCheck2,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  HarmonizedTaxInvoice,
  InvoiceDocType,
  InvoiceNatureCategory,
  ClientArchiveRecord,
} from '../../types';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface TaxInvoicesHarmonizerViewProps {
  state: DatabaseState;
  onNavigateToFilingGrid?: () => void;
}

export const TaxInvoicesHarmonizerView: React.FC<TaxInvoicesHarmonizerViewProps> = ({
  state,
  onNavigateToFilingGrid,
}) => {
  // Selected Client
  const defaultClientId = state.activeClientContext?.clientId || state.clients[0]?.id || '';
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId);
  const [periodName, setPeriodName] = useState('مارس 2026');

  // Filter States
  const [activeTab, setActiveTab] = useState<'ALL' | 'SALES' | 'PURCHASE' | 'NOTES'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Toast / Feedback State
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Invoices In-Memory State (initialized with realistic Egyptian invoices for the client)
  const [invoices, setInvoices] = useState<HarmonizedTaxInvoice[]>(() => {
    return generateInitialSampleInvoices(defaultClientId, state.clients);
  });

  const selectedClient = state.clients.find((c) => c.id === selectedClientId) || state.clients[0];

  // Helper to change active client and load/seed their specific invoices
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setInvoices(generateInitialSampleInvoices(clientId, state.clients));
    setSyncSuccessMessage(null);
  };

  // Auto-category label & color mapping
  const categoryMeta: Record<
    InvoiceNatureCategory,
    { label: string; color: string; badge: string }
  > = {
    GOODS_RAW: {
      label: 'شراء بضاعة ومواد خام',
      color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      badge: '📦 بضاعة/خامات',
    },
    OPERATING_SERV: {
      label: 'خدمات لازمة للنشاط',
      color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      badge: '🛠️ خدمات للنشاط',
    },
    CAPITAL_ASSETS: {
      label: 'أصول ومعدات رأسمالية',
      color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      badge: '🏗️ أصول رأسمالية',
    },
    GA_SUPPLIES: {
      label: 'مصروفات ومستلزمات عمومية',
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      badge: '📄 مصروفات عمومية',
    },
    IMPORT_GOODS: {
      label: 'مشتريات استيرادية (ACI)',
      color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      badge: '🚢 استيراد ACI',
    },
    GOODS_SALES: {
      label: 'مبيعات سلع تجارية ومصنعة',
      color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      badge: '🏷️ مبيعات سلع',
    },
    SERVICE_SALES: {
      label: 'تأدية خدمات للغير',
      color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      badge: '💼 إيراد خدمات',
    },
    TABLE_TAX: {
      label: 'ضريبة جدول / مقاولات',
      color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      badge: '🏢 ضريبة جدول',
    },
    EXPORT: {
      label: 'صادرات سلع وخدمات (0%)',
      color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      badge: '🌍 تصدير 0%',
    },
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Tab filter
      if (activeTab === 'SALES' && inv.docType !== 'SALES') return false;
      if (activeTab === 'PURCHASE' && inv.docType !== 'PURCHASE') return false;
      if (activeTab === 'NOTES' && inv.docType !== 'CREDIT_NOTE' && inv.docType !== 'DEBIT_NOTE')
        return false;

      // Category filter
      if (selectedCategoryFilter !== 'ALL' && inv.category !== selectedCategoryFilter) return false;

      // Search filter
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;

      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.partnerName.toLowerCase().includes(q) ||
        (inv.partnerTaxId && inv.partnerTaxId.includes(q)) ||
        (inv.itemDescription && inv.itemDescription.toLowerCase().includes(q))
      );
    });
  }, [invoices, activeTab, selectedCategoryFilter, searchTerm]);

  // Totals & KPI Aggregations
  const stats = useMemo(() => {
    let salesCount = 0;
    let salesTaxable = 0;
    let salesVat = 0;

    let purchasesCount = 0;
    let purchasesTaxable = 0;
    let purchasesVat = 0;

    // Breakdown for purchases
    let goodsTaxable = 0;
    let goodsVat = 0;
    let servicesTaxable = 0;
    let servicesVat = 0;
    let capitalTaxable = 0;
    let capitalVat = 0;

    // Notes effect
    let creditNotesCount = 0;
    let creditNotesVat = 0;
    let debitNotesCount = 0;
    let debitNotesVat = 0;

    invoices.forEach((inv) => {
      if (inv.docType === 'SALES') {
        salesCount++;
        salesTaxable += inv.taxableAmount;
        salesVat += inv.vatAmount;
      } else if (inv.docType === 'PURCHASE') {
        purchasesCount++;
        purchasesTaxable += inv.taxableAmount;
        purchasesVat += inv.vatAmount;

        if (inv.category === 'GOODS_RAW' || inv.category === 'IMPORT_GOODS') {
          goodsTaxable += inv.taxableAmount;
          goodsVat += inv.vatAmount;
        } else if (inv.category === 'OPERATING_SERV' || inv.category === 'GA_SUPPLIES') {
          servicesTaxable += inv.taxableAmount;
          servicesVat += inv.vatAmount;
        } else if (inv.category === 'CAPITAL_ASSETS') {
          capitalTaxable += inv.taxableAmount;
          capitalVat += inv.vatAmount;
        }
      } else if (inv.docType === 'CREDIT_NOTE') {
        creditNotesCount++;
        creditNotesVat += inv.vatAmount;
      } else if (inv.docType === 'DEBIT_NOTE') {
        debitNotesCount++;
        debitNotesVat += inv.vatAmount;
      }
    });

    // Net VAT of current month = (Output VAT - Input VAT) - Credit Notes VAT + Debit Notes VAT
    const netCurrentMonthVat = salesVat - purchasesVat - creditNotesVat + debitNotesVat;

    // Look up previous credit balance for this client from previous declarations or default
    const clientPreviousDecl = state.taxDeclarations.find(
      (d) => d.clientId === selectedClientId && d.declarationType === 'VAT_10'
    );
    const previousCreditBalance = clientPreviousDecl?.creditCarriedForward || 12500; // default initial credit for demo

    // Final settlement calculation
    let finalPayable = 0;
    let creditCarriedForward = 0;

    if (netCurrentMonthVat > 0) {
      if (netCurrentMonthVat >= previousCreditBalance) {
        finalPayable = netCurrentMonthVat - previousCreditBalance;
        creditCarriedForward = 0;
      } else {
        finalPayable = 0;
        creditCarriedForward = previousCreditBalance - netCurrentMonthVat;
      }
    } else {
      finalPayable = 0;
      creditCarriedForward = previousCreditBalance + Math.abs(netCurrentMonthVat);
    }

    return {
      salesCount,
      salesTaxable,
      salesVat,
      purchasesCount,
      purchasesTaxable,
      purchasesVat,
      goodsTaxable,
      goodsVat,
      servicesTaxable,
      servicesVat,
      capitalTaxable,
      capitalVat,
      creditNotesCount,
      creditNotesVat,
      debitNotesCount,
      debitNotesVat,
      netCurrentMonthVat,
      previousCreditBalance,
      finalPayable,
      creditCarriedForward,
    };
  }, [invoices, selectedClientId, state.taxDeclarations]);

  // Update category of single invoice
  const handleUpdateCategory = (invoiceId: string, newCategory: InvoiceNatureCategory) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, category: newCategory } : inv))
    );
  };

  // Delete single invoice
  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
  };

  // Sync to Declarations & Return Cells Grid
  const handleSyncToDeclarations = () => {
    if (!selectedClient) return;

    // Check if declaration already exists for this client and period
    const existingIndex = state.taxDeclarations.findIndex(
      (d) => d.clientId === selectedClient.id && d.period?.includes(periodName)
    );

    const declarationPayload = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      declarationType: 'VAT_10' as const,
      period: `شهر ${periodName}`,
      taxYear: 2026,
      dueDate: '2026-04-30',
      salesTaxableAmount: stats.salesTaxable,
      vatOutputTax: stats.salesVat,
      purchasesTaxableAmount: stats.purchasesTaxable,
      vatInputTax: stats.purchasesVat,
      netVatPayable: stats.finalPayable,
      previousCreditBalance: stats.previousCreditBalance,
      netCurrentPeriodTax: stats.netCurrentMonthVat,
      creditCarriedForward: stats.creditCarriedForward,
      declarationNature: (stats.salesVat === 0 && stats.purchasesVat === 0
        ? 'ZERO_RETURN'
        : 'STANDARD_14') as any,
      status: 'READY_TO_SUBMIT' as const,
      notes: `تم استخراج وتجميع الوعاء والضريبة آلياً من مجمع الفواتير (${invoices.length} مستند مصنف). رصيد سابق مرحل: ${formatEgyptianCurrency(
        stats.previousCreditBalance
      )}`,
    };

    if (existingIndex !== -1) {
      db.updateTaxDeclaration(state.taxDeclarations[existingIndex].id, declarationPayload);
    } else {
      db.addTaxDeclaration(declarationPayload);
    }

    setSyncSuccessMessage(
      `تم ترحيل وحفظ الأرقام بنجاح لملف شركة [${selectedClient.name}]! تم تحديث صافي السداد (${formatEgyptianCurrency(
        stats.finalPayable
      )}) والرصيد المرحل (${formatEgyptianCurrency(stats.creditCarriedForward)}) في شاشة الإقرارات.`
    );
  };

  // Export Cleaned CSV
  const handleExportCsv = () => {
    const headers = [
      'رقم الفاتورة',
      'تاريخ الفاتورة',
      'نوع المستند',
      'التصنيف النوعي للنشاط',
      'اسم الطرف الآخر (المورد/العميل)',
      'الرقم الضريبي',
      'البيان والصنف',
      'القيمة قبل الضريبة',
      'نسبة الضريبة',
      'ضريبة القيمة المضافة 14%',
      'الإجمالي',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.docType === 'SALES' ? 'مبيعات' : inv.docType === 'PURCHASE' ? 'مشتريات' : 'إشعار'}"`,
      `"${categoryMeta[inv.category]?.label || inv.category}"`,
      `"${inv.partnerName}"`,
      `"${inv.partnerTaxId || ''}"`,
      `"${inv.itemDescription || ''}"`,
      `"${inv.taxableAmount}"`,
      `"${inv.taxRate}%"`,
      `"${inv.vatAmount}"`,
      `"${inv.totalAmount}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.join('\n')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `سجل_فواتير_ضريبة_القيمة_المضافة_${selectedClient?.name || 'الشركة'}_${periodName}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Compact ERP Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                تنسيق وتصنيف فواتير المبيعات والمشتريات
              </h2>
            </div>
          </div>

          {/* Client & Period Selector Bar */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Company Selection */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Input */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-2.5">
              <span className="text-xs text-slate-500 font-medium">الفترة:</span>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Re-seed Sample Invoices Button */}
            <button
              onClick={() => setInvoices(generateInitialSampleInvoices(selectedClientId, state.clients))}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="إعادة تحميل فواتير تجريبية للشركة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Alert */}
        {syncSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{syncSuccessMessage}</span>
            </div>
            {onNavigateToFilingGrid && (
              <button
                onClick={onNavigateToFilingGrid}
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>الانتقال لجدول التقديم السريع</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            )}
          </div>
        )}

        {/* Financial KPI Summary Cards (The Company Totals & Balances) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {/* Card 1: Sales / Output Tax */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                فواتير المبيعات (المخرجات)
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {stats.salesCount} فاتورة
              </span>
            </div>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatEgyptianCurrency(stats.salesTaxable)}
            </div>
            <div className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">
              ضريبة المبيعات 14%: {formatEgyptianCurrency(stats.salesVat)}
            </div>
          </div>

          {/* Card 2: Purchases / Input Tax with Nature Breakdown */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                فواتير المشتريات (المدخلات)
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {stats.purchasesCount} فاتورة
              </span>
            </div>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatEgyptianCurrency(stats.purchasesTaxable)}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
              ضريبة المدخلات 14%: {formatEgyptianCurrency(stats.purchasesVat)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 flex flex-wrap gap-1.5">
              <span>بضاعة: {formatEgyptianCurrency(stats.goodsVat)}</span>
              <span>•</span>
              <span>خدمات: {formatEgyptianCurrency(stats.servicesVat)}</span>
              <span>•</span>
              <span>أصول: {formatEgyptianCurrency(stats.capitalVat)}</span>
            </div>
          </div>

          {/* Card 3: Notes & Net Month Movement */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold">
              <span>صافي حركة الشهر</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {stats.creditNotesCount + stats.debitNotesCount} إشعارات
              </span>
            </div>
            <div
              className={`text-base font-black font-mono ${
                stats.netCurrentMonthVat > 0
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {formatEgyptianCurrency(stats.netCurrentMonthVat)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              الرصيد الدائن السابق: {formatEgyptianCurrency(stats.previousCreditBalance)}
            </div>
          </div>

          {/* Card 4: Final Settlement & 1-Click Sync */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                {stats.finalPayable > 0 ? 'صافي الضريبة واجبة السداد' : 'رصيد دائن مرحل'}
              </span>
              <div className="text-base font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {formatEgyptianCurrency(
                  stats.finalPayable > 0 ? stats.finalPayable : stats.creditCarriedForward
                )}
              </div>
            </div>

            <button
              onClick={handleSyncToDeclarations}
              className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ترحيل الأرقام لإقرار الشركة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Tabs, Categories, Search, and Exports */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Doc Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'كافة المستندات', count: invoices.length },
              { id: 'SALES', label: 'فواتير المبيعات', count: stats.salesCount },
              { id: 'PURCHASE', label: 'فواتير المشتريات', count: stats.purchasesCount },
              { id: 'NOTES', label: 'إشعارات الخصم والإضافة', count: stats.creditNotesCount + stats.debitNotesCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action buttons (Export / Print / Upload) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              تصدير إكسيل مصلحة الضرائب
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              طباعة الكشف
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">تصنيف نوع النشاط:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">كافة التصنيفات النوعية</option>
              <option value="GOODS_RAW">📦 شراء بضاعة ومواد خام</option>
              <option value="OPERATING_SERV">🛠️ خدمات لازمة للنشاط</option>
              <option value="CAPITAL_ASSETS">🏗️ أصول ومعدات رأسمالية</option>
              <option value="GA_SUPPLIES">📄 مصروفات عمومية ومستلزمات</option>
              <option value="GOODS_SALES">🏷️ مبيعات سلع تجارية</option>
              <option value="SERVICE_SALES">💼 تأدية خدمات للغير</option>
            </select>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الفاتورة، الطرف، البيان..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table: Clean, formatted, with inline Category Selectors */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-black">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[130px]">رقم الفاتورة والتاريخ</th>
                <th className="py-2.5 px-3 min-w-[100px]">النوع</th>
                <th className="py-2.5 px-3 min-w-[180px]">التصنيف النوعي (طبيعة البند)</th>
                <th className="py-2.5 px-3 min-w-[180px]">الطرف الآخر (مورد/عميل)</th>
                <th className="py-2.5 px-3 min-w-[140px]">البيان والصنف</th>
                <th className="py-2.5 px-3 min-w-[110px]">الوعاء الخاضع</th>
                <th className="py-2.5 px-3 min-w-[110px]">ضريبة القيمة المضافة (14%)</th>
                <th className="py-2.5 px-3 min-w-[110px]">الإجمالي</th>
                <th className="py-2.5 px-3 w-12 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    لا توجد فواتير تطابق معايير الفلترة المحددة
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      inv.docType === 'CREDIT_NOTE'
                        ? 'bg-rose-50/20 dark:bg-rose-950/10'
                        : idx % 2 === 1
                        ? 'bg-slate-50/40 dark:bg-slate-800/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Invoice No & Date */}
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">{inv.invoiceDate}</div>
                    </td>

                    {/* Doc Type Badge */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.docType === 'SALES'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : inv.docType === 'PURCHASE'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                        }`}
                      >
                        {inv.docType === 'SALES'
                          ? 'فاتورة مبيعات'
                          : inv.docType === 'PURCHASE'
                          ? 'فاتورة مشتريات'
                          : inv.docType === 'CREDIT_NOTE'
                          ? 'إشعار دائن'
                          : 'إشعار مدين'}
                      </span>
                    </td>

                    {/* Nature Category (Inline Dropdown Selector) */}
                    <td className="py-2.5 px-3">
                      <select
                        value={inv.category}
                        onChange={(e) =>
                          handleUpdateCategory(inv.id, e.target.value as InvoiceNatureCategory)
                        }
                        className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          categoryMeta[inv.category]?.color || 'bg-slate-100'
                        }`}
                      >
                        <option value="GOODS_RAW">📦 شراء بضاعة ومواد خام</option>
                        <option value="OPERATING_SERV">🛠️ خدمات لازمة للنشاط</option>
                        <option value="CAPITAL_ASSETS">🏗️ أصول ومعدات رأسمالية</option>
                        <option value="GA_SUPPLIES">📄 مصروفات عمومية ومستلزمات</option>
                        <option value="IMPORT_GOODS">🚢 مشتريات استيرادية ACI</option>
                        <option value="GOODS_SALES">🏷️ مبيعات سلع تجارية</option>
                        <option value="SERVICE_SALES">💼 تأدية خدمات للغير</option>
                        <option value="TABLE_TAX">🏢 ضريبة جدول / مقاولات</option>
                        <option value="EXPORT">🌍 صادرات 0%</option>
                      </select>
                    </td>

                    {/* Partner Name & Tax ID */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {inv.partnerName}
                      </div>
                      {inv.partnerTaxId && (
                        <div className="text-[10px] font-mono text-slate-400">
                          ضريبي: {inv.partnerTaxId}
                        </div>
                      )}
                    </td>

                    {/* Item Description */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[160px]">
                      {inv.itemDescription || '—'}
                    </td>

                    {/* Taxable Amount */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatEgyptianCurrency(inv.taxableAmount)}
                    </td>

                    {/* VAT Amount (14%) */}
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                      {formatEgyptianCurrency(inv.vatAmount)}
                    </td>

                    {/* Total Amount */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatEgyptianCurrency(inv.totalAmount)}
                    </td>

                    {/* Action: Delete Row */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="حذف المستند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            إجمالي المستندات المرفوعة للشركة: {filteredInvoices.length} من أصل {invoices.length} مستند
          </span>
          <div className="flex items-center gap-3">
            <span>مبيعات: {formatEgyptianCurrency(stats.salesVat)}</span>
            <span>•</span>
            <span>مدخلات: {formatEgyptianCurrency(stats.purchasesVat)}</span>
            <span>•</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              الصافي النهائي: {formatEgyptianCurrency(stats.finalPayable || stats.creditCarriedForward)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to seed realistic Egyptian invoices for a given client
function generateInitialSampleInvoices(
  clientId: string,
  clients: ClientArchiveRecord[]
): HarmonizedTaxInvoice[] {
  const client = clients.find((c) => c.id === clientId) || clients[0];
  const clientName = client ? client.name : 'شركة النيل';

  return [
    {
      id: 'inv-1',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'INV-2026-0811',
      invoiceDate: '2026-03-04',
      docType: 'SALES',
      category: 'GOODS_SALES',
      partnerName: 'شركة السويدي للحلول الكهربائية',
      partnerTaxId: '201-994-312',
      itemDescription: 'توريد لوحات توزيع كهربائية معتمدة',
      taxableAmount: 180000,
      taxRate: 14,
      vatAmount: 25200,
      whtAmount: 1800,
      totalAmount: 205200,
    },
    {
      id: 'inv-2',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'INV-2026-0812',
      invoiceDate: '2026-03-11',
      docType: 'SALES',
      category: 'GOODS_SALES',
      partnerName: 'المقاولون العرب (عثمان أحمد عثمان)',
      partnerTaxId: '100-332-901',
      itemDescription: 'توريد كابلات وقواطع ضغط منخفض',
      taxableAmount: 220000,
      taxRate: 14,
      vatAmount: 30800,
      whtAmount: 2200,
      totalAmount: 250800,
    },
    {
      id: 'inv-3',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'PUR-2026-0310',
      invoiceDate: '2026-03-08',
      docType: 'PURCHASE',
      category: 'GOODS_RAW',
      partnerName: 'شركة مصر للألومنيوم ولفائف النحاس',
      partnerTaxId: '341-880-112',
      itemDescription: 'شراء قضبان نحاس خام وموصلات',
      taxableAmount: 140000,
      taxRate: 14,
      vatAmount: 19600,
      whtAmount: 1400,
      totalAmount: 159600,
    },
    {
      id: 'inv-4',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'PUR-2026-0315',
      invoiceDate: '2026-03-14',
      docType: 'PURCHASE',
      category: 'OPERATING_SERV',
      partnerName: 'شركة لوجستيك إكسبريس لنقل البضائع',
      partnerTaxId: '402-119-765',
      itemDescription: 'خدمات نولون وشحن بضائع وخامات للمصنع',
      taxableAmount: 25000,
      taxRate: 14,
      vatAmount: 3500,
      whtAmount: 250,
      totalAmount: 28500,
    },
    {
      id: 'inv-5',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'PUR-2026-0320',
      invoiceDate: '2026-03-18',
      docType: 'PURCHASE',
      category: 'OPERATING_SERV',
      partnerName: 'المركز الفني لصيانة المولدات الهيدروليكية',
      partnerTaxId: '511-309-881',
      itemDescription: 'عمرة وصيانة دورية لخطوط التصنيع والكبس',
      taxableAmount: 32000,
      taxRate: 14,
      vatAmount: 4480,
      whtAmount: 320,
      totalAmount: 36480,
    },
    {
      id: 'inv-6',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'PUR-2026-0325',
      invoiceDate: '2026-03-22',
      docType: 'PURCHASE',
      category: 'CAPITAL_ASSETS',
      partnerName: 'تكنو ماشين لتوريد الماكينات الصناعية',
      partnerTaxId: '620-441-209',
      itemDescription: 'شراء ماكينة تقطيع ليزر CNC مخصصة للمصنع',
      taxableAmount: 90000,
      taxRate: 14,
      vatAmount: 12600,
      whtAmount: 900,
      totalAmount: 102600,
    },
    {
      id: 'inv-7',
      clientId,
      clientName,
      period: 'مارس 2026',
      invoiceNumber: 'CN-2026-004',
      invoiceDate: '2026-03-27',
      docType: 'CREDIT_NOTE',
      category: 'GOODS_SALES',
      partnerName: 'شركة السويدي للحلول الكهربائية',
      partnerTaxId: '201-994-312',
      itemDescription: 'إشعار دائن عن مرتجع لوحة توزيع غير مطابقة للمواصفة',
      taxableAmount: 20000,
      taxRate: 14,
      vatAmount: 2800,
      whtAmount: 200,
      totalAmount: 22800,
    },
  ];
}
