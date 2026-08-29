import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  FileText,
  Paperclip,
  Upload,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  DollarSign,
  Printer,
  Lock,
  KeyRound,
  MessageSquare,
  Send,
} from 'lucide-react';
import {
  ClientArchiveRecord,
  ClientProcedureTask,
  ClientDocument,
  ProcedureStatus,
  ProcedureCategory,
  OfficeTreasuryTransaction,
} from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { SecurityAuthModal } from './SecurityAuthModal';
import { ClientDocumentManager } from './ClientDocumentManager';
import { ClientNotificationModal } from './ClientNotificationModal';

interface ClientsArchiveViewProps {
  state: DatabaseState;
}

export const ClientsArchiveView: React.FC<ClientsArchiveViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<ClientArchiveRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PROCEDURES' | 'TREASURY' | 'DOCUMENTS'>('PROCEDURES');
  const [procedureFilterStatus, setProcedureFilterStatus] = useState<string>('ALL');

  // Security Auth for Edit Mode (Mg120)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientArchiveRecord | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Modals
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddProcedureModalOpen, setIsAddProcedureModalOpen] = useState(false);
  const [isQuickTreasuryModalOpen, setIsQuickTreasuryModalOpen] = useState(false);
  const [quickTreasuryType, setQuickTreasuryType] = useState<'FEE' | 'GOV_EXPENSE'>('FEE');
  const [targetProcedure, setTargetProcedure] = useState<ClientProcedureTask | null>(null);

  // Quick Treasury Form
  const [quickTxAmount, setQuickTxAmount] = useState<number>(0);
  const [quickTxMethod, setQuickTxMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'INSTAPAY' | 'CHEQUE'>('CASH');
  const [quickTxNotes, setQuickTxNotes] = useState('');

  // Notification Modal State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTargetClient, setNotifyTargetClient] = useState<ClientArchiveRecord | null>(null);
  const [notifyTargetProcedure, setNotifyTargetProcedure] = useState<ClientProcedureTask | null>(null);

  // New Client Form State
  const [clientFormData, setClientFormData] = useState({
    name: '',
    clientCode: `CL-${String(state.clients.length + 1).padStart(3, '0')}`,
    clientType: 'PRIMARY' as ClientArchiveRecord['clientType'],
    companyType: 'JOINT_STOCK' as ClientArchiveRecord['companyType'],
    commercialRegistrationNo: '',
    taxCardNo: '',
    taxOffice: 'مأمورية ضرائب كبار الممولين / شركات الأموال',
    incomeTaxFileNo: '',
    vatRegistrationNo: '',
    socialInsuranceNo: '',
    capital: 1000000,
    activity: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // New Procedure Form State
  const [procedureFormData, setProcedureFormData] = useState({
    title: '',
    category: 'TAX_AUDIT' as ProcedureCategory,
    description: '',
    assignedTo: state.officeProfile.auditorName || 'محمد جميل مرعي',
    status: 'IN_PROGRESS' as ProcedureStatus,
    priority: 'HIGH' as ClientProcedureTask['priority'],
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    agreedFees: 5000,
    collectedFeesNow: 2500,
    recordFeeInTreasury: true,
    feePaymentMethod: 'CASH' as OfficeTreasuryTransaction['paymentMethod'],
    governmentFeesNow: 500,
    recordGovFeeInTreasury: true,
    govFeePaymentMethod: 'CASH' as OfficeTreasuryTransaction['paymentMethod'],
    notes: '',
  });

  // Get active selected client live from database state
  const liveSelectedClient = selectedClient
    ? state.clients.find((c) => c.id === selectedClient.id) || selectedClient
    : null;

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return state.clients.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.commercialRegistrationNo.includes(term) ||
        c.taxCardNo.includes(term) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(term));

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'PRIMARY' && c.clientType === 'PRIMARY') ||
        (filterType === 'CASUAL' && c.clientType === 'CASUAL') ||
        (filterType === c.companyType);

      return matchesSearch && matchesType;
    });
  }, [state.clients, searchTerm, filterType]);

  // Fast Memoized KPI calculations
  const { totalClientsCount, activeProceduresCount, completedProceduresCount } = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const c of state.clients) {
      if (c.procedures) {
        for (const p of c.procedures) {
          if (p.status === 'COMPLETED') {
            completed++;
          } else if (
            p.status === 'IN_PROGRESS' ||
            p.status === 'PENDING' ||
            p.status === 'AT_AUTHORITY' ||
            p.status === 'PENDING_CLIENT_DOCS'
          ) {
            active++;
          }
        }
      }
    }
    return {
      totalClientsCount: state.clients.length,
      activeProceduresCount: active,
      completedProceduresCount: completed,
    };
  }, [state.clients]);

  const handleRequestEditClient = (client: ClientArchiveRecord) => {
    setClientToEdit(client);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccessClient = () => {
    if (!clientToEdit) return;
    setEditingClientId(clientToEdit.id);
    setClientFormData({
      name: clientToEdit.name,
      clientCode: clientToEdit.clientCode,
      clientType: clientToEdit.clientType,
      companyType: clientToEdit.companyType,
      commercialRegistrationNo: clientToEdit.commercialRegistrationNo || '',
      taxCardNo: clientToEdit.taxCardNo || '',
      taxOffice: clientToEdit.taxOffice || '',
      incomeTaxFileNo: clientToEdit.incomeTaxFileNo || '',
      vatRegistrationNo: clientToEdit.vatRegistrationNo || '',
      socialInsuranceNo: clientToEdit.socialInsuranceNo || '',
      capital: clientToEdit.capital || 0,
      activity: clientToEdit.activity || '',
      contactPerson: clientToEdit.contactPerson || '',
      phone: clientToEdit.phone || '',
      email: clientToEdit.email || '',
      address: clientToEdit.address || '',
      notes: clientToEdit.notes || '',
    });
    setIsAuthModalOpen(false);
    setIsAddClientModalOpen(true);
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name) {
      alert('يرجى كتابة اسم الشركة أو المنشأة');
      return;
    }

    if (editingClientId) {
      db.updateClient(editingClientId, {
        clientCode: clientFormData.clientCode,
        name: clientFormData.name,
        clientType: clientFormData.clientType,
        companyType: clientFormData.companyType,
        commercialRegistrationNo: clientFormData.commercialRegistrationNo,
        taxCardNo: clientFormData.taxCardNo,
        taxOffice: clientFormData.taxOffice,
        incomeTaxFileNo: clientFormData.incomeTaxFileNo,
        vatRegistrationNo: clientFormData.vatRegistrationNo,
        socialInsuranceNo: clientFormData.socialInsuranceNo,
        capital: Number(clientFormData.capital) || 0,
        activity: clientFormData.activity,
        contactPerson: clientFormData.contactPerson,
        phone: clientFormData.phone,
        email: clientFormData.email,
        address: clientFormData.address,
        notes: clientFormData.notes,
      });

      alert('تم حفظ وتحديث بيانات العميل والملف الضريبي بنجاح بعد التحقق من الرقم السري (Mg120).');
      setIsAddClientModalOpen(false);
      setEditingClientId(null);
      setClientToEdit(null);
    } else {
      const created = db.addClient({
        clientCode: clientFormData.clientCode || `CL-${Date.now().toString().slice(-4)}`,
        name: clientFormData.name,
        clientType: clientFormData.clientType,
        companyType: clientFormData.companyType,
        commercialRegistrationNo: clientFormData.commercialRegistrationNo,
        taxCardNo: clientFormData.taxCardNo,
        taxOffice: clientFormData.taxOffice,
        incomeTaxFileNo: clientFormData.incomeTaxFileNo,
        vatRegistrationNo: clientFormData.vatRegistrationNo,
        socialInsuranceNo: clientFormData.socialInsuranceNo,
        capital: Number(clientFormData.capital) || 0,
        partners: [],
        activity: clientFormData.activity,
        contactPerson: clientFormData.contactPerson,
        phone: clientFormData.phone,
        email: clientFormData.email,
        address: clientFormData.address,
        documents: [],
        procedures: [],
        tasksHistory: [],
        notes: clientFormData.notes,
      });

      setIsAddClientModalOpen(false);
      setSelectedClient(created);
      setActiveTab('PROCEDURES');
    }
  };

  const handleAddProcedureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSelectedClient) return;
    if (!procedureFormData.title) {
      alert('يرجى كتابة عنوان الإجراء أو المعاملة');
      return;
    }

    db.addClientProcedure(
      liveSelectedClient.id,
      {
        title: procedureFormData.title,
        category: procedureFormData.category,
        description: procedureFormData.description,
        assignedTo: procedureFormData.assignedTo,
        status: procedureFormData.status,
        priority: procedureFormData.priority,
        startDate: procedureFormData.startDate,
        dueDate: procedureFormData.dueDate,
        agreedFees: Number(procedureFormData.agreedFees) || 0,
        collectedFees: Number(procedureFormData.collectedFeesNow) || 0,
        governmentFees: Number(procedureFormData.governmentFeesNow) || 0,
        progressPercent: procedureFormData.status === 'COMPLETED' ? 100 : procedureFormData.status === 'IN_PROGRESS' ? 30 : 10,
        notes: procedureFormData.notes,
      },
      {
        recordFeeInTreasury: procedureFormData.recordFeeInTreasury,
        feePaymentMethod: procedureFormData.feePaymentMethod,
        recordGovFeeInTreasury: procedureFormData.recordGovFeeInTreasury,
        govFeePaymentMethod: procedureFormData.govFeePaymentMethod,
      }
    );

    setIsAddProcedureModalOpen(false);
    setProcedureFormData({
      title: '',
      category: 'TAX_AUDIT',
      description: '',
      assignedTo: state.officeProfile.auditorName || 'محمد جميل مرعي',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      agreedFees: 5000,
      collectedFeesNow: 2500,
      recordFeeInTreasury: true,
      feePaymentMethod: 'CASH',
      governmentFeesNow: 500,
      recordGovFeeInTreasury: true,
      govFeePaymentMethod: 'CASH',
      notes: '',
    });
  };

  const handleQuickTreasurySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSelectedClient) return;
    if (quickTxAmount <= 0) {
      alert('يرجى كتابة مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (quickTreasuryType === 'FEE') {
      // Record Fee
      if (targetProcedure) {
        db.updateClientProcedure(
          liveSelectedClient.id,
          targetProcedure.id,
          {},
          {
            addFeeCollected: quickTxAmount,
            feePaymentMethod: quickTxMethod,
          }
        );
      } else {
        db.addTreasuryTransaction({
          date: new Date().toISOString().slice(0, 10),
          type: 'INCOME_FEES',
          category: 'أتعاب مهنية محصلة لحساب العميل',
          amount: quickTxAmount,
          clientId: liveSelectedClient.id,
          clientName: liveSelectedClient.name,
          paymentMethod: quickTxMethod,
          description: quickTxNotes || `تحصيل أتعاب مهنية من العميل: ${liveSelectedClient.name}`,
          recordedBy: state.officeProfile.auditorName || 'محمد جميل مرعي',
        });
      }
    } else {
      // Record Gov Expense
      if (targetProcedure) {
        db.updateClientProcedure(
          liveSelectedClient.id,
          targetProcedure.id,
          {},
          {
            addGovFeePaid: quickTxAmount,
            govFeePaymentMethod: quickTxMethod,
          }
        );
      } else {
        db.addTreasuryTransaction({
          date: new Date().toISOString().slice(0, 10),
          type: 'EXPENSE_CLIENT_GOV_FEE',
          category: 'رسوم ومصروفات حكومية مسددة لحساب العميل',
          amount: quickTxAmount,
          clientId: liveSelectedClient.id,
          clientName: liveSelectedClient.name,
          paymentMethod: quickTxMethod,
          description: quickTxNotes || `سداد رسوم ومصروفات حكومية لحساب العميل: ${liveSelectedClient.name}`,
          recordedBy: state.officeProfile.auditorName || 'محمد جميل مرعي',
        });
      }
    }

    setIsQuickTreasuryModalOpen(false);
    setQuickTxAmount(0);
    setQuickTxNotes('');
    setTargetProcedure(null);
  };

  const handleUpdateProcedureStatus = (procedureId: string, newStatus: ProcedureStatus) => {
    if (!liveSelectedClient) return;
    db.updateClientProcedure(liveSelectedClient.id, procedureId, {
      status: newStatus,
      progressPercent: newStatus === 'COMPLETED' ? 100 : newStatus === 'AT_AUTHORITY' ? 70 : newStatus === 'IN_PROGRESS' ? 40 : 15,
    });
  };

  const handleUpdateProcedureProgress = (procedureId: string, progress: number) => {
    if (!liveSelectedClient) return;
    db.updateClientProcedure(liveSelectedClient.id, procedureId, {
      progressPercent: progress,
      status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'PENDING',
    });
  };

  const handleDeleteProcedure = (procedureId: string, title: string) => {
    if (!liveSelectedClient) return;
    if (confirm(`هل أنت متأكد من حذف الإجراء [${title}] من سجل العميل؟`)) {
      db.deleteClientProcedure(liveSelectedClient.id, procedureId);
    }
  };

  const handleAddSampleDoc = (client: ClientArchiveRecord) => {
    const docName = prompt('أدخل اسم المستند المرفق (مثال: السجل التجاري المحدث 2026):');
    if (!docName) return;

    const newDoc: ClientDocument = {
      id: `doc-${Date.now()}`,
      title: docName,
      documentType: 'COMMERCIAL_REG',
      fileDataUrl: '#',
      fileName: `${docName}.pdf`,
      fileSize: '2.1 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };

    const updatedDocs = [...(client.documents || []), newDoc];
    db.updateClient(client.id, {
      documents: updatedDocs,
    });
  };

  // Status Badge Helper
  const renderStatusBadge = (status: ProcedureStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            <span>مكتمل ومعتمد ✅</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" />
            <span>جاري العمل والتنفيذ ⏳</span>
          </span>
        );
      case 'AT_AUTHORITY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <Building2 className="w-3 h-3" />
            <span>لدى الجهة الحكومية 🏛️</span>
          </span>
        );
      case 'PENDING_CLIENT_DOCS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            <span>بانتظار مستندات العميل ⚠️</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            <Clock className="w-3 h-3" />
            <span>قيد التجهيز 📋</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <span>ملغي / معلق ✕</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderCategoryBadge = (cat: ProcedureCategory) => {
    const map: Record<ProcedureCategory, { text: string; bg: string }> = {
      TAX_AUDIT: { text: 'فحص ضريبي ولجان', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
      TAX_DECLARATION: { text: 'إقرارات ضريبية', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      COMPANY_ESTABLISHMENT: { text: 'تأسيس وتعديل شركات', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      COMMERCIAL_REGISTRY: { text: 'سجل تجاري وغرف', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
      FINANCIAL_AUDIT: { text: 'مراجعة واعتماد قوائم', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      FEASIBILITY_STUDY: { text: 'دراسات جدوى', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
      PROFESSIONAL_CERT: { text: 'شهادات مهنية ودخل', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      SOCIAL_INSURANCE: { text: 'تأمينات وملف عمالة', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      GOV_FEE_PAYMENT: { text: 'سداد رسوم حكومية', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
      GENERAL_CONSULTING: { text: 'استشارات مالية', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
    };
    const c = map[cat] || { text: cat, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${c.bg}`}>
        {c.text}
      </span>
    );
  };

  const clientSummary = liveSelectedClient ? db.getClientTreasurySummary(liveSelectedClient.id) : null;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              أرشيف العملاء وسجل الإجراءات والربط المالي بالخزنة
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة متكاملة لملفات الشركات والعملاء، متابعة الإجراءات والمهام الفنية والإدارية، والربط التلقائي لتحصيل الأتعاب وسداد الرسوم الحكومية بخزنة المكتب.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => db.exportTableToExcel('CLIENTS')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير الأرشيف إكسل</span>
          </button>
          <button
            onClick={() => setIsAddClientModalOpen(true)}
            id="btn-add-client"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شركة / عميل جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Top Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 block">إجمالي الشركات والملفات</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {totalClientsCount} عميل
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 block">إجراءات جارية وقيد التنفيذ</span>
            <span className="text-xl font-bold text-blue-700 mt-1 block">
              {activeProceduresCount} إجراء
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 block">إجراءات مكتملة ومعتمدة</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">
              {completedProceduresCount} إجراء
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 block">سندات خزنة مرتبطة بالعملاء</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">
              {state.treasuryTransactions.filter((t) => t.clientId).length} سند
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الشركة، السجل التجاري، أو البطاقة الضريبية..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          <span className="text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> تصفية:
          </span>
          {[
            { id: 'ALL', label: 'كافة العملاء' },
            { id: 'PRIMARY', label: 'عملاء رئيسيون' },
            { id: 'JOINT_STOCK', label: 'شركات مساهمة' },
            { id: 'LLC', label: 'شركات مسؤولة محدودة' },
            { id: 'CASUAL', label: 'مهن حرة وعابر' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const procedures = client.procedures || [];
          const activeProcs = procedures.filter(
            (p) => p.status === 'IN_PROGRESS' || p.status === 'AT_AUTHORITY' || p.status === 'PENDING_CLIENT_DOCS'
          );
          const completedProcs = procedures.filter((p) => p.status === 'COMPLETED');
          const summary = db.getClientTreasurySummary(client.id);

          return (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {client.companyType === 'JOINT_STOCK'
                          ? 'شركة مساهمة (ش.م.م)'
                          : client.companyType === 'LLC'
                          ? 'مسؤولية محدودة (ش.ذ.م.م)'
                          : client.companyType === 'SOLE_PROPRIETORSHIP'
                          ? 'منشأة فردية'
                          : client.companyType === 'PARTNERSHIP'
                          ? 'شركة أشخاص / تضامن'
                          : 'مهن حرة'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {client.clientCode}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{client.name}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Building className="w-4 h-4 text-emerald-800" />
                  </div>
                </div>

                {/* Company Info */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">سجل تجاري:</span>
                    <span className="font-mono font-bold text-slate-800">{client.commercialRegistrationNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">بطاقة ضريبية:</span>
                    <span className="font-mono font-bold text-slate-800">{client.taxCardNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">مأمورية الضرائب:</span>
                    <span className="text-slate-800 text-[11px] truncate max-w-[160px]">{client.taxOffice || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المسؤول:</span>
                    <span className="text-slate-800 font-medium">{client.contactPerson || '-'}</span>
                  </div>
                </div>

                {/* Procedures & Treasury Summary Pills */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-blue-50/80 border border-blue-100 p-2 rounded-xl text-blue-900">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 font-medium">الإجراءات:</span>
                      <span className="font-bold">{procedures.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-700">
                      <span>⏳ {activeProcs.length} جارية</span>
                      <span>•</span>
                      <span>✅ {completedProcs.length} تمت</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-100 p-2 rounded-xl text-amber-900">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 font-medium">أتعاب محصلة:</span>
                      <span className="font-bold">{formatEgyptianCurrency(summary.totalCollectedFees)}</span>
                    </div>
                    <div className="text-[10px] text-amber-700 mt-1 flex justify-between">
                      <span>متبقي:</span>
                      <span className="font-bold">{formatEgyptianCurrency(summary.remainingFeesDue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{client.documents?.length || 0} مستندات</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setNotifyTargetClient(client);
                      setNotifyTargetProcedure(null);
                      setIsNotifyModalOpen(true);
                    }}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="إرسال إشعار / رسالة للعميل (واتساب - بريد)"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">إشعار</span>
                  </button>
                  <button
                    onClick={() => handleRequestEditClient(client)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="تعديل بيانات الشركة والملف الضريبي (يتطلب الرقم السري Mg120)"
                  >
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClient(client);
                      setActiveTab('PROCEDURES');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>فتح ملف العمليات</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Client Dossier Modal */}
      {liveSelectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 text-xs my-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{liveSelectedClient.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {liveSelectedClient.clientCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {liveSelectedClient.taxOffice} • سجل تجاري: {liveSelectedClient.commercialRegistrationNo || 'غير محدد'} • بطاقة: {liveSelectedClient.taxCardNo || 'غير محدد'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNotifyTargetClient(liveSelectedClient);
                    setNotifyTargetProcedure(null);
                    setIsNotifyModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="إرسال إشعار / رسالة للعميل (واتساب - بريد)"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>إشعار العميل</span>
                </button>
                <button
                  onClick={() => handleRequestEditClient(liveSelectedClient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="تعديل بيانات الشركة والملف الضريبي (يتطلب الرقم السري Mg120)"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>تعديل (Mg120)</span>
                </button>
                <button
                  onClick={() => setIsAddProcedureModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة إجراء / عملية</span>
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pt-3 pb-2 shrink-0 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveTab('PROCEDURES')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'PROCEDURES'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>سجل الإجراءات والمهام والتنفيذ ({liveSelectedClient.procedures?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('TREASURY')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'TREASURY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>كشف حساب الخزنة والأتعاب والرسوم ({clientSummary?.transactions.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('DETAILS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'DETAILS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>بيانات الشركة والملف الضريبي</span>
              </button>

              <button
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'DOCUMENTS'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span>المستندات والأرشيف الإلكتروني ({liveSelectedClient.documents?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {/* TAB 1: PROCEDURES / WORKFLOWS */}
              {activeTab === 'PROCEDURES' && (
                <div className="space-y-4">
                  {/* Procedures Summary Header */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-slate-500 font-bold">حالة الإجراءات:</span>
                      <button
                        onClick={() => setProcedureFilterStatus('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          procedureFilterStatus === 'ALL'
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        الكل ({(liveSelectedClient.procedures || []).length})
                      </button>
                      <button
                        onClick={() => setProcedureFilterStatus('IN_PROGRESS')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          procedureFilterStatus === 'IN_PROGRESS'
                            ? 'bg-blue-700 text-white'
                            : 'bg-white text-blue-700 border border-blue-200'
                        }`}
                      >
                        جاري العمل ({(liveSelectedClient.procedures || []).filter((p) => p.status === 'IN_PROGRESS').length})
                      </button>
                      <button
                        onClick={() => setProcedureFilterStatus('AT_AUTHORITY')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          procedureFilterStatus === 'AT_AUTHORITY'
                            ? 'bg-purple-700 text-white'
                            : 'bg-white text-purple-700 border border-purple-200'
                        }`}
                      >
                        لدى جهة حكومية ({(liveSelectedClient.procedures || []).filter((p) => p.status === 'AT_AUTHORITY').length})
                      </button>
                      <button
                        onClick={() => setProcedureFilterStatus('COMPLETED')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          procedureFilterStatus === 'COMPLETED'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        مكتملة ({(liveSelectedClient.procedures || []).filter((p) => p.status === 'COMPLETED').length})
                      </button>
                    </div>

                    <button
                      onClick={() => setIsAddProcedureModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة إجراء جديد</span>
                    </button>
                  </div>

                  {/* Procedures List */}
                  {(!liveSelectedClient.procedures || liveSelectedClient.procedures.length === 0) ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-slate-500 font-medium">لم يتم تسجيل أي إجراءات أو مهام لهذا العميل حتى الآن.</p>
                      <button
                        onClick={() => setIsAddProcedureModalOpen(true)}
                        className="px-4 py-2 bg-emerald-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل أول إجراء مع تحديد الأتعاب والرسوم</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {liveSelectedClient.procedures
                        .filter(
                          (p) => procedureFilterStatus === 'ALL' || p.status === procedureFilterStatus
                        )
                        .map((proc) => {
                          const remainingFee = Math.max(0, proc.agreedFees - (proc.collectedFees || 0));

                          return (
                            <div
                              key={proc.id}
                              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                            >
                              {/* Header row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {proc.procedureCode}
                                    </span>
                                    {renderCategoryBadge(proc.category)}
                                    {renderStatusBadge(proc.status)}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      proc.priority === 'URGENT'
                                        ? 'bg-rose-100 text-rose-800'
                                        : proc.priority === 'HIGH'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      أولوية {proc.priority === 'URGENT' ? 'عاجلة جداً' : proc.priority === 'HIGH' ? 'عالية' : 'عادية'}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-900 mt-1">{proc.title}</h4>
                                  {proc.description && (
                                    <p className="text-slate-600 text-xs">{proc.description}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  <button
                                    onClick={() => {
                                      setNotifyTargetClient(liveSelectedClient);
                                      setNotifyTargetProcedure(proc);
                                      setIsNotifyModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold border border-teal-200 flex items-center gap-1 cursor-pointer"
                                    title="إشعار العميل بمستجدات هذا الإجراء عبر واتساب أو البريد"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                                    <span className="hidden sm:inline">إشعار بالإجراء</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTargetProcedure(proc);
                                      setQuickTreasuryType('FEE');
                                      setQuickTxAmount(remainingFee > 0 ? remainingFee : 1000);
                                      setIsQuickTreasuryModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>تحصيل أتعاب</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTargetProcedure(proc);
                                      setQuickTreasuryType('GOV_EXPENSE');
                                      setQuickTxAmount(500);
                                      setIsQuickTreasuryModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />
                                    <span>سداد رسوم</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProcedure(proc.id, proc.title)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    title="حذف الإجراء"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Progress bar and Status change */}
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">نسبة الإنجاز:</span>
                                    <span className="font-bold text-slate-800">{proc.progressPercent}%</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <span>المسؤول: <strong>{proc.assignedTo}</strong></span>
                                    <span>•</span>
                                    <span>البدء: <strong>{proc.startDate}</strong></span>
                                    <span>•</span>
                                    <span>الاستحقاق: <strong>{proc.dueDate}</strong></span>
                                  </div>
                                </div>

                                {/* Progress Bar Track */}
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      proc.progressPercent === 100
                                        ? 'bg-emerald-600'
                                        : proc.progressPercent > 50
                                        ? 'bg-blue-600'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${proc.progressPercent}%` }}
                                  ></div>
                                </div>

                                {/* Quick state and progress controls */}
                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <span className="text-slate-400">تعديل النسبة:</span>
                                    {[25, 50, 75, 100].map((val) => (
                                      <button
                                        key={val}
                                        onClick={() => handleUpdateProcedureProgress(proc.id, val)}
                                        className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer ${
                                          proc.progressPercent === val
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {val}%
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-1 text-[10px]">
                                    <span className="text-slate-400">تغيير الحالة:</span>
                                    <select
                                      value={proc.status}
                                      onChange={(e) => handleUpdateProcedureStatus(proc.id, e.target.value as ProcedureStatus)}
                                      className="bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-800 cursor-pointer"
                                    >
                                      <option value="PENDING">قيد التجهيز</option>
                                      <option value="IN_PROGRESS">جاري العمل والتنفيذ</option>
                                      <option value="AT_AUTHORITY">لدى الجهة الحكومية</option>
                                      <option value="PENDING_CLIENT_DOCS">بانتظار مستندات</option>
                                      <option value="COMPLETED">مكتمل ومعتمد</option>
                                      <option value="CANCELLED">ملغي</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Financial & Treasury sync box */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">الأتعاب المتفق عليها:</span>
                                  <span className="font-bold text-slate-900 font-mono">
                                    {formatEgyptianCurrency(proc.agreedFees)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-emerald-600 block text-[10px]">الأتعاب المحصلة بالخزنة:</span>
                                  <span className="font-bold text-emerald-700 font-mono">
                                    {formatEgyptianCurrency(proc.collectedFees || 0)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-rose-600 block text-[10px]">المتبقي على العميل:</span>
                                  <span className="font-bold text-rose-700 font-mono">
                                    {formatEgyptianCurrency(remainingFee)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">رسوم حكومية مسددة:</span>
                                  <span className="font-bold text-slate-800 font-mono">
                                    {formatEgyptianCurrency(proc.governmentFees || 0)}
                                  </span>
                                </div>
                              </div>

                              {/* Treasury Vouchers linked */}
                              {(proc.feeTreasuryVouchers?.length || proc.expenseTreasuryVouchers?.length) ? (
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                                  <span className="text-slate-400 font-medium">سندات الخزنة المرتبطة:</span>
                                  {proc.feeTreasuryVouchers?.map((v) => (
                                    <span key={v} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                                      📥 قبض: {v}
                                    </span>
                                  ))}
                                  {proc.expenseTreasuryVouchers?.map((v) => (
                                    <span key={v} className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                                      📤 صرف رسوم: {v}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TREASURY & FEE STATEMENT */}
              {activeTab === 'TREASURY' && clientSummary && (
                <div className="space-y-4">
                  {/* Financial Summary KPI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">إجمالي أتعاب العمليات</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block">
                        {formatEgyptianCurrency(clientSummary.totalAgreedFees)}
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block">الأتعاب المحصلة فعلياً</span>
                      <span className="text-lg font-bold text-emerald-800 mt-1 block">
                        {formatEgyptianCurrency(clientSummary.totalCollectedFees)}
                      </span>
                    </div>

                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-amber-700 block">رسوم حكومية مسددة</span>
                      <span className="text-lg font-bold text-amber-800 mt-1 block">
                        {formatEgyptianCurrency(clientSummary.totalGovFeesPaid)}
                      </span>
                    </div>

                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-rose-700 block">صافي المتبقي على العميل</span>
                      <span className="text-lg font-bold text-rose-800 mt-1 block">
                        {formatEgyptianCurrency(clientSummary.remainingFeesDue)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-amber-700" />
                      <span className="font-bold text-slate-900">سجل حركات وسندات الخزنة الخاصة بالعميل</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTargetProcedure(null);
                          setQuickTreasuryType('FEE');
                          setQuickTxAmount(clientSummary.remainingFeesDue > 0 ? clientSummary.remainingFeesDue : 5000);
                          setIsQuickTreasuryModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>تسجيل سند قبض أتعاب</span>
                      </button>

                      <button
                        onClick={() => {
                          setTargetProcedure(null);
                          setQuickTreasuryType('GOV_EXPENSE');
                          setQuickTxAmount(1000);
                          setIsQuickTreasuryModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>سداد رسوم حكومية</span>
                      </button>
                    </div>
                  </div>

                  {/* Treasury Transactions Table */}
                  {clientSummary.transactions.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                      لا توجد حركات مالية مسجلة بالخزنة لهذا العميل حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                            <th className="py-2.5 px-3">رقم السند</th>
                            <th className="py-2.5 px-3">التاريخ</th>
                            <th className="py-2.5 px-3">نوع الحركة</th>
                            <th className="py-2.5 px-3">الإجراء / العملية</th>
                            <th className="py-2.5 px-3">البيان والشرح</th>
                            <th className="py-2.5 px-3">طريقة الدفع</th>
                            <th className="py-2.5 px-3 text-left">المبلغ (ج.م)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientSummary.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.voucherNumber}</td>
                              <td className="py-2.5 px-3 text-slate-600">{tx.date}</td>
                              <td className="py-2.5 px-3">
                                {tx.type === 'INCOME_FEES' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <ArrowDownLeft className="w-3 h-3" /> قبض أتعاب
                                  </span>
                                ) : tx.type === 'EXPENSE_CLIENT_GOV_FEE' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <ArrowUpRight className="w-3 h-3" /> سداد رسوم حكومية
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                                    {tx.type}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[200px] truncate">
                                {tx.procedureTitle || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[250px] truncate">{tx.description}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                                  {tx.paymentMethod === 'CASH'
                                    ? 'نقداً'
                                    : tx.paymentMethod === 'INSTAPAY'
                                    ? 'إنستاباي'
                                    : tx.paymentMethod === 'BANK_TRANSFER'
                                    ? 'تحويل بنكي'
                                    : 'شيك'}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 text-left font-mono font-bold ${
                                tx.type === 'INCOME_FEES' ? 'text-emerald-700' : 'text-rose-700'
                              }`}>
                                {tx.type === 'INCOME_FEES' ? '+' : '-'} {formatEgyptianCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COMPANY DETAILS & TAX CARD */}
              {activeTab === 'DETAILS' && (
                <div className="space-y-4">
                  {/* Read-Only Protection Notice & Edit Action */}
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-950">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs">
                        بيانات الشركة والملف الضريبي معروضة في <strong>وضع القراءة والحماية</strong>. لتعديل البيانات يرجى الضغط على زر التعديل وإدخال الرقم السري.
                      </span>
                    </div>
                    <button
                      onClick={() => handleRequestEditClient(liveSelectedClient)}
                      className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>تعديل البيانات (Mg120)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block mb-0.5">رقم السجل التجاري:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {liveSelectedClient.commercialRegistrationNo || 'غير مسجل'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">رقم التسجيل الضريبي (البطاقة الضريبية):</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {liveSelectedClient.taxCardNo || 'غير مسجل'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">مأمورية الضرائب التابع لها:</span>
                      <span className="font-bold text-slate-900">{liveSelectedClient.taxOffice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">رقم ملف ضريبة الدخل:</span>
                      <span className="font-mono font-bold text-slate-900">{liveSelectedClient.incomeTaxFileNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">التسجيل بضريبة القيمة المضافة (VAT):</span>
                      <span className="font-mono font-bold text-slate-900">{liveSelectedClient.vatRegistrationNo || 'غير مسجل'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">الرقم التأميني للمنشأة (التأمينات الاجتماعية):</span>
                      <span className="font-mono font-bold text-slate-900">{liveSelectedClient.socialInsuranceNo || 'غير مسجل'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">رأس المال المصدر / المدفوع:</span>
                      <span className="font-bold text-slate-900">{formatEgyptianCurrency(liveSelectedClient.capital || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">الشكل والكيان القانوني:</span>
                      <span className="font-bold text-slate-900">{liveSelectedClient.companyType}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900">بيانات الاتصال والتواصل:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">الشخص المسؤول / المفوض:</span>
                        <span className="font-bold text-slate-800">{liveSelectedClient.contactPerson || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">الهاتف:</span>
                        <span className="font-mono font-bold text-slate-800">{liveSelectedClient.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">البريد الإلكتروني:</span>
                        <span className="font-mono text-slate-800">{liveSelectedClient.email || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">العنوان والمقر:</span>
                      <span className="text-slate-800">{liveSelectedClient.address || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">النشاط والأغراض:</span>
                      <span className="text-slate-800">{liveSelectedClient.activity || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ATTACHED DOCUMENTS & FOLDERS */}
              {activeTab === 'DOCUMENTS' && (
                <ClientDocumentManager client={liveSelectedClient} />
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Procedure Modal with Treasury Integration */}
      {isAddProcedureModalOpen && liveSelectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">إضافة إجراء / عملية لملف العميل</h3>
                  <span className="text-slate-500 text-xs">{liveSelectedClient.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddProcedureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProcedureSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان الإجراء / المعاملة المطلوبة *</label>
                <input
                  type="text"
                  required
                  value={procedureFormData.title}
                  onChange={(e) => setProcedureFormData({ ...procedureFormData, title: e.target.value })}
                  placeholder="مثال: فحص ضريبي لملف كسب العمل والدمغة، استخراج سجل تجاري..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تصنيف المعاملة</label>
                  <select
                    value={procedureFormData.category}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, category: e.target.value as ProcedureCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="TAX_AUDIT">فحص ضريبي ولجان طعن</option>
                    <option value="TAX_DECLARATION">إعداد وتقديم إقرارات ضريبية</option>
                    <option value="FINANCIAL_AUDIT">مراجعة واعتماد قوائم مالية</option>
                    <option value="COMPANY_ESTABLISHMENT">تأسيس وتعديل شركات</option>
                    <option value="COMMERCIAL_REGISTRY">استخراج وتجديد سجل تجاري</option>
                    <option value="PROFESSIONAL_CERT">شهادة مهنية وإثبات دخل</option>
                    <option value="FEASIBILITY_STUDY">دراسة جدوى اقتصادية</option>
                    <option value="SOCIAL_INSURANCE">تأمينات اجتماعية وملف عمالة</option>
                    <option value="GOV_FEE_PAYMENT">سداد رسوم حكومية</option>
                    <option value="GENERAL_CONSULTING">استشارات وخدمات محاسبية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المحاسب / المراجع المسؤول</label>
                  <input
                    type="text"
                    value={procedureFormData.assignedTo}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={procedureFormData.startDate}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق المتوقع</label>
                  <input
                    type="date"
                    value={procedureFormData.dueDate}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حالة الإجراء الأولية</label>
                  <select
                    value={procedureFormData.status}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, status: e.target.value as ProcedureStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="IN_PROGRESS">جاري العمل والتنفيذ ⏳</option>
                    <option value="AT_AUTHORITY">لدى الجهة الحكومية 🏛️</option>
                    <option value="PENDING_CLIENT_DOCS">بانتظار مستندات من العميل ⚠️</option>
                    <option value="PENDING">قيد التجهيز 📋</option>
                    <option value="COMPLETED">مكتمل ومعتمد ✅</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">درجة الأولوية</label>
                  <select
                    value={procedureFormData.priority}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="HIGH">عالية</option>
                    <option value="URGENT">عاجلة جداً</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="LOW">عادية</option>
                  </select>
                </div>
              </div>

              {/* Financial Treasury Integration Block */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <span>الربط المالي وسندات خزنة المكتب (Office Treasury)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">إجمالي الأتعاب المتفق عليها (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={procedureFormData.agreedFees}
                      onChange={(e) => setProcedureFormData({ ...procedureFormData, agreedFees: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">دفعة أتعاب محصلة الآن (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={procedureFormData.collectedFeesNow}
                      onChange={(e) => setProcedureFormData({ ...procedureFormData, collectedFeesNow: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={procedureFormData.recordFeeInTreasury}
                      onChange={(e) => setProcedureFormData({ ...procedureFormData, recordFeeInTreasury: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span className="font-medium text-slate-700 text-[11px]">
                      إنشاء سند قبض أتعاب بالخزنة تلقائياً بالمبلغ المحصل
                    </span>
                  </label>

                  <select
                    value={procedureFormData.feePaymentMethod}
                    onChange={(e) => setProcedureFormData({ ...procedureFormData, feePaymentMethod: e.target.value as any })}
                    className="bg-white border border-slate-300 text-[11px] px-2 py-1 rounded-lg"
                  >
                    <option value="CASH">نقداً بالخزنة</option>
                    <option value="INSTAPAY">إنستاباي</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CHEQUE">شيك بنكي</option>
                  </select>
                </div>

                {/* Government fees */}
                <div className="pt-2 border-t border-amber-200/60 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رسوم ومصروفات حكومية مسددة (ج.م)</label>
                      <input
                        type="number"
                        min="0"
                        value={procedureFormData.governmentFeesNow}
                        onChange={(e) => setProcedureFormData({ ...procedureFormData, governmentFeesNow: Number(e.target.value) })}
                        placeholder="رسوم سجل، دمغات، نشر..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-700"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={procedureFormData.recordGovFeeInTreasury}
                          onChange={(e) => setProcedureFormData({ ...procedureFormData, recordGovFeeInTreasury: e.target.checked })}
                          className="rounded border-slate-300 text-rose-600"
                        />
                        <span className="font-medium text-slate-700 text-[11px]">
                          قيد سند صرف رسوم من الخزنة لحساب العميل
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات وشروط المعاملة</label>
                <textarea
                  rows={2}
                  value={procedureFormData.notes}
                  onChange={(e) => setProcedureFormData({ ...procedureFormData, notes: e.target.value })}
                  placeholder="أي تفاصيل أو متطلبات للملف..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProcedureModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  حفظ الإجراء وترحيل السندات للخزنة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Treasury Modal (Receive Fee or Pay Gov Expense) */}
      {isQuickTreasuryModalOpen && liveSelectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className={`w-5 h-5 ${quickTreasuryType === 'FEE' ? 'text-emerald-700' : 'text-rose-700'}`} />
                <h3 className="text-base font-bold text-slate-900">
                  {quickTreasuryType === 'FEE' ? 'تحصيل أتعاب مهنية بالخزنة' : 'سداد رسوم حكومية من الخزنة'}
                </h3>
              </div>
              <button
                onClick={() => setIsQuickTreasuryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickTreasurySubmit} className="space-y-3.5 mt-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">العميل:</span>
                  <span className="font-bold text-slate-900">{liveSelectedClient.name}</span>
                </div>
                {targetProcedure && (
                  <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
                    <span className="text-slate-500">الإجراء المرتبط:</span>
                    <span className="font-bold text-slate-800">{targetProcedure.title}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quickTxAmount}
                  onChange={(e) => setQuickTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {numberToArabicWords(quickTxAmount)}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">طريقة الدفع / الاستلام</label>
                <select
                  value={quickTxMethod}
                  onChange={(e) => setQuickTxMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="CASH">نقداً بالخزنة الرئيسية</option>
                  <option value="INSTAPAY">تحويل إنستاباي فوري (InstaPay)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي مباشر</option>
                  <option value="CHEQUE">شيك بنكي مقبول الدفع</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البيان والشرح</label>
                <input
                  type="text"
                  value={quickTxNotes}
                  onChange={(e) => setQuickTxNotes(e.target.value)}
                  placeholder="بيان سند الخزنة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickTreasuryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs cursor-pointer ${
                    quickTreasuryType === 'FEE'
                      ? 'bg-emerald-700 hover:bg-emerald-600'
                      : 'bg-rose-700 hover:bg-rose-600'
                  }`}
                >
                  إصدار سند الخزنة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingClientId ? 'تعديل بيانات الشركة والملف الضريبي (وضع التعديل المصرح به)' : 'إضافة شركة / عميل جديد للأرشيف'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddClientModalOpen(false);
                  setEditingClientId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editingClientId && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم التحقق من الرقم السري (Mg120) بنجاح. يمكنك الآن تعديل بيانات ملف العميل وحفظها.</span>
              </div>
            )}

            <form onSubmit={handleAddClientSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الشركة أو المنشأة بالكامل *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  placeholder="مثال: شركة النيل للتجارة الهندسية (ش.م.م)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الشكل القانوني</label>
                  <select
                    value={clientFormData.companyType}
                    onChange={(e) => setClientFormData({ ...clientFormData, companyType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="JOINT_STOCK">شركة مساهمة مصرية (ش.م.م)</option>
                    <option value="LLC">شركة ذات مسؤولية محدودة (ش.ذ.م.م)</option>
                    <option value="SOLE_PROPRIETORSHIP">منشأة فردية</option>
                    <option value="PARTNERSHIP">شركة تضامن / توصية بسيطة</option>
                    <option value="INDIVIDUAL">فردي / مهني</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم السجل التجاري</label>
                  <input
                    type="text"
                    value={clientFormData.commercialRegistrationNo}
                    onChange={(e) => setClientFormData({ ...clientFormData, commercialRegistrationNo: e.target.value })}
                    placeholder="مثال: 148293 جنوب القاهرة"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم التسجيل الضريبي (البطاقة)</label>
                  <input
                    type="text"
                    value={clientFormData.taxCardNo}
                    onChange={(e) => setClientFormData({ ...clientFormData, taxCardNo: e.target.value })}
                    placeholder="مثال: 489-201-987"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">مأمورية الضرائب التابع لها</label>
                  <input
                    type="text"
                    value={clientFormData.taxOffice}
                    onChange={(e) => setClientFormData({ ...clientFormData, taxOffice: e.target.value })}
                    placeholder="مأمورية الشركات المساهمة / كبار الممولين"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم ملف ضريبة الدخل</label>
                  <input
                    type="text"
                    value={clientFormData.incomeTaxFileNo}
                    onChange={(e) => setClientFormData({ ...clientFormData, incomeTaxFileNo: e.target.value })}
                    placeholder="مثال: 120/489/أموال"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم التسجيل بالقيمة المضافة</label>
                  <input
                    type="text"
                    value={clientFormData.vatRegistrationNo}
                    onChange={(e) => setClientFormData({ ...clientFormData, vatRegistrationNo: e.target.value })}
                    placeholder="مثال: 302-819-441"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الشخص المسؤول / المفوض</label>
                  <input
                    type="text"
                    value={clientFormData.contactPerson}
                    onChange={(e) => setClientFormData({ ...clientFormData, contactPerson: e.target.value })}
                    placeholder="الاسم والصفة"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف للتواصل</label>
                  <input
                    type="text"
                    value={clientFormData.phone}
                    onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    placeholder="010xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">النشاط والغرض</label>
                <input
                  type="text"
                  value={clientFormData.activity}
                  onChange={(e) => setClientFormData({ ...clientFormData, activity: e.target.value })}
                  placeholder="تصنيع وتجارة وتوريدات هندسية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات وتفاصيل ملف العميل</label>
                <textarea
                  rows={2}
                  value={clientFormData.notes}
                  onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                  placeholder="تفاصيل الاتفاق والأعمال المطلوبة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddClientModalOpen(false);
                    setEditingClientId(null);
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
                  <span>{editingClientId ? 'حفظ التعديلات على ملف العميل' : 'حفظ العميل بالأرشيف'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Auth Modal for Client Edit (Password: Mg120) */}
      <SecurityAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setClientToEdit(null);
        }}
        onSuccess={handleAuthSuccessClient}
        title="التحقق الأمني لتعديل ملف العميل"
        description={`يرجى إدخال الرقم السري لتعديل بيانات الشركة والملف الضريبي لـ [${clientToEdit?.name || ''}]`}
        actionType="EDIT_RECORD"
      />

      {/* Client Notification & WhatsApp Modal */}
      <ClientNotificationModal
        isOpen={isNotifyModalOpen}
        onClose={() => {
          setIsNotifyModalOpen(false);
          setNotifyTargetClient(null);
          setNotifyTargetProcedure(null);
        }}
        client={notifyTargetClient}
        procedure={notifyTargetProcedure}
        officeName={state.officeProfile.officeName}
        auditorName={state.officeProfile.auditorName}
      />
    </div>
  );
};
