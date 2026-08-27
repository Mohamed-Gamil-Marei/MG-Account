export const MASTER_EDIT_PASSWORD = 'Mg120';

export class SecurityAuthService {
  /**
   * Validates if the entered password matches the authorized edit passcode (Mg120)
   */
  static verifyPassword(password: string): boolean {
    return password.trim() === MASTER_EDIT_PASSWORD;
  }
}
