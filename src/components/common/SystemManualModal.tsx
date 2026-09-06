import React, { useState } from 'react';
import {
  Printer,
  Download,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Scale,
  Receipt,
  Sparkles,
  ShieldCheck,
  Percent,
  Layers,
  Camera,
  FolderTree,
  Lock,
  Globe2,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  CreditCard,
  MessageSquare,
  Users,
  Ship,
} from 'lucide-react';
import { PrintService } from '../../services/PrintService';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemManualModal: React.FC<SystemManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    await PrintService.printElementById('system-manual-printable-dossier', {
      title: 'دليل المستخدم الشامل ودورة العمل المحاسبية - المنظومة المحاسبية والضريبية المصرية',
      customDelayMs: 300,
      onAfterPrint: () => setIsPrinting(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-right">
        
        {/* Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                دليل المستخدم الشامل ودورة العمل التفاعلية (User Manual & Screen Guide)
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  PDF مصور
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                شرح تفصيلي لكافة شاشات ومراكز المنظومة ودورة القيد والإقفال والضرائب والفحص بالمعايير المصرية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              disabled={isPrinting}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-700/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'جاري التجهيز...' : 'طباعة وتحميل كـ PDF مصور'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-slate-400 font-bold shrink-0">تصفح المحاور:</span>
          {[
            { id: 'ALL', label: 'كامل الدليل (Full Manual)' },
            { id: 'ACCOUNTING', label: '1. الدورة المحاسبية و OCR' },
            { id: 'FINANCIAL', label: '2. القوائم والتحليل المالي' },
            { id: 'TAX', label: '3. الضرائب ومنظومة الفاتورة' },
            { id: 'AUDIT', label: '4. المراجعة وأوراق العمل' },
            { id: 'OFFICE', label: '5. إدارة المكتب والعملاء' },
            { id: 'CUSTOMS', label: '6. الجمارك والتكلفة الإنزالية والـ ACI' },
            { id: 'SECURITY', label: '7. الأمان والنسخ الاحتياطي' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeSection === sec.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Scrollable Printable Manual Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-8">
          
          <div id="system-manual-printable-dossier" className="bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-10 space-y-10">
            
            {/* Document Official Cover & Header */}
            <div className="border-b-4 border-slate-900 pb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
                <div>
                  <span className="inline-block px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black mb-2">
                    المرجع الفني والتشغيلي المعتمد v2.6.4
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    الدليل الإرشادي الشامل ومخطط دورة العمل المحاسبية
                  </h1>
                  <p className="text-sm font-bold text-slate-600 mt-1">
                    منظومة المحاسب القانوني وإدارة حسابات الشركات والضرائب المصرية وفق معايير EAS
                  </p>
                </div>
                <div className="text-center sm:text-left bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-800">إصدار الوثيقة: سبتمبر 2026</div>
                  <div className="text-slate-600">التوافق: مصلحة الضرائب المصرية (ETA)</div>
                  <div className="text-slate-600">طريقة التخزين: محلي مشفر + سحابي متزامن</div>
                </div>
              </div>
            </div>

            {/* Quick Architecture Diagram / Summary */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-700" />
                هندسة دورة البيانات والمعالجة في المنظومة (Flow Diagram):
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black mx-auto mb-1.5">1</div>
                  <strong className="block text-slate-900">المستندات والفواتير</strong>
                  <span className="text-slate-500 text-[11px]">كاميرا OCR / رفع Excel / تسجيل يدوي</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black mx-auto mb-1.5">2</div>
                  <strong className="block text-slate-900">قيود اليومية العامة</strong>
                  <span className="text-slate-500 text-[11px]">قيد مزدوج متوازن + تدقيق آلي</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black mx-auto mb-1.5">3</div>
                  <strong className="block text-slate-900">الأستاذ وميزان المراجعة</strong>
                  <span className="text-slate-500 text-[11px]">ترحيل فوري للأرصدة بالمجاميع</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black mx-auto mb-1.5">4</div>
                  <strong className="block text-slate-900">القوائم والضرائب</strong>
                  <span className="text-slate-500 text-[11px]">دخل، مركز مالي، نموذج 10، نموذج 41</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black mx-auto mb-1.5">5</div>
                  <strong className="block text-slate-900">المراجعة والتقارير</strong>
                  <span className="text-slate-500 text-[11px]">تقرير المراجع المعتمد + QR Code</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: ACCOUNTING CYCLE & OCR */}
            {(activeSection === 'ALL' || activeSection === 'ACCOUNTING') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-indigo-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور الأول: مركز الدورة المحاسبية العامة والماسح الضوئي (OCR Scanner)
                  </h2>
                </div>

                {/* Module Card 1: OCR Scanner */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-indigo-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-700" />
                      1.1 الماسح الضوئي الذكي للفواتير الورقية (OCR Scanner):
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                      كاميرا + ذكاء اصطناعي
                    </span>
                  </div>

                  {/* Visual Screen Mockup */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs border border-slate-800 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                      <span>📸 [عدسة الماسح الضوئي الحي / مسح الفاتورة]</span>
                      <span className="text-emerald-400">● دقة الفحص: 98%</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">رقم الفاتورة:</span>
                        <strong className="text-white">INV-2026-88912</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">المورد / الجهة:</span>
                        <strong className="text-white">شركة الأهرام للتوريدات</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">الضريبة 14% + 1% أ.ت.ص:</span>
                        <strong className="text-emerald-400">+1,400 / -100 ج.م</strong>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300">
                      <strong>مقترح القيد التلقائي:</strong> من حـ/ المشتريات (10,000) وحـ/ ض.ق.م (1,400) إلى حـ/ خصم أ.ت.ص (100) وحـ/ الموردين (11,300).
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1 leading-relaxed">
                    <p><strong>كيفية الاستخدام:</strong></p>
                    <ul className="list-disc list-inside space-y-1 pr-2">
                      <li>افتح شاشة <strong>الماسح الضوئي (OCR)</strong> من القائمة الجانبية أو اضغط على زر الكاميرا داخل شاشة قيود اليومية.</li>
                      <li>وجه الكاميرا نحو الفاتورة الورقية أو اسحب ملف الصورة؛ سيقوم النظام فورياً بعزل المبالغ والضريبة وتوليد القيد المتوازن.</li>
                      <li>راجع الحسابات واضغط <strong>"اعتماد وترحيل القيد المحاسبي"</strong> ليتم ترحيله فوراً إلى دفتر اليومية والأستاذ.</li>
                    </ul>
                  </div>
                </div>

                {/* Module Card 2: Chart of Accounts & General Journal */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-sm font-black text-indigo-900 flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-indigo-700" />
                    1.2 شجرة الحسابات الموحدة ودفتر اليومية العامة:
                  </span>
                  
                  {/* Visual Screen Mockup */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs border border-slate-800 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                      <span>📖 [دفتر قيود اليومية المزدوجة - المعايير المصرية]</span>
                      <span className="text-indigo-400">اختصار سريع: Ctrl+J</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-[11px]">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800">
                            <th className="py-1">رقم القيد</th>
                            <th className="py-1">التاريخ</th>
                            <th className="py-1">كود واسم الحساب</th>
                            <th className="py-1">مدين</th>
                            <th className="py-1">دائن</th>
                            <th className="py-1">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          <tr className="border-b border-slate-800/50">
                            <td className="py-1 font-bold text-amber-400">JV-2026-001</td>
                            <td className="py-1">2026-01-15</td>
                            <td className="py-1">1111 - حـ/ الصندوق والخزينة</td>
                            <td className="py-1 text-emerald-400 font-bold">50,000</td>
                            <td className="py-1">0.00</td>
                            <td className="py-1 text-emerald-400">مرحل ✔</td>
                          </tr>
                          <tr>
                            <td className="py-1"></td>
                            <td className="py-1"></td>
                            <td className="py-1">2111 - حـ/ رأس المال المدفوع</td>
                            <td className="py-1">0.00</td>
                            <td className="py-1 text-emerald-400 font-bold">50,000</td>
                            <td className="py-1 text-emerald-400">مرحل ✔</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>المزايا الرئيسية:</strong> فحص تلقائي لتوازن القيد، إمكانية إرفاق صور المستندات، شجرة حسابات جاهزة بـ 4 مستويات هرمية، وتصدير كامل بصيغ Excel و PDF والطباعة الرسمية المعتمدة.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 2: FINANCIAL REPORTING & STATEMENTS */}
            {(activeSection === 'ALL' || activeSection === 'FINANCIAL') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-emerald-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور الثاني: القوائم المالية، الإيضاحات المتممة، والمحاكي المالي
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-sm font-black text-emerald-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    2.1 القوائم المالية الختامية وفق معيار المحاسبة المصري رقم (1):
                  </span>

                  {/* Visual Screen Mockup */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs border border-slate-800 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                      <span>📊 [قائمة الدخل الشامل والمركز المالي - مقارنة سنوية]</span>
                      <span className="text-emerald-400">السنة المالية 2026 / 2025</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">صافي المبيعات والإيرادات:</span>
                        <strong className="text-white">1,250,000 ج.م</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">مجمل الربح التجاري:</span>
                        <strong className="text-emerald-400">450,000 ج.م</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">صافي الأرباح بعد الضريبة:</span>
                        <strong className="text-emerald-400">285,000 ج.م</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    توليد تلقائي فوري لقوائم (المركز المالي، الدخل الشامل، التدفقات النقدية بالطريقة غير المباشرة، والتغير في حقوق الملكية) مع صانع الإيضاحات المتممة وتقرير مراجع الحسابات المستقل المذيل بختم QR Code.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 3: TAXATION & ETA PLATFORM */}
            {(activeSection === 'ALL' || activeSection === 'TAX') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-amber-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور الثالث: الضرائب المصرية ومنظومة الفاتورة والإيصال الإلكتروني (ETA)
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-sm font-black text-amber-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-700" />
                    3.1 الإقرارات الضريبية والمطابقة مع منظومة الفاتورة الإلكترونية:
                  </span>

                  {/* Visual Screen Mockup */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs border border-slate-800 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                      <span>🏛️ [مركز تتبع الإقرارات ومطابقة منظومة الضرائب ETA]</span>
                      <span className="text-amber-400">قانون 206 لسنة 2020</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">إقرار القيمة المضافة (نموذج 10):</span>
                        <strong className="text-white">جاهز للإرسال (شهري)</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">الخصم والتحصيل (نموذج 41):</span>
                        <strong className="text-white">الربع الثالث 2026</strong>
                      </div>
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400 block">فروق المطابقة مع البوابة:</span>
                        <strong className="text-emerald-400">0.00 ج.م (مطابق 100%)</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>النماذج المدعومة:</strong> إقرار الدخل السنوي للشركات والأفراد، إقرار ض.ق.م نموذج 10، نموذج 41 للخصم من المنبع، إقرار كسب العمل والمرتبات، مع محاكي احتساب مقابل التأخير وغرامات المادة 70.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 4: AUDIT WORKING PAPERS */}
            {(activeSection === 'ALL' || activeSection === 'AUDIT') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-teal-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور الرابع: أوراق عمل المراجعة القانونية ومكافحة الاحتيال
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-sm font-black text-teal-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    4.1 أوراق العمل والتحقق من بنود القوائم المالية (Audit Working Papers):
                  </span>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    ملف مراجعة إلكتروني متكامل يحتوي على برامج مراجعة الخزينة، البنوك، العملاء والمصادقات، المخزون والجرد الفعلي، الأصول الثابتة، مع فاحص الاحتيال واختبار قانون بنفورد (Benford's Law) لكشف التلاعب بالأرقام.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 5: OFFICE & CLIENTS ARCHIVE */}
            {(activeSection === 'ALL' || activeSection === 'OFFICE') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور الخامس: إدارة مكتب المحاسبة، أرشيف العملاء، وخدمة WhatsApp Bot
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-sm font-black text-blue-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-700" />
                    5.1 بطاقات العملاء، الخزينة المهنية، ومراسلات الواتساب:
                  </span>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    إدارة شاملة للملفات الضريبية والسجلات التجارية للعملاء، متابعة عقود وأتعاب المحاسبة وسندات القبض والصرف، وتوليد إشعارات التنبيه بمواعيد الإقرارات وإرسالها مباشرة لعملاء المكتب عبر الواتساب.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 6: CUSTOMS & GLOBAL TRADE & LANDED COST */}
            {(activeSection === 'ALL' || activeSection === 'CUSTOMS') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-cyan-600 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور السادس: الجمارك، منظومة نافذة (ACI)، واحتساب التكلفة الإنزالية (EAS 2)
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <span className="text-sm font-black text-cyan-900 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-cyan-700" />
                    6.1 دورة التجارة الدولية والشحنات الجمركية والربط المحاسبي الكامل:
                  </span>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    وحدة متكاملة لإدارة دورة الشحنات الواردة والصادرة تحت قانون الجمارك المصري رقم 207 لسنة 2020 ومنظومة التسجيل المسبق للشحنات (ACI / Nafeza). تتيح المنظومة متابعة رقم الـ ACID ومطابقة الفاتورة التجارية والشهادات وبوليصة الشحن مع البيان الجمركي الموحد (نموذج 46).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 pt-2">
                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-2xs">
                      <strong className="text-slate-900 block font-bold text-cyan-950">
                        1. محرك التكلفة الإنزالية (Landed Cost):
                      </strong>
                      <p className="text-slate-600 leading-relaxed">
                        حساب التكلفة الرأسمالية للمخزون طبقاً للمعيار المصري رقم (2) متضمناً: قيمة البضاعة بالعملة الأجنبية مقومة بسعر البنك المركزي (EAS 13)، الشحن والنولون، التأمين البحري، ضريبة الوارد الجمركية، ورسوم الخدمات الإضافية.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-2xs">
                      <strong className="text-slate-900 block font-bold text-cyan-950">
                        2. التوليد الآلي للقيود المحاسبية:
                      </strong>
                      <p className="text-slate-600 leading-relaxed">
                        توليد حزمة قيود متكاملة بضغطة زر: (1) قيد الاعتماد المستندي والبضاعة بالطريق، (2) قيد سداد الرسوم الجمركية وضريبة الجدول وضريبة القيمة المضافة القابلة للخصم، (3) قيد إقفال الشحنة ورسملة المخزون النهائي في المستودع.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-2xs">
                      <strong className="text-slate-900 block font-bold text-cyan-950">
                        3. الربط بالخزنة والأرشيف الإلكتروني:
                      </strong>
                      <p className="text-slate-600 leading-relaxed">
                        سداد المصروفات الجمركية وأتعاب المخلص فورياً من خزنة وحسابات المكتب مع توليد سند صرف رسمي، وحفظ وأرشفة كافة مستندات الشحنة رقمياً في ملف العميل بالأرشيف العام.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: SECURITY & DESKTOP SYNC */}
            {(activeSection === 'ALL' || activeSection === 'SECURITY') && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 border-r-4 border-slate-800 pr-3">
                  <h2 className="text-lg font-black text-slate-950">
                    المحور السابع: الأمان المشفر، النسخ الاحتياطي، والتشغيل دون إنترنت
                  </h2>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                    <div className="bg-white border border-slate-300 p-3.5 rounded-xl space-y-1">
                      <strong className="text-slate-900 block flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        صلاحيات المستخدمين وقفل الشاشة:
                      </strong>
                      <p className="text-slate-600">
                        نظام أدوار متعدد (مدير شريك، مراجع، محاسب، مدخل بيانات) مع حماية كل مستخدم برمز PIN سري وسجل تدقيق للعمليات.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-300 p-3.5 rounded-xl space-y-1">
                      <strong className="text-slate-900 block flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" />
                        النسخ الاحتياطي السحابي والمحلي:
                      </strong>
                      <p className="text-slate-600">
                        تصدير واستيراد قواعد البيانات بضغطة زر بصيغة JSON مشفرة، وتزامن سحابي فوري بين أجهزة المكتب.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Official Signature & QR Stamp Footer */}
            <div className="pt-8 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  تم إصدار هذا الدليل آلياً من المنظومة المحاسبية والضريبية الرسمية
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  مرخص ومطابق لمعايير المحاسبة المصرية وقوانين الإجراءات الضريبية الموحدة
                </div>
              </div>

              <div className="text-center bg-slate-100 border border-slate-300 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-700 block">وثيقة معتمدة رسمياً</span>
                <span className="text-xs font-black text-emerald-800 font-mono">OFFICIAL-GUIDE-VERIFIED</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
