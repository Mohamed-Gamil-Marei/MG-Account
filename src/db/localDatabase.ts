import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../utils/excelArabicStyler';
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
  WhatsAppMessage,
  WhatsAppBotSettings,
  ActiveClientContext,
  ClientRelationshipType,
  DailyExchangeRateRecord,
  CurrencyCode,
  FiscalPeriodLock,
  FeeQuotationEstimate,
  CustomsShipment,
} from '../types';
import { DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import { DEFAULT_SAMPLE_EXCHANGE_RATES } from '../data/defaultExchangeRates';
import { SecurityAuthService } from '../services/securityAuth';
import { CloudSync } from '../services/cloudSyncService';
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
  DEFAULT_MASTER_ADMIN_USER,
  SAMPLE_FIXED_ASSETS,
  SAMPLE_WHATSAPP_MESSAGES,
  DEFAULT_WHATSAPP_BOT_SETTINGS,
  SAMPLE_FEE_ESTIMATES,
} from '../data/sampleData';
import { SAMPLE_CUSTOMS_SHIPMENTS } from '../data/sampleCustomsData';

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
  WHATSAPP_MESSAGES: 'egy_acc_whatsapp_messages_v1',
  WHATSAPP_SETTINGS: 'egy_acc_whatsapp_settings_v1',
  ACTIVE_CLIENT_CONTEXT: 'egy_acc_active_client_context_v1',
  EXCHANGE_RATES: 'egy_acc_exchange_rates_v1',
  PERIOD_LOCKS: 'egy_acc_period_locks_v1',
  FEE_ESTIMATES: 'egy_acc_fee_estimates_v1',
  CUSTOMS_SHIPMENTS: 'egy_acc_customs_shipments_v1',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'light',
  brandColor: 'blue',
  language: 'ar',
  reportingCurrency: 'EGP',
  baseCurrency: 'EGP',
  compactView: false,
  securityAuthEnabled: false,
  customEditPassword: 'Mg120',
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
  feeEstimates: FeeQuotationEstimate[];
  officeProfile: OfficeProfile;
  auditLogs: AuditRecord[];
  users: SystemUser[];
  currentUserId: string;
  preferences: UserPreferences;
  whatsappMessages: WhatsAppMessage[];
  whatsappBotSettings: WhatsAppBotSettings;
  exchangeRates: DailyExchangeRateRecord[];
  fiscalPeriodLocks: FiscalPeriodLock[];
  customsShipments: CustomsShipment[];
  activeClientContext?: ActiveClientContext;
  clientArchives?: ClientArchiveRecord[];
  activeClientId?: string;
  activeClientName?: string;
}

export class LocalDatabase {
  private state: DatabaseState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadInitialState();
    this.initCloudSync();
  }

  private initCloudSync() {
    // Start real-time remote listener
    CloudSync.startRealTimeListener();

    // Listen for changes pushed from mobile or other computers
    CloudSync.onRemoteUpdate((remoteState) => {
      this.applyCloudState(remoteState);
    });

    // Check if cloud has newer data on first load
    setTimeout(async () => {
      try {
        const cloudData = await CloudSync.pullFromCloud();
        if (cloudData) {
          this.applyCloudState(cloudData);
        } else {
          // If cloud is empty, seed it with current local state
          const currentUser = this.getCurrentUser();
          CloudSync.pushToCloud(this.state, currentUser?.name);
        }
      } catch (err) {
        console.warn('Initial cloud sync check:', err);
      }
    }, 1000);
  }

  public applyCloudState(cloudState: Partial<DatabaseState>) {
    let hasChanged = false;
    if (cloudState.accounts && Array.isArray(cloudState.accounts) && cloudState.accounts.length > 0) {
      this.state.accounts = cloudState.accounts;
      hasChanged = true;
    }
    if (cloudState.journalEntries && Array.isArray(cloudState.journalEntries)) {
      this.state.journalEntries = cloudState.journalEntries;
      hasChanged = true;
    }
    if (cloudState.clients && Array.isArray(cloudState.clients)) {
      this.state.clients = cloudState.clients;
      hasChanged = true;
    }
    if (cloudState.treasuryTransactions && Array.isArray(cloudState.treasuryTransactions)) {
      this.state.treasuryTransactions = cloudState.treasuryTransactions;
      hasChanged = true;
    }
    if (cloudState.taxDeclarations && Array.isArray(cloudState.taxDeclarations)) {
      this.state.taxDeclarations = cloudState.taxDeclarations;
      hasChanged = true;
    }
    if (cloudState.invoices && Array.isArray(cloudState.invoices)) {
      this.state.invoices = cloudState.invoices;
      hasChanged = true;
    }
    if (cloudState.certificates && Array.isArray(cloudState.certificates)) {
      this.state.certificates = cloudState.certificates;
      hasChanged = true;
    }
    if (cloudState.feasibilityStudies && Array.isArray(cloudState.feasibilityStudies)) {
      this.state.feasibilityStudies = cloudState.feasibilityStudies;
      hasChanged = true;
    }
    if (cloudState.creditSimulations && Array.isArray(cloudState.creditSimulations)) {
      this.state.creditSimulations = cloudState.creditSimulations;
      hasChanged = true;
    }
    if (cloudState.fixedAssets && Array.isArray(cloudState.fixedAssets)) {
      this.state.fixedAssets = cloudState.fixedAssets;
      hasChanged = true;
    }
    if (cloudState.feeEstimates && Array.isArray(cloudState.feeEstimates)) {
      this.state.feeEstimates = cloudState.feeEstimates;
      hasChanged = true;
    }
    if (cloudState.officeProfile) {
      this.state.officeProfile = cloudState.officeProfile;
      hasChanged = true;
    }
    if (cloudState.users && Array.isArray(cloudState.users) && cloudState.users.length > 0) {
      this.state.users = cloudState.users;
      hasChanged = true;
    }
    if (cloudState.taxMandates && Array.isArray(cloudState.taxMandates)) {
      this.state.taxMandates = cloudState.taxMandates;
      hasChanged = true;
    }
    if (cloudState.exchangeRates && Array.isArray(cloudState.exchangeRates)) {
      this.state.exchangeRates = cloudState.exchangeRates;
      hasChanged = true;
    }
    if (cloudState.fiscalPeriodLocks && Array.isArray(cloudState.fiscalPeriodLocks)) {
      this.state.fiscalPeriodLocks = cloudState.fiscalPeriodLocks;
      hasChanged = true;
    }

    if (hasChanged) {
      this.flushDirtyStorage(false);
      this.notify();
    }
  }

  public async syncToCloudNow(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    return await CloudSync.pushToCloud(this.state, currentUser?.name);
  }

  public async pullFromCloudNow(): Promise<boolean> {
    const data = await CloudSync.pullFromCloud();
    if (data) {
      this.applyCloudState(data);
      return true;
    }
    return false;
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
      const whatsappMessagesJson = localStorage.getItem(STORAGE_KEYS.WHATSAPP_MESSAGES);
      const whatsappSettingsJson = localStorage.getItem(STORAGE_KEYS.WHATSAPP_SETTINGS);
      const activeClientContextJson = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLIENT_CONTEXT);
      const exchangeRatesJson = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
      const periodLocksJson = localStorage.getItem(STORAGE_KEYS.PERIOD_LOCKS);
      const feeEstimatesJson = localStorage.getItem(STORAGE_KEYS.FEE_ESTIMATES);
      const customsJson = localStorage.getItem(STORAGE_KEYS.CUSTOMS_SHIPMENTS);

      // Check if full purge to clean slate was enforced
      const PURGE_SYSTEM_FLAG = 'cpa_integrated_purged_clean_v6';
      const hasPurgedClean = localStorage.getItem(PURGE_SYSTEM_FLAG) === 'true';

      if (!hasPurgedClean) {
        // Full clean purge: zero balances, empty collections, only master admin user
        const cleanAccounts: Account[] = DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS.map((acc) => ({
          ...acc,
          openingBalance: 0,
          currentBalance: 0,
          debitTotal: 0,
          creditTotal: 0,
        }));

        const cleanProfile: OfficeProfile = {
          ...DEFAULT_OFFICE_PROFILE,
          firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
        };

        const cleanState: DatabaseState = {
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
          feeEstimates: [],
          customsShipments: [],
          officeProfile: cleanProfile,
          users: [...SAMPLE_SYSTEM_USERS], // Master admin only (admin / admin)
          currentUserId: 'user-admin',
          preferences: DEFAULT_USER_PREFERENCES,
          whatsappMessages: [],
          whatsappBotSettings: DEFAULT_WHATSAPP_BOT_SETTINGS,
          exchangeRates: DEFAULT_SAMPLE_EXCHANGE_RATES,
          fiscalPeriodLocks: [],
          activeClientContext: undefined,
          auditLogs: [
            {
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              user: 'admin',
              action: 'CREATE',
              details: 'تفريغ وتصفير شامل لكافة بيانات وسجلات المنظومة - بدء العمل الفعلي بحساب الإدارة الرئيسي (admin)',
            },
          ],
        };

        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(cleanState.accounts));
          localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(cleanState.journalEntries));
          localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(cleanState.clients));
          localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(cleanState.treasuryTransactions));
          localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify(cleanState.taxDeclarations));
          localStorage.setItem(STORAGE_KEYS.TAX_MANDATES, JSON.stringify(cleanState.taxMandates));
          localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(cleanState.certificates));
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(cleanState.invoices));
          localStorage.setItem(STORAGE_KEYS.FEASIBILITY, JSON.stringify(cleanState.feasibilityStudies));
          localStorage.setItem(STORAGE_KEYS.CREDIT_SIM, JSON.stringify(cleanState.creditSimulations));
          localStorage.setItem(STORAGE_KEYS.FIXED_ASSETS, JSON.stringify(cleanState.fixedAssets));
          localStorage.setItem(STORAGE_KEYS.FEE_ESTIMATES, JSON.stringify(cleanState.feeEstimates));
          localStorage.setItem(STORAGE_KEYS.CUSTOMS_SHIPMENTS, JSON.stringify(cleanState.customsShipments));
          localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(cleanState.users));
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, cleanState.currentUserId);
          localStorage.setItem(STORAGE_KEYS.OFFICE_PROFILE, JSON.stringify(cleanState.officeProfile));
          localStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(cleanState.whatsappMessages));
          localStorage.setItem(STORAGE_KEYS.PERIOD_LOCKS, JSON.stringify(cleanState.fiscalPeriodLocks));
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_CLIENT_CONTEXT);
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(cleanState.auditLogs));
          localStorage.setItem(PURGE_SYSTEM_FLAG, 'true');
        } catch (err) {
          console.error('Error storing clean state:', err);
        }

        return cleanState;
      }

      let loadedClients: ClientArchiveRecord[] = clientsJson ? JSON.parse(clientsJson) : [];
      // Ensure each client has default folders if missing and relationshipType
      loadedClients = loadedClients.map((cl) => {
        if (!cl.relationshipType) {
          cl.relationshipType = cl.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY';
        }
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
      if (loadedOfficeProfile) {
        if (!loadedOfficeProfile.firmName || loadedOfficeProfile.firmName === 'منظومة المحاسب القانوني المتكامل' || loadedOfficeProfile.firmName.trim() === '') {
          loadedOfficeProfile.firmName = 'مكتب المحاسب القانوني ومراقب الحسابات';
        }
        if (!loadedOfficeProfile.auditorName || loadedOfficeProfile.auditorName.trim() === '') {
          loadedOfficeProfile.auditorName = 'محمد جميل مرعي';
        }
        if (!loadedOfficeProfile.phone || loadedOfficeProfile.phone === '02-27945620' || loadedOfficeProfile.mobile?.includes('01001234567') || loadedOfficeProfile.phone.trim() === '') {
          loadedOfficeProfile.phone = '01003335360';
          loadedOfficeProfile.mobile = '01003335360';
        }
        if (!loadedOfficeProfile.licenseNumber || loadedOfficeProfile.licenseNumber.includes('18492') || loadedOfficeProfile.licenseNumber.includes('18452') || loadedOfficeProfile.licenseNumber.trim() === '') {
          loadedOfficeProfile.licenseNumber = 'س.م.م / 43122 - ترخيص وزارة المالية';
        }
        if (!loadedOfficeProfile.taxAuthorityRegNo || loadedOfficeProfile.taxAuthorityRegNo.trim() === '' || loadedOfficeProfile.taxAuthorityRegNo.includes('200-145-890')) {
          loadedOfficeProfile.taxAuthorityRegNo = 'م.ض. 492-817-302';
        }
        if (!loadedOfficeProfile.mainOfficeAddress || loadedOfficeProfile.mainOfficeAddress.trim() === '' || loadedOfficeProfile.mainOfficeAddress.includes('ميدان التحرير') || loadedOfficeProfile.address?.includes('ميدان التحرير')) {
          loadedOfficeProfile.mainOfficeAddress = 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية';
          loadedOfficeProfile.showMainOfficeAddress = true;
        }
        if (!loadedOfficeProfile.branchOfficeAddress || loadedOfficeProfile.branchOfficeAddress.trim() === '') {
          loadedOfficeProfile.branchOfficeAddress = 'المباركية مول - مدينة العاشر من رمضان - الشرقية';
          loadedOfficeProfile.showBranchOfficeAddress = true;
        }
        if (loadedOfficeProfile.showMainOfficeAddress === undefined) {
          loadedOfficeProfile.showMainOfficeAddress = true;
        }
        if (loadedOfficeProfile.showBranchOfficeAddress === undefined) {
          loadedOfficeProfile.showBranchOfficeAddress = true;
        }
        if (!loadedOfficeProfile.address || loadedOfficeProfile.address.includes('ميدان التحرير') || loadedOfficeProfile.address.trim() === '') {
          loadedOfficeProfile.address = 'المكتب الرئيسي: ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية | الفرع: المباركية مول - مدينة العاشر من رمضان - الشرقية';
        }
      }

      let loadedActiveClientContext: ActiveClientContext | undefined = undefined;
      if (activeClientContextJson) {
        try {
          loadedActiveClientContext = JSON.parse(activeClientContextJson);
        } catch {}
      }
      if (!loadedActiveClientContext && loadedClients.length > 0) {
        const defaultClient = loadedClients[0];
        loadedActiveClientContext = {
          clientId: defaultClient.id,
          clientName: defaultClient.name,
          clientCode: defaultClient.clientCode,
          relationshipType: defaultClient.relationshipType || 'PERMANENT',
          selectedFiscalYear: 2026,
          autoFilterAccountingData: false,
          lastUpdated: new Date().toISOString(),
        };
      }

      return {
        accounts: accountsJson ? JSON.parse(accountsJson) : DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS,
        journalEntries: journalJson ? JSON.parse(journalJson) : [],
        clients: loadedClients,
        treasuryTransactions: treasuryJson ? JSON.parse(treasuryJson) : [],
        taxDeclarations: taxesJson ? JSON.parse(taxesJson) : [],
        taxMandates: mandatesJson ? JSON.parse(mandatesJson) : [],
        certificates: certificatesJson ? JSON.parse(certificatesJson) : [],
        invoices: invoicesJson ? JSON.parse(invoicesJson) : [],
        feasibilityStudies: feasibilityJson ? JSON.parse(feasibilityJson) : [],
        creditSimulations: creditSimJson ? JSON.parse(creditSimJson) : [],
        fixedAssets: fixedAssetsJson ? JSON.parse(fixedAssetsJson) : [],
        officeProfile: loadedOfficeProfile,
        users: (() => {
          const RESET_FLAG = 'cpa_single_master_admin_v9';
          if (typeof localStorage !== 'undefined' && localStorage.getItem(RESET_FLAG) !== 'true') {
            const single = [...SAMPLE_SYSTEM_USERS];
            try {
              localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(single));
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'user-admin');
              localStorage.setItem(RESET_FLAG, 'true');
            } catch {}
            return single;
          }
          if (usersJson) {
            try {
              const parsed: SystemUser[] = JSON.parse(usersJson);
              const adm = parsed.find((u) => u.id === 'user-admin' || u.role === 'ADMIN' || u.username === 'admin');
              if (adm) {
                adm.name = 'admin';
                adm.username = 'admin';
                adm.pinCode = 'admin';
                adm.password = 'admin';
                adm.isActive = true;
              } else {
                parsed.unshift({ ...DEFAULT_MASTER_ADMIN_USER });
              }
              return parsed;
            } catch {}
          }
          return [...SAMPLE_SYSTEM_USERS];
        })(),
        currentUserId: 'user-admin',
        preferences: preferencesJson ? JSON.parse(preferencesJson) : DEFAULT_USER_PREFERENCES,
        whatsappMessages: whatsappMessagesJson ? JSON.parse(whatsappMessagesJson) : [],
        whatsappBotSettings: (() => {
          const loaded: WhatsAppBotSettings = whatsappSettingsJson ? JSON.parse(whatsappSettingsJson) : DEFAULT_WHATSAPP_BOT_SETTINGS;
          const hasPhone = (loaded.templates || []).some((t) => t.templateBody.includes('01003335360'));
          const hasVerification = (loaded.templates || []).some((t) => t.code === 'VERIFICATION_CODE');
          if (!hasPhone || !hasVerification || !loaded.templates || loaded.templates.length < DEFAULT_WHATSAPP_BOT_SETTINGS.templates!.length) {
            loaded.templates = [...(DEFAULT_WHATSAPP_BOT_SETTINGS.templates || [])];
          }
          return loaded;
        })(),
        exchangeRates: exchangeRatesJson ? JSON.parse(exchangeRatesJson) : DEFAULT_SAMPLE_EXCHANGE_RATES,
        fiscalPeriodLocks: periodLocksJson ? JSON.parse(periodLocksJson) : [],
        feeEstimates: feeEstimatesJson ? JSON.parse(feeEstimatesJson) : [],
        customsShipments: customsJson ? JSON.parse(customsJson) : [],
        activeClientContext: loadedActiveClientContext,
        auditLogs: auditLogsJson ? JSON.parse(auditLogsJson) : [
          {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            user: 'محمد جميل مرعي (المحاسب القانوني)',
            action: 'CREATE',
            details: 'تهيئة منظومة المحاسب القانوني المتكامل',
          },
        ],
      };
    } catch (e) {
      console.error('Error loading database state:', e);
      return {
        accounts: DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS.map(a => ({ ...a, openingBalance: 0, currentBalance: 0, debitTotal: 0, creditTotal: 0 })),
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
        feeEstimates: [],
        customsShipments: [],
        officeProfile: DEFAULT_OFFICE_PROFILE,
        users: [...SAMPLE_SYSTEM_USERS],
        currentUserId: 'user-admin',
        preferences: DEFAULT_USER_PREFERENCES,
        whatsappMessages: [],
        whatsappBotSettings: DEFAULT_WHATSAPP_BOT_SETTINGS,
        exchangeRates: DEFAULT_SAMPLE_EXCHANGE_RATES,
        fiscalPeriodLocks: [],
        activeClientContext: undefined,
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

  public flushDirtyStorage(pushToCloud: boolean = true) {
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
      if (this.dirtyKeys.has(STORAGE_KEYS.ACTIVE_CLIENT_CONTEXT)) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT_CONTEXT, JSON.stringify(this.state.activeClientContext || null));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.EXCHANGE_RATES)) {
        localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(this.state.exchangeRates || []));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.PERIOD_LOCKS)) {
        localStorage.setItem(STORAGE_KEYS.PERIOD_LOCKS, JSON.stringify(this.state.fiscalPeriodLocks || []));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.FEE_ESTIMATES)) {
        localStorage.setItem(STORAGE_KEYS.FEE_ESTIMATES, JSON.stringify(this.state.feeEstimates || []));
      }
      if (this.dirtyKeys.has(STORAGE_KEYS.CUSTOMS_SHIPMENTS)) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMS_SHIPMENTS, JSON.stringify(this.state.customsShipments || []));
      }
      this.dirtyKeys.clear();

      // Trigger debounced cloud synchronization
      if (pushToCloud) {
        const currentUser = this.getCurrentUser();
        CloudSync.queueAutoSync(this.state, currentUser?.name);
      }
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
    if (updates.customFirebaseConfig !== undefined) {
      CloudSync.initFirebase(this.state.preferences.customFirebaseConfig);
      CloudSync.startRealTimeListener();
    }
    this.saveState();
  }

  public setThemeMode(mode: ThemeMode) {
    this.updatePreferences({ themeMode: mode });
  }

  public setBrandColor(color: BrandColor) {
    this.updatePreferences({ brandColor: color });
  }

  public setLanguage(lang: 'ar' | 'en') {
    this.updatePreferences({ language: lang });
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
    return {
      ...this.state,
      clientArchives: this.state.clients,
      activeClientId: this.state.activeClientContext?.clientId,
      activeClientName: this.state.activeClientContext?.clientName,
    };
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

  public postBatchJournalEntries(ids: string[]): number {
    let count = 0;
    const now = new Date().toISOString();
    ids.forEach((id) => {
      const entry = this.state.journalEntries.find((e) => e.id === id);
      if (entry && !entry.isPosted) {
        entry.isPosted = true;
        entry.updatedAt = now;
        entry.auditTrail.unshift({
          timestamp: now.replace('T', ' ').substring(0, 19),
          user: this.state.officeProfile.auditorName,
          action: 'POST',
          details: 'ترحيل دفعة قيود آلياً عبر المراجع الذكي',
        });
        count++;
      }
    });
    if (count > 0) {
      this.logAudit('POST', `ترحيل دفعة قيود (${count} قيد) آلياً عبر فحص التدقيق`);
      this.saveState();
    }
    return count;
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

  public batchAddClients(clients: Omit<ClientArchiveRecord, 'id' | 'createdAt' | 'updatedAt'>[]): ClientArchiveRecord[] {
    const now = new Date().toISOString();
    let baseTime = Date.now();
    const createdClients: ClientArchiveRecord[] = [];

    clients.forEach((c, idx) => {
      const newClient: ClientArchiveRecord = {
        ...c,
        id: `cl-${baseTime + idx}`,
        createdAt: now,
        updatedAt: now,
        documents: c.documents || [],
        folders: c.folders || [],
        procedures: c.procedures || [],
        partners: c.partners || [],
      };
      this.state.clients.push(newClient);
      createdClients.push(newClient);
    });

    this.logAudit('CREATE', `استيراد دفعة عملاء من ملف إكسيل: تم إضافة ${createdClients.length} ملف شركة جديد بالأرشيف`);
    this.saveState();
    return createdClients;
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
    
    // If the active client was deleted, reset or select next
    if (this.state.activeClientContext?.clientId === id) {
      if (this.state.clients.length > 0) {
        this.setActiveClient(this.state.clients[0].id);
      } else {
        this.clearActiveClient();
      }
    }
    
    this.logAudit('DELETE', `حذف ملف العميل: ${cl.name}`);
    this.saveState();
    return true;
  }

  // --- Active Client Context Management (العميل النشط وربط الشاشات المركزية) ---
  public getActiveClientContext(): ActiveClientContext | null {
    if (!this.state.activeClientContext?.clientId) return null;
    return this.state.activeClientContext;
  }

  public getActiveClientRecord(): ClientArchiveRecord | null {
    const activeCtx = this.getActiveClientContext();
    if (!activeCtx?.clientId) return null;
    return this.state.clients.find((c) => c.id === activeCtx.clientId) || null;
  }

  public setActiveClient(clientId: string | null, options?: { autoFilter?: boolean; fiscalYear?: number }): ActiveClientContext | null {
    if (!clientId) {
      return this.clearActiveClient();
    }

    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return null;

    const newContext: ActiveClientContext = {
      clientId: client.id,
      clientName: client.name,
      clientCode: client.clientCode,
      relationshipType: client.relationshipType || (client.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY'),
      selectedFiscalYear: options?.fiscalYear || this.state.activeClientContext?.selectedFiscalYear || 2026,
      autoFilterAccountingData: options?.autoFilter ?? this.state.activeClientContext?.autoFilterAccountingData ?? false,
      lastUpdated: new Date().toISOString(),
    };

    this.state.activeClientContext = newContext;
    this.logAudit('UPDATE', `تحديد العميل النشط في بيئة العمل: ${client.name} (${client.clientCode}) [${newContext.relationshipType === 'PERMANENT' ? 'عميل دائم' : 'عميل مؤقت'}]`);
    this.saveState('ACTIVE_CLIENT_CONTEXT');
    return newContext;
  }

  public clearActiveClient(): ActiveClientContext {
    const cleared: ActiveClientContext = {
      clientId: null,
      clientName: undefined,
      clientCode: undefined,
      relationshipType: undefined,
      autoFilterAccountingData: false,
      lastUpdated: new Date().toISOString(),
    };
    this.state.activeClientContext = cleared;
    this.logAudit('UPDATE', `إلغاء تحديد العميل النشط (عرض شامل لكافة السجلات)`);
    this.saveState('ACTIVE_CLIENT_CONTEXT');
    return cleared;
  }

  public updateActiveClientFiscalYear(year: number) {
    if (this.state.activeClientContext) {
      this.state.activeClientContext.selectedFiscalYear = year;
      this.state.activeClientContext.lastUpdated = new Date().toISOString();
      this.saveState('ACTIVE_CLIENT_CONTEXT');
    }
  }

  public toggleActiveClientAutoFilter(enabled?: boolean) {
    if (this.state.activeClientContext) {
      const nextVal = enabled !== undefined ? enabled : !this.state.activeClientContext.autoFilterAccountingData;
      this.state.activeClientContext.autoFilterAccountingData = nextVal;
      this.state.activeClientContext.lastUpdated = new Date().toISOString();
      this.saveState('ACTIVE_CLIENT_CONTEXT');
    }
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
    this.dirtyKeys.add(STORAGE_KEYS.OFFICE_PROFILE);
    this.logAudit('UPDATE', 'تحديث بيانات وترويسة وشعار مكتب المحاسب القانوني');
    this.saveState('OFFICE_PROFILE');
    this.flushDirtyStorage(true);
    this.notify();
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
      feeEstimates: SAMPLE_FEE_ESTIMATES,
      customsShipments: SAMPLE_CUSTOMS_SHIPMENTS,
      users: SAMPLE_SYSTEM_USERS,
      currentUserId: 'user-admin',
      preferences: DEFAULT_USER_PREFERENCES,
      officeProfile: DEFAULT_OFFICE_PROFILE,
      whatsappMessages: SAMPLE_WHATSAPP_MESSAGES,
      whatsappBotSettings: DEFAULT_WHATSAPP_BOT_SETTINGS,
      exchangeRates: DEFAULT_SAMPLE_EXCHANGE_RATES,
      fiscalPeriodLocks: [],
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

  // --- Fiscal Period Locks & Year-End Closing ---
  public getPeriodLocks(): FiscalPeriodLock[] {
    return this.state.fiscalPeriodLocks || [];
  }

  public isPeriodLocked(dateOrYear: string | number): boolean {
    if (!this.state.fiscalPeriodLocks || this.state.fiscalPeriodLocks.length === 0) return false;
    let year: number;
    let month: string | null = null;
    if (typeof dateOrYear === 'number') {
      year = dateOrYear;
    } else {
      const parts = dateOrYear.split('-');
      year = parseInt(parts[0], 10);
      if (parts.length > 1) {
        month = parts[1];
      }
    }
    return this.state.fiscalPeriodLocks.some((lock) => {
      if (!lock.isLocked) return false;
      if (lock.fiscalYear !== year) return false;
      if (lock.period === 'ANNUAL') return true;
      if (month && (lock.period === month || lock.period === `M${month}`)) return true;
      return false;
    });
  }

  public lockFiscalPeriod(fiscalYear: number, period: string, notes?: string, closingEntryId?: string): FiscalPeriodLock {
    const locks = [...(this.state.fiscalPeriodLocks || [])];
    const existingIndex = locks.findIndex((l) => l.fiscalYear === fiscalYear && l.period === period);
    const lockRecord: FiscalPeriodLock = {
      id: existingIndex >= 0 ? locks[existingIndex].id : `lock-${fiscalYear}-${period}-${Date.now()}`,
      fiscalYear,
      period,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: this.state.officeProfile?.auditorName || 'محمد جميل مرعي',
      notes,
      closingEntryId,
    };
    if (existingIndex >= 0) {
      locks[existingIndex] = lockRecord;
    } else {
      locks.push(lockRecord);
    }
    this.state.fiscalPeriodLocks = locks;
    this.logAudit('POST', `إقفال واعتماد الفترة المالية: سنة ${fiscalYear} - فترة ${period}`);
    this.saveState('PERIOD_LOCKS' as any);
    return lockRecord;
  }

  public unlockFiscalPeriod(fiscalYear: number, period: string, reason?: string): boolean {
    const locks = [...(this.state.fiscalPeriodLocks || [])];
    const index = locks.findIndex((l) => l.fiscalYear === fiscalYear && l.period === period);
    if (index === -1) return false;
    locks[index] = {
      ...locks[index],
      isLocked: false,
      notes: reason ? `تم فك القفل: ${reason}` : 'تم فك القفل يدويًا',
    };
    this.state.fiscalPeriodLocks = locks;
    this.logAudit('UNPOST', `فك إقفال الفترة المالية: سنة ${fiscalYear} - فترة ${period} (${reason || 'يدوي'})`);
    this.saveState('PERIOD_LOCKS' as any);
    return true;
  }

  // --- Complete Database Purge / Factory Reset with Passcode (Mgacc120) ---
  public purgeAllDatabaseData(passcode: string): { success: boolean; message: string } {
    const norm = SecurityAuthService.normalizeInput(passcode).trim();
    const isValid = norm === 'Mgacc120' || norm === 'mgacc120' || norm === 'Mg120' || norm === 'mg120' || SecurityAuthService.verifyPassword(passcode);
    if (!isValid) {
      return {
        success: false,
        message: 'الرقم السري لتفريغ البيانات غير صحيح! يرجى إدخال الرقم السري المعتمد (Mgacc120 أو Mg120).',
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

    const cleanProfile: OfficeProfile = {
      ...DEFAULT_OFFICE_PROFILE,
      firmName: 'مكتب المحاسب القانوني ومراقب الحسابات',
    };

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
      feeEstimates: [],
      customsShipments: [],
      users: [...SAMPLE_SYSTEM_USERS], // Master admin only
      currentUserId: 'user-admin',
      preferences: this.state.preferences || DEFAULT_USER_PREFERENCES,
      officeProfile: cleanProfile,
      whatsappMessages: [],
      whatsappBotSettings: DEFAULT_WHATSAPP_BOT_SETTINGS,
      exchangeRates: DEFAULT_SAMPLE_EXCHANGE_RATES,
      fiscalPeriodLocks: [],
      activeClientContext: undefined,
      auditLogs: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          user: 'محمد جميل مرعي (المحاسب القانوني)',
          action: 'DELETE',
          details: 'تفريغ وتصفير شامل لكافة بيانات وسجلات المنظومة بالرقم السري المعتمد والبدء بملف محاسبي نظيف',
        },
      ],
    };

    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CLIENT_CONTEXT);
    } catch {}

    this.saveState();
    this.notify();
    return {
      success: true,
      message: 'تم تفريغ ومسح كافة بيانات وسجلات المنظومة بنجاح والبدء بملف محاسبي نظيف تماماً! حساب الأدمن هو الحساب الوحيد الفعّال حالياً.',
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
          feeEstimates: dataToImport.feeEstimates || SAMPLE_FEE_ESTIMATES,
          customsShipments: dataToImport.customsShipments || SAMPLE_CUSTOMS_SHIPMENTS,
          officeProfile: dataToImport.officeProfile || DEFAULT_OFFICE_PROFILE,
          users: dataToImport.users || SAMPLE_SYSTEM_USERS,
          currentUserId: dataToImport.currentUserId || 'user-admin',
          preferences: dataToImport.preferences || DEFAULT_USER_PREFERENCES,
          whatsappMessages: dataToImport.whatsappMessages || SAMPLE_WHATSAPP_MESSAGES,
          whatsappBotSettings: dataToImport.whatsappBotSettings || DEFAULT_WHATSAPP_BOT_SETTINGS,
          exchangeRates: dataToImport.exchangeRates || DEFAULT_SAMPLE_EXCHANGE_RATES,
          fiscalPeriodLocks: dataToImport.fiscalPeriodLocks || [],
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'شجرة الحسابات');
      writeArabicExcelFile(wb, `شجرة_الحسابات_المصرية_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'قيود اليومية');
      writeArabicExcelFile(wb, `قيود_اليومية_العامة_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'أرشيف العملاء');
      writeArabicExcelFile(wb, `أرشيف_العملاء_والشركات_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'خزنة المكتب');
      writeArabicExcelFile(wb, `حركات_خزنة_المكتب_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'الإقرارات الضريبية');
      writeArabicExcelFile(wb, `سجل_الإقرارات_الضريبية_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الفواتير والإيصالات');
      writeArabicExcelFile(wb, `سجل_الفواتير_الإلكترونية_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      formatWorksheetForArabicExport(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الأصول الثابتة');
      writeArabicExcelFile(wb, `سجل_الأصول_الثابتة_والإهلاك_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  // ==========================================
  // USERS & AUTHENTICATION METHODS (إدارة الموظفين والصلاحيات)
  // ==========================================
  public getUsers(): SystemUser[] {
    return this.state.users || SAMPLE_SYSTEM_USERS;
  }

  public getCurrentUser(): SystemUser {
    const users = this.getUsers();
    const user = users.find((u) => u.id === this.state.currentUserId);
    return user || users[0] || SAMPLE_SYSTEM_USERS[0];
  }

  public setCurrentUserId(userId: string) {
    this.state.currentUserId = userId;
    this.saveState('CURRENT_USER_ID');
    this.notify();
  }

  public authenticateByPin(userId: string, enteredPin: string): { success: boolean; user?: SystemUser; message?: string } {
    const user = this.getUsers().find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'المستخدم غير موجود بالنظام' };
    }

    if (user.isActive === false) {
      return { success: false, message: 'هذا الحساب محظور حالياً بأمر مدير المنظومة (Admin). يرجى مراجعة إدارة المنظومة.' };
    }

    const normEntered = SecurityAuthService.normalizeInput(enteredPin);
    const normUserPin = SecurityAuthService.normalizeInput(user.pinCode || '');
    const normPassword = SecurityAuthService.normalizeInput(user.password || '');

    // Allow empty PIN if user has none configured
    if ((!user.pinCode || user.pinCode.trim() === '') && (!user.password || user.password.trim() === '')) {
      this.state.currentUserId = user.id;
      this.saveState('CURRENT_USER_ID');
      this.logAudit('UPDATE', `تسجيل دخول ناجح للمستخدم: ${user.name} (${user.roleTitleArabic})`);
      this.notify();
      return { success: true, user };
    }

    // 1. Direct match (case-insensitive & handles Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩)
    const isDirectMatch = (normUserPin.length > 0 && normEntered === normUserPin) ||
                          (normPassword.length > 0 && normEntered === normPassword);

    // 2. Sovereign Master password match (Mg120 / 120 / mg120 / Mgacc120 / custom master password)
    const isMasterMatch = SecurityAuthService.verifyPassword(enteredPin);

    // 3. Numeric-only match (e.g. user enters "120" for "Mg120", "2026" for "Aud2026", "123" for "Acc123")
    const numericOnlyUserPin = (user.pinCode || '').replace(/\D/g, '');
    const isNumericSuffixMatch = numericOnlyUserPin.length > 0 && normEntered === numericOnlyUserPin;

    if (isDirectMatch || isMasterMatch || isNumericSuffixMatch) {
      this.state.currentUserId = user.id;
      this.saveState('CURRENT_USER_ID');
      this.logAudit('UPDATE', `تسجيل دخول ناجح للمستخدم: ${user.name} (${user.roleTitleArabic})`);
      this.notify();
      return { success: true, user };
    }

    return { success: false, message: 'الرمز السري / كلمة المرور غير صحيحة! يرجى إعادة المحاولة.' };
  }

  public authenticateUser(identifier: string, enteredPinOrPassword: string): { success: boolean; user?: SystemUser; message?: string } {
    const users = this.getUsers();
    const cleanId = (identifier || '').trim().toLowerCase();
    
    if (!cleanId) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو كود الموظف.' };
    }

    // Find matching user by id, username, email, employeeCode, or exact name
    const user = users.find((u) => {
      if (u.id && u.id.toLowerCase() === cleanId) return true;
      if (u.username && u.username.toLowerCase() === cleanId) return true;
      if (u.email && u.email.toLowerCase() === cleanId) return true;
      if (u.employeeCode && u.employeeCode.toLowerCase() === cleanId) return true;
      if (u.name && u.name.toLowerCase() === cleanId) return true;
      return false;
    });

    if (!user) {
      return {
        success: false,
        message: 'اسم المستخدم أو الحساب غير مسجل بالنظام. يرجى التواصل مع مسؤول المنظومة لإضافتك يدوياً عبر لوحة تحكم الأدمن.',
      };
    }

    if (user.isActive === false) {
      return { success: false, message: 'هذا الحساب محظور حالياً بأمر مدير المنظومة (Admin). يرجى مراجعة إدارة المنظومة.' };
    }

    return this.authenticateByPin(user.id, enteredPinOrPassword);
  }

  // ==========================================
  // SOVEREIGN MASTER ADMIN OPERATIONS
  // صلاحيات وتحكمات مدير المنظومة السيادي
  // ==========================================

  public isCurrentUserMasterAdmin(): boolean {
    const current = this.getCurrentUser();
    return current.role === 'ADMIN' && (current.username === 'admin' || current.id === 'user-admin' || current.name === 'admin');
  }

  public changeUserPassword(userId: string, newPinOrPass: string): { success: boolean; message: string } {
    if (!this.state.users) this.state.users = [...SAMPLE_SYSTEM_USERS];
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'المستخدم غير موجود بالنظام' };
    }

    const cleanPass = newPinOrPass.trim();
    if (!cleanPass) {
      return { success: false, message: 'يرجى إدخال كلمة مرور أو رمز سري صالح' };
    }

    user.pinCode = cleanPass;
    user.password = cleanPass;

    this.logAudit('UPDATE', `تغيير وتحديث كلمة المرور للمستخدم (${user.name}) بأمر مدير المنظومة السيادي`);
    this.saveState('SYSTEM_USERS');
    this.notify();
    return { success: true, message: `تم تحديث كلمة المرور للمستخدم (${user.name}) بنجاح.` };
  }

  public toggleUserActive(userId: string): { success: boolean; isActive: boolean; message: string } {
    if (!this.state.users) this.state.users = [...SAMPLE_SYSTEM_USERS];
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, isActive: false, message: 'المستخدم غير موجود' };
    }

    if (user.id === 'user-admin' || user.username === 'admin') {
      return { success: false, isActive: true, message: 'لا يمكن حظر الحساب الإداري السيادي للمنظومة!' };
    }

    user.isActive = user.isActive === false ? true : false;
    const actionText = user.isActive ? 'فك حظر وتفعيل' : 'حظر وتعطيل';
    this.logAudit('UPDATE', `${actionText} حساب المستخدم: ${user.name} (${user.roleTitleArabic})`);
    this.saveState('SYSTEM_USERS');
    this.notify();
    return {
      success: true,
      isActive: user.isActive,
      message: `تم ${actionText} حساب المستخدم (${user.name}) بنجاح.`,
    };
  }

  public unprotectAllFiscalPeriods(): { count: number; message: string } {
    const count = (this.state.fiscalPeriodLocks || []).length;
    this.state.fiscalPeriodLocks = [];
    this.saveState('PERIOD_LOCKS');
    this.logAudit('UPDATE', `فك حماية وإلغاء كافة أقفال الفترات والسنوات المالية بأمر مدير المنظومة (Admin Sovereign Override)`);
    this.notify();
    return { count, message: 'تم فك حماية وإلغاء كافة أقفال الفترات المحاسبية بنجاح.' };
  }

  public resetDeviceSecurityBindings(): { success: boolean; message: string } {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('egy_acc_device_binding_v1');
        localStorage.removeItem('egy_acc_authorized_devices_v2');
        localStorage.removeItem('egy_acc_machine_guid_v1');
      }
      this.logAudit('UPDATE', 'فك حماية وإلغاء قيود ربط الأجهزة والترخيص المحلي بأمر مدير المنظومة');
      return { success: true, message: 'تم فك حماية وربط الأجهزة بنجاح، ويمكن استخدام النظام من أي جهاز بحرية.' };
    } catch {
      return { success: false, message: 'تعذر فك قيود الأجهزة.' };
    }
  }

  public updateSystemSerials(data: {
    systemSerial?: string;
    activationKey?: string;
    licenseNumber?: string;
    taxAuthorityRegNo?: string;
  }): { success: boolean; message: string } {
    if (!this.state.officeProfile) {
      this.state.officeProfile = { ...DEFAULT_OFFICE_PROFILE };
    }
    if (data.systemSerial !== undefined) {
      this.state.officeProfile.systemSerial = data.systemSerial.trim();
    }
    if (data.activationKey !== undefined) {
      this.state.officeProfile.activationKey = data.activationKey.trim();
    }
    if (data.licenseNumber !== undefined) {
      this.state.officeProfile.licenseNumber = data.licenseNumber.trim();
    }
    if (data.taxAuthorityRegNo !== undefined) {
      this.state.officeProfile.taxAuthorityRegNo = data.taxAuthorityRegNo.trim();
    }
    this.saveState('OFFICE_PROFILE');
    this.logAudit('UPDATE', 'تحديث السريالات وأكواد التفعيل وتراخيص المنظومة بأمر مدير المنظومة');
    this.notify();
    return { success: true, message: 'تم حفظ وتحديث السريالات وبيانات الترخيص بنجاح.' };
  }

  public getSystemSerials(): {
    systemSerial: string;
    activationKey: string;
    licenseNumber: string;
    taxAuthorityRegNo: string;
  } {
    const prof = this.state.officeProfile || DEFAULT_OFFICE_PROFILE;
    return {
      systemSerial: prof.systemSerial || 'CPA-SYS-2026-MG120-PRO-EGY',
      activationKey: prof.activationKey || 'ACT-CPA-99482-EGY-AUTH',
      licenseNumber: prof.licenseNumber || 'س.م.م / 43122',
      taxAuthorityRegNo: prof.taxAuthorityRegNo || 'م.ض. 492-817-302',
    };
  }

  public addUser(userData: Omit<SystemUser, 'id' | 'createdAt'>): SystemUser {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const newUser: SystemUser = {
      ...userData,
      id,
      createdAt: now,
    };

    if (!this.state.users) {
      this.state.users = [...SAMPLE_SYSTEM_USERS];
    }
    this.state.users.push(newUser);
    this.logAudit('CREATE', `إضافة موظف/مستخدم جديد للنظام: ${newUser.name} بصلاحية: ${newUser.roleTitleArabic}`);
    this.saveState('SYSTEM_USERS');
    return newUser;
  }

  public updateUser(id: string, updates: Partial<SystemUser>): SystemUser | null {
    if (!this.state.users) this.state.users = [...SAMPLE_SYSTEM_USERS];
    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const old = this.state.users[index];
    this.state.users[index] = {
      ...old,
      ...updates,
    };

    this.logAudit('UPDATE', `تعديل بيانات وصلاحيات الموظف: ${old.name}`);
    this.saveState('SYSTEM_USERS');
    return this.state.users[index];
  }

  public deleteUser(id: string): boolean {
    if (!this.state.users) this.state.users = [...SAMPLE_SYSTEM_USERS];
    // Protect main admin from deletion
    if (id === 'user-admin') return false;

    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    const user = this.state.users[index];
    this.state.users.splice(index, 1);
    
    // If deleted user was active, switch to admin
    if (this.state.currentUserId === id) {
      this.state.currentUserId = 'user-admin';
      this.saveState('CURRENT_USER_ID');
    }

    this.logAudit('DELETE', `حذف حساب الموظف: ${user.name}`);
    this.saveState('SYSTEM_USERS');
    return true;
  }

  public switchUser(userId: string): void {
    this.setCurrentUserId(userId);
  }

  public getAuditLogs(): AuditRecord[] {
    return this.state.auditLogs || [];
  }

  // ==========================================
  // WHATSAPP BOT & NOTIFICATION ENGINE METHODS
  // ==========================================

  public getWhatsAppMessages(clientId?: string): WhatsAppMessage[] {
    if (!this.state.whatsappMessages) {
      this.state.whatsappMessages = [...SAMPLE_WHATSAPP_MESSAGES];
    }
    if (clientId) {
      return this.state.whatsappMessages.filter((m) => m.clientId === clientId);
    }
    return this.state.whatsappMessages;
  }

  public sendWhatsAppMessage(
    msg: Omit<WhatsAppMessage, 'id' | 'timestamp' | 'status'> & {
      id?: string;
      timestamp?: string;
      status?: import('../types').WhatsAppMessageStatus;
    }
  ): WhatsAppMessage {
    if (!this.state.whatsappMessages) {
      this.state.whatsappMessages = [...SAMPLE_WHATSAPP_MESSAGES];
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newMessage: WhatsAppMessage = {
      id: msg.id || `wa-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clientId: msg.clientId,
      clientName: msg.clientName,
      phone: msg.phone,
      direction: msg.direction,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp || nowStr,
      status: msg.status || 'READ',
      category: msg.category || 'GENERAL',
      mediaPayload: msg.mediaPayload,
    };

    this.state.whatsappMessages.push(newMessage);
    this.saveState('WHATSAPP_MESSAGES');
    return newMessage;
  }

  public deleteWhatsAppMessage(id: string): boolean {
    if (!this.state.whatsappMessages) return false;
    const idx = this.state.whatsappMessages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.state.whatsappMessages.splice(idx, 1);
    this.saveState('WHATSAPP_MESSAGES');
    return true;
  }

  public clearWhatsAppChat(clientId: string): void {
    if (!this.state.whatsappMessages) return;
    this.state.whatsappMessages = this.state.whatsappMessages.filter((m) => m.clientId !== clientId);
    this.saveState('WHATSAPP_MESSAGES');
  }

  public getWhatsAppBotSettings(): WhatsAppBotSettings {
    if (!this.state.whatsappBotSettings) {
      this.state.whatsappBotSettings = { ...DEFAULT_WHATSAPP_BOT_SETTINGS };
    }
    if (
      !this.state.whatsappBotSettings.templates ||
      this.state.whatsappBotSettings.templates.length === 0 ||
      !this.state.whatsappBotSettings.templates.some((t) => t.templateBody.includes('01003335360')) ||
      !this.state.whatsappBotSettings.templates.some((t) => t.code === 'VERIFICATION_CODE')
    ) {
      this.state.whatsappBotSettings.templates = [...(DEFAULT_WHATSAPP_BOT_SETTINGS.templates || [])];
    }
    if (!this.state.whatsappBotSettings.customApiBaseUrl) {
      this.state.whatsappBotSettings.customApiBaseUrl = 'https://api.whatsapp.com/send';
    }
    if (!this.state.whatsappBotSettings.apiDispatchMode) {
      this.state.whatsappBotSettings.apiDispatchMode = 'DIRECT_WEB_API';
    }
    if (!this.state.whatsappBotSettings.defaultCountryCode) {
      this.state.whatsappBotSettings.defaultCountryCode = '20';
    }
    return this.state.whatsappBotSettings;
  }

  public updateWhatsAppBotSettings(settings: Partial<WhatsAppBotSettings>): WhatsAppBotSettings {
    this.state.whatsappBotSettings = {
      ...this.getWhatsAppBotSettings(),
      ...settings,
    };
    this.logAudit('UPDATE', 'تحديث إعدادات ربط واتساب API وقوالب الرسائل الجاهزة');
    this.saveState('WHATSAPP_SETTINGS');
    return this.state.whatsappBotSettings;
  }

  public getWhatsAppTemplates(): import('../types').WhatsAppMessageTemplate[] {
    const settings = this.getWhatsAppBotSettings();
    return settings.templates || [];
  }

  public saveWhatsAppTemplate(tmpl: import('../types').WhatsAppMessageTemplate): void {
    const current = this.getWhatsAppBotSettings();
    const templates = [...(current.templates || [])];
    const idx = templates.findIndex((t) => t.id === tmpl.id);

    if (idx >= 0) {
      templates[idx] = {
        ...tmpl,
        updatedAt: new Date().toISOString().slice(0, 16),
      };
    } else {
      templates.push({
        ...tmpl,
        id: tmpl.id || `tmpl-${Date.now()}`,
        updatedAt: new Date().toISOString().slice(0, 16),
      });
    }

    this.updateWhatsAppBotSettings({ templates });
    this.logAudit('UPDATE', `حفظ قالب رسائل واتساب: ${tmpl.title}`);
  }

  public deleteWhatsAppTemplate(id: string): boolean {
    const current = this.getWhatsAppBotSettings();
    const templates = (current.templates || []).filter((t) => t.id !== id);
    this.updateWhatsAppBotSettings({ templates });
    this.logAudit('DELETE', `حذف قالب رسائل واتساب برقم: ${id}`);
    return true;
  }

  public resetWhatsAppTemplatesToDefault(): void {
    this.updateWhatsAppBotSettings({
      templates: [...(DEFAULT_WHATSAPP_BOT_SETTINGS.templates || [])],
    });
    this.logAudit('UPDATE', 'استعادة قوالب رسائل واتساب الافتراضية');
  }

  public batchUpdateClientPhones(updates: { clientId: string; phone: string; contactPerson?: string }[]): number {
    let count = 0;
    updates.forEach((u) => {
      const client = this.state.clients.find((c) => c.id === u.clientId);
      if (client) {
        client.phone = u.phone;
        if (u.contactPerson !== undefined) {
          client.contactPerson = u.contactPerson;
        }
        client.updatedAt = new Date().toISOString().slice(0, 10);
        count++;
      }
    });

    if (count > 0) {
      this.logAudit('UPDATE', `تحديث وتثبيت أرقام هواتف واتساب لـ ${count} عميل`);
      this.saveState('CLIENTS');
    }
    return count;
  }

  // --- Multi-Currency & Daily Exchange Rates (EAS 13) ---
  public getExchangeRates(currency?: CurrencyCode, date?: string): DailyExchangeRateRecord[] {
    let rates = [...(this.state.exchangeRates || [])];
    if (currency) {
      rates = rates.filter((r) => r.currency === currency);
    }
    if (date) {
      rates = rates.filter((r) => r.date === date);
    }
    return rates.sort((a, b) => b.date.localeCompare(a.date));
  }

  public getDailyExchangeRate(currency: CurrencyCode, date?: string): DailyExchangeRateRecord | undefined {
    if (currency === 'EGP') return undefined;
    const all = this.state.exchangeRates || [];
    if (date) {
      const match = all.find((r) => r.currency === currency && r.date === date);
      if (match) return match;
    }
    // Fallback to latest available rate for this currency
    const currencyRates = all.filter((r) => r.currency === currency).sort((a, b) => b.date.localeCompare(a.date));
    return currencyRates[0];
  }

  public getExchangeRateValue(currency: CurrencyCode, date?: string): number {
    if (currency === 'EGP') return 1;
    const rateRecord = this.getDailyExchangeRate(currency, date);
    return rateRecord ? rateRecord.officialRate || rateRecord.sellRate || 1 : 1;
  }

  public saveExchangeRate(record: Omit<DailyExchangeRateRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): DailyExchangeRateRecord {
    if (!this.state.exchangeRates) {
      this.state.exchangeRates = [];
    }
    const existingIndex = record.id 
      ? this.state.exchangeRates.findIndex((r) => r.id === record.id)
      : this.state.exchangeRates.findIndex((r) => r.currency === record.currency && r.date === record.date);

    const now = new Date().toISOString();
    let saved: DailyExchangeRateRecord;

    if (existingIndex >= 0) {
      saved = {
        ...this.state.exchangeRates[existingIndex],
        ...record,
        updatedAt: now,
      };
      this.state.exchangeRates[existingIndex] = saved;
      this.logAudit('UPDATE', `تحديث سعر صرف يومي: [${saved.currency}] ليوم ${saved.date} بقيمة ${saved.officialRate} ج.م`);
    } else {
      saved = {
        ...record,
        id: record.id || `fx-rate-${record.date}-${(record.currency || 'egp').toLowerCase()}-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      this.state.exchangeRates.push(saved);
      this.logAudit('CREATE', `إضافة سعر صرف يومي جديد: [${saved.currency}] ليوم ${saved.date} بقيمة ${saved.officialRate} ج.م`);
    }

    this.saveState('EXCHANGE_RATES');
    return saved;
  }

  public saveBulkExchangeRates(records: Array<Omit<DailyExchangeRateRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>): void {
    records.forEach((r) => {
      if (!this.state.exchangeRates) {
        this.state.exchangeRates = [];
      }
      const existingIndex = r.id 
        ? this.state.exchangeRates.findIndex((item) => item.id === r.id)
        : this.state.exchangeRates.findIndex((item) => item.currency === r.currency && item.date === r.date);

      const now = new Date().toISOString();
      if (existingIndex >= 0) {
        this.state.exchangeRates[existingIndex] = {
          ...this.state.exchangeRates[existingIndex],
          ...r,
          updatedAt: now,
        };
      } else {
        this.state.exchangeRates.push({
          ...r,
          id: r.id || `fx-rate-${r.date}-${(r.currency || 'egp').toLowerCase()}-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    this.logAudit('UPDATE', `تحديث دفعة أسعار صرف لـ ${records.length} عملة بنجاح`);
    this.saveState('EXCHANGE_RATES');
  }

  public deleteExchangeRate(id: string): boolean {
    if (!this.state.exchangeRates) return false;
    const initialLen = this.state.exchangeRates.length;
    this.state.exchangeRates = this.state.exchangeRates.filter((r) => r.id !== id);
    if (this.state.exchangeRates.length < initialLen) {
      this.logAudit('DELETE', `حذف سجل سعر صرف برقم: ${id}`);
      this.saveState('EXCHANGE_RATES');
      return true;
    }
    return false;
  }

  public setReportingCurrency(currency: CurrencyCode): void {
    this.updatePreferences({ reportingCurrency: currency });
    this.logAudit('UPDATE', `تغيير عملة التقرير والعرض المعتمدة إلى: [${currency}]`);
  }

  // ==========================================
  // FEE ESTIMATOR & QUOTATION MANAGEMENT METHODS
  // ==========================================
  public getFeeEstimates(): FeeQuotationEstimate[] {
    return this.state.feeEstimates || [];
  }

  public saveFeeEstimate(estimate: FeeQuotationEstimate): FeeQuotationEstimate {
    if (!this.state.feeEstimates) {
      this.state.feeEstimates = [];
    }
    const existingIndex = this.state.feeEstimates.findIndex((q) => q.id === estimate.id);
    if (existingIndex >= 0) {
      this.state.feeEstimates[existingIndex] = { ...estimate };
      this.logAudit('UPDATE', `تحديث عرض السعر وتقدير الأتعاب رقم: ${estimate.quotationNumber} للعميل: ${estimate.clientName}`);
    } else {
      this.state.feeEstimates.unshift(estimate);
      this.logAudit('CREATE', `إنشاء تقدير أتعاب وعرض سعر جديد: ${estimate.quotationNumber} بمبلغ ${estimate.totalQuotationAmount.toLocaleString()} ج.م`);
    }
    this.saveState('FEE_ESTIMATES');
    return estimate;
  }

  public deleteFeeEstimate(id: string): boolean {
    if (!this.state.feeEstimates) return false;
    const initialLen = this.state.feeEstimates.length;
    const quote = this.state.feeEstimates.find((q) => q.id === id);
    this.state.feeEstimates = this.state.feeEstimates.filter((q) => q.id !== id);
    if (this.state.feeEstimates.length < initialLen) {
      this.logAudit('DELETE', `حذف تقدير الأتعاب وعرض السعر رقم: ${quote?.quotationNumber || id}`);
      this.saveState('FEE_ESTIMATES');
      return true;
    }
    return false;
  }

  public updateFeeEstimateStatus(id: string, status: FeeQuotationEstimate['status']): boolean {
    if (!this.state.feeEstimates) return false;
    const item = this.state.feeEstimates.find((q) => q.id === id);
    if (item) {
      item.status = status;
      this.logAudit('UPDATE', `تحديث حالة عرض السعر رقم: ${item.quotationNumber} إلى: ${status}`);
      this.saveState('FEE_ESTIMATES');
      return true;
    }
    return false;
  }

  // --- Customs, Global Trade & Landed Cost Module (منظومة الجمارك والتجارة الخارجية) ---
  public getCustomsShipments(): CustomsShipment[] {
    return this.state.customsShipments || [];
  }

  public getCustomsShipmentById(id: string): CustomsShipment | undefined {
    return (this.state.customsShipments || []).find((s) => s.id === id);
  }

  public saveCustomsShipment(shipment: CustomsShipment): CustomsShipment {
    if (!this.state.customsShipments) {
      this.state.customsShipments = [];
    }
    const idx = this.state.customsShipments.findIndex((s) => s.id === shipment.id);
    const now = new Date().toISOString();
    const updatedShipment: CustomsShipment = {
      ...shipment,
      updatedAt: now,
    };

    if (idx >= 0) {
      this.state.customsShipments[idx] = updatedShipment;
      this.logAudit('UPDATE', `تحديث بيانات الشحنة الجمركية رقم [${shipment.shipmentCode}] (${shipment.title})`);
    } else {
      updatedShipment.createdAt = updatedShipment.createdAt || now;
      this.state.customsShipments.unshift(updatedShipment);
      this.logAudit('CREATE', `تسجيل شحنة جمركية جديدة رقم [${shipment.shipmentCode}]: ${shipment.title} للعميل: ${shipment.clientName}`);
    }
    this.saveState('CUSTOMS_SHIPMENTS');
    return updatedShipment;
  }

  public deleteCustomsShipment(id: string): boolean {
    if (!this.state.customsShipments) return false;
    const target = this.state.customsShipments.find((s) => s.id === id);
    if (!target) return false;
    this.state.customsShipments = this.state.customsShipments.filter((s) => s.id !== id);
    this.logAudit('DELETE', `حذف ملف الشحنة الجمركية رقم [${target.shipmentCode}] - ${target.title}`);
    this.saveState('CUSTOMS_SHIPMENTS');
    return true;
  }

  public generateCustomsJournalEntries(shipmentId: string): { entryGoodsInTransit: JournalEntry; entryDuties?: JournalEntry; entryClosing?: JournalEntry } | null {
    const shipment = this.getCustomsShipmentById(shipmentId);
    if (!shipment) return null;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Entry 1: إثبات بضاعة بالطريق واعتماد مستندي خارجي (CIF Value)
    const entryGoodsInTransit = this.addJournalEntry({
      date: today,
      description: `إثبات فتح اعتماد مستندي وبضاعة مشحونة بالطريق - شحنة رقم ${shipment.shipmentCode} (${shipment.title})`,
      referenceNumber: shipment.shipmentCode,
      entryType: 'PURCHASE',
      lines: [
        {
          id: `line-${Date.now()}-1`,
          accountId: 'acc-123',
          accountCode: '123',
          accountName: 'اعتمادات مستندية لشراء بضائع ومهمات بالطريق',
          debit: shipment.cifValueEgp,
          credit: 0,
          description: `قيمة البضاعة سيف بالعملة الأجنبية (${shipment.cifValueForeign.toLocaleString()} ${shipment.invoiceCurrency}) بسعر صرف ${shipment.customsExchangeRate}`,
        },
        {
          id: `line-${Date.now()}-2`,
          accountId: 'acc-211',
          accountCode: '2112',
          accountName: 'موردون خارجيون - التزامات اعتمادات مستندية',
          debit: 0,
          credit: shipment.cifValueEgp,
          description: `استحقاق المورد الأجنبي: ${shipment.foreignExporterName} - اعتماد ${shipment.bankForm4Number || ''}`,
        },
      ],
      totalDebit: shipment.cifValueEgp,
      totalCredit: shipment.cifValueEgp,
      isPosted: true,
      clientId: shipment.clientId,
      clientName: shipment.clientName,
    });

    // 2. Entry 2: إثبات الرسوم الجمركية والضرائب والمصاريف الإنزالية
    const totalCustomsAndExpenses = (shipment.customsDutyAmount || 0) + (shipment.developmentFeeAmount || 0) + (shipment.totalAdditionalExpenses || 0);
    const vatInput = shipment.vatAmount || 0;
    const whtInput = shipment.withholdingTaxAmount || 0;

    let entryDuties: JournalEntry | undefined = undefined;
    if (totalCustomsAndExpenses > 0 || vatInput > 0) {
      entryDuties = this.addJournalEntry({
        date: today,
        description: `إثبات سداد الرسوم الجمركية وضريبة القيمة المضافة ومصاريف التخليص - شحنة ${shipment.shipmentCode}`,
        referenceNumber: shipment.customsDeclarationNumber || shipment.shipmentCode,
        entryType: 'PURCHASE',
        lines: [
          {
            id: `line-${Date.now()}-3`,
            accountId: 'acc-123',
            accountCode: '123',
            accountName: 'اعتمادات مستندية لشراء بضائع ومهمات بالطريق (رسملة جمارك ومصاريف)',
            debit: totalCustomsAndExpenses,
            credit: 0,
            description: `ضريبة جمركية (${shipment.customsDutyAmount.toLocaleString()}) + رسم تنمية (${shipment.developmentFeeAmount.toLocaleString()}) + مصاريف موانئ ونقل وتخليص (${shipment.totalAdditionalExpenses.toLocaleString()})`,
          },
          ...(vatInput > 0 ? [{
            id: `line-${Date.now()}-4`,
            accountId: 'acc-128',
            accountCode: '1281',
            accountName: 'مصلحة الضرائب - ضريبة القيمة المضافة مدخلات قابلة للخصم (14%)',
            debit: vatInput,
            credit: 0,
            description: `ضريبة ق.م جمركية مسددة بموجب إفراج جمركي 13 لمصلحة الجمارك`,
          }] : []),
          ...(whtInput > 0 ? [{
            id: `line-${Date.now()}-5`,
            accountId: 'acc-1282',
            accountCode: '1282',
            accountName: 'مصلحة الضرائب - مبالغ مسددة تحت حساب الضريبة (خصم جمركي 1%)',
            debit: whtInput,
            credit: 0,
            description: `خصم وتحصيل جمركي تحت حساب ضريبة أرباح الشركات`,
          }] : []),
          {
            id: `line-${Date.now()}-6`,
            accountId: 'acc-191',
            accountCode: '191',
            accountName: 'النقدية وما في حكمها / البنك وسداد منظومة نافذة',
            debit: 0,
            credit: totalCustomsAndExpenses + vatInput + (whtInput > 0 ? whtInput : 0),
            description: `سداد إلكتروني عبر منظومة التحصيل المالي الموحدة لمنظومة نافذة والجمارك`,
          },
        ],
        totalDebit: totalCustomsAndExpenses + vatInput + (whtInput > 0 ? whtInput : 0),
        totalCredit: totalCustomsAndExpenses + vatInput + (whtInput > 0 ? whtInput : 0),
        isPosted: true,
        clientId: shipment.clientId,
        clientName: shipment.clientName,
      });
    }

    // 3. Entry 3: إقفال الاعتماد المستندي ورسملة التكلفة الإنزالية الكلية في المخزن
    let entryClosing: JournalEntry | undefined = undefined;
    if (shipment.status === 'RECEIVED_WAREHOUSE' || shipment.status === 'RELEASED') {
      entryClosing = this.addJournalEntry({
        date: today,
        description: `إقفال حساب الاعتمادات المستندية وإثبات استلام البضاعة بالمخازن بالتكلفة الإنزالية النهائية - شحنة ${shipment.shipmentCode}`,
        referenceNumber: `INV-STORE-${shipment.shipmentCode}`,
        entryType: 'ADJUSTING',
        lines: [
          {
            id: `line-${Date.now()}-7`,
            accountId: 'acc-121',
            accountCode: '121',
            accountName: 'مخزون بضائع ومهمات وخامات مشتراة',
            debit: shipment.totalLandedCostEgp,
            credit: 0,
            description: `التكلفة الإنزالية الكلية للبضاعة الواردة بعد تحميل كافة الرسوم والمصاريف الجمركية للمخزن`,
          },
          {
            id: `line-${Date.now()}-8`,
            accountId: 'acc-123',
            accountCode: '123',
            accountName: 'اعتمادات مستندية لشراء بضائع ومهمات بالطريق',
            debit: 0,
            credit: shipment.totalLandedCostEgp,
            description: `إقفال رصيد الاعتماد المستندي واستلام البضاعة بالمستودع`,
          },
        ],
        totalDebit: shipment.totalLandedCostEgp,
        totalCredit: shipment.totalLandedCostEgp,
        isPosted: true,
        clientId: shipment.clientId,
        clientName: shipment.clientName,
      });
    }

    // Link created entry IDs to shipment
    const linkedIds = [entryGoodsInTransit.id, ...(entryDuties ? [entryDuties.id] : []), ...(entryClosing ? [entryClosing.id] : [])];
    shipment.linkedJournalEntryIds = Array.from(new Set([...(shipment.linkedJournalEntryIds || []), ...linkedIds]));
    this.saveCustomsShipment(shipment);

    return {
      entryGoodsInTransit,
      entryDuties,
      entryClosing,
    };
  }

  public payCustomsFromOfficeTreasury(
    shipmentId: string,
    payload: {
      amount: number;
      category: string;
      description: string;
      paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
      treasuryType: 'OFFICE_MAIN_VAULT' | 'BANK_CURRENT_ACCOUNT' | 'PETTY_CASH';
      paidBy?: string;
    }
  ): OfficeTreasuryTransaction | null {
    const shipment = this.getCustomsShipmentById(shipmentId);
    if (!shipment) return null;

    const tx = this.addTreasuryTransaction({
      date: new Date().toISOString().slice(0, 10),
      type: 'EXPENSE_CLIENT_GOV_FEE',
      category: payload.category || 'رسوم ومصروفات جمركية ونافذة',
      amount: payload.amount,
      clientId: shipment.clientId,
      clientName: shipment.clientName,
      paymentMethod: payload.paymentMethod === 'CHEQUE' ? 'CHEQUE' : payload.paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH',
      description: `${payload.description || `سداد رسوم جمركية ومصروفات تخليص عن شحنة [${shipment.shipmentCode}]`} (ACID: ${shipment.acidNumber} - بوليصة: ${shipment.blNumber})`,
      recordedBy: payload.paidBy || this.state.officeProfile.auditorName || 'محمد جميل مرعي',
    });

    if (!shipment.linkedTreasuryTransactionIds) shipment.linkedTreasuryTransactionIds = [];
    shipment.linkedTreasuryTransactionIds.push(tx.id);
    this.saveCustomsShipment(shipment);

    return tx;
  }

  public saveCustomsDocToClientArchive(
    shipmentId: string,
    clientId: string,
    payload: {
      title: string;
      docType: 'CONTRACT' | 'TAX_CARD' | 'COMMERCIAL_REG' | 'FINANCIAL_STATEMENT' | 'POWER_OF_ATTORNEY' | 'MEMO' | 'OTHER';
      fileDataUrl?: string;
      fileName?: string;
      remarks?: string;
    }
  ): ClientDocument | null {
    const shipment = this.getCustomsShipmentById(shipmentId);
    const client = this.state.clients.find((c) => c.id === clientId);
    if (!client) return null;

    let customsFolder = client.folders?.find((f) => f.name.includes('جمارك') || f.name.includes('استيراد') || f.name.includes('شحن'));
    if (!customsFolder) {
      customsFolder = this.addClientFolder(clientId, {
        name: 'مستندات الجمارك والتجارة الخارجية',
        icon: 'archive',
        color: 'indigo',
        description: 'بوالص الشحن، الفواتير التجارية، شهادات المنشأ وإفراجات نافذة',
      });
    }

    const doc = this.addClientDocument(clientId, {
      title: payload.title,
      documentType: 'OTHER',
      fileName: payload.fileName || `${payload.title}.pdf`,
      fileSize: '1.2 MB',
      fileDataUrl: payload.fileDataUrl || 'data:application/pdf;base64,JVBERi0xLjQKJ...',
      folderId: customsFolder?.id,
      folderName: customsFolder?.name,
      notes: payload.remarks || `مرتبط بالشحنة الجمركية: ${shipment?.shipmentCode || ''}`,
    });

    if (doc && shipment) {
      if (!shipment.archiveDocumentIds) shipment.archiveDocumentIds = [];
      shipment.archiveDocumentIds.push(doc.id);
      this.saveCustomsShipment(shipment);
    }

    return doc;
  }
}

export const db = new LocalDatabase();
