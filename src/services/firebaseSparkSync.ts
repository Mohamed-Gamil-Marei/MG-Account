import { db } from '../lib/firebase';
import { 
  collection, doc, getDoc, setDoc, getDocs, onSnapshot, query, where 
} from 'firebase/firestore';

export const FIREBASE_COLLECTIONS = [
  "clients",
  "accounts",
  "journalEntries",
  "treasury",
  "taxDeclarations",
  "taxAudits",
  "invoices",
  "certificates",
  "auditLogs",
  "users",
  "issuedDocuments"
];

export interface SyncStatusInfo {
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  unsentChangesCount: number;
  lastSyncedAt?: string;
  lastSyncedBy?: string;
}

export class FirebaseSparkSync {
  private static listeners: ((info: SyncStatusInfo) => void)[] = [];
  private static unsentQueue: { colName: string; id: string; data: any; timestamp: string }[] = [];
  private static currentStatus: SyncStatusInfo = {
    status: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
    unsentChangesCount: 0
  };

  public static subscribe(listener: (info: SyncStatusInfo) => void) {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public static updateStatus(partial: Partial<SyncStatusInfo>) {
    this.currentStatus = { ...this.currentStatus, ...partial };
    this.listeners.forEach(l => l(this.currentStatus));
  }

  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateStatus({ status: 'ONLINE' });
        this.flushUnsentQueue();
      });
      window.addEventListener('offline', () => {
        this.updateStatus({ status: 'OFFLINE' });
      });
    }
  }

  public static async saveRecord(
    colName: string, 
    id: string, 
    data: any, 
    currentUser: any,
    conflictResolver?: (serverData: any, localData: any) => Promise<'KEEP_LOCAL' | 'KEEP_SERVER'>
  ): Promise<{ success: boolean; error?: string }> {
    const timestamp = new Date().toISOString();
    const userName = currentUser?.name || currentUser?.email || 'مستخدم النظام';
    const clientId = data.clientId || data.clientCode || 'GENERAL';
    const fiscalYear = data.fiscalYear || data.year || 2026;
    const recordId = String(id || data.id || crypto.randomUUID());
    const newVersion = (data.version || 0) + 1;

    const payload = {
      ...data,
      id: recordId,
      clientId,
      fiscalYear,
      updatedAt: timestamp,
      updatedBy: userName,
      version: newVersion,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.unsentQueue.push({ colName, id: recordId, data: payload, timestamp });
      this.updateStatus({ unsentChangesCount: this.unsentQueue.length, status: 'OFFLINE' });
      return { success: true };
    }

    try {
      this.updateStatus({ status: 'SYNCING' });
      const docRef = doc(db, colName, recordId);
      const existingSnap = await getDoc(docRef);

      if (existingSnap.exists()) {
        const serverData = existingSnap.data();
        const serverVersion = serverData.version || 1;
        const serverUpdatedAt = serverData.updatedAt || '';

        if (serverVersion > newVersion || (serverUpdatedAt && data.updatedAt && new Date(serverUpdatedAt) > new Date(data.updatedAt))) {
          if (conflictResolver) {
            const decision = await conflictResolver(serverData, payload);
            if (decision === 'KEEP_SERVER') {
              this.updateStatus({ status: 'ONLINE' });
              return { success: false, error: 'تم اختيار الاحتفاظ بنسخة السيرفر.' };
            }
          } else {
            this.updateStatus({ status: 'ERROR' });
            return { 
              success: false, 
              error: `تعارض التعديل: تم تحديث هذا السجل في السيرفر بواسطة (${serverData.updatedBy || 'مستخدم آخر'}).` 
            };
          }
        }
      }

      await setDoc(docRef, payload, { merge: true });
      this.updateStatus({ 
        status: 'ONLINE', 
        lastSyncedAt: timestamp, 
        lastSyncedBy: userName 
      });
      return { success: true };
    } catch (err: any) {
      this.updateStatus({ status: 'ERROR' });
      this.unsentQueue.push({ colName, id: recordId, data: payload, timestamp });
      this.updateStatus({ unsentChangesCount: this.unsentQueue.length });
      return { success: false, error: err.message };
    }
  }

  public static async flushUnsentQueue() {
    if (this.unsentQueue.length === 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    this.updateStatus({ status: 'SYNCING' });
    const queue = [...this.unsentQueue];
    this.unsentQueue = [];

    for (const item of queue) {
      try {
        const docRef = doc(db, item.colName, item.id);
        await setDoc(docRef, item.data, { merge: true });
      } catch (e) {
        this.unsentQueue.push(item);
      }
    }

    this.updateStatus({ 
      status: 'ONLINE', 
      unsentChangesCount: this.unsentQueue.length,
      lastSyncedAt: new Date().toISOString()
    });
  }

  public static setupRealtimeListeners(
    currentUserRole: string,
    callbacks: {
      onClientsUpdate: (data: any[]) => void;
      onAccountsUpdate: (data: any[]) => void;
      onTreasuryUpdate: (data: any[]) => void;
      onTaxDeclarationsUpdate: (data: any[]) => void;
      onTaxAuditsUpdate: (data: any[]) => void;
      onInvoicesUpdate: (data: any[]) => void;
      onCertificatesUpdate: (data: any[]) => void;
      onAuditLogsUpdate: (data: any[]) => void;
      onUsersUpdate: (data: any[]) => void;
    }
  ): (() => void)[] {
    const unsubscribers: (() => void)[] = [];
    const isSecretary = currentUserRole === 'SECRETARY';

    try {
      const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onClientsUpdate(data);
      }, (err) => console.warn('Clients snapshot error:', err));
      unsubscribers.push(unsubClients);
    } catch (e) {}

    try {
      const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onAccountsUpdate(data);
      }, (err) => console.warn('Accounts snapshot error:', err));
      unsubscribers.push(unsubAccounts);
    } catch (e) {}

    if (!isSecretary) {
      try {
        const unsubTreasury = onSnapshot(collection(db, 'treasury'), (snap) => {
          const data = snap.docs.map(d => d.data());
          callbacks.onTreasuryUpdate(data);
        }, (err) => console.warn('Treasury snapshot error:', err));
        unsubscribers.push(unsubTreasury);
      } catch (e) {}
    }

    try {
      const unsubTaxDec = onSnapshot(collection(db, 'taxDeclarations'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onTaxDeclarationsUpdate(data);
      }, (err) => console.warn('TaxDeclarations snapshot error:', err));
      unsubscribers.push(unsubTaxDec);
    } catch (e) {}

    try {
      const unsubTaxAud = onSnapshot(collection(db, 'taxAudits'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onTaxAuditsUpdate(data);
      }, (err) => console.warn('TaxAudits snapshot error:', err));
      unsubscribers.push(unsubTaxAud);
    } catch (e) {}

    try {
      const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onInvoicesUpdate(data);
      }, (err) => console.warn('Invoices snapshot error:', err));
      unsubscribers.push(unsubInvoices);
    } catch (e) {}

    try {
      const unsubCerts = onSnapshot(collection(db, 'certificates'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onCertificatesUpdate(data);
      }, (err) => console.warn('Certificates snapshot error:', err));
      unsubscribers.push(unsubCerts);
    } catch (e) {}

    try {
      const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onAuditLogsUpdate(data);
      }, (err) => console.warn('AuditLogs snapshot error:', err));
      unsubscribers.push(unsubLogs);
    } catch (e) {}

    try {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const data = snap.docs.map(d => d.data());
        callbacks.onUsersUpdate(data);
      }, (err) => console.warn('Users snapshot error:', err));
      unsubscribers.push(unsubUsers);
    } catch (e) {}

    return unsubscribers;
  }

  public static async loadClientJournalEntries(clientId: string, fiscalYear: number): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'journalEntries'),
        where('clientId', '==', clientId),
        where('fiscalYear', '==', fiscalYear)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (e) {
      return [];
    }
  }

  public static async migrateLocalStorageToFirebase(state: any, currentUser: any): Promise<{ success: boolean; message: string; summary: string }> {
    try {
      let clientsCount = 0;
      let entriesCount = 0;
      let totalMigrated = 0;
      const timestamp = new Date().toISOString();
      const userName = currentUser?.name || currentUser?.email || "مدير النظام";

      const mapping: Record<string, string> = {
        clients: 'clients',
        accounts: 'accounts',
        journalEntries: 'journalEntries',
        treasuryTransactions: 'treasury',
        taxDeclarations: 'taxDeclarations',
        taxAudits: 'taxAudits',
        invoices: 'invoices',
        certificates: 'certificates',
        auditLogs: 'auditLogs',
        users: 'users',
      };

      for (const [stateKey, colName] of Object.entries(mapping)) {
        const items = state[stateKey] || [];
        for (const item of items) {
          const id = String(item.id || item.code || crypto.randomUUID());
          const clientId = item.clientId || item.clientCode || 'GENERAL';
          const fiscalYear = item.fiscalYear || item.year || 2026;

          const docRef = doc(db, colName, id);
          const payload = {
            ...item,
            id,
            clientId,
            fiscalYear,
            updatedAt: timestamp,
            updatedBy: userName,
            version: (item.version || 0) + 1,
          };
          await setDoc(docRef, payload, { merge: true });
          totalMigrated++;
          if (colName === 'clients') clientsCount++;
          if (colName === 'journalEntries') entriesCount++;
        }
      }

      const summary = `تم بنجاح ترحيل بيانات هذا المتصفح لـ Firebase تشمل: ${clientsCount} عميل، و${entriesCount} قيد يومية (إجمالي ${totalMigrated} سجل).`;
      return { success: true, message: "تم ترحيل البيانات بنجاح.", summary };
    } catch (err: any) {
      return { success: false, message: `فشل الترحيل: ${err.message}`, summary: "" };
    }
  }
}
