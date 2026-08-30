import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Users,
  ShieldCheck,
  Laptop,
  Key,
  ShieldAlert,
  Database,
  Sparkles,
  Lock,
  KeyRound,
  CheckCircle2,
  Check,
  Sliders,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { AuditTrailView } from '../AuditTrailView';
import { BackupExportModal } from '../BackupExportModal';
import { UserManagerModal } from '../UserManagerModal';
import { DeviceLockModal } from '../DeviceLockModal';
import { PurgeDatabaseModal } from '../PurgeDatabaseModal';
import { AccessRestrictedGate } from '../AccessRestrictedGate';

export type SecurityAuditSubTab = 'AUDIT_TRAIL' | 'BACKUP_EXPORT' | 'USERS_DEVICES';

interface SecurityAuditHubViewProps {
  state: DatabaseState;
  initialSubTab?: SecurityAuditSubTab;
}

export const SecurityAuditHubView: React.FC<SecurityAuditHubViewProps> = ({
  state,
  initialSubTab = 'AUDIT_TRAIL',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SecurityAuditSubTab>(initialSubTab);
  const [auditUnlocked, setAuditUnlocked] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);

  const currentUser = db.getCurrentUser();

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const canAccessAudit = currentUser.role === 'ADMIN' || currentUser.canAccessAuditTrail || auditUnlocked;

  const tabs: {
    id: SecurityAuditSubTab;
    label: string;
    description: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'AUDIT_TRAIL',
      label: 'سجل الرقابة والتدقيق (Audit)',
      description: 'تتبع كافة العمليات والمستخدمين والتعديلات والترحيلات',
      icon: History,
      badge: `${state.auditLogs.length} حركة`,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    {
      id: 'BACKUP_EXPORT',
      label: 'النسخ الاحتياطي والترحيل',
      description: 'تصدير واستيراد قواعد البيانات المشفرة وملفات الإكسل والـ JSON',
      icon: Download,
      badge: 'مشفر',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'USERS_DEVICES',
      label: 'المستخدمين والأجهزة المعتمدة',
      description: 'مصفوفة الصلاحيات (RBAC)، قفل الأجهزة، وحماية البيانات',
      icon: Users,
      badge: 'أمان عالي',
      badgeColor: 'bg-slate-800 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Top Navigation Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مركز الرقابة والأمان وإدارة البيانات</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-slate-700">
                  Security & Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                سجل الرقابة المهني الصارم، النسخ الاحتياطي التلقائي والمشفر، إدارة صلاحيات المستخدمين وربط الأجهزة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>أخذ نسخة احتياطية فورية</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border-slate-800 text-white shadow-xs ring-1 ring-slate-700'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white' : 'text-slate-900'}`}>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tab.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] line-clamp-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'AUDIT_TRAIL' && (
          canAccessAudit ? (
            <AuditTrailView state={state} />
          ) : (
            <AccessRestrictedGate
              currentUser={currentUser}
              targetTabName="سجل الرقابة والتدقيق (Audit Trail)"
              onOverrideSuccess={() => setAuditUnlocked(true)}
              onNavigateHome={() => setActiveSubTab('BACKUP_EXPORT')}
            />
          )
        )}

        {activeSubTab === 'BACKUP_EXPORT' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">النسخ الاحتياطي المشفر والاستعادة الآمنة</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      حفظ قاعدة البيانات بالكامل مع إمكانية الترحيل والاستيراد من وإلى صيغ Excel و JSON.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>فتح نافذة النسخ والاستيراد الشاملة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">إجمالي السجلات والبيانات:</span>
                  <span className="text-xl font-black text-slate-900">
                    {state.accounts.length + state.journalEntries.length + state.clients.length + state.invoices.length} سجل
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">تشمل الحسابات والقيود والعملاء والفواتير</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">آخر نسخة احتياطية:</span>
                  <span className="text-sm font-bold text-emerald-700">تلقائية لحظية</span>
                  <p className="text-[11px] text-slate-400 mt-1">تخزين محلي آمن ومشفر داخل المتصفح</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">حالة التشفير:</span>
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    AES-256 Protocol
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">محمية بالرمز السيادي Mg120</p>
                </div>
              </div>
            </div>

            {/* Danger Zone: Database Purge */}
            <div className="bg-red-50/60 rounded-2xl p-5 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900">إعادة ضبط وتفريغ قاعدة البيانات</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    تفريغ كافة البيانات والبدء من الصفر (يتطلب كلمة المرور الرئيسية Mg120).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                تفريغ البيانات...
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'USERS_DEVICES' && (
          <div className="space-y-6">
            {/* Master Security PIN / Password Settings Toggle */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">سياسة طلب الرقم السري عند التعديل والحذف</h3>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        state.preferences?.securityAuthEnabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {state.preferences?.securityAuthEnabled ? 'مفعل (مطلوب كلمة سر)' : 'معطل (تعديل مباشر)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تحكم اختياري: يمكنك تفعيل أو إلغاء نافذة الرقم السري عند تعديل الفواتير، القيود اليومية، أو بيانات العملاء.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newEnabled = !state.preferences?.securityAuthEnabled;
                      db.updatePreferences({
                        securityAuthEnabled: newEnabled,
                      });
                    }}
                    id="btn-toggle-security-auth"
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      state.preferences?.securityAuthEnabled
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {state.preferences?.securityAuthEnabled
                        ? 'إلغاء تفعيل التحقق بالرقم السري'
                        : 'تفعيل التحقق بالرقم السري'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-semibold">حالة التحقق الحالية:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    {state.preferences?.securityAuthEnabled ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700">يطلب الرقم السري قبل فتح أي تعديل</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">دخول وتعديل مباشر بدون طلب أرقام سرية</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-semibold">كلمة المرور المعتمدة:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                    {state.preferences?.customEditPassword || 'Mg120'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">(تقبل حروف كبيرة أو صغيرة مثل mg120 أو Mg120)</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-semibold">تأمين الباركود والشهادات:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مفعل ويعمل بكفاءة عبر التوقيع الرقمي</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">تشفير QR والختم الإلكتروني مستقل تماماً</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Multi-user RBAC Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">إدارة المستخدمين والصلاحيات (RBAC)</h3>
                      <p className="text-xs text-slate-500">تخصيص الأدوار، الأرقام السرية (PIN)، والصلاحيات المستقلة.</p>
                    </div>
                  </div>
                  <div className="space-y-2 py-3">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600">المستخدم الحالي:</span>
                      <span className="font-bold text-slate-900">{currentUser.name} ({currentUser.roleTitleArabic})</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600">صلاحية الخزنة:</span>
                      <span className={`font-bold ${currentUser.canAccessTreasury ? 'text-emerald-700' : 'text-red-700'}`}>
                        {currentUser.canAccessTreasury ? 'متاحة' : 'محجوبة'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsUserManagerOpen(true)}
                  className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إدارة المستخدمين والصلاحيات...
                </button>
              </div>

              {/* Device Locking & Anti-Theft */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">قفل وربط الأجهزة المعتمدة</h3>
                      <p className="text-xs text-slate-500">حماية المنظومة من السرقة والتشغيل على أجهزة غير مصرح بها.</p>
                    </div>
                  </div>
                  <div className="space-y-2 py-3">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600">نظام حماية البصمة:</span>
                      <span className="font-bold text-emerald-700">مفعل ونشط</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600">الرمز السيادي للترخيص:</span>
                      <span className="font-mono font-bold text-slate-900">Mg120</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeviceModalOpen(true)}
                  className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إدارة الأجهزة المصرح بها وقفل الجهاز...
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isBackupModalOpen && (
        <BackupExportModal state={state} onClose={() => setIsBackupModalOpen(false)} />
      )}
      {isUserManagerOpen && (
        <UserManagerModal isOpen={isUserManagerOpen} onClose={() => setIsUserManagerOpen(false)} state={state} />
      )}
      {isDeviceModalOpen && (
        <DeviceLockModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} isEnforced={false} />
      )}
      {isPurgeModalOpen && (
        <PurgeDatabaseModal isOpen={isPurgeModalOpen} onClose={() => setIsPurgeModalOpen(false)} />
      )}
    </div>
  );
};
