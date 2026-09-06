import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  limit,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import { SystemUser } from '../types';
import { DatabaseState } from '../db/localDatabase';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  deviceId: string;
  activeUsersCount: number;
  syncError?: string | null;
}

const GLOBAL_DOCUMENT_ID = 'main_workspace_v1';
const WORKSPACE_COLLECTION = 'accounting_workspaces';

// Unique Device ID for each machine/browser session
export const getDeviceId = (): string => {
  let devId = localStorage.getItem('egy_acc_device_id');
  if (!devId) {
    devId = `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    localStorage.setItem('egy_acc_device_id', devId);
  }
  return devId;
};

class CloudSyncManager {
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    deviceId: getDeviceId(),
    activeUsersCount: 1,
    syncError: null,
  };

  private listeners: ((status: SyncStatus) => void)[] = [];
  private unsubscribeFirestore: (() => void) | null = null;
  private isApplyingRemoteUpdate = false;

  constructor() {
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true, syncError: null });
    });
    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false });
    });
  }

  public getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  public subscribe(cb: (status: SyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...partial };
    this.listeners.forEach((cb) => cb(this.getStatus()));
  }

  /**
   * Initializes real-time listener with Firestore
   */
  public initRealtimeSync(
    onRemoteStateUpdate: (remoteState: Partial<DatabaseState>) => void
  ) {
    try {
      const docRef = doc(firestoreDb, WORKSPACE_COLLECTION, GLOBAL_DOCUMENT_ID);

      // Listen for remote updates
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const source = snapshot.metadata.hasPendingWrites ? 'Local' : 'Server';

            if (source === 'Server' && data.statePayload) {
              try {
                this.isApplyingRemoteUpdate = true;
                const parsedState = typeof data.statePayload === 'string' 
                  ? JSON.parse(data.statePayload) 
                  : data.statePayload;
                
                onRemoteStateUpdate(parsedState);
                this.updateStatus({
                  lastSyncedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  syncError: null,
                });
              } catch (err) {
                console.error('Error parsing remote state payload:', err);
              } finally {
                this.isApplyingRemoteUpdate = false;
              }
            }
          }
        },
        (error) => {
          console.warn('Firestore real-time sync notice:', error.message);
          this.updateStatus({
            syncError: 'جاري العمل في وضع عدم الاتصال / جارى التحقق من الخادم',
          });
        }
      );
    } catch (err: any) {
      console.warn('Failed to attach Firestore sync listener:', err);
    }
  }

  /**
   * Push local state change to Firestore for all connected devices
   */
  public async pushStateToCloud(state: DatabaseState, currentUser?: SystemUser) {
    if (this.isApplyingRemoteUpdate) {
      return; // Prevent sync loop
    }

    try {
      this.updateStatus({ isSyncing: true });
      const docRef = doc(firestoreDb, WORKSPACE_COLLECTION, GLOBAL_DOCUMENT_ID);

      // We package the shared business state
      const payload = {
        accounts: state.accounts,
        journalEntries: state.journalEntries,
        clients: state.clients,
        treasuryTransactions: state.treasuryTransactions,
        taxDeclarations: state.taxDeclarations,
        taxMandates: state.taxMandates,
        certificates: state.certificates,
        invoices: state.invoices,
        feasibilityStudies: state.feasibilityStudies,
        creditSimulations: state.creditSimulations,
        fixedAssets: state.fixedAssets,
        officeProfile: state.officeProfile,
        auditLogs: state.auditLogs.slice(0, 300),
        users: state.users,
      };

      // Wrap setDoc with a reasonable timeout so offline conditions don't hang
      const pushPromise = setDoc(
        docRef,
        {
          statePayload: JSON.stringify(payload),
          lastUpdated: new Date().toISOString(),
          updatedByDeviceId: this.syncStatus.deviceId,
          updatedByUser: currentUser ? currentUser.name : 'النظام المركزي',
        },
        { merge: true }
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('offline')), 6000)
      );

      await Promise.race([pushPromise, timeoutPromise]);

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        syncError: null,
      });
    } catch (error: any) {
      const isOfflineNotice =
        error?.code === 'unavailable' ||
        error?.message?.includes('offline') ||
        error?.message?.includes('network');

      this.updateStatus({
        isSyncing: false,
        syncError: isOfflineNotice ? null : 'تم الحفظ محلياً بأمان - في انتظار الاتصال بالخادم',
      });
    }
  }

  public destroy() {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
  }
}

export const cloudSync = new CloudSyncManager();
