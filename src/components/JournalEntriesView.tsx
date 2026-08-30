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
} from 'lucide-react';
import { JournalEntry, JournalEntryLine, Account, CurrencyCode } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { SecurityAuthModal } from './SecurityAuthModal';
import { SecurityAuthService } from '../services/securityAuth';
import { formDraftStorage } from '../utils/formDrafts';
import { currencyService, SUPPORTED_CURRENCIES } from '../utils/currencyService';

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<JournalEntry['entryType']>('GENERAL');
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
    { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
  ]);

  // Auto-Save & Draft State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);
  const isInitialDraftLoaded = useRef(false);

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
        savedDraft.lines?.some((l) => l.accountId || l.debit > 0 || l.credit > 0))
    ) {
      setDate(savedDraft.date || new Date().toISOString().slice(0, 10));
      setDescription(savedDraft.description || '');
      setEntryType((savedDraft.entryType as any) || 'GENERAL');
      if (savedDraft.currency) setEntryCurrency(savedDraft.currency);
      if (savedDraft.exchangeRate) setExchangeRate(savedDraft.exchangeRate);
      if (savedDraft.lines && savedDraft.lines.length >= 2) {
        setLines(savedDraft.lines);
      }
      if (savedDraft.aiPrompt) setAiPrompt(savedDraft.aiPrompt);
      if (savedDraft.aiAmount !== undefined) setAiAmount(savedDraft.aiAmount);
      if (savedDraft.aiExplanation) setAiExplanation(savedDraft.aiExplanation);

      setDraftRestoredNotice(
        `تم استعادة مسودة القيد تلقائياً (${savedDraft.meta?.timeFormatted || 'سابقاً'}) لحماية البيانات من الإغلاق غير المتوقع.`
      );
      setLastAutoSaveTime(savedDraft.meta?.timeFormatted || null);
    }
  }, []);

  // Auto-save changes to localStorage whenever fields update in new entry mode
  useEffect(() => {
    if (editingEntryId) return; // Do not overwrite new draft when editing an existing archived record

    const hasMeaningfulData =
      Boolean(description.trim()) ||
      Boolean(aiPrompt.trim()) ||
      lines.some((l) => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0);

    if (!hasMeaningfulData) return;

    const timer = setTimeout(() => {
      const meta = formDraftStorage.saveJournalDraft({
        date,
        entryType,
        currency: entryCurrency,
        exchangeRate,
        description,
        lines,
        aiPrompt,
        aiAmount,
        aiExplanation,
      });
      setLastAutoSaveTime(meta.timeFormatted);
    }, 400);

    return () => clearTimeout(timer);
  }, [date, entryType, entryCurrency, exchangeRate, description, lines, aiPrompt, aiAmount, aiExplanation, editingEntryId]);

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
      setAiPrompt('');
      setAiAmount('');
      setAiExplanation(null);
      setLines([
        { id: 'l1', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
        { id: 'l2', accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, foreignDebit: 0, foreignCredit: 0, currency: 'EGP', exchangeRate: 1.0, description: '' },
      ]);
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
    }
  };

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const foreignTotalDebit = lines.reduce((s, l) => s + (Number(l.foreignDebit) || 0), 0);
  const foreignTotalCredit = lines.reduce((s, l) => s + (Number(l.foreignCredit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const foreignDifference = Math.abs(foreignTotalDebit - foreignTotalCredit);
  const isBalanced = totalDebit > 0 && difference < 0.01;

  const handleAccountSelect = (index: number, accountId: string) => {
    const acc = state.accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const newLines = [...lines];
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

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines];
    const currentRate = newLines[index].exchangeRate || exchangeRate || 1.0;

    if (field === 'foreignDebit') {
      const fVal = Number(value) || 0;
      newLines[index] = {
        ...newLines[index],
        foreignDebit: fVal,
        foreignCredit: 0,
        debit: entryCurrency !== 'EGP' ? Number((fVal * currentRate).toFixed(2)) : fVal,
        credit: 0,
      };
    } else if (field === 'foreignCredit') {
      const fVal = Number(value) || 0;
      newLines[index] = {
        ...newLines[index],
        foreignCredit: fVal,
        foreignDebit: 0,
        credit: entryCurrency !== 'EGP' ? Number((fVal * currentRate).toFixed(2)) : fVal,
        debit: 0,
      };
    } else if (field === 'debit') {
      const egpVal = Number(value) || 0;
      newLines[index] = {
        ...newLines[index],
        debit: egpVal,
        foreignDebit: entryCurrency !== 'EGP' && currentRate > 0 ? Number((egpVal / currentRate).toFixed(2)) : egpVal,
      };
    } else if (field === 'credit') {
      const egpVal = Number(value) || 0;
      newLines[index] = {
        ...newLines[index],
        credit: egpVal,
        foreignCredit: entryCurrency !== 'EGP' && currentRate > 0 ? Number((egpVal / currentRate).toFixed(2)) : egpVal,
      };
    } else {
      newLines[index] = {
        ...newLines[index],
        [field]: value,
      };
    }
    setLines(newLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: `l-${Date.now()}`,
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

  const handleSmartAiGenerate = async () => {
    if (!aiPrompt) {
      alert('يرجى كتابة وصف العملية المحاسبية أولاً');
      return;
    }
    setIsAiLoading(true);
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
      } else {
        // Fallback to local rule based suggestions
        applyPresetTemplate('SALES_VAT_WHT');
      }
    } catch (e) {
      console.error(e);
      applyPresetTemplate('SALES_VAT_WHT');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRequestEdit = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    if (!SecurityAuthService.isSecurityAuthEnabled()) {
      // Security PIN is disabled in settings -> Open directly without password
      setEditingEntryId(entry.id);
      setDate(entry.date);
      setDescription(entry.description);
      setEntryType(entry.entryType || 'GENERAL');
      setEntryCurrency(entry.currency || 'EGP');
      setExchangeRate(entry.exchangeRate || 1.0);
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
      });
      alert('تم حفظ وتحديث بيانات القيد بنجاح بعد التحقق من الرقم السري (Mg120).');
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

  // Pagination State for high-performance large data
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return state.journalEntries.filter((entry) => {
      const matchesSearch =
        !term ||
        entry.description.toLowerCase().includes(term) ||
        entry.serialNumber.toLowerCase().includes(term) ||
        entry.lines.some((l) => l.accountName.toLowerCase().includes(term) || l.accountCode.includes(term));

      const matchesPosted =
        filterPosted === 'ALL' ||
        (filterPosted === 'POSTED' && entry.isPosted) ||
        (filterPosted === 'DRAFT' && !entry.isPosted);

      return matchesSearch && matchesPosted;
    });
  }, [state.journalEntries, searchTerm, filterPosted]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / (pageSize || 20)));

  const paginatedEntries = useMemo(() => {
    if (pageSize >= 999999) return filteredEntries;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEntries.slice(startIndex, startIndex + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              دفتر اليومية العامة والترحيل الذكي (General Journal)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل القيود المزدوجة المتوازنة، الترحيل الآلي للأستاذ العام، مع مساعد القيود الذكي للضرائب والرواتب المصرية.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => db.exportTableToExcel('JOURNAL')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={() => setIsNewEntryModalOpen(true)}
            id="btn-create-journal-entry"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل قيد جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم القيد أو البيان أو اسم الحساب..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterPosted('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterPosted === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع القيود ({state.journalEntries.length})
          </button>
          <button
            onClick={() => setFilterPosted('POSTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterPosted === 'POSTED'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            المرحلة للأستاذ ({state.journalEntries.filter((e) => e.isPosted).length})
          </button>
          <button
            onClick={() => setFilterPosted('DRAFT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterPosted === 'DRAFT'
                ? 'bg-amber-800 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            المسودات ({state.journalEntries.filter((e) => !e.isPosted).length})
          </button>
        </div>
      </div>

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
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:border-slate-300 transition-colors"
            >
              {/* Entry Card Header */}
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-800 text-white shadow-2xs">
                    {entry.serialNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{entry.date}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      entry.isPosted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {entry.isPosted ? '✓ مرحل للأستاذ' : 'مسودة'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {entry.entryType}
                  </span>

                  {/* Multi-Currency Badge */}
                  {entry.currency && entry.currency !== 'EGP' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-mono">
                      <Globe className="w-3 h-3 text-blue-600" />
                      <span>{entry.currency} {entry.foreignTotalDebit ? Number(entry.foreignTotalDebit).toLocaleString() : ''} (سعر: {entry.exchangeRate || 1} ج.م)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-slate-800 ml-2">
                    الإجمالي: <span className="font-mono text-emerald-700">{formatEgyptianCurrency(entry.totalDebit)}</span>
                  </div>
                  <button
                    onClick={() => db.togglePostEntry(entry.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      entry.isPosted
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {entry.isPosted ? 'إلغاء الترحيل' : 'ترحيل للأستاذ'}
                  </button>
                  <button
                    onClick={() => setSelectedEntryForView(entry)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 cursor-pointer flex items-center gap-1 text-xs font-bold border border-blue-200"
                    title="نظام عرض البيانات"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض</span>
                  </button>
                  <button
                    onClick={() => handleRequestEdit(entry)}
                    className="p-1.5 text-amber-700 hover:text-amber-900 rounded-lg hover:bg-amber-50 cursor-pointer flex items-center gap-1 text-xs font-bold border border-amber-200"
                    title="تعديل القيد (يتطلب الرقم السري Mg120)"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>تعديل</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-2.5 text-xs font-medium text-slate-800 bg-white flex items-center justify-between">
                <div>
                  <span className="text-slate-400 ml-1">البيان:</span> {entry.description}
                </div>
                {entry.currency && entry.currency !== 'EGP' && (
                  <span className="text-[11px] text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                    معاملة بالعملة الأجنبية: <strong>{SUPPORTED_CURRENCIES.find(c => c.code === entry.currency)?.nameAr || entry.currency}</strong> (معيار EAS 13)
                  </span>
                )}
              </div>

              {/* Journal Lines Table */}
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                      <th className="py-2 px-5">كود الحساب</th>
                      <th className="py-2 px-5">اسم الحساب</th>
                      {entry.currency && entry.currency !== 'EGP' && (
                        <>
                          <th className="py-2 px-5 text-left text-blue-700">مدين ({entry.currency})</th>
                          <th className="py-2 px-5 text-left text-amber-700">دائن ({entry.currency})</th>
                        </>
                      )}
                      <th className="py-2 px-5 text-left">مدين (ج.م)</th>
                      <th className="py-2 px-5 text-left">دائن (ج.م)</th>
                      <th className="py-2 px-5">شرح الطرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entry.lines.map((line, idx) => (
                      <tr key={line.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-5 font-mono text-slate-600">{line.accountCode}</td>
                        <td className="py-2 px-5 font-medium text-slate-900">{line.accountName}</td>
                        {entry.currency && entry.currency !== 'EGP' && (
                          <>
                            <td className="py-2 px-5 font-mono font-semibold text-left text-blue-700">
                              {line.foreignDebit && line.foreignDebit > 0 ? Number(line.foreignDebit).toLocaleString() : '-'}
                            </td>
                            <td className="py-2 px-5 font-mono font-semibold text-left text-amber-700">
                              {line.foreignCredit && line.foreignCredit > 0 ? Number(line.foreignCredit).toLocaleString() : '-'}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-5 font-mono font-bold text-left text-blue-800">
                          {line.debit > 0 ? formatEgyptianCurrency(line.debit) : '-'}
                        </td>
                        <td className="py-2 px-5 font-mono font-bold text-left text-amber-800">
                          {line.credit > 0 ? formatEgyptianCurrency(line.credit) : '-'}
                        </td>
                        <td className="py-2 px-5 text-slate-500 text-[11px]">{line.description || '-'}</td>
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

      {/* New Journal Entry Modal */}
      {isNewEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingEntryId ? 'تعديل القيد المحاسبي (وضع التعديل المصرح به)' : 'تسجيل قيد يومية عامة جديد'}
                </h3>
                {editingEntryId ? (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-700" />
                    <span>تم التحقق (Mg120)</span>
                  </span>
                ) : lastAutoSaveTime ? (
                  <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Save className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span>حفظ تلقائي للمسودة: {lastAutoSaveTime}</span>
                  </span>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setIsNewEntryModalOpen(false);
                  setEditingEntryId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
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

            {/* Smart Egyptian AI Assistant Box */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    مساعد القيد الذكي واقتراح الحسابات بالمعايير المصرية
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('SALES_VAT_WHT')}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    قيد مبيعات 14% + 1%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('PURCHASE_VAT_WHT')}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    قيد مشتريات 14% + 1%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTemplate('PAYROLL_EAS')}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    قيد مرتبات وكسب عمل
                  </button>
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

            {/* Entry Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
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
                      onChange={(e) => handleCurrencyChange(e.target.value)}
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
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 p-2 rounded-lg border border-slate-200/60"
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
                          {state.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.code}] {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Foreign currency inputs if not EGP */}
                      {entryCurrency !== 'EGP' && (
                        <>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={line.foreignDebit || ''}
                              onChange={(e) => handleLineChange(idx, 'foreignDebit', e.target.value)}
                              placeholder={`مدين (${entryCurrency})`}
                              className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900 placeholder:text-blue-300"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={line.foreignCredit || ''}
                              onChange={(e) => handleLineChange(idx, 'foreignCredit', e.target.value)}
                              placeholder={`دائن (${entryCurrency})`}
                              className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 placeholder:text-amber-300"
                            />
                          </div>
                        </>
                      )}

                      {/* EGP Debit */}
                      <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={line.debit || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              handleLineChange(idx, 'debit', val);
                              if (val > 0) handleLineChange(idx, 'credit', 0);
                            }}
                            placeholder="مدين ج.م"
                            className={`w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 ${
                              entryCurrency !== 'EGP' ? 'bg-slate-50 text-[11px]' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* EGP Credit */}
                      <div className={entryCurrency !== 'EGP' ? 'col-span-1.5' : 'col-span-2'}>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={line.credit || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              handleLineChange(idx, 'credit', val);
                              if (val > 0) handleLineChange(idx, 'debit', 0);
                            }}
                            placeholder="دائن ج.م"
                            className={`w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-amber-900 ${
                              entryCurrency !== 'EGP' ? 'bg-slate-50 text-[11px]' : ''
                            }`}
                          />
                        </div>
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
          </div>
        </div>
      )}

      {/* Entry Details - Read-Only View Mode (نظام عرض بيانات) */}
      {selectedEntryForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95 duration-150">
            {/* Header with View-Only Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono font-bold text-sm text-emerald-900 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                  {selectedEntryForView.serialNumber}
                </span>
                <span className="text-slate-500">• {selectedEntryForView.date}</span>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>نظام عرض بيانات</span>
                </span>
                {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>{selectedEntryForView.currency} (سعر الصرف: {selectedEntryForView.exchangeRate || 1} ج.م)</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedEntryForView(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Read-Only Notice */}
            <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-900 text-xs">
                <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  أنت الآن في <strong>(نظام عرض البيانات)</strong>. لتعديل تفاصيل القيد، انقر على زر التعديل وأدخل الرقم السري المصرح به (<span className="font-mono font-bold">Mg120</span>).
                </span>
              </div>
              <button
                onClick={() => handleRequestEdit(selectedEntryForView)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>تعديل القيد (Mg120)</span>
              </button>
            </div>

            <div className="space-y-4 mt-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 mb-1">البيان:</div>
                  <p className="text-slate-700">{selectedEntryForView.description}</p>
                </div>
                {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                  <div className="text-left bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">معادلة الصرف المعتمدة:</span>
                    <span className="font-mono font-bold text-xs text-blue-900">
                      1 {selectedEntryForView.currency} = {selectedEntryForView.exchangeRate} ج.م
                    </span>
                  </div>
                )}
              </div>

              {/* Read-Only Lines Table */}
              <div>
                <div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>أطراف وحسابات القيد:</span>
                  {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      مترجم بالعملة المحلية وفق معيار المحاسبة المصري (EAS 13)
                    </span>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2.5">كود الحساب</th>
                        <th className="p-2.5">اسم الحساب</th>
                        {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                          <>
                            <th className="p-2.5 text-left text-blue-700">مدين ({selectedEntryForView.currency})</th>
                            <th className="p-2.5 text-left text-amber-700">دائن ({selectedEntryForView.currency})</th>
                          </>
                        )}
                        <th className="p-2.5 text-left">مدين (ج.م)</th>
                        <th className="p-2.5 text-left">دائن (ج.م)</th>
                        <th className="p-2.5">شرح الطرف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEntryForView.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-600">{line.accountCode}</td>
                          <td className="p-2.5 font-bold text-slate-900">{line.accountName}</td>
                          {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                            <>
                              <td className="p-2.5 font-mono font-bold text-left text-blue-700">
                                {line.foreignDebit && line.foreignDebit > 0 ? Number(line.foreignDebit).toLocaleString() : '-'}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-left text-amber-700">
                                {line.foreignCredit && line.foreignCredit > 0 ? Number(line.foreignCredit).toLocaleString() : '-'}
                              </td>
                            </>
                          )}
                          <td className="p-2.5 font-mono font-bold text-left text-blue-700">
                            {line.debit > 0 ? formatEgyptianCurrency(line.debit) : '-'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-left text-amber-700">
                            {line.credit > 0 ? formatEgyptianCurrency(line.credit) : '-'}
                          </td>
                          <td className="p-2.5 text-slate-500">{line.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' && (
                        <tr className="bg-blue-50/50 font-bold text-blue-900 border-t border-slate-200">
                          <td colSpan={2} className="p-2.5 text-right">إجمالي {selectedEntryForView.currency}:</td>
                          <td className="p-2.5 font-mono text-left text-blue-800">
                            {Number(selectedEntryForView.foreignTotalDebit || 0).toLocaleString()}
                          </td>
                          <td className="p-2.5 font-mono text-left text-amber-800">
                            {Number(selectedEntryForView.foreignTotalCredit || 0).toLocaleString()}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={selectedEntryForView.currency && selectedEntryForView.currency !== 'EGP' ? 4 : 2} className="p-2.5 text-right">
                          الإجمالي المعادل بالجنيه المصري (EGP):
                        </td>
                        <td className="p-2.5 font-mono text-left text-blue-800">
                          {formatEgyptianCurrency(selectedEntryForView.totalDebit)}
                        </td>
                        <td className="p-2.5 font-mono text-left text-amber-800">
                          {formatEgyptianCurrency(selectedEntryForView.totalCredit)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* QR Code and Audit Info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="space-y-1">
                  <div className="font-bold text-emerald-900">رمز التوثيق الإلكتروني المشفر (QR Code)</div>
                  <div className="text-[10px] text-slate-600 font-mono break-all max-w-md">
                    {selectedEntryForView.qrPayload}
                  </div>
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(selectedEntryForView.qrPayload || 'VALID', 64),
                  }}
                />
              </div>

              {/* Audit Trail */}
              <div>
                <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-600" />
                  <span>سجل التدقيق والتعديلات على القيد (Audit Trail)</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedEntryForView.auditTrail?.map((record, i) => (
                    <div key={i} className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800">{record.user}</span>
                        <span className="text-slate-500 mx-1.5">({record.action})</span>
                        <span className="text-slate-600">{record.details}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">{record.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={() => handleRequestEdit(selectedEntryForView)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>تعديل القيد المحاسبي (بإذن Mg120)</span>
              </button>

              <button
                onClick={() => setSelectedEntryForView(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
