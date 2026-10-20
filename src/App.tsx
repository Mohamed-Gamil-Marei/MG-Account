import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  BookOpen,
  FolderTree,
  Scale,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Receipt,
  Coins,
  Menu,
  Users,
  AlertCircle,
  ArrowLeftRight,
  Landmark,
  Link2,
  Database,
  Trash2,
  Upload,
} from 'lucide-react';
import { EtaExcelImportModal } from './components/invoicing/EtaExcelImportModal';
import { BackupRestoreModal } from './components/backup/BackupRestoreModal';
import { importModelData } from './utils/dataImportExport';
import { db, DatabaseState } from './db/localDatabase';
import { canPerform } from './services/accessGuard';
import { AutoSaveStatusBadge } from './components/common/AutoSaveStatusBadge';
import {
  Account,
  ClientActivityTemplate,
  CurrencyCode,
  InvoiceType,
  JournalEntry,
  JournalEntryLine,
  NavigationTab,
} from './types';
import { getCairoDateString, getCairoCurrentYear, formatCairoDateTimeArabic } from './utils/cairoTime';
import { Sidebar, getParentHub } from './components/Sidebar';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { LanguageToggle } from './components/LanguageToggle';
import { TrialBalanceView } from './components/TrialBalanceView';
import { FinancialStatementsView } from './components/FinancialStatementsView';
import { AuditorReportView } from './components/AuditorReportView';
import { UnifiedFinancialReportsView } from './components/UnifiedFinancialReportsView';
import { OfficeTreasuryView } from './components/OfficeTreasuryView';
import { AuditTrailView } from './components/AuditTrailView';
import { UnassignedEntriesView } from './components/UnassignedEntriesView';
import { AccountMappingView } from './components/AccountMappingView';
import { PostingEngineService } from './services/PostingEngineService';
import { LicenseManagementModal } from './components/LicenseManagementModal';
import { YearEndClosingWizardModal } from './components/accounting/YearEndClosingWizardModal';
import { AuditConfirmationsGenerator } from './components/audit/AuditConfirmationsGenerator';
import { InternalControlRiskMatrix } from './components/audit/InternalControlRiskMatrix';
import { SmartExcelAuditSentinelView } from './components/audit/SmartExcelAuditSentinelView';
import { CpaAutonomousCommandDeck } from './components/dashboard/CpaAutonomousCommandDeck';
import { SmartCpaTemplateView } from './components/financial/SmartCpaTemplateView';
import { FeeEstimatorView } from './components/practice/FeeEstimatorView';
import { WhatsAppLiveChatPanel } from './components/practice/WhatsAppLiveChatPanel';
import { UnifiedTaxFilingAgendaView } from './components/tax/UnifiedTaxFilingAgendaView';
import { ClientTaxPortalCredentialsModal } from './components/tax/ClientTaxPortalCredentialsModal';
import { DensityProvider } from './components/common/CompactDensityContext';
import {
  getVisibleClients,
  isCrossClientTab,
  isClientScopedTab,
  isClientSubjectToTax,
  migrateClientTaxSubjectFlagsOnce,
} from './config/screenScope';

export const App: React.FC = () => {
  const [state, setState] = useState<DatabaseState>(() => db.getState());
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const tab = params.get('tab');
      if (view === 'tax-credentials' || tab === 'TAX_AUDIT_HUB' || tab === 'TAX') {
        return 'TAX_AUDIT_HUB';
      }
      if (tab === 'CLIENTS_ARCHIVE' || tab === 'CLIENTS') {
        return 'CLIENTS_ARCHIVE';
      }
    }
    return 'DASHBOARD';
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isClosingWizardOpen, setIsClosingWizardOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [isEtaImportModalOpen, setIsEtaImportModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [taxCredentialsModalClientId, setTaxCredentialsModalClientId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'tax-credentials') {
        const s = db.getState();
        return s.activeClientContext?.clientId || s.clients[0]?.id || null;
      }
    }
    return null;
  });
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reversal Modal State (Principle 3 & 4)
  const [reversalTarget, setReversalTarget] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversalDate, setReversalDate] = useState<string>(() => getCairoDateString());

  // New Journal Entry Form State (Principle 1, 5, 6)
  const [jeDate, setJeDate] = useState<string>(() => getCairoDateString());
  const [jeDesc, setJeDesc] = useState<string>('');
  const [jeCurrency, setJeCurrency] = useState<CurrencyCode>('EGP');
  const [jeExchangeRate, setJeExchangeRate] = useState<number>(1);
  const [jePostImmediately, setJePostImmediately] = useState<boolean>(false);
  const [jeLines, setJeLines] = useState<{ accountCode: string; debit: number; credit: number; description: string }[]>([
    { accountCode: '1101', debit: 0, credit: 0, description: '' },
    { accountCode: '4101', debit: 0, credit: 0, description: '' },
  ]);

  // New Account Form State (Principle 1 & 2)
  const [newAccCode, setNewAccCode] = useState<string>('');
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccCategory, setNewAccCategory] = useState<'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'REVENUES' | 'EXPENSES'>('ASSETS');
  const [newAccOpeningDebit, setNewAccOpeningDebit] = useState<number>(0);
  const [newAccOpeningCredit, setNewAccOpeningCredit] = useState<number>(0);

  // New Client Modal State
  const [isAddClientOpen, setIsAddClientOpen] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientTaxId, setNewClientTaxId] = useState<string>('');
  const [newClientCommReg, setNewClientCommReg] = useState<string>('');
  const [newClientFees, setNewClientFees] = useState<number>(0);
  const [newClientActivityTemplate, setNewClientActivityTemplate] =
    useState<ClientActivityTemplate>('COMMERCIAL');
  const [newClientFiscalYear, setNewClientFiscalYear] = useState<number>(() => getCairoCurrentYear());
  const [newClientEndMonth, setNewClientEndMonth] = useState<number>(12);
  const [newClientFiscalStart, setNewClientFiscalStart] = useState<string>(
    () => `${getCairoCurrentYear()}-01-01`
  );
  const [newClientFiscalEnd, setNewClientFiscalEnd] = useState<string>(
    () => `${getCairoCurrentYear()}-12-31`
  );
  const [newClientIsVat, setNewClientIsVat] = useState<boolean>(true);
  const [newClientIsIncome, setNewClientIsIncome] = useState<boolean>(true);
  const [newClientIsWht, setNewClientIsWht] = useState<boolean>(false);
  const [newClientIsStamp, setNewClientIsStamp] = useState<boolean>(false);
  const [newClientHasPayroll, setNewClientHasPayroll] = useState<boolean>(false);

  // Quick Client Picker State for CLIENT_SCOPED_TABS
  const [isQuickClientPickerOpen, setIsQuickClientPickerOpen] = useState<boolean>(false);
  const [quickPickerSearch, setQuickPickerSearch] = useState<string>('');
  const [recentClientIds, setRecentClientIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('mg_recent_client_ids');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // New Invoice Form State
  const [invClientId, setInvClientId] = useState<string>('');
  const [invNumber, setInvNumber] = useState<string>('');
  const [invPartner, setInvPartner] = useState<string>('');
  const [invType, setInvType] = useState<InvoiceType>('SALES');
  const [invSubtotal, setInvSubtotal] = useState<number>(0);
  const [invVat, setInvVat] = useState<number>(0);
  const [invWht, setInvWht] = useState<number>(0);
  const [invTableTax, setInvTableTax] = useState<number>(0);
  const [invCurrency, setInvCurrency] = useState<CurrencyCode>('EGP');
  const [invPaymentMethod, setInvPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CREDIT'>('CREDIT');
  const [fxRateDate, setFxRateDate] = useState<string>(() => getCairoDateString());
  const [fxRateCurrency, setFxRateCurrency] = useState<CurrencyCode>('USD');
  const [fxRateValue, setFxRateValue] = useState<number>(50);

  // New Fixed Asset Form State
  const [assetName, setAssetName] = useState<string>('');
  const [assetCost, setAssetCost] = useState<number>(0);
  const [assetRate, setAssetRate] = useState<number>(20);

  const [migrationSummaryNotice, setMigrationSummaryNotice] = useState<string | null>(null);
  const [storageFailureError, setStorageFailureError] = useState<string | null>(() =>
    db.hasStorageWriteFailure()
      ? db.getLastStorageWriteError() || 'فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن'
      : null
  );
  const [firstAdminName, setFirstAdminName] = useState<string>('');
  const [firstAdminEmail, setFirstAdminEmail] = useState<string>('admin@office.eg');
  const [firstAdminPassword, setFirstAdminPassword] = useState<string>('');
  const [firstAdminConfirmPassword, setFirstAdminConfirmPassword] = useState<string>('');
  const [firstAdminError, setFirstAdminError] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageError = (ev: Event) => {
      const customEv = ev as CustomEvent<{ message?: string }>;
      setStorageFailureError(
        customEv.detail?.message || 'فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن'
      );
    };
    const handleStorageSuccess = () => {
      setStorageFailureError(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mg:storage-write-error', handleStorageError);
      window.addEventListener('mg:storage-write-success', handleStorageSuccess);
    }

    const current = db.getState();
    if (!current.taxSubjectMigrationDone && !current.migrationDone) {
      const res = migrateClientTaxSubjectFlagsOnce(current);
      current.taxSubjectMigrationNotificationPending = false;
      try {
        db.saveState('CLIENTS');
      } catch {
        // StorageWriteError handled via global event
      }
      setMigrationSummaryNotice(
        `تم ترحيل وتحديث علامات الخضوع الضريبي تلقائياً لعدد (${res.migratedCount}) من العملاء بناءً على الفواتير والإقرارات وبيانات المرتبات المسجلة.`
      );
    } else if (current.taxSubjectMigrationNotificationPending) {
      const count = current.lastTaxSubjectMigrationCount ?? 0;
      current.taxSubjectMigrationNotificationPending = false;
      try {
        db.saveState('CLIENTS');
      } catch {
        // StorageWriteError handled via global event
      }
      if (count > 0) {
        setMigrationSummaryNotice(
          `تم ترحيل وتحديث علامات الخضوع الضريبي تلقائياً لعدد (${count}) من العملاء بناءً على الفواتير والإقرارات وبيانات المرتبات المسجلة.`
        );
      }
    }
    const unsub = db.subscribe(() => {
      setState({ ...db.getState() });
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('mg:storage-write-error', handleStorageError);
        window.removeEventListener('mg:storage-write-success', handleStorageSuccess);
      }
    };
  }, []);

  const currentUser = db.getCurrentUser();
  const visibleClients = useMemo(
    () => getVisibleClients(state, currentUser),
    [state.clients, state.users, state.currentUserId, currentUser]
  );

  // Requirement 6: activeClientContext is mandatory for accounting screens (do not silently fallback if null)
  const activeClientId = state.activeClientContext?.clientId || '';
  const activeClient = useMemo(
    () => (activeClientId ? visibleClients.find((c) => c.id === activeClientId) || null : null),
    [visibleClients, activeClientId]
  );
  const selectedFiscalYear =
    state.activeClientContext?.selectedFiscalYear ||
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    getCairoCurrentYear();
  const activeFiscalBounds = useMemo(
    () => db.getClientFiscalYearBounds(activeClientId, selectedFiscalYear),
    [activeClientId, selectedFiscalYear, state.clients]
  );
  const unassignedEntriesCount = useMemo(
    () => db.getUnassignedJournalEntries().length,
    [state.journalEntries, state.clients]
  );

  const clientAccounts = useMemo(
    () => (activeClientId && activeClient ? db.getClientAccounts(activeClientId, selectedFiscalYear) : []),
    [
      activeClientId,
      activeClient,
      selectedFiscalYear,
      state.accounts,
      state.openingBalances,
      state.clientOpeningBalances,
    ]
  );

  const clientJournalEntries = useMemo(
    () =>
      activeClientId && activeClient
        ? state.journalEntries.filter((j) => {
            if (j.clientId !== activeClientId) return false;
            if (j.fiscalYear) return j.fiscalYear === selectedFiscalYear;
            return j.date >= activeFiscalBounds.startDate && j.date <= activeFiscalBounds.endDate;
          })
        : [],
    [
      state.journalEntries,
      activeClientId,
      activeClient,
      selectedFiscalYear,
      activeFiscalBounds.startDate,
      activeFiscalBounds.endDate,
    ]
  );

  const visibleClientIdSet = useMemo(() => new Set(visibleClients.map((c) => c.id)), [visibleClients]);

  const clientInvoices = useMemo(
    () =>
      activeClientId && activeClient
        ? state.invoices.filter((i) => i.clientId === activeClientId)
        : state.invoices.filter((i) => visibleClientIdSet.has(i.clientId)),
    [state.invoices, activeClientId, activeClient, visibleClientIdSet]
  );

  const clientFixedAssets = useMemo(
    () => (activeClientId && activeClient ? state.fixedAssets.filter((a) => a.clientId === activeClientId) : []),
    [state.fixedAssets, activeClientId, activeClient]
  );

  const parentHub = getParentHub(activeTab);

  const notifyBanner = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => {
      setBannerMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const recordRecentClient = (clientId: string) => {
    if (!clientId) return;
    setRecentClientIds((prev) => {
      const next = [clientId, ...prev.filter((id) => id !== clientId)].slice(0, 5);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('mg_recent_client_ids', JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleSelectClient = (clientId: string) => {
    if (!clientId) {
      db.setActiveClient(null);
      setIsQuickClientPickerOpen(true);
      return;
    }
    db.setActiveClient(clientId, { fiscalYear: selectedFiscalYear, autoFilter: true });
    recordRecentClient(clientId);
    setIsQuickClientPickerOpen(false);
    notifyBanner('success', 'تم تبديل المنشأة النشطة وعزل البيانات المحاسبية ودليل الحسابات.');
  };

  const handleSelectFiscalYear = (year: number) => {
    db.updateActiveClientFiscalYear(year);
    notifyBanner('success', `تم التبديل إلى السنة المالية ${year} وتحميل الأرصدة الافتتاحية المستقلة.`);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      const created = db.addClient({
        name: newClientName.trim(),
        taxId: newClientTaxId.trim(),
        taxCardNo: newClientTaxId.trim(),
        commercialRegister: newClientCommReg.trim(),
        annualAgreedFees: Number(newClientFees) || 0,
        activityTemplate: newClientActivityTemplate,
        fiscalYear: newClientFiscalYear,
        activeFiscalYear: newClientFiscalYear,
        fiscalYearEndMonth: newClientEndMonth,
        fiscalYearStart: newClientFiscalStart,
        fiscalYearEnd: newClientFiscalEnd,
        isVatSubject: newClientIsVat,
        isVatRegistered: newClientIsVat,
        isIncomeTaxSubject: newClientIsIncome,
        isWhtSubject: newClientIsWht,
        isWithholdingTaxSubject: newClientIsWht,
        isStampTaxSubject: newClientIsStamp,
        hasPayroll: newClientHasPayroll,
        isPayrollTaxSubject: newClientHasPayroll,
      });
      db.setActiveClient(created.id, { fiscalYear: newClientFiscalYear, autoFilter: true });
      recordRecentClient(created.id);
      setIsQuickClientPickerOpen(false);
      setNewClientName('');
      setNewClientTaxId('');
      setNewClientCommReg('');
      setNewClientFees(0);
      setIsAddClientOpen(false);
      notifyBanner(
        'success',
        `تم إنشاء ملف المنشأة (${created.name}) بنسخة مستقلة من دليل الحسابات (${newClientActivityTemplate}) وبأرصدة افتتاحية صفرية.`
      );
    } catch (err) {
      notifyBanner('error', err instanceof Error ? err.message : 'تعذر إضافة العميل');
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim()) return;
    try {
      const nature = newAccCategory === 'ASSETS' || newAccCategory === 'EXPENSES' ? 'DEBIT' : 'CREDIT';
      const created = db.addAccount({
        clientId: activeClientId,
        code: newAccCode.trim(),
        name: newAccName.trim(),
        category: newAccCategory,
        nature,
        level: 4,
        openingBalanceDebit: Number(newAccOpeningDebit) || 0,
        openingBalanceCredit: Number(newAccOpeningCredit) || 0,
      });
      if (newAccOpeningDebit > 0 || newAccOpeningCredit > 0) {
        db.setClientAccountOpeningBalance(
          activeClientId,
          selectedFiscalYear,
          created.code,
          Number(newAccOpeningDebit) || 0,
          Number(newAccOpeningCredit) || 0,
          'رصيد افتتاحي عند إنشاء الحساب'
        );
      }
      setNewAccCode('');
      setNewAccName('');
      setNewAccOpeningDebit(0);
      setNewAccOpeningCredit(0);
      notifyBanner('success', `تم إضافة الحساب (${created.code} - ${created.name}) لدليل العميل.`);
    } catch (err) {
      notifyBanner('error', err instanceof Error ? err.message : 'تعذر إضافة الحساب');
    }
  };

  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rate = jeCurrency === 'EGP' ? 1 : Number(jeExchangeRate) || db.getExchangeRateValue(jeCurrency, jeDate);
      const builtLines: JournalEntryLine[] = jeLines
        .filter((l) => l.accountCode && (Number(l.debit) > 0 || Number(l.credit) > 0))
        .map((l, idx) => {
          const acc = clientAccounts.find((a) => a.code === l.accountCode);
          const foreignDebit = jeCurrency !== 'EGP' ? Number(l.debit) || 0 : undefined;
          const foreignCredit = jeCurrency !== 'EGP' ? Number(l.credit) || 0 : undefined;
          const debitEgp = jeCurrency !== 'EGP' ? Number(((Number(l.debit) || 0) * rate).toFixed(2)) : Number(l.debit) || 0;
          const creditEgp = jeCurrency !== 'EGP' ? Number(((Number(l.credit) || 0) * rate).toFixed(2)) : Number(l.credit) || 0;
          return {
            id: `jl-${Date.now()}-${idx}`,
            accountId: acc?.id,
            accountCode: l.accountCode,
            accountName: acc?.name || l.accountCode,
            debit: debitEgp,
            credit: creditEgp,
            foreignDebit,
            foreignCredit,
            currency: jeCurrency,
            exchangeRate: rate,
            description: l.description || jeDesc,
            clientId: activeClientId,
          };
        });

      if (builtLines.length < 2) {
        notifyBanner('error', 'يجب إدخال طرفين على الأقل في القيد المحاسبي.');
        return;
      }
      const totalDr = builtLines.reduce((s, l) => s + l.debit, 0);
      const totalCr = builtLines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDr - totalCr) > 0.01) {
        notifyBanner('error', `القيد غير متوازن: المدين (${totalDr}) لا يساوي الدائن (${totalCr}).`);
        return;
      }

      db.addJournalEntry({
        clientId: activeClientId,
        clientName: activeClient?.name,
        fiscalYear: selectedFiscalYear,
        date: jeDate,
        description: jeDesc.trim() || 'قيد يومية',
        currency: jeCurrency,
        exchangeRate: rate,
        isPosted: jePostImmediately,
        status: jePostImmediately ? 'POSTED' : 'DRAFT',
        lines: builtLines,
      });

      setJeDesc('');
      setJeLines([
        { accountCode: clientAccounts[0]?.code || '1101', debit: 0, credit: 0, description: '' },
        { accountCode: clientAccounts[1]?.code || '4101', debit: 0, credit: 0, description: '' },
      ]);
      notifyBanner('success', 'تم حفظ القيد المحاسبي بنجاح وتوثيقه في سجل المراجعة.');
    } catch (err) {
      notifyBanner('error', err instanceof Error ? err.message : 'تعذر تسجيل القيد');
    }
  };

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;
    try {
      const rev = db.createReversalJournalEntry(reversalTarget.id, reversalReason, reversalDate);
      setReversalTarget(null);
      setReversalReason('');
      notifyBanner('success', `تم إصدار القيد العكسي رقم (${rev.entryNumber}) وتوثيقه في سجل المراجعة.`);
    } catch (err) {
      notifyBanner('error', err instanceof Error ? err.message : 'تعذر إصدار القيد العكسي');
    }
  };

  const renderAccountingSubNav = () => {
    const items: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'JOURNAL_ENTRIES', label: 'دفتر اليومية والقيود العكسية', icon: BookOpen },
      { id: 'CHART_OF_ACCOUNTS', label: 'دليل الحسابات والأرصدة الافتتاحية', icon: FolderTree },
      { id: 'TRIAL_BALANCE', label: 'ميزان المراجعة', icon: Scale },
      { id: 'ACCOUNT_MAPPING', label: 'ربط الحسابات', icon: Link2 },
      { id: 'UNASSIGNED_ENTRIES', label: `قيود غير منسوبة (${unassignedEntriesCount})`, icon: AlertCircle },
      { id: 'FILE_REVIEW', label: 'فحص ومراجعة ملفات الإكسيل', icon: FileSpreadsheet },
      { id: 'FIXED_ASSETS', label: 'سجل الأصول الثابتة والإهلاكات', icon: Landmark },
      { id: 'CURRENCY_EXCHANGE_RATES', label: 'أسعار الصرف اليومية (EGP)', icon: Coins },
    ];
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsClosingWizardOpen(true)}
          className="mr-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>إقفال السنة المالية وترحيل الأرصدة</span>
        </button>
      </div>
    );
  };

  const activityTemplateLabels: Record<ClientActivityTemplate, string> = {
    COMMERCIAL: 'نشاط تجاري (توريدات وتجارة)',
    INDUSTRIAL: 'نشاط صناعي (خامات وإنتاج وتشغيل)',
    SERVICE: 'نشاط خدمي واستشارات مهنية',
    CONTRACTING: 'نشاط مقاولات وتشييد (مستخلصات وضمان أعمال)',
  };

  const renderChartOfAccountsWorkspace = () => (
    <div className="space-y-6">
      {renderAccountingSubNav()}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              دليل الحسابات والأرصدة الافتتاحية المستقلة — {activeClient?.name}
            </h2>
            <p className="text-xs text-slate-500">
              السنة المالية النشطة: {selectedFiscalYear} ({activeFiscalBounds.startDate} إلى {activeFiscalBounds.endDate}) | القالب:{' '}
              {activityTemplateLabels[activeClient?.activityTemplate || 'COMMERCIAL']} | الأرصدة مخزنة في{' '}
              <code className="font-mono text-[11px]">
                openingBalances[{activeClientId}][{selectedFiscalYear}][accountId]
              </code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="قالب النشاط المحاسبي"
              value={activeClient?.activityTemplate || 'COMMERCIAL'}
              onChange={(e) => {
                const tpl = e.target.value as ClientActivityTemplate;
                const res = db.applyActivityTemplateToClient(activeClientId, tpl);
                notifyBanner('success', res.message);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="COMMERCIAL">قالب نشاط تجاري</option>
              <option value="INDUSTRIAL">قالب نشاط صناعي</option>
              <option value="SERVICE">قالب نشاط خدمي</option>
              <option value="CONTRACTING">قالب نشاط مقاولات</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs">
              <Upload className="h-3.5 w-3.5 text-indigo-600" />
              <span>استيراد دليل حسابات (إكسل/JSON)</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const res = await importModelData(f, 'ACCOUNTS');
                    if (res.success) {
                      notifyBanner('success', res.message);
                      setState({ ...db.getState() });
                    } else {
                      notifyBanner('error', res.message);
                    }
                  } catch (err: any) {
                    notifyBanner('error', err?.message || 'فشل استيراد الحسابات.');
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                try {
                  const res = db.rolloverClosingBalancesToNextYear(activeClientId, selectedFiscalYear);
                  notifyBanner(
                    'success',
                    `تم ترحيل أرصدة آخر المدة للسنة (${res.fromFiscalYear}) كأرصدة افتتاحية للسنة (${res.toFiscalYear}) بعدد (${res.rolledAccountsCount}) حساب.`
                  );
                } catch (err) {
                  notifyBanner('error', err instanceof Error ? err.message : 'تعذر ترحيل الأرصدة');
                }
              }}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              ترحيل أرصدة آخر السنة كافتتاحية لـ {selectedFiscalYear + 1}
            </button>
          </div>
        </div>

        <form onSubmit={handleAddAccount} className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-6">
          <input
            type="text"
            placeholder="كود الحساب (مثال: 1105)"
            value={newAccCode}
            onChange={(e) => setNewAccCode(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            required
          />
          <input
            type="text"
            placeholder="اسم الحساب"
            value={newAccName}
            onChange={(e) => setNewAccName(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs md:col-span-2"
            required
          />
          <select
            value={newAccCategory}
            onChange={(e) =>
              setNewAccCategory(e.target.value as 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'REVENUES' | 'EXPENSES')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          >
            <option value="ASSETS">الأصول</option>
            <option value="LIABILITIES">الالتزامات</option>
            <option value="EQUITY">حقوق الملكية</option>
            <option value="REVENUES">الإيرادات</option>
            <option value="EXPENSES">المصروفات</option>
          </select>
          <input
            type="number"
            placeholder="افتتاحي مدين (ج.م)"
            value={newAccOpeningDebit || ''}
            onChange={(e) => setNewAccOpeningDebit(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            إضافة الحساب
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <th className="p-2.5">الكود</th>
                <th className="p-2.5">اسم الحساب</th>
                <th className="p-2.5">التصنيف</th>
                <th className="p-2.5">الطبيعة</th>
                <th className="p-2.5">افتتاحي مدين ({selectedFiscalYear})</th>
                <th className="p-2.5">افتتاحي دائن ({selectedFiscalYear})</th>
                <th className="p-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {clientAccounts.map((acc: Account) => (
                <tr
                  key={`${activeClientId}-${selectedFiscalYear}-${acc.id}-${acc.openingBalanceDebit || 0}-${acc.openingBalanceCredit || 0}`}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-2.5 font-mono font-bold text-slate-800">{acc.code}</td>
                  <td className="p-2.5 font-semibold text-slate-900">{acc.name}</td>
                  <td className="p-2.5 text-slate-600">{acc.category}</td>
                  <td className="p-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        acc.nature === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      defaultValue={acc.openingBalanceDebit || 0}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 0;
                        if (val !== (acc.openingBalanceDebit || 0)) {
                          db.setClientAccountOpeningBalance(
                            activeClientId,
                            selectedFiscalYear,
                            acc.code,
                            val,
                            acc.openingBalanceCredit || 0
                          );
                          notifyBanner('success', `تم تحديث الرصيد الافتتاحي للحساب ${acc.code} للسنة ${selectedFiscalYear}`);
                        }
                      }}
                      className="w-32 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      defaultValue={acc.openingBalanceCredit || 0}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 0;
                        if (val !== (acc.openingBalanceCredit || 0)) {
                          db.setClientAccountOpeningBalance(
                            activeClientId,
                            selectedFiscalYear,
                            acc.code,
                            acc.openingBalanceDebit || 0,
                            val
                          );
                          notifyBanner('success', `تم تحديث الرصيد الافتتاحي للحساب ${acc.code} للسنة ${selectedFiscalYear}`);
                        }
                      }}
                      className="w-32 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      title={acc.isSystem ? 'حساب نظام أساسي (محمي)' : 'حذف الحساب'}
                      disabled={acc.isSystem}
                      onClick={() => {
                        if (acc.isSystem) return;
                        if (!confirm(`هل أنت متأكد من رغبتك في حذف الحساب (${acc.code} - ${acc.name})؟`)) return;
                        try {
                          const ok = db.deleteAccount(acc.id);
                          if (ok) {
                            notifyBanner('success', `تم حذف الحساب (${acc.code} - ${acc.name}) بنجاح.`);
                            setState({ ...db.getState() });
                          }
                        } catch (err) {
                          notifyBanner('error', err instanceof Error ? err.message : 'تعذر حذف الحساب.');
                        }
                      }}
                      className={`rounded p-1.5 transition ${
                        acc.isSystem
                          ? 'cursor-not-allowed opacity-30 text-slate-400'
                          : 'text-rose-600 hover:bg-rose-50 hover:text-rose-800'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderJournalEntriesWorkspace = () => (
    <div className="space-y-6">
      {renderAccountingSubNav()}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              دفتر القيود اليومية — {activeClient?.name} ({selectedFiscalYear})
            </h2>
            <p className="text-xs text-slate-500">
              العملة الأساس: الجنيه المصري (EGP) | القيود المرحّلة محمية ضد الحذف أو التعديل وتُصحح بقيد عكسي موثق فقط
            </p>
          </div>
        </div>

        <form onSubmit={handleAddJournalEntry} className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">التاريخ (توقيت القاهرة)</label>
              <input
                type="date"
                value={jeDate}
                onChange={(e) => setJeDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">بيان القيد المحاسبي</label>
              <input
                type="text"
                placeholder="شرح تفصيلي للعملية المالية..."
                value={jeDesc}
                onChange={(e) => setJeDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">عملة العملية</label>
              <select
                value={jeCurrency}
                onChange={(e) => {
                  const curr = e.target.value as CurrencyCode;
                  setJeCurrency(curr);
                  setJeExchangeRate(curr === 'EGP' ? 1 : db.getExchangeRateValue(curr, jeDate));
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">سعر الصرف للتحويل للجنيه</label>
              <input
                type="number"
                step="0.01"
                value={jeCurrency === 'EGP' ? 1 : jeExchangeRate}
                disabled={jeCurrency === 'EGP'}
                onChange={(e) => setJeExchangeRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            {jeLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                <select
                  value={line.accountCode}
                  onChange={(e) => {
                    const copy = [...jeLines];
                    copy[idx].accountCode = e.target.value;
                    setJeLines(copy);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs md:col-span-5"
                >
                  {clientAccounts.map((a) => (
                    <option key={a.id} value={a.code}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`مدين (${jeCurrency})`}
                  value={line.debit || ''}
                  onChange={(e) => {
                    const copy = [...jeLines];
                    copy[idx].debit = Number(e.target.value);
                    setJeLines(copy);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs md:col-span-2"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={`دائن (${jeCurrency})`}
                  value={line.credit || ''}
                  onChange={(e) => {
                    const copy = [...jeLines];
                    copy[idx].credit = Number(e.target.value);
                    setJeLines(copy);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs md:col-span-2"
                />
                <input
                  type="text"
                  placeholder="ملاحظة السطر"
                  value={line.description}
                  onChange={(e) => {
                    const copy = [...jeLines];
                    copy[idx].description = e.target.value;
                    setJeLines(copy);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs md:col-span-3"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setJeLines([
                    ...jeLines,
                    { accountCode: clientAccounts[0]?.code || '1101', debit: 0, credit: 0, description: '' },
                  ])
                }
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                + إضافة سطر للقيد
              </button>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={jePostImmediately}
                  onChange={(e) => setJePostImmediately(e.target.checked)}
                />
                <span>ترحيل مباشر للأستاذ العام (غير قابل للتعديل بعد الترحيل)</span>
              </label>
            </div>
            {(() => {
              const savePerm = canPerform(
                jePostImmediately ? 'POST_ENTRY' : 'CREATE_ENTRY',
                { clientId: activeClientId, fiscalYear: selectedFiscalYear, entityType: 'قيد يومية' },
                currentUser
              );
              const lockInfo = db.getPeriodLockDetails(
                activeClientId,
                jeDate || activeFiscalBounds.startDate,
                selectedFiscalYear
              );
              const isDisabled = !savePerm.allowed || lockInfo.locked;
              const tooltip = lockInfo.locked
                ? `الفترة المحاسبية (${lockInfo.periodLabel}) مقفلة`
                : savePerm.reason || 'حفظ القيد للعميل النشط';
              return (
                <button
                  type="submit"
                  disabled={isDisabled}
                  title={tooltip}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  حفظ القيد للعميل النشط
                </button>
              );
            })()}
          </div>
        </form>

        <div className="space-y-3">
          {clientJournalEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              لا توجد قيود مسجلة لهذه المنشأة في السنة المالية {selectedFiscalYear}.
            </div>
          ) : (
            clientJournalEntries.map((entry) => {
              const isPosted = Boolean(entry.isPosted || entry.status === 'POSTED');
              const totalEgp = (entry.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
              return (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                        #{entry.entryNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{entry.description}</span>
                      <span className="text-xs text-slate-500">({entry.date})</span>
                      {entry.currency && entry.currency !== 'EGP' && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          عملة أجنبية: {entry.currency} @ {entry.exchangeRate} ج.م
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        {totalEgp.toLocaleString('ar-EG')} ج.م
                      </span>
                      {isPosted ? (
                        <>
                          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>مرحّل (محمي)</span>
                          </span>
                          {!entry.reversedByEntryId && (() => {
                            const voidPerm = canPerform(
                              'VOID_RECORD',
                              { clientId: entry.clientId, fiscalYear: entry.fiscalYear, entityType: 'قيد يومية' },
                              currentUser
                            );
                            const lockInfo = db.getPeriodLockDetails(entry.clientId, entry.date, entry.fiscalYear);
                            const isDisabled = !voidPerm.allowed || lockInfo.locked;
                            const tooltip = lockInfo.locked
                              ? `الفترة المحاسبية (${lockInfo.periodLabel}) مقفلة`
                              : voidPerm.reason || 'تصحيح بقيد عكسي';
                            return (
                              <button
                                type="button"
                                disabled={isDisabled}
                                title={tooltip}
                                onClick={() => {
                                  setReversalTarget(entry);
                                  setReversalReason('');
                                  setReversalDate(getCairoDateString());
                                }}
                                className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>تصحيح بقيد عكسي</span>
                              </button>
                            );
                          })()}
                          {entry.reversedByEntryId && (
                            <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                              معكوس بالقيد ({entry.reversedByEntryId})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {(() => {
                            const postPerm = canPerform(
                              'POST_ENTRY',
                              { clientId: entry.clientId, fiscalYear: entry.fiscalYear, entityType: 'قيد يومية' },
                              currentUser
                            );
                            const lockInfo = db.getPeriodLockDetails(entry.clientId, entry.date, entry.fiscalYear);
                            const isDisabled = !postPerm.allowed || lockInfo.locked;
                            const tooltip = lockInfo.locked
                              ? `الفترة المحاسبية (${lockInfo.periodLabel}) مقفلة`
                              : postPerm.reason || 'ترحيل القيد للأستاذ العام';
                            return (
                              <button
                                type="button"
                                disabled={isDisabled}
                                title={tooltip}
                                onClick={() => {
                                  try {
                                    db.togglePostEntry(entry.id, 'ترحيل القيد للأستاذ العام');
                                    notifyBanner('success', `تم ترحيل القيد #${entry.entryNumber} بنجاح.`);
                                  } catch (err) {
                                    notifyBanner('error', err instanceof Error ? err.message : 'تعذر الترحيل');
                                  }
                                }}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                ترحيل القيد
                              </button>
                            );
                          })()}
                          {(() => {
                            const delPerm = canPerform(
                              'DELETE_RECORD',
                              { clientId: entry.clientId, fiscalYear: entry.fiscalYear, entityType: 'قيد يومية' },
                              currentUser
                            );
                            const lockInfo = db.getPeriodLockDetails(entry.clientId, entry.date, entry.fiscalYear);
                            const isDisabled = !delPerm.allowed || lockInfo.locked;
                            const tooltip = lockInfo.locked
                              ? `الفترة المحاسبية (${lockInfo.periodLabel}) مقفلة`
                              : delPerm.reason || 'حذف المسودة';
                            return (
                              <button
                                type="button"
                                disabled={isDisabled}
                                title={tooltip}
                                onClick={() => {
                                  try {
                                    db.deleteJournalEntry(entry.id, 'حذف مسودة قيد غير مرحل');
                                    notifyBanner('success', 'تم حذف المسودة وتوثيق الحذف في سجل المراجعة.');
                                  } catch (err) {
                                    notifyBanner('error', err instanceof Error ? err.message : 'تعذر الحذف');
                                  }
                                }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                حذف المسودة
                              </button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {(entry.lines || []).map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-1 text-slate-600">
                        <span>
                          <strong className="font-mono text-slate-800">{l.accountCode}</strong> — {l.accountName}
                        </span>
                        <div className="flex items-center gap-6 font-mono">
                          <span>مدين: {(Number(l.debit) || 0).toLocaleString('ar-EG')} ج.م</span>
                          <span>دائن: {(Number(l.credit) || 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderExchangeRatesWorkspace = () => (
    <div className="space-y-6">
      {renderAccountingSubNav()}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-2 text-lg font-bold text-slate-900">جدول أسعار الصرف بالتاريخ والعملة مقابل الجنيه المصري (EGP)</h2>
        <p className="mb-4 text-xs text-slate-500">
          تُستخدم أسعار الصرف المسجلة حسب (التاريخ + العملة) لتحويل العمليات بالعملات الأجنبية إلى الجنيه المصري عند الترحيل وعند السداد.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!fxRateDate || fxRateValue <= 0) return;
            try {
              db.saveExchangeRate({
                date: fxRateDate,
                currency: fxRateCurrency,
                officialRate: Number(fxRateValue),
                buyRate: Number(fxRateValue),
                sellRate: Number(fxRateValue),
                rateToEgp: Number(fxRateValue),
                source: 'CBE',
              });
              notifyBanner('success', `تم حفظ سعر صرف (${fxRateCurrency}) بتاريخ (${fxRateDate}) = ${fxRateValue} ج.م`);
            } catch (err) {
              notifyBanner('error', err instanceof Error ? err.message : 'تعذر حفظ سعر الصرف');
            }
          }}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"
        >
          <input
            type="date"
            value={fxRateDate}
            onChange={(e) => setFxRateDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
            required
          />
          <select
            value={fxRateCurrency}
            onChange={(e) => setFxRateCurrency(e.target.value as CurrencyCode)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="GBP">جنيه إسترليني (GBP)</option>
            <option value="AED">درهم إماراتي (AED)</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="سعر الصرف بالجنيه المصري"
            value={fxRateValue || ''}
            onChange={(e) => setFxRateValue(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            حفظ سعر الصرف بالتاريخ
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {state.exchangeRates.map((rate) => (
            <div key={rate.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{rate.currency} / EGP</span>
                <span className="font-mono text-base font-bold text-emerald-700">{rate.officialRate} ج.م</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>التاريخ: {rate.date}</span>
                <span>المصدر: {rate.source || 'CBE'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFixedAssetsWorkspace = () => (
    <div className="space-y-6">
      {renderAccountingSubNav()}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">سجل الأصول الثابتة والإهلاكات — {activeClient?.name}</h2>
            <p className="text-xs text-slate-500">كل أصل ثابت مرتبط إلزامياً بالعميل النشط ({activeClientId})</p>
          </div>
          {clientFixedAssets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const totalDep = clientFixedAssets.reduce(
                  (s, a) => s + Math.round(((Number(a.purchaseCost) || 0) * (Number(a.depreciationRate) || 20)) / 100),
                  0
                );
                if (totalDep > 0) {
                  db.postDepreciationJournalEntry({
                    clientId: activeClientId,
                    fiscalYear: selectedFiscalYear,
                    totalDepreciation: totalDep,
                  });
                  notifyBanner('success', `تم ترحيل قيد إهلاك الأصول الثابتة بمبلغ ${totalDep.toLocaleString('ar-EG')} ج.م`);
                }
              }}
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              ترحيل قيد الإهلاك السنوي ({selectedFiscalYear})
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!assetName.trim() || assetCost <= 0) return;
            db.addFixedAsset({
              clientId: activeClientId,
              name: assetName.trim(),
              purchaseCost: Number(assetCost),
              depreciationRate: Number(assetRate) || 20,
              netBookValue: Number(assetCost),
              purchaseDate: getCairoDateString(),
            });
            setAssetName('');
            setAssetCost(0);
            notifyBanner('success', 'تم إضافة الأصل الثابت لسجل المنشأة النشطة.');
          }}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"
        >
          <input
            type="text"
            placeholder="اسم الأصل الثابت"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            required
          />
          <input
            type="number"
            placeholder="تكلفة الشراء (ج.م)"
            value={assetCost || ''}
            onChange={(e) => setAssetCost(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            required
          />
          <input
            type="number"
            placeholder="نسبة الإهلاك السنوي %"
            value={assetRate}
            onChange={(e) => setAssetRate(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            إضافة أصل ثابت للعميل
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="p-2.5">كود الأصل</th>
                <th className="p-2.5">اسم الأصل</th>
                <th className="p-2.5">تاريخ الشراء</th>
                <th className="p-2.5">التكلفة الدفترية (ج.م)</th>
                <th className="p-2.5">معدل الإهلاك</th>
              </tr>
            </thead>
            <tbody>
              {clientFixedAssets.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="p-2.5 font-mono font-bold">{a.assetCode}</td>
                  <td className="p-2.5 font-semibold">{a.name}</td>
                  <td className="p-2.5">{a.purchaseDate}</td>
                  <td className="p-2.5 font-mono">{Number(a.purchaseCost).toLocaleString('ar-EG')} ج.م</td>
                  <td className="p-2.5 font-mono">{a.depreciationRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const invoiceTypeLabels: Record<InvoiceType, string> = {
    SALES: 'فاتورة مبيعات (SALES)',
    PURCHASE: 'فاتورة مشتريات (PURCHASE)',
    RETURN_SALES: 'مردودات مبيعات (RETURN_SALES)',
    RETURN_PURCHASE: 'مردودات مشتريات (RETURN_PURCHASE)',
    CREDIT_NOTE: 'إشعار دائن للعميل (CREDIT_NOTE)',
    DEBIT_NOTE: 'إشعار مدين على العميل (DEBIT_NOTE)',
    OFFICE_SERVICE: 'إيراد أتعاب المكتب (OFFICE_SERVICE)',
  };

  const renderInvoicingWorkspace = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              منظومة الفواتير والترحيل الآلي — {activeClient?.name}
            </h2>
            <p className="text-xs text-slate-500">
              تدعم الأنواع الـ 7 (مبيعات، مشتريات، مردودات مبيعات، مردودات مشتريات، إشعار دائن، إشعار مدين، إيراد أتعاب المكتب) والعملات الأجنبية مع قيد فروق عملة عند السداد.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEtaImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>استيراد فواتير إكسل (ETA)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACCOUNT_MAPPING')}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>شاشة ربط الحسابات للعميل</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!invPartner.trim() || invSubtotal <= 0) return;
            const targetInvClientId = activeClientId || invClientId || visibleClients[0]?.id || '';
            if (!targetInvClientId) {
              notifyBanner('error', 'يرجى تحديد المنشأة التابعة لها الفاتورة.');
              return;
            }
            const vat = Number(invVat) >= 0 ? Number(invVat) : Math.round(invSubtotal * 14) / 100;
            const wht = Number(invWht) || 0;
            const tblTax = Number(invTableTax) || 0;
            const netTotal = Math.round((Number(invSubtotal) + vat + tblTax - wht) * 100) / 100;
            const targetBounds = db.getClientFiscalYearBounds(targetInvClientId, selectedFiscalYear);
            try {
              db.batchAddInvoices([
                {
                  clientId: targetInvClientId,
                  invoiceNumber: invNumber.trim() || `INV-${Date.now().toString().slice(-5)}`,
                  invoiceType: invType,
                  partnerName: invPartner.trim(),
                  date:
                    targetBounds.startDate <= getCairoDateString() &&
                    getCairoDateString() <= targetBounds.endDate
                      ? getCairoDateString()
                      : targetBounds.endDate,
                  subtotal: Number(invSubtotal),
                  totalVat: vat,
                  totalWht: wht,
                  totalTableTax: tblTax,
                  grandTotal: netTotal,
                  currency: invCurrency,
                  paymentMethod: invPaymentMethod,
                },
              ]);
              setInvNumber('');
              setInvPartner('');
              setInvSubtotal(0);
              setInvVat(0);
              setInvWht(0);
              setInvTableTax(0);
              notifyBanner('success', 'تم تسجيل الفاتورة بنجاح. يمكنك الآن ترحيل القيد الآلي.');
            } catch (err) {
              notifyBanner('error', err instanceof Error ? err.message : 'تعذر حفظ الفاتورة');
            }
          }}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"
        >
          {!activeClientId && (
            <select
              value={invClientId || visibleClients[0]?.id || ''}
              onChange={(e) => setInvClientId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold md:col-span-4"
            >
              {visibleClients.map((c) => (
                <option key={c.id} value={c.id}>
                  المنشأة: {c.name} ({c.code})
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="رقم الفاتورة"
            value={invNumber}
            onChange={(e) => setInvNumber(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          />
          <input
            type="text"
            placeholder="اسم العميل / المورد"
            value={invPartner}
            onChange={(e) => setInvPartner(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            required
          />
          <select
            value={invType}
            onChange={(e) => setInvType(e.target.value as InvoiceType)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value="SALES">فاتورة مبيعات (SALES)</option>
            <option value="PURCHASE">فاتورة مشتريات (PURCHASE)</option>
            <option value="RETURN_SALES">مردودات مبيعات (RETURN_SALES)</option>
            <option value="RETURN_PURCHASE">مردودات مشتريات (RETURN_PURCHASE)</option>
            <option value="CREDIT_NOTE">إشعار دائن (CREDIT_NOTE)</option>
            <option value="DEBIT_NOTE">إشعار مدين (DEBIT_NOTE)</option>
            <option value="OFFICE_SERVICE">إيراد أتعاب المكتب (OFFICE_SERVICE)</option>
          </select>
          <div className="flex gap-2">
            <select
              value={invCurrency}
              onChange={(e) => setInvCurrency(e.target.value as CurrencyCode)}
              className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
            </select>
            <select
              value={invPaymentMethod}
              onChange={(e) => setInvPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'CREDIT')}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            >
              <option value="CREDIT">آجل (ذمم عملاء/موردين)</option>
              <option value="CASH">نقدي (خزينة)</option>
            </select>
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="الصافي قبل الضريبة"
            value={invSubtotal || ''}
            onChange={(e) => {
              const sub = Number(e.target.value);
              setInvSubtotal(sub);
              setInvVat(Math.round(sub * 14) / 100);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="ضريبة القيمة المضافة (14%)"
            value={invVat || ''}
            onChange={(e) => setInvVat(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
          />
          <input
            type="number"
            step="0.01"
            placeholder="ضريبة الخصم والإضافة (WHT)"
            value={invWht || ''}
            onChange={(e) => setInvWht(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="ضريبة الجدول"
              value={invTableTax || ''}
              onChange={(e) => setInvTableTax(Number(e.target.value))}
              className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-mono"
            />
            {(() => {
              const targetClientForInv = activeClientId || invClientId || visibleClients[0]?.id || '';
              const createInvPerm = canPerform(
                'CREATE_INVOICE',
                { clientId: targetClientForInv, fiscalYear: selectedFiscalYear, entityType: 'فاتورة' },
                currentUser
              );
              return (
                <button
                  type="submit"
                  disabled={!createInvPerm.allowed}
                  title={createInvPerm.reason || 'حفظ الفاتورة'}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  حفظ الفاتورة
                </button>
              );
            })()}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="p-2.5">رقم الفاتورة</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">الطرف المتعامل</th>
                <th className="p-2.5">الصافي</th>
                <th className="p-2.5">ض.ق.م</th>
                <th className="p-2.5">العملة / السعر</th>
                <th className="p-2.5">الصافي المستحق</th>
                <th className="p-2.5">الترحيل والسداد</th>
              </tr>
            </thead>
            <tbody>
              {clientInvoices.map((inv) => {
                const postStatus = PostingEngineService.isInvoicePosted(
                  inv.invoiceNumber,
                  inv.clientId,
                  inv.invoiceType
                );
                return (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="p-2.5 font-mono font-bold">{inv.invoiceNumber}</td>
                    <td className="p-2.5 font-semibold">{invoiceTypeLabels[inv.invoiceType] || inv.invoiceType}</td>
                    <td className="p-2.5 font-mono">{inv.date}</td>
                    <td className="p-2.5 font-semibold">{inv.partnerName}</td>
                    <td className="p-2.5 font-mono">{Number(inv.subtotal).toLocaleString('ar-EG')}</td>
                    <td className="p-2.5 font-mono">{Number(inv.totalVat).toLocaleString('ar-EG')}</td>
                    <td className="p-2.5 font-mono">
                      {inv.currency || 'EGP'} {inv.currency && inv.currency !== 'EGP' ? `(×${inv.exchangeRate})` : ''}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700">
                      {Number(inv.grandTotal).toLocaleString('ar-EG')} {inv.currency || 'ج.م'}
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {postStatus.isPosted ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            مرحّلة للقيد
                          </span>
                        ) : (() => {
                          const postInvPerm = canPerform(
                            'POST_ENTRY',
                            { clientId: inv.clientId, entityType: 'فاتورة' },
                            currentUser
                          );
                          const lockInfo = db.getPeriodLockDetails(inv.clientId, inv.date);
                          const isDisabled = !postInvPerm.allowed || lockInfo.locked;
                          const tooltip = lockInfo.locked
                            ? `الفترة المحاسبية (${lockInfo.periodLabel}) مقفلة`
                            : postInvPerm.reason || 'ترحيل القيد للأستاذ العام';
                          return (
                            <button
                              type="button"
                              disabled={isDisabled}
                              title={tooltip}
                              onClick={() => {
                                try {
                                  const res = PostingEngineService.postInvoice(inv.id);
                                  if (res.success) {
                                    notifyBanner(
                                      'success',
                                      `تم ترحيل الفاتورة (${inv.invoiceNumber}) إلى القيد رقم #${res.entry?.entryNumber}`
                                    );
                                  } else {
                                    notifyBanner('error', res.error || 'تعذر ترحيل الفاتورة');
                                  }
                                } catch (err) {
                                  notifyBanner('error', err instanceof Error ? err.message : 'تعذر ترحيل الفاتورة');
                                }
                              }}
                              className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              ترحيل القيد
                            </button>
                          );
                        })()}
                        {inv.currency && inv.currency !== 'EGP' && inv.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              const settleRate = Number((inv.exchangeRate || 50) + 1.25);
                              const res = PostingEngineService.postForeignCurrencySettlement({
                                invoiceId: inv.id,
                                settlementDate: inv.date,
                                settlementExchangeRate: settleRate,
                              });
                              if (res.success) {
                                notifyBanner(
                                  'success',
                                  `تم سداد الفاتورة الأجنبية وتسجيل فروق عملة (${res.fxType}) بقيمة ${res.fxDifferenceEgp} ج.م`
                                );
                              } else {
                                notifyBanner('error', res.error || 'تعذر تسجيل قيد السداد وفروق العملة');
                              }
                            }}
                            className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            سداد وفروق عملة
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderClientsAndOfficeHub = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('CLIENTS_ARCHIVE')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${
            activeTab === 'CLIENTS_ARCHIVE' || activeTab === 'OFFICE_HUB'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          أرشيف الشركات والمنشآت
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('OFFICE_TREASURY')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${
            activeTab === 'OFFICE_TREASURY' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          خزينة المكتب وتحصيلات الأتعاب
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PRACTICE_MANAGEMENT')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${
            activeTab === 'PRACTICE_MANAGEMENT' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          حاسبة الأتعاب وعقود الارتباط
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('WHATSAPP_BOT')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${
            activeTab === 'WHATSAPP_BOT' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          مراسلات العملاء (واتساب)
        </button>
      </div>

      {activeTab === 'OFFICE_TREASURY' ? (
        <OfficeTreasuryView state={state} />
      ) : activeTab === 'PRACTICE_MANAGEMENT' ? (
        <FeeEstimatorView state={state} />
      ) : activeTab === 'WHATSAPP_BOT' ? (
        <WhatsAppLiveChatPanel state={state} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">سجل الشركات والمصانع والمنشآت ({visibleClients.length})</h2>
              <p className="text-xs text-slate-500">اختر أي منشأة لتفعيل بيئة العمل المحاسبية المعزولة الخاصة بها</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddClientOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة منشأة جديدة</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleClients.map((client) => {
              const isSelected = client.id === activeClientId;
              const bounds = db.getClientFiscalYearBounds(
                client.id,
                client.fiscalYear || client.activeFiscalYear
              );
              return (
                <div
                  key={client.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{client.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        البطاقة الضريبية: {client.taxId || '—'} | السجل التجاري: {client.commercialRegister || '—'}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">
                        النشاط: {activityTemplateLabels[client.activityTemplate || 'COMMERCIAL']} | السنة المالية:{' '}
                        <span className="font-mono">
                          {bounds.fiscalYear} ({bounds.startDate} → {bounds.endDate})
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {isClientSubjectToTax(client, 'VAT') && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            قيمة مضافة
                          </span>
                        )}
                        {isClientSubjectToTax(client, 'INCOME') && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            ضريبة دخل
                          </span>
                        )}
                        {isClientSubjectToTax(client, 'WHT') && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                            خصم وتحصيل
                          </span>
                        )}
                        {isClientSubjectToTax(client, 'STAMP') && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            دمغة
                          </span>
                        )}
                        {isClientSubjectToTax(client, 'PAYROLL') && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            عمالة ومرتبات
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectClient(client.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? 'المنشأة النشطة حالياً' : 'تفعيل المنشأة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxCredentialsModalClientId(client.id)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        اليوزر نيم والباسورد للضرائب والفاتورة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const json = db.exportClientIsolatedBackup(client.id);
                            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `client-backup-${client.code || client.id}-${bounds.fiscalYear}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            notifyBanner('success', `تم تصدير النسخة المعزولة للمنشأة (${client.name})`);
                          } catch (err) {
                            notifyBanner('error', err instanceof Error ? err.message : 'تعذر تصدير بيانات العميل');
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        تصدير بيانات العميل المعزولة
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // الشريط الثابت أعلى الشاشات المحاسبية باسم العميل والسنة المالية وزر "تغيير"
  const renderStickyClientScopedBar = () => {
    if (!activeClient) return null;
    return (
      <div className="sticky top-[57px] z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/95 px-4 py-2.5 shadow-xs backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-600">ملف المراجعة المحاسبي:</span>
            <span className="text-sm font-black text-slate-900">{activeClient.name}</span>
            <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200">
              {activeClient.code}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-emerald-700" />
            <span className="font-bold text-slate-700">السنة المالية:</span>
            <select
              value={selectedFiscalYear}
              onChange={(e) => handleSelectFiscalYear(Number(e.target.value))}
              className="rounded border border-emerald-300 bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-900"
            >
              {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <span className="font-mono text-[11px] text-slate-600">
              ({activeFiscalBounds.startDate} → {activeFiscalBounds.endDate})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickClientPickerOpen(true)}
          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
        >
          تغيير
        </button>
      </div>
    );
  };

  // المنتقي السريع للعميل والسنة المالية (بحث + آخر 5 عملاء + القائمة الكاملة المسموح بها)
  const renderQuickClientScopedPicker = () => {
    const q = quickPickerSearch.trim().toLowerCase();
    const filteredList = q
      ? visibleClients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.taxId && c.taxId.toLowerCase().includes(q)) ||
            (c.taxCardNo && c.taxCardNo.toLowerCase().includes(q))
        )
      : visibleClients;

    const recentClients = recentClientIds
      .map((id) => visibleClients.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                المنتقي السريع للمنشأة والسنة المالية
              </h2>
              <p className="text-xs text-slate-500">
                اختر المنشأة والسنة المالية لفتح الدفاتر والموازين والقوائم المالية المعزولة الخاصة بها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-slate-700">السنة المالية:</span>
              <select
                value={selectedFiscalYear}
                onChange={(e) => handleSelectFiscalYear(Number(e.target.value))}
                className="bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-none"
              >
                {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            {activeClient && (
              <button
                type="button"
                onClick={() => setIsQuickClientPickerOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                إغلاق المنتقي
              </button>
            )}
          </div>
        </div>

        {/* حقل البحث السريع */}
        <div className="relative">
          <input
            type="text"
            value={quickPickerSearch}
            onChange={(e) => setQuickPickerSearch(e.target.value)}
            placeholder="ابحث باسم الشركة، كود المنشأة، أو الرقم الضريبي..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* آخر 5 عملاء */}
        {recentClients.length > 0 && !q && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">آخر 5 عملاء تم العمل عليهم:</div>
            <div className="flex flex-wrap gap-2">
              {recentClients.map((rc) => (
                <button
                  key={rc.id}
                  type="button"
                  onClick={() => handleSelectClient(rc.id)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{rc.name}</span>
                  <span className="font-mono text-[10px] text-emerald-700">({rc.code})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* القائمة الكاملة للعملاء المسموح بهم */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-600">
            قائمة الشركات والمنشآت المتاحة ({filteredList.length}):
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectClient(c.id)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-right shadow-2xs transition hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{c.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono">
                    {c.code} | ضريبي: {c.taxCardNo || c.taxId || '—'}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                    سنة مالية: {c.fiscalYear || c.activeFiscalYear}
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white">
                  فتح الملف
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsAddClientOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            + إنشاء منشأة جديدة بدليل حسابات مستقل
          </button>
        </div>
      </div>
    );
  };

  const renderActiveWorkspace = () => {
    // 1. الشاشات التشغيلية العابرة للعملاء (CROSS_CLIENT_TABS) تُعرض قبل فحص activeClientId وبدون أي حجب
    if (activeTab === 'UNASSIGNED_ENTRIES') {
      return (
        <div className="space-y-6">
          {renderAccountingSubNav()}
          <UnassignedEntriesView
            clients={visibleClients}
            onResolvedChange={() => setState({ ...db.getState() })}
            onNavigateToReports={() => setActiveTab('FINANCIAL_STATEMENTS')}
          />
        </div>
      );
    }

    if (activeTab === 'DASHBOARD') {
      return (
        <CpaAutonomousCommandDeck
          state={state}
          onNavigate={(tab) => setActiveTab(tab)}
          fiscalYear={selectedFiscalYear}
        />
      );
    }

    if (parentHub === 'TAX_AUDIT_HUB') {
      return (
        <UnifiedTaxFilingAgendaView
          state={state}
          currentUser={currentUser}
          onRefresh={() => setState({ ...db.getState() })}
          onOpenClientAuditFile={(clientId) => {
            handleSelectClient(clientId);
            setActiveTab('TRIAL_BALANCE');
          }}
        />
      );
    }

    if (parentHub === 'OFFICE_HUB') {
      return renderClientsAndOfficeHub();
    }

    if (parentHub === 'AUDIT_SECURITY_HUB' || activeTab === 'AUDIT_TRAIL') {
      return <AuditTrailView state={state} />;
    }

    if (activeTab === 'CURRENCY_EXCHANGE_RATES' || activeTab === 'CURRENCY_RATES') {
      return renderExchangeRatesWorkspace();
    }

    if (activeTab === 'INVOICING') {
      return renderInvoicingWorkspace();
    }

    if (activeTab === 'CERTIFICATES') {
      return (
        <UnifiedFinancialReportsView
          state={state}
          selectedYear={selectedFiscalYear}
          onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
        />
      );
    }

    // 2. الشاشات المحاسبية المرتبطة بعميل وسنة مالية (CLIENT_SCOPED_TABS)
    // إذا لم يتم تحديد عميل أو ضغط المستخدم على زر "تغيير"، يُعرض المنتقي السريع (بحث + آخر 5 عملاء + القائمة)
    if (!activeClientId || !activeClient || isQuickClientPickerOpen) {
      return renderQuickClientScopedPicker();
    }

    const renderClientScopedContent = () => {
      if (activeTab === 'CHART_OF_ACCOUNTS') {
        return renderChartOfAccountsWorkspace();
      }
      if (activeTab === 'ACCOUNT_MAPPING') {
        return (
          <div className="space-y-6">
            {renderAccountingSubNav()}
            <AccountMappingView state={state} onRefresh={() => setState({ ...db.getState() })} />
          </div>
        );
      }
      if (activeTab === 'JOURNAL_ENTRIES' || activeTab === 'GENERAL_LEDGER' || activeTab === 'ACCOUNTING_HUB') {
        return renderJournalEntriesWorkspace();
      }
      if (activeTab === 'TRIAL_BALANCE') {
        return (
          <div className="space-y-6">
            {renderAccountingSubNav()}
            <TrialBalanceView
              state={state}
              selectedYear={selectedFiscalYear}
              onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
            />
          </div>
        );
      }
      if (activeTab === 'FILE_REVIEW') {
        return (
          <div className="space-y-6">
            {renderAccountingSubNav()}
            <SmartExcelAuditSentinelView state={state} />
          </div>
        );
      }
      if (activeTab === 'FIXED_ASSETS') {
        return renderFixedAssetsWorkspace();
      }
      if (parentHub === 'FINANCIAL_REPORTING_HUB') {
        if (activeTab === 'AUDITOR_REPORT') {
          return (
            <AuditorReportView
              state={state}
              selectedYear={selectedFiscalYear}
              onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
            />
          );
        }
        if (activeTab === 'FINANCIAL_STATEMENTS') {
          return (
            <FinancialStatementsView
              state={state}
              fiscalYear={selectedFiscalYear}
              onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
            />
          );
        }
        return (
          <UnifiedFinancialReportsView
            state={state}
            selectedYear={selectedFiscalYear}
            onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
          />
        );
      }
      if (parentHub === 'AUDIT_TOOLS_HUB') {
        return (
          <div className="space-y-8">
            <SmartExcelAuditSentinelView state={state} />
            <AuditConfirmationsGenerator state={state} selectedYear={selectedFiscalYear} />
            <InternalControlRiskMatrix state={state} selectedYear={selectedFiscalYear} />
          </div>
        );
      }
      if (parentHub === 'CREDIT_HUB' || parentHub === 'FINANCIAL_PLANNING_HUB') {
        return <SmartCpaTemplateView companyName={activeClient?.name} />;
      }
      return (
        <CpaAutonomousCommandDeck
          state={state}
          onNavigate={(tab) => setActiveTab(tab)}
          fiscalYear={selectedFiscalYear}
        />
      );
    };

    return (
      <div>
        {renderStickyClientScopedBar()}
        {renderClientScopedContent()}
      </div>
    );
  };

  return (
    <DensityProvider>
      <div className="flex min-h-screen bg-slate-100 text-slate-900" dir="rtl">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as NavigationTab)}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          profile={state.officeProfile}
          currentLanguage={state.preferences?.language || 'ar'}
          onOpenDesktopModal={() => setIsLicenseModalOpen(true)}
        />

        <div className="flex flex-1 flex-col overflow-x-hidden">
          {/* Top Mandatory Context Bar (Client & Fiscal Year Isolation + Cairo Time + User Role) */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5">
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-700">المنشأة النشطة:</span>
                  <select
                    aria-label="المنشأة النشطة"
                    value={activeClientId}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-emerald-900 focus:outline-none"
                  >
                    <option value="">-- اختر المنشأة --</option>
                    {visibleClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddClientOpen(true)}
                    className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    + عميل
                  </button>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-600">السنة المالية:</span>
                  <select
                    aria-label="السنة المالية"
                    value={selectedFiscalYear}
                    onChange={(e) => handleSelectFiscalYear(Number(e.target.value))}
                    className="bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  {activeClient && (
                    <span className="font-mono text-[10px] text-slate-500 border-r border-slate-200 pr-1.5 mr-1">
                      {activeFiscalBounds.startDate} → {activeFiscalBounds.endDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AutoSaveStatusBadge
                  lastSavedTime={db.getLastStorageSaveSuccessAt()}
                  hasStorageError={Boolean(storageFailureError)}
                  storageErrorMessage={storageFailureError}
                />
                <GlobalSearchBar state={state} currentUser={currentUser} onNavigate={(t) => setActiveTab(t)} />
                <button
                  type="button"
                  onClick={() => setTaxCredentialsModalClientId(activeClientId || visibleClients[0]?.id || '')}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs"
                  title="بيانات اليوزر نيم والباسورد لبوابة الضرائب والفاتورة الإلكترونية"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                  <span>بيانات الضرائب والفاتورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                  title="النسخ الاحتياطي المشفر واستعادة البيانات (Restore)"
                >
                  <Database className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">النسخ الاحتياطي المشفر</span>
                </button>
                <div className="hidden items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 xl:flex">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{currentUser?.name || 'يجب تسجيل الدخول'}</span>
                  <span className="text-slate-400">|</span>
                  <span>{formatCairoDateTimeArabic()}</span>
                </div>
                <LanguageToggle
                  currentLanguage={state.preferences?.language || 'ar'}
                  onLanguageChange={(lang) => db.setLanguage(lang)}
                />
              </div>
            </div>
          </header>

          {/* شريط أحمر ثابت أعلى التطبيق عند فشل حفظ البيانات في التخزين المحلي */}
          {storageFailureError && (
            <div
              role="alert"
              data-testid="storage-failure-banner"
              className="sticky top-[57px] z-40 flex flex-wrap items-center justify-between gap-3 bg-rose-700 px-6 py-3 text-xs font-bold text-white shadow-lg"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-white" />
                <span>فشل حفظ البيانات. لا تغلق البرنامج وصدّر نسخة احتياطية الآن</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const backupStr = await db.exportFullBackupJson();
                    const blob = new Blob([backupStr], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `نسخة_طوارئ_احتياطية_${getCairoDateString()}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } catch {
                    setIsBackupModalOpen(true);
                  }
                }}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-black text-rose-800 shadow-xs hover:bg-rose-50 cursor-pointer"
              >
                تصدير فوري للنسخة الاحتياطية الآن
              </button>
            </div>
          )}

          {migrationSummaryNotice && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{migrationSummaryNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setMigrationSummaryNotice(null)}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 cursor-pointer"
              >
                حسناً
              </button>
            </div>
          )}

          {unassignedEntriesCount > 0 && activeTab !== 'UNASSIGNED_ENTRIES' && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-950">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  تنبيه ترحيل البيانات: يوجد ({unassignedEntriesCount}) قيد محاسبي غير منسوب لعميل محدد. يلزم نسبها إلى المنشأة المختصة قبل استخراج أي تقرير.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('UNASSIGNED_ENTRIES')}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shrink-0"
              >
                فتح شاشة قيود غير منسوبة
              </button>
            </div>
          )}

          {bannerMessage && (
            <div
              className={`mx-6 mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold ${
                bannerMessage.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-300 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{bannerMessage.text}</span>
              </div>
              <button type="button" onClick={() => setBannerMessage(null)} className="text-xs underline">
                إغلاق
              </button>
            </div>
          )}

          <main className="flex-1 p-6">{renderActiveWorkspace()}</main>
        </div>

        {/* Reversal Modal for Posted Journal Entries (Principle 3 & 4) */}
        {reversalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">
                إصدار قيد عكسي للقيد المرحّل رقم #{reversalTarget.entryNumber}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                القيود المرحّلة لا تُعدَّل ولا تُحذف. سيتم إنشاء قيد عكسي معادل وتوثيقه في سجل المراجعة.
              </p>
              <form onSubmit={handleConfirmReversal} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">تاريخ القيد العكسي (القاهرة)</label>
                  <input
                    type="date"
                    value={reversalDate}
                    onChange={(e) => setReversalDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">سبب التصحيح / العكس (إلزامي)</label>
                  <textarea
                    rows={3}
                    placeholder="اذكر السبب المحاسبي لإصدار القيد العكسي..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReversalTarget(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    تأكيد وترحيل القيد العكسي
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Client Modal */}
        {isAddClientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">
                إضافة منشأة / عميل جديد بدليل حسابات مستقل (أرصدة افتتاحية صفرية)
              </h3>
              <form onSubmit={handleCreateClient} className="mt-4 space-y-3 text-xs">
                <input
                  type="text"
                  placeholder="اسم الشركة / المصنع / المنشأة"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">قالب دليل الحسابات حسب النشاط</label>
                    <select
                      value={newClientActivityTemplate}
                      onChange={(e) => setNewClientActivityTemplate(e.target.value as ClientActivityTemplate)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
                    >
                      <option value="COMMERCIAL">نشاط تجاري (توريدات وتجارة)</option>
                      <option value="INDUSTRIAL">نشاط صناعي (خامات، إنتاج تحت التشغيل، تام)</option>
                      <option value="SERVICE">نشاط خدمي واستشاري</option>
                      <option value="CONTRACTING">نشاط مقاولات وتشييد (مستخلصات ومحتجزات)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">السنة المالية وشهر الإقفال</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newClientFiscalYear}
                        onChange={(e) => {
                          const yr = Number(e.target.value) || 2026;
                          setNewClientFiscalYear(yr);
                          if (newClientEndMonth === 6) {
                            setNewClientFiscalStart(`${yr - 1}-07-01`);
                            setNewClientFiscalEnd(`${yr}-06-30`);
                          } else if (newClientEndMonth === 3) {
                            setNewClientFiscalStart(`${yr - 1}-04-01`);
                            setNewClientFiscalEnd(`${yr}-03-31`);
                          } else {
                            setNewClientFiscalStart(`${yr}-01-01`);
                            setNewClientFiscalEnd(`${yr}-12-31`);
                          }
                        }}
                        className="w-24 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono font-bold"
                      />
                      <select
                        value={newClientEndMonth}
                        onChange={(e) => {
                          const m = Number(e.target.value) || 12;
                          setNewClientEndMonth(m);
                          const yr = newClientFiscalYear;
                          if (m === 6) {
                            setNewClientFiscalStart(`${yr - 1}-07-01`);
                            setNewClientFiscalEnd(`${yr}-06-30`);
                          } else if (m === 3) {
                            setNewClientFiscalStart(`${yr - 1}-04-01`);
                            setNewClientFiscalEnd(`${yr}-03-31`);
                          } else {
                            setNewClientFiscalStart(`${yr}-01-01`);
                            setNewClientFiscalEnd(`${yr}-12-31`);
                          }
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      >
                        <option value={12}>تنتهي 31 ديسمبر (ميلادية)</option>
                        <option value={6}>تنتهي 30 يونيو (متداخلة 1/7 - 30/6)</option>
                        <option value={3}>تنتهي 31 مارس (متداخلة 1/4 - 31/3)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">بداية السنة المالية (fiscalYearStart)</label>
                    <input
                      type="date"
                      value={newClientFiscalStart}
                      onChange={(e) => setNewClientFiscalStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">نهاية السنة المالية (fiscalYearEnd)</label>
                    <input
                      type="date"
                      value={newClientFiscalEnd}
                      onChange={(e) => setNewClientFiscalEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="رقم التسجيل الضريبي (مثال: 123-456-789)"
                    value={newClientTaxId}
                    onChange={(e) => setNewClientTaxId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="رقم السجل التجاري"
                    value={newClientCommReg}
                    onChange={(e) => setNewClientCommReg(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <input
                  type="number"
                  placeholder="الأتعاب السنوية المتفق عليها (ج.م)"
                  value={newClientFees || ''}
                  onChange={(e) => setNewClientFees(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                {/* خيارات الخضوع الضريبي للمنشأة */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="font-bold text-slate-700 text-xs">
                    الخضوع الضريبي للمنشأة (تظهر في شاشة الإقرارات حسب الخضوع):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={newClientIsVat}
                        onChange={(e) => setNewClientIsVat(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>خاضع للقيمة المضافة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={newClientIsIncome}
                        onChange={(e) => setNewClientIsIncome(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>خاضع لضريبة الدخل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={newClientIsWht}
                        onChange={(e) => setNewClientIsWht(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>خاضع للخصم والإضافة (نموذج 41)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={newClientIsStamp}
                        onChange={(e) => setNewClientIsStamp(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>خاضع لضريبة الدمغة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={newClientHasPayroll}
                        onChange={(e) => setNewClientHasPayroll(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>لديه عمالة / خاضع لضريبة المرتبات (نموذج 4)</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddClientOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    إنشاء وتفعيل المنشأة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <YearEndClosingWizardModal
          isOpen={isClosingWizardOpen}
          onClose={() => setIsClosingWizardOpen(false)}
          state={state}
        />

        <LicenseManagementModal
          isOpen={isLicenseModalOpen}
          onClose={() => setIsLicenseModalOpen(false)}
        />

        <EtaExcelImportModal
          isOpen={isEtaImportModalOpen}
          onClose={() => setIsEtaImportModalOpen(false)}
          defaultClientId={activeClientId}
          onImportSuccess={() => {
            setState({ ...db.getState() });
            notifyBanner('success', 'تم استيراد فواتير المنظومة بنجاح.');
          }}
        />

        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => {
            setIsBackupModalOpen(false);
            setState({ ...db.getState() });
          }}
          currentUserRole={currentUser?.role || 'ADMIN'}
        />

        <ClientTaxPortalCredentialsModal
          isOpen={Boolean(taxCredentialsModalClientId)}
          onClose={() => setTaxCredentialsModalClientId(null)}
          clientId={taxCredentialsModalClientId || activeClientId}
          onSaved={() => {
            setState({ ...db.getState() });
            notifyBanner('success', 'تم حفظ وتشفير بيانات بوابة الضرائب والفاتورة الإلكترونية بنجاح.');
          }}
        />

        {/* شاشة إعداد أول أدمن عند فراغ قائمة المستخدمين */}
        {db.getUsers().length === 0 && (
          <div
            data-testid="first-admin-setup-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
            dir="rtl"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">إعداد أول أدمن</h2>
                  <p className="text-xs text-slate-500">
                    لا يوجد مستخدمون مسجلون في النظام. يرجى إنشاء حساب المدير العام الأول بكلمة مرور قوية.
                  </p>
                </div>
              </div>

              {firstAdminError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-900">
                  {firstAdminError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFirstAdminError(null);
                  if (firstAdminPassword !== firstAdminConfirmPassword) {
                    setFirstAdminError('كلمتا المرور غير متطابقتين.');
                    return;
                  }
                  try {
                    db.setupFirstAdmin({
                      name: firstAdminName,
                      email: firstAdminEmail,
                      password: firstAdminPassword,
                    });
                    setState({ ...db.getState() });
                    notifyBanner('success', 'تم إعداد أول أدمن وتفعيل النظام بنجاح.');
                  } catch (err) {
                    setFirstAdminError(err instanceof Error ? err.message : 'تعذر إعداد أول أدمن');
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="mb-1 block font-bold text-slate-700">اسم المدير العام (الأدمن الأول)</label>
                  <input
                    type="text"
                    required
                    value={firstAdminName}
                    onChange={(e) => setFirstAdminName(e.target.value)}
                    placeholder="مثال: د. محمد جميل مرعي"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={firstAdminEmail}
                    onChange={(e) => setFirstAdminEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    كلمة المرور القوية (8 أحرف على الأقل تشمل حروفاً كبيرة وصغيرة وأرقاماً)
                  </label>
                  <input
                    type="password"
                    required
                    value={firstAdminPassword}
                    onChange={(e) => setFirstAdminPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور قوية..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    required
                    value={firstAdminConfirmPassword}
                    onChange={(e) => setFirstAdminConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
                >
                  إنشاء حساب الأدمن الأول والدخول للنظام
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DensityProvider>
  );
};

export default App;
