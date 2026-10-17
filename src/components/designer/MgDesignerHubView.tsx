import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Users,
  ShieldCheck,
  Unlock,
  Database,
  FileCheck2,
  Plus,
  Search,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileText,
  Lock,
  Eye,
  CheckCircle2,
  X,
  Building,
  Phone,
  Calendar,
  Hash,
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/apiClient';

interface Customer {
  id: number;
  name: string;
  phone: string;
  office: string;
  saleDate: string;
  price?: number;
  serial: string;
  maxUsers: number;
  notes?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  createdAt: string;
}

export const MgDesignerHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'KEYS' | 'CUSTOMERS' | 'ISSUE_LICENSE' | 'INCIDENT_UNLOCK' | 'BACKUP' | 'INTEGRITY'>('CUSTOMERS');

  // Key Store State
  const [keyStatus, setKeyStatus] = useState<{ exists: boolean; publicKeyPem?: string | null; keyStorePath?: string }>({ exists: false });
  const [keyPassword, setKeyPassword] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer Registry State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // New Customer Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custOffice, setCustOffice] = useState('');
  const [custSaleDate, setCustSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [custPrice, setCustPrice] = useState<number | ''>('');
  const [custMaxUsers, setCustMaxUsers] = useState<number>(1);
  const [custNotes, setCustNotes] = useState('');

  // History Drawer State
  const [selectedCustHistory, setSelectedCustHistory] = useState<{ customer: Customer; activations: any[]; incidents: any[] } | null>(null);

  // Issue License State
  const [requestCodeInput, setRequestCodeInput] = useState('');
  const [selectedCustomerIdForLicense, setSelectedCustomerIdForLicense] = useState<number | ''>('');
  const [licenseKeyPassword, setLicenseKeyPassword] = useState('');
  const [issuedActivationResult, setIssuedActivationResult] = useState<{ activationCodeGrouped: string; licFileContent: string } | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  // Incident Unlock State
  const [incidentCodeInput, setIncidentCodeInput] = useState('');
  const [unlockKeyPassword, setUnlockKeyPassword] = useState('');
  const [issuedUnlockResult, setIssuedUnlockResult] = useState<{ unlockCodeGrouped: string } | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Backup State
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPathInput, setBackupPathInput] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Integrity State
  const [integrityPassword, setIntegrityPassword] = useState('');
  const [integrityMessage, setIntegrityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    loadKeyStatus();
    loadCustomers();
  }, []);

  const loadKeyStatus = async () => {
    try {
      const res = await fetchWithAuth('/api/designer/keys/status');
      const data = await res.json();
      if (data.success) {
        setKeyStatus({ exists: data.exists, publicKeyPem: data.publicKeyPem, keyStorePath: data.keyStorePath });
      }
    } catch {}
  };

  const loadCustomers = async (q?: string) => {
    try {
      const url = q ? `/api/designer/customers?q=${encodeURIComponent(q)}` : '/api/designer/customers';
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch {}
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyPassword || keyPassword.length < 6) {
      setKeyMessage({ type: 'error', text: 'كلمة السر يجب أن لا تقل عن 6 أحرف.' });
      return;
    }
    setIsGeneratingKey(true);
    setKeyMessage(null);
    try {
      const res = await fetchWithAuth('/api/designer/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: keyPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyMessage({ type: 'success', text: 'تم توليد وتشفير مفاتيح Ed25519 وتصدير المفتاح العام بنجاح!' });
        setKeyPassword('');
        loadKeyStatus();
      } else {
        setKeyMessage({ type: 'error', text: data.error || 'فشل توليد المفاتيح.' });
      }
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.message });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleAddOrUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: custName,
        phone: custPhone,
        office: custOffice,
        saleDate: custSaleDate,
        price: custPrice ? Number(custPrice) : undefined,
        maxUsers: Number(custMaxUsers) || 1,
        notes: custNotes,
      };

      if (editingCustomer) {
        await fetchWithAuth(`/api/designer/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchWithAuth('/api/designer/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setIsCustomerModalOpen(false);
      setEditingCustomer(null);
      resetCustForm();
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetCustForm = () => {
    setCustName('');
    setCustPhone('');
    setCustOffice('');
    setCustSaleDate(new Date().toISOString().slice(0, 10));
    setCustPrice('');
    setCustMaxUsers(1);
    setCustNotes('');
  };

  const handleViewCustomerHistory = async (customer: Customer) => {
    try {
      const res = await fetchWithAuth(`/api/designer/customers/${customer.id}/history`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustHistory({
          customer,
          activations: data.activations || [],
          incidents: data.incidents || [],
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleIssueLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError(null);
    setIssuedActivationResult(null);

    if (!requestCodeInput || !selectedCustomerIdForLicense || !licenseKeyPassword) {
      setLicenseError('جميع الحقول مطلوبة لإصدار الترخيص.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/designer/issue-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestCode: requestCodeInput,
          customerId: selectedCustomerIdForLicense,
          password: licenseKeyPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedActivationResult({
          activationCodeGrouped: data.activationCodeGrouped,
          licFileContent: data.licFileContent,
        });
      } else {
        setLicenseError(data.error || 'فشل إصدار كود التفعيل.');
      }
    } catch (err: any) {
      setLicenseError(err.message);
    }
  };

  const handleIssueUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setIssuedUnlockResult(null);

    if (!incidentCodeInput || !unlockKeyPassword) {
      setUnlockError('كود الحادثة وكلمة السر مطلوبان.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/designer/issue-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentCode: incidentCodeInput,
          password: unlockKeyPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedUnlockResult({ unlockCodeGrouped: data.unlockCodeGrouped });
      } else {
        setUnlockError(data.error || 'فشل توليد كود فك القفل.');
      }
    } catch (err: any) {
      setUnlockError(err.message);
    }
  };

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupMessage(null);
    try {
      const res = await fetchWithAuth('/api/designer/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: backupPassword, targetPath: backupPathInput || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupMessage({ type: 'success', text: `تم تصدير النسخة الاحتياطية بنجاح إلى: ${data.exportPath}` });
      } else {
        setBackupMessage({ type: 'error', text: data.error || 'فشل تصدير النسخة الاحتياطية.' });
      }
    } catch (err: any) {
      setBackupMessage({ type: 'error', text: err.message });
    }
  };

  const handleSignIntegrity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntegrityMessage(null);
    try {
      const res = await fetchWithAuth('/api/designer/integrity/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: integrityPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIntegrityMessage({ type: 'success', text: `تم توقيع سلامة ملفات المشروع بنجاح (${data.filesCount} ملف)!` });
      } else {
        setIntegrityMessage({ type: 'error', text: data.error || 'فشل توقيع سلامة الملفات.' });
      }
    } catch (err: any) {
      setIntegrityMessage({ type: 'error', text: err.message });
    }
  };

  const downloadLicFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 dir-rtl">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-900/60 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
            MG
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>أداة مصمم المنظومة</span>
              <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                MG Designer Workstation
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              بيئة تحكّم محلية حصرية لمصمم البرنامج لتوليد وتراخيص وتراخيص الطوارئ والتوقيع الرقمي Ed25519
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>127.0.0.1 Localhost Only</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CUSTOMERS' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سجل العملاء والتفعيل</span>
        </button>

        <button
          onClick={() => setActiveTab('ISSUE_LICENSE')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ISSUE_LICENSE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>إصدار التراخيص (License)</span>
        </button>

        <button
          onClick={() => setActiveTab('INCIDENT_UNLOCK')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'INCIDENT_UNLOCK' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Unlock className="w-4 h-4" />
          <span>فك الحوادث والقفل (Incident Unlock)</span>
        </button>

        <button
          onClick={() => setActiveTab('KEYS')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'KEYS' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>إدارة المفاتيح Ed25519</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'BACKUP' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>النسخة الاحتياطية المشفّرة</span>
        </button>

        <button
          onClick={() => setActiveTab('INTEGRITY')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'INTEGRITY' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>توقيع سلامة الملفات (Sign Integrity)</span>
        </button>
      </div>

      {/* TAB 1: CUSTOMERS */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث باسم العميل، الهاتف، المكتب، أو السيريال..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  loadCustomers(e.target.value);
                }}
                className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              onClick={() => {
                setEditingCustomer(null);
                resetCustForm();
                setIsCustomerModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">السيريال التلقائي</th>
                  <th className="p-3">اسم العميل</th>
                  <th className="p-3">الهاتف</th>
                  <th className="p-3">المكتب</th>
                  <th className="p-3">تاريخ البيع</th>
                  <th className="p-3">عدد المستخدمين</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                      لا يوجد عملاء مسجلين حالياً.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400">{c.serial}</td>
                      <td className="p-3 font-bold text-white">{c.name}</td>
                      <td className="p-3 font-mono dir-ltr text-right">{c.phone}</td>
                      <td className="p-3">{c.office}</td>
                      <td className="p-3 font-mono">{c.saleDate}</td>
                      <td className="p-3 font-mono font-bold">{c.maxUsers}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setCustName(c.name);
                            setCustPhone(c.phone);
                            setCustOffice(c.office);
                            setCustSaleDate(c.saleDate);
                            setCustPrice(c.price || '');
                            setCustMaxUsers(c.maxUsers);
                            setCustNotes(c.notes || '');
                            setIsCustomerModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleViewCustomerHistory(c)}
                          className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          السجل والبصمات
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ISSUE LICENSE */}
      {activeTab === 'ISSUE_LICENSE' && (
        <div className="max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span>إصدار وتوقيع كود التفعيل الرقمي (Ed25519 Activation)</span>
          </h2>

          <form onSubmit={handleIssueLicense} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                ألصق كود الطلب من العميل (License Request Code Base32):
              </label>
              <textarea
                rows={3}
                value={requestCodeInput}
                onChange={(e) => setRequestCodeInput(e.target.value)}
                placeholder="ألصق الكود المأخوذ من شاشة تفعيل العميل..."
                required
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اختر العميل من سجل المصمم:</label>
                <select
                  value={selectedCustomerIdForLicense}
                  onChange={(e) => setSelectedCustomerIdForLicense(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.office} ({c.serial})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">كلمة سر المفتاح الخاص (تُطلب عند كل إصدار):</label>
                <input
                  type="password"
                  value={licenseKeyPassword}
                  onChange={(e) => setLicenseKeyPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>توليد وتوقيع كود التفعيل المعتمد</span>
            </button>
          </form>

          {licenseError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{licenseError}</span>
            </div>
          )}

          {issuedActivationResult && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم التوقيع والإصدار بنجاح!</span>
                </span>

                <button
                  onClick={() => downloadLicFile('license.lic', issuedActivationResult.licFileContent)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف الترخيص (license.lic)</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">كود التفعيل النصي المقسّم المعتمد للنسخ:</label>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs font-bold text-amber-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{issuedActivationResult.activationCodeGrouped}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(issuedActivationResult.activationCodeGrouped);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shrink-0 cursor-pointer"
                    title="نسخ الكود"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INCIDENT UNLOCK */}
      {activeTab === 'INCIDENT_UNLOCK' && (
        <div className="max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Unlock className="w-5 h-5 text-amber-500" />
            <span>توليد كود فك القفل للحوادث الطارئة (One-Time Incident Unlock)</span>
          </h2>

          <form onSubmit={handleIssueUnlock} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">ألصق كود الحادثة من العميل (Incident Code Base32):</label>
              <textarea
                rows={3}
                value={incidentCodeInput}
                onChange={(e) => setIncidentCodeInput(e.target.value)}
                placeholder="ألصق كود الحادثة المأخوذ من شاشة القفل عند العميل..."
                required
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">كلمة سر المفتاح الخاص:</label>
              <input
                type="password"
                value={unlockKeyPassword}
                onChange={(e) => setUnlockKeyPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>توليد كود الفك المربوط بالبصمة لمرة واحدة فقط</span>
            </button>
          </form>

          {unlockError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{unlockError}</span>
            </div>
          )}

          {issuedUnlockResult && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم توليد كود الفك لمرة واحدة فقط (One-Time Unlock Code)!</span>
              </span>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs font-bold text-amber-300 break-all select-all flex items-center justify-between gap-2">
                <span>{issuedUnlockResult.unlockCodeGrouped}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(issuedUnlockResult.unlockCodeGrouped);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shrink-0 cursor-pointer"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KEYS MANAGEMENT */}
      {activeTab === 'KEYS' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <span>إدارة وتوليد زوج مفاتيح التوقيع الرقمي Ed25519</span>
          </h2>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">حالة ملف المفاتيح:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  keyStatus.exists ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {keyStatus.exists ? 'موجود ومشرّف (Encrypted Key Pair Active)' : 'غير موجود (Missing Key Pair)'}
              </span>
            </div>

            {keyStatus.publicKeyPem && (
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 block mb-1">المفتاح العام المصدر (Ed25519 Public Key):</span>
                <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto">
                  {keyStatus.publicKeyPem}
                </pre>
              </div>
            )}
          </div>

          <form onSubmit={handleGenerateKey} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-amber-400">توليد زوج مفاتيح جديد مشفّر بكلمة سر:</h3>
            <p className="text-[11px] text-slate-400">
              يتم تشفير المفتاح الخاص بكلمة السر باستخدام خوارزمية scrypt + AES-256-GCM. لا يظهر المفتاح الخاص إطلاقاً على الشاشة وتُطلب كلمة السر عند كل عملية توقيع.
            </p>

            <input
              type="password"
              value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)}
              placeholder="تعيين كلمة سر حماية المفتاح الخاص (min 6 chars)..."
              required
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />

            <button
              type="submit"
              disabled={isGeneratingKey}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGeneratingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>توليد وتشفير زوج المفاتيح الآن</span>
            </button>
          </form>

          {keyMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                keyMessage.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              <span>{keyMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BACKUP */}
      {activeTab === 'BACKUP' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            <span>تصدير واستيراد نسخة احتياطية مشفّرة لسجل العملاء والتراخيص</span>
          </h2>

          <form onSubmit={handleExportBackup} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">كلمة سر تشفير النسخة الاحتياطية:</label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">مسار التصدير المخصص (اختياري):</label>
              <input
                type="text"
                value={backupPathInput}
                onChange={(e) => setBackupPathInput(e.target.value)}
                placeholder="مثال: /path/to/backup.mgdb"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية مشفّرة (AES-256-GCM)</span>
            </button>
          </form>

          {backupMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                backupMessage.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              <span>{backupMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: INTEGRITY */}
      {activeTab === 'INTEGRITY' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-500" />
            <span>توقيع سلامة ملفات المشروع (tools/sign-integrity.cjs)</span>
          </h2>

          <form onSubmit={handleSignIntegrity} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">كلمة سر المفتاح الخاص لتوقيع الملفات:</label>
              <input
                type="password"
                value={integrityPassword}
                onChange={(e) => setIntegrityPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>توليد وتوقيع integrity.json و integrity.sig</span>
            </button>
          </form>

          {integrityMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                integrityMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              <span>{integrityMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400">
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد بسجل المصمم'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrUpdateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">اسم العميل الثلاثي/الرباعي:</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                  placeholder="أحمد علي إبراهيم"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    required
                    placeholder="01012345678"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">اسم المكتب / المنشأة:</label>
                  <input
                    type="text"
                    value={custOffice}
                    onChange={(e) => setCustOffice(e.target.value)}
                    required
                    placeholder="مكتب النور للمحاسبة"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">تاريخ البيع:</label>
                  <input
                    type="date"
                    value={custSaleDate}
                    onChange={(e) => setCustSaleDate(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">السعر (اختياري):</label>
                  <input
                    type="number"
                    value={custPrice}
                    onChange={(e) => setCustPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="5000"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">عدد اليوزرات:</label>
                  <input
                    type="number"
                    value={custMaxUsers}
                    onChange={(e) => setCustMaxUsers(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ملاحظات المصمم:</label>
                <textarea
                  rows={2}
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  placeholder="ملاحظات خاصة بالعقد أو الدفع..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-slate-950 font-black rounded-xl cursor-pointer">
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer History Modal */}
      {selectedCustHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 text-white shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-amber-400">سجل تفعيلات وبصمات العميل: {selectedCustHistory.customer.name}</h3>
                <span className="text-[11px] font-mono text-slate-400">السيريال: {selectedCustHistory.customer.serial}</span>
              </div>
              <button onClick={() => setSelectedCustHistory(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-1">تاريخ التفعيلات والبصمات:</h4>
              {selectedCustHistory.activations.length === 0 ? (
                <p className="text-xs text-slate-500">لا يوجد سجل تفعيلات سابق.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustHistory.activations.map((a: any) => (
                    <div key={a.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>تاريخ الإصدار: {a.issuedAt}</span>
                        <span>المستخدمين: {a.maxUsers}</span>
                      </div>
                      <div className="font-mono text-amber-300">البصمة: {a.fingerprint}</div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-1 pt-2">سجل حوادث القفل والفك:</h4>
              {selectedCustHistory.incidents.length === 0 ? (
                <p className="text-xs text-slate-500">لا يوجد سجل حوادث قفل لهذا العميل.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustHistory.incidents.map((inc: any) => (
                    <div key={inc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>تاريخ الحادثة: {inc.issuedAt}</span>
                        <span className="text-amber-400">السبب: {inc.reason}</span>
                      </div>
                      <div className="font-mono text-emerald-400">كود النونس (Nonce): {inc.nonce}</div>
                      <div className="text-[10px] text-slate-500">استخدام كود الفك: {inc.usedCount} مرة</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
