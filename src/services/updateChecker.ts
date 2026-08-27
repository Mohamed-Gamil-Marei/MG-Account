export interface AppVersionInfo {
  version: string;
  releaseDate: string;
  isLatest: boolean;
  latestVersion: string;
  changelog: {
    title: string;
    highlights: string[];
    improvements: string[];
    fixes: string[];
  };
  downloadUrl?: string;
  minSupportedVersion: string;
}

export const CURRENT_APP_VERSION = '4.2.0';

// Mock latest version descriptor (in production or cloud, this can be fetched from an endpoint or repository)
export const LATEST_VERSION_INFO: AppVersionInfo = {
  version: '4.3.0',
  releaseDate: '2026-08-27',
  isLatest: false,
  latestVersion: '4.3.0',
  changelog: {
    title: 'تحديث رئيسي: ترقية محرك الحسابات وتحديثات المعايير الضريبية والمكتبية 2026',
    highlights: [
      'إضافة وتكامل منظومة التثبيت السريع لسطح المكتب (Desktop App Launcher & Package)',
      'تحديث جداول شرائح ضريبة الدخل والدمغة وقانون الإجراءات الضريبية الموحد لعام 2026',
      'تفعيل الترقيم التسلسلي الموحد (Serial Codes) ورموز الاستجابة السريعة (QR Code) على كافة النماذج',
      'تحسين سرعة معالجة وتصدير القوائم المالية وتقارير ميزان المراجعة بصيغ Excel و JSON'
    ],
    improvements: [
      'تطوير أداء شجرة الحسابات واستعراض حركة الأستاذ العام مع البحث المتقدم الفوري',
      'دعم كامل لطباعة وتصدير شهادات الدخل وإثبات المهنة مع تذييل الاعتماد الرسمي',
      'حفظ تلقائي للنسخ الاحتياطية دورياً في الذاكرة المحلية للجهاز'
    ],
    fixes: [
      'معالجة توازن القيود المركبة عند استيراد ملفات Excel الخارجية',
      'تحسين دقة حساب مخصص الإهلاك المحاسبي في نموذج الأصول الثابتة'
    ]
  },
  minSupportedVersion: '4.0.0'
};

const UPDATE_CHECK_KEY = 'ACCOUNTING_APP_LAST_UPDATE_CHECK';
const DISMISSED_UPDATE_KEY = 'ACCOUNTING_APP_DISMISSED_VERSION';

export class UpdateCheckerService {
  /**
   * Check if an update is available comparing semver
   */
  static checkForUpdates(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersionInfo: AppVersionInfo;
  }> {
    return new Promise((resolve) => {
      // Simulate network / server check with minimal delay
      setTimeout(() => {
        const currentParts = CURRENT_APP_VERSION.split('.').map(Number);
        const latestParts = LATEST_VERSION_INFO.version.split('.').map(Number);

        let hasUpdate = false;
        for (let i = 0; i < 3; i++) {
          const cur = currentParts[i] || 0;
          const lat = latestParts[i] || 0;
          if (lat > cur) {
            hasUpdate = true;
            break;
          } else if (lat < cur) {
            hasUpdate = false;
            break;
          }
        }

        // Save last check timestamp
        try {
          localStorage.setItem(UPDATE_CHECK_KEY, new Date().toISOString());
        } catch (e) {
          // ignore storage errors
        }

        resolve({
          hasUpdate,
          currentVersion: CURRENT_APP_VERSION,
          latestVersionInfo: LATEST_VERSION_INFO,
        });
      }, 500);
    });
  }

  static isVersionDismissed(version: string): boolean {
    try {
      const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
      return dismissed === version;
    } catch {
      return false;
    }
  }

  static dismissVersion(version: string): void {
    try {
      localStorage.setItem(DISMISSED_UPDATE_KEY, version);
    } catch {
      // ignore
    }
  }

  static clearDismissed(): void {
    try {
      localStorage.removeItem(DISMISSED_UPDATE_KEY);
    } catch {
      // ignore
    }
  }
}
