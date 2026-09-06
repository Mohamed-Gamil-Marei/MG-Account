import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Sun,
  Moon,
  Palette,
  Check,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  FileCheck2,
  Building,
  Phone,
  Mail,
  MapPin,
  Sliders,
  CheckCircle2,
  X,
  Sparkles,
  Cloud,
  RefreshCw,
  Database,
  ExternalLink,
  Smartphone,
  Laptop,
  Eye,
  EyeOff,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { AppLanguage, BrandColor, ThemeMode, UserPreferences, CustomFirebaseConfig } from '../types';
import { getTranslation } from '../utils/i18n';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { CloudSync } from '../services/cloudSyncService';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const preferences: UserPreferences = state.preferences || {
    themeMode: 'light',
    brandColor: 'blue',
    language: 'ar',
    compactView: false,
    securityAuthEnabled: false,
    customEditPassword: 'Mg120',
  };

  const currentLang = preferences.language || 'ar';
  const t = getTranslation(currentLang);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'PREFERENCES' | 'AUDITOR_PROFILE' | 'FIREBASE_CLOUD'>('PREFERENCES');

  const [selectedLang, setSelectedLang] = useState<AppLanguage>(currentLang);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(preferences.themeMode || 'light');
  const [selectedBrand, setSelectedBrand] = useState<BrandColor>(preferences.brandColor || 'blue');
  const [customPassword, setCustomPassword] = useState<string>(preferences.customEditPassword || 'Mg120');
  const [showCustomPassword, setShowCustomPassword] = useState<boolean>(false);
  const [securityEnabled, setSecurityEnabled] = useState<boolean>(preferences.securityAuthEnabled ?? false);
  const [compactView, setCompactView] = useState<boolean>(preferences.compactView ?? false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Custom Firebase Configuration State
  const customFb = preferences.customFirebaseConfig || {
    projectId: '',
    appId: '',
    apiKey: '',
    authDomain: '',
    firestoreDatabaseId: '(default)',
    storageBucket: '',
    messagingSenderId: '',
    isCustomActive: false,
  };

  const [fbProjectId, setFbProjectId] = useState<string>(customFb.projectId || '');
  const [fbApiKey, setFbApiKey] = useState<string>(customFb.apiKey || '');
  const [fbAppId, setFbAppId] = useState<string>(customFb.appId || '');
  const [fbAuthDomain, setFbAuthDomain] = useState<string>(customFb.authDomain || '');
  const [fbDatabaseId, setFbDatabaseId] = useState<string>(customFb.firestoreDatabaseId || '(default)');
  const [isCustomFbActive, setIsCustomFbActive] = useState<boolean>(customFb.isCustomActive ?? false);
  const [testSyncStatus, setTestSyncStatus] = useState<string | null>(null);

  // Auditor Profile Fields
  const officeProfile = state.officeProfile || {
    auditorName: 'محمد جميل مرعي',
    title: 'محاسب قانوني وخبير ضرائب ومراقب حسابات شركات أموال',
    firmName: 'مكتب محمد جميل مرعي للمحاسبة والمراجعة والاستشارات المالية والضريبية',
    licenseNumber: 'س.م 18452',
    taxAuthorityRegNo: '200-145-890',
    phone: '01003335360',
    mobile: '01003335360',
    email: 'info@mg-auditing.com',
    address: 'القاهرة - جمهورية مصر العربية',
    notes: '',
  };

  const [auditorName, setAuditorName] = useState<string>(officeProfile.auditorName || '');
  const [titleName, setTitleName] = useState<string>(officeProfile.title || '');
  const [firmName, setFirmName] = useState<string>(officeProfile.firmName || '');
  const [licenseNumber, setLicenseNumber] = useState<string>(officeProfile.licenseNumber || '');
  const [taxAuthorityRegNo, setTaxAuthorityRegNo] = useState<string>(officeProfile.taxAuthorityRegNo || '');
  const [phone, setPhone] = useState<string>(officeProfile.phone || '');
  const [email, setEmail] = useState<string>(officeProfile.email || '');
  const [address, setAddress] = useState<string>(officeProfile.address || '');
  const [mainOfficeAddress, setMainOfficeAddress] = useState<string>(officeProfile.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية');
  const [showMainOfficeAddress, setShowMainOfficeAddress] = useState<boolean>(officeProfile.showMainOfficeAddress !== false);
  const [branchOfficeAddress, setBranchOfficeAddress] = useState<string>(officeProfile.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية');
  const [showBranchOfficeAddress, setShowBranchOfficeAddress] = useState<boolean>(officeProfile.showBranchOfficeAddress !== false);
  const [publicDomainUrl, setPublicDomainUrl] = useState<string>(officeProfile.publicDomainUrl || (typeof window !== 'undefined' ? window.location.origin : ''));

  const brandOptions: { id: BrandColor; nameAr: string; nameEn: string; bgClass: string; ringClass: string }[] = [
    { id: 'blue', nameAr: 'أزرق كلاسيكي مصرفي', nameEn: 'Banking Navy Blue', bgClass: 'bg-blue-600', ringClass: 'ring-blue-500' },
    { id: 'emerald', nameAr: 'أخضر مالي وضريبي', nameEn: 'Emerald Green', bgClass: 'bg-emerald-600', ringClass: 'ring-emerald-500' },
    { id: 'indigo', nameAr: 'كحلي ملكي وقور', nameEn: 'Royal Indigo', bgClass: 'bg-indigo-600', ringClass: 'ring-indigo-500' },
    { id: 'slate', nameAr: 'رمادي مؤسسي متوازن', nameEn: 'Slate Institutional', bgClass: 'bg-slate-700', ringClass: 'ring-slate-500' },
    { id: 'amber', nameAr: 'ذهبي أندلسي فاخر', nameEn: 'Amber Gold', bgClass: 'bg-amber-600', ringClass: 'ring-amber-500' },
  ];

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestSyncStatus('جاري اختبار الاتصال والمزامنة...');
    try {
      const ok = await db.syncToCloudNow();
      if (ok) {
        setTestSyncStatus('✅ الاتصال السحابي بقاعدة بيانات Firestore يعمل بنجاح تام!');
      } else {
        setTestSyncStatus('⚠️ تعذر إتمام المزامنة. تأكد من اتصال الإنترنت وإعدادات المشروع.');
      }
    } catch (e: any) {
      setTestSyncStatus(`❌ خطأ في الاتصال: ${e?.message || ''}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const customFirebaseConfig: CustomFirebaseConfig = {
      projectId: fbProjectId.trim(),
      apiKey: fbApiKey.trim(),
      appId: fbAppId.trim(),
      authDomain: fbAuthDomain.trim() || (fbProjectId.trim() ? `${fbProjectId.trim()}.firebaseapp.com` : ''),
      firestoreDatabaseId: fbDatabaseId.trim() || '(default)',
      isCustomActive: isCustomFbActive && Boolean(fbProjectId.trim() && fbApiKey.trim()),
    };

    db.updatePreferences({
      language: selectedLang,
      themeMode: selectedTheme,
      brandColor: selectedBrand,
      customEditPassword: customPassword.trim() || 'Mg120',
      securityAuthEnabled: securityEnabled,
      compactView,
      customFirebaseConfig,
    });

    db.updateOfficeProfile({
      auditorName: auditorName.trim() || 'محمد جميل مرعي',
      title: titleName.trim() || 'محاسب قانوني ومراقب حسابات',
      firmName: firmName.trim() || 'مكتب المحاسبة والمراجعة',
      licenseNumber: licenseNumber.trim() || 'س.م 18452',
      taxAuthorityRegNo: taxAuthorityRegNo.trim() || '',
      phone: phone.trim() || '',
      mobile: phone.trim() || '',
      email: email.trim() || '',
      address: address.trim() || '',
      mainOfficeAddress: mainOfficeAddress.trim(),
      showMainOfficeAddress,
      branchOfficeAddress: branchOfficeAddress.trim(),
      showBranchOfficeAddress,
      publicDomainUrl: publicDomainUrl.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-950/30">
              <Settings className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {currentLang === 'ar' ? 'إعدادات النظام وبيانات مراقب الحسابات' : 'System Settings & Auditor Profile'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentLang === 'ar'
                  ? 'تخصيص بيانات المحاسب القانوني وترويسة التقارير ومظهر النظام'
                  : 'Customize auditor credentials, official report header & UI theme'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSettingsTab('PREFERENCES')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSettingsTab === 'PREFERENCES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{currentLang === 'ar' ? 'المظهر واللغة والأمان' : 'Theme & Security'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab('AUDITOR_PROFILE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSettingsTab === 'AUDITOR_PROFILE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{currentLang === 'ar' ? 'بيانات واعتماد مراقب الحسابات' : 'Auditor Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab('FIREBASE_CLOUD')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSettingsTab === 'FIREBASE_CLOUD'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{currentLang === 'ar' ? 'الربط السحابي Firebase' : 'Firebase Cloud Sync'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {currentLang === 'ar' ? 'تم حفظ وتطبيق البيانات بنجاح!' : 'Settings applied successfully!'}
              </span>
            </div>
          )}

          {activeSettingsTab === 'AUDITOR_PROFILE' && (
            /* Auditor Profile Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    اسم مراقب الحسابات / المحاسب القانوني:
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    required
                    placeholder="مثال: محمد جميل مرعي"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم القيد بسجل المحاسبين والمراجعين (س.م):
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                    placeholder="مثال: س.م 18452"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  المسمى والصفة المهنية الرسمية:
                </label>
                <input
                  type="text"
                  value={titleName}
                  onChange={(e) => setTitleName(e.target.value)}
                  required
                  placeholder="محاسب قانوني وخبير ضرائب ومراقب حسابات شركات أموال"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اسم المكتب / المنشأة المهنية:
                </label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                  placeholder="مكتب محمد جميل مرعي للمحاسبة والمراجعة والاستشارات المالية"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم هاتف المكتب / واتساب:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01003335360"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم التسجيل الضريبي للمكتب:
                  </label>
                  <input
                    type="text"
                    value={taxAuthorityRegNo}
                    onChange={(e) => setTaxAuthorityRegNo(e.target.value)}
                    placeholder="200-145-890"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  البريد الإلكتروني المهني:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@mg-auditing.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Main Office Address with Visibility Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>عنوان المقر الرئيسي للمكتب:</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={showMainOfficeAddress}
                      onChange={(e) => setShowMainOfficeAddress(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>إظهار في الترويسة والطباعة</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={mainOfficeAddress}
                  onChange={(e) => setMainOfficeAddress(e.target.value)}
                  placeholder="ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Branch Office Address with Visibility Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>عنوان الفرع (العاشر من رمضان):</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={showBranchOfficeAddress}
                      onChange={(e) => setShowBranchOfficeAddress(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>إظهار في الترويسة والطباعة</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={branchOfficeAddress}
                  onChange={(e) => setBranchOfficeAddress(e.target.value)}
                  placeholder="المباركية مول - مدينة العاشر من رمضان - الشرقية"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  العنوان المجمع / الشامل (للمراسلات):
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية | الفرع: المباركية مول - مدينة العاشر من رمضان - الشرقية"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Public Domain for Direct Printed QR Code Verification */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>رابط النطاق العام للتحقق من باركود و QR المستندات المطبوعة:</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100">
                    QR Verification URL
                  </span>
                </div>
                <input
                  type="url"
                  value={publicDomainUrl}
                  onChange={(e) => setPublicDomainUrl(e.target.value)}
                  placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://cpa-egypt.tax.gov.eg'}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono text-emerald-900 dark:text-emerald-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  يُستخدم هذا الرابط لإنشاء كود الـ QR بحيث يفتح مباشرة في هواتف العملاء وكاميرات الهواتف الذكية عند مسحه من الأوراق المطبوعة والشهادات الرسمية.
                </p>
              </div>
            </div>
          )}

          {activeSettingsTab === 'PREFERENCES' && (
            /* Preferences Tab */
            <>
              {/* 1. Language Toggle (Arabic / English) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>{currentLang === 'ar' ? 'لغة واجهة البرنامج (Interface Language)' : 'Interface Language'}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Arabic */}
                  <button
                    type="button"
                    onClick={() => setSelectedLang('ar')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      selectedLang === 'ar'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">العربية (Arabic)</span>
                      {selectedLang === 'ar' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      الواجهة العربية الرسمية بكافة النماذج والتقارير ومسميات مصلحة الضرائب المصرية
                    </p>
                  </button>

                  {/* English */}
                  <button
                    type="button"
                    onClick={() => setSelectedLang('en')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedLang === 'en'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">English (International)</span>
                      {selectedLang === 'en' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      English UI for multinational clients, preserving standard Egyptian Accounting Standards (EAS) & ETA terms
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Theme Mode & Brand Accent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Display Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentLang === 'ar' ? 'وضع العرض (السمة)' : 'Display Mode'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTheme('light')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer ${
                        selectedTheme === 'light'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>{currentLang === 'ar' ? 'وضع فاتح' : 'Light'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTheme('dark')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer ${
                        selectedTheme === 'dark'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>{currentLang === 'ar' ? 'وضع مظلم' : 'Dark'}</span>
                    </button>
                  </div>
                </div>

                {/* Brand Accent Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentLang === 'ar' ? 'اللون التمييزي للمكتب' : 'Brand Accent Color'}</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {brandOptions.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => setSelectedBrand(brand.id)}
                        className={`w-7 h-7 rounded-xl ${brand.bgClass} flex items-center justify-center transition-all cursor-pointer ${
                          selectedBrand === brand.id
                            ? `ring-3 ${brand.ringClass} ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110`
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={currentLang === 'ar' ? brand.nameAr : brand.nameEn}
                      >
                        {selectedBrand === brand.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Security & Edit Protection Passcode */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentLang === 'ar' ? 'الحماية بالرقم السري لتعديل السجلات' : 'Record Edit Security Passcode'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securityEnabled}
                      onChange={(e) => setSecurityEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      {currentLang === 'ar'
                        ? 'كلمة المرور المعتمدة للتعديل:'
                        : 'Authorized Edit Passcode:'}
                    </label>
                    <div className="relative">
                      <input
                        type={showCustomPassword ? 'text' : 'password'}
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        className="w-full px-3 py-1.5 pl-9 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPassword(!showCustomPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showCustomPassword ? 'إخفاء' : 'إظهار'}
                      >
                        {showCustomPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSettingsTab === 'FIREBASE_CLOUD' && (
            /* Firebase Cloud Sync Tab */
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                  <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>الربط بقاعدة بيانات Google Firebase / Firestore السحابية</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  يحتوي البرنامج على ربط سحابي افتراضي نشط تلقائياً. إذا كنت تملك مشروع Firebase خاص بمكتبك وتريد توجيه كل البيانات إليه، يمكنك إدخال مفاتيح المشروع أدناه وتفعيل خيار التوجيه المخصص.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono">
                  <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    المشروع الافتراضي: {defaultFirebaseConfig.projectId}
                  </span>
                  <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    قاعدة Firestore: {defaultFirebaseConfig.firestoreDatabaseId}
                  </span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    تفعيل التوجيه لمشروع Firebase خاص (Custom Project)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    عند التعطيل، ستعتمد المنظومة على السحابة المرفقة بالنظام تلقائياً.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isCustomFbActive}
                    onChange={(e) => setIsCustomFbActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Custom Project Form */}
              <div className={`space-y-3 transition-opacity ${!isCustomFbActive ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Project ID (معرّف المشروع):
                    </label>
                    <input
                      type="text"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value)}
                      placeholder="مثال: mg-office-accounting"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Web API Key (مفتاح الويب):
                    </label>
                    <input
                      type="password"
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      App ID (معرّف التطبيق):
                    </label>
                    <input
                      type="text"
                      value={fbAppId}
                      onChange={(e) => setFbAppId(e.target.value)}
                      placeholder="مثال: 1:843507267924:web:..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Database ID (اسم قاعدة Firestore):
                    </label>
                    <input
                      type="text"
                      value={fbDatabaseId}
                      onChange={(e) => setFbDatabaseId(e.target.value)}
                      placeholder="(default)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>اختبار الاتصال والمزامنة الآن</span>
                </button>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>متوافق لحظياً مع الموبايل وسطح المكتب</span>
                </div>
              </div>

              {testSyncStatus && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold text-center border border-slate-200 dark:border-slate-700 animate-in fade-in">
                  {testSyncStatus}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {currentLang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
            >
              {currentLang === 'ar' ? 'حفظ وتطبيق التغييرات' : 'Save & Apply Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
