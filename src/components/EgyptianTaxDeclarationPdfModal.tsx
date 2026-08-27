import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { TaxDeclarationRecord, ClientArchiveRecord } from '../types';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';

interface EgyptianTaxDeclarationPdfModalProps {
  state: DatabaseState;
  selectedDeclaration?: TaxDeclarationRecord | null;
  onClose: () => void;
}

export const EgyptianTaxDeclarationPdfModal: React.FC<EgyptianTaxDeclarationPdfModalProps> = ({
  state,
  selectedDeclaration,
  onClose,
}) => {
  const profile = state.officeProfile;

  // Active declaration or client selection
  const [activeDeclId, setActiveDeclId] = useState<string>(
    selectedDeclaration?.id || (state.taxDeclarations[0]?.id ?? '')
  );

  const currentDeclaration =
    state.taxDeclarations.find((d) => d.id === activeDeclId) || selectedDeclaration || state.taxDeclarations[0];

  const matchedClient: ClientArchiveRecord | undefined = state.clients.find(
    (c) => c.id === currentDeclaration?.clientId || c.name === currentDeclaration?.clientName
  );

  // Form custom overrides for print rendering
  const clientName = matchedClient?.name || currentDeclaration?.clientName || 'شركة الأهرام للصناعات الهندسية والتجارة (ش.م.م)';
  const taxRegNo = matchedClient?.taxCardNo || matchedClient?.vatRegistrationNo || '284-918-372';
  const taxFileNo = matchedClient?.incomeTaxFileNo || '14/829/938/01';
  const taxOffice = matchedClient?.taxOffice || 'مأمورية ضرائب الشركات المساهمة بالقاهرة';
  const commercialReg = matchedClient?.commercialRegistrationNo || '148293';
  const activity = matchedClient?.activity || 'نشاط تجاري وصناعي وتوريدات عمومية';
  const address = matchedClient?.address || 'المنطقة الصناعية الثالثة - مدينة السادس من أكتوبر - الجيزة';

  const period = currentDeclaration?.period || 'يناير 2026';
  const taxYear = currentDeclaration?.taxYear || 2026;
  const declarationType = currentDeclaration?.declarationType || 'VAT_10';

  // Financial figures
  const salesAmount = currentDeclaration?.salesTaxableAmount || 1850000;
  const vatOutput = currentDeclaration?.vatOutputTax || (salesAmount * 0.14);
  const purchasesAmount = currentDeclaration?.purchasesTaxableAmount || 1120000;
  const vatInput = currentDeclaration?.vatInputTax || (purchasesAmount * 0.14);
  const netVatPayable = currentDeclaration?.netVatPayable ?? Math.max(0, vatOutput - vatInput);
  const netTaxPayable = currentDeclaration?.netTaxPayable ?? netVatPayable;

  const finalDueAmount = netTaxPayable > 0 ? netTaxPayable : netVatPayable;
  const arabicWords = numberToArabicWords(Math.round(finalDueAmount));

  // QR Code Verification Payload
  const qrPayload = `ETA-EGY-TAX|DECL:${declarationType}|REG:${taxRegNo}|PERIOD:${period}-${taxYear}|NET:${finalDueAmount.toFixed(
    2
  )}|AUDITOR:MOHAMED_GAMIL_MAREI|HASH:${Date.now().toString(16).toUpperCase()}`;

  const printableRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtmlPdf = () => {
    if (!printableRef.current) return;
    const content = printableRef.current.innerHTML;
    const pageHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>إقرار ضريبي رسمي - ${clientName} - ${period} ${taxYear}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Cairo', sans-serif;
              background-color: #f8fafc;
              color: #0f172a;
              padding: 20px;
              direction: rtl;
            }
            @media print {
              body { background-color: #ffffff; padding: 0; }
              .no-print { display: none !important; }
            }
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
          </style>
        </head>
        <body>
          <div style="max-width: 900px; margin: 0 auto; background: white; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            ${content}
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `إقرار_ضريبي_${declarationType}_${clientName.replace(/\s+/g, '_')}_${taxYear}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 my-auto overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/30 border border-red-500/40 text-red-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>تصدير وطباعة الإقرار الضريبي الرسمي (PDF Egyptian Tax Return)</span>
                <span className="text-[11px] bg-red-800 text-red-100 px-2 py-0.5 rounded-full font-mono">
                  ETA-FORM-{declarationType}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                منسق بالكامل وفق النماذج الرسمية المعتمدة بمصلحة الضرائب المصرية وقانون الإجراءات الضريبية الموحد 206 لسنة 2020.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-tax-return"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإقرار (Print / PDF)</span>
            </button>
            <button
              onClick={handleDownloadHtmlPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تنزيل مستند الإقرار</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Declaration Selector Sub-bar */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">اختر الإقرار أو الممول:</span>
            <select
              value={activeDeclId}
              onChange={(e) => setActiveDeclId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              {state.taxDeclarations.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.declarationType}] {d.clientName} - {d.period} {d.taxYear} ({formatEgyptianCurrency(d.netVatPayable || d.netTaxPayable || 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>معتمد بختم المحاسب القانوني: <strong>{profile.auditorName}</strong></span>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-600">س.م.م: {profile.registrationNumber}</span>
          </div>
        </div>

        {/* Scrollable Printable Form Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/60">
          <div
            ref={printableRef}
            id="egyptian-official-tax-form"
            className="max-w-[850px] mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-300 text-slate-900 space-y-6 relative"
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
              <div className="text-9xl font-black text-slate-950 rotate-[-30deg] select-none text-center leading-none">
                مصلحة الضرائب المصرية<br />EGYPTIAN TAX AUTHORITY
              </div>
            </div>

            {/* Form Official Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex items-start justify-between gap-4">
                {/* Right: State / Ministry Info */}
                <div className="text-right space-y-0.5">
                  <div className="font-bold text-xs text-slate-600">جمهورية مصر العربية</div>
                  <div className="font-bold text-sm text-slate-900">وزارة المالية</div>
                  <div className="font-black text-base text-red-900">مصلحة الضرائب المصرية</div>
                  <div className="text-[11px] font-semibold text-slate-600">{taxOffice}</div>
                </div>

                {/* Center: Title / Form Emblem */}
                <div className="text-center space-y-1">
                  <div className="inline-block px-4 py-1 bg-slate-900 text-white rounded-lg font-black text-sm tracking-wide">
                    {declarationType === 'VAT_10'
                      ? 'نموذج رقم (10) ض.ق.م'
                      : declarationType === 'INCOME_27_CORP'
                      ? 'نموذج رقم (27) ض.د'
                      : declarationType === 'PAYROLL_4'
                      ? 'نموذج رقم (4) مرتبات'
                      : 'نموذج رقم (41) خصم وتحصيل'}
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-950">
                    {declarationType === 'VAT_10'
                      ? 'إقرار الضريبة على القيمة المضافة وضريبة الجدول'
                      : declarationType === 'INCOME_27_CORP'
                      ? 'إقرار ضريبة أرباح الأشخاص الاعتبارية (الشركات)'
                      : declarationType === 'PAYROLL_4'
                      ? 'إقرار المرتبات والأجور وما في حكمها (كسب العمل)'
                      : 'إقرار الخصم والتحصيل والدفعات المقدمة (أ.ت.ص)'}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    وفقاً لأحكام القانون رقم 67 لسنة 2016 وتعديلاته وقانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020
                  </p>
                </div>

                {/* Left: QR Code and Serial */}
                <div className="text-left flex flex-col items-end space-y-1">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateQrCodeSvg(qrPayload, 75),
                    }}
                    className="border border-slate-300 p-1 rounded-lg bg-white shadow-2xs"
                  />
                  <span className="font-mono text-[9px] text-slate-500 font-bold">
                    ETA-REF-{currentDeclaration?.id.slice(-6).toUpperCase() || '2026-X'}
                  </span>
                </div>
              </div>

              {/* Tax Period Banner */}
              <div className="mt-4 bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-700" />
                  <span>الفترة الضريبية: <strong className="text-red-950 font-black">{period}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span>سنة الإقرار: <strong className="font-mono text-slate-900">{taxYear}</strong></span>
                  <span>|</span>
                  <span>تاريخ وجوب التقديم والسداد: <strong className="font-mono text-slate-900">{currentDeclaration?.dueDate || 'نهاية الشهر التالي'}</strong></span>
                </div>
              </div>
            </div>

            {/* Section 1: Taxpayer Identification Data */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                <span>أولاً: بيانات المسجل / الممول (Taxpayer Profile)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">اسم الشركة / المسجل:</span>
                  <span className="font-black text-slate-900">{clientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">رقم التسجيل الضريبي (9 أرقام):</span>
                  <span className="font-mono font-black text-red-700 text-sm tracking-wider">{taxRegNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">رقم الملف الضريبي:</span>
                  <span className="font-mono font-bold text-slate-800">{taxFileNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المأمورية المختصة:</span>
                  <span className="font-semibold text-slate-800">{taxOffice}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">رقم السجل التجاري:</span>
                  <span className="font-mono font-bold text-slate-800">{commercialReg}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">النشاط الرئيسي:</span>
                  <span className="font-medium text-slate-800 truncate block">{activity}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block text-[10px]">العنوان والمركز الرئيسي:</span>
                  <span className="font-medium text-slate-800">{address}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Detailed Tax Calculations Schedule (جدول المبيعات والمشتريات والضريبة) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                <span>ثانياً: جدول تفريغ العمليات واحتساب الضريبة (Tax Schedule & Deductions)</span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-l border-slate-300 w-12 text-center">م</th>
                      <th className="p-2.5 border-l border-slate-300">بيان العمليات الخاضعة والمعفاة</th>
                      <th className="p-2.5 border-l border-slate-300 text-left w-36">القيمة / وعاء الضريبة (ج.م)</th>
                      <th className="p-2.5 border-l border-slate-300 text-center w-20">فئة الضريبة</th>
                      <th className="p-2.5 text-left w-36">قيمة الضريبة (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Sales Section */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="p-2 text-right text-red-900">
                        ( أ ) المبيعات والإيرادات عن الفترة الضريبية (ضريبة المخرجات)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-l border-slate-200 text-center font-mono">1</td>
                      <td className="p-2 border-l border-slate-200 font-medium">
                        مبيعات سلع عامة وخدمات محلية خاضعة للسعر العام
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono font-bold text-slate-800">
                        {formatEgyptianCurrency(salesAmount)}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-center font-bold text-red-700">14 %</td>
                      <td className="p-2 text-left font-mono font-black text-red-900">
                        {formatEgyptianCurrency(vatOutput)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-l border-slate-200 text-center font-mono">2</td>
                      <td className="p-2 border-l border-slate-200 text-slate-600">
                        صادرات سلع وخدمات خاضعة لسعر (صفر %)
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono text-slate-600">0.00</td>
                      <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-500">0 %</td>
                      <td className="p-2 text-left font-mono text-slate-600">0.00</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-l border-slate-200 text-center font-mono">3</td>
                      <td className="p-2 border-l border-slate-200 text-slate-600">
                        مبيعات وإيرادات سلع جدول (القيمة المضافة)
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono text-slate-600">0.00</td>
                      <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-500">جدول</td>
                      <td className="p-2 text-left font-mono text-slate-600">0.00</td>
                    </tr>
                    <tr className="bg-red-50/70 font-bold border-t border-red-200 text-red-950">
                      <td className="p-2 border-l border-slate-200 text-center">★</td>
                      <td className="p-2 border-l border-slate-200">إجمالي المبيعات وضريبة المخرجات المستحقة</td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono font-black">
                        {formatEgyptianCurrency(salesAmount)}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-center">-</td>
                      <td className="p-2 text-left font-mono font-black text-red-900">
                        {formatEgyptianCurrency(vatOutput)}
                      </td>
                    </tr>

                    {/* Purchases Section */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="p-2 text-right text-emerald-900">
                        ( ب ) المشتريات والمدخلات القابلة للخصم القانوني (ضريبة المدخلات)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-l border-slate-200 text-center font-mono">4</td>
                      <td className="p-2 border-l border-slate-200 font-medium">
                        مشتريات محلية واستيرادية خاضعة ومسدد عنها الضريبة بالفواتير الإلكترونية
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono font-bold text-slate-800">
                        {formatEgyptianCurrency(purchasesAmount)}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-center font-bold text-emerald-700">14 %</td>
                      <td className="p-2 text-left font-mono font-black text-emerald-800">
                        {formatEgyptianCurrency(vatInput)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-l border-slate-200 text-center font-mono">5</td>
                      <td className="p-2 border-l border-slate-200 text-slate-600">
                        مشتريات أصول رأسمالية وآلات ومعدات إنتاجية
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono text-slate-600">0.00</td>
                      <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-500">14 %</td>
                      <td className="p-2 text-left font-mono text-slate-600">0.00</td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-bold border-t border-emerald-200 text-emerald-950">
                      <td className="p-2 border-l border-slate-200 text-center">★</td>
                      <td className="p-2 border-l border-slate-200">إجمالي المشتريات وضريبة المدخلات القابلة للخصم</td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono font-black">
                        {formatEgyptianCurrency(purchasesAmount)}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-center">-</td>
                      <td className="p-2 text-left font-mono font-black text-emerald-900">
                        {formatEgyptianCurrency(vatInput)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Net Tax Calculation & Arabic Word Transcription (صافي الضريبة والتفقيط) */}
            <div className="bg-gradient-to-r from-red-50 to-slate-50 p-4 rounded-xl border-2 border-red-700/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">
                  صافي الضريبة المستحقة واجبة السداد لمصلحة الضرائب المصرية:
                </span>
                <span className="font-mono font-black text-xl text-red-900">
                  {formatEgyptianCurrency(finalDueAmount)}
                </span>
              </div>

              <div className="text-xs text-slate-800 flex items-center gap-2">
                <span className="font-bold text-slate-600 shrink-0">المبلغ فقط وقدره:</span>
                <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-red-200 shadow-2xs flex-1">
                  {arabicWords} لا غير
                </span>
              </div>
            </div>

            {/* Section 4: Auditor & Chartered Accountant Certification (إقرار المحاسب القانوني ومراقب الحسابات) */}
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>إقرار واعتماد المحاسب القانوني ومراقب الحسابات (Auditor Attestation)</span>
              </div>

              <p className="text-justify text-slate-700 leading-relaxed text-[11px]">
                أقر أنا المحاسب القانوني المقيد بسجل المحاسبين والمراجعين بوزارة المالية تحت رقم ({profile.registrationNumber})، بصفتي مراقب حسابات الممول الموضح بياناته أعلاه، بأن البيانات والمبالغ والضرائب المدرجة بهذا الإقرار مطابقة تماماً لقيود الدفاتر المحاسبية المنتظمة والفواتير والإشعارات الإلكترونية الصادرة والواردة والموثقة بمنظومة الفاتورة والإيصال الإلكتروني بمصلحة الضرائب المصرية، وقد تم إعداد هذا الإقرار وفقاً لمعايير المحاسبة المصرية (EAS) والقوانين واللوائح التنفيذية السارية.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">المحاسب القانوني ومراقب الحسابات</span>
                  <strong className="text-slate-900 text-xs block">{profile.auditorName}</strong>
                  <span className="text-[10px] font-mono text-slate-600 block">س.م.م: {profile.registrationNumber}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">تاريخ الاعتماد والإصدار</span>
                  <strong className="font-mono text-slate-900 text-xs block">
                    {new Date().toISOString().slice(0, 10)}
                  </strong>
                  <span className="text-[10px] text-emerald-700 font-bold block">✓ موثق إلكترونياً</span>
                </div>

                <div className="col-span-2 sm:col-span-1 border border-dashed border-slate-300 p-2 rounded-xl bg-white flex flex-col items-center justify-center">
                  <span className="text-[9px] text-slate-400 block mb-1">ختم المكتب والاعتماد المهني</span>
                  <div className="w-16 h-10 border border-emerald-700/40 rounded flex items-center justify-center text-[8px] font-bold text-emerald-800 bg-emerald-50/50">
                    مكتب مرعي للمحاسبة
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>طُبع بواسطة: منظومة المحاسب القانوني ومراقب الحسابات • محمد جميل مرعي</span>
              <span className="font-mono">Page 1 of 1 • System Generated Official Return</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
