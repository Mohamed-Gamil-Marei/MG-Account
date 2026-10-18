import React, { useMemo, useState } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { MailCheck, Printer, Building2, AlertCircle } from 'lucide-react';
import { PrintService } from '../../services/PrintService';

export interface AuditConfirmationsGeneratorProps {
  state: DatabaseState;
  selectedYear?: number;
}

export type ConfirmationReplyVerdict = '' | 'MATCHED' | 'DISCREPANCY';

export const AuditConfirmationsGenerator: React.FC<AuditConfirmationsGeneratorProps> = ({
  state,
  selectedYear = 2026,
}) => {
  const activeClientId = state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;
  const targetYear = state.activeClientContext?.selectedFiscalYear || selectedYear;

  const [confirmationType, setConfirmationType] = useState<'BANK' | 'RECEIVABLE' | 'PAYABLE'>('BANK');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');
  const [manualBalanceOverride, setManualBalanceOverride] = useState<string>('');
  const [replyVerdict, setReplyVerdict] = useState<ConfirmationReplyVerdict>('');

  const clientAccountsWithLedgerBalances = useMemo(() => {
    if (!activeClientId) return [];
    const accounts = db.getClientAccounts(activeClientId, targetYear);
    const postedEntries = (state.journalEntries || []).filter(
      (je) =>
        je.clientId === activeClientId &&
        je.isPosted &&
        (je.fiscalYear || targetYear) === targetYear
    );

    const movMap = new Map<string, { debit: number; credit: number }>();
    for (const je of postedEntries) {
      for (const line of je.lines || []) {
        const key = line.accountCode || line.accountId || '';
        const prev = movMap.get(key) || { debit: 0, credit: 0 };
        prev.debit += Number(line.debit) || 0;
        prev.credit += Number(line.credit) || 0;
        movMap.set(key, prev);
      }
    }

    return accounts.map((acc) => {
      const mov = movMap.get(acc.code) || movMap.get(acc.id) || { debit: 0, credit: 0 };
      const openDr = Number(acc.openingBalanceDebit) || 0;
      const openCr = Number(acc.openingBalanceCredit) || 0;
      const netDebit = openDr + mov.debit - (openCr + mov.credit);
      const bookBalance = acc.nature === 'CREDIT' ? -netDebit : netDebit;
      return {
        ...acc,
        bookBalance,
      };
    });
  }, [activeClientId, targetYear, state.accounts, state.journalEntries, state.clientOpeningBalances]);

  const selectedAccount = clientAccountsWithLedgerBalances.find((a) => a.code === selectedAccountCode) || null;
  const computedBalance =
    manualBalanceOverride.trim() !== ''
      ? Number(manualBalanceOverride)
      : selectedAccount
      ? selectedAccount.bookBalance
      : null;

  if (!activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار العميل (المنشأة) أولاً</p>
          <p className="mt-1">يتم احتساب أرصدة المصادقات من واقع الأستاذ العام والقيود المرحّلة الخاصة بالعميل المحدد فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="audit-confirmations-printable" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <MailCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              مولّد خطابات المصادقات الخارجية (ESA 505) • {activeClient.name}
            </h3>
            <p className="text-xs text-slate-500">
              يُحتسب الرصيد الدفتري تلقائياً من حسابات العميل للسنة المالية {targetYear} أو يُدخله المراجع
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!partnerName.trim() || computedBalance === null}
          onClick={() =>
            PrintService.printElementById('audit-confirmations-printable', {
              documentTitle: `خطاب مصادقة رصيد - ${activeClient.name} - ${partnerName}`,
            })
          }
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة خطاب المصادقة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">نوع المصادقة</label>
          <select
            value={confirmationType}
            onChange={(e) => setConfirmationType(e.target.value as 'BANK' | 'RECEIVABLE' | 'PAYABLE')}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          >
            <option value="BANK">مصادقة أرصدة بنكية (Bank)</option>
            <option value="RECEIVABLE">مصادقة رصيد عميل مدين (AR)</option>
            <option value="PAYABLE">مصادقة رصيد مورد دائن (AP)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">حساب العميل في الدفاتر *</label>
          <select
            value={selectedAccountCode}
            onChange={(e) => {
              const code = e.target.value;
              setSelectedAccountCode(code);
              const acc = clientAccountsWithLedgerBalances.find((a) => a.code === code);
              if (acc && !partnerName) {
                setPartnerName(acc.name);
              }
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          >
            <option value="">-- اختر الحساب لحساب رصيده الدفتري --</option>
            {clientAccountsWithLedgerBalances.map((acc) => (
              <option key={acc.id} value={acc.code}>
                {acc.code} - {acc.name} ({formatEgyptianCurrency(acc.bookBalance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">اسم الجهة المرسل إليها *</label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="أدخل اسم البنك / العميل / المورد..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            تعديل يدوي للرصيد (اختياري)
          </label>
          <input
            type="number"
            value={manualBalanceOverride}
            onChange={(e) => setManualBalanceOverride(e.target.value)}
            placeholder={selectedAccount ? String(selectedAccount.bookBalance) : 'يُحسب من الحساب المختار'}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            نتيجة رد المصادقة (تُحدد بواسطة المراجع بعد ورود الرد فقط)
          </label>
          <select
            value={replyVerdict}
            onChange={(e) => setReplyVerdict(e.target.value as ConfirmationReplyVerdict)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          >
            <option value="">-- في انتظار ورود الرد الرسمي (بدون استنتاج مسبق) --</option>
            <option value="MATCHED">مطابق لسجلات المنشأة</option>
            <option value="DISCREPANCY">غير مطابق (يوجد فروق قيد التسوية)</option>
          </select>
        </div>
      </div>

      {computedBalance === null || !partnerName.trim() ? (
        <div className="p-5 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          يرجى اختيار الحساب من دفتر أستاذ العميل وتحديد اسم الجهة المرسل إليها لعرض خطاب المصادقة بالرصيد الفعلي المحسوب.
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-800">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>السادة / {partnerName}</span>
            <span>التاريخ: {db.getClientFiscalYearBounds(activeClientId, targetYear).endDate}</span>
          </div>
          <p>
            بمناسبة قيام مراقب حسابات منشأة <strong>{activeClient.name}</strong> <strong>({state.officeProfile?.firmName || 'مكتب المحاسب القانوني'})</strong> بمراجعة القوائم المالية عن السنة المالية المنتهية في {db.getClientFiscalYearBounds(activeClientId, targetYear).labelAr} ({db.getClientFiscalYearBounds(activeClientId, targetYear).endDate})، نرجو التكرم بمصادقة صحة الرصيد المبين أدناه وإرسال الرد مباشرة إلى مكتب مراقب الحسابات.
          </p>
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-black">
            <span>الرصيد الدفتري المحسوب من سجلات {activeClient.name}:</span>
            <span className="font-mono text-indigo-700 text-sm">{formatEgyptianCurrency(computedBalance, true)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
            <span>
              حالة الرد:{' '}
              <strong>
                {replyVerdict === 'MATCHED'
                  ? 'تم استلام الرد: مطابق'
                  : replyVerdict === 'DISCREPANCY'
                  ? 'تم استلام الرد: يوجد خلاف جاري تسويته'
                  : 'لم يرد استنتاج بعد (قيد الانتظار)'}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
              <Building2 className="w-3.5 h-3.5" /> معيار المراجعة المصري رقم (505)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
