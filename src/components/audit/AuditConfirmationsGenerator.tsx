import React, { useState } from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { MailCheck, Printer, Building2, CheckCircle2, Clock } from 'lucide-react';
import { PrintService } from '../../services/PrintService';

export interface AuditConfirmationsGeneratorProps {
  state: DatabaseState;
  selectedYear?: number;
}

export const AuditConfirmationsGenerator: React.FC<AuditConfirmationsGeneratorProps> = ({
  state,
  selectedYear = 2026,
}) => {
  const [confirmationType, setConfirmationType] = useState<'BANK' | 'RECEIVABLE' | 'PAYABLE'>('BANK');
  const [partnerName, setPartnerName] = useState('البنك الأهلي المصري - فرع العاشر من رمضان');
  const [balanceAmount, setBalanceAmount] = useState(1450000);

  return (
    <div id="audit-confirmations-printable" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <MailCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              مولّد خطابات المصادقات الخارجية (ESA 505 - External Confirmations)
            </h3>
            <p className="text-xs text-slate-500">
              إصدار مصادقات البنوك والعملاء والموردين كما في 31 ديسمبر {selectedYear}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            PrintService.printElementById('audit-confirmations-printable', {
              documentTitle: `خطاب مصادقة رصيد - ${partnerName}`,
            })
          }
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة خطاب المصادقة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">نوع المصادقة</label>
          <select
            value={confirmationType}
            onChange={(e) => setConfirmationType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          >
            <option value="BANK">مصادقة أرصدة وتسهيلات بنكية (Bank Confirmation)</option>
            <option value="RECEIVABLE">مصادقة رصيد عميل مدين (Positive AR Confirmation)</option>
            <option value="PAYABLE">مصادقة رصيد مورد دائن (AP Confirmation)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">الجهة المرسل إليها</label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">الرصيد الدفتري في 31/12/{selectedYear}</label>
          <input
            type="number"
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
          />
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-800">
        <div className="flex items-center justify-between font-bold text-slate-900">
          <span>السادة / {partnerName}</span>
          <span>التاريخ: 31/12/{selectedYear}</span>
        </div>
        <p>
          بمناسبة قيام مراقب حساباتنا <strong>({state.officeProfile?.firmName || 'مكتب المحاسب القانوني'})</strong> بمراجعة القوائم المالية لمنشأتنا عن السنة المالية المنتهية في 31 ديسمبر {selectedYear}، نرجو التكرم بمصادقة صحة الرصيد المبين أدناه وإرسال الرد مباشرة إلى مكتب مراقب الحسابات.
        </p>
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-black">
          <span>الرصيد الدفتري المسجل لدينا:</span>
          <span className="font-mono text-indigo-700 text-sm">{formatEgyptianCurrency(balanceAmount, true)}</span>
        </div>
        <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> مطابق لسجلاتنا
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
            <Clock className="w-3.5 h-3.5" /> غير مطابق (يرجى إرفاق كشف حساب تفصيلي)
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600 font-bold mr-auto">
            <Building2 className="w-3.5 h-3.5" /> معيار المراجعة المصري رقم (505)
          </span>
        </div>
      </div>
    </div>
  );
};
