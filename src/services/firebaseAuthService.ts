import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db as firestoreDb } from '../lib/firebase';
import { SystemUser, UserRole } from '../types';
import { db as localDb } from '../db/localDatabase';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole; // 'ADMIN' (مدير), 'ACCOUNTANT' (محاسب), 'SECRETARY' (سكرتارية)
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

export type AuthListener = (user: FirebaseUserProfile | null, rawFirebaseUser: FirebaseUser | null) => void;

class FirebaseAuthService {
  private currentUserProfile: FirebaseUserProfile | null = null;
  private rawUser: FirebaseUser | null = null;
  private listeners: AuthListener[] = [];
  private isInitialized = false;

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      this.rawUser = user;
      if (user) {
        try {
          const profile = await this.fetchOrCreateUserProfile(user);
          this.currentUserProfile = profile;
          this.syncWithLocalDatabase(profile);
        } catch (err) {
          console.error('[FirebaseAuthService] Error resolving user profile:', err);
          // Fallback minimal profile
          this.currentUserProfile = {
            uid: user.uid,
            email: user.email || 'user@cpa-egypt.com',
            name: user.displayName || user.email?.split('@')[0] || 'مستخدم النظام',
            role: 'PENDING',
            roleTitleArabic: 'قيد الانتظار (PENDING - بانتظار تفعيل المدير)',
            canAccessTreasury: false,
            canAccessAuditTrail: false,
          };
          this.syncWithLocalDatabase(this.currentUserProfile);
        }
      } else {
        this.currentUserProfile = null;
      }
      this.isInitialized = true;
      this.notifyListeners();
    });
  }

  public subscribe(cb: AuthListener): () => void {
    this.listeners.push(cb);
    if (this.isInitialized) {
      cb(this.currentUserProfile, this.rawUser);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUserProfile, this.rawUser));
  }

  /**
   * Fetches the user profile from Firestore collection 'users'
   * If it doesn't exist, provisions a new profile with the appropriate default role.
   */
  public async fetchOrCreateUserProfile(user: FirebaseUser, requestedName?: string): Promise<FirebaseUserProfile> {
    const userDocRef = doc(firestoreDb, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as FirebaseUserProfile;
      // Update last login
      try {
        await updateDoc(userDocRef, {
          lastLoginAt: serverTimestamp(),
        });
      } catch {
        // non-blocking
      }
      return {
        ...data,
        uid: user.uid,
        email: user.email || data.email,
      };
    }

    // Check if any users exist in the system to determine if this is the first user (ADMIN) or subsequent (PENDING)
    let isFirstUser = false;
    try {
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      if (usersSnap.empty) {
        isFirstUser = true;
      }
    } catch {
      // If collection read fails or rules restrict, default to PENDING unless explicitly first
    }

    const defaultRole: UserRole = isFirstUser ? 'ADMIN' : 'PENDING';
    const roleTitle =
      defaultRole === 'ADMIN'
        ? 'مدير النظام والشريك المسؤول'
        : 'قيد الانتظار (PENDING - بانتظار تفعيل المدير)';

    const newProfile: FirebaseUserProfile = {
      uid: user.uid,
      email: user.email || '',
      name: requestedName || user.displayName || user.email?.split('@')[0] || 'عضو فريق المكتب',
      role: defaultRole,
      roleTitleArabic: roleTitle,
      canAccessTreasury: defaultRole === 'ADMIN',
      canAccessAuditTrail: defaultRole === 'ADMIN',
      canAccessCreditFiles: defaultRole === 'ADMIN',
      canAccessTaxReports: defaultRole === 'ADMIN',
      canManageUsers: defaultRole === 'ADMIN',
      canPostEntries: defaultRole === 'ADMIN',
      canEditPostedEntries: defaultRole === 'ADMIN',
      canDeleteRecords: defaultRole === 'ADMIN',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    try {
      await setDoc(userDocRef, newProfile);
    } catch (writeErr) {
      console.warn('[FirebaseAuthService] Could not write new user doc to Firestore:', writeErr);
    }

    return newProfile;
  }

  /**
   * Syncs the authenticated Firebase profile into the application's local user context
   */
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

    // Update in local database state
    localDb.upsertUser(systemUser);
    localDb.setCurrentUserId(profile.uid);
  }

  /**
   * Sign in with Email and Password
   */
  public async signIn(email: string, pass: string): Promise<FirebaseUserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const profile = await this.fetchOrCreateUserProfile(cred.user);
    this.currentUserProfile = profile;
    this.syncWithLocalDatabase(profile);
    this.notifyListeners();
    return profile;
  }

  /**
   * Register a new user with Email and Password
   */
  public async register(email: string, pass: string, name: string): Promise<FirebaseUserProfile> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const profile = await this.fetchOrCreateUserProfile(cred.user, name);
    this.currentUserProfile = profile;
    this.syncWithLocalDatabase(profile);
    this.notifyListeners();
    return profile;
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    this.currentUserProfile = null;
    this.rawUser = null;
    this.notifyListeners();
  }

  /**
   * Retrieves current Firebase ID Token to attach to server API requests
   */
  public async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.warn('[FirebaseAuthService] Failed to get ID token:', err);
      return null;
    }
  }

  public getCurrentProfile(): FirebaseUserProfile | null {
    return this.currentUserProfile;
  }

  public getRawUser(): FirebaseUser | null {
    return this.rawUser || auth.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!(this.currentUserProfile || auth.currentUser);
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
