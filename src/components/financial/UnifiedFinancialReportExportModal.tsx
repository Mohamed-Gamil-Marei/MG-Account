import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  Award,
  QrCode,
  FileCheck,
  TrendingUp,
  Sliders,
  Edit3,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import {
  computeAccountBalances,
  generateIncomeStatement,
  generateBalanceSheet,
} from '../../utils/accountingCalculations';
import { formatEgyptianCurrency, generateQrCodeSvg, buildFinancialStatementsQrText } from '../../utils/qrCodeGenerator';
import { PrintService } from '../../services/PrintService';
import { OfficeProfile } from '../../types';
import { MgBrandBadge } from '../common/MgBrandBadge';
import { PrintExportControlModal } from '../common/PrintExportControlModal';

interface UnifiedFinancialReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  fiscalYear?: number;
}

export const UnifiedFinancialReportExportModal: React.FC<UnifiedFinancialReportExportModalProps> = ({
  isOpen,
  onClose,
  state,
  fiscalYear = 2026,
}) => {
  const [includeTrialBalance, setIncludeTrialBalance] = useState(true);
  const [includeBalanceSheet, setIncludeBalanceSheet] = useState(true);
  const [includeIncomeStatement, setIncludeIncomeStatement] = useState(true);
  const [includeAuditorSeal, setIncludeAuditorSeal] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);

  const printSettings = PrintService.getSettings();

  const currentFiscalYear = state.activeClientContext?.selectedFiscalYear || fiscalYear || 2026;
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId);
  const profile = state.officeProfile;

  // Real-time instant header customization states
  const [isHeaderEditBarOpen, setIsHeaderEditBarOpen] = useState(false);
  const [customFirmName, setCustomFirmName] = useState(profile?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات');
  const [customAuditorName, setCustomAuditorName] = useState(profile?.auditorName || 'محمد جميل مرعي');
  const [customTitle, setCustomTitle] = useState(profile?.title || 'محاسب قانوني ومراقب حسابات الشركات - عضو جمعية المحاسبين والمراجعين');
  const [customLicenseNo, setCustomLicenseNo] = useState(profile?.licenseNumber || 'س.م.م 43122');
  const [customTaxAuthorityRegNo, setCustomTaxAuthorityRegNo] = useState(profile?.taxAuthorityRegNo || '233-519-890');
  const [customReportTitle, setCustomReportTitle] = useState('التقرير المالي السنوي الموحد (ميزان المراجعة والحسابات الختامية)');
  const [customPeriodText, setCustomPeriodText] = useState(`عن السنة المالية المنتهية في 31 ديسمبر ${currentFiscalYear} • إعداد وفقاً لمعايير المحاسبة المصرية (EAS)`);
  const [customMainAddress, setCustomMainAddress] = useState(profile?.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية');
  const [customBranchAddress, setCustomBranchAddress] = useState(profile?.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية');
  const [customPhone, setCustomPhone] = useState(profile?.phone || '01003335360');
  const [showLogoLive, setShowLogoLive] = useState(profile?.showLogo !== false);
  const [showMainAddressLive, setShowMainAddressLive] = useState(profile?.showMainOfficeAddress !== false);
  const [showBranchAddressLive, setShowBranchAddressLive] = useState(profile?.showBranchOfficeAddress !== false);
  const [showPhonesLive, setShowPhonesLive] = useState(profile?.showOfficePhones !== false);
  const [headerSaveSuccess, setHeaderSaveSuccess] = useState(false);

  const handleSaveHeaderAsDefault = () => {
    db.updateOfficeProfile({
      firmName: customFirmName,
      auditorName: customAuditorName,
      title: customTitle,
      licenseNumber: customLicenseNo,
      taxAuthorityRegNo: customTaxAuthorityRegNo,
      mainOfficeAddress: customMainAddress,
      branchOfficeAddress: customBranchAddress,
      phone: customPhone,
      showLogo: showLogoLive,
      showMainOfficeAddress: showMainAddressLive,
      showBranchOfficeAddress: showBranchAddressLive,
      showOfficePhones: showPhonesLive,
    });
    setHeaderSaveSuccess(true);
    setTimeout(() => setHeaderSaveSuccess(false), 2500);
  };

  const handleResetHeaderToDefaults = () => {
    const orig: Partial<OfficeProfile> = db.getState().officeProfile || {};
    setCustomFirmName(orig.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات');
    setCustomAuditorName(orig.auditorName || 'محمد جميل مرعي');
    setCustomTitle(orig.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات');
    setCustomLicenseNo(orig.licenseNumber || 'س.م.م 43122');
    setCustomTaxAuthorityRegNo(orig.taxAuthorityRegNo || '233-519-890');
    setCustomReportTitle('التقرير المالي السنوي الموحد (ميزان المراجعة والحسابات الختامية)');
    setCustomPeriodText(`عن السنة المالية المنتهية في 31 ديسمبر ${currentFiscalYear} • إعداد وفقاً لمعايير المحاسبة المصرية (EAS)`);
    setCustomMainAddress(orig.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية');
    setCustomBranchAddress(orig.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية');
    setCustomPhone(orig.phone || '01003335360');
    setShowLogoLive(orig.showLogo !== false);
    setShowMainAddressLive(orig.showMainOfficeAddress !== false);
    setShowBranchAddressLive(orig.showBranchOfficeAddress !== false);
    setShowPhonesLive(orig.showOfficePhones !== false);
  };

  const displayCompanyName = activeClient?.name || 'شركة تجارية صناعية مساهمة مصرية';
  const displayTaxNo = activeClient?.taxCardNo || '412-887-321';
  const displayComReg = activeClient?.commercialRegistrationNo || '76543';

  // Calculate filtered entries & balances
  const filteredEntries = useMemo(() => {
    return state.journalEntries.filter((e) => {
      if (activeClientId && e.clientId && e.clientId !== activeClientId) {
        return false;
      }
      if (e.date && !e.date.startsWith(String(currentFiscalYear))) {
        return false;
      }
      return true;
    });
  }, [state.journalEntries, activeClientId, currentFiscalYear]);

  const calculatedAccounts = useMemo(() => {
    return computeAccountBalances(state.accounts, filteredEntries);
  }, [state.accounts, filteredEntries]);

  // Leaf accounts for trial balance
  const leafAccounts = useMemo(() => {
    return calculatedAccounts.filter((a) => a.level >= 2);
  }, [calculatedAccounts]);

  // Trial Balance Totals
  const trialTotals = useMemo(() => {
    let openingDebit = 0;
    let openingCredit = 0;
    let movDebit = 0;
    let movCredit = 0;
    let endDebit = 0;
    let endCredit = 0;

    leafAccounts.forEach((a) => {
      openingDebit += a.openingBalanceDebit || 0;
      openingCredit += a.openingBalanceCredit || 0;
      movDebit += a.movementDebit || 0;
      movCredit += a.movementCredit || 0;
      endDebit += a.endingBalanceDebit || 0;
      endCredit += a.endingBalanceCredit || 0;
    });

    const isBalanced = Math.abs(endDebit - endCredit) < 0.01;

    return {
      openingDebit,
      openingCredit,
      movDebit,
      movCredit,
      endDebit,
      endCredit,
      isBalanced,
      diff: Math.abs(endDebit - endCredit),
    };
  }, [leafAccounts]);

  // Income Statement
  const incomeStatement = useMemo(() => {
    return generateIncomeStatement(calculatedAccounts);
  }, [calculatedAccounts]);

  // Balance Sheet
  const balanceSheet = useMemo(() => {
    return generateBalanceSheet(calculatedAccounts, incomeStatement);
  }, [calculatedAccounts, incomeStatement]);

  // Immutable record ID for this unified report
  const unifiedReportRecordId = useMemo(
    () => `UNIFIED-FS-${activeClientId || 'CLIENT'}-${currentFiscalYear}`,
    [activeClientId, currentFiscalYear]
  );

  // QR Code Payload
  const qrPayload = useMemo(() => {
    return buildFinancialStatementsQrText({
      statementId: unifiedReportRecordId,
      clientId: activeClientId,
      companyName: displayCompanyName,
      fiscalYear: currentFiscalYear,
      totalAssets: balanceSheet.totalAssets,
      netProfit: incomeStatement.netProfitAfterTax,
      commercialRegNo: activeClient?.commercialRegistrationNo,
      taxCardNo: activeClient?.taxCardNo,
      auditorName: profile.auditorName,
      licenseNumber: profile.licenseNumber,
    });
  }, [unifiedReportRecordId, displayCompanyName, currentFiscalYear, balanceSheet, incomeStatement, profile, activeClient, activeClientId]);

  const handleExecutePrint = () => {
    if (!balanceSheet.isBalanced) {
      return;
    }
    setIsPrinting(true);
    setTimeout(() => {
      PrintService.printRecordById(unifiedReportRecordId, 'unified-report-print-canvas', {
        title: `التقرير المالي الموحد - ${displayCompanyName} - ${currentFiscalYear}`,
        orientation: 'portrait',
        margins: 'DEFAULT',
        onAfterPrint: () => {
          setIsPrinting(false);
        },
      });
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">تصدير التقارير المالية الموحدة (PDF)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  مستند مجمع معتمد A4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ميزان المراجعة بالأرصدة + القوائم الختامية الأربعة في ملف واحد بختم واعتماد المكتب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHeaderEditBarOpen(!isHeaderEditBarOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isHeaderEditBarOpen
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
              title="تعديل فوري وسريع لبيانات الترويسة وعنوان التقرير قبل أمر الطباعة"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل الترويسة فوري {isHeaderEditBarOpen ? '▲' : '▼'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintSettingsOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="تخصيص أساليب الطباعة، إظهار/إخفاء الـ QR، شكل الختم والهوامش"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>إعدادات الطباعة والـ QR</span>
            </button>

            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={isPrinting || !balanceSheet.isBalanced}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                !balanceSheet.isBalanced
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 disabled:opacity-50'
              }`}
              title={!balanceSheet.isBalanced ? `الطباعة محظورة لوجود فارق غير متزن (${formatEgyptianCurrency(balanceSheet.variance)})` : 'طباعة وتصدير PDF الآن'}
            >
              <Printer className="w-4 h-4" />
              <span>
                {!balanceSheet.isBalanced
                  ? `غير متزن (${formatEgyptianCurrency(balanceSheet.variance)})`
                  : isPrinting
                  ? 'جاري تجهيز الطباعة...'
                  : 'طباعة وتصدير PDF الآن'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Options / Inclusion Switchers Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-500 dark:text-slate-400">أقسام المستند المجمع:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeTrialBalance}
                onChange={(e) => setIncludeTrialBalance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>1. ميزان المراجعة والأرصدة</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeBalanceSheet}
                onChange={(e) => setIncludeBalanceSheet(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>2. قائمة المركز المالي (الميزانية)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeIncomeStatement}
                onChange={(e) => setIncludeIncomeStatement(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>3. قائمة الدخل (الأرباح والخسائر)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeAuditorSeal}
                onChange={(e) => setIncludeAuditorSeal(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>ختم واعتماد المكتب + QR</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            السنة المالية: <strong>{currentFiscalYear}</strong> | المنشأة: <strong>{displayCompanyName}</strong>
          </div>
        </div>

        {/* Instant Header Edit Bar (Collapsible Quick Customizer) */}
        {isHeaderEditBarOpen && (
          <div className="bg-amber-50/95 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 p-4 space-y-3 shrink-0 text-xs animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                  تعديل ترويسة التقرير فورياً لهذه الطباعة (تنطبق التعديلات لحظياً على الورقة أدناه):
                </span>
              </div>
              <div className="flex items-center gap-2">
                {headerSaveSuccess && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> تم الحفظ كافتراضي للمكتب ✓
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveHeaderAsDefault}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="حفظ هذه الترويسة كافتراضية لجميع المطبوعات القادمة"
                >
                  <Save className="w-3 h-3" />
                  <span>حفظ كافتراضي للمكتب</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetHeaderToDefaults}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-100/50"
                  title="استعادة الترويسة الأصلية من إعدادات المكتب"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة الأصل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHeaderEditBarOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                  title="إغلاق الشريط"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Edit Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">اسم المكتب / المنشأة:</label>
                <input
                  type="text"
                  value={customFirmName}
                  onChange={(e) => setCustomFirmName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">المحاسب المسؤول / الشريك:</label>
                <input
                  type="text"
                  value={customAuditorName}
                  onChange={(e) => setCustomAuditorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">الصفة واللقب المهني:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">رقم القيد بسجل المحاسبين (س.م.م):</label>
                <input
                  type="text"
                  value={customLicenseNo}
                  onChange={(e) => setCustomLicenseNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">عنوان التقرير المطبوع:</label>
                <input
                  type="text"
                  value={customReportTitle}
                  onChange={(e) => setCustomReportTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">نص الفترة والمعيار المحاسبي:</label>
                <input
                  type="text"
                  value={customPeriodText}
                  onChange={(e) => setCustomPeriodText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Quick Checkbox Elements */}
            <div className="flex items-center gap-4 flex-wrap pt-1 text-[11px]">
              <span className="font-bold text-slate-600 dark:text-slate-400">إظهار بالترويسة والتذييل:</span>
              <label className="flex items-center gap-1 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showLogoLive}
                  onChange={(e) => setShowLogoLive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>شعار المكتب</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showMainAddressLive}
                  onChange={(e) => setShowMainAddressLive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>المقر الرئيسي (الحسينية)</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showBranchAddressLive}
                  onChange={(e) => setShowBranchAddressLive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>فرع العاشر من رمضان</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showPhonesLive}
                  onChange={(e) => setShowPhonesLive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>رقم الهاتف</span>
              </label>
            </div>
          </div>
        )}

        {/* Scrollable Printable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950 flex flex-col items-center">
          {/* Critical Unbalanced Alert in Export Modal */}
          {!balanceSheet.isBalanced && (
            <div className="max-w-[210mm] w-full mb-3 p-3.5 bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 rounded-xl shadow-sm flex items-start gap-3 text-rose-950 dark:text-rose-100">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 space-y-0.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-rose-700 dark:text-rose-300">
                    تنبيه: قائمة المركز المالي غير متزنة! تم حظر الطباعة والتصدير الرسمي.
                  </span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold rounded text-[11px]">
                    الفارق الحقيقي: {formatEgyptianCurrency(balanceSheet.variance)}
                  </span>
                </div>
                <p className="text-rose-800 dark:text-rose-200 text-[11px] font-semibold">
                  إجمالي الأصول ({formatEgyptianCurrency(balanceSheet.totalAssets)}) لا يطابق إجمالي حقوق الملكية والالتزامات ({formatEgyptianCurrency(balanceSheet.totalEquityAndLiabilities)}).
                </p>
              </div>
            </div>
          )}

          {/* Quick Notice above canvas */}
          <div className="flex items-center justify-between text-[11px] mb-2 max-w-[210mm] w-full px-1 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل فوري: يمكنك النقر مباشرة على أي نص بالترويسة أدناه لتعديله فورياً لهذه الطباعة</span>
            </div>
            <button
              type="button"
              onClick={() => setIsHeaderEditBarOpen(!isHeaderEditBarOpen)}
              className="text-blue-700 dark:text-blue-400 hover:underline font-bold"
            >
              {isHeaderEditBarOpen ? 'إخفاء شريط أدوات الترويسة ▲' : 'فتح شريط الترويسة السريع ▼'}
            </button>
          </div>

          <div
            id="unified-report-print-canvas"
            data-record-id={unifiedReportRecordId}
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-10 shadow-xl border border-slate-300 rounded-sm font-sans"
            style={{ minHeight: '297mm', direction: 'rtl' }}
          >
            {/* Header: Office Letterhead (Interactive & Live-Editable) */}
            {printSettings.includeLetterhead !== false && (
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 text-right flex-1">
                    <input
                      type="text"
                      value={customFirmName}
                      onChange={(e) => setCustomFirmName(e.target.value)}
                      className="w-full text-xl font-black text-slate-950 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 -mx-1 transition-all outline-none border-none tracking-tight"
                      title="انقر لتعديل اسم المكتب مباشرة"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-800 shrink-0">أ/</span>
                      <input
                        type="text"
                        value={customAuditorName}
                        onChange={(e) => setCustomAuditorName(e.target.value)}
                        className="w-full text-sm font-bold text-slate-800 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 -mx-1 transition-all outline-none border-none"
                        title="انقر لتعديل اسم المحاسب مباشرة"
                      />
                    </div>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full text-xs text-slate-600 font-medium bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 -mx-1 transition-all outline-none border-none"
                      title="انقر لتعديل الصفة المهنية مباشرة"
                    />
                    {printSettings.includeOfficeTaxInfo !== false && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap">
                        <div className="flex items-center gap-1">
                          <span>رقم القيد:</span>
                          <input
                            type="text"
                            value={customLicenseNo}
                            onChange={(e) => setCustomLicenseNo(e.target.value)}
                            className="text-[11px] font-mono font-bold text-slate-700 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 outline-none border-none"
                            title="انقر لتعديل رقم القيد"
                          />
                        </div>
                        <span>|</span>
                        <div className="flex items-center gap-1">
                          <span>بطاقة ضريبية:</span>
                          <input
                            type="text"
                            value={customTaxAuthorityRegNo}
                            onChange={(e) => setCustomTaxAuthorityRegNo(e.target.value)}
                            className="text-[11px] font-mono text-slate-700 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 outline-none border-none"
                            title="انقر لتعديل البطاقة الضريبية"
                          />
                        </div>
                      </div>
                    )}
                    {(showMainAddressLive || showBranchAddressLive || showPhonesLive) && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-3 pt-0.5 flex-wrap">
                        {showMainAddressLive && (
                          <input
                            type="text"
                            value={customMainAddress}
                            onChange={(e) => setCustomMainAddress(e.target.value)}
                            className="text-[10px] text-slate-500 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 outline-none border-none"
                            title="انقر لتعديل عنوان المقر الرئيسي"
                          />
                        )}
                        {showBranchAddressLive && (
                          <input
                            type="text"
                            value={customBranchAddress}
                            onChange={(e) => setCustomBranchAddress(e.target.value)}
                            className="text-[10px] text-slate-500 bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 outline-none border-none"
                            title="انقر لتعديل عنوان الفرع"
                          />
                        )}
                        {showPhonesLive && (
                          <input
                            type="text"
                            value={customPhone}
                            onChange={(e) => setCustomPhone(e.target.value)}
                            className="text-[10px] font-mono text-blue-900 font-bold bg-transparent hover:bg-amber-100/50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-500 rounded px-1 outline-none border-none"
                            title="انقر لتعديل رقم الهاتف"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {showLogoLive && (
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0">
                      {profile?.logoType === 'CUSTOM_UPLOAD' && profile.logoUrl ? (
                        <img
                          src={profile.logoUrl}
                          alt="شعار المكتب"
                          className="h-12 max-w-[130px] object-contain"
                        />
                      ) : (
                        <MgBrandBadge size="md" interactive={false} />
                      )}
                      <span className="text-[9px] font-bold text-slate-500 mt-1">وثيقة محاسبية رسمية</span>
                    </div>
                  )}
                </div>

                {/* Title Banner (Live-Editable) */}
                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
                  <div className="inline-block bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200 max-w-full">
                    <input
                      type="text"
                      value={customReportTitle}
                      onChange={(e) => setCustomReportTitle(e.target.value)}
                      className="text-base font-black text-slate-900 bg-transparent hover:bg-amber-100/50 focus:bg-white focus:ring-1 focus:ring-amber-500 text-center rounded px-2 py-0.5 outline-none border-none w-full max-w-2xl"
                      title="انقر لتعديل عنوان التقرير فوراً"
                    />
                  </div>
                  <div className="text-xs text-slate-600 mt-1.5 font-medium">
                    <input
                      type="text"
                      value={customPeriodText}
                      onChange={(e) => setCustomPeriodText(e.target.value)}
                      className="text-xs text-slate-600 bg-transparent hover:bg-amber-100/50 focus:bg-white focus:ring-1 focus:ring-amber-500 text-center rounded px-2 py-0.5 outline-none border-none w-full max-w-2xl"
                      title="انقر لتعديل نص الفترة والمعايير فوراً"
                    />
                  </div>
                </div>

              {/* Client Info Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">اسم المنشأة / العميل:</span>
                  <strong className="text-slate-900 text-xs">{displayCompanyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الرقم الضريبي / السجل:</span>
                  <span className="font-mono text-slate-800 text-xs">{displayTaxNo} / {displayComReg}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ إصدار التقرير:</span>
                  <span className="font-mono text-slate-800 text-xs">{new Date().toISOString().slice(0, 10)}</span>
                </div>
              </div>
            </div>
            )}

            {/* SECTION 1: Trial Balance */}
            {includeTrialBalance && (
              <div className="mb-8 page-break-inside-avoid">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-700" />
                    <h3 className="font-bold text-sm text-slate-900">
                      أولاً: ميزان المراجعة بالأرصدة ومجاميع الحركات
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600">
                    الحالة: {trialTotals.isBalanced ? 'موزون ومتطابق بنسبة 100% ✓' : `فرق غير متزن: ${formatEgyptianCurrency(trialTotals.diff)}`}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-center">
                        <th className="py-1 px-1.5 w-16 text-right">كود</th>
                        <th className="py-1 px-2 text-right">اسم الحساب</th>
                        <th colSpan={2} className="py-1 px-1.5 border-r border-slate-200 bg-blue-50/50">رصيد أول المدة</th>
                        <th colSpan={2} className="py-1 px-1.5 border-r border-slate-200 bg-amber-50/50">حركة الفترة</th>
                        <th colSpan={2} className="py-1 px-1.5 border-r border-slate-200 bg-emerald-50/50">رصيد آخر المدة</th>
                      </tr>
                      <tr className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-300 text-center font-mono">
                        <th></th>
                        <th></th>
                        <th className="py-0.5 px-1 border-r border-slate-200">مدين</th>
                        <th className="py-0.5 px-1">دائن</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">مدين</th>
                        <th className="py-0.5 px-1">دائن</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">مدين</th>
                        <th className="py-0.5 px-1">دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leafAccounts.slice(0, 18).map((acc) => (
                        <tr key={acc.id} className="border-b border-slate-100 hover:bg-slate-50 font-mono text-[10.5px]">
                          <td className="py-1 px-1.5 text-right font-bold text-slate-600">{acc.code}</td>
                          <td className="py-1 px-2 text-right font-sans font-medium text-slate-800 truncate max-w-[140px]">{acc.name}</td>
                          <td className="py-1 px-1 text-center border-r border-slate-100">{acc.openingBalanceDebit ? formatEgyptianCurrency(acc.openingBalanceDebit, false) : '-'}</td>
                          <td className="py-1 px-1 text-center">{acc.openingBalanceCredit ? formatEgyptianCurrency(acc.openingBalanceCredit, false) : '-'}</td>
                          <td className="py-1 px-1 text-center border-r border-slate-100">{acc.movementDebit ? formatEgyptianCurrency(acc.movementDebit, false) : '-'}</td>
                          <td className="py-1 px-1 text-center">{acc.movementCredit ? formatEgyptianCurrency(acc.movementCredit, false) : '-'}</td>
                          <td className="py-1 px-1 text-center border-r border-slate-100 font-bold text-slate-900">{acc.endingBalanceDebit ? formatEgyptianCurrency(acc.endingBalanceDebit, false) : '-'}</td>
                          <td className="py-1 px-1 text-center font-bold text-slate-900">{acc.endingBalanceCredit ? formatEgyptianCurrency(acc.endingBalanceCredit, false) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold font-mono text-center text-xs">
                        <td colSpan={2} className="py-1.5 px-2 text-right font-sans">الإجمالي العام:</td>
                        <td className="py-1.5 px-1 border-r border-slate-700">{formatEgyptianCurrency(trialTotals.openingDebit, false)}</td>
                        <td className="py-1.5 px-1">{formatEgyptianCurrency(trialTotals.openingCredit, false)}</td>
                        <td className="py-1.5 px-1 border-r border-slate-700">{formatEgyptianCurrency(trialTotals.movDebit, false)}</td>
                        <td className="py-1.5 px-1">{formatEgyptianCurrency(trialTotals.movCredit, false)}</td>
                        <td className="py-1.5 px-1 border-r border-slate-700 text-emerald-400">{formatEgyptianCurrency(trialTotals.endDebit, false)}</td>
                        <td className="py-1.5 px-1 text-emerald-400">{formatEgyptianCurrency(trialTotals.endCredit, false)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 2 & 3: Balance Sheet & Income Statement */}
            <div className="grid grid-cols-2 gap-5 mb-8 page-break-inside-avoid">
              {/* Balance Sheet Summary */}
              {includeBalanceSheet && (
                <div className="border border-slate-300 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
                    <h4 className="font-bold text-slate-900">ثانياً: قائمة المركز المالي (الميزانية)</h4>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-slate-800 pt-1 text-xs">الأصول (Assets):</div>
                    <div className="flex justify-between text-slate-600">
                      <span>الأصول غير المتداولة (الثابتة بالصافي):</span>
                      <span>{formatEgyptianCurrency(balanceSheet.nonCurrentAssets.totalNonCurrentAssets)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>الأصول المتداولة (النقدية والعملاء والمخزون):</span>
                      <span>{formatEgyptianCurrency(balanceSheet.currentAssets.totalCurrentAssets)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200">
                      <span>إجمالي الأصول:</span>
                      <span className="text-blue-700">{formatEgyptianCurrency(balanceSheet.totalAssets)}</span>
                    </div>

                    <div className="font-bold text-slate-800 pt-2 text-xs">حقوق الملكية والالتزامات:</div>
                    <div className="flex justify-between text-slate-600">
                      <span>إجمالي حقوق الملكية (رأس المال والاحتياطيات والأرباح):</span>
                      <span>{formatEgyptianCurrency(balanceSheet.equity.totalEquity)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>الالتزامات غير المتداولة (قروض طويلة):</span>
                      <span>{formatEgyptianCurrency(balanceSheet.nonCurrentLiabilities.totalNonCurrentLiabilities)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>الالتزامات المتداولة (الموردون والمصروفات المستحقة):</span>
                      <span>{formatEgyptianCurrency(balanceSheet.currentLiabilities.totalCurrentLiabilities)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200">
                      <span>إجمالي الالتزامات وحقوق الملكية:</span>
                      <span className="text-blue-700">{formatEgyptianCurrency(balanceSheet.totalEquityAndLiabilities)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Income Statement Summary */}
              {includeIncomeStatement && (
                <div className="border border-slate-300 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-900">ثالثاً: قائمة الدخل (الأرباح والخسائر)</h4>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-700">
                      <span>إجمالي الإيرادات وصافي المبيعات:</span>
                      <span className="font-bold">{formatEgyptianCurrency(incomeStatement.revenuesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>يخصم: تكلفة النشاط والمبيعات:</span>
                      <span className="text-rose-600">({formatEgyptianCurrency(incomeStatement.costOfGoodsSold)})</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200">
                      <span>مجمل الربح (Gross Profit):</span>
                      <span className="text-emerald-700">{formatEgyptianCurrency(incomeStatement.grossProfit)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>يخصم: المصروفات الإدارية والعمومية:</span>
                      <span>({formatEgyptianCurrency(incomeStatement.administrativeExpenses)})</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>يخصم: المصروفات التسويقية والبيعية:</span>
                      <span>({formatEgyptianCurrency(incomeStatement.sellingAndMarketingExpenses)})</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>يخصم: إهلاك الأصول والأعباء التمويلية:</span>
                      <span>({formatEgyptianCurrency(incomeStatement.depreciationExpense + incomeStatement.financeCosts)})</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>الربح قبل الضريبة:</span>
                      <span>{formatEgyptianCurrency(incomeStatement.profitBeforeTax)}</span>
                    </div>
                    <div className="flex justify-between font-black text-white bg-slate-900 p-1.5 rounded mt-1">
                      <span>صافي أرباح / (خسارة) العام بعد الضريبة:</span>
                      <span className="text-emerald-300">{formatEgyptianCurrency(incomeStatement.netProfitAfterTax)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Official Certification, Signatures, Seal & QR */}
            {includeAuditorSeal && (
              <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between gap-6 text-xs page-break-inside-avoid">
                <div className="space-y-1 text-right">
                  <div className="font-bold text-slate-500">اعتماد ومصادقة مراقب الحسابات والمحاسب القانوني:</div>
                  <div className="text-base font-black text-slate-950">{profile.auditorName || 'محمد جميل مرعي'}</div>
                  <div className="text-emerald-800 font-semibold">{profile.title || 'محاسب قانوني ومراقب حسابات الشركات'}</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    رقم القيد بسجل المحاسبين والمراجعين: {profile.licenseNumber || 'س.م.م 43122'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Official Stamp */}
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-900 p-1 text-center bg-emerald-50/20">
                      <span>مكتب المحاسب القانوني</span>
                      <span className="text-emerald-800 font-black">{profile.auditorName || 'محمد جميل مرعي'}</span>
                      <span className="font-mono text-[8px]">{profile.licenseNumber || 'س.م.م 43122'}</span>
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded mt-0.5">معتمد وموثق ✓</span>
                    </div>
                  </div>

                  {/* QR Code */}
                  {printSettings.includeQrVerification !== false && (
                    <div className="text-center">
                      <div
                        className="bg-white p-1 rounded-lg border border-slate-300 shadow-2xs inline-block"
                        dangerouslySetInnerHTML={{
                          __html: generateQrCodeSvg(qrPayload, printSettings.qrSizePx || 95, {
                            mode: printSettings.qrMode || 'OFFLINE_TEXT',
                          }),
                        }}
                      />
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">رمز التحقق الرقمي</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>يتم التصدير بجودة A4 طباعية عالية مع الترويسة والباركود المعتمدين تلقائياً.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={isPrinting}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'جاري الطباعة...' : 'تصدير وطباعة التقرير الموحد (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print, Export & QR Code Master Control Modal */}
      <PrintExportControlModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </div>
  );
};
