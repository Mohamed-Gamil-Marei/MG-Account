import React, { useState } from 'react';
import {
  Building2,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  FileBadge,
  ShieldCheck,
  RotateCcw,
  Check,
  Save,
  Sparkles,
  X,
  Sliders,
  FileText,
} from 'lucide-react';
import { OfficeProfile } from '../../types';
import { db } from '../../db/localDatabase';

interface OfficeProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: OfficeProfile;
  onApplyTemporary: (profile: OfficeProfile) => void;
  onSavePermanent?: (profile: OfficeProfile) => void;
}

export const OfficeProfileCustomizerModal: React.FC<OfficeProfileCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onApplyTemporary,
  onSavePermanent,
}) => {
  const [formData, setFormData] = useState<OfficeProfile>({ ...currentProfile });
  const [savePermanentChoice, setSavePermanentChoice] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('CUSTOM');

  if (!isOpen) return null;

  const presets: { id: string; label: string; profile: Partial<OfficeProfile> }[] = [
    {
      id: 'OFFICIAL_CPA',
      label: 'مكتب المحاسب القانوني ومراقب الحسابات (الافتراضي)',
      profile: {
        firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
        auditorName: 'محمد جميل مرعي',
        title: 'محاسب قانوني ومراجع حسابات - زميل جمعية المحاسبين والمراجعين المصرية',
        licenseNumber: 'س.م.م / 43122 - ترخيص وزارة المالية',
        taxAuthorityRegNo: 'م.ض. 492-817-302',
        phone: '01003335360',
        mobile: '01003335360',
        email: 'cpa.mohamed.marei@egyptcpa.com',
        mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
        showMainOfficeAddress: true,
        branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
        showBranchOfficeAddress: true,
        address: 'المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية | الفرع: المباركية مول - مدينة العاشر من رمضان - الشرقية',
      },
    },
    {
      id: 'TAX_CONSULTING',
      label: 'مكتب الاستشارات المالية والضرائب والمحاسبة',
      profile: {
        firmName: 'مكتب المحاسب القانوني للاستشارات المالية والضريبية',
        auditorName: 'محمد جميل مرعي',
        title: 'مستشار ضرائب وخبير محاسبي مقيد بسجل المراجعين والمحاسبين',
        licenseNumber: 'س.م.م / 43122 - سجل خبراء الضرائب والمحاكم الاقتصادية',
        taxAuthorityRegNo: 'م.ض. 492-817-302',
        phone: '01003335360',
        mobile: '01003335360',
        email: 'consulting@egyptcpa.com',
        mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
        showMainOfficeAddress: true,
        branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
        showBranchOfficeAddress: true,
        address: 'المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية | الفرع: المباركية مول - مدينة العاشر من رمضان - الشرقية',
      },
    },
    {
      id: 'AUDIT_FIRM',
      label: 'الشركة المهنية للمحاسبة والمراجعة (ش.م.م)',
      profile: {
        firmName: 'الشركة المهنية للمحاسبة والمراجعة والاستشارات المالية',
        auditorName: 'محمد جميل مرعي (الشريك المدير)',
        title: 'مراقب حسابات الشركات المقيدة بالبورصة وهيئة الرقابة المالية (FRA)',
        licenseNumber: 'س.م.م / 43122 - سجل مراقبي الحسابات بالرقابة المالية رقم 714',
        taxAuthorityRegNo: 'م.ض. 492-817-302',
        phone: '01003335360',
        mobile: '01003335360',
        email: 'audit@egyptcpa.com',
        mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
        showMainOfficeAddress: true,
        branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
        showBranchOfficeAddress: true,
        address: 'برج الأطباء والمحاسبين - التحرير - القاهرة',
      },
    },
  ];

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const target = presets.find((p) => p.id === presetId);
    if (target) {
      setFormData((prev) => ({
        ...prev,
        ...target.profile,
      }));
    }
  };

  const handleResetToDefault = () => {
    const defaultProfile: OfficeProfile = {
      firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
      auditorName: 'محمد جميل مرعي',
      title: 'محاسب قانوني ومراجع حسابات - زميل جمعية المحاسبين والمراجعين المصرية',
      licenseNumber: 'س.م.م / 43122 - ترخيص وزارة المالية',
      taxAuthorityRegNo: 'م.ض. 492-817-302',
      phone: '01003335360',
      mobile: '01003335360',
      email: 'cpa.mohamed.marei@egyptcpa.com',
      mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
      showMainOfficeAddress: true,
      branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
      showBranchOfficeAddress: true,
      address: 'المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية | الفرع: المباركية مول - مدينة العاشر من رمضان - الشرقية',
    };
    setFormData(defaultProfile);
    setActivePreset('OFFICIAL_CPA');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Apply to current preview/export session
    onApplyTemporary(formData);

    // 2. If requested, save permanently to Database
    if (savePermanentChoice) {
      db.updateOfficeProfile(formData);
      if (onSavePermanent) {
        onSavePermanent(formData);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-xs text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                تخصيص وتعديل ترويسة وتذييل بيانات المكتب والمحاسب القانوني
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تعديل بيانات المنشأة المهنية، الاسم، الأرقام الترخيصية، الهواتف والعناوين للطباعة والتصدير
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Presets */}
          <div className="space-y-1.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <label className="block font-bold text-slate-300 text-[11px]">نماذج وقوالب مهنية جاهزة للترويسة:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    activePreset === preset.id
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{preset.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Core Firm and Auditor Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Firm Name */}
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                اسم المكتب / المنشأة المهنية *
              </label>
              <input
                type="text"
                required
                value={formData.firmName}
                onChange={(e) => {
                  setFormData({ ...formData, firmName: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Auditor Name */}
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                اسم المحاسب القانوني ومراقب الحسابات *
              </label>
              <input
                type="text"
                required
                value={formData.auditorName}
                onChange={(e) => {
                  setFormData({ ...formData, auditorName: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Title / Fellowship */}
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <FileBadge className="w-3.5 h-3.5 text-emerald-400" />
                اللقب المهني / صفة الاعتماد والزمالة
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* License Number */}
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                رقم القيد بسجل المحاسبين والترخيص *
              </label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => {
                  setFormData({ ...formData, licenseNumber: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Tax Authority Registration No */}
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                رقم التسجيل الضريبي للمكتب
              </label>
              <input
                type="text"
                value={formData.taxAuthorityRegNo}
                onChange={(e) => {
                  setFormData({ ...formData, taxAuthorityRegNo: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                هاتف المكتب / الموبايل
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value, mobile: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                البريد الإلكتروني المهني
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Main Office Address with Visibility Toggle */}
            <div className="sm:col-span-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  عنوان المقر الرئيسي للمكتب:
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.showMainOfficeAddress !== false}
                    onChange={(e) => {
                      setFormData({ ...formData, showMainOfficeAddress: e.target.checked });
                      setActivePreset('CUSTOM');
                    }}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>إظهار في الترويسة والطباعة</span>
                </label>
              </div>
              <input
                type="text"
                value={formData.mainOfficeAddress || ''}
                placeholder="ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية"
                onChange={(e) => {
                  setFormData({ ...formData, mainOfficeAddress: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Branch Office Address with Visibility Toggle */}
            <div className="sm:col-span-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-teal-300 font-bold flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  عنوان الفرع (العاشر من رمضان):
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.showBranchOfficeAddress !== false}
                    onChange={(e) => {
                      setFormData({ ...formData, showBranchOfficeAddress: e.target.checked });
                      setActivePreset('CUSTOM');
                    }}
                    className="rounded border-slate-600 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>إظهار في الترويسة والطباعة</span>
                </label>
              </div>
              <input
                type="text"
                value={formData.branchOfficeAddress || ''}
                placeholder="المباركية مول - مدينة العاشر من رمضان - الشرقية"
                onChange={(e) => {
                  setFormData({ ...formData, branchOfficeAddress: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Combined/General Address */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-bold mb-1 flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3 h-3 text-slate-500" />
                العنوان المجمع / الشامل (للمراسلات العامة):
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setActivePreset('CUSTOM');
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:border-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Permanent Persistence Option */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-emerald-200 font-bold">
              <input
                type="checkbox"
                checked={savePermanentChoice}
                onChange={(e) => setSavePermanentChoice(e.target.checked)}
                className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>حفظ هذه البيانات كإعدادات افتراضية دائمة للمكتب في قاعدة البيانات</span>
            </label>
            <span className="text-[10px] text-emerald-400/80">ستسري على جميع المعاملات والشاشات مستقبلاً</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة البيانات الافتراضية</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق البيانات على الترويسة والتصدير</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
