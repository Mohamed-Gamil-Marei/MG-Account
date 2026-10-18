import React, { useState } from 'react';
import {
  Shield,
  Download,
  Upload,
  Lock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { triggerFileDownload } from '../../utils/dataImportExport';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  currentUserRole = 'ADMIN',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'EXPORT' | 'RESTORE'>('EXPORT');

  // Export state
  const [encryptExport, setEncryptExport] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [includeTaxSecrets, setIncludeTaxSecrets] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [importUsers, setImportUsers] = useState(false);
  const [confirmAdminUsers, setConfirmAdminUsers] = useState(false);
  const [restoreReason, setRestoreReason] = useState('استعادة دورية للبيانات');
  const [isRestoring, setIsRestoring] = useState(false);

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUserRole === 'ADMIN';

  // Export Execution
  const handleExport = async () => {
    setStatusMessage(null);
    if (encryptExport && (!exportPassword || exportPassword.length < 6)) {
      setStatusMessage({
        type: 'error',
        text: 'كلمة المرور لتشفير النسخة الاحتياطية يجب أن لا تقل عن 6 أحرف.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const backupJson = await db.exportFullBackupJson({
        encryptPassword: encryptExport ? exportPassword : undefined,
        includeTaxSecrets: encryptExport ? includeTaxSecrets : false,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = encryptExport
        ? `MG_ERP_BACKUP_ENCRYPTED_AES256_${dateStr}.json`
        : `MG_ERP_BACKUP_CLEAN_${dateStr}.json`;

      triggerFileDownload(backupJson, filename, 'application/json;charset=utf-8;');
      setStatusMessage({
        type: 'success',
        text: `تم تصدير النسخة الاحتياطية بنجاح (${filename}). تم تطهير كلمات سر الضرائب وحمايتها بالتشفير.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'فشل تصدير النسخة الاحتياطية.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Restore File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.mgBackupType === 'ENCRYPTED_BACKUP') {
        setIsEncryptedFile(true);
      } else {
        setIsEncryptedFile(false);
      }
    } catch {
      setIsEncryptedFile(false);
    }
  };

  // Restore Execution
  const handleRestore = async () => {
    setStatusMessage(null);
    if (!restoreFile) {
      setStatusMessage({ type: 'error', text: 'يرجى اختيار ملف النسخة الاحتياطية أولاً.' });
      return;
    }

    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'عملية مرفوضة: استعادة النسخة الاحتياطية مقيدة بصلاحية المدير العام (ADMIN) فقط.',
      });
      return;
    }

    if (isEncryptedFile && !restorePassword) {
      setStatusMessage({
        type: 'error',
        text: 'هذا الملف مشفر بتشفير AES-GCM؛ يرجى إدخال كلمة المرور لفك التشفير.',
      });
      return;
    }

    setIsRestoring(true);
    try {
      const fileText = await restoreFile.text();
      const res = await db.restoreFullBackupJson(fileText, {
        password: isEncryptedFile ? restorePassword : undefined,
        importUsersAndPermissions: importUsers,
        confirmAdminUserImport: confirmAdminUsers,
        reason: restoreReason,
      });

      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'فشلت عملية استعادة النسخة الاحتياطية.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                إدارة النسخ الاحتياطي المشفر والاستعادة الآمنة (Restore)
              </h3>
              <p className="text-xs text-slate-500">
                تشفير AES-GCM 256-bit عبر WebCrypto، تطهير بيانات بوابات الضرائب، وأخذ نسخة طوارئ تلقائية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('EXPORT');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeSubTab === 'EXPORT'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>تصدير نسخة احتياطية مشفرة</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('RESTORE');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeSubTab === 'RESTORE'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>استعادة نسخة احتياطية (Restore)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeSubTab === 'EXPORT' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encryptExport}
                    onChange={(e) => setEncryptExport(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      تشفير النسخة الاحتياطية بكلمة مرور (AES-GCM 256-bit عبر WebCrypto)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      حماية قصوى ضد التسريب؛ لن يمكن استعادة البيانات إلا بكلمة المرور
                    </p>
                  </div>
                </label>

                {encryptExport && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-700">
                      كلمة مرور التشفير (6 أحرف على الأقل):
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="أدخل كلمة مرور قوية للتشفير"
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white pr-9 pl-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Secrets Option */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTaxSecrets}
                    disabled={!encryptExport}
                    onChange={(e) => setIncludeTaxSecrets(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 disabled:opacity-40"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950">
                      تضمين بيانات الاعتماد السرية لبوابات الضرائب والفاتورة الإلكترونية (خيار صريح مشفر)
                    </span>
                    <p className="text-[11px] text-amber-800">
                      افتراضياً، يتم تطهير واستبعاد كلمات سر الضرائب ورموز التوكين PIN لضمان الخصوصية. يتطلب تفعيل التشفير الإلزامي.
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExport}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40"
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>توليد وتنزيل النسخة الاحتياطية</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Shield className="h-4 w-4 text-rose-600" />
                  <span>تنبيه أمني وإداري (Restore Operation):</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  عملية الاستعادة تقوم باستبدال نظيف لقاعدة البيانات الحالية. يتم أخذ نسخة طوارئ تلقائية استباقية وتوثيق العملية في سجل التدقيق المشفر SHA-256.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر ملف النسخة الاحتياطية (.json):
                </label>
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {isEncryptedFile && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    <span>تم اكتشاف نسخة احتياطية مشفرة بكلمة مرور (AES-GCM):</span>
                  </div>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفك التشفير"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}

              {/* Users & Permissions Protection */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importUsers}
                    onChange={(e) => {
                      setImportUsers(e.target.checked);
                      if (!e.target.checked) setConfirmAdminUsers(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      استيراد المستخدمين وصلاحيات الحسابات من الملف
                    </span>
                    <p className="text-[11px] text-slate-500">
                      افتراضياً، يتم الإبقاء على المستخدمين والصلاحيات الحالية لمنع إغلاق النظام أو سلب الصلاحيات.
                    </p>
                  </div>
                </label>

                {importUsers && (
                  <label className="flex items-center gap-2.5 pt-2 border-t border-slate-200 cursor-pointer text-rose-800">
                    <input
                      type="checkbox"
                      checked={confirmAdminUsers}
                      onChange={(e) => setConfirmAdminUsers(e.target.checked)}
                      className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs font-bold">
                      أؤكد كمسؤول نظام (ADMIN) رغبتي الصريحة في استبدال المستخدمين والصلاحيات
                    </span>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب الاستعادة (إلزامي للتوثيق في سجل المراجعة):
                </label>
                <input
                  type="text"
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="سبب الاستعادة..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={isRestoring || !restoreFile || !isAdmin}
                onClick={handleRestore}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40"
              >
                {isRestoring ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                <span>بدء استعادة النسخة الاحتياطية (Execute Restore)</span>
              </button>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                statusMessage.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
