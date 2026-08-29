import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import {
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  ArrowRightLeft,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface EtaReconciliationProps {
  state: DatabaseState;
}

interface EtaInvoiceRecord {
  id: string;
  uuid: string;
  internalCode: string;
  type: 'ISSUED' | 'RECEIVED'; // مبيعات (مصدرة) / مشتريات (مستلمة)
  counterpartyName: string;
  counterpartyTaxId: string;
  issueDate: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  etaStatus: 'Valid' | 'Cancelled' | 'Rejected' | 'Submitted';
  bookStatus: 'RECORDED' | 'UNRECORDED' | 'AMOUNT_MISMATCH';
  bookAmount?: number;
  itemCodeType: 'GS1' | 'EGS';
}

export const EtaReconciliationView: React.FC<EtaReconciliationProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'RECEIVED' | 'ISSUED' | 'DISCREPANCIES'>('DISCREPANCIES');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-Q4');

  // Sample ETA Portal Records
  const [etaRecords, setEtaRecords] = useState<EtaInvoiceRecord[]>([
    {
      id: 'eta-1',
      uuid: '3FA85F64-5717-4562-B3FC-2C963F66AFA6',
      internalCode: 'INV-2025-0891',
      type: 'RECEIVED',
      counterpartyName: 'شركة السويس للصلب والحديد (ش.م.م)',
      counterpartyTaxId: '100-249-812',
      issueDate: '2025-11-14',
      netAmount: 850000,
      taxAmount: 119000,
      totalAmount: 969000,
      etaStatus: 'Valid',
      bookStatus: 'RECORDED',
      bookAmount: 969000,
      itemCodeType: 'EGS',
    },
    {
      id: 'eta-2',
      uuid: '7CB91E12-9843-4B11-89DE-1A0987654321',
      internalCode: 'INV-2025-0904',
      type: 'RECEIVED',
      counterpartyName: 'الشركة الحديثة للتوريدات الكهربائية',
      counterpartyTaxId: '219-834-190',
      issueDate: '2025-11-20',
      netAmount: 140000,
      taxAmount: 196000,
      totalAmount: 159600,
      etaStatus: 'Cancelled', // Canceled by supplier! Danger for deduction!
      bookStatus: 'RECORDED',
      bookAmount: 159600,
      itemCodeType: 'GS1',
    },
    {
      id: 'eta-3',
      uuid: 'A4C87612-3321-4A55-9B77-8899AABBCCDD',
      internalCode: 'INV-2025-0922',
      type: 'RECEIVED',
      counterpartyName: 'مؤسسة الدلتا للنقل واللوجستيات',
      counterpartyTaxId: '381-904-712',
      issueDate: '2025-11-28',
      netAmount: 65000,
      taxAmount: 9100,
      totalAmount: 74100,
      etaStatus: 'Valid',
      bookStatus: 'UNRECORDED', // On portal but forgotten in books!
      bookAmount: 0,
      itemCodeType: 'EGS',
    },
    {
      id: 'eta-4',
      uuid: 'EEFF0011-2233-4455-6677-8899AABBCCEE',
      internalCode: 'OUT-2025-1102',
      type: 'ISSUED',
      counterpartyName: 'مجموعة الفطيم للتجارة والتوزيع',
      counterpartyTaxId: '402-819-331',
      issueDate: '2025-12-05',
      netAmount: 1200000,
      taxAmount: 168000,
      totalAmount: 1368000,
      etaStatus: 'Valid',
      bookStatus: 'RECORDED',
      bookAmount: 1368000,
      itemCodeType: 'EGS',
    },
    {
      id: 'eta-5',
      uuid: '11223344-5566-7788-9900-AABBCCDDEEFF',
      internalCode: 'OUT-2025-1145',
      type: 'ISSUED',
      counterpartyName: 'شركة النيل للإنشاءات المعمارية',
      counterpartyTaxId: '519-203-881',
      issueDate: '2025-12-18',
      netAmount: 450000,
      taxAmount: 63000,
      totalAmount: 513000,
      etaStatus: 'Rejected', // Rejected by buyer!
      bookStatus: 'RECORDED',
      bookAmount: 513000,
      itemCodeType: 'GS1',
    },
  ]);

  // Discrepancy Statistics
  const stats = useMemo(() => {
    const totalCount = etaRecords.length;
    const cancelledCount = etaRecords.filter((r) => r.etaStatus === 'Cancelled').length;
    const unrecordedCount = etaRecords.filter((r) => r.bookStatus === 'UNRECORDED').length;
    const rejectedCount = etaRecords.filter((r) => r.etaStatus === 'Rejected').length;
    const matchedCount = etaRecords.filter(
      (r) => r.etaStatus === 'Valid' && r.bookStatus === 'RECORDED'
    ).length;

    const atRiskTaxAmount = etaRecords
      .filter((r) => r.etaStatus === 'Cancelled' || r.etaStatus === 'Rejected')
      .reduce((sum, r) => sum + r.taxAmount, 0);

    return {
      totalCount,
      cancelledCount,
      unrecordedCount,
      rejectedCount,
      matchedCount,
      atRiskTaxAmount,
    };
  }, [etaRecords]);

  // Filtering
  const filteredRecords = useMemo(() => {
    return etaRecords.filter((r) => {
      // Search
      const matchesSearch =
        r.counterpartyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.counterpartyTaxId.includes(searchTerm) ||
        r.uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.internalCode.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'RECEIVED') return r.type === 'RECEIVED';
      if (activeTab === 'ISSUED') return r.type === 'ISSUED';
      if (activeTab === 'DISCREPANCIES') {
        return (
          r.etaStatus === 'Cancelled' ||
          r.etaStatus === 'Rejected' ||
          r.bookStatus === 'UNRECORDED' ||
          r.bookStatus === 'AMOUNT_MISMATCH'
        );
      }
      return true;
    });
  }, [etaRecords, searchTerm, activeTab]);

  const handleFixRecord = (id: string) => {
    setEtaRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          bookStatus: 'RECORDED',
          bookAmount: r.totalAmount,
        };
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 flex items-center gap-1">
              <FileCode2 className="w-3.5 h-3.5 text-teal-400" />
              بوابة الفاتورة والإيصال الإلكتروني (ETA SDK)
            </span>
            <span className="text-slate-400 text-xs font-mono">مطابقة الـ UUID والخصم الضريبي</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            منظومة تسوية ومطابقة الفواتير الإلكترونية مع الدفاتر
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            كشف الفواتير الملغاة والمرفوضة من الموردين لمنع سقوط حق الخصم الضريبي واستبعاد التكاليف
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-200" />
            <span>طباعة تقرير المطابقة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Matched Count */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">فواتير مطابقة وسليمة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 mt-2">
            {stats.matchedCount} <span className="text-xs text-slate-500 font-normal">فاتورة</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            معتمدة على البوابة ومقيدة بالدفاتر
          </div>
        </div>

        {/* Cancelled by Supplier */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 shadow-2xs">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-bold">فواتير ملغاة من المورد (خطر)</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black font-mono text-red-900 mt-2">
            {stats.cancelledCount} <span className="text-xs text-red-700 font-normal">فاتورة</span>
          </div>
          <div className="text-[11px] text-red-700 mt-1 font-medium">
            تسبب سقوط حق الخصم وغرامات فحص
          </div>
        </div>

        {/* Unrecorded in Books */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-bold">فواتير غير مقيدة بالدفاتر</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-900 mt-2">
            {stats.unrecordedCount} <span className="text-xs text-amber-700 font-normal">فاتورة</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            موجودة على منظومة الضرائب وساقطة دفترياً
          </div>
        </div>

        {/* At Risk Tax */}
        <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-bold">الضريبة المهددة بالاستبعاد</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 mt-2">
            {formatEgyptianCurrency(stats.atRiskTaxAmount)}
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            يلزم تسويتها قبل إرسال الإقرار الشهري
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الشركة، رقم التسجيل، كود الفاتورة، أو UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('DISCREPANCIES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'DISCREPANCIES'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الفروق والمخاطر فقط ({stats.cancelledCount + stats.unrecordedCount + stats.rejectedCount})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            كافة الفواتير ({stats.totalCount})
          </button>
          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'RECEIVED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فواتير المشتريات (المستلمة)
          </button>
          <button
            onClick={() => setActiveTab('ISSUED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'ISSUED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فواتير المبيعات (المصدرة)
          </button>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            جدول مطابقة الفواتير الإلكترونية (ETA Invoices Ledger)
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            عرض {filteredRecords.length} سجل
          </span>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">نوع الفاتورة والرمز</th>
                <th className="p-3">الطرف الآخر (العميل / المورد)</th>
                <th className="p-3">رقم التسجيل الضريبي</th>
                <th className="p-3">تاريخ الإصدار</th>
                <th className="p-3 text-left font-mono">الصافي (ج.م)</th>
                <th className="p-3 text-left font-mono">ضريبة القيمة المضافة</th>
                <th className="p-3 text-left font-mono">الإجمالي (ج.م)</th>
                <th className="p-3 text-center">حالة البوابة (ETA)</th>
                <th className="p-3 text-center">حالة الدفاتر</th>
                <th className="p-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-mono font-bold text-slate-900">{rec.internalCode}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={rec.uuid}>
                      {rec.uuid.slice(0, 16)}...
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-900">{rec.counterpartyName}</td>
                  <td className="p-3 font-mono text-slate-600">{rec.counterpartyTaxId}</td>
                  <td className="p-3 font-mono text-slate-600">{rec.issueDate}</td>
                  <td className="p-3 text-left font-mono">{formatEgyptianCurrency(rec.netAmount)}</td>
                  <td className="p-3 text-left font-mono font-bold text-blue-800">{formatEgyptianCurrency(rec.taxAmount)}</td>
                  <td className="p-3 text-left font-mono font-bold text-slate-900">{formatEgyptianCurrency(rec.totalAmount)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                        rec.etaStatus === 'Valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.etaStatus === 'Cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.etaStatus}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        rec.bookStatus === 'RECORDED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {rec.bookStatus === 'RECORDED' ? 'مقيدة بالدفاتر' : 'غير مقيدة!'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {rec.bookStatus === 'UNRECORDED' ? (
                      <button
                        onClick={() => handleFixRecord(rec.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        إنشاء قيد تسوية
                      </button>
                    ) : rec.etaStatus === 'Cancelled' ? (
                      <span className="text-[10px] text-red-600 font-bold">يلزم استبعاد الخصم</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">✓ معتمد</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
