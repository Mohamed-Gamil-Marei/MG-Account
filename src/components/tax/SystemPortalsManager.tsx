import React, { useState, useMemo } from 'react';
import {
  Building2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Plus,
  Edit2,
  Lock,
  Unlock,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
} from 'lucide-react';
import {
  ClientArchiveRecord,
  SystemKind,
  SystemRegistrationStatus,
  ClientSystemRegistration,
  ClientSystemAction,
  SystemPortalUrlsConfig,
  DEFAULT_SYSTEM_PORTAL_URLS,
  SystemUser,
} from '../../types';
import { db } from '../../db/localDatabase';
import { canPerform } from '../../services/accessGuard';
import { getCairoDateString } from '../../utils/cairoTime';

export const TOKEN_ISSUER_SUGGESTIONS = [
  'شركة مصر للمقاصة والإيداع والقيد المركزي (MCDR)',
  'شركة الدلتا للأنظمة الإلكترونية',
  'شركة إيجيبت تراست (Egypt Trust)',
  'شركة فيكسد مصر للحلول الرقمية (Fixed Misr)',
];

export const SYSTEM_KIND_LABELS: Record<SystemKind, string> = {
  GENERAL_TAX: 'الضرائب العامة (المنظومة القديمة)',
  SAP: 'منظومة ساب الحديثة (ETA SAP)',
  PAYROLL_NEW: 'منظومة كسب العمل الموحدة (جديدة)',
  E_INVOICE: 'منظومة الفاتورة الإلكترونية',
  NAFEZA: 'منظومة نافذة - الجمارك (MTS Nafeza)',
};

export const SYSTEM_ACTION_TYPES: Record<SystemKind, string[]> = {
  GENERAL_TAX: [
    'تقديم إقرار ضريبة القيمة المضافة (نموذج 10)',
    'تقديم إقرار ضريبة الدخل السنوي (نموذج 101 / 105)',
    'تقديم نموذج 41 خصم وتحصيل',
    'تقديم نموذج 4 كسب عمل ربع سنوي',
    'سداد مدفوعة ضريبية',
    'طلب طعن أو إعادة فحص',
    'أخرى',
  ],
  SAP: [
    'تقديم إقرار القيمة المضافة (نموذج 10 - SAP)',
    'تقديم إقرار الدخل (نموذج 105 - SAP)',
    'تقديم نموذج 41 (خصم وتحصيل - SAP)',
    'سداد مطالبة ضريبية عبر المنظومة',
    'متابعة فحص ضريبي مميكن',
    'أخرى',
  ],
  PAYROLL_NEW: [
    'تقديم نموذج 4 كسب عمل الشهري / الربع سنوي',
    'سداد ضريبة كسب العمل',
    'التسوية السنوية لضريبة المرتبات',
    'رفع ملف شيت المرتبات الموحد',
    'سداد فروق فحص كسب عمل',
    'أخرى',
  ],
  E_INVOICE: [
    'إصدار فاتورة',
    'إلغاء فاتورة',
    'إشعار دائن',
    'إشعار مدين',
    'رفض فاتورة مستلمة',
    'تعديل فاتورة',
    'تجديد توكن الختم الإلكتروني',
    'أخرى',
  ],
  NAFEZA: [
    'طلب رقم قيد جمركي مبدئي (ACID)',
    'إصدار رقم ACID نهائي',
    'تعديل بيانات طلب ACID',
    'تجديد صلاحية ACID (+6 أشهر)',
    'إشعار شحن دولي',
    'طلب إفراج جمركي تحت التحفظ',
    'أخرى',
  ],
};

// =========================================================================
// 1. نافذة تعديل روابط البوابات (لا روابط صلبة في الكود)
// =========================================================================
export interface EditPortalUrlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: SystemUser | null;
  onSaved?: () => void;
}

export const EditPortalUrlsModal: React.FC<EditPortalUrlsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [urls, setUrls] = useState<SystemPortalUrlsConfig>(() => db.getSystemPortalUrls());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      db.updateSystemPortalUrls(urls, 'تعديل روابط بوابات المنظومات الضريبية والجمركية من الإعدادات');
      setSaveSuccess(true);
      setErrorMessage(null);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الروابط');
    }
  };

  const handleResetDefaults = () => {
    setUrls({ ...DEFAULT_SYSTEM_PORTAL_URLS });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              إعدادات روابط بوابات المنظومات الحكومية
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            يمكنك تخصيص الروابط المستخدمة عند النقر على زر "فتح البوابة" لكل منظومة بما يتوافق مع بيئة العمل والإنتاج:
          </p>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>تم حفظ وتحديث الروابط بنجاح في قاعدة البيانات وتسجيلها في سجل المراجعة.</span>
            </div>
          )}

          {(Object.keys(DEFAULT_SYSTEM_PORTAL_URLS) as SystemKind[]).map((kind) => (
            <div key={kind} className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {SYSTEM_KIND_LABELS[kind]}
              </label>
              <input
                type="url"
                value={urls[kind] || ''}
                onChange={(e) => setUrls((prev) => ({ ...prev, [kind]: e.target.value }))}
                dir="ltr"
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 underline cursor-pointer"
          >
            استعادة الروابط الافتراضية
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الروابط</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. نافذة إضافة إجراء سريع على المنظومة (ClientSystemAction)
// =========================================================================
export interface QuickAddSystemActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  client?: ClientArchiveRecord;
  kind: SystemKind;
  onActionAdded?: (action: ClientSystemAction) => void;
  onSaved?: (action: ClientSystemAction) => void;
}

export const QuickAddSystemActionModal: React.FC<QuickAddSystemActionModalProps> = ({
  isOpen,
  onClose,
  clientId: propClientId,
  clientName: propClientName,
  client,
  kind,
  onActionAdded,
  onSaved,
}) => {
  const clientId = propClientId || client?.id || '';
  const clientName = propClientName || client?.name || '';
  const [actionType, setActionType] = useState<string>(
    SYSTEM_ACTION_TYPES[kind]?.[0] || 'إجراء عام'
  );
  const [reference, setReference] = useState('');
  const [count, setCount] = useState<number | ''>(1);
  const [date, setDate] = useState(() => getCairoDateString());
  const [notes, setNotes] = useState('');

  // نافذة (جمارك) fields
  const [orderType, setOrderType] = useState<'SECURITY' | 'PERSONAL' | 'COMMERCIAL_INDUSTRIAL'>('COMMERCIAL_INDUSTRIAL');
  const [acidNumber, setAcidNumber] = useState('');
  const [stage, setStage] = useState<'PRELIMINARY' | 'FINAL' | 'REJECTED'>('PRELIMINARY');
  const [rejectionReason, setRejectionReason] = useState('');
  const [exporterName, setExporterName] = useState('');
  const [exporterCountry, setExporterCountry] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfArrival, setPortOfArrival] = useState('');
  const [issueDate, setIssueDate] = useState(() => getCairoDateString());
  const [expiryDate, setExpiryDate] = useState(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + 6);
    return today.toISOString().slice(0, 10);
  });
  const [shipmentStatus, setShipmentStatus] = useState('قيد الشحن الدولي');

  // Handle auto-calculating 6 months expiry when issueDate changes
  const handleIssueDateChange = (val: string) => {
    setIssueDate(val);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + 6);
        setExpiryDate(d.toISOString().slice(0, 10));
      }
    } catch {
      // keep current expiry
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let extra: Record<string, any> = {};

      if (kind === 'NAFEZA') {
        extra = {
          orderType,
          acidNumber: acidNumber.trim() || reference.trim(),
          stage,
          rejectionReason: stage === 'REJECTED' ? rejectionReason : undefined,
          exporterName,
          exporterCountry,
          portOfLoading,
          portOfArrival,
          issueDate,
          expiryDate,
          shipmentStatus,
        };
      }

      const created = db.addClientSystemAction(
        {
          clientId,
          kind,
          type: actionType,
          date: date || getCairoDateString(),
          reference: reference.trim() || (kind === 'NAFEZA' ? acidNumber : undefined),
          count: count !== '' ? Number(count) : undefined,
          notes: notes.trim() || undefined,
          extra: Object.keys(extra).length > 0 ? extra : undefined,
        },
        `تسجيل إجراء سريع على منظومة ${kind}: ${actionType}`
      );

      if (onActionAdded) {
        onActionAdded(created);
      }
      if (onSaved) {
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إضافة الإجراء');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                إضافة إجراء جديد على {SYSTEM_KIND_LABELS[kind]}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">{clientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع الإجراء *
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
              >
                {(SYSTEM_ACTION_TYPES[kind] || ['إجراء عام']).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                التاريخ (بتوقيت القاهرة) *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                الرقم المرجعي / المستند
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="مثال: REF-2026-001"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            {kind === 'E_INVOICE' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  عدد الفواتير / الإشعارات
                </label>
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* حقول نافذة الخاصة */}
          {kind === 'NAFEZA' && (
            <div className="p-3.5 bg-blue-50/50 dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Ship className="w-4 h-4" />
                <span>تفاصيل الشحنة وطلب نافذة الجمركي</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الطلب
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="COMMERCIAL_INDUSTRIAL">تجاري - صناعي</option>
                    <option value="PERSONAL">استخدام شخصي</option>
                    <option value="SECURITY">جهة أمنية / حكومية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم ACID *
                  </label>
                  <input
                    type="text"
                    value={acidNumber}
                    onChange={(e) => setAcidNumber(e.target.value)}
                    placeholder="رقم ACID المكون من 10 أرقام"
                    className="w-full px-2.5 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مرحلة الطلب
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="PRELIMINARY">رقم مبدئي</option>
                    <option value="FINAL">رقم نهائي معتمد</option>
                    <option value="REJECTED">مرفوض مع بيان السبب</option>
                  </select>
                </div>

                {stage === 'REJECTED' && (
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-red-600 mb-1">سبب الرفض *</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="بيان سبب رفض الطلب من قبل الجمارك أو جهة الفحص..."
                      className="w-full px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 rounded-lg text-red-900 dark:text-red-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المصدّر والدولة
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={exporterName}
                      onChange={(e) => setExporterName(e.target.value)}
                      placeholder="اسم المصدّر"
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                    <input
                      type="text"
                      value={exporterCountry}
                      onChange={(e) => setExporterCountry(e.target.value)}
                      placeholder="الدولة"
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ميناء الشحن والوصول
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={portOfLoading}
                      onChange={(e) => setPortOfLoading(e.target.value)}
                      placeholder="ميناء الشحن"
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                    <input
                      type="text"
                      value={portOfArrival}
                      onChange={(e) => setPortOfArrival(e.target.value)}
                      placeholder="ميناء الوصول"
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الإصدار
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => handleIssueDateChange(e.target.value)}
                    className="w-full px-2.5 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ انتهاء الصلاحية (+6 أشهر تلقائياً)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-bold text-blue-700 dark:text-blue-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة الشحنة
                  </label>
                  <input
                    type="text"
                    value={shipmentStatus}
                    onChange={(e) => setShipmentStatus(e.target.value)}
                    placeholder="مثال: تم الشحن / وصول الميناء / جاري الفحص / تم الإفراج"
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية بخصوص هذا الإجراء..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>تسجيل الإجراء</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. نافذة تسجيل / تعديل بيانات المنظومة للشركة (ClientSystemRegistration)
// =========================================================================
export interface RegisterClientSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientArchiveRecord;
  kind: SystemKind;
  existingRegistration?: ClientSystemRegistration;
  onSaved?: (registration: ClientSystemRegistration) => void;
  onSwitchToSap?: () => void;
}

export const RegisterClientSystemModal: React.FC<RegisterClientSystemModalProps> = ({
  isOpen,
  onClose,
  client,
  kind,
  existingRegistration,
  onSaved,
  onSwitchToSap,
}) => {
  const [status, setStatus] = useState<SystemRegistrationStatus>(
    existingRegistration?.status || 'REGISTERED'
  );
  const [username, setUsername] = useState(
    existingRegistration?.credentials?.username || ''
  );
  const [password, setPassword] = useState(
    existingRegistration?.credentials?.password || ''
  );
  const [registeredMobile, setRegisteredMobile] = useState(
    existingRegistration?.credentials?.registeredMobile || client.phone || ''
  );
  const [email, setEmail] = useState(
    existingRegistration?.credentials?.email || client.email || ''
  );
  const [notes, setNotes] = useState(
    existingRegistration?.credentials?.notes || ''
  );
  const [pinOtp, setPinOtp] = useState(
    existingRegistration?.credentials?.pinOtp || ''
  );

  // E_INVOICE extra
  const [hasToken, setHasToken] = useState<boolean>(
    existingRegistration?.extra?.hasToken ?? client.hasEsealToken ?? false
  );
  const [tokenIssuer, setTokenIssuer] = useState<string>(
    existingRegistration?.extra?.tokenIssuer ||
      client.tokenIssuer ||
      'شركة مصر للمقاصة والإيداع والقيد المركزي (MCDR)'
  );
  const [tokenSerial, setTokenSerial] = useState<string>(
    existingRegistration?.extra?.tokenSerial || client.tokenSerial || ''
  );
  const [tokenPin, setTokenPin] = useState<string>(
    existingRegistration?.extra?.tokenPin || client.tokenPin || ''
  );
  const [tokenExpiryDate, setTokenExpiryDate] = useState<string>(
    existingRegistration?.extra?.tokenExpiryDate || client.tokenExpiryDate || ''
  );
  const [issuerUsername, setIssuerUsername] = useState<string>(
    existingRegistration?.extra?.issuerUsername || ''
  );
  const [issuerPassword, setIssuerPassword] = useState<string>(
    existingRegistration?.extra?.issuerPassword || ''
  );

  // NAFEZA extra
  const [eSignatureEnabled, setESignatureEnabled] = useState<boolean>(
    existingRegistration?.extra?.eSignatureEnabled ?? client.hasEsealToken ?? false
  );
  const [registrantType, setRegistrantType] = useState<'IMPORTER' | 'CUSTOMS_CLEARER' | 'EXPORTER'>(
    existingRegistration?.extra?.registrantType || 'IMPORTER'
  );
  const [importerRegistrationNumber, setImporterRegistrationNumber] = useState<string>(
    existingRegistration?.extra?.importerRegistrationNumber || ''
  );
  const [authMethod, setAuthMethod] = useState<'ACCOUNT' | 'TOKEN'>(
    existingRegistration?.extra?.authMethod || (client.hasEsealToken ? 'TOKEN' : 'ACCOUNT')
  );

  // PAYROLL_NEW extra
  const [enrolledStatus, setEnrolledStatus] = useState<string>(
    existingRegistration?.extra?.enrolledStatus || 'ENROLLED'
  );
  const [enrolledDate, setEnrolledDate] = useState<string>(
    existingRegistration?.extra?.enrolledDate || getCairoDateString()
  );
  const [facilityNumber, setFacilityNumber] = useState<string>(
    existingRegistration?.extra?.facilityNumber || ''
  );

  // PAYROLL_NEW SAP dependency check:
  const isClientRegisteredInSap = useMemo(() => {
    const sapReg = db.getClientSystemRegistration(client.id, 'SAP');
    if (sapReg && sapReg.status === 'REGISTERED') return true;
    if (client.taxSystemType === 'SAP') return true;
    if (client.portalCredentials?.sapPortal?.username || client.portalCredentials?.sapTaxPortal?.username) return true;
    return false;
  }, [client.id, client.taxSystemType, client.portalCredentials]);

  const [proceedDespiteNoSap, setProceedDespiteNoSap] = useState(
    Boolean(existingRegistration?.extra?.sapDependencyAcknowledged)
  );
  const [sapBypassReason, setSapBypassReason] = useState<string>(
    existingRegistration?.extra?.sapBypassReason || ''
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check SAP dependency for PAYROLL_NEW
    if (kind === 'PAYROLL_NEW' && !isClientRegisteredInSap) {
      if (!proceedDespiteNoSap) {
        setErrorMessage(
          'تنبيه نظام: الشركة غير مسجلة في منظومة SAP. وفقاً لقواعد مصلحة الضرائب المصرية يجب التسجيل في SAP أولاً، أو اختيار المتابعة بسبب مكتوب.'
        );
        return;
      }
      if (!sapBypassReason.trim()) {
        setErrorMessage(
          'يرجى كتابة السبب المكتوب للمتابعة بتسجيل منظومة كسب العمل رغم عدم التسجيل في منظومة SAP.'
        );
        return;
      }
    }

    try {
      const extra: Record<string, any> = { ...(existingRegistration?.extra || {}) };

      if (kind === 'E_INVOICE') {
        extra.eInvoiceRegistered = status === 'REGISTERED';
        extra.hasToken = hasToken;
        if (hasToken) {
          extra.tokenIssuer = tokenIssuer;
          extra.tokenSerial = tokenSerial;
          extra.tokenPin = tokenPin;
          extra.tokenExpiryDate = tokenExpiryDate;
          extra.issuerUsername = issuerUsername;
          extra.issuerPassword = issuerPassword;
        }
      } else if (kind === 'NAFEZA') {
        extra.eSignatureEnabled = eSignatureEnabled;
        extra.registrantType = registrantType;
        extra.importerRegistrationNumber = importerRegistrationNumber.trim() || undefined;
        extra.authMethod = authMethod;
      } else if (kind === 'PAYROLL_NEW') {
        extra.enrolledStatus = enrolledStatus;
        extra.enrolledDate = enrolledDate;
        extra.facilityNumber = facilityNumber.trim() || undefined;
        extra.sapDependencyAcknowledged = !isClientRegisteredInSap;
        if (!isClientRegisteredInSap && sapBypassReason.trim()) {
          extra.sapBypassReason = sapBypassReason.trim();
        }
      }

      const regToSave: ClientSystemRegistration = {
        id: existingRegistration?.id || `reg-${client.id}-${kind}`,
        clientId: client.id,
        kind,
        status,
        registeredAt: status === 'REGISTERED' ? (existingRegistration?.registeredAt || getCairoDateString()) : undefined,
        credentials: {
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          email: email.trim() || undefined,
          registeredMobile: registeredMobile.trim() || undefined,
          notes: notes.trim() || undefined,
          pinOtp: pinOtp.trim() || undefined,
        },
        extra,
        updatedAt: new Date().toISOString(),
      };

      const auditReason =
        kind === 'PAYROLL_NEW' && !isClientRegisteredInSap && sapBypassReason.trim()
          ? `تحديث تسجيل المنظومة ${kind} للمنشأة (${client.name}) [سبب تجاوز SAP: ${sapBypassReason.trim()}]`
          : `تحديث تسجيل المنظومة ${kind} للمنشأة (${client.name})`;

      const saved = db.saveClientSystemRegistration(regToSave, auditReason);

      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ التسجيل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                تسجيل وتحديث بيانات المنظومة: {SYSTEM_KIND_LABELS[kind]}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">{client.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* تحذير شرط التسجيل في SAP لمنظومة كسب العمل */}
          {kind === 'PAYROLL_NEW' && !isClientRegisteredInSap && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    تنبيه: الشركة غير مسجلة في منظومة SAP!
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    وفقاً لتعليمات مصلحة الضرائب المصرية لمنظومة توحيد أسس ومعايير احتساب ضريبة الأجور والمرتبات، يلزم تسجيل الشركة بحساب على منظومة SAP أولاً لتفعيل التكامل المالي.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                {onSwitchToSap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToSap();
                    }}
                    className="px-3 py-1 rounded bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer shadow-xs"
                  >
                    التسجيل في SAP أولاً
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setProceedDespiteNoSap(true)}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                    proceedDespiteNoSap
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {proceedDespiteNoSap ? '✓ المتابعة بسبب مكتوب' : 'المتابعة بسبب مكتوب (استثناء)'}
                </button>
              </div>

              {proceedDespiteNoSap && (
                <div className="pt-2 space-y-1">
                  <label className="block text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                    السبب المكتوب للمتابعة بدون التسجيل في SAP *
                  </label>
                  <input
                    type="text"
                    value={sapBypassReason}
                    onChange={(e) => setSapBypassReason(e.target.value)}
                    placeholder="اكتب سبب التجاوز (مثال: جهة معفاة مؤقتاً أو التسجيل جارٍ بالمأمورية)..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-semibold"
                  />
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* حالة التسجيل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                حالة التسجيل بالمنظومة *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SystemRegistrationStatus)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
              >
                <option value="REGISTERED">مسجلة بالمنظومة (REGISTERED)</option>
                <option value="NOT_REGISTERED">غير مسجلة (NOT_REGISTERED)</option>
                <option value="PENDING">قيد التسجيل والربط (PENDING)</option>
                <option value="SUSPENDED">معلقة مؤقتاً (SUSPENDED)</option>
              </select>
            </div>

            {kind === 'PAYROLL_NEW' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  رقم المنشأة بالمنظومة (إن وُجد)
                </label>
                <input
                  type="text"
                  value={facilityNumber}
                  onChange={(e) => setFacilityNumber(e.target.value)}
                  placeholder="رقم المنشأة بمنظومة كسب العمل"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* بيانات الدخول السرية */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>بيانات الدخول وحساب المنظومة</span>
              <span className="text-[10px] text-slate-500 font-normal">
                (تتطلب صلاحية VIEW_PORTAL_SECRETS لإدخال أو تعديل كلمة المرور)
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المستخدم / البريد المسجل
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم"
                  className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور (مشفرة ومحمية)"
                  className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الهاتف المسجل بالمنظومة
                </label>
                <input
                  type="text"
                  value={registeredMobile}
                  onChange={(e) => setRegisteredMobile(e.target.value)}
                  placeholder="رقم الهاتف المسجل"
                  className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني المعتمد
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              {(kind === 'SAP' || kind === 'GENERAL_TAX') && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كود PIN / OTP
                  </label>
                  <input
                    type="text"
                    value={pinOtp}
                    onChange={(e) => setPinOtp(e.target.value)}
                    placeholder="رمز PIN أو OTP المخصص"
                    className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* الحقول الخاصة بالفاتورة الإلكترونية والختم الإلكتروني */}
          {kind === 'E_INVOICE' && (
            <div className="p-3.5 bg-blue-50/40 dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  <span>قسم الختم / التوقيع الإلكتروني (E-Seal Token)</span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    هل لدى الشركة توكن ختم إلكتروني؟
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasToken(!hasToken)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      hasToken
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {hasToken ? 'نعم (متاح توكن)' : 'لا'}
                  </button>
                </div>
              </div>

              {hasToken && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-blue-200 dark:border-slate-700">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الجهة المصدرة للتوكن
                    </label>
                    <input
                      type="text"
                      list="tokenIssuerList"
                      value={tokenIssuer}
                      onChange={(e) => setTokenIssuer(e.target.value)}
                      placeholder="اكتب اسم الجهة أو اختر من المقترحات (مثل مصر للمقاصة، مصر ترست)"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                    <datalist id="tokenIssuerList">
                      {TOKEN_ISSUER_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      السيريال (Token Serial)
                    </label>
                    <input
                      type="text"
                      value={tokenSerial}
                      onChange={(e) => setTokenSerial(e.target.value)}
                      placeholder="سيريال التوكن"
                      className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الرقم السري (Token PIN)
                    </label>
                    <input
                      type="text"
                      value={tokenPin}
                      onChange={(e) => setTokenPin(e.target.value)}
                      placeholder="PIN"
                      className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ انتهاء صلاحية التوكن
                    </label>
                    <input
                      type="date"
                      value={tokenExpiryDate}
                      onChange={(e) => setTokenExpiryDate(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-blue-700 dark:text-blue-300"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <p className="font-bold text-slate-600 dark:text-slate-400 mb-1.5 text-[11px]">
                      بيانات الدخول لحساب جهة إصدار التوكن (إن وُجدت):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={issuerUsername}
                        onChange={(e) => setIssuerUsername(e.target.value)}
                        placeholder="اسم المستخدم بحساب الجهة"
                        className="px-2.5 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                      />
                      <input
                        type="text"
                        value={issuerPassword}
                        onChange={(e) => setIssuerPassword(e.target.value)}
                        placeholder="كلمة المرور بحساب الجهة"
                        className="px-2.5 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الحقول الخاصة بمنظومة نافذة - الجمارك */}
          {kind === 'NAFEZA' && (
            <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-800/60 rounded-xl border border-indigo-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Ship className="w-4 h-4" />
                <span>إعدادات المسجل بمنظومة نافذة الجمركية</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    طريقة المصادقة والدخول
                  </label>
                  <select
                    value={authMethod}
                    onChange={(e) => setAuthMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="ACCOUNT">حساب دخول (اسم مستخدم وكلمة مرور)</option>
                    <option value="TOKEN">توكن الختم الإلكتروني المباشر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع المسجل بمنظومة نافذة *
                  </label>
                  <select
                    value={registrantType}
                    onChange={(e) => setRegistrantType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="IMPORTER">مستورد (Importer)</option>
                    <option value="CUSTOMS_CLEARER">مستخلص جمركي (Customs Clearer)</option>
                    <option value="EXPORTER">مصدّر (Exporter)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم تسجيل المستورد (اختياري)
                  </label>
                  <input
                    type="text"
                    value={importerRegistrationNumber}
                    onChange={(e) => setImporterRegistrationNumber(e.target.value)}
                    placeholder="رقم القيد بسجل المستوردين إن وُجد"
                    className="w-full px-2.5 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تفعيل التوقيع الإلكتروني بنافذة
                  </label>
                  <button
                    type="button"
                    onClick={() => setESignatureEnabled(!eSignatureEnabled)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      eSignatureEnabled
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {eSignatureEnabled ? '✓ التوقيع الإلكتروني مفعّل' : 'غير مفعّل'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              ملاحظات إضافية على المنظومة
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالتسجيل والتعامل مع البوابة..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التسجيل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
