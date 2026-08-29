import React, { useState } from 'react';
import {
  Award,
  Printer,
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
  Sparkles,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency, generateQrCodeSvg } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { ProfessionalCertificate, CertificateBeneficiaryType, CertificateTemplateType } from '../types';

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
  const [beneficiaryTitle, setBeneficiaryTitle] = useState<string>('السيد /');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('د. سامح عبد العزيز النجار');
  const [nationalId, setNationalId] = useState<string>('27805120101948');
  const [jobTitle, setJobTitle] = useState<string>('طبيب استشاري جراحة العظام والمفاصل');
  const [address, setAddress] = useState<string>('14 شارع النصر - المعادي - القاهرة');
  
  // Entity / Business specifics
  const [commercialRegNo, setCommercialRegNo] = useState<string>('');
  const [taxCardNo, setTaxCardNo] = useState<string>('560-192-384');
  const [activityName, setActivityName] = useState<string>('عيادة النجار التخصصية لجراحة العظام');

  // Certificate specifications
  const [recipientOrganization, setRecipientOrganization] = useState<string>('السادة / بنك مصر - قطاع التمويل العقاري والائتمان');
  const [purpose, setPurpose] = useState<string>('لتقديمها للبنك بناءً على طلب العميل للحصول على تمويل عقاري لشراء وحدة سكنية ومهنية');
  const [certifiedAmount, setCertifiedAmount] = useState<number>(900000);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(75000);
  const [periodText, setPeriodText] = useState<string>('عن السنة المالية المنتهية في 31 ديسمبر 2025 ومتوسط الدخل الشهري المحقق');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [auditorNotes, setAuditorNotes] = useState<string>(
    'بناءً على الفحص المستندي لدفاتر وسجلات الإيرادات والمصروفات والبطاقة الضريبية رقم 560-192-384 والإقرارات الضريبية المقدمة لمأمورية ضرائب المهن الحرة.'
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
  const activeCertType = selectedCertForView ? selectedCertForView.certificateType : certType;
  const activeBeneficiaryName = selectedCertForView ? selectedCertForView.clientName : beneficiaryName;
  const activeBeneficiaryTitle = selectedCertForView ? selectedCertForView.beneficiaryTitle : beneficiaryTitle;
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

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة الرسمية</span>
          </button>
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
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                {beneficiaryType === 'NATURAL_PERSON' ? <User className="w-4 h-4 text-blue-600" /> : <Building className="w-4 h-4 text-purple-600" />}
                <span>
                  {beneficiaryType === 'NATURAL_PERSON'
                    ? 'بيانات الشخص الطبيعي (العميل الفرد / صاحب المهنة / الموظف)'
                    : 'بيانات الشخص الاعتباري (الشركة / المنشأة التجارية)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اللقب / الصفة</label>
                  <input
                    type="text"
                    value={beneficiaryTitle}
                    onChange={(e) => setBeneficiaryTitle(e.target.value)}
                    placeholder="السيد / السيد الدكتور / السادة"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
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
                        placeholder="طبيب / مهندس / مستشار / موظف بشركة..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
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
                    {beneficiaryType === 'NATURAL_PERSON' ? 'طبيعة النشاط أو جهة العمل' : 'اسم النشاط / الغرض التجاري'}
                  </label>
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="عيادة خاصة / مكتب استشارات / شركة..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'البطاقة الضريبية للمهنة الحرة (إن وجدت)' : 'عنوان المقر الرئيسي'}
                  </label>
                  <input
                    type="text"
                    value={beneficiaryType === 'NATURAL_PERSON' ? taxCardNo : address}
                    onChange={(e) => {
                      if (beneficiaryType === 'NATURAL_PERSON') setTaxCardNo(e.target.value);
                      else setAddress(e.target.value);
                    }}
                    placeholder={beneficiaryType === 'NATURAL_PERSON' ? '560-192-384' : 'المعادي - القاهرة'}
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

            {/* Purpose and Auditor Notes */}
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
          {/* Printable Official Egyptian CPA Certificate Document                       */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border-2 border-emerald-900 shadow-md p-8 sm:p-14 space-y-6 text-slate-900 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black print:p-8 print:max-w-full">
            {/* Letterhead Header */}
            <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-black text-slate-900">{profile.firmName}</h1>
                <div className="text-sm font-bold text-emerald-900">{profile.auditorName}</div>
                <div className="text-xs text-slate-600 font-semibold">{profile.title}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  رقم القيد بسجل المحاسبين والمراجعين: <strong>{profile.licenseNumber || 'س.م.م / 43122'}</strong>
                </div>
              </div>
              <div className="text-left font-mono text-[11px] text-slate-600 space-y-1">
                <div>رقم الشهادة: <strong className="text-emerald-950">{certNumber}</strong></div>
                <div>تاريخ الإصدار: <strong>{activeIssueDate}</strong></div>
                <div>نوع الكيان: <strong>{activeBeneficiaryType === 'NATURAL_PERSON' ? 'شخص طبيعي' : 'شخص اعتباري'}</strong></div>
              </div>
            </div>

            {/* Certificate Title Badge */}
            <div className="text-center py-2">
              <div className="inline-block px-8 py-2.5 rounded-xl bg-emerald-50/90 border-2 border-emerald-800">
                <h2 className="text-base sm:text-xl font-black text-emerald-950 tracking-wide">
                  {getCertificateHeading(activeCertType, activeBeneficiaryType)}
                </h2>
              </div>
            </div>

            {/* Recipient Addressee */}
            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-950">
                إلى: {activeRecipient}
              </div>
              <div className="text-slate-800 font-semibold text-xs">تحية طيبة وبعد،،،</div>
            </div>

            {/* Body Text */}
            <div className="space-y-4 text-justify text-slate-800 leading-7 text-xs sm:text-sm">
              {activeBeneficiaryType === 'NATURAL_PERSON' ? (
                /* NATURAL PERSON BODY TEMPLATE */
                <p>
                  بناءً على طلب العميل / <strong>{activeBeneficiaryTitle} {activeBeneficiaryName}</strong>
                  {activeNationalId && (
                    <> - حامل بطاقة الرقم القومي رقم (<strong className="font-mono">{activeNationalId}</strong>)</>
                  )}
                  {activeJobTitle && (
                    <> - والمهنة: <strong>{activeJobTitle}</strong></>
                  )}
                  {activeAddress && (
                    <> - المقيم في: <strong>{activeAddress}</strong></>
                  )}
                  {activeTaxCardNo && (
                    <> - وبطاقة ضريبية رقم (<strong className="font-mono">{activeTaxCardNo}</strong>)</>
                  )}
                  ، وبناءً على الفحص المكتبي والمستندي للوثائق والمستندات المؤيدة للإيرادات والمصروفات، وكشوف الحسابات المصرفية المنتظمة، والإقرارات الضريبية المقدمة لمصلحة الضرائب المصرية:
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
                  ، وبصفتنا المحاسب القانوني ومراقب الحسابات للنشاط المذكور أعلاه، وبناءً على المراجعة والفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، وموازين المراجعة، والقوائم المالية والإقرارات الضريبية المعتمدة:
                </p>
              )}

              {/* Highlighted Certified Amount Box */}
              <div className="p-5 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3">
                <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>
                    نشهد ونقر نحن المحاسب القانوني بأن{' '}
                    {activeCertType === 'INVESTED_CAPITAL'
                      ? 'رأس المال المستثمر وحجم الأعمال'
                      : activeCertType === 'FINANCIAL_SOLVENCY'
                      ? 'صافي الملاءة المالية والمركز المالي'
                      : 'صافي الدخل السنوي المحقق'} هو:
                  </span>
                  {activeMonthlyAmount && activeMonthlyAmount > 0 && activeCertType !== 'INVESTED_CAPITAL' && (
                    <span className="text-xs text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 font-bold">
                      بمتوسط شهري: {formatEgyptianCurrency(activeMonthlyAmount)}
                    </span>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                  {formatEgyptianCurrency(activeCertifiedAmount)}
                </div>

                <div className="font-bold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm">
                  فقط وقدره: {numberToArabicWords(activeCertifiedAmount)} لا غير.
                </div>

                <div className="text-xs text-slate-700 font-medium">
                  وذلك <strong>{activePeriodText}</strong>.
                </div>

                {/* Multi-source breakdown if available */}
                {activeIncomeBreakdown && activeIncomeBreakdown.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-[11px] font-bold text-slate-700 mb-1.5">بيان تفصيلي بمصادر الدخل المحققة والمعتمدة:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeIncomeBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-700">• {item.source}:</span>
                          <strong className="font-mono text-emerald-900">{formatEgyptianCurrency(item.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Auditor Examination Basis & Limitation */}
              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                <div><strong>سند الفحص والتحقق المحاسبي:</strong> {activeAuditorNotes}</div>
              </div>

              <p>
                وقد أُعطيت هذه الشهادة بناءً على طلب العميل لتقديمها إلى <strong>{activeRecipient}</strong>، وذلك {activePurpose}، دون أدنى مسؤولية على مكتب المحاسب القانوني ومراقب الحسابات تجاه الغير فيما يجاوز ما تم فحصه مستندياً ومحاسبياً وفقاً لمعايير المحاسبة والمراجعة المصرية السارية.
              </p>
            </div>

            {/* Official Closing, Sign-off & Stamp */}
            <div className="pt-8 border-t-2 border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-right">
                <div className="text-xs text-slate-500 font-bold">المحاسب القانوني ومراقب الحسابات:</div>
                <div className="text-base font-black text-slate-900">{profile.auditorName}</div>
                <div className="text-emerald-800 font-semibold">{profile.title}</div>
                <div className="text-slate-600 font-mono text-[11px]">
                  رقم القيد بسجل المحاسبين والمراجعين بوزارة المالية: <strong>{profile.licenseNumber || 'س.م.م / 43122'}</strong>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Official Certified Stamp */}
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-950 p-2 text-center shadow-2xs">
                  <span>مكتب المحاسب القانوني</span>
                  <span className="text-emerald-800 font-black text-[11px]">{profile.auditorName}</span>
                  <span className="font-mono">{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">ختم الاعتماد الرسمي</span>
                </div>

                {/* QR Code Verification */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(
                      `CERTIFICATE|${certNumber}|${activeBeneficiaryName}|${activeNationalId || activeCommercialRegNo}|${activeCertifiedAmount}|CPA_MOHAMED_GAMIL_MAREI_43122`,
                      96
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
