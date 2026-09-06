import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { SystemUser, UserRole, NavigationTab } from '../types';

const ROLE_OPTIONS: { role: UserRole; title: string; desc: string }[] = [
  {
    role: 'ADMIN',
    title: 'مدير المنظومة والشريك المسؤول (المراجع القانوني)',
    desc: 'صلاحيات كاملة شاملة إعدادات المكتب، الأرصيد، الضرائب، إدارة الموظفين، والاعتماد النهائي',
  },
  {
    role: 'AUDITOR',
    title: 'مراقب حسابات ومراجع قانوني أول',
    desc: 'مراجعة وترحيل القيود، إصدار القوائم المالية وتقارير المراجعة وأوراق العمل والشهادات',
  },
  {
    role: 'ACCOUNTANT',
    title: 'محاسب مالي ومدخل قيود اليومية',
    desc: 'تسجيل قيود اليومية، العملاء، الفواتير، وإعداد مسودات الإقرارات الضريبية',
  },
  {
    role: 'SECRETARY',
    title: 'سكرتارية واستقبال وإدارة الملفات',
    desc: 'تسجيل المقبوضات والمصروفات بالخزنة، إصدار الفواتير والإيصالات، وتوثيق ملفات العملاء',
  },
];

const AVAILABLE_TABS: { tab: NavigationTab; label: string }[] = [
  { tab: 'DASHBOARD', label: 'لوحة القيادة والمؤشرات' },
  { tab: 'CHART_OF_ACCOUNTS', label: 'دليل الحسابات المصري' },
  { tab: 'JOURNAL_ENTRIES', label: 'دفتر القيود اليومية' },
  { tab: 'GENERAL_LEDGER', label: 'دفتر الأستاذ العام' },
  { tab: 'TRIAL_BALANCE', label: 'ميزان المراجعة' },
  { tab: 'FIXED_ASSETS', label: 'الأصول الثابتة والإهلاك' },
  { tab: 'FINANCIAL_STATEMENTS', label: 'القوائم المالية الختامية' },
  { tab: 'FINANCIAL_NOTES', label: 'الإيضاحات المتممة' },
  { tab: 'AUDITOR_REPORT', label: 'تقرير مراقب الحسابات' },
  { tab: 'AUDIT_WORKING_PAPERS', label: 'أوراق العمل وملفات المراجعة' },
  { tab: 'CREDIT_SIMULATOR', label: 'محاكي القوائم الائتمانية' },
  { tab: 'TAX_PENALTY_SIMULATOR', label: 'محاكي غرامات ومقابل تأخير الضرائب' },
  { tab: 'TAX_EXPOSURE_SIMULATOR', label: 'محاكي الفحص الضريبي' },
  { tab: 'ETA_RECONCILIATION', label: 'مطابقة منظومة الضرائب ETA' },
  { tab: 'PAYROLL_INSURANCE', label: 'المرتبات والتأمينات' },
  { tab: 'OFFICE_TREASURY', label: 'خزنة وحسابات المكتب' },
  { tab: 'CLIENTS_ARCHIVE', label: 'أرشيف وملفات العملاء' },
  { tab: 'TAX_TRACKER', label: 'متابعة الإقرارات والمواعيد' },
  { tab: 'CERTIFICATES', label: 'الشهادات المحاسبية المعتمدة' },
  { tab: 'FEASIBILITY_STUDY', label: 'دراسات الجدوى الاقتصادية' },
  { tab: 'INVOICING', label: 'الفواتير والإيصالات الإلكترونية' },
  { tab: 'AUDIT_TRAIL', label: 'سجل الرقابة والتتبع (Audit Trail)' },
];

export const UserManagementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser> | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsers(db.getUsers());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsNewUser(true);
    setEditingUser({
      name: '',
      email: '',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي ومدخل قيود اليومية',
      pinCode: '',
      avatarInitials: '',
      canAccessTreasury: false,
      canAccessAuditTrail: false,
      canManageUsers: false,
      canPostEntries: false,
      canEditPostedEntries: false,
      canDeleteRecords: false,
      canIssueInvoices: true,
      canModifySettings: false,
      restrictedTabs: ['AUDIT_TRAIL', 'OFFICE_TREASURY'],
    });
  };

  const handleStartEdit = (user: SystemUser) => {
    setIsNewUser(false);
    setEditingUser({ ...user });
  };

  const handleDelete = (userId: string, userName: string) => {
    if (userId === 'user-admin') {
      alert('لا يمكن حذف حساب المدير الرئيسي للمنظومة!');
      return;
    }
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب الموظف (${userName})؟`)) {
      db.deleteUser(userId);
      setUsers(db.getUsers());
    }
  };

  const handleRoleChange = (role: UserRole) => {
    const option = ROLE_OPTIONS.find((r) => r.role === role);
    if (!editingUser || !option) return;

    let defaults: Partial<SystemUser> = {
      role,
      roleTitleArabic: option.title,
    };

    if (role === 'ADMIN') {
      defaults = {
        ...defaults,
        canAccessTreasury: true,
        canAccessAuditTrail: true,
        canAccessCreditFiles: true,
        canAccessTaxReports: true,
        canManageUsers: true,
        canPostEntries: true,
        canEditPostedEntries: true,
        canDeleteRecords: true,
        canIssueInvoices: true,
        canModifySettings: true,
        restrictedTabs: [],
      };
    } else if (role === 'AUDITOR') {
      defaults = {
        ...defaults,
        canAccessTreasury: true,
        canAccessAuditTrail: true,
        canAccessCreditFiles: true,
        canAccessTaxReports: true,
        canManageUsers: false,
        canPostEntries: true,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        canIssueInvoices: true,
        canModifySettings: false,
        restrictedTabs: ['AUDIT_TRAIL'],
      };
    } else if (role === 'ACCOUNTANT') {
      defaults = {
        ...defaults,
        canAccessTreasury: false,
        canAccessAuditTrail: false,
        canAccessCreditFiles: true,
        canAccessTaxReports: true,
        canManageUsers: false,
        canPostEntries: false,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        canIssueInvoices: true,
        canModifySettings: false,
        restrictedTabs: ['AUDIT_TRAIL', 'OFFICE_TREASURY', 'AUDITOR_REPORT', 'AUDIT_WORKING_PAPERS'],
      };
    } else if (role === 'SECRETARY') {
      defaults = {
        ...defaults,
        canAccessTreasury: true,
        canAccessAuditTrail: false,
        canAccessCreditFiles: false,
        canAccessTaxReports: false,
        canManageUsers: false,
        canPostEntries: false,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        canIssueInvoices: true,
        canModifySettings: false,
        restrictedTabs: [
          'JOURNAL_ENTRIES',
          'GENERAL_LEDGER',
          'TRIAL_BALANCE',
          'FINANCIAL_STATEMENTS',
          'FINANCIAL_NOTES',
          'AUDITOR_REPORT',
          'AUDIT_WORKING_PAPERS',
          'TAX_EXPOSURE_SIMULATOR',
          'ETA_RECONCILIATION',
          'AUDIT_TRAIL',
          'CREDIT_SIMULATOR',
          'TAX_TRACKER',
        ],
      };
    }

    setEditingUser({ ...editingUser, ...defaults });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name?.trim()) {
      alert('يرجى كتابة اسم الموظف بالكامل');
      return;
    }

    if (isNewUser) {
      db.addUser(editingUser as any);
    } else if (editingUser.id) {
      db.updateUser(editingUser.id, editingUser);
    }

    setUsers(db.getUsers());
    setEditingUser(null);
    setIsNewUser(false);
    setSaveSuccessMsg('تم حفظ وتحديث بيانات الموظف بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div
      id="user-management-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="user-management-modal"
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-100 flex items-center gap-2">
                إدارة الموظفين وصلاحيات الوصول
              </h2>
              <p className="text-xs text-slate-400">
                التحكم في مستخدمي النظام، أرقام الـ PIN، وصلاحيات كل محاسب وموظف بالمكتب
              </p>
            </div>
          </div>

          <button
            id="close-user-management-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-950/40 px-6 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>قائمة موظفي المكتب والمستخدمين ({users.length})</span>
          </div>

          {!editingUser && (
            <button
              id="add-new-user-btn"
              onClick={handleStartAdd}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              إضافة موظف جديد
            </button>
          )}
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {editingUser ? (
            /* USER EDIT / CREATE FORM */
                <form onSubmit={handleSaveUser} className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                      {isNewUser ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                      {isNewUser ? 'إضافة موظف جديد للمنظومة' : `تعديل بيانات وصلاحيات: ${editingUser.name}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 bg-slate-800 rounded-lg"
                    >
                      إلغاء والعودة للقائمة
                    </button>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        اسم الموظف / المحاسب بالكامل: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingUser.name || ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            name: e.target.value,
                            avatarInitials: e.target.value.substring(0, 2),
                          })
                        }
                        placeholder="مثال: أ/ محمد محمود إبراهيم"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        البريد الإلكتروني المهني:
                      </label>
                      <input
                        type="email"
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        placeholder="employee@cpa-office.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        الدور الوظيفي والصلاحية:
                      </label>
                      <select
                        value={editingUser.role || 'ACCOUNTANT'}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.role} value={opt.role}>
                            {opt.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        الرمز السري لتسجيل الدخول (PIN Code):
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={editingUser.pinCode || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, pinCode: e.target.value })}
                          placeholder="مثال: 1234 أو كود أحرف وأرقام"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-400 font-mono focus:outline-none focus:border-amber-500 pl-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        إذا تم تركه فارغاً يستطيع الموظف تسجيل الدخول مباشرة دون رمز
                      </p>
                    </div>
                  </div>

                  {/* Granular Permissions Checklist */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-xs text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      محددات الصلاحيات الخاصة بالموظف:
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canAccessTreasury || false}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canAccessTreasury: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span>الوصول لخزنة وحسابات المكتب وسندات القبض والصرف</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canPostEntries || false}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canPostEntries: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span>صلاحية ترحيل قيود اليومية للأستاذ العام واعتمادها</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canAccessAuditTrail || false}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canAccessAuditTrail: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span>الاطلاع على سجل الرقابة والتتبع (Audit Trail)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canManageUsers || false}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canManageUsers: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span>إدارة الموظفين وتعديل الصلاحيات ورموز الـ PIN</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canAccessCreditFiles ?? true}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canAccessCreditFiles: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span className="text-amber-300 font-bold">الوصول إلى الملف الائتماني والتقارير المالية للعملاء</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUser.canAccessTaxReports ?? true}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, canAccessTaxReports: e.target.checked })
                          }
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span className="text-amber-300 font-bold">الوصول إلى الموقف الضريبي والتقارير الضريبية و ETA</span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Bar */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      id="save-user-btn"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
                    >
                      حفظ وتزامن بيانات الموظف
                    </button>
                  </div>
                </form>
              ) : (
                /* USERS CARDS GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((user) => {
                    const isCurrentUser = db.getCurrentUser().id === user.id;
                    return (
                      <div
                        key={user.id}
                        id={`user-card-${user.id}`}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isCurrentUser
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/5'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm">
                                {user.avatarInitials || user.name.substring(0, 2)}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                  {user.name}
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      الحساب الحالي
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-amber-400/90 font-medium">
                                  {user.roleTitleArabic}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEdit(user)}
                                title="تعديل"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user.id !== 'user-admin' && (
                                <button
                                  onClick={() => handleDelete(user.id, user.name)}
                                  title="حذف"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>الرمز السري (PIN):</span>
                              <span className="font-mono text-slate-300">
                                {user.pinCode ? '••••' : 'بدون رمز'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>الوصول للخزنة:</span>
                              <span>
                                {user.canAccessTreasury ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> متاح
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> محجوب
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>سجل المراقبة:</span>
                              <span>
                                {user.canAccessAuditTrail ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> متاح
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> محجوب
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                          <span>كود المستخدم: {user.id}</span>
                          <span>أنشئ: {user.createdAt.slice(0, 10)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
      </div>
    </div>
  );
};
