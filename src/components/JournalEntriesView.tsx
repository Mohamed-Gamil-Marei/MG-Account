import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Download,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  QrCode,
  History,
  ArrowRight,
  AlertCircle,
  FileText,
  Lock,
  Edit2,
  KeyRound,
  Save,
  RotateCcw,
  Globe,
  RefreshCw,
  Coins,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeftRight,
  FolderArchive,
  Building,
  CheckCircle2,
  X,
  Undo2,
  Redo2,
  AlertTriangle,
} from 'lucide-react';
import { JournalEntry, JournalEntryLine, Account, CurrencyCode, ClientArchiveRecord } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { SecurityAuthModal } from './SecurityAuthModal';
import { SecurityAuthService } from '../services/securityAuth';
import { formDraftStorage, useNetworkStatus } from '../utils/formDrafts';
import { currencyService, SUPPORTED_CURRENCIES } from '../utils/currencyService';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { JournalAutoSuggestBar } from './common/JournalAutoSuggestBar';
import { ClientSelectionReportModal } from './common/ClientSelectionReportModal';
import { AutoSaveStatusBadge } from './common/AutoSaveStatusBadge';
import { DraftRecoveryBanner } from './common/DraftRecoveryBanner';
import { JournalSuggestionEngine, CounterAccountSuggestion, HistoricalPatternMatch } from '../services/journalSuggestionEngine';
import { CompanyHeaderSelector } from './common/CompanyHeaderSelector';
import { QuickCompanyModal } from './common/QuickCompanyModal';
import { ActionButton } from './common/ActionButton';
import {
  cloneJournalLines,
  calculateLinesTotals,
  JournalHistorySnapshot,
  generateActionLabel,
  formatFinancialValue,
} from '../utils/journalUndoEngine';
import { JournalUndoToolbar } from './common/JournalUndoToolbar';
import { ExcelImportManager } from './ExcelImportManager';
import { PrintPreviewModal } from './common/PrintPreviewModal';
import { PrintLayoutWrapper } from './common/PrintLayoutWrapper';
import { PrintService } from '../services/PrintService';
import { Wrench, Printer, UploadCloud, Camera, Zap, ShieldAlert, Check } from 'lucide-react';
import { InvoiceOcrScannerView } from './accounting/InvoiceOcrScannerView';
import { JournalErrorsAuditModal } from './audit/JournalErrorsAuditModal';
import { SmartParsedEntryResult } from '../services/journalSuggestionEngine';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { QuickRowActionDropdown } from './common/QuickRowActionDropdown';
import { MicroKpisTickerBar } from './common/MicroKpisTickerBar';
import { CollapsibleSection } from './common/CollapsibleSection';
import { SlideOverDrawer } from './common/SlideOverDrawer';
import { useDensity } from './common/CompactDensityContext';

interface JournalEntriesViewProps {
  state: DatabaseState;
}

export const JournalEntriesView: React.FC<JournalEntriesViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosted, setFilterPosted] = useState<'ALL' | 'POSTED' | 'DRAFT'>('ALL');
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [selectedEntryForView, setSelectedEntryForView] = useState<JournalEntry | null>(null);

  // Security Auth for Edit Mode
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Multi-Currency State
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>('EGP');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | null>(null);
  const [ratesSource, setRatesSource] = useState<string | null>(null);

  // Smart suggestion state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAmount, setAiAmount] = useState<number | ''>('');
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Form State for Entry Creation
  const [entryStep, setEntryStep] = useState<number>(1);
  const [entryFormMode, setEntryFormMode] = useState<'WIZARD' | 'CLASSIC'>('WIZARD');
  const [showAdvancedCurrency, setShowAdvancedCurrency] = useState<boolean>(false);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<JournalEntry['entryType']>('GENERAL');
  const [entryClientId, setEntryClientId] = useState<string | null>(state.activeClientContext?.clientId || null);
  const [isQuickCompanyModalInEntryOpen, setIsQuickCompanyModalInEntryOpen] = useState(false);
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
    { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
  ]);

  // Undo & Redo History State for Financial Lines & Numbers
  const [undoHistory, setUndoHistory] = useState<JournalHistorySnapshot[]>([]);
  const [redoHistory, setRedoHistory] = useState<JournalHistorySnapshot[]>([]);
  const [lastUndoMessage, setLastUndoMessage] = useState<string | null>(null);

  // Auto-Save & Draft State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [manualSaveToast, setManualSaveToast] = useState<string | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);
  const isOnline = useNetworkStatus();
  const isInitialDraftLoaded = useRef(false);

  // Excel Import & Print Modals State
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isPrintJournalModalOpen, setIsPrintJournalModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isUnbalancedExpanded, setIsUnbalancedExpanded] = useState(true);

  // AI Journal Error Audit Modal State
  const [isAuditErrorsModalOpen, setIsAuditErrorsModalOpen] = useState(false);

  // Quick Smart Entry Generator State (الوصف والقيمة فقط -> قيد متوازن فوري)
  const [isSmartGeneratorOpen, setIsSmartGeneratorOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAmount, setQuickAmount] = useState<number | ''>('');
  const [quickFeedback, setQuickFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isQuickPosting, setIsQuickPosting] = useState(false);

  // Real-time live preview for Quick Smart Entry
  const quickPreview = useMemo<SmartParsedEntryResult | null>(() => {
    if (!quickDesc.trim()) return null;
    return JournalSuggestionEngine.parsePromptToBalancedEntry(
      quickDesc,
      Number(quickAmount) || 0,
      state.accounts,
      state.journalEntries
    );
  }, [quickDesc, quickAmount, state.accounts, state.journalEntries]);

  // Review & Edit in Modal
  const handleQuickReviewAndEdit = () => {
    if (!quickDesc.trim()) {
      alert('يرجى كتابة وصف العملية أولاً (مثال: سداد إيجار نقداً، مبيعات نقدية بضريبة 14%...)');
      return;
    }
    const numAmt = Number(quickAmount) || 0;
    const parsed = JournalSuggestionEngine.parsePromptToBalancedEntry(
      quickDesc,
      numAmt,
      state.accounts,
      state.journalEntries
    );

    setDescription(parsed.description);
    setEntryType(parsed.entryType);
    setEntryClientId(state.activeClientContext?.clientId || null);
    setLines(
      parsed.lines.map((l, idx) => ({
        ...l,
        id: `l${idx + 1}`,
        currency: 'EGP',
        exchangeRate: 1.0,
        foreignDebit: 0,
        foreignCredit: 0,
      }))
    );
    setEntryStep(1);
    setIsNewEntryModalOpen(true);
  };

  // Instant 1-Click Post to General Ledger
  const handleQuickInstantPost = () => {
    if (!quickDesc.trim()) {
      setQuickFeedback({ type: 'error', message: 'يرجى إدخال وصف العملية المالية أولاً' });
      return;
    }
    const numAmt = Number(quickAmount) || 0;
    if (numAmt <= 0) {
      setQuickFeedback({ type: 'error', message: 'يرجى إدخال قيمة صحيحة للعملية أكبر من الصفر' });
      return;
    }

    setIsQuickPosting(true);
    try {
      const parsed = JournalSuggestionEngine.parsePromptToBalancedEntry(
        quickDesc,
        numAmt,
        state.accounts,
        state.journalEntries
      );

      const targetClientId = state.activeClientContext?.clientId || undefined;
      const targetClient = state.clients.find((c) => c.id === targetClientId);

      const created = db.addJournalEntry({
        date: new Date().toISOString().slice(0, 10),
        description: parsed.description,
        currency: 'EGP',
        exchangeRate: 1.0,
        lines: parsed.lines.map((l, idx) => ({
          ...l,
          id: `l${idx + 1}`,
          currency: 'EGP',
          exchangeRate: 1.0,
          foreignDebit: 0,
          foreignCredit: 0,
        })),
        totalDebit: parsed.totalDebit,
        totalCredit: parsed.totalCredit,
        isPosted: true,
        entryType: parsed.entryType,
        clientId: targetClientId,
        clientName: targetClient?.name,
      });

      setQuickFeedback({
        type: 'success',
        message: `تم إنشاء القيد (#${created.serialNumber}) بنجاح وترحيله فورياً لدفتر الأستاذ العام! (مدين: ${parsed.detectedDebitAccountName} | دائن: ${parsed.detectedCreditAccountName})`,
      });
      setQuickDesc('');
      setQuickAmount('');
      setTimeout(() => setQuickFeedback(null), 5000);
    } catch (err: any) {
      setQuickFeedback({ type: 'error', message: err.message || 'حدث خطأ أثناء حفظ القيد الآلي' });
    } finally {
      setIsQuickPosting(false);
    }
  };

  // Presets
  const applyQuickPreset = (desc: string, amt: number) => {
    setQuickDesc(desc);
    setQuickAmount(amt);
  };

  // Automatic Balance Validator: Scan all entries in database for debit != credit
  const unbalancedEntries = useMemo(() => {
    return state.journalEntries.filter((e) => {
      const diff = Math.abs((e.totalDebit || 0) - (e.totalCredit || 0));
      return diff > 0.009 || !e.lines || e.lines.length < 2;
    });
  }, [state.journalEntries]);

  // 1-Click Balance Fix Handler for Unbalanced Entry
  const handleAutoFixUnbalancedEntry = (entryId: string) => {
    const entry = state.journalEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const diff = (entry.totalDebit || 0) - (entry.totalCredit || 0);
    if (Math.abs(diff) < 0.01) return;

    // Find predefined settlement account or fallback
    const settlementAcc =
      state.accounts.find(
        (a) =>
          a.id === state.preferences.defaultSettlementAccountId ||
          a.code === '1999' ||
          a.name.includes('تسوية') ||
          a.name.includes('أرباح وخسائر')
      ) || {
        id: 'acc-settlement-default',
        code: '1999',
        name: 'حساب تسوية الفروق المعلقة',
      };

    const newLines = [...entry.lines];
    if (diff > 0) {
      // Debit > Credit -> Add Credit line to balance
      newLines.push({
        id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        accountId: settlementAcc.id,
        accountCode: settlementAcc.code,
        accountName: settlementAcc.name,
        debit: 0,
        credit: Number(diff.toFixed(2)),
        currency: entry.currency || 'EGP',
        exchangeRate: entry.exchangeRate || 1.0,
        description: 'تسوية آلية لفرق توازن القيد (Automatic Balance Fix)',
      });
    } else {
      // Credit > Debit -> Add Debit line to balance
      const absDiff = Math.abs(diff);
      newLines.push({
        id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        accountId: settlementAcc.id,
        accountCode: settlementAcc.code,
        accountName: settlementAcc.name,
        debit: Number(absDiff.toFixed(2)),
        credit: 0,
        currency: entry.currency || 'EGP',
        exchangeRate: entry.exchangeRate || 1.0,
        description: 'تسوية آلية لفرق توازن القيد (Automatic Balance Fix)',
      });
    }

    const calc = calculateLinesTotals(newLines);
    db.updateJournalEntry(entryId, {
      lines: newLines,
      totalDebit: calc.totalDebit,
      totalCredit: calc.totalCredit,
    });
  };

  const handleAutoFixAllUnbalancedEntries = () => {
    if (unbalancedEntries.length === 0) return;
    unbalancedEntries.forEach((e) => handleAutoFixUnbalancedEntry(e.id));
    alert(`تم إصلاح وتسوية ${unbalancedEntries.length} قيد محاسبي غير متزن آلياً بنجاح.`);
  };

  // Fetch live exchange rates on mount
  useEffect(() => {
    const loadRates = async () => {
      setIsFetchingRates(true);
      try {
        const rates = await currencyService.fetchLiveRates();
        if (rates[entryCurrency]) {
          setExchangeRate(rates[entryCurrency].rateAgainstEgp);
          setRatesLastUpdated(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
          setRatesSource(rates[entryCurrency].source === 'LIVE_API' ? 'سعر حي (Live API)' : 'سعر مرجعي موثوق');
        }
      } catch (err) {
        console.error('Error fetching initial currency rates:', err);
      } finally {
        setIsFetchingRates(false);
      }
    };
    loadRates();
  }, []);

  // Load existing draft on initial component mount if present
  useEffect(() => {
    if (isInitialDraftLoaded.current) return;
    isInitialDraftLoaded.current = true;

    const savedDraft = formDraftStorage.getJournalDraft();
    if (
      savedDraft &&
      (savedDraft.description?.trim() ||
        savedDraft.aiPrompt?.trim() ||
        savedDraft.lines?.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
    ) {
      setDate(savedDraft.date || new Date().toISOString().slice(0, 10));
      setDescription(savedDraft.description || '');
      setEntryType((savedDraft.entryType as any) || 'GENERAL');
      if (savedDraft.currency) setEntryCurrency(savedDraft.currency as CurrencyCode);
      if (savedDraft.exchangeRate) setExchangeRate(savedDraft.exchangeRate);
      if (savedDraft.clientId !== undefined) setEntryClientId(savedDraft.clientId);
      if (savedDraft.entryFormMode) setEntryFormMode(savedDraft.entryFormMode);
      if (savedDraft.entryStep) setEntryStep(savedDraft.entryStep);
      if (savedDraft.lines && savedDraft.lines.length >= 2) {
        setLines(savedDraft.lines);
      }
      if (savedDraft.aiPrompt) setAiPrompt(savedDraft.aiPrompt);
      if (savedDraft.aiAmount !== undefined) setAiAmount(savedDraft.aiAmount);
      if (savedDraft.aiExplanation) setAiExplanation(savedDraft.aiExplanation);

      setDraftRestoredNotice(
        `تم استعادة مسودة القيد تلقائياً من الذاكرة المحلية (${savedDraft.meta?.timeFormatted || 'سابقاً'}) لتجنب فقدان العمل في حال انقطاع الاتصال أو تحديث الصفحة.`
      );
      setLastAutoSaveTime(savedDraft.meta?.timeFormatted || null);
    }
  }, []);

  // Synchronous flush on page reload or beforeunload to ensure zero data loss on refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editingEntryId) return;
      const hasMeaningfulData =
        Boolean(description.trim()) ||
        Boolean(aiPrompt.trim()) ||
        lines.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0);

      if (hasMeaningfulData) {
        formDraftStorage.saveJournalDraft({
          date,
          entryType,
          currency: entryCurrency,
          exchangeRate,
          description,
          clientId: entryClientId,
          entryFormMode,
          entryStep,
          lines,
          aiPrompt,
          aiAmount,
          aiExplanation,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    date,
    entryType,
    entryCurrency,
    exchangeRate,
    description,
    entryClientId,
    entryFormMode,
    entryStep,
    lines,
    aiPrompt,
    aiAmount,
    aiExplanation,
    editingEntryId,
  ]);

  // Auto-save changes to localStorage whenever fields update in new entry mode
  useEffect(() => {
    if (editingEntryId) return; // Do not overwrite new draft when editing an existing archived record

    const hasMeaningfulData =
      Boolean(description.trim()) ||
      Boolean(aiPrompt.trim()) ||
      lines.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0);

    if (!hasMeaningfulData) return;

    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      const meta = formDraftStorage.saveJournalDraft({
        date,
        entryType,
        currency: entryCurrency,
        exchangeRate,
        description,
        clientId: entryClientId,
        entryFormMode,
        entryStep,
        lines,
        aiPrompt,
        aiAmount,
        aiExplanation,
      });
      setLastAutoSaveTime(meta.timeFormatted);
      setIsAutoSaving(false);
    }, 400);

    return () => {
      clearTimeout(timer);
      setIsAutoSaving(false);
    };
  }, [
    date,
    entryType,
    entryCurrency,
    exchangeRate,
    description,
    entryClientId,
    entryFormMode,
    entryStep,
    lines,
    aiPrompt,
    aiAmount,
    aiExplanation,
    editingEntryId,
  ]);

  // Manual save draft helper
  const handleManualSaveDraft = () => {
    if (editingEntryId) return;
    setIsAutoSaving(true);
    const meta = formDraftStorage.saveJournalDraft({
      date,
      entryType,
      currency: entryCurrency,
      exchangeRate,
      description,
      clientId: entryClientId,
      entryFormMode,
      entryStep,
      lines,
      aiPrompt,
      aiAmount,
      aiExplanation,
    });
    setLastAutoSaveTime(meta.timeFormatted);
    setIsAutoSaving(false);
    setManualSaveToast(`تم حفظ مسودة القيد يدوياً في ذاكرة المتصفح (${meta.timeFormatted})`);
    setTimeout(() => setManualSaveToast(null), 3500);
  };

  // Has unsaved draft flag for screen-level recovery banner
  const hasUnsavedDraft = useMemo(() => {
    if (editingEntryId) return false;
    const hasData =
      Boolean(description.trim()) ||
      Boolean(aiPrompt.trim()) ||
      lines.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0);
    return Boolean(hasData && (lastAutoSaveTime || formDraftStorage.hasJournalDraft()));
  }, [editingEntryId, description, aiPrompt, lines, lastAutoSaveTime]);

  const handleRefreshRates = async () => {
    setIsFetchingRates(true);
    try {
      const rates = await currencyService.fetchLiveRates();
      const current = rates[entryCurrency];
      if (current) {
        setExchangeRate(current.rateAgainstEgp);
        setRatesLastUpdated(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setRatesSource(current.source === 'LIVE_API' ? 'سعر حي متصل بالـ API' : 'سعر مرجعي معتمد');
        
        // Recalculate line EGP amounts if foreign amounts exist
        if (entryCurrency !== 'EGP') {
          const rate = current.rateAgainstEgp;
          setLines(prev => prev.map(l => ({
            ...l,
            currency: entryCurrency,
            exchangeRate: rate,
            debit: l.foreignDebit ? Number((l.foreignDebit * rate).toFixed(2)) : l.debit,
            credit: l.foreignCredit ? Number((l.foreignCredit * rate).toFixed(2)) : l.credit,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to refresh rates', err);
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleCurrencyChange = (newCur: CurrencyCode) => {
    setEntryCurrency(newCur);
    const newRate = currencyService.getRate(newCur);
    setExchangeRate(newRate);

    // Update lines with new currency and recalculate
    setLines(prev => prev.map(l => {
      if (newCur === 'EGP') {
        return {
          ...l,
          currency: 'EGP',
          exchangeRate: 1.0,
          foreignDebit: 0,
          foreignCredit: 0,
        };
      } else {
        const fDeb = l.foreignDebit || (l.debit > 0 ? Number((l.debit / newRate).toFixed(2)) : 0);
        const fCred = l.foreignCredit || (l.credit > 0 ? Number((l.credit / newRate).toFixed(2)) : 0);
        return {
          ...l,
          currency: newCur,
          exchangeRate: newRate,
          foreignDebit: fDeb,
          foreignCredit: fCred,
          debit: Number((fDeb * newRate).toFixed(2)),
          credit: Number((fCred * newRate).toFixed(2)),
        };
      }
    }));
  };

  const handleExchangeRateChange = (newRate: number) => {
    const validRate = isNaN(newRate) || newRate <= 0 ? 1 : newRate;
    setExchangeRate(validRate);

    if (entryCurrency !== 'EGP') {
      setLines(prev => prev.map(l => ({
        ...l,
        exchangeRate: validRate,
        debit: l.foreignDebit ? Number((l.foreignDebit * validRate).toFixed(2)) : l.debit,
        credit: l.foreignCredit ? Number((l.foreignCredit * validRate).toFixed(2)) : l.credit,
      })));
    }
  };

  const handleClearDraft = () => {
    if (window.confirm('هل تريد مسح المسودة المحفوظة والبدء بنموذج قيد فارغ جديد؟')) {
      formDraftStorage.clearJournalDraft();
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setEntryType('GENERAL');
      setEntryCurrency('EGP');
      setExchangeRate(1.0);
      setEntryClientId(state.activeClientContext?.clientId || null);
      setEntryFormMode('WIZARD');
      setEntryStep(1);
      setAiPrompt('');
      setAiAmount('');
      setAiExplanation(null);
      setLines([
        { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
        { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
      ]);
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
      setManualSaveToast(null);
    }
  };

  // Core financial calculations for totals, differences, balance, negative values, and decimals
  const {
    totalDebit,
    totalCredit,
    foreignTotalDebit,
    foreignTotalCredit,
    difference,
    foreignDifference,
    isBalanced,
    hasNegativeValues,
    hasDecimals,
  } = useMemo(() => calculateLinesTotals(lines), [lines]);

  // Push an undo snapshot to history before a state mutation
  const pushUndoSnapshot = (
    actionType: string,
    meta?: {
      lineIndex?: number;
      accountName?: string;
      field?: string;
      oldVal?: any;
      newVal?: any;
      diff?: number;
      currency?: string;
    },
    snapshotLines?: JournalEntryLine[]
  ) => {
    const linesToSave = cloneJournalLines(snapshotLines || lines);
    const totals = calculateLinesTotals(linesToSave);
    const { label, category } = generateActionLabel(actionType, {
      ...meta,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });

    const newSnapshot: JournalHistorySnapshot = {
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(),
      actionLabel: label,
      actionCategory: category,
      lines: linesToSave,
      currency: entryCurrency,
      exchangeRate: exchangeRate,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      difference: totals.difference,
      detail: meta
        ? {
            lineIndex: meta.lineIndex,
            accountName: meta.accountName,
            field: meta.field as any,
            oldValue: meta.oldVal,
            newValue: meta.newVal,
          }
        : undefined,
    };

    setUndoHistory((prev) => [...prev.slice(-40), newSnapshot]);
    setRedoHistory([]); // Reset redo stack when new user action occurs
  };

  // Undo the last action
  const handleUndo = () => {
    if (undoHistory.length === 0) return;

    const lastSnapshot = undoHistory[undoHistory.length - 1];
    const newUndoHistory = undoHistory.slice(0, undoHistory.length - 1);

    const currentLinesSnapshot = cloneJournalLines(lines);
    const currentTotals = calculateLinesTotals(currentLinesSnapshot);
    const currentRedoSnapshot: JournalHistorySnapshot = {
      id: `redo-${Date.now()}`,
      timestamp: new Date(),
      actionLabel: lastSnapshot.actionLabel,
      actionCategory: lastSnapshot.actionCategory,
      lines: currentLinesSnapshot,
      currency: entryCurrency,
      exchangeRate: exchangeRate,
      totalDebit: currentTotals.totalDebit,
      totalCredit: currentTotals.totalCredit,
      difference: currentTotals.difference,
    };

    setRedoHistory((prev) => [...prev, currentRedoSnapshot]);
    setUndoHistory(newUndoHistory);
    setLines(cloneJournalLines(lastSnapshot.lines));
    if (lastSnapshot.currency && lastSnapshot.currency !== entryCurrency) {
      setEntryCurrency(lastSnapshot.currency);
      setExchangeRate(lastSnapshot.exchangeRate || 1.0);
    }
    setLastUndoMessage(`تم التراجع عن: ${lastSnapshot.actionLabel}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  // Redo the reverted action
  const handleRedo = () => {
    if (redoHistory.length === 0) return;

    const nextSnapshot = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, redoHistory.length - 1);

    const currentLinesSnapshot = cloneJournalLines(lines);
    const currentTotals = calculateLinesTotals(currentLinesSnapshot);
    const currentUndoSnapshot: JournalHistorySnapshot = {
      id: `undo-${Date.now()}`,
      timestamp: new Date(),
      actionLabel: nextSnapshot.actionLabel,
      actionCategory: nextSnapshot.actionCategory,
      lines: currentLinesSnapshot,
      currency: entryCurrency,
      exchangeRate: exchangeRate,
      totalDebit: currentTotals.totalDebit,
      totalCredit: currentTotals.totalCredit,
      difference: currentTotals.difference,
    };

    setUndoHistory((prev) => [...prev, currentUndoSnapshot]);
    setRedoHistory(newRedoHistory);
    setLines(cloneJournalLines(nextSnapshot.lines));
    if (nextSnapshot.currency && nextSnapshot.currency !== entryCurrency) {
      setEntryCurrency(nextSnapshot.currency);
      setExchangeRate(nextSnapshot.exchangeRate || 1.0);
    }
    setLastUndoMessage(`تمت إعادة: ${nextSnapshot.actionLabel}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  // Restore directly to a specific point in the history log
  const handleRestoreSnapshot = (snapshot: JournalHistorySnapshot, index: number) => {
    const currentLinesSnapshot = cloneJournalLines(lines);
    const currentTotals = calculateLinesTotals(currentLinesSnapshot);
    setRedoHistory((prev) => [
      ...prev,
      {
        id: `redo-${Date.now()}`,
        timestamp: new Date(),
        actionLabel: 'استعادة حالة سابقة',
        actionCategory: 'GENERAL',
        lines: currentLinesSnapshot,
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        totalDebit: currentTotals.totalDebit,
        totalCredit: currentTotals.totalCredit,
        difference: currentTotals.difference,
      },
    ]);

    setUndoHistory((prev) => prev.slice(0, index));
    setLines(cloneJournalLines(snapshot.lines));
    if (snapshot.currency) {
      setEntryCurrency(snapshot.currency);
      setExchangeRate(snapshot.exchangeRate || 1.0);
    }
    setLastUndoMessage(`تمت استعادة نقطة التعديل (${snapshot.actionLabel})`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  // Keyboard shortcut listener for Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isNewEntryModalOpen) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewEntryModalOpen, undoHistory, redoHistory, lines, entryCurrency, exchangeRate]);

  // Account usage stats derived from all historical journal entries
  const accountStatsMap = useMemo(() => {
    return JournalSuggestionEngine.getAccountUsageStats(state.journalEntries, state.accounts);
  }, [state.journalEntries, state.accounts]);

  // Handler: Swap Debit & Credit sides (عكس أطراف القيد)
  const handleSwapDebitCredit = () => {
    pushUndoSnapshot('REVERSE_ENTRY', {
      diff: difference,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });
    const newLines = lines.map((l) => ({
      ...l,
      debit: l.credit,
      credit: l.debit,
      foreignDebit: l.foreignCredit,
      foreignCredit: l.foreignDebit,
    }));
    setLines(newLines);
    setLastUndoMessage('تم عكس أطراف القيد (تبديل المدين والدائن)');
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  // Handler: Convert amounts to Red Storno negative correction (تسوية سالبة)
  const handleApplyStornoCorrection = () => {
    pushUndoSnapshot('STORNO_CORRECTION', {
      diff: difference,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });
    const newLines = lines.map((l) => ({
      ...l,
      debit: l.debit > 0 ? -Math.abs(l.debit) : l.debit,
      credit: l.credit > 0 ? -Math.abs(l.credit) : l.credit,
      foreignDebit: l.foreignDebit > 0 ? -Math.abs(l.foreignDebit) : l.foreignDebit,
      foreignCredit: l.foreignCredit > 0 ? -Math.abs(l.foreignCredit) : l.foreignCredit,
      description: l.description ? `(تسوية سالبة Storno) ${l.description}` : 'تسوية قيد عكسي سالب (Storno)',
    }));
    setLines(newLines);
    setLastUndoMessage('تم تحويل أطراف القيد إلى تسوية عكسية سالبة (Red Storno)');
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  // Handler: Auto-balance the difference by appending or adjusting balancing line
  const handleAutoBalanceDifference = () => {
    if (difference <= 0) return;
    pushUndoSnapshot('AUTO_BALANCE', {
      diff: difference,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });

    const isDeb = totalDebit < totalCredit;
    const diffVal = difference;
    const emptyIndex = lines.findIndex((l) => !l.accountId && !l.debit && !l.credit);

    if (emptyIndex !== -1) {
      const newLines = cloneJournalLines(lines);
      newLines[emptyIndex] = {
        ...newLines[emptyIndex],
        debit: isDeb ? diffVal : 0,
        credit: !isDeb ? diffVal : 0,
        foreignDebit:
          entryCurrency !== 'EGP' && exchangeRate > 0 && isDeb
            ? Number((diffVal / exchangeRate).toFixed(2))
            : 0,
        foreignCredit:
          entryCurrency !== 'EGP' && exchangeRate > 0 && !isDeb
            ? Number((diffVal / exchangeRate).toFixed(2))
            : 0,
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        description: `موازنة طرف ${isDeb ? 'مدين' : 'دائن'} للفارق`,
      };
      setLines(newLines);
    } else {
      setLines([
        ...lines,
        {
          id: `bal-l-${Date.now()}`,
          accountId: '',
          accountCode: '',
          accountName: '',
          debit: isDeb ? diffVal : 0,
          credit: !isDeb ? diffVal : 0,
          foreignDebit:
            entryCurrency !== 'EGP' && exchangeRate > 0 && isDeb
              ? Number((diffVal / exchangeRate).toFixed(2))
              : 0,
          foreignCredit:
            entryCurrency !== 'EGP' && exchangeRate > 0 && !isDeb
              ? Number((diffVal / exchangeRate).toFixed(2))
              : 0,
          currency: entryCurrency,
          exchangeRate: exchangeRate,
          description: `موازنة طرف ${isDeb ? 'مدين' : 'دائن'} للفارق`,
        },
      ]);
    }
    setLastUndoMessage(`تمت موازنة فارق القيد بقيمة ${formatFinancialValue(diffVal, 'ج.م')}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  const handleQuickBalance = () => {
    handleAutoBalanceDifference();
  };

  const handleQuickBalanceWithAccount = (account: Account, nature: 'DEBIT' | 'CREDIT', amount: number) => {
    if (amount <= 0) return;
    pushUndoSnapshot('AUTO_BALANCE', {
      diff: amount,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });

    const isDeb = nature === 'DEBIT';
    const emptyIndex = lines.findIndex((l) => !l.accountId && !l.debit && !l.credit);

    if (emptyIndex !== -1) {
      const newLines = cloneJournalLines(lines);
      newLines[emptyIndex] = {
        ...newLines[emptyIndex],
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit: isDeb ? amount : 0,
        credit: !isDeb ? amount : 0,
        foreignDebit:
          entryCurrency !== 'EGP' && exchangeRate > 0 && isDeb
            ? Number((amount / exchangeRate).toFixed(2))
            : 0,
        foreignCredit:
          entryCurrency !== 'EGP' && exchangeRate > 0 && !isDeb
            ? Number((amount / exchangeRate).toFixed(2))
            : 0,
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        description: `موازنة القيد آلياً بحساب ${account.name}`,
      };
      setLines(newLines);
    } else {
      setLines([
        ...lines,
        {
          id: `bal-l-${Date.now()}`,
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          debit: isDeb ? amount : 0,
          credit: !isDeb ? amount : 0,
          foreignDebit:
            entryCurrency !== 'EGP' && exchangeRate > 0 && isDeb
              ? Number((amount / exchangeRate).toFixed(2))
              : 0,
          foreignCredit:
            entryCurrency !== 'EGP' && exchangeRate > 0 && !isDeb
              ? Number((amount / exchangeRate).toFixed(2))
              : 0,
          currency: entryCurrency,
          exchangeRate: exchangeRate,
          description: `موازنة القيد آلياً بحساب ${account.name}`,
        },
      ]);
    }
    setLastUndoMessage(`تمت موازنة القيد بحساب ${account.name} بقيمة ${formatFinancialValue(amount, 'ج.م')}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  const handleApplyHistoricalPattern = (pattern: HistoricalPatternMatch) => {
    if (!pattern || !pattern.lines || pattern.lines.length === 0) return;
    pushUndoSnapshot('APPLY_TEMPLATE', {
      accountName: pattern.title,
    });

    const newLines: JournalEntryLine[] = pattern.lines.map((line, idx) => {
      const matchedAccount = state.accounts.find(
        (a) => a.code === line.accountCode || a.name === line.accountName
      );
      const isDeb = line.nature === 'DEBIT';
      const lineAmt = line.typicalAmount || 0;

      return {
        id: `pat-${Date.now()}-${idx}`,
        accountId: matchedAccount?.id || '',
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: isDeb ? lineAmt : 0,
        credit: !isDeb ? lineAmt : 0,
        foreignDebit: 0,
        foreignCredit: 0,
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        description: line.description || pattern.description || pattern.title,
      };
    });

    setLines(newLines);
    if (!description && pattern.description) {
      setDescription(pattern.description);
    }
    setLastUndoMessage(`تم تطبيق النمط التاريخي المتكرر: ${pattern.title}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  const handleAddSuggestedCounterLine = (suggestion: CounterAccountSuggestion) => {
    if (!suggestion || !suggestion.account) return;
    pushUndoSnapshot('ADD_LINE', {
      accountName: suggestion.account.name,
    });

    const isDeb = suggestion.suggestedNature === 'DEBIT';
    const amount = suggestion.suggestedAmount || difference || 0;

    const newLine: JournalEntryLine = {
      id: `sug-${Date.now()}`,
      accountId: suggestion.account.id,
      accountCode: suggestion.account.code,
      accountName: suggestion.account.name,
      debit: isDeb ? amount : 0,
      credit: !isDeb ? amount : 0,
      foreignDebit:
        entryCurrency !== 'EGP' && exchangeRate > 0 && isDeb
          ? Number((amount / exchangeRate).toFixed(2))
          : 0,
      foreignCredit:
        entryCurrency !== 'EGP' && exchangeRate > 0 && !isDeb
          ? Number((amount / exchangeRate).toFixed(2))
          : 0,
      currency: entryCurrency,
      exchangeRate: exchangeRate,
      description: suggestion.sampleDescription || `الطرف المقابل المقترح (${suggestion.account.name})`,
    };

    setLines([...lines, newLine]);
    setLastUndoMessage(`تمت إضافة الحساب المقابل المقترح: ${suggestion.account.name}`);
    setTimeout(() => setLastUndoMessage(null), 3500);
  };

  const handleAccountSelect = (index: number, accountId: string) => {
    const acc = state.accounts.find((a) => a.id === accountId);
    if (!acc) return;

    pushUndoSnapshot('EDIT_ACCOUNT', {
      lineIndex: index,
      accountName: acc.name,
      oldVal: lines[index]?.accountName,
      newVal: acc.name,
    });

    const newLines = cloneJournalLines(lines);
    newLines[index] = {
      ...newLines[index],
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      currency: newLines[index].currency || entryCurrency,
      exchangeRate: newLines[index].exchangeRate || exchangeRate,
    };
    setLines(newLines);
  };

  // Numerical amount change handler supporting decimals, negatives (Storno), and auto-zeroing opposing side
  const handleAmountChange = (
    index: number,
    field: 'debit' | 'credit' | 'foreignDebit' | 'foreignCredit',
    rawVal: string | number
  ) => {
    const line = lines[index];
    if (!line) return;

    const acc = state.accounts.find((a) => a.id === line.accountId);
    const accName = acc?.name || line.accountName || `طرف #${index + 1}`;
    const numVal = typeof rawVal === 'number' ? rawVal : rawVal === '' ? 0 : parseFloat(rawVal) || 0;
    const oldVal = line[field] || 0;

    if (oldVal === numVal) return;

    // Push snapshot before changing amount
    pushUndoSnapshot(
      field === 'debit'
        ? 'EDIT_DEBIT'
        : field === 'credit'
        ? 'EDIT_CREDIT'
        : field === 'foreignDebit'
        ? 'EDIT_FOREIGN_DEBIT'
        : 'EDIT_FOREIGN_CREDIT',
      {
        lineIndex: index,
        accountName: accName,
        field,
        oldVal,
        newVal: numVal,
        currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
      }
    );

    const newLines = cloneJournalLines(lines);
    const currentRate = newLines[index].exchangeRate || exchangeRate || 1.0;

    if (field === 'foreignDebit') {
      newLines[index] = {
        ...newLines[index],
        foreignDebit: numVal,
        foreignCredit: 0,
        debit: entryCurrency !== 'EGP' ? Number((numVal * currentRate).toFixed(2)) : numVal,
        credit: 0,
      };
    } else if (field === 'foreignCredit') {
      newLines[index] = {
        ...newLines[index],
        foreignCredit: numVal,
        foreignDebit: 0,
        credit: entryCurrency !== 'EGP' ? Number((numVal * currentRate).toFixed(2)) : numVal,
        debit: 0,
      };
    } else if (field === 'debit') {
      newLines[index] = {
        ...newLines[index],
        debit: numVal,
        credit: 0,
        foreignDebit: entryCurrency !== 'EGP' && currentRate > 0 ? Number((numVal / currentRate).toFixed(2)) : numVal,
        foreignCredit: 0,
      };
    } else if (field === 'credit') {
      newLines[index] = {
        ...newLines[index],
        credit: numVal,
        debit: 0,
        foreignCredit: entryCurrency !== 'EGP' && currentRate > 0 ? Number((numVal / currentRate).toFixed(2)) : numVal,
        foreignDebit: 0,
      };
    }

    setLines(newLines);
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    if (field === 'debit' || field === 'credit' || field === 'foreignDebit' || field === 'foreignCredit') {
      handleAmountChange(index, field, value);
      return;
    }

    const newLines = cloneJournalLines(lines);
    newLines[index] = {
      ...newLines[index],
      [field]: value,
    };
    setLines(newLines);
  };

  const addLine = () => {
    pushUndoSnapshot('ADD_LINE', {
      lineIndex: lines.length,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });

    setLines([
      ...lines,
      {
        id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        accountId: '',
        accountCode: '',
        accountName: '',
        debit: 0,
        credit: 0,
        foreignDebit: 0,
        foreignCredit: 0,
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        description: '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (مدين ودائن)');
      return;
    }

    const targetLine = lines[index];
    pushUndoSnapshot('REMOVE_LINE', {
      lineIndex: index,
      accountName: targetLine.accountName,
      oldVal: targetLine.debit || targetLine.credit || 0,
      currency: entryCurrency === 'EGP' ? 'ج.م' : entryCurrency,
    });

    setLines(lines.filter((_, i) => i !== index));
  };

  // Smart Pre-built Egyptian Templates
  const applyPresetTemplate = (templateType: string) => {
    const amountVal = typeof aiAmount === 'number' && aiAmount > 0 ? aiAmount : 100000;

    if (templateType === 'SALES_VAT_WHT') {
      const vat = amountVal * 0.14;
      const wht = amountVal * 0.01;
      const netClient = amountVal + vat - wht;

      setDescription(`إثبات فاتورة مبيعات بضاعة بقيمة ${amountVal} ج.م + ضريبة ق.م 14% - خصم 1% أ.ت.ص`);
      setEntryType('SALES');
      setLines([
        {
          id: 'l1',
          accountId: state.accounts.find((a) => a.code === '1220')?.id || '',
          accountCode: '1220',
          accountName: 'العملاء والمدينون التجاريون',
          debit: netClient,
          credit: 0,
          description: 'صافي المطالبة المستحقة على العميل',
        },
        {
          id: 'l2',
          accountId: state.accounts.find((a) => a.code === '1230')?.id || '',
          accountCode: '1230',
          accountName: 'مصلحة الضرائب المصرية - ضريبة خصم وتحصيل (أ.ت.ص)',
          debit: wht,
          credit: 0,
          description: 'خصم أ.ت.ص 1% محتجز لدى العميل',
        },
        {
          id: 'l3',
          accountId: state.accounts.find((a) => a.code === '4110')?.id || '',
          accountCode: '4110',
          accountName: 'إيرادات المبيعات والنشاط التجاري والصناعي',
          debit: 0,
          credit: amountVal,
          description: 'قيمة المبيعات الإجمالية قبل الضريبة',
        },
        {
          id: 'l4',
          accountId: state.accounts.find((a) => a.code === '2230')?.id || '',
          accountCode: '2230',
          accountName: 'مصلحة الضرائب على القيمة المضافة - مخرجات ومبيعات',
          debit: 0,
          credit: vat,
          description: 'ضريبة القيمة المضافة 14% مخرجات',
        },
      ]);
      setAiExplanation('تم إعداد قيد المبيعات وفقاً لمعيار المحاسبة المصري رقم (48) وقانون الضريبة على القيمة المضافة رقم 67 لسنة 2016.');
    } else if (templateType === 'PURCHASE_VAT_WHT') {
      const vat = amountVal * 0.14;
      const wht = amountVal * 0.01;
      const netSupplier = amountVal + vat - wht;

      setDescription(`شراء خامات وبضاعة بقيمة ${amountVal} ج.م مع ضريبة ق.م 14% وخصم 1% أ.ت.ص`);
      setEntryType('PURCHASE');
      setLines([
        {
          id: 'l1',
          accountId: state.accounts.find((a) => a.code === '5110')?.id || '',
          accountCode: '5110',
          accountName: 'مشتريات خامات وبضاعة بغرض البيع',
          debit: amountVal,
          credit: 0,
          description: 'تكلفة المشتريات الخاضعة للضريبة',
        },
        {
          id: 'l2',
          accountId: state.accounts.find((a) => a.code === '1235')?.id || '',
          accountCode: '1235',
          accountName: 'مصلحة الضرائب على القيمة المضافة - مدخلات ومشتريات',
          debit: vat,
          credit: 0,
          description: 'ضريبة ق.م 14% مدخلات قابلة للخصم',
        },
        {
          id: 'l3',
          accountId: state.accounts.find((a) => a.code === '2238')?.id || '',
          accountCode: '2238',
          accountName: 'مصلحة الضرائب - ضريبة الخصم والتحصيل أ.ت.ص مستحقة',
          debit: 0,
          credit: wht,
          description: 'ضريبة خصم 1% محتجزة لتوريدها بنموذج 41',
        },
        {
          id: 'l4',
          accountId: state.accounts.find((a) => a.code === '2210')?.id || '',
          accountCode: '2210',
          accountName: 'الموردون والدائنون التجاريون',
          debit: 0,
          credit: netSupplier,
          description: 'صافي مستحق المورد الآجل',
        },
      ]);
      setAiExplanation('تم احتساب ضريبة القيمة المضافة للمدخلات 14% واحتجاز ضريبة الخصم والتحصيل 1% للتوريد الربع سنوي بمصلحة الضرائب.');
    } else if (templateType === 'PAYROLL_EAS') {
      const grossSalaries = amountVal;
      const companyInsurance = grossSalaries * 0.1875;
      const payrollTax = grossSalaries * 0.08;
      const totalInsurance = grossSalaries * 0.2975; // 11% employee + 18.75% company
      const netSalaries = grossSalaries + companyInsurance - payrollTax - totalInsurance;

      setDescription(`استحقاق رواتب وأجور العاملين بإجمالي ${grossSalaries} ج.م وحصة التأمينات وكسب العمل`);
      setEntryType('GENERAL');
      setLines([
        {
          id: 'l1',
          accountId: state.accounts.find((a) => a.code === '5310')?.id || '',
          accountCode: '5310',
          accountName: 'أجور ومرتبات وبدلات العاملين',
          debit: grossSalaries,
          credit: 0,
          description: 'إجمالي الأجور المستحقة',
        },
        {
          id: 'l2',
          accountId: state.accounts.find((a) => a.code === '5320')?.id || '',
          accountCode: '5320',
          accountName: 'حصة المنشأة في التأمينات الاجتماعية (18.75%)',
          debit: companyInsurance,
          credit: 0,
          description: 'مساهمة صاحب العمل في التأمينات الاجتماعية',
        },
        {
          id: 'l3',
          accountId: state.accounts.find((a) => a.code === '2235')?.id || '',
          accountCode: '2235',
          accountName: 'مصلحة الضرائب - ضريبة كسب العمل',
          debit: 0,
          credit: payrollTax,
          description: 'ضريبة كسب العمل المستقطعة للتوريد بنموذج 4',
        },
        {
          id: 'l4',
          accountId: state.accounts.find((a) => a.code === '2240')?.id || '',
          accountCode: '2240',
          accountName: 'الهيئة القومية للتأمين الاجتماعي',
          debit: 0,
          credit: totalInsurance,
          description: 'إجمالي التأمينات الاجتماعية المستحقة (29.75%)',
        },
        {
          id: 'l5',
          accountId: state.accounts.find((a) => a.code === '1260')?.id || '',
          accountCode: '1260',
          accountName: 'البنك الأهلي المصري - حساب جاري',
          debit: 0,
          credit: netSalaries,
          description: 'تحويل صافي الرواتب لحسابات الموظفين',
        },
      ]);
      setAiExplanation('قيد استحقاق وصرف أجور طبقاً لقانون التأمينات الاجتماعية رقم 148 لسنة 2019 وقانون الضريبة على الدخل وتعديلاته.');
    }
  };

  const handleSelectOperationType = (type: JournalEntry['entryType']) => {
    setEntryType(type);
    const amountVal = typeof aiAmount === 'number' && aiAmount > 0 ? aiAmount : 50000;

    if (type === 'SALES') {
      applyPresetTemplate('SALES_VAT_WHT');
    } else if (type === 'PURCHASE') {
      applyPresetTemplate('PURCHASE_VAT_WHT');
    } else if (type === 'RECEIPT') {
      setDescription((prev) => prev || 'تحصيل نقدي / بنكي من العملاء لحساب المنشأة');
      setLines([
        {
          id: 'l1',
          accountId: state.accounts.find((a) => a.code === '1260')?.id || state.accounts.find((a) => a.code === '1250')?.id || '',
          accountCode: '1260',
          accountName: 'البنك الأهلي المصري - حساب جاري',
          debit: amountVal,
          credit: 0,
          description: 'إيداع بنكي / تحصيل نقدي',
        },
        {
          id: 'l2',
          accountId: state.accounts.find((a) => a.code === '1220')?.id || '',
          accountCode: '1220',
          accountName: 'العملاء والمدينون التجاريون',
          debit: 0,
          credit: amountVal,
          description: 'سداد من حساب العميل',
        },
      ]);
      setAiExplanation('تم إعداد قيد مقبوضات وتحصيل من العملاء وإيداع بالبنك / الخزينة.');
    } else if (type === 'PAYMENT') {
      setDescription((prev) => prev || 'سداد مستحقات موردين / مصروفات عبر البنك أو الخزينة');
      setLines([
        {
          id: 'l1',
          accountId: state.accounts.find((a) => a.code === '2110')?.id || '',
          accountCode: '2110',
          accountName: 'الموردون والدائنون التجاريون',
          debit: amountVal,
          credit: 0,
          description: 'سداد دفعة للمورد',
        },
        {
          id: 'l2',
          accountId: state.accounts.find((a) => a.code === '1260')?.id || state.accounts.find((a) => a.code === '1250')?.id || '',
          accountCode: '1260',
          accountName: 'البنك الأهلي المصري - حساب جاري',
          debit: 0,
          credit: amountVal,
          description: 'تحويل بنكي / شيك صادر',
        },
      ]);
      setAiExplanation('تم إعداد قيد مدفوعات وسداد للموردين عبر الحساب البنكي / الخزينة.');
    } else if (type === 'CLOSING' || type === 'ADJUSTING') {
      setDescription((prev) => prev || (type === 'ADJUSTING' ? 'إجراء تسويات جردية ومخصصات نهاية الفترة' : 'إقفال حسابات الأستاذ في الأرباح والخسائر'));
    }
  };

  const handleSmartAiGenerate = async () => {
    if (!aiPrompt) {
      alert('يرجى كتابة وصف العملية المحاسبية أولاً');
      return;
    }
    setIsAiLoading(true);

    // Check historical patterns matching the prompt first
    const historicalMatches = JournalSuggestionEngine.findHistoricalMatches(
      aiPrompt,
      entryType,
      state.journalEntries,
      state.accounts
    );

    try {
      const res = await fetch('/api/ai/suggest-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiPrompt,
          amount: aiAmount || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const aiData = data.data;
        setDescription(aiPrompt);
        setAiExplanation(aiData.explanation + (aiData.taxNotes ? ` | ${aiData.taxNotes}` : ''));

        if (aiData.entries && aiData.entries.length > 0) {
          const generatedLines: JournalEntryLine[] = aiData.entries.map((item: any, idx: number) => {
            const matchedAcc = state.accounts.find(
              (a) => a.code === item.accountCode || a.name.includes(item.accountName)
            );
            return {
              id: `ai-l-${idx}`,
              accountId: matchedAcc ? matchedAcc.id : '',
              accountCode: item.accountCode || (matchedAcc ? matchedAcc.code : '1110'),
              accountName: item.accountName || (matchedAcc ? matchedAcc.name : 'حساب عام'),
              debit: Number(item.debit) || 0,
              credit: Number(item.credit) || 0,
              description: item.notes || '',
            };
          });
          setLines(generatedLines);
        }
      } else if (historicalMatches.length > 0) {
        // Fallback to highest confidence historical match from previous operations
        handleApplyHistoricalPattern(historicalMatches[0]);
      } else {
        // Fallback to local preset template
        applyPresetTemplate('SALES_VAT_WHT');
      }
    } catch (e) {
      console.error(e);
      if (historicalMatches.length > 0) {
        handleApplyHistoricalPattern(historicalMatches[0]);
      } else {
        applyPresetTemplate('SALES_VAT_WHT');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRequestEdit = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setEntryClientId(entry.clientId || null);
    if (!SecurityAuthService.isSecurityAuthEnabled()) {
      // Security PIN is disabled in settings -> Open directly without password
      setEditingEntryId(entry.id);
      setDate(entry.date);
      setDescription(entry.description);
      setEntryType(entry.entryType || 'GENERAL');
      setEntryCurrency(entry.currency || 'EGP');
      setExchangeRate(entry.exchangeRate || 1.0);
      setEntryClientId(entry.clientId || null);
      setLines(entry.lines.map((l) => ({
        ...l,
        currency: l.currency || entry.currency || 'EGP',
        exchangeRate: l.exchangeRate || entry.exchangeRate || 1.0,
      })));
      setSelectedEntryForView(null);
      setIsNewEntryModalOpen(true);
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (!entryToEdit) return;
    setEditingEntryId(entryToEdit.id);
    setDate(entryToEdit.date);
    setDescription(entryToEdit.description);
    setEntryType(entryToEdit.entryType || 'GENERAL');
    setEntryCurrency(entryToEdit.currency || 'EGP');
    setExchangeRate(entryToEdit.exchangeRate || 1.0);
    setEntryClientId(entryToEdit.clientId || null);
    setLines(entryToEdit.lines.map((l) => ({
      ...l,
      currency: l.currency || entryToEdit.currency || 'EGP',
      exchangeRate: l.exchangeRate || entryToEdit.exchangeRate || 1.0,
    })));
    setIsAuthModalOpen(false);
    setSelectedEntryForView(null);
    setIsNewEntryModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('لا يمكن حفظ القيد: إجمالي المدين يجب أن يتساوى تماماً مع إجمالي الدائن');
      return;
    }

    const unassigned = lines.some((l) => !l.accountId);
    if (unassigned) {
      alert('يرجى التأكد من اختيار الحساب المحاسبي لجميع أطراف القيد');
      return;
    }

    const targetClient = state.clients.find((c) => c.id === entryClientId);
    const targetClientName = targetClient ? targetClient.name : undefined;

    if (editingEntryId) {
      db.updateJournalEntry(editingEntryId, {
        date,
        description: description || 'قيد يومية عامة',
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        foreignTotalDebit: entryCurrency !== 'EGP' ? foreignTotalDebit : undefined,
        foreignTotalCredit: entryCurrency !== 'EGP' ? foreignTotalCredit : undefined,
        lines,
        totalDebit,
        totalCredit,
        entryType,
        clientId: entryClientId || undefined,
        clientName: targetClientName,
      });
      alert('تم حفظ وتحديث بيانات القيد بنجاح بعد التحقق من الرقم السري المصرح به.');
    } else {
      db.addJournalEntry({
        date,
        description: description || 'قيد يومية عامة',
        currency: entryCurrency,
        exchangeRate: exchangeRate,
        foreignTotalDebit: entryCurrency !== 'EGP' ? foreignTotalDebit : undefined,
        foreignTotalCredit: entryCurrency !== 'EGP' ? foreignTotalCredit : undefined,
        lines,
        totalDebit,
        totalCredit,
        isPosted: true, // auto post to General Ledger
        entryType,
        clientId: entryClientId || undefined,
        clientName: targetClientName,
      });
      // Clear draft on successful submission
      formDraftStorage.clearJournalDraft();
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
    }

    setIsNewEntryModalOpen(false);
    setEditingEntryId(null);
    setEntryToEdit(null);
    // Reset form
    setDescription('');
    setEntryCurrency('EGP');
    setExchangeRate(1.0);
    setAiExplanation(null);
    setLines([
      { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
      { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
    ]);
  };

  // Client Archive Documentation & Save as Report State
  const [isClientReportModalOpen, setIsClientReportModalOpen] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [pendingEntryForReport, setPendingEntryForReport] = useState<{
    mode: 'NEW' | 'EXISTING';
    entryData?: any;
    existingEntry?: JournalEntry;
  } | null>(null);

  const handleOpenClientReportModalForNewEntry = () => {
    if (!isBalanced) {
      alert('لا يمكن حفظ القيد: إجمالي المدين يجب أن يتساوى تماماً مع إجمالي الدائن');
      return;
    }
    const unassigned = lines.some((l) => !l.accountId);
    if (unassigned) {
      alert('يرجى التأكد من اختيار الحساب المحاسبي لجميع أطراف القيد');
      return;
    }

    setPendingEntryForReport({
      mode: 'NEW',
      entryData: {
        date,
        description: description || 'قيد يومية عامة',
        entryCurrency,
        exchangeRate,
        foreignTotalDebit: entryCurrency !== 'EGP' ? foreignTotalDebit : undefined,
        foreignTotalCredit: entryCurrency !== 'EGP' ? foreignTotalCredit : undefined,
        lines,
        totalDebit,
        totalCredit,
        entryType,
      },
    });
    setIsClientReportModalOpen(true);
  };

  const handleOpenClientReportModalForExistingEntry = (entry: JournalEntry) => {
    setPendingEntryForReport({
      mode: 'EXISTING',
      existingEntry: entry,
    });
    setIsClientReportModalOpen(true);
  };

  const handleConfirmSaveAsClientReport = (
    client: ClientArchiveRecord,
    folderName: string,
    notes?: string,
    setAsActiveClient?: boolean
  ) => {
    if (!pendingEntryForReport) return;

    if (pendingEntryForReport.mode === 'NEW' && pendingEntryForReport.entryData) {
      const data = pendingEntryForReport.entryData;
      const createdEntry = db.addJournalEntry({
        date: data.date,
        description: data.description || 'قيد يومية عامة',
        currency: data.entryCurrency,
        exchangeRate: data.exchangeRate,
        foreignTotalDebit: data.foreignTotalDebit,
        foreignTotalCredit: data.foreignTotalCredit,
        lines: data.lines,
        totalDebit: data.totalDebit,
        totalCredit: data.totalCredit,
        isPosted: true,
        entryType: data.entryType,
        clientId: client.id,
        clientName: client.name,
      });

      // Add certified document to client archive
      db.addClientDocument(client.id, {
        title: `سند قيد محاسبي معتمد #${createdEntry.serialNumber} - ${data.description}`,
        documentType: 'FINANCIAL_REPORT',
        fileName: `Journal-Entry-${createdEntry.serialNumber}.pdf`,
        fileDataUrl: '',
        folderName: folderName,
        notes: notes || `تم تسجيل القيد المحاسبي (${createdEntry.serialNumber}) بقيمة إجمالية ${formatEgyptianCurrency(data.totalDebit)} وتوثيقه في أرشيف العميل.`,
        tag: 'سند قيد محاسبي',
      });

      if (setAsActiveClient) {
        db.setActiveClient(client.id, {
          autoFilter: true,
        });
      }

      formDraftStorage.clearJournalDraft();
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
      setIsNewEntryModalOpen(false);
      setEditingEntryId(null);
      setEntryToEdit(null);
      setDescription('');
      setEntryCurrency('EGP');
      setExchangeRate(1.0);
      setAiExplanation(null);
      setLines([
        { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
        { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
      ]);

      setReportFeedback(`تم بنجاح حفظ وترحيل القيد (#${createdEntry.serialNumber}) وتوثيقه كتقرير رسمي بملف العميل [${client.name}] في مجلد [${folderName}].`);
      setTimeout(() => setReportFeedback(null), 5000);
    } else if (pendingEntryForReport.mode === 'EXISTING' && pendingEntryForReport.existingEntry) {
      const entry = pendingEntryForReport.existingEntry;
      
      // Update journal entry client info
      db.updateJournalEntry(entry.id, {
        clientId: client.id,
        clientName: client.name,
      });

      // Add certified document to client archive
      db.addClientDocument(client.id, {
        title: `سند قيد محاسبي معتمد #${entry.serialNumber} - ${entry.description}`,
        documentType: 'FINANCIAL_REPORT',
        fileName: `Journal-Entry-${entry.serialNumber}.pdf`,
        fileDataUrl: '',
        folderName: folderName,
        notes: notes || `سند قيد محاسبي معتمد رقم (${entry.serialNumber}) بإجمالي ${formatEgyptianCurrency(entry.totalDebit)}.`,
        tag: 'سند قيد محاسبي',
      });

      if (setAsActiveClient) {
        db.setActiveClient(client.id, {
          autoFilter: true,
        });
      }

      setReportFeedback(`تم بنجاح ربط وتوثيق القيد (#${entry.serialNumber}) بملف العميل [${client.name}] في مجلد [${folderName}] بالأرشيف.`);
      setTimeout(() => setReportFeedback(null), 5000);
    }

    setIsClientReportModalOpen(false);
    setPendingEntryForReport(null);
  };

  // Pagination State for high-performance large data
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const activeClient = state.activeClientContext;
  const isClientAutoFilterOn = activeClient?.autoFilterAccountingData && activeClient?.clientId;

  const filteredEntries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return state.journalEntries.filter((entry) => {
      // If client filter is active and entry has clientId, filter by active client
      if (isClientAutoFilterOn && entry.clientId && entry.clientId !== activeClient.clientId) {
        return false;
      }

      const matchesSearch =
        !term ||
        (entry.description || '').toLowerCase().includes(term) ||
        (entry.serialNumber || '').toLowerCase().includes(term) ||
        (entry.clientName && entry.clientName.toLowerCase().includes(term)) ||
        (entry.lines || []).some((l) => (l.accountName || '').toLowerCase().includes(term) || (l.accountCode || '').includes(term));

      const matchesPosted =
        filterPosted === 'ALL' ||
        (filterPosted === 'POSTED' && entry.isPosted) ||
        (filterPosted === 'DRAFT' && !entry.isPosted);

      return matchesSearch && matchesPosted;
    });
  }, [state.journalEntries, searchTerm, filterPosted, isClientAutoFilterOn, activeClient?.clientId]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / (pageSize || 20)));

  const paginatedEntries = useMemo(() => {
    if (pageSize >= 999999) return filteredEntries;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEntries.slice(startIndex, startIndex + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const totalFilteredDebit = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.totalDebit || 0), 0);
  }, [filteredEntries]);

  const totalFilteredPostedCount = useMemo(() => {
    return filteredEntries.filter((e) => e.isPosted).length;
  }, [filteredEntries]);

  return (
    <div className="space-y-5">
      {/* Report Saved Feedback Alert */}
      {reportFeedback && (
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 text-white px-5 py-3.5 rounded-2xl border border-teal-500/40 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-400/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold text-xs text-teal-100">تم التوثيق والربط بنجاح</div>
              <div className="text-xs text-teal-200">{reportFeedback}</div>
            </div>
          </div>
          <button
            onClick={() => setReportFeedback(null)}
            className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Unified Screen Card */}
      <UnifiedScreenCard
        title="دفتر قيود اليومية العامة"
        subtitle="تسجيل وترحيل القيود المحاسبية"
        icon={Receipt}
        badge={`${filteredEntries.length} قيد`}
        badgeVariant="emerald"
        primaryAction={{
          id: 'btn-create-journal-entry',
          label: 'قيد جديد',
          icon: Plus,
          variant: 'primary',
          onClick: () => {
            setEntryClientId(state.activeClientContext?.clientId || null);
            setEntryStep(1);
            setIsNewEntryModalOpen(true);
          },
        }}
        actionMenuItems={[
          {
            id: 'btn-smart-gen-toggle',
            label: isSmartGeneratorOpen ? 'إغلاق القيد الآلي' : 'قيد آلي ذكي (NLP)',
            icon: Zap,
            onClick: () => setIsSmartGeneratorOpen(!isSmartGeneratorOpen),
          },
          {
            id: 'btn-scan-invoice-ocr',
            label: 'مسح فاتورة (OCR)',
            icon: Camera,
            onClick: () => setIsOcrModalOpen(true),
          },
          {
            id: 'btn-audit-journal-errors',
            label: 'فحص الأخطاء (AI)',
            icon: ShieldAlert,
            variant: 'warning',
            onClick: () => setIsAuditErrorsModalOpen(true),
          },
          {
            isDivider: true,
            label: '',
            onClick: () => {},
          },
          {
            id: 'btn-excel-import',
            label: 'استيراد إكسل',
            icon: UploadCloud,
            onClick: () => setIsExcelImportOpen(true),
          },
          {
            id: 'btn-print-journal',
            label: 'طباعة الدفتر',
            icon: Printer,
            onClick: () => setIsPrintJournalModalOpen(true),
          },
        ]}
        screenActions={{
          modelType: 'JOURNAL',
          title: 'دفتر قيود اليومية العامة',
          count: filteredEntries.length,
        }}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث برقم القيد أو البيان أو اسم الحساب..."
        filterButtons={[
          {
            label: `الكل (${state.journalEntries.length})`,
            active: filterPosted === 'ALL',
            onClick: () => setFilterPosted('ALL'),
          },
          {
            label: `المرحلة (${state.journalEntries.filter((e) => e.isPosted).length})`,
            active: filterPosted === 'POSTED',
            onClick: () => setFilterPosted('POSTED'),
            variant: 'emerald',
          },
          {
            label: `المسودات (${state.journalEntries.filter((e) => !e.isPosted).length})`,
            active: filterPosted === 'DRAFT',
            onClick: () => setFilterPosted('DRAFT'),
            variant: 'amber',
          },
        ]}
        extraHeaderControls={
          <CompanyHeaderSelector
            state={state}
            title="الشركة:"
            allOptionLabel="كافة الشركات"
          />
        }
      >
        <div className="space-y-4">
          {/* Micro-KPIs Ticker Bar */}
          <MicroKpisTickerBar
            items={[
              {
                id: 'kpi-count',
                label: 'إجمالي القيود',
                value: `${filteredEntries.length}`,
                subValue: `${totalFilteredPostedCount} مرحل`,
                icon: Receipt,
                variant: 'blue',
              },
              {
                id: 'kpi-total-debit',
                label: 'إجمالي الحركة المدينة',
                value: formatEgyptianCurrency(totalFilteredDebit),
                icon: Coins,
                variant: 'emerald',
              },
              {
                id: 'kpi-unbalanced',
                label: 'حالة التوازن',
                value: unbalancedEntries.length === 0 ? 'متزن 100%' : `${unbalancedEntries.length} غير متزن`,
                icon: unbalancedEntries.length === 0 ? CheckCircle2 : AlertTriangle,
                variant: unbalancedEntries.length === 0 ? 'emerald' : 'rose',
              },
              {
                id: 'kpi-drafts',
                label: 'المسودات غير المرحلة',
                value: `${filteredEntries.length - totalFilteredPostedCount}`,
                icon: FileText,
                variant: 'amber',
              },
            ]}
          />

          {/* Draft Recovery Alert Banner when main table is visible */}
          {hasUnsavedDraft && !isNewEntryModalOpen && (
            <DraftRecoveryBanner
              documentType="قيد يومية عامة"
              savedAt={lastAutoSaveTime || 'مسودة محفوظة في الذاكرة المحلية'}
              descriptionSummary={description || aiPrompt || 'قيد بدون بيان'}
              linesCount={lines.filter((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0).length}
              onResume={() => {
                setEditingEntryId(null);
                setIsNewEntryModalOpen(true);
              }}
              onDiscard={handleClearDraft}
            />
          )}

      {/* 🚀 وحدة القيد الآلي الفوري بالذكاء الاصطناعي (Instant Smart Journal Generator) */}
      {!isSmartGeneratorOpen ? (
        <div
          onClick={() => setIsSmartGeneratorOpen(true)}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/50">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                القيد الآلي الفوري (NLP): اكتب الوصف والمبلغ لإنشاء وترحيل القيد آلياً...
              </span>
            </div>
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 shrink-0">
            <span>فتح الوحدة</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      ) : (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    وحدة القيد الآلي الفوري (Instant Smart Journal Generator)
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-400/30">
                    NLP + دليل الحسابات المصري
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  اكتب الوصف والقيمة فقط — تحدد المنظومة الحسابات المدينة والدائنة والضريبة 14% وتوازن القيد فورياً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsAuditErrorsModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>فحص الأخطاء</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSmartGeneratorOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق الوحدة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-7">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                بيان / وصف العملية المالية:
              </label>
              <input
                type="text"
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickInstantPost();
                }}
                placeholder="مثال: سداد إيجار المقر نقداً من الخزينة، فاتورة مبيعات نقدية بضريبة 14%، شراء بضاعة بالأجل..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-blue-400 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                المبلغ الإجمالي (ج.م):
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickInstantPost();
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-blue-400 rounded-xl text-xs font-mono font-bold text-amber-300 placeholder:text-slate-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-3 flex items-end gap-2">
              <button
                type="button"
                onClick={handleQuickInstantPost}
                disabled={isQuickPosting || !quickDesc.trim()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="إنشاء القيد وترحيله فورياً لدفتر الأستاذ العام"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>{isQuickPosting ? 'جارٍ الترحيل...' : 'ترحيل فوري'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickReviewAndEdit}
                disabled={!quickDesc.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                title="مراجعة وتعديل أطراف القيد في المعالج قبل الحفظ"
              >
                <span>مراجعة</span>
              </button>
            </div>
          </div>

          {/* Live Interpretation Preview Strip */}
          {quickPreview && (
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-semibold text-slate-400">التوجيه:</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                  مدين: {quickPreview.detectedDebitAccountName}
                </span>
                <span className="text-slate-500">←</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                  دائن: {quickPreview.detectedCreditAccountName}
                </span>
                {quickPreview.taxBreakdown?.hasVat && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                    ضريبة 14%: {quickPreview.taxBreakdown.vatAmount} ج.م
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-emerald-400">
                <Check className="w-3 h-3" />
                <span>متوازن ({formatEgyptianCurrency(quickPreview.totalDebit)})</span>
              </div>
            </div>
          )}

          {/* Quick Shortcut Presets */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 scrollbar-none">
            <span className="text-slate-500 font-medium shrink-0">شائع:</span>
            {[
              { label: 'سداد إيجار نقداً', desc: 'سداد إيجار المقر نقداً من الخزينة', amount: 8000 },
              { label: 'فاتورة كهرباء ومرافق', desc: 'سداد فاتورة كهرباء ومياه بالخزينة', amount: 1450 },
              { label: 'مبيعات نقدية (14%)', desc: 'فاتورة مبيعات نقدية بضريبة القيمة المضافة 14%', amount: 11400 },
              { label: 'شراء بضاعة بضريبة 14%', desc: 'فاتورة مشتريات بضاعة بضريبة 14% بشيك بنكي', amount: 22800 },
              { label: 'صرف مرتبات العاملين', desc: 'صرف مرتبات وأجور موظفي الشركة بتحويل بنكي', amount: 35000 },
              { label: 'سداد قسط قرض بنك مصر', desc: 'سداد قسط قرض تمويل رأس المال العامل - بنك مصر', amount: 53500 },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyQuickPreset(preset.desc, preset.amount)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-all cursor-pointer text-[10px]"
              >
                + {preset.label}
              </button>
            ))}
          </div>

          {/* Quick Feedback Notice */}
          {quickFeedback && (
            <div
              className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                quickFeedback.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}
            >
              <span>{quickFeedback.message}</span>
              <button
                onClick={() => setQuickFeedback(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Automatic Balance Validator Alert Banner (كاشف التوازن الآلي والإصلاح الفوري) */}
      {unbalancedEntries.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900 to-amber-900 text-white rounded-2xl p-4 sm:p-5 border border-rose-500/40 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 border border-rose-400/30">
                <AlertTriangle className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    كاشف التوازن المحاسبي التلقائي (Automatic Balance Validator)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unbalancedEntries.length} قيود غير متزنة
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-1">
                  تم رصد قيود يومية تحتوي على فروق بين إجمالي المدين والدائن. يمكنك إصلاح الفروق فورياً بترحيلها لحساب التسوية المعتمد (<span className="font-mono font-bold text-amber-300">1999 - حساب تسوية الفروق المعلقة</span>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsUnbalancedExpanded(!isUnbalancedExpanded)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                {isUnbalancedExpanded ? 'إخفاء التفاصيل ▲' : 'عرض القيود ▼'}
              </button>

              <button
                type="button"
                onClick={handleAutoFixAllUnbalancedEntries}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer transition-all"
              >
                <Wrench className="w-4 h-4" />
                <span>إصلاح جميع الفروق بضغطة واحدة (1-Click Fix)</span>
              </button>
            </div>
          </div>

          {/* Unbalanced Breakdown List */}
          {isUnbalancedExpanded && (
            <div className="mt-4 pt-3 border-t border-rose-500/30 space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {unbalancedEntries.map((unb) => {
                const diff = (unb.totalDebit || 0) - (unb.totalCredit || 0);
                return (
                  <div
                    key={unb.id}
                    className="bg-black/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border border-rose-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-amber-300">
                        {unb.serialNumber || 'سند'}
                      </span>
                      <span className="font-mono text-slate-300">{unb.date}</span>
                      <span className="text-white font-medium">{unb.description}</span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="font-mono text-rose-300">
                        المدين: {formatEgyptianCurrency(unb.totalDebit || 0)} | الدائن: {formatEgyptianCurrency(unb.totalCredit || 0)}
                      </span>
                      <span className="font-mono font-black text-amber-400 px-2 py-0.5 bg-amber-950/50 rounded border border-amber-500/30">
                        الفرق: {Math.abs(diff).toFixed(2)} ج.م
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAutoFixUnbalancedEntry(unb.id)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>إصلاح هذا القيد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Entries List Cards (American / Full Journal view) */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-sm">لا توجد قيود يومية مطابقة للبحث</p>
          </div>
        ) : (
          paginatedEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Entry Card Header */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-800 text-white shadow-2xs">
                    {entry.serialNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{entry.date}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      entry.isPosted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {entry.isPosted ? '✓ مرحل للأستاذ' : 'مسودة'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {entry.entryType}
                  </span>

                  {/* Client Tag Badge */}
                  {entry.clientName && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                      <span>🏢 {entry.clientName}</span>
                    </span>
                  )}

                  {/* Multi-Currency Badge */}
                  {entry.currency && entry.currency !== 'EGP' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-mono">
                      <Globe className="w-3 h-3 text-blue-600" />
                      <span>{entry.currency} {entry.foreignTotalDebit ? Number(entry.foreignTotalDebit).toLocaleString() : ''} (سعر: {entry.exchangeRate || 1} ج.م)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-1">
                    الإجمالي: <span className="font-mono text-emerald-700 dark:text-emerald-400">{formatEgyptianCurrency(entry.totalDebit)}</span>
                  </div>
                  <button
                    onClick={() => db.togglePostEntry(entry.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      entry.isPosted
                        ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {entry.isPosted ? 'إلغاء الترحيل' : 'ترحيل'}
                  </button>

                  <QuickRowActionDropdown
                    title="خيارات القيد"
                    actions={[
                      {
                        label: 'عرض التفاصيل',
                        icon: Eye,
                        variant: 'primary',
                        onClick: () => setSelectedEntryForView(entry),
                      },
                      {
                        label: 'تعديل القيد',
                        icon: Lock,
                        variant: 'warning',
                        onClick: () => handleRequestEdit(entry),
                      },
                      {
                        label: 'توثيق في أرشيف العميل',
                        icon: FolderArchive,
                        variant: 'success',
                        onClick: () => handleOpenClientReportModalForExistingEntry(entry),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 ml-1">البيان:</span> {entry.description}
                </div>
                {entry.currency && entry.currency !== 'EGP' && (
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50/80 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                    معاملة بالعملة الأجنبية: <strong>{SUPPORTED_CURRENCIES.find(c => c.code === entry.currency)?.nameAr || entry.currency}</strong> (معيار EAS 13)
                  </span>
                )}
              </div>

              {/* Journal Lines Table - Compact Mode with Zebra Striping */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs accounting-table">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                      <th className="py-1.5 px-3">كود الحساب</th>
                      <th className="py-1.5 px-3">اسم الحساب</th>
                      {entry.currency && entry.currency !== 'EGP' && (
                        <>
                          <th className="py-1.5 px-3 text-left text-blue-700 dark:text-blue-400">مدين ({entry.currency})</th>
                          <th className="py-1.5 px-3 text-left text-amber-700 dark:text-amber-400">دائن ({entry.currency})</th>
                        </>
                      )}
                      <th className="py-1.5 px-3 text-left">مدين (ج.م)</th>
                      <th className="py-1.5 px-3 text-left">دائن (ج.م)</th>
                      <th className="py-1.5 px-3">شرح الطرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entry.lines.map((line, idx) => (
                      <tr key={line.id || idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-300">{line.accountCode}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-100">{line.accountName}</td>
                        {entry.currency && entry.currency !== 'EGP' && (
                          <>
                            <td className="py-1.5 px-3 font-mono font-semibold text-left text-blue-700 dark:text-blue-400">
                              {line.foreignDebit && line.foreignDebit > 0 ? Number(line.foreignDebit).toLocaleString() : '-'}
                            </td>
                            <td className="py-1.5 px-3 font-mono font-semibold text-left text-amber-700 dark:text-amber-400">
                              {line.foreignCredit && line.foreignCredit > 0 ? Number(line.foreignCredit).toLocaleString() : '-'}
                            </td>
                          </>
                        )}
                        <td className="py-1.5 px-3 font-mono font-bold text-left text-blue-800 dark:text-blue-400">
                          {line.debit > 0 ? formatEgyptianCurrency(line.debit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-left text-amber-800 dark:text-amber-400">
                          {line.credit > 0 ? formatEgyptianCurrency(line.credit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">{line.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* High Volume Data Pagination Controls */}
        {filteredEntries.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                إجمالي القيود: <strong>{filteredEntries.length}</strong> قيد | الصفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">| عرض:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
                >
                  <option value={20}>20 قيد</option>
                  <option value={50}>50 قيد</option>
                  <option value={100}>100 قيد</option>
                  <option value={250}>250 قيد</option>
                  <option value={999999}>الكل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                    }
                    if (pageNum > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-slate-700"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </UnifiedScreenCard>

      {/* New Journal Entry Modal with Wizard Pattern */}
      {isNewEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingEntryId ? 'تعديل القيد المحاسبي (وضع التعديل المصرح به)' : 'تسجيل قيد يومية عامة جديد'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {editingEntryId ? (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-700" />
                        <span>تم التحقق والاعتماد (تعديل قيد مؤرشف)</span>
                      </span>
                    ) : (
                      <AutoSaveStatusBadge
                        lastSavedTime={lastAutoSaveTime}
                        isSaving={isAutoSaving}
                        isOffline={!isOnline}
                        onManualSave={handleManualSaveDraft}
                        onClearDraft={handleClearDraft}
                        documentLabel="قيد اليومية"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Form Mode Switcher & Close */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {!editingEntryId && (
                  <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEntryFormMode('WIZARD')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        entryFormMode === 'WIZARD'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚡ النموذج المتدرج (Wizard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryFormMode('CLASSIC')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        entryFormMode === 'CLASSIC'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📋 النمط المفتوح
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsNewEntryModalOpen(false);
                    setEditingEntryId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Restored Draft Alert Banner */}
            {!editingEntryId && draftRestoredNotice && (
              <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">{draftRestoredNotice}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-slate-600 hover:text-red-700 underline font-bold cursor-pointer text-[11px]"
                  >
                    مسح المسودة والبدء من جديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftRestoredNotice(null)}
                    className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Manual Save Success Toast */}
            {manualSaveToast && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between gap-2 text-xs font-medium animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{manualSaveToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setManualSaveToast(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* WIZARD MODE: Progressive Step-by-Step Disclosure */}
            {entryFormMode === 'WIZARD' && !editingEntryId ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Step Progress Indicators */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEntryStep(1)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                      entryStep === 1
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : entryStep > 1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-500 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
                    <span>نوع المعاملة والبيانات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!description.trim()) {
                        setDescription('قيد عمليات تجارية');
                      }
                      setEntryStep(2);
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                      entryStep === 2
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : entryStep > 2
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-500 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
                    <span>أطراف القيد (مدين / دائن)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isBalanced) {
                        setEntryStep(3);
                      }
                    }}
                    disabled={!isBalanced}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all text-xs ${
                      entryStep === 3
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isBalanced
                        ? 'text-slate-700 hover:bg-slate-200/60 cursor-pointer'
                        : 'text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
                    <span>المراجعة والترحيل</span>
                  </button>
                </div>

                {/* STEP 1: Operation Type, Targeted Company & Core Info */}
                {entryStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Targeted Company Selector */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-700" />
                          <label className="font-bold text-slate-800 text-xs">
                            الشركة / المنشأة المستهدفة في القيد:
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQuickCompanyModalInEntryOpen(true)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ تأسيس شركة جديدة</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={entryClientId || ''}
                          onChange={(e) => setEntryClientId(e.target.value || null)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                        >
                          <option value="">-- قيد عام غير مخصص لشركة محددة (أو اختر الشركة المستهدفة) --</option>
                          {state.clients.map((cl) => (
                            <option key={cl.id} value={cl.id}>
                              {cl.name} {cl.taxCardNo ? `(بطاقة ضريبية: ${cl.taxCardNo})` : ''} - {cl.clientCode}
                            </option>
                          ))}
                        </select>
                        {entryClientId && (
                          <button
                            type="button"
                            onClick={() => setEntryClientId(null)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white border border-slate-200 cursor-pointer"
                            title="إلغاء تخصيص الشركة (جعله قيد عام)"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Operation Type Selector Cards */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-2 text-xs">
                        اختر نوع المعاملة المالية (تجهيز الأطراف المحاسبية تلقائياً وفقاً للمعايير المصرية):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { type: 'SALES', label: 'مبيعات وإيرادات', desc: 'إثبات مبيعات + ضريبة ق.م 14% وخصم 1%', icon: '🛒', color: 'emerald' },
                          { type: 'PURCHASE', label: 'مشتريات وخامات', desc: 'شراء بضاعة + ضريبة مدخلات قابلة للخصم', icon: '📥', color: 'blue' },
                          { type: 'RECEIPT', label: 'مقبوضات وتحصيل', desc: 'تحصيل من عملاء وإيداع بالبنك / الخزينة', icon: '💰', color: 'teal' },
                          { type: 'PAYMENT', label: 'مدفوعات وسداد', desc: 'سداد مستحقات موردين ومصروفات', icon: '💳', color: 'indigo' },
                          { type: 'GENERAL', label: 'أجور ومرتبات', desc: 'استحقاق رواتب وتأمينات وضريبة كسب عمل', icon: '👥', color: 'amber', isPayroll: true },
                          { type: 'ADJUSTING', label: 'تسويات جردية', desc: 'إهلاك، مخصصات، ومقدمات ومستحقات', icon: '⚖️', color: 'purple' },
                          { type: 'CLOSING', label: 'إقفال حسابات', desc: 'إقفال الإيرادات والمصروفات بالأرباح والخسائر', icon: '🔒', color: 'rose' },
                          { type: 'GENERAL', label: 'يومية عامة حرة', desc: 'تخصيص حر لكافة أطراف القيد المزدوج', icon: '📝', color: 'slate' },
                        ].map((item, idx) => {
                          const isSelected = item.isPayroll ? false : entryType === item.type && !item.isPayroll;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (item.isPayroll) {
                                  applyPresetTemplate('PAYROLL_EAS');
                                } else {
                                  handleSelectOperationType(item.type as any);
                                }
                              }}
                              className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-base">{item.icon}</span>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                    محدد
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 font-bold text-slate-800 text-xs">{item.label}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{item.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date & Core Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">تاريخ القيد *</label>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">البيان الرئيسي للقيد *</label>
                        <input
                          type="text"
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="اكتب شرحاً موجزاً للعملية المحاسبية..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Collapsible Assistant Toggles */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAiAssistant(!showAiAssistant)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          showAiAssistant
                            ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{showAiAssistant ? 'إخفاء مساعد الذكاء الاصطناعي' : '✨ مساعد الصياغة بالذكاء الاصطناعي'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAdvancedCurrency(!showAdvancedCurrency)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          showAdvancedCurrency || entryCurrency !== 'EGP'
                            ? 'bg-blue-900 text-blue-100 border-blue-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span>{showAdvancedCurrency || entryCurrency !== 'EGP' ? `العملة: ${entryCurrency} (${exchangeRate} ج.م)` : '🌐 تعدد العملات وسعر الصرف (EAS 13)'}</span>
                      </button>
                    </div>

                    {/* Expandable AI Box */}
                    {showAiAssistant && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 text-white space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">
                              صياغة القيد واقتراح الحسابات الذكي بالمعايير المصرية
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="اكتب المعاملة باللغة الطبيعية (مثال: بيع بضاعة بمبلغ 250 ألف وسداد النصف بالبنك والباقي آجل)..."
                            className="flex-1 px-3 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                          <input
                            type="number"
                            value={aiAmount}
                            onChange={(e) => setAiAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="المبلغ (ج.م)"
                            className="w-28 px-3 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleSmartAiGenerate}
                            disabled={isAiLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAiLoading ? 'جاري التحليل...' : 'اقتراح القيد'}</span>
                          </button>
                        </div>

                        {aiExplanation && (
                          <div className="text-[11px] text-emerald-200 bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-500/20">
                            {aiExplanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expandable Currency Box */}
                    {(showAdvancedCurrency || entryCurrency !== 'EGP') && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-slate-600 font-semibold mb-1 text-[11px]">عملة القيد</label>
                            <select
                              value={entryCurrency}
                              onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                            >
                              {SUPPORTED_CURRENCIES.map((curr) => (
                                <option key={curr.code} value={curr.code}>
                                  {curr.flag} {curr.code} - {curr.nameAr}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                              سعر الصرف مقابل (ج.م)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                min="0.0001"
                                disabled={entryCurrency === 'EGP'}
                                value={exchangeRate}
                                onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 1)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500"
                              />
                              <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                                ج.م
                              </span>
                            </div>
                          </div>

                          <div className="sm:col-span-2 flex items-center">
                            {entryCurrency !== 'EGP' ? (
                              <div className="text-[11px] text-blue-800 bg-blue-50/80 p-2 rounded-lg border border-blue-200/80 w-full">
                                يتم تحويل المبالغ الأجنبية تلقائياً إلى معادلها بالجنيه المصري (EAS 13).
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 w-full">
                                العملة الأساسية: <strong>الجنيه المصري (EGP)</strong>.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 1 Footer Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {!editingEntryId && (lastAutoSaveTime || description || aiPrompt) && (
                          <button
                            type="button"
                            onClick={handleClearDraft}
                            className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>مسح المسودة</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewEntryModalOpen(false);
                            setEditingEntryId(null);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!description.trim()) {
                              setDescription('قيد إثبات عمليات تجارية');
                            }
                            setEntryStep(2);
                          }}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>التالي: إدخال وموازنة أطراف القيد</span>
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Debit/Credit Parties & Balancing */}
                {entryStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Summary Strip of Step 1 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {state.clients.find((c) => c.id === entryClientId)?.name || 'قيد عام'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-600">{date}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-700 truncate max-w-xs">{description || 'بدون بيان'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEntryStep(1)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer shrink-0"
                      >
                        تعديل البيانات الأساسية
                      </button>
                    </div>

                    {/* Auto-Suggestion Bar */}
                    <JournalAutoSuggestBar
                      entries={state.journalEntries}
                      accounts={state.accounts}
                      lines={lines}
                      description={description}
                      entryType={entryType}
                      difference={difference}
                      totalDebit={totalDebit}
                      totalCredit={totalCredit}
                      onApplyHistoricalPattern={handleApplyHistoricalPattern}
                      onAddSuggestedCounterLine={handleAddSuggestedCounterLine}
                      onQuickBalance={handleQuickBalanceWithAccount}
                    />

                    {/* Financial Numbers & Storno Undo/Redo Engine Toolbar */}
                    <JournalUndoToolbar
                      undoHistory={undoHistory}
                      redoHistory={redoHistory}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onRestoreSnapshot={handleRestoreSnapshot}
                      lastUndoMessage={lastUndoMessage}
                      totalDebit={totalDebit}
                      totalCredit={totalCredit}
                      difference={difference}
                      isBalanced={isBalanced}
                      hasNegativeValues={hasNegativeValues}
                      hasDecimals={hasDecimals}
                      onSwapSides={handleSwapDebitCredit}
                      onApplyStorno={handleApplyStornoCorrection}
                      onAutoBalance={handleAutoBalanceDifference}
                    />

                    {/* Lines Table Editor */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">أطراف القيد المحاسبي (مدين / دائن)</span>
                          {entryCurrency !== 'EGP' && (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              القيم بـ ({entryCurrency}) والتحويل إلى (ج.م)
                            </span>
                          )}
                          {hasNegativeValues && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded flex items-center gap-1 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              قيد تسوية سالب (Red Storno)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={addLine}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة طرف جديد</span>
                        </button>
                      </div>

                      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                        {lines.map((line, idx) => (
                          <div
                            key={line.id}
                            className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-all ${
                              (line.debit < 0 || line.credit < 0)
                                ? 'bg-rose-50/70 border-rose-300'
                                : 'bg-slate-50/70 border-slate-200/60'
                            }`}
                          >
                            {/* Account selection */}
                            <div className={entryCurrency !== 'EGP' ? 'col-span-3' : 'col-span-4'}>
                              <select
                                required
                                value={line.accountId}
                                onChange={(e) => handleAccountSelect(idx, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                              >
                                <option value="">-- اختر الحساب من الدليل --</option>
                                {state.accounts.map((acc) => {
                                  const stat = accountStatsMap.get(acc.id);
                                  const usageTxt =
                                    stat && stat.totalUsage > 0
                                      ? ` (${stat.debitCount} مدين | ${stat.creditCount} دائن)`
                                      : '';
                                  return (
                                    <option key={acc.id} value={acc.id}>
                                      [{acc.code}] {acc.name} - ({acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}){usageTxt}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Foreign currency inputs if not EGP */}
                            {entryCurrency !== 'EGP' && (
                              <>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.foreignDebit || ''}
                                    onChange={(e) => handleAmountChange(idx, 'foreignDebit', e.target.value)}
                                    placeholder={`مدين (${entryCurrency})`}
                                    className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900 placeholder:text-blue-300"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.foreignCredit || ''}
                                    onChange={(e) => handleAmountChange(idx, 'foreignCredit', e.target.value)}
                                    placeholder={`دائن (${entryCurrency})`}
                                    className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 placeholder:text-amber-300"
                                  />
                                </div>
                              </>
                            )}

                            {/* EGP Debit */}
                            <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                              <input
                                type="number"
                                step="any"
                                value={line.debit !== undefined && line.debit !== null ? line.debit : ''}
                                onChange={(e) => handleAmountChange(idx, 'debit', e.target.value)}
                                placeholder="مدين ج.م"
                                className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold ${
                                  line.debit < 0
                                    ? 'border-rose-400 text-rose-700 bg-rose-50'
                                    : 'border-slate-300 text-blue-900'
                                } ${entryCurrency !== 'EGP' ? 'text-[11px]' : ''}`}
                              />
                            </div>

                            {/* EGP Credit */}
                            <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                              <input
                                type="number"
                                step="any"
                                value={line.credit !== undefined && line.credit !== null ? line.credit : ''}
                                onChange={(e) => handleAmountChange(idx, 'credit', e.target.value)}
                                placeholder="دائن ج.م"
                                className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold ${
                                  line.credit < 0
                                    ? 'border-rose-400 text-rose-700 bg-rose-50'
                                    : 'border-slate-300 text-amber-900'
                                } ${entryCurrency !== 'EGP' ? 'text-[11px]' : ''}`}
                              />
                            </div>

                            {/* Line Description */}
                            <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-3'}>
                              <input
                                type="text"
                                value={line.description || ''}
                                onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                                placeholder="ملاحظات الطرف"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                              />
                            </div>

                            {/* Remove Button */}
                            <div className="col-span-0.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Balance Footer */}
                      <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-700">إجمالي المدين: <span className="font-mono text-blue-900">{formatEgyptianCurrency(totalDebit)}</span></span>
                            <span className="text-slate-700">إجمالي الدائن: <span className="font-mono text-amber-900">{formatEgyptianCurrency(totalCredit)}</span></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isBalanced ? (
                              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs">
                                <CheckCircle className="w-4 h-4" />
                                <span>القيد متوازن تماماً</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs">
                                  <XCircle className="w-4 h-4" />
                                  <span>الفارق: {formatEgyptianCurrency(difference)}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={handleQuickBalance}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all"
                                >
                                  ⚡ موازنة تلقائية
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 Footer Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEntryStep(1)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer flex items-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>السابق: نوع المعاملة والبيانات</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isBalanced) {
                              setEntryStep(3);
                            }
                          }}
                          disabled={!isBalanced || lines.length === 0}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <span>التالي: مراجعة القيد والتأكيد</span>
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Review & Final Posting */}
                {entryStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {state.clients.find((c) => c.id === entryClientId)?.name || 'قيد عام غير مخصص لشركة'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            تاريخ القيد: <span className="font-mono font-bold text-slate-800">{date}</span> | نوع العملية: <span className="font-bold text-emerald-800">{entryType}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>جاهز للترحيل الفوري</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-500">البيان:</span>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{description}</p>
                      </div>

                      {/* Review Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="py-2 px-3 text-right">كود الحساب</th>
                              <th className="py-2 px-3 text-right">اسم الحساب</th>
                              <th className="py-2 px-3 text-left text-blue-900">مدين (ج.م)</th>
                              <th className="py-2 px-3 text-left text-amber-900">دائن (ج.م)</th>
                              <th className="py-2 px-3 text-right">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {lines.map((l, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-mono font-bold text-slate-600">{l.accountCode}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{l.accountName}</td>
                                <td className="py-2 px-3 font-mono font-bold text-left text-blue-900">
                                  {l.debit > 0 ? formatEgyptianCurrency(l.debit) : '-'}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-left text-amber-900">
                                  {l.credit > 0 ? formatEgyptianCurrency(l.credit) : '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-500 text-[11px]">{l.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100 font-bold">
                            <tr>
                              <td colSpan={2} className="py-2 px-3 text-slate-800">الإجمالي العام المتوازن:</td>
                              <td className="py-2 px-3 font-mono text-left text-blue-900">{formatEgyptianCurrency(totalDebit)}</td>
                              <td className="py-2 px-3 font-mono text-left text-amber-900">{formatEgyptianCurrency(totalCredit)}</td>
                              <td className="py-2 px-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Step 3 Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEntryStep(2)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer flex items-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>السابق: تعديل الأطراف</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenClientReportModalForNewEntry}
                          disabled={!isBalanced}
                          className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-950/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          title="ربط القيد مباشرة بملف العميل وتوثيقه كتقرير رسمي في أرشيف المستندات"
                        >
                          <FolderArchive className="w-4 h-4 text-emerald-300" />
                          <span>حفظ وتوثيق كتقرير للعميل بالأرشيف 🏢</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!isBalanced}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>حفظ وترحيل القيد للأستاذ العام ✅</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CLASSIC MODE OR EDIT MODE: All-in-one form */
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                {/* Company Selection for this Entry */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-700" />
                      <label className="font-bold text-slate-800 text-xs">
                        الشركة / المنشأة التابع لها هذا القيد:
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuickCompanyModalInEntryOpen(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ إضافة وتأسيس شركة جديدة</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={entryClientId || ''}
                      onChange={(e) => setEntryClientId(e.target.value || null)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="">-- قيد عام غير مخصص لشركة محددة (أو اختر الشركة المستهدفة) --</option>
                      {state.clients.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name} {cl.taxCardNo ? `(ضريبي: ${cl.taxCardNo})` : ''} - {cl.clientCode}
                        </option>
                      ))}
                    </select>
                    {entryClientId && (
                      <button
                        type="button"
                        onClick={() => setEntryClientId(null)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white border border-slate-200 cursor-pointer"
                        title="إلغاء تخصيص الشركة (جعله قيد عام)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">تاريخ القيد *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نوع العملية</label>
                    <select
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="GENERAL">يومية عامة</option>
                      <option value="SALES">مبيعات</option>
                      <option value="PURCHASE">مشتريات</option>
                      <option value="RECEIPT">مقبوضات</option>
                      <option value="PAYMENT">مدفوعات</option>
                      <option value="ADJUSTING">تسويات جردية</option>
                      <option value="CLOSING">إقفال حسابات</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">البيان الرئيسي للقيد *</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="شرح العملية المحاسبية..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Multi-Currency & Live Exchange Rate Section */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-800 text-xs">تعدد العملات وسعر الصرف مقابل الجنيه المصري (معيار EAS 13)</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {entryCurrency !== 'EGP' && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          1 {entryCurrency} = {exchangeRate} ج.م
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleRefreshRates}
                        disabled={isFetchingRates}
                        className="text-[11px] px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        title="تحديث أسعار الصرف الحية من واجهة API الرسمية"
                      >
                        <RefreshCw className={`w-3 h-3 text-emerald-600 ${isFetchingRates ? 'animate-spin' : ''}`} />
                        <span>{isFetchingRates ? 'جاري جلب الأسعار...' : 'تحديث أسعار الصرف الحية'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">عملة القيد</label>
                      <select
                        value={entryCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      >
                        {SUPPORTED_CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag} {curr.code} - {curr.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        سعر الصرف مقابل (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          disabled={entryCurrency === 'EGP'}
                          value={exchangeRate}
                          onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                          ج.م
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center">
                      {entryCurrency !== 'EGP' ? (
                        <div className="text-[11px] text-blue-800 bg-blue-50/80 p-2 rounded-lg border border-blue-200/80 w-full flex items-center justify-between">
                          <span>يتم تحويل المبالغ الأجنبية تلقائياً إلى معادلها بالجنيه المصري وفقاً للمعيار المصري رقم 13.</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 w-full">
                          العملة الأساسية للنظام هي <strong>الجنيه المصري (EGP)</strong>. اختر عملة أخرى لتفعيل التحويل التلقائي.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Smart Auto-Suggestion Engine Bar from Transaction History */}
                <JournalAutoSuggestBar
                  entries={state.journalEntries}
                  accounts={state.accounts}
                  lines={lines}
                  description={description}
                  entryType={entryType}
                  difference={difference}
                  totalDebit={totalDebit}
                  totalCredit={totalCredit}
                  onApplyHistoricalPattern={handleApplyHistoricalPattern}
                  onAddSuggestedCounterLine={handleAddSuggestedCounterLine}
                  onQuickBalance={handleQuickBalanceWithAccount}
                />

                {/* Financial Numbers & Storno Undo/Redo Engine Toolbar */}
                <JournalUndoToolbar
                  undoHistory={undoHistory}
                  redoHistory={redoHistory}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onRestoreSnapshot={handleRestoreSnapshot}
                  lastUndoMessage={lastUndoMessage}
                  totalDebit={totalDebit}
                  totalCredit={totalCredit}
                  difference={difference}
                  isBalanced={isBalanced}
                  hasNegativeValues={hasNegativeValues}
                  hasDecimals={hasDecimals}
                  onSwapSides={handleSwapDebitCredit}
                  onApplyStorno={handleApplyStornoCorrection}
                  onAutoBalance={handleAutoBalanceDifference}
                />

                {/* Lines Table Editor */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">أطراف القيد المحاسبي (مدين / دائن)</span>
                      {entryCurrency !== 'EGP' && (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          القيم بالعملة الأجنبية ({entryCurrency}) والتحويل التلقائي إلى (ج.م)
                        </span>
                      )}
                      {hasNegativeValues && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded flex items-center gap-1 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          قيد تسوية سالب (Red Storno)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة طرف جديد</span>
                    </button>
                  </div>

                  <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                    {lines.map((line, idx) => (
                      <div
                        key={line.id}
                        className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-all ${
                          (line.debit < 0 || line.credit < 0)
                            ? 'bg-rose-50/70 border-rose-300'
                            : 'bg-slate-50/70 border-slate-200/60'
                        }`}
                      >
                        {/* Account selection */}
                        <div className={entryCurrency !== 'EGP' ? 'col-span-3' : 'col-span-4'}>
                          <select
                            required
                            value={line.accountId}
                            onChange={(e) => handleAccountSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="">-- اختر الحساب من الدليل --</option>
                            {state.accounts.map((acc) => {
                              const stat = accountStatsMap.get(acc.id);
                              const usageTxt =
                                stat && stat.totalUsage > 0
                                  ? ` (${stat.debitCount} مدين | ${stat.creditCount} دائن)`
                                  : '';
                              return (
                                <option key={acc.id} value={acc.id}>
                                  [{acc.code}] {acc.name} - ({acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}){usageTxt}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Foreign currency inputs if not EGP */}
                        {entryCurrency !== 'EGP' && (
                          <>
                            <div className="col-span-2">
                              <input
                                type="number"
                                step="any"
                                value={line.foreignDebit || ''}
                                onChange={(e) => handleAmountChange(idx, 'foreignDebit', e.target.value)}
                                placeholder={`مدين (${entryCurrency})`}
                                className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900 placeholder:text-blue-300"
                              />
                            </div>

                            <div className="col-span-2">
                              <input
                                type="number"
                                step="any"
                                value={line.foreignCredit || ''}
                                onChange={(e) => handleAmountChange(idx, 'foreignCredit', e.target.value)}
                                placeholder={`دائن (${entryCurrency})`}
                                className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 placeholder:text-amber-300"
                              />
                            </div>
                          </>
                        )}

                        {/* EGP Debit */}
                        <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                          <input
                            type="number"
                            step="any"
                            value={line.debit !== undefined && line.debit !== null ? line.debit : ''}
                            onChange={(e) => handleAmountChange(idx, 'debit', e.target.value)}
                            placeholder="مدين ج.م"
                            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold ${
                              line.debit < 0
                                ? 'border-rose-400 text-rose-700 bg-rose-50'
                                : 'border-slate-300 text-blue-900'
                            } ${entryCurrency !== 'EGP' ? 'text-[11px]' : ''}`}
                          />
                        </div>

                        {/* EGP Credit */}
                        <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                          <input
                            type="number"
                            step="any"
                            value={line.credit !== undefined && line.credit !== null ? line.credit : ''}
                            onChange={(e) => handleAmountChange(idx, 'credit', e.target.value)}
                            placeholder="دائن ج.م"
                            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold ${
                              line.credit < 0
                                ? 'border-rose-400 text-rose-700 bg-rose-50'
                                : 'border-slate-300 text-amber-900'
                            } ${entryCurrency !== 'EGP' ? 'text-[11px]' : ''}`}
                          />
                        </div>

                        {/* Line Description */}
                        <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-3'}>
                          <input
                            type="text"
                            value={line.description || ''}
                            onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                            placeholder="ملاحظات الطرف"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="col-span-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Balance Footer */}
                  <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 space-y-2">
                    {entryCurrency !== 'EGP' && (
                      <div className="flex items-center justify-between text-xs text-blue-900 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-4 font-bold">
                          <span>إجمالي بالعملة الأجنبية ({entryCurrency}):</span>
                          <span>مدين: <span className="font-mono">{Number(foreignTotalDebit).toLocaleString()}</span></span>
                          <span>دائن: <span className="font-mono">{Number(foreignTotalCredit).toLocaleString()}</span></span>
                        </div>
                        <span className="text-[11px] text-blue-700 font-semibold">
                          فارق العملة الأجنبية: <span className="font-mono">{Number(foreignDifference).toLocaleString()}</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-700">إجمالي المدين (ج.م): <span className="font-mono text-blue-900">{formatEgyptianCurrency(totalDebit)}</span></span>
                        <span className="text-slate-700">إجمالي الدائن (ج.م): <span className="font-mono text-amber-900">{formatEgyptianCurrency(totalCredit)}</span></span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isBalanced ? (
                          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs">
                            <CheckCircle className="w-4 h-4" />
                            <span>القيد متوازن تماماً</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs">
                            <XCircle className="w-4 h-4" />
                            <span>فارق عدم التوازن: {formatEgyptianCurrency(difference)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {!editingEntryId && (lastAutoSaveTime || description || aiPrompt) && (
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="مسح المسودة والبدء بقيد جديد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>مسح المسودة</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewEntryModalOpen(false);
                        setEditingEntryId(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>

                    {!editingEntryId && (
                      <button
                        type="button"
                        onClick={handleOpenClientReportModalForNewEntry}
                        disabled={!isBalanced}
                        className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-950/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="ربط القيد مباشرة بملف العميل وتوثيقه كتقرير رسمي في أرشيف المستندات"
                      >
                        <FolderArchive className="w-4 h-4 text-emerald-300" />
                        <span>حفظ كتقرير للعميل بالأرشيف 🏢</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={!isBalanced}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {editingEntryId ? (
                        <>
                          <Edit2 className="w-4 h-4" />
                          <span>حفظ التعديلات على القيد</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>حفظ وترحيل القيد للأستاذ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Entry Details - Slide-Over Ergonomic Drawer (نظام عرض بيانات) */}
      <SlideOverDrawer
        isOpen={Boolean(selectedEntryForView)}
        onClose={() => setSelectedEntryForView(null)}
        title={selectedEntryForView ? `قيد يومية #${selectedEntryForView.serialNumber}` : ''}
        subtitle={selectedEntryForView ? `تاريخ القيد: ${selectedEntryForView.date} | ${selectedEntryForView.isPosted ? 'مرحل للأستاذ' : 'مسودة'}` : ''}
        icon={Receipt}
        badge={selectedEntryForView?.isPosted ? '✓ مرحل' : 'مسودة'}
        badgeVariant={selectedEntryForView?.isPosted ? 'emerald' : 'amber'}
        width="max-w-2xl"
      >
        {selectedEntryForView && (
          <div className="space-y-4 text-xs">
            {/* Read-Only Notice */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 text-xs">
                <Lock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>
                  أنت الآن في <strong>(نظام عرض البيانات)</strong>. لتعديل تفاصيل القيد، انقر على زر التعديل وأدخل الرقم السري المصرح به.
                </span>
              </div>
              <button
                onClick={() => handleRequestEdit(selectedEntryForView)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">البيان:</div>
                <p className="text-slate-700 dark:text-slate-300">{selectedEntryForView.description}</p>
              </div>
              {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">معادلة الصرف:</span>
                  <span className="font-mono font-bold text-xs text-blue-900 dark:text-blue-300">
                    1 {selectedEntryForView.currency} = {selectedEntryForView.exchangeRate} ج.م
                  </span>
                </div>
              )}
            </div>

            {/* Read-Only Lines Table */}
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center justify-between">
                <span>أطراف وحسابات القيد:</span>
                {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                  <span className="text-[11px] text-slate-500 font-normal">
                    مترجم بالعملة المحلية وفق معيار (EAS 13)
                  </span>
                )}
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5">كود الحساب</th>
                      <th className="p-2.5">اسم الحساب</th>
                      {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                        <>
                          <th className="p-2.5 text-left text-blue-700 dark:text-blue-400">مدين ({selectedEntryForView.currency})</th>
                          <th className="p-2.5 text-left text-amber-700 dark:text-amber-400">دائن ({selectedEntryForView.currency})</th>
                        </>
                      )}
                      <th className="p-2.5 text-left">مدين (ج.م)</th>
                      <th className="p-2.5 text-left">دائن (ج.م)</th>
                      <th className="p-2.5">شرح الطرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedEntryForView.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{line.accountCode}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200">{line.accountName}</td>
                        {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                          <>
                            <td className="p-2.5 font-mono font-bold text-left text-blue-700 dark:text-blue-400">
                              {line.foreignDebit && line.foreignDebit > 0 ? Number(line.foreignDebit).toLocaleString() : '-'}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-left text-amber-700 dark:text-amber-400">
                              {line.foreignCredit && line.foreignCredit > 0 ? Number(line.foreignCredit).toLocaleString() : '-'}
                            </td>
                          </>
                        )}
                        <td className="p-2.5 font-mono font-bold text-left text-blue-700 dark:text-blue-400">
                          {line.debit > 0 ? formatEgyptianCurrency(line.debit) : '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-left text-amber-700 dark:text-amber-400">
                          {line.credit > 0 ? formatEgyptianCurrency(line.credit) : '-'}
                        </td>
                        <td className="p-2.5 text-slate-500">{line.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                      <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-blue-900 dark:text-blue-300 border-t border-slate-200 dark:border-slate-700">
                        <td colSpan={2} className="p-2.5 text-right">إجمالي {selectedEntryForView.currency}:</td>
                        <td className="p-2.5 font-mono text-left text-blue-800 dark:text-blue-400">
                          {Number(selectedEntryForView.foreignTotalDebit || 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-mono text-left text-amber-800 dark:text-amber-400">
                          {Number(selectedEntryForView.foreignTotalCredit || 0).toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' ? 4 : 2} className="p-2.5 text-right">
                        الإجمالي المعادل بالجنيه المصري (EGP):
                      </td>
                      <td className="p-2.5 font-mono text-left text-blue-800 dark:text-blue-400">
                        {formatEgyptianCurrency(selectedEntryForView.totalDebit)}
                      </td>
                      <td className="p-2.5 font-mono text-left text-amber-800 dark:text-amber-400">
                        {formatEgyptianCurrency(selectedEntryForView.totalCredit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* QR Code and Audit Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <div className="space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-300">رمز التوثيق الإلكتروني المشفر (QR Code)</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono break-all max-w-xs sm:max-w-md">
                  {selectedEntryForView.qrPayload}
                </div>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: generateQrCodeSvg(selectedEntryForView.qrPayload || 'VALID', 56),
                }}
              />
            </div>

            {/* Audit Trail */}
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>سجل التدقيق والتعديلات (Audit Trail)</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedEntryForView.auditTrail?.map((record, i) => (
                  <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{record.user}</span>
                      <span className="text-slate-500 mx-1.5">({record.action})</span>
                      <span className="text-slate-600 dark:text-slate-400">{record.details}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[10px]">{record.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <button
                onClick={() => handleRequestEdit(selectedEntryForView)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>تعديل القيد</span>
              </button>

              <button
                onClick={() => handleOpenClientReportModalForExistingEntry(selectedEntryForView)}
                className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                title="توثيق هذا القيد كتقرير رسمي في أرشيف العميل"
              >
                <FolderArchive className="w-4 h-4 text-emerald-300" />
                <span>توثيق بأرشيف العميل</span>
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Security Auth Modal for Edit Passcode (Mg120) */}
      {isAuthModalOpen && (
        <SecurityAuthModal
          title="طلب إذن تعديل القيد المحاسبي"
          itemDescription="القيد المحاسبي محفوظ حالياً في (نظام عرض البيانات) لحماية الحسابات من التعديل العفوي."
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setIsAuthModalOpen(false);
            setEntryToEdit(null);
          }}
        />
      )}

      {/* Client Archive Report Selector & Document Binder Modal */}
      <ClientSelectionReportModal
        isOpen={isClientReportModalOpen}
        onClose={() => {
          setIsClientReportModalOpen(false);
          setPendingEntryForReport(null);
        }}
        onConfirm={handleConfirmSaveAsClientReport}
        clients={state.clientArchives || []}
        activeClientId={state.activeClientContext?.clientId}
        entrySummary={
          pendingEntryForReport?.mode === 'NEW'
            ? {
                description: pendingEntryForReport.entryData?.description || 'قيد يومية عامة',
                totalDebit: pendingEntryForReport.entryData?.totalDebit || 0,
                totalCredit: pendingEntryForReport.entryData?.totalCredit || 0,
                currency: pendingEntryForReport.entryData?.entryCurrency || 'EGP',
                exchangeRate: pendingEntryForReport.entryData?.exchangeRate || 1.0,
                linesCount: pendingEntryForReport.entryData?.lines?.length || 0,
                date: pendingEntryForReport.entryData?.date || new Date().toISOString().slice(0, 10),
              }
            : pendingEntryForReport?.existingEntry
            ? {
                serialNumber: pendingEntryForReport.existingEntry.serialNumber,
                description: pendingEntryForReport.existingEntry.description,
                totalDebit: pendingEntryForReport.existingEntry.totalDebit,
                totalCredit: pendingEntryForReport.existingEntry.totalCredit,
                currency: pendingEntryForReport.existingEntry.currency || 'EGP',
                exchangeRate: pendingEntryForReport.existingEntry.exchangeRate || 1.0,
                linesCount: pendingEntryForReport.existingEntry.lines.length,
                date: pendingEntryForReport.existingEntry.date,
              }
            : undefined
        }
      />
      {/* Quick Company Add Modal inside Journal Entry */}
      <QuickCompanyModal
        isOpen={isQuickCompanyModalInEntryOpen}
        onClose={() => setIsQuickCompanyModalInEntryOpen(false)}
        onCompanyCreated={(newCl) => {
          setEntryClientId(newCl.id);
        }}
      />

      {/* Excel Import Engine Modal for Journal Entries & General Ledger */}
      <ExcelImportManager
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        defaultMode="JOURNAL_ENTRIES"
        onImportComplete={(summary) => {
          alert(`تم استيراد ${summary.entriesCount} قيد محاسبي (${summary.linesCount} طرف قيد) بنجاح.`);
        }}
      />

      {/* Official Journal Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintJournalModalOpen}
        onClose={() => setIsPrintJournalModalOpen(false)}
        documentTitle="دفتر قيود اليومية العامة المعتمد (General Journal Register)"
        targetElementId="printable-journal-book"
      >
        <PrintLayoutWrapper
          id="printable-journal-book"
          documentTitle="دفتر قيود اليومية العامة المعتمد"
          documentSubtitle="سجل الحركات المالية المزدوجة وفق معايير المحاسبة المصرية (EAS)"
          documentRefNumber="JOURNAL-REG-2026"
          companyName={state.activeClientContext?.clientName || 'كافة المنشآت والشركات'}
          clientCode={state.activeClientContext?.clientCode}
          fiscalYear={state.activeClientContext?.selectedFiscalYear || '2026'}
        >
          <div className="space-y-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">إجمالي القيود بالدفتر: {filteredEntries.length} قيد</span>
              <span className="font-bold text-blue-900 font-mono">
                إجمالي المدين: {formatEgyptianCurrency(filteredEntries.reduce((acc, e) => acc + (e.totalDebit || 0), 0))}
              </span>
              <span className="font-bold text-amber-900 font-mono">
                إجمالي الدائن: {formatEgyptianCurrency(filteredEntries.reduce((acc, e) => acc + (e.totalCredit || 0), 0))}
              </span>
            </div>

            <div className="space-y-4">
              {filteredEntries.map((entry, idx) => (
                <div key={entry.id || idx} className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 p-2.5 flex items-center justify-between font-bold border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300">
                        {entry.serialNumber || `JV-${idx + 1}`}
                      </span>
                      <span>التاريخ: {entry.date}</span>
                      <span className="text-slate-700 font-normal">{entry.description}</span>
                    </div>
                    {entry.clientName && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        {entry.clientName}
                      </span>
                    )}
                  </div>

                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-2 w-20">كود الحساب</th>
                        <th className="p-2">اسم الحساب المحاسبي</th>
                        <th className="p-2 text-left text-blue-700 w-28">مدين (ج.م)</th>
                        <th className="p-2 text-left text-amber-700 w-28">دائن (ج.م)</th>
                        <th className="p-2">البيان والشرح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entry.lines.map((line, lIdx) => (
                        <tr key={line.id || lIdx}>
                          <td className="p-2 font-mono text-slate-600">{line.accountCode}</td>
                          <td className="p-2 font-bold text-slate-800">{line.accountName}</td>
                          <td className="p-2 font-mono font-bold text-left text-blue-700">
                            {line.debit > 0 ? Number(line.debit).toLocaleString() : '-'}
                          </td>
                          <td className="p-2 font-mono font-bold text-left text-amber-700">
                            {line.credit > 0 ? Number(line.credit).toLocaleString() : '-'}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">{line.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={2} className="p-2 text-right">إجمالي القيد:</td>
                        <td className="p-2 font-mono text-left text-blue-800">
                          {Number(entry.totalDebit).toLocaleString()}
                        </td>
                        <td className="p-2 font-mono text-left text-amber-800">
                          {Number(entry.totalCredit).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </PrintLayoutWrapper>
      </PrintPreviewModal>

      {/* Smart OCR Invoice Scanner Modal */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 text-right relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-sm font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                الماسح الضوئي الذكي للفواتير (OCR) - تسجيل قيد آلي
              </span>
              <button
                onClick={() => setIsOcrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <InvoiceOcrScannerView
              onNavigateToJournal={() => setIsOcrModalOpen(false)}
              onOpenEntryDetails={() => {
                setIsOcrModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* AI Journal Error Audit Modal (فحص أخطاء وتكرارات وتوازن القيود) */}
      <JournalErrorsAuditModal
        isOpen={isAuditErrorsModalOpen}
        onClose={() => setIsAuditErrorsModalOpen(false)}
        state={state}
        onNavigateToEntry={(entryId) => {
          const entry = state.journalEntries.find((e) => e.id === entryId);
          if (entry) {
            setSelectedEntryForView(entry);
          }
        }}
      />
    </div>
  );
};
