import * as XLSX from 'xlsx';
import {
  Account,
  JournalEntry,
  ClientArchiveRecord,
  ClientProcedureTask,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  ProfessionalCertificate,
  Invoice,
  FeasibilityStudy,
  CreditModelSimulation,
  OfficeProfile,
  AuditRecord,
} from '../types';
import { DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import {
  DEFAULT_OFFICE_PROFILE,
  SAMPLE_CLIENTS,
  SAMPLE_JOURNAL_ENTRIES,
  SAMPLE_TREASURY_TRANSACTIONS,
  SAMPLE_TAX_DECLARATIONS,
  SAMPLE_CERTIFICATES,
  SAMPLE_INVOICES,
  SAMPLE_FEASIBILITY_STUDY,
  SAMPLE_CREDIT_SIMULATION,
} from '../data/sampleData';

const STORAGE_KEYS = {
  ACCOUNTS: 'egy_acc_accounts_v1',
  JOURNAL: 'egy_acc_journal_v1',
  CLIENTS: 'egy_acc_clients_v1',
  TREASURY: 'egy_acc_treasury_v1',
  TAXES: 'egy_acc_taxes_v1',
  CERTIFICATES: 'egy_acc_certificates_v1',
  INVOICES: 'egy_acc_invoices_v1',
  FEASIBILITY: 'egy_acc_feasibility_v1',
  CREDIT_SIM: 'egy_acc_credit_sim_v1',
  OFFICE_PROFILE: 'egy_acc_office_profile_v1',
  AUDIT_LOGS: 'egy_acc_audit_logs_v1',
};

export interface DatabaseState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  clients: ClientArchiveRecord[];
  treasuryTransactions: OfficeTreasuryTransaction[];
  taxDeclarations: TaxDeclarationRecord[];
  certificates: ProfessionalCertificate[];
  invoices: Invoice[];
  feasibilityStudies: FeasibilityStudy[];
  creditSimulations: CreditModelSimulation[];
  officeProfile: OfficeProfile;
  auditLogs: AuditRecord[];
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
      const certificatesJson = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
      const invoicesJson = localStorage.getItem(STORAGE_KEYS.INVOICES);
      const feasibilityJson = localStorage.getItem(STORAGE_KEYS.FEASIBILITY);
      const creditSimJson = localStorage.getItem(STORAGE_KEYS.CREDIT_SIM);
      const officeProfileJson = localStorage.getItem(STORAGE_KEYS.OFFICE_PROFILE);
      const auditLogsJson = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);

      return {
        accounts: accountsJson ? JSON.parse(accountsJson) : DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
        journalEntries: journalJson ? JSON.parse(journalJson) : SAMPLE_JOURNAL_ENTRIES,
        clients: clientsJson ? JSON.parse(clientsJson) : SAMPLE_CLIENTS,
        treasuryTransactions: treasuryJson ? JSON.parse(treasuryJson) : SAMPLE_TREASURY_TRANSACTIONS,
        taxDeclarations: taxesJson ? JSON.parse(taxesJson) : SAMPLE_TAX_DECLARATIONS,
        certificates: certificatesJson ? JSON.parse(certificatesJson) : SAMPLE_CERTIFICATES,
        invoices: invoicesJson ? JSON.parse(invoicesJson) : SAMPLE_INVOICES,
        feasibilityStudies: feasibilityJson ? JSON.parse(feasibilityJson) : [SAMPLE_FEASIBILITY_STUDY],
        creditSimulations: creditSimJson ? JSON.parse(creditSimJson) : [SAMPLE_CREDIT_SIMULATION],
        officeProfile: officeProfileJson ? JSON.parse(officeProfileJson) : DEFAULT_OFFICE_PROFILE,
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
        certificates: SAMPLE_CERTIFICATES,
        invoices: SAMPLE_INVOICES,
        feasibilityStudies: [SAMPLE_FEASIBILITY_STUDY],
        creditSimulations: [SAMPLE_CREDIT_SIMULATION],
        officeProfile: DEFAULT_OFFICE_PROFILE,
        auditLogs: [],
      };
    }
  }

  public saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(this.state.accounts));
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(this.state.journalEntries));
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.state.clients));
      localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(this.state.treasuryTransactions));
      localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify(this.state.taxDeclarations));
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(this.state.certificates));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.state.invoices));
      localStorage.setItem(STORAGE_KEYS.FEASIBILITY, JSON.stringify(this.state.feasibilityStudies));
      localStorage.setItem(STORAGE_KEYS.CREDIT_SIM, JSON.stringify(this.state.creditSimulations));
      localStorage.setItem(STORAGE_KEYS.OFFICE_PROFILE, JSON.stringify(this.state.officeProfile));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.state.auditLogs));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
    this.notify();
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
      certificates: SAMPLE_CERTIFICATES,
      invoices: SAMPLE_INVOICES,
      feasibilityStudies: [SAMPLE_FEASIBILITY_STUDY],
      creditSimulations: [SAMPLE_CREDIT_SIMULATION],
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

  // --- Full Backup JSON Export & Import ---
  public exportFullBackupJson(): string {
    return JSON.stringify(
      {
        backupVersion: '2.0-EGY-CPA',
        exportedAt: new Date().toISOString(),
        auditor: this.state.officeProfile.auditorName,
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
      if (dataToImport.accounts && dataToImport.journalEntries) {
        this.state = {
          accounts: dataToImport.accounts || DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
          journalEntries: dataToImport.journalEntries || [],
          clients: dataToImport.clients || [],
          treasuryTransactions: dataToImport.treasuryTransactions || [],
          taxDeclarations: dataToImport.taxDeclarations || [],
          certificates: dataToImport.certificates || [],
          invoices: dataToImport.invoices || [],
          feasibilityStudies: dataToImport.feasibilityStudies || [],
          creditSimulations: dataToImport.creditSimulations || [],
          officeProfile: dataToImport.officeProfile || DEFAULT_OFFICE_PROFILE,
          auditLogs: [
            {
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              user: 'محمد جميل مرعي',
              action: 'UPDATE',
              details: 'استعادة قاعدة البيانات بالكامل من ملف النسخ الاحتياطي',
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
  public exportTableToExcel(tableName: 'ACCOUNTS' | 'JOURNAL' | 'CLIENTS' | 'TREASURY' | 'TAXES' | 'CERTIFICATES' | 'INVOICES') {
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
    }
  }
}

export const db = new LocalDatabase();
