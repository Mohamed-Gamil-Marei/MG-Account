import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Laptop,
  KeyRound,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  X,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  HardDrive,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { SecurityAuthService, DeviceBindingInfo } from '../services/securityAuth';

interface DeviceLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnforced?: boolean; // When true, modal cannot be dismissed without unlocking
  onUnlocked?: () => void;
}

export const DeviceLockModal: React.FC<DeviceLockModalProps> = ({
  isOpen,
  onClose,
  isEnforced = false,
  onUnlocked,
}) => {
  const [currentDevice, setCurrentDevice] = useState<{ fingerprint: string; summary: string }>({
    fingerprint: '',
    summary: '',
  });
  const [authorizedList, setAuthorizedList] = useState<DeviceBindingInfo[]>([]);
  const [isMatch, setIsMatch] = useState<boolean>(true);
  const [passcode, setPasscode] = useState('');
  const [customDeviceName, setCustomDeviceName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'AUTH' | 'WHITELIST'>('AUTH');

  // Device Renaming state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  const refreshState = () => {
    const cur = SecurityAuthService.getDeviceFingerprint();
    const list = SecurityAuthService.getAuthorizedDevices();
    const validation = SecurityAuthService.validateCurrentDevice();

    setCurrentDevice(cur);
    setAuthorizedList(list);
    setIsMatch(validation.isValid);
    if (!validation.isValid) {
      setActiveTab('AUTH');
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshState();
      setErrorMessage(null);
      setSuccessMessage(null);
      setPasscode('');
      setCustomDeviceName('');
      setEditingDeviceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = SecurityAuthService.authorizeAndBindNewDevice(passcode, customDeviceName);
    if (res.success) {
      setSuccessMessage(res.message);
      refreshState();
      setTimeout(() => {
        if (onUnlocked) onUnlocked();
        if (!isEnforced) onClose();
      }, 900);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleRemoveDevice = (deviceId: string) => {
    const enteredPass = window.prompt('يرجى إدخال الماستر كود (Mg120) لتأكيد إلغاء ترخيص هذا الجهاز:');
    if (!enteredPass) return;

    const res = SecurityAuthService.removeAuthorizedDevice(deviceId, enteredPass);
    if (res.success) {
      setSuccessMessage(res.message);
      refreshState();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSaveRename = (deviceId: string) => {
    if (editNameInput.trim()) {
      SecurityAuthService.renameAuthorizedDevice(deviceId, editNameInput.trim());
      setEditingDeviceId(null);
      refreshState();
    }
  };

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(currentDevice.fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-right space-y-0 text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Top Banner */}
        <div
          className={`p-5 text-white ${
            !isMatch
              ? 'bg-gradient-to-r from-red-700 via-rose-800 to-slate-900'
              : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
                  !isMatch ? 'bg-red-500/30 border border-red-400/50' : 'bg-indigo-500/30 border border-indigo-400/50'
                }`}
              >
                {!isMatch ? (
                  <ShieldAlert className="w-6 h-6 text-rose-300" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      !isMatch
                        ? 'bg-red-950 text-rose-300 border-red-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {!isMatch ? '⚠️ جهاز غير مصرح به' : '🛡️ منظومة حماية وترخيص الأجهزة المعتمدة'}
                  </span>
                  <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                    {authorizedList.length} أجهزة مصرحة
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  {!isMatch ? 'نظام الحماية والأمان ضد السرقة والنقل' : 'إدارة وتعدد الأجهزة المصرح بها (Device Whitelist)'}
                </h2>
              </div>
            </div>

            {!isEnforced && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('AUTH')}
            className={`pb-2 px-3 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'AUTH'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{!isMatch ? 'فك القفل وترخيص الجهاز' : 'بيانات ترخيص هذا الجهاز'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WHITELIST')}
            className={`pb-2 px-3 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'WHITELIST'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>قائمة الأجهزة المعتمدة ({authorizedList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Alert */}
          {!isMatch ? (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-900 dark:text-red-200 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-2 text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>تم اكتشاف تشغيل قاعدة البيانات على جهاز غير مقترن!</span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-300">
                لحماية وسرية البيانات، يرجى إدخال الماستر كود (Mg120) لإضافة هذا الجهاز لقائمة الأجهزة المعتمدة لديك.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold">هذا الجهاز مصرح ومعتمد رسمياً بالمنظومة.</span>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded font-mono font-bold">
                مرخص ومقترن
              </span>
            </div>
          )}

          {activeTab === 'AUTH' && (
            <div className="space-y-4">
              {/* Current Machine Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>بصمة الجهاز الحالي (Machine Hardware Signature):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFingerprint}
                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 text-center select-all">
                  {currentDevice.fingerprint || 'جاري توليد البصمة...'}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>التعريف والبيئة:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{currentDevice.summary}</span>
                </div>
              </div>

              {/* Portable Backup Licensing Feature Info */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>ميزة الترخيص الذكي في النسخ الاحتياطية (Auto-License Backup):</strong>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    عند استيراد ملف النسخة الاحتياطية (JSON) المحمل من مكتبك، يتم التعرف تلقائياً على التوقيع الرقمي وترخيص الجهاز الجديد فوراً دون الحاجة لإعادة كتابة الأكواد.
                  </p>
                </div>
              </div>

              {/* Authorization Form */}
              <form onSubmit={handleAuthorize} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      اسم أو وصف الجهاز (مثال: لابتوب المنزل):
                    </label>
                    <input
                      type="text"
                      value={customDeviceName}
                      onChange={(e) => setCustomDeviceName(e.target.value)}
                      placeholder={currentDevice.summary || 'لابتوب العمل'}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      الماستر كود للترخيص (Mg120):
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="أدخل Mg120..."
                      required
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {!isMatch ? <Unlock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{!isMatch ? 'فك القفل وترخيص هذا الجهاز' : 'تأكيد وحفظ ترخيص الجهاز'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'WHITELIST' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>الأجهزة المصرح لها بالعمل وتصفح السجلات المحاسبية:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {authorizedList.length} أجهزة
                </span>
              </div>

              <div className="space-y-2">
                {authorizedList.map((dev, index) => {
                  const isCurrent = dev.deviceId === currentDevice.fingerprint;
                  const isEditing = editingDeviceId === dev.deviceId;

                  return (
                    <div
                      key={dev.deviceId || index}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          <Laptop className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editNameInput}
                                onChange={(e) => setEditNameInput(e.target.value)}
                                className="p-1 text-xs border rounded bg-white dark:bg-slate-900 font-bold"
                              />
                              <button
                                onClick={() => handleSaveRename(dev.deviceId)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                              >
                                حفظ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {dev.deviceName}
                              </span>
                              {isCurrent && (
                                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">
                                  الجهاز الحالي
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>{dev.deviceId.slice(0, 16)}...</span>
                            <span>•</span>
                            <span>{new Date(dev.registeredAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingDeviceId(dev.deviceId);
                              setEditNameInput(dev.deviceName);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white/50 cursor-pointer"
                            title="تعديل اسم الجهاز"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {authorizedList.length > 1 && (
                          <button
                            onClick={() => handleRemoveDevice(dev.deviceId)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                            title="إلغاء ترخيص هذا الجهاز"
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
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>نظام حماية وترخيص الأجهزة المعتمدة • كود الإدارة: Mg120</span>
          {!isEnforced && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
