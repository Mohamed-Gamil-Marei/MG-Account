import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Percent,
  FileSpreadsheet,
  QrCode,
  Sparkles,
  Loader2,
  ArrowRightLeft,
  Sliders,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { TaxDeclarationRecord, ClientArchiveRecord } from '../types';
import { exportElementToPdf } from '../utils/certifiedDocumentExporter';
import { PrintService } from '../services/PrintService';
import { generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { PrintExportControlModal } from './common/PrintExportControlModal';
import { PrintLayout } from './common/PrintLayout';

interface EgyptianTaxDeclarationPdfModalProps {
  isOpen: boolean;
  state: DatabaseState;
  selectedDeclaration?: TaxDeclarationRecord | null;
  initialDeclaration?: TaxDeclarationRecord | null;
  onClose: () => void;
}

export const EgyptianTaxDeclarationPdfModal: React.FC<EgyptianTaxDeclarationPdfModalProps> = ({
  state,
  selectedDeclaration,
  initialDeclaration,
  onClose,
}) => {
  const profile = state.officeProfile;
  const targetInitialDecl = selectedDeclaration || initialDeclaration;

  // Active declaration ID
  const [activeDeclId, setActiveDeclId] = useState<string>(
    targetInitialDecl?.id || (state.taxDeclarations[0]?.id ?? '')
  );

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState(PrintService.getSettings());

  // تحديث الإقرار النشط تلقائياً بمجرد تغير التاريخ أو البيانات من الدرفة
  useEffect(() => {
    if (targetInitialDecl?.id) {
      setActiveDeclId(targetInitialDecl.id);
    }
  }, [targetInitialDecl]);

  // قائمة الإقرارات في القائمة العلوية متضمنة الإقرار الحالي المباشر
  const declarationOptions = useMemo(() => {
    const list = [...state.taxDeclarations];
    if (targetInitialDecl && !list.some((d) => d.id === targetInitialDecl.id)) {
      list.unshift(targetInitialDecl);
    }
    return list;
  }, [state.taxDeclarations, targetInitialDecl]);

  // استخراج الإقرار الحالي (مع أولوية مطلقة للبيانات الحية الممررة من الدرفة بالتاريخ المحدث)
  const currentDeclaration = useMemo(() => {
    if (targetInitialDecl && (activeDeclId === targetInitialDecl.id || !activeDeclId)) {
      return targetInitialDecl;
    }
    return (
      state.taxDeclarations.find((d) => d.id === activeDeclId) ||
      targetInitialDecl ||
      state.taxDeclarations[0]
    );
  }, [activeDeclId, targetInitialDecl, state.taxDeclarations]);

  const matchedClient: ClientArchiveRecord | undefined = state.clients.find(
    (c) => c.id === currentDeclaration?.clientId || c.name === currentDeclaration?.clientName
  );

  // Form custom overrides for print rendering
  const clientName =
    currentDeclaration?.clientName ||
    matchedClient?.name ||
    'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)';
  const taxRegNo =
    currentDeclaration?.taxCardNo ||
    matchedClient?.taxCardNo ||
    matchedClient?.vatRegistrationNo ||
    '482-910-332';
  const taxFileNo = matchedClient?.incomeTaxFileNo || '14/829/938/01';
  const taxOffice =
    currentDeclaration?.taxOffice ||
    matchedClient?.taxOffice ||
    'مركز كبار الممولين (SAP - الحي المالي)';
  const commercialReg = matchedClient?.commercialRegistrationNo || '148293';
  const activity = matchedClient?.activity || 'صناعات هندسية ومقاولات وتوريدات عمومية';
  const address =
    matchedClient?.address ||
    'المنطقة الصناعية - الحي المالي - العاصمة الإدارية الجديدة';

  const period = currentDeclaration?.period || 'فبراير 2026';
  const taxYear = currentDeclaration?.taxYear || 2026;
  const declarationType = currentDeclaration?.declarationType || 'VAT_10';
  const amendmentType = currentDeclaration?.amendmentType || 'ORIGINAL';
  const isZeroReturn =
    currentDeclaration?.declarationNature === 'ZERO_RETURN' ||
    (currentDeclaration as any)?.isZeroReturn;

  // الحسبة المحاسبية والضريبية الشاملة (المبيعات، المشتريات، المخرجات، المدخلات، الرصيد الدائن، الصافي)
  const salesAmount =
    isZeroReturn ? 0 : Number(currentDeclaration?.salesTaxableAmount ?? currentDeclaration?.salesAmount ?? 0);
  const vatOutput =
    isZeroReturn ? 0 : Number(currentDeclaration?.vatOutputTax ?? Math.round(salesAmount * 0.14));
  const purchasesAmount =
    isZeroReturn ? 0 : Number(currentDeclaration?.purchasesTaxableAmount ?? currentDeclaration?.purchasesAmount ?? 0);
  const vatInput =
    isZeroReturn ? 0 : Number(currentDeclaration?.vatInputTax ?? Math.round(purchasesAmount * 0.14));
  const previousCredit =
    isZeroReturn ? 0 : Number(currentDeclaration?.previousCreditBalance ?? 0);

  // إجمالي الخصومات والمدخلات والرصيد الدائن السابق
  const totalDeductions = vatInput + previousCredit;

  // صافي الفارق الضريبي واحتساب الرصيد الدائن أو مستحق السداد
  let calcDifference = 0;
  let isPayable = false;
  let isCreditCarriedForward = false;
  let payableAmount = 0;
  let creditCarriedAmount = 0;

  if (isZeroReturn) {
    calcDifference = 0;
    isPayable = false;
    isCreditCarriedForward = false;
    payableAmount = 0;
    creditCarriedAmount = 0;
  } else if (declarationType === 'VAT_10') {
    calcDifference = vatOutput - totalDeductions;
    if (calcDifference > 0) {
      isPayable = true;
      payableAmount = calcDifference;
      creditCarriedAmount = 0;
    } else if (calcDifference < 0) {
      isCreditCarriedForward = true;
      creditCarriedAmount = Math.abs(calcDifference);
      payableAmount = 0;
    } else {
      if ((currentDeclaration?.netTaxPayable ?? 0) > 0) {
        isPayable = true;
        payableAmount = Number(currentDeclaration?.netTaxPayable);
      } else if ((currentDeclaration?.netTaxPayable ?? 0) < 0) {
        isCreditCarriedForward = true;
        creditCarriedAmount = Math.abs(Number(currentDeclaration?.netTaxPayable));
      }
    }
  } else {
    // إقرارات الدخل أو كسب العمل أو الخصم والتحصيل
    const net = Number(currentDeclaration?.netTaxPayable ?? 0);
    if (net > 0) {
      isPayable = true;
      payableAmount = net;
    } else if (net < 0 || previousCredit > 0) {
      isCreditCarriedForward = true;
      creditCarriedAmount = net < 0 ? Math.abs(net) : previousCredit;
    }
  }

  const isBalancedOrZero = !isPayable && !isCreditCarriedForward;

  // القيمة المعروضة والتفقيط بالعربية
  const finalDisplayAmount = isPayable
    ? payableAmount
    : isCreditCarriedForward
    ? creditCarriedAmount
    : 0;

  const arabicWords = numberToArabicWords(Math.round(finalDisplayAmount));

  // QR Code Verification Payload
  const qrPayload = `ETA-EGY-TAX|DECL:${declarationType}|REG:${taxRegNo}|PERIOD:${period}-${taxYear}|TYPE:${
    isPayable ? 'PAYABLE' : isCreditCarriedForward ? 'CREDIT_CARRIED' : 'ZERO'
  }|AMOUNT:${finalDisplayAmount.toFixed(2)}|AUDITOR:${profile.auditorName || 'MOHAMED_GAMIL_MAREI'}|HASH:${(
    currentDeclaration?.id || Date.now().toString(16)
  ).toUpperCase()}`;

  const printableRef = useRef<HTMLDivElement>(null);

  // طباعة موحدة عبر PrintLayout تضمن خط Cairo واتجاه RTL ومقاس A4 وهيدر المكتب ورقم الصفحة
  const handlePrint = () => {
    PrintLayout.printElement('egyptian-official-tax-form', {
      title: `إقرار ضريبي رسمي - ${clientName}`,
      subtitle: `الفترة الضريبية: ${period} | نموذج مصلحة الضرائب المصرية`,
      clientName,
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      orientation: 'portrait',
      pageSize: 'A4',
    });
  };

  // تصدير وتحميل ملف PDF حقيقي ومباشر وكامل البيانات على صفحة A4 واحدة معتمدة
  const handleExportDirectPdf = async () => {
    setIsExportingPdf(true);
    try {
      const cleanClientName = clientName.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const cleanPeriod = period.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const statusSuffix = isPayable ? 'مستحق_سداد' : isCreditCarriedForward ? 'رصيد_دائن_مرحل' : 'صفري';
      const pdfFileName = `إقرار_ضريبي_${declarationType}_${cleanClientName}_${cleanPeriod}_${taxYear}_${statusSuffix}.pdf`;

      const success = await exportElementToPdf('egyptian-official-tax-form', pdfFileName, {
        orientation: 'portrait',
        format: 'a4',
        fitToSinglePage: true,
      });
      if (!success) {
        handlePrint();
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 dark:border-slate-800 my-auto overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-400">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-1.5">
                <span>تصدير وطباعة الإقرار الضريبي الرسمي</span>
                <span className="text-[10px] bg-red-800 text-red-100 px-2 py-0.5 rounded-full font-mono">
                  ETA-FORM-{declarationType}
                </span>
                {isPayable ? (
                  <span className="text-[10px] bg-red-700/80 text-white px-2 py-0.5 rounded-full">
                    مستحق السداد
                  </span>
                ) : isCreditCarriedForward ? (
                  <span className="text-[10px] bg-emerald-700/80 text-white px-2 py-0.5 rounded-full">
                    رصيد دائن مرحل (زيادة)
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                    إقرار صفري
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                منسق وفق النماذج الرسمية المعتمدة بمصلحة الضرائب المصرية وقانون الإجراءات الضريبية 206 لسنة 2020.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* زر تصدير PDF مباشر وحقيقي */}
            <button
              onClick={handleExportDirectPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              title="تحميل ملف PDF رسمي معتمد بصيغة PDF فورية"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPdf ? 'جارِ التحميل...' : 'تحميل PDF'}</span>
            </button>

            {/* زر إعدادات الطباعة والـ QR */}
            <button
              type="button"
              onClick={() => setIsPrintSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-all"
              title="تخصيص أساليب الطباعة، إظهار/إخفاء الـ QR، شكل الختم والهوامش"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>إعدادات الطباعة والـ QR</span>
            </button>

            {/* زر طباعة الإقرار */}
            <button
              onClick={handlePrint}
              id="btn-print-tax-return"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-all"
              title="طباعة الإقرار فوراً دون صفحات بيضاء"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Declaration Selector & Toolbar */}
        <div className="bg-slate-800/90 px-4 sm:px-6 py-2 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px]">الفترة والإقرار:</span>
            <select
              value={activeDeclId}
              onChange={(e) => setActiveDeclId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              {declarationOptions.map((decl) => (
                <option key={decl.id} value={decl.id}>
                  {decl.clientName} - {decl.period} ({decl.taxYear}) [{decl.declarationType}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
            <span className="text-slate-300">
              الحالة: <strong className="text-emerald-400 font-bold">{currentDeclaration?.status === 'SUBMITTED_TO_ETA' || currentDeclaration?.status === 'PAID' ? 'تم التقديم' : 'مسودة'}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-300">
              المأمورية: <strong className="text-slate-100">{taxOffice}</strong>
            </span>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-200/70 dark:bg-slate-900/50 flex justify-center">
          <div
            id="egyptian-official-tax-form"
            ref={printableRef}
            className="w-full max-w-[840px] bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-300 space-y-2.5 font-sans text-right relative"
            style={{
              direction: 'rtl',
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            }}
          >
            {/* Watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none overflow-hidden">
              <span className="text-8xl font-black text-slate-900 -rotate-45 tracking-widest uppercase">
                ETA OFFICIAL
              </span>
            </div>

            {/* Official Header */}
            <div className="border-b-2 border-red-800 pb-2">
              <div className="flex items-start justify-between">
                {/* Right: Ministry & Authority */}
                <div className="space-y-0.2">
                  <h2 className="font-bold text-[11px] text-slate-800">جمهورية مصر العربية</h2>
                  <h3 className="font-bold text-[11px] text-slate-800">وزارة المالية</h3>
                  <h4 className="font-black text-xs text-red-800">مصلحة الضرائب المصرية</h4>
                  <p className="text-[9px] text-slate-600 font-medium">
                    {taxOffice}
                  </p>
                </div>

                {/* Center: Title & Form Type */}
                <div className="text-center space-y-0.5">
                  <div className="inline-block bg-red-800 text-white px-2.5 py-0.5 rounded font-mono font-black text-[11px] tracking-wider shadow-2xs">
                    نموذج رقم ({declarationType === 'VAT_10' ? '10' : declarationType === 'INCOME_27_CORP' ? '27' : declarationType === 'INCOME_28_INDIV' ? '28' : declarationType === 'PAYROLL_4' ? '4' : '41'}) ضريبة
                  </div>
                  <h1 className="font-black text-sm text-slate-900">
                    {declarationType === 'VAT_10'
                      ? 'إقرار الضريبة على القيمة المضافة وضريبة الجدول'
                      : declarationType === 'INCOME_27_CORP'
                      ? 'إقرار ضريبة أرباح الأشخاص الاعتبارية (الشركات)'
                      : declarationType === 'INCOME_28_INDIV'
                      ? 'إقرار ضريبة دخل الأشخاص الطبيعيين (المنشآت الفردية)'
                      : declarationType === 'PAYROLL_4'
                      ? 'إقرار المرتبات والأجور وما في حكمها (كسب العمل)'
                      : 'إقرار الخصم والتحصيل والدفعات المقدمة (أ.ت.ص)'}
                  </h1>
                  <p className="text-[9px] text-slate-500 font-semibold">
                    وفقاً لأحكام القانون رقم 67 لسنة 2016 وتعديلاته وقانون الإجراءات الضريبية 206 لسنة 2020
                  </p>
                </div>

                {/* Left: QR Code and Serial */}
                {printSettings.includeQrVerification !== false && (
                  <div className="text-left flex flex-col items-end space-y-0.5">
                    <div
                      data-qr-container="true"
                      dangerouslySetInnerHTML={{
                        __html: generateQrCodeSvg(qrPayload, printSettings.qrSizePx || 76),
                      }}
                      className="qr-print-container border border-slate-300 p-0.5 rounded bg-white shadow-2xs"
                    />
                    <span className="font-mono text-[8.5px] text-slate-500 font-bold">
                      ETA-REF-{(currentDeclaration?.etaReferenceNumber || currentDeclaration?.id || '2026-X').slice(-8).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Tax Period Banner */}
              <div className="mt-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-red-700" />
                  <span>الفترة الضريبية: <strong className="text-red-950 font-black">{period}</strong></span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-blue-100 text-blue-800">
                    {amendmentType === 'AMENDED' ? 'إقرار مُعدّل' : 'إقرار أصلي'}
                  </span>
                  {isZeroReturn && (
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-purple-100 text-purple-800">
                      إقرار صفري
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>سنة الإقرار: <strong className="font-mono text-slate-900">{taxYear}</strong></span>
                  <span>|</span>
                  <span>تاريخ الاستحقاق: <strong className="font-mono text-slate-900">{currentDeclaration?.dueDate || 'نهاية الشهر التالي'}</strong></span>
                </div>
              </div>
            </div>

            {/* Section 1: Taxpayer Identification Data */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                <span>أولاً: بيانات المسجل / الممول (Taxpayer Profile)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[9.5px]">اسم الشركة / المسجل:</span>
                  <span className="font-black text-slate-900 text-[11.5px]">{clientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9.5px]">رقم التسجيل الضريبي (9 أرقام):</span>
                  <span className="font-mono font-black text-red-700 text-xs tracking-wider">{taxRegNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9.5px]">رقم الملف الضريبي:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{taxFileNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9.5px]">المأمورية المختصة:</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{taxOffice}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9.5px]">رقم السجل التجاري:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{commercialReg}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9.5px]">النشاط الرئيسي:</span>
                  <span className="font-medium text-slate-800 truncate block text-[11px]">{activity}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block text-[9.5px]">العنوان والمركز الرئيسي:</span>
                  <span className="font-medium text-slate-800 text-[11px]">{address}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Detailed Tax Calculations Schedule */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                <span>ثانياً: جدول تفريغ العمليات واحتساب الضريبة (Tax Schedule & Deductions)</span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300 text-[10px]">
                      <th className="p-1 border-l border-slate-300 w-8 text-center">م</th>
                      <th className="p-1 border-l border-slate-300">بيان العمليات الخاضعة والمعفاة</th>
                      <th className="p-1 border-l border-slate-300 text-left w-32">وعاء الضريبة (ج.م)</th>
                      <th className="p-1 border-l border-slate-300 text-center w-16">الفئة</th>
                      <th className="p-1 text-left w-32">قيمة الضريبة (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {/* Sales Section */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="p-0.5 px-1 text-right text-red-900 text-[10px]">
                        ( أ ) المبيعات والإيرادات عن الفترة الضريبية (ضريبة المخرجات)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">1</td>
                      <td className="p-1 border-l border-slate-200 font-medium">
                        مبيعات سلع عامة وخدمات محلية خاضعة للسعر العام
                      </td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono font-bold text-slate-800">
                        {formatEgyptianCurrency(salesAmount)}
                      </td>
                      <td className="p-1 border-l border-slate-200 text-center font-bold text-red-700">14 %</td>
                      <td className="p-1 text-left font-mono font-black text-red-900">
                        {formatEgyptianCurrency(vatOutput)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">2</td>
                      <td className="p-1 border-l border-slate-200 text-slate-600">
                        صادرات سلع وخدمات خاضعة لسعر (صفر %)
                      </td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono text-slate-600">0.00</td>
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-slate-500">0 %</td>
                      <td className="p-1 text-left font-mono text-slate-600">0.00</td>
                    </tr>
                    <tr className="bg-red-50/70 font-bold border-t border-red-200 text-red-950">
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">★</td>
                      <td className="p-1 border-l border-slate-200">إجمالي المبيعات وضريبة المخرجات المستحقة (أ)</td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono font-black">
                        {formatEgyptianCurrency(salesAmount)}
                      </td>
                      <td className="p-1 border-l border-slate-200 text-center">-</td>
                      <td className="p-1 text-left font-mono font-black text-red-900">
                        {formatEgyptianCurrency(vatOutput)}
                      </td>
                    </tr>

                    {/* Purchases Section */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="p-0.5 px-1 text-right text-emerald-900 text-[10px]">
                        ( ب ) المشتريات والمدخلات القابلة للخصم القانوني (ضريبة المدخلات)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">3</td>
                      <td className="p-1 border-l border-slate-200 font-medium">
                        مشتريات محلية واستيرادية خاضعة ومسدد عنها الضريبة
                      </td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono font-bold text-slate-800">
                        {formatEgyptianCurrency(purchasesAmount)}
                      </td>
                      <td className="p-1 border-l border-slate-200 text-center font-bold text-emerald-700">14 %</td>
                      <td className="p-1 text-left font-mono font-black text-emerald-800">
                        {formatEgyptianCurrency(vatInput)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-bold border-t border-emerald-200 text-emerald-950">
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">★</td>
                      <td className="p-1 border-l border-slate-200">إجمالي المشتريات وضريبة المدخلات القابلة للخصم (ب)</td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono font-black">
                        {formatEgyptianCurrency(purchasesAmount)}
                      </td>
                      <td className="p-1 border-l border-slate-200 text-center">-</td>
                      <td className="p-1 text-left font-mono font-black text-emerald-900">
                        {formatEgyptianCurrency(vatInput)}
                      </td>
                    </tr>

                    {/* Previous Credit Section */}
                    <tr className="bg-indigo-50/80 font-bold border-t border-indigo-200 text-indigo-950">
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">4</td>
                      <td className="p-1 border-l border-slate-200">
                        ( ج ) رصيد دائن مرحل من فترات ضريبية سابقة واجب الخصم
                      </td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono text-slate-600">-</td>
                      <td className="p-1 border-l border-slate-200 text-center">-</td>
                      <td className="p-1 text-left font-mono font-black text-indigo-900">
                        {formatEgyptianCurrency(previousCredit)}
                      </td>
                    </tr>

                    {/* Total Deductions */}
                    <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-[10.5px]">
                      <td className="p-1 border-l border-slate-200 text-center font-mono text-[10px]">★</td>
                      <td className="p-1 border-l border-slate-200">
                        إجمالي الخصومات والمدخلات (ضريبة المدخلات + الرصيد الدائن السابق)
                      </td>
                      <td className="p-1 border-l border-slate-200 text-left font-mono font-bold text-slate-600">-</td>
                      <td className="p-1 border-l border-slate-200 text-center">-</td>
                      <td className="p-1 text-left font-mono font-black text-slate-900">
                        {formatEgyptianCurrency(totalDeductions)}
                      </td>
                    </tr>

                    {/* Net Result Row */}
                    <tr
                      className={`font-black border-t-2 text-[11px] ${
                        isPayable
                          ? 'bg-red-100/90 text-red-950 border-red-400'
                          : isCreditCarriedForward
                          ? 'bg-emerald-100/90 text-emerald-950 border-emerald-400'
                          : 'bg-slate-100 text-slate-900 border-slate-300'
                      }`}
                    >
                      <td className="p-1.5 border-l border-slate-300 text-center font-mono">★</td>
                      <td className="p-1.5 border-l border-slate-300">
                        {isPayable
                          ? '( د ) صافي الضريبة المستحقة واجبة السداد لمصلحة الضرائب المصرية'
                          : isCreditCarriedForward
                          ? '( د ) رصيد دائن / زيادة مسددة للمسجل ترحل للفترة الضريبية القادمة'
                          : '( د ) صافي الضريبة (إقرار صفري متوازن)'}
                      </td>
                      <td className="p-1.5 border-l border-slate-300 text-left font-mono font-black">-</td>
                      <td className="p-1.5 border-l border-slate-300 text-center">
                        {isPayable ? 'سداد' : isCreditCarriedForward ? 'يرحل' : 'صفر'}
                      </td>
                      <td className="p-1.5 text-left font-mono font-black text-xs">
                        {formatEgyptianCurrency(finalDisplayAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Net Tax Calculation & Arabic Word Transcription */}
            <div
              className={`p-2.5 rounded-lg border-2 space-y-1.5 ${
                isPayable
                  ? 'bg-gradient-to-r from-red-50 to-slate-50 border-red-700/40 text-red-950'
                  : isCreditCarriedForward
                  ? 'bg-gradient-to-r from-emerald-50 to-indigo-50/40 border-emerald-600/40 text-emerald-950'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-300/60 pb-1.5">
                <div className="flex items-center gap-1.5">
                  {isPayable ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0"></span>
                  ) : isCreditCarriedForward ? (
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  )}
                  <span className="font-black text-xs">
                    {isPayable
                      ? 'صافي الضريبة المستحقة واجبة السداد لمصلحة الضرائب المصرية:'
                      : isCreditCarriedForward
                      ? 'رصيد دائن / زيادة مسددة للمسجل ترحل للفترة الضريبية القادمة:'
                      : 'نتيجة الإقرار الضريبي:'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`font-mono font-black text-base ${
                      isPayable
                        ? 'text-red-900'
                        : isCreditCarriedForward
                        ? 'text-emerald-800'
                        : 'text-slate-800'
                    }`}
                  >
                    {formatEgyptianCurrency(finalDisplayAmount)}
                  </span>
                  <span className="text-[10px] font-bold">
                    {isPayable
                      ? '(مستحق السداد)'
                      : isCreditCarriedForward
                      ? '(فائض دائن يرحل)'
                      : '(إقرار صفري)'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] flex items-center gap-1.5">
                <span className="font-bold text-slate-600 shrink-0 text-[10px]">المبلغ فقط وقدره:</span>
                <span className="font-black bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-2xs flex-1 text-slate-900">
                  {isBalancedOrZero
                    ? 'صفر جنيه مصري لا غير (لا توجد مبالغ مستحقة السداد أو أرصدة دائنة مرحلة)'
                    : isPayable
                    ? `فقط ${arabicWords} لا غير (واجب السداد لمصلحة الضرائب المصرية)`
                    : `فقط ${arabicWords} لا غير (رصيد دائن للمسجل يرحل للفترة الضريبية التالية)`}
                </span>
              </div>
            </div>

            {/* Section 4: Auditor & Chartered Accountant Certification */}
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50/50 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-200 pb-0.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>إقرار واعتماد المحاسب القانوني ومراقب الحسابات (Auditor Attestation)</span>
              </div>

              <p className="text-right text-slate-700 leading-normal text-[9.5px]">
                أقر أنا المحاسب القانوني المقيد بسجل المحاسبين والمراجعين بوزارة المالية تحت رقم ({(profile as any).registrationNumber || profile.licenseNumber || 'س.م.م / 43122'}), بصفتي مراقب حسابات الممول الموضح بياناته أعلاه، بأن البيانات والمبالغ والضرائب المدرجة بهذا الإقرار مطابقة تماماً لقيود الدفاتر المحاسبية والفواتير والإشعارات الإلكترونية الصادرة والواردة بمنظومة مصلحة الضرائب المصرية، وتم إعداد هذا الإقرار وفقاً لمعايير المحاسبة المصرية (EAS) والقوانين السارية.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 text-center">
                <div className="space-y-0.2">
                  <span className="text-[9px] text-slate-500 block">المحاسب القانوني ومراقب الحسابات</span>
                  <strong className="text-slate-900 text-[11px] block">{profile.auditorName || 'محمد جميل مرعي'}</strong>
                  <span className="text-[9px] font-mono text-slate-600 block">{(profile as any).registrationNumber || profile.licenseNumber || 'س.م.م / 43122'}</span>
                </div>

                <div className="space-y-0.2">
                  <span className="text-[9px] text-slate-500 block">تاريخ الاعتماد والإصدار</span>
                  <strong className="font-mono text-slate-900 text-[11px] block">
                    {currentDeclaration?.submissionDate || new Date().toISOString().slice(0, 10)}
                  </strong>
                  <span className="text-[9px] text-emerald-700 font-bold block">✓ موثق إلكترونياً</span>
                </div>

                <div className="col-span-2 sm:col-span-1 border border-dashed border-slate-300 p-1 rounded-lg bg-white flex flex-col items-center justify-center">
                  <span className="text-[8px] text-slate-400 block mb-0.5">ختم المكتب والاعتماد المهني</span>
                  <div className="w-14 h-6 border border-emerald-700/40 rounded flex items-center justify-center text-[7.5px] font-bold text-emerald-800 bg-emerald-50/50">
                    مكتب مرعي للمحاسبة
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
              <span>طُبع بواسطة: منظومة المحاسب القانوني ومراقب الحسابات • {profile.auditorName || 'محمد جميل مرعي'}</span>
              <span className="font-mono">Page 1 of 1 • System Generated Official Return</span>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة التحكم في أساليب الطباعة والتصدير والـ QR */}
      <PrintExportControlModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
        onSaved={() => setPrintSettings(PrintService.getSettings())}
      />
    </div>
  );
};

// Helper: Format Egyptian Currency
function formatEgyptianCurrency(num: number): string {
  if (isNaN(num)) return '0.00 ج.م';
  return (
    num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ج.م'
  );
}

// Helper: Convert Numbers to Arabic Words (Tafqeet)
function numberToArabicWords(number: number): string {
  if (number === 0) return 'صفر جنيه مصري';

  const ones = [
    '',
    'واحد',
    'اثنان',
    'ثلاثة',
    'أربعة',
    'خمسة',
    'ستة',
    'سبعة',
    'ثمانية',
    'تسعة',
    'عشرة',
    'أحد عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر',
  ];

  const tens = [
    '',
    '',
    'عشرون',
    'ثلاثون',
    'أربعون',
    'خمسون',
    'ستون',
    'سبعون',
    'ثمانون',
    'تسعون',
  ];

  const hundreds = [
    '',
    'مائة',
    'مائتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة',
  ];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result !== '') result += ' و ';
      if (remainder < 20) {
        result += ones[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          result += ones[o] + ' و ' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const absNum = Math.abs(Math.floor(number));
  if (absNum === 0) return 'صفر جنيه مصري';

  const billions = Math.floor(absNum / 1000000000);
  const millions = Math.floor((absNum % 1000000000) / 1000000);
  const thousands = Math.floor((absNum % 1000000) / 1000);
  const remainder = absNum % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    parts.push(convertGroup(billions) + (billions === 1 ? ' مليار' : billions === 2 ? ' ملياران' : ' مليارات'));
  }
  if (millions > 0) {
    parts.push(convertGroup(millions) + (millions === 1 ? ' مليون' : millions === 2 ? ' مليونان' : ' ملايين'));
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else parts.push(convertGroup(thousands) + ' آلاف');
  }
  if (remainder > 0) {
    parts.push(convertGroup(remainder));
  }

  return parts.join(' و ') + ' جنيه مصري';
}

export default React.memo(EgyptianTaxDeclarationPdfModal);
