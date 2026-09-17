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
  Bell,
  Eye,
  EyeOff,
  Copy,
  Globe2,
  ShieldAlert,
  Calculator,
  Tag,
  Scissors,
} from 'lucide-react';
import {
  ClientArchiveRecord,
  ClientRelationshipType,
  ClientProcedureTask,
  ClientDocument,
  ProcedureStatus,
  ProcedureCategory,
  OfficeTreasuryTransaction,
  PortalCredentials,
} from '../types';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { ActionMenu } from './common/ActionMenu';
import { QuickRowActionDropdown } from './common/QuickRowActionDropdown';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { validateEgyptianTaxNumber } from '../utils/taxValidationEngine';
import { SecurityAuthModal } from './SecurityAuthModal';
import { SecurityAuthService } from '../services/securityAuth';
import { PrintService } from '../services/PrintService';
import { ClientDocumentManager } from './ClientDocumentManager';
import { ClientNotificationModal } from './ClientNotificationModal';
import { ClientCommunicationsLogView } from './archive/ClientCommunicationsLogView';
import { WhatsAppDocumentShareModal } from './archive/WhatsAppDocumentShareModal';
import { WhatsAppCodeSenderModal } from './common/WhatsAppCodeSenderModal';
import { SmartProcedureFeeEstimatorModal } from './SmartProcedureFeeEstimatorModal';
import { CompanyDossierAndTokenLabelModal } from './archive/CompanyDossierAndTokenLabelModal';
import { ClientExcelImportModal } from './archive/ClientExcelImportModal';
import { ClientExcelEngine } from '../utils/clientExcelEngine';

interface ClientsArchiveViewProps {
  state: DatabaseState;
}

export const ClientsArchiveView: React.FC<ClientsArchiveViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<ClientArchiveRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PORTALS' | 'PROCEDURES' | 'TREASURY' | 'DOCUMENTS' | 'COMMUNICATION_LOG'>('PROCEDURES');
  const [procedureFilterStatus, setProcedureFilterStatus] = useState<string>('ALL');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Company Master Dossier & Token Keyring Label Modal State
  const [isTokenDossierModalOpen, setIsTokenDossierModalOpen] = useState(false);
  const [tokenDossierTargetClient, setTokenDossierTargetClient] = useState<ClientArchiveRecord | null>(null);

  // Security Auth for Edit Mode (Mg120)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportAuthModalOpen, setIsExportAuthModalOpen] = useState(false);
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

  // WhatsApp Document Share Modal State
  const [isDocShareModalOpen, setIsDocShareModalOpen] = useState(false);
  const [docShareTargetClient, setDocShareTargetClient] = useState<ClientArchiveRecord | null>(null);

  // WhatsApp Verification Code Sender Modal State
  const [isCodeSenderModalOpen, setIsCodeSenderModalOpen] = useState(false);
  const [codeTargetClient, setCodeTargetClient] = useState<ClientArchiveRecord | null>(null);

  // Bulk Excel Import & Template Modal State
  const [isBulkExcelModalOpen, setIsBulkExcelModalOpen] = useState(false);

  // Smart Procedure Fee Estimator Modal State
  const [isSmartEstimatorOpen, setIsSmartEstimatorOpen] = useState(false);
  const [estimatorTargetClient, setEstimatorTargetClient] = useState<ClientArchiveRecord | null>(null);

  // New Client Form State
  const [clientFormData, setClientFormData] = useState({
    name: '',
    clientCode: `CL-${String(state.clients.length + 1).padStart(3, '0')}`,
    clientType: 'PRIMARY' as ClientArchiveRecord['clientType'],
    relationshipType: 'PERMANENT' as ClientRelationshipType,
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
    portalCredentials: {
      etaEInvoicing: { username: '', password: '', expiryDate: '', portalUrl: 'https://invoicing.eta.gov.eg' },
      sapPortal: { username: '', password: '', expiryDate: '', portalUrl: '' },
      etaGeneralTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://eservices.incometax.gov.eg' },
      etaPayrollTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://payroll.incometax.gov.eg' },
      nafeza: { username: '', password: '', expiryDate: '', portalUrl: 'https://www.nafeza.gov.eg' },
    } as PortalCredentials,
  });

  // Automatic 3-Day Expiration Reminder Scanner for Portals & Passwords
  const expiringCredentials = useMemo(() => {
    const alerts: Array<{
      client: ClientArchiveRecord;
      portalName: string;
      portalKey: string;
      expiryDate: string;
      daysRemaining: number;
      username?: string;
    }> = [];

    const now = new Date();

    for (const client of state.clients) {
      if (!client.portalCredentials) continue;
      const portals = [
        { key: 'etaEInvoicing', name: 'الفاتورة والإيصال الإلكتروني (ETA)' },
        { key: 'sapPortal', name: 'منظومة ساب (SAP)' },
        { key: 'etaGeneralTax', name: 'بوابة الضرائب العامة' },
        { key: 'etaPayrollTax', name: 'بوابة كسب العمل' },
        { key: 'nafeza', name: 'نافذة الجمارك والتجارة' },
      ];

      for (const p of portals) {
        const cred = (client.portalCredentials as any)[p.key];
        if (cred && cred.expiryDate) {
          const exp = new Date(cred.expiryDate);
          const diffMs = exp.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays <= 3) {
            alerts.push({
              client,
              portalName: p.name,
              portalKey: p.key,
              expiryDate: cred.expiryDate,
              daysRemaining: diffDays,
              username: cred.username,
            });
          }
        }
      }
    }
    return alerts;
  }, [state.clients]);

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
        (filterType === 'PERMANENT' && (c.relationshipType === 'PERMANENT' || (!c.relationshipType && c.clientType === 'PRIMARY'))) ||
        (filterType === 'TEMPORARY' && (c.relationshipType === 'TEMPORARY' || (!c.relationshipType && c.clientType === 'CASUAL'))) ||
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
    if (!SecurityAuthService.isSecurityAuthEnabled()) {
      // Direct edit without password modal
      setEditingClientId(client.id);
      setClientFormData({
        name: client.name,
        clientCode: client.clientCode,
        clientType: client.clientType,
        relationshipType: client.relationshipType || (client.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY'),
        companyType: client.companyType,
        commercialRegistrationNo: client.commercialRegistrationNo || '',
        taxCardNo: client.taxCardNo || '',
        taxOffice: client.taxOffice || '',
        incomeTaxFileNo: client.incomeTaxFileNo || '',
        vatRegistrationNo: client.vatRegistrationNo || '',
        socialInsuranceNo: client.socialInsuranceNo || '',
        capital: client.capital || 0,
        activity: client.activity || '',
        contactPerson: client.contactPerson || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
        portalCredentials: client.portalCredentials || {
          etaEInvoicing: { username: '', password: '', expiryDate: '', portalUrl: 'https://invoicing.eta.gov.eg' },
          sapPortal: { username: '', password: '', expiryDate: '', portalUrl: '' },
          etaGeneralTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://eservices.incometax.gov.eg' },
          etaPayrollTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://payroll.incometax.gov.eg' },
          nafeza: { username: '', password: '', expiryDate: '', portalUrl: 'https://www.nafeza.gov.eg' },
        },
      });
      setIsAddClientModalOpen(true);
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleDeleteClient = (client: ClientArchiveRecord) => {
    if (
      window.confirm(
        `هل أنت متأكد من حذف ملف العميل "${client.name}" (${client.clientCode}) وجميع معاملاته ومستنداته وسجلاته من الأرشيف نهائياً؟`
      )
    ) {
      db.deleteClient(client.id);
      if (selectedClient?.id === client.id) {
        setSelectedClient(null);
      }
    }
  };

  const handleAuthSuccessClient = () => {
    if (!clientToEdit) return;
    setEditingClientId(clientToEdit.id);
    setClientFormData({
      name: clientToEdit.name,
      clientCode: clientToEdit.clientCode,
      clientType: clientToEdit.clientType,
      relationshipType: clientToEdit.relationshipType || (clientToEdit.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY'),
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
      portalCredentials: clientToEdit.portalCredentials || {
        etaEInvoicing: { username: '', password: '', expiryDate: '', portalUrl: 'https://invoicing.eta.gov.eg' },
        sapPortal: { username: '', password: '', expiryDate: '', portalUrl: '' },
        etaGeneralTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://eservices.incometax.gov.eg' },
        etaPayrollTax: { username: '', password: '', expiryDate: '', portalUrl: 'https://payroll.incometax.gov.eg' },
        nafeza: { username: '', password: '', expiryDate: '', portalUrl: 'https://www.nafeza.gov.eg' },
      },
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
        relationshipType: clientFormData.relationshipType,
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
        portalCredentials: clientFormData.portalCredentials,
      });

      alert('تم حفظ وتحديث بيانات العميل والملف الضريبي وكلمات مرور البوابات بنجاح.');
      setIsAddClientModalOpen(false);
      setEditingClientId(null);
      setClientToEdit(null);
    } else {
      const created = db.addClient({
        clientCode: clientFormData.clientCode || `CL-${Date.now().toString().slice(-4)}`,
        name: clientFormData.name,
        clientType: clientFormData.clientType,
        relationshipType: clientFormData.relationshipType,
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
        portalCredentials: clientFormData.portalCredentials,
      });

      setIsAddClientModalOpen(false);
      setSelectedClient(created);
      setActiveTab('PROCEDURES');
    }
  };

  const handleSendDirectWhatsApp = (client: ClientArchiveRecord, proc?: ClientProcedureTask | null) => {
    if (!client) return;
    const phone = (client.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? '2' + phone : phone.startsWith('20') ? phone : phone || '201003335360';
    const auditorName = state.officeProfile.auditorName || 'محمد جميل مرعي';
    const firmName = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
    const officePhone = state.officeProfile.phone || '01003335360';

    let text = '';
    if (proc) {
      const statusText =
        proc.status === 'COMPLETED'
          ? 'تم الانتهاء منه واعتماده رسمياً ✅'
          : proc.status === 'AT_AUTHORITY'
          ? 'مقدم ومقيد لدى الجهة المختصة 🏛️'
          : proc.status === 'PENDING_CLIENT_DOCS'
          ? 'بانتظار موافاتنا بالمستندات المطلوبة 📄'
          : 'جاري العمل والتنفيذ ⏳';

      const remainingFee = Math.max(0, proc.agreedFees - (proc.collectedFees || 0));

      text = `السادة / *${client.name}*\nعناية: ${client.contactPerson || 'الإدارة المحترمة'}\nتحية طيبة وبعد،،\n\nنود إحاطة سيادتكم علماً بآخر مستجدات المعاملة رقم (${proc.procedureCode}):\n📌 *${proc.title}*\n🔹 الحالة: *${statusText}*\n🔹 نسبة الإنجاز: *${proc.progressPercent}%*\n🔹 الأتعاب المتفق عليها: *${proc.agreedFees.toLocaleString('ar-EG')} ج.م*\n🔹 المسدد: *${(proc.collectedFees || 0).toLocaleString('ar-EG')} ج.م*\n🔹 المتبقي: *${remainingFee.toLocaleString('ar-EG')} ج.م*\n${proc.notes ? `📝 ملاحظات: ${proc.notes}\n` : ''}\nمع تحيات:\n*${firmName}*\nالمحاسب القانوني: *${auditorName}*\nهاتف التواصل: ${officePhone}`;
    } else {
      const summary = db.getClientTreasurySummary(client.id);
      text = `السادة / *${client.name}*\nعناية: ${client.contactPerson || 'الإدارة المالية'}\nتحية طيبة وبعد،،\n\nنحيط سيادتكم علماً بملخص الحساب والتعاملات لدى مكتبنا:\n🏢 كود العميل: *${client.clientCode}*\n📄 السجل التجاري: *${client.commercialRegistrationNo || '—'}*\n📊 البطاقة الضريبية: *${client.taxCardNo || '—'}*\n🏛️ مأمورية الضرائب: *${client.taxOffice || '—'}*\n\n💰 إجمالي الأتعاب المحصلة: *${summary.totalCollectedFees.toLocaleString('ar-EG')} ج.م*\n🧾 رسوم حكومية مسددة: *${summary.totalGovFeesPaid.toLocaleString('ar-EG')} ج.م*\n⚠️ المتبقي المستحق: *${summary.remainingFeesDue.toLocaleString('ar-EG')} ج.م*\n\nشاكرين ومقدرين حسن تعاونكم الدائم.\n*${firmName}*\nالمحاسب القانوني: *${auditorName}*\nهاتف المكتب: ${officePhone}`;
    }

    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    
    // Log to local WhatsApp message archive for continuity in WhatsApp Bot
    db.sendWhatsAppMessage({
      clientId: client.id,
      clientName: client.name,
      phone: client.phone || '',
      direction: 'OUTGOING',
      sender: 'AUDITOR',
      text,
      category: proc ? 'PROCEDURE_UPDATE' : 'GENERAL',
    });

    window.open(waUrl, '_blank');
  };

  // Direct WhatsApp Expiry Reminder Alert
  const handleSendPortalExpiryWhatsApp = (
    client: ClientArchiveRecord,
    portalName: string,
    expiryDate: string,
    username?: string
  ) => {
    if (!client) return;
    const phone = (client.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? '2' + phone : phone.startsWith('20') ? phone : phone || '201003335360';
    const auditorName = state.officeProfile.auditorName || 'محمد جميل مرعي';
    const firmName = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
    const officePhone = state.officeProfile.phone || '01003335360';

    const text = `عناية السادة / *${client.name}*\nتحية طيبة وبعد،،\n\nنلفت انتباهكم الكريم إلى أن صلاحية كلمة المرور الخاصة بالمنظومة:\n🔐 *${portalName}*\n👤 اسم المستخدم / التسجيل: *${username || client.taxCardNo || '—'}*\n📅 تاريخ انتهاء الصلاحية: *${expiryDate || 'قريباً'}*\n\n⚠️ يرجى التكرم بتجديد كلمة المرور وتزويدنا بالبيانات المحدثة أو التنسيق مع فريق العمل بالمكتب لتفادي توقف إصدار الفواتير أو تعطل الإقرارات الضريبية.\n\nمع وافر الشكر والتقدير،،\n*${firmName}*\nالمحاسب القانوني: *${auditorName}*\nهاتف التواصل: ${officePhone}`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

    db.sendWhatsAppMessage({
      clientId: client.id,
      clientName: client.name,
      phone: client.phone || '',
      direction: 'OUTGOING',
      sender: 'AUDITOR',
      text,
      category: 'GENERAL',
    });

    window.open(waUrl, '_blank');
  };

  // Encrypted Portal & Password Audit Sheet Export (Unlocked with Mg120)
  const handleExecuteExportAllPortals = () => {
    setIsExportAuthModalOpen(false);
    const office = state.officeProfile;
    const auditor = office.auditorName || 'محمد جميل مرعي';
    const firm = office.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
    const printDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    let rowsHtml = '';
    let counter = 1;

    state.clients.forEach((c) => {
      const creds = c.portalCredentials;
      if (!creds) return;

      const portalList = [
        { name: 'الفاتورة والإيصال (ETA)', data: creds.etaEInvoicing },
        { name: 'منظومة ساب (SAP)', data: creds.sapPortal },
        { name: 'الضرائب العامة', data: creds.etaGeneralTax },
        { name: 'كسب العمل والأجور', data: creds.etaPayrollTax },
        { name: 'نافذة الجمارك (Nafeza)', data: creds.nafeza },
      ];

      portalList.forEach((p) => {
        if (p.data && (p.data.username || p.data.password)) {
          rowsHtml += `
            <tr>
              <td class="text-center font-mono">${counter++}</td>
              <td class="font-bold">${c.name}</td>
              <td class="font-mono text-center">${c.taxCardNo || c.commercialRegistrationNo || '—'}</td>
              <td><strong>${p.name}</strong></td>
              <td class="font-mono">${p.data.username || '—'}</td>
              <td class="font-mono" style="background: #f8fafc; font-weight: bold; letter-spacing: 1px;">${p.data.password || '—'}</td>
              <td class="text-center font-mono">${p.data.expiryDate || 'ساري دائم'}</td>
              <td>${p.data.notes || '—'}</td>
            </tr>
          `;
        }
      });
    });

    if (!rowsHtml) {
      alert('لا توجد بيانات بوابات مسجلة للعملاء حتى الآن.');
      return;
    }

    const html = `
      <div style="padding: 10px; direction: rtl;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px;">
          <div>
            <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 900;">${firm}</h2>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">المحاسب القانوني ومراقب الحسابات: ${auditor}</div>
            <div style="font-size: 11px; color: #64748b;">هاتف: ${office.phone || '01003335360'} | العنوان: ${office.address || 'القاهرة، جمهورية مصر العربية'}</div>
          </div>
          <div style="text-align: left;">
            <div style="background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 11px; border: 1px solid #cbd5e1;">
              <strong>تاريخ الاستخراج:</strong> ${printDate}
            </div>
            <div style="color: #b91c1c; font-weight: bold; font-size: 10px; margin-top: 5px;">
              [ وثيقة سرية ومحمية برمز المرور Mg120 ]
            </div>
          </div>
        </div>

        <div style="text-align: center; margin: 15px 0;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e293b;">
            كشف حصر وتدقيق بوابات المنظومات وكلمات المرور المشفرة للعملاء
          </h3>
          <p style="font-size: 11px; color: #64748b; margin-top: 4px;">
            ETA e-Invoicing, SAP ERP, General Tax, Payroll Tax & Nafeza Credentials Register
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>اسم المنشأة / العميل</th>
              <th style="width: 110px;">الرقم الضريبي/السجل</th>
              <th>المنظومة / البوابة</th>
              <th>اسم المستخدم</th>
              <th>كلمة المرور</th>
              <th style="width: 90px;">تاريخ الصلاحية</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
          <div>حرر بمعرفة قسم تكنولوجيا المعلومات والضرائب الإلكترونية بالمكتب</div>
          <div>اعتماد ومصادقة مراقب الحسابات: <strong>${auditor}</strong> (توقيع وخاتم)</div>
        </div>
      </div>
    `;

    PrintService.printHtmlContent(html, 'كشف_بوابات_العملاء_المشفر_Mg120');
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
    <>
      <UnifiedScreenCard
        id="clients-archive-unified-card"
        title="أرشيف ملفات العملاء والشركات"
        badge={`${filteredClients.length} ملف`}
        badgeVariant="blue"
        primaryAction={{
          id: 'btn-add-client',
          label: 'عميل جديد',
          icon: Plus,
          variant: 'primary',
          onClick: () => setIsAddClientModalOpen(true),
        }}
        actionMenuItems={[
          {
            id: 'import-clients-excel',
            label: 'استيراد عملاء جملة (Excel)',
            icon: FileSpreadsheet,
            onClick: () => setIsBulkExcelModalOpen(true),
          },
          {
            id: 'download-client-template',
            label: 'تحميل قالب Excel لإدخال العملاء',
            icon: Upload,
            onClick: () => ClientExcelEngine.downloadClientTemplate(),
          },
          {
            id: 'smart-fee-estimator',
            label: 'تقدير الرسوم والأتعاب الذكي',
            icon: Calculator,
            onClick: () => {
              setEstimatorTargetClient(null);
              setIsSmartEstimatorOpen(true);
            },
          },
          {
            id: 'export-portals',
            label: 'طباعة كشف البوابات (مشفر)',
            icon: KeyRound,
            onClick: () => setIsExportAuthModalOpen(true),
          },
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث باسم الشركة، السجل التجاري، أو البطاقة الضريبية..."
        filterTabs={[
          { id: 'ALL', label: 'كافة المنشآت' },
          { id: 'PERMANENT', label: 'دائمين' },
          { id: 'TEMPORARY', label: 'مؤقتين' },
          { id: 'PRIMARY', label: 'رئيسيون' },
          { id: 'JOINT_STOCK', label: 'مساهمة' },
          { id: 'LLC', label: 'محدودة' },
        ]}
        activeFilterTab={filterType}
        onFilterTabChange={setFilterType}
      >
      <div className="space-y-4">
        {/* Automatic 3-Day Portal Password Expiration Reminder Alert Banner */}
        {expiringCredentials.length > 0 && (
          <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-amber-500/50 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/40">
                  <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white">
                      تنبيه انتهاء كلمات مرور البوابات
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {expiringCredentials.length} تنبيهات
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExportAuthModalOpen(true)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Excel Operations & WhatsApp Quick Bar */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>استيراد وتصدير ملفات العملاء جملة عبر Excel</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-semibold">قالب محاسبي معتمد</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                تصدير قالب إكسيل لتدوين العملاء واستيراد عشرات الشركات دفعة واحدة مع إنشاء الملفات والأكواد تلقائياً
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => ClientExcelEngine.downloadClientTemplate()}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تحميل قالب إكسيل رسمي فارغ لتدوين بيانات العملاء"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحميل القالب الفارغ</span>
            </button>
            <button
              type="button"
              id="btn-open-bulk-excel-import"
              onClick={() => setIsBulkExcelModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد عملاء جملة من Excel</span>
            </button>
          </div>
        </div>

        {/* KPI Compact Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[11px] block">إجمالي الشركات</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                {totalClientsCount}
              </span>
            </div>
            <Building className="w-4 h-4 text-slate-400" />
          </div>

          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-blue-600 text-[11px] block">إجراءات جارية</span>
              <span className="text-base font-black text-blue-800 font-mono mt-0.5 block">
                {activeProceduresCount}
              </span>
            </div>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-emerald-600 text-[11px] block">إجراءات مكتملة</span>
              <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                {completedProceduresCount}
              </span>
            </div>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
              <span className="text-amber-700 text-[11px] block">سندات الخزنة</span>
              <span className="text-base font-black text-amber-900 font-mono mt-0.5 block">
                {state.treasuryTransactions.filter((t) => t.clientId).length}
              </span>
            </div>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClients.map((client) => {
            const procedures = client.procedures || [];
            const activeProcs = procedures.filter(
              (p) => p.status === 'IN_PROGRESS' || p.status === 'AT_AUTHORITY' || p.status === 'PENDING_CLIENT_DOCS'
            );
            const completedProcs = procedures.filter((p) => p.status === 'COMPLETED');
            const summary = db.getClientTreasurySummary(client.id);
            const isActive = state.activeClientContext?.clientId === client.id;

            return (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 space-y-3 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {client.companyType === 'JOINT_STOCK'
                            ? 'ش.م.م'
                            : client.companyType === 'LLC'
                            ? 'ش.ذ.م.م'
                            : client.companyType === 'SOLE_PROPRIETORSHIP'
                            ? 'فردية'
                            : 'أشخاص'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          client.relationshipType === 'TEMPORARY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {client.relationshipType === 'TEMPORARY' ? 'مؤقت' : 'دائم'}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-600 text-white">
                            ★ نشط
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {client.clientCode}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">{client.name}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Building className="w-4 h-4 text-emerald-800" />
                    </div>
                  </div>

                  {/* Company Info Condensed */}
                  <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">سجل تجاري:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{client.commercialRegistrationNo || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">بطاقة ضريبية:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{client.taxCardNo || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">المسؤول:</span>
                      <span className="text-slate-800 font-medium text-[11px]">{client.contactPerson || '-'}</span>
                    </div>
                  </div>

                  {/* Condensed Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-blue-50/60 border border-blue-100 p-1.5 rounded-lg text-blue-900 flex justify-between items-center">
                      <span className="text-blue-600">الإجراءات:</span>
                      <span className="font-bold">{procedures.length} ({activeProcs.length} جاري)</span>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-100 p-1.5 rounded-lg text-amber-900 flex justify-between items-center">
                      <span className="text-amber-700">المحصل:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(summary.totalCollectedFees)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Consolidated */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(client);
                      setActiveTab('PROCEDURES');
                    }}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>فتح الملف</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Consolidated Row Action Dropdown */}
                    <QuickRowActionDropdown
                      title="خيارات العميل"
                      actions={[
                        {
                          label: 'بطاقة المنشأة وليبل التوكن (A4)',
                          icon: Tag,
                          variant: 'primary',
                          onClick: () => {
                            setTokenDossierTargetClient(client);
                            setIsTokenDossierModalOpen(true);
                          },
                        },
                        {
                          label: isActive ? 'إلغاء التفعيل كنشط' : 'تعيين كعميل نشط',
                          icon: Building2,
                          variant: isActive ? 'warning' : 'primary',
                          onClick: () => {
                            if (isActive) {
                              db.clearActiveClient();
                            } else {
                              db.setActiveClient(client.id);
                            }
                          },
                        },
                        {
                          label: 'تقدير أتعاب ورسوم ذكي',
                          icon: Calculator,
                          variant: 'warning',
                          onClick: () => {
                            setEstimatorTargetClient(client);
                            setIsSmartEstimatorOpen(true);
                          },
                        },
                        {
                          label: 'إرسال ملخص واتساب',
                          icon: Send,
                          variant: 'success',
                          onClick: () => handleSendDirectWhatsApp(client),
                        },
                        {
                          label: 'إرسال إشعار / رسالة',
                          icon: MessageSquare,
                          variant: 'default',
                          onClick: () => {
                            setNotifyTargetClient(client);
                            setNotifyTargetProcedure(null);
                            setIsNotifyModalOpen(true);
                          },
                        },
                        {
                          label: 'تعديل بيانات الملف',
                          icon: Edit2,
                          variant: 'warning',
                          onClick: () => handleRequestEditClient(client),
                        },
                        {
                          label: 'حذف العميل من الأرشيف',
                          icon: Trash2,
                          variant: 'danger',
                          onClick: () => handleDeleteClient(client),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </UnifiedScreenCard>

      {/* Selected Client Dossier Modal */}
      {liveSelectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-5xl w-full p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 text-xs my-4 max-h-[92vh] flex flex-col">
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

              <div className="flex items-center gap-2 flex-wrap">
                {/* Central Active Client Context Toggle */}
                <button
                  onClick={() => {
                    const isActive = state.activeClientContext?.clientId === liveSelectedClient.id;
                    if (isActive) {
                      db.clearActiveClient();
                    } else {
                      db.setActiveClient(liveSelectedClient.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all ${
                    state.activeClientContext?.clientId === liveSelectedClient.id
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-400'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300'
                  }`}
                  title="تعيين هذا العميل كعميل نشط في مركز الدورة المحاسبية وكافة المراكز"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>
                    {state.activeClientContext?.clientId === liveSelectedClient.id
                      ? '✓ العميل النشط بالدورة المحاسبية'
                      : 'تعيين كعميل نشط بالدورة المحاسبية'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setTokenDossierTargetClient(liveSelectedClient);
                    setIsTokenDossierModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
                  title="طباعة بطاقة المنشأة الشاملة وحافظة الباسوردات مع ليبل ميدالية التوكن A4"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>بطاقة المنشأة وليبل التوكن (A4)</span>
                </button>

                <button
                  onClick={() => {
                    setDocShareTargetClient(liveSelectedClient);
                    setIsDocShareModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="إرسال إشعار أو مستند مالي للعميل عبر نموذج جاهز (WhatsApp API)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال مستند عبر واتساب</span>
                </button>

                <button
                  onClick={() => handleSendDirectWhatsApp(liveSelectedClient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="إرسال ملخص الحساب والإجراءات مباشرة عبر واتساب"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ملخص واتساب</span>
                </button>
                <button
                  id="btn-client-modal-send-code"
                  onClick={() => {
                    setCodeTargetClient(liveSelectedClient);
                    setIsCodeSenderModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="إرسال كود تحقق أو اعتماد عبر WhatsApp"
                >
                  <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                  <span>إرسال كود 🔐</span>
                </button>
                <button
                  id="btn-client-modal-send-file"
                  onClick={() => {
                    setDocShareTargetClient(liveSelectedClient);
                    setIsDocShareModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="إرسال ملف مأرشف أو كشف حساب أو أي ملف عبر WhatsApp"
                >
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>إرسال ملف / كشف حساب 📎</span>
                </button>
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
                  title="تعديل بيانات الشركة والملف الضريبي والشركاء"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>تعديل بيانات العميل</span>
                </button>
                <button
                  onClick={() => handleDeleteClient(liveSelectedClient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="حذف هذا العميل نهائياً من الأرشيف"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                  <span>حذف العميل</span>
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
                onClick={() => setActiveTab('PORTALS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'PORTALS'
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe2 className="w-4 h-4" />
                <span>بوابات المنظومات والربط الإلكتروني (الفاتورة / ساب / كسب عمل / نافذة)</span>
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

              <button
                onClick={() => setActiveTab('COMMUNICATION_LOG')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === 'COMMUNICATION_LOG'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>سجل التواصل والرقابة المهنية (واتساب)</span>
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
                                    onClick={() => handleSendDirectWhatsApp(liveSelectedClient, proc)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                    title="إرسال تفاصيل ومستجدات الإجراء للعميل فوراً عبر واتساب"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>واتساب</span>
                                  </button>
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

              {/* TAB 1.5: PORTAL CREDENTIALS & AUTOMATIC REMINDERS */}
              {activeTab === 'PORTALS' && (
                <div className="space-y-4">
                  {/* Top Header for Portals */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-950">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Globe2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-blue-950">
                          بوابات المنظومات والربط الإلكتروني وكلمات المرور
                        </h4>
                        <p className="text-xs text-blue-800 mt-0.5">
                          حفظ وتشفير حسابات الفاتورة الإلكترونية، ساب (SAP)، الضرائب العامة، كسب العمل، ونافذة مع التذكير التلقائي قبل 3 أيام من انتهاء الصلاحية.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestEditClient(liveSelectedClient)}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>تحديث كلمات المرور</span>
                    </button>
                  </div>

                  {/* 5 Portals Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'etaEInvoicing',
                        title: '1. منظومة الفاتورة والإيصال الإلكتروني (ETA)',
                        subtitle: 'البوابة الرسمية لمنظومة الفواتير والإيصالات الضريبية',
                        defaultUrl: 'https://invoicing.eta.gov.eg',
                        data: liveSelectedClient.portalCredentials?.etaEInvoicing,
                        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      },
                      {
                        key: 'sapPortal',
                        title: '2. منظومة ساب (SAP ERP Portal)',
                        subtitle: 'بوابة تخطيط الموارد وإدارة المنظومة المحاسبية والربط',
                        defaultUrl: 'https://my-sap-instance.corp',
                        data: liveSelectedClient.portalCredentials?.sapPortal,
                        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                      },
                      {
                        key: 'etaGeneralTax',
                        title: '3. بوابة مصلحة الضرائب العامة المصرية',
                        subtitle: 'الإقرارات السنوية للدخل والقيمة المضافة والخصم والتحصيل',
                        defaultUrl: 'https://eservices.incometax.gov.eg',
                        data: liveSelectedClient.portalCredentials?.etaGeneralTax,
                        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                      },
                      {
                        key: 'etaPayrollTax',
                        title: '4. بوابة ضريبة كسب العمل والأجور',
                        subtitle: 'منظومة توحيد أسس ومعايير احتساب ضريبة الأجور والمرتبات',
                        defaultUrl: 'https://payroll.incometax.gov.eg',
                        data: liveSelectedClient.portalCredentials?.etaPayrollTax,
                        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
                      },
                      {
                        key: 'nafeza',
                        title: '5. نافذة للتجارة القومية والجمارك (Nafeza)',
                        subtitle: 'منظومة النافذة الواحدة والإفراج الجمركي المسبق (ACI)',
                        defaultUrl: 'https://www.nafeza.gov.eg',
                        data: liveSelectedClient.portalCredentials?.nafeza,
                        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                      },
                    ].map((portal) => {
                      const cred = portal.data;
                      const hasUsername = Boolean(cred?.username);
                      const hasPassword = Boolean(cred?.password);
                      const isRevealed = showPasswordMap[portal.key] || false;

                      // Expiry calculation
                      let expiryBadge = null;
                      if (cred?.expiryDate) {
                        const exp = new Date(cred.expiryDate);
                        const diffDays = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 0) {
                          expiryBadge = (
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                              منتهي الصلاحية!
                            </span>
                          );
                        } else if (diffDays <= 3) {
                          expiryBadge = (
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                              ينتهي خلال {diffDays} {diffDays === 1 ? 'يوم' : 'أيام'}!
                            </span>
                          );
                        } else {
                          expiryBadge = (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              ساري (متبقي {diffDays} يوم)
                            </span>
                          );
                        }
                      }

                      return (
                        <div
                          key={portal.key}
                          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-slate-900 text-xs">{portal.title}</h5>
                                <p className="text-[11px] text-slate-500">{portal.subtitle}</p>
                              </div>
                              {expiryBadge}
                            </div>

                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                              {/* Username */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 text-[11px]">اسم المستخدم / الرقم الضريبي:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-slate-900 select-all">
                                    {hasUsername ? cred?.username : 'غير مسجل'}
                                  </span>
                                  {hasUsername && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(cred?.username || '');
                                        alert('تم نسخ اسم المستخدم بنجاح');
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                                      title="نسخ اسم المستخدم"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Password */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 text-[11px]">كلمة المرور / الباسورد:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-slate-900">
                                    {hasPassword
                                      ? isRevealed
                                        ? cred?.password
                                        : '••••••••••••'
                                      : 'غير مسجل'}
                                  </span>
                                  {hasPassword && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowPasswordMap((prev) => ({
                                            ...prev,
                                            [portal.key]: !prev[portal.key],
                                          }))
                                        }
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                                        title={isRevealed ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                      >
                                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(cred?.password || '');
                                          alert('تم نسخ كلمة المرور بنجاح');
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                                        title="نسخ كلمة المرور"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Expiry Date */}
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-500">تاريخ انتهاء الصلاحية:</span>
                                <span className="font-mono font-medium text-slate-800">
                                  {cred?.expiryDate || 'غير محدد (غير مؤقت)'}
                                </span>
                              </div>

                              {/* Notes if any */}
                              {cred?.notes && (
                                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                                  <span className="text-slate-400">ملاحظات:</span> {cred.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <a
                              href={cred?.portalUrl || portal.defaultUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                              <span>دخول المنظومة</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                const phone = (liveSelectedClient.phone || '').replace(/[^0-9]/g, '');
                                const cleanPhone = phone.startsWith('0') ? '2' + phone : phone.startsWith('20') ? phone : phone || '201003335360';
                                const msg = `السادة المحترمون / ${liveSelectedClient.name}
تحية طيبة وبعد،،
نحيطكم علماً بأنه تم مراجعة حسابكم على [${portal.title}]، ونرجو التكرم بمتابعة تحديث أو تأكيد كلمة المرور الخاصة بكم لضمان استمرارية تقديم الخدمات الضريبية والمحاسبية دون توقف.
شاكرين ومقدرين حسن تعاونكم.
مكتب المحاسب القانوني ومراقب الحسابات.`;
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                              title="إرسال تذكير للعميل بكلمة المرور عبر واتساب"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-700" />
                              <span>تذكير واتساب</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                      <span>تعديل البيانات</span>
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

              {/* TAB 5: WHATSAPP COMMUNICATIONS & AUDIT LOG */}
              {activeTab === 'COMMUNICATION_LOG' && (
                <ClientCommunicationsLogView
                  client={liveSelectedClient}
                  onOpenNotifyModal={() => {
                    setNotifyTargetClient(liveSelectedClient);
                    setNotifyTargetProcedure(null);
                    setIsNotifyModalOpen(true);
                  }}
                  onOpenDocShareModal={() => {
                    setDocShareTargetClient(liveSelectedClient);
                    setIsDocShareModalOpen(true);
                  }}
                />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">عنوان الإجراء / المعاملة المطلوبة *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEstimatorTargetClient(liveSelectedClient);
                      setIsSmartEstimatorOpen(true);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="استدعاء حاسبة التقدير الذكي لملء البيانات والرسوم والأتعاب تلقائياً"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>⚡ تقدير ذكي للرسوم والأتعاب</span>
                  </button>
                </div>
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
                <span>تم التحقق من الرقم السري بنجاح. يمكنك الآن تعديل بيانات ملف العميل وحفظها.</span>
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
                  <label className="block text-slate-700 font-bold mb-1">تصنيف العلاقة والتعاقد</label>
                  <select
                    value={clientFormData.relationshipType}
                    onChange={(e) => setClientFormData({ ...clientFormData, relationshipType: e.target.value as ClientRelationshipType })}
                    className="w-full px-3 py-2 bg-emerald-50/70 border border-emerald-300 rounded-xl font-bold text-emerald-950"
                  >
                    <option value="PERMANENT">عميل دائم (مسك دفاتر وضرائب سنوي)</option>
                    <option value="TEMPORARY">عميل مؤقت / عابر (معاملة محددة / تأسيس)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">أهمية العميل</label>
                  <select
                    value={clientFormData.clientType}
                    onChange={(e) => setClientFormData({ ...clientFormData, clientType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="PRIMARY">عميل استراتيجي / رئيسي</option>
                    <option value="SECONDARY">عميل فرعي / اعتيادي</option>
                  </select>
                </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">رقم التسجيل الضريبي (البطاقة)</label>
                    {clientFormData.taxCardNo && (
                      <span className={`text-[10px] font-bold ${validateEgyptianTaxNumber(clientFormData.taxCardNo).isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {validateEgyptianTaxNumber(clientFormData.taxCardNo).isValid ? '✓ رقم ضريبي مصري صالح (9 أرقام)' : '⚠️ يجب 9 أرقام'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={clientFormData.taxCardNo}
                    onChange={(e) => setClientFormData({ ...clientFormData, taxCardNo: e.target.value })}
                    placeholder="مثال: 489-201-987"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono ${
                      clientFormData.taxCardNo && !validateEgyptianTaxNumber(clientFormData.taxCardNo).isValid
                        ? 'border-amber-300 focus:border-amber-500'
                        : 'border-slate-300'
                    }`}
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

              {/* Portal Credentials Section */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-700" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    بيانات وحسابات الدخول للمنظومات والبوابات الحكومية و SAP
                  </h4>
                </div>

                {/* 1. ETA e-Invoicing */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-emerald-800 text-xs block">1. منظومة الفاتورة والإيصال الإلكتروني (ETA)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">اسم المستخدم / الرقم الضريبي</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaEInvoicing?.username || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaEInvoicing: {
                                ...clientFormData.portalCredentials?.etaEInvoicing,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="الرقم الضريبي أو الإيميل"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">كلمة المرور / الباسورد</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaEInvoicing?.password || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaEInvoicing: {
                                ...clientFormData.portalCredentials?.etaEInvoicing,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">تاريخ انتهاء الصلاحية</label>
                      <input
                        type="date"
                        value={clientFormData.portalCredentials?.etaEInvoicing?.expiryDate || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaEInvoicing: {
                                ...clientFormData.portalCredentials?.etaEInvoicing,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SAP Portal */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-blue-800 text-xs block">2. منظومة ساب (SAP ERP Portal)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">اسم مستخدم SAP</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.sapPortal?.username || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              sapPortal: {
                                ...clientFormData.portalCredentials?.sapPortal,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="SAP_USER_ID"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">كلمة مرور SAP</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.sapPortal?.password || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              sapPortal: {
                                ...clientFormData.portalCredentials?.sapPortal,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">تاريخ انتهاء كلمة المرور</label>
                      <input
                        type="date"
                        value={clientFormData.portalCredentials?.sapPortal?.expiryDate || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              sapPortal: {
                                ...clientFormData.portalCredentials?.sapPortal,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. ETA General Tax */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-amber-800 text-xs block">3. بوابة الضرائب العامة (الدخل والقيمة المضافة)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">اسم المستخدم / البريد</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaGeneralTax?.username || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaGeneralTax: {
                                ...clientFormData.portalCredentials?.etaGeneralTax,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Tax_Portal_User"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">كلمة المرور</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaGeneralTax?.password || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaGeneralTax: {
                                ...clientFormData.portalCredentials?.etaGeneralTax,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">تاريخ التجديد / الانتهاء</label>
                      <input
                        type="date"
                        value={clientFormData.portalCredentials?.etaGeneralTax?.expiryDate || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaGeneralTax: {
                                ...clientFormData.portalCredentials?.etaGeneralTax,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ETA Payroll Tax */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-purple-800 text-xs block">4. بوابة ضريبة كسب العمل والأجور</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">اسم مستخدم كسب العمل</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaPayrollTax?.username || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaPayrollTax: {
                                ...clientFormData.portalCredentials?.etaPayrollTax,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Payroll_User"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">كلمة المرور</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.etaPayrollTax?.password || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaPayrollTax: {
                                ...clientFormData.portalCredentials?.etaPayrollTax,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">تاريخ التجديد</label>
                      <input
                        type="date"
                        value={clientFormData.portalCredentials?.etaPayrollTax?.expiryDate || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              etaPayrollTax: {
                                ...clientFormData.portalCredentials?.etaPayrollTax,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Nafeza */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-cyan-800 text-xs block">5. نافذة للتجارة القومية والجمارك (Nafeza)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">اسم مستخدم نافذة</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.nafeza?.username || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              nafeza: {
                                ...clientFormData.portalCredentials?.nafeza,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Nafeza_Username"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">كلمة مرور نافذة</label>
                      <input
                        type="text"
                        value={clientFormData.portalCredentials?.nafeza?.password || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              nafeza: {
                                ...clientFormData.portalCredentials?.nafeza,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">تاريخ التجديد</label>
                      <input
                        type="date"
                        value={clientFormData.portalCredentials?.nafeza?.expiryDate || ''}
                        onChange={(e) =>
                          setClientFormData({
                            ...clientFormData,
                            portalCredentials: {
                              ...clientFormData.portalCredentials,
                              nafeza: {
                                ...clientFormData.portalCredentials?.nafeza,
                                expiryDate: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
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

      {/* Security Auth Modal for Exporting All Portals & Passwords */}
      <SecurityAuthModal
        isOpen={isExportAuthModalOpen}
        onClose={() => setIsExportAuthModalOpen(false)}
        onSuccess={handleExecuteExportAllPortals}
        title="التحقق الأمني لطباعة وتصدير كشف البوابات المشفر"
        description="يرجى إدخال الرقم السري المعتمد لفك تشفير وتصدير كشف حسابات البوابات الحكومية وكلمات المرور لجميع العملاء"
        actionType="SECURITY_CHECK"
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

      {/* WhatsApp Document Share & Invoice Claim Modal */}
      {isDocShareModalOpen && docShareTargetClient && (
        <WhatsAppDocumentShareModal
          isOpen={isDocShareModalOpen}
          onClose={() => {
            setIsDocShareModalOpen(false);
            setDocShareTargetClient(null);
          }}
          client={docShareTargetClient}
          state={state}
        />
      )}

      {/* WhatsApp Verification Code Sender Modal */}
      {isCodeSenderModalOpen && (
        <WhatsAppCodeSenderModal
          isOpen={isCodeSenderModalOpen}
          onClose={() => {
            setIsCodeSenderModalOpen(false);
            setCodeTargetClient(null);
          }}
          initialClient={codeTargetClient || undefined}
          state={state}
        />
      )}

      {/* Smart Procedure Fee Estimator Modal */}
      {isSmartEstimatorOpen && (
        <SmartProcedureFeeEstimatorModal
          isOpen={isSmartEstimatorOpen}
          onClose={() => {
            setIsSmartEstimatorOpen(false);
            setEstimatorTargetClient(null);
          }}
          client={estimatorTargetClient || liveSelectedClient}
          onApplyEstimate={(estimate) => {
            setProcedureFormData((prev) => ({
              ...prev,
              title: estimate.title,
              category: estimate.category,
              agreedFees: estimate.agreedFees,
              governmentFeesNow: estimate.governmentFees,
              notes: prev.notes ? `${prev.notes}\n${estimate.notes}` : estimate.notes,
            }));
            const target = estimatorTargetClient || liveSelectedClient;
            if (target && !liveSelectedClient) {
              setSelectedClient(target);
            }
            setIsAddProcedureModalOpen(true);
          }}
        />
      )}

      {/* Company Master Dossier & Token Keyring Label Modal (A4 Master Sheet) */}
      {isTokenDossierModalOpen && (tokenDossierTargetClient || liveSelectedClient) && (
        <CompanyDossierAndTokenLabelModal
          isOpen={isTokenDossierModalOpen}
          onClose={() => {
            setIsTokenDossierModalOpen(false);
            setTokenDossierTargetClient(null);
          }}
          client={tokenDossierTargetClient || liveSelectedClient!}
          officeProfile={state.officeProfile}
        />
      )}

      {/* Bulk Client Excel Import & Template Modal */}
      {isBulkExcelModalOpen && (
        <ClientExcelImportModal
          isOpen={isBulkExcelModalOpen}
          onClose={() => setIsBulkExcelModalOpen(false)}
          state={state}
        />
      )}
    </>
  );
};
