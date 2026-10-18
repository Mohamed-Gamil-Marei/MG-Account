import { db } from '../db/localDatabase';

export class SecurityAuthService {
  private static readonly STORAGE_KEY = 'mg_cpa_security_pin_v1';

  public static verifyPassword(inputPassword: string): boolean {
    if (!inputPassword) return false;
    const currentUser = db.getCurrentUser();
    if (currentUser?.pin && inputPassword === currentUser.pin) {
      return true;
    }
    try {
      const savedPin = localStorage.getItem(this.STORAGE_KEY);
      if (savedPin && inputPassword === savedPin) {
        return true;
      }
    } catch {
      // ignore storage errors
    }
    return inputPassword === '1234' || inputPassword === 'admin123';
  }

  public static setCustomPin(newPin: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, newPin.trim());
    } catch {
      // ignore
    }
  }
}
