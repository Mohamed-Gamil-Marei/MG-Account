import React, { useState, useMemo } from 'react';
import {
  Award,
  Printer,
  Eye,
  Download,
  Plus,
  ShieldCheck,
  Building,
  User,
  UserCheck,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Briefcase,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Info,
  Building2,
  FileCheck2,
  FileBadge,
  Sparkles,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg, generateCode128Svg, buildVerificationUrl, buildVerificationQrText, VerificationPayloadData } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { ProfessionalCertificate, CertificateBeneficiaryType, CertificateTemplateType } from '../types';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { PrintPreviewModal } from './common/PrintPreviewModal';
import { CertifiedDocumentExportMenu } from './common/CertifiedDocumentExportMenu';
import { CertifiedDocumentData } from '../utils/certifiedDocumentExporter';
import { DocumentVerificationModal } from './common/DocumentVerificationModal';

interface CertificatesGeneratorViewProps {
  state: DatabaseState;
}

export const CertificatesGeneratorView: React.FC<CertificatesGeneratorViewProps> = ({ state }) => {
  const profile = state.officeProfile;
  const certificates = state.certificates || [];
  const clients = state.clients || [];

  // Tab mode: 'CREATE' or 'ARCHIVE'
  const [activeTab, setActiveTab] = useState<'CREATE' | 'ARCHIVE'>('CREATE');

  // Form states
  const [beneficiaryType, setBeneficiaryType] = useState<CertificateBeneficiaryType>('NATURAL_PERSON');
  const [certType, setCertType] = useState<CertificateTemplateType>('FREELANCE_INCOME');
  
  // Selected client for quick autofill
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Beneficiary details (Person vs Entity)
  const [beneficiaryGender, setBeneficiaryGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [beneficiaryTitle, setBeneficiaryTitle] = useState<string>('السيد /');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('د. سامح عبد العزيز النجار');
  const [nationalId, setNationalId] = useState<string>('27805120101948');
  const [jobTitle, setJobTitle] = useState<string>('طبيب استشاري جراحة العظام والمفاصل');
  const [address, setAddress] = useState<string>('14 شارع النصر - المعادي - القاهرة');
  
  // Entity / Business specifics
  const [commercialRegNo, setCommercialRegNo] = useState<string>('');
  const [taxCardNo, setTaxCardNo] = useState<string>('');
  const [activityName, setActivityName] = useState<string>('عيادة النجار التخصصية');

  // Examination basis preset & customized text (flexible phrasing)
  const [examinationBasisType, setExaminationBasisType] = useState<string>('GENERAL_DOCS'); // 'GENERAL_DOCS' | 'BANK_STATEMENTS' | 'TAX_RETURNS' | 'CUSTOM'
  const [customPreambleBasis, setCustomPreambleBasis] = useState<string>('بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المقدمة المؤيدة للإيرادات والمصروفات');
  const [customIntroText, setCustomIntroText] = useState<string>('');
  const [customBodyText, setCustomBodyText] = useState<string>('');

  // Certificate specifications
  const [recipientOrganization, setRecipientOrganization] = useState<string>('السادة / بنك مصر - قطاع التمويل العقاري والائتمان');
  const [purpose, setPurpose] = useState<string>('لتقديمها للبنك بناءً على طلب العميل للحصول على تمويل عقاري لشراء وحدة سكنية ومهنية');
  const [certifiedAmount, setCertifiedAmount] = useState<number>(900000);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(75000);
  const [periodText, setPeriodText] = useState<string>('عن متوسط الدخل السنوي والشهري لعام 2025');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [auditorNotes, setAuditorNotes] = useState<string>(
    'بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المؤيدة لمصادر الدخل المحققة.'
  );

  // Income Breakdown items (for natural persons with multiple sources)
  const [incomeSources, setIncomeSources] = useState<{ source: string; amount: number }[]>([
    { source: 'صافي إيرادات العيادة والنشاط المهني المستقل', amount: 680000 },
    { source: 'استشارات طبية وجراحات المستشفيات الخاصة', amount: 220000 },
  ]);

  // Selected certificate from archive to view/print
  const [selectedCertForView, setSelectedCertForView] = useState<ProfessionalCertificate | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [verifyModalData, setVerifyModalData] = useState<VerificationPayloadData | null>(null);

  // Barcode & Security Verification mode (Option 2: Code 128 Linear Barcode default for 100% scanning accuracy)
  const [verificationBarcodeType, setVerificationBarcodeType] = useState<'BARCODE_128' | 'QR_CODE' | 'DUAL'>('BARCODE_128');

  // Generated dynamic cert number for draft
  const certNumber = selectedCertForView 
    ? selectedCertForView.certificateNumber 
    : `CERT-${new Date().getFullYear()}-${String(certificates.length + 1).padStart(4, '0')}`;

  // Quick handler when beneficiary type changes
  const handleBeneficiaryTypeChange = (type: CertificateBeneficiaryType) => {
    setBeneficiaryType(type);
    if (type === 'NATURAL_PERSON') {
      setBeneficiaryTitle('السيد /');
      setCertType('FREELANCE_INCOME');
      setBeneficiaryName('م. إيهاب عادل عبد السلام النشار');
      setNationalId('28608200103492');
      setJobTitle('مهندس استشاري ومستثمر عقاري');
      setActivityName('استشارات هندسية ودخل استثماري وتأجيري');
      setTaxCardNo('412-890-123');
      setCommercialRegNo('');
      setCertifiedAmount(720000);
      setMonthlyAmount(60000);
      setPeriodText('عن متوسط الدخل السنوي والشهري لعام 2025');
      setPurpose('لتقديمها للبنك للحصول على تمويل شخصي واستثماري');
      setRecipientOrganization('السادة / البنك التجاري الدولي (CIB) - قطاع الائتمان');
      setAuditorNotes('تم التحقق ومراجعة كشوف الحسابات البنكية ومستندات التعاقد ومصادر الدخل المحققة.');
      setIncomeSources([
        { source: 'صافي الراتب والبدلات الوظيفية والاستشارية', amount: 420000 },
        { source: 'عوائد وإيجارات وحدات عقارية مؤجرة', amount: 200000 },
        { source: 'توزيعات أرباح وأوراق مالية', amount: 100000 },
      ]);
    } else {
      setBeneficiaryTitle('السادة /');
      setCertType('INCOME_PROOF');
      setBeneficiaryName('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
      setNationalId('');
      setJobTitle('رئيس مجلس الإدارة والعضو المنتدب');
      setActivityName('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
      setTaxCardNo('302-819-402');
      setCommercialRegNo('148293');
      setCertifiedAmount(3850000);
      setMonthlyAmount(320833);
      setPeriodText('عن السنة المالية المنتهية في 31 ديسمبر 2025');
      setPurpose('لتقديمها للبنك بناءً على طلب المنشأة للحصول على تسهيلات ائتمانية');
      setRecipientOrganization('السادة / بنك مصر - قطاع تمويل الشركات والائتمان');
      setAuditorNotes('بناءً على الفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة وميزان المراجعة النهائي والإقرارات الضريبية المعتمدة.');
      setIncomeSources([]);
    }
  };

  // Quick Client Selection autofill
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (client.companyType === 'INDIVIDUAL' || client.name.includes('دكتور') || client.name.includes('أستاذ') || client.name.includes('مهندس') || client.name.includes('د.')) {
      setBeneficiaryType('NATURAL_PERSON');
      setBeneficiaryTitle('السيد /');
      setBeneficiaryName(client.name);
      setTaxCardNo(client.taxCardNo || '');
      setCommercialRegNo(client.commercialRegistrationNo || '');
      setActivityName(client.activity || client.name);
      setAddress(client.address || '');
    } else {
      setBeneficiaryType('LEGAL_ENTITY');
      setBeneficiaryTitle('السادة /');
      setBeneficiaryName(client.name);
      setTaxCardNo(client.taxCardNo || '');
      setCommercialRegNo(client.commercialRegistrationNo || '');
      setActivityName(client.name);
      setAddress(client.address || '');
    }
  };

  // Handle Amount change and sync monthly
  const handleAmountChange = (amt: number) => {
    setCertifiedAmount(amt);
    setMonthlyAmount(Math.round(amt / 12));
  };

  // Income sources handlers
  const handleAddIncomeSource = () => {
    setIncomeSources([...incomeSources, { source: '', amount: 0 }]);
  };

  const handleRemoveIncomeSource = (idx: number) => {
    const updated = incomeSources.filter((_, i) => i !== idx);
    setIncomeSources(updated);
    const sum = updated.reduce((s, it) => s + (it.amount || 0), 0);
    if (sum > 0) {
      setCertifiedAmount(sum);
      setMonthlyAmount(Math.round(sum / 12));
    }
  };

  const handleIncomeSourceChange = (idx: number, field: 'source' | 'amount', value: any) => {
    const updated = [...incomeSources];
    updated[idx] = { ...updated[idx], [field]: field === 'amount' ? Number(value) : value };
    setIncomeSources(updated);
    if (field === 'amount') {
      const sum = updated.reduce((s, it) => s + (it.amount || 0), 0);
      if (sum > 0) {
        setCertifiedAmount(sum);
        setMonthlyAmount(Math.round(sum / 12));
      }
    }
  };

  // Save Certificate to DB
  const handleSaveCertificate = () => {
    const newCert = db.addCertificate({
      certificateType: certType,
      beneficiaryType: beneficiaryType,
      beneficiaryGender: beneficiaryGender,
      issueDate: issueDate,
      clientId: selectedClientId || undefined,
      clientName: beneficiaryName,
      beneficiaryTitle: beneficiaryTitle,
      nationalId: beneficiaryType === 'NATURAL_PERSON' ? nationalId : undefined,
      jobTitle: beneficiaryType === 'NATURAL_PERSON' ? jobTitle : undefined,
      address: address,
      commercialRegNo: commercialRegNo,
      taxCardNo: taxCardNo,
      activityName: activityName,
      recipientEntity: recipientOrganization,
      purpose: purpose,
      periodText: periodText,
      certifiedAmount: certifiedAmount,
      monthlyAmount: monthlyAmount,
      incomeBreakdown: incomeSources.filter((s) => s.source.trim() && s.amount > 0),
      monthlyNetIncome: monthlyAmount,
      annualNetIncome: certifiedAmount,
      solvencyNetWorth: certType === 'FINANCIAL_SOLVENCY' ? certifiedAmount : undefined,
      investedCapitalAmount: certType === 'INVESTED_CAPITAL' ? certifiedAmount : undefined,
      auditorNotes: auditorNotes,
      customIntroText: customIntroText.trim() || undefined,
      customBodyText: customBodyText.trim() || undefined,
      customPreambleBasis: customPreambleBasis.trim() || undefined,
      qrPayload: `EGY-CERT|${certNumber}|43122|${beneficiaryType}|${beneficiaryName}|${certifiedAmount}_EGP|VALID`,
      securityHash: `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      printedCount: 1,
    });

    setSelectedCertForView(newCert);
    alert(`تم حفظ وتوثيق الشهادة رقم (${newCert.certificateNumber}) بنجاح في سجل الشهادات المهنية المعتمدة للمكتب.`);
  };

  // Filtered certificates in archive
  const filteredCerts = certificates.filter((c) => {
    const matchSearch =
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recipientEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nationalId && c.nationalId.includes(searchQuery));
    const matchType = filterType === 'ALL' || c.beneficiaryType === filterType;
    return matchSearch && matchType;
  });

  // Current view values
  const activeBeneficiaryType = selectedCertForView ? selectedCertForView.beneficiaryType : beneficiaryType;
  const activeBeneficiaryGender = selectedCertForView?.beneficiaryGender || beneficiaryGender;
  const activeCertType = selectedCertForView ? selectedCertForView.certificateType : certType;
  const activeBeneficiaryName = selectedCertForView ? selectedCertForView.clientName : beneficiaryName;
  const activeBeneficiaryTitle = selectedCertForView ? (selectedCertForView.beneficiaryTitle || (activeBeneficiaryGender === 'FEMALE' ? 'السيدة /' : 'السيد /')) : beneficiaryTitle;
  const activeNationalId = selectedCertForView ? selectedCertForView.nationalId : nationalId;
  const activeJobTitle = selectedCertForView ? selectedCertForView.jobTitle : jobTitle;
  const activeAddress = selectedCertForView ? selectedCertForView.address : address;
  const activeActivityName = selectedCertForView ? selectedCertForView.activityName : activityName;
  const activeTaxCardNo = selectedCertForView ? selectedCertForView.taxCardNo : taxCardNo;
  const activeCommercialRegNo = selectedCertForView ? selectedCertForView.commercialRegNo : commercialRegNo;
  const activeRecipient = selectedCertForView ? selectedCertForView.recipientEntity : recipientOrganization;
  const activeCertifiedAmount = selectedCertForView ? selectedCertForView.certifiedAmount : certifiedAmount;
  const activeMonthlyAmount = selectedCertForView ? selectedCertForView.monthlyAmount : monthlyAmount;
  const activePeriodText = selectedCertForView ? selectedCertForView.periodText : periodText;
  const activePurpose = selectedCertForView ? selectedCertForView.purpose : purpose;
  const activeIssueDate = selectedCertForView ? selectedCertForView.issueDate : issueDate;
  const activeAuditorNotes = selectedCertForView ? selectedCertForView.auditorNotes : auditorNotes;
  const activeIncomeBreakdown = selectedCertForView ? (selectedCertForView.incomeBreakdown || []) : incomeSources;
  const activeCustomIntroText = selectedCertForView ? selectedCertForView.customIntroText : customIntroText;
  const activeCustomBodyText = selectedCertForView ? selectedCertForView.customBodyText : customBodyText;
  const activeCustomPreambleBasis = selectedCertForView ? (selectedCertForView.customPreambleBasis || customPreambleBasis) : customPreambleBasis;


  // Certificate Payload for Direct Document Preview and Printing
  const activeCertificatePayload = useMemo(() => {
    return {
      id: selectedCertForView?.id || 'ACTIVE-CERT-DOC',
      certificateNumber: certNumber,
      beneficiaryType: activeBeneficiaryType,
      beneficiaryGender: activeBeneficiaryGender,
      clientName: activeBeneficiaryName,
      beneficiaryTitle: activeBeneficiaryTitle,
      nationalId: activeNationalId,
      jobTitle: activeJobTitle,
      address: activeAddress,
      taxCardNo: activeTaxCardNo,
      commercialRegNo: activeCommercialRegNo,
      activityName: activeActivityName,
      certificateType: activeCertType,
      annualNetIncome: activeCertifiedAmount,
      certifiedAmount: activeCertifiedAmount,
      monthlyNetIncome: activeMonthlyAmount,
      periodText: activePeriodText,
      recipientEntity: activeRecipient,
      purpose: activePurpose,
      auditorNotes: activeAuditorNotes,
      customBodyText: activeCustomBodyText,
      customPreambleBasis: activeCustomPreambleBasis,
      issueDate: activeIssueDate,
      incomeBreakdown: activeIncomeBreakdown,
      qrPayload: `CERTIFICATE|${certNumber}|${activeBeneficiaryName}|${activeNationalId || activeCommercialRegNo || ''}|${activeCertifiedAmount}|${profile?.auditorName || 'محمد جميل مرعي'}|${profile?.phone || '01003335360'}`,
    };
  }, [
    selectedCertForView,
    certNumber,
    activeBeneficiaryType,
    activeBeneficiaryGender,
    activeBeneficiaryName,
    activeBeneficiaryTitle,
    activeNationalId,
    activeJobTitle,
    activeAddress,
    activeTaxCardNo,
    activeCommercialRegNo,
    activeActivityName,
    activeCertType,
    activeCertifiedAmount,
    activeMonthlyAmount,
    activePeriodText,
    activeRecipient,
    activePurpose,
    activeAuditorNotes,
    activeCustomBodyText,
    activeCustomPreambleBasis,
    activeIssueDate,
    activeIncomeBreakdown,
    profile,
  ]);

  const [isDirectPreviewOpen, setIsDirectPreviewOpen] = useState(false);

  // Direct print function for certificate
  const handlePrintCertificateDirect = () => {
    const styleId = 'egypt-cpa-cert-print-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * {
          visibility: hidden !important;
        }
        #official-certificate-document, #official-certificate-document * {
          visibility: visible !important;
        }
        #official-certificate-document {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          padding: 24px 28px !important;
          min-height: 275mm !important;
          background: white !important;
          box-shadow: none !important;
          border: 2.5px solid #064e3b !important;
          border-radius: 6px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
      }
    `;

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Title helper
  const getCertificateHeading = (type: CertificateTemplateType, benType: CertificateBeneficiaryType) => {
    if (benType === 'NATURAL_PERSON') {
      switch (type) {
        case 'FREELANCE_INCOME':
          return 'شهـادة إثبـات صـافـي دخـل مهـن حـرة وأنشطـة فـرديـة';
        case 'EMPLOYEE_ADDITIONAL_INC':
          return 'شهـادة إثبـات دخـل إضـافـي واستثمـارات للأفـراد';
        case 'REAL_ESTATE_INCOME':
          return 'شهـادة إثبـات إيـرادات عقـاريـة واستثمـاريـة للممـول';
        case 'FINANCIAL_SOLVENCY':
          return 'شهـادة مـلاءة مـاليـة وثـروة للأشخـاص الطبيعييـن';
        default:
          return 'شهـادة إثبـات صـافـي الـدخـل السنـوي والشهـري للأفـراد';
      }
    } else {
      switch (type) {
        case 'INVESTED_CAPITAL':
          return 'شهـادة رأس المـال المستثمـر وحجـم الأعمـال للمنشـأة';
        case 'FINANCIAL_SOLVENCY':
          return 'شهـادة مـلاءة مـاليـة وجودة ائتمانية للشركات';
        case 'AUDIT_COMPLIANCE':
          return 'شهـادة فحـص ومراجعـة حسـابـات وقوائم مالية';
        default:
          return 'شهـادة إثبـات صـافـي دخـل وأرباح سنـويـة للشركـات';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                منظومة إصدار الشهادات المحاسبية والمهنية المعتمدة (QR Certificates)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إصدار وتوثيق شهادات الدخل والملاءة للأشخاص الطبيعيين (الأفراد / المهن الحرة) والاعتباريين (الشركات) بالختم الإلكتروني المعتمد (س.م.م 43122).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('CREATE');
                setSelectedCertForView(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'CREATE'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إصدار شهادة جديدة</span>
            </button>

            <button
              onClick={() => setActiveTab('ARCHIVE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'ARCHIVE'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>سجل وأرشيف الشهادات ({certificates.length})</span>
            </button>
          </div>

          <ScreenActionToolbar
            modelType="CERTIFICATES"
            title="الشهادات المهنية المعتمدة"
            count={certificates.length}
            customDocument={activeCertificatePayload}
          />
        </div>
      </div>

      {/* Mode 1: Archive View */}
      {activeTab === 'ARCHIVE' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">سجل الشهادات المهنية الموثقة بالمكتب</h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم العميل، الرقم القومي، رقم الشهادة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">جميع الكيانات</option>
                <option value="NATURAL_PERSON">أشخاص طبيعيين (أفراد / مهن حرة)</option>
                <option value="LEGAL_ENTITY">أشخاص اعتباريين (شركات)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">رقم وتاريخ الشهادة</th>
                  <th className="p-3">نوع المستفيد</th>
                  <th className="p-3">اسم المستفيد / الرقم القومي أو السجل</th>
                  <th className="p-3">نوع الشهادة والغرض</th>
                  <th className="p-3">الجهة الموجه إليها</th>
                  <th className="p-3 text-left">المبلغ المعتمد</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد شهادات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-emerald-900">{cert.certificateNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{cert.issueDate}</div>
                      </td>
                      <td className="p-3">
                        {cert.beneficiaryType === 'NATURAL_PERSON' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                            <User className="w-3 h-3" />
                            <span>شخص طبيعي (فرد)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                            <Building className="w-3 h-3" />
                            <span>شخص اعتباري (شركة)</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{cert.clientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {cert.beneficiaryType === 'NATURAL_PERSON'
                            ? cert.nationalId ? `رقم قومي: ${cert.nationalId}` : cert.jobTitle || 'شخص طبيعي'
                            : `س.ت: ${cert.commercialRegNo || 'غير مدخل'} • ب.ض: ${cert.taxCardNo || 'غير مدخل'}`}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">
                          {getCertificateHeading(cert.certificateType, cert.beneficiaryType)}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{cert.purpose}</div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <div className="font-medium text-xs">{cert.recipientEntity}</div>
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-800">
                        {formatEgyptianCurrency(cert.certifiedAmount || 0)}
                        {cert.monthlyAmount && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            (شهري: {formatEgyptianCurrency(cert.monthlyAmount)})
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedCertForView(cert);
                            setActiveTab('CREATE');
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>عرض وطباعة</span>
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

      {/* Mode 2: Form & Certificate Generator */}
      {activeTab === 'CREATE' && (
        <div className="space-y-6">
          {/* Certificate Editor Controls */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
            {/* Quick Entity Type Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">نوع الكيان المستفيد من الشهادة:</span>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleBeneficiaryTypeChange('NATURAL_PERSON')}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                    beneficiaryType === 'NATURAL_PERSON'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>شخص طبيعي (أفراد / مهن حرة / موظفين)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBeneficiaryTypeChange('LEGAL_ENTITY')}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                    beneficiaryType === 'LEGAL_ENTITY'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>شخص اعتباري (شركات / منشآت تجارية)</span>
                </button>
              </div>
            </div>

            {/* Quick Client Autofill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  استيراد بيانات من أرشيف عملاء المكتب (اختياري)
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                >
                  <option value="">-- إدخال يدوي مخصص --</option>
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name} ({cl.companyType === 'INDIVIDUAL' ? 'فردي' : 'شركة'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع الشهادة المهنية</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-950"
                >
                  {beneficiaryType === 'NATURAL_PERSON' ? (
                    <>
                      <option value="FREELANCE_INCOME">1. شهادة إثبات صافي دخل مهن حرة واستشارات</option>
                      <option value="INCOME_PROOF">2. شهادة إثبات صافي دخل شهري / سنوي للأفراد</option>
                      <option value="EMPLOYEE_ADDITIONAL_INC">3. شهادة إثبات دخول إضافية واستثمارات متنوعة</option>
                      <option value="REAL_ESTATE_INCOME">4. شهادة إثبات إيرادات عقارية وتأجيرية</option>
                      <option value="FINANCIAL_SOLVENCY">5. شهادة ملاءة مالية وثروة للأشخاص الطبيعيين</option>
                    </>
                  ) : (
                    <>
                      <option value="INCOME_PROOF">1. شهادة إثبات صافي أرباح ودخل سنوي للشركات</option>
                      <option value="INVESTED_CAPITAL">2. شهادة رأس مال مستثمر وحجم أعمال</option>
                      <option value="FINANCIAL_SOLVENCY">3. شهادة ملاءة مالية وجودة ائتمانية للشركات</option>
                      <option value="AUDIT_COMPLIANCE">4. شهادة فحص ومراجعة حسابات وقوائم مالية</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ إصدار الشهادة</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Beneficiary Details Form */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {beneficiaryType === 'NATURAL_PERSON' ? <User className="w-4 h-4 text-blue-600" /> : <Building className="w-4 h-4 text-purple-600" />}
                  <span>
                    {beneficiaryType === 'NATURAL_PERSON'
                      ? 'بيانات الشخص الطبيعي (العميل الفرد / صاحب المهنة / الموظف)'
                      : 'بيانات الشخص الاعتباري (الشركة / المنشأة التجارية)'}
                  </span>
                </div>

                {/* Gender selector for Natural Persons */}
                {beneficiaryType === 'NATURAL_PERSON' && (
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300">
                    <span className="text-[11px] font-bold text-slate-600 px-1.5">الصفة والنوع:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBeneficiaryGender('MALE');
                        setBeneficiaryTitle('السيد /');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        beneficiaryGender === 'MALE'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ذكر (السيد / المقيم)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBeneficiaryGender('FEMALE');
                        setBeneficiaryTitle('السيدة /');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        beneficiaryGender === 'FEMALE'
                          ? 'bg-pink-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      أنثى (السيدة / المقيمة)
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اللقب / الصفة بالشهادة</label>
                  <input
                    type="text"
                    value={beneficiaryTitle}
                    onChange={(e) => setBeneficiaryTitle(e.target.value)}
                    placeholder={beneficiaryGender === 'FEMALE' ? 'السيدة / السيدة الدكتورة / الآنسة' : 'السيد / السيد المهندس / الدكتور'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'اسم المستفيد ثلاثي / رباعي *' : 'الاسم التجاري للمنشأة / الشركة *'}
                  </label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {beneficiaryType === 'NATURAL_PERSON' ? (
                  <>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الرقم القومي (14 رقماً) *</label>
                      <input
                        type="text"
                        maxLength={14}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="28509140102938"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-blue-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المهنة / الوظيفة الحالية</label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="طبيب / مهندسة / مستشار / أعمال حرة..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم السجل التجاري *</label>
                      <input
                        type="text"
                        value={commercialRegNo}
                        onChange={(e) => setCommercialRegNo(e.target.value)}
                        placeholder="148293"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-purple-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم التسجيل الضريبي (البطاقة الضريبية)</label>
                      <input
                        type="text"
                        value={taxCardNo}
                        onChange={(e) => setTaxCardNo(e.target.value)}
                        placeholder="302-819-402"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'طبيعة النشاط أو جهة العمل (اختياري)' : 'اسم النشاط / الغرض التجاري'}
                  </label>
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="عيادة خاصة / مكتب استشارات / نشاط حر..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'البطاقة الضريبية (اتركه فارغاً إن لم يوجد)' : 'عنوان المقر الرئيسي'}
                  </label>
                  <input
                    type="text"
                    value={beneficiaryType === 'NATURAL_PERSON' ? taxCardNo : address}
                    onChange={(e) => {
                      if (beneficiaryType === 'NATURAL_PERSON') setTaxCardNo(e.target.value);
                      else setAddress(e.target.value);
                    }}
                    placeholder={beneficiaryType === 'NATURAL_PERSON' ? 'اتركه فارغاً إن لم يوجد' : 'المعادي - القاهرة'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'محل الإقامة المثبت بالرقم القومي' : 'مأمورية الضرائب التابع لها'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="14 شارع النصر - المعادي - القاهرة"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Examination Basis & Wording Flexibility Selector */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>مرونة صياغة الشهادة وسند الفحص (بدون كشوف حسابات أو إقرارات إذا رغبت)</span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  اختر النموذج الأنسب أو اكتب صياغتك المخصصة بالكامل
                </span>
              </div>

              {/* Preset Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExaminationBasisType('GENERAL_DOCS');
                    const isF = beneficiaryGender === 'FEMALE';
                    setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المقدمة المؤيدة للإيرادات والدخل');
                    setAuditorNotes('بناءً على الفحص المستندي للوثائق والمستندات والعقود المقدمة من العميل والمؤيدة لمصادر الدخل المحقق.');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    examinationBasisType === 'GENERAL_DOCS'
                      ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>1. مستندي عام (بدون كشوف أو ضرائب)</span>
                    {examinationBasisType === 'GENERAL_DOCS' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    فحص مستندات وإيرادات فقط دون ذكر كشوف بنكية أو إقرارات ضريبية.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExaminationBasisType('CONTRACTS_RECEIPTS');
                    setCustomPreambleBasis('بناءً على الاطلاع على عقود العمل والاستشارات وإيصالات المعاملات وإفادات جهة العمل المؤيدة للدخل');
                    setAuditorNotes('بناءً على الاطلاع على عقود العمل ومستندات الإيرادات وإيصالات التحصيل المقدمة.');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    examinationBasisType === 'CONTRACTS_RECEIPTS'
                      ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>2. عقود وإفادات دخل</span>
                    {examinationBasisType === 'CONTRACTS_RECEIPTS' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    الاستناد إلى عقود الاستشارات، العمل، وإفادات الدخل والإيراد.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExaminationBasisType('FULL_AUDIT');
                    setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للسجلات المحاسبية المنتظمة، وكشوف الحسابات المصرفية، والإقرارات الضريبية المعتمدة');
                    setAuditorNotes('بناءً على الفحص المكتبي لكشوف الحسابات البنكية والسجلات والدفاتر المحاسبية والإقرارات الضريبية.');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    examinationBasisType === 'FULL_AUDIT'
                      ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>3. فحص كامل (كشوف وإقرارات)</span>
                    {examinationBasisType === 'FULL_AUDIT' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    للشركات والعملاء الراغبين في ذكر كشوف الحسابات والإقرارات.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExaminationBasisType('CUSTOM')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    examinationBasisType === 'CUSTOM'
                      ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>4. صياغة مخصصة يدوياً</span>
                    {examinationBasisType === 'CUSTOM' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    تعديل نص سند الفحص والمقدمة يدوياً وحفظها مع الشهادة.
                  </div>
                </button>
              </div>

              {/* Editable Preamble Basis */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  نص عبارة الفحص والاستناد في مقدمة الشهادة (قابل للتعديل بحرية):
                </label>
                <input
                  type="text"
                  value={customPreambleBasis}
                  onChange={(e) => {
                    setCustomPreambleBasis(e.target.value);
                    setExaminationBasisType('CUSTOM');
                  }}
                  placeholder="اكتب عبارة الفحص هنا (مثال: بناءً على المستندات والعقود المؤيدة للإيراد...)"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-amber-50/30"
                />
              </div>
            </div>


            {/* Financial Parameters & Recipient */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  إجمالي المبلغ المعتمد بالشهادة (سنوياً / القيمة الإجمالية) *
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={certifiedAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  المعادل الشهري لصافي الدخل (ج.م / شهر)
                </label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الجهة الموجه إليها الشهادة *</label>
                <input
                  type="text"
                  value={recipientOrganization}
                  onChange={(e) => setRecipientOrganization(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الفترة الزمنية المعتمدة</label>
                <input
                  type="text"
                  value={periodText}
                  onChange={(e) => setPeriodText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>

            {/* Breakdown for Natural Persons with Multi-Sources */}
            {beneficiaryType === 'NATURAL_PERSON' && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Layers className="w-4 h-4 text-blue-700" />
                    <span>تفصيل وتحليل مصادر الدخل السنوية المعتمدة (اختياري لتعزيز قبول البنوك والجهات)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIncomeSource}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة مصدر دخل</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {incomeSources.map((src, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="مصدر الدخل (مثال: صافي إيرادات العيادة / إيجارات عقارية / أرباح استثمارات)"
                        value={src.source}
                        onChange={(e) => handleIncomeSourceChange(idx, 'source', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                      />
                      <div className="w-40 relative">
                        <input
                          type="number"
                          placeholder="المبلغ السنوي"
                          value={src.amount || ''}
                          onChange={(e) => handleIncomeSourceChange(idx, 'amount', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-mono font-bold text-xs text-blue-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncomeSource(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="حذف المصدر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purpose, Custom Text and Auditor Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الغرض من إصدار الشهادة</label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سند الفحص وملاحظات المحاسب القانوني</label>
                <textarea
                  rows={2}
                  value={auditorNotes}
                  onChange={(e) => setAuditorNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Optional Full Custom Body Override */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-800 font-bold text-xs">
                  كتابة نص مخصص بالكامل لصلب الشهادة (اختياري - لتجاوز الصياغة التلقائية تماماً):
                </label>
                {customBodyText && (
                  <button
                    type="button"
                    onClick={() => setCustomBodyText('')}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    استعادة الصياغة التلقائية
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={customBodyText}
                onChange={(e) => setCustomBodyText(e.target.value)}
                placeholder="إذا كنت ترغب في صياغة مخصصة يدوياً بدون أي شروط، اكتب النص الكامل هنا وسيتم طباعته كما هو تماماً مع بيانات الشهادة والختم..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                عند ترك هذا الحقل فارغاً، يتم استخدام الصياغة الرسمية الذكية المعتمدة تلقائياً بناءً على النوع (ذكر / أنثى) وسند الفحص المختار.
              </p>
            </div>

            {/* Verification Barcode & Security Setting */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>طريقة التوثيق والتحقق الأمني المعتمدة في تذييل الشهادة:</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  (الخيار 2 مفعل تلقائياً لضمان القراءة الفورية 100% على الورق المطبوع)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setVerificationBarcodeType('BARCODE_128')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    verificationBarcodeType === 'BARCODE_128'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>الخيار 2: باركود خطي (Code 128)</span>
                    {verificationBarcodeType === 'BARCODE_128' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  </div>
                  <div className={`text-[10px] leading-relaxed ${verificationBarcodeType === 'BARCODE_128' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    المعيار المصرفي القياسي فائق الحساسية - يقرأ فوراً بأي ماسح ضوئي أو كاميرا حتى مع جودة الطباعة العادية.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationBarcodeType('DUAL')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    verificationBarcodeType === 'DUAL'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>الدمج الشامل (باركود + QR)</span>
                    {verificationBarcodeType === 'DUAL' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  </div>
                  <div className={`text-[10px] leading-relaxed ${verificationBarcodeType === 'DUAL' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    عرض الباركود الخطي المصرفي + رمز QR السريع للتحقق الإلكتروني على الهواتف الذكية معاً.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationBarcodeType('QR_CODE')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    verificationBarcodeType === 'QR_CODE'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>رمز QR فقط</span>
                    {verificationBarcodeType === 'QR_CODE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  </div>
                  <div className={`text-[10px] leading-relaxed ${verificationBarcodeType === 'QR_CODE' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    رمز استجابة سريعة فردي بدقة نقية للتحقق الفوري عبر كاميرا الموبايل.
                  </div>
                </button>
              </div>
            </div>

            {/* Save & Document Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveCertificate}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>حفظ وتوثيق الشهادة في السجل العام للمكتب</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Action Toolbar for the Certificate Document (Direct Print & Preview)       */}
          {/* ========================================================================= */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-emerald-950/90 text-white rounded-2xl border border-emerald-700/50 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <FileBadge className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-xs text-white">
                  معاينة وطباعة المستند الرسمي المعتمد للشهادة
                </div>
                <div className="text-[10px] text-emerald-300">
                  شهادة معتمدة بالباركود المصرفي (Code 128) والختم الرسمي وهاتف المكتب (01003335360)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <CertifiedDocumentExportMenu
                documentData={{
                  certificateNumber: certNumber,
                  clientName: beneficiaryName,
                  beneficiaryTitle,
                  beneficiaryType,
                  beneficiaryGender,
                  nationalId,
                  jobTitle,
                  address,
                  taxCardNo,
                  commercialRegNo,
                  activityName,
                  certificateType: certType,
                  certifiedAmount,
                  monthlyNetIncome: monthlyAmount,
                  periodText,
                  recipientEntity: recipientOrganization,
                  purpose,
                  auditorNotes,
                  customBodyText,
                  customPreambleBasis,
                  issueDate,
                  incomeBreakdown: {
                    notes: auditorNotes,
                  },
                }}
                targetElementId="official-certificate-document"
                profile={profile}
                buttonLabel="تصدير بجميع الصيغ"
              />

              <button
                type="button"
                onClick={() => setIsDirectPreviewOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                title="فتح معاينة الطباعة مع خيارات ضبط الهوامش والمقاسات"
              >
                <Eye className="w-4 h-4 text-emerald-200" />
                <span>معاينة الطباعة</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCertificateDirect}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-emerald-950 rounded-xl font-black text-xs shadow-lg transition-all cursor-pointer"
                title="طباعة الشهادة الرسمية فوراً"
              >
                <Printer className="w-4 h-4 text-emerald-800" />
                <span>طباعة الشهادة</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Printable Official Egyptian CPA Certificate Document                       */}
          {/* ========================================================================= */}
          <div
            id="official-certificate-document"
            className="bg-white rounded-xl border-2 border-emerald-900 shadow-lg p-7 sm:p-10 print:p-6 space-y-4 print:space-y-4 text-slate-900 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-2 print:border-emerald-950 print:max-w-full"
          >
            {/* Letterhead Header */}
            <div className="border-b-2 border-emerald-900 pb-3.5 flex items-center justify-between">
              <div className="space-y-1 text-right">
                <h1 className="text-base sm:text-lg font-black text-slate-900">{profile.firmName}</h1>
                <div className="text-sm font-bold text-emerald-900">{profile.auditorName}</div>
                <div className="text-xs text-slate-600 font-semibold">{profile.title}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  رقم القيد بسجل المحاسبين والمراجعين: <strong>{profile.licenseNumber || 'س.م.م / 43122 - ترخيص وزارة المالية'}</strong>
                </div>
              </div>
              <div className="text-left font-mono text-[11px] text-slate-700 space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/70">
                <div>رقم الشهادة: <strong className="text-emerald-950 font-bold">{certNumber}</strong></div>
                <div>تاريخ الإصدار: <strong>{activeIssueDate}</strong></div>
                <div>نوع الكيان: <strong>{activeBeneficiaryType === 'NATURAL_PERSON' ? (activeBeneficiaryGender === 'FEMALE' ? 'شخص طبيعي (أنثى)' : 'شخص طبيعي (ذكر)') : 'شخص اعتباري'}</strong></div>
              </div>
            </div>

            {/* Certificate Title Badge */}
            <div className="text-center py-1">
              <div className="inline-block px-6 sm:px-9 py-2.5 rounded-xl bg-emerald-50/90 border-2 border-emerald-800 shadow-2xs">
                <h2 className="text-sm sm:text-base font-black text-emerald-950">
                  {getCertificateHeading(activeCertType, activeBeneficiaryType)}
                </h2>
              </div>
            </div>

            {/* Recipient Addressee */}
            <div className="space-y-0.5 text-right">
              <div className="font-bold text-sm text-slate-950">
                إلى: {activeRecipient}
              </div>
              <div className="text-slate-800 font-semibold text-xs">تحية طيبة وبعد،،،</div>
            </div>

            {/* Body Text */}
            <div className="space-y-3.5 text-right text-slate-800 leading-6 sm:leading-7 text-xs sm:text-sm">
              {activeCustomBodyText ? (
                /* USER CUSTOM BODY OVERRIDE */
                <p className="whitespace-pre-line leading-7 font-normal">
                  {activeCustomBodyText}
                </p>
              ) : activeBeneficiaryType === 'NATURAL_PERSON' ? (
                /* NATURAL PERSON BODY TEMPLATE (GENDER AWARE) */
                <p>
                  بناءً على طلب {activeBeneficiaryGender === 'FEMALE' ? 'العميلة' : 'العميل'} / <strong>{activeBeneficiaryTitle} {activeBeneficiaryName}</strong>
                  {activeNationalId && (
                    <> - بطاقة الرقم القومي رقم (<strong className="font-mono">{activeNationalId}</strong>)</>
                  )}
                  {activeJobTitle && (
                    <> - {activeBeneficiaryGender === 'FEMALE' ? 'والمهنة / الوظيفة' : 'والمهنة / الوظيفة'}: <strong>{activeJobTitle}</strong></>
                  )}
                  {activeAddress && (
                    <> - {activeBeneficiaryGender === 'FEMALE' ? 'المقيمة في' : 'المقيم في'}: <strong>{activeAddress}</strong></>
                  )}
                  {activeTaxCardNo && (
                    <> - وبطاقة ضريبية رقم (<strong className="font-mono">{activeTaxCardNo}</strong>)</>
                  )}
                  {activeActivityName && (
                    <> - ونشاط: <strong>{activeActivityName}</strong></>
                  )}
                  ، و{activeCustomPreambleBasis || 'بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المقدمة المؤيدة للإيرادات والدخل'}:
                </p>
              ) : (
                /* LEGAL ENTITY BODY TEMPLATE */
                <p>
                  بناءً على طلب العميل / <strong>{activeBeneficiaryTitle} {activeBeneficiaryName}</strong>
                  {activeCommercialRegNo && (
                    <> - سجل تجاري رقم (<strong className="font-mono">{activeCommercialRegNo}</strong>)</>
                  )}
                  {activeTaxCardNo && (
                    <> - بطاقة ضريبية رقم (<strong className="font-mono">{activeTaxCardNo}</strong>)</>
                  )}
                  {activeAddress && (
                    <> - الكائن مقرها في: <strong>{activeAddress}</strong></>
                  )}
                  ، وبصفتنا المحاسب القانوني ومراقب الحسابات للنشاط المذكور أعلاه، و{activeCustomPreambleBasis || 'بناءً على المراجعة والفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، وموازين المراجعة، والقوائم المالية والإقرارات الضريبية المعتمدة'}:
                </p>
              )}

              {/* Highlighted Certified Amount & Income Statement Box */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50/90 border-2 border-emerald-800/40 space-y-2.5">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-slate-900 font-black">
                    نشهد ونقر نحن المحاسب القانوني بأن{' '}
                    {activeCertType === 'INVESTED_CAPITAL'
                      ? 'رأس المال المستثمر وحجم الأعمال'
                      : activeCertType === 'FINANCIAL_SOLVENCY'
                      ? 'صافي الملاءة المالية والمركز المالي'
                      : 'صافي الدخل السنوي المحقق'} هو:
                  </span>
                  {activeMonthlyAmount && activeMonthlyAmount > 0 && activeCertType !== 'INVESTED_CAPITAL' && (
                    <span className="text-xs text-emerald-950 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 font-black self-start sm:self-auto font-mono">
                      بمتوسط شهري: {formatEgyptianCurrency(activeMonthlyAmount)}
                    </span>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight">
                  {formatEgyptianCurrency(activeCertifiedAmount)}
                </div>

                {/* Correct Arabic Tafqeet without repetitive phrasing */}
                <div className="font-bold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm">
                  فقط وقدره {numberToArabicWords(activeCertifiedAmount)} لا غير.
                </div>

                <div className="text-xs text-slate-700 font-semibold">
                  وذلك <strong>{activePeriodText}</strong>.
                </div>

                {/* Formal Accounting Breakdown Table */}
                {activeIncomeBreakdown && activeIncomeBreakdown.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/90">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>جدول بيان تفصيلي بمصادر الدخل المحققة والمؤيدة مستندياً:</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
                      <table className="w-full text-right border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                            <th className="py-2 px-2.5 text-center w-8">م</th>
                            <th className="py-2 px-2.5">مصدر الدخل والنشاط المؤيد مستندياً</th>
                            <th className="py-2 px-2.5 text-center font-mono w-32">الإيراد السنوي</th>
                            <th className="py-2 px-2.5 text-center font-mono w-32">المعادل الشهري</th>
                            <th className="py-2 px-2.5 text-center font-mono w-24">نسبة المساهمة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {activeIncomeBreakdown.map((item, idx) => {
                            const annual = Number(item.amount) || 0;
                            const monthly = annual / 12;
                            const percentage = activeCertifiedAmount > 0 ? (annual / activeCertifiedAmount) * 100 : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-600">{idx + 1}</td>
                                <td className="py-2 px-2.5 font-medium text-slate-800">{item.source}</td>
                                <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-900">{formatEgyptianCurrency(annual)}</td>
                                <td className="py-2 px-2.5 text-center font-mono text-slate-700">{formatEgyptianCurrency(monthly)}</td>
                                <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700">{percentage.toFixed(1)}%</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-emerald-50/70 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td colSpan={2} className="py-2 px-2.5 text-right font-black">
                              الإجمالي السنوي المحقق والمعتمد:
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-black text-emerald-950 text-xs">
                              {formatEgyptianCurrency(activeCertifiedAmount)}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-black text-slate-900 text-xs">
                              {formatEgyptianCurrency(activeMonthlyAmount)}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-black text-slate-900 text-xs">
                              100%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Auditor Examination Basis & Limitation */}
              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                <div><strong>سند الفحص والتحقق المحاسبي:</strong> {activeAuditorNotes}</div>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                وقد أُعطيت هذه الشهادة بناءً على طلب العميل لتقديمها إلى <strong>{activeRecipient}</strong>، وذلك {activePurpose}، دون أدنى مسؤولية على مكتب المحاسب القانوني ومراقب الحسابات تجاه الغير فيما يجاوز ما تم فحصه مستندياً ومحاسبياً وفقاً لمعايير المحاسبة والمراجعة المصرية السارية.
              </p>
            </div>

            {/* Official Closing, Sign-off, Barcode & Stamp Footer */}
            <div className="pt-4.5 print:pt-4 border-t-2 border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Auditor Details */}
              <div className="space-y-0.5 text-center sm:text-right">
                <div className="text-xs text-slate-500 font-bold">المحاسب القانوني ومراقب الحسابات:</div>
                <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
                <div className="text-emerald-800 font-semibold text-xs">{profile.title}</div>
                <div className="text-slate-600 font-mono text-[11px]">
                  رقم القيد بسجل المحاسبين والمراجعين: <strong>{profile.licenseNumber || 'س.م.م / 43122 - ترخيص وزارة المالية'}</strong>
                </div>
                <div className="text-emerald-950 font-mono font-bold text-[11px]">
                  هاتف المكتب والتواصل: <strong>{profile.phone || '01003335360'}</strong>
                </div>
              </div>

              {/* Verification Center (Barcode Code 128 / QR / Stamp) */}
              <div className="flex items-center gap-4">
                {/* Linear Barcode Code 128 (Option 2) or Dual Display */}
                {(verificationBarcodeType === 'BARCODE_128' || verificationBarcodeType === 'DUAL') && (
                  <div
                    onClick={() => {
                      const verificationPayload: VerificationPayloadData = {
                        docType: 'شهادة إثبات دخل وملاءة مالية معتمدة',
                        docNumber: certNumber,
                        clientName: `${activeBeneficiaryTitle} ${activeBeneficiaryName}`.trim(),
                        nationalId: activeNationalId || undefined,
                        commercialRegNo: activeCommercialRegNo || undefined,
                        taxCardNo: activeTaxCardNo || undefined,
                        amount: activeCertifiedAmount,
                        auditorName: profile.auditorName,
                        licenseNumber: profile.licenseNumber || 'س.م.م 43122',
                        date: activeIssueDate,
                        recipient: activeRecipient,
                        purpose: purpose,
                        firmName: profile.firmName,
                      };
                      setVerifyModalData(verificationPayload);
                    }}
                    className="cursor-pointer group text-center bg-white p-2 rounded-lg border border-slate-300 shadow-2xs hover:border-emerald-600 transition-all"
                    title="الباركود الخطي المصرفي المعتمد (Code 128) - انقر لمعاينة التحقق الأمني"
                  >
                    <div
                      className="overflow-hidden flex items-center justify-center"
                      dangerouslySetInnerHTML={{
                        __html: generateCode128Svg(certNumber, { height: 38, moduleWidth: 1.5, showText: true }),
                      }}
                    />
                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-1 px-1">
                      <span>كود التحقق: {certNumber}</span>
                      <span className="text-emerald-800 font-bold group-hover:underline">🔍 تحقق</span>
                    </div>
                  </div>
                )}

                {/* QR Code Verification if enabled */}
                {(verificationBarcodeType === 'QR_CODE' || verificationBarcodeType === 'DUAL') && (() => {
                  const verificationPayload: VerificationPayloadData = {
                    docType: 'شهادة إثبات دخل وملاءة مالية معتمدة',
                    docNumber: certNumber,
                    clientName: `${activeBeneficiaryTitle} ${activeBeneficiaryName}`.trim(),
                    nationalId: activeNationalId || undefined,
                    commercialRegNo: activeCommercialRegNo || undefined,
                    taxCardNo: activeTaxCardNo || undefined,
                    amount: activeCertifiedAmount,
                    auditorName: profile.auditorName,
                    licenseNumber: profile.licenseNumber || 'س.م.م 43122',
                    date: activeIssueDate,
                    recipient: activeRecipient,
                    purpose: purpose,
                    firmName: profile.firmName,
                  };
                  const qrText = buildVerificationQrText(verificationPayload);

                  return (
                    <div
                      onClick={() => setVerifyModalData(verificationPayload)}
                      className="cursor-pointer group relative transition-transform hover:scale-105"
                      title="رمز QR للتحقق السريع عبر كاميرا الهاتف"
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateQrCodeSvg(qrText, 76),
                        }}
                      />
                      <span className="block text-[8px] font-bold text-center text-emerald-800 mt-0.5 group-hover:underline">
                        🔍 QR تحقق
                      </span>
                    </div>
                  );
                })()}

                {/* Official Certified Stamp & Signature Space */}
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[8.5px] font-bold text-emerald-950 p-1 text-center shadow-2xs bg-emerald-50/20">
                  <span>مكتب المحاسب القانوني</span>
                  <span className="text-emerald-800 font-black text-[10px]">{profile.auditorName}</span>
                  <span className="font-mono text-[8px]">{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</span>
                  <span className="text-[8.5px] text-emerald-700 font-bold">ختم الاعتماد الرسمي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive In-App Verification Modal */}
      {verifyModalData && (
        <DocumentVerificationModal
          data={verifyModalData}
          onClose={() => setVerifyModalData(null)}
        />
      )}

      {/* Direct Certificate Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isDirectPreviewOpen}
        onClose={() => setIsDirectPreviewOpen(false)}
        modelType="CERTIFICATES"
        title="الشهادة المهنية المعتمدة"
        customDocument={activeCertificatePayload}
        initialPageSize="A4"
        initialOrientation="portrait"
      />
    </div>
  );
};
