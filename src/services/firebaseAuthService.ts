import { UserRole } from '../types';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  role: UserRole;
  roleTitleArabic: string;
  isApproved?: boolean;
  isOffline?: boolean;
  mustChangePassword?: boolean;
  canAccessTreasury?: boolean;
  canAccessAuditTrail?: boolean;
  canManageUsers?: boolean;
  canPostEntries?: boolean;
  canEditPostedEntries?: boolean;
  canDeleteRecords?: boolean;
  canAccessCreditFiles?: boolean;
  canAccessTaxReports?: boolean;
  permittedClientIds?: string[];
  lastLoginAt?: string;
  createdAt?: string;
  authSource?: 'SERVER_SQLITE' | 'FIREBASE' | 'OFFLINE_LOCAL';
  sessionToken?: string;
  [key: string]: any;
}

const SESSION_PROFILE_KEY = 'mg_cpa_active_auth_profile';
const SESSION_TOKEN_KEY = 'mg_cpa_server_session_token';

class FirebaseAuthService {
  private currentProfile: FirebaseUserProfile | null = null;
  private listeners: Set<(profile: FirebaseUserProfile | null) => void> = new Set();

  constructor() {
    this.loadStoredSession();
  }

  private loadStoredSession(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(SESSION_PROFILE_KEY);
      if (raw) {
        this.currentProfile = JSON.parse(raw);
      }
    } catch {
      this.currentProfile = null;
    }
  }

  public getCurrentProfile(): FirebaseUserProfile | null {
    return this.currentProfile;
  }

  public setCurrentProfile(profile: FirebaseUserProfile | null, token?: string): void {
    this.currentProfile = profile;
    try {
      if (typeof localStorage !== 'undefined') {
        if (profile) {
          localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
          if (token || profile.sessionToken) {
            localStorage.setItem(SESSION_TOKEN_KEY, token || profile.sessionToken || '');
          }
        } else {
          localStorage.removeItem(SESSION_PROFILE_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }
    this.notifyListeners();
  }

  public onAuthStateChange(callback: (profile: FirebaseUserProfile | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentProfile);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentProfile);
      } catch {
        // ignore listener errors
      }
    }
  }

  public isAdmin(): boolean {
    return this.currentProfile?.role === 'ADMIN';
  }

  public async getIdToken(): Promise<string | null> {
    if (this.currentProfile?.sessionToken) return this.currentProfile.sessionToken;
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public async signOut(): Promise<void> {
    try {
      const token = await this.getIdToken();
      if (token && typeof fetch !== 'undefined') {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      this.setCurrentProfile(null);
    }
  }
}

export const firebaseAuth = new FirebaseAuthService();
