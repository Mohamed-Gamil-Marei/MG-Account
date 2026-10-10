import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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
}

export type AuthListener = (user: FirebaseUserProfile | null, rawUser: FirebaseUser | null) => void;

class FirebaseAuthService {
  private currentUserProfile: FirebaseUserProfile | null = null;
  private rawFirebaseUser: FirebaseUser | null = null;
  private listeners: AuthListener[] = [];
  private isInitialized = false;

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.rawFirebaseUser = user;
      if (user) {
        await this.loadUserProfile(user);
      } else {
        this.currentUserProfile = null;
        this.isInitialized = true;
        this.notifyListeners();
      }
    });
  }

  private async loadUserProfile(user: FirebaseUser) {
    try {
      const docRef = doc(db, 'systemUsers', user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        this.currentUserProfile = this.formatUser(data, user);
      } else {
        // Create default PENDING profile if not exists in Firestore
        const defaultProfile: any = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'مستخدم جديد',
          role: 'PENDING',
          canAccessTreasury: false,
          canAccessAuditTrail: false,
          canManageUsers: false,
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, defaultProfile, { merge: true });
        this.currentUserProfile = this.formatUser(defaultProfile, user);
      }
      if (this.currentUserProfile) {
        localDb.setCurrentUserId(this.currentUserProfile.uid);
      }
    } catch (err) {
      console.error('Error loading user profile from Firestore:', err);
    } finally {
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  private formatUser(u: any, user: FirebaseUser): FirebaseUserProfile {
    const role = u.role || 'PENDING';
    const roleTitle =
      role === 'ADMIN'
        ? 'مدير النظام والشريك المسؤول'
        : role === 'ACCOUNTANT'
        ? 'محاسب قانوني معتمد'
        : role === 'SECRETARY'
        ? 'سكرتارية وإداري'
        : 'قيد الانتظار (PENDING - بانتظار تفعيل المدير)';

    return {
      uid: user.uid,
      email: user.email || u.email,
      name: u.name || user.displayName || 'مستخدم',
      role,
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
      cb(this.currentUserProfile, this.rawFirebaseUser);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUserProfile, this.rawFirebaseUser));
  }

  public async signIn(email: string, pass: string): Promise<FirebaseUserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await this.loadUserProfile(cred.user);
    if (!this.currentUserProfile) {
      throw new Error('تعذر تحميل ملف المستخدم.');
    }
    return this.currentUserProfile;
  }

  public async signUp(name: string, email: string, pass: string): Promise<FirebaseUserProfile> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;
    const defaultProfile: any = {
      id: user.uid,
      email,
      name,
      role: 'PENDING',
      canAccessTreasury: false,
      canAccessAuditTrail: false,
      canManageUsers: false,
      canPostEntries: false,
      canEditPostedEntries: false,
      canDeleteRecords: false,
      createdAt: new Date().toISOString(),
    };
    const docRef = doc(db, 'systemUsers', user.uid);
    await setDoc(docRef, defaultProfile);
    await this.loadUserProfile(user);
    if (!this.currentUserProfile) {
      throw new Error('تعذر إنشاء وتسجيل حساب المستخدم.');
    }
    return this.currentUserProfile;
  }

  public async signOut(): Promise<void> {
    await fbSignOut(auth);
    this.currentUserProfile = null;
    this.rawFirebaseUser = null;
    this.notifyListeners();
  }

  public async checkSetup(): Promise<boolean> {
    return false; // No auto setup needed, admin created in console
  }

  public async setupAdmin(name: string, email: string, pass: string): Promise<FirebaseUserProfile> {
    return this.signUp(name, email, pass);
  }
}

export const firebaseAuth = new FirebaseAuthService();
