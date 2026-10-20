import React, { useState, useMemo } from 'react';
import {
  Building2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
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
  KeyRound,
  FileSpreadsheet,
  Clock,
  UserCheck,
  UserX,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ClientArchiveRecord,
  SystemKind,
  SystemRegistrationStatus,
  ClientSystemRegistration,
  ClientSystemAction,
  SystemUser,
} from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { canPerform } from '../../services/accessGuard';
import { getCairoDateString } from '../../utils/cairoTime';
import {
  EditPortalUrlsModal,
  QuickAddSystemActionModal,
  RegisterClientSystemModal,
  SYSTEM_KIND_LABELS,
} from './SystemPortalsManager';

export type SystemStatusFilter = 'ALL' | 'REGISTERED' | 'NOT_REGISTERED' | 'ALERTS';

export interface SystemPortalsTabPanelProps {
  kind: SystemKind;
  state: DatabaseState;
  currentUser?: SystemUser | null;
  visibleClients: ClientArchiveRecord[];
  onRefresh?: () => void;
  onOpenClientAuditFile?: (clientId: string) => void;
  onShowToast: (msg: string) => void;
  onSwitchToSap?: () => void;
}

export const SystemPortalsTabPanel: React.FC<SystemPortalsTabPanelProps> = ({
  kind,
  state,
  currentUser,
  visibleClients,
  onRefresh,
  onOpenClientAuditFile,
  onShowToast,
  onSwitchToSap,
}) => {
  const [statusFilter, setStatusFilter] = useState<SystemStatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

  // Password visibility tracking per client: clientId -> boolean
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [registerModalClient, setRegisterModalClient] = useState<ClientArchiveRecord | null>(null);
  const [registerSapClient, setRegisterSapClient] = useState<ClientArchiveRecord | null>(null);
  const [actionModalClient, setActionModalClient] = useState<ClientArchiveRecord | null>(null);
  const [isEditUrlsModalOpen, setIsEditUrlsModalOpen] = useState(false);

  // Get current portal URL dynamically from DB (no hardcoded links)
  const portalUrls = useMemo(() => db.getSystemPortalUrls(), [state.systemPortalUrls]);
  const currentPortalUrl = portalUrls[kind] || '#';

  // Toggle accordion
  const toggleAccordion = (clientId: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  // Helper to check if a client has alerts for this system
  const checkClientAlerts = (client: ClientArchiveRecord, reg?: ClientSystemRegistration) => {
    const alerts: string[] = [];
    const today = getCairoDateString();

    if (kind === 'E_INVOICE') {
      const hasToken = reg?.extra?.hasToken ?? client.hasEsealToken;
      const expiry = reg?.extra?.tokenExpiryDate || client.tokenExpiryDate;
      if (hasToken && expiry) {
        if (expiry < today) {
          alerts.push('توكن الختم الإلكتروني منتهي الصلاحية');
        } else {
          // Check if expiring within 30 days
          const diffDays = Math.ceil(
            (new Date(expiry).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
          );
          if (diffDays <= 30 && diffDays >= 0) {
            alerts.push(`توكن الختم ينتهي خلال ${diffDays} يوم`);
          }
        }
      }
      if (reg?.status === 'REGISTERED' && !reg.credentials.username && !hasToken) {
        alerts.push('مسجلة بدون بيانات دخول أو توكن');
      }
    } else if (kind === 'NAFEZA') {
      const actions = db.getClientSystemActions(client.id, 'NAFEZA');
      actions.forEach((act) => {
        if (act.extra?.stage === 'REJECTED') {
          alerts.push(`طلب شحنة مرفوض: ${act.extra?.acidNumber || act.reference}`);
        }
        if (act.extra?.expiryDate) {
          if (act.extra.expiryDate < today) {
            alerts.push(`صلاحية ACID منتهية: ${act.extra.acidNumber}`);
          } else {
            const diffDays = Math.ceil(
              (new Date(act.extra.expiryDate).getTime() - new Date(today).getTime()) /
                (1000 * 3600 * 24)
            );
            if (diffDays <= 30 && diffDays >= 0) {
              alerts.push(`صلاحية ACID تنتهي خلال ${diffDays} يوم: ${act.extra.acidNumber}`);
            }
          }
        }
      });
    } else if (kind === 'PAYROLL_NEW') {
      const isSap =
        client.taxSystemType === 'SAP' ||
        db.getClientSystemRegistration(client.id, 'SAP')?.status === 'REGISTERED' ||
        !!client.portalCredentials?.sapPortal?.username ||
        !!client.portalCredentials?.sapTaxPortal?.username;

      if (reg?.status === 'REGISTERED' && !isSap) {
        alerts.push('تنبيه: مسجلة في كسب العمل ولكن غير مسجلة في SAP');
      }
      if (reg?.status === 'PENDING') {
        alerts.push('طلب الانضمام قيد الانتظار');
      }
    }

    return alerts;
  };

  // Pre-calculate registration info and alerts for all visible clients
  const clientData = useMemo(() => {
    return visibleClients.map((client) => {
      const reg = db.getClientSystemRegistration(client.id, kind);
      const isRegistered = reg?.status === 'REGISTERED';
      const isPending = reg?.status === 'PENDING';
      const isNotRegistered = !reg || reg.status === 'NOT_REGISTERED';
      const alerts = checkClientAlerts(client, reg);
      const actions = db.getClientSystemActions(client.id, kind);

      return {
        client,
        reg,
        isRegistered,
        isPending,
        isNotRegistered,
        alerts,
        actions,
      };
    });
  }, [visibleClients, kind, state.clientSystemRegistrations, state.clientSystemActions]);

  // Statistics for this system
  const stats = useMemo(() => {
    let registeredCount = 0;
    let notRegisteredCount = 0;
    let pendingCount = 0;
    let alertsCount = 0;

    clientData.forEach((item) => {
      if (item.isRegistered) registeredCount++;
      else if (item.isPending) pendingCount++;
      else notRegisteredCount++;

      if (item.alerts.length > 0) alertsCount++;
    });

    return {
      total: clientData.length,
      registeredCount,
      notRegisteredCount,
      pendingCount,
      alertsCount,
    };
  }, [clientData]);

  // Filter clients
  const filteredData = useMemo(() => {
    return clientData.filter((item) => {
      // Status filter
      if (statusFilter === 'REGISTERED' && !item.isRegistered) return false;
      if (statusFilter === 'NOT_REGISTERED' && item.isRegistered) return false;
      if (statusFilter === 'ALERTS' && item.alerts.length === 0) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const code = (item.client.clientCode || '').toLowerCase();
        const name = (item.client.name || '').toLowerCase();
        const taxCard = (item.client.taxCardNo || '').toLowerCase();
        const regNo = (item.client.commercialRegisterNo || '').toLowerCase();
        const username = (item.reg?.credentials.username || '').toLowerCase();
        const impNo = (item.reg?.extra?.importerRegistrationNumber || '').toLowerCase();

        return (
          code.includes(query) ||
          name.includes(query) ||
          taxCard.includes(query) ||
          regNo.includes(query) ||
          username.includes(query) ||
          impNo.includes(query)
        );
      }

      return true;
    });
  }, [clientData, statusFilter, searchTerm]);

  // Security checks for revealing / copying password
  const handleTogglePassword = (clientId: string) => {
    const isCurrentlyVisible = !!visiblePasswords[clientId];
    if (isCurrentlyVisible) {
      // Hide password
      setVisiblePasswords((prev) => ({ ...prev, [clientId]: false }));
      return;
    }

    // Check permission
    if (!canPerform('VIEW_PORTAL_SECRETS', clientId, currentUser).allowed) {
      onShowToast('عفواً، لا تملك صلاحية الاطلاع على كلمات المرور والبوابات (VIEW_PORTAL_SECRETS)');
      return;
    }

    try {
      db.logPortalSecretAccess(clientId, kind, 'VIEW');
      setVisiblePasswords((prev) => ({ ...prev, [clientId]: true }));
      onShowToast('تم كشف كلمة المرور وتوثيق العملية في سجل المراجعة');
    } catch (err: any) {
      onShowToast(err.message || 'فشل كشف كلمة المرور لعدم وجود الصلاحية الكافية');
    }
  };

  const handleCopyPassword = (clientId: string, passwordText?: string) => {
    if (!passwordText) {
      onShowToast('لا توجد كلمة مرور مسجلة لنسخها');
      return;
    }

    if (!canPerform('VIEW_PORTAL_SECRETS', clientId, currentUser).allowed) {
      onShowToast('عفواً، لا تملك صلاحية نسخ كلمات المرور (VIEW_PORTAL_SECRETS)');
      return;
    }

    try {
      db.logPortalSecretAccess(clientId, kind, 'COPY');
      navigator.clipboard.writeText(passwordText);
      setCopiedKey(clientId);
      setTimeout(() => setCopiedKey(null), 2500);
      onShowToast('تم نسخ كلمة المرور إلى الحافظة وتوثيق العملية في سجل المراجعة');
    } catch (err: any) {
      onShowToast(err.message || 'فشل نسخ كلمة المرور');
    }
  };

  const handleCopyUsername = (username?: string) => {
    if (!username) return;
    navigator.clipboard.writeText(username);
    onShowToast('تم نسخ اسم المستخدم');
  };

  // Export CSV of registrations (NEVER exports passwords)
  const handleExportCsv = () => {
    const headers = [
      'كود المنشأة',
      'اسم المنشأة',
      'الرقم الضريبي',
      'حالة التسجيل بالمنظومة',
      'اسم المستخدم',
      'الهاتف المسجل',
      'البريد الإلكتروني',
      'ملاحظات',
      'عدد الإجراءات المسجلة',
    ];

    const rows = filteredData.map((item) => {
      const reg = item.reg;
      const statusLabel =
        reg?.status === 'REGISTERED'
          ? 'مسجلة'
          : reg?.status === 'PENDING'
          ? 'قيد الانتظار'
          : 'غير مسجلة';

      return [
        `"${item.client.clientCode || ''}"`,
        `"${item.client.name.replace(/"/g, '""')}"`,
        `"${item.client.taxCardNo || ''}"`,
        `"${statusLabel}"`,
        `"${reg?.credentials.username || ''}"`,
        `"${reg?.credentials.registeredMobile || ''}"`,
        `"${reg?.credentials.email || ''}"`,
        `"${(reg?.credentials.notes || '').replace(/"/g, '""')}"`,
        `"${item.actions.length}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `سجل_منظومة_${kind}_${getCairoDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('تم تصدير سجل المنظومة بنجاح (بدون كلمات المرور حفاظاً على السرية)');
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* رأس التبويب والأزرار السريعة والروابط */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {kind === 'NAFEZA' ? (
                <Ship className="w-5 h-5" />
              ) : kind === 'E_INVOICE' ? (
                <FileCheck className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {SYSTEM_KIND_LABELS[kind]}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  {stats.total} منشأة مصرح لك بالوصول إليها
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة بيانات التسجيل، التوكن، وإجراءات البوابة لجميع الشركات مع حماية وسرية بيانات الدخول.
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات السريعة: فتح البوابة، تعديل الروابط، تصدير */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* زر فتح البوابة المباشر (رابط قابل للتعديل لا روابط ثابتة) */}
            <a
              href={currentPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="فتح موقع المنظومة الرسمي في تبويب مستقل"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح البوابة الرسمية</span>
            </a>

            <button
              type="button"
              onClick={() => setIsEditUrlsModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="تعديل الروابط المعتمدة للمنظومات"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>تعديل الرابط</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* سطر العدادات والشارات الإحصائية في رأس التبويب */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>كافة الشركات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700 text-[10px]">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REGISTERED')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              statusFilter === 'REGISTERED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>مسجلة</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-[10px]">
              {stats.registeredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('NOT_REGISTERED')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              statusFilter === 'NOT_REGISTERED'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>غير مسجلة</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700 text-[10px]">
              {stats.notRegisteredCount + stats.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALERTS')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              statusFilter === 'ALERTS'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>تنبيهات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200/60 dark:bg-amber-900 text-[10px]">
              {stats.alertsCount}
            </span>
          </button>

          {/* شريط البحث السريع بالاسم أو الكود أو الرقم الضريبي */}
          <div className="relative flex-1 min-w-[200px] mr-auto">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، الكود، الرقم الضريبي، اسم المستخدم..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* جدول وسطور أشرطة الشركات تحت بعضها بنفس تصميم الأكورديون المنسدل */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* رأس الأعمدة التوجيهي */}
        <div className="hidden lg:grid grid-cols-12 gap-2.5 px-3 py-2 bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
          <div className="col-span-4 flex items-center gap-2">
            <span>المنشأة والكيان القانوني</span>
          </div>
          <div className="col-span-2">
            <span>الرقم الضريبي والمأمورية</span>
          </div>
          <div className="col-span-3">
            <span>حالة التسجيل وبيانات الدخول</span>
          </div>
          <div className="col-span-2">
            <span>الحقول الخاصة والتنبيهات</span>
          </div>
          <div className="col-span-1 text-left">
            <span>الإجراءات</span>
          </div>
        </div>

        {/* سطور الشركات مع تناوب الألوان ونفس تصميم الشريط المنسدل الحالي */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد منشآت تطابق الفلتر المحدد
              </p>
              <p className="text-xs text-slate-400 mt-1">
                جرب تغيير خيار التصفية أو مسح كلمة البحث للوصول لكافة المنشآت.
              </p>
            </div>
          ) : (
            filteredData.map(({ client, reg, isRegistered, isPending, isNotRegistered, alerts, actions }, index) => {
              const isExpanded = expandedClientIds.has(client.id);
              const isEven = index % 2 === 0;
              const hasPassword = !!reg?.credentials?.password;
              const isPasswordVisible = !!visiblePasswords[client.id];

              return (
                <div key={client.id} className="transition-colors">
                  {/* الشريط الأفقي الرئيسي للشركة */}
                  <div
                    onClick={() => toggleAccordion(client.id)}
                    className={`px-3 py-2 transition-colors cursor-pointer select-none ${
                      isExpanded
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60'
                        : isEven
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-2.5">
                      {/* عمود 1: سهم الفتح + اسم الشركة + الكود (4 أعمدة) */}
                      <div className="lg:col-span-4 flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                            isExpanded
                              ? 'bg-blue-600 text-white rotate-180'
                              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                          title={isExpanded ? 'طي تفاصيل المنظومة' : 'عرض تفاصيل المنظومة'}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {client.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {client.clientCode || 'بدون كود'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span>{client.companyType || 'شركة'}</span>
                            {client.taxOffice && (
                              <>
                                <span>•</span>
                                <span>{client.taxOffice}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* عمود 2: الرقم الضريبي (عمودان) */}
                      <div className="lg:col-span-2 min-w-0 text-xs">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {client.taxCardNo || 'غير مسجل'}
                        </span>
                      </div>

                      {/* عمود 3: حالة التسجيل وبيانات الدخول (3 أعمدة) */}
                      <div
                        className="lg:col-span-3 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isRegistered ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مسجلة</span>
                              </span>

                              {/* اسم المستخدم مع زر نسخ */}
                              {reg?.credentials?.username && (
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-800 dark:text-slate-200">
                                  <span className="truncate max-w-[110px]" title={reg.credentials.username}>
                                    {reg.credentials.username}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUsername(reg.credentials.username)}
                                    className="text-slate-400 hover:text-blue-600 cursor-pointer"
                                    title="نسخ اسم المستخدم"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* كلمة المرور مخفية مع زر عين وزر نسخ يخضعان لصلاحية VIEW_PORTAL_SECRETS */}
                            {hasPassword && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-slate-100">
                                  {isPasswordVisible ? reg.credentials.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePassword(client.id)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 cursor-pointer"
                                  title={isPasswordVisible ? 'إخفاء كلمة المرور' : 'كشف كلمة المرور (VIEW_PORTAL_SECRETS)'}
                                >
                                  {isPasswordVisible ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(client.id, reg.credentials.password)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 cursor-pointer"
                                  title="نسخ كلمة المرور مع توثيق في سجل المراجعة"
                                >
                                  {copiedKey === client.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>قيد الانتظار</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setRegisterModalClient(client)}
                              className="px-2 py-0.5 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              تعديل الطلب
                            </button>
                          </div>
                        ) : (
                          /* الشركة غير مسجلة: تظهر شارة غير مسجلة ودون حقول دخول وبزر تسجيلها */
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              غير مسجلة
                            </span>
                            <button
                              type="button"
                              onClick={() => setRegisterModalClient(client)}
                              className="px-2.5 py-1 rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>تسجيلها</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* عمود 4: الحقول الخاصة والتنبيهات (عمودان) */}
                      <div className="lg:col-span-2 min-w-0">
                        {alerts.length > 0 ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate" title={alerts.join(' | ')}>
                              {alerts[0]}
                            </span>
                          </div>
                        ) : kind === 'E_INVOICE' && reg?.extra?.hasToken ? (
                          <div className="text-[11px] text-blue-700 dark:text-blue-300 font-bold truncate">
                            ختم إلكتروني: {reg.extra.tokenIssuer?.slice(0, 15) || 'مصر ترست'}...
                          </div>
                        ) : kind === 'NAFEZA' && reg?.extra?.registrantType ? (
                          <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold truncate">
                            {reg.extra.registrantType === 'IMPORTER'
                              ? 'مستورد'
                              : reg.extra.registrantType === 'CUSTOMS_CLEARER'
                              ? 'مستخلص جمركي'
                              : 'مصدّر'}
                          </div>
                        ) : kind === 'PAYROLL_NEW' && reg?.extra?.facilityNumber ? (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono truncate">
                            منشأة: {reg.extra.facilityNumber}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </div>

                      {/* عمود 5: الإجراءات السريعة (عمود 1) */}
                      <div
                        className="lg:col-span-1 flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isRegistered && (
                          <button
                            type="button"
                            onClick={() => setActionModalClient(client)}
                            className="px-2 py-1 rounded bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="إضافة إجراء جديد بالمنظومة"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إجراء</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setRegisterModalClient(client)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 cursor-pointer"
                          title="تعديل بيانات التسجيل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* الشريط المنسدل المفصل (Accordion Content) */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                      {/* 1. بيانات الدخول المشفرة والملاحظات */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-blue-600" />
                            <span>بيانات الدخول لحساب المنظومة</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setRegisterModalClient(client)}
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل بيانات الحساب</span>
                          </button>
                        </div>

                        {isRegistered ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                            <div>
                              <span className="text-slate-400 block text-[10px]">اسم المستخدم:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                <span>{reg?.credentials?.username || 'غير مسجل'}</span>
                                {reg?.credentials?.username && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUsername(reg.credentials.username)}
                                    className="text-slate-400 hover:text-blue-600 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">كلمة المرور:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                <span>
                                  {hasPassword
                                    ? isPasswordVisible
                                      ? reg?.credentials?.password
                                      : '••••••••'
                                    : 'غير مسجلة'}
                                </span>
                                {hasPassword && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePassword(client.id)}
                                      className="text-slate-400 hover:text-blue-600 cursor-pointer"
                                      title="كشف كلمة المرور"
                                    >
                                      {isPasswordVisible ? (
                                        <EyeOff className="w-3 h-3" />
                                      ) : (
                                        <Eye className="w-3 h-3" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPassword(client.id, reg?.credentials?.password)}
                                      className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                                      title="نسخ كلمة المرور"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">الهاتف المسجل:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                {reg?.credentials?.registeredMobile || client.phone || 'غير مسجل'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">البريد الإلكتروني:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                {reg?.credentials?.email || client.email || 'غير مسجل'}
                              </span>
                            </div>

                            {reg?.credentials?.notes && (
                              <div className="sm:col-span-2 md:col-span-4 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                  ملاحظات المنظومة:
                                </span>
                                <p className="text-slate-700 dark:text-slate-300">
                                  {reg.credentials.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span>المنشأة غير مسجلة بعد على هذه المنظومة.</span>
                            <button
                              type="button"
                              onClick={() => setRegisterModalClient(client)}
                              className="px-3 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 cursor-pointer"
                            >
                              تسجيل المنشأة الآن
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 2. الحقول الخاصة بالمنظومة (extra) */}
                      {kind === 'E_INVOICE' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                          <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span>قسم الختم والتوقيع الإلكتروني (Token)</span>
                          </h4>

                          {reg?.extra?.hasToken ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                              <div>
                                <span className="text-slate-400 block text-[10px]">الجهة المصدرة:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                  {reg.extra.tokenIssuer || 'شركة مصر للمقاصة والإيداع (MCDR)'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">السيريال (Serial):</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                  {reg.extra.tokenSerial || 'غير محدد'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">الرقم السري (PIN):</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                  {reg.extra.tokenPin ? '••••' : 'غير مسجل'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">تاريخ انتهاء التوكن:</span>
                                <span
                                  className={`font-mono font-bold block mt-0.5 ${
                                    reg.extra.tokenExpiryDate &&
                                    reg.extra.tokenExpiryDate < getCairoDateString()
                                      ? 'text-rose-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {reg.extra.tokenExpiryDate || 'غير محدد'}
                                </span>
                              </div>

                              {(reg.extra.issuerUsername || reg.extra.issuerPassword) && (
                                <div className="sm:col-span-2 md:col-span-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                                  <span className="text-[11px] font-bold text-slate-500">
                                    حساب موقع جهة الإصدار:
                                  </span>
                                  <span className="font-mono text-xs">
                                    يوزر: {reg.extra.issuerUsername || '-'}
                                  </span>
                                  <span className="font-mono text-xs">
                                    باسورد: {reg.extra.issuerPassword ? '••••••••' : '-'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-xs">
                              الشركة مسجلة ولكن لا تمتلك توكن ختم إلكتروني خاص بها.
                            </div>
                          )}
                        </div>
                      )}

                      {kind === 'NAFEZA' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                          <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-indigo-600" />
                            <span>بيانات المسجل بمنظومة نافذة الجمركية</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                            <div>
                              <span className="text-slate-400 block text-[10px]">نوع المسجل:</span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300 block mt-0.5">
                                {reg?.extra?.registrantType === 'IMPORTER'
                                  ? 'مستورد (Importer)'
                                  : reg?.extra?.registrantType === 'CUSTOMS_CLEARER'
                                  ? 'مستخلص جمركي'
                                  : 'مصدّر (Exporter)'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">طريقة الدخول:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                {reg?.extra?.authMethod === 'TOKEN'
                                  ? 'توكن الختم الإلكتروني'
                                  : 'حساب مستخدم وكلمة مرور'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">رقم تسجيل المستورد (اختياري):</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                {reg?.extra?.importerRegistrationNumber || 'غير محدد'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">التوقيع الإلكتروني بنافذة:</span>
                              <span className="font-bold block mt-0.5 text-emerald-600">
                                {reg?.extra?.eSignatureEnabled ? '✓ مفعّل' : 'غير مفعّل'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {kind === 'PAYROLL_NEW' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                          <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            <span>بيانات منظومة كسب العمل الموحدة الجديدة</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                            <div>
                              <span className="text-slate-400 block text-[10px]">حالة الانضمام للمنظومة:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                                {reg?.extra?.enrolledStatus === 'ENROLLED'
                                  ? 'منضمة للمنظومة'
                                  : reg?.extra?.enrolledStatus || 'غير منضمة'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">تاريخ الانضمام:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                {reg?.extra?.enrolledDate || 'غير مسجل'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">رقم المنشأة بالمنظومة:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                {reg?.extra?.facilityNumber || 'غير مسجل'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. سجل الإجراءات والطلبات المنفذة (ClientSystemAction) */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>سجل العمليات والإجراءات المنفذة ({actions.length})</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setActionModalClient(client)}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة إجراء جديد</span>
                          </button>
                        </div>

                        {actions.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 text-center">
                            لم يتم توثيق أي إجراءات لهذه المنشأة على المنظومة حتى الآن.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] divide-y divide-slate-100 dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-500">
                                <tr>
                                  <th className="py-1.5 px-2 text-right">التاريخ (القاهرة)</th>
                                  <th className="py-1.5 px-2 text-right">نوع الإجراء</th>
                                  <th className="py-1.5 px-2 text-right">المرجع / ACID</th>
                                  {kind === 'NAFEZA' ? (
                                    <>
                                      <th className="py-1.5 px-2 text-right">نوع الطلب والمرحلة</th>
                                      <th className="py-1.5 px-2 text-right">المصدّر والموانئ</th>
                                      <th className="py-1.5 px-2 text-right">الصلاحية وحالة الشحنة</th>
                                    </>
                                  ) : (
                                    <th className="py-1.5 px-2 text-right">العدد</th>
                                  )}
                                  <th className="py-1.5 px-2 text-right">الملاحظات والتفاصيل</th>
                                  <th className="py-1.5 px-2 text-right">المستخدم المنفذ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {actions.map((act) => (
                                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <td className="py-1.5 px-2 font-mono">{act.date}</td>
                                    <td className="py-1.5 px-2 font-bold text-blue-700 dark:text-blue-300">
                                      {act.type}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono font-bold">
                                      {act.extra?.acidNumber || act.reference || '-'}
                                    </td>
                                    {kind === 'NAFEZA' ? (
                                      <>
                                        <td className="py-1.5 px-2">
                                          <div className="space-y-0.5">
                                            <span className="block font-semibold text-slate-700 dark:text-slate-300">
                                              {act.extra?.orderType === 'SECURITY'
                                                ? 'جهة أمنية'
                                                : act.extra?.orderType === 'PERSONAL'
                                                ? 'استخدام شخصي'
                                                : 'تجاري / صناعي'}
                                            </span>
                                            <span
                                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                act.extra?.stage === 'FINAL'
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : act.extra?.stage === 'REJECTED'
                                                  ? 'bg-rose-100 text-rose-700'
                                                  : 'bg-amber-100 text-amber-700'
                                              }`}
                                            >
                                              {act.extra?.stage === 'FINAL'
                                                ? 'رقم نهائي'
                                                : act.extra?.stage === 'REJECTED'
                                                ? `مرفوض (${act.extra?.rejectionReason || 'بدون سبب'})`
                                                : 'رقم مبدئي'}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-[10px]">
                                          {act.extra?.exporterName && (
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                              {act.extra.exporterName}
                                              {act.extra.exporterCountry ? ` (${act.extra.exporterCountry})` : ''}
                                            </div>
                                          )}
                                          {(act.extra?.portOfLoading || act.extra?.portOfArrival) && (
                                            <div className="text-slate-500">
                                              {act.extra.portOfLoading || '—'} ← {act.extra.portOfArrival || '—'}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-2 font-mono text-[10px]">
                                          {act.extra?.issueDate && (
                                            <div>إصدار: {act.extra.issueDate}</div>
                                          )}
                                          {act.extra?.expiryDate && (
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                              انتهاء: {act.extra.expiryDate}
                                            </div>
                                          )}
                                          {act.extra?.shipmentStatus && (
                                            <div className="font-sans font-semibold text-slate-600 dark:text-slate-300">
                                              {act.extra.shipmentStatus}
                                            </div>
                                          )}
                                        </td>
                                      </>
                                    ) : (
                                      <td className="py-1.5 px-2 font-bold">{act.count || 1}</td>
                                    )}
                                    <td className="py-1.5 px-2">
                                      <div className="max-w-xs space-y-0.5">
                                        {act.notes && <div>{act.notes}</div>}
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-slate-500">{act.performedBy}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {registerModalClient && (
        <RegisterClientSystemModal
          isOpen={true}
          onClose={() => setRegisterModalClient(null)}
          client={registerModalClient}
          kind={kind}
          existingRegistration={db.getClientSystemRegistration(registerModalClient.id, kind)}
          onSwitchToSap={() => {
            const targetClient = registerModalClient;
            setRegisterModalClient(null);
            setRegisterSapClient(targetClient);
            if (onSwitchToSap) onSwitchToSap();
          }}
          onSaved={() => {
            setRegisterModalClient(null);
            onShowToast('تم حفظ وتحديث بيانات التسجيل بنجاح وتوثيقها في سجل المراجعة');
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {registerSapClient && (
        <RegisterClientSystemModal
          isOpen={true}
          onClose={() => setRegisterSapClient(null)}
          client={registerSapClient}
          kind="SAP"
          existingRegistration={db.getClientSystemRegistration(registerSapClient.id, 'SAP')}
          onSaved={() => {
            const targetClient = registerSapClient;
            setRegisterSapClient(null);
            onShowToast('تم تسجيل المنشأة في منظومة SAP بنجاح، يمكنك الآن استكمال تسجيل كسب العمل');
            if (onRefresh) onRefresh();
            setRegisterModalClient(targetClient);
          }}
        />
      )}

      {actionModalClient && (
        <QuickAddSystemActionModal
          isOpen={true}
          onClose={() => setActionModalClient(null)}
          client={actionModalClient}
          kind={kind}
          onSaved={() => {
            setActionModalClient(null);
            onShowToast('تم توثيق الإجراء بنجاح في سجل المنظومة وسجل المراجعة');
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {isEditUrlsModalOpen && (
        <EditPortalUrlsModal
          isOpen={true}
          onClose={() => setIsEditUrlsModalOpen(false)}
          onSaved={() => {
            setIsEditUrlsModalOpen(false);
            onShowToast('تم تحديث روابط المنظومات بنجاح');
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
