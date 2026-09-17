import React, { useState, useMemo } from 'react';
import {
  Ship,
  Anchor,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calculator,
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  HelpCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  Upload,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Archive,
  Wallet,
  ArrowRight,
  Globe,
  Tag,
  Package,
} from 'lucide-react';
import {
  CustomsShipment,
  CustomsShipmentItem,
  CustomsShipmentType,
  CustomsShipmentStatus,
  IncotermCode,
  TradePaymentMethod,
  CurrencyCode,
} from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { SAMPLE_HS_CODES } from '../data/sampleCustomsData';
import { PrintService } from '../services/PrintService';
import { DemurrageSentinelTab } from './customs/DemurrageSentinelTab';
import { FxHedgingEas13Tab } from './customs/FxHedgingEas13Tab';
import { NafezaDirectParserTab } from './customs/NafezaDirectParserTab';

interface CustomsHubViewProps {
  state: DatabaseState;
  onNavigateToTab?: (tab: string) => void;
}

export const CustomsHubView: React.FC<CustomsHubViewProps> = ({ state, onNavigateToTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'OPERATIONS'
    | 'DEMURRAGE_SENTINEL'
    | 'FX_HEDGING_EAS13'
    | 'NAFEZA_PARSER'
    | 'LANDED_COST_CALCULATOR'
    | 'NAFEZA_ACI'
    | 'INTEGRATIONS'
    | 'REGULATORY_GUIDE'
  >('OPERATIONS');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClientId, setFilterClientId] = useState<string>('ALL');

  // Modal States
  const [selectedShipment, setSelectedShipment] = useState<CustomsShipment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState<boolean>(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [activeShipmentForAction, setActiveShipmentForAction] = useState<CustomsShipment | null>(null);

  // Treasury Modal Form State
  const [treasuryAmount, setTreasuryAmount] = useState<number>(5000);
  const [treasuryCategory, setTreasuryCategory] = useState<string>('رسوم ومصروفات جمركية ونافذة');
  const [treasuryDescription, setTreasuryDescription] = useState<string>('');
  const [treasuryPaymentMethod, setTreasuryPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');

  // Archive Modal Form State
  const [archiveDocTitle, setArchiveDocTitle] = useState<string>('');
  const [archiveDocFileName, setArchiveDocFileName] = useState<string>('');
  const [archiveDocRemarks, setArchiveDocRemarks] = useState<string>('');

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const shipments: CustomsShipment[] = useMemo(() => {
    return state.customsShipments || [];
  }, [state.customsShipments]);

  // Clients list for dropdowns
  const clients = state.clients || [];

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.shipmentCode || '').toLowerCase().includes(q) ||
        (s.title || '').toLowerCase().includes(q) ||
        (s.acidNumber && s.acidNumber.includes(searchQuery)) ||
        (s.blNumber && s.blNumber.toLowerCase().includes(q)) ||
        (s.clientName || '').toLowerCase().includes(q) ||
        (s.foreignExporterName && s.foreignExporterName.toLowerCase().includes(q));

      const matchType = filterType === 'ALL' || s.shipmentType === filterType;
      const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
      const matchClient = filterClientId === 'ALL' || s.clientId === filterClientId;

      return matchSearch && matchType && matchStatus && matchClient;
    });
  }, [shipments, searchQuery, filterType, filterStatus, filterClientId]);

  // Key Aggregations & Metrics
  const metrics = useMemo(() => {
    const totalCount = shipments.length;
    const importCount = shipments.filter((s) => s.shipmentType === 'IMPORT').length;
    const exportCount = shipments.filter((s) => s.shipmentType === 'EXPORT').length;
    const totalCifEgp = shipments.reduce((sum, s) => sum + (s.cifValueEgp || 0), 0);
    const totalDuties = shipments.reduce((sum, s) => sum + (s.customsDutyAmount || 0), 0);
    const totalVat = shipments.reduce((sum, s) => sum + (s.vatAmount || 0), 0);
    const totalDevelopmentFee = shipments.reduce((sum, s) => sum + (s.developmentFeeAmount || 0), 0);
    const totalLandedCost = shipments.reduce((sum, s) => sum + (s.totalLandedCostEgp || 0), 0);
    const activeInClearing = shipments.filter(
      (s) => s.status === 'UNDER_CLEARANCE' || s.status === 'INSPECTION' || s.status === 'ARRIVED_PORT'
    ).length;
    const aciPending = shipments.filter((s) => s.status === 'ACI_ISSUED' || s.status === 'PLANNED').length;

    return {
      totalCount,
      importCount,
      exportCount,
      totalCifEgp,
      totalDuties,
      totalVat,
      totalDevelopmentFee,
      totalLandedCost,
      activeInClearing,
      aciPending,
    };
  }, [shipments]);

  // Handler for Generating Automated Customs Journal Entries
  const handleGenerateJournalEntries = (shipment: CustomsShipment) => {
    const result = db.generateCustomsJournalEntries(shipment.id);
    if (result) {
      showToast(`تم إنشاء وتوجيه ${result.entryDuties ? '3 قيود محاسبية' : 'قيدين'} بنجاح لشحنة [${shipment.shipmentCode}]`);
    } else {
      showToast('تعذر توليد القيود المحاسبية، يرجى مراجعة بيانات الشحنة');
    }
  };

  // Handler for Office Treasury Payment
  const handleOpenTreasuryModal = (shipment: CustomsShipment) => {
    setActiveShipmentForAction(shipment);
    setTreasuryAmount(shipment.totalAdditionalExpenses || 5000);
    setTreasuryDescription(`سداد رسوم جمركية ومصروفات تخليص لشحنة [${shipment.shipmentCode}] - ${shipment.title}`);
    setIsTreasuryModalOpen(true);
  };

  const handleConfirmTreasuryPayment = () => {
    if (!activeShipmentForAction) return;
    const tx = db.payCustomsFromOfficeTreasury(activeShipmentForAction.id, {
      amount: Number(treasuryAmount),
      category: treasuryCategory,
      description: treasuryDescription,
      paymentMethod: treasuryPaymentMethod,
      treasuryType: 'OFFICE_MAIN_VAULT',
    });

    if (tx) {
      showToast(`تم تسجيل إذن صرف نقدية [${tx.voucherNumber}] بمبلغ ${treasuryAmount.toLocaleString()} ج.م من خزنة المكتب`);
      setIsTreasuryModalOpen(false);
      setActiveShipmentForAction(null);
    }
  };

  // Handler for Client Archive
  const handleOpenArchiveModal = (shipment: CustomsShipment) => {
    setActiveShipmentForAction(shipment);
    setArchiveDocTitle(`ملف الإفراج الجمركي وبوليصة الشحن - ${shipment.shipmentCode}`);
    setArchiveDocFileName(`Customs-Dossier-${shipment.shipmentCode}.pdf`);
    setArchiveDocRemarks(`وثائق شحنة ${shipment.title} - بوليصة ${shipment.blNumber} - ACID: ${shipment.acidNumber}`);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchiveDoc = () => {
    if (!activeShipmentForAction) return;
    const doc = db.saveCustomsDocToClientArchive(activeShipmentForAction.id, activeShipmentForAction.clientId, {
      title: archiveDocTitle,
      docType: 'CONTRACT',
      fileName: archiveDocFileName,
      remarks: archiveDocRemarks,
    });

    if (doc) {
      showToast(`تم أرشفة المستند بنجاح في مجلد الجمارك لملف العميل [${activeShipmentForAction.clientName}]`);
      setIsArchiveModalOpen(false);
      setActiveShipmentForAction(null);
    }
  };

  // Handler for Printing Dossier
  const handlePrintDossier = (shipment: CustomsShipment) => {
    setSelectedShipment(shipment);
    setIsPrintModalOpen(true);
  };

  const handleExecutePrint = () => {
    PrintService.printElementById('customs-dossier-printable', {
      title: `ملف جمركي رسمي - شحنة ${selectedShipment?.shipmentCode}`,
      customDelayMs: 300,
    });
  };

  const statusLabels: Record<CustomsShipmentStatus, string> = {
    PLANNED: 'قيد التخطيط والتفاوض',
    ACI_ISSUED: 'تم استخراج ACID ونافذة',
    SAILED: 'مشحونة بالسفينة بالطريق',
    ARRIVED_PORT: 'وصلت الميناء البحري/الجوي',
    UNDER_CLEARANCE: 'قيد التخليص الجمركي',
    INSPECTION: 'كشف ومعاينة وفحص رقابي',
    CUSTOMS_PAID: 'تم سداد الرسوم والضرائب',
    RELEASED: 'تم الإفراج الجمركي (إفراج 13)',
    RECEIVED_WAREHOUSE: 'تم استلام المخزن ورسملة التكلفة',
    CANCELLED: 'ملغاة',
  };

  const statusColors: Record<CustomsShipmentStatus, string> = {
    PLANNED: 'bg-slate-800 text-slate-300 border-slate-700',
    ACI_ISSUED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    SAILED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    ARRIVED_PORT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    UNDER_CLEARANCE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    INSPECTION: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    CUSTOMS_PAID: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    RELEASED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    RECEIVED_WAREHOUSE: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  منظومة الجمارك والتجارة الخارجية والتكلفة الإنزالية
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
                  EAS 13 & EAS 2
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  قانون الجمارك 207 لسنة 2020
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع الشحنات الواردة والصادرة، منظومة نافذة ACI، احتساب التكلفة الإنزالية (Landed Cost)، والربط الآلي بالخزنة والأرشيف والقيود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedShipment(null);
                setIsEditModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إدراج شحنة جديدة</span>
            </button>

            <button
              onClick={() => setActiveSubTab('LANDED_COST_CALCULATOR')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>حاسبة التكلفة الإنزالية</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto text-xs pb-1">
          {[
            { id: 'OPERATIONS', label: 'سجل الشحنات والعمليات', icon: Layers, badge: `${shipments.length}` },
            { id: 'DEMURRAGE_SENTINEL', label: 'حارس الأرضيات وغرامات الحاويات', icon: ShieldAlert, badge: 'رادار الموانئ' },
            { id: 'FX_HEDGING_EAS13', label: 'تسوية فروق العملة (EAS 13)', icon: TrendingUp, badge: 'معياري' },
            { id: 'NAFEZA_PARSER', label: 'مستورد بيانات نافذة الذكي', icon: Upload, badge: 'تفريغ فوري' },
            { id: 'LANDED_COST_CALCULATOR', label: 'حاسبة التكلفة الإنزالية والتعرفة', icon: Calculator, badge: 'EAS 2' },
            { id: 'NAFEZA_ACI', label: 'منظومة نافذة والتسجيل المسبق (ACI)', icon: Globe, badge: `${metrics.aciPending} شحنة` },
            { id: 'INTEGRATIONS', label: 'التكامل المحاسبي والخزينة والأرشيف', icon: Sparkles, badge: 'Live Sync' },
            { id: 'REGULATORY_GUIDE', label: 'الدليل الجمركي وقانون 207 لسنة 2020', icon: BookOpen, badge: 'قانون 207' },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-cyan-800 text-cyan-200' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* Top Operational Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">إجمالي الشحنات</span>
              <Ship className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{metrics.totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-cyan-400 font-bold">{metrics.importCount} وارد</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{metrics.exportCount} صادر</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">القيمة للأغراض الجمركية (CIF)</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-blue-400 font-mono truncate">
              {metrics.totalCifEgp.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">بضائع بالطريق واعتمادات مفتوحة</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">الرسوم والضرائب الجمركية</span>
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-400 font-mono truncate">
              {(metrics.totalDuties + metrics.totalVat + metrics.totalDevelopmentFee).toLocaleString()}{' '}
              <span className="text-xs font-normal">ج.م</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              جمارك: {metrics.totalDuties.toLocaleString()} | ق.م: {metrics.totalVat.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">التكلفة الإنزالية الكلية</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono truncate">
              {metrics.totalLandedCost.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
            </div>
            <div className="text-[11px] text-emerald-500 font-semibold mt-1">مرسملة على تكلفة المخزن (EAS 2)</div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">موقف الإفراج والتخليص</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">{metrics.activeInClearing}</div>
            <div className="text-[11px] text-slate-400 mt-1">شحنة بالموانئ تحت الفحص والإفراج</div>
          </div>
        </div>

        {/* SUBTAB 1: OPERATIONS & SHIPMENTS REGISTRY */}
        {activeSubTab === 'OPERATIONS' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث برقم الشحنة، ACID، بوليصة الشحن BL، اسم العميل أو المورد الأجنبي..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">جميع أنواع الشحنات</option>
                  <option value="IMPORT">وارد (Import)</option>
                  <option value="EXPORT">صادر (Export)</option>
                  <option value="TRANSIT">ترانزيت (Transit)</option>
                  <option value="FREE_ZONE">منطقة حرة (Free Zone)</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">كافة الحالات الإجرائية</option>
                  <option value="PLANNED">قيد التخطيط والتفاوض</option>
                  <option value="ACI_ISSUED">تم استخراج رقم ACID</option>
                  <option value="SAILED">أبحرت السفينة في الطريق</option>
                  <option value="ARRIVED_PORT">وصلت الميناء</option>
                  <option value="UNDER_CLEARANCE">قيد التخليص الجمركي</option>
                  <option value="INSPECTION">كشف ومعاينة وفحص رقابي</option>
                  <option value="CUSTOMS_PAID">تم سداد الرسوم والضرائب</option>
                  <option value="RELEASED">تم الإفراج الجمركي النهائي</option>
                  <option value="RECEIVED_WAREHOUSE">استلام البضاعة في المخازن</option>
                </select>

                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">جميع الشركات والعملاء</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('ALL');
                    setFilterStatus('ALL');
                    setFilterClientId('ALL');
                  }}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                  title="إعادة ضبط الفلاتر"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Shipments Table / Cards */}
            {filteredShipments.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                <Ship className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-50" />
                <h3 className="text-base font-bold text-slate-300 mb-1">لا توجد شحنات جمركية مطابقة للبحث</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  يمكنك إدراج أول شحنة جمركية جديدة للبدء في تتبع بنود الشحن والتكلفة الإنزالية والربط بالخزنة
                </p>
                <button
                  onClick={() => {
                    setSelectedShipment(null);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إدراج شحنة جديدة</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredShipments.map((shipment) => {
                  return (
                    <div
                      key={shipment.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Shipment Header Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-md border border-slate-700">
                              {shipment.shipmentCode}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                statusColors[shipment.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {statusLabels[shipment.status] || shipment.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {shipment.shipmentType === 'IMPORT' ? 'وارد بحري/جوي' : 'صادر مصري'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-900/40 text-blue-300 border border-blue-700/40">
                              {shipment.incoterm}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <span>{shipment.title}</span>
                          </h3>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <strong className="text-slate-300">العميل:</strong> {shipment.clientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-slate-500" />
                              <strong className="text-slate-300">المصدر:</strong> {shipment.foreignExporterName} (
                              {shipment.foreignExporterCountry})
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Anchor className="w-3.5 h-3.5 text-slate-500" />
                              <strong className="text-slate-300 font-sans">بوليصة BL:</strong> {shipment.blNumber}
                            </span>
                            {shipment.acidNumber && (
                              <span className="flex items-center gap-1 font-mono text-cyan-400">
                                <strong>ACID:</strong> {shipment.acidNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Financial Figures Quick Badge */}
                        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center gap-4 text-right shrink-0">
                          <div>
                            <div className="text-[10px] text-slate-500">القيمة سيف (CIF)</div>
                            <div className="text-sm font-black text-blue-400 font-mono">
                              {shipment.cifValueEgp.toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400">ج.م</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {shipment.cifValueForeign.toLocaleString()} {shipment.invoiceCurrency}
                            </div>
                          </div>

                          <div className="border-r border-slate-800 pr-4">
                            <div className="text-[10px] text-slate-500">الرسوم والضرائب</div>
                            <div className="text-sm font-black text-amber-400 font-mono">
                              {(
                                (shipment.customsDutyAmount || 0) +
                                (shipment.vatAmount || 0) +
                                (shipment.developmentFeeAmount || 0)
                              ).toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400">ج.م</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              جمرك: {shipment.customsDutyAmount?.toLocaleString()}
                            </div>
                          </div>

                          <div className="border-r border-slate-800 pr-4">
                            <div className="text-[10px] text-slate-500">التكلفة الإنزالية الكلية</div>
                            <div className="text-sm font-black text-emerald-400 font-mono">
                              {shipment.totalLandedCostEgp.toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400">ج.م</span>
                            </div>
                            <div className="text-[10px] text-emerald-500 font-mono">
                              {shipment.items?.length || 0} بنود مشمولة
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Triggers Bar (Integration buttons) */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* 1. Auto Journal Entries Button */}
                          <button
                            onClick={() => handleGenerateJournalEntries(shipment)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="إنشاء القيود المحاسبية التلقائية للاعتماد والجمارك وإقفال المخزن"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>توجيه القيود المحاسبية الآلية</span>
                            {shipment.linkedJournalEntryIds && shipment.linkedJournalEntryIds.length > 0 && (
                              <span className="bg-indigo-800 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                                {shipment.linkedJournalEntryIds.length}
                              </span>
                            )}
                          </button>

                          {/* 2. Pay from Office Treasury Button */}
                          <button
                            onClick={() => handleOpenTreasuryModal(shipment)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="سداد رسوم جمركية أو مصاريف تخليص من خزنة المكتب لحساب العميل"
                          >
                            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                            <span>سداد من خزنة المكتب</span>
                            {shipment.linkedTreasuryTransactionIds &&
                              shipment.linkedTreasuryTransactionIds.length > 0 && (
                                <span className="bg-emerald-800 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                                  {shipment.linkedTreasuryTransactionIds.length}
                                </span>
                              )}
                          </button>

                          {/* 3. Link to Client Archive Button */}
                          <button
                            onClick={() => handleOpenArchiveModal(shipment)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="حفظ وأرشفة بوليصة الشحن والإفراج في مجلد جمارك العميل"
                          >
                            <Archive className="w-3.5 h-3.5 text-blue-400" />
                            <span>أرشفة بالأرشيف الإلكتروني</span>
                            {shipment.archiveDocumentIds && shipment.archiveDocumentIds.length > 0 && (
                              <span className="bg-blue-800 text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                                {shipment.archiveDocumentIds.length}
                              </span>
                            )}
                          </button>

                          {/* 4. Print Customs Dossier */}
                          <button
                            onClick={() => handlePrintDossier(shipment)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="طباعة وتحميل الملف الجمركي الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span>طباعة الملف الجمركي</span>
                          </button>
                        </div>

                        {/* Edit / Delete / View details */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="تعديل تفاصيل الشحنة والبنود"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الشحنة الجمركية رقم [${shipment.shipmentCode}]؟`)) {
                                db.deleteCustomsShipment(shipment.id);
                                showToast(`تم حذف الشحنة الجمركية [${shipment.shipmentCode}]`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="حذف الشحنة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: LANDED COST & TARIFF CALCULATOR */}
        {activeSubTab === 'LANDED_COST_CALCULATOR' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    حاسبة التكلفة الإنزالية والرسوم الجمركية التفاعلية (Landed Cost Engine)
                  </h2>
                  <p className="text-xs text-slate-400">
                    وفقاً لمعيار المحاسبة المصري رقم (2) المخزون ومعيار (13) آثار التغيرات في أسعار صرف العملات الأجنبية
                  </p>
                </div>
              </div>

              {/* Sample Calculation Demonstration */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs breakdown */}
                <div className="lg:col-span-2 space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>مكونات التكلفة الإنزالية وفقاً للمنظومة الجمركية المصرية:</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400">سعر الفاتورة الأجنبية (FOB/EXW):</label>
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl font-mono text-white flex justify-between">
                        <span>42,500.00</span>
                        <span className="text-slate-400">USD</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400">سعر الصرف الجمركي المعلن (EGP):</label>
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl font-mono text-white flex justify-between">
                        <span>50.25</span>
                        <span className="text-slate-400">ج.م لكل دولار</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400">النولون البحري + التأمين البحري:</label>
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl font-mono text-white flex justify-between">
                        <span>3,500.00</span>
                        <span className="text-slate-400">USD (= 175,875 ج.م)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400">القيمة للأغراض الجمركية سيف (CIF):</label>
                      <div className="bg-cyan-950/60 border border-cyan-700/60 p-2.5 rounded-xl font-mono text-cyan-300 font-bold flex justify-between">
                        <span>2,311,500.00</span>
                        <span>ج.م (46,000 USD)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300">تفاصيل الرسوم والضرائب الإلزامية:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">ضريبة جمركية (5%):</span>
                        <span className="text-amber-400 font-bold">115,575 ج.م</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">قيمة مضافة (14%):</span>
                        <span className="text-blue-400 font-bold">339,790 ج.م</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">رسم تنمية (2%):</span>
                        <span className="text-purple-400 font-bold">46,230 ج.م</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">خصم أرباح (1%):</span>
                        <span className="text-rose-400 font-bold">23,115 ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300">مصاريف الموانئ والتخليص والنقل الداخلي:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">تفريغ ومناولة ميناء:</span>
                        <span className="text-white">18,500 ج.م</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">أتعاب مخلص جمركي:</span>
                        <span className="text-white">12,000 ج.م</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block font-sans">نقل داخلي للمستودع:</span>
                        <span className="text-white">15,000 ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landed Cost Accounting Capitalization Summary */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-cyan-800/40 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>صافي تكلفة المخزون الإنزالية:</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>قيمة البضاعة (CIF):</span>
                        <span className="font-mono">2,311,500 ج.م</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>الرسوم الجمركية غير المستردة:</span>
                        <span className="font-mono">115,575 ج.م</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>رسم تنمية الموارد:</span>
                        <span className="font-mono">46,230 ج.م</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>المصاريف المباشرة واللوجستيات:</span>
                        <span className="font-mono">45,500 ج.م</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-emerald-400">
                        <span>إجمالي التكلفة الإنزالية (المخزن):</span>
                        <span className="font-mono">2,518,805 ج.م</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200">
                      <strong>تنبيه معايير المحاسبة (EAS 2):</strong> ضريبة القيمة المضافة (339,790 ج.م) والخصم تحت حساب
                      الضريبة (23,115 ج.م) لا تُرسمل على تكلفة البضاعة في المخزن؛ بل تُسجل كمدخلات ضريبية مدينة قابلة
                      للخصم والتسوية مع مصلحة الضرائب المصرية.
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">معامل التكلفة الإنزالية:</span>
                    <span className="text-sm font-mono font-bold text-cyan-300">+8.96% على CIF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HS Tariff Codes Reference Dictionary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>دليل بنود التعريفة الجمركية المصرية الشائعة (HS Codes Egyptian Tariff):</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {SAMPLE_HS_CODES.map((code) => (
                  <div key={code.code} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">{code.code}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold font-mono">
                        جمرك: {code.dutyRatePct}%
                      </span>
                    </div>
                    <div className="font-semibold text-slate-200">{code.titleAr}</div>
                    <div className="text-slate-400 text-[11px] font-mono">{code.titleEn}</div>
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                      <span>قيمة مضافة: {code.vatRatePct}%</span>
                      {code.regulatoryAuthority && <span className="truncate">جهة العرض: {code.regulatoryAuthority}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: NAFEZA & ACI HUB */}
        {activeSubTab === 'NAFEZA_ACI' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    منظومة التسجيل المسبق للشحنات المصرية (Nafeza Single Window & ACI Tracking)
                  </h2>
                  <p className="text-xs text-slate-400">
                    متابعة أرقام ACID وتواريخ الصلاحية وشهادات المنشأ وإفراجات 46 و 13 ك.م وفقاً لتعليمات مصلحة الجمارك المصرية
                  </p>
                </div>
              </div>

              {/* ACI Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shipments.map((s) => (
                  <div key={s.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
                        {s.shipmentCode}
                      </span>
                      <span className="text-xs font-bold text-slate-300">{s.clientName}</span>
                    </div>

                    <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">رقم القيد ACID:</span>
                        <span className="font-mono font-bold text-indigo-300 tracking-wider">
                          {s.acidNumber || 'غير مصدر بعد'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">تاريخ إصدار ACID:</span>
                        <span className="font-mono text-slate-300">{s.acidIssueDate || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">صلاحية ACID:</span>
                        <span className="font-mono text-amber-300 font-bold">{s.acidExpiryDate || '-'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">شهادة الإفراج 46 / 13:</span>
                        <span className="font-mono">{s.customsDeclarationNumber || 'قيد الانتظار'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الميناء الجمركي:</span>
                        <span>{s.customsPortOfArrival}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الخط الملاحي:</span>
                        <span>{s.shippingLine || '-'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400">حالة الشحنة:</span>
                      <span className="text-xs font-bold text-cyan-400">{statusLabels[s.status] || s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: INTEGRATIONS (Accounting, Treasury, Archive) */}
        {activeSubTab === 'INTEGRATIONS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    مركز التكامل والاندماج المحاسبي والخزينة والأرشيف الإلكتروني
                  </h2>
                  <p className="text-xs text-slate-400">
                    ربط آلي ثلاثي المحاور يضمن دقة دورة العمل المستندية والمحاسبية دون أي إدخال يدوي مكرر
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Accounting Integration Card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Layers className="w-4 h-4" />
                      <span>1. التكامل المحاسبي الآلي</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      توليد قيود اليومية المعيارية الثلاثة بضغطة زر واحدة:
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>قيد فتح الاعتماد:</strong> من حـ/ بضاعة بالطريق واعتمادات إلى حـ/ موردون خارجيون (بالقيمة سيف).
                      </li>
                      <li>
                        <strong>قيد سداد الجمارك:</strong> إثبات الرسوم والمصاريف الإنزالية، وضريبة ق.م مدخلات (14%)، والخصم
                        الجمركي.
                      </li>
                      <li>
                        <strong>قيد إقفال الاعتماد:</strong> من حـ/ مخزون البضائع والخامات إلى حـ/ الاعتمادات المستندية
                        بالتكلفة الإنزالية الكلية.
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (shipments.length > 0) {
                        handleGenerateJournalEntries(shipments[0]);
                      }
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    توليد القيود لأول شحنة نشطة
                  </button>
                </div>

                {/* 2. Treasury Integration Card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Wallet className="w-4 h-4" />
                      <span>2. الربط بخزنة وحسابات المكتب</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      تسجيل فوري لأي مصروفات أو رسوم جمركية أو مصاريف تفريغ دفعها المكتب نيابة عن العميل:
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>إصدار إذن صرف خزينة فوري بالرقم المتسلسل ورمز الاستجابة السريع QR.</li>
                      <li>تحديث الرصيد الفعلي لخزنة المكتب أو الحساب البنكي.</li>
                      <li>تحميل المصروف على كشف حساب العميل للمطالبة بالأتعاب والمصروفات.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (shipments.length > 0) {
                        handleOpenTreasuryModal(shipments[0]);
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    سداد مصروف جمركي تجريبي من الخزنة
                  </button>
                </div>

                {/* 3. Archive Integration Card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-blue-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <Archive className="w-4 h-4" />
                      <span>3. الأرشيف الإلكتروني للعميل</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      حفظ وتصنيف مستندات الشحنة تلقائياً في مجلد "مستندات الجمارك والتجارة" بملف العميل:
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>بوليصة الشحن البحرية / الجوية (Bill of Lading / Airway Bill).</li>
                      <li>الفاتورة التجارية المصادق عليها وقائمة التعبئة (Packing List).</li>
                      <li>شهادة الإفراج الجمركي النهائي (نموذج 13 جمارك).</li>
                      <li>استمارة (4) البنكية الخاصة بتمويل الواردات.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (shipments.length > 0) {
                        handleOpenArchiveModal(shipments[0]);
                      }
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    أرشفة مستند جمركي لملف العميل
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: REGULATORY & LAW 207 GUIDE */}
        {activeSubTab === 'REGULATORY_GUIDE' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    المرجع القانوني والتنفيذي للجمارك المصرية (قانون الجمارك رقم 207 لسنة 2020)
                  </h2>
                  <p className="text-xs text-slate-400">
                    أهم القواعد التشريعية والمهنية للمحاسب القانوني ومراجع الحسابات في مصر
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-cyan-400 text-sm">
                    1. القيمة للأغراض الجمركية واتفاقية التقييم الجمركي (GATT)
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    تحدد القيمة للأغراض الجمركية طبقاً للمادة (18) من قانون 207 لسنة 2020 على أساس "قيمة الصفقة الفعلية"
                    (Transaction Value) متضمنة النولون والتأمين (CIF). وفي حال الاستيراد بنظام FOB يُضاف النولون الفعلي أو
                    الاسترشادي المعتمد من هيئة السلامة البحرية والتأمين المعتمد لتحديد الوعاء الجمركي.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    2. المعالجة المحاسبية للضرائب والرسوم الجمركية (EAS 2 & EAS 13)
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    - <strong>تُرسمل على تكلفة المخزون:</strong> الضريبة الجمركية الأصلية، رسم تنمية الموارد المالية للدولة،
                    مصاريف الموانئ، أتعاب التخليص، النولون والنقل حتى وصول المخازن.
                    <br />- <strong>لا تُرسمل:</strong> ضريبة القيمة المضافة الجمركية (14%) وخصم أرباح تجارية وصناعية (1%)؛
                    حيث تُقيد كأصول متداولة (أرصدة مدينة لمصلحة الضرائب) وتُخصم في الإقرار الضريبي الشهري / الربع سنوي.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-amber-400 text-sm">
                    3. منظومة نافذة والتسجيل المسبق للشحنات (ACI Mandate)
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    يُلزم المستورد بالحصول على رقم القيد الجمركي المبدئي (ACID) المكون من 19 رقماً قبل شحن البضائع من بلد
                    التصدير بمدة 48 ساعة على الأقل. صلاحية الرقم 3 أشهر. لا يجوز تفريغ أي حاوية بالموانئ المصرية دون إدراج
                    ACID على بوليصة الشحن والفاتورة الأولية.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-purple-400 text-sm">
                    4. الاتفاقيات التجارية الدولية والإعفاءات الجمركية
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    تتمتع الشحنات بإعفاءات جمركية كاملة أو جزئية عند تقديم شهادات منشأ مطابقة للشروط الفنية وفقاً
                    للاتفاقيات المبرمة:
                    <br />• <strong>اتفاقية الشراكة المصرية الأوروبية:</strong> شهادة EUR.1 (إعفاء جمركي 100% للسلع الصناعية).
                    <br />• <strong>اتفاقية تيسير وتنمية التبادل التجاري العربي (GAFTA):</strong> إعفاء جمركي كامل.
                    <br />• <strong>اتفاقية الكوميسا (COMESA):</strong> إعفاء جمركي للمنتجات المستوفية لنسبة القيمة المضافة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 6: DEMURRAGE & DETENTION SENTINEL */}
        {activeSubTab === 'DEMURRAGE_SENTINEL' && (
          <DemurrageSentinelTab
            state={state}
            showToast={showToast}
            onOpenTreasuryModal={handleOpenTreasuryModal}
          />
        )}

        {/* SUBTAB 7: FX HEDGING & EAS 13 SETTLEMENT */}
        {activeSubTab === 'FX_HEDGING_EAS13' && (
          <FxHedgingEas13Tab state={state} showToast={showToast} />
        )}

        {/* SUBTAB 8: NAFEZA DIRECT PARSER */}
        {activeSubTab === 'NAFEZA_PARSER' && (
          <NafezaDirectParserTab
            state={state}
            showToast={showToast}
            onNavigateToOperations={() => setActiveSubTab('OPERATIONS')}
          />
        )}
      </div>

      {/* MODAL 1: EDIT / CREATE SHIPMENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedShipment ? `تعديل الشحنة [${selectedShipment.shipmentCode}]` : 'تسجيل شحنة جمركية جديدة'}
                  </h3>
                  <p className="text-xs text-slate-400">إدخال البيانات الاستيرادية والتصديرية ومنظومة نافذة والتكلفة</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">كود الشحنة الداخلي:</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.shipmentCode || `CUST-${new Date().getFullYear()}-${String(shipments.length + 1).padStart(4, '0')}`}
                    id="shipment-code-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">نوع العملية الجمركية:</label>
                  <select
                    defaultValue={selectedShipment?.shipmentType || 'IMPORT'}
                    id="shipment-type-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="IMPORT">وارد (Import)</option>
                    <option value="EXPORT">صادر (Export)</option>
                    <option value="TRANSIT">ترانزيت (Transit)</option>
                    <option value="FREE_ZONE">منطقة حرة (Free Zone)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">الشركة المستوردة / العميل:</label>
                  <select
                    defaultValue={selectedShipment?.clientId || (clients[0]?.id || '')}
                    id="shipment-client-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">مسمى ووصف الشحنة:</label>
                <input
                  type="text"
                  defaultValue={selectedShipment?.title || 'شحنة خطوط إنتاج ومعدات إلكترونية'}
                  id="shipment-title-input"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">المصدر الأجنبي / الشاحن:</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.foreignExporterName || 'Global Machinery Co. Ltd'}
                    id="shipment-exporter-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">بلد المنشأ (Country of Origin):</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.foreignExporterCountry || 'ألمانيا (Germany)'}
                    id="shipment-origin-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">ميناء الوصول الجمركي:</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.customsPortOfArrival || 'ميناء الإسكندرية البحري'}
                    id="shipment-port-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">رقم بوليصة الشحن (B/L):</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.blNumber || 'MSC-EGY-984210'}
                    id="shipment-bl-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">رقم قيد نافذة ACID (19 رقماً):</label>
                  <input
                    type="text"
                    defaultValue={selectedShipment?.acidNumber || '4820261893450912384'}
                    id="shipment-acid-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">شرط التسليم (Incoterm):</label>
                  <select
                    defaultValue={selectedShipment?.incoterm || 'CIF'}
                    id="shipment-incoterm-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                    <option value="FOB">FOB (Free On Board)</option>
                    <option value="CFR">CFR (Cost & Freight)</option>
                    <option value="EXW">EXW (Ex Works)</option>
                    <option value="DAP">DAP (Delivered at Place)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">عملة الفاتورة:</label>
                  <select
                    defaultValue={selectedShipment?.invoiceCurrency || 'USD'}
                    id="shipment-currency-input"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    <option value="USD">USD - دولار أمريكي</option>
                    <option value="EUR">EUR - يورو أوروبي</option>
                    <option value="GBP">GBP - جنيه إسترليني</option>
                    <option value="CNY">CNY - يوان صيني</option>
                    <option value="SAR">SAR - ريال سعودي</option>
                  </select>
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400">القيم والمبالغ للأغراض الجمركية:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400">القيمة بالعملة الأجنبية:</label>
                    <input
                      type="number"
                      defaultValue={selectedShipment?.cifValueForeign || 35000}
                      id="shipment-cif-foreign-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">سعر الصرف الجمركي (EGP):</label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={selectedShipment?.customsExchangeRate || 50.25}
                      id="shipment-exchange-rate-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">الضريبة الجمركية (EGP):</label>
                    <input
                      type="number"
                      defaultValue={selectedShipment?.customsDutyAmount || 87937}
                      id="shipment-duty-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">ضريبة القيمة المضافة (14%):</label>
                    <input
                      type="number"
                      defaultValue={selectedShipment?.vatAmount || 258536}
                      id="shipment-vat-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-slate-400">رسم تنمية الموارد:</label>
                    <input
                      type="number"
                      defaultValue={selectedShipment?.developmentFeeAmount || 35175}
                      id="shipment-dev-fee-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">مصاريف الموانئ والتخليص والنقل الداخلي:</label>
                    <input
                      type="number"
                      defaultValue={selectedShipment?.totalAdditionalExpenses || 32000}
                      id="shipment-additional-expenses-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400">الحالة الإجرائية الحالية:</label>
                    <select
                      defaultValue={selectedShipment?.status || 'UNDER_CLEARANCE'}
                      id="shipment-status-input"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="PLANNED">قيد التخطيط والتفاوض</option>
                      <option value="ACI_ISSUED">تم قيد ACI نافذة</option>
                      <option value="SAILED">مشحونة بالطريق</option>
                      <option value="ARRIVED_PORT">وصلت الميناء</option>
                      <option value="UNDER_CLEARANCE">قيد التخليص الجمركي</option>
                      <option value="INSPECTION">عرض رقابي وفحص</option>
                      <option value="CUSTOMS_PAID">تم ربط وسداد الرسوم والضرائب</option>
                      <option value="RELEASED">تم الإفراج الجمركي (إفراج 13)</option>
                      <option value="RECEIVED_WAREHOUSE">تم استلام المخزن ورسملة التكلفة</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={() => {
                  const codeEl = document.getElementById('shipment-code-input') as HTMLInputElement;
                  const typeEl = document.getElementById('shipment-type-input') as HTMLSelectElement;
                  const clientEl = document.getElementById('shipment-client-input') as HTMLSelectElement;
                  const titleEl = document.getElementById('shipment-title-input') as HTMLInputElement;
                  const exporterEl = document.getElementById('shipment-exporter-input') as HTMLInputElement;
                  const originEl = document.getElementById('shipment-origin-input') as HTMLInputElement;
                  const portEl = document.getElementById('shipment-port-input') as HTMLInputElement;
                  const blEl = document.getElementById('shipment-bl-input') as HTMLInputElement;
                  const acidEl = document.getElementById('shipment-acid-input') as HTMLInputElement;
                  const incotermEl = document.getElementById('shipment-incoterm-input') as HTMLSelectElement;
                  const currencyEl = document.getElementById('shipment-currency-input') as HTMLSelectElement;
                  const cifForeignEl = document.getElementById('shipment-cif-foreign-input') as HTMLInputElement;
                  const rateEl = document.getElementById('shipment-exchange-rate-input') as HTMLInputElement;
                  const dutyEl = document.getElementById('shipment-duty-input') as HTMLInputElement;
                  const vatEl = document.getElementById('shipment-vat-input') as HTMLInputElement;
                  const devFeeEl = document.getElementById('shipment-dev-fee-input') as HTMLInputElement;
                  const expEl = document.getElementById('shipment-additional-expenses-input') as HTMLInputElement;
                  const statusEl = document.getElementById('shipment-status-input') as HTMLSelectElement;

                  const clientObj = clients.find((c) => c.id === clientEl.value);
                  const cifForeign = Number(cifForeignEl.value) || 0;
                  const rate = Number(rateEl.value) || 50;
                  const cifEgp = cifForeign * rate;
                  const duty = Number(dutyEl.value) || 0;
                  const vat = Number(vatEl.value) || 0;
                  const devFee = Number(devFeeEl.value) || 0;
                  const addExp = Number(expEl.value) || 0;
                  const landed = cifEgp + duty + devFee + addExp;

                  const payload: CustomsShipment = {
                    id: selectedShipment?.id || `ship-${Date.now()}`,
                    shipmentCode: codeEl.value,
                    title: titleEl.value,
                    shipmentType: typeEl.value as CustomsShipmentType,
                    status: statusEl.value as CustomsShipmentStatus,
                    clientId: clientEl.value,
                    clientName: clientObj?.name || 'شركة تجارية',
                    foreignExporterName: exporterEl.value,
                    foreignExporterCountry: originEl.value,
                    customsPortOfArrival: portEl.value,
                    portOfLoading: selectedShipment?.portOfLoading || 'ميناء الشحن الدولي',
                    shippingLine: selectedShipment?.shippingLine || 'MSC Line',
                    blNumber: blEl.value,
                    acidNumber: acidEl.value,
                    incoterm: incotermEl.value as IncotermCode,
                    paymentMethod: selectedShipment?.paymentMethod || 'LETTER_OF_CREDIT',
                    invoiceCurrency: (currencyEl.value as CurrencyCode) || 'USD',
                    invoiceAmountForeign: cifForeign,
                    cifValueForeign: cifForeign,
                    customsExchangeRate: rate,
                    cifValueEgp: cifEgp,
                    customsDutyAmount: duty,
                    vatAmount: vat,
                    developmentFeeAmount: devFee,
                    withholdingTaxAmount: Math.round(cifEgp * 0.01),
                    totalCustomsDutiesAndTaxes: duty + vat + devFee,
                    customsBrokerFees: 12000,
                    portStorageAndHandlingFees: 10000,
                    demurrageFeesPaid: 0,
                    inlandFreightFees: 8000,
                    bankCommissionsAndLcExpenses: 2000,
                    otherExpenses: 0,
                    totalAdditionalExpenses: addExp,
                    totalLandedCostEgp: landed,
                    costMultiplierRatio: cifEgp > 0 ? Number((landed / cifEgp).toFixed(4)) : 1.0,
                    items: selectedShipment?.items || [],
                    linkedJournalEntryIds: selectedShipment?.linkedJournalEntryIds || [],
                    linkedTreasuryTransactionIds: selectedShipment?.linkedTreasuryTransactionIds || [],
                    archiveDocumentIds: selectedShipment?.archiveDocumentIds || [],
                    createdAt: selectedShipment?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  db.saveCustomsShipment(payload);
                  showToast(`تم حفظ الشحنة الجمركية [${payload.shipmentCode}] بنجاح`);
                  setIsEditModalOpen(false);
                }}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                حفظ بيانات الشحنة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TREASURY PAYMENT MODAL */}
      {isTreasuryModalOpen && activeShipmentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-right">
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Wallet className="w-5 h-5" />
                <span>سداد مصروفات جمركية من خزنة المكتب</span>
              </div>
              <button
                onClick={() => setIsTreasuryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">الشحنة المرتبطة:</div>
                <div className="font-bold text-white text-sm">
                  [{activeShipmentForAction.shipmentCode}] {activeShipmentForAction.title}
                </div>
                <div className="text-slate-400">
                  العميل: <strong className="text-slate-200">{activeShipmentForAction.clientName}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">المبلغ المراد سداده (ج.م):</label>
                <input
                  type="number"
                  value={treasuryAmount}
                  onChange={(e) => setTreasuryAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-base font-bold text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">بند المصروف الجمركي:</label>
                <select
                  value={treasuryCategory}
                  onChange={(e) => setTreasuryCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="رسوم ومصروفات جمركية ونافذة">رسوم ومصروفات جمركية ونافذة</option>
                  <option value="أرضيات وغرامات تأخير ميناء (Demurrage)">أرضيات وغرامات تأخير ميناء (Demurrage)</option>
                  <option value="مصاريف تفريغ وعتالة ومناولة">مصاريف تفريغ وعتالة ومناولة</option>
                  <option value="أتعاب المخلص الجمركي">أتعاب المخلص الجمركي</option>
                  <option value="رسوم فحص رقابي (سلامة غذاء / رقابة واردات)">
                    رسوم فحص رقابي (سلامة غذاء / رقابة واردات)
                  </option>
                  <option value="نولون ونقل داخلي للبضاعة">نولون ونقل داخلي للبضاعة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">طريقة السداد من الخزنة:</label>
                <select
                  value={treasuryPaymentMethod}
                  onChange={(e) => setTreasuryPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="CASH">نقداً من الخزنة الرئيسية</option>
                  <option value="BANK_TRANSFER">تحويل بنكي / حساب جاري</option>
                  <option value="CHEQUE">شيك مصرفي مقبول الدفع</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">البيان والشرح:</label>
                <textarea
                  value={treasuryDescription}
                  onChange={(e) => setTreasuryDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
              <button
                onClick={() => setIsTreasuryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmTreasuryPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                تأكيد سداد الإذن وإصدار الإيصال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ARCHIVE MODAL */}
      {isArchiveModalOpen && activeShipmentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-right">
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Archive className="w-5 h-5" />
                <span>أرشفة وثيقة جمركية في الأرشيف الإلكتروني للعميل</span>
              </div>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">ملف العميل:</div>
                <div className="font-bold text-white text-sm">{activeShipmentForAction.clientName}</div>
                <div className="text-slate-400">
                  المجلد المستهدف:{' '}
                  <strong className="text-cyan-400">مستندات الجمارك والتجارة الخارجية</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">عنوان الوثيقة المستندية:</label>
                <input
                  type="text"
                  value={archiveDocTitle}
                  onChange={(e) => setArchiveDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">اسم الملف الرقمي:</label>
                <input
                  type="text"
                  value={archiveDocFileName}
                  onChange={(e) => setArchiveDocFileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">ملاحظات وربط المستند:</label>
                <textarea
                  value={archiveDocRemarks}
                  onChange={(e) => setArchiveDocRemarks(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmArchiveDoc}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                حفظ وإيداع في الأرشيف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINT CUSTOMS DOSSIER */}
      {isPrintModalOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Printer className="w-5 h-5" />
                <span>معاينة وطباعة ملف الشحنة الجمركي المعتمد</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecutePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن كـ PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-6 overflow-y-auto bg-white text-slate-900">
              <div id="customs-dossier-printable" className="p-4 space-y-6 text-xs">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">مكتب المحاسب القانوني ومراقب الحسابات</h2>
                    <p className="text-xs text-slate-600">قطاع تدقيق ومحاسبة الجمارك والتجارة الخارجية</p>
                  </div>
                  <div className="text-left font-mono">
                    <div className="font-bold text-sm">{selectedShipment.shipmentCode}</div>
                    <div className="text-[10px] text-slate-500">التاريخ: {new Date().toISOString().slice(0, 10)}</div>
                  </div>
                </div>

                {/* Dossier Body */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-sm mb-2 text-slate-800">بيانات العملية الجمركية:</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <strong>الشركة / العميل:</strong> {selectedShipment.clientName}
                      </div>
                      <div>
                        <strong>المصدر الأجنبي:</strong> {selectedShipment.foreignExporterName} (
                        {selectedShipment.foreignExporterCountry})
                      </div>
                      <div>
                        <strong>بوليصة الشحن (B/L):</strong> {selectedShipment.blNumber}
                      </div>
                      <div>
                        <strong>رقم القيد الجمركي ACID:</strong> {selectedShipment.acidNumber || '-'}
                      </div>
                      <div>
                        <strong>ميناء الوصول:</strong> {selectedShipment.customsPortOfArrival}
                      </div>
                      <div>
                        <strong>شرط التسليم:</strong> {selectedShipment.incoterm}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-sm mb-2 text-slate-800">
                      بيان احتساب التكلفة الإنزالية والرسوم والضرائب المسددة:
                    </h3>
                    <table className="w-full border-collapse text-right text-xs">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800">
                          <th className="p-2 border border-slate-300">البيان</th>
                          <th className="p-2 border border-slate-300 text-center">المبلغ (EGP)</th>
                          <th className="p-2 border border-slate-300">المعالجة المحاسبية (EAS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border border-slate-300">القيمة للأغراض الجمركية (CIF)</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {selectedShipment.cifValueEgp.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-600">بضاعة بالطريق واعتمادات مستندية</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300">الضريبة الجمركية</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {selectedShipment.customsDutyAmount.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-600">
                            تُرسمل على تكلفة المخزون (EAS 2)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300">رسم تنمية الموارد المالية</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {selectedShipment.developmentFeeAmount.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-600">
                            تُرسمل على تكلفة المخزون (EAS 2)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300">مصاريف الموانئ والتخليص والنقل الداخلي</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {selectedShipment.totalAdditionalExpenses.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-600">
                            تُرسمل على تكلفة المخزون (EAS 2)
                          </td>
                        </tr>
                        <tr className="font-bold bg-emerald-50 text-emerald-950">
                          <td className="p-2 border border-slate-300">إجمالي التكلفة الإنزالية للمخزن</td>
                          <td className="p-2 border border-slate-300 text-center font-mono text-sm">
                            {selectedShipment.totalLandedCostEgp.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300">رصيد حساب المخزون الدخول</td>
                        </tr>
                        <tr className="text-slate-600">
                          <td className="p-2 border border-slate-300">ضريبة القيمة المضافة (14%)</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            {selectedShipment.vatAmount.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300">مدخلات ضريبية قابلة للخصم (مصلحة الضرائب)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between pt-6 border-t border-slate-300 text-xs">
                    <div>
                      <p className="font-bold">المراجع والمحاسب القانوني المسؤول:</p>
                      <p className="mt-4 font-mono font-bold">{state.officeProfile.auditorName}</p>
                      <p className="text-[10px] text-slate-500">رقم السجل: {state.officeProfile.registrationNumber}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 border border-dashed border-slate-400 rounded-lg flex items-center justify-center text-slate-400 text-[10px]">
                        خاتم المكتب الرسمي
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomsHubView;

