import React, { useState, useRef, useMemo } from 'react';
import {
  Printer,
  Image,
  Upload,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Scale,
  Award,
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  Building2,
  Layout,
  Eye,
  FileText,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  Info,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import {
  PrintSettings,
  OfficeProfile,
  ReportLayoutConfig,
  StandardReportType,
} from '../../types';
import {
  DEFAULT_PRINT_SETTINGS,
  DEFAULT_REPORT_LAYOUTS,
  PrintService,
} from '../../services/PrintService';
import { MgBrandBadge } from './MgBrandBadge';

interface PrintExportSettingsUnitProps {
  onSaved?: () => void;
  showHeader?: boolean;
}

export const PrintExportSettingsUnit: React.FC<PrintExportSettingsUnitProps> = ({
  onSaved,
  showHeader = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Load current settings & profile from database
  const currentSettings: PrintSettings = PrintService.getSettings();
  const currentProfile: OfficeProfile = db.getState().officeProfile || {
    auditorName: 'محمد جميل مرعي',
    title: 'محاسب قانوني وخبير ضرائب ومراقب حسابات',
    firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
    licenseNumber: 'س.م.م / 43122',
    taxAuthorityRegNo: 'م.ض. 492-817-302',
    phone: '01003335360',
    mobile: '01003335360',
    email: 'cpa.mohamed.marei@egyptcpa.com',
    address: 'المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
    mainOfficeAddress: 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
    showMainOfficeAddress: true,
    branchOfficeAddress: 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
    showBranchOfficeAddress: true,
    showLogo: true,
    logoType: 'MOHAMED_GAMIL_GOLD',
    headerStyle: 'standard',
  };

  const [settings, setSettings] = useState<PrintSettings>({
    ...DEFAULT_PRINT_SETTINGS,
    ...currentSettings,
    reportDefaults: {
      ...DEFAULT_REPORT_LAYOUTS,
      ...(currentSettings.reportDefaults || {}),
    },
  });

  const [profile, setProfile] = useState<OfficeProfile>({
    ...currentProfile,
  });

  const [activeTab, setActiveTab] = useState<'HEADER' | 'LOGO' | 'REPORTS_LAYOUT' | 'BACKUP'>('HEADER');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const notifySaved = (msg: string = 'تم حفظ التفضيلات محلياً وتطبيقها بنجاح!') => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
    if (onSaved) onSaved();
  };

  // Update PrintSettings
  const handleUpdateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    PrintService.saveSettings({ [key]: value });
    notifySaved();
  };

  // Update OfficeProfile
  const handleUpdateProfile = <K extends keyof OfficeProfile>(key: K, value: OfficeProfile[K]) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    db.updateOfficeProfile({ [key]: value });
    notifySaved();
  };

  // Update layout for specific report
  const handleUpdateReportLayout = (
    reportType: StandardReportType,
    field: keyof ReportLayoutConfig,
    value: any
  ) => {
    const currentReportDefaults = settings.reportDefaults || { ...DEFAULT_REPORT_LAYOUTS };
    const currentForType = currentReportDefaults[reportType] || DEFAULT_REPORT_LAYOUTS[reportType];
    const updatedForType = { ...currentForType, [field]: value };
    const updatedDefaults = {
      ...currentReportDefaults,
      [reportType]: updatedForType,
    };

    const updatedSettings = {
      ...settings,
      reportDefaults: updatedDefaults,
    };

    setSettings(updatedSettings);
    PrintService.saveSettings({ reportDefaults: updatedDefaults });
    notifySaved(`تم تحديث التنسيق الافتراضي لتقرير (${getReportName(reportType)}) بنجاح!`);
  };

  // Handle Logo File Upload (PNG/JPG/SVG converted to Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPEG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير نسبياً. يفضل أن يكون حجم الشعار أقل من 2 ميجابايت لضمان سرعة الطباعة.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleUpdateProfile('logoUrl', dataUrl);
      handleUpdateProfile('logoType', 'CUSTOM_UPLOAD');
      handleUpdateProfile('showLogo', true);
      notifySaved('تم رفع وتثبيت شعار المكتب بنجاح!');
    };
    reader.readAsDataURL(file);
  };

  // Export settings as JSON file
  const handleExportJson = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      printSettings: settings,
      officeHeaderProfile: {
        firmName: profile.firmName,
        auditorName: profile.auditorName,
        title: profile.title,
        licenseNumber: profile.licenseNumber,
        taxAuthorityRegNo: profile.taxAuthorityRegNo,
        phone: profile.phone,
        mobile: profile.mobile,
        email: profile.email,
        mainOfficeAddress: profile.mainOfficeAddress,
        showMainOfficeAddress: profile.showMainOfficeAddress,
        branchOfficeAddress: profile.branchOfficeAddress,
        showBranchOfficeAddress: profile.showBranchOfficeAddress,
        showLogo: profile.showLogo,
        logoType: profile.logoType,
        headerStyle: profile.headerStyle,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EAS_Print_Settings_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notifySaved('تم تصدير ملف إعدادات الطباعة والتصدير بنجاح!');
  };

  // Import settings from JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.printSettings) {
          setSettings(parsed.printSettings);
          PrintService.saveSettings(parsed.printSettings);
        }
        if (parsed.officeHeaderProfile) {
          setProfile((prev) => ({ ...prev, ...parsed.officeHeaderProfile }));
          db.updateOfficeProfile(parsed.officeHeaderProfile);
        }
        notifySaved('تم استيراد تفضيلات الطباعة والتصدير وتطبيقها بنجاح!');
      } catch (err) {
        alert('ملف غير صالح أو تالف.');
      }
    };
    reader.readAsText(file);
  };

  // Restore factory defaults
  const handleRestoreAllDefaults = () => {
    if (window.confirm('هل أنت متأكد من استعادة كافة إعدادات الطباعة وترويسة التقارير الافتراضية؟')) {
      setSettings(DEFAULT_PRINT_SETTINGS);
      PrintService.saveSettings(DEFAULT_PRINT_SETTINGS);
      notifySaved('تمت استعادة الإعدادات النموذجية الموصى بها بنجاح!');
    }
  };

  // Standard report definitions list
  const reportsList: {
    type: StandardReportType;
    name: string;
    category: string;
    icon: any;
    recommended: string;
  }[] = [
    {
      type: 'TRIAL_BALANCE',
      name: 'ميزان المراجعة بالأرصدة والمجاميع',
      category: 'المحاسبة العامة',
      icon: Scale,
      recommended: 'A4 • أفقي (Landscape) • هوامش ضيقة',
    },
    {
      type: 'BALANCE_SHEET',
      name: 'قائمة المركز المالي (الميزانية العمومية)',
      category: 'القوائم الختامية',
      icon: FileSpreadsheet,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'INCOME_STATEMENT',
      name: 'قائمة الدخل والأرباح والخسائر',
      category: 'القوائم الختامية',
      icon: FileSpreadsheet,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'UNIFIED_FINANCIAL_REPORT',
      name: 'التقارير المالية الموحدة المجمعة (PDF)',
      category: 'التقارير الموحدة',
      icon: Layout,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'AUDITOR_REPORT',
      name: 'تقرير مراقب الحسابات المستقل',
      category: 'المراجعة والاعتماد',
      icon: Award,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'INVOICE',
      name: 'فواتير أتعاب المكتب والإيصالات',
      category: 'الفواتير والضرائب',
      icon: FileText,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'TAX_DECLARATION',
      name: 'إقرارات وفحص الضرائب (دخل / قيمة مضافة)',
      category: 'الضرائب المصرية',
      icon: ShieldCheck,
      recommended: 'A4 • عمودي (Portrait) • هوامش ضيقة',
    },
    {
      type: 'CERTIFICATE',
      name: 'الشهادات المهنية المعتمدة للمصارف والجهات',
      category: 'الشهادات الرسمية',
      icon: Award,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
    {
      type: 'CREDIT_DOSSIER',
      name: 'ملف التحليل والتقييم الائتماني للبنوك',
      category: 'الائتمان المصرفي',
      icon: Layout,
      recommended: 'A4 • أفقي (Landscape) • هوامش ضيقة',
    },
    {
      type: 'FEASIBILITY_STUDY',
      name: 'دراسات الجدوى الاقتصادية والمالية',
      category: 'الاستشارات والجدوى',
      icon: FileText,
      recommended: 'A4 • عمودي (Portrait) • هوامش افتراضية',
    },
  ];

  function getReportName(t: StandardReportType): string {
    return reportsList.find((r) => r.type === t)?.name || t;
  }

  // Active theme classes for header preview
  const themeHeaderStyles = {
    navy: 'border-blue-900 text-blue-950 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/70',
    emerald: 'border-emerald-800 text-emerald-950 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/70',
    indigo: 'border-indigo-900 text-indigo-950 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/70',
    gold: 'border-amber-700 text-amber-950 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/70',
    slate: 'border-slate-800 text-slate-900 bg-gradient-to-r from-slate-50 via-white to-slate-50',
  }[settings.headerColorTheme || 'navy'];

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
      {/* Module Title & Top Toolbar */}
      {showHeader && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-950/20 shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  وحدة إعدادات الطباعة والتصدير وترويسة التقارير
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  تخصيص متقدم
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تخصيص ترويسة التقارير، إضافة شعار المكتب، وتحديد تنسيق الورق الافتراضي (A4/Portrait/Landscape) لكل تقرير مع حفظ محلي دائم.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تصدير نسخة احتياطية من الإعدادات كملف JSON"
            >
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>تصدير JSON</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreAllDefaults}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="استعادة الإعدادات النموذجية المعتمدة"
            >
              <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>
        </div>
      )}

      {/* Save Success Notice Banner */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">حفظ فوري محلياً ✓</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('HEADER')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'HEADER'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. خيارات ترويسة التقارير</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOGO')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'LOGO'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>2. شعار وهوية المكتب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REPORTS_LAYOUT')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'REPORTS_LAYOUT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>3. تنسيق الورق لكل تقرير (A4/Portrait/Landscape)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'BACKUP'
              ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>4. الحفظ المحلي والنسخ الاحتياطي</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REPORT HEADER CUSTOMIZATION                        */}
      {/* ========================================================= */}
      {activeTab === 'HEADER' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Style & Colors */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  طراز وتصميم ترويسة التقارير الرسمية
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">ينعكس فوراً على كافة مخرجات الميزان والقوائم والشهادات</span>
            </div>

            {/* Header Style Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                {
                  id: 'standard',
                  title: 'شريط قياسي رسمي',
                  desc: 'تنسيق متوازن بشريط علوي مذهب وبيانات الاعتماد في جهة والشعار بالجهة المقابلة.',
                },
                {
                  id: 'formal-classic',
                  title: 'كلاسيكي تقليدي وقور',
                  desc: 'خطوط إطارية مزدوجة مع تركز اسم المحاسب بالمنتصف وختم النسر أو الشعار.',
                },
                {
                  id: 'two-column',
                  title: 'عصري مقسم لعمودين',
                  desc: 'بيانات المكتب والفرعين باليمين والشعار والباركود الرقمي باليسار بتوزيع متساوٍ.',
                },
                {
                  id: 'compact',
                  title: 'موجز مدمج (توفير مساحة)',
                  desc: 'ترويسة مقتضبة في سطرين لترك أقصى مساحة ممكنة لجداول الحسابات.',
                },
              ].map((style) => (
                <div
                  key={style.id}
                  onClick={() => {
                    handleUpdateSetting('headerStyle', style.id as any);
                    handleUpdateProfile('headerStyle', style.id as any);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    (settings.headerStyle || 'standard') === style.id
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{style.title}</span>
                      {(settings.headerStyle || 'standard') === style.id && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{style.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Header Color Theme */}
            <div className="pt-2">
              <label className="block text-slate-800 dark:text-slate-200 font-bold mb-2">
                نسق ولون ترويسة التقارير الرسمية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'navy', label: 'كحلي مصرفي رسمي', color: 'bg-blue-900' },
                  { id: 'emerald', label: 'أخضر مالي وضريبي', color: 'bg-emerald-800' },
                  { id: 'indigo', label: 'نيل ملكي وقور', color: 'bg-indigo-900' },
                  { id: 'gold', label: 'ذهبي أندلسي فاخر', color: 'bg-amber-700' },
                  { id: 'slate', label: 'رمادي مؤسسي كلاسيكي', color: 'bg-slate-800' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleUpdateSetting('headerColorTheme', th.id as any)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                      (settings.headerColorTheme || 'navy') === th.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${th.color} shrink-0`}></span>
                    <span className="text-[11px] truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Content Field Toggles */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="block text-slate-800 dark:text-slate-200 font-bold">
                عناصر وبيانات الترويسة المطبوعة:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">عنوان المكتب الرئيسي</span>
                    <span className="text-[10px] text-slate-500 block">ميدان النافورة - الحسينية</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.showMainOfficeAddress !== false}
                    onChange={(e) => handleUpdateProfile('showMainOfficeAddress', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">عنوان فرع العاشر من رمضان</span>
                    <span className="text-[10px] text-slate-500 block">المباركية مول</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.showBranchOfficeAddress !== false}
                    onChange={(e) => handleUpdateProfile('showBranchOfficeAddress', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">أرقام الهواتف والتواصل</span>
                    <span className="text-[10px] text-slate-500 block">01003335360</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.showOfficePhones !== false}
                    onChange={(e) => handleUpdateProfile('showOfficePhones', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Real-time Interactive Header Preview */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  معاينة حية ومباشرة لشكل الترويسة في أوراق المخرجات:
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                Live A4 Header Preview
              </span>
            </div>

            {/* The Live Rendered Header Canvas */}
            <div className={`p-4 rounded-2xl border-2 ${themeHeaderStyles} shadow-inner`}>
              <div className="flex items-start justify-between gap-4">
                {/* Right Side: Office & Auditor Data */}
                <div className="space-y-0.5 text-right flex-1">
                  <div className="font-bold text-[11px] text-amber-700 dark:text-amber-500 tracking-wider">
                    جمهورية مصر العربية • وزارة المالية
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                    {profile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'}
                  </div>
                  <div className="text-xs font-bold text-blue-900">
                    {profile.auditorName || 'محمد جميل مرعي'}
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold">
                    {profile.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات'}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 pt-1 flex-wrap font-mono">
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-300">
                      رقم القيد: {profile.licenseNumber || 'س.م.م 43122'}
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-300">
                      البطاقة الضريبية: {profile.taxAuthorityRegNo || '492-817-302'}
                    </span>
                  </div>
                </div>

                {/* Left Side: Logo & Branches Info */}
                <div className="text-left shrink-0 space-y-1">
                  {profile.showLogo !== false && (
                    <div className="flex justify-end mb-1">
                      {profile.logoType === 'CUSTOM_UPLOAD' && profile.logoUrl ? (
                        <img
                          src={profile.logoUrl}
                          alt="Office Logo"
                          className="h-12 max-w-[140px] object-contain rounded"
                        />
                      ) : (
                        <MgBrandBadge size="md" />
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-600 space-y-0.5">
                    {profile.showMainOfficeAddress !== false && (
                      <div>{profile.mainOfficeAddress || 'المركز الرئيسي: الحسينية - الشرقية'}</div>
                    )}
                    {profile.showBranchOfficeAddress !== false && (
                      <div>{profile.branchOfficeAddress || 'فرع: العاشر من رمضان'}</div>
                    )}
                    {profile.showOfficePhones !== false && (
                      <div className="font-mono text-blue-900 font-bold">{profile.phone || '01003335360'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: OFFICE LOGO & BRANDING                             */}
      {/* ========================================================= */}
      {activeTab === 'LOGO' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  شعار المكتب والعلامة التجارية للمطبوعات
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">يدعم صيغ PNG الشفافة، SVG، و JPEG</span>
            </div>

            {/* Master Show/Hide Logo Toggle */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  إظهار الشعار في ترويسة التقارير والمستندات
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  عند التعطيل، ستقتصر الترويسة على النصوص والأختام دون وضع أي صورة أو رمز شعار.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mr-3">
                <input
                  type="checkbox"
                  checked={profile.showLogo !== false}
                  onChange={(e) => handleUpdateProfile('showLogo', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Logo Type Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Custom Upload */}
              <div
                onClick={() => {
                  handleUpdateProfile('logoType', 'CUSTOM_UPLOAD');
                  if (!profile.logoUrl && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 flex flex-col justify-between ${
                  profile.logoType === 'CUSTOM_UPLOAD'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>شعار مخصص خاص بالمكتب (ملف)</span>
                    </span>
                    {profile.logoType === 'CUSTOM_UPLOAD' && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    رفع لوجو المكتب بصيغة PNG أو JPG أو SVG ليظهر في الترويسة الرسمية.
                  </p>
                </div>

                {profile.logoUrl && profile.logoType === 'CUSTOM_UPLOAD' ? (
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <img
                      src={profile.logoUrl}
                      alt="Uploaded Logo"
                      className="h-10 max-w-[120px] object-contain"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                        title="تغيير الصورة"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateProfile('logoUrl', undefined);
                          handleUpdateProfile('logoType', 'MOHAMED_GAMIL_GOLD');
                          notifySaved('تم حذف الشعار المخصص واستعادة شعار المكتب الافتراضي.');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                        title="حذف الشعار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ملف الشعار الآن</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  className="hidden"
                />
              </div>

              {/* Option 2: Default Mohamed Gamil Gold Emblem */}
              <div
                onClick={() => {
                  handleUpdateProfile('logoType', 'MOHAMED_GAMIL_GOLD');
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 flex flex-col justify-between ${
                  profile.logoType === 'MOHAMED_GAMIL_GOLD'
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>شعار MG الملكي المذهب (الافتراضي)</span>
                    </span>
                    {profile.logoType === 'MOHAMED_GAMIL_GOLD' && (
                      <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    شعار مذهب احترافي مصمم خصيصاً لمكتب المحاسب القانوني ومراقب الحسابات محمد جميل مرعي.
                  </p>
                </div>

                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <MgBrandBadge size="md" />
                </div>
              </div>

              {/* Option 3: Official Egypt Emblem */}
              <div
                onClick={() => {
                  handleUpdateProfile('logoType', 'EGYPT_EMBLEM');
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 flex flex-col justify-between ${
                  profile.logoType === 'EGYPT_EMBLEM'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>شعار النسر المصري للمطبوعات الرسمية</span>
                    </span>
                    {profile.logoType === 'EGYPT_EMBLEM' && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    شارة رسمية معتمدة للشهادات والتقارير الموجهة للبنوك والجهات الحكومية والضريبية.
                  </p>
                </div>

                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-xs text-amber-800 dark:text-amber-300">
                  🦅 نسر جمهورية مصر العربية
                </div>
              </div>
            </div>

            {/* Logo Size and Placement */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1">
                  موضع الشعار بالترويسة:
                </label>
                <select
                  value={settings.logoPosition || 'RIGHT'}
                  onChange={(e) => handleUpdateSetting('logoPosition', e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
                >
                  <option value="RIGHT">أعلى اليمين (محاذاة الاسم)</option>
                  <option value="CENTER">في المنتصف بين البيانات</option>
                  <option value="LEFT">أعلى اليسار (الوضع القياسي المعتمد)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1">
                  حجم الشعار في الورقة المطبوعة:
                </label>
                <select
                  value={settings.logoSizePx || 64}
                  onChange={(e) => handleUpdateSetting('logoSizePx', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
                >
                  <option value={48}>صغير (48px) - ترويسة مقتضبة</option>
                  <option value={64}>متوسط قياسي (64px) - متناسق مع A4</option>
                  <option value={80}>كبير وبارز (80px) - للشهادات والتقارير الكبرى</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PER-REPORT PAPER & LAYOUT DEFAULTS                */}
      {/* ========================================================= */}
      {activeTab === 'REPORTS_LAYOUT' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between gap-3 text-indigo-950 dark:text-indigo-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="font-bold text-xs">تنسيقات الورق والطباعة الافتراضية لكل تقرير محاسبي</div>
                <div className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                  حدد مسبقاً لكل تقرير مقاس الورق (A4)، والاتجاه (عمودي أو أفقي للجداول العريضة)، والهوامش ليتم تطبيقها تلقائياً عند الطباعة.
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Reports Layout Table / Cards */}
          <div className="space-y-3">
            {reportsList.map((item) => {
              const Icon = item.icon;
              const currentConfig: ReportLayoutConfig =
                settings.reportDefaults?.[item.type] || DEFAULT_REPORT_LAYOUTS[item.type];

              return (
                <div
                  key={item.type}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Report Identification */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold shrink-0">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          الموصى به: <strong className="text-slate-600 dark:text-slate-300">{item.recommended}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Layout Controls Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 lg:max-w-2xl">
                      {/* Paper Size */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">مقاس الورق</label>
                        <select
                          value={currentConfig.paperSize}
                          onChange={(e) =>
                            handleUpdateReportLayout(item.type, 'paperSize', e.target.value as any)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                        >
                          <option value="A4">A4 (قياسي)</option>
                          <option value="LETTER">Letter</option>
                          <option value="LEGAL">Legal</option>
                        </select>
                      </div>

                      {/* Orientation */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">اتجاه الطباعة</label>
                        <select
                          value={currentConfig.orientation}
                          onChange={(e) =>
                            handleUpdateReportLayout(item.type, 'orientation', e.target.value as any)
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            currentConfig.orientation === 'LANDSCAPE'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                          }`}
                        >
                          <option value="PORTRAIT">عمودي (Portrait)</option>
                          <option value="LANDSCAPE">أفقي (Landscape)</option>
                        </select>
                      </div>

                      {/* Margins */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">الهوامش</label>
                        <select
                          value={currentConfig.margins}
                          onChange={(e) =>
                            handleUpdateReportLayout(item.type, 'margins', e.target.value as any)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                        >
                          <option value="DEFAULT">افتراضية (8mm)</option>
                          <option value="NARROW">ضيقة (5mm)</option>
                          <option value="WIDE">واسعة (15mm)</option>
                          <option value="NONE">بدون هوامش (0mm)</option>
                        </select>
                      </div>

                      {/* Quick Toggles: Letterhead & Stamp */}
                      <div className="flex items-center justify-around bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-end">
                        <label
                          className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 dark:text-slate-300"
                          title="إظهار الترويسة في هذا التقرير"
                        >
                          <input
                            type="checkbox"
                            checked={currentConfig.includeLetterhead !== false}
                            onChange={(e) =>
                              handleUpdateReportLayout(item.type, 'includeLetterhead', e.target.checked)
                            }
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>ترويسة</span>
                        </label>

                        <label
                          className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 dark:text-slate-300"
                          title="إظهار الختم والتوقيع في هذا التقرير"
                        >
                          <input
                            type="checkbox"
                            checked={currentConfig.includeStamp !== false}
                            onChange={(e) =>
                              handleUpdateReportLayout(item.type, 'includeStamp', e.target.checked)
                            }
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>ختم</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: LOCAL PERSISTENCE & BACKUP                         */}
      {/* ========================================================= */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                إدارة الحفظ المحلي وتصدير واستيراد ملف الإعدادات
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Storage Status */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  الحفظ المحلي التلقائي (Local Persistence)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  كافة التعديلات التي تجريها على الترويسة أو الشعار أو أبعاد الورق تُحفظ فوراً داخل قاعدة البيانات المحلية للمتصفح (<code className="font-mono text-blue-600">localDatabase.ts</code>) وتبلغ المنظومة بها لحظياً.
                </p>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الحفظ التلقائي نشط ومؤمّن محلياً</span>
                </div>
              </div>

              {/* JSON Backup & Restore */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  النسخ الاحتياطي ونقل الإعدادات
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  يمكنك حفظ تفضيلاتك في ملف خارجي لنقلها إلى جهاز آخر أو استعادتها بعد تهيئة المتصفح.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير ملف الإعدادات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jsonImportRef.current?.click()}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>استيراد ملف</span>
                  </button>

                  <input
                    type="file"
                    ref={jsonImportRef}
                    onChange={handleImportJson}
                    accept="application/json"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Reset Defaults Warning */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-amber-950 dark:text-amber-200 block">
                  استعادة التكوين الافتراضي المحاسبي الموصى به
                </span>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 block">
                  إعادة ضبط مقاسات الورق (A4)، اتجاهات الطباعة، والترويسة إلى الإعدادات القياسية للمكتب.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRestoreAllDefaults}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>استعادة كافة الإعدادات النموذجية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
