import React, { useState, useMemo } from 'react';
import {
  Building2,
  Key,
  Search,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileSpreadsheet,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  X,
  Save,
  User,
  Hash,
} from 'lucide-react';
import { ClientArchiveRecord, PortalCredentials } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import * as XLSX from 'xlsx';
import { formatWorksheetForArabicExport, writeArabicExcelFile } from '../../utils/excelArabicStyler';

interface EInvoicingTokensRegistryViewProps {
  state: DatabaseState;
}

export const EInvoicingTokensRegistryView: React.FC<EInvoicingTokensRegistryViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eInvoicingFilter, setEInvoicingFilter] = useState<'ALL' | 'REGISTERED' | 'UNREGISTERED'>('ALL');
  const [tokenTypeFilter, setTokenTypeFilter] = useState<'ALL' | 'NONE' | 'E_SEAL' | 'E_SIGNATURE' | 'BOTH'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'VALID' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  // Password Reveal & Copy States
  const [revealedPasswords, setRevealedPasswords] = useState<{ [compositeKey: string]: string }>({});
  const [showPasswordMap, setShowPasswordMap] = useState<{ [compositeKey: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Modal States for Add/Edit Client
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientArchiveRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    taxCardNo: '',
    taxOffice: '',
    eInvoicingStatus: 'REGISTERED' as any,
    etaUsername: '',
    etaPassword: '',
    etaExpiry: '',
    tokenProvider: 'إيجيبت ترست',
    tokenType: 'E_SEAL' as any,
    tokenPin: '',
    tokenSerial: '',
    tokenExpiry: '',
  });

  const currentUser = db.getCurrentUser();
  const canRevealCredentials = currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT';

  // Providers list
  const providers = useMemo(() => {
    const set = new Set<string>();
    state.clients.forEach((c) => {
      const p = c.portalCredentials?.eSignatureToken?.provider;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [state.clients]);

  // Process clients data with calculations
  const processedClients = useMemo(() => {
    return state.clients.map((client) => {
      const creds = client.portalCredentials || {};
      const eta = creds.etaEInvoicing || {};
      const token = creds.eSignatureToken || {};

      const isRegistered = client.eInvoicingStatus === 'REGISTERED' || client.eInvoicingStatus === 'MANDATED_STAGE' || Boolean(eta.username);
      
      const tokenType = token.tokenType || (token.serialNumber || token.pin || token.expiryDate ? 'E_SEAL' : 'NONE');
      const hasStamp = tokenType === 'E_SEAL' || tokenType === 'BOTH';
      const hasSignature = tokenType === 'E_SIGNATURE' || tokenType === 'BOTH';

      // Expiry calculation for token or ETA
      const expiryDateStr = token.expiryDate || eta.expiryDate || '';
      let daysRemaining = 999;
      let expiryStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' = 'VALID';

      if (expiryDateStr) {
        const diffMs = new Date(expiryDateStr).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          expiryStatus = 'EXPIRED';
        } else if (daysRemaining <= 30) {
          expiryStatus = 'EXPIRING';
        } else {
          expiryStatus = 'VALID';
        }
      }

      return {
        client,
        isRegistered,
        tokenType,
        hasStamp,
        hasSignature,
        hasBoth: tokenType === 'BOTH',
        hasToken: tokenType !== 'NONE' && tokenType !== undefined,
        expiryDateStr,
        daysRemaining,
        expiryStatus,
        provider: token.provider || 'غير محدد',
        etaUsername: eta.username || '',
        etaPassword: eta.password || '',
        tokenPin: token.pin || '',
        tokenSerial: token.serialNumber || '',
      };
    });
  }, [state.clients]);

  // Summary statistics cards
  const stats = useMemo(() => {
    const total = processedClients.length;
    let registeredCount = 0;
    let stampCount = 0;
    let signatureCount = 0;
    let bothCount = 0;
    let noTokenCount = 0;
    let expiringOrExpiredCount = 0;

    processedClients.forEach((item) => {
      if (item.isRegistered) registeredCount++;
      if (item.hasStamp) stampCount++;
      if (item.hasSignature) signatureCount++;
      if (item.hasBoth) bothCount++;
      if (!item.hasToken) noTokenCount++;
      if (item.expiryStatus === 'EXPIRING' || item.expiryStatus === 'EXPIRED') expiringOrExpiredCount++;
    });

    return {
      total,
      registeredCount,
      stampCount,
      signatureCount,
      bothCount,
      noTokenCount,
      expiringOrExpiredCount,
    };
  }, [processedClients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return processedClients.filter((item) => {
      const { client, isRegistered, tokenType, expiryStatus, provider, etaUsername } = item;
      const term = searchTerm.toLowerCase();

      // Search match
      const matchSearch =
        !term ||
        client.name.toLowerCase().includes(term) ||
        (client.taxCardNo && client.taxCardNo.toLowerCase().includes(term)) ||
        (client.taxOffice && client.taxOffice.toLowerCase().includes(term)) ||
        (etaUsername && etaUsername.toLowerCase().includes(term)) ||
        (client.commercialRegistrationNo && client.commercialRegistrationNo.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // E-Invoicing filter
      if (eInvoicingFilter === 'REGISTERED' && !isRegistered) return false;
      if (eInvoicingFilter === 'UNREGISTERED' && isRegistered) return false;

      // Token type filter
      if (tokenTypeFilter !== 'ALL') {
        if (tokenTypeFilter === 'NONE' && tokenType !== 'NONE') return false;
        if (tokenTypeFilter !== 'NONE' && tokenType !== tokenTypeFilter) return false;
      }

      // Expiry filter
      if (expiryFilter !== 'ALL' && expiryStatus !== expiryFilter) return false;

      // Provider filter
      if (providerFilter !== 'ALL' && provider !== providerFilter) return false;

      return true;
    });
  }, [processedClients, searchTerm, eInvoicingFilter, tokenTypeFilter, expiryFilter, providerFilter]);

  // Handle Password Reveal via backend secure endpoint
  const handleRevealPassword = async (clientId: string, portalKey: 'etaEInvoicing' | 'eSignatureToken', fieldName: string) => {
    if (!canRevealCredentials) {
      alert('إظهار بيانات الاعتمادات والكلمات السرية مقتصر حصرياً على مدير النظام (ADMIN) والمحاسب (ACCOUNTANT).');
      return;
    }

    const compositeKey = `${clientId}_${portalKey}_${fieldName}`;
    if (showPasswordMap[compositeKey]) {
      setShowPasswordMap((prev) => ({ ...prev, [compositeKey]: false }));
      return;
    }

    if (revealedPasswords[compositeKey]) {
      setShowPasswordMap((prev) => ({ ...prev, [compositeKey]: true }));
      return;
    }

    setLoadingKey(compositeKey);
    try {
      const res = await fetch(`/api/clients/${clientId}/reveal-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalKey: portalKey === 'etaEInvoicing' ? 'etaEInvoicing' : 'eSignatureToken' }),
      });
      const result = await res.json();
      if (result.success && result.credentials) {
        const targetObj = result.credentials[portalKey] || result.credentials;
        const val = fieldName === 'password' ? targetObj?.password : targetObj?.pin;
        if (val) {
          setRevealedPasswords((prev) => ({ ...prev, [compositeKey]: val }));
          setShowPasswordMap((prev) => ({ ...prev, [compositeKey]: true }));
        } else {
          alert('لا توجد كلمة مرور مسجلة لهذا الحقل.');
        }
      } else {
        alert(result.error || 'تعذر إظهار كلمة المرور.');
      }
    } catch (err: any) {
      console.error('Error revealing password:', err);
      alert('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoadingKey(null);
    }
  };

  // Handle Copy to Clipboard
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Edit Modal
  const handleOpenEdit = (client: ClientArchiveRecord) => {
    setEditingClient(client);
    const eta = client.portalCredentials?.etaEInvoicing || {};
    const token = client.portalCredentials?.eSignatureToken || {};
    setFormData({
      name: client.name || '',
      taxCardNo: client.taxCardNo || '',
      taxOffice: client.taxOffice || '',
      eInvoicingStatus: client.eInvoicingStatus || 'REGISTERED',
      etaUsername: eta.username || '',
      etaPassword: eta.password || '',
      etaExpiry: eta.expiryDate || '',
      tokenProvider: token.provider || 'إيجيبت ترست',
      tokenType: token.tokenType || 'E_SEAL',
      tokenPin: token.pin || '',
      tokenSerial: token.serialNumber || '',
      tokenExpiry: token.expiryDate || '',
    });
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      taxCardNo: '',
      taxOffice: '',
      eInvoicingStatus: 'REGISTERED',
      etaUsername: '',
      etaPassword: '',
      etaExpiry: '',
      tokenProvider: 'إيجيبت ترست',
      tokenType: 'E_SEAL',
      tokenPin: '',
      tokenSerial: '',
      tokenExpiry: '',
    });
    setIsModalOpen(true);
  };

  // Save Client Changes
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('اسم الشركة مطلوب.');
      return;
    }

    const portalCredentials: PortalCredentials = {
      ...(editingClient?.portalCredentials || {}),
      etaEInvoicing: {
        username: formData.etaUsername,
        password: formData.etaPassword,
        expiryDate: formData.etaExpiry,
        portalUrl: 'https://invoicing.eta.gov.eg',
      },
      eSignatureToken: {
        provider: formData.tokenProvider,
        tokenType: formData.tokenType,
        pin: formData.tokenPin,
        serialNumber: formData.tokenSerial,
        expiryDate: formData.tokenExpiry,
      },
    };

    if (editingClient) {
      db.updateClient(editingClient.id, {
        name: formData.name,
        taxCardNo: formData.taxCardNo,
        taxOffice: formData.taxOffice,
        eInvoicingStatus: formData.eInvoicingStatus,
        portalCredentials,
      });
      alert('تم تحديث بيانات الفاتورة والتوكن بنجاح.');
    } else {
      db.addClient({
        id: `client-${Date.now()}`,
        clientCode: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name,
        clientType: 'PRIMARY',
        companyType: 'LLC',
        commercialRegistrationNo: '',
        taxCardNo: formData.taxCardNo,
        taxOffice: formData.taxOffice,
        incomeTaxFileNo: '',
        vatRegistrationNo: '',
        socialInsuranceNo: '',
        capital: 0,
        partners: [],
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        activity: 'تجارة ومقاولات',
        eInvoicingStatus: formData.eInvoicingStatus,
        portalCredentials,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      alert('تم إضافة الشركة الجديدة بنجاح.');
    }

    setIsModalOpen(false);
  };

  // Excel Export (Without Passwords as per requirement 6)
  const handleExportExcel = () => {
    const exportData = filteredClients.map((item, idx) => ({
      'م': idx + 1,
      'اسم الشركة': item.client.name,
      'الرقم الضريبي': item.client.taxCardNo || 'غير مسجل',
      'المأمورية': item.client.taxOffice || 'غير محدد',
      'مسجل في الفاتورة الإلكترونية': item.isRegistered ? 'مسجل' : 'غير مسجل',
      'اسم مستخدم الفاتورة': item.etaUsername || '—',
      'نوع التوكن': item.tokenType === 'E_SEAL' ? 'ختم إلكتروني' : item.tokenType === 'E_SIGNATURE' ? 'توقيع إلكتروني' : item.tokenType === 'BOTH' ? 'ختم وتوقيع' : 'لا يوجد',
      'الرقم التسلسلي للتوكن': item.tokenSerial || '—',
      'مزود التوكن': item.provider || '—',
      'تاريخ الانتهاء': item.expiryDateStr || '—',
      'الأيام المتبقية': item.daysRemaining !== 999 ? item.daysRemaining : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الفاتورة والتوكنات');
    formatWorksheetForArabicExport(ws);
    writeArabicExcelFile(wb, `سجل_الفاتورة_الإلكترونية_والتوكنات_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Print (Without Passwords as per requirement 6)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>سجل الفاتورة الإلكترونية وتوكنات التوقيع والختم</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            متابعة حالة التسجيل بمنظومة الفاتورة الإلكترونية، تواريخ صلاحية التوكنات، وإدارة كلمات المرور بأمان مع سجل المراجعة (Audit Log).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="تصدير إكسل (بدون كلمات المرور)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شركة جديدة</span>
          </button>
        </div>
      </div>

      {/* 1) Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">إجمالي الشركات</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block font-mono">{stats.total}</span>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">مسجلون بالفاتورة</span>
          <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1 block font-mono">{stats.registeredCount}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">توكن ختم</span>
          <span className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1 block font-mono">{stats.stampCount}</span>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">توكن توقيع</span>
          <span className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-1 block font-mono">{stats.signatureCount}</span>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-xs">
          <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block">ختم + توقيع</span>
          <span className="text-xl font-black text-purple-900 dark:text-purple-200 mt-1 block font-mono">{stats.bothCount}</span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">بدون توكن</span>
          <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1 block font-mono">{stats.noTokenCount}</span>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">قاربت أو منتهية</span>
          <span className="text-xl font-black text-rose-900 dark:text-rose-200 mt-1 block font-mono">{stats.expiringOrExpiredCount}</span>
        </div>
      </div>

      {/* 2) Search Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الشركة، الرقم الضريبي، المأمورية، أو اسم مستخدم الفاتورة..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الفاتورة الإلكترونية</label>
            <select
              value={eInvoicingFilter}
              onChange={(e) => setEInvoicingFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">الكل (مسجل وغير مسجل)</option>
              <option value="REGISTERED">مسجل بالفاتورة</option>
              <option value="UNREGISTERED">غير مسجل</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">نوع التوكن</label>
            <select
              value={tokenTypeFilter}
              onChange={(e) => setTokenTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">الكل (جميع التوكنات)</option>
              <option value="NONE">لا يوجد توكن</option>
              <option value="E_SEAL">ختم إلكتروني (E_SEAL)</option>
              <option value="E_SIGNATURE">توقيع إلكتروني (E_SIGNATURE)</option>
              <option value="BOTH">ختم وتوقيع معا (BOTH)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">حالة الصلاحية</label>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="VALID">ساري (&gt; 30 يوم)</option>
              <option value="EXPIRING">قارب الانتهاء (≤ 30 يوم)</option>
              <option value="EXPIRED">منتهي الصلاحية</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">شركة المزود</label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">جميع المزودين</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3) Table & 7) Responsive Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            لا توجد شركات مطابقة لمعايير البحث والفلاتر المحددة.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <th className="p-3">الشركة</th>
                    <th className="p-3">الرقم الضريبي</th>
                    <th className="p-3">المأمورية</th>
                    <th className="p-3 text-center">الفاتورة الإلكترونية</th>
                    <th className="p-3">اسم المستخدم</th>
                    <th className="p-3">كلمة المرور</th>
                    <th className="p-3 text-center">نوع التوكن</th>
                    <th className="p-3">باسورد التوكن / PIN</th>
                    <th className="p-3">الرقم التسلسلي</th>
                    <th className="p-3">المزود</th>
                    <th className="p-3">تاريخ الانتهاء</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredClients.map((item) => {
                    const { client, isRegistered, tokenType, expiryStatus, provider, etaUsername, etaPassword, tokenPin, tokenSerial, expiryDateStr, daysRemaining } = item;
                    const passKey = `${client.id}_etaEInvoicing_password`;
                    const pinKey = `${client.id}_eSignatureToken_pin`;

                    const isPassVisible = showPasswordMap[passKey];
                    const isPinVisible = showPasswordMap[pinKey];

                    return (
                      <tr
                        key={client.id}
                        onClick={() => handleOpenEdit(client)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[180px]" title={client.name}>{client.name}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{client.taxCardNo || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{client.taxOffice || '—'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isRegistered ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {isRegistered ? 'مسجل' : 'غير مسجل'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{etaUsername || '—'}</td>
                        <td className="p-3 font-mono" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">
                              {isPassVisible ? (revealedPasswords[passKey] || etaPassword || '—') : '••••••••'}
                            </span>
                            {etaPassword && (
                              <>
                                <button
                                  onClick={() => handleRevealPassword(client.id, 'etaEInvoicing', 'password')}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title={isPassVisible ? 'إخفاء' : 'إظهار (سجل مراجعة)'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!revealedPasswords[passKey]) {
                                      await handleRevealPassword(client.id, 'etaEInvoicing', 'password');
                                    }
                                    const val = revealedPasswords[passKey] || etaPassword;
                                    handleCopy(val, passKey);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                                  title="نسخ"
                                >
                                  {copiedKey === passKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tokenType === 'E_SEAL' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                            tokenType === 'E_SIGNATURE' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300' :
                            tokenType === 'BOTH' ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {tokenType === 'E_SEAL' ? 'ختم' : tokenType === 'E_SIGNATURE' ? 'توقيع' : tokenType === 'BOTH' ? 'ختم وتوقيع' : 'لا يوجد'}
                          </span>
                        </td>
                        <td className="p-3 font-mono" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">
                              {isPinVisible ? (revealedPasswords[pinKey] || tokenPin || '—') : '••••••••'}
                            </span>
                            {tokenPin && (
                              <>
                                <button
                                  onClick={() => handleRevealPassword(client.id, 'eSignatureToken', 'pin')}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title={isPinVisible ? 'إخفاء' : 'إظهار (سجل مراجعة)'}
                                >
                                  {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!revealedPasswords[pinKey]) {
                                      await handleRevealPassword(client.id, 'eSignatureToken', 'pin');
                                    }
                                    const val = revealedPasswords[pinKey] || tokenPin;
                                    handleCopy(val, pinKey);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                                  title="نسخ"
                                >
                                  {copiedKey === pinKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{tokenSerial || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{provider}</td>
                        <td className="p-3">
                          {expiryDateStr ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-slate-800 dark:text-slate-200">{expiryDateStr}</span>
                              <span className={`text-[10px] font-bold ${
                                expiryStatus === 'EXPIRED' ? 'text-rose-600 dark:text-rose-400' :
                                expiryStatus === 'EXPIRING' ? 'text-amber-600 dark:text-amber-400' :
                                'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {expiryStatus === 'EXPIRED' ? 'منتهي الصلاحية' : `متبقي ${daysRemaining} يوم`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">غير محدد</span>
                          )}
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.map((item) => {
                const { client, isRegistered, tokenType, expiryStatus, provider, etaUsername, etaPassword, tokenPin, tokenSerial, expiryDateStr, daysRemaining } = item;
                return (
                  <div key={client.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{client.name}</h4>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">ضريبي: {client.taxCardNo || '—'} | المأمورية: {client.taxOffice || '—'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {isRegistered ? 'مسجل بالفاتورة' : 'غير مسجل'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-slate-400 block text-[10px]">مستخدم الفاتورة:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{etaUsername || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">نوع التوكن:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {tokenType === 'E_SEAL' ? 'ختم' : tokenType === 'E_SIGNATURE' ? 'توقيع' : tokenType === 'BOTH' ? 'ختم وتوقيع' : 'لا يوجد'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">المزود:</span>
                        <span className="text-slate-700 dark:text-slate-300">{provider}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الصلاحية:</span>
                        <span className={`font-bold ${expiryStatus === 'EXPIRED' ? 'text-rose-600' : expiryStatus === 'EXPIRING' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {expiryDateStr ? `متبقي ${daysRemaining} يوم` : 'غير محدد'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل الفاتورة والتوكن</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingClient ? `تعديل بيانات الفاتورة والتوكن للشركة: ${editingClient.name}` : 'إضافة شركة جديدة وتكوين بيانات الفاتورة والتوكن'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم الشركة *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الرقم الضريبي</label>
                  <input
                    type="text"
                    value={formData.taxCardNo}
                    onChange={(e) => setFormData({ ...formData, taxCardNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المأمورية المختصة</label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الموقف من الفاتورة الإلكترونية</label>
                <select
                  value={formData.eInvoicingStatus}
                  onChange={(e) => setFormData({ ...formData, eInvoicingStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="REGISTERED">مسجل بالمنظومة</option>
                  <option value="MANDATED_STAGE">مدرج بمرحلة إلزام</option>
                  <option value="EXEMPT">معفي</option>
                  <option value="E_RECEIPT">إيصال إلكتروني فقط</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white">بيانات دخول بوابة الفاتورة الإلكترونية (ETA)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      value={formData.etaUsername}
                      onChange={(e) => setFormData({ ...formData, etaUsername: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">كلمة المرور</label>
                    <input
                      type="password"
                      value={formData.etaPassword}
                      onChange={(e) => setFormData({ ...formData, etaPassword: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">تاريخ انتهاء الاعتماد (إن وجد)</label>
                  <input
                    type="date"
                    value={formData.etaExpiry}
                    onChange={(e) => setFormData({ ...formData, etaExpiry: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white">بيانات توكن الختم والتوقيع الإلكتروني</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">الشركة المزودة</label>
                    <select
                      value={formData.tokenProvider}
                      onChange={(e) => setFormData({ ...formData, tokenProvider: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="إيجيبت ترست">إيجيبت ترست (Egypt Trust)</option>
                      <option value="مصر للمقاصة">مصر للمقاصة (MCDR)</option>
                      <option value="دلتا">دلتا (Delta)</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">نوع التوكن</label>
                    <select
                      value={formData.tokenType}
                      onChange={(e) => setFormData({ ...formData, tokenType: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="E_SEAL">ختم إلكتروني (E_SEAL)</option>
                      <option value="E_SIGNATURE">توقيع إلكتروني (E_SIGNATURE)</option>
                      <option value="BOTH">ختم وتوقيع معا (BOTH)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">الرقم السري PIN / Password</label>
                    <input
                      type="password"
                      value={formData.tokenPin}
                      onChange={(e) => setFormData({ ...formData, tokenPin: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">الرقم التسلسلي (Serial No)</label>
                    <input
                      type="text"
                      value={formData.tokenSerial}
                      onChange={(e) => setFormData({ ...formData, tokenSerial: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">تاريخ انتهاء صلاحية التوكن</label>
                  <input
                    type="date"
                    value={formData.tokenExpiry}
                    onChange={(e) => setFormData({ ...formData, tokenExpiry: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EInvoicingTokensRegistryView;
