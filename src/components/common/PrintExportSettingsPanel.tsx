import React, { useState } from 'react';
import {
  Printer,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  Info,
  Smartphone,
  Eye,
  FileCheck,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { PrintSettings } from '../../types';
import { DEFAULT_PRINT_SETTINGS, PrintService } from '../../services/PrintService';
import { generateQrCodeSvg } from '../../utils/qrCodeGenerator';

interface PrintExportSettingsPanelProps {
  onSaved?: () => void;
  compact?: boolean;
}

export const PrintExportSettingsPanel: React.FC<PrintExportSettingsPanelProps> = ({
  onSaved,
  compact = false,
}) => {
  const currentSettings: PrintSettings = PrintService.getSettings();

  const [settings, setSettings] = useState<PrintSettings>({
    ...DEFAULT_PRINT_SETTINGS,
    ...currentSettings,
  });

  const [savedNotice, setSavedNotice] = useState(false);

  const handleUpdate = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    PrintService.saveSettings({ [key]: value });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
    if (onSaved) onSaved();
  };

  const sampleQrSvg = generateQrCodeSvg(
    `[وثيقة محاسبية معتمدة - جمهورية مصر العربية]\nمكتب المحاسب القانوني ومراقب الحسابات\nمحمد جميل مرعي - س.م.م 43122\nميزان المراجعة والقوائم المالية معتمدة وموزونة ✓`,
    settings.qrSizePx || 110,
    { mode: settings.qrMode || 'OFFLINE_TEXT' }
  );

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
      {/* Top Banner Notice */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-center justify-between gap-3 text-blue-950 dark:text-blue-200">
        <div className="flex items-center gap-2.5">
          <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-xs">نظام التحكم الشامل في أساليب الطباعة ورمز الـ QR والتصدير</div>
            <div className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
              تخصيص نمط الباركود، شكل الختم، الترويسة، ومقاسات الورق المعتمدة لكافة تقارير المنظومة
            </div>
          </div>
        </div>

        {savedNotice && (
          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 animate-in fade-in">
            <CheckCircle2 className="w-3 h-3" />
            <span>تم الحفظ فوراً ✓</span>
          </span>
        )}
      </div>

      {/* SECTION 1: QR CODE MASTER CONTROLS */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              1. إعدادات باركود التحقق الرقمي (QR Code)
            </h4>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
            {settings.includeQrVerification ? 'الـ QR مفعّل في المطبوعات' : 'الـ QR معطّل ملغى'}
          </span>
        </div>

        {/* Master QR Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-slate-900 dark:text-white block">
              إظهار باركود التحقق الرقمي (QR) في المطبوعات والتقارير
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              إذا قمت بإلغائه، سيتم حذفه من كافة الفواتير والإقرارات والقوائم المطبوعة والاكتفاء بالختم والتوقيع الرسمي فقط.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mr-3">
            <input
              type="checkbox"
              checked={settings.includeQrVerification}
              onChange={(e) => handleUpdate('includeQrVerification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* QR Mode Selection (Offline Text vs URL Link) */}
        {settings.includeQrVerification && (
          <div className="space-y-3 pt-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
              نمط تشغيل ومحتوى الـ QR (حل مشكلة المسح بالهاتف):
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option A: Offline Human-Readable Card (Recommended) */}
              <div
                onClick={() => handleUpdate('qrMode', 'OFFLINE_TEXT')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                  (settings.qrMode || 'OFFLINE_TEXT') === 'OFFLINE_TEXT'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      بطاقة اعتماد نصية أوفلاين (موصى بها)
                    </span>
                  </div>
                  {(settings.qrMode || 'OFFLINE_TEXT') === 'OFFLINE_TEXT' && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>تعمل 100% بدون إنترنت:</strong> بمجرد توجيه كاميرا أي هاتف (آيفون/أندرويد)، تظهر له فوراً بطاقة نصية رسمية ببيانات المكتب والعميل ورقم القيد وحالة الاتزان دون فتح متصفح أو أخطاء سيرفر.
                </p>
                <div className="text-[10px] font-mono bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500">
                  مثال: [وثيقة معتمدة - مكتب م. جميل مرعي - س.م.م 43122]
                </div>
              </div>

              {/* Option B: Direct Verification URL */}
              <div
                onClick={() => handleUpdate('qrMode', 'URL_LINK')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                  settings.qrMode === 'URL_LINK'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      رابط ويب إلكتروني مباشر (URL)
                    </span>
                  </div>
                  {settings.qrMode === 'URL_LINK' && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  يفتح رابط التحقق الرقمي على متصفح الهاتف عبر الإنترنت (مناسب عند رفع النظام على دومين رسمي عام للمكتب).
                </p>
                <div className="text-[10px] font-mono bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 truncate">
                  مثال: https://office-domain.com/#verify?id=EAS-2026
                </div>
              </div>
            </div>

            {/* QR Size and Preview Strip */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                  حجم ووضوح الـ QR في المطبوعات:
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { val: 95, label: 'عادي (95px)' },
                    { val: 115, label: 'متوسط واضح (115px) - قياسي' },
                    { val: 135, label: 'كبير عالي الدقة (135px)' },
                  ].map((sz) => (
                    <button
                      key={sz.val}
                      type="button"
                      onClick={() => handleUpdate('qrSizePx', sz.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.qrSizePx || 115) === sz.val
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time QR Preview Box */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                <div
                  className="bg-white p-1 rounded border border-slate-200 shadow-2xs"
                  dangerouslySetInnerHTML={{ __html: sampleQrSvg }}
                />
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">معاينة حية للمسح:</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                    {(settings.qrMode || 'OFFLINE_TEXT') === 'OFFLINE_TEXT' ? 'أوفلاين بدون نت' : 'رابط ويب'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {settings.qrSizePx || 115}px
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: OFFICIAL STAMP & LETTERHEAD CONTROLS */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              2. ترويسة المكتب وخاتم مراقب الحسابات
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Include Letterhead */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">الترويسة الرسمية</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">اسم المكتب والهوية بأعلى الورقة</span>
            </div>
            <input
              type="checkbox"
              checked={settings.includeLetterhead}
              onChange={(e) => handleUpdate('includeLetterhead', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Include Office Tax & License Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">رقم القيد والبطاقة</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">س.م.م وبطاقة مصلحة الضرائب</span>
            </div>
            <input
              type="checkbox"
              checked={settings.includeOfficeTaxInfo}
              onChange={(e) => handleUpdate('includeOfficeTaxInfo', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Include Signature & Stamp */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">الختم والتوقيع الرسمي</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">خاتم وتوقيع المحاسب القانوني</span>
            </div>
            <input
              type="checkbox"
              checked={settings.includeSignatureStamp}
              onChange={(e) => handleUpdate('includeSignatureStamp', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Stamp Style Options */}
        {settings.includeSignatureStamp && (
          <div className="pt-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-2">
              شكل وهيئة الختم المعتمد بالتذييل:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'CIRCULAR_SEAL',
                  label: 'خاتم مهني دائري معتمد',
                  desc: 'خاتم دائري رسمي يحمل اسم المحاسب ورقم القيد بوزارة المالية (المظهر القياسي للبنوك والشركات)',
                },
                {
                  id: 'RECTANGLE_FORMAL',
                  label: 'إطار مستطيل كلاسيكي',
                  desc: 'تنسيق مستطيل محدد ببيانات الاعتماد ورقم السجل والتوقيع الخطي',
                },
                {
                  id: 'SIGNATURE_ONLY',
                  label: 'توقيع خطي واعتماد حر',
                  desc: 'توقيع المحاسب القانوني المباشر فقط دون إطار دائري للختم',
                },
              ].map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleUpdate('stampStyle', st.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    (settings.stampStyle || 'CIRCULAR_SEAL') === st.id
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{st.label}</span>
                    {(settings.stampStyle || 'CIRCULAR_SEAL') === st.id && (
                      <span className="text-blue-600 text-xs font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: PAGE LAYOUT, PAPER & FOOTER CONTROLS */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              3. أبعاد الورق وتنسيق التصدير (PDF / Layout)
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Paper Size */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">مقاس الورق</label>
            <select
              value={settings.paperSize}
              onChange={(e) => handleUpdate('paperSize', e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
            >
              <option value="A4">A4 القياسي (210 × 297 مم) - معتمد</option>
              <option value="LETTER">Letter قياسي أمريكي</option>
              <option value="LEGAL">Legal طويل</option>
            </select>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الهوامش (Margins)</label>
            <select
              value={settings.margins}
              onChange={(e) => handleUpdate('margins', e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
            >
              <option value="DEFAULT">افتراضية (8 مم) - متناسقة</option>
              <option value="NARROW">ضيقة (5 مم) - لأقصى مساحة جداول</option>
              <option value="NONE">بدون هوامش (0 مم)</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الاتجاه التلقائي</label>
            <select
              value={settings.orientation}
              onChange={(e) => handleUpdate('orientation', e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
            >
              <option value="PORTRAIT">عمودي (Portrait) - افتراضي</option>
              <option value="LANDSCAPE">أفقي (Landscape) - للجداول العريضة</option>
              <option value="AUTO">تلقائي حسب عرض التقرير</option>
            </select>
          </div>
        </div>

        {/* Footer toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              ترقيم الصفحات التلقائي (صفحة X من Y)
            </span>
            <input
              type="checkbox"
              checked={settings.showPageNumbers !== false}
              onChange={(e) => handleUpdate('showPageNumbers', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              إظهار ختم التوقيت وتاريخ الاستخراج بالتذييل
            </span>
            <input
              type="checkbox"
              checked={settings.showDocumentTimestamp !== false}
              onChange={(e) => handleUpdate('showDocumentTimestamp', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* SECTION 4: COLOR SCHEME, INK SAVING & WATERMARK */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              4. نمط الألوان والعلامة المائية وتوفير الحبر (Eco-Print)
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Ink Saver Toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                نمط توفير حبر الطباعة (Ink Saver)
              </span>
              <span className="text-[10px] text-slate-500 block">
                تحويل المطبوعات إلى أبيض وأسود عالي التباين لتقليل استهلاك الأحبار في الطابعات المكتبية
              </span>
            </div>
            <input
              type="checkbox"
              checked={!!settings.inkSaver}
              onChange={(e) => handleUpdate('inkSaver', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Watermark Selector */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <label className="block text-slate-900 dark:text-white font-bold text-xs">
              العلامة المائية في خلفية الصفحات:
            </label>
            <select
              value={settings.watermark || 'NONE'}
              onChange={(e) => handleUpdate('watermark', e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-xs"
            >
              <option value="NONE">بدون علامة مائية (صفحات ناصعة)</option>
              <option value="OFFICIAL">معتمد رسمي - OFFICIAL</option>
              <option value="DRAFT">مسودة غير نهائية - DRAFT</option>
              <option value="CONFIDENTIAL">سري للغاية - CONFIDENTIAL</option>
            </select>
          </div>
        </div>

        {/* Restore Defaults Bar */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <span>يمكنك في أي وقت استعادة التكوين الافتراضي المحاسبي الموصى به.</span>
          <button
            type="button"
            onClick={() => {
              setSettings(DEFAULT_PRINT_SETTINGS);
              PrintService.saveSettings(DEFAULT_PRINT_SETTINGS);
              setSavedNotice(true);
              setTimeout(() => setSavedNotice(false), 2000);
              if (onSaved) onSaved();
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors cursor-pointer"
          >
            استعادة الإعدادات الافتراضية
          </button>
        </div>
      </div>
    </div>
  );
};
