import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveOfflineAuthCache,
  verifyOfflineAuthCache,
  clearOfflineAuthCache,
  derivePBKDF2Hash,
} from '../services/offlineAuthService';
import { db as localDb } from '../db/localDatabase';
import { FirebaseUserProfile } from '../services/firebaseAuthService';

describe('Security & Login Vulnerability Fixes Tests', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. admin/admin credentials are rejected in a clean fresh browser environment', async () => {
    // Attempt local authentication for admin/admin
    const res = localDb.authenticateUser('admin', 'admin');
    expect(res.success).toBe(false);

    // Attempt offline authentication for admin/admin
    const offlineRes = await verifyOfflineAuthCache('admin', 'admin');
    expect(offlineRes.success).toBe(false);
  });

  it('2. Offline login is rejected if no prior successful online login exists', async () => {
    const res = await verifyOfflineAuthCache('accounting@office.local', 'Password123!');
    expect(res.success).toBe(false);
    expect(res.message).toContain('لا يوجد تسجيل دخول أونلاين سابق');
  });

  it('3. Offline login succeeds for a valid user with a valid PBKDF2 cached hash', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-101',
      email: 'accountant@cpa-firm.com',
      name: 'أحمد المحاسب المالي',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي ومدخل قيود',
      canAccessTreasury: true,
      canAccessAuditTrail: false,
      canPostEntries: true,
      canDeleteRecords: false,
    };

    const validPassword = 'MySecurePassword123!';

    // Save offline auth cache (simulating successful online login)
    await saveOfflineAuthCache(mockProfile.email, validPassword, mockProfile);

    // Attempt offline verification with correct password
    const verifyRes = await verifyOfflineAuthCache(mockProfile.email, validPassword);

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.profile).toBeDefined();
    expect(verifyRes.profile?.role).toBe('ACCOUNTANT');
    expect(verifyRes.profile?.canPostEntries).toBe(true);
    expect(verifyRes.profile?.canDeleteRecords).toBe(false);
    expect(verifyRes.profile?.isOffline).toBe(true);
  });

  it('4. Offline login fails if password is incorrect or cache is expired', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-102',
      email: 'auditor@cpa-firm.com',
      name: 'سامح المراجع القانوني',
      role: 'AUDITOR',
      roleTitleArabic: 'مراقب حسابات ومراجع قانوني',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    const validPassword = 'AuditorSecretPass123!';

    // Save cache
    await saveOfflineAuthCache(mockProfile.email, validPassword, mockProfile);

    // 4a. Wrong password attempt
    const wrongRes = await verifyOfflineAuthCache(mockProfile.email, 'WrongPassword999!');
    expect(wrongRes.success).toBe(false);
    expect(wrongRes.message).toContain('كلمة المرور غير صحيحة أوفلاين');

    // 4b. Expired cache test (>7 days)
    const rawCache = localStorage.getItem('cpa_offline_auth_v1');
    expect(rawCache).toBeDefined();
    const cacheObj = JSON.parse(rawCache!);
    cacheObj.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second in the past
    localStorage.setItem('cpa_offline_auth_v1', JSON.stringify(cacheObj));

    const expiredRes = await verifyOfflineAuthCache(mockProfile.email, validPassword);
    expect(expiredRes.success).toBe(false);
    expect(expiredRes.message).toContain('انتهت صلاحية الجلسة المحفوظة أوفلاين');
  });

  it('5. NO plaintext password or PIN is present anywhere in localStorage after login', async () => {
    const secretPassword = 'UltraTopSecretPassword2026!';
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-103',
      email: 'partner@cpa-firm.com',
      name: 'الشريك المسؤول',
      role: 'ADMIN',
      roleTitleArabic: 'شريك قانوني مسؤول',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    // Save offline cache
    await saveOfflineAuthCache(mockProfile.email, secretPassword, mockProfile);

    // Inspect all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key);
      expect(val).not.toContain(secretPassword);
      expect(val).not.toContain('admin'); // no default admin secrets
    }
  });
});
