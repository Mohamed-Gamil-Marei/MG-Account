import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { DatabaseState } from '../db/localDatabase';
import { CustomFirebaseConfig } from '../types';

export const WORKSPACE_DOC_ID = 'main-accounting-workspace';
export const WORKSPACE_COLLECTION = 'workspaces';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'OFFLINE' | 'ERROR';

export interface CloudSyncInfo {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncedBy: string | null;
  pendingChanges: boolean;
  errorMessage: string | null;
  isCloudConnected: boolean;
  activeProjectId?: string;
  isCustomProject?: boolean;
}

type SyncCallback = (info: CloudSyncInfo) => void;
type RemoteUpdateCallback = (cloudState: Partial<DatabaseState>) => void;

class CloudSyncManager {
  private appInstance: FirebaseApp | null = null;
  private dbInstance: Firestore | null = null;

  private syncInfo: CloudSyncInfo = {
    status: 'IDLE',
    lastSyncedAt: null,
    lastSyncedBy: null,
    pendingChanges: false,
    errorMessage: null,
    isCloudConnected: true,
    activeProjectId: defaultFirebaseConfig.projectId,
    isCustomProject: false,
  };

  private listeners: Set<SyncCallback> = new Set();
  private remoteUpdateListeners: Set<RemoteUpdateCallback> = new Set();
  private unsubscribeRemoteListener: (() => void) | null = null;
  private autoSyncDebounceTimer: any = null;
  private isApplyingRemoteUpdate = false;

  constructor() {
    this.initFirebase();
    this.initOnlineStatusListeners();
  }

  public initFirebase(customConfig?: CustomFirebaseConfig) {
    try {
      if (this.unsubscribeRemoteListener) {
        this.unsubscribeRemoteListener();
        this.unsubscribeRemoteListener = null;
      }

      if (customConfig && customConfig.isCustomActive && customConfig.projectId && customConfig.apiKey) {
        const customAppConfig = {
          projectId: customConfig.projectId,
          appId: customConfig.appId,
          apiKey: customConfig.apiKey,
          authDomain: customConfig.authDomain || `${customConfig.projectId}.firebaseapp.com`,
          storageBucket: customConfig.storageBucket || `${customConfig.projectId}.firebasestorage.app`,
          messagingSenderId: customConfig.messagingSenderId || '',
        };

        const appName = `custom-firebase-${Date.now()}`;
        this.appInstance = initializeApp(customAppConfig, appName);
        try {
          this.dbInstance = initializeFirestore(this.appInstance, {
            experimentalForceLongPolling: true,
          }, customConfig.firestoreDatabaseId || '(default)');
        } catch {
          this.dbInstance = getFirestore(this.appInstance, customConfig.firestoreDatabaseId || '(default)');
        }
        this.updateSyncInfo({
          activeProjectId: customConfig.projectId,
          isCustomProject: true,
          errorMessage: null,
        });
      } else {
        this.appInstance = getApps().length === 0 ? initializeApp(defaultFirebaseConfig) : getApp();
        try {
          this.dbInstance = initializeFirestore(this.appInstance, {
            experimentalForceLongPolling: true,
          }, defaultFirebaseConfig.firestoreDatabaseId);
        } catch {
          this.dbInstance = getFirestore(this.appInstance, defaultFirebaseConfig.firestoreDatabaseId);
        }
        this.updateSyncInfo({
          activeProjectId: defaultFirebaseConfig.projectId,
          isCustomProject: false,
          errorMessage: null,
        });
      }
    } catch (e: any) {
      console.error('Error initializing Firebase in CloudSyncManager:', e);
      this.updateSyncInfo({
        status: 'ERROR',
        errorMessage: `خطأ في تهيئة الاتصال بـ Firebase: ${e?.message || ''}`,
      });
    }
  }

  public getFirestoreDb(): Firestore {
    if (!this.dbInstance) {
      this.initFirebase();
    }
    return this.dbInstance!;
  }

  private initOnlineStatusListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateSyncInfo({ isCloudConnected: true, errorMessage: null });
      });
      window.addEventListener('offline', () => {
        this.updateSyncInfo({ isCloudConnected: false, status: 'OFFLINE' });
      });
    }
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    callback(this.syncInfo);
    return () => this.listeners.delete(callback);
  }

  public onRemoteUpdate(callback: RemoteUpdateCallback): () => void {
    this.remoteUpdateListeners.add(callback);
    return () => this.remoteUpdateListeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb({ ...this.syncInfo });
      } catch (err) {
        console.error('Error in cloud sync listener:', err);
      }
    });
  }

  private updateSyncInfo(partial: Partial<CloudSyncInfo>) {
    this.syncInfo = { ...this.syncInfo, ...partial };
    this.notify();
  }

  public getSyncInfo(): CloudSyncInfo {
    return { ...this.syncInfo };
  }

  /**
   * Start listening in real-time to changes made from mobile or other computers
   */
  public startRealTimeListener() {
    if (this.unsubscribeRemoteListener) return;

    try {
      const db = this.getFirestoreDb();
      const workspaceRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);

      this.unsubscribeRemoteListener = onSnapshot(
        workspaceRef,
        (snapshot) => {
          if (!snapshot.exists()) return;

          // If we are currently pushing local updates, skip feedback loop
          if (this.isApplyingRemoteUpdate) return;

          const data = snapshot.data();
          if (!data) return;

          const remoteState: Partial<DatabaseState> = {
            accounts: data.accounts,
            journalEntries: data.journalEntries,
            clients: data.clients,
            treasuryTransactions: data.treasuryTransactions,
            taxDeclarations: data.taxDeclarations,
            invoices: data.invoices,
            certificates: data.certificates,
            feasibilityStudies: data.feasibilityStudies,
            creditSimulations: data.creditSimulations,
            fixedAssets: data.fixedAssets,
            officeProfile: data.officeProfile,
            users: data.users,
            taxMandates: data.taxMandates,
            exchangeRates: data.exchangeRates,
            fiscalPeriodLocks: data.fiscalPeriodLocks,
          };

          this.updateSyncInfo({
            status: 'SYNCED',
            lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
            lastSyncedBy: data.updatedBy || 'مستخدم سحابي',
            errorMessage: null,
            isCloudConnected: true,
          });

          // Inform subscribers about remote updates
          this.remoteUpdateListeners.forEach((cb) => {
            try {
              cb(remoteState);
            } catch (e) {
              console.error('Error executing remote update callback:', e);
            }
          });
        },
        (error) => {
          console.warn('Real-time sync snapshot notice:', error);
          this.updateSyncInfo({
            isCloudConnected: false,
            errorMessage: 'تعذر التزامن المباشر، جاري العمل في وضع عدم الاتصال',
          });
        }
      );
    } catch (e: any) {
      console.error('Failed to init real-time sync listener:', e);
    }
  }

  /**
   * Push full local state to the cloud workspace
   */
  public async pushToCloud(localState: DatabaseState, updatedByUserName?: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateSyncInfo({ status: 'OFFLINE', isCloudConnected: false, errorMessage: null });
      return false;
    }

    try {
      this.updateSyncInfo({ status: 'SYNCING', errorMessage: null });
      this.isApplyingRemoteUpdate = true;

      const db = this.getFirestoreDb();
      const workspaceRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);

      const payload = {
        version: 1,
        lastSyncedAt: new Date().toISOString(),
        updatedBy: updatedByUserName || 'أ/ محمد جميل مرعي',
        serverTimestamp: serverTimestamp(),
        accounts: localState.accounts || [],
        journalEntries: localState.journalEntries || [],
        clients: localState.clients || [],
        treasuryTransactions: localState.treasuryTransactions || [],
        taxDeclarations: localState.taxDeclarations || [],
        invoices: localState.invoices || [],
        certificates: localState.certificates || [],
        feasibilityStudies: localState.feasibilityStudies || [],
        creditSimulations: localState.creditSimulations || [],
        fixedAssets: localState.fixedAssets || [],
        officeProfile: localState.officeProfile,
        users: localState.users || [],
        taxMandates: localState.taxMandates || [],
        exchangeRates: localState.exchangeRates || [],
        fiscalPeriodLocks: localState.fiscalPeriodLocks || [],
      };

      // Set with a timeout to avoid long hanging when offline or unreachable
      const pushPromise = setDoc(workspaceRef, payload, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال بالخادم السحابي')), 7000)
      );

      await Promise.race([pushPromise, timeoutPromise]);

      this.updateSyncInfo({
        status: 'SYNCED',
        lastSyncedAt: payload.lastSyncedAt,
        lastSyncedBy: payload.updatedBy,
        pendingChanges: false,
        errorMessage: null,
        isCloudConnected: true,
      });

      return true;
    } catch (err: any) {
      const isOfflineErr =
        err?.code === 'unavailable' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('network') ||
        err?.message?.includes('مهلة');

      if (isOfflineErr) {
        this.updateSyncInfo({
          status: 'OFFLINE',
          isCloudConnected: false,
          errorMessage: null, // Don't show scary error when simply offline
        });
      } else {
        console.warn('Cloud push notice:', err?.message || err);
        this.updateSyncInfo({
          status: 'ERROR',
          errorMessage: 'تعذر رفع البيانات للسحابة حالياً، يتم الحفظ محلياً بأمان',
        });
      }
      return false;
    } finally {
      setTimeout(() => {
        this.isApplyingRemoteUpdate = false;
      }, 500);
    }
  }

  /**
   * Pull latest data from cloud if available
   */
  public async pullFromCloud(): Promise<Partial<DatabaseState> | null> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateSyncInfo({ status: 'OFFLINE', isCloudConnected: false, errorMessage: null });
      return null;
    }

    try {
      this.updateSyncInfo({ status: 'SYNCING', errorMessage: null });
      const db = this.getFirestoreDb();
      const workspaceRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);

      // Wrap getDoc with a reasonable timeout so it doesn't hang or throw uncaught offline error
      const fetchPromise = getDoc(workspaceRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('offline')), 6000)
      );

      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

      if (!snapshot.exists()) {
        this.updateSyncInfo({ status: 'IDLE', isCloudConnected: true, errorMessage: null });
        return null;
      }

      const data = snapshot.data();
      const remoteState: Partial<DatabaseState> = {
        accounts: data.accounts,
        journalEntries: data.journalEntries,
        clients: data.clients,
        treasuryTransactions: data.treasuryTransactions,
        taxDeclarations: data.taxDeclarations,
        invoices: data.invoices,
        certificates: data.certificates,
        feasibilityStudies: data.feasibilityStudies,
        creditSimulations: data.creditSimulations,
        fixedAssets: data.fixedAssets,
        officeProfile: data.officeProfile,
        users: data.users,
        taxMandates: data.taxMandates,
        exchangeRates: data.exchangeRates,
        fiscalPeriodLocks: data.fiscalPeriodLocks,
      };

      this.updateSyncInfo({
        status: 'SYNCED',
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
        lastSyncedBy: data.updatedBy || 'السحابة',
        errorMessage: null,
        isCloudConnected: true,
      });

      return remoteState;
    } catch (err: any) {
      const isOfflineErr =
        err?.code === 'unavailable' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('network') ||
        err?.message?.includes('Backend didn\'t respond');

      if (isOfflineErr) {
        this.updateSyncInfo({
          status: 'OFFLINE',
          isCloudConnected: false,
          errorMessage: null, // Graceful offline state, no error banner
        });
      } else {
        console.warn('Cloud pull notice:', err?.message || err);
        this.updateSyncInfo({
          status: 'IDLE',
          errorMessage: null,
        });
      }
      return null;
    }
  }

  /**
   * Debounced Auto Sync on local change
   */
  public queueAutoSync(localState: DatabaseState, updatedByUserName?: string) {
    if (this.autoSyncDebounceTimer) {
      clearTimeout(this.autoSyncDebounceTimer);
    }
    this.updateSyncInfo({ pendingChanges: true });

    this.autoSyncDebounceTimer = setTimeout(() => {
      this.pushToCloud(localState, updatedByUserName);
    }, 2000); // sync to cloud 2 seconds after last keystroke/save
  }
}

export const CloudSync = new CloudSyncManager();
