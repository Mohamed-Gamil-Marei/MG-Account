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
} from 'lucide-react';
import { Invoice, InvoiceItem } from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { SecurityAuthModal } from './SecurityAuthModal';
import { formDraftStorage } from '../utils/formDrafts';

interface InvoicingViewProps {
  state: DatabaseState;
}

export const InvoicingView: React.FC<InvoicingViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Security Auth for Edit Mode
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Form State
  const [invoiceType, setInvoiceType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('2026-03-31');
  const [partnerName, setPartnerName] = useState('');
  const [partnerTaxNo, setPartnerTaxNo] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'i1',
      itemCode: 'ITM-01',
      description: 'توريد وتركيب لوحات كهروميكانيكية معتمدة',
      quantity: 2,
      unitPrice: 45000,
      discountRate: 0,
      vatRate: 14,
      whtRate: 1,
      totalBeforeTax: 90000,
      vatAmount: 12600,
      whtAmount: 900,
      netTotal: 101700,
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
      setDate(new Date().toISOString().slice(0, 10));
      setDueDate('2026-03-31');
      setPartnerName('');
      setPartnerTaxNo('');
      setItems([
        {
          id: 'i1',
          itemCode: 'ITM-01',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discountRate: 0,
          vatRate: 14,
          whtRate: 1,
          totalBeforeTax: 0,
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

  const subtotal = items.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);
  const totalVat = subtotal * 0.14; // 14% Egyptian VAT
  const totalWht = applyWht ? subtotal * 0.01 : 0; // 1%
  const grandTotal = subtotal + totalVat - totalWht;

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const totalBefore = qty * price;
      const vat = totalBefore * 0.14;
      const wht = applyWht ? totalBefore * 0.01 : 0;
      item.totalBeforeTax = totalBefore;
      item.vatAmount = vat;
      item.whtAmount = wht;
      item.netTotal = totalBefore + vat - wht;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    const count = items.length + 1;
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        itemCode: `ITM-0${count}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        vatRate: 14,
        whtRate: applyWht ? 1 : 0,
        totalBeforeTax: 0,
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
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (!invoiceToEdit) return;
    setEditingInvoiceId(invoiceToEdit.id);
    setInvoiceType(invoiceToEdit.invoiceType);
    setDate(invoiceToEdit.date);
    setDueDate(invoiceToEdit.dueDate || '');
    setPartnerName(invoiceToEdit.partnerName);
    setPartnerTaxNo(invoiceToEdit.partnerTaxNo || '');
    setItems(invoiceToEdit.items.map((it) => ({ ...it })));
    setApplyWht(invoiceToEdit.totalWht > 0);
    setIsAuthModalOpen(false);
    setSelectedInvoice(null);
    setIsNewModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName) {
      alert('يرجى كتابة اسم الطرف (العميل أو المورد)');
      return;
    }

    if (editingInvoiceId) {
      db.updateInvoice(editingInvoiceId, {
        invoiceType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        items,
        subtotal,
        totalVat,
        totalWht,
        grandTotal,
        paidAmount: grandTotal,
        qrPayload: `INV|${partnerName}|${grandTotal}|${date}`,
      });
      alert('تم حفظ وتحديث بيانات الفاتورة بنجاح بعد التحقق من الرقم السري (Mg120).');
    } else {
      db.addInvoice({
        invoiceType,
        date,
        dueDate,
        partnerName,
        partnerTaxNo,
        items,
        subtotal,
        totalDiscount: 0,
        totalVat,
        totalWht,
        grandTotal,
        paidAmount: grandTotal,
        remainingAmount: 0,
        status: 'PAID',
        paymentMethod: 'CASH',
        qrPayload: `INV|${partnerName}|${grandTotal}|${date}`,
      });
      // Clear auto-saved draft on success
      formDraftStorage.clearInvoiceDraft();
      setLastAutoSaveTime(null);
      setDraftRestoredNotice(null);
    }

    setIsNewModalOpen(false);
    setEditingInvoiceId(null);
    setInvoiceToEdit(null);
  };

  const filteredInvoices = state.invoices.filter((inv) => {
    const matchesType = filterType === 'ALL' || inv.invoiceType === filterType;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              إدارة الفواتير والمبيعات والمشتريات (Invoicing & Billing)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إصدار ومتابعة فواتير المبيعات والمشتريات مع احتساب ضريبة القيمة المضافة 14% وخصم 1% أ.ت.ص ورموز الاستجابة السريعة QR.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => db.exportTableToExcel('INVOICES')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            id="btn-create-invoice"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة جديدة</span>
          </button>
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
            placeholder="بحث برقم الفاتورة أو اسم العميل / المورد..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            جميع الفواتير ({state.invoices.length})
          </button>
          <button
            onClick={() => setFilterType('SALES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterType === 'SALES' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            فواتير المبيعات
          </button>
          <button
            onClick={() => setFilterType('PURCHASE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              filterType === 'PURCHASE' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-700'
            }`}
          >
            فواتير المشتريات
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">اسم الطرف (العميل / المورد)</th>
                <th className="py-3 px-4 text-left">قيمة البضاعة</th>
                <th className="py-3 px-4 text-left">ض.ق.م 14%</th>
                <th className="py-3 px-4 text-left">خصم 1%</th>
                <th className="py-3 px-4 text-left">صافي الفاتورة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-800">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{inv.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.invoiceType === 'SALES' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.invoiceType === 'SALES' ? 'فاتورة بيع' : 'فاتورة شراء'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{inv.partnerName}</td>
                  <td className="py-3 px-4 font-mono text-left text-slate-700">{formatEgyptianCurrency(inv.subtotal)}</td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">+{formatEgyptianCurrency(inv.totalVat)}</td>
                  <td className="py-3 px-4 font-mono text-left text-red-700">-{formatEgyptianCurrency(inv.totalWht)}</td>
                  <td className="py-3 px-4 font-mono font-black text-left text-slate-900 text-sm">
                    {formatEgyptianCurrency(inv.grandTotal)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        title="عرض بيانات الفاتورة (للقراءة والطباعة)"
                        className="flex items-center gap-1 px-2 py-1 text-slate-700 hover:text-emerald-800 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>عرض</span>
                      </button>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice View / Print Modal (Read-Only Data View) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-emerald-800">{selectedInvoice.invoiceNumber}</span>
                <span className="text-slate-500">• {selectedInvoice.date}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <Eye className="w-3 h-3" />
                  <span>نظام عرض بيانات الفاتورة (محمي)</span>
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
            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-[11px]">
                  الفاتورة معروضة في <strong>وضع القراءة والحماية</strong>. لتعديل البنود أو الأسعار يرجى إدخال الرقم السري.
                </span>
              </div>
              <button
                onClick={() => handleRequestEdit(selectedInvoice)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>تعديل الفاتورة (Mg120)</span>
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400">الطرف المعني:</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice.partnerName}</div>
                  <div className="text-slate-500 font-mono text-[10px]">{selectedInvoice.partnerTaxNo || 'بدون رقم ضريبي'}</div>
                </div>
                <div className="text-left">
                  <div className="text-slate-400">نوع الفاتورة:</div>
                  <div className="font-bold text-emerald-800 mt-0.5">
                    {selectedInvoice.invoiceType === 'SALES' ? 'فاتورة مبيعات ضريبية' : 'فاتورة مشتريات'}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">البيان / الصنف</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-left">سعر الوحدة</th>
                      <th className="p-2.5 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-sans font-medium text-slate-800">{it.description}</td>
                        <td className="p-2.5 text-center">{it.quantity}</td>
                        <td className="p-2.5 text-left">{formatEgyptianCurrency(it.unitPrice)}</td>
                        <td className="p-2.5 text-left font-bold">{formatEgyptianCurrency(it.totalBeforeTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Totals Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-bold">
                <div className="flex justify-between text-slate-600 font-normal">
                  <span>إجمالي القيمة قبل الضريبة:</span>
                  <span className="font-mono">{formatEgyptianCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>ضريبة القيمة المضافة 14%:</span>
                  <span className="font-mono">+{formatEgyptianCurrency(selectedInvoice.totalVat)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>ضريبة الخصم والتحصيل 1% أ.ت.ص:</span>
                  <span className="font-mono">-{formatEgyptianCurrency(selectedInvoice.totalWht)}</span>
                </div>
                <div className="flex justify-between text-slate-900 text-sm pt-2 border-t border-slate-200 font-black">
                  <span>صافي القيمة الإجمالية المستحقة:</span>
                  <span className="font-mono text-emerald-900">{formatEgyptianCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>

              {/* QR and Tafqeet */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="space-y-1">
                  <div className="font-bold text-emerald-950">التفقيط المالي:</div>
                  <div className="text-[11px] text-slate-700 font-medium">{numberToArabicWords(selectedInvoice.grandTotal)}</div>
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(selectedInvoice.qrPayload || 'VALID_INVOICE', 70),
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={() => handleRequestEdit(selectedInvoice)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit2 className="w-4 h-4" />
                <span>تعديل الفاتورة (Mg120)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingInvoiceId ? 'تعديل الفاتورة (وضع التعديل المصرح به)' : 'إصدار فاتورة جديدة'}
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

            {editingInvoiceId && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>تم إثبات صلاحية التعديل بنجاح بالرقم السري (Mg120). يمكنك الآن تعديل البنود والحفظ.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الفاتورة</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900"
                  >
                    <option value="SALES">فاتورة بيع ومخرجات</option>
                    <option value="PURCHASE">فاتورة شراء ومدخلات</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الطرف (العميل / المورد) *</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="مثال: شركة المقاولون العرب"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم التسجيل الضريبي للطرف</label>
                  <input
                    type="text"
                    value={partnerTaxNo}
                    onChange={(e) => setPartnerTaxNo(e.target.value)}
                    placeholder="مثال: 200-149-831"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>بنود وأصناف الفاتورة:</span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-emerald-700 hover:text-emerald-800 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg">
                    <div className="col-span-6">
                      <input
                        type="text"
                        required
                        placeholder="بيان الصنف أو الخدمة"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="كمية"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="سعر الوحدة"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Calculation Footer */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyWht}
                      onChange={(e) => setApplyWht(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>خصم 1% أ.ت.ص (مصلحة الضرائب المصرية)</span>
                  </label>
                  <div className="text-slate-900 font-mono">
                    الصافي: {formatEgyptianCurrency(grandTotal)}
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
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
