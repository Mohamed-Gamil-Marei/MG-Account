import React, { useState } from 'react';
import {
  Printer,
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
  FolderTree,
  Lock,
  Globe2,
  HelpCircle,
  Database,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Users,
  Search,
  Key,
  Terminal,
  FileText,
  AlertTriangle,
  Download,
  LayoutDashboard,
  FileCode,
  FileCheck,
} from 'lucide-react';
import { PrintService } from '../../services/PrintService';
import { db } from '../../db/localDatabase';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import packageJson from '../../../package.json';

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemManualModal: React.FC<SystemManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<'A4' | 'A3' | 'Letter'>('A4');

  if (!isOpen) return null;

  const officeProfile = db.getState().officeProfile || {
    name: 'مكتب المحاسبة القانونية والمراجعة',
    taxNumber: '100-200-300',
  };

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const appVersion = packageJson.version || '1.2.0';

  // Method 1: Browser Print / PDF via PrintService
  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      await PrintService.printElementById('system-manual-printable-dossier', {
        title: `دليل المستخدم الشامل v${appVersion} - منظومة MG-Account`,
        pageSize: pageSize,
        customDelayMs: 300,
        onAfterPrint: () => setIsPrinting(false),
      });
    } catch (err) {
      console.error('Print failed:', err);
      setIsPrinting(false);
    }
  };

  // Method 2: Direct PDF File Download via html2canvas-pro + jsPDF
  // CRITICAL REQUIREMENT: Do NOT use jsPDF.text() with Arabic strings!
  // All titles, headers, footers, cover page, and pages are rendered strictly from HTML elements.
  const handleDirectDownloadPdf = async () => {
    const element = document.getElementById('system-manual-printable-dossier');
    if (!element) return;

    setIsExportingPdf(true);
    try {
      // Temporarily set fixed width for pristine high-res canvas rendering
      const originalWidth = element.style.width;
      element.style.width = '850px';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      element.style.width = originalWidth;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Page dimensions in mm
      const pdfWidth = pageSize === 'A3' ? 297 : pageSize === 'Letter' ? 216 : 210;
      const pdfHeight = pageSize === 'A3' ? 420 : pageSize === 'Letter' ? 279 : 297;

      const imgWidth = pdfWidth - 20; // 10mm margins on left & right
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeightPixels = (canvas.width * (pdfHeight - 20)) / imgWidth;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: pageSize.toLowerCase() as any,
      });

      let heightLeft = canvas.height;
      let position = 10;

      // First Page
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeightPixels;

      // Subsequent Pages (purely image slices without ANY jsPDF.text calls to prevent character corruptions)
      while (heightLeft > 0) {
        position -= pdfHeight - 20;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeightPixels;
      }

      pdf.save(`MG_Account_User_Guide_v${appVersion}_${activeSection}_${pageSize}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-6xl w-full h-[92vh] flex flex-col border border-slate-800 overflow-hidden font-sans text-right" dir="rtl">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                  التوثيق الرسمي المعالج v{appVersion}
                </span>
                <span className="text-xs text-slate-400">إصدار {appVersion} المعاير</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5" style={{ letterSpacing: 'normal' }}>
                دليل استخدام منظومة MG-Account المحاسبية والضريبية الشاملة
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Paper Size Selector */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 px-2 font-medium">الورق:</span>
              {(['A4', 'A3', 'Letter'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    pageSize === size ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Direct PDF Export */}
            <button
              onClick={handleDirectDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrintPdf}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isPrinting ? 'جاري التحضير...' : 'طباعة / معاينة'}</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 hover:text-red-300 text-slate-400 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Navigation Controls Bar */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveSection('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              عرض كافة الأقسام
            </button>
            <button
              onClick={() => setActiveSection('OVERVIEW')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'OVERVIEW'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              1. نظرة عامة
            </button>
            <button
              onClick={() => setActiveSection('SETUP')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'SETUP'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              2. التشغيل والإنتاج
            </button>
            <button
              onClick={() => setActiveSection('AUTH')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'AUTH'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              3. إنشاء الحساب والصلاحيات
            </button>
            <button
              onClick={() => setActiveSection('HUBS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'HUBS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              4. شرح الشاشات الـ 18
            </button>
            <button
              onClick={() => setActiveSection('CYCLE')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'CYCLE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              5. مثال الدورة المحاسبية
            </button>
            <button
              onClick={() => setActiveSection('BACKUP')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'BACKUP'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              6. النسخ والاستعادة
            </button>
            <button
              onClick={() => setActiveSection('SECURITY')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'SECURITY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              7. الأمان وأفضل الممارسات
            </button>
            <button
              onClick={() => setActiveSection('UNCERTAIN')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeSection === 'UNCERTAIN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              8. الملفات غير المؤكدة
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في الدليل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Printable & Interactive Dossier Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 space-y-6 text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          <div id="system-manual-printable-dossier" className="bg-white text-slate-900 p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 space-y-8 font-sans" dir="rtl">
            
            {/* HTML COVER PAGE WITH ZERO LETTER SPACING ISSUES */}
            <div className="border-b-4 border-emerald-600 pb-8 text-center space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-600 font-bold">
                <span>{officeProfile.name || 'مكتب المحاسبة القانونية والمراجعة'}</span>
                <span>تاريخ التقرير: {currentDate}</span>
                <span>الإصدار: v{appVersion}</span>
              </div>

              <div className="py-6 space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  دليل الاستخدام التشغيلي والتوثيق الفني الشامل
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-2" style={{ letterSpacing: 'normal' }}>
                  منظومة MG-Account المحاسبية والضريبية المعتمدة
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                  دليل تشغيلي متكامل وفق معايير المحاسبة المصرية (EAS) والدولية (IFRS) والتعليمات التنفيذية لمصلحة الضرائب المصرية
                </p>
              </div>

              {/* Table of Contents HTML Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right space-y-2">
                <h3 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-2">فهرس المحتويات والأقسام الرئيسية:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 font-medium">
                  <div>1. نظرة عامة والتقنيات</div>
                  <div>2. التشغيل والإنتاج</div>
                  <div>3. إنشاء الحساب والصلاحيات</div>
                  <div>4. شرح الشاشات الـ 18</div>
                  <div>5. الدورة المحاسبية العملية</div>
                  <div>6. النسخ والاستعادة</div>
                  <div>7. الأمان والحدود</div>
                  <div>8. الملفات المعتمد عليها</div>
                </div>
              </div>
            </div>

            {/* SECTION 1: OVERVIEW */}
            {(activeSection === 'ALL' || activeSection === 'OVERVIEW') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    1. نظرة عامة والتقنيات المستخدمة (Overview)
                  </h2>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800">ما هي منظومة MG-Account؟</h3>
                  <p className="text-slate-700">
                    منظومة <strong>MG-Account</strong> هي برنامج محاسبي وإداري وضريبي شمولياً موجه لمكاتب المحاسبة القانونية ومراقبي الحسابات والشركات. تتيح إدارة كافة مراحل الدورة المحاسبية بدءاً من تكويد شجرة الحسابات وتسجيل قيود اليومية، وصولاً إلى الميزانيات العمومية والقوائم المالية الختامية والإيضاحات المتممة وتقرير مراقب الحسابات وإقرارات مصلحة الضرائب المصرية.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900">البنية البرمجية المحققة بالكود (`package.json` & `server.ts`):</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li><strong>الواجهة الأمامية:</strong> React 19 + TypeScript + Tailwind CSS v4 + Vite 6.</li>
                    <li><strong>الخادم الخلفي:</strong> Express 4 عبر `server.ts` منفذ على البورت 3000.</li>
                    <li><strong>قواعد البيانات:</strong> SQLite محلياً عبر `better-sqlite3` في `data/app.db` للتنفيذ الفائق السرعة مع دعم المعاملات الذرية.</li>
                    <li><strong>السحابة:</strong> Firebase Firestore + Auth للتزامن الميداني المزدوج.</li>
                    <li><strong>الذكاء الاصطناعي:</strong> حزمة `@google/genai` الرسمية للفحص الضريبي وقراءة الفواتير الضريبية.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* SECTION 2: SETUP & ENV VARS */}
            {(activeSection === 'ALL' || activeSection === 'SETUP') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <Terminal className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    2. التشغيل والإنتاج ومتغيرات البيئة (Setup & Env Vars)
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse border border-slate-200 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                        <th className="p-2 border border-slate-200">اسم المتغير</th>
                        <th className="p-2 border border-slate-200">الوظيفة والمسار بالكود</th>
                        <th className="p-2 border border-slate-200">النوع</th>
                        <th className="p-2 border border-slate-200">ماذا يحدث لو تغيّر أو ضاع؟</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="p-2 font-mono font-bold border border-slate-200">GEMINI_API_KEY</td>
                        <td className="p-2 border border-slate-200">مفتاح الاتصال بنموذج الجيمناي للفحص الذكي (`server.ts` السطر 49)</td>
                        <td className="p-2 border border-slate-200 font-bold text-amber-700">اختياري</td>
                        <td className="p-2 border border-slate-200">تعطل ميزة فحص الذكاء الاصطناعي وترجع رسالة "الميزة معطلة".</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border border-slate-200">SETUP_TOKEN</td>
                        <td className="p-2 border border-slate-200">رمز تأكيد إنشاء أول أدمن للمنظومة (`server.ts` السطر 632)</td>
                        <td className="p-2 border border-slate-200 font-bold text-red-700">إجباري في الإنتاج</td>
                        <td className="p-2 border border-slate-200">يرفض الخادم إنشاء المدير إذا كانت قاعدة البيانات خالية.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border border-slate-200">CREDENTIALS_KEY</td>
                        <td className="p-2 border border-slate-200">تشفير بوابات العملاء والضرائب والسرية</td>
                        <td className="p-2 border border-slate-200 font-bold text-amber-700">اختياري</td>
                        <td className="p-2 border border-slate-200">تعذر فك تشفير كلمة مرور البوابات المنسوخة بالمفتاح القديم.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold border border-slate-200">BACKUP_SIGNATURE_KEY</td>
                        <td className="p-2 border border-slate-200">توقيع HMAC لتأمين النسخ الاحتياطية المرفوعة</td>
                        <td className="p-2 border border-slate-200 font-bold text-amber-700">اختياري</td>
                        <td className="p-2 border border-slate-200">يتم استخدام التوقيع الداخلي الافتراضي.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* SECTION 3: ACCOUNT & RBAC */}
            {(activeSection === 'ALL' || activeSection === 'AUTH') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    3. إنشاء الحساب وتفعيله والصلاحيات (Account & RBAC)
                  </h2>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                  <h3 className="font-bold text-emerald-900">شروط واشترطات الحسابات المعتمدة بالكود صراحة:</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-800">
                    <li><strong>المصادقة المباشرة (Server-First):</strong> يمر تسجيل الدخول عبر السيرفر (/api/auth/login) وتنعكس الصلاحيات والدور الفعلي من السيرفر، مع فحص الجلسة عند فتح التطبيق عبر /api/auth/me.</li>
                    <li><strong>الدخول الأوفلاين المشروط بفشل الشبكة فقط:</strong> يُتاح الدخول أوفلاين عبر هاش PBKDF2 مملّح فقط عند انقطاع الوصول للسيرفر بسبب الشبكة، ويُمنع منعاً باتاً عند رد السيرفر بـ 401/403/429 مع مسح كاش الأوفلاين للحساب المذكور فوراً.</li>
                    <li><strong>المطابقة الكلية للإيميل:</strong> تشترط مطابقة البريد الإلكتروني بالكامل (الاسم والدومين) لرفض أي إيميل بنفس البادئة ودومين مختلف.</li>
                    <li><strong>بروتوكول الخروج الشامل:</strong> عند الخروج يُستدعى /api/auth/logout لحذف الجلسة ومسح الكوكي بالسيرفر وواجهة الأوفلاين.</li>
                    <li><strong>الحد الأدنى لكلمة المرور:</strong> <strong>10 أحرف صراحةً</strong> بجميع الشاشات.</li>
                    <li><strong>حالة الحساب الجديد (PENDING):</strong> يبدأ كل حساب جديد بحالة PENDING محروماً من كافة القراءات والكتابات حتى يقوم المدير بتفعيله وتحديد دوره الصريح.</li>
                  </ul>
                </div>

                {/* RBAC Table from access.ts */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800">مصفوفة التحكم بالوصول للأدوار المأخوذة صراحة من access.ts:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse border border-slate-200 text-[10px]">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold">
                          <th className="p-1.5 border border-slate-700">الكيان المحاسبي (entityType)</th>
                          <th className="p-1.5 border border-slate-700">ADMIN</th>
                          <th className="p-1.5 border border-slate-700">ACCOUNTANT</th>
                          <th className="p-1.5 border border-slate-700">AUDITOR</th>
                          <th className="p-1.5 border border-slate-700">SECRETARY</th>
                          <th className="p-1.5 border border-slate-700">PENDING</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="p-1.5 font-bold border border-slate-200">العملاء (clients)</td>
                          <td className="p-1.5 border border-slate-200 text-emerald-700 font-bold">قراءة / كتابة / حذف</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200">قراءة فقط</td>
                          <td className="p-1.5 border border-slate-200 text-red-600 font-bold">مرفوض</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold border border-slate-200">قيود اليومية (journalEntries)</td>
                          <td className="p-1.5 border border-slate-200 text-emerald-700 font-bold">قراءة / كتابة / حذف</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200 text-red-600">مرفوض</td>
                          <td className="p-1.5 border border-slate-200 text-red-600 font-bold">مرفوض</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold border border-slate-200">المستندات والأرشيف (documents)</td>
                          <td className="p-1.5 border border-slate-200 text-emerald-700 font-bold">قراءة / كتابة / حذف</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200">قراءة / كتابة</td>
                          <td className="p-1.5 border border-slate-200">قراءة / رفع</td>
                          <td className="p-1.5 border border-slate-200 text-red-600 font-bold">مرفوض</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold border border-slate-200">سجل الرقابة (auditLogs)</td>
                          <td className="p-1.5 border border-slate-200 text-emerald-700 font-bold">قراءة فقط (غير قابل للحذف)</td>
                          <td className="p-1.5 border border-slate-200">بالصلاحية</td>
                          <td className="p-1.5 border border-slate-200">بالصلاحية</td>
                          <td className="p-1.5 border border-slate-200 text-red-600">مرفوض</td>
                          <td className="p-1.5 border border-slate-200 text-red-600 font-bold">مرفوض</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 4: 18 HUBS & SCREENS */}
            {(activeSection === 'ALL' || activeSection === 'HUBS') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <LayoutDashboard className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    4. شرح شاشات ومراكز المنظومة الـ 18 بالتفصيل (Hubs & Screens)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">1. الرئيسية (Dashboard)</h4>
                    <p className="text-slate-600">ملخص مؤشرات المكتب الأرباح، والقيود المعلقة والتنبيهات المستحقة.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">2. اليومية والقيود (Journal &amp; Ledger)</h4>
                    <p className="text-slate-600">إدخال القيود، الترحيل isPosted = true والتصدير المباشر.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">3. دليل الحسابات (Chart of Accounts)</h4>
                    <p className="text-slate-600">شجرة الحسابات المصرية ذات الـ 5 مستويات الهيكلية.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">4. الأتعاب والخزنة (Office Treasury)</h4>
                    <p className="text-slate-600">تسجيل مقبوضات أتعاب العملاء وسندات الصرف.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">5. الفواتير والمبيعات (Invoicing)</h4>
                    <p className="text-slate-600">تحرير فواتير خدمات الأتعاب بضريبة القيمة المضافة و QR Code.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">6. أصول ثابتة وإهلاك (Fixed Assets)</h4>
                    <p className="text-slate-600">حصر الأصول، القسط الثابت والمتناقص والتوليد الآلي لقيود الإهلاك.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">7. القفل الزمني للفترات (Period Lock)</h4>
                    <p className="text-slate-600">إغلاق السنوات المكتملة لمنع أي تعديل تراجعي خلفي.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">8. الفاتورة الإلكترونية (ETA)</h4>
                    <p className="text-slate-600">الرفع المباشر والجماعي بحد 10MB وتفويض الإقرارات.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">9. أرشيف المستندات (Documents)</h4>
                    <p className="text-slate-600">رفع الملفات في documents/[clientId]/[year] بحد 10MB وفحص Magic Bytes.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <h4 className="font-bold text-slate-900">10. سجل العمليات (Audit Trail)</h4>
                    <p className="text-slate-600">مراقبة حركات النظام غير القابلة للتعديل أو المسح.</p>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 5: ACCOUNTING CYCLE */}
            {(activeSection === 'ALL' || activeSection === 'CYCLE') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    5. مثال عملي تطبيقي للدورة المحاسبية الكاملة (Accounting Cycle)
                  </h2>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                  <ol className="list-decimal list-inside space-y-2 text-slate-800">
                    <li><strong>تكويد العميل:</strong> افتح "العملاء" ← اضغط "إضافة عميل جديد" (المصرية للتوريدات).</li>
                    <li><strong>شجرة الحسابات:</strong> افتح "دليل الحسابات" ← تأكد من الحسابات: البنك (`1112`)، المبيعات (`4110`)، القيمة المضافة (`2130`).</li>
                    <li><strong>تسجيل قيد اليومية:</strong>
                      <div className="bg-white p-2 border border-slate-300 rounded mt-1 font-mono text-[10px]">
                        مدين: البنك الأهلي (1112) = 114,000 ج.م<br />
                        دائن: مبيعات خدمات (4110) = 100,000 ج.م<br />
                        دائن: ضريبة القيمة المضافة 14% (2130) = 14,000 ج.م
                      </div>
                    </li>
                    <li><strong>ترحيل القيد:</strong> اضغط زر "ترحيل القيد" للربط الختامي بالنظام.</li>
                    <li><strong>ميزان المراجعة والقوائم المالية:</strong> توليد القوائم المعتمدة والميزانية وإقفال السنة مالياً.</li>
                  </ol>
                </div>
              </section>
            )}

            {/* SECTION 6: BACKUP & RESTORE */}
            {(activeSection === 'ALL' || activeSection === 'BACKUP') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <Database className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    6. النسخ الاحتياطي والاستعادة وفحص السلامة (Backup & Restore)
                  </h2>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                  <p><strong>النسخ الاحتياطي التلقائي:</strong> يتم يومياً عند الساعة 23:00 تلقائياً في `data/backups/` مع الاحتفاظ بـ 30 نسخة أحدث تنظيفاً.</p>
                  <p><strong>استعادة النسخ وفحص السلامة (`server.ts` السطر 78 - حد 50MB):</strong></p>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    <li>يشترط دور المدير **ADMIN** ومسار `/api/server-backups/restore`.</li>
                    <li>يجري السيرفر فحص سلامة تلقائي بـ `PRAGMA integrity_check`.</li>
                    <li>إذا فشلت النتيجة ويرجع خطأ integrity check يتم إلغاء العملية لحماية البيانات من التلف.</li>
                    <li>تنشأ نسخة طارئة للحالة الحالية قبل الاستبدال كإجراء احترازي.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* SECTION 7: RELIED UPON FILES & UNCERTAIN POINTS */}
            {(activeSection === 'ALL' || activeSection === 'UNCERTAIN') && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-emerald-600 pb-2">
                  <FileCode className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
                    7. قائمة الملفات المعتمد عليها والنقاط غير المؤكدة
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-1">
                    <h4 className="font-bold text-emerald-900">الملفات المعتمد عليها صراحة بالكود:</h4>
                    <ul className="list-disc list-inside text-slate-800 space-y-0.5">
                      <li>`server.ts` - حدود الأمان وتوثيق الـ 10 أحرف والـ 7 أيام.</li>
                      <li>`package.json` - الإصدار v{appVersion} والمكتبات المستوردة.</li>
                      <li>`src/server/access.ts` - مصفوفة التحكم بالأدوار والصلاحيات.</li>
                      <li>`firestore.rules` - القواعد السحابية.</li>
                      <li>`src/services/PrintService.ts` - الطباعة المعزولة.</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1">
                    <h4 className="font-bold text-amber-900">النقاط غير المؤكدة من الكود المباشر:</h4>
                    <ul className="list-disc list-inside text-slate-800 space-y-0.5">
                      <li>تكامل WhatsApp Webhooks المتقدم الخارجي لشركة Meta (`server.ts` & `whatsappService.ts`).</li>
                      <li>حدود سعة الاستضافة المباشرة لـ Firebase Storage السحابية (`firestore.rules`).</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Document Footer */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{officeProfile.name || 'مكتب المحاسبة القانونية'} - توثيق معتمد</span>
              <span>دليل الاستخدام v{appVersion}</span>
              <span>صفحة 1 من 1</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
