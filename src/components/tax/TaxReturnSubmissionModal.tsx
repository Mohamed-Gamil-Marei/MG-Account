import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Sparkles,
  Edit2,
  Save,
  CheckCircle2,
  Share2,
  Clock,
  Send,
  Layers,
  FileCheck,
} from 'lucide-react';
import { ClientArchiveRecord, TaxDeclarationRecord } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

// Official SAP and General Tax Authority Links provided
export const OFFICIAL_SAP_PORTAL_URL =
  'https://auth.eta.gov.eg:8080/auth/realms/e-tax/protocol/saml?SAMLRequest=fZFBa8JAEIX%2FStj7uhut0S4mIJVCoC1SSw%2B9jclEA8luujOx9t93E2mxF2FPj5n33je7Imibzqx7PtpX%2FOyROMo3qdhpPdfzBO7lXRKXMq4wllDttVzEMJvfl8l%2BUZUiekdPtbOpmE60iHKiHnNLDJaDpKeJjLXU8VuszWwW3oeINiGhtsDj1pG5I6MUhPgJMkwO7jTBg1nqpR5F5RGalhRKhrPqvGNXuEYNpUX06HyBY%2FNUVNAQDg22QFSf8E85t40lM1KmovfWOKCajIUWyXBhduvnJxPam19zka2GaTPC%2BKv92%2BshFv1AJbKqAyroimelrhwv9p15CRb5ZuuauvgeUFrg2wmDUpeyGkdNN1yeGC2LaN007ushnIoDN%2Fsehcoumf9%2FNvsB&RelayState=oucqqvqvwazouwrdorferoafbqoxratvzdwbxfd&SigAlg=http%3A%2F%2Fwww.w3.org%2F2000%2F09%2Fxmldsig%23rsa-sha1&Signature=Djou9cgY%2FYDnax7L%2B5j3Vex%2BFNM7GotG0rntgsxbzLx%2BnpgGJPQcjrXKWNAr6ihpxzZpBqOEQgw5ClxuPBFclBUt5QiMJQMhDgdJp5a5LFLk%2FfFkjKA5RtJx12tzb76%2FBAS%2BnsR3G%2BVrEPNGlUk3qz9%2FLpHx2RXv7p2BlVZ7R%2FA5Kos0ZL%2F3NyR9I5rtU4mxtQV%2FjurnuRv%2FnDNrPIA6dgdb9MQ3%2FQUNzRzhEEe131ZSLVC5CO%2BkW1JTBNdS210ldYxzYZFkDX91MhUL3FpGHvxCCP74cJQXA6f7MrGLXec7prjrEK2lmN5DKxg%2FegfZGxy0mBNPUurWLOsQYaL%2BLw%3D%3D#/home';

export const OFFICIAL_GENERAL_TAX_PORTAL_URL =
  'https://eservice.incometax.gov.eg/etax';

export type TaxReturnOptionType =
  | 'VAT_10'
  | 'INCOME_27_CORP'
  | 'INCOME_28_INDIV'
  | 'PAYROLL_4'
  | 'PAYROLL_ANNUAL'
  | 'WHT_41'
  | 'ZERO_RETURN'
  | 'AMENDED_RETURN';

interface TaxReturnSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  initialClient?: ClientArchiveRecord | null;
  initialPeriod?: string;
  onSuccess?: () => void;
}

export const TaxReturnSubmissionModal: React.FC<TaxReturnSubmissionModalProps> = ({
  isOpen,
  onClose,
  state,
  initialClient,
  initialPeriod = 'مارس 2026',
  onSuccess,
}) => {
  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClient?.id || (state.clients[0]?.id || '')
  );

  const selectedClient = state.clients.find((c) => c.id === selectedClientId) || initialClient || null;

  // System selection: 'SAP' vs 'GENERAL_TAX'
  const [selectedSystem, setSelectedSystem] = useState<'SAP' | 'GENERAL_TAX'>('SAP');

  // Custom link editing
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [sapCustomUrl, setSapCustomUrl] = useState(OFFICIAL_SAP_PORTAL_URL);
  const [generalTaxCustomUrl, setGeneralTaxCustomUrl] = useState(OFFICIAL_GENERAL_TAX_PORTAL_URL);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Copy status feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick edit credentials inline
  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credPin, setCredPin] = useState('');

  // Dropdown Tax Return Details state
  const [returnType, setReturnType] = useState<TaxReturnOptionType>('VAT_10');
  const [taxPeriod, setTaxPeriod] = useState(initialPeriod);
  const [taxYear, setTaxYear] = useState<number>(2026);
  const [dueDate, setDueDate] = useState<string>('2026-04-30');
  const [declarationNature, setDeclarationNature] = useState<'STANDARD_14' | 'ZERO_RETURN' | 'TABLE_TAX' | 'EXEMPT' | 'EXPORT_ZERO'>('STANDARD_14');
  const [salesAmount, setSalesAmount] = useState<number>(0);
  const [purchasesAmount, setPurchasesAmount] = useState<number>(0);
  const [vatOutputTax, setVatOutputTax] = useState<number>(0);
  const [vatInputTax, setVatInputTax] = useState<number>(0);
  const [previousCreditBalance, setPreviousCreditBalance] = useState<number>(0);
  const [netTaxPayable, setNetTaxPayable] = useState<number>(0);

  // Submission confirmation fields
  const [etaReferenceNo, setEtaReferenceNo] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Sync client credentials when client changes
  useEffect(() => {
    if (selectedClient) {
      const isSap = selectedClient.taxSystemType === 'SAP';
      setSelectedSystem(isSap ? 'SAP' : 'GENERAL_TAX');

      const creds = selectedClient.portalCredentials || {};
      const user = isSap
        ? creds.sapPortal?.username || creds.sapTaxPortal?.username || creds.etaGeneralTax?.username || ''
        : creds.etaGeneralTax?.username || creds.sapPortal?.username || '';
      const pass = isSap
        ? creds.sapPortal?.password || creds.sapTaxPortal?.password || creds.etaGeneralTax?.password || ''
        : creds.etaGeneralTax?.password || creds.sapPortal?.password || '';
      const pin = isSap
        ? creds.sapPortal?.pinOtp || creds.sapTaxPortal?.pinOtp || ''
        : creds.etaGeneralTax?.pinOtp || '';

      const sapUrl = creds.sapPortal?.portalUrl || OFFICIAL_SAP_PORTAL_URL;
      const genUrl = creds.etaGeneralTax?.portalUrl || OFFICIAL_GENERAL_TAX_PORTAL_URL;

      setCredUsername(user);
      setCredPassword(pass);
      setCredPin(pin);
      setSapCustomUrl(sapUrl);
      setGeneralTaxCustomUrl(genUrl);

      // Default return type based on client VAT status
      if (selectedClient.isVatSubject) {
        setReturnType('VAT_10');
      } else {
        setReturnType(selectedClient.companyType === 'INDIVIDUAL' ? 'INCOME_28_INDIV' : 'INCOME_27_CORP');
      }

      // Check for existing declaration for this period
      const existingDecl = state.taxDeclarations.find(
        (d) => d.clientId === selectedClient.id && d.period?.includes(taxPeriod)
      );
      if (existingDecl) {
        setEtaReferenceNo(existingDecl.etaReferenceNumber || '');
        setReceiptNumber(existingDecl.receiptNumber || '');
        setNetTaxPayable(existingDecl.netVatPayable || existingDecl.netTaxPayable || 0);
        setVatOutputTax(existingDecl.vatOutputTax || 0);
        setVatInputTax(existingDecl.vatInputTax || 0);
        setSalesAmount(existingDecl.salesTaxableAmount || 0);
        setPurchasesAmount(existingDecl.purchasesTaxableAmount || 0);
      } else {
        setEtaReferenceNo('');
        setReceiptNumber('');
      }
    }
  }, [selectedClientId, selectedClient, state.taxDeclarations, taxPeriod]);

  // Adjust default period & dates when return type changes
  const handleReturnTypeChange = (type: TaxReturnOptionType) => {
    setReturnType(type);
    if (type === 'VAT_10') {
      setDueDate('2026-04-30');
      if (declarationNature === 'ZERO_RETURN') {
        setDeclarationNature('STANDARD_14');
      }
    } else if (type === 'INCOME_27_CORP') {
      setTaxPeriod('السنة المالية 2025');
      setDueDate('2026-04-30');
    } else if (type === 'INCOME_28_INDIV') {
      setTaxPeriod('السنة المالية 2025');
      setDueDate('2026-03-31');
    } else if (type === 'PAYROLL_4') {
      setTaxPeriod('الربع الأول 2026 (يناير - مارس)');
      setDueDate('2026-04-30');
    } else if (type === 'PAYROLL_ANNUAL') {
      setTaxPeriod('تسوية كسب العمل لسنة 2025');
      setDueDate('2026-01-31');
    } else if (type === 'WHT_41') {
      setTaxPeriod('نموذج 41 - الربع الأول 2026');
      setDueDate('2026-04-30');
    } else if (type === 'ZERO_RETURN') {
      setDeclarationNature('ZERO_RETURN');
      setNetTaxPayable(0);
      setVatOutputTax(0);
      setVatInputTax(0);
      setSalesAmount(0);
      setPurchasesAmount(0);
    } else if (type === 'AMENDED_RETURN') {
      setSubmissionNotes('إقرار ضريبي معدل وفقاً للمادة (33) من قانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020');
    }
  };

  // Auto calculate VAT net payable
  const handleVatCalculation = (sales: number, purchases: number, prevCredit: number) => {
    setSalesAmount(sales);
    setPurchasesAmount(purchases);
    const outVat = Math.round(sales * 0.14);
    const inVat = Math.round(purchases * 0.14);
    setVatOutputTax(outVat);
    setVatInputTax(inVat);
    setPreviousCreditBalance(prevCredit);

    const netPeriod = outVat - inVat;
    const finalPayable = Math.max(0, netPeriod - prevCredit);
    setNetTaxPayable(finalPayable);
  };

  // Active portal URL
  const activePortalUrl = selectedSystem === 'SAP' ? sapCustomUrl : generalTaxCustomUrl;

  // 1-Click Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Open Portal in new window
  const handleLaunchPortal = () => {
    if (activePortalUrl) {
      window.open(activePortalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Save Credentials inline
  const handleSaveCredentials = () => {
    if (!selectedClient) return;

    const currentCreds = selectedClient.portalCredentials || {};
    const isSap = selectedSystem === 'SAP';

    const updatedCreds = {
      ...currentCreds,
      sapPortal: isSap
        ? {
            username: credUsername,
            password: credPassword,
            pinOtp: credPin,
            portalUrl: sapCustomUrl,
          }
        : currentCreds.sapPortal,
      etaGeneralTax: !isSap
        ? {
            username: credUsername,
            password: credPassword,
            pinOtp: credPin,
            portalUrl: generalTaxCustomUrl,
          }
        : currentCreds.etaGeneralTax,
    };

    db.updateClient(selectedClient.id, {
      taxSystemType: selectedSystem,
      portalCredentials: updatedCreds,
    });

    setIsEditingCreds(false);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  // Copy Full Return Card
  const handleCopyFullCard = () => {
    if (!selectedClient) return;

    const returnTypeName = getReturnTypeName(returnType);
    const sysName = selectedSystem === 'SAP' ? 'منظومة ساب (SAP)' : 'منظومة مصلحة الضرائب العامة (e-Tax)';

    const text = `=========================================
📋 نموذج وبيانات تقديم الإقرار الضريبي الإلكتروني
=========================================
🏢 المنشأة / الشركة: ${selectedClient.name} (كود: ${selectedClient.clientCode})
🏛️ المأمورية التابعة: ${selectedClient.taxOffice || 'مأمورية الضرائب المختصة'}
🔢 رقم التسجيل الضريبي: ${selectedClient.taxCardNo || 'غير مسجل'}
📁 رقم الملف الضريبي: ${selectedClient.incomeTaxFileNo || 'غير مسجل'}
🏷️ كيان المنشأة: ${selectedClient.companyType === 'INDIVIDUAL' ? 'منشأة فردية' : 'شركة أشخاص / أموال'}
-----------------------------------------
🌐 المنظومة الضريبية: ${sysName}
🔗 رابط البوابة المعتمد:
${activePortalUrl}
-----------------------------------------
👤 اسم المستخدم (اليوزر): ${credUsername || 'غير مسجل'}
🔑 كلمة المرور (الباسورد): ${credPassword || 'غير مسجل'}
${credPin ? `🔒 رمز PIN / الكود الإضافي: ${credPin}\n` : ''}-----------------------------------------
📑 نوع الإقرار: ${returnTypeName}
📅 الفترة الضريبية: ${taxPeriod} (${taxYear})
⏳ تاريخ نهاية المهلة: ${dueDate}
💰 صافي الضريبة واجبة السداد: ${formatEgyptianCurrency(netTaxPayable)}
${etaReferenceNo ? `🧾 رقم إشعار التقديم (ETA Ref): ${etaReferenceNo}\n` : ''}${receiptNumber ? `🏦 رقم إيصال / كود السداد: ${receiptNumber}\n` : ''}=========================================`;

    navigator.clipboard.writeText(text);
    setCopiedField('FULL_CARD');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Submit Declaration & Save Record
  const handleConfirmFiling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const generatedRef = etaReferenceNo || `ETA-${selectedSystem}-${Date.now().toString().slice(-6)}`;

    // Check if declaration exists
    const existingDecl = state.taxDeclarations.find(
      (d) => d.clientId === selectedClient.id && d.period?.includes(taxPeriod)
    );

    if (existingDecl) {
      db.updateTaxDeclaration(existingDecl.id, {
        status: 'SUBMITTED_TO_ETA',
        etaReferenceNumber: generatedRef,
        receiptNumber: receiptNumber || existingDecl.receiptNumber,
        netTaxPayable: netTaxPayable,
        netVatPayable: returnType === 'VAT_10' ? netTaxPayable : undefined,
        vatOutputTax,
        vatInputTax,
        salesTaxableAmount: salesAmount,
        purchasesTaxableAmount: purchasesAmount,
        notes: (existingDecl.notes || '') + (submissionNotes ? ` | ${submissionNotes}` : ''),
      });
    } else {
      db.addTaxDeclaration({
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        declarationType: (returnType === 'ZERO_RETURN' || returnType === 'AMENDED_RETURN' ? 'VAT_10' : returnType) as any,
        period: taxPeriod,
        taxYear,
        dueDate,
        salesTaxableAmount: salesAmount,
        vatOutputTax,
        purchasesTaxableAmount: purchasesAmount,
        vatInputTax,
        netTaxPayable,
        netVatPayable: returnType === 'VAT_10' ? netTaxPayable : undefined,
        status: 'SUBMITTED_TO_ETA',
        etaReferenceNumber: generatedRef,
        receiptNumber: receiptNumber || undefined,
        notes: submissionNotes || `تم التقديم عبر ${selectedSystem === 'SAP' ? 'منظومة ساب' : 'منظومة الضرائب العامة'} - إيصال: ${receiptNumber || 'تحت السداد'}`,
      });
    }

    // Update mandate if exists
    const existingMandate = state.taxMandates?.find(
      (m) => m.clientId === selectedClient.id && m.periodName?.includes(taxPeriod)
    );
    if (existingMandate) {
      db.updateTaxMandate(existingMandate.id, {
        status: 'SUBMITTED',
        etaReferenceNumber: generatedRef,
        actualTaxAmount: netTaxPayable || existingMandate.estimatedTaxAmount,
      });
    }

    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col text-xs">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
              <FileCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  نموذج تقديم الإقرار الضريبي الإلكتروني
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                  منظومة ساب والضرائب العامة
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                ربط اسم الشركة، بيانات ونوع الإقرار، اليوزر والباسورد، والدخول المباشر للبوابات الرسمية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

          {/* 1. COMPANY INFORMATION & SELECTOR (ظهور اسم الشركة وبياناتها) */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  الشركة / المنشأة المقدم عنها الإقرار:
                </span>
              </div>

              {/* Company Switcher Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">تغيير الشركة:</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Company Name Box */}
                <div className="col-span-1 sm:col-span-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block mb-0.5">اسم الشركة الرسمي (الممول)</span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-sm font-black text-indigo-950 dark:text-indigo-200 truncate">
                      {selectedClient.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold shrink-0">
                      {selectedClient.clientCode}
                    </span>
                  </div>
                </div>

                {/* Tax Registration Number */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block mb-0.5">رقم التسجيل الضريبي</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {selectedClient.taxCardNo || 'غير مسجل'}
                    </span>
                    {selectedClient.taxCardNo && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedClient.taxCardNo || '', 'TAX_CARD')}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        title="نسخ رقم التسجيل"
                      >
                        {copiedField === 'TAX_CARD' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tax Office & File */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block mb-0.5">المأمورية / رقم الملف</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      {selectedClient.taxOffice || 'المأمورية المختصة'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedClient.incomeTaxFileNo || ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl">
                يرجى اختيار شركة لعرض تفاصيلها وبيانات الدخول
              </div>
            )}
          </div>

          {/* 2. PORTAL SELECTION & DIRECT LAUNCH LINKS */}
          <div className="bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  المنظومة الضريبية ورابط البوابة الإلكترونية:
                </span>
              </div>

              {/* Toggle SAP vs GENERAL TAX */}
              <div className="inline-flex p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSystem('SAP')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedSystem === 'SAP'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  منظومة ساب (SAP)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSystem('GENERAL_TAX')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedSystem === 'GENERAL_TAX'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  منظومة الضرائب العامة (e-Tax)
                </button>
              </div>
            </div>

            {/* Portal Details & 1-Click Launch Button */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-8 bg-slate-950/60 p-3 rounded-xl border border-indigo-900/50 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                    {selectedSystem === 'SAP' ? (
                      <>🏢 رابط بوابة ساب المعتمد (SAP ETA SAML SSO)</>
                    ) : (
                      <>🏛️ رابط منظومة مصلحة الضرائب العامة (eService eTax)</>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(activePortalUrl, 'PORTAL_URL')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'PORTAL_URL' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditingLink(!isEditingLink)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-sky-400" />
                      <span>{isEditingLink ? 'إغلاق التعديل' : 'تعديل الرابط'}</span>
                    </button>
                  </div>
                </div>

                {isEditingLink ? (
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={selectedSystem === 'SAP' ? sapCustomUrl : generalTaxCustomUrl}
                      onChange={(e) => {
                        if (selectedSystem === 'SAP') {
                          setSapCustomUrl(e.target.value);
                        } else {
                          setGeneralTaxCustomUrl(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-indigo-700 text-white font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="https://..."
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>يمكنك لصق أي رابط ترغب به للبوابة أو إعادة التعيين للرابط الرسمي:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSystem === 'SAP') {
                            setSapCustomUrl(OFFICIAL_SAP_PORTAL_URL);
                          } else {
                            setGeneralTaxCustomUrl(OFFICIAL_GENERAL_TAX_PORTAL_URL);
                          }
                        }}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        استعادة الرابط الرسمي
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-slate-300 break-all line-clamp-2 bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    {activePortalUrl}
                  </p>
                )}
              </div>

              {/* Direct Launch Button */}
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleLaunchPortal}
                  className={`w-full py-3 px-4 rounded-xl font-black text-white text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 ${
                    selectedSystem === 'SAP'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-900/50'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/50'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>
                    فتح ودخول {selectedSystem === 'SAP' ? 'منظومة ساب (SAP)' : 'منظومة الضرائب العامة'} ↗️
                  </span>
                </button>
                <span className="text-[10px] text-slate-400 text-center">
                  يفتح نافذة البوابة المباشرة مع الحفاظ على هذه الشاشة مفتوحة
                </span>
              </div>
            </div>
          </div>

          {/* 3. CREDENTIALS BOX: USERNAME & PASSWORD (اليوزر والباسورد للشركة) */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  بيانات حساب الدخول للمنظومة (اليوزر والباسورد):
                </h3>
                <span className="text-[10px] text-slate-400">
                  (خاص بـ {selectedSystem === 'SAP' ? 'منظومة ساب' : 'منظومة الضرائب العامة'})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingCreds(!isEditingCreds)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-indigo-500" />
                <span>{isEditingCreds ? 'إلغاء التعديل' : 'تعديل اليوزر والباسورد'}</span>
              </button>
            </div>

            {isEditingCreds ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    اسم المستخدم (اليوزر)
                  </label>
                  <input
                    type="text"
                    value={credUsername}
                    onChange={(e) => setCredUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    كلمة المرور (الباسورد)
                  </label>
                  <input
                    type="text"
                    value={credPassword}
                    onChange={(e) => setCredPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    رمز PIN / كود التحقق (إن وجد)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={credPin}
                      onChange={(e) => setCredPin(e.target.value)}
                      placeholder="PIN Code"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Username Box */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>اسم المستخدم (اليوزر - Username)</span>
                    <span className="font-mono text-indigo-500">1-Click Copy</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs truncate select-all">
                      {credUsername || 'غير مسجل'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credUsername, 'USERNAME')}
                      disabled={!credUsername}
                      className={`p-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
                        copiedField === 'USERNAME'
                          ? 'bg-emerald-500 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="نسخ اسم المستخدم"
                    >
                      {copiedField === 'USERNAME' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Box */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>كلمة المرور (الباسورد - Password)</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs truncate select-all">
                      {showPassword ? (credPassword || 'غير مسجل') : (credPassword ? '••••••••••••' : 'غير مسجل')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credPassword, 'PASSWORD')}
                      disabled={!credPassword}
                      className={`p-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
                        copiedField === 'PASSWORD'
                          ? 'bg-emerald-500 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="نسخ كلمة المرور"
                    >
                      {copiedField === 'PASSWORD' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* PIN / OTP Box */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>رمز التحقق الإضافي (PIN / OTP)</span>
                    <span className="text-[10px] text-slate-400">إن وجد</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                      {credPin || '—'}
                    </span>
                    {credPin && (
                      <button
                        type="button"
                        onClick={() => handleCopy(credPin, 'PIN')}
                        className={`p-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
                          copiedField === 'PIN'
                            ? 'bg-emerald-500 text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                        title="نسخ رمز PIN"
                      >
                        {copiedField === 'PIN' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. TAX RETURN DETAILS DROPDOWN (قائمة منسدلة فيها بيانات الإقرار) */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  قائمة بيانات ونماذج الإقرار الضريبي:
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                اختر نوع النموذج لتجهيز البيانات الحسابية وتثبيت الإقرار
              </span>
            </div>

            {/* Dropdown for Tax Return Types */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                نوع الإقرار والنموذج الرسمي (قائمة النماذج الضريبية المعتمدة):
              </label>
              <select
                value={returnType}
                onChange={(e) => handleReturnTypeChange(e.target.value as TaxReturnOptionType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-400/50 dark:border-indigo-600/50 font-bold text-slate-900 dark:text-slate-100 text-xs shadow-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VAT_10">📑 نموذج (10) - إقرار ضريبة القيمة المضافة (شهري للمسجلين)</option>
                <option value="INCOME_27_CORP">🏢 نموذج (27) - إقرار ضريبة دخل الأشخاص الاعتبارية وشركات الأموال (سنوي)</option>
                <option value="INCOME_28_INDIV">👤 نموذج (28) - إقرار ضريبة دخل الأشخاص الطبيعيين والمنشآت الفردية (سنوي)</option>
                <option value="PAYROLL_4">💼 نموذج (4) - إقرار ضريبة المرتبات وما في حكمها / كسب العمل (ربع سنوي)</option>
                <option value="PAYROLL_ANNUAL">⚖️ نموذج التسوية السنوية لضريبة المرتبات والأجور (تسوية سنوية معتمدة)</option>
                <option value="WHT_41">✂️ نموذج (41) - إشعار الخصم والتحصيل تحت حساب الضريبة (ربع سنوي)</option>
                <option value="ZERO_RETURN">⚪ إقرار صفري (Zero Tax Return - لا توجد عمليات بيع أو شراء خلال الفترة)</option>
                <option value="AMENDED_RETURN">🔄 إقرار ضريبي معدل (وفقاً للمادة 33 من قانون الإجراءات الضريبية الموحد)</option>
              </select>
            </div>

            {/* Period and Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  الفترة الضريبية
                </label>
                <input
                  type="text"
                  value={taxPeriod}
                  onChange={(e) => setTaxPeriod(e.target.value)}
                  placeholder="مثال: مارس 2026 أو الربع الأول"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  سنة الإقرار
                </label>
                <input
                  type="number"
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  تاريخ نهاية المهلة القانونية (Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Financial Amounts based on return type */}
            {returnType === 'VAT_10' && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                    حسبة ضريبة القيمة المضافة للفترة (14%):
                  </span>
                  <span className="text-[10px] text-slate-500">
                    يتم الاحتساب التلقائي لصافي الضريبة واجبة السداد
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 text-[10px] mb-1">
                      مبيعات الفترة (وعاء 14%)
                    </label>
                    <input
                      type="number"
                      value={salesAmount || ''}
                      onChange={(e) => handleVatCalculation(Number(e.target.value), purchasesAmount, previousCreditBalance)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 text-[10px] mb-1">
                      ضريبة المخرجات (14%)
                    </label>
                    <input
                      type="number"
                      value={vatOutputTax || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVatOutputTax(val);
                        setNetTaxPayable(Math.max(0, val - vatInputTax - previousCreditBalance));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-indigo-700 dark:text-indigo-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 text-[10px] mb-1">
                      ضريبة المدخلات (مشتريات)
                    </label>
                    <input
                      type="number"
                      value={vatInputTax || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVatInputTax(val);
                        setNetTaxPayable(Math.max(0, vatOutputTax - val - previousCreditBalance));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 text-[10px] mb-1">
                      رصيد دائن سابق مرحل
                    </label>
                    <input
                      type="number"
                      value={previousCreditBalance || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPreviousCreditBalance(val);
                        setNetTaxPayable(Math.max(0, vatOutputTax - vatInputTax - val));
                      }}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Tax Payable summary */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                صافي الضريبة واجبة السداد للإقرار (ج.م):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={netTaxPayable}
                  onChange={(e) => setNetTaxPayable(Number(e.target.value))}
                  className="w-36 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm text-center"
                />
                <span className="font-bold text-slate-500">ج.م</span>
              </div>
            </div>
          </div>

          {/* 5. SUBMISSION CONFIRMATION & REFERENCE FORM */}
          <form onSubmit={handleConfirmFiling} className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  توثيق واعتماد تقديم الإقرار بالسجل:
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                بعد التقديم على بوابة {selectedSystem === 'SAP' ? 'ساب' : 'الضرائب العامة'} أدخل بيانات المرجع
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  رقم إشعار / مرجع التقديم من المنظومة (ETA Ref #)
                </label>
                <input
                  type="text"
                  value={etaReferenceNo}
                  onChange={(e) => setEtaReferenceNo(e.target.value)}
                  placeholder={`مثال: ETA-${selectedSystem === 'SAP' ? 'SAP' : 'ETAX'}-2026-99104`}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  رقم إيصال السداد البنكي / كود السداد الإلكتروني
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="مثال: RCPT-B-88301"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                ملاحظات التقديم والاعتماد
              </label>
              <textarea
                rows={2}
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="ملاحظات حول سداد الضريبة، إيصال البنك، أو اعتماد المحاسب القانوني..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCopyFullCard}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="نسخ كارت التقديم بالكامل للحافظة"
              >
                {copiedField === 'FULL_CARD' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>تم نسخ الكارت بالكامل ✅</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>نسخ كارت التقديم والبيانات للحافظة</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وحفظ تقديم الإقرار</span>
                </button>
              </div>
            </div>

            {isSavedSuccess && (
              <div className="p-2.5 bg-emerald-500 text-white rounded-xl font-bold text-center animate-in fade-in duration-150">
                ✅ تم تسجيل وحفظ تقديم الإقرار بنجاح في قاعدة البيانات وتحديث السجل!
              </div>
            )}
          </form>

        </div>
      </div>
    </div>
  );
};

// Helper for Return Type Arabic Labels
function getReturnTypeName(type: TaxReturnOptionType): string {
  switch (type) {
    case 'VAT_10':
      return 'نموذج (10) - إقرار ضريبة القيمة المضافة';
    case 'INCOME_27_CORP':
      return 'نموذج (27) - إقرار ضريبة دخل الأشخاص الاعتبارية';
    case 'INCOME_28_INDIV':
      return 'نموذج (28) - إقرار ضريبة دخل الأشخاص الطبيعيين';
    case 'PAYROLL_4':
      return 'نموذج (4) - إقرار ضريبة المرتبات والأجور';
    case 'PAYROLL_ANNUAL':
      return 'التسوية السنوية لضريبة المرتبات';
    case 'WHT_41':
      return 'نموذج (41) - إشعار الخصم والتحصيل';
    case 'ZERO_RETURN':
      return 'إقرار ضريبي صفري';
    case 'AMENDED_RETURN':
      return 'إقرار ضريبي معدل';
    default:
      return type;
  }
}
