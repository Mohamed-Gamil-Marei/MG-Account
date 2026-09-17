import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Printer,
  FileSpreadsheet,
  Search,
  Trash2,
  CheckCircle,
  Eye,
  Building,
  QrCode,
  Lock,
  Edit2,
  KeyRound,
  Save,
  RotateCcw,
  Upload,
  Download,
  Settings,
  Send,
  FileCode,
  FileText,
  ShieldCheck,
  Receipt,
  FileCheck,
  ExternalLink,
  ChevronDown,
  Sparkles,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { Invoice, InvoiceItem, EtaReceiverType, EtaDocumentType } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { SecurityAuthModal } from './SecurityAuthModal';
import { SecurityAuthService } from '../services/securityAuth';
import { formDraftStorage, useNetworkStatus } from '../utils/formDrafts';
import { AutoSaveStatusBadge } from './common/AutoSaveStatusBadge';
import { DraftRecoveryBanner } from './common/DraftRecoveryBanner';
import { EtaSettingsModal } from './EtaSettingsModal';
import { ExcelImportModal } from './ExcelImportModal';
import { EtaSubmissionModal } from './EtaSubmissionModal';
import { etaService } from '../utils/etaSdkEngine';
import { EtaExcelEngine } from '../utils/etaExcelEngine';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { ActionMenu } from './common/ActionMenu';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { PostingEngineService } from '../services/PostingEngineService';
import { DirectWhatsAppProcedureModal } from './common/DirectWhatsAppProcedureModal';

interface InvoicingViewProps {
  state: DatabaseState;
}

export const InvoicingView: React.FC<InvoicingViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'PURCHASE' | 'RECEIPT'>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Modals
  const [isEtaSettingsOpen, setIsEtaSettingsOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [etaSubmissionInvoice, setEtaSubmissionInvoice] = useState<Invoice | null>(null);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);
  const [activeExportDropdownId, setActiveExportDropdownId] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Security Auth for Edit Mode
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Form State
  const [isReceipt, setIsReceipt] = useState(false);
  const [docType, setDocType] = useState<EtaDocumentType>('I');
  const [invoiceType, setInvoiceType] = useState<'SALES' | 'PURCHASE' | 'OFFICE_SERVICE'>('SALES');
  const [receiverType, setReceiverType] = useState<EtaReceiverType>('B');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('2026-03-31');
  const [partnerName, setPartnerName] = useState('');
  const [partnerTaxNo, setPartnerTaxNo] = useState('');
  const [partnerNationalId, setPartnerNationalId] = useState('');
  const [partnerAddress, setPartnerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH' | 'INSTAPAY' | 'CREDIT'>('BANK');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'i1',
      itemType: 'EGS',
      itemCode: 'EG-100200300-SRV001',
      description: 'أتعاب مراجعة واعتماد القوائم المالية السنوية وتقرير مراقب الحسابات 2025',
      unitType: 'JOB',
      quantity: 1,
      unitPrice: 45000,
      discountRate: 0,
      discountAmount: 0,
      vatRate: 14,
      whtRate: 1,
      totalBeforeTax: 45000,
      salesTotal: 45000,
      vatAmount: 6300,
      whtAmount: 450,
      netTotal: 50850,
    },
  ]);
  const [applyWht, setApplyWht] = useState(true); // 1%
  const [autoPostOnIssue, setAutoPostOnIssue] = useState(true); // توليد وترحيل قيد اليومية العامة آلياً فور الإصدار

  // Auto-Save & Draft State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [manualSaveToast, setManualSaveToast] = useState<string | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);
  const isOnline = useNetworkStatus();
  const isInitialDraftLoaded = useRef(false);

  // Load existing invoice draft on mount if available
  useEffect(() => {
    if (isInitialDraftLoaded.current) return;
    isInitialDraftLoaded.current = true;

    const savedDraft = formDraftStorage.getInvoiceDraft();
    if (
      savedDraft &&
      (savedDraft.partnerName?.trim() ||
        savedDraft.partnerTaxNo?.trim() ||
        savedDraft.notes?.trim() ||
        savedDraft.items?.some((it) => it.description?.trim() || (Number(it.unitPrice) || 0) > 0))
    ) {
      setInvoiceType(savedDraft.invoiceType || 'SALES');
      if (typeof savedDraft.isReceipt === 'boolean') setIsReceipt(savedDraft.isReceipt);
      if (savedDraft.docType) setDocType(savedDraft.docType as any);
      if (savedDraft.receiverType) setReceiverType(savedDraft.receiverType as any);
      setDate(savedDraft.date || new Date().toISOString().slice(0, 10));
      setDueDate(savedDraft.dueDate || '2026-03-31');
      setPartnerName(savedDraft.partnerName || '');
      setPartnerTaxNo(savedDraft.partnerTaxNo || '');
      if (savedDraft.partnerNationalId) setPartnerNationalId(savedDraft.partnerNationalId);
      if (savedDraft.partnerAddress) setPartnerAddress(savedDraft.partnerAddress);
      if (savedDraft.paymentMethod) setPaymentMethod(savedDraft.paymentMethod as any);
      if (savedDraft.notes) setNotes(savedDraft.notes);
      if (savedDraft.items && savedDraft.items.length > 0) {
        setItems(savedDraft.items);
      }
      setApplyWht(savedDraft.applyWht ?? true);
      if (typeof savedDraft.autoPostOnIssue === 'boolean') setAutoPostOnIssue(savedDraft.autoPostOnIssue);

      setDraftRestoredNotice(
        `تم استعادة مسودة المستند تلقائياً من الذاكرة المحلية (${savedDraft.meta?.timeFormatted || 'سابقاً'}) لتجنب فقدان العمل في حال انقطاع الاتصال أو تحديث الصفحة.`
      );
      setLastAutoSaveTime(savedDraft.meta?.timeFormatted || null);
    }
  }, []);

  // Synchronous flush on page reload or beforeunload to guarantee zero data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editingInvoiceId) return;
      const hasMeaningfulData =
        Boolean(partnerName.trim()) ||
        Boolean(partnerTaxNo.trim()) ||
        Boolean(notes.trim()) ||
        items.some((it) => it.description.trim() || (Number(it.unitPrice) || 0) > 0);

      if (hasMeaningfulData) {
        formDraftStorage.saveInvoiceDraft({
          invoiceType,
          isReceipt,
          docType,
          receiverType,
          date,
          dueDate,
          partnerName,
          partnerTaxNo,
          partnerNationalId,
          partnerAddress,
          paymentMethod,
          notes,
          items,
          applyWht,
          autoPostOnIssue,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    invoiceType,
    isReceipt,
    docType,
    receiverType,
    date,
    dueDate,
    partnerName,
    partnerTaxNo,
    partnerNationalId,
    partnerAddress,
    paymentMethod,
    notes,
    items,
    applyWht,
    autoPostOnIssue,
    editingInvoiceId,
  ]);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (editingInvoiceId) return; // Do not overwrite draft when editing existing invoice

    const hasMeaningfulData =
      Boolean(partnerName.trim()) ||
      Boolean(partnerTaxNo.trim()) ||
      Boolean(notes.trim()) ||
      items.some((it) => it.description.trim() || (Number(it.unitPrice) || 0) > 0);

    if (!hasMeaningfulData) return;

    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      const meta = formDraftStorage.saveInvoiceDraft({
        invoiceType,
        isReceipt,
        docType,
        receiverType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        partnerNationalId,
        partnerAddress,
        paymentMethod,
        notes,
        items,
        applyWht,
        autoPostOnIssue,
      });
      setLastAutoSaveTime(meta.timeFormatted);
      setIsAutoSaving(false);
    }, 400);

    return () => {
      clearTimeout(timer);
      setIsAutoSaving(false);
    };
  }, [
    invoiceType,
    isReceipt,
    docType,
    receiverType,
    date,
    dueDate,
    partnerName,
    partnerTaxNo,
    partnerNationalId,
    partnerAddress,
    paymentMethod,
    notes,
    items,
    applyWht,
    autoPostOnIssue,
    editingInvoiceId,
  ]);

  // Manual save draft handler
  const handleManualSaveDraft = () => {
    if (editingInvoiceId) return;
    setIsAutoSaving(true);
    const meta = formDraftStorage.saveInvoiceDraft({
      invoiceType,
      isReceipt,
      docType,
      receiverType,
      date,
      dueDate,
      partnerName,
      partnerTaxNo,
      partnerNationalId,
      partnerAddress,
      paymentMethod,
      notes,
      items,
      applyWht,
      autoPostOnIssue,
    });
    setLastAutoSaveTime(meta.timeFormatted);
    setIsAutoSaving(false);
    setManualSaveToast(`تم حفظ مسودة الفاتورة يدوياً في ذاكرة المتصفح (${meta.timeFormatted})`);
    setTimeout(() => setManualSaveToast(null), 3500);
  };

  // Has unsaved draft flag for screen-level recovery banner
  const hasUnsavedDraft = useMemo(() => {
    if (editingInvoiceId) return false;
    const hasData =
      Boolean(partnerName.trim()) ||
      Boolean(partnerTaxNo.trim()) ||
      Boolean(notes.trim()) ||
      items.some((it) => it.description.trim() || (Number(it.unitPrice) || 0) > 0);
    return Boolean(hasData && (lastAutoSaveTime || formDraftStorage.hasInvoiceDraft()));
  }, [editingInvoiceId, partnerName, partnerTaxNo, notes, items, lastAutoSaveTime]);

  const handleClearDraft = () => {
    if (window.confirm('هل تريد مسح مسودة المستند والبدء بنموذج فاتورة فارغ جديد؟')) {
      formDraftStorage.clearInvoiceDraft();
      setInvoiceType('SALES');
      setIsReceipt(false);
      setDocType('I');
      setReceiverType('B');
      setDate(new Date().toISOString().slice(0, 10));
      setDueDate('2026-03-31');
      setPartnerName('');
      setPartnerTaxNo('');
      setPartnerNationalId('');
      setPartnerAddress('');
      setPaymentMethod('BANK');
      setNotes('');
      setItems([
        {
          id: 'i1',
          itemType: 'EGS',
          itemCode: 'EG-100200300-SRV001',
          description: '',
          unitType: 'JOB',
          quantity: 1,
          unitPrice: 0,
          discountRate: 0,
          discountAmount: 0,
          vatRate: 14,
          whtRate: 1,
          totalBeforeTax: 0,
          salesTotal: 0,
          vatAmount: 0,
          whtAmount: 0,
          netTotal: 0,
        },
      ]);
      setApplyWht(true);
      setAutoPostOnIssue(true);
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
      setManualSaveToast(null);
    }
  };

  // Calculations
  const subtotal = items.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);
  const totalDiscount = items.reduce((s, item) => s + (item.discountAmount || 0), 0);
  const totalBeforeTax = subtotal - totalDiscount;
  const totalVat = items.reduce((s, item) => s + item.vatAmount, 0);
  const totalWht = applyWht ? items.reduce((s, item) => s + item.whtAmount, 0) : 0;
  const grandTotal = totalBeforeTax + totalVat - totalWht;

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const discRate = Number(item.discountRate) || 0;
    const sTotal = qty * price;
    const discAmt = (sTotal * discRate) / 100;
    const netBefore = sTotal - discAmt;

    const vRate = Number(item.vatRate) ?? 14;
    const wRate = applyWht ? (Number(item.whtRate) ?? 1) : 0;

    const vat = (netBefore * vRate) / 100;
    const wht = (netBefore * wRate) / 100;

    item.salesTotal = sTotal;
    item.discountAmount = discAmt;
    item.totalBeforeTax = netBefore;
    item.vatAmount = vat;
    item.whtAmount = wht;
    item.netTotal = netBefore + vat - wht;

    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    const count = items.length + 1;
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        itemType: 'EGS',
        itemCode: `EG-100200300-SRV0${count}`,
        description: '',
        unitType: isReceipt ? 'EA' : 'JOB',
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        discountAmount: 0,
        vatRate: 14,
        whtRate: applyWht ? 1 : 0,
        totalBeforeTax: 0,
        salesTotal: 0,
        vatAmount: 0,
        whtAmount: 0,
        netTotal: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleRequestEdit = (inv: Invoice) => {
    setInvoiceToEdit(inv);
    if (!SecurityAuthService.isSecurityAuthEnabled()) {
      // Direct edit without password modal
      setEditingInvoiceId(inv.id);
      setIsReceipt(Boolean(inv.isReceipt));
      setDocType(inv.etaDocumentType || (inv.isReceipt ? 'R' : 'I'));
      setReceiverType(inv.receiverType || 'B');
      setInvoiceType(inv.invoiceType);
      setDate(inv.date);
      setDueDate(inv.dueDate || '');
      setPartnerName(inv.partnerName);
      setPartnerTaxNo(inv.partnerTaxNo || '');
      setPartnerNationalId(inv.partnerNationalId || '');
      setPartnerAddress(inv.partnerAddress || '');
      setPaymentMethod((inv.paymentMethod as any) || 'BANK');
      setNotes(inv.notes || '');
      setItems(inv.items.map((it) => ({ ...it })));
      setApplyWht(inv.totalWht > 0);
      setSelectedInvoice(null);
      setIsNewModalOpen(true);
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (!invoiceToEdit) return;
    setEditingInvoiceId(invoiceToEdit.id);
    setIsReceipt(Boolean(invoiceToEdit.isReceipt));
    setDocType(invoiceToEdit.etaDocumentType || (invoiceToEdit.isReceipt ? 'R' : 'I'));
    setReceiverType(invoiceToEdit.receiverType || 'B');
    setInvoiceType(invoiceToEdit.invoiceType);
    setDate(invoiceToEdit.date);
    setDueDate(invoiceToEdit.dueDate || '');
    setPartnerName(invoiceToEdit.partnerName);
    setPartnerTaxNo(invoiceToEdit.partnerTaxNo || '');
    setPartnerNationalId(invoiceToEdit.partnerNationalId || '');
    setPartnerAddress(invoiceToEdit.partnerAddress || '');
    setPaymentMethod((invoiceToEdit.paymentMethod as any) || 'BANK');
    setNotes(invoiceToEdit.notes || '');
    setItems(invoiceToEdit.items.map((it) => ({ ...it })));
    setApplyWht(invoiceToEdit.totalWht > 0);
    setIsAuthModalOpen(false);
    setSelectedInvoice(null);
    setIsNewModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      alert('يرجى إدخال اسم العميل / المستلم');
      return;
    }

    if (receiverType === 'P' && grandTotal >= 50000 && !partnerNationalId.trim()) {
      alert('تنبيه مصلحة الضرائب: الرقم القومي إلزامي للأفراد عند تجاوز قيمة الفاتورة 50,000 ج.م');
      return;
    }

    const qrPayload = `ETA-EGY|${editingInvoiceId ? invoiceToEdit?.invoiceNumber : 'NEW'}|${date}|${grandTotal.toFixed(2)}|VAT_${totalVat.toFixed(2)}`;

    if (editingInvoiceId) {
      db.updateInvoice(editingInvoiceId, {
        invoiceType,
        isReceipt,
        etaDocumentType: docType,
        receiverType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        partnerNationalId,
        partnerAddress,
        items,
        subtotal,
        totalDiscount,
        totalVat,
        totalWht,
        grandTotal,
        paidAmount: grandTotal,
        paymentMethod,
        notes,
        qrPayload,
      });
      alert('تم تحديث وحفظ بيانات الفاتورة بنجاح.');
    } else {
      const createdInvoice = db.addInvoice({
        invoiceType,
        isReceipt,
        etaDocumentType: docType,
        etaDocumentVersion: '1.0',
        etaStatus: 'NOT_SUBMITTED',
        receiverType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        partnerNationalId,
        partnerAddress,
        items,
        subtotal,
        totalDiscount,
        totalVat,
        totalWht,
        grandTotal,
        paidAmount: grandTotal,
        remainingAmount: 0,
        status: 'ISSUED',
        paymentMethod,
        notes,
        qrPayload,
      });

      // Smart Invoice Flow: توليد قيد اليومية العامة تلقائياً فور إصدار الفاتورة
      let postedJournalSerial = '';
      if (createdInvoice && autoPostOnIssue) {
        const postResult = PostingEngineService.postInvoice(createdInvoice.id);
        if (postResult.success && postResult.journalEntry) {
          postedJournalSerial = postResult.journalEntry.serialNumber;
        }
      }

      // If auto-submit is enabled in ETA Config
      const config = etaService.getConfig();
      if (config.autoSubmitOnIssue && createdInvoice) {
        etaService.submitDocumentToEta(createdInvoice).then((res) => {
          if (res.success) {
            db.updateInvoice(createdInvoice.id, {
              etaStatus: 'VALID',
              etaUuid: res.uuid,
              etaLongId: res.longId,
              etaSubmissionId: res.submissionId,
              etaSubmissionDate: new Date().toISOString(),
              etaPublicUrl: res.publicUrl,
              etaCanonicalHash: res.canonicalHash,
              etaSignatureValue: res.signature,
            });
          }
        });
      }

      // Clear auto-saved draft on success
      formDraftStorage.clearInvoiceDraft();
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);

      if (postedJournalSerial) {
        alert(`✓ تم إصدار المستند بنجاح وتوليد قيد اليومية آلياً برقم [${postedJournalSerial}]`);
      }
    }

    setIsNewModalOpen(false);
    setEditingInvoiceId(null);
    setInvoiceToEdit(null);
  };

  const pendingInvoices = state.invoices.filter((i) => i.etaStatus !== 'VALID');

  const handleBatchSubmit = async () => {
    if (pendingInvoices.length === 0) return;
    setIsBatchSubmitting(true);
    try {
      const res = await etaService.submitBatchToEta(pendingInvoices);
      if (res.results) {
        res.results.forEach((r: any) => {
          if (r.success) {
            db.updateInvoice(r.invoiceId, {
              etaStatus: 'VALID',
              etaUuid: r.uuid,
              etaLongId: r.longId,
              etaSubmissionId: r.submissionId,
              etaSubmissionDate: new Date().toISOString(),
              etaPublicUrl: r.publicUrl,
              etaCanonicalHash: r.canonicalHash,
              etaSignatureValue: r.signature,
            });
          }
        });
      }
      alert(res.message);
    } catch (err: any) {
      alert('حدث خطأ أثناء الإرسال المجمع: ' + (err?.message || ''));
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const handlePostInvoice = (invoiceId: string) => {
    const res = PostingEngineService.postInvoice(invoiceId);
    if (res.success && res.journalEntry) {
      alert(`✓ تم بنجاح ترحيل الفاتورة وتوليد قيد اليومية رقم [${res.journalEntry.serialNumber}] وتحديث ميزان المراجعة والأستاذ العام.`);
    } else {
      alert(res.error || 'تعذر ترحيل الفاتورة.');
    }
  };

  const handleBatchPostInvoices = () => {
    const unposted = state.invoices.filter((inv) => !PostingEngineService.isInvoicePosted(inv.invoiceNumber).isPosted);
    if (unposted.length === 0) {
      alert('كافة الفواتير الحالية مرحلة بالفعل لدفتر اليومية العامة.');
      return;
    }

    if (!confirm(`هل ترغب في ترحيل عدد (${unposted.length}) فاتورة غير مرحلة إلى دفتر اليومية العامة آلياً؟`)) {
      return;
    }

    const res = PostingEngineService.batchPostInvoices(unposted.map((i) => i.id));
    alert(`✓ اكتمل الترحيل الآلي: تم ترحيل (${res.postedCount}) فاتورة بنجاح إلى قيود اليومية العامة وتحديث ميزان المراجعة.`);
  };

  const filteredInvoices = state.invoices.filter((inv) => {
    let matchesType = true;
    if (filterType === 'SALES') {
      matchesType = inv.invoiceType === 'SALES' && !inv.isReceipt;
    } else if (filterType === 'PURCHASE') {
      matchesType = inv.invoiceType === 'PURCHASE';
    } else if (filterType === 'RECEIPT') {
      matchesType = Boolean(inv.isReceipt);
    }

    const q = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.partnerName || '').toLowerCase().includes(q) ||
      (inv.partnerTaxNo && inv.partnerTaxNo.includes(searchTerm)) ||
      (inv.etaUuid && inv.etaUuid.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  // KPI calculations
  const totalSalesRevenue = state.invoices
    .filter((i) => i.invoiceType === 'SALES' || i.isReceipt)
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const totalVatCollected = state.invoices
    .filter((i) => i.invoiceType === 'SALES' || i.isReceipt)
    .reduce((sum, i) => sum + i.totalVat, 0);

  const totalWhtWithheld = state.invoices.reduce((sum, i) => sum + i.totalWht, 0);

  const totalEtaValidCount = state.invoices.filter((i) => i.etaStatus === 'VALID').length;

  return (
    <UnifiedScreenCard
      title="منظومة الفاتورة والإيصال الإلكتروني"
      subtitle="ETA e-Invoicing & Receipts • تكامل مصلحة الضرائب المصرية"
      icon={CreditCard}
      badge="ETA SDK v1.0"
      badgeVariant="emerald"
      primaryAction={{
        id: 'btn-create-invoice',
        label: 'إصدار مستند',
        icon: Plus,
        variant: 'success',
        onClick: () => {
          setEditingInvoiceId(null);
          setIsNewModalOpen(true);
        },
      }}
      actionMenuItems={[
        {
          label: 'إصدار فاتورة / إيصال جديد',
          preset: 'create',
          variant: 'success',
          onClick: () => {
            setEditingInvoiceId(null);
            setIsNewModalOpen(true);
          },
        },
        ...(pendingInvoices.length > 0
          ? [
              {
                label: `إرسال المعلق للضرائب (${pendingInvoices.length})`,
                preset: 'send' as const,
                variant: 'primary' as const,
                onClick: handleBatchSubmit,
              },
            ]
          : []),
        {
          label: 'الترحيل الآلي لقيود اليومية العامة',
          icon: Sparkles,
          variant: 'primary',
          onClick: handleBatchPostInvoices,
        },
        {
          label: '',
          isDivider: true,
          onClick: () => {},
        },
        {
          label: 'إعدادات ربط الضرائب (ETA Config)',
          preset: 'settings',
          onClick: () => setIsEtaSettingsOpen(true),
        },
        {
          label: 'استيراد فواتير من Excel',
          preset: 'import_excel',
          onClick: () => setIsExcelImportOpen(true),
        },
        {
          label: 'تصدير السجل إلى Excel',
          preset: 'export_excel',
          onClick: () => EtaExcelEngine.exportAllInvoicesToExcel(filteredInvoices),
        },
      ]}
      actionsSlot={
        pendingInvoices.length > 0 ? (
          <button
            onClick={handleBatchSubmit}
            disabled={isBatchSubmitting}
            title="إرسال كافة الفواتير والإيصالات المعلقة لمنظومة الضرائب"
            className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {isBatchSubmitting ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            <span>إرسال ({pendingInvoices.length})</span>
          </button>
        ) : null
      }
    >
      <div className="space-y-3.5">
        {/* Draft Recovery Alert Banner when main table is visible */}
        {hasUnsavedDraft && !isNewModalOpen && (
          <DraftRecoveryBanner
            documentType={isReceipt ? 'إيصال إلكتروني (B2C)' : 'فاتورة ضريبية (B2B)'}
            savedAt={lastAutoSaveTime || 'مسودة محفوظة في الذاكرة المحلية'}
            descriptionSummary={
              partnerName
                ? `الطرف المستلم: ${partnerName}${items[0]?.description ? ` • ${items[0].description}` : ''}`
                : items[0]?.description || 'مستند بدون بيان'
            }
            linesCount={items.filter((it) => it.description.trim() || Number(it.unitPrice) > 0).length}
            onResume={() => {
              setEditingInvoiceId(null);
              setIsNewModalOpen(true);
            }}
            onDiscard={handleClearDraft}
          />
        )}

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>إجمالي المبيعات والأتعاب</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold font-mono text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-0.5">
              {formatEgyptianCurrency(totalSalesRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">شامل الضرائب والخصومات</div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px]">
              <span>ضريبة القيمة المضافة 14% (T1)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold font-mono text-sm sm:text-base text-emerald-800 dark:text-emerald-300 mt-0.5">
              +{formatEgyptianCurrency(totalVatCollected)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">محصلة لإقرار نموذج 10</div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <div className="flex items-center justify-between text-red-700 dark:text-red-400 text-[11px]">
              <span>خصم وتحصيل 1% (T4 WHT)</span>
              <Lock className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="font-bold font-mono text-sm sm:text-base text-red-800 dark:text-red-300 mt-0.5">
              -{formatEgyptianCurrency(totalWhtWithheld)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">توريد لنموذج 41 ضرائب</div>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-[11px]">
              <span>المعتمد بـ ETA</span>
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="font-bold font-mono text-sm sm:text-base text-blue-900 dark:text-blue-300 mt-0.5">
              {totalEtaValidCount} من {state.invoices.length} مستند
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">تمت مطابقتها بالختم الإلكتروني</div>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الفاتورة، العميل، الرقم الضريبي، أو UUID..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-end">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              الكل ({state.invoices.length})
            </button>
            <button
              onClick={() => setFilterType('SALES')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'SALES'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
              }`}
            >
              فواتير B2B ({state.invoices.filter((i) => i.invoiceType === 'SALES' && !i.isReceipt).length})
            </button>
            <button
              onClick={() => setFilterType('RECEIPT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'RECEIPT'
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 border border-slate-200 dark:border-slate-700 hover:bg-purple-50'
              }`}
            >
              إيصالات B2C ({state.invoices.filter((i) => i.isReceipt).length})
            </button>
            <button
              onClick={() => setFilterType('PURCHASE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'PURCHASE'
                  ? 'bg-amber-800 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              مشتريات
            </button>

            <button
              onClick={handleBatchPostInvoices}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors cursor-pointer mr-auto shadow-2xs"
              title="ترحيل الفواتير المعتمدة تلقائياً لدفتر اليومية العامة"
            >
              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>ترحيل اليومية</span>
              {(() => {
                const unpostedCount = state.invoices.filter(
                  (inv) => !PostingEngineService.isInvoicePosted(inv.invoiceNumber).isPosted
                ).length;
                if (unpostedCount > 0) {
                  return (
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-mono">
                      {unpostedCount}
                    </span>
                  );
                }
                return null;
              })()}
            </button>
          </div>
        </div>

        {/* Invoices Table - Compact Mode & Zebra Striping */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs accounting-table">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-1.5 px-2.5">رقم المستند</th>
                  <th className="py-1.5 px-2.5">التاريخ</th>
                  <th className="py-1.5 px-2.5">نوع المستند</th>
                  <th className="py-1.5 px-2.5">اسم الطرف (العميل / المشتري)</th>
                  <th className="py-1.5 px-2.5 text-left">قيمة البضاعة</th>
                  <th className="py-1.5 px-2.5 text-left">ض.ق.م 14%</th>
                  <th className="py-1.5 px-2.5 text-left">خصم 1%</th>
                  <th className="py-1.5 px-2.5 text-left">صافي الفاتورة</th>
                  <th className="py-1.5 px-2.5 text-center">حالة ETA</th>
                  <th className="py-1.5 px-2.5 text-center">اليومية</th>
                  <th className="py-1.5 px-2.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv, idx) => {
                  const isValid = inv.etaStatus === 'VALID';
                  const isSubmitted = inv.etaStatus === 'SUBMITTED';

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-900 dark:text-emerald-400">
                        <div>{inv.invoiceNumber}</div>
                        {inv.etaUuid && (
                          <div className="text-[9px] font-mono text-slate-400 truncate max-w-[110px]" title={inv.etaUuid}>
                            UUID: {inv.etaUuid.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-600 dark:text-slate-400">{inv.date}</td>
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            inv.isReceipt
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                              : inv.invoiceType === 'SALES'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {inv.isReceipt ? 'إيصال B2C' : inv.invoiceType === 'SALES' ? 'فاتورة B2B' : 'مشتريات'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        <div>{inv.partnerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {inv.partnerTaxNo ? `ضريبي: ${inv.partnerTaxNo}` : inv.partnerNationalId ? `قومي: ${inv.partnerNationalId}` : 'بدون رقم ضريبي'}
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-left text-slate-700 dark:text-slate-300">{formatEgyptianCurrency(inv.subtotal)}</td>
                      <td className="py-1.5 px-2.5 font-mono text-left text-emerald-700 dark:text-emerald-400">+{formatEgyptianCurrency(inv.totalVat)}</td>
                      <td className="py-1.5 px-2.5 font-mono text-left text-red-700 dark:text-red-400">-{formatEgyptianCurrency(inv.totalWht)}</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-left text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                        {formatEgyptianCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span>معتمدة</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold border border-blue-300 dark:border-blue-800">
                            <Send className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                            <span>مرسلة</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setEtaSubmissionInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800 cursor-pointer transition-colors"
                          >
                            <Send className="w-2.5 h-2.5 text-amber-700" />
                            <span>إرسال ETA</span>
                          </button>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        {(() => {
                          const postInfo = PostingEngineService.isInvoicePosted(inv.invoiceNumber);
                          if (postInfo.isPosted) {
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 font-mono"
                                title={`مرحل بالقيد رقم ${postInfo.serialNumber}`}
                              >
                                <CheckCircle className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                <span>{postInfo.serialNumber}</span>
                              </span>
                            );
                          }
                          return (
                            <button
                              onClick={() => handlePostInvoice(inv.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="توليد وترحيل قيد اليومية العامة آلياً"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-indigo-200" />
                              <span>ترحيل</span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        <ActionMenu
                          title={`إجراءات ${inv.invoiceNumber}`}
                          triggerType="three_dots_vertical"
                          size="xs"
                          menuWidth="w-56"
                          items={[
                            {
                              label: 'معاينة وطباعة الفاتورة',
                              preset: 'print',
                              variant: 'primary',
                              onClick: () => setSelectedInvoice(inv),
                            },
                            {
                              label: 'إرسال إشعار واتساب مباشر',
                              icon: MessageSquare,
                              variant: 'success',
                              onClick: () => setWhatsAppInvoice(inv),
                            },
                            {
                              label: 'إرسال لمصلحة الضرائب (ETA)',
                              preset: 'send',
                              variant: 'secondary',
                              onClick: () => setEtaSubmissionInvoice(inv),
                            },
                            {
                              label: 'تعديل الفاتورة المحمية',
                              preset: 'edit',
                              variant: 'warning',
                              onClick: () => handleRequestEdit(inv),
                            },
                            {
                              label: '',
                              isDivider: true,
                              onClick: () => {},
                            },
                            {
                              label: 'تصدير شيت Excel (.xlsx)',
                              preset: 'export_excel',
                              onClick: () => EtaExcelEngine.exportInvoiceToExcel(inv),
                            },
                            {
                              label: 'تصدير ETA JSON (v1.0)',
                              icon: FileCode,
                              onClick: () => EtaExcelEngine.exportInvoiceToEtaJson(inv),
                            },
                            {
                              label: 'تصدير ETA XML (UBL)',
                              icon: FileText,
                              onClick: () => EtaExcelEngine.exportInvoiceToEtaXml(inv),
                            },
                            ...(inv.isReceipt
                              ? [
                                  {
                                    label: 'تصدير e-Receipt JSON',
                                    icon: Receipt,
                                    onClick: () => EtaExcelEngine.exportReceiptToEtaJson(inv),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice View / Print Modal (Read-Only Data View) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-emerald-800">{selectedInvoice.invoiceNumber}</span>
                <span className="text-slate-500">• {selectedInvoice.date}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>مستند معتمد رسمياً ومحمي</span>
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Read-only notification banner with Edit prompt */}
            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-[11px]">
                  الفاتورة معروضة في <strong>وضع القراءة والطباعة</strong>. لتعديل البنود أو الأسعار يرجى إدخال الرقم السري.
                </span>
              </div>
              <button
                onClick={() => handleRequestEdit(selectedInvoice)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>تعديل الفاتورة</span>
              </button>
            </div>

            <div id="official-invoice-document" className="space-y-4 mt-4">
              <div className="flex justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-slate-400">الطرف المستلم:</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice.partnerName}</div>
                  <div className="text-slate-500 font-mono text-[10px]">
                    {selectedInvoice.partnerTaxNo ? `رقم التسجيل: ${selectedInvoice.partnerTaxNo}` : 'غير مسجل ضريبياً'}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-slate-400">نوع المستند:</div>
                  <div className="font-bold text-emerald-800 mt-0.5">
                    {selectedInvoice.isReceipt ? 'إيصال إلكتروني B2C' : selectedInvoice.invoiceType === 'SALES' ? 'فاتورة مبيعات ضريبية B2B' : 'فاتورة مشتريات'}
                  </div>
                  {selectedInvoice.etaUuid && (
                    <div className="text-[9px] font-mono text-emerald-700 mt-0.5">
                      ETA: {selectedInvoice.etaUuid.slice(0, 16)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">البيان / الصنف</th>
                      <th className="p-2.5">الكود</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-left">سعر الوحدة</th>
                      <th className="p-2.5 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-sans font-medium text-slate-800">{it.description}</td>
                        <td className="p-2.5 text-[10px] text-slate-500">{it.itemCode}</td>
                        <td className="p-2.5 text-center">{it.quantity}</td>
                        <td className="p-2.5 text-left">{formatEgyptianCurrency(it.unitPrice)}</td>
                        <td className="p-2.5 text-left font-bold">{formatEgyptianCurrency(it.totalBeforeTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Totals Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 font-bold">
                <div className="flex justify-between text-slate-600 font-normal">
                  <span>إجمالي القيمة قبل الضريبة:</span>
                  <span className="font-mono">{formatEgyptianCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-slate-600 font-normal">
                    <span>إجمالي الخصم التجاري:</span>
                    <span className="font-mono">-{formatEgyptianCurrency(selectedInvoice.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-800">
                  <span>ضريبة القيمة المضافة 14% (T1):</span>
                  <span className="font-mono">+{formatEgyptianCurrency(selectedInvoice.totalVat)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>ضريبة الخصم والتحصيل 1% أ.ت.ص (T4):</span>
                  <span className="font-mono">-{formatEgyptianCurrency(selectedInvoice.totalWht)}</span>
                </div>
                <div className="flex justify-between text-slate-900 text-sm pt-2 border-t border-slate-200 font-black">
                  <span>صافي القيمة الإجمالية المستحقة:</span>
                  <span className="font-mono text-emerald-900">{formatEgyptianCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>

              {/* QR and Tafqeet */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="space-y-1">
                  <div className="font-bold text-emerald-950">التفقيط المالي القانوني:</div>
                  <div className="text-[11px] text-slate-700 font-medium">{numberToArabicWords(selectedInvoice.grandTotal)}</div>
                  {selectedInvoice.etaStatus === 'VALID' && (
                    <div className="text-[10px] text-emerald-800 font-bold">
                      ✓ مستند معتمد ومطابق لمنظومة الفاتورة الإلكترونية بمصلحة الضرائب المصرية
                    </div>
                  )}
                </div>
                <div
                  data-qr-container="true"
                  className="qr-print-container bg-white p-1 rounded-lg border border-slate-200"
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(selectedInvoice.qrPayload || `INV|${selectedInvoice.invoiceNumber}|${selectedInvoice.date}|${selectedInvoice.grandTotal}`, 100),
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 no-print">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRequestEdit(selectedInvoice)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل الفاتورة</span>
                </button>
                <button
                  onClick={() => setEtaSubmissionInvoice(selectedInvoice)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  <span>منظومة الضرائب ETA</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const styleId = 'invoice-direct-print-style';
                    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
                    if (!styleEl) {
                      styleEl = document.createElement('style');
                      styleEl.id = styleId;
                      document.head.appendChild(styleEl);
                    }
                    styleEl.innerHTML = `
                      @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                      }
                      @media print {
                        body * {
                          visibility: hidden !important;
                        }
                        #official-invoice-document, #official-invoice-document * {
                          visibility: visible !important;
                        }
                        #official-invoice-document {
                          position: absolute !important;
                          left: 0 !important;
                          top: 0 !important;
                          width: 100% !important;
                          margin: 0 !important;
                          padding: 20px !important;
                          background: white !important;
                          box-shadow: none !important;
                          border: none !important;
                        }
                      }
                    `;
                    setTimeout(() => {
                      window.print();
                    }, 120);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة رسمية</span>
                </button>
                <button
                  onClick={() => setWhatsAppInvoice(selectedInvoice)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="إرسال الفاتورة عبر كود الواتساب المباشر"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-200" />
                  <span>إرسال واتساب مباشر</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Invoice Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CreditCard className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingInvoiceId
                      ? 'تعديل الفاتورة (وضع التعديل المصرح به)'
                      : isReceipt
                      ? 'إصدار إيصال إلكتروني جديد (B2C)'
                      : 'إصدار فاتورة ضريبية جديدة (B2B)'}
                  </h3>
                  <div className="mt-1">
                    {!editingInvoiceId ? (
                      <AutoSaveStatusBadge
                        lastSavedTime={lastAutoSaveTime}
                        isSaving={isAutoSaving}
                        isOffline={!isOnline}
                        onManualSave={handleManualSaveDraft}
                        onClearDraft={handleClearDraft}
                        documentLabel={isReceipt ? 'الإيصال' : 'الفاتورة'}
                      />
                    ) : (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-700" />
                        <span>تعديل مستند ضريبي معتمد</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingInvoiceId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer self-end sm:self-center p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Restored Draft Alert Banner */}
            {!editingInvoiceId && draftRestoredNotice && (
              <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200 text-blue-900 rounded-2xl flex items-center justify-between gap-3 text-xs">
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
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
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

            {editingInvoiceId && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>تم إثبات صلاحية التعديل بنجاح بالرقم السري المصرح به. يمكنك الآن تعديل البنود والحفظ.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Document Type Selector */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="docMode"
                    checked={!isReceipt}
                    onChange={() => {
                      setIsReceipt(false);
                      setDocType('I');
                      setReceiverType('B');
                    }}
                    className="text-emerald-600"
                  />
                  <span>فاتورة ضريبية إلكترونية (B2B Tax Invoice)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="docMode"
                    checked={isReceipt}
                    onChange={() => {
                      setIsReceipt(true);
                      setDocType('R');
                      setReceiverType('P');
                    }}
                    className="text-purple-600"
                  />
                  <span>إيصال إلكتروني (B2C e-Receipt)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع المستند الضريبي</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900"
                  >
                    <option value="I">I - فاتورة أصلية (Invoice)</option>
                    <option value="C">C - إشعار دائن (Credit Note)</option>
                    <option value="D">D - إشعار مدين (Debit Note)</option>
                    <option value="R">R - إيصال إلكتروني (Receipt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الفاتورة *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Receiver Information */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>بيانات العميل والمستلم:</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="receiverType"
                        value="B"
                        checked={receiverType === 'B'}
                        onChange={() => setReceiverType('B')}
                      />
                      <span>شركة / منشأة (B)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="receiverType"
                        value="P"
                        checked={receiverType === 'P'}
                        onChange={() => setReceiverType('P')}
                      />
                      <span>شخص طبيعي (P)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">اسم العميل / الشركة *</label>
                    <input
                      type="text"
                      required
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="مثال: شركة المقاولون العرب"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  {receiverType === 'B' ? (
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">الرقم الضريبي للعميل (9 أرقام)</label>
                      <input
                        type="text"
                        value={partnerTaxNo}
                        onChange={(e) => setPartnerTaxNo(e.target.value)}
                        placeholder="390-182-441"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">الرقم القومي (14 رقماً للقيم &gt; 50 ألف)</label>
                      <input
                        type="text"
                        value={partnerNationalId}
                        onChange={(e) => setPartnerNationalId(e.target.value)}
                        placeholder="29001010100000"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">عنوان العميل</label>
                    <input
                      type="text"
                      value={partnerAddress}
                      onChange={(e) => setPartnerAddress(e.target.value)}
                      placeholder="مدينة نصر - القاهرة"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">طريقة السداد</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="BANK">تحويل بنكي (Bank Transfer)</option>
                      <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                      <option value="CASH">نقداً من الخزينة (Cash)</option>
                      <option value="CREDIT">آجل (Credit)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span>بنود وأصناف الفاتورة:</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (تدعم تكويد EGS و GS1 وضريبة 14% وخصم 1%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-emerald-700 hover:text-emerald-800 text-xs flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="بيان الصنف أو الخدمة المقدمة"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="كود الصنف EGS / GS1"
                          value={item.itemCode}
                          onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={item.itemType || 'EGS'}
                          onChange={(e) => handleItemChange(idx, 'itemType', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="EGS">EGS (مصري)</option>
                          <option value="GS1">GS1 (دولي)</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-slate-700">
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">الكمية:</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="الكمية"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">سعر الوحدة (ج.م):</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="السعر"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">الخصم %:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="خصم %"
                          value={item.discountRate || 0}
                          onChange={(e) => handleItemChange(idx, 'discountRate', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-3 text-left">
                        <label className="text-[10px] text-slate-400 block mb-0.5">صافي البند:</label>
                        <div className="font-mono font-bold text-slate-900 text-xs pt-1">
                          {formatEgyptianCurrency(item.netTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Calculation Footer */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyWht}
                        onChange={(e) => setApplyWht(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>تطبيق خصم وتحصيل 1% أ.ت.ص</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoPostOnIssue}
                        onChange={(e) => setAutoPostOnIssue(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>توليد قيد يومية تلقائي فور الإصدار</span>
                    </label>
                  </div>
                  <div className="text-slate-900 font-mono text-sm">
                    صافي الفاتورة الإجمالي:{' '}
                    <strong className="text-emerald-900">{formatEgyptianCurrency(grandTotal)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {!editingInvoiceId && (lastAutoSaveTime || partnerName || items.some((i) => i.description)) && (
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="مسح المسودة والبدء بنموذج فارغ"
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
                      setIsNewModalOpen(false);
                      setEditingInvoiceId(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{editingInvoiceId ? 'حفظ التعديلات على الفاتورة' : 'حفظ وإصدار الفاتورة'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ETA Settings Modal */}
      <EtaSettingsModal isOpen={isEtaSettingsOpen} onClose={() => setIsEtaSettingsOpen(false)} />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImportComplete={(count) => {
          // Trigger any refresh needed
        }}
      />

      {/* ETA Submission & Live Signing Modal */}
      <EtaSubmissionModal
        isOpen={Boolean(etaSubmissionInvoice)}
        invoice={etaSubmissionInvoice}
        onClose={() => setEtaSubmissionInvoice(null)}
        onSubmissionSuccess={() => {
          // Refreshed via localDatabase notify
        }}
      />

      {/* Security Auth Modal for Edit Action (Password: Mg120) */}
      <SecurityAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setInvoiceToEdit(null);
        }}
        onSuccess={handleAuthSuccess}
        title="التحقق الأمني لتعديل الفاتورة"
        description={`يرجى إدخال الرقم السري لتعديل الفاتورة رقم [${invoiceToEdit?.invoiceNumber || ''}]`}
        actionType="EDIT_RECORD"
      />

      {/* Direct In-App WhatsApp Procedure Modal */}
      {whatsAppInvoice && (
        <DirectWhatsAppProcedureModal
          isOpen={Boolean(whatsAppInvoice)}
          onClose={() => setWhatsAppInvoice(null)}
          initialContext={{
            procedureType: whatsAppInvoice.isReceipt ? 'TREASURY_RECEIPT' : 'INVOICE_CLAIM',
            title: whatsAppInvoice.isReceipt ? 'إيصال استلام نقدية' : `فاتورة إلكترونية #${whatsAppInvoice.invoiceNumber}`,
            clientName: whatsAppInvoice.receiverName,
            referenceCode: whatsAppInvoice.invoiceNumber,
            amount: whatsAppInvoice.totalAmount,
            periodOrDate: whatsAppInvoice.dateTimeIssued?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            customNotes: whatsAppInvoice.items?.map((it) => `${it.description} (${formatEgyptianCurrency(it.total)})`).join('، '),
          }}
          state={state}
        />
      )}
    </UnifiedScreenCard>
  );
};

export default InvoicingView;

