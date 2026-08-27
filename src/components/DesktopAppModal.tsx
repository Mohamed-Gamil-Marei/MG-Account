import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Download,
  CheckCircle2,
  X,
  Laptop,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Zap,
  Terminal,
  FolderArchive,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import JSZip from 'jszip';
import { DatabaseState } from '../db/localDatabase';

interface DesktopAppModalProps {
  state: DatabaseState;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ state, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'PWA' | 'WINDOWS_PACKAGE' | 'OFFLINE_STANDALONE' | 'DOCKER_IMAGE'>('PWA');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show guidance
      alert(
        'لتثبيت البرنامج على سطح المكتب:\n' +
        '1. اضغط على أيقونة التثبيت (🖥️ أو ⬇️) الموجودة في شريط عنوان المتصفح بالأعلى.\n' +
        '2. أو من قائمة المتصفح (⋮) اختر "تثبيت منظومة المحاسب" (Install App).'
      );
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Download Comprehensive Windows Desktop Package (ZIP)
  const handleDownloadWindowsPackage = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const currentUrl = window.location.href;

      // 1. Batch launcher for Windows
      const batContent = `@echo off
chcp 65001 > nul
title تشغيل منظومة المحاسب والمراجع القانوني
color 0A
echo ========================================================
echo   منظومة المحاسب والمراجع القانوني - تشغيل سطح المكتب
echo ========================================================
echo   جاري تشغيل البرنامج كنافذة تطبيق مستقلة بدون شريط متصفح...
echo.

set APP_URL=${currentUrl}

:: Try launching with Edge in App mode
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%"
    goto END
)

:: Try Edge in 64-bit path
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%"
    goto END
)

:: Try Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%"
    goto END
)

if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%"
    goto END
)

:: Default browser fallback
start "" "%APP_URL%"

:END
echo تم فتح البرنامج بنجاح!
timeout /t 3 > nul
exit
`;
      zip.file('تشغيل_البرنامج_سطح_المكتب.bat', batContent);

      // 2. Windows URL Shortcut
      const urlShortcut = `[InternetShortcut]
URL=${currentUrl}
IconIndex=0
IconFile=https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/calculator.svg
`;
      zip.file('منظومة_المحاسب_القانوني.url', urlShortcut);

      // 3. VBScript to automatically place desktop shortcut on Windows
      const vbsInstaller = `Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oUrlLink = WshShell.CreateShortcut(strDesktop & "\\منظومة المحاسب والمراجع القانوني.url")
oUrlLink.TargetPath = "${currentUrl}"
oUrlLink.Save
MsgBox "تم إنشاء أيقونة واختصار منظومة المحاسب القانوني على سطح المكتب بنجاح!", 64, "منظومة المحاسب والمراجع القانوني"
`;
      zip.file('تثبيت_اختصار_سطح_المكتب_تلقائياً.vbs', vbsInstaller);

      // 4. Initial backup snapshot
      const backupData = JSON.stringify(state, null, 2);
      zip.file('نسخة_احتياطية_بيانات_المكتب.json', backupData);

      // 5. Readme instructions
      const readmeText = `===============================================================
منظومة المحاسب والمراجع القانوني - حزمة تشغيل سطح المكتب
مكتب: ${state.officeProfile.firmName} - أ/ ${state.officeProfile.auditorName}
===============================================================

طريقة التشغيل السريع على جهاز الكمبيوتر:
----------------------------------------
1. اضغط نقراً مزدوجاً على ملف (تشغيل_البرنامج_سطح_المكتب.bat)
   -> سيفتح البرنامج فوراً في نافذة تطبيق مستقلة وبدون شريط متصفح مثل برامج الويندوز.

2. أو اضغط على (تثبيت_اختصار_سطح_المكتب_تلقائياً.vbs)
   -> سيتم وضع أيقونة البرنامج تلقائياً على سطح المكتب لديك.

3. يمكنك أيضاً فتح الرابط مباشرة في متصفح Chrome أو Edge والضغط على:
   "تثبيت التطبيق / Install App" من شريط العنوان.

بيانات النسخ الاحتياطي:
-----------------------
تم إرفاق ملف (نسخة_احتياطية_بيانات_المكتب.json) يحتوي على كامل القيود والحسابات والعملاء.
`;
      zip.file('دليل_التشغيل_والتثبيت.txt', readmeText);

      // 6. Dockerfile & Docker compose for server/image users
      const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "dev"]
`;
      zip.file('Dockerfile', dockerfile);

      // Generate the zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AccountingApp-Desktop-Package-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إعداد الحزمة.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download single direct .bat launcher
  const handleDownloadSingleBat = () => {
    const currentUrl = window.location.href;
    const batContent = `@echo off
chcp 65001 > nul
title منظومة المحاسب والمراجع القانوني
start msedge.exe --app="${currentUrl}" 2>nul || start chrome.exe --app="${currentUrl}" 2>nul || start "" "${currentUrl}"
exit
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_المنظومة_سطح_المكتب.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Laptop className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>تثبيت وتشغيل البرنامج على سطح المكتب</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-normal">
                  Desktop App
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                طرق سريعة ومجانية لتشغيل المنظومة كبرنامج كمبيوتر مستقل على نظام Windows أو Mac
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PWA')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'PWA'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>1. التثبيت المباشر بنقرة واحدة (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('WINDOWS_PACKAGE')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'WINDOWS_PACKAGE'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-blue-600" />
            <span>2. تحميل حزمة الويندوز (.ZIP / .BAT)</span>
          </button>

          <button
            onClick={() => setActiveTab('DOCKER_IMAGE')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'DOCKER_IMAGE'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>3. صورة الحاوية (Docker / Image)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* TAB 1: PWA Direct Install */}
          {activeTab === 'PWA' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950 text-sm">
                    ما هو التثبيت المباشر كبرنامج سطح مكتب؟
                  </h4>
                  <p className="text-xs text-blue-900 mt-1 leading-relaxed">
                    يقوم بإنشاء نافذة تطبيق مستقلة تماماً مثل برامج الأوفيس والويندوز بدون شريط روابط، مع وضع أيقونة في
                    قائمة Start وعلى سطح المكتب، وتخزين كافة القيود والبيانات محلياً على جهازك.
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-900">
                    البرنامج مثبت بالفعل ويعمل كنافذة سطح مكتب مستقلة!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    يمكنك الوصول إليه دائماً من قائمة ابدأ (Start) أو اختصار سطح المكتب.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        تثبيت منظومة المحاسب الآن على الكمبيوتر
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        يعمل على أنظمة Windows 10/11, macOS, Linux
                      </p>
                    </div>

                    <button
                      onClick={handleInstallPWA}
                      id="btn-install-pwa-action"
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm active:scale-95 cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>تثبيت البرنامج على سطح المكتب فوراً</span>
                    </button>
                  </div>

                  {/* Step by step guide */}
                  <div className="border-t border-slate-200 pt-4 mt-2">
                    <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>إذا لم يظهر زر التثبيت التلقائي، اتبع هذه الخطوة البسيطة:</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <span className="font-bold text-blue-700 block mb-1">في متصفح Google Chrome:</span>
                        <p className="text-slate-600 leading-relaxed">
                          اضغط على قائمة المتصفح <strong>(⋮)</strong> بالأعلى ← اختر <strong>"حفظ ومشاركة" (Save and share)</strong> ← ثم اضغط <strong>"تثبيت منظومة المحاسب" (Install)</strong>.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <span className="font-bold text-teal-700 block mb-1">في متصفح Microsoft Edge:</span>
                        <p className="text-slate-600 leading-relaxed">
                          اضغط على أيقونة <strong>(Apps ⊞)</strong> في شريط العنوان أو القائمة <strong>(...)</strong> ← ثم اختر <strong>"Install this site as an app"</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Windows Package (ZIP / BAT) */}
          {activeTab === 'WINDOWS_PACKAGE' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  حزمة تشغيل الويندوز السريعة (Desktop Launcher Package)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  حزمة ملفات جاهزة للتحميل بضغطة زر واحدة، تحتوي على مشغل تنفيذي تلقائي (.bat) ينشئ لك أيقونة سطح المكتب ويفتح المنظومة في نافذة مستقلة без متصفح، مع تضمين نسخة احتياطية لكافة بيانات مكتبك.
                </p>
              </div>

              {/* Download buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-blue-200 bg-blue-50/50 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <FolderArchive className="w-5 h-5 text-blue-600" />
                      <span>حزمة سطح المكتب الكاملة (.ZIP)</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      تحتوي على ملف التشغيل السريع + سكريبت إنشاء اختصار سطح المكتب + دليل الاستخدام + نسخة احتياطية من البيانات.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadWindowsPackage}
                    disabled={isDownloading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'جاري إنشاء الحزمة...' : 'تحميل حزمة الويندوز الكاملة (.ZIP)'}</span>
                  </button>
                </div>

                <div className="border border-slate-200 bg-white p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Terminal className="w-5 h-5 text-slate-700" />
                      <span>ملف تشغيل مباشر (.BAT)</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      ملف صغير جداً (1 كيلوبايت) تضعه على سطح المكتب وتفتحه متى أردت تشغيل المنظومة مباشرة.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSingleBat}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>تحميل ملف التشغيل الفردي (.BAT)</span>
                  </button>
                </div>
              </div>

              {/* Contents list */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h5 className="text-xs font-bold text-slate-700 mb-2">محتويات الحزمة:</h5>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-800">تشغيل_البرنامج_سطح_المكتب.bat</span>
                    <span>- تشغيل فوري بدون شريط المتصفح</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-800">تثبيت_اختصار_سطح_المكتب_تلقائياً.vbs</span>
                    <span>- وضع أيقونة فورية على Desktop</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-800">نسخة_احتياطية_بيانات_المكتب.json</span>
                    <span>- حفظ لبيانات وحسابات المكتب الحالية</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-800">دليل_التشغيل_والتثبيت.txt</span>
                    <span>- خطوات تفصيلية وملاحظات الأمان</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: Docker & Image Build */}
          {activeTab === 'DOCKER_IMAGE' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    أوامر بناء وتشغيل صورة الحاوية (Docker Image / .img)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'docker build -t accounting-office:latest .\ndocker save -o accounting-office.img accounting-office:latest\ndocker run -d -p 3000:3000 accounting-office:latest',
                        'docker-cmd'
                      )
                    }
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded"
                  >
                    {copiedIndex === 'docker-cmd' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ الأوامر</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
{`# 1. بناء صورة النظام
docker build -t accounting-office:latest .

# 2. حفظها كملف صورة (.img / .tar) للنقل على أي جهاز
docker save -o accounting-office.img accounting-office:latest

# 3. تشغيل الحاوية محلياً
docker run -d -p 3000:3000 --name accounting_app accounting-office:latest`}
                </pre>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <h5 className="text-xs font-bold text-slate-800">
                  هل تريد تشغيل المنظومة محلياً عبر Node.js بدون Docker؟
                </h5>
                <p className="text-xs text-slate-600">
                  حمل الكود عبر خيار (Export / Download ZIP) من القائمة، ثم افتح موجه الأوامر واكتب:
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-300 font-mono text-xs text-slate-800">
                  npm install && npm run dev
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            منظومة المحاسب والمراجع القانوني • إصدار سطح المكتب v4.2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
