export const CURRENT_APP_VERSION = '2026.4.0';

export interface AppVersionInfo {
  version: string;
  releaseDate: string;
  isCritical?: boolean;
  changelog: {
    title: string;
    highlights: string[];
    improvements: string[];
    fixes: string[];
  };
}

const DISMISSED_VERSION_KEY = 'mg_cpa_dismissed_update_version';

export class UpdateCheckerService {
  public static getDismissedVersion(): string | null {
    try {
      return localStorage.getItem(DISMISSED_VERSION_KEY);
    } catch {
      return null;
    }
  }

  public static dismissVersion(version: string): void {
    try {
      localStorage.setItem(DISMISSED_VERSION_KEY, version);
    } catch {
      // ignore storage errors
    }
  }

  public static async checkForUpdates(): Promise<AppVersionInfo | null> {
    return null;
  }
}
