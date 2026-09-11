import React, { useState, useMemo, useEffect } from 'react';
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
  Landmark,
  PieChart,
  Sliders,
  CheckSquare,
  Square,
  ArrowRight,
  Shield,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import {
  formatEgyptianCurrency,
  generateQrCodeSvg,
  generateCode128Svg,
  buildVerificationUrl,
  buildVerificationQrText,
  VerificationPayloadData,
} from '../utils/qrCodeGenerator';
import { numberToArabicWords, cleanArabicTafqeet } from '../utils/numberToWordsArabic';
import { PrintService } from '../services/PrintService';
import {
  ProfessionalCertificate,
  CertificateBeneficiaryType,
  CertificateTemplateType,
} from '../types';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { PrintPreviewModal } from './common/PrintPreviewModal';
import { CertifiedDocumentExportMenu } from './common/CertifiedDocumentExportMenu';
import { DocumentVerificationModal } from './common/DocumentVerificationModal';
import { DirectWhatsAppProcedureModal } from './common/DirectWhatsAppProcedureModal';

interface CertificatesGeneratorViewProps {
  state: DatabaseState;
}

interface BreakdownRow {
  source: string;
  amount: number;
  monthlyEquivalent?: number;
  notes?: string;
}

export const CertificatesGeneratorView: React.FC<CertificatesGeneratorViewProps> = ({ state }) => {
  const profile = state.officeProfile;
  const certificates = state.certificates || [];
  const clients = state.clients || [];

  // Tab mode: 'CREATE' or 'ARCHIVE'
  const [activeTab, setActiveTab] = useState<'CREATE' | 'ARCHIVE'>('CREATE');

  // Currently editing certificate ID (null for new certificate)
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  // Form states
  const [beneficiaryType, setBeneficiaryType] = useState<CertificateBeneficiaryType>('LEGAL_ENTITY');
  const [certType, setCertType] = useState<CertificateTemplateType>('INVESTED_CAPITAL');
  
  // Custom Certificate Title
  const [customHeading, setCustomHeading] = useState<string>('');

  // Selected client for quick autofill
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Beneficiary details (Person vs Entity)
  const [beneficiaryGender, setBeneficiaryGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [beneficiaryTitle, setBeneficiaryTitle] = useState<string>('السادة /');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
  const [nationalId, setNationalId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('رئيس مجلس الإدارة والعضو المنتدب');
  const [address, setAddress] = useState<string>('القطعة 44 - المنطقة الصناعية - بياض العرب - بني سويف');
  
  // Entity / Business specifics
  const [commercialRegNo, setCommercialRegNo] = useState<string>('148293');
  const [taxCardNo, setTaxCardNo] = useState<string>('302-819-402');
  const [activityName, setActivityName] = useState<string>('صناعة وتجارة الهياكل والمعدات الهندسية');

  // Examination basis preset & customized text (flexible phrasing)
  const [examinationBasisType, setExaminationBasisType] = useState<string>('INVESTED_CAPITAL_EXAM');
  const [customPreambleBasis, setCustomPreambleBasis] = useState<string>(
    'بناءً على الفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، والشهادات البنكية لإيداع رأس المال، ومحاضر الجمعيات العمومية غير العادية المعتمدة'
  );
  const [customIntroText, setCustomIntroText] = useState<string>('');
  const [customBodyText, setCustomBodyText] = useState<string>('');
  const [customDeclarationPhrase, setCustomDeclarationPhrase] = useState<string>(
    'بأن إجمالي رأس المال المستثمر وحجم الأعمال للمنشأة هو:'
  );

  // Certificate specifications
  const [recipientOrganization, setRecipientOrganization] = useState<string>('السادة / الهيئة العامة للاستثمار والمناطق الحرة (GAFI) والبنك الأهلي المصري');
  const [purpose, setPurpose] = useState<string>('لتقديمها للجهات الرسمية والمصرفية لإثبات حجم رأس المال المستثمر والملاءة التمويلية');
  const [certifiedAmount, setCertifiedAmount] = useState<number>(5000000);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [periodText, setPeriodText] = useState<string>('عن السنة المالية المنتهية في 31 ديسمبر 2025');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [auditorNotes, setAuditorNotes] = useState<string>(
    'تم التحقق من إيداع رأس المال كاملاً بموجب الشهادة البنكية الصادرة وقيد الاستثمارات بالدفاتر المحاسبية للمنشأة.'
  );

  // Invested Capital & Business Size Specific Parameters
  const [paidCapitalAmount, setPaidCapitalAmount] = useState<number>(5000000);
  const [authorizedCapitalAmount, setAuthorizedCapitalAmount] = useState<number>(20000000);
  const [annualTurnoverAmount, setAnnualTurnoverAmount] = useState<number>(18500000);
  const [fixedAssetsValue, setFixedAssetsValue] = useState<number>(3200000);
  const [workingCapitalAmount, setWorkingCapitalAmount] = useState<number>(1800000);
  const [shareholdersEquity, setShareholdersEquity] = useState<number>(6400000);
  const [bankDepositBank, setBankDepositBank] = useState<string>('البنك الأهلي المصري - فرع المهندسين');
  const [bankDepositAccount, setBankDepositAccount] = useState<string>('شهادة إيداع بنكية رقم 984210 / حساب 10098234');

  // Financial Solvency Specific Parameters
  const [totalAssets, setTotalAssets] = useState<number>(8500000);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(2100000);
  const [currentRatio, setCurrentRatio] = useState<number>(2.4);
  const [netProfitAmount, setNetProfitAmount] = useState<number>(1250000);

  // Table options & Breakdown flexibility
  const [showBreakdownTable, setShowBreakdownTable] = useState<boolean>(true);
  const [breakdownTableTitle, setBreakdownTableTitle] = useState<string>('جدول عناصر ومكونات رأس المال المستثمر وهيكل التمويل:');
  const [breakdownColumnName, setBreakdownColumnName] = useState<string>('عنصر رأس المال / المكون الاستثماري المؤيد مستندياً');
  const [breakdownAmountName, setBreakdownAmountName] = useState<string>('القيمة بالجنيه المصري (ج.م)');
  const [breakdownNoteName, setBreakdownNoteName] = useState<string>('النسبة / البيان الإيضاحي');
  const [showMonthlyInTable, setShowMonthlyInTable] = useState<boolean>(false);

  // Breakdown items
  const [breakdownItems, setBreakdownItems] = useState<BreakdownRow[]>([
    { source: 'رأس المال النقدي المدفوع والمودع بالبنك', amount: 3000000, notes: '60% - شهادة بنكية معتمدة' },
    { source: 'صافي الأصول والآلات والمعدات الإنتاجية المستثمرة', amount: 1500000, notes: '30% - فواتير وإفراجات جمركية' },
    { source: 'مخزون التشغيل ورأس المال العامل الدوار', amount: 500000, notes: '10% - جرد معتمد ومقيد بالدفاتر' },
  ]);

  // Display toggles
  const [showFinancialMetricsCards, setShowFinancialMetricsCards] = useState<boolean>(true);

  // Selected certificate from archive to view
  const [selectedCertForView, setSelectedCertForView] = useState<ProfessionalCertificate | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [verifyModalData, setVerifyModalData] = useState<VerificationPayloadData | null>(null);
  const [whatsAppCert, setWhatsAppCert] = useState<ProfessionalCertificate | any | null>(null);

  // Barcode & Security Verification mode
  const [verificationBarcodeType, setVerificationBarcodeType] = useState<'BARCODE_128' | 'QR_CODE' | 'DUAL'>('BARCODE_128');

  // Title helper
  const getDefaultHeading = (type: CertificateTemplateType, benType: CertificateBeneficiaryType) => {
    if (benType === 'NATURAL_PERSON') {
      switch (type) {
        case 'FREELANCE_INCOME':
          return 'شهـادة إثبـات صـافـي دخـل مهـن حـرة وأنشطـة فـرديـة';
        case 'INCOME_PROOF':
          return 'شهـادة إثبـات صـافـي الـدخـل السنـوي والشهـري للأفـراد';
        case 'EMPLOYEE_ADDITIONAL_INC':
          return 'شهـادة إثبـات دخـل إضـافـي واستثمـارات للأفـراد';
        case 'REAL_ESTATE_INCOME':
          return 'شهـادة إثبـات إيـرادات عقـاريـة واستثمـاريـة للممـول';
        case 'INVESTED_CAPITAL':
          return 'شهـادة رأس المـال المستثمـر للنشـاط الفـردي';
        case 'FINANCIAL_SOLVENCY':
          return 'شهـادة مـلاءة مـاليـة وثـروة للأشخـاص الطبيعييـن';
        default:
          return 'شهـادة محاسبيـة ومهنيـة معتمـدة';
      }
    } else {
      switch (type) {
        case 'INVESTED_CAPITAL':
          return 'شهـادة رأس المـال المستثمـر وحجـم الأعمـال للمنشـأة';
        case 'INCOME_PROOF':
          return 'شهـادة إثبـات صـافـي دخـل وأربـاح سنـويـة للشركـات';
        case 'FINANCIAL_SOLVENCY':
          return 'شهـادة مـلاءة مـاليـة وجودة ائتمانية للشركات';
        case 'AUDIT_COMPLIANCE':
          return 'شهـادة فحـص ومراجعـة حسـابـات وقوائم مالية';
        default:
          return 'شهـادة محاسبيـة ومهنيـة معتمـدة للشركـات';
      }
    }
  };

  // Declaration helper
  const getDefaultDeclaration = (type: CertificateTemplateType) => {
    switch (type) {
      case 'INVESTED_CAPITAL':
        return 'بأن إجمالي رأس المال المستثمر وحجم الأعمال للمنشأة هو:';
      case 'FINANCIAL_SOLVENCY':
        return 'بأن صافي الملاءة المالية والمركز المالي هو:';
      case 'AUDIT_COMPLIANCE':
        return 'بأن القوائم المالية تعبر بعدالة عن المركز المالي وصافي الأرباح البالغة:';
      case 'REAL_ESTATE_INCOME':
        return 'بأن إجمالي الإيرادات العقارية والاستثمارية المحققة هو:';
      case 'EMPLOYEE_ADDITIONAL_INC':
        return 'بأن إجمالي الدخل الإضافي والاستثماري السنوي المحقق هو:';
      case 'FREELANCE_INCOME':
        return 'بأن صافي الدخل السنوي المحقق من النشاط المهني هو:';
      default:
        return 'بأن صافي الدخل السنوي المحقق هو:';
    }
  };

  // Helper when certificate template type changes
  const handleCertTypeChange = (newType: CertificateTemplateType) => {
    setCertType(newType);
    setCustomHeading(''); // Reset to default for new type
    setCustomDeclarationPhrase(getDefaultDeclaration(newType));

    if (newType === 'INVESTED_CAPITAL') {
      setShowBreakdownTable(true);
      setBreakdownTableTitle('جدول عناصر ومكونات رأس المال المستثمر وهيكل التمويل:');
      setBreakdownColumnName('عنصر رأس المال / المكون الاستثماري المؤيد مستندياً');
      setBreakdownAmountName('القيمة بالجنيه المصري (ج.م)');
      setBreakdownNoteName('النسبة / البيان الإيضاحي');
      setShowMonthlyInTable(false);
      setBreakdownItems([
        { source: 'رأس المال النقدي المدفوع والمودع بالبنك', amount: 3000000, notes: '60% - شهادة بنكية معتمدة' },
        { source: 'صافي الأصول والآلات والمعدات الإنتاجية المستثمرة', amount: 1500000, notes: '30% - فواتير وإفراجات جمركية' },
        { source: 'مخزون التشغيل ورأس المال العامل الدوار', amount: 500000, notes: '10% - جرد معتمد ومقيد بالدفاتر' },
      ]);
      setCertifiedAmount(5000000);
      setMonthlyAmount(0);
      setExaminationBasisType('INVESTED_CAPITAL_EXAM');
      setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، والشهادات البنكية لإيداع رأس المال، ومحاضر الجمعيات العمومية');
      setAuditorNotes('تم التحقق من إيداع رأس المال كاملاً بموجب الشهادة البنكية الصادرة وقيد الزيادة والاستثمارات بالدفاتر المحاسبية للمنشأة.');
    } else if (newType === 'FINANCIAL_SOLVENCY') {
      setShowBreakdownTable(true);
      setBreakdownTableTitle('جدول بيان عناصر الأصول والالتزامات والملاءة المالية:');
      setBreakdownColumnName('بند المركز المالي / الأصول والملاءة');
      setBreakdownAmountName('القيمة التقديرية (ج.م)');
      setBreakdownNoteName('طبيعة البند والتقييم');
      setShowMonthlyInTable(false);
      setBreakdownItems([
        { source: 'إجمالي الأصول العقارية والأراضي المملوكة', amount: 5000000, notes: 'أصول ثابتة مسجلة' },
        { source: 'أرصدة نقدية وشهادات واستثمارات بنكية', amount: 2000000, notes: 'سيولة نقدية وشبه نقدية' },
        { source: 'أصول تجارية وحصص في شركات قائمة', amount: 1500000, notes: 'استثمارات مباشرة' },
      ]);
      setCertifiedAmount(8500000);
      setMonthlyAmount(0);
      setExaminationBasisType('FULL_AUDIT');
      setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي لسندات الملكية، والشهادات البنكية، والقوائم المالية المعتمدة');
      setAuditorNotes('بناءً على فحص الأصول والممتلكات ومستندات الملكية والشهادات البنكية المؤيدة للملاءة المالية.');
    } else {
      // Income proof or freelance
      setShowBreakdownTable(true);
      setBreakdownTableTitle('جدول بيان تفصيلي بمصادر الدخل المحققة والمؤيدة مستندياً:');
      setBreakdownColumnName('مصدر الدخل والنشاط المؤيد مستندياً');
      setBreakdownAmountName('الإيراد السنوي (ج.م)');
      setBreakdownNoteName('المعادل الشهري');
      setShowMonthlyInTable(true);
      setBreakdownItems([
        { source: 'صافي إيرادات النشاط المهني / التجاري المستقل', amount: 720000, monthlyEquivalent: 60000, notes: '60,000 ج.م/شهر' },
        { source: 'استشارات وعوائد استثمارات وأعمال متنوعة', amount: 180000, monthlyEquivalent: 15000, notes: '15,000 ج.م/شهر' },
      ]);
      setCertifiedAmount(900000);
      setMonthlyAmount(75000);
      setExaminationBasisType('GENERAL_DOCS');
      setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المقدمة المؤيدة للإيرادات والدخل');
      setAuditorNotes('بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المؤيدة لمصادر الدخل المحققة.');
    }
  };

  // Quick handler when beneficiary type changes
  const handleBeneficiaryTypeChange = (type: CertificateBeneficiaryType) => {
    setBeneficiaryType(type);
    if (type === 'NATURAL_PERSON') {
      setBeneficiaryTitle('السيد /');
      setBeneficiaryGender('MALE');
      setBeneficiaryName('م. إيهاب عادل عبد السلام النشار');
      setNationalId('28608200103492');
      setJobTitle('مهندس استشاري ومستثمر عقاري');
      setActivityName('استشارات هندسية ودخل استثماري وتأجيري');
      setTaxCardNo('412-890-123');
      setCommercialRegNo('');
      setAddress('14 شارع النصر - المعادي - القاهرة');
      setPurpose('لتقديمها للبنك للحصول على تمويل شخصي واستثماري');
      setRecipientOrganization('السادة / البنك التجاري الدولي (CIB) - قطاع الائتمان والتمويل');
      handleCertTypeChange('FREELANCE_INCOME');
    } else {
      setBeneficiaryTitle('السادة /');
      setBeneficiaryName('شركة النيل للصناعات الهندسية والتجارة (ش.م.م)');
      setNationalId('');
      setJobTitle('رئيس مجلس الإدارة والعضو المنتدب');
      setActivityName('صناعة وتجارة الهياكل والمعدات الهندسية');
      setTaxCardNo('302-819-402');
      setCommercialRegNo('148293');
      setAddress('القطعة 44 - المنطقة الصناعية - بياض العرب - بني سويف');
      setPurpose('لتقديمها للجهات الرسمية والمصرفية لإثبات حجم رأس المال المستثمر والملاءة التمويلية');
      setRecipientOrganization('السادة / الهيئة العامة للاستثمار والمناطق الحرة (GAFI) والبنك الأهلي المصري');
      handleCertTypeChange('INVESTED_CAPITAL');
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

  // Handle Amount change and sync monthly if income
  const handleAmountChange = (amt: number) => {
    setCertifiedAmount(amt);
    if (certType !== 'INVESTED_CAPITAL' && certType !== 'FINANCIAL_SOLVENCY') {
      setMonthlyAmount(Math.round(amt / 12));
    }
  };

  // Breakdown items handlers
  const handleAddBreakdownItem = () => {
    setBreakdownItems([...breakdownItems, { source: '', amount: 0, notes: '' }]);
  };

  const handleRemoveBreakdownItem = (idx: number) => {
    const updated = breakdownItems.filter((_, i) => i !== idx);
    setBreakdownItems(updated);
    const sum = updated.reduce((s, it) => s + (it.amount || 0), 0);
    if (sum > 0) {
      setCertifiedAmount(sum);
      if (certType !== 'INVESTED_CAPITAL' && certType !== 'FINANCIAL_SOLVENCY') {
        setMonthlyAmount(Math.round(sum / 12));
      }
    }
  };

  const handleBreakdownItemChange = (idx: number, field: keyof BreakdownRow, value: any) => {
    const updated = [...breakdownItems];
    const updatedRow = { ...updated[idx], [field]: field === 'amount' ? Number(value) : value };
    if (field === 'amount' && showMonthlyInTable) {
      updatedRow.monthlyEquivalent = Math.round(Number(value) / 12);
    }
    updated[idx] = updatedRow;
    setBreakdownItems(updated);
    if (field === 'amount') {
      const sum = updated.reduce((s, it) => s + (it.amount || 0), 0);
      if (sum > 0) {
        setCertifiedAmount(sum);
        if (certType !== 'INVESTED_CAPITAL' && certType !== 'FINANCIAL_SOLVENCY') {
          setMonthlyAmount(Math.round(sum / 12));
        }
      }
    }
  };

  // Load Certificate into Editor for editing
  const handleEditCertificateFromArchive = (cert: ProfessionalCertificate) => {
    setEditingCertId(cert.id);
    setSelectedCertForView(null);
    setActiveTab('CREATE');

    setBeneficiaryType(cert.beneficiaryType);
    setBeneficiaryGender(cert.beneficiaryGender || 'MALE');
    setBeneficiaryTitle(cert.beneficiaryTitle || (cert.beneficiaryType === 'NATURAL_PERSON' ? 'السيد /' : 'السادة /'));
    setBeneficiaryName(cert.clientName);
    setNationalId(cert.nationalId || '');
    setJobTitle(cert.jobTitle || '');
    setAddress(cert.address || '');
    setCommercialRegNo(cert.commercialRegNo || '');
    setTaxCardNo(cert.taxCardNo || '');
    setActivityName(cert.activityName || '');
    setCertType(cert.certificateType);
    setCustomHeading(cert.customCertificateHeading || '');
    setRecipientOrganization(cert.recipientEntity);
    setPurpose(cert.purpose);
    setPeriodText(cert.periodText);
    setIssueDate(cert.issueDate);
    setCertifiedAmount(cert.certifiedAmount);
    setMonthlyAmount(cert.monthlyAmount || 0);
    setAuditorNotes(cert.auditorNotes);
    setCustomPreambleBasis(cert.customPreambleBasis || '');
    setCustomIntroText(cert.customIntroText || '');
    setCustomBodyText(cert.customBodyText || '');
    setCustomDeclarationPhrase(cert.customDeclarationPhrase || getDefaultDeclaration(cert.certificateType));

    // Invested Capital specifics
    setPaidCapitalAmount(cert.paidCapitalAmount || cert.investedCapitalAmount || cert.certifiedAmount);
    setAuthorizedCapitalAmount(cert.authorizedCapitalAmount || 0);
    setAnnualTurnoverAmount(cert.annualTurnoverAmount || 0);
    setFixedAssetsValue(cert.fixedAssetsValue || 0);
    setWorkingCapitalAmount(cert.workingCapitalAmount || 0);
    setShareholdersEquity(cert.shareholdersEquity || 0);
    setBankDepositBank(cert.bankDepositBank || '');
    setBankDepositAccount(cert.bankDepositAccount || '');

    // Financial Solvency specifics
    setTotalAssets(cert.totalAssets || 0);
    setTotalLiabilities(cert.totalLiabilities || 0);
    setCurrentRatio(cert.currentRatio || 0);
    setNetProfitAmount(cert.netProfitAmount || 0);

    // Table settings
    setShowBreakdownTable(cert.showBreakdownTable !== false);
    setBreakdownTableTitle(cert.breakdownTableTitle || 'جدول التحليل والتفصيل:');
    setBreakdownColumnName(cert.breakdownColumnName || 'البند / المصدر');
    setBreakdownAmountName(cert.breakdownAmountName || 'القيمة (ج.م)');
    setBreakdownNoteName(cert.breakdownNoteName || 'البيان / النسبة');
    setShowFinancialMetricsCards(cert.showFinancialMetricsCards !== false);

    if (cert.incomeBreakdown && cert.incomeBreakdown.length > 0) {
      setBreakdownItems(cert.incomeBreakdown);
    }
  };

  // Clone/Duplicate certificate
  const handleDuplicateCertificate = (cert: ProfessionalCertificate) => {
    handleEditCertificateFromArchive(cert);
    setEditingCertId(null); // Fresh new certificate ID
  };

  // Delete certificate from DB
  const handleDeleteCertificate = (cert: ProfessionalCertificate) => {
    if (confirm(`هل أنت متأكد من حذف الشهادة رقم (${cert.certificateNumber}) للعميل (${cert.clientName}) من السجل؟`)) {
      db.deleteCertificate(cert.id);
      if (selectedCertForView?.id === cert.id) {
        setSelectedCertForView(null);
      }
    }
  };

  // Generated dynamic cert number for draft
  const certNumber = selectedCertForView
    ? selectedCertForView.certificateNumber
    : editingCertId
    ? certificates.find((c) => c.id === editingCertId)?.certificateNumber || `CERT-${new Date().getFullYear()}-0001`
    : `CERT-${new Date().getFullYear()}-${String(certificates.length + 1).padStart(4, '0')}`;

  // Save Certificate to DB
  const handleSaveCertificate = () => {
    const certPayloadData = {
      certificateType: certType,
      customCertificateHeading: customHeading.trim() || undefined,
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
      monthlyAmount: monthlyAmount > 0 ? monthlyAmount : undefined,
      
      // Invested Capital specifics
      investedCapitalAmount: certType === 'INVESTED_CAPITAL' ? certifiedAmount : undefined,
      paidCapitalAmount: paidCapitalAmount > 0 ? paidCapitalAmount : undefined,
      authorizedCapitalAmount: authorizedCapitalAmount > 0 ? authorizedCapitalAmount : undefined,
      annualTurnoverAmount: annualTurnoverAmount > 0 ? annualTurnoverAmount : undefined,
      fixedAssetsValue: fixedAssetsValue > 0 ? fixedAssetsValue : undefined,
      workingCapitalAmount: workingCapitalAmount > 0 ? workingCapitalAmount : undefined,
      shareholdersEquity: shareholdersEquity > 0 ? shareholdersEquity : undefined,
      bankDepositBank: bankDepositBank.trim() || undefined,
      bankDepositAccount: bankDepositAccount.trim() || undefined,

      // Financial Solvency & Audit specifics
      totalAssets: totalAssets > 0 ? totalAssets : undefined,
      totalLiabilities: totalLiabilities > 0 ? totalLiabilities : undefined,
      currentRatio: currentRatio > 0 ? currentRatio : undefined,
      netProfitAmount: netProfitAmount > 0 ? netProfitAmount : undefined,
      solvencyNetWorth: certType === 'FINANCIAL_SOLVENCY' ? certifiedAmount : undefined,

      // Table options
      showBreakdownTable: showBreakdownTable,
      breakdownTableTitle: breakdownTableTitle.trim() || undefined,
      breakdownColumnName: breakdownColumnName.trim() || undefined,
      breakdownAmountName: breakdownAmountName.trim() || undefined,
      breakdownNoteName: breakdownNoteName.trim() || undefined,
      incomeBreakdown: breakdownItems.filter((s) => s.source.trim() && s.amount > 0),

      showFinancialMetricsCards: showFinancialMetricsCards,
      auditorNotes: auditorNotes,
      customIntroText: customIntroText.trim() || undefined,
      customBodyText: customBodyText.trim() || undefined,
      customPreambleBasis: customPreambleBasis.trim() || undefined,
      customDeclarationPhrase: customDeclarationPhrase.trim() || undefined,
      qrPayload: `EGY-CERT|${certNumber}|43122|${beneficiaryType}|${beneficiaryName}|${certifiedAmount}_EGP|VALID`,
      securityHash: `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      printedCount: 1,
    };

    if (editingCertId) {
      const updated = db.updateCertificate(editingCertId, certPayloadData);
      if (updated) {
        setSelectedCertForView(updated);
        alert(`تم حفظ وتحديث كافة بيانات الشهادة رقم (${updated.certificateNumber}) بنجاح.`);
      }
    } else {
      const newCert = db.addCertificate(certPayloadData);
      setSelectedCertForView(newCert);
      setEditingCertId(newCert.id);
      alert(`تم حفظ وتوثيق الشهادة رقم (${newCert.certificateNumber}) بنجاح في سجل الشهادات المهنية المعتمدة للمكتب.`);
    }
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

  // Current active view values (either from selected archived cert or live form)
  const activeBeneficiaryType = selectedCertForView ? selectedCertForView.beneficiaryType : beneficiaryType;
  const activeBeneficiaryGender = selectedCertForView?.beneficiaryGender || beneficiaryGender;
  const activeCertType = selectedCertForView ? selectedCertForView.certificateType : certType;
  const activeBeneficiaryName = selectedCertForView ? selectedCertForView.clientName : beneficiaryName;
  const activeBeneficiaryTitle = selectedCertForView
    ? (selectedCertForView.beneficiaryTitle || (activeBeneficiaryGender === 'FEMALE' ? 'السيدة /' : 'السيد /'))
    : beneficiaryTitle;
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
  const activeBreakdownItems = selectedCertForView ? (selectedCertForView.incomeBreakdown || []) : breakdownItems;
  const activeCustomBodyText = selectedCertForView ? selectedCertForView.customBodyText : customBodyText;
  const activeCustomPreambleBasis = selectedCertForView ? (selectedCertForView.customPreambleBasis || customPreambleBasis) : customPreambleBasis;
  const activeCustomHeading = selectedCertForView
    ? (selectedCertForView.customCertificateHeading || getDefaultHeading(selectedCertForView.certificateType, selectedCertForView.beneficiaryType))
    : (customHeading.trim() || getDefaultHeading(certType, beneficiaryType));
  const activeCustomDeclaration = selectedCertForView
    ? (selectedCertForView.customDeclarationPhrase || getDefaultDeclaration(selectedCertForView.certificateType))
    : (customDeclarationPhrase.trim() || getDefaultDeclaration(certType));

  const activeShowBreakdown = selectedCertForView ? (selectedCertForView.showBreakdownTable !== false) : showBreakdownTable;
  const activeBreakdownTitle = selectedCertForView ? (selectedCertForView.breakdownTableTitle || 'جدول التحليل والتفصيل:') : breakdownTableTitle;
  const activeColumnName = selectedCertForView ? (selectedCertForView.breakdownColumnName || 'عنصر رأس المال / المصدر') : breakdownColumnName;
  const activeAmountName = selectedCertForView ? (selectedCertForView.breakdownAmountName || 'القيمة (ج.م)') : breakdownAmountName;
  const activeNoteName = selectedCertForView ? (selectedCertForView.breakdownNoteName || 'البيان / النسبة') : breakdownNoteName;
  const activeShowMetrics = selectedCertForView ? (selectedCertForView.showFinancialMetricsCards !== false) : showFinancialMetricsCards;

  // Invested Capital Active values
  const activePaidCapital = selectedCertForView ? (selectedCertForView.paidCapitalAmount || selectedCertForView.investedCapitalAmount || selectedCertForView.certifiedAmount) : paidCapitalAmount;
  const activeAuthorizedCapital = selectedCertForView ? (selectedCertForView.authorizedCapitalAmount || 0) : authorizedCapitalAmount;
  const activeAnnualTurnover = selectedCertForView ? (selectedCertForView.annualTurnoverAmount || 0) : annualTurnoverAmount;
  const activeFixedAssets = selectedCertForView ? (selectedCertForView.fixedAssetsValue || 0) : fixedAssetsValue;
  const activeWorkingCapital = selectedCertForView ? (selectedCertForView.workingCapitalAmount || 0) : workingCapitalAmount;
  const activeEquity = selectedCertForView ? (selectedCertForView.shareholdersEquity || 0) : shareholdersEquity;
  const activeDepositBank = selectedCertForView ? (selectedCertForView.bankDepositBank || '') : bankDepositBank;
  const activeDepositAccount = selectedCertForView ? (selectedCertForView.bankDepositAccount || '') : bankDepositAccount;

  // Certificate Payload for Direct Document Preview and Printing
  const activeCertificatePayload = useMemo(() => {
    return {
      id: selectedCertForView?.id || editingCertId || 'ACTIVE-CERT-DOC',
      certificateNumber: certNumber,
      customCertificateHeading: activeCustomHeading,
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
      investedCapitalAmount: activeCertType === 'INVESTED_CAPITAL' ? activeCertifiedAmount : undefined,
      paidCapitalAmount: activePaidCapital,
      authorizedCapitalAmount: activeAuthorizedCapital,
      annualTurnoverAmount: activeAnnualTurnover,
      fixedAssetsValue: activeFixedAssets,
      workingCapitalAmount: activeWorkingCapital,
      shareholdersEquity: activeEquity,
      bankDepositBank: activeDepositBank,
      bankDepositAccount: activeDepositAccount,
      periodText: activePeriodText,
      recipientEntity: activeRecipient,
      purpose: activePurpose,
      auditorNotes: activeAuditorNotes,
      customBodyText: activeCustomBodyText,
      customPreambleBasis: activeCustomPreambleBasis,
      customDeclarationPhrase: activeCustomDeclaration,
      issueDate: activeIssueDate,
      incomeBreakdown: activeBreakdownItems,
      showBreakdownTable: activeShowBreakdown,
      breakdownTableTitle: activeBreakdownTitle,
      breakdownColumnName: activeColumnName,
      breakdownAmountName: activeAmountName,
      breakdownNoteName: activeNoteName,
      showFinancialMetricsCards: activeShowMetrics,
      qrPayload: `CERTIFICATE|${certNumber}|${activeBeneficiaryName}|${activeNationalId || activeCommercialRegNo || ''}|${activeCertifiedAmount}|${profile?.auditorName || 'محمد جميل مرعي'}|${profile?.phone || '01003335360'}`,
    };
  }, [
    selectedCertForView,
    editingCertId,
    certNumber,
    activeCustomHeading,
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
    activePaidCapital,
    activeAuthorizedCapital,
    activeAnnualTurnover,
    activeFixedAssets,
    activeWorkingCapital,
    activeEquity,
    activeDepositBank,
    activeDepositAccount,
    activePeriodText,
    activeRecipient,
    activePurpose,
    activeAuditorNotes,
    activeCustomBodyText,
    activeCustomPreambleBasis,
    activeCustomDeclaration,
    activeIssueDate,
    activeBreakdownItems,
    activeShowBreakdown,
    activeBreakdownTitle,
    activeColumnName,
    activeAmountName,
    activeNoteName,
    activeShowMetrics,
    profile,
  ]);

  const [isDirectPreviewOpen, setIsDirectPreviewOpen] = useState(false);

  // Direct print function for certificate using robust isolated iframe PrintService
  const handlePrintCertificateDirect = () => {
    PrintService.printElementById('official-certificate-document', {
      title: activeCustomHeading || 'شهادة محاسبية معتمدة',
      orientation: 'portrait',
      pageSize: 'A4',
      margins: 'DEFAULT',
      resequencePageNumbers: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                منظومة إصدار وتوثيق الشهادات المحاسبية والمهنية المعتمدة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إصدار شهادات رأس المال المستثمر، إثبات الدخل، الملاءة المالية، وفحص القوائم بمرونة صياغة وتحكم كامل في البنود والجداول.
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
              <span>{editingCertId ? 'تعديل الشهادة الحالية' : 'إصدار شهادة جديدة'}</span>
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
              <FileText className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-sm text-slate-900">سجل وأرشيف الشهادات المهنية الموثقة بالمكتب</h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم العميل، الرقم القومي، السجل، رقم الشهادة..."
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
                  <th className="p-3">نوع الشهادة ومسماها</th>
                  <th className="p-3">الجهة الموجه إليها</th>
                  <th className="p-3 text-left">المبلغ المعتمد</th>
                  <th className="p-3 text-center">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد شهادات مطابقة للبحث في السجل
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
                          {cert.customCertificateHeading || getDefaultHeading(cert.certificateType, cert.beneficiaryType)}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{cert.purpose}</div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <div className="font-medium text-xs">{cert.recipientEntity}</div>
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-800">
                        {formatEgyptianCurrency(cert.certifiedAmount || 0)}
                        {cert.monthlyAmount && cert.monthlyAmount > 0 && cert.certificateType !== 'INVESTED_CAPITAL' && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            (شهري: {formatEgyptianCurrency(cert.monthlyAmount)})
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setWhatsAppCert(cert)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="إرسال إشعار الشهادة عبر كود الواتساب المباشر"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                            <span>واتساب</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedCertForView(cert);
                              setActiveTab('CREATE');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200 transition-all cursor-pointer inline-flex items-center gap-1"
                            title="معاينة المستند والطباعة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </button>

                          <button
                            onClick={() => handleEditCertificateFromArchive(cert)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-200 transition-all cursor-pointer inline-flex items-center gap-1"
                            title="تعديل كافة بيانات الشهادة"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => handleDuplicateCertificate(cert)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 transition-all cursor-pointer inline-flex items-center gap-1"
                            title="استنساخ كشهادة جديدة"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCertificate(cert)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 transition-all cursor-pointer inline-flex items-center gap-1"
                            title="حذف من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
          {/* Editing Alert Banner if editing existing certificate */}
          {editingCertId && (
            <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-950 font-bold">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-700" />
                <span>أنت الآن في وضع تعديل الشهادة رقم ({certNumber}) للعميل: {beneficiaryName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCertId(null);
                  setSelectedCertForView(null);
                  handleBeneficiaryTypeChange(beneficiaryType);
                }}
                className="text-xs bg-white text-blue-900 px-3 py-1 rounded-lg border border-blue-300 hover:bg-blue-100 cursor-pointer"
              >
                إلغاء التعديل والبدء كشهادة جديدة
              </button>
            </div>
          )}

          {/* Certificate Editor Controls */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5 text-xs">
            {/* Quick Entity Type Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-xl border border-slate-200">
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

            {/* Quick Client Autofill & Template Type */}
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
                <label className="block text-slate-700 font-bold mb-1">نوع نموذج الشهادة</label>
                <select
                  value={certType}
                  onChange={(e) => handleCertTypeChange(e.target.value as any)}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-400 rounded-xl font-bold text-emerald-950"
                >
                  {beneficiaryType === 'NATURAL_PERSON' ? (
                    <>
                      <option value="FREELANCE_INCOME">1. شهادة إثبات صافي دخل مهن حرة واستشارات</option>
                      <option value="INCOME_PROOF">2. شهادة إثبات صافي دخل شهري / سنوي للأفراد</option>
                      <option value="EMPLOYEE_ADDITIONAL_INC">3. شهادة إثبات دخول إضافية واستثمارات متنوعة</option>
                      <option value="REAL_ESTATE_INCOME">4. شهادة إثبات إيرادات عقارية وتأجيرية</option>
                      <option value="INVESTED_CAPITAL">5. شهادة رأس مال مستثمر لنشاط فردي</option>
                      <option value="FINANCIAL_SOLVENCY">6. شهادة ملاءة مالية وثروة للأشخاص الطبيعيين</option>
                      <option value="CUSTOM_CERTIFICATE">7. شهادة محاسبية عامة مخصصة الصياغة</option>
                    </>
                  ) : (
                    <>
                      <option value="INVESTED_CAPITAL">1. شهادة رأس مال مستثمر وحجم أعمال للمنشأة</option>
                      <option value="INCOME_PROOF">2. شهادة إثبات صافي أرباح ودخل سنوي للشركات</option>
                      <option value="FINANCIAL_SOLVENCY">3. شهادة ملاءة مالية وجودة ائتمانية للشركات</option>
                      <option value="AUDIT_COMPLIANCE">4. شهادة فحص ومراجعة حسابات وقوائم مالية</option>
                      <option value="CUSTOM_CERTIFICATE">5. شهادة محاسبية مهنية مخصصة الصياغة</option>
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

            {/* Custom Certificate Heading (Flexibility for ALL Certificates) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>عنوان ومسمى الشهادة المطبوع بأعلى الصفحة (مرن وقابل للتعديل بالكامل):</span>
                </label>
                {customHeading && (
                  <button
                    type="button"
                    onClick={() => setCustomHeading('')}
                    className="text-[11px] text-emerald-800 hover:underline cursor-pointer"
                  >
                    استعادة العنوان الافتراضي
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customHeading}
                placeholder={getDefaultHeading(certType, beneficiaryType)}
                onChange={(e) => setCustomHeading(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-emerald-400 rounded-xl font-bold text-emerald-950 text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>المسمى الفعلي الحالي: <strong>{activeCustomHeading}</strong></span>
                <span className="text-emerald-700">يمكنك تعديل المسمى بحرية لأي جهة أو غرض (مثل: شهادة رأس مال مدفوع، شهادة ملاءة مصرفية، إلخ)</span>
              </div>
            </div>

            {/* Beneficiary Details Form */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
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
                    placeholder={beneficiaryGender === 'FEMALE' ? 'السيدة / السيدة الدكتورة / الآنسة' : 'السيد / السيد المهندس / الدكتور / السادة'}
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
                      <label className="block text-slate-600 font-bold mb-1">رقم السجل التجاري</label>
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
                    placeholder="عيادة خاصة / مكتب استشارات / صناعة وتجارة..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {beneficiaryType === 'NATURAL_PERSON' ? 'البطاقة الضريبية (اتركه فارغاً إن لم يوجد)' : 'عنوان المقر الرئيسي / المصنع'}
                  </label>
                  <input
                    type="text"
                    value={beneficiaryType === 'NATURAL_PERSON' ? taxCardNo : address}
                    onChange={(e) => {
                      if (beneficiaryType === 'NATURAL_PERSON') setTaxCardNo(e.target.value);
                      else setAddress(e.target.value);
                    }}
                    placeholder={beneficiaryType === 'NATURAL_PERSON' ? 'اتركه فارغاً إن لم يوجد' : 'المنطقة الصناعية - بني سويف'}
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

            {/* Special Section: Invested Capital Specific Parameters (شهادة رأس المال المستثمر) */}
            {certType === 'INVESTED_CAPITAL' && (
              <div className="p-4 bg-emerald-50/80 rounded-xl border-2 border-emerald-400/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <Landmark className="w-5 h-5 text-emerald-800" />
                    <span>تفاصيل وبيانات رأس المال المستثمر وهيكل التمويل (مرونة كاملة):</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    نموذج رأس المال المستثمر المعتمد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      إجمالي رأس المال المستثمر (المبلغ الرئيسي المعتمد) *
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={certifiedAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCertifiedAmount(val);
                        setPaidCapitalAmount(val);
                      }}
                      className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl font-mono font-bold text-emerald-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رأس المال المصدر والمدفوع (ج.م)</label>
                    <input
                      type="number"
                      value={paidCapitalAmount}
                      onChange={(e) => setPaidCapitalAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رأس المال المرخص به (إن وجد)</label>
                    <input
                      type="number"
                      value={authorizedCapitalAmount || ''}
                      placeholder="مثال: 20000000"
                      onChange={(e) => setAuthorizedCapitalAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">حجم الأعمال والتعاملات السنوية (ج.م)</label>
                    <input
                      type="number"
                      value={annualTurnoverAmount || ''}
                      placeholder="مثال: 18500000"
                      onChange={(e) => setAnnualTurnoverAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">صافي الأصول الثابتة والتجهيزات (ج.م)</label>
                    <input
                      type="number"
                      value={fixedAssetsValue || ''}
                      onChange={(e) => setFixedAssetsValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رأس المال العامل المستثمر (ج.م)</label>
                    <input
                      type="number"
                      value={workingCapitalAmount || ''}
                      onChange={(e) => setWorkingCapitalAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">صافي حقوق الملكية والشركاء (ج.م)</label>
                    <input
                      type="number"
                      value={shareholdersEquity || ''}
                      onChange={(e) => setShareholdersEquity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">بيانات بنك الإيداع والشهادة البنكية</label>
                    <input
                      type="text"
                      value={bankDepositBank}
                      placeholder="البنك الأهلي المصري - فرع المهندسين"
                      onChange={(e) => setBankDepositBank(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم شهادة الإيداع البنكية أو الحساب البنكي</label>
                  <input
                    type="text"
                    value={bankDepositAccount}
                    placeholder="شهادة إيداع بنكية رقم 984210 / حساب رقم 10098234"
                    onChange={(e) => setBankDepositAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* General Financial Parameters (for non-invested capital certificates) */}
            {certType !== 'INVESTED_CAPITAL' && (
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
            )}

            {/* Recipient and Period if Invested Capital */}
            {certType === 'INVESTED_CAPITAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-slate-700 font-bold mb-1">الفترة الزمنية أو تاريخ الفحص المعتمد</label>
                  <input
                    type="text"
                    value={periodText}
                    onChange={(e) => setPeriodText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Custom Declaration Phrase (عبارة الإقرار المرنة) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                  <FileBadge className="w-4 h-4 text-emerald-700" />
                  <span>عبارة الإقرار الرئيسية بالشهادة ("نشهد ونقر نحن المحاسب القانوني..."):</span>
                </label>
                {customDeclarationPhrase && (
                  <button
                    type="button"
                    onClick={() => setCustomDeclarationPhrase(getDefaultDeclaration(certType))}
                    className="text-[11px] text-emerald-800 hover:underline cursor-pointer"
                  >
                    استعادة العبارة الافتراضية
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customDeclarationPhrase}
                onChange={(e) => setCustomDeclarationPhrase(e.target.value)}
                placeholder={getDefaultDeclaration(certType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
              />
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
                    <span>1. مستندي عام (بدون بنك أو ضرائب)</span>
                    {examinationBasisType === 'GENERAL_DOCS' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    فحص مستندات وإيرادات فقط دون ذكر كشوف بنكية أو إقرارات ضريبية.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExaminationBasisType('INVESTED_CAPITAL_EXAM');
                    setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، والشهادات البنكية لإيداع رأس المال، ومحاضر الجمعيات العمومية');
                    setAuditorNotes('تم التحقق من إيداع رأس المال كاملاً بموجب الشهادة البنكية وقيد الاستثمارات بالدفاتر المحاسبية.');
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    examinationBasisType === 'INVESTED_CAPITAL_EXAM'
                      ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>2. فحص رأس مال واستثمار</span>
                    {examinationBasisType === 'INVESTED_CAPITAL_EXAM' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    فحص شهادات الإيداع البنكي وسجلات الأصول ورأس المال المستثمر.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExaminationBasisType('FULL_AUDIT');
                    setCustomPreambleBasis('بناءً على الفحص المكتبي والمستندي للسجلات المحاسبية المنتظمة، وكشوف الحسابات المصرفية، والإقرارات الضريبية والقوائم المالية المعتمدة');
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
                  placeholder="اكتب عبارة الفحص هنا..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-amber-50/30"
                />
              </div>
            </div>

            {/* Flexible Breakdown Table Builder for ALL certificates */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBreakdownTable(!showBreakdownTable)}
                    className="flex items-center gap-1.5 text-slate-800 font-bold text-xs cursor-pointer hover:text-emerald-800"
                  >
                    {showBreakdownTable ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>إظهار جدول التحليل والتفصيل في الشهادة</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    ({showBreakdownTable ? 'مفعل' : 'معطل - إخفاء الجدول في الطباعة'})
                  </span>
                </div>

                {showBreakdownTable && (
                  <button
                    type="button"
                    onClick={handleAddBreakdownItem}
                    className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة بند بالجدول</span>
                  </button>
                )}
              </div>

              {showBreakdownTable && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  {/* Table Titles and Column Headers Customizer */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">عنوان الجدول المطبوع:</label>
                      <input
                        type="text"
                        value={breakdownTableTitle}
                        onChange={(e) => setBreakdownTableTitle(e.target.value)}
                        placeholder="جدول عناصر رأس المال / مصادر الدخل"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">تسمية عمود البند:</label>
                      <input
                        type="text"
                        value={breakdownColumnName}
                        onChange={(e) => setBreakdownColumnName(e.target.value)}
                        placeholder="عنصر رأس المال / مصدر الدخل"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">تسمية عمود المبلغ:</label>
                      <input
                        type="text"
                        value={breakdownAmountName}
                        onChange={(e) => setBreakdownAmountName(e.target.value)}
                        placeholder="القيمة المستثمرة / الإيراد السنوي"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">تسمية عمود الملاحظة / النسبة:</label>
                      <input
                        type="text"
                        value={breakdownNoteName}
                        onChange={(e) => setBreakdownNoteName(e.target.value)}
                        placeholder="النسبة / المعادل / البيان"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Rows editor */}
                  <div className="space-y-2">
                    {breakdownItems.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1 text-slate-400 font-mono text-xs w-6 text-center">
                          {idx + 1}
                        </div>

                        <input
                          type="text"
                          placeholder="اسم البند (مثال: رأس المال النقدي المدفوع / إيرادات النشاط المهني)"
                          value={item.source}
                          onChange={(e) => handleBreakdownItemChange(idx, 'source', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />

                        <div className="w-full sm:w-44">
                          <input
                            type="number"
                            placeholder="المبلغ (ج.م)"
                            value={item.amount || ''}
                            onChange={(e) => handleBreakdownItemChange(idx, 'amount', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-emerald-950"
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="البيان / النسبة (مثال: 60% شهادة بنكية)"
                          value={item.notes || ''}
                          onChange={(e) => handleBreakdownItemChange(idx, 'notes', e.target.value)}
                          className="w-full sm:w-56 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveBreakdownItem(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer self-end sm:self-center"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Purpose and Auditor Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الغرض من إصدار الشهادة</label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سند الفحص وملاحظات المحاسب القانوني</label>
                <textarea
                  rows={2}
                  value={auditorNotes}
                  onChange={(e) => setAuditorNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
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
                عند ترك هذا الحقل فارغاً، يتم استخدام الصياغة الرسمية الذكية المعتمدة تلقائياً بناءً على النوع (ذكر / أنثى / شركة) ونموذج الشهادة المختار.
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
                  (الباركود الخطي Code 128 مفعل تلقائياً لضمان القراءة الفورية 100% على الورق المطبوع)
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
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>{editingCertId ? 'تحديث وحفظ التعديلات على الشهادة' : 'حفظ وتوثيق الشهادة في السجل العام للمكتب'}</span>
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
                  شهادة معتمدة بالباركود المصرفي (Code 128) والختم الرسمي وهاتف المكتب ({profile?.phone || '01003335360'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <CertifiedDocumentExportMenu
                documentData={{
                  certificateNumber: certNumber,
                  clientName: activeBeneficiaryName,
                  beneficiaryTitle: activeBeneficiaryTitle,
                  beneficiaryType: activeBeneficiaryType,
                  beneficiaryGender: activeBeneficiaryGender,
                  nationalId: activeNationalId,
                  jobTitle: activeJobTitle,
                  address: activeAddress,
                  taxCardNo: activeTaxCardNo,
                  commercialRegNo: activeCommercialRegNo,
                  activityName: activeActivityName,
                  certificateType: activeCertType,
                  certifiedAmount: activeCertifiedAmount,
                  monthlyNetIncome: activeMonthlyAmount,
                  periodText: activePeriodText,
                  recipientEntity: activeRecipient,
                  purpose: activePurpose,
                  auditorNotes: activeAuditorNotes,
                  customBodyText: activeCustomBodyText,
                  customPreambleBasis: activeCustomPreambleBasis,
                  issueDate: activeIssueDate,
                  incomeBreakdown: {
                    notes: activeAuditorNotes,
                  },
                }}
                targetElementId="official-certificate-document"
                profile={profile}
                buttonLabel="تصدير بجميع الصيغ"
              />

              <button
                type="button"
                onClick={() => setWhatsAppCert(activeCertificatePayload)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                title="إرسال الشهادة للعميل مباشرة عبر كود الواتساب"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>إرسال واتساب مباشر</span>
              </button>

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
                <span>طباعة الشهادة A4</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Printable Official Egyptian CPA Certificate Document                       */}
          {/* ========================================================================= */}
          <div
            id="official-certificate-document"
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid', pageBreakAfter: 'avoid', breakAfter: 'avoid' }}
            className="bg-white rounded-xl border-2 border-emerald-900 shadow-lg p-7 sm:p-9 print:p-5 space-y-4 print:space-y-3.5 text-slate-900 text-xs leading-relaxed max-w-4xl mx-auto print:shadow-none print:border-2 print:border-emerald-950 print:max-w-full"
          >
            {/* Letterhead Header */}
            <div className="border-b-2 border-emerald-900 pb-3 flex items-center justify-between">
              <div className="space-y-0.5 text-right">
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
                <div>نوع الكيان: <strong>{activeBeneficiaryType === 'NATURAL_PERSON' ? (activeBeneficiaryGender === 'FEMALE' ? 'شخص طبيعي (أنثى)' : 'شخص طبيعي (ذكر)') : 'شخص اعتباري (منشأة)'}</strong></div>
              </div>
            </div>

            {/* Certificate Title Badge */}
            <div className="text-center py-0.5">
              <div className="inline-block px-6 sm:px-9 py-2 rounded-xl bg-emerald-50/90 border-2 border-emerald-800 shadow-2xs">
                <h2 className="text-sm sm:text-base font-black text-emerald-950">
                  {activeCustomHeading}
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
            <div className="space-y-3 text-right text-slate-800 leading-6 sm:leading-7 text-xs sm:text-sm">
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
                    <> - المهنة / الوظيفة: <strong>{activeJobTitle}</strong></>
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
                  ، و{activeCustomPreambleBasis || (activeCertType === 'INVESTED_CAPITAL' ? 'بناءً على الفحص المكتبي والمستندي للوثائق والسجلات وشهادات الإيداع البنكية المؤيدة لعناصر رأس المال وحجم الأعمال' : 'بناءً على الفحص المكتبي والمستندي للوثائق والمستندات المقدمة المؤيدة للإيرادات والدخل')}:
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
                  {activeActivityName && (
                    <> - ونشاط: <strong>{activeActivityName}</strong></>
                  )}
                  ، وبصفتنا المحاسب القانوني ومراقب الحسابات للنشاط المذكور أعلاه، و{activeCustomPreambleBasis || (activeCertType === 'INVESTED_CAPITAL' ? 'بناءً على المراجعة والفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، وشهادات الإيداع البنكية لرأس المال، ومحاضر الجمعيات العمومية' : 'بناءً على المراجعة والفحص المكتبي والمستندي للسجلات والدفاتر المحاسبية المنتظمة، والشهادات البنكية، والقوائم المالية المعتمدة')}:
                </p>
              )}

              {/* Highlighted Certified Amount Box */}
              <div className="p-4 sm:p-4.5 rounded-xl bg-slate-50/90 border-2 border-emerald-800/40 space-y-2.5">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-slate-900 font-black">
                    نشهد ونقر نحن المحاسب القانوني ومراقب الحسابات {activeCustomDeclaration}
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

                {/* Correct Arabic Tafqeet */}
                <div className="font-bold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm">
                  {cleanArabicTafqeet(numberToArabicWords(activeCertifiedAmount))}
                </div>

                <div className="text-xs text-slate-700 font-semibold">
                  وذلك <strong>{activePeriodText}</strong>.
                </div>

                {/* Invested Capital Financial Metrics Cards (if enabled and present) */}
                {activeCertType === 'INVESTED_CAPITAL' && activeShowMetrics && (
                  <div className="pt-2 border-t border-slate-200/90 grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
                    {activePaidCapital > 0 && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">رأس المال المدفوع:</div>
                        <div className="text-xs font-mono font-black text-emerald-950">{formatEgyptianCurrency(activePaidCapital)}</div>
                      </div>
                    )}

                    {activeAnnualTurnover > 0 && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">حجم الأعمال السنوي:</div>
                        <div className="text-xs font-mono font-black text-slate-900">{formatEgyptianCurrency(activeAnnualTurnover)}</div>
                      </div>
                    )}

                    {activeFixedAssets > 0 && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">صافي الأصول الثابتة:</div>
                        <div className="text-xs font-mono font-bold text-slate-800">{formatEgyptianCurrency(activeFixedAssets)}</div>
                      </div>
                    )}

                    {activeEquity > 0 && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">صافي حقوق الملكية:</div>
                        <div className="text-xs font-mono font-bold text-slate-800">{formatEgyptianCurrency(activeEquity)}</div>
                      </div>
                    )}

                    {activeDepositBank && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2 sm:col-span-4 text-[10px] text-slate-700">
                        <strong>البنك المودع به رأس المال:</strong> {activeDepositBank} {activeDepositAccount ? ` - ${activeDepositAccount}` : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* Formal Flexible Breakdown Table */}
                {activeShowBreakdown && activeBreakdownItems && activeBreakdownItems.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/90">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{activeBreakdownTitle}</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
                      <table className="w-full text-right border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                            <th className="py-2 px-2.5 text-center w-8">م</th>
                            <th className="py-2 px-2.5">{activeColumnName}</th>
                            <th className="py-2 px-2.5 text-center font-mono w-36">{activeAmountName}</th>
                            <th className="py-2 px-2.5 text-center font-mono w-40">{activeNoteName}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {activeBreakdownItems.map((item, idx) => {
                            const val = Number(item.amount) || 0;
                            const percentage = activeCertifiedAmount > 0 ? (val / activeCertifiedAmount) * 100 : 0;
                            const noteText = item.notes || (percentage > 0 ? `${percentage.toFixed(1)}% من الإجمالي` : '');

                            return (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-600">{idx + 1}</td>
                                <td className="py-2 px-2.5 font-medium text-slate-800">{item.source}</td>
                                <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-900">{formatEgyptianCurrency(val)}</td>
                                <td className="py-2 px-2.5 text-center font-mono text-slate-700 text-[10px]">{noteText}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-emerald-50/70 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td colSpan={2} className="py-2 px-2.5 text-right font-black">
                              الإجمالي المعتمد والمطابق:
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-black text-emerald-950 text-xs">
                              {formatEgyptianCurrency(activeCertifiedAmount)}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-black text-emerald-900 text-xs">
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
            <div className="pt-4 print:pt-3 border-t-2 border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                        docType: activeCustomHeading,
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
                        purpose: activePurpose,
                        firmName: profile.firmName,
                      };
                      setVerifyModalData(verificationPayload);
                    }}
                    data-barcode-container="true"
                    className="barcode-print-container cursor-pointer group text-center bg-white p-2 rounded-lg border border-slate-300 shadow-2xs hover:border-emerald-600 transition-all inline-block"
                    title="الباركود الخطي المصرفي المعتمد (Code 128) - انقر لمعاينة التحقق الأمني"
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateCode128Svg(certNumber, { height: 42, moduleWidth: 1.8, showText: true }),
                      }}
                    />
                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-1 px-1 no-print">
                      <span>كود التحقق: {certNumber}</span>
                      <span className="text-emerald-800 font-bold group-hover:underline">🔍 تحقق</span>
                    </div>
                  </div>
                )}

                {/* QR Code Verification if enabled */}
                {(verificationBarcodeType === 'QR_CODE' || verificationBarcodeType === 'DUAL') && (() => {
                  const verificationPayload: VerificationPayloadData = {
                    docType: activeCustomHeading,
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
                    purpose: activePurpose,
                    firmName: profile.firmName,
                  };
                  const qrText = buildVerificationQrText(verificationPayload);

                  return (
                    <div
                      onClick={() => setVerifyModalData(verificationPayload)}
                      data-qr-container="true"
                      className="qr-print-container cursor-pointer group relative transition-transform hover:scale-105 inline-block text-center bg-white p-1 rounded-lg border border-slate-200"
                      title="رمز QR للتحقق السريع عبر كاميرا الهاتف"
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateQrCodeSvg(qrText, 96),
                        }}
                      />
                      <span className="block text-[8.5px] font-bold text-center text-emerald-900 mt-0.5 group-hover:underline">
                        رمز التحقق الرقمي
                      </span>
                    </div>
                  );
                })()}

                {/* Official Certified Stamp & Signature Space */}
                <div className="w-26 h-26 rounded-full border-2 border-dashed border-emerald-800 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-950 p-1.5 text-center shadow-2xs bg-emerald-50/25 leading-tight space-y-0.5">
                  <div className="text-[8px] text-slate-700">مكتب المحاسب القانوني</div>
                  <div className="text-emerald-900 font-black text-[10px] px-1">{profile.auditorName}</div>
                  <div className="font-mono text-[8.5px] text-slate-800">{profile.licenseNumber?.includes('س.م.م') ? profile.licenseNumber.split('-')[0].trim() : 'س.م.م 43122'}</div>
                  <div className="text-[8px] text-emerald-800 font-bold border-t border-emerald-300/80 pt-0.5 mt-0.5">ختم الاعتماد الرسمي</div>
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
        title={activeCustomHeading || 'الشهادة المهنية المعتمدة'}
        targetElementId="official-certificate-document"
        customDocument={activeCertificatePayload}
        initialPageSize="A4"
        initialOrientation="portrait"
      />

      {/* Direct In-App WhatsApp Procedure Modal */}
      {whatsAppCert && (
        <DirectWhatsAppProcedureModal
          isOpen={Boolean(whatsAppCert)}
          onClose={() => setWhatsAppCert(null)}
          initialContext={{
            procedureType:
              whatsAppCert.certificateType === 'INVESTED_CAPITAL'
                ? 'CERTIFICATE_CAPITAL'
                : whatsAppCert.certificateType === 'SOLVENCY_FINANCIAL_STANDING'
                ? 'CERTIFICATE_SOLVENCY'
                : 'CERTIFICATE_INCOME',
            title: whatsAppCert.customCertificateHeading || whatsAppCert.purpose || 'شهادة مهنية معتمدة',
            clientName: whatsAppCert.clientName,
            referenceCode: whatsAppCert.certificateNumber,
            amount: whatsAppCert.certifiedAmount || whatsAppCert.investedCapitalAmount || 0,
            periodOrDate: whatsAppCert.issueDate || whatsAppCert.date,
            recipientEntity: whatsAppCert.recipientEntity || 'إلى من يهمه الأمر',
            customNotes: whatsAppCert.purpose ? `الغرض: ${whatsAppCert.purpose}` : '',
            verificationCode: whatsAppCert.verificationCode || `VER-${whatsAppCert.certificateNumber}`,
          }}
          state={state}
        />
      )}
    </div>
  );
};
