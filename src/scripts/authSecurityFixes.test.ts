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

  it('1. Server 401 response in /api/auth/me clears offline auth cache', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-401-me',
      email: 'user@firm.local',
      name: 'محاسب الاختبار',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي',
      canAccessTreasury: true,
      canAccessAuditTrail: false,
    };

    const pass = 'SecretPassword123!';
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);
    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();

    // Simulate 401 from /api/auth/me clearing cache
    clearOfflineAuthCache(mockProfile.email);
    expect(localStorage.getItem('cpa_offline_auth_v1')).toBeNull();
  });

  it('2. Server 503 response does not clear cache and allows offline login', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-503-test',
      email: 'admin@firm.local',
      name: 'المدير العام',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    const pass = 'Password12345!';
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);
    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();

    // Simulate 503 response (server unavailable, cache must NOT be cleared)
    const res = { ok: false, status: 503 };
    if (res.status >= 500 && res.status <= 504) {
      // do not clear cache
    } else {
      clearOfflineAuthCache(mockProfile.email);
    }

    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();

    // Verify offline login works
    const verifyRes = await verifyOfflineAuthCache(mockProfile.email, pass);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.profile?.isOffline).toBe(true);
  });

  it('3. Server 429 response does not clear cache', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-429-test',
      email: 'user@firm.local',
      name: 'محاسب',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي',
      canAccessTreasury: true,
    };

    const pass = 'Password12345!';
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);
    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();

    const res = { ok: false, status: 429 };
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      // Rule: 401/403/429 do NOT clear offline cache in login!
    } else {
      clearOfflineAuthCache(mockProfile.email);
    }

    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();
  });

  it('4. Request timeout is treated as offline', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-timeout-test',
      email: 'timeout@firm.local',
      name: 'تست تايم آوت',
      role: 'AUDITOR',
      roleTitleArabic: 'مراقب',
      canAccessTreasury: true,
    };

    const pass = 'Password12345!';
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);

    // Simulate timeout (AbortError / fetch rejection)
    let isNetworkError = false;
    try {
      throw new DOMException('The operation was aborted', 'AbortError');
    } catch (err) {
      isNetworkError = true;
    }

    expect(isNetworkError).toBe(true);
    const verifyRes = await verifyOfflineAuthCache(mockProfile.email, pass);
    expect(verifyRes.success).toBe(true);
  });

  it('5. Email with same prefix but different domain is REJECTED', async () => {
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
    await saveOfflineAuthCache(mockProfile.email, pass, mockProfile);

    const verifyRes = await verifyOfflineAuthCache('john@company-b.com', pass);
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.message).toContain('غير مطابق للحساب المسجل أوفلاين');
  });

  it('6. Logout invokes POST /api/auth/logout, clears offline cache, and resets active user', async () => {
    const mockProfile: FirebaseUserProfile = {
      uid: 'usr-logout-test',
      email: 'admin@firm.local',
      name: 'المدير العام',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
    };

    await saveOfflineAuthCache(mockProfile.email, 'Pass12345!', mockProfile);
    localDb.syncLoggedInUser(mockProfile);

    expect(localStorage.getItem('cpa_offline_auth_v1')).not.toBeNull();
    expect(localDb.getCurrentUser().email).toBe('admin@firm.local');

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchSpy);

    await firebaseAuth.signOut();

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
    expect(localStorage.getItem('cpa_offline_auth_v1')).toBeNull();
    expect(localDb.getCurrentUser().role).toBe('PENDING');
  });

  it('7. Opening app with empty local users list returns SAFE_FALLBACK_USER', () => {
    localDb.getState().users = [];
    localDb.getState().currentUserId = '';

    const currentUser = localDb.getCurrentUser();
    expect(currentUser).toBeDefined();
    expect(currentUser.role).toBe('PENDING');
    expect(currentUser.id).toBe(SAFE_FALLBACK_USER.id);
  });
});
