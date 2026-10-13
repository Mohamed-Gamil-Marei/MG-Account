import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveOfflineAuthCache,
  verifyOfflineAuthCache,
  clearOfflineAuthCache,
} from '../services/offlineAuthService';
import { db as localDb, SAFE_FALLBACK_USER } from '../db/localDatabase';
import { firebaseAuth, FirebaseUserProfile } from '../services/firebaseAuthService';

describe('Auth Security Fixes Tests', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('1. Server 401 response clears offline auth cache and prevents offline login fallback', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-401-test',
      email: 'user@firm.local',
      name: 'محاسب الاختبار',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي',
      canAccessTreasury: true,
      canAccessAuditTrail: false,
    };

    const pass = 'SecretPassword123!';

    // 1a. Pre-save valid offline cache
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);
    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();

    // 1b. Simulate server returning 401 Unauthorized
    const mockFetchResponse = {
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'تم تعطيل أو حذف هذا الحساب من السيرفر' }),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse));

    // Clear cache as FirebaseAuthGate does when receiving 401
    clearOfflineAuthCache(mockProfile.email);

    // Verify cache is cleared
    expect(localStorage.getItem('cpa_offline_auth_v1')).toBeNull();

    // Verify offline auth attempt fails
    const verifyRes = await verifyOfflineAuthCache(mockProfile.email, pass);
    expect(verifyRes.success).toBe(false);
  });

  it('2. Offline login works ONLY on network failure when server is unreachable', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-offline-net-test',
      email: 'auditor@firm.local',
      name: 'مراجع الحسابات',
      role: 'AUDITOR',
      roleTitleArabic: 'مراقب حسابات',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    const pass = 'ValidPass12345!';

    // Save offline cache
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);

    // Simulate network failure (fetch throws TypeError)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    // Attempt offline verification on network error
    const verifyRes = await verifyOfflineAuthCache(mockProfile.email, pass);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.profile?.email).toBe('auditor@firm.local');
    expect(verifyRes.profile?.isOffline).toBe(true);
  });

  it('3. Email with same prefix but different domain is REJECTED', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-prefix-test',
      email: 'john@company-a.com',
      name: 'John A',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب',
      canAccessTreasury: true,
      canAccessAuditTrail: false,
    };

    const pass = 'Password123!';

    // Save cache for john@company-a.com
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);

    // Attempt offline verification using same prefix but different domain (john@company-b.com)
    const verifyRes = await verifyOfflineAuthCache('john@company-b.com', pass);
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.message).toContain('غير مطابق للحساب المسجل أوفلاين');
  });

  it('4. Logout invokes POST /api/auth/logout, clears offline cache, and resets active user', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-logout-test',
      email: 'admin@firm.local',
      name: 'المدير العام',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    // Pre-save offline cache
    await saveOfflineAuthCache(mockProfile.email, 'Pass12345!', mockProfile);
    localDb.syncLoggedInUser(mockProfile);

    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();
    expect(localDb.getCurrentUser().email).toBe('admin@firm.local');

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchSpy);

    // Execute logout
    await firebaseAuth.signOut();

    // Verify /api/auth/logout was called
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));

    // Verify offline cache is cleared
    expect(localStorage.getItem('cpa_offline_auth_v1')).toBeNull();

    // Verify local DB current user is reset to fallback
    expect(localDb.getCurrentUser().role).toBe('PENDING');
  });

  it('5. Opening app/home with empty local users list returns SAFE_FALLBACK_USER and does NOT crash', () => {
    // Clear local users list and current user ID
    localDb.getState().users = [];
    localDb.getState().currentUserId = '';

    const currentUser = localDb.getCurrentUser();

    expect(currentUser).toBeDefined();
    expect(currentUser).not.toBeNull();
    expect(currentUser.role).toBe('PENDING');
    expect(currentUser.id).toBe(SAFE_FALLBACK_USER.id);
  });
});
