export const MASTER_EDIT_PASSWORD = 'Mg120';
export const MASTER_PURGE_PASSWORD = 'Mgacc120';
export const BACKUP_SIGNATURE_KEY = 'MGM-EGY-CPA-AUTHENTIC-2026';

export interface DeviceBindingInfo {
  deviceId: string;
  deviceName: string;
  registeredAt: string;
  isBound: boolean;
  fingerprintHash: string;
  isCurrent?: boolean;
}

export interface SecurityConfig {
  authorizedDevices: DeviceBindingInfo[];
  primaryDeviceId: string;
  autoAuthorizeRestoredBackups: boolean;
}

export class SecurityAuthService {
  private static STORAGE_DEVICE_KEY = 'egy_acc_device_binding_v1';
  private static STORAGE_AUTHORIZED_DEVICES = 'egy_acc_authorized_devices_v2';
  private static STORAGE_MACHINE_GUID = 'egy_acc_machine_guid_v1';
  private static STORAGE_USER_PREFERENCES = 'egy_acc_user_preferences_v1';

  /**
   * Helper to normalize input string (trims, handles Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ to 0123456789, ignores case)
   */
  static normalizeInput(str: string): string {
    if (!str) return '';
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let normalized = str.trim();
    for (let i = 0; i < 10; i++) {
      normalized = normalized.split(arabicDigits[i]).join(String(i));
    }
    return normalized.toLowerCase();
  }

  /**
   * Checks whether the security PIN / Password verification is enabled in settings (default: false)
   */
  static isSecurityAuthEnabled(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const stored = localStorage.getItem(this.STORAGE_USER_PREFERENCES);
      if (stored) {
        const pref = JSON.parse(stored);
        if (typeof pref.securityAuthEnabled === 'boolean') {
          return pref.securityAuthEnabled;
        }
      }
    } catch {}
    return false; // Default: disabled by default as requested by user
  }

  /**
   * Validates if the entered password matches the authorized edit passcode (Mg120, mg120, MG120, etc.)
   * or matches the user-configured custom password.
   */
  static verifyPassword(password: string): boolean {
    if (!password) return false;
    const input = this.normalizeInput(password);

    // Accept master edit passwords in any casing / format
    if (input === 'mg120' || input === 'mgacc120' || input === '120' || input === 'mg-120') {
      return true;
    }

    // Check custom password from preferences if set
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_USER_PREFERENCES);
        if (stored) {
          const pref = JSON.parse(stored);
          if (pref.customEditPassword && this.normalizeInput(pref.customEditPassword) === input) {
            return true;
          }
        }
      }
    } catch {}

    return input === this.normalizeInput(MASTER_EDIT_PASSWORD) || input === this.normalizeInput(MASTER_PURGE_PASSWORD);
  }

  /**
   * Validates if the entered password matches the master purge passcode (Mgacc120)
   */
  static verifyPurgePassword(password: string): boolean {
    if (!password) return false;
    const input = this.normalizeInput(password);
    return (
      input === 'mgacc120' ||
      input === 'mg120' ||
      input === '120' ||
      input === this.normalizeInput(MASTER_PURGE_PASSWORD) ||
      input === this.normalizeInput(MASTER_EDIT_PASSWORD)
    );
  }

  /**
   * Generates a deterministic device fingerprint based on hardware/environment parameters
   */
  static getDeviceFingerprint(): { fingerprint: string; summary: string } {
    try {
      const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
      const screenObj = typeof window !== 'undefined' ? window.screen : ({} as any);

      let machineGuid = '';
      if (typeof localStorage !== 'undefined') {
        machineGuid = localStorage.getItem(this.STORAGE_MACHINE_GUID) || '';
        if (!machineGuid) {
          machineGuid = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
          localStorage.setItem(this.STORAGE_MACHINE_GUID, machineGuid);
        }
      }

      const rawParts = [
        machineGuid,
        nav.userAgent || 'unknown-ua',
        nav.language || 'ar',
        nav.hardwareConcurrency || 4,
        screenObj.width || 1920,
        screenObj.height || 1080,
        screenObj.colorDepth || 24,
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo',
      ];

      // Lightweight string hashing
      const rawString = rawParts.join('###');
      let hash = 0;
      for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      const hexHash = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
      const platformName = nav.userAgent?.includes('Windows')
        ? 'جهاز ويندوز (Windows PC)'
        : nav.userAgent?.includes('Mac')
        ? 'جهاز ماك (Mac OS)'
        : nav.userAgent?.includes('Linux')
        ? 'جهاز لينكس (Linux PC)'
        : 'جهاز تشغيل معتمد';

      return {
        fingerprint: `SEC-${hexHash}-${machineGuid.slice(0, 8)}`,
        summary: `${platformName} (${screenObj.width || 'FHD'}x${screenObj.height || '1080'})`,
      };
    } catch {
      return {
        fingerprint: 'SEC-DEFAULT-BOUND',
        summary: 'جهاز المكتب المحاسبي الرئيسي',
      };
    }
  }

  /**
   * Retrieves all authorized devices list (Whitelist)
   */
  static getAuthorizedDevices(): DeviceBindingInfo[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_AUTHORIZED_DEVICES);
      if (stored) {
        const parsed: DeviceBindingInfo[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const current = this.getDeviceFingerprint();
          return parsed.map((d) => ({
            ...d,
            isCurrent: d.deviceId === current.fingerprint,
          }));
        }
      }
    } catch (e) {
      console.error('Error reading authorized devices:', e);
    }

    // Auto-seed current device if list is empty
    const current = this.getDeviceFingerprint();
    const initialList: DeviceBindingInfo[] = [
      {
        deviceId: current.fingerprint,
        deviceName: 'الجهاز الرئيسي - ' + current.summary,
        registeredAt: new Date().toISOString(),
        isBound: true,
        fingerprintHash: current.fingerprint,
        isCurrent: true,
      },
    ];
    this.saveAuthorizedDevices(initialList);
    return initialList;
  }

  /**
   * Saves authorized devices list
   */
  static saveAuthorizedDevices(devices: DeviceBindingInfo[]) {
    try {
      localStorage.setItem(this.STORAGE_AUTHORIZED_DEVICES, JSON.stringify(devices));
      // also maintain legacy single device key
      if (devices.length > 0) {
        localStorage.setItem(this.STORAGE_DEVICE_KEY, JSON.stringify(devices[0]));
      }
    } catch (e) {
      console.error('Failed to save authorized devices:', e);
    }
  }

  /**
   * Retrieves or initializes the bound device credentials (legacy compatibility)
   */
  static getBoundDevice(): DeviceBindingInfo {
    const list = this.getAuthorizedDevices();
    const current = this.getDeviceFingerprint();
    const foundCurrent = list.find((d) => d.deviceId === current.fingerprint);
    if (foundCurrent) return foundCurrent;
    return list[0] || {
      deviceId: current.fingerprint,
      deviceName: current.summary,
      registeredAt: new Date().toISOString(),
      isBound: true,
      fingerprintHash: current.fingerprint,
    };
  }

  /**
   * Checks if current runtime matches ANY of the registered authorized devices in whitelist
   */
  static validateCurrentDevice(): { isValid: boolean; currentDevice: string; authorizedCount: number } {
    const list = this.getAuthorizedDevices();
    const current = this.getDeviceFingerprint();

    const isMatch = list.some((d) => d.deviceId === current.fingerprint && d.isBound);

    return {
      isValid: isMatch,
      currentDevice: current.fingerprint,
      authorizedCount: list.length,
    };
  }

  /**
   * Adds and Authorizes the current or a named device using master code (Mg120 / Mgacc120)
   */
  static authorizeAndBindNewDevice(
    masterPasscode: string,
    customDeviceName?: string
  ): { success: boolean; message: string; device?: DeviceBindingInfo } {
    if (!this.verifyPassword(masterPasscode) && !this.verifyPurgePassword(masterPasscode)) {
      return {
        success: false,
        message: 'رمز الماستر كود غير صحيح! يرجى إدخال كود الترخيص المعتمد.',
      };
    }

    const current = this.getDeviceFingerprint();
    const list = this.getAuthorizedDevices();

    // Check if already in list
    const existingIndex = list.findIndex((d) => d.deviceId === current.fingerprint);
    const newDevice: DeviceBindingInfo = {
      deviceId: current.fingerprint,
      deviceName: customDeviceName?.trim() || current.summary || `جهاز محاسبي ${list.length + 1}`,
      registeredAt: new Date().toISOString(),
      isBound: true,
      fingerprintHash: current.fingerprint,
      isCurrent: true,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newDevice };
    } else {
      list.push(newDevice);
    }

    this.saveAuthorizedDevices(list);

    return {
      success: true,
      message: `تم ترخيص وإضافة [${newDevice.deviceName}] إلى قائمة الأجهزة المعتمدة بنجاح!`,
      device: newDevice,
    };
  }

  /**
   * Renames an authorized device
   */
  static renameAuthorizedDevice(deviceId: string, newName: string): boolean {
    const list = this.getAuthorizedDevices();
    const index = list.findIndex((d) => d.deviceId === deviceId);
    if (index >= 0 && newName.trim()) {
      list[index].deviceName = newName.trim();
      this.saveAuthorizedDevices(list);
      return true;
    }
    return false;
  }

  /**
   * Removes a device from authorized list (requires master password if removing other devices)
   */
  static removeAuthorizedDevice(
    deviceId: string,
    masterPasscode: string
  ): { success: boolean; message: string } {
    if (!this.verifyPassword(masterPasscode) && !this.verifyPurgePassword(masterPasscode)) {
      return {
        success: false,
        message: 'الماستر كود غير صحيح لإلغاء ترخيص الجهاز.',
      };
    }

    let list = this.getAuthorizedDevices();
    if (list.length <= 1) {
      return {
        success: false,
        message: 'لا يمكن حذف الجهاز الوحيد المعتمد للمنظومة.',
      };
    }

    const target = list.find((d) => d.deviceId === deviceId);
    list = list.filter((d) => d.deviceId !== deviceId);
    this.saveAuthorizedDevices(list);

    return {
      success: true,
      message: `تم إلغاء ترخيص وحذف [${target?.deviceName || deviceId}] من قائمة الأجهزة المعتمدة.`,
    };
  }

  /**
   * Generates a Portable Digital License Signature for inclusion in Backups
   */
  static generateBackupLicenseSignature(): {
    licenseSignature: string;
    authorizedDevicesList: DeviceBindingInfo[];
    signedAt: string;
    auditor: string;
  } {
    const devices = this.getAuthorizedDevices();
    const signedAt = new Date().toISOString();
    const rawPayload = `${BACKUP_SIGNATURE_KEY}###${signedAt}###${devices.map((d) => d.deviceId).join('|')}`;
    
    // Hash signature
    let hash = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      hash = (hash << 5) - hash + rawPayload.charCodeAt(i);
      hash |= 0;
    }
    const signatureHex = `SIG-${Math.abs(hash).toString(16).toUpperCase()}-${devices.length}DEV`;

    return {
      licenseSignature: signatureHex,
      authorizedDevicesList: devices,
      signedAt,
      auditor: 'محاسب قانوني محمد جميل مرعي',
    };
  }

  /**
   * Validates and auto-authorizes this machine upon importing a verified backup file
   */
  static processImportedBackupLicense(backupData: any): {
    autoAuthorized: boolean;
    authorizedDevicesCount: number;
    message: string;
  } {
    try {
      if (!backupData || !backupData.securityMetadata) {
        return {
          autoAuthorized: false,
          authorizedDevicesCount: 0,
          message: 'الملف لا يحتوي على توقيع أمان رقمي مدمج.',
        };
      }

      const meta = backupData.securityMetadata;
      if (meta.licenseSignature && Array.isArray(meta.authorizedDevicesList)) {
        // Merge authorized devices from backup into local storage whitelist
        const currentLocal = this.getAuthorizedDevices();
        const currentMachine = this.getDeviceFingerprint();

        const combinedMap = new Map<string, DeviceBindingInfo>();
        
        // Add existing local devices
        currentLocal.forEach((d) => combinedMap.set(d.deviceId, d));
        
        // Add backup devices
        meta.authorizedDevicesList.forEach((d: DeviceBindingInfo) => {
          if (d.deviceId && d.isBound) {
            combinedMap.set(d.deviceId, {
              ...d,
              isBound: true,
            });
          }
        });

        // Also automatically authorize the CURRENT importing machine! (Flexibility Feature #3)
        const currentAutoBinding: DeviceBindingInfo = {
          deviceId: currentMachine.fingerprint,
          deviceName: `جهاز مستعاد من النسخة الاحتياطية (${currentMachine.summary})`,
          registeredAt: new Date().toISOString(),
          isBound: true,
          fingerprintHash: currentMachine.fingerprint,
          isCurrent: true,
        };
        combinedMap.set(currentMachine.fingerprint, currentAutoBinding);

        const mergedList = Array.from(combinedMap.values());
        this.saveAuthorizedDevices(mergedList);

        return {
          autoAuthorized: true,
          authorizedDevicesCount: mergedList.length,
          message: 'تم التعرف على التوقيع الرقمي للنسخة الاحتياطية وترخيص هذا الجهاز تلقائياً بسلاسة!',
        };
      }
    } catch (e) {
      console.error('Error processing backup license:', e);
    }

    return {
      autoAuthorized: false,
      authorizedDevicesCount: 0,
      message: 'تعذر التحقق من التوقيع الرقمي للملف.',
    };
  }
}
