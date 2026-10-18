import React, { useState, useEffect, useMemo } from 'react';
import {
  Account,
  AccountMappingFieldKey,
  ClientAccountMapping,
} from '../types';
import {
  DatabaseState,
  createDefaultClientAccountMapping,
  db,
} from '../db/localDatabase';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export interface AccountMappingViewProps {
  state: DatabaseState;
  onRefresh: () => void;
}

interface MappingFieldMeta {
  key: AccountMappingFieldKey;
  labelAr: string;
  descriptionAr: string;
  group: 'TREASURY_PARTNERS' | 'REVENUE_PURCHASES' | 'TAXES' | 'FX';
  recommendedCode: string;
}

const MAPPING_FIELDS_META: MappingFieldMeta[] = [
  {
    key: 'cashAccountCode',
    labelAr: 'حساب النقدية بالصندوق / الخزينة',
    descriptionAr: 'يُستخدم في الفواتير النقدية والتحصيل والسداد المباشر',
    group: 'TREASURY_PARTNERS',
    recommendedCode: '1101',
  },
  {
    key: 'receivablesAccountCode',
    labelAr: 'حساب العملاء والمدينين التجاريين',
    descriptionAr: 'يُستخدم في فواتير المبيعات الآجلة ومردودات المبيعات والإشعارات الدائنة والمدينة',
    group: 'TREASURY_PARTNERS',
    recommendedCode: '1103',
  },
  {
    key: 'payablesAccountCode',
    labelAr: 'حساب الموردين والدائنين التجاريين',
    descriptionAr: 'يُستخدم في فواتير المشتريات الآجلة ومردودات المشتريات',
    group: 'TREASURY_PARTNERS',
    recommendedCode: '2101',
  },
  {
    key: 'salesAccountCode',
    labelAr: 'حساب إيرادات المبيعات',
    descriptionAr: 'يُستخدم كطرف دائن في فواتير المبيعات (SALES) والإشعارات المدينة (DEBIT_NOTE)',
    group: 'REVENUE_PURCHASES',
    recommendedCode: '4101',
  },
  {
    key: 'officeServiceRevenueAccountCode',
    labelAr: 'حساب إيراد أتعاب المكتب والخدمات المهنية',
    descriptionAr: 'يُستخدم كإيراد دائن في فواتير أتعاب المكتب (OFFICE_SERVICE) وليس مصروفاً',
    group: 'REVENUE_PURCHASES',
    recommendedCode: '4120',
  },
  {
    key: 'purchasesAccountCode',
    labelAr: 'حساب المشتريات / تكلفة البضاعة والمستلزمات',
    descriptionAr: 'يُستخدم كطرف مدين في فواتير المشتريات (PURCHASE)',
    group: 'REVENUE_PURCHASES',
    recommendedCode: '5101',
  },
  {
    key: 'salesReturnsAccountCode',
    labelAr: 'حساب مردودات ومسموحات المبيعات',
    descriptionAr: 'يُستخدم كطرف مدين في مردودات المبيعات (RETURN_SALES) والإشعارات الدائنة (CREDIT_NOTE)',
    group: 'REVENUE_PURCHASES',
    recommendedCode: '4102',
  },
  {
    key: 'purchaseReturnsAccountCode',
    labelAr: 'حساب مردودات ومسموحات المشتريات',
    descriptionAr: 'يُستخدم كطرف دائن في مردودات المشتريات (RETURN_PURCHASE)',
    group: 'REVENUE_PURCHASES',
    recommendedCode: '5102',
  },
  {
    key: 'vatOutputAccountCode',
    labelAr: 'حساب ضريبة القيمة المضافة (مخرجات - مبيعات)',
    descriptionAr: 'دائن في المبيعات والإشعارات المدينة، ومدين عند رد الضريبة في مردودات المبيعات والإشعارات الدائنة',
    group: 'TAXES',
    recommendedCode: '2104',
  },
  {
    key: 'vatInputAccountCode',
    labelAr: 'حساب ضريبة القيمة المضافة (مدخلات - مشتريات)',
    descriptionAr: 'مدين في فواتير المشتريات، ودائن عند رد الضريبة في مردودات المشتريات',
    group: 'TAXES',
    recommendedCode: '1105',
  },
  {
    key: 'whtReceivableAccountCode',
    labelAr: 'حساب ضريبة الخصم والإضافة (مدينة - مستقطعة لصالح المنشأة)',
    descriptionAr: 'الأرصدة المدينة لضريبة الخصم والتحصيل المستقطعة من فواتير المبيعات وأتعاب المكتب (1% أو 3% أو 5%)',
    group: 'TAXES',
    recommendedCode: '1106',
  },
  {
    key: 'whtPayableAccountCode',
    labelAr: 'حساب ضريبة الخصم والإضافة (دائنة - مستقطعة من الموردين)',
    descriptionAr: 'الأرصدة الدائنة لضريبة الخصم والتحصيل المستقطعة من فواتير الموردين لتوريدها لمصلحة الضرائب',
    group: 'TAXES',
    recommendedCode: '2105',
  },
  {
    key: 'tableTaxAccountCode',
    labelAr: 'حساب ضريبة الجدول',
    descriptionAr: 'يُستخدم عند إدراج ضريبة جدول منفصلة على الفواتير الخاضعة لقانون 67 لسنة 2016',
    group: 'TAXES',
    recommendedCode: '2106',
  },
  {
    key: 'fxGainAccountCode',
    labelAr: 'حساب أرباح فروق العملة الأجنبية',
    descriptionAr: 'يُستخدم تلقائياً عند سداد أو تحصيل فواتير بعملات أجنبية بسعر صرف يحقق فائضاً للمنشأة',
    group: 'FX',
    recommendedCode: '4201',
  },
  {
    key: 'fxLossAccountCode',
    labelAr: 'حساب خسائر فروق العملة الأجنبية',
    descriptionAr: 'يُستخدم تلقائياً عند سداد أو تحصيل فواتير بعملات أجنبية بسعر صرف يحقق عجزاً على المنشأة',
    group: 'FX',
    recommendedCode: '5301',
  },
];

export const AccountMappingView: React.FC<AccountMappingViewProps> = ({
  state,
  onRefresh,
}) => {
  const activeClientId = state.activeClientContext?.clientId || '';
  const activeClient = state.clients.find((c) => c.id === activeClientId);

  const clientAccounts = useMemo(() => {
    if (!activeClientId) return [];
    return (state.accounts || []).filter((a) => a.clientId === activeClientId);
  }, [state.accounts, activeClientId]);

  const analyticalAccounts = useMemo(() => {
    return clientAccounts.filter((acc) => {
      if (acc.isActive === false) return false;
      const isSummaryParent =
        (acc.level !== undefined && acc.level <= 2) ||
        clientAccounts.some(
          (child) =>
            child.id !== acc.id &&
            (child.parentId === acc.id || child.parentCode === acc.code)
        );
      return !isSummaryParent;
    });
  }, [clientAccounts]);

  const storedMapping = useMemo(() => {
    if (!activeClientId) return null;
    return (
      state.accountMappings?.[activeClientId] ||
      createDefaultClientAccountMapping(activeClientId)
    );
  }, [state.accountMappings, activeClientId]);

  const [formMapping, setFormMapping] = useState<ClientAccountMapping | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (storedMapping) {
      setFormMapping({ ...storedMapping });
      setStatusBanner(null);
    } else {
      setFormMapping(null);
    }
  }, [storedMapping, activeClientId]);

  if (!activeClientId || !activeClient || !formMapping) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="text-base font-black text-amber-900 dark:text-amber-200">
          يجب اختيار العميل (المنشأة النشطة) أولاً
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          شاشة ربط الحسابات معزولة لكل منشأة على حدة. يرجى اختيار المنشأة من شريط السياق العلوي.
        </p>
      </div>
    );
  }

  const handleFieldChange = (key: AccountMappingFieldKey, value: string) => {
    setFormMapping((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatusBanner(null);
  };

  const handleSave = () => {
    setStatusBanner(null);
    try {
      const { clientId: _cid, updatedAt: _uAt, updatedBy: _uBy, ...mappingPayload } = formMapping;
      db.setClientAccountMapping(
        activeClientId,
        mappingPayload,
        `حفظ إعدادات ربط الحسابات المحاسبية للمنشأة (${activeClient.name})`
      );
      setStatusBanner({
        type: 'success',
        message: `تم حفظ ربط الحسابات المحاسبية للمنشأة (${activeClient.name}) والتحقق من أن جميع الحسابات المربوطة تحليلية وفعّالة.`,
      });
      onRefresh();
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر حفظ ربط الحسابات.',
      });
    }
  };

  const handleResetToDefault = () => {
    setStatusBanner(null);
    try {
      const defaults = createDefaultClientAccountMapping(activeClientId);
      const { clientId: _cid, ...payload } = defaults;
      const saved = db.setClientAccountMapping(
        activeClientId,
        payload,
        `استعادة الربط القياسي الافتراضي لحسابات المنشأة (${activeClient.name})`
      );
      setFormMapping({ ...saved });
      setStatusBanner({
        type: 'success',
        message: 'تمت استعادة الربط الافتراضي القياسي لدليل الحسابات المصري بنجاح.',
      });
      onRefresh();
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر استعادة الربط الافتراضي.',
      });
    }
  };

  const renderGroupSection = (
    groupKey: MappingFieldMeta['group'],
    title: string,
    subtitle: string
  ) => {
    const fields = MAPPING_FIELDS_META.filter((f) => f.group === groupKey);
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => {
            const currentCode = String(formMapping[field.key] || '').trim();
            const matchedAcc: Account | undefined = clientAccounts.find(
              (a) => a.code === currentCode
            );
            const isValidAnalytical = Boolean(
              matchedAcc &&
                matchedAcc.isActive !== false &&
                analyticalAccounts.some((a) => a.id === matchedAcc.id)
            );

            return (
              <div
                key={field.key}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isValidAnalytical
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                    : 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <label className="block text-xs font-black text-slate-900 dark:text-white">
                      {field.labelAr}
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">{field.descriptionAr}</p>
                  </div>
                  {isValidAnalytical ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      مربوط ({currentCode})
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      غير مربوط
                    </span>
                  )}
                </div>

                <select
                  aria-label={field.labelAr}
                  value={currentCode}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- اختر حساباً تحليلياً من دليل العميل --</option>
                  {analyticalAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} — {acc.name} ({acc.nature === 'DEBIT' ? 'مدين' : 'دائن'})
                    </option>
                  ))}
                </select>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>الكود القياسي المقترح: {field.recommendedCode}</span>
                  {!isValidAnalytical && (
                    <span className="text-rose-600 font-bold">
                      سيتم رفض ترحيل الفواتير المرتبطة بهذا الحساب حتى يتم ربطه
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                ربط الحسابات المحاسبية للمنشأة (محرك الترحيل الآلي)
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {activeClient.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              يمنع محرك الترحيل استخدام أي حساب بديل مختلف المعنى (No Fallback). في حال عدم ربط الحساب المطلوب أو كونه غير تحليلي، يُرفض الترحيل برسالة خطأ واضحة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الأكواد القياسية
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            حفظ ربط الحسابات
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {renderGroupSection(
        'TREASURY_PARTNERS',
        '1. حسابات الخزينة والعملاء والموردين',
        'الحسابات التحليلية لأطراف التسوية النقدية والآجلة'
      )}

      {renderGroupSection(
        'REVENUE_PURCHASES',
        '2. حسابات المبيعات والمشتريات والمردودات وإيراد أتعاب المكتب',
        'تشمل المبيعات، المشتريات، مردودات المبيعات، مردودات المشتريات، وإيراد أتعاب المكتب المهنية'
      )}

      {renderGroupSection(
        'TAXES',
        '3. حسابات الضرائب (القيمة المضافة، الخصم والإضافة، وضريبة الجدول)',
        'ضريبة القيمة المضافة مخرجات ومدخلات، ضريبة الخصم والإضافة مدينة ودائنة، وضريبة الجدول'
      )}

      {renderGroupSection(
        'FX',
        '4. حسابات فروق تقييم وسداد العملات الأجنبية',
        'تُستخدم تلقائياً عند سداد أو تحصيل فواتير بعملات أجنبية بسعر صرف مختلف عن تاريخ الإصدار'
      )}
    </div>
  );
};
