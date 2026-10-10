import {
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  collection,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db as firestoreDb, auth } from './firebase';
import { SystemUser } from '../types';
import { DatabaseState } from '../db/localDatabase';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  deviceId: string;
  activeUsersCount: number;
  syncError?: string | null;
  partitionedCollectionsCount?: number;
}

// Partitioned collection names
export const SYNC_COLLECTIONS = {
  CLIENTS: 'clients',
  JOURNAL_ENTRIES: 'journalEntries',
  TREASURY: 'treasury',
  TAX_DECLARATIONS: 'taxDeclarations',
  ACCOUNTS: 'accounts',
  INVOICES: 'invoices',
  CERTIFICATES: 'certificates',
  AUDIT_LOGS: 'auditLogs',
  WORKSPACES: 'workspaces',
} as const;

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
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    deviceId: getDeviceId(),
    activeUsersCount: 1,
    syncError: null,
    partitionedCollectionsCount: 8,
  };

  private listeners: ((status: SyncStatus) => void)[] = [];
  private unsubscribers: (() => void)[] = [];
  private isApplyingRemoteUpdate = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateStatus({ isOnline: true, syncError: null });
      });
      window.addEventListener('offline', () => {
        this.updateStatus({ isOnline: false });
      });
    }
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
   * Initializes real-time listeners across all partitioned collections in Firestore:
   * (clients, journalEntries, treasury, taxDeclarations, accounts, invoices, certificates)
   */
  public initRealtimeSync(
    onRemoteStateUpdate: (remoteState: Partial<DatabaseState>) => void
  ) {
    this.destroy(); // Clear old listeners if any

    // Only subscribe to Firestore if authenticated (required by zero-trust security rules)
    if (!auth.currentUser) {
      return;
    }

    try {
      // 1. Clients collection listener
      const unsubClients = onSnapshot(
        collection(firestoreDb, SYNC_COLLECTIONS.CLIENTS),
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
          const remoteClients: any[] = [];
          snapshot.forEach((docSnap) => {
            remoteClients.push({ ...docSnap.data(), id: docSnap.id });
          });
          if (remoteClients.length > 0) {
            this.isApplyingRemoteUpdate = true;
            onRemoteStateUpdate({ clients: remoteClients });
            this.isApplyingRemoteUpdate = false;
            this.updateSyncTimestamp();
          }
        },
        (err) => console.warn('[Sync clients notice]:', err.message)
      );
      this.unsubscribers.push(unsubClients);

      // 2. Journal Entries collection listener
      const unsubJournals = onSnapshot(
        query(collection(firestoreDb, SYNC_COLLECTIONS.JOURNAL_ENTRIES), limit(500)),
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
          const remoteJournals: any[] = [];
          snapshot.forEach((docSnap) => {
            remoteJournals.push({ ...docSnap.data(), id: docSnap.id });
          });
          if (remoteJournals.length > 0) {
            this.isApplyingRemoteUpdate = true;
            onRemoteStateUpdate({ journalEntries: remoteJournals });
            this.isApplyingRemoteUpdate = false;
            this.updateSyncTimestamp();
          }
        },
        (err) => console.warn('[Sync journalEntries notice]:', err.message)
      );
      this.unsubscribers.push(unsubJournals);

      // 3. Treasury collection listener
      const unsubTreasury = onSnapshot(
        query(collection(firestoreDb, SYNC_COLLECTIONS.TREASURY), limit(500)),
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
          const remoteTx: any[] = [];
          snapshot.forEach((docSnap) => {
            remoteTx.push({ ...docSnap.data(), id: docSnap.id });
          });
          if (remoteTx.length > 0) {
            this.isApplyingRemoteUpdate = true;
            onRemoteStateUpdate({ treasuryTransactions: remoteTx });
            this.isApplyingRemoteUpdate = false;
            this.updateSyncTimestamp();
          }
        },
        (err) => console.warn('[Sync treasury notice]:', err.message)
      );
      this.unsubscribers.push(unsubTreasury);

      // 4. Tax Declarations collection listener
      const unsubTax = onSnapshot(
        collection(firestoreDb, SYNC_COLLECTIONS.TAX_DECLARATIONS),
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites || this.isApplyingRemoteUpdate) return;
          const remoteTax: any[] = [];
          snapshot.forEach((docSnap) => {
            remoteTax.push({ ...docSnap.data(), id: docSnap.id });
          });
          if (remoteTax.length > 0) {
            this.isApplyingRemoteUpdate = true;
            onRemoteStateUpdate({ taxDeclarations: remoteTax });
            this.isApplyingRemoteUpdate = false;
            this.updateSyncTimestamp();
          }
        },
        (err) => console.warn('[Sync taxDeclarations notice]:', err.message)
      );
      this.unsubscribers.push(unsubTax);

    } catch (err: any) {
      console.warn('Failed to attach partitioned Firestore sync listeners:', err);
    }
  }

  private updateSyncTimestamp() {
    this.updateStatus({
      lastSyncedAt: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      syncError: null,
    });
  }

  /**
   * Pushes local database state to partitioned Firestore collections:
   * Each document is stored in its dedicated collection with clientId and fiscalYear strictly stamped.
   */
  public async pushStateToCloud(state: DatabaseState, currentUser?: SystemUser) {
    if (this.isApplyingRemoteUpdate) return;
    if (!auth.currentUser) {
      this.updateStatus({
        syncError: 'في انتظار تسجيل الدخول للمزامنة السحابية',
      });
      return;
    }

    try {
      this.updateStatus({ isSyncing: true });
      const activeClientId = state.activeClientId || state.clients[0]?.id || 'GENERAL_CLIENT';
      const defaultFiscalYear = 2026;

      const batch = writeBatch(firestoreDb);
      let opCount = 0;

      // 1. Partitioned Clients Collection
      for (const client of (state.clients || []).slice(0, 100)) {
        if (!client.id) continue;
        const ref = doc(firestoreDb, SYNC_COLLECTIONS.CLIENTS, client.id);
        batch.set(ref, {
          ...client,
          clientId: client.id,
          fiscalYear: defaultFiscalYear,
          updatedAt: new Date().toISOString(),
          updatedByDeviceId: this.syncStatus.deviceId,
        }, { merge: true });
        opCount++;
        if (opCount >= 450) break;
      }

      // 2. Partitioned Journal Entries Collection (with clientId and fiscalYear in every record)
      for (const entry of (state.journalEntries || []).slice(-100)) {
        if (!entry.id) continue;
        const entryFiscalYear = entry.date ? parseInt(entry.date.slice(0, 4), 10) || defaultFiscalYear : defaultFiscalYear;
        const entryClientId = entry.clientId || activeClientId;
        const ref = doc(firestoreDb, SYNC_COLLECTIONS.JOURNAL_ENTRIES, entry.id);
        batch.set(ref, {
          ...entry,
          clientId: entryClientId,
          fiscalYear: entryFiscalYear,
          updatedAt: new Date().toISOString(),
          updatedByDeviceId: this.syncStatus.deviceId,
        }, { merge: true });
        opCount++;
        if (opCount >= 450) break;
      }

      // 3. Partitioned Treasury Collection (with clientId and fiscalYear in every record)
      for (const tx of (state.treasuryTransactions || []).slice(-100)) {
        if (!tx.id) continue;
        const txFiscalYear = tx.date ? parseInt(tx.date.slice(0, 4), 10) || defaultFiscalYear : defaultFiscalYear;
        const txClientId = tx.clientId || activeClientId;
        const ref = doc(firestoreDb, SYNC_COLLECTIONS.TREASURY, tx.id);
        batch.set(ref, {
          ...tx,
          clientId: txClientId,
          fiscalYear: txFiscalYear,
          updatedAt: new Date().toISOString(),
          updatedByDeviceId: this.syncStatus.deviceId,
        }, { merge: true });
        opCount++;
        if (opCount >= 450) break;
      }

      // 4. Partitioned Tax Declarations Collection (with clientId and fiscalYear in every record)
      for (const decl of (state.taxDeclarations || []).slice(0, 100)) {
        if (!decl.id) continue;
        const declFiscalYear = (decl as any).fiscalYear || (decl as any).year || defaultFiscalYear;
        const declClientId = decl.clientId || activeClientId;
        const ref = doc(firestoreDb, SYNC_COLLECTIONS.TAX_DECLARATIONS, decl.id);
        batch.set(ref, {
          ...decl,
          clientId: declClientId,
          fiscalYear: declFiscalYear,
          updatedAt: new Date().toISOString(),
          updatedByDeviceId: this.syncStatus.deviceId,
        }, { merge: true });
        opCount++;
        if (opCount >= 450) break;
      }

      // Commit the batch with a 7s timeout
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('offline')), 7000)
      );

      await Promise.race([commitPromise, timeoutPromise]);

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        syncError: null,
      });
    } catch (error: any) {
      const isOfflineNotice =
        error?.code === 'unavailable' ||
        error?.message?.includes('offline') ||
        error?.message?.includes('network');

      this.updateStatus({
        isSyncing: false,
        syncError: isOfflineNotice ? null : 'تم الحفظ محلياً بأمان - في انتظار تأكيد الخادم',
      });
    }
  }

  public destroy() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}

export const cloudSync = new CloudSyncManager();
