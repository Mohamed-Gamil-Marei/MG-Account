import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/localDatabase';
import { FirebaseUserProfile } from '../services/firebaseAuthService';

describe('Force Change Password Modal Flag Preservation & Synchronization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. لا تختفي علامة mustChangePassword عند مزامنة المستخدمين من مصادر أخرى (OTHER أو Firebase)', () => {
    // A. User logs in with SERVER_AUTH having mustChangePassword: true
    const serverAuthProfile: FirebaseUserProfile = {
      uid: 'user-desktop-admin-1',
      email: 'admin@desktop.local',
      name: 'مدير النظام',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      canAccessCreditFiles: true,
      canAccessTaxReports: true,
      canManageUsers: true,
      canPostEntries: true,
      canEditPostedEntries: true,
      canDeleteRecords: true,
      mustChangePassword: true,
    };

    const syncedUser = db.syncLoggedInUser(serverAuthProfile, 'SERVER_AUTH');
    expect(syncedUser.mustChangePassword).toBe(true);

    const currentUserAfterLogin = db.getCurrentUser();
    expect(currentUserAfterLogin.mustChangePassword).toBe(true);

    // B. Firebase or general background sync occurs (source: 'OTHER') where profile has no flag or false
    const remoteOtherProfile: FirebaseUserProfile = {
      ...serverAuthProfile,
      mustChangePassword: false,
    };

    db.syncLoggedInUser(remoteOtherProfile, 'OTHER');

    // The flag MUST remain true!
    const currentUserAfterOtherSync = db.getCurrentUser();
    expect(currentUserAfterOtherSync.mustChangePassword).toBe(true);
  });

  it('2. لا تختفي علامة mustChangePassword عند استدعاء mergeRemoteState (مزامنة سحابية / تحديث الحالة)', () => {
    const adminProfile: FirebaseUserProfile = {
      uid: 'admin-temp-99',
      email: 'admin@desktop.local',
      name: 'المدير المؤقت',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      mustChangePassword: true,
    };

    db.syncLoggedInUser(adminProfile, 'SERVER_AUTH');
    expect(db.getCurrentUser().mustChangePassword).toBe(true);

    // Remote state arriving without mustChangePassword on user
    db.mergeRemoteState({
      users: [
        {
          id: 'admin-temp-99',
          email: 'admin@desktop.local',
          name: 'المدير المؤقت',
          role: 'ADMIN',
          roleTitleArabic: 'مدير المنظومة',
          isActive: true,
          canManageUsers: true,
          canAccessTreasury: true,
          canAccessAuditTrail: true,
          canPostEntries: true,
          canEditPostedEntries: true,
          canDeleteRecords: true,
          createdAt: new Date().toISOString(),
          // Note: mustChangePassword is not present in remote state
        },
      ],
    });

    // Flag must still be preserved!
    expect(db.getCurrentUser().mustChangePassword).toBe(true);
  });

  it('3. يتم إلغاء علامة mustChangePassword فقط بعد استدعاء صريح من SERVER_AUTH بنجاح أو setMustChangePassword', () => {
    const adminProfile: FirebaseUserProfile = {
      uid: 'admin-temp-reset-55',
      email: 'admin@desktop.local',
      name: 'المدير',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      mustChangePassword: true,
    };

    db.syncLoggedInUser(adminProfile, 'SERVER_AUTH');
    expect(db.getCurrentUser().mustChangePassword).toBe(true);

    // Explicit clearing after successful password change
    db.setMustChangePassword('admin-temp-reset-55', false);
    expect(db.getCurrentUser().mustChangePassword).toBe(false);

    // Or authoritative SERVER_AUTH update confirming false
    db.syncLoggedInUser({ ...adminProfile, mustChangePassword: false }, 'SERVER_AUTH');
    expect(db.getCurrentUser().mustChangePassword).toBe(false);
  });
});
