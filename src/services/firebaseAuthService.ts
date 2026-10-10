import { SystemUser, UserRole } from '../types';
import { db as localDb } from '../db/localDatabase';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole; // 'ADMIN' | 'ACCOUNTANT' | 'SECRETARY' | 'PENDING'
  roleTitleArabic: string;
  phone?: string;
  canAccessTreasury: boolean;
  canAccessAuditTrail: boolean;
  canAccessCreditFiles?: boolean;
  canAccessTaxReports?: boolean;
  canManageUsers?: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  createdAt?: any;
  lastLoginAt?: any;
}

export type AuthListener = (user: FirebaseUserProfile | null, rawUser: any | null) => void;

class FirebaseAuthService {
  private currentUserProfile: FirebaseUserProfile | null = null;
  private listeners: AuthListener[] = [];
  private isInitialized = false;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const profile = this.formatServerUser(data.user);
          this.currentUserProfile = profile;
          this.syncWithLocalDatabase(profile);
        }
      }
    } catch (err) {
      console.warn('[LocalAuth] Not logged in or server offline:', err);
    } finally {
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  private formatServerUser(u: any): FirebaseUserProfile {
    const roleTitle =
      u.role === 'ADMIN'
        ? 'مدير النظام والشريك المسؤول'
        : u.role === 'ACCOUNTANT'
        ? 'محاسب قانوني معتمد'
        : u.role === 'SECRETARY'
        ? 'سكرتارية وإداري'
        : 'قيد الانتظار (PENDING - بانتظار تفعيل المدير)';

    return {
      uid: String(u.id),
      email: u.email,
      name: u.name,
      role: u.role,
      roleTitleArabic: roleTitle,
      canAccessTreasury: !!u.canAccessTreasury,
      canAccessAuditTrail: !!u.canAccessAuditTrail,
      canAccessCreditFiles: !!u.canAccessCreditFiles,
      canAccessTaxReports: !!u.canAccessTaxReports,
      canManageUsers: !!u.canManageUsers,
      canPostEntries: !!u.canPostEntries,
      canEditPostedEntries: !!u.canEditPostedEntries,
      canDeleteRecords: !!u.canDeleteRecords,
      createdAt: u.createdAt,
    };
  }

  public subscribe(cb: AuthListener): () => void {
    this.listeners.push(cb);
    if (this.isInitialized) {
      cb(this.currentUserProfile, this.currentUserProfile);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUserProfile, this.currentUserProfile));
  }

  private syncWithLocalDatabase(profile: FirebaseUserProfile) {
    const systemUser: SystemUser = {
      id: profile.uid,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      roleTitleArabic: profile.roleTitleArabic,
      canAccessTreasury: profile.canAccessTreasury,
      canAccessAuditTrail: profile.canAccessAuditTrail,
      canAccessCreditFiles: profile.canAccessCreditFiles ?? (profile.role !== 'SECRETARY'),
      canAccessTaxReports: profile.canAccessTaxReports ?? (profile.role !== 'SECRETARY'),
      canManageUsers: profile.canManageUsers ?? (profile.role === 'ADMIN'),
      canPostEntries: profile.canPostEntries ?? (profile.role !== 'SECRETARY'),
      canEditPostedEntries: profile.canEditPostedEntries ?? (profile.role === 'ADMIN'),
      canDeleteRecords: profile.canDeleteRecords ?? (profile.role === 'ADMIN'),
      restrictedTabs: profile.role === 'SECRETARY' ? ['OFFICE_TREASURY', 'AUDIT_TRAIL', 'CHART_OF_ACCOUNTS', 'JOURNAL_ENTRIES'] : [],
      createdAt: new Date().toISOString(),
    };

    localDb.setCurrentUserId(profile.uid);
  }

  public async getIdToken(_forceRefresh = false): Promise<string | null> {
    return null;
  }

  public async checkSetup(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/check-setup');
      const data = await res.json();
      return !!data.needsSetup;
    } catch {
      return false;
    }
  }

  public async setupAdmin(name: string, email: string, pass: string): Promise<FirebaseUserProfile> {
    const res = await fetch('/api/auth/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل إعداد حساب المدير.');
    }
    const profile = this.formatServerUser(data.user);
    this.currentUserProfile = profile;
    this.syncWithLocalDatabase(profile);
    this.notifyListeners();
    return profile;
  }

  public async signIn(email: string, pass: string): Promise<FirebaseUserProfile> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    const profile = this.formatServerUser(data.user);
    this.currentUserProfile = profile;
    this.syncWithLocalDatabase(profile);
    this.notifyListeners();
    return profile;
  }

  public async signOut(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // non-blocking
    }
    this.currentUserProfile = null;
    this.notifyListeners();
  }

  public getCurrentProfile(): FirebaseUserProfile | null {
    return this.currentUserProfile;
  }

  public getRawUser(): any | null {
    return this.currentUserProfile;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUserProfile;
  }

  public isAdmin(): boolean {
    return this.currentUserProfile?.role === 'ADMIN';
  }

  public isAccountant(): boolean {
    return this.currentUserProfile?.role === 'ADMIN' || this.currentUserProfile?.role === 'ACCOUNTANT' || this.currentUserProfile?.role === 'AUDITOR';
  }

  public isSecretary(): boolean {
    return this.currentUserProfile?.role === 'SECRETARY';
  }
}

export const firebaseAuth = new FirebaseAuthService();
