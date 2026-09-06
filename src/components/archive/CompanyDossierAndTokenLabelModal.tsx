import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  KeyRound,
  ShieldCheck,
  Building,
  Phone,
  FileText,
  Scissors,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Edit3,
  Save,
  Tag,
  Building2,
  Sparkles,
  ArrowRight,
  Send,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ClientArchiveRecord } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { PrintService } from '../../services/PrintService';

export interface SubjectionItem {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  badge?: string;
  isCustom?: boolean;
}

interface CompanyDossierAndTokenLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientArchiveRecord;
  officeProfile: DatabaseState['officeProfile'];
}

export const CompanyDossierAndTokenLabelModal: React.FC<CompanyDossierAndTokenLabelModalProps> = ({
  isOpen,
  onClose,
  client,
  officeProfile,
}) => {
  const [showPasswords, setShowPasswords] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'PREVIEW' | 'EDIT_DATA'>('PREVIEW');

  // Form State for Quick Editing before Printing
  const [formData, setFormData] = useState({
    name: client.name || '',
    commercialRegistrationNo: client.commercialRegistrationNo || '',
    taxCardNo: client.taxCardNo || '',
    incomeTaxFileNo: client.incomeTaxFileNo || '',
    taxOffice: client.taxOffice || 'مأمورية ضرائب كبار الممولين / شركات الأموال',
    socialInsuranceNo: client.socialInsuranceNo || '',
    socialInsuranceOffice: client.socialInsuranceOffice || 'مكتب تأمينات شركات الأموال',
    insuredWorkersCount: client.insuredWorkersCount ?? 5,
    activity: client.activity || '',
    contactPerson: client.contactPerson || '',
    phone: client.phone || '',
    address: client.address || '',
    
    // Subjection & System Types
    taxSystemType: client.taxSystemType || 'SAP',
    isVatSubject: client.isVatSubject ?? true,
    vatStatus: client.vatStatus || 'STANDARD_14',
    isSocialInsuranceSubject: client.isSocialInsuranceSubject ?? true,
    isPayrollSubject: client.isPayrollSubject ?? true,
    isWithholdingTaxSubject: client.isWithholdingTaxSubject ?? true,
    eInvoicingStatus: client.eInvoicingStatus || 'REGISTERED',
    eInvoicingStage: client.eInvoicingStage || 'المرحلة الفرعية السابعة - ملزم بالفاتورة والإيصال',

    // Token & Portals
    tokenProvider: client.portalCredentials?.eSignatureToken?.provider || 'إيجيبت ترست (Egypt Trust)',
    tokenType: client.portalCredentials?.eSignatureToken?.tokenType || 'E_SEAL',
    tokenPin: client.portalCredentials?.eSignatureToken?.pin || 'Mg@2026#88',
    tokenSerial: client.portalCredentials?.eSignatureToken?.serialNumber || 'ET-2026-99182',
    tokenExpiry: client.portalCredentials?.eSignatureToken?.expiryDate || '2027/05/30',

    // Other Portals
    etaUser: client.portalCredentials?.etaEInvoicing?.username || client.email || `${client.taxCardNo || 'eta'}@portal.gov.eg`,
    etaPass: client.portalCredentials?.etaEInvoicing?.password || 'Eta@9981#Pass',
    
    sapUser: client.portalCredentials?.sapPortal?.username || client.taxCardNo || '492817302_SAP',
    sapPass: client.portalCredentials?.sapPortal?.password || 'SapEgypt#2026!',

    payrollUser: client.portalCredentials?.etaPayrollTax?.username || client.taxCardNo || 'PAY_492817302',
    payrollPass: client.portalCredentials?.etaPayrollTax?.password || 'Pay#7718!eg',

    nafezaUser: client.portalCredentials?.nafeza?.username || `NAF_${client.taxCardNo || '817'}`,
    nafezaPass: client.portalCredentials?.nafeza?.password || 'Nafeza#2026$Safe',

    insuranceUser: client.portalCredentials?.socialInsurancePortal?.username || client.socialInsuranceNo || 'INS_2940182',
    insurancePass: client.portalCredentials?.socialInsurancePortal?.password || 'Ins#Eg8891!',
  });

  // Dynamic Subjection Obligations List with toggleable inclusion and full text customizability
  const [subjectionItems, setSubjectionItems] = useState<SubjectionItem[]>([
    {
      id: 'tax_system',
      enabled: true,
      title: 'نوع المنظومة الضريبية',
      description: client.taxSystemType === 'OLD_PORTAL'
        ? 'المنظومة القديمة (بوابة مصلحة الضرائب المصرية التقليدية)'
        : 'منظومة ساب (SAP المدمجة - المأموريات والمراكز الضريبية المدمجة)',
      badge: client.taxSystemType === 'OLD_PORTAL' ? 'المنظومة القديمة' : 'SAP ساب',
    },
    {
      id: 'vat',
      enabled: client.isVatSubject ?? (client.vatStatus ? client.vatStatus !== 'NOT_SUBJECT' && client.vatStatus !== 'EXEMPT' : true),
      title: 'ضريبة القيمة المضافة (VAT)',
      description: client.vatStatus === 'TABLE_TAX'
        ? 'خاضع لضريبة الجدول فقط - مسجل رسمياً'
        : client.vatStatus === 'EXEMPT'
        ? 'معفى قانوناً من ضريبة القيمة المضافة طبقاً لأحكام القانون'
        : client.vatStatus === 'NOT_SUBJECT'
        ? 'غير خاضع / لم يبلغ حد التسجيل الإلزامي'
        : 'خاضع ومسجل بالسعر العام (14%) - مصلحة الضرائب المصرية',
      badge: '14% عام',
    },
    {
      id: 'social_insurance',
      enabled: client.isSocialInsuranceSubject ?? true,
      title: 'التأمينات الاجتماعية والعمل',
      description: `مسجل تأمينياً برقم منشأة (${client.socialInsuranceNo || '2940182'}) - عمالة مؤمن عليها: ${client.insuredWorkersCount ?? 5} أفراد`,
      badge: 'تأمينات',
    },
    {
      id: 'e_invoicing',
      enabled: true,
      title: 'الفاتورة والإيصال الإلكتروني',
      description: 'ملزم ومسجل بالمنظومة المركزية ومزود بختم/توقيع إلكتروني سارٍ',
      badge: 'ETA',
    },
    {
      id: 'payroll',
      enabled: client.isPayrollSubject ?? true,
      title: 'ضريبة كسب العمل والأجور',
      description: 'خاضع وملزم بتقديم إقرار المرتبات نموذج 4 ربع السنوي والتسوية السنوية',
      badge: 'نموذج 4',
    },
    {
      id: 'withholding',
      enabled: client.isWithholdingTaxSubject ?? true,
      title: 'الخصم والتحصيل (نموذج 41)',
      description: 'خاضع لتوريد نماذج الخصم والإضافة الربع سنوية تحت حساب الضريبة',
      badge: 'نموذج 41',
    },
    {
      id: 'income_tax',
      enabled: true,
      title: 'ضريبة الدخل والأرباح التجارية',
      description: 'ملزم بتقديم الإقرار الضريبي السنوي المعتمد من المحاسب القانوني',
      badge: 'إقرار سنوي',
    },
    {
      id: 'customs',
      enabled: false,
      title: 'منظومة نافذة والتجارة الخارجية',
      description: 'مسجل بمتعاملي الجمارك ومفعل على منظومة التسجيل المسبق للشحنات ACI',
      badge: 'نافذة',
    },
  ]);

  // Sync with client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        commercialRegistrationNo: client.commercialRegistrationNo || '',
        taxCardNo: client.taxCardNo || '',
        incomeTaxFileNo: client.incomeTaxFileNo || '',
        taxOffice: client.taxOffice || 'مأمورية ضرائب كبار الممولين / شركات الأموال',
        socialInsuranceNo: client.socialInsuranceNo || '',
        socialInsuranceOffice: client.socialInsuranceOffice || 'مكتب تأمينات شركات الأموال',
        insuredWorkersCount: client.insuredWorkersCount ?? 5,
        activity: client.activity || '',
        contactPerson: client.contactPerson || '',
        phone: client.phone || '',
        address: client.address || '',
        
        taxSystemType: client.taxSystemType || 'SAP',
        isVatSubject: client.isVatSubject ?? true,
        vatStatus: client.vatStatus || 'STANDARD_14',
        isSocialInsuranceSubject: client.isSocialInsuranceSubject ?? true,
        isPayrollSubject: client.isPayrollSubject ?? true,
        isWithholdingTaxSubject: client.isWithholdingTaxSubject ?? true,
        eInvoicingStatus: client.eInvoicingStatus || 'REGISTERED',
        eInvoicingStage: client.eInvoicingStage || 'المرحلة الفرعية السابعة - ملزم بالفاتورة والإيصال',

        tokenProvider: client.portalCredentials?.eSignatureToken?.provider || 'إيجيبت ترست (Egypt Trust)',
        tokenType: client.portalCredentials?.eSignatureToken?.tokenType || 'E_SEAL',
        tokenPin: client.portalCredentials?.eSignatureToken?.pin || 'Mg@2026#88',
        tokenSerial: client.portalCredentials?.eSignatureToken?.serialNumber || 'ET-2026-99182',
        tokenExpiry: client.portalCredentials?.eSignatureToken?.expiryDate || '2027/05/30',

        etaUser: client.portalCredentials?.etaEInvoicing?.username || client.email || `${client.taxCardNo || 'eta'}@portal.gov.eg`,
        etaPass: client.portalCredentials?.etaEInvoicing?.password || 'Eta@9981#Pass',
        
        sapUser: client.portalCredentials?.sapPortal?.username || client.taxCardNo || '492817302_SAP',
        sapPass: client.portalCredentials?.sapPortal?.password || 'SapEgypt#2026!',

        payrollUser: client.portalCredentials?.etaPayrollTax?.username || client.taxCardNo || 'PAY_492817302',
        payrollPass: client.portalCredentials?.etaPayrollTax?.password || 'Pay#7718!eg',

        nafezaUser: client.portalCredentials?.nafeza?.username || `NAF_${client.taxCardNo || '817'}`,
        nafezaPass: client.portalCredentials?.nafeza?.password || 'Nafeza#2026$Safe',

        insuranceUser: client.portalCredentials?.socialInsurancePortal?.username || client.socialInsuranceNo || 'INS_2940182',
        insurancePass: client.portalCredentials?.socialInsurancePortal?.password || 'Ins#Eg8891!',
      });
    }
  }, [client]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleSubjection = (id: string) => {
    setSubjectionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleUpdateSubjectionField = (id: string, field: 'title' | 'description' | 'badge', value: string) => {
    setSubjectionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCustomSubjection = () => {
    const newItem: SubjectionItem = {
      id: `custom_${Date.now()}`,
      enabled: true,
      title: 'بند التزام ضريبي / تنظيمي جديد',
      description: 'خاضع ومسجل - يرجى كتابة وتعديل الصيغة المطلوبة هنا',
      badge: 'مخصص',
      isCustom: true,
    };
    setSubjectionItems((prev) => [...prev, newItem]);
  };

  const handleDeleteSubjection = (id: string) => {
    setSubjectionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveToClientDb = () => {
    const updatedPortalCredentials = {
      ...(client.portalCredentials || {}),
      eSignatureToken: {
        provider: formData.tokenProvider,
        tokenType: formData.tokenType,
        pin: formData.tokenPin,
        password: formData.tokenPin,
        serialNumber: formData.tokenSerial,
        expiryDate: formData.tokenExpiry,
      },
      etaEInvoicing: {
        username: formData.etaUser,
        password: formData.etaPass,
        portalUrl: 'https://invoicing.eta.gov.eg',
      },
      sapPortal: {
        username: formData.sapUser,
        password: formData.sapPass,
      },
      etaPayrollTax: {
        username: formData.payrollUser,
        password: formData.payrollPass,
      },
      nafeza: {
        username: formData.nafezaUser,
        password: formData.nafezaPass,
      },
      socialInsurancePortal: {
        username: formData.insuranceUser,
        password: formData.insurancePass,
      },
    };

    db.updateClient(client.id, {
      name: formData.name,
      commercialRegistrationNo: formData.commercialRegistrationNo,
      taxCardNo: formData.taxCardNo,
      incomeTaxFileNo: formData.incomeTaxFileNo,
      taxOffice: formData.taxOffice,
      socialInsuranceNo: formData.socialInsuranceNo,
      socialInsuranceOffice: formData.socialInsuranceOffice,
      insuredWorkersCount: formData.insuredWorkersCount,
      taxSystemType: formData.taxSystemType,
      isVatSubject: formData.isVatSubject,
      vatStatus: formData.vatStatus,
      isSocialInsuranceSubject: formData.isSocialInsuranceSubject,
      isPayrollSubject: formData.isPayrollSubject,
      isWithholdingTaxSubject: formData.isWithholdingTaxSubject,
      eInvoicingStatus: formData.eInvoicingStatus,
      eInvoicingStage: formData.eInvoicingStage,
      portalCredentials: updatedPortalCredentials,
    });

    setActiveSubTab('PREVIEW');
  };

  const handlePrintDossier = () => {
    PrintService.printElementById('company-dossier-print-container', {
      title: `بطاقة_ملف_المنشأة_وليبيل_التوكن_${formData.name.replace(/\s+/g, '_')}`,
      pageSize: 'A4',
      orientation: 'portrait',
    });
  };

  const printDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const officePhone = officeProfile.phone || '01003335360';
  const auditorName = officeProfile.auditorName || 'محمد جميل مرعي';
  const licenseNo = officeProfile.licenseNumber || 'س.م.م / 43122';

  // Filter only active / enabled subjection obligations for printing
  const activeSubjections = subjectionItems.filter((item) => item.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-950/40">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  بطاقة المنشأة وحافظة الحسابات وليبل ميدالية التوكن (A4 Master Sheet)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  توفير الورق 100%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                منشأة: <strong className="text-amber-300">{formData.name}</strong> | كود: <span className="font-mono text-slate-300">{client.clientCode || 'CL-01'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Tab between Preview and Quick Edit */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveSubTab('PREVIEW')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'PREVIEW'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                معاينة الطباعة A4
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('EDIT_DATA')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeSubTab === 'EDIT_DATA'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                تعديل وتخصيص البيانات والصيغ
              </button>
            </div>

            {/* Quick Print Button */}
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند A4</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/60">
          {activeSubTab === 'EDIT_DATA' ? (
            /* Quick Edit Form */
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل وضبط بيانات المنشأة والخضوع الضريبي والتوكن</span>
                </div>
                <span className="text-xs text-slate-400">التعديلات تنعكس فوراً في المعاينة وقاعدة بيانات العميل</span>
              </div>

              {/* 1. Basic Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-400" />
                  1. البيانات الأساسية والتأسيسية
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اسم المنشأة / السمة التجارية</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم التسجيل الضريبي</label>
                    <input
                      type="text"
                      value={formData.taxCardNo}
                      onChange={(e) => setFormData({ ...formData, taxCardNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم الملف الضريبي</label>
                    <input
                      type="text"
                      value={formData.incomeTaxFileNo}
                      onChange={(e) => setFormData({ ...formData, incomeTaxFileNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">مأمورية الضرائب المختصة</label>
                    <input
                      type="text"
                      value={formData.taxOffice}
                      onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم السجل التجاري</label>
                    <input
                      type="text"
                      value={formData.commercialRegistrationNo}
                      onChange={(e) => setFormData({ ...formData, commercialRegistrationNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">الممثل القانوني / جهة الاتصال</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Subjection & System Types (Customizable & Flexible) */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      2. إدارة الموقف والالتزام الضريبي والتأميني (تضمين / استبعاد + تعديل الصيغة بحرية)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      علم على البند [✔] لإدراجه في الورقة، أو قم بإلغاء التحديد [✖] لإزالته وحذفه تماماً من الورقة، مع إمكانية تعديل صيغة كل بند مباشرة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomSubjection}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند التزام مخصص</span>
                  </button>
                </div>

                {/* Subjection Items Interactive List */}
                <div className="space-y-2.5">
                  {subjectionItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.enabled
                          ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox Toggle */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => handleToggleSubjection(item.id)}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 focus:ring-offset-slate-900 cursor-pointer"
                            id={`sub_check_${item.id}`}
                          />
                        </div>

                        {/* Title & Phrasing Editor */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-[10px] text-slate-400 mb-0.5">عنوان البند / الضريبة:</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateSubjectionField(item.id, 'title', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                              disabled={!item.enabled}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              الصيغة والنص المعروض بالورقة (يمكنك تعديلها بحرية):
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateSubjectionField(item.id, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-200"
                              disabled={!item.enabled}
                            />
                          </div>
                        </div>

                        {/* Status Label & Delete if custom */}
                        <div className="flex items-center gap-1.5 pt-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {item.enabled ? 'مُدرج بالورقة' : 'مستبعد ومحذوف'}
                          </span>
                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSubjection(item.id)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="حذف هذا البند المخصص"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Token & Credentials */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  3. بيانات توكن الختم والتوقيع وباسوردات البوابات الحكومية
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Token PIN */}
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40">
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      🔑 PIN / باسورد التوكن (لليبل):
                    </label>
                    <input
                      type="text"
                      value={formData.tokenPin}
                      onChange={(e) => setFormData({ ...formData, tokenPin: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/50 text-xs font-mono font-bold text-amber-200"
                      placeholder="e.g. 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">الشركة المصدرة للتوكن</label>
                    <input
                      type="text"
                      value={formData.tokenProvider}
                      onChange={(e) => setFormData({ ...formData, tokenProvider: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      placeholder="Egypt Trust / MCDR"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نوع التوكن</label>
                    <select
                      value={formData.tokenType}
                      onChange={(e) => setFormData({ ...formData, tokenType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="E_SEAL">ختم إلكتروني (E-Seal للشركات)</option>
                      <option value="E_SIGNATURE">توقيع إلكتروني (E-Signature للأفراد)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">تاريخ انتهاء الشهادة</label>
                    <input
                      type="text"
                      value={formData.tokenExpiry}
                      onChange={(e) => setFormData({ ...formData, tokenExpiry: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                </div>

                {/* Other Portals Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">بوابة الفاتورة (ETA) - مستخدم / باسورد</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.etaUser}
                        onChange={(e) => setFormData({ ...formData, etaUser: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white"
                        placeholder="User"
                      />
                      <input
                        type="text"
                        value={formData.etaPass}
                        onChange={(e) => setFormData({ ...formData, etaPass: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                        placeholder="Pass"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">منظومة الضرائب (SAP/القديمة) - مستخدم / باسورد</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.sapUser}
                        onChange={(e) => setFormData({ ...formData, sapUser: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white"
                        placeholder="User"
                      />
                      <input
                        type="text"
                        value={formData.sapPass}
                        onChange={(e) => setFormData({ ...formData, sapPass: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                        placeholder="Pass"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">منظومة نافذة (Nafeza) - مستخدم / باسورد</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.nafezaUser}
                        onChange={(e) => setFormData({ ...formData, nafezaUser: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white"
                        placeholder="User"
                      />
                      <input
                        type="text"
                        value={formData.nafezaPass}
                        onChange={(e) => setFormData({ ...formData, nafezaPass: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                        placeholder="Pass"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">كسب العمل (Payroll Tax) - مستخدم / باسورد</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.payrollUser}
                        onChange={(e) => setFormData({ ...formData, payrollUser: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white"
                        placeholder="User"
                      />
                      <input
                        type="text"
                        value={formData.payrollPass}
                        onChange={(e) => setFormData({ ...formData, payrollPass: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                        placeholder="Pass"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">التأمينات الاجتماعية - مستخدم / باسورد</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.insuranceUser}
                        onChange={(e) => setFormData({ ...formData, insuranceUser: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white"
                        placeholder="User"
                      />
                      <input
                        type="text"
                        value={formData.insurancePass}
                        onChange={(e) => setFormData({ ...formData, insurancePass: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                        placeholder="Pass"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('PREVIEW')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء والعودة للمعاينة
                </button>
                <button
                  type="button"
                  onClick={handleSaveToClientDb}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات وتحديث المعاينة A4</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Printable A4 Master Sheet & Keyring Label Container */
            <div className="flex flex-col items-center">
              
              {/* Document Actions Bar above A4 page */}
              <div className="w-full max-w-[210mm] mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-xs"
                  >
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{showPasswords ? 'إخفاء الباسوردات بالمعاينة' : 'إظهار الباسوردات'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('EDIT_DATA')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>تعديل البنود والصيغ</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تم ضبط مقاس الورقة A4 (210×297 مم) مع ليبل التوكن القياسي (4.8×2.0 سم)</span>
                  </span>
                </div>
              </div>

              {/* The Actual Printable Canvas Container */}
              <div
                id="company-dossier-print-container"
                className="w-full max-w-[210mm] min-h-[296mm] bg-white text-slate-900 shadow-2xl p-[8mm] sm:p-[10mm] relative flex flex-col justify-between font-sans border border-slate-300 print:border-none print:shadow-none print:p-[8mm]"
                dir="rtl"
                style={{
                  fontFamily: 'Cairo, Tahoma, sans-serif',
                }}
              >
                {/* Upper Dossier Section */}
                <div>
                  {/* 1. Header: Office Info & Document Title */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
                    <div>
                      <h1 className="text-base font-black text-slate-950 flex items-center gap-1.5">
                        <Building2 className="w-5 h-5 text-slate-800" />
                        <span>{officeProfile.firmName || officeProfile.officeName || 'مكتب المحاسب القانوني ومراقب الحسابات'}</span>
                      </h1>
                      <div className="text-[11px] text-slate-700 font-bold mt-0.5">
                        <span>المحاسب القانوني: <strong>{auditorName}</strong></span>
                        <span className="mx-2">|</span>
                        <span>قيد: <strong className="font-mono">{licenseNo}</strong></span>
                        <span className="mx-2">|</span>
                        <span>هاتف: <strong className="font-mono">{officePhone}</strong></span>
                      </div>
                      {/* Office addresses */}
                      {(officeProfile.showMainOfficeAddress !== false || officeProfile.showBranchOfficeAddress !== false) && (
                        <div className="text-[9px] text-slate-600 mt-1 space-y-0.5">
                          {officeProfile.showMainOfficeAddress !== false && (officeProfile.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية') && (
                            <div><strong>الرئيسي:</strong> {officeProfile.mainOfficeAddress || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية'}</div>
                          )}
                          {officeProfile.showBranchOfficeAddress !== false && (officeProfile.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية') && (
                            <div><strong>الفرع:</strong> {officeProfile.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية'}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-left">
                      <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black rounded">
                        بطاقة ملف المنشأة وحافظة الحسابات
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 font-mono">
                        كود: <strong className="text-slate-950">{client.clientCode || 'CL-01'}</strong> | تاريخ: {printDate}
                      </div>
                    </div>
                  </div>

                  {/* 2. Section 1: Basic Company & Tax Master Info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 border-b border-slate-300 pb-1 mb-2">
                      <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                      <span>أولاً: بيانات المنشأة والملف الضريبي والتجاري:</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="col-span-2">
                        <span className="text-slate-500">اسم المنشأة / السمة:</span>{' '}
                        <strong className="text-slate-950 font-black">{formData.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">الكيان القانوني:</span>{' '}
                        <strong className="text-slate-800">
                          {client.companyType === 'JOINT_STOCK'
                            ? 'شركة مساهمة'
                            : client.companyType === 'LLC'
                            ? 'شركة ذات مسؤولية محدودة'
                            : client.companyType === 'ONE_PERSON'
                            ? 'شركة الشخص الواحد'
                            : client.companyType === 'PARTNERSHIP'
                            ? 'شركة تضامن / أشخاص'
                            : 'منشأة فردية'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">السجل التجاري:</span>{' '}
                        <strong className="font-mono text-slate-900">{formData.commercialRegistrationNo || '—'}</strong>
                      </div>

                      <div>
                        <span className="text-slate-500">رقم التسجيل الضريبي:</span>{' '}
                        <strong className="font-mono text-slate-950 font-bold">{formData.taxCardNo || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">رقم الملف الضريبي:</span>{' '}
                        <strong className="font-mono text-slate-900">{formData.incomeTaxFileNo || '—'}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">مأمورية الضرائب المختصة:</span>{' '}
                        <strong className="text-slate-800">{formData.taxOffice}</strong>
                      </div>

                      <div className="col-span-2">
                        <span className="text-slate-500">النشاط التجاري / الصناعي:</span>{' '}
                        <span className="text-slate-800">{formData.activity || 'تجارة وتوريدات عامة وخدمات'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">الممثل القانوني:</span>{' '}
                        <strong className="text-slate-800">{formData.contactPerson || 'أحمد محمود'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">هاتف العميل:</span>{' '}
                        <span className="font-mono text-slate-800">{formData.phone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Section 2: Tax & Insurance Subjection Matrix (Filtered strictly to active/enabled items) */}
                  <div className="mb-3.5">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                        <span>ثانياً: الموقف والالتزام الضريبي والتأميني ونوع المنظومة الحكومية:</span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 font-bold">
                        (عدد الالتزامات المدرجة: {activeSubjections.length})
                      </span>
                    </div>

                    {activeSubjections.length === 0 ? (
                      <div className="p-3 text-center rounded border border-dashed border-slate-300 text-slate-500 text-xs font-bold">
                        لا توجد بنود التزام ضريبي أو تأميني مفعلة حالياً
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px]">
                        {activeSubjections.map((item) => (
                          <div key={item.id} className="p-2 rounded border border-slate-300 bg-white flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                                <span>{item.title}:</span>
                                {item.badge && (
                                  <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-mono border border-slate-200">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="font-black text-slate-900 leading-tight">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Section 3: Confidential Accounts & Passwords Table */}
                  <div className="mb-3.5">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                        <span>ثالثاً: حافظة بوابات المنظومات الحكومية وكلمات المرور (سري ومحمي للمكتب):</span>
                      </div>
                      <span className="text-[9px] text-rose-700 font-bold">[ وثيقة أرشيف سرية ]</span>
                    </div>

                    <table className="w-full border-collapse text-[10px] border border-slate-300 text-center">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                          <th className="py-1 px-2 border-l border-slate-300 text-right">المنظومة / البوابة الحكومية</th>
                          <th className="py-1 px-2 border-l border-slate-300">اسم المستخدم / User ID</th>
                          <th className="py-1 px-2 border-l border-slate-300 bg-amber-50">كلمة المرور / Password</th>
                          <th className="py-1 px-2 border-l border-slate-300">الرقم التسلسلي / الملاحظات</th>
                          <th className="py-1 px-2">الصلاحية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 1. Token Entry */}
                        <tr className="border-b border-slate-200 bg-amber-50/50 font-bold">
                          <td className="py-1.5 px-2 border-l border-slate-300 text-right text-slate-950">
                            🔑 فلاشة التوكن ({formData.tokenType === 'E_SEAL' ? 'ختم إلكتروني' : 'توقيع إلكتروني'})
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.tokenProvider}
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-300 font-mono text-rose-700 font-black text-xs bg-amber-100/70">
                            {showPasswords ? formData.tokenPin : '••••••••'}
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-300 font-mono text-[9.5px]">
                            سيريال: {formData.tokenSerial}
                          </td>
                          <td className="py-1.5 px-2 text-[9.5px] text-emerald-800">
                            سارٍ حتى {formData.tokenExpiry}
                          </td>
                        </tr>

                        {/* 2. ETA Portal */}
                        <tr className="border-b border-slate-200">
                          <td className="py-1 px-2 border-l border-slate-300 text-right font-bold text-slate-900">
                            بوابة الفاتورة الإلكترونية (ETA)
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.etaUser}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-950 font-bold bg-amber-50/30">
                            {showPasswords ? formData.etaPass : '••••••••'}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 text-[9.5px] text-slate-600">
                            invoicing.eta.gov.eg
                          </td>
                          <td className="py-1 px-2 text-emerald-700 font-bold text-[9.5px]">مفعل</td>
                        </tr>

                        {/* 3. SAP / Old Tax Portal */}
                        <tr className="border-b border-slate-200">
                          <td className="py-1 px-2 border-l border-slate-300 text-right font-bold text-slate-900">
                            منظومة الضرائب المصرية ({formData.taxSystemType === 'SAP' ? 'ساب SAP' : 'القديمة'})
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.sapUser}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-950 font-bold bg-amber-50/30">
                            {showPasswords ? formData.sapPass : '••••••••'}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 text-[9.5px] text-slate-600">
                            {formData.taxSystemType === 'SAP' ? 'SAP Core Tax System' : 'eta.gov.eg portal'}
                          </td>
                          <td className="py-1 px-2 text-emerald-700 font-bold text-[9.5px]">مفعل</td>
                        </tr>

                        {/* 4. Payroll Tax */}
                        <tr className="border-b border-slate-200">
                          <td className="py-1 px-2 border-l border-slate-300 text-right font-bold text-slate-900">
                            بوابة كسب العمل والأجور
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.payrollUser}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-950 font-bold bg-amber-50/30">
                            {showPasswords ? formData.payrollPass : '••••••••'}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 text-[9.5px] text-slate-600">
                            نماذج 4 و التسويات
                          </td>
                          <td className="py-1 px-2 text-emerald-700 font-bold text-[9.5px]">مفعل</td>
                        </tr>

                        {/* 5. Nafeza Customs */}
                        <tr className="border-b border-slate-200">
                          <td className="py-1 px-2 border-l border-slate-300 text-right font-bold text-slate-900">
                            منظومة نافذة الجمركية (Nafeza)
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.nafezaUser}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-950 font-bold bg-amber-50/30">
                            {showPasswords ? formData.nafezaPass : '••••••••'}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 text-[9.5px] text-slate-600">
                            nafeza.gov.eg (ACI)
                          </td>
                          <td className="py-1 px-2 text-slate-600 text-[9.5px]">جاهز</td>
                        </tr>

                        {/* 6. Social Insurance Portal */}
                        <tr>
                          <td className="py-1 px-2 border-l border-slate-300 text-right font-bold text-slate-900">
                            بوابة الهيئة القومية للتأمين الاجتماعي
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-700">
                            {formData.insuranceUser}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 font-mono text-slate-950 font-bold bg-amber-50/30">
                            {showPasswords ? formData.insurancePass : '••••••••'}
                          </td>
                          <td className="py-1 px-2 border-l border-slate-300 text-[9.5px] text-slate-600">
                            ملف تأميني: {formData.socialInsuranceNo || '2940182'}
                          </td>
                          <td className="py-1 px-2 text-emerald-700 font-bold text-[9.5px]">مفعل</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 5. Procedures Summary & Office Endorsement */}
                  <div className="grid grid-cols-3 gap-2 text-[10.5px] border border-slate-300 p-2 rounded bg-slate-50">
                    <div className="col-span-2">
                      <span className="font-bold text-slate-900">إقرار وتعهد مكتب المحاسبة:</span>
                      <p className="text-[9.5px] text-slate-600 leading-relaxed mt-0.5">
                        تمت مراجعة وتسجيل وتحديث هذه البيانات بمعرفة مكتبنا بصفتنا المحاسب القانوني المعتمد للمنشأة. وتعتبر هذه البطاقة مرجعاً تنظيمياً ورقياً ورقمياً لكافة الالتزامات الضريبية والتأمينية ومتابعة الإجراءات الدورية.
                      </p>
                    </div>
                    <div className="text-center flex flex-col justify-between border-r border-slate-300 pr-2">
                      <span className="text-[10px] font-bold text-slate-800">اعتماد وخاتم المحاسب القانوني</span>
                      <div className="text-[10px] font-black text-slate-950 mt-4">
                        {auditorName}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {licenseNo}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: TOKEN KEYRING CUT-OUT LABEL (4.8cm x 2.0cm standard keyring insert) */}
                <div className="mt-4 pt-2 border-t-2 border-dashed border-slate-400">
                  
                  {/* Scissors Cut line Notice */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1.5">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Scissors className="w-3.5 h-3.5 text-slate-700" />
                      <span>خط قص ليبل ميدالية مفاتيح التوكن (Token Keyring Label - مقاس قياسي 4.8 سم × 2.0 سم):</span>
                    </div>
                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                      ✂️ قص والتركيب داخل ميدالية التوكن البلاستيكية الشفافة
                    </span>
                  </div>

                  {/* Keyring Label Cards (Includes primary and duplicate backup) */}
                  <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Primary Keyring Label (48mm x 20mm) */}
                    <div
                      className="border-2 border-slate-900 rounded p-1.5 bg-white text-slate-950 flex flex-col justify-between shadow-sm relative overflow-hidden"
                      style={{
                        width: '48mm',
                        height: '21mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div className="flex items-start justify-between border-b border-slate-900 pb-0.5 leading-none">
                        <span className="text-[8.5px] font-black truncate max-w-[36mm] text-slate-950">
                          {formData.name}
                        </span>
                        <span className="text-[7.5px] font-mono font-bold bg-slate-900 text-white px-1 rounded-sm">
                          {formData.tokenType === 'E_SEAL' ? 'ختم' : 'توقيع'}
                        </span>
                      </div>

                      <div className="my-auto text-center py-0.5">
                        <div className="text-[7.5px] text-slate-600 font-bold leading-none mb-0.5">
                          PIN / باسورد التوكن:
                        </div>
                        <div className="text-[12.5px] font-mono font-black text-rose-700 tracking-wider leading-none">
                          {formData.tokenPin || 'Mg@2026'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[7px] text-slate-600 pt-0.5 border-t border-slate-300 leading-none">
                        <span className="font-mono">{officePhone}</span>
                        <span>مكتب {auditorName.split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Duplicate Backup Label (48mm x 20mm) */}
                    <div
                      className="border-2 border-slate-900 rounded p-1.5 bg-amber-50 text-slate-950 flex flex-col justify-between shadow-sm relative overflow-hidden"
                      style={{
                        width: '48mm',
                        height: '21mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div className="flex items-start justify-between border-b border-slate-900 pb-0.5 leading-none">
                        <span className="text-[8.5px] font-black truncate max-w-[36mm] text-slate-950">
                          {formData.name}
                        </span>
                        <span className="text-[7px] font-bold text-amber-800">
                          نسخة إضافية
                        </span>
                      </div>

                      <div className="my-auto text-center py-0.5">
                        <div className="text-[7.5px] text-slate-600 font-bold leading-none mb-0.5">
                          PIN / باسورد التوكن:
                        </div>
                        <div className="text-[12.5px] font-mono font-black text-slate-950 tracking-wider leading-none">
                          {formData.tokenPin || 'Mg@2026'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[7px] text-slate-600 pt-0.5 border-t border-slate-300 leading-none">
                        <span className="font-mono">{formData.taxCardNo || 'بطاقة ضريبية'}</span>
                        <span className="font-bold">مكتب المحاسبة</span>
                      </div>
                    </div>

                    {/* Instructions Box */}
                    <div className="text-[9px] text-slate-600 flex-1 min-w-[200px] border border-slate-200 bg-slate-50 p-1.5 rounded">
                      <strong className="text-slate-900 block mb-0.5">تعليمات استخدام ورقة A4 الشاملة:</strong>
                      <ul className="list-disc list-inside space-y-0.5 text-[8.5px] text-slate-600">
                        <li>احفظ ورقة A4 العلوية داخل دوسيه / ملف العميل كبطاقة مرجعية شاملة لكلمات المرور.</li>
                        <li>قص الليبل المستطيل وضعه داخل ميدالية المفاتيح الخاصة بفلاشة التوكن لتمييزها فوراً.</li>
                      </ul>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام الحفظ والأرشفة الذكية لمكاتب المحاسبة والمراجعة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند كاملاً A4</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
