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
  RefreshCw,
  Sliders,
  ShieldAlert,
  Key,
  Cpu,
  FileCheck2,
  Laptop,
  Check,
  UserX,
  UserCheck,
} from 'lucide-react';
import { db } from '../db/localDatabase';
import { SystemUser, UserRole, NavigationTab } from '../types';

const ROLE_OPTIONS: { role: UserRole; title: string; desc: string }[] = [
  {
    role: 'ADMIN',
    title: 'مدير المنظومة والشريك المسؤول (المراجع القانوني)',
    desc: 'صلاحيات سيادية كاملة شاملة تغيير الباسوردات، فك الحماية، السريالات، وإدارة المستخدمين',
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
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'SOVEREIGN_COMMANDS' | 'SERIALS' | 'AUDIT_LOGS'>('USERS');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser> | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quick Password Change Dialog State
  const [passwordChangeTarget, setPasswordChangeTarget] = useState<SystemUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Serials State
  const [serials, setSerials] = useState({
    systemSerial: '',
    activationKey: '',
    licenseNumber: '',
    taxAuthorityRegNo: '',
  });

  // Admin Access Verification
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = () => {
    setUsers(db.getUsers());
    const currentSerials = db.getSystemSerials();
    setSerials(currentSerials);
  };

  if (!isOpen) return null;

  // 1. If not admin, show strict sovereign gate
  if (!isAdmin) {
    return (
      <div
        id="user-management-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
        dir="rtl"
      >
        <div
          id="sovereign-restricted-gate"
          className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center text-slate-100 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <h3 className="text-xl font-bold text-slate-100 mb-2">
            لوحة التحكم محصورة باليوزر الرئيسي (admin)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            كافة الأوامر الإدارية، تغيير كلمات المرور، الحظر، فك الحماية، وتعديل السريالات تخضع حصرياً للمدير الرئيسي للمنظومة (<span className="text-amber-400 font-mono font-bold">admin</span>).
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-6 text-right space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">المستخدم الحالي:</span>
              <span className="font-bold text-slate-200">{currentUser.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">مستوى الصلاحية:</span>
              <span className="text-rose-400 font-semibold">{currentUser.roleTitleArabic}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="close-sovereign-gate-btn"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              id="switch-to-admin-btn"
              onClick={() => {
                onClose();
                // Find admin user and prompt login
                const adminUser = db.getUsers().find((u) => u.id === 'user-admin' || u.role === 'ADMIN');
                if (adminUser) {
                  db.switchUser('user-admin');
                  window.location.reload();
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <KeyRound className="w-4 h-4" />
              الدخول كمدير المنظومة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Add New User
  const handleStartAdd = () => {
    setIsNewUser(true);
    setEditingUser({
      name: '',
      username: '',
      employeeCode: `EMP-00${users.length + 1}`,
      email: '',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي ومدخل قيود اليومية',
      pinCode: '',
      password: '',
      avatarInitials: '',
      isActive: true,
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

  // Handle Start Edit
  const handleStartEdit = (user: SystemUser) => {
    setIsNewUser(false);
    setEditingUser({
      ...user,
      isActive: user.isActive ?? true,
    });
  };

  // Handle Quick Password Change
  const handleOpenPasswordChange = (user: SystemUser) => {
    setPasswordChangeTarget(user);
    setNewPasswordValue(user.pinCode || user.password || '');
    setShowNewPassword(false);
  };

  const handleSavePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeTarget) return;

    const res = db.changeUserPassword(passwordChangeTarget.id, newPasswordValue);
    if (res.success) {
      setSaveSuccessMsg(res.message);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      setPasswordChangeTarget(null);
      refreshData();
    } else {
      alert(res.message);
    }
  };

  // Handle Quick Block / Unblock
  const handleToggleBlock = (user: SystemUser) => {
    if (user.id === 'user-admin' || user.username === 'admin') {
      alert('لا يمكن حظر حساب المدير الرئيسي للمنظومة!');
      return;
    }

    const actionText = user.isActive === false ? 'فك حظر وتفعيل' : 'حظر وتعطيل';
    if (window.confirm(`هل أنت متأكد من ${actionText} حساب المستخدم (${user.name})؟`)) {
      const res = db.toggleUserActive(user.id);
      if (res.success) {
        setSaveSuccessMsg(res.message);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        refreshData();
      }
    }
  };

  // Handle Delete User
  const handleDelete = (userId: string, userName: string) => {
    if (userId === 'user-admin') {
      alert('لا يمكن حذف حساب المدير الرئيسي للمنظومة!');
      return;
    }
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب الموظف (${userName}) نهائياً؟`)) {
      db.deleteUser(userId);
      refreshData();
      setSaveSuccessMsg(`تم حذف حساب الموظف (${userName}) بنجاح.`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  // Handle Unprotect All Closed Periods
  const handleUnprotectAllPeriods = () => {
    if (window.confirm('أمر سيادي: هل تؤكد فك الحماية وإلغاء كافة أقفال الفترات المحاسبية والسنوات المالية المقفلة؟\nسيمكنك تعديل أي قيد أو فترة سابقة.')) {
      const res = db.unprotectAllFiscalPeriods();
      setSaveSuccessMsg(res.message);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Handle Reset Device Security Binding
  const handleResetDeviceBinding = () => {
    if (window.confirm('أمر سيادي: هل تؤكد فك حماية وربط الأجهزة والترخيص المحلي؟\nسيتيح ذلك استخدام المنظومة بحرية على أي متصفح أو جهاز.')) {
      const res = db.resetDeviceSecurityBindings();
      setSaveSuccessMsg(res.message);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Handle Generate New Serial
  const handleGenerateRandomSerial = () => {
    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSerial = `CPA-${new Date().getFullYear()}-${randPart1}-${randPart2}-PRO-EGY`;
    const newKey = `ACT-CPA-${Math.floor(10000 + Math.random() * 90000)}-EGY-${randPart2}`;
    setSerials((prev) => ({
      ...prev,
      systemSerial: newSerial,
      activationKey: newKey,
    }));
  };

  // Handle Save Serials
  const handleSaveSerials = (e: React.FormEvent) => {
    e.preventDefault();
    const res = db.updateSystemSerials(serials);
    setSaveSuccessMsg(res.message);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    refreshData();
  };

  // Handle Role Change in Edit Form
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

    refreshData();
    setEditingUser(null);
    setIsNewUser(false);
    setSaveSuccessMsg('تم حفظ وتحديث بيانات وصلاحيات المستخدم بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div
      id="user-management-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="user-management-modal"
        className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Sovereign Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-slate-100">
                  لوحة التحكم والسيادة الإدارية الكاملة
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                  MASTER ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                جميع الأوامر تخضع لليوزر الرئيسي (admin): إدارة المستخدمين، تغيير أي باسورد، الحظر، فك الحماية، وتغيير السريالات
              </p>
            </div>
          </div>

          <button
            id="close-user-management-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-6 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            id="tab-btn-users"
            onClick={() => {
              setActiveSubTab('USERS');
              setEditingUser(null);
            }}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'USERS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة الحسابات والموظفين ({users.length})</span>
          </button>

          <button
            type="button"
            id="tab-btn-sovereign"
            onClick={() => {
              setActiveSubTab('SOVEREIGN_COMMANDS');
              setEditingUser(null);
            }}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'SOVEREIGN_COMMANDS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>الأوامر السيادية وفك الحماية</span>
          </button>

          <button
            type="button"
            id="tab-btn-serials"
            onClick={() => {
              setActiveSubTab('SERIALS');
              setEditingUser(null);
            }}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'SERIALS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>تغيير السريالات وأكواد التفعيل</span>
          </button>

          <button
            type="button"
            id="tab-btn-audit"
            onClick={() => {
              setActiveSubTab('AUDIT_LOGS');
              setEditingUser(null);
            }}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'AUDIT_LOGS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>سجل الرقابة والتتبع الأمني</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* ========================================================== */}
          {/* SUBTAB 1: USERS & ACCOUNTS                                 */}
          {/* ========================================================== */}
          {activeSubTab === 'USERS' && (
            <div>
              {editingUser ? (
                /* USER EDIT / CREATE FORM */
                <form onSubmit={handleSaveUser} className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                      {isNewUser ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                      {isNewUser ? 'إضافة مستخدم جديد للمنظومة يدوياً' : `تعديل بيانات وصلاحيات: ${editingUser.name}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
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
                        placeholder="مثال: admin أو أ/ أحمد محمود الشناوي"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        اسم المستخدم لتسجيل الدخول (Username): <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingUser.username || ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            username: e.target.value.trim().toLowerCase(),
                          })
                        }
                        placeholder="مثال: admin أو ahmed"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        كود الموظف التعريفي:
                      </label>
                      <input
                        type="text"
                        value={editingUser.employeeCode || ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            employeeCode: e.target.value,
                          })
                        }
                        placeholder="EMP-001"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        البريد الإلكتروني المهني:
                      </label>
                      <input
                        type="email"
                        value={editingUser.email || ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            email: e.target.value,
                          })
                        }
                        placeholder="user@cpa-firm.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* PIN & Password */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4" />
                          <span>كلمة المرور / الرمز السري (PIN / Password):</span>
                        </label>
                        <span className="text-[11px] text-slate-500">
                          يمكن للمدير تغييرها في أي وقت
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <input
                            type={showPin ? 'text' : 'password'}
                            value={editingUser.password || editingUser.pinCode || ''}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                password: e.target.value,
                                pinCode: e.target.value,
                              })
                            }
                            placeholder="كلمة المرور أو الرمز السري"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500 pl-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const autoPass = Math.floor(1000 + Math.random() * 9000).toString();
                              setEditingUser({
                                ...editingUser,
                                password: autoPass,
                                pinCode: autoPass,
                              });
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            توليد رمز عشوائي
                          </button>
                          <span className="text-[11px] text-slate-500">
                            الحالي: <strong className="text-amber-400 font-mono">{editingUser.password || editingUser.pinCode || 'غير محدد'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        الدور الوظيفي ومستوى الصلاحية:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map((option) => (
                          <div
                            key={option.role}
                            onClick={() => handleRoleChange(option.role)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              editingUser.role === option.role
                                ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-200">
                                {option.title}
                              </span>
                              {editingUser.role === option.role && (
                                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight">
                              {option.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Granular Permission Toggles */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <span>الصلاحيات الدقيقة للمستخدم:</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canPostEntries}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canPostEntries: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>ترحيل واعتماد القيود</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canEditPostedEntries}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canEditPostedEntries: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>تعديل القيود المرحلة</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canDeleteRecords}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canDeleteRecords: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>حذف السجلات والقيود</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canAccessTreasury}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canAccessTreasury: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>الوصول لخزنة المكتب</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canAccessAuditTrail}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canAccessAuditTrail: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>سجل الرقابة والتتبع الأمني</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!editingUser.canManageUsers}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, canManageUsers: e.target.checked })
                            }
                            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>إدارة الموظفين والصلاحيات</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      id="save-user-submit-btn"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {isNewUser ? 'حفظ وإضافة المستخدم للنظام' : 'حفظ التعديلات'}
                    </button>
                  </div>
                </form>
              ) : (
                /* USERS CARDS LIST */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
                    <div className="text-xs text-slate-400">
                      قائمة حسابات النظام المعتمدة. يمكنك تغيير أي باسورد أو حظر / فك حظر أي مستخدم فورياً.
                    </div>
                    <button
                      id="add-new-user-btn"
                      onClick={handleStartAdd}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      إضافة مستخدم جديد يدوياً
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map((user) => {
                      const isMainAdmin = user.id === 'user-admin' || user.username === 'admin';
                      const isBlocked = user.isActive === false;

                      return (
                        <div
                          key={user.id}
                          id={`user-card-${user.id}`}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isBlocked
                              ? 'bg-rose-950/20 border-rose-900/50 opacity-90'
                              : isMainAdmin
                              ? 'bg-amber-500/5 border-amber-500/30 shadow-sm shadow-amber-500/5'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                                    isBlocked
                                      ? 'bg-rose-900/40 text-rose-300 border border-rose-800'
                                      : isMainAdmin
                                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                                  }`}
                                >
                                  {user.avatarInitials || user.name.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-slate-100">
                                      {user.name}
                                    </h4>
                                    {isMainAdmin && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                                        المدير الرئيسي
                                      </span>
                                    )}
                                    {isBlocked && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold">
                                        محظور 🚫
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400">
                                    {user.roleTitleArabic}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(user)}
                                  title="تعديل الصلاحيات"
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!isMainAdmin && (
                                  <button
                                    onClick={() => handleDelete(user.id, user.name)}
                                    title="حذف نهائي"
                                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* User details */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>اسم المستخدم (Username):</span>
                                <span className="font-mono text-amber-300 font-bold">
                                  {user.username || user.id}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>كلمة المرور / PIN:</span>
                                <span className="font-mono text-slate-200 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {user.password || user.pinCode || 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>حالة الحساب:</span>
                                <span>
                                  {!isBlocked ? (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> مفعّل ونشط
                                    </span>
                                  ) : (
                                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                                      <XCircle className="w-3 h-3" /> محظور من تسجيل الدخول
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Admin Sovereign Actions for this user */}
                          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center gap-2">
                            {/* Change Password Button */}
                            <button
                              type="button"
                              id={`btn-change-pass-${user.id}`}
                              onClick={() => handleOpenPasswordChange(user)}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/80"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>تغيير الباسورد</span>
                            </button>

                            {/* Block / Unblock Button */}
                            {!isMainAdmin && (
                              <button
                                type="button"
                                id={`btn-toggle-block-${user.id}`}
                                onClick={() => handleToggleBlock(user)}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isBlocked
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>فك الحظر ✅</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>حظر 🚫</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {users.length === 1 && (
                    <div className="mt-6 p-5 rounded-2xl bg-amber-500/5 border border-dashed border-amber-500/30 text-center">
                      <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-amber-300 font-bold mb-1">
                        المنظومة تعمل حالياً بحساب الأدمن الرئيسي فقط (admin / admin).
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-lg mx-auto mb-3">
                        جميع أوامر المنظومة تخضع لحسابك السيادي. عند إضافة أي محاسبين أو موظفين جدد يدوياً، ستتحكم بكامل صلاحياتهم، كلمات مرورهم، وإمكانية حظرهم بضغطة زر واحدة.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* SUBTAB 2: SOVEREIGN COMMANDS & UNPROTECT                   */}
          {/* ========================================================== */}
          {activeSubTab === 'SOVEREIGN_COMMANDS' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-300 text-sm">
                    التحكم والسيادة الإدارية الشاملة لمدير المنظومة
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    هذه الأوامر تتيح للأدمن تجاوز وفك كافة القيود والحمايات تلقائياً: فك حماية الفترات المحاسبية المقفلة، فك قيود ربط الأجهزة، وتعديل كلمة المرور الرئيسية.
                  </p>
                </div>
              </div>

              {/* 1. Master Admin Password Changer */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">
                        تغيير كلمة المرور السيادية لحساب الأدمن الرئيسي (admin)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        كلمة المرور الحالية المعتمدة:{' '}
                        <strong className="text-amber-400 font-mono">
                          {users.find((u) => u.id === 'user-admin')?.password || 'admin'}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const adm = users.find((u) => u.id === 'user-admin' || u.username === 'admin');
                      if (adm) handleOpenPasswordChange(adm);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    تغيير كلمة مرور الأدمن الآن
                  </button>
                </div>
              </div>

              {/* 2. Unprotect Closed Periods */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Unlock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">
                        فك حماية وإلغاء أقفال الفترات والسنوات المالية المقفلة
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        إلغاء فوري لكافة الأقفال على الفترات والسنوات السابقة للسماح بتعديل القيود والإضافات المحاسبية
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-unprotect-all-periods"
                    onClick={handleUnprotectAllPeriods}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" />
                    فك حماية كافة الفترات فورياً
                  </button>
                </div>
              </div>

              {/* 3. Reset Device Bindings */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">
                        فك حماية وربط الأجهزة والترخيص المحلي
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        إعادة ضبط بصمات الأجهزة المصرح بها وتجاوز القيود لتمكين فتح المنظومة من أي جهاز بحرية
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-reset-device-bindings"
                    onClick={handleResetDeviceBinding}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    فك حماية الأجهزة المصرح بها
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* SUBTAB 3: SERIALS & LICENSES                               */}
          {/* ========================================================== */}
          {activeSubTab === 'SERIALS' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-start gap-3">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-cyan-300 text-sm">
                    إدارة وتغيير سريالات المنظومة وتراخيص مزاولة المهنة
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    يمكن للمدير الرئيسي تعديل أو إعادة توليد أي سريال، كود تفعيل رقمي، أو رقم ترخيص مزاولة المهنة واعتمادها فورياً بالمنظومة.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSerials} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="font-bold text-xs text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>بيانات السريالات وتراخيص التشغيل:</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateRandomSerial}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    توليد سريال رقمي عشوائي
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* System Serial */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      سريال المنظومة المشفر (System Serial):
                    </label>
                    <input
                      type="text"
                      required
                      value={serials.systemSerial}
                      onChange={(e) =>
                        setSerials({ ...serials, systemSerial: e.target.value })
                      }
                      placeholder="CPA-SYS-2026-MG120-PRO-EGY"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Activation Key */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      كود التفعيل الرقمي (Digital Activation Key):
                    </label>
                    <input
                      type="text"
                      required
                      value={serials.activationKey}
                      onChange={(e) =>
                        setSerials({ ...serials, activationKey: e.target.value })
                      }
                      placeholder="ACT-CPA-99482-EGY-AUTH"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Practice License No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      رقم ترخيص مزاولة المهنة (سجل المحاسبين والمراجعين):
                    </label>
                    <input
                      type="text"
                      value={serials.licenseNumber}
                      onChange={(e) =>
                        setSerials({ ...serials, licenseNumber: e.target.value })
                      }
                      placeholder="س.م.م / 43122"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Tax Authority Reg No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      رقم التسجيل بمصلحة الضرائب المصرية:
                    </label>
                    <input
                      type="text"
                      value={serials.taxAuthorityRegNo}
                      onChange={(e) =>
                        setSerials({ ...serials, taxAuthorityRegNo: e.target.value })
                      }
                      placeholder="م.ض. 492-817-302"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                  <button
                    type="submit"
                    id="save-serials-btn"
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    حفظ واعتماد السريالات والتراخيص فورياً
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================== */}
          {/* SUBTAB 4: AUDIT LOGS                                       */}
          {/* ========================================================== */}
          {activeSubTab === 'AUDIT_LOGS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>سجل العمليات والرقابة الأمنية الصادرة عن الإدارة</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  {db.getAuditLogs().length} عملية مسجلة
                </span>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {db.getAuditLogs().slice(-25).reverse().map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.action === 'DELETE'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-200 font-semibold">{log.details}</span>
                    </div>

                    <div className="text-left shrink-0 text-[11px] text-slate-500 space-y-0.5">
                      <div>بواسطة: <span className="text-slate-400 font-mono">{log.user}</span></div>
                      <div className="font-mono text-[10px]">{log.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Password Change Modal Popup */}
        {passwordChangeTarget && (
          <div
            id="password-change-modal-backdrop"
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
            dir="rtl"
          >
            <div
              id="password-change-modal"
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">
                    تغيير كلمة المرور للمستخدم: {passwordChangeTarget.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordChangeTarget(null)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    أدخل كلمة المرور أو الرمز السري الجديد:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      placeholder="كلمة المرور الجديدة"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500 pl-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordChangeTarget(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    id="submit-new-password-btn"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Check className="w-4 h-4" />
                    حفظ وتطبيق كلمة المرور فورياً
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
