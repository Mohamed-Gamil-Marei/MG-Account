import React, { useState } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { TaxDeclarationRecord } from '../../types';
import { Calendar, FileText, ArrowRightLeft, KeyRound, Lock, Eye, Plus, Building2, ShieldCheck } from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { ClientTaxPortalCredentialsModal } from './ClientTaxPortalCredentialsModal';

export interface UnifiedTaxFilingAgendaViewProps {
  state: DatabaseState;
  onOpenPdfModal?: (decl: TaxDeclarationRecord) => void;
  onOpenInvoicesHarmonizer?: (clientId?: string) => void;
  onRefresh?: () => void;
}

export const UnifiedTaxFilingAgendaView: React.FC<UnifiedTaxFilingAgendaViewProps> = ({
  state,
  onOpenPdfModal,
  onOpenInvoicesHarmonizer,
  onRefresh,
}) => {
  const declarations = state.taxDeclarations || [];
  const activeClientId = state.activeClientContext?.clientId || state.clients[0]?.id || '';
  const [credentialsModalClientId, setCredentialsModalClientId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const handleSavedCredentials = () => {
    setTick((t) => t + 1);
    if (onRefresh) onRefresh();
  };

  const sortedClients = [...(state.clients || [])].sort((a, b) =>
    a.id === activeClientId ? -1 : b.id === activeClientId ? 1 : 0
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* القسم الأول: شاشة اليوزر نيم والباسورد لبوابة الضرائب والفاتورة الإلكترونية */}
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200 dark:border-slate-800 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                بيانات الدخول لبوابة الضرائب والفاتورة الإلكترونية (اليوزر نيم والباسورد)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                حفظ وعرض اسم المستخدم وكلمة المرور لبوابة الضرائب المصرية ومنظومة الفاتورة الإلكترونية (ETA) والـ Token PIN لكل شركة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCredentialsModalClientId(activeClientId)}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition"
          >
            <KeyRound className="w-4 h-4" />
            <span>فتح شاشة اليوزر نيم والباسورد للمنشأة النشطة</span>
          </button>
        </div>

        {/* بطاقات الشركات وبيانات البوابات الخاصة بها */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedClients.map((client) => {
            const isCurrent = client.id === activeClientId;
            const creds = (client as any).portalCredentials || {};
            const eta = (client as any).etaConfig || {};
            const taxUser = creds.taxPortalUsername || client.taxPortalEmail || '';
            const hasTaxPass = Boolean(creds.taxPortalPassword);
            const etaUser = creds.etaUsername || '';
            const hasEtaPass = Boolean(creds.etaPassword || eta.clientSecret || eta.clientSecret1);
            const hasPin = Boolean(eta.tokenPin || creds.etaTokenPin);

            return (
              <div
                key={client.id}
                className={`rounded-xl border p-4 transition ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{client.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                          المنشأة النشطة
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      رقم التسجيل الضريبي: {client.taxId || 'غير مسجل'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mb-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">يوزر بوابة الضرائب العامة:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {taxUser || 'لم يتم إدخاله بعد'}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      الباسورد: {hasTaxPass ? '•••••••• (محفوظ ومشفر)' : 'غير مسجل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">يوزر الفاتورة الإلكترونية (ETA):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {etaUser || eta.clientId || 'لم يتم إدخاله بعد'}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      الباسورد / PIN: {hasEtaPass || hasPin ? '•••••••• (محفوظ ومشفر)' : 'غير مسجل'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCredentialsModalClientId(client.id)}
                  className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>إدخال / إظهار اليوزر نيم والباسورد (الضرائب والفاتورة الإلكترونية)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* القسم الثاني: الأجندة الموحدة للإقرارات الضريبية */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                الأجندة الموحدة للإقرارات الضريبية وبيانات الدخول للبوابات
              </h2>
              <p className="text-xs text-slate-500">
                متابعة مواعيد تقديم الإقرارات الضريبية الشهرية والربع سنوية والسنوية لكافة الممولين
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCredentialsModalClientId(activeClientId)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-700"
            >
              <KeyRound className="w-4 h-4" />
              <span>اليوزر نيم والباسورد للضرائب</span>
            </button>
            {onOpenInvoicesHarmonizer && (
              <button
                type="button"
                onClick={() => onOpenInvoicesHarmonizer(state.activeClientContext?.clientId || undefined)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>مطابقة فواتير البوابة</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3">الممول / الشركة</th>
                <th className="p-3">نوع الإقرار</th>
                <th className="p-3">الفترة الضريبية</th>
                <th className="p-3">تاريخ الاستحقاق</th>
                <th className="p-3 text-center">صافي الضريبة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {declarations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    لا توجد إقرارات ضريبية مسجلة حالياً في الأجندة. يمكنك إدارة بيانات دخول بوابة الضرائب والفاتورة الإلكترونية من البطاقات أعلاه.
                  </td>
                </tr>
              ) : (
                declarations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold">{d.clientName || 'ممول مسجل'}</td>
                    <td className="p-3 font-mono">{d.declarationType}</td>
                    <td className="p-3">{d.period}</td>
                    <td className="p-3 font-mono">{d.dueDate}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {formatEgyptianCurrency(d.netPayable, true)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCredentialsModalClientId(d.clientId || activeClientId)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-700"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>بيانات البوابة</span>
                        </button>
                        {onOpenPdfModal && (
                          <button
                            type="button"
                            onClick={() => onOpenPdfModal(d)}
                            className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>معاينة الإقرار</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إدخال وعرض اليوزر نيم والباسورد للضرائب والفاتورة الإلكترونية */}
      <ClientTaxPortalCredentialsModal
        isOpen={Boolean(credentialsModalClientId)}
        onClose={() => setCredentialsModalClientId(null)}
        clientId={credentialsModalClientId || activeClientId}
        onSaved={handleSavedCredentials}
      />
    </div>
  );
};
