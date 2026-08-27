import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  KeyRound,
  Lock,
  UserCheck,
  Check,
} from 'lucide-react';
import { SystemUser, UserRole, NavigationTab } from '../types';
import { db, DatabaseState } from '../db/localDatabase';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('ACCOUNTANT');
  const [roleTitleInput, setRoleTitleInput] = useState('محاسب مبتدئ');
  const [canTreasury, setCanTreasury] = useState(false);
  const [canAudit, setCanAudit] = useState(false);
  const [canEditPosted, setCanEditPosted] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canInvoices, setCanInvoices] = useState(true);

  if (!isOpen) return null;

  const users = state.users || [];
  const currentUser = db.getCurrentUser();

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setIsAddingNew(true);
    setNameInput('');
    setEmailInput('');
    setRoleInput('ACCOUNTANT');
    setRoleTitleInput('محاسب');
    setCanTreasury(false);
    setCanAudit(false);
    setCanEditPosted(false);
    setCanDelete(false);
    setCanInvoices(true);
  };

  const handleOpenEdit = (u: SystemUser) => {
    setIsAddingNew(false);
    setEditingUserId(u.id);
    setNameInput(u.name);
    setEmailInput(u.email);
    setRoleInput(u.role);
    setRoleTitleInput(u.roleTitleArabic);
    setCanTreasury(u.canAccessTreasury);
    setCanAudit(u.canAccessAuditTrail);
    setCanEditPosted(u.canEditPostedEntries);
    setCanDelete(u.canDeleteRecords);
    setCanInvoices(u.canIssueInvoices);
  };

  const handleRolePresetChange = (role: UserRole) => {
    setRoleInput(role);
    if (role === 'ADMIN') {
      setRoleTitleInput('مدير النظام ومراقب الحسابات');
      setCanTreasury(true);
      setCanAudit(true);
      setCanEditPosted(true);
      setCanDelete(true);
      setCanInvoices(true);
    } else if (role === 'AUDITOR') {
      setRoleTitleInput('مراجع حسابات قانوني أول');
      setCanTreasury(true);
      setCanAudit(true);
      setCanEditPosted(false);
      setCanDelete(false);
      setCanInvoices(true);
    } else {
      setRoleTitleInput('محاسب');
      setCanTreasury(false);
      setCanAudit(false);
      setCanEditPosted(false);
      setCanDelete(false);
      setCanInvoices(true);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const restrictedTabsList: NavigationTab[] = [];
    if (!canTreasury) restrictedTabsList.push('OFFICE_TREASURY');
    if (!canAudit) restrictedTabsList.push('AUDIT_TRAIL');

    if (isAddingNew) {
      db.addUser({
        name: nameInput.trim(),
        email: emailInput.trim() || `${nameInput.toLowerCase().replace(/\s+/g, '')}@office.local`,
        role: roleInput,
        roleTitleArabic: roleTitleInput.trim(),
        canAccessTreasury: canTreasury,
        canAccessAuditTrail: canAudit,
        canEditPostedEntries: canEditPosted,
        canDeleteRecords: canDelete,
        canIssueInvoices: canInvoices,
        restrictedTabs: restrictedTabsList,
      });
    } else if (editingUserId) {
      db.updateUser(editingUserId, {
        name: nameInput.trim(),
        email: emailInput.trim(),
        role: roleInput,
        roleTitleArabic: roleTitleInput.trim(),
        canAccessTreasury: canTreasury,
        canAccessAuditTrail: canAudit,
        canEditPostedEntries: canEditPosted,
        canDeleteRecords: canDelete,
        canIssueInvoices: canInvoices,
        restrictedTabs: restrictedTabsList,
      });
    }

    setIsAddingNew(false);
    setEditingUserId(null);
  };

  const handleSwitchUser = (userId: string) => {
    db.switchCurrentUser(userId);
  };

  const handleDeleteUser = (u: SystemUser) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم [${u.name}]؟`)) {
      db.deleteUser(u.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                إدارة المستخدمين وصلاحيات الوصول (Multi-User RBAC)
              </h3>
              <p className="text-[11px] text-slate-500">
                تحديد الأدوار (Admin, Auditor, Accountant) وتقييد الوصول للأقسام الحساسة (الخزنة وسجل التدقيق)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* User List */}
        {!isAddingNew && !editingUserId && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                المستخدمون المسجلون بالنظام ({users.length})
              </span>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {users.map((u) => {
                const isCurrent = u.id === state.currentUserId;
                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : u.role === 'AUDITOR'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {u.name.slice(0, 1)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">
                              الحساب النشط حالياً ✓
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {u.roleTitleArabic} ({u.role})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
                          <span>{u.email}</span>
                          <span>• الخزنة: {u.canAccessTreasury ? 'مسموح' : 'محظور'}</span>
                          <span>• سجل المراجعة: {u.canAccessAuditTrail ? 'مسموح' : 'محظور'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!isCurrent && (
                        <button
                          onClick={() => handleSwitchUser(u.id)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold cursor-pointer"
                        >
                          تبديل الدخول
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl cursor-pointer"
                        title="تعديل الصلاحيات"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {users.length > 1 && !isCurrent && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add / Edit Form */}
        {(isAddingNew || editingUserId) && (
          <form onSubmit={handleSaveUser} className="space-y-4 mt-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-xs">
                {isAddingNew ? 'إضافة مستخدم جديد للنظام' : 'تعديل بيانات وصلاحيات المستخدم'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingUserId(null);
                }}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
              >
                العودة للقائمة
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني / اسم الدخول</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@office.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الدور الوظيفي (Role)</label>
                <select
                  value={roleInput}
                  onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="ADMIN">مدير النظام (Admin) - كافة الصلاحيات</option>
                  <option value="AUDITOR">مراجع قانوني (Auditor) - فحص ومراجعة وخزنة</option>
                  <option value="ACCOUNTANT">محاسب (Accountant) - تسجيل قيود وفواتير فقط</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المسمى الوظيفي العربي</label>
                <input
                  type="text"
                  value={roleTitleInput}
                  onChange={(e) => setRoleTitleInput(e.target.value)}
                  placeholder="مثال: محاسب أول، مراجع تحت التمرين"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Permission Checkboxes */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-900 block mb-2 text-xs">
                صلاحيات الوصول والأقسام الحساسة (RBAC Flags):
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canTreasury}
                  onChange={(e) => setCanTreasury(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="font-bold text-slate-800">الوصول لخزنة المكتب (Office Treasury)</span>
                <span className="text-slate-500 text-[10px]">
                  (إذا تم إلغاؤها، يُحظر على المستخدم فتح الخزنة وتسجيل السندات)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canAudit}
                  onChange={(e) => setCanAudit(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="font-bold text-slate-800">الوصول لسجل المراجعة والتدقيق (Audit Trail)</span>
                <span className="text-slate-500 text-[10px]">
                  (إذا تم إلغاؤها، يُحظر على المستخدم الاطلاع على سجل العمليات والرقابة)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canEditPosted}
                  onChange={(e) => setCanEditPosted(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="font-bold text-slate-800">إلغاء ترحيل القيود وتعديل السجلات المرحلة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDelete}
                  onChange={(e) => setCanDelete(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="font-bold text-slate-800">حذف السجلات والملفات نهائياً</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canInvoices}
                  onChange={(e) => setCanInvoices(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="font-bold text-slate-800">إصدار وتعديل الفواتير الضريبية</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingUserId(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                حفظ المستخدم والصلاحيات
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
