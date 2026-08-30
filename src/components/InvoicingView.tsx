import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Invoice, InvoiceItem, EtaReceiverType, EtaDocumentType } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { SecurityAuthModal } from './SecurityAuthModal';
import { SecurityAuthService } from '../services/securityAuth';
import { formDraftStorage } from '../utils/formDrafts';
import { EtaSettingsModal } from './EtaSettingsModal';
import { ExcelImportModal } from './ExcelImportModal';
import { EtaSubmissionModal } from './EtaSubmissionModal';
import { etaService } from '../utils/etaSdkEngine';
import { EtaExcelEngine } from '../utils/etaExcelEngine';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';

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

  // Auto-Save & Draft State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);
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
        savedDraft.items?.some((it) => it.description?.trim() || it.unitPrice > 0))
    ) {
      setInvoiceType(savedDraft.invoiceType || 'SALES');
      setDate(savedDraft.date || new Date().toISOString().slice(0, 10));
      setDueDate(savedDraft.dueDate || '2026-03-31');
      setPartnerName(savedDraft.partnerName || '');
      setPartnerTaxNo(savedDraft.partnerTaxNo || '');
      if (savedDraft.items && savedDraft.items.length > 0) {
        setItems(savedDraft.items);
      }
      setApplyWht(savedDraft.applyWht ?? true);

      setDraftRestoredNotice(
        `تم استعادة مسودة الفاتورة تلقائياً (${savedDraft.meta?.timeFormatted || 'سابقاً'}) لحماية البيانات من الإغلاق غير المتوقع.`
      );
      setLastAutoSaveTime(savedDraft.meta?.timeFormatted || null);
    }
  }, []);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (editingInvoiceId) return; // Do not overwrite draft when editing existing invoice

    const hasMeaningfulData =
      Boolean(partnerName.trim()) ||
      Boolean(partnerTaxNo.trim()) ||
      items.some((it) => it.description.trim() || it.unitPrice > 0);

    if (!hasMeaningfulData) return;

    const timer = setTimeout(() => {
      const meta = formDraftStorage.saveInvoiceDraft({
        invoiceType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        items,
        applyWht,
      });
      setLastAutoSaveTime(meta.timeFormatted);
    }, 400);

    return () => clearTimeout(timer);
  }, [invoiceType, date, dueDate, partnerName, partnerTaxNo, items, applyWht, editingInvoiceId]);

  const handleClearDraft = () => {
    if (window.confirm('هل تريد مسح مسودة الفاتورة والبدء بنموذج فاتورة فارغ؟')) {
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
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
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

  const filteredInvoices = state.invoices.filter((inv) => {
    let matchesType = true;
    if (filterType === 'SALES') {
      matchesType = inv.invoiceType === 'SALES' && !inv.isReceipt;
    } else if (filterType === 'PURCHASE') {
      matchesType = inv.invoiceType === 'PURCHASE';
    } else if (filterType === 'RECEIPT') {
      matchesType = Boolean(inv.isReceipt);
    }

    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.partnerTaxNo && inv.partnerTaxNo.includes(searchTerm)) ||
      (inv.etaUuid && inv.etaUuid.toLowerCase().includes(searchTerm.toLowerCase()));
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
    <div className="space-y-5">
      {/* Header & Integration Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  منظومة الفاتورة والإيصال الإلكتروني (ETA e-Invoicing & Receipts)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  ETA SDK v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تكامل مباشر مع مصلحة الضرائب المصرية • التوقيع الرقمي CAdES-BES • الاستيراد والتصدير بالإكسل وجميع الصيغ المعتمدة.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {pendingInvoices.length > 0 && (
            <button
              onClick={handleBatchSubmit}
              disabled={isBatchSubmitting}
              title="إرسال كافة الفواتير والإيصالات المعلقة لمنظومة الضرائب دفعة واحدة"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs animate-pulse"
            >
              {isBatchSubmitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>إرسال المعلق للضرائب ({pendingInvoices.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsEtaSettingsOpen(true)}
            title="إعدادات مفاتيح الربط مع مصلحة الضرائب (Client ID / Secret / Token PIN)"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>إعدادات الربط (ETA)</span>
          </button>

          <ScreenActionToolbar
            modelType="INVOICES"
            title="سجل الفواتير والإيصالات الإلكترونية"
            count={filteredInvoices.length}
          />

          <button
            onClick={() => {
              setEditingInvoiceId(null);
              setIsNewModalOpen(true);
            }}
            id="btn-create-invoice"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة / إيصال جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>إجمالي المبيعات والأتعاب</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold font-mono text-base text-slate-900 mt-1">
            {formatEgyptianCurrency(totalSalesRevenue)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">شامل الضرائب والخصومات</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-[11px]">
            <span>ضريبة القيمة المضافة 14% (T1)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold font-mono text-base text-emerald-800 mt-1">
            +{formatEgyptianCurrency(totalVatCollected)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">محصلة لإقرار نموذج 10</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-red-700 text-[11px]">
            <span>خصم وتحصيل 1% (T4 WHT)</span>
            <Lock className="w-4 h-4 text-red-600" />
          </div>
          <div className="font-bold font-mono text-base text-red-800 mt-1">
            -{formatEgyptianCurrency(totalWhtWithheld)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">توريد لنموذج 41 ضرائب</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 text-[11px]">
            <span>الفواتير المعتمدة بـ ETA</span>
            <FileCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold font-mono text-base text-blue-900 mt-1">
            {totalEtaValidCount} من {state.invoices.length} مستند
          </div>
          <div className="text-[10px] text-slate-400 mt-1">تمت مطابقتها بالختم الإلكتروني</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الفاتورة، اسم العميل، الرقم الضريبي، أو ETA UUID..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع المستندات ({state.invoices.length})
          </button>
          <button
            onClick={() => setFilterType('SALES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'SALES'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            فواتير B2B ({state.invoices.filter((i) => i.invoiceType === 'SALES' && !i.isReceipt).length})
          </button>
          <button
            onClick={() => setFilterType('RECEIPT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'RECEIPT'
                ? 'bg-purple-800 text-white'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            إيصالات B2C ({state.invoices.filter((i) => i.isReceipt).length})
          </button>
          <button
            onClick={() => setFilterType('PURCHASE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'PURCHASE' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            فواتير المشتريات
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3.5 px-4">رقم المستند</th>
                <th className="py-3.5 px-4">التاريخ</th>
                <th className="py-3.5 px-4">نوع المستند</th>
                <th className="py-3.5 px-4">اسم الطرف (العميل / المشتري)</th>
                <th className="py-3.5 px-4 text-left">قيمة البضاعة</th>
                <th className="py-3.5 px-4 text-left">ض.ق.م 14%</th>
                <th className="py-3.5 px-4 text-left">خصم 1%</th>
                <th className="py-3.5 px-4 text-left">صافي الفاتورة</th>
                <th className="py-3.5 px-4 text-center">حالة الضرائب ETA</th>
                <th className="py-3.5 px-4 text-center">الإجراءات والتصدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const isValid = inv.etaStatus === 'VALID';
                const isSubmitted = inv.etaStatus === 'SUBMITTED';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-900">
                      <div>{inv.invoiceNumber}</div>
                      {inv.etaUuid && (
                        <div className="text-[9px] font-mono text-slate-400 truncate max-w-[110px]" title={inv.etaUuid}>
                          UUID: {inv.etaUuid.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{inv.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.isReceipt
                            ? 'bg-purple-100 text-purple-800'
                            : inv.invoiceType === 'SALES'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.isReceipt ? 'إيصال إلكتروني B2C' : inv.invoiceType === 'SALES' ? 'فاتورة ضريبية B2B' : 'فاتورة شراء'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{inv.partnerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.partnerTaxNo ? `ضريبي: ${inv.partnerTaxNo}` : inv.partnerNationalId ? `قومي: ${inv.partnerNationalId}` : 'بدون رقم ضريبي'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-left text-slate-700">{formatEgyptianCurrency(inv.subtotal)}</td>
                    <td className="py-3 px-4 font-mono text-left text-emerald-700">+{formatEgyptianCurrency(inv.totalVat)}</td>
                    <td className="py-3 px-4 font-mono text-left text-red-700">-{formatEgyptianCurrency(inv.totalWht)}</td>
                    <td className="py-3 px-4 font-mono font-black text-left text-slate-900 text-sm">
                      {formatEgyptianCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isValid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>معتمدة (Valid)</span>
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                          <Send className="w-3 h-3 text-blue-600" />
                          <span>مرسلة (Submitted)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setEtaSubmissionInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 cursor-pointer transition-colors"
                        >
                          <Send className="w-2.5 h-2.5 text-amber-700" />
                          <span>إرسال لـ ETA</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title="عرض بيانات الفاتورة والطباعة المعتمدة"
                          className="flex items-center gap-1 px-2 py-1 text-slate-700 hover:text-emerald-800 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>عرض</span>
                        </button>

                        <button
                          onClick={() => setEtaSubmissionInvoice(inv)}
                          title="إرسال ومعاينة تشفير مصلحة الضرائب المصرية"
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors cursor-pointer text-[11px] font-bold"
                        >
                          <Send className="w-3 h-3 text-emerald-700" />
                          <span>ETA</span>
                        </button>

                        {/* Multi-Format Export dropdown */}
                        <div className="relative inline-block text-right">
                          <button
                            onClick={() =>
                              setActiveExportDropdownId(activeExportDropdownId === inv.id ? null : inv.id)
                            }
                            className="flex items-center gap-1 px-2 py-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 text-[11px] cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                          </button>

                          {activeExportDropdownId === inv.id && (
                            <div className="absolute left-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-right text-[11px]">
                              <button
                                onClick={() => {
                                  EtaExcelEngine.exportInvoiceToEtaJson(inv);
                                  setActiveExportDropdownId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                              >
                                <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                                <span>تصدير ETA JSON (v1.0)</span>
                              </button>
                              <button
                                onClick={() => {
                                  EtaExcelEngine.exportInvoiceToEtaXml(inv);
                                  setActiveExportDropdownId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-700" />
                                <span>تصدير ETA XML (UBL)</span>
                              </button>
                              <button
                                onClick={() => {
                                  EtaExcelEngine.exportInvoiceToExcel(inv);
                                  setActiveExportDropdownId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                                <span>تصدير شيت Excel (.xlsx)</span>
                              </button>
                              {inv.isReceipt && (
                                <button
                                  onClick={() => {
                                    EtaExcelEngine.exportReceiptToEtaJson(inv);
                                    setActiveExportDropdownId(null);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-purple-50 flex items-center gap-2 text-purple-900 cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-purple-700" />
                                  <span>تصدير e-Receipt JSON</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRequestEdit(inv)}
                          title="تعديل الفاتورة (يتطلب الرقم السري Mg120)"
                          className="flex items-center gap-1 px-2 py-1 text-amber-800 hover:text-amber-900 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer text-[11px] font-bold"
                        >
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>تعديل</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <span>تعديل (Mg120)</span>
              </button>
            </div>

            <div className="space-y-4 mt-4">
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
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(selectedInvoice.qrPayload || 'VALID_INVOICE', 75),
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
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
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة رسمية</span>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingInvoiceId
                    ? 'تعديل الفاتورة (وضع التعديل المصرح به)'
                    : isReceipt
                    ? 'إصدار إيصال إلكتروني جديد (B2C)'
                    : 'إصدار فاتورة ضريبية جديدة (B2B)'}
                </h3>
                {!editingInvoiceId && lastAutoSaveTime && (
                  <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Save className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span>حفظ تلقائي للمسودة: {lastAutoSaveTime}</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingInvoiceId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
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

            {editingInvoiceId && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>تم إثبات صلاحية التعديل بنجاح بالرقم السري (Mg120). يمكنك الآن تعديل البنود والحفظ.</span>
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
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyWht}
                      onChange={(e) => setApplyWht(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>تطبيق خصم وتحصيل 1% أ.ت.ص (مصلحة الضرائب المصرية)</span>
                  </label>
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
    </div>
  );
};
