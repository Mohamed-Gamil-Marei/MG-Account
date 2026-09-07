import React, { useState } from 'react';
import {
  X,
  Building,
  Building2,
  ShieldCheck,
  Phone,
  Smartphone,
  MapPin,
  CheckCircle2,
  Sliders,
  Eye,
  RotateCcw,
  Save,
  Printer,
  Sparkles,
  Layers,
  FileBadge,
  CreditCard,
  Briefcase,
  Globe,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { OfficeProfile } from '../../types';
import { ClientProfileData } from './CreditBatchPrintDocument';
import { OfficialReportHeader } from '../common/OfficialReportHeader';
import { db } from '../../db/localDatabase';

export interface ExtendedOfficeProfile extends Partial<OfficeProfile> {
  mainOfficeTitle?: string;
  branchOfficeTitle?: string;
  showOfficePhones?: boolean;
  headerStyle?: 'standard' | 'formal-classic' | 'two-column' | 'compact';
  showLogo?: boolean;
}

interface PrintHeaderCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officeProfile: ExtendedOfficeProfile;
  onSaveOfficeProfile: (profile: ExtendedOfficeProfile) => void;
  clientProfile: ClientProfileData;
  onSaveClientProfile: (profile: ClientProfileData) => void;
  showHeaderClientBanner?: boolean;
  onToggleShowHeaderClientBanner?: (show: boolean) => void;
  onApplyAndPrint?: () => void;
  sampleDocumentTitle?: string;
  sampleYear?: number;
}

export const PrintHeaderCustomizerModal: React.FC<PrintHeaderCustomizerModalProps> = ({
  isOpen,
  onClose,
  officeProfile,
  onSaveOfficeProfile,
  clientProfile,
  onSaveClientProfile,
  showHeaderClientBanner = true,
  onToggleShowHeaderClientBanner,
  onApplyAndPrint,
  sampleDocumentTitle = 'القوائم المالية والتقرير السنوي المعتمد',
  sampleYear = 2026,
}) => {
  const [activeTab, setActiveTab] = useState<'OFFICE' | 'COMPANY'>('OFFICE');

  // Local draft states for real-time live preview
  const [draftOffice, setDraftOffice] = useState<ExtendedOfficeProfile>({
    firmName: officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات',
    auditorName: officeProfile.auditorName || 'أ/ محمد جميل مرعي',
    title: officeProfile.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات',
    licenseNumber: officeProfile.licenseNumber || 'س.م.م 43122',
    taxAuthorityLicense: officeProfile.taxAuthorityLicense || 'سجل خبراء الضرائب 1849',
    taxAuthorityRegNo: officeProfile.taxAuthorityRegNo || '492-817-302',
    phone: officeProfile.phone || '01003335360',
    mobile: officeProfile.mobile || '01003335360',
    email: officeProfile.email || 'info@audit-office.eg',
    mainOfficeTitle: officeProfile.mainOfficeTitle || 'المقر الرئيسي',
    mainOfficeAddress: officeProfile.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
    showMainOfficeAddress: officeProfile.showMainOfficeAddress !== false,
    branchOfficeTitle: officeProfile.branchOfficeTitle || 'فرع العاشر من رمضان',
    branchOfficeAddress: officeProfile.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
    showBranchOfficeAddress: officeProfile.showBranchOfficeAddress !== false,
    showOfficePhones: officeProfile.showOfficePhones !== false,
    showLogo: officeProfile.showLogo !== false,
    headerStyle: officeProfile.headerStyle || 'standard',
    logoUrl: officeProfile.logoUrl,
  });

  const [draftClient, setDraftClient] = useState<ClientProfileData>({
    companyName: clientProfile.companyName || 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)',
    legalForm: clientProfile.legalForm || 'شركة مساهمة مصرية (ش.م.م)',
    commercialRegNo: clientProfile.commercialRegNo || '109482',
    taxRegNo: clientProfile.taxRegNo || '492-817-302',
    taxFileNo: clientProfile.taxFileNo || '204/918',
    taxOffice: clientProfile.taxOffice || 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
    socialInsuranceNo: clientProfile.socialInsuranceNo || '10948201 / مكتب مصر الجديدة',
    address: clientProfile.address || 'المنطقة الصناعية - مدينة السادس من أكتوبر - الجيزة',
    activity: clientProfile.activity || 'تصنيع وتوريد المعدات الهندسية والمستلزمات الصناعية والمقاولات المتخصصة',
    capital: clientProfile.capital || 25000000,
    representedBy: clientProfile.representedBy || 'رئيس مجلس الإدارة والعضو المنتدب',
  });

  const [draftShowClientBanner, setDraftShowClientBanner] = useState<boolean>(showHeaderClientBanner);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleResetToOfficeDefaults = () => {
    const defaultOffice: ExtendedOfficeProfile = {
      firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
      auditorName: 'أ/ محمد جميل مرعي',
      title: 'محاسب قانوني وخبير ضرائب ومراقب حسابات الشركات المساهمة',
      licenseNumber: 'س.م.م 43122',
      taxAuthorityLicense: 'سجل خبراء الضرائب 1849',
      taxAuthorityRegNo: '492-817-302',
      phone: '01003335360',
      mobile: '01003335360',
      email: 'info@audit-office.eg',
      mainOfficeTitle: 'المقر الرئيسي',
      mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
      showMainOfficeAddress: true,
      branchOfficeTitle: 'فرع العاشر من رمضان',
      branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
      showBranchOfficeAddress: true,
      showOfficePhones: true,
      showLogo: true,
      headerStyle: 'standard',
    };
    setDraftOffice(defaultOffice);
  };

  const handleApplyChanges = (triggerPrint: boolean = false) => {
    onSaveOfficeProfile(draftOffice);
    onSaveClientProfile(draftClient);
    if (onToggleShowHeaderClientBanner) {
      onToggleShowHeaderClientBanner(draftShowClientBanner);
    }

    // Persist to local database
    try {
      db.updateOfficeProfile(draftOffice as any);
    } catch (e) {
      console.warn('Persisting office profile:', e);
    }

    setSaveSuccessMessage('تم تطبيق وتثبيت ترويسة المكتب وبيانات المنشأة على جميع أوامر الطباعة والمعاينة بنجاح');
    setTimeout(() => {
      setSaveSuccessMessage('');
      onClose();
      if (triggerPrint && onApplyAndPrint) {
        onApplyAndPrint();
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 overflow-y-auto backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Sliders className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>التحكم المرن في ترويسة المكتب وبيانات المنشأة للطباعة والمعاينة</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  شامل لجميع القوائم والتقارير
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تخصيص المقر الرئيسي والفرع، أرقام الهواتف والتراخيص، وبيانات الشركة، مع تطبيق فوري على كافة المخرجات.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-6 pt-3 flex items-center gap-2 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('OFFICE')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'OFFICE'
                ? 'bg-white text-blue-900 border-t-2 border-x-2 border-b-0 border-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>1. ترويسة ومقرات وهواتف المكتب ({draftOffice.auditorName})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPANY')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'COMPANY'
                ? 'bg-white text-emerald-900 border-t-2 border-x-2 border-b-0 border-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-700" />
            <span>2. بيانات الشركة والمنشأة المفحوصة ({draftClient.companyName})</span>
          </button>
        </div>

        {/* Main Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: Office Profile & Branches */}
          {activeTab === 'OFFICE' && (
            <div className="space-y-5">
              {/* Basic Auditor & Firm Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>البيانات المهنية والتراخيص القانونية للمكتب:</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم / سمة المكتب بالترويسة:</label>
                    <input
                      type="text"
                      value={draftOffice.firmName || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, firmName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم مراقب الحسابات / المحاسب القانوني:</label>
                    <input
                      type="text"
                      value={draftOffice.auditorName || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, auditorName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الصفة والدرجة المهنية:</label>
                    <input
                      type="text"
                      value={draftOffice.title || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم القيد بسجل المحاسبين والمراجعين:</label>
                    <input
                      type="text"
                      value={draftOffice.licenseNumber || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-900 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">سجل الخبراء / القيد الإضافي:</label>
                    <input
                      type="text"
                      value={draftOffice.taxAuthorityLicense || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, taxAuthorityLicense: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:border-blue-600 outline-none"
                      placeholder="سجل خبراء الضرائب 1849"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الرقم الضريبي للمكتب:</label>
                    <input
                      type="text"
                      value={draftOffice.taxAuthorityRegNo || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, taxAuthorityRegNo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Addresses and Phone Numbers Flexibility */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Office Address */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                    <div className="flex items-center gap-1.5 font-black text-blue-950">
                      <MapPin className="w-4 h-4 text-blue-700" />
                      <span>عنوان المقر الرئيسي للمكتب:</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900">
                      <input
                        type="checkbox"
                        checked={draftOffice.showMainOfficeAddress}
                        onChange={(e) => setDraftOffice({ ...draftOffice, showMainOfficeAddress: e.target.checked })}
                        className="rounded accent-blue-700 w-4 h-4 cursor-pointer"
                      />
                      <span>إظهار في الترويسة</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-blue-900 font-bold mb-1">مسمى المقر بالترويسة:</label>
                    <input
                      type="text"
                      value={draftOffice.mainOfficeTitle || 'المقر الرئيسي'}
                      onChange={(e) => setDraftOffice({ ...draftOffice, mainOfficeTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-900 font-bold mb-1">عنوان المقر الرئيسي بالتفصيل:</label>
                    <textarea
                      rows={2}
                      value={draftOffice.mainOfficeAddress || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, mainOfficeAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-800 leading-relaxed font-medium"
                      placeholder="ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية"
                    />
                  </div>
                </div>

                {/* Branch Office Address */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                    <div className="flex items-center gap-1.5 font-black text-indigo-950">
                      <MapPin className="w-4 h-4 text-indigo-700" />
                      <span>عنوان فرع المكتب:</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900">
                      <input
                        type="checkbox"
                        checked={draftOffice.showBranchOfficeAddress}
                        onChange={(e) => setDraftOffice({ ...draftOffice, showBranchOfficeAddress: e.target.checked })}
                        className="rounded accent-indigo-700 w-4 h-4 cursor-pointer"
                      />
                      <span>إظهار في الترويسة</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">مسمى الفرع بالترويسة:</label>
                    <input
                      type="text"
                      value={draftOffice.branchOfficeTitle || 'فرع العاشر من رمضان'}
                      onChange={(e) => setDraftOffice({ ...draftOffice, branchOfficeTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">عنوان الفرع بالتفصيل:</label>
                    <textarea
                      rows={2}
                      value={draftOffice.branchOfficeAddress || ''}
                      onChange={(e) => setDraftOffice({ ...draftOffice, branchOfficeAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-slate-800 leading-relaxed font-medium"
                      placeholder="المباركية مول - مدينة العاشر من رمضان - الشرقية"
                    />
                  </div>
                </div>
              </div>

              {/* Office Phones & Contact Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>أرقام الهواتف ووسائل التواصل المعتمدة:</span>
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={draftOffice.showOfficePhones}
                      onChange={(e) => setDraftOffice({ ...draftOffice, showOfficePhones: e.target.checked })}
                      className="rounded accent-emerald-700 w-4 h-4 cursor-pointer"
                    />
                    <span>إظهار أرقام الهواتف في ترويسة التقارير</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">هاتف المكتب / الأرضي:</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={draftOffice.phone || ''}
                        onChange={(e) => setDraftOffice({ ...draftOffice, phone: e.target.value })}
                        className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        placeholder="01003335360"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الموبايل / الواتساب:</label>
                    <div className="relative">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={draftOffice.mobile || ''}
                        onChange={(e) => setDraftOffice({ ...draftOffice, mobile: e.target.value })}
                        className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        placeholder="01003335360"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني المهني:</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="email"
                        value={draftOffice.email || ''}
                        onChange={(e) => setDraftOffice({ ...draftOffice, email: e.target.value })}
                        className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                        placeholder="info@audit-office.eg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Layout Options */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={draftOffice.showLogo}
                      onChange={(e) => setDraftOffice({ ...draftOffice, showLogo: e.target.checked })}
                      className="rounded accent-blue-700 w-4 h-4 cursor-pointer"
                    />
                    <span>إظهار شعار / أيقونة المكتب</span>
                  </label>

                  <div className="h-4 w-px bg-slate-300" />

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">تنسيق الترويسة:</span>
                    <select
                      value={draftOffice.headerStyle || 'standard'}
                      onChange={(e) => setDraftOffice({ ...draftOffice, headerStyle: e.target.value as any })}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                    >
                      <option value="standard">معتمد متوازن (Standard)</option>
                      <option value="formal-classic">رسمي كلاسيكي ثنائي التوزيع</option>
                      <option value="compact">مدمج موفر للمساحة (Compact)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetToOfficeDefaults}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة القيم الافتراضية المعتمدة للمكتب</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Client & Company Information */}
          {activeTab === 'COMPANY' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-700" />
                    <span>التحكم في ظهور شريط بيانات الشركة بالترويسة:</span>
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    إظهار أو إخفاء ملخص المنشأة (الشكل القانوني، السجل التجاري، البطاقة الضريبية، المأمورية) أعلى كل صفحة مطبوعة.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={draftShowClientBanner}
                    onChange={(e) => setDraftShowClientBanner(e.target.checked)}
                    className="rounded accent-emerald-700 w-4 h-4 cursor-pointer"
                  />
                  <span>إظهار شريط المنشأة بالترويسة</span>
                </label>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">اسم المنشأة / الشركة بالكامل:</label>
                    <input
                      type="text"
                      value={draftClient.companyName}
                      onChange={(e) => setDraftClient({ ...draftClient, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الشكل القانوني والكيان:</label>
                    <input
                      type="text"
                      value={draftClient.legalForm}
                      onChange={(e) => setDraftClient({ ...draftClient, legalForm: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white outline-none"
                      placeholder="شركة مساهمة مصرية (ش.م.م)"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم السجل التجاري والجهة:</label>
                    <input
                      type="text"
                      value={draftClient.commercialRegNo}
                      onChange={(e) => setDraftClient({ ...draftClient, commercialRegNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم التسجيل الضريبي (البطاقة الضريبية):</label>
                    <input
                      type="text"
                      value={draftClient.taxRegNo}
                      onChange={(e) => setDraftClient({ ...draftClient, taxRegNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم الملف الضريبي:</label>
                    <input
                      type="text"
                      value={draftClient.taxFileNo || ''}
                      onChange={(e) => setDraftClient({ ...draftClient, taxFileNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white outline-none"
                      placeholder="204/918"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المأمورية الضريبية التابع لها:</label>
                    <input
                      type="text"
                      value={draftClient.taxOffice}
                      onChange={(e) => setDraftClient({ ...draftClient, taxOffice: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الرقم التأميني ومكتب التأمينات:</label>
                    <input
                      type="text"
                      value={draftClient.socialInsuranceNo}
                      onChange={(e) => setDraftClient({ ...draftClient, socialInsuranceNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رأس المال المصدر والمدفوع (ج.م):</label>
                    <input
                      type="number"
                      value={draftClient.capital}
                      onChange={(e) => setDraftClient({ ...draftClient, capital: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">عنوان مقر المنشأة / المصنع:</label>
                    <input
                      type="text"
                      value={draftClient.address}
                      onChange={(e) => setDraftClient({ ...draftClient, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الممثل القانوني / رئيس مجلس الإدارة:</label>
                    <input
                      type="text"
                      value={draftClient.representedBy}
                      onChange={(e) => setDraftClient({ ...draftClient, representedBy: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-700 font-bold mb-1">طبيعة النشاط والأغراض:</label>
                    <input
                      type="text"
                      value={draftClient.activity}
                      onChange={(e) => setDraftClient({ ...draftClient, activity: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REAL-TIME LIVE PREVIEW BOX */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-700" />
                <span>معاينة حية ومباشرة لشكل الترويسة في الطباعة والمعاينة:</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                تحديث تلقائي فوري مع كل تغيير
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-xs">
              <OfficialReportHeader
                officeProfile={draftOffice}
                clientProfile={draftClient}
                documentTitle={sampleDocumentTitle}
                fiscalYear={sampleYear}
                documentReference={`CREDIT-DOSSIER-${sampleYear}-LIVE`}
                showHeaderClientBanner={draftShowClientBanner}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccessMessage && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer border border-slate-300 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={() => handleApplyChanges(false)}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>تطبيق وحفظ الترويسة للطباعة</span>
            </button>

            {onApplyAndPrint && (
              <button
                type="button"
                onClick={() => handleApplyChanges(true)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>حفظ وتوليد الطباعة فوراً</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
