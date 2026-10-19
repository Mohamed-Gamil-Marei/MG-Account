import React from 'react';
import { X, Printer, CheckCircle2, FileText, Building2 } from 'lucide-react';
import { TaxDeclarationRecord } from '../types';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { PrintService } from '../services/PrintService';
import { formatCairoDateTimeArabic } from '../utils/cairoTime';

export interface EgyptianTaxDeclarationPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  initialDeclaration: TaxDeclarationRecord | null;
}

export const EgyptianTaxDeclarationPdfModal: React.FC<EgyptianTaxDeclarationPdfModalProps> = ({
  isOpen,
  onClose,
  state,
  initialDeclaration,
}) => {
  if (!isOpen || !initialDeclaration) return null;

  const decl = initialDeclaration;
  const client = state.clients.find((c) => c.id === decl.clientId) || null;
  const office = state.officeProfile;

  const getDeclarationTitle = (type: string) => {
    switch (type) {
      case 'VAT_10':
      case 'VAT_MONTHLY_10':
        return 'إقرار ضريبة القيمة المضافة الشهري (نموذج 10)';
      case 'INCOME_27_CORP':
      case 'ANNUAL_CORP_105':
        return 'إقرار الضريبة على أرباح الأشخاص الاعتبارية (نموذج 27 / 105)';
      case 'INCOME_28_INDIV':
      case 'ANNUAL_INCOME_101':
        return 'إقرار الضريبة على صافي دخل الأشخاص الطبيعيين (نموذج 28 / 101)';
      case 'WHT_41':
      case 'WHT_QUARTERLY_41':
        return 'إقرار الخصم والتحصيل تحت حساب الضريبة ربع السنوي (نموذج 41)';
      case 'PAYROLL_4':
      case 'PAYROLL_QUARTERLY_4':
        return 'إقرار التسوية الربع سنوية لضريبة كسب العمل والمرتبات (نموذج 4)';
      case 'STAMP_TAX':
        return 'إقرار ضريبة الدمغة النسبية والنوعية';
      default:
        return `إقرار ضريبي (${type})`;
    }
  };

  const salesAmount = Number(decl.salesTaxableAmount ?? decl.salesOrRevenuesAmount ?? decl.taxableBase ?? 0);
  const purchasesAmount = Number(decl.purchasesTaxableAmount ?? decl.purchasesOrCostsAmount ?? 0);
  const outputTax = Number(decl.vatOutputTax ?? decl.outputTaxAmount ?? decl.taxAmount ?? 0);
  const inputTax = Number(decl.vatInputTax ?? decl.inputTaxDeductible ?? 0);
  const prevCredit = Number(decl.previousCreditBalance ?? decl.creditCarriedForward ?? 0);
  const netPayable = Number(decl.netTaxPayable ?? decl.netVatPayable ?? decl.netPayable ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs" dir="rtl">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                معاينة وطباعة نموذج الإقرار الضريبي المعتمد
              </h3>
              <p className="text-[11px] text-slate-500">
                {decl.clientName || client?.name} — {decl.period}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                PrintService.printElementById('egyptian-tax-declaration-printable', {
                  documentTitle: `${getDeclarationTitle(decl.declarationType)} - ${decl.clientName || client?.name || ''}`,
                })
              }
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة / تصدير PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            id="egyptian-tax-declaration-printable"
            className="space-y-5 rounded-xl border-2 border-slate-900 bg-white p-6 text-slate-900"
            dir="rtl"
          >
            {/* Official Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-600">جمهورية مصر العربية - وزارة المالية</div>
                <div className="text-sm font-black text-slate-900">مصلحة الضرائب المصرية (منظومة الإقرارات الإلكترونية)</div>
                <div className="mt-1 text-xs font-semibold text-slate-700">
                  المأمورية المختصة: {decl.taxOffice || client?.taxOffice || 'مأمورية الضرائب المختصة'}
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-700">{office?.firmName}</div>
                <div className="text-[11px] text-slate-500">{office?.auditorName}</div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">
                  تاريخ الإصدار (توقيت القاهرة): {formatCairoDateTimeArabic()}
                </div>
              </div>
            </div>

            {/* Title Banner */}
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-center text-white">
              <h2 className="text-base font-black">{getDeclarationTitle(decl.declarationType)}</h2>
              <p className="mt-1 text-xs text-slate-300">
                الفترة الضريبية: <span className="font-bold text-white">{decl.period}</span> | طبيعة الإقرار:{' '}
                <span className="font-bold text-amber-300">
                  {decl.declarationNature === 'ZERO_RETURN'
                    ? 'إقرار صفري'
                    : decl.amendmentType === 'AMENDED'
                    ? 'إقرار مُعدّل'
                    : 'إقرار أصلي'}
                </span>
              </p>
            </div>

            {/* Taxpayer Details */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-500">اسم الممول / الشركة:</span>
                <span className="font-black text-slate-900">{decl.clientName || client?.name || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500">رقم التسجيل الضريبي الموحد:</span>
                <span className="font-mono font-bold text-slate-900">
                  {decl.taxCardNo || decl.taxId || client?.taxCardNo || client?.taxId || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500">حالة الإقرار ورقم المرجع الإلكتروني:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {decl.status === 'SUBMITTED_TO_ETA' || decl.status === 'PAID' ? 'تم التقديم الإلكتروني' : 'مسودة مراجعة'}
                  {decl.etaReferenceNumber ? ` (${decl.etaReferenceNumber})` : ''}
                </span>
              </div>
            </div>

            {/* Financial Figures Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 p-2.5 text-right">البيان المحاسبي والضريبي</th>
                  <th className="border border-slate-300 p-2.5 text-left font-mono">القيمة (ج.م - بقرشين)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2.5 font-semibold">إجمالي المبيعات / الإيرادات / الوعاء الخاضع للضريبة</td>
                  <td className="border border-slate-300 p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(salesAmount, true)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2.5 font-semibold">إجمالي المشتريات / التكاليف والمصروفات القابلة للخصم</td>
                  <td className="border border-slate-300 p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(purchasesAmount, true)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2.5 font-semibold">الضريبة المستحقة / ضريبة المخرجات</td>
                  <td className="border border-slate-300 p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(outputTax, true)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2.5 font-semibold">الضريبة المخصومة / ضريبة المدخلات</td>
                  <td className="border border-slate-300 p-2.5 text-left font-mono font-bold">
                    {formatEgyptianCurrency(inputTax, true)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2.5 font-semibold">الرصيد الدائن المرحل من الفترة السابقة</td>
                  <td className="border border-slate-300 p-2.5 text-left font-mono font-bold text-indigo-700">
                    {formatEgyptianCurrency(prevCredit, true)}
                  </td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="border border-slate-300 p-3 font-black text-slate-900">
                    صافي الضريبة واجبة السداد للمصلحة
                  </td>
                  <td className="border border-slate-300 p-3 text-left font-mono text-sm font-black text-emerald-800">
                    {formatEgyptianCurrency(netPayable, true)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Notes & Signatures */}
            {decl.notes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="font-bold text-slate-700">ملاحظات المراجعة الضريبية: </span>
                <span className="text-slate-600">{decl.notes}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-4 text-xs border-t border-slate-200">
              <div>
                <div className="font-bold text-slate-700">إعداد ومراجعة الضرائب:</div>
                <div className="mt-4 text-slate-500">التوقيع: ........................................</div>
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-700">اعتماد المحاسب القانوني:</div>
                <div className="mt-1 font-black text-slate-900">{office?.auditorName}</div>
                <div className="text-[11px] text-slate-500">س.م.م: {office?.licenseNumber}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
