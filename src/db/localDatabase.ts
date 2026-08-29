import * as XLSX from 'xlsx';
import {
  Account,
  JournalEntry,
  ClientArchiveRecord,
  ClientProcedureTask,
  ClientDocumentFolder,
  ClientDocument,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  TaxMandateTask,
  ProfessionalCertificate,
  Invoice,
  FeasibilityStudy,
  CreditModelSimulation,
  OfficeProfile,
  AuditRecord,
  SystemUser,
  UserRole,
  UserPreferences,
  BrandColor,
  ThemeMode,
  FixedAsset,
  DepreciationHistoryRecord,
} from '../types';
import { DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import {
  DEFAULT_OFFICE_PROFILE,
  DEFAULT_CLIENT_FOLDERS,
  SAMPLE_CLIENTS,
  SAMPLE_JOURNAL_ENTRIES,
  SAMPLE_TREASURY_TRANSACTIONS,
  SAMPLE_TAX_DECLARATIONS,
  SAMPLE_TAX_MANDATES,
  SAMPLE_CERTIFICATES,
  SAMPLE_INVOICES,
  SAMPLE_FEASIBILITY_STUDY,
  SAMPLE_CREDIT_SIMULATION,
  SAMPLE_SYSTEM_USERS,
  SAMPLE_FIXED_ASSETS,
} from '../data/sampleData';

const STORAGE_KEYS = {
  ACCOUNTS: 'egy_acc_accounts_v1',
  JOURNAL: 'egy_acc_journal_v1',
  CLIENTS: 'egy_acc_clients_v1',
  TREASURY: 'egy_acc_treasury_v1',
  TAXES: 'egy_acc_taxes_v1',
  TAX_MANDATES: 'egy_acc_tax_mandates_v1',
  CERTIFICATES: 'egy_acc_certificates_v1',
  INVOICES: 'egy_acc_invoices_v1',
  FEASIBILITY: 'egy_acc_feasibility_v1',
  CREDIT_SIM: 'egy_acc_credit_sim_v1',
  OFFICE_PROFILE: 'egy_acc_office_profile_v1',
  AUDIT_LOGS: 'egy_acc_audit_logs_v1',
  SYSTEM_USERS: 'egy_acc_system_users_v1',
  CURRENT_USER_ID: 'egy_acc_current_user_id_v1',
  USER_PREFERENCES: 'egy_acc_user_preferences_v1',
  FIXED_ASSETS: 'egy_acc_fixed_assets_v1',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'light',
  brandColor: 'blue',
  compactView: false,
};

export interface DatabaseState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  clients: ClientArchiveRecord[];
  treasuryTransactions: OfficeTreasuryTransaction[];
  taxDeclarations: TaxDeclarationRecord[];
  taxMandates: TaxMandateTask[];
  certificates: ProfessionalCertificate[];
  invoices: Invoice[];
  feasibilityStudies: FeasibilityStudy[];
  creditSimulations: CreditModelSimulation[];
  fixedAssets: FixedAsset[];
  officeProfile: OfficeProfile;
  auditLogs: AuditRecord[];
  users: SystemUser[];
  currentUserId: string;
  preferences: UserPreferences;
}

export class LocalDatabase {
  private state: DatabaseState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    try {
      const accountsJson = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      const journalJson = localStorage.getItem(STORAGE_KEYS.JOURNAL);
      const clientsJson = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      const treasuryJson = localStorage.getItem(STORAGE_KEYS.TREASURY);
      const taxesJson = localStorage.getItem(STORAGE_KEYS.TAXES);
      const mandatesJson = localStorage.getItem(STORAGE_KEYS.TAX_MANDATES);
      const certificatesJson = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
      const invoicesJson = localStorage.getItem(STORAGE_KEYS.INVOICES);
      const feasibilityJson = localStorage.getItem(STORAGE_KEYS.FEASIBILITY);
      const creditSimJson = localStorage.getItem(STORAGE_KEYS.CREDIT_SIM);
      const fixedAssetsJson = localStorage.getItem(STORAGE_KEYS.FIXED_ASSETS);
      const officeProfileJson = localStorage.getItem(STORAGE_KEYS.OFFICE_PROFILE);
      const auditLogsJson = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const usersJson = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS);
      const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user-admin';
      const preferencesJson = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);

      let loadedClients: ClientArchiveRecord[] = clientsJson ? JSON.parse(clientsJson) : SAMPLE_CLIENTS;
      // Ensure each client has default folders if missing
      loadedClients = loadedClients.map((cl) => {
        if (!cl.folders || cl.folders.length === 0) {
          cl.folders = DEFAULT_CLIENT_FOLDERS.map((f, idx) => ({
            ...f,
            id: `fld-${cl.id}-${idx + 1}`,
            clientId: cl.id,
          }));
        }
        return cl;
      });

      let loadedOfficeProfile: OfficeProfile = officeProfileJson ? JSON.parse(officeProfileJson) : DEFAULT_OFFICE_PROFILE;
      if (loadedOfficeProfile && loadedOfficeProfile.licenseNumber && loadedOfficeProfile.licenseNumber.includes('18492')) {
        loadedOfficeProfile = {
          ...loadedOfficeProfile,
          licenseNumber: loadedOfficeProfile.licenseNumber.replace('18492', '43122'),
        };
      }

      return {
        accounts: accountsJson ? JSON.parse(accountsJson) : DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
        journalEntries: journalJson ? JSON.parse(journalJson) : SAMPLE_JOURNAL_ENTRIES,
        clients: loadedClients,
        treasuryTransactions: treasuryJson ? JSON.parse(treasuryJson) : SAMPLE_TREASURY_TRANSACTIONS,
        taxDeclarations: taxesJson ? JSON.parse(taxesJson) : SAMPLE_TAX_DECLARATIONS,
        taxMandates: mandatesJson ? JSON.parse(mandatesJson) : SAMPLE_TAX_MANDATES,
        certificates: certificatesJson ? JSON.parse(certificatesJson) : SAMPLE_CERTIFICATES,
        invoices: invoicesJson ? JSON.parse(invoicesJson) : SAMPLE_INVOICES,
        feasibilityStudies: feasibilityJson ? JSON.parse(feasibilityJson) : [SAMPLE_FEASIBILITY_STUDY],
        creditSimulations: creditSimJson ? JSON.parse(creditSimJson) : [SAMPLE_CREDIT_SIMULATION],
        fixedAssets: fixedAssetsJson ? JSON.parse(fixedAssetsJson) : SAMPLE_FIXED_ASSETS,
        officeProfile: loadedOfficeProfile,
        users: usersJson ? JSON.parse(usersJson) : SAMPLE_SYSTEM_USERS,
        currentUserId: currentUserId,
        preferences: preferencesJson ? JSON.parse(preferencesJson) : DEFAULT_USER_PREFERENCES,
        auditLogs: auditLogsJson ? JSON.parse(auditLogsJson) : [
          {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            user: 'محمد جميل مرعي',
            action: 'CREATE',
            details: 'تهيئة قاعدة البيانات المحلية بالنظام المحاسبي المصري الموحد',
          },
        ],
      };
    } catch (e) {
      console.error('Error loading database state:', e);
      return {
        accounts: DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
        journalEntries: SAMPLE_JOURNAL_ENTRIES,
        clients: SAMPLE_CLIENTS,
        treasuryTransactions: SAMPLE_TREASURY_TRANSACTIONS,
        taxDeclarations: SAMPLE_TAX_DECLARATIONS,
        taxMandates: SAMPLE_TAX_MANDATES,
        certificates: SAMPLE_CERTIFICATES,
        invoices: SAMPLE_INVOICES,
        feasibilityStudies: [SAMPLE_FEASIBILITY_STUDY],
        creditSimulations: [SAMPLE_CREDIT_SIMULATION],
        fixedAssets: SAMPLE_FIXED_ASSETS,
        officeProfile: DEFAULT_OFFICE_PROFILE,
        users: SAMPLE_SYSTEM_USERS,
        currentUserId: 'user-admin',
        preferences: DEFAULT_USER_PREFERENCES,
        auditLogs: [],
      };
    }
  }

  private pendingSaveTimeout: any = null;
  private dirtyKeys: Set<string> = new Set();

  public saveState(specificKey?: keyof typeof STORAGE_KEYS) {
    if (specificKey) {
      this.dirtyKeys.add(STORAGE_KEYS[specificKey]);
    } else {
      Object.values(STORAGE_KEYS).forEach((k) => this.dirtyKeys.add(k));
    }

    // Immediately notify UI for 0ms zero-lag reactivity
    this.notify();

    // Debounce actual localStorage serialization to keep main thread blazing fast
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout);
    }

    this.pendingSaveTimeout = setTimeout(() => {
      this.flushDirtyStorage();
    }, 50);
  }

  public flushDirtyStorage() {
    try {
      if (this.dirtyKeys.has(STORAGE_KEYS.ACCOUNTS)) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(this.state.accounts));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.JOURNAL)) {
        localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(this.state.journalEntries));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.CLIENTS)) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.state.clients));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.TREASURY)) {
        localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(this.state.treasuryTransactions));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.TAXES)) {
        localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify(this.state.taxDeclarations));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.TAX_MANDATES)) {
        localStorage.setItem(STORAGE_KEYS.TAX_MANDATES, JSON.stringify(this.state.taxMandates));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.CERTIFICATES)) {
        localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(this.state.certificates));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.INVOICES)) {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.state.invoices));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.FEASIBILITY)) {
        localStorage.setItem(STORAGE_KEYS.FEASIBILITY, JSON.stringify(this.state.feasibilityStudies));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.CREDIT_SIM)) {
        localStorage.setItem(STORAGE_KEYS.CREDIT_SIM, JSON.stringify(this.state.creditSimulations));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.OFFICE_PROFILE)) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_PROFILE, JSON.stringify(this.state.officeProfile));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.AUDIT_LOGS)) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.state.auditLogs));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.SYSTEM_USERS)) {
        localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(this.state.users));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.CURRENT_USER_ID)) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, this.state.currentUserId);
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.USER_PREFERENCES)) {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.state.preferences));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.FIXED_ASSETS)) {
        localStorage.setItem(STORAGE_KEYS.FIXED_ASSETS, JSON.stringify(this.state.fixedAssets));
      }
      this.dirtyKeys.clear();
    } catch (e: any) {
      // Handle storage quota exceeded gracefully
      console.warn('Storage write warning (handling high-volume data safely):', e);
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        // Trim audit logs to save space
        if (this.state.auditLogs.length > 100) {
          this.state.auditLogs = this.state.auditLogs.slice(0, 100);
          try {
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.state.auditLogs));
          } catch {}
        }
      }
    }
  }

  // --- Preferences & Theme ---
  public getPreferences(): UserPreferences {
    return this.state.preferences || DEFAULT_USER_PREFERENCES;
  }

  public updatePreferences(updates: Partial<UserPreferences>) {
    this.state.preferences = {
      ...(this.state.preferences || DEFAULT_USER_PREFERENCES),
      ...updates,
    };
    this.saveState();
  }

  public setThemeMode(mode: ThemeMode) {
    this.updatePreferences({ themeMode: mode });
  }

  public setBrandColor(color: BrandColor) {
    this.updatePreferences({ brandColor: color });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public logAudit(action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'UNPOST', details: string, previousValue?: any, newValue?: any) {
    const record: AuditRecord = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
      action,
      details,
      previousValue,
      newValue,
    };
    this.state.auditLogs.unshift(record);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // --- Accounts CRUD ---
  public addAccount(account: Omit<Account, 'id'>): Account {
    const newAccount: Account = {
      ...account,
      id: `acc-${Date.now()}`,
    };
    this.state.accounts.push(newAccount);
    this.logAudit('CREATE', `إضافة حساب جديد بالدليل: [${newAccount.code}] ${newAccount.name}`);
    this.saveState();
    return newAccount;
  }

  public updateAccount(id: string, updates: Partial<Account>): Account | null {
    const index = this.state.accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const old = this.state.accounts[index];
    this.state.accounts[index] = { ...old, ...updates };
    this.logAudit('UPDATE', `تعديل الحساب: [${old.code}] ${old.name}`, old, this.state.accounts[index]);
    this.saveState();
    return this.state.accounts[index];
  }

  public deleteAccount(id: string): boolean {
    const index = this.state.accounts.findIndex((a) => a.id === id);
    if (index === -1) return false;
    const acc = this.state.accounts[index];
    if (acc.isSystem) return false;
    this.state.accounts.splice(index, 1);
    this.logAudit('DELETE', `حذف الحساب: [${acc.code}] ${acc.name}`);
    this.saveState();
    return true;
  }

  // --- Journal Entries CRUD ---
  public addJournalEntry(entry: Omit<JournalEntry, 'id' | 'serialNumber' | 'entryNumber' | 'createdAt' | 'updatedAt' | 'auditTrail'>): JournalEntry {
    const nextNum = (this.state.journalEntries.length > 0
      ? Math.max(...this.state.journalEntries.map((e) => e.entryNumber || 0))
      : 0) + 1;
    const serial = `JV-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const newEntry: JournalEntry = {
      ...entry,
      id: `je-${Date.now()}`,
      entryNumber: nextNum,
      serialNumber: serial,
      qrPayload: `EGY-ACC-MGM|${serial}|${entry.date}|${entry.totalDebit.toFixed(2)}|${entry.isPosted ? 'POSTED' : 'DRAFT'}`,
      auditTrail: [
        {
          timestamp: now.replace('T', ' ').substring(0, 19),
          user: this.state.officeProfile.auditorName,
          action: 'CREATE',
          details: `إنشاء القيد رقم ${serial}: ${entry.description}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.state.journalEntries.push(newEntry);
    this.logAudit('CREATE', `تسجيل قيد اليومية رقم ${serial} بقيمة ${entry.totalDebit} ج.م`);
    this.saveState();
    return newEntry;
  }

  public updateJournalEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | null {
    const index = this.state.journalEntries.findIndex((e) => e.id === id);
    if (index === -1) return null;
    const old = this.state.journalEntries[index];
    const now = new Date().toISOString();

    const audit: AuditRecord = {
      timestamp: now.replace('T', ' ').substring(0, 19),
      user: this.state.officeProfile.auditorName,
      action: 'UPDATE',
      details: `تعديل القيد رقم ${old.serialNumber}`,
    };

    this.state.journalEntries[index] = {
      ...old,
      ...updates,
      updatedAt: now,
      auditTrail: [audit, ...(old.auditTrail || [])],
    };

    this.logAudit('UPDATE', `تعديل قيد اليومية رقم ${old.serialNumber}`, old, this.state.journalEntries[index]);
    this.saveState();
    return this.state.journalEntries[index];
  }

  public deleteJournalEntry(id: string): boolean {
    const index = this.state.journalEntries.findIndex((e) => e.id === id);
    if (index === -1) return false;
    const entry = this.state.journalEntries[index];
    this.state.journalEntries.splice(index, 1);
    this.logAudit('DELETE', `حذف قيد اليومية رقم ${entry.serialNumber}`);
    this.saveState();
    return true;
  }

  public togglePostEntry(id: string): JournalEntry | null {
    const entry = this.state.journalEntries.find((e) => e.id === id);
    if (!entry) return null;
    const newStatus = !entry.isPosted;
    entry.isPosted = newStatus;
    entry.updatedAt = new Date().toISOString();
    const action = newStatus ? 'POST' : 'UNPOST';
    const audit: AuditRecord = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: this.state.officeProfile.auditorName,
      action,
      details: newStatus ? `ترحيل القيد للأستاذ العام` : `إلغاء ترحيل القيد`,
    };
    entry.auditTrail.unshift(audit);
    this.logAudit(action, `${newStatus ? 'ترحيل' : 'إلغاء ترحيل'} القيد رقم ${entry.serialNumber}`);
    this.saveState();
    return entry;
  }

  // --- Clients CRUD ---
  public addClient(client: Omit<ClientArchiveRecord, 'id' | 'createdAt' | 'updatedAt'>): ClientArchiveRecord {
    const now = new Date().toISOString();
    const newClient: ClientArchiveRecord = {
      ...client,
      id: `cl-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.clients.push(newClient);
    this.logAudit('CREATE', `إضافة ملف عميل جديد بالأرشيف: ${newClient.name} (${newClient.clientCode})`);
    this.saveState();
    return newClient;
  }

  public updateClient(id: string, updates: Partial<ClientArchiveRecord>): ClientArchiveRecord | null {
    const index = this.state.clients.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const old = this.state.clients[index];
    this.state.clients[index] = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE', `تعديل بيانات ملف العميل: ${old.name}`);
    this.saveState();
    return this.state.clients[index];
  }

  public deleteClient(id: string): boolean {
    const index = this.state.clients.findIndex((c) => c.id === id);
    if (index === -1) return false;
    const cl = this.state.clients[index];
    this.state.clients.splice(index, 1);
    this.logAudit('DELETE', `حذف ملف العميل: ${cl.name}`);
    this.saveState();
    return true;
  }

  // --- Client Procedures & Treasury Integration ---
  public addClientProcedure(
    clientId: string,
    procedure: Omit<ClientProcedureTask, 'id' | 'procedureCode' | 'createdAt' | 'updatedAt' | 'clientId' | 'clientName'>,
    options?: {
      recordFeeInTreasury?: boolean;
      feePaymentMethod?: OfficeTreasuryTransaction['paymentMethod'];
      recordGovFeeInTreasury?: boolean;
      govFeePaymentMethod?: OfficeTreasuryTransaction['paymentMethod'];
    }
  ): ClientProcedureTask | null {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return null;

    if (!client.procedures) {
      client.procedures = [];
    }

    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    const procedureCount = (client.procedures?.length || 0) + 1;
    const procedureCode = `PRC-${currentYear}-${String(procedureCount).padStart(3, '0')}`;
    const procedureId = `prc-${Date.now()}`;

    const feeVouchers: string[] = [];
    const expenseVouchers: string[] = [];

    // 1. Record Fee Collection in Treasury if requested
    if (options?.recordFeeInTreasury && procedure.collectedFees > 0) {
      const feeTx = this.addTreasuryTransaction({
        date: procedure.startDate || now.slice(0, 10),
        type: 'INCOME_FEES',
        category: `أتعاب ${procedure.title}`,
        amount: Number(procedure.collectedFees),
        clientId: client.id,
        clientName: client.name,
        procedureId: procedureId,
        procedureTitle: procedure.title,
        paymentMethod: options.feePaymentMethod || 'CASH',
        description: `تحصيل أتعاب إجراء: [${procedure.title}] للعميل: ${client.name}`,
        recordedBy: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
      });
      feeVouchers.push(feeTx.voucherNumber);
    }

    // 2. Record Government / Regulatory Fee Expense in Treasury if requested
    if (options?.recordGovFeeInTreasury && procedure.governmentFees > 0) {
      const expTx = this.addTreasuryTransaction({
        date: procedure.startDate || now.slice(0, 10),
        type: 'EXPENSE_CLIENT_GOV_FEE',
        category: `رسوم ومصروفات حكومية لحساب العميل`,
        amount: Number(procedure.governmentFees),
        clientId: client.id,
        clientName: client.name,
        procedureId: procedureId,
        procedureTitle: procedure.title,
        paymentMethod: options.govFeePaymentMethod || 'CASH',
        description: `سداد رسوم ومصروفات حكومية لإجراء: [${procedure.title}] لحساب العميل: ${client.name}`,
        recordedBy: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
      });
      expenseVouchers.push(expTx.voucherNumber);
    }

    const newProcedure: ClientProcedureTask = {
      ...procedure,
      id: procedureId,
      procedureCode,
      clientId: client.id,
      clientName: client.name,
      agreedFees: Number(procedure.agreedFees) || 0,
      collectedFees: Number(procedure.collectedFees) || 0,
      governmentFees: Number(procedure.governmentFees) || 0,
      feeTreasuryVouchers: feeVouchers,
      expenseTreasuryVouchers: expenseVouchers,
      progressPercent: procedure.progressPercent ?? (procedure.status === 'COMPLETED' ? 100 : 0),
      createdAt: now,
      updatedAt: now,
    };

    client.procedures.unshift(newProcedure);
    client.updatedAt = now;

    // Also sync to legacy tasksHistory for backward compatibility
    if (!client.tasksHistory) client.tasksHistory = [];
    client.tasksHistory.unshift({
      id: procedureId,
      date: newProcedure.startDate,
      taskDescription: newProcedure.title,
      status: newProcedure.status === 'COMPLETED' ? 'COMPLETED' : newProcedure.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
      fees: newProcedure.agreedFees,
      treasuryTxId: feeVouchers[0],
    });

    this.logAudit(
      'CREATE',
      `إضافة إجراء جديد لملف العميل [${client.name}]: ${newProcedure.title} (كود: ${newProcedure.procedureCode}) مع قيد مالي بالخزنة`
    );
    this.saveState();
    return newProcedure;
  }

  public updateClientProcedure(
    clientId: string,
    procedureId: string,
    updates: Partial<ClientProcedureTask>,
    additionalTreasury?: {
      addFeeCollected?: number;
      feePaymentMethod?: OfficeTreasuryTransaction['paymentMethod'];
      addGovFeePaid?: number;
      govFeePaymentMethod?: OfficeTreasuryTransaction['paymentMethod'];
    }
  ): ClientProcedureTask | null {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.procedures) return null;

    const procIndex = client.procedures.findIndex((p) => p.id === procedureId);
    if (procIndex === -1) return null;

    const oldProc = client.procedures[procIndex];
    const now = new Date().toISOString();
    const updatedFeeVouchers = [...(oldProc.feeTreasuryVouchers || [])];
    const updatedExpVouchers = [...(oldProc.expenseTreasuryVouchers || [])];

    let newCollectedFees = oldProc.collectedFees;
    let newGovFees = oldProc.governmentFees;

    // Handle additional fee collected
    if (additionalTreasury?.addFeeCollected && additionalTreasury.addFeeCollected > 0) {
      const amount = Number(additionalTreasury.addFeeCollected);
      newCollectedFees += amount;
      const feeTx = this.addTreasuryTransaction({
        date: now.slice(0, 10),
        type: 'INCOME_FEES',
        category: `تحصيل أتعاب: ${oldProc.title}`,
        amount,
        clientId: client.id,
        clientName: client.name,
        procedureId: oldProc.id,
        procedureTitle: oldProc.title,
        paymentMethod: additionalTreasury.feePaymentMethod || 'CASH',
        description: `تحصيل دفعة أتعاب إضافية لإجراء: [${oldProc.title}] للعميل: ${client.name}`,
        recordedBy: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
      });
      updatedFeeVouchers.push(feeTx.voucherNumber);
    }

    // Handle additional government fee paid
    if (additionalTreasury?.addGovFeePaid && additionalTreasury.addGovFeePaid > 0) {
      const amount = Number(additionalTreasury.addGovFeePaid);
      newGovFees += amount;
      const expTx = this.addTreasuryTransaction({
        date: now.slice(0, 10),
        type: 'EXPENSE_CLIENT_GOV_FEE',
        category: `رسوم ومصروفات حكومية لحساب العميل`,
        amount,
        clientId: client.id,
        clientName: client.name,
        procedureId: oldProc.id,
        procedureTitle: oldProc.title,
        paymentMethod: additionalTreasury.govFeePaymentMethod || 'CASH',
        description: `سداد رسوم ومصروفات حكومية إضافية لإجراء: [${oldProc.title}] لحساب العميل: ${client.name}`,
        recordedBy: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
      });
      updatedExpVouchers.push(expTx.voucherNumber);
    }

    const updatedProc: ClientProcedureTask = {
      ...oldProc,
      ...updates,
      collectedFees: newCollectedFees,
      governmentFees: newGovFees,
      feeTreasuryVouchers: updatedFeeVouchers,
      expenseTreasuryVouchers: updatedExpVouchers,
      updatedAt: now,
    };

    if (updates.status === 'COMPLETED' && !updatedProc.completedDate) {
      updatedProc.completedDate = now.slice(0, 10);
      updatedProc.progressPercent = 100;
    }

    client.procedures[procIndex] = updatedProc;
    client.updatedAt = now;

    // Sync legacy tasksHistory
    if (client.tasksHistory) {
      const taskHist = client.tasksHistory.find((t) => t.id === procedureId);
      if (taskHist) {
        if (updates.title) taskHist.taskDescription = updates.title;
        if (updates.status) {
          taskHist.status = updates.status === 'COMPLETED' ? 'COMPLETED' : updates.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
        }
      }
    }

    this.logAudit(
      'UPDATE',
      `تحديث حالة وبيانات الإجراء [${updatedProc.title}] لملف العميل: ${client.name}`
    );
    this.saveState();
    return updatedProc;
  }

  public deleteClientProcedure(clientId: string, procedureId: string): boolean {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.procedures) return false;

    const procIndex = client.procedures.findIndex((p) => p.id === procedureId);
    if (procIndex === -1) return false;

    const deleted = client.procedures[procIndex];
    client.procedures.splice(procIndex, 1);
    client.updatedAt = new Date().toISOString();

    if (client.tasksHistory) {
      client.tasksHistory = client.tasksHistory.filter((t) => t.id !== procedureId);
    }

    this.logAudit('DELETE', `حذف الإجراء [${deleted.title}] من سجل ملف العميل: ${client.name}`);
    this.saveState();
    return true;
  }

  public getClientTreasurySummary(clientId: string) {
    const client = this.state.clients.find((c) => c.id === clientId);
    const procedures = client?.procedures || [];
    const transactions = this.state.treasuryTransactions.filter((tx) => tx.clientId === clientId);

    const totalAgreedFees = procedures.reduce((acc, p) => acc + (Number(p.agreedFees) || 0), 0);
    const totalCollectedFees = transactions
      .filter((tx) => tx.type === 'INCOME_FEES')
      .reduce((acc, tx) => acc + tx.amount, 0);
    const totalGovFeesPaid = transactions
      .filter((tx) => tx.type === 'EXPENSE_CLIENT_GOV_FEE')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const remainingFeesDue = Math.max(0, totalAgreedFees - totalCollectedFees);

    return {
      totalAgreedFees,
      totalCollectedFees,
      totalGovFeesPaid,
      remainingFeesDue,
      transactions,
      procedures,
    };
  }

  // --- Office Treasury CRUD ---
  public addTreasuryTransaction(tx: Omit<OfficeTreasuryTransaction, 'id' | 'voucherNumber' | 'createdAt'>): OfficeTreasuryTransaction {
    const count = this.state.treasuryTransactions.length + 1;
    const voucher = `TR-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newTx: OfficeTreasuryTransaction = {
      ...tx,
      id: `tr-${Date.now()}`,
      voucherNumber: voucher,
      qrPayload: `OFFICE-TR|${voucher}|${tx.date}|${tx.amount.toFixed(2)}|${tx.type}`,
      createdAt: new Date().toISOString(),
    };
    this.state.treasuryTransactions.push(newTx);
    this.logAudit('CREATE', `تسجيل حركة بخزنة المكتب: [${voucher}] ${tx.category} بقيمة ${tx.amount} ج.م`);
    this.saveState();
    return newTx;
  }

  public deleteTreasuryTransaction(id: string): boolean {
    const index = this.state.treasuryTransactions.findIndex((t) => t.id === id);
    if (index === -1) return false;
    const tx = this.state.treasuryTransactions[index];
    this.state.treasuryTransactions.splice(index, 1);
    this.logAudit('DELETE', `حذف سند حركة الخزنة رقم ${tx.voucherNumber}`);
    this.saveState();
    return true;
  }

  // --- Tax Declarations CRUD ---
  public addTaxDeclaration(tax: Omit<TaxDeclarationRecord, 'id' | 'createdAt' | 'updatedAt'>): TaxDeclarationRecord {
    const now = new Date().toISOString();
    const newTax: TaxDeclarationRecord = {
      ...tax,
      id: `tax-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.taxDeclarations.push(newTax);
    this.logAudit('CREATE', `إدراج إقرار ضريبي: ${tax.declarationType} - ${tax.period} للعميل: ${tax.clientName}`);
    this.saveState();
    return newTax;
  }

  public updateTaxDeclaration(id: string, updates: Partial<TaxDeclarationRecord>): TaxDeclarationRecord | null {
    const index = this.state.taxDeclarations.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const old = this.state.taxDeclarations[index];
    this.state.taxDeclarations[index] = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE', `تحديث حالة الإقرار الضريبي: ${old.period}`);
    this.saveState();
    return this.state.taxDeclarations[index];
  }

  // --- Client Document Folders & Categorization ---
  public addClientFolder(clientId: string, folder: Omit<ClientDocumentFolder, 'id' | 'clientId' | 'createdAt'>): ClientDocumentFolder | null {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return null;
    if (!client.folders) client.folders = [];

    const newFolder: ClientDocumentFolder = {
      ...folder,
      id: `fld-${clientId}-${Date.now()}`,
      clientId,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    client.folders.push(newFolder);
    client.updatedAt = new Date().toISOString();
    this.logAudit('CREATE', `إنشاء مجلد مستندات جديد [${folder.name}] لملف العميل: ${client.name}`);
    this.saveState();
    return newFolder;
  }

  public updateClientFolder(clientId: string, folderId: string, updates: Partial<ClientDocumentFolder>): boolean {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.folders) return false;
    const folder = client.folders.find((f) => f.id === folderId);
    if (!folder) return false;

    const oldName = folder.name;
    Object.assign(folder, updates);
    // If folder name changed, update existing documents folderName
    if (updates.name && updates.name !== oldName && client.documents) {
      client.documents.forEach((doc) => {
        if (doc.folderId === folderId) {
          doc.folderName = updates.name;
        }
      });
    }
    client.updatedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  public deleteClientFolder(clientId: string, folderId: string): boolean {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.folders) return false;
    const folderIndex = client.folders.findIndex((f) => f.id === folderId);
    if (folderIndex === -1) return false;

    const deletedFolder = client.folders[folderIndex];
    // Move docs in this folder to default folder or unassign folderId
    if (client.documents) {
      client.documents.forEach((doc) => {
        if (doc.folderId === folderId) {
          doc.folderId = undefined;
          doc.folderName = undefined;
        }
      });
    }
    client.folders.splice(folderIndex, 1);
    client.updatedAt = new Date().toISOString();
    this.logAudit('DELETE', `حذف مجلد المستندات [${deletedFolder.name}] لملف العميل: ${client.name}`);
    this.saveState();
    return true;
  }

  public addClientDocument(clientId: string, doc: Omit<ClientDocument, 'id' | 'clientId' | 'uploadedAt'>): ClientDocument | null {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return null;
    if (!client.documents) client.documents = [];

    const newDoc: ClientDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      clientId,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    client.documents.push(newDoc);
    client.updatedAt = new Date().toISOString();
    this.logAudit('CREATE', `أرشفة مستند جديد [${doc.title}] في مجلد [${doc.folderName || 'العام'}] لملف العميل: ${client.name}`);
    this.saveState();
    return newDoc;
  }

  public deleteClientDocument(clientId: string, documentId: string): boolean {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.documents) return false;
    const docIndex = client.documents.findIndex((d) => d.id === documentId);
    if (docIndex === -1) return false;

    const doc = client.documents[docIndex];
    client.documents.splice(docIndex, 1);
    client.updatedAt = new Date().toISOString();
    this.logAudit('DELETE', `حذف مستند [${doc.title}] من أرشيف العميل: ${client.name}`);
    this.saveState();
    return true;
  }

  public moveClientDocument(clientId: string, documentId: string, targetFolderId: string, targetFolderName: string): boolean {
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client || !client.documents) return false;
    const doc = client.documents.find((d) => d.id === documentId);
    if (!doc) return false;

    doc.folderId = targetFolderId;
    doc.folderName = targetFolderName;
    client.updatedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  // --- Tax Mandates & Task Scheduler CRUD ---
  public addTaxMandate(mandate: Omit<TaxMandateTask, 'id' | 'mandateCode' | 'createdAt' | 'updatedAt'>): TaxMandateTask {
    const now = new Date().toISOString();
    const count = this.state.taxMandates.length + 1;
    const code = `TAX-MAND-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const newTask: TaxMandateTask = {
      ...mandate,
      id: `mand-${Date.now()}`,
      mandateCode: code,
      createdAt: now,
      updatedAt: now,
    };
    this.state.taxMandates.push(newTask);
    this.logAudit('CREATE', `جدولة تكليف ضريبي جديد: [${code}] ${mandate.mandateTitle} للعميل: ${mandate.clientName}`);
    this.saveState();
    return newTask;
  }

  public updateTaxMandate(id: string, updates: Partial<TaxMandateTask>): TaxMandateTask | null {
    const index = this.state.taxMandates.findIndex((m) => m.id === id);
    if (index === -1) return null;
    const old = this.state.taxMandates[index];
    const updated: TaxMandateTask = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.taxMandates[index] = updated;
    this.logAudit('UPDATE', `تحديث حالة التكليف الضريبي [${old.mandateCode}] إلى (${updated.status})`);
    this.saveState();
    return updated;
  }

  public deleteTaxMandate(id: string): boolean {
    const index = this.state.taxMandates.findIndex((m) => m.id === id);
    if (index === -1) return false;
    const deleted = this.state.taxMandates[index];
    this.state.taxMandates.splice(index, 1);
    this.logAudit('DELETE', `حذف التكليف الضريبي رقم: [${deleted.mandateCode}] ${deleted.mandateTitle}`);
    this.saveState();
    return true;
  }

  public batchGenerateMandates(taxType: TaxMandateTask['taxType'], periodName: string, deadlineDate: string, taxYear: number): number {
    const primaryClients = this.state.clients.filter((c) => c.clientType === 'PRIMARY');
    let addedCount = 0;
    const now = new Date().toISOString();

    const taxTypeTitles: Record<TaxMandateTask['taxType'], string> = {
      VAT_10: 'إقرار ضريبة القيمة المضافة (نموذج 10)',
      INCOME_27_CORP: 'إقرار ضريبة الدخل السنوي للشركات (نموذج 27)',
      INCOME_28_INDIV: 'إقرار ضريبة الدخل للأشخاص الطبيعيين (نموذج 28)',
      PAYROLL_4: 'نموذج 4 ضريبة كسب العمل والمرتبات',
      ANNUAL_PAYROLL: 'التسوية السنوية لضريبة كسب العمل',
      WHT_41: 'نموذج 41 خصم وتحصيل تحت حساب الضريبة',
      STAMP_TAX: 'إقرار ضريبة الدمغة النسبية والنوعية',
      REAL_ESTATE_TAX: 'إقرار الضريبة العقارية على المنشآت',
      TAX_AUDIT_SESSION: 'جلسة فحص ضريبي أو لجنة طعن بمأمورية الضرائب',
      OTHER: 'تكليف والتزام ضريبي دوري',
    };

    primaryClients.forEach((client) => {
      // Check if already exists
      const exists = this.state.taxMandates.some(
        (m) => m.clientId === client.id && m.taxType === taxType && m.periodName === periodName && m.taxYear === taxYear
      );
      if (!exists) {
        const count = this.state.taxMandates.length + 1;
        const code = `TAX-MAND-${taxYear}-${String(count).padStart(3, '0')}`;
        const title = `${taxTypeTitles[taxType] || 'تكليف ضريبي'} - ${periodName}`;
        this.state.taxMandates.push({
          id: `mand-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          mandateCode: code,
          clientId: client.id,
          clientName: client.name,
          mandateTitle: title,
          taxType,
          periodName,
          taxYear,
          deadlineDate,
          reminderDaysBefore: 7,
          assignedTo: this.state.officeProfile.auditorName || 'محمد جميل مرعي',
          status: 'NOT_STARTED',
          priority: taxType.includes('INCOME') ? 'CRITICAL' : 'HIGH',
          createdAt: now,
          updatedAt: now,
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.logAudit('CREATE', `توليد جماعي لـ (${addedCount}) تكليف ضريبي دوري (${periodName}) لعملاء المكتب الأساسيين`);
      this.saveState();
    }
    return addedCount;
  }

  // --- Multi-User Access Control (RBAC) ---
  public getCurrentUser(): SystemUser {
    const user = this.state.users.find((u) => u.id === this.state.currentUserId);
    return user || this.state.users[0] || SAMPLE_SYSTEM_USERS[0];
  }

  public switchCurrentUser(userId: string): SystemUser | null {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return null;
    this.state.currentUserId = user.id;
    this.logAudit('UPDATE', `تبديل المستخدم الحالي إلى: [${user.name}] بصلاحية (${user.roleTitleArabic})`);
    this.saveState();
    return user;
  }

  public addUser(user: Omit<SystemUser, 'id' | 'createdAt'>): SystemUser {
    const newUser: SystemUser = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.state.users.push(newUser);
    this.logAudit('CREATE', `إضافة مستخدم جديد للنظام: [${user.name}] بدور (${user.roleTitleArabic})`);
    this.saveState();
    return newUser;
  }

  public updateUser(userId: string, updates: Partial<SystemUser>): boolean {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return false;
    Object.assign(user, updates);
    this.logAudit('UPDATE', `تعديل صلاحيات وبيانات المستخدم: [${user.name}]`);
    this.saveState();
    return true;
  }

  public deleteUser(userId: string): boolean {
    if (this.state.users.length <= 1) return false; // Prevent deleting all users
    const index = this.state.users.findIndex((u) => u.id === userId);
    if (index === -1) return false;
    const deleted = this.state.users[index];
    this.state.users.splice(index, 1);
    if (this.state.currentUserId === userId) {
      this.state.currentUserId = this.state.users[0].id;
    }
    this.logAudit('DELETE', `حذف المستخدم: [${deleted.name}] من النظام`);
    this.saveState();
    return true;
  }

  // --- Professional Certificates CRUD ---
  public addCertificate(cert: Omit<ProfessionalCertificate, 'id' | 'certificateNumber' | 'createdAt'>): ProfessionalCertificate {
    const count = this.state.certificates.length + 1;
    const certNum = `CERT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newCert: ProfessionalCertificate = {
      ...cert,
      id: `cert-${Date.now()}`,
      certificateNumber: certNum,
      createdAt: new Date().toISOString(),
    };
    this.state.certificates.push(newCert);
    this.logAudit('CREATE', `إصدار وتوثيق شهادة مهنية رقم ${certNum} للعميل: ${cert.clientName}`);
    this.saveState();
    return newCert;
  }

  public updateCertificate(id: string, updates: Partial<ProfessionalCertificate>): ProfessionalCertificate | null {
    const index = this.state.certificates.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const old = this.state.certificates[index];
    this.state.certificates[index] = {
      ...old,
      ...updates,
    };
    this.logAudit('UPDATE', `تعديل الشهادة المهنية رقم ${old.certificateNumber}`);
    this.saveState();
    return this.state.certificates[index];
  }

  public deleteCertificate(id: string): boolean {
    const index = this.state.certificates.findIndex((c) => c.id === id);
    if (index === -1) return false;
    const cert = this.state.certificates[index];
    this.state.certificates.splice(index, 1);
    this.logAudit('DELETE', `حذف الشهادة المهنية رقم ${cert.certificateNumber}`);
    this.saveState();
    return true;
  }

  // --- Invoices CRUD ---
  public addInvoice(inv: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>): Invoice {
    const count = this.state.invoices.length + 1;
    const invNum = `INV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newInv: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      createdAt: new Date().toISOString(),
    };
    this.state.invoices.push(newInv);
    this.logAudit('CREATE', `إصدار فاتورة رقم ${invNum} بمبلغ ${inv.grandTotal} ج.م`);
    this.saveState();
    return newInv;
  }

  public batchAddInvoices(invoicesList: Omit<Invoice, 'id' | 'createdAt'>[]): Invoice[] {
    const now = new Date().toISOString();
    const created: Invoice[] = [];

    invoicesList.forEach((inv, idx) => {
      const invNum = inv.invoiceNumber || `INV-${new Date().getFullYear()}-${String(this.state.invoices.length + idx + 1).padStart(4, '0')}`;
      const newInv: Invoice = {
        ...inv,
        id: `inv-${Date.now()}-${idx}`,
        invoiceNumber: invNum,
        createdAt: now,
      };
      this.state.invoices.push(newInv);
      created.push(newInv);
    });

    this.logAudit('CREATE', `استيراد وإدراج جماعي لـ (${created.length}) فاتورة وإيصال إلكتروني عبر ملف الإكسل`);
    this.saveState();
    return created;
  }

  public updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
    const index = this.state.invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return null;
    const old = this.state.invoices[index];
    this.state.invoices[index] = {
      ...old,
      ...updates,
    };
    this.logAudit('UPDATE', `تعديل بيانات الفاتورة رقم ${old.invoiceNumber}`);
    this.saveState();
    return this.state.invoices[index];
  }

  public deleteInvoice(id: string): boolean {
    const index = this.state.invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return false;
    const inv = this.state.invoices[index];
    this.state.invoices.splice(index, 1);
    this.logAudit('DELETE', `حذف الفاتورة رقم ${inv.invoiceNumber}`);
    this.saveState();
    return true;
  }

  // --- Feasibility Studies CRUD ---
  public addFeasibilityStudy(study: Omit<FeasibilityStudy, 'id' | 'studyCode' | 'createdAt'>): FeasibilityStudy {
    const count = this.state.feasibilityStudies.length + 1;
    const code = `FS-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const newStudy: FeasibilityStudy = {
      ...study,
      id: `fs-${Date.now()}`,
      studyCode: code,
      createdAt: new Date().toISOString(),
    };
    this.state.feasibilityStudies.push(newStudy);
    this.logAudit('CREATE', `إعداد دراسة جدوى اقتصادية رقم ${code}: ${study.projectName}`);
    this.saveState();
    return newStudy;
  }

  // --- Credit Simulations CRUD ---
  public addCreditSimulation(sim: Omit<CreditModelSimulation, 'id' | 'createdAt'>): CreditModelSimulation {
    const newSim: CreditModelSimulation = {
      ...sim,
      id: `sim-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.state.creditSimulations.unshift(newSim);
    this.logAudit('CREATE', `توليد محاكاة قوائم ائتمانية لمبيعات ${sim.targetSales} ج.م`);
    this.saveState();
    return newSim;
  }

  // --- Office Profile Update ---
  public updateOfficeProfile(profile: Partial<OfficeProfile>) {
    this.state.officeProfile = {
      ...this.state.officeProfile,
      ...profile,
    };
    this.logAudit('UPDATE', 'تحديث بيانات وترويسة مكتب المحاسب القانوني');
    this.saveState();
  }

  // --- Reset to Demo Data ---
  public resetToDemoData() {
    this.state = {
      accounts: DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
      journalEntries: SAMPLE_JOURNAL_ENTRIES,
      clients: SAMPLE_CLIENTS,
      treasuryTransactions: SAMPLE_TREASURY_TRANSACTIONS,
      taxDeclarations: SAMPLE_TAX_DECLARATIONS,
      taxMandates: SAMPLE_TAX_MANDATES,
      certificates: SAMPLE_CERTIFICATES,
      invoices: SAMPLE_INVOICES,
      feasibilityStudies: [SAMPLE_FEASIBILITY_STUDY],
      creditSimulations: [SAMPLE_CREDIT_SIMULATION],
      fixedAssets: SAMPLE_FIXED_ASSETS,
      users: SAMPLE_SYSTEM_USERS,
      currentUserId: 'user-admin',
      preferences: DEFAULT_USER_PREFERENCES,
      officeProfile: DEFAULT_OFFICE_PROFILE,
      auditLogs: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          user: 'محمد جميل مرعي',
          action: 'CREATE',
          details: 'إعادة تعيين البيانات وتحميل النموذج التجريبي المصري المتكامل',
        },
      ],
    };
    this.saveState();
  }

  // --- Complete Database Purge / Factory Reset with Passcode (Mgacc120) ---
  public purgeAllDatabaseData(passcode: string): { success: boolean; message: string } {
    if (passcode.trim() !== 'Mgacc120') {
      return {
        success: false,
        message: 'الرقم السري لتفريغ البيانات غير صحيح! يرجى إدخال الرقم السري المعتمد (Mgacc120).',
      };
    }

    // Reset all accounts balances to 0
    const cleanAccounts: Account[] = DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS.map((acc) => ({
      ...acc,
      openingBalance: 0,
      currentBalance: 0,
      debitTotal: 0,
      creditTotal: 0,
    }));

    this.state = {
      accounts: cleanAccounts,
      journalEntries: [],
      clients: [],
      treasuryTransactions: [],
      taxDeclarations: [],
      taxMandates: [],
      certificates: [],
      invoices: [],
      feasibilityStudies: [],
      creditSimulations: [],
      fixedAssets: [],
      users: SAMPLE_SYSTEM_USERS,
      currentUserId: 'user-admin',
      preferences: this.state.preferences || DEFAULT_USER_PREFERENCES,
      officeProfile: this.state.officeProfile || DEFAULT_OFFICE_PROFILE,
      auditLogs: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          user: this.getCurrentUser().name,
          action: 'DELETE',
          details: 'تفريغ وتصفير شامل لكافة بيانات وسجلات المنظومة بالرقم السري المعتمد (Mgacc120)',
        },
      ],
    };

    this.saveState();
    return {
      success: true,
      message: 'تم تفريغ ومسح كافة بيانات وسجلات المنظومة بنجاح والبدء بملف محاسبي نظيف تماماً!',
    };
  }

  // --- Full Backup JSON Export & Import ---
  public exportFullBackupJson(): string {
    let securityMeta = null;
    try {
      // Lazy load signature from SecurityAuthService
      const { SecurityAuthService } = require('../services/securityAuth');
      securityMeta = SecurityAuthService.generateBackupLicenseSignature();
    } catch {
      // Fallback
    }

    return JSON.stringify(
      {
        backupVersion: '2.0-EGY-CPA',
        exportedAt: new Date().toISOString(),
        auditor: this.state.officeProfile.auditorName,
        securityMetadata: securityMeta,
        data: this.state,
      },
      null,
      2
    );
  }

  public importFullBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const dataToImport = parsed.data || parsed;

      // Automatically validate & license this machine if backup has a valid license signature
      if (parsed.securityMetadata) {
        try {
          const { SecurityAuthService } = require('../services/securityAuth');
          SecurityAuthService.processImportedBackupLicense(parsed);
        } catch (e) {
          console.error('License import error:', e);
        }
      }

      if (dataToImport.accounts && dataToImport.journalEntries) {
        this.state = {
          accounts: dataToImport.accounts || DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
          journalEntries: dataToImport.journalEntries || [],
          clients: dataToImport.clients || [],
          treasuryTransactions: dataToImport.treasuryTransactions || [],
          taxDeclarations: dataToImport.taxDeclarations || [],
          taxMandates: dataToImport.taxMandates || SAMPLE_TAX_MANDATES,
          certificates: dataToImport.certificates || [],
          invoices: dataToImport.invoices || [],
          feasibilityStudies: dataToImport.feasibilityStudies || [],
          creditSimulations: dataToImport.creditSimulations || [],
          fixedAssets: dataToImport.fixedAssets || SAMPLE_FIXED_ASSETS,
          users: dataToImport.users || SAMPLE_SYSTEM_USERS,
          currentUserId: dataToImport.currentUserId || 'user-admin',
          preferences: dataToImport.preferences || DEFAULT_USER_PREFERENCES,
          officeProfile: dataToImport.officeProfile || DEFAULT_OFFICE_PROFILE,
          auditLogs: [
            {
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              user: this.getCurrentUser()?.name || 'محمد جميل مرعي',
              action: 'UPDATE',
              details: 'استعادة قاعدة البيانات بالكامل مع مصادقة ترخيص الأجهزة الرقمي المدمج',
            },
            ...(dataToImport.auditLogs || []),
          ],
        };
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  // --- Excel Exports ---
  public exportTableToExcel(tableName: 'ACCOUNTS' | 'JOURNAL' | 'CLIENTS' | 'TREASURY' | 'TAXES' | 'CERTIFICATES' | 'INVOICES' | 'FIXED_ASSETS') {
    const wb = XLSX.utils.book_new();

    if (tableName === 'ACCOUNTS') {
      const rows = this.state.accounts.map((a) => ({
        'كود الحساب': a.code,
        'اسم الحساب': a.name,
        'التصنيف': a.category,
        'طبيعة الحساب': a.nature === 'DEBIT' ? 'مدين' : 'دائن',
        'المستوى': a.level,
        'رصيد افتتاحي مدين': a.openingBalanceDebit,
        'رصيد افتتاحي دائن': a.openingBalanceCredit,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'شجرة الحسابات');
      XLSX.writeFile(wb, `شجرة_الحسابات_المصرية_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'JOURNAL') {
      const rows: any[] = [];
      for (const entry of this.state.journalEntries) {
        for (const line of entry.lines) {
          rows.push({
            'رقم القيد': entry.serialNumber,
            'التاريخ': entry.date,
            'البيان الرئيسي': entry.description,
            'كود الحساب': line.accountCode,
            'اسم الحساب': line.accountName,
            'مدين': line.debit,
            'دائن': line.credit,
            'شرح السطر': line.description || '',
            'الحالة': entry.isPosted ? 'مرحل' : 'مسودة',
          });
        }
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'قيود اليومية');
      XLSX.writeFile(wb, `قيود_اليومية_العامة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'CLIENTS') {
      const rows = this.state.clients.map((c) => ({
        'كود العميل': c.clientCode,
        'اسم المنشأة / العميل': c.name,
        'النوع': c.clientType === 'PRIMARY' ? 'أساسي' : 'عابر',
        'السجل التجاري': c.commercialRegistrationNo,
        'البطاقة الضريبية': c.taxCardNo,
        'مأمورية الضرائب': c.taxOffice,
        'ملف الدخل': c.incomeTaxFileNo,
        'تسجيل القيمة المضافة': c.vatRegistrationNo,
        'التأمين الاجتماعي': c.socialInsuranceNo,
        'رأس المال': c.capital,
        'الهاتف': c.phone,
        'النشاط': c.activity,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'أرشيف العملاء');
      XLSX.writeFile(wb, `أرشيف_العملاء_والشركات_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'TREASURY') {
      const rows = this.state.treasuryTransactions.map((t) => ({
        'رقم السند': t.voucherNumber,
        'التاريخ': t.date,
        'النوع': t.type === 'INCOME_FEES' ? 'قبض أتعاب' : 'مصروفات مكتب',
        'البند / الفئة': t.category,
        'المبلغ': t.amount,
        'العميل المرتبط': t.clientName || 'بدون',
        'طريقة السداد': t.paymentMethod,
        'البيان': t.description,
        'المسؤول': t.recordedBy,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'خزنة المكتب');
      XLSX.writeFile(wb, `حركات_خزنة_المكتب_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'TAXES') {
      const rows = this.state.taxDeclarations.map((tx) => ({
        'نوع الإقرار': tx.declarationType,
        'الفترة': tx.period,
        'السنة': tx.taxYear,
        'اسم الممول / العميل': tx.clientName,
        'تاريخ الاستحقاق': tx.dueDate,
        'حالة التقديم': tx.status,
        'المبيعات الخاضعة': tx.salesTaxableAmount || 0,
        'المشتريات الخاضعة': tx.purchasesTaxableAmount || 0,
        'الضريبة المستحقة': tx.netVatPayable || tx.netTaxPayable || 0,
        'رقم الإيصال': tx.receiptNumber || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'الإقرارات الضريبية');
      XLSX.writeFile(wb, `سجل_الإقرارات_الضريبية_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'INVOICES') {
      const rows = this.state.invoices.map((inv) => ({
        'رقم الفاتورة': inv.invoiceNumber,
        'التاريخ': inv.date,
        'نوع المستند': inv.isReceipt ? 'إيصال إلكتروني B2C' : inv.invoiceType === 'SALES' ? 'فاتورة مبيعات B2B' : 'فاتورة مشتريات',
        'اسم الطرف / العميل': inv.partnerName,
        'الرقم الضريبي': inv.partnerTaxNo || '',
        'إجمالي البضاعة': inv.subtotal,
        'الخصم': inv.totalDiscount,
        'ضريبة القيمة المضافة 14%': inv.totalVat,
        'الخصم والتحصيل 1%': inv.totalWht,
        'صافي الفاتورة': inv.grandTotal,
        'المعرف الضريبي ETA UUID': inv.etaUuid || '',
        'حالة المنظومة': inv.etaStatus || 'مسودة',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الفواتير والإيصالات');
      XLSX.writeFile(wb, `سجل_الفواتير_الإلكترونية_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (tableName === 'FIXED_ASSETS') {
      const rows = (this.state.fixedAssets || []).map((ast) => ({
        'كود الأصل': ast.assetCode,
        'اسم الأصل': ast.name,
        'الفئة': ast.category,
        'تاريخ الشراء': ast.purchaseDate,
        'تكلفة الاقتناء': ast.acquisitionCost,
        'القيمة التخريدية': ast.scrapValue,
        'العمر الإنتاجي (سنوات)': ast.usefulLifeYears,
        'نسبة الإهلاك المحاسبي %': ast.accountingDepreciationRate,
        'نسبة الإهلاك الضريبي %': ast.taxDepreciationRate,
        'مجمع الإهلاك الحالي': ast.currentAccumulatedDepreciation,
        'صافي القيمة الدفترية': ast.currentBookValue,
        'الموقع': ast.location || '',
        'المسؤول / العهدة': ast.custodian || '',
        'مركز التكلفة': ast.costCenter || '',
        'الحالة': ast.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الأصول الثابتة');
      XLSX.writeFile(wb, `سجل_الأصول_الثابتة_والإهلاك_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  }

  // ==========================================
  // FIXED ASSETS & DEPRECIATION METHODS (معيار 10 وقانون 91)
  // ==========================================
  public getFixedAssets(): FixedAsset[] {
    return this.state.fixedAssets || [];
  }

  public getFixedAssetById(id: string): FixedAsset | undefined {
    return (this.state.fixedAssets || []).find((a) => a.id === id);
  }

  public addFixedAsset(assetData: Omit<FixedAsset, 'id' | 'createdAt' | 'updatedAt' | 'currentAccumulatedDepreciation' | 'currentBookValue' | 'status'> & { initialAccumulatedDepreciation?: number }): FixedAsset {
    const id = `ast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const initAccum = assetData.initialAccumulatedDepreciation || 0;
    const currentBookValue = Math.max(0, assetData.acquisitionCost - initAccum);

    const newAsset: FixedAsset = {
      ...assetData,
      id,
      currentAccumulatedDepreciation: initAccum,
      currentBookValue,
      status: currentBookValue <= (assetData.scrapValue || 0) && initAccum > 0 ? 'FULLY_DEPRECIATED' : 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    if (!this.state.fixedAssets) {
      this.state.fixedAssets = [];
    }

    this.state.fixedAssets.unshift(newAsset);
    this.logAudit('CREATE', `إضافة أصل ثابت جديد للسجل: [${newAsset.name}] كود: (${newAsset.assetCode}) بتكلفة اقتناء: ${newAsset.acquisitionCost.toLocaleString()} ج.م`);
    this.saveState('FIXED_ASSETS');
    return newAsset;
  }

  public updateFixedAsset(id: string, updates: Partial<FixedAsset>): FixedAsset | null {
    if (!this.state.fixedAssets) return null;
    const index = this.state.fixedAssets.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const oldAsset = this.state.fixedAssets[index];
    const updatedAsset: FixedAsset = {
      ...oldAsset,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate book value
    updatedAsset.currentBookValue = Math.max(0, updatedAsset.acquisitionCost - updatedAsset.currentAccumulatedDepreciation);

    this.state.fixedAssets[index] = updatedAsset;
    this.logAudit('UPDATE', `تعديل بيانات الأصل الثابت: [${updatedAsset.name}] (كود: ${updatedAsset.assetCode})`);
    this.saveState('FIXED_ASSETS');
    return updatedAsset;
  }

  public deleteFixedAsset(id: string): boolean {
    if (!this.state.fixedAssets) return false;
    const asset = this.state.fixedAssets.find((a) => a.id === id);
    if (!asset) return false;

    this.state.fixedAssets = this.state.fixedAssets.filter((a) => a.id !== id);
    this.logAudit('DELETE', `حذف الأصل الثابت من السجل: [${asset.name}] (كود: ${asset.assetCode})`);
    this.saveState('FIXED_ASSETS');
    return true;
  }

  public disposeFixedAsset(id: string, disposalData: { disposalDate: string; disposalAmount: number; disposalReason: string }): FixedAsset | null {
    if (!this.state.fixedAssets) return null;
    const asset = this.state.fixedAssets.find((a) => a.id === id);
    if (!asset) return null;

    const capitalGainLoss = disposalData.disposalAmount - asset.currentBookValue;

    const updated = this.updateFixedAsset(id, {
      status: 'DISPOSED',
      disposalDate: disposalData.disposalDate,
      disposalAmount: disposalData.disposalAmount,
      disposalReason: disposalData.disposalReason,
      capitalGainLoss,
    });

    this.logAudit(
      'UPDATE',
      `استبعاد / بيع أصل ثابت: [${asset.name}] بمبلغ ${disposalData.disposalAmount.toLocaleString()} ج.م (${capitalGainLoss >= 0 ? 'أرباح رأسمالية' : 'خسائر رأسمالية'}: ${Math.abs(capitalGainLoss).toLocaleString()} ج.م)`
    );

    return updated;
  }

  public postDepreciationJournalEntry(params: {
    year: number;
    month?: number;
    periodLabel: string;
    totalDepreciationAmount: number;
    depreciatedAssetIds: string[];
    expenseAccountId?: string;
    accumAccountId?: string;
  }): JournalEntry {
    const entryDate = params.month
      ? `${params.year}-${String(params.month).padStart(2, '0')}-28`
      : `${params.year}-12-31`;

    const expenseAcc =
      this.state.accounts.find((a) => a.id === params.expenseAccountId || a.code === '334' || a.name.includes('إهلاك')) || {
        id: '334',
        code: '334',
        name: 'مصروف إهلاك أصول ثابتة',
      };
    const accumAcc =
      this.state.accounts.find((a) => a.id === params.accumAccountId || a.code === '231' || a.name.includes('مجمع إهلاك')) || {
        id: '231',
        code: '231',
        name: 'مجمع إهلاك أصول ثابتة',
      };

    const journalEntry = this.addJournalEntry({
      date: entryDate,
      description: `إثبات قيد إهلاك الأصول الثابتة للفترة (${params.periodLabel}) - معيار المحاسبة المصري رقم (10)`,
      entryType: 'ADJUSTING',
      referenceNumber: `DEP-SCHED-${params.year}`,
      totalDebit: params.totalDepreciationAmount,
      totalCredit: params.totalDepreciationAmount,
      isPosted: true,
      lines: [
        {
          id: `line-${Date.now()}-1`,
          accountId: expenseAcc.id,
          accountCode: expenseAcc.code,
          accountName: expenseAcc.name,
          debit: params.totalDepreciationAmount,
          credit: 0,
          description: `مصروف إهلاك أصول ثابتة عن فترة ${params.periodLabel}`,
        },
        {
          id: `line-${Date.now()}-2`,
          accountId: accumAcc.id,
          accountCode: accumAcc.code,
          accountName: accumAcc.name,
          debit: 0,
          credit: params.totalDepreciationAmount,
          description: `إلى حساب مجمع إهلاك الأصول الثابتة عن فترة ${params.periodLabel}`,
        },
      ],
    });

    // Update accumulated depreciation on assets
    if (this.state.fixedAssets) {
      this.state.fixedAssets = this.state.fixedAssets.map((asset) => {
        if (params.depreciatedAssetIds.includes(asset.id)) {
          // Calculate this asset's single period share
          const depreciableAmount = Math.max(0, asset.acquisitionCost - (asset.scrapValue || 0));
          const annualRate = (asset.accountingDepreciationRate || 10) / 100;
          const factor = params.month ? 1 / 12 : 1;
          const assetPeriodDep = Math.min(
            asset.currentBookValue - (asset.scrapValue || 0),
            Math.round(depreciableAmount * annualRate * factor)
          );

          if (assetPeriodDep > 0) {
            const newAccum = asset.currentAccumulatedDepreciation + assetPeriodDep;
            const newBook = Math.max(asset.scrapValue || 0, asset.acquisitionCost - newAccum);
            return {
              ...asset,
              currentAccumulatedDepreciation: newAccum,
              currentBookValue: newBook,
              status: newBook <= (asset.scrapValue || 0) ? 'FULLY_DEPRECIATED' : asset.status,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return asset;
      });
      this.saveState('FIXED_ASSETS');
    }

    this.logAudit(
      'POST',
      `توليد وترحيل قيد إهلاك الأصول الثابتة آلياً (${journalEntry.serialNumber}) بمبلغ ${params.totalDepreciationAmount.toLocaleString()} ج.م لدفتر اليومية`
    );

    return journalEntry;
  }
}

export const db = new LocalDatabase();
