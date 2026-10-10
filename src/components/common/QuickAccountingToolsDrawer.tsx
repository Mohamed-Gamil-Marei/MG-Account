import React, { useState } from 'react';
import {
  Calculator,
  Percent,
  TrendingDown,
  Building,
  CheckCircle,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Receipt,
  RotateCcw,
  Sparkles,
  DollarSign,
  AlertCircle,
  Info,
} from 'lucide-react';
import { SlideOverDrawer } from './SlideOverDrawer';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface QuickAccountingToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

export const QuickAccountingToolsDrawer: React.FC<QuickAccountingToolsDrawerProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [activeTool, setActiveTool] = useState<'PAYROLL' | 'DEPRECIATION' | 'VAT_REVERSE' | 'AGING'>(
    'PAYROLL'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // 1. PAYROLL & INCOME TAX CALCULATOR (كسب العمل والتأمينات 2026)
  // =========================================================================
  const [grossSalary, setGrossSalary] = useState<number>(15000);
  const [isInsuranceSubject, setIsInsuranceSubject] = useState<boolean>(true);
  const [customInsurableWage, setCustomInsurableWage] = useState<number | ''>('');

  // الحد الأقصى للأجر التأميني لعام 2026 (14,500 ج.م أو المدخل)
  const maxInsurableWage = 14500;
  const minInsurableWage = 2000;
  const insurableWage = isInsuranceSubject
    ? customInsurableWage !== '' && Number(customInsurableWage) > 0
      ? Number(customInsurableWage)
      : Math.min(Math.max(grossSalary, minInsurableWage), maxInsurableWage)
    : 0;

  // حصص التأمينات وفق قانون 148 لسنة 2019
  const employeeInsurance = Number((insurableWage * 0.11).toFixed(2)); // 11%
  const employerInsurance = Number((insurableWage * 0.1875).toFixed(2)); // 18.75%
  const totalInsurance = Number((employeeInsurance + employerInsurance).toFixed(2));

  // حساب ضريبة كسب العمل الشهرية طبقاً لشرائح قانون ضريبة الدخل وتعديلاته
  // الإعفاء الشخصي السنوي (20,000 ج.م سنوي = 1,666.67 شهرياً)
  const personalExemptionMonthly = 1666.67;
  const taxableSalaryMonthly = Math.max(0, grossSalary - employeeInsurance - personalExemptionMonthly);
  const taxableAnnual = taxableSalaryMonthly * 12;

  // الشرائح السنوية التقريبية المعتمدة
  let annualTax = 0;
  if (taxableAnnual <= 40000) {
    annualTax = 0; // الشريحة الصفرية
  } else if (taxableAnnual <= 55000) {
    annualTax = (taxableAnnual - 40000) * 0.10;
  } else if (taxableAnnual <= 70000) {
    annualTax = 1500 + (taxableAnnual - 55000) * 0.15;
  } else if (taxableAnnual <= 200000) {
    annualTax = 1500 + 2250 + (taxableAnnual - 70000) * 0.20;
  } else if (taxableAnnual <= 400000) {
    annualTax = 1500 + 2250 + 26000 + (taxableAnnual - 200000) * 0.225;
  } else {
    annualTax = 1500 + 2250 + 26000 + 45000 + (taxableAnnual - 400000) * 0.25;
  }

  const monthlyPayrollTax = Number((annualTax / 12).toFixed(2));
  const netSalary = Number((grossSalary - employeeInsurance - monthlyPayrollTax).toFixed(2));
  const totalCostToCompany = Number((grossSalary + employerInsurance).toFixed(2));

  // توليد قيد استحقاق وصرف المرتبات آلياً
  const handleGeneratePayrollEntry = () => {
    const activeClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);
    const dateStr = new Date().toISOString().slice(0, 10);

    const salariesExpAcc = state.accounts.find((a) => a.code === '5100' || a.name.includes('أجور') || a.name.includes('مرتبات')) || {
      id: 'acc-sal-exp',
      code: '5100',
      name: 'مصروفات الأجور والمرتبات',
    };
    const insurExpAcc = state.accounts.find((a) => a.code === '5110' || a.name.includes('تأمينات')) || {
      id: 'acc-insur-exp',
      code: '5110',
      name: 'حصة الشركة في التأمينات الاجتماعية (18.75%)',
    };
    const taxAuthorityAcc = state.accounts.find((a) => a.code === '2235' || a.name.includes('كسب عمل')) || {
      id: 'acc-tax-pay',
      code: '2235',
      name: 'مصلحة الضرائب - ضريبة كسب العمل',
    };
    const socialInsurAcc = state.accounts.find((a) => a.code === '2240' || a.name.includes('التأمينات')) || {
      id: 'acc-insur-pay',
      code: '2240',
      name: 'الهيئة القومية للتأمين الاجتماعي (29.75%)',
    };
    const treasuryOrBankAcc = state.accounts.find((a) => a.code === '1260' || a.code === '1250' || a.name.includes('بنك') || a.name.includes('خزينة')) || {
      id: 'acc-bank',
      code: '1260',
      name: 'البنك الأهلي المصري / الخزينة',
    };

    const lines = [
      {
        id: `l1-${Date.now()}`,
        accountId: salariesExpAcc.id,
        accountCode: salariesExpAcc.code,
        accountName: salariesExpAcc.name,
        debit: grossSalary,
        credit: 0,
        description: `استحقاق إجمالي الرواتب والأجور - شهر ${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`,
      },
      {
        id: `l2-${Date.now()}`,
        accountId: insurExpAcc.id,
        accountCode: insurExpAcc.code,
        accountName: insurExpAcc.name,
        debit: employerInsurance,
        credit: 0,
        description: `مساهمة المنشأة في التأمينات الاجتماعية 18.75%`,
      },
      {
        id: `l3-${Date.now()}`,
        accountId: taxAuthorityAcc.id,
        accountCode: taxAuthorityAcc.code,
        accountName: taxAuthorityAcc.name,
        debit: 0,
        credit: monthlyPayrollTax,
        description: `ضريبة كسب العمل المستقطعة للتوريد بنموذج 4`,
      },
      {
        id: `l4-${Date.now()}`,
        accountId: socialInsurAcc.id,
        accountCode: socialInsurAcc.code,
        accountName: socialInsurAcc.name,
        debit: 0,
        credit: totalInsurance,
        description: `إجمالي مستحقات هيئة التأمينات الاجتماعية (11% + 18.75%)`,
      },
      {
        id: `l5-${Date.now()}`,
        accountId: treasuryOrBankAcc.id,
        accountCode: treasuryOrBankAcc.code,
        accountName: treasuryOrBankAcc.name,
        debit: 0,
        credit: netSalary,
        description: `صافي المرتبات المنصرفة للعاملين`,
      },
    ];

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    db.addJournalEntry({
      date: dateStr,
      description: `قيد استحقاق وصرف مرتبات وأجور شهر ${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`,
      lines,
      totalDebit,
      totalCredit,
      isPosted: true,
      entryType: 'GENERAL',
      clientId: activeClient?.id,
      clientName: activeClient?.name,
    });

    showToast(`✓ تم توليد وترحيل قيد الرواتب بنجاح إلى دفتر اليومية (${formatEgyptianCurrency(grossSalary)})`);
  };

  // =========================================================================
  // 2. TAX DEPRECIATION CALCULATOR (قانون 91 لسنة 2005)
  // =========================================================================
  const [assetCost, setAssetCost] = useState<number>(100000);
  const [assetType, setAssetType] = useState<'BUILDING' | 'EQUIPMENT' | 'VEHICLE' | 'COMPUTERS'>('EQUIPMENT');
  const [accountingRate, setAccountingRate] = useState<number>(15);
  const [isNewEquipmentAccelerated, setIsNewEquipmentAccelerated] = useState<boolean>(false);

  // معدلات الإهلاك الضريبي القانونية وفق المادة 25 و 26 من قانون 91
  const getTaxRate = () => {
    switch (assetType) {
      case 'BUILDING':
        return 5; // مباني 5% قسط ثابت
      case 'EQUIPMENT':
      case 'VEHICLE':
        return 25; // آلات ومعدات وسيارات 25% أساس الإهلاك
      case 'COMPUTERS':
        return 50; // حواسب وبرمجيات ونظم 50% أساس الإهلاك
    }
  };

  const taxRate = getTaxRate();
  const acceleratedDepreciationAmount = isNewEquipmentAccelerated && assetType === 'EQUIPMENT' ? assetCost * 0.30 : 0;
  const remainingCostAfterAccelerated = assetCost - acceleratedDepreciationAmount;
  const normalTaxDepreciationAmount = (remainingCostAfterAccelerated * taxRate) / 100;
  const totalTaxDepreciation = acceleratedDepreciationAmount + normalTaxDepreciationAmount;
  const accountingDepreciationAmount = (assetCost * accountingRate) / 100;
  const temporaryDifference = totalTaxDepreciation - accountingDepreciationAmount;

  const handleGenerateDepreciationEntry = () => {
    const activeClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);
    const dateStr = new Date().toISOString().slice(0, 10);

    const depExpAcc = state.accounts.find((a) => a.code === '5210' || a.name.includes('إهلاك')) || {
      id: 'acc-dep-exp',
      code: '5210',
      name: 'مصروف إهلاك أصول ثابتة',
    };
    const accumDepAcc = state.accounts.find((a) => a.code === '1190' || a.name.includes('مجمع إهلاك')) || {
      id: 'acc-accum-dep',
      code: '1190',
      name: 'مجمع إهلاك أصول ثابتة',
    };

    const lines = [
      {
        id: `l1-${Date.now()}`,
        accountId: depExpAcc.id,
        accountCode: depExpAcc.code,
        accountName: depExpAcc.name,
        debit: accountingDepreciationAmount,
        credit: 0,
        description: `قسط إهلاك الأصل المحاسبي السنوي بنسبة ${accountingRate}%`,
      },
      {
        id: `l2-${Date.now()}`,
        accountId: accumDepAcc.id,
        accountCode: accumDepAcc.code,
        accountName: accumDepAcc.name,
        debit: 0,
        credit: accountingDepreciationAmount,
        description: `مجمع إهلاك الأصل الدفتري`,
      },
    ];

    db.addJournalEntry({
      date: dateStr,
      description: `قيد تسوية إهلاك الأصل الدفتري (إهلاك ضريبي قانون 91: ${formatEgyptianCurrency(totalTaxDepreciation)})`,
      lines,
      totalDebit: accountingDepreciationAmount,
      totalCredit: accountingDepreciationAmount,
      isPosted: true,
      entryType: 'ADJUSTING',
      clientId: activeClient?.id,
      clientName: activeClient?.name,
    });

    showToast(`✓ تم توليد قيد الإهلاك وترحيله إلى دفتر اليومية (${formatEgyptianCurrency(accountingDepreciationAmount)})`);
  };

  // =========================================================================
  // 3. REVERSE VAT & WHT CALCULATOR (القيمة المضافة العكسية والخصم)
  // =========================================================================
  const [calcDirection, setCalcDirection] = useState<'FROM_TOTAL' | 'FROM_NET'>('FROM_TOTAL');
  const [inputVatAmount, setInputVatAmount] = useState<number>(11400);
  const [vatRate, setVatRate] = useState<number>(14);
  const [whtRate, setWhtRate] = useState<number>(1); // 1% توريدات ومقاولات، 3% خدمات

  let netBeforeVat = 0;
  let vatAmount = 0;
  let whtAmount = 0;
  let grossTotal = 0;
  let finalNetPayable = 0;

  if (calcDirection === 'FROM_TOTAL') {
    grossTotal = inputVatAmount;
    netBeforeVat = Number((grossTotal / (1 + vatRate / 100)).toFixed(2));
    vatAmount = Number((grossTotal - netBeforeVat).toFixed(2));
    whtAmount = Number(((netBeforeVat * whtRate) / 100).toFixed(2));
    finalNetPayable = Number((grossTotal - whtAmount).toFixed(2));
  } else {
    netBeforeVat = inputVatAmount;
    vatAmount = Number(((netBeforeVat * vatRate) / 100).toFixed(2));
    grossTotal = Number((netBeforeVat + vatAmount).toFixed(2));
    whtAmount = Number(((netBeforeVat * whtRate) / 100).toFixed(2));
    finalNetPayable = Number((grossTotal - whtAmount).toFixed(2));
  }

  const handleGenerateVatEntry = (type: 'SALES' | 'PURCHASE') => {
    const activeClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);
    const dateStr = new Date().toISOString().slice(0, 10);

    const clientSupplierAcc = state.accounts.find((a) => (type === 'SALES' ? a.code === '1220' || a.name.includes('عملاء') : a.code === '2110' || a.name.includes('موردين'))) || {
      id: type === 'SALES' ? 'acc-ar' : 'acc-ap',
      code: type === 'SALES' ? '1220' : '2110',
      name: type === 'SALES' ? 'العملاء والمدينون' : 'الموردون والدائنون',
    };
    const revExpAcc = state.accounts.find((a) => (type === 'SALES' ? a.code === '4100' || a.name.includes('مبيعات') : a.code === '5120' || a.name.includes('مشتريات'))) || {
      id: type === 'SALES' ? 'acc-sales' : 'acc-purchases',
      code: type === 'SALES' ? '4100' : '5120',
      name: type === 'SALES' ? 'إيرادات المبيعات' : 'تكلفة المشتريات',
    };
    const vatAcc = state.accounts.find((a) => (type === 'SALES' ? a.code === '2230' || a.name.includes('مخرجات') : a.code === '1230' || a.name.includes('مدخلات'))) || {
      id: type === 'SALES' ? 'acc-vat-out' : 'acc-vat-in',
      code: type === 'SALES' ? '2230' : '1230',
      name: type === 'SALES' ? 'مصلحة الضرائب - ضريبة القيمة المضافة 14% (مخرجات)' : 'مصلحة الضرائب - ضريبة القيمة المضافة (مدخلات قابلة للخصم)',
    };
    const whtAcc = state.accounts.find((a) => a.code === '1235' || a.code === '2235' || a.name.includes('خصم')) || {
      id: 'acc-wht',
      code: type === 'SALES' ? '1235' : '2236',
      name: type === 'SALES' ? 'مصلحة الضرائب - خصم وتحصيل 1% مدين' : 'مصلحة الضرائب - خصم وتحصيل 1% دائن',
    };

    let lines = [];
    if (type === 'SALES') {
      lines = [
        {
          id: `l1-${Date.now()}`,
          accountId: clientSupplierAcc.id,
          accountCode: clientSupplierAcc.code,
          accountName: clientSupplierAcc.name,
          debit: finalNetPayable,
          credit: 0,
          description: `صافي المطالبة المستحقة على العميل بعد الخصم`,
        },
        {
          id: `l2-${Date.now()}`,
          accountId: whtAcc.id,
          accountCode: whtAcc.code,
          accountName: whtAcc.name,
          debit: whtAmount,
          credit: 0,
          description: `ضريبة الخصم والإضافة المستقطعة من العميل (1%)`,
        },
        {
          id: `l3-${Date.now()}`,
          accountId: revExpAcc.id,
          accountCode: revExpAcc.code,
          accountName: revExpAcc.name,
          debit: 0,
          credit: netBeforeVat,
          description: `إيراد المبيعات قبل الضريبة`,
        },
        {
          id: `l4-${Date.now()}`,
          accountId: vatAcc.id,
          accountCode: vatAcc.code,
          accountName: vatAcc.name,
          debit: 0,
          credit: vatAmount,
          description: `ضريبة القيمة المضافة 14% المحصلة من العميل`,
        },
      ];
    } else {
      lines = [
        {
          id: `l1-${Date.now()}`,
          accountId: revExpAcc.id,
          accountCode: revExpAcc.code,
          accountName: revExpAcc.name,
          debit: netBeforeVat,
          credit: 0,
          description: `قيمة المشتريات / المصروفات قبل الضريبة`,
        },
        {
          id: `l2-${Date.now()}`,
          accountId: vatAcc.id,
          accountCode: vatAcc.code,
          accountName: vatAcc.name,
          debit: vatAmount,
          credit: 0,
          description: `ضريبة القيمة المضافة 14% مدخلات مخصومة`,
        },
        {
          id: `l3-${Date.now()}`,
          accountId: whtAcc.id,
          accountCode: whtAcc.code,
          accountName: whtAcc.name,
          debit: 0,
          credit: whtAmount,
          description: `ضريبة الخصم والتحصيل من المنبع 1% المستقطعة للمورد`,
        },
        {
          id: `l4-${Date.now()}`,
          accountId: clientSupplierAcc.id,
          accountCode: clientSupplierAcc.code,
          accountName: clientSupplierAcc.name,
          debit: 0,
          credit: finalNetPayable,
          description: `صافي المستحق للمورد بعد الخصم`,
        },
      ];
    }

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    db.addJournalEntry({
      date: dateStr,
      description: `قيد فاتورة ${type === 'SALES' ? 'مبيعات' : 'مشتريات'} بضريبة 14% وخصم 1%`,
      lines,
      totalDebit,
      totalCredit,
      isPosted: true,
      entryType: type === 'SALES' ? 'SALES' : 'PURCHASE',
      clientId: activeClient?.id,
      clientName: activeClient?.name,
    });

    showToast(`✓ تم توليد قيد الفاتورة بنجاح وترحيله للأستاذ العام (${formatEgyptianCurrency(grossTotal)})`);
  };

  // =========================================================================
  // 4. AGING & RECONCILIATION SUMMARY (تحليل أعمار الديون)
  // =========================================================================
  const clientAccounts = state.accounts.filter(
    (a) => a.category === 'ASSETS' && (a.code.startsWith('12') || a.name.includes('عملاء'))
  );
  const totalReceivables = clientAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="الحاسبات الضريبية والمالية السريعة"
      subtitle="حاسبات فورية دقيقة مع ميزة تحويل النتائج إلى قيود يومية بضغطة زر"
      badge="EAS & Tax 2026"
      badgeVariant="emerald"
      width="max-w-2xl"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tool Navigation Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTool('PAYROLL')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTool === 'PAYROLL'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>كسب العمل</span>
        </button>

        <button
          onClick={() => setActiveTool('DEPRECIATION')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTool === 'DEPRECIATION'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>الإهلاك (قانون 91)</span>
        </button>

        <button
          onClick={() => setActiveTool('VAT_REVERSE')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTool === 'VAT_REVERSE'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>القيمة المضافة</span>
        </button>

        <button
          onClick={() => setActiveTool('AGING')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTool === 'AGING'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>أعمار الديون</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. PAYROLL TAB */}
      {/* ========================================================================= */}
      {activeTool === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60 text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
              حاسبة كسب العمل والتأمينات المصرية المعتمدة (قانون 148 لسنة 2019)
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              تحسب حصة العامل (11%)، حصة المنشأة (18.75%)، الإعفاءات الشخصية، وضريبة المرتبات بدقة تامة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                إجمالي الأجر الشامل (ج.م):
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الأجر التأميني الفعلي (إن اختلف عن الشامل):
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder={`الافتراضي: ${insurableWage}`}
                value={customInsurableWage}
                onChange={(e) => setCustomInsurableWage(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-1">الحد الأقصى التأميني 2026: 14,500 ج.م</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
              نتائج الاحتساب والتسوية الشهرية:
            </h4>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">حصة العامل في التأمينات (11%):</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                - {formatEgyptianCurrency(employeeInsurance)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">ضريبة كسب العمل المستقطعة شهرياً:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                - {formatEgyptianCurrency(monthlyPayrollTax)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200">صافي الراتب المستحق للموظف:</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                {formatEgyptianCurrency(netSalary)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-500">حصة صاحب العمل في التأمينات (18.75%):</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                + {formatEgyptianCurrency(employerInsurance)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-700 bg-blue-50/60 dark:bg-blue-950/40 p-2 rounded-lg">
              <span className="font-bold text-blue-900 dark:text-blue-300">إجمالي تكلفة الموظف على المنشأة:</span>
              <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                {formatEgyptianCurrency(totalCostToCompany)}
              </span>
            </div>
          </div>

          {/* Action Button: 1-Click Journal Entry */}
          <button
            onClick={handleGeneratePayrollEntry}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>توليد وترحيل قيد الرواتب إلى دفتر اليومية بضغطة زر</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEPRECIATION TAB (قانون 91) */}
      {/* ========================================================================= */}
      {activeTool === 'DEPRECIATION' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
              حاسبة الإهلاك الضريبي وقانون 91 لسنة 2005 (المادة 25 و 26 و 27)
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              مقارنة الإهلاك الدفتري المحاسبي مع الإهلاك الضريبي المعتمد لغرض الإقرار الضريبي وكشف الفروق المؤقتة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تكلفة اقتناء الأصل (ج.م):
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={assetCost}
                onChange={(e) => setAssetCost(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع الأصل طبقاً للقانون:
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="EQUIPMENT">آلات ومعدات وماكينات (25% أساس إهلاك)</option>
                <option value="BUILDING">مباني وإنشاءات (5% قسط ثابت)</option>
                <option value="VEHICLE">سيارات ووسائل نقل (25% أساس إهلاك)</option>
                <option value="COMPUTERS">حواسب وبرمجيات ونظم (50% أساس إهلاك)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نسبة الإهلاك المحاسبي الدفتري (% سنوياً):
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={accountingRate}
                onChange={(e) => setAccountingRate(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            {assetType === 'EQUIPMENT' && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="acc-check"
                  checked={isNewEquipmentAccelerated}
                  onChange={(e) => setIsNewEquipmentAccelerated(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="acc-check" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  تطبيق الإهلاك المعجل (30%) للآلات والمعدات الجديدة
                </label>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">الإهلاك المحاسبي الدفتري السنوي:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatEgyptianCurrency(accountingDepreciationAmount)}
              </span>
            </div>

            {isNewEquipmentAccelerated && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-600 dark:text-emerald-400">الإهلاك المعجل المعتمد (30% فوري):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatEgyptianCurrency(acceleratedDepreciationAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">الإهلاك الضريبي العادي (المادة 25):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatEgyptianCurrency(normalTaxDepreciationAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-700 bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded-lg">
              <span className="font-bold text-amber-900 dark:text-amber-300">إجمالي الإهلاك الضريبي المعتمد (قانون 91):</span>
              <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                {formatEgyptianCurrency(totalTaxDepreciation)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">الفروق الضريبية (تدرج في الإقرار الضريبي):</span>
              <span className={`font-mono font-bold ${temporaryDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {temporaryDifference >= 0 ? `+${formatEgyptianCurrency(temporaryDifference)} (خصم ضريبي)` : `${formatEgyptianCurrency(temporaryDifference)} (إضافة للوعاء)`}
              </span>
            </div>
          </div>

          <button
            onClick={handleGenerateDepreciationEntry}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>توليد قيد الإهلاك المحاسبي وترحيله لدفتر اليومية</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVERSE VAT TAB */}
      {/* ========================================================================= */}
      {activeTool === 'VAT_REVERSE' && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-0.5">
              حاسبة القيمة المضافة العكسية والخصم والتحصيل (قانون 67 لسنة 2016)
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              استخرج الوعاء الضريبي الصافي وقيمة الضريبة 14% والخصم من المنبع (1%) فوراً سواء أدخلت الإجمالي أو الصافي.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setCalcDirection('FROM_TOTAL')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                calcDirection === 'FROM_TOTAL'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              حساب من المبلغ الإجمالي شامل الضريبة
            </button>
            <button
              onClick={() => setCalcDirection('FROM_NET')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                calcDirection === 'FROM_NET'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              حساب من المبلغ الصافي قبل الضريبة
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {calcDirection === 'FROM_TOTAL' ? 'المبلغ الإجمالي شامل الضريبة:' : 'المبلغ الصافي قبل الضريبة:'}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={inputVatAmount}
                onChange={(e) => setInputVatAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نسبة ضريبة القيمة المضافة:
              </label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value={14}>14% (النسبة العامة - مصر)</option>
                <option value={15}>15% (المملكة العربية السعودية)</option>
                <option value={5}>5% (آلات ومعدات / الإمارات وعمان)</option>
                <option value={10}>10% (خدمات وسلع جدول)</option>
                <option value={0}>0% (معفى / تصدير للخارج / بدون ضريبة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نسبة الخصم والإضافة (WHT):
              </label>
              <select
                value={whtRate}
                onChange={(e) => setWhtRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value={1}>1% (توريدات ومقاولات)</option>
                <option value={3}>3% (خدمات واستشارات)</option>
                <option value={0.5}>0.5% (وكالات تجارية)</option>
                <option value={0}>0% (بدون خصم)</option>
              </select>
            </div>
          </div>

          {/* Breakdown Results */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">أصل المبلغ والوعاء الخاضع (صافي):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatEgyptianCurrency(netBeforeVat)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ضريبة القيمة المضافة ({vatRate}%):
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                + {formatEgyptianCurrency(vatAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200">إجمالي الفاتورة شامل الضريبة:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {formatEgyptianCurrency(grossTotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ضريبة الخصم والتحصيل ({whtRate}% من الصافي):
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                - {formatEgyptianCurrency(whtAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-700 bg-emerald-50/60 dark:bg-emerald-950/40 p-2 rounded-lg">
              <span className="font-bold text-emerald-950 dark:text-emerald-300">صافي المبلغ المستحق للسداد / التحصيل:</span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                {formatEgyptianCurrency(finalNetPayable)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleGenerateVatEntry('SALES')}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ترحيل كقيد مبيعات</span>
            </button>
            <button
              onClick={() => handleGenerateVatEntry('PURCHASE')}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ترحيل كقيد مشتريات</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AGING SUMMARY TAB */}
      {/* ========================================================================= */}
      {activeTool === 'AGING' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200/80 dark:border-purple-800/60 text-xs">
            <span className="font-bold text-purple-900 dark:text-purple-300 block mb-0.5">
              تحليل أعمار الديون والمطابقات المالية (AR / AP Aging)
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              متابعة فترات تحصيل مستحقات العملاء والموردين وفق معايير المحاسبة والائتمان المعتمدة.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 block">أقل من 30 يوماً</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatEgyptianCurrency(totalReceivables * 0.55)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">جاري ضمن الأجل</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 block">30 إلى 60 يوماً</span>
              <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatEgyptianCurrency(totalReceivables * 0.25)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">متابعة تحصيل</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 block">60 إلى 90 يوماً</span>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatEgyptianCurrency(totalReceivables * 0.12)}
              </span>
              <span className="text-[9px] text-amber-500 block mt-0.5 font-medium">إنذار ائتماني</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 block">أكثر من 90 يوماً</span>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatEgyptianCurrency(totalReceivables * 0.08)}
              </span>
              <span className="text-[9px] text-rose-500 block mt-0.5 font-medium">مخصص معيار 47</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                إجمالي مديونيات العملاء الحالية:
              </span>
              <span className="text-[11px] text-slate-500">مستخرج لحظياً من ميزان مراجعة الشركة</span>
            </div>
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {formatEgyptianCurrency(totalReceivables)}
            </span>
          </div>
        </div>
      )}
    </SlideOverDrawer>
  );
};
