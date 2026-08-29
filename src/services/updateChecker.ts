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

export const CURRENT_APP_VERSION = '4.3.0';

// Latest version descriptor
export const LATEST_VERSION_INFO: AppVersionInfo = {
  version: '4.3.0',
  releaseDate: '2026-08-28',
  isLatest: true,
  latestVersion: '4.3.0',
  changelog: {
    title: 'تحديث رئيسي: ترقية محرك الحسابات والمراجعة، الوضع المظلم، وإدارة الصلاحيات (RBAC)',
    highlights: [
      'تفعيل الوضع المظلم والفاتح (Dark / Light Mode) مع 5 أنماط ألوان للهوية البصرية لمكتب المحاسبة',
      'إدارة متقدمة للمستخدمين وتوزيع الصلاحيات (مدير النظام، مراجع أول، محاسب مالي، سكرتارية)',
      'تكامل شامل مع منظومة الفاتورة والإيصال الإلكتروني المصري ومطابقة ETA وتوليد QR Code',
      'محاكي الفحص الضريبي وحساب غرامات المادة 110 من قانون الإجراءات الضريبية الموحد',
      'كراسة الإيضاحات المتممة، أوراق عمل المراجعة (ESA 320)، ومسير الرواتب والتأمينات (قانون 148)',
    ],
    improvements: [
      'تسريع فائق للأداء وتقليل زمن التحميل بنسبة تفوق 60%',
      'تحديث جداول شرائح كسب العمل ومحددات الخصم الضريبي ومطابقة كشوف المرتبات الشهرية',
      'تأمين كامل لقواعد البيانات المحلية مع التحقق الصارم من توازن اليومية والأستاذ العام',
    ],
    fixes: [
      'تثبيت مسارات الاستيراد وحل مشكلات التوافق مع الحزم المساعدة',
      'تحسين عرض الجداول والتقارير عند الطباعة والتصدير بصيغ PDF و Excel',
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
