import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck,
  FileText,
  Building,
  History,
  ArrowRightLeft,
} from 'lucide-react';
import { ClientArchiveRecord, TaxDeclarationRecord, CompanyType } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { EgyptianTaxDeclarationPdfModal } from '../EgyptianTaxDeclarationPdfModal';
import { ScreenActionToolbar } from '../common/ScreenActionToolbar';

export const OFFICIAL_SAP_PORTAL_URL =
  'https://auth.eta.gov.eg:8080/auth/realms/e-tax/protocol/saml?SAMLRequest=fZFBa8JAEIX%2FStj7uhut0S4mIJVCoC1SSw%2B9jclEA8luujOx9t93E2mxF2FPj5n33je7Imibzqx7PtpX%2FOyROMo3qdhpPdfzBO7lXRKXMq4wllDttVzEMJvfl8l%2BUZUiekdPtbOpmE60iHKiHnNLDJaDpKeJjLXU8VuszWwW3oeINiGhtsDj1pG5I6MUhPgJMkwO7jTBg1nqpR5F5RGalhRKhrPqvGNXuEYNpUX06HyBY%2FNUVNAQDg22QFSf8E85t40lM1KmovfWOKCajIUWyXBhduvnJxPam19zka2GaTPC%2BKv92%2BshFv1AJbKqAyroimelrhwv9p15CRb5ZuuauvgeUFrg2wmDUpeyGkdNN1yeGC2LaN007ushnIoDN%2Fsehcoumf9%2FNvsB&RelayState=oucqqvqvwazouwrdorferoafbqoxratvzdwbxfd&SigAlg=http%3A%2F%2Fwww.w3.org%2F2000%2F09%2Fxmldsig%23rsa-sha1&Signature=Djou9cgY%2FYDnax7L%2B5j3Vex%2BFNM7GotG0rntgsxbzLx%2BnpgGJPQcjrXKWNAr6ihpxzZpBqOEQgw5ClxuPBFclBUt5QiMJQMhDgdJp5a5LFLk%2FfFkjKA5RtJx12tzb76%2FBAS%2BnsR3G%2BVrEPNGlUk3qz9%2FLpHx2RXv7p2BlVZ7R%2FA5Kos0ZL%2F3NyR9I5rtU4mxtQV%2FjurnuRv%2FnDNrPIA6dgdb9MQ3%2FQUNzRzhEEe131ZSLVC5CO%2BkW1JTBNdS210ldYxzYZFkDX91MhUL3FpGHvxCCP74cJQXA6f7MrGLXec7prjrEK2lmN5DKxg%2FegfZGxy0mBNPUurWLOsQYaL%2BLw%3D%3D#/home';

export const OFFICIAL_GENERAL_TAX_PORTAL_URL =
  'https://eservice.incometax.gov.eg/etax';

export const ARABIC_MONTHS = [
  { value: 1, name: 'يناير' },
  { value: 2, name: 'فبراير' },
  { value: 3, name: 'مارس' },
  { value: 4, name: 'أبريل' },
  { value: 5, name: 'مايو' },
  { value: 6, name: 'يونيو' },
  { value: 7, name: 'يوليو' },
  { value: 8, name: 'أغسطس' },
  { value: 9, name: 'سبتمبر' },
  { value: 10, name: 'أكتوبر' },
  { value: 11, name: 'نوفمبر' },
  { value: 12, name: 'ديسمبر' },
];

export function calculateTaxPeriodDates(isoMonth: string) {
  const parts = (isoMonth || '2026-03').split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 3;
  const padMonth = month.toString().padStart(2, '0');

  const startDate = `${year}-${padMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${padMonth}-${lastDay.toString().padStart(2, '0')}`;

  // موعد الاستحقاق القانوني في مصر: نهاية الشهر التالي للفترة الضريبية
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthLastDay = new Date(nextMonthYear, nextMonth, 0).getDate();
  const dueDate = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-${nextMonthLastDay.toString().padStart(2, '0')}`;

  const monthObj = ARABIC_MONTHS[month - 1] || ARABIC_MONTHS[2];
  const label = `شهر ${monthObj.name} ${year}`;

  return {
    year,
    month,
    padMonth,
    monthName: monthObj.name,
    startDate,
    endDate,
    dueDate,
    label,
    isoMonth: `${year}-${padMonth}`,
  };
}

export function getPreviousMonthIso(isoMonth: string): string {
  const parts = (isoMonth || '2026-03').split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = parseInt(parts[1], 10) || 3;
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return `${prevY}-${prevM.toString().padStart(2, '0')}`;
}

export function getNextMonthIso(isoMonth: string): string {
  const parts = (isoMonth || '2026-03').split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = parseInt(parts[1], 10) || 3;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return `${nextY}-${nextM.toString().padStart(2, '0')}`;
}

const SAMPLE_INITIAL_HISTORICAL_DECLARATIONS: Omit<TaxDeclarationRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    clientId: 'cl-1',
    clientName: 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)',
    declarationType: 'VAT_10',
    period: 'شهر فبراير 2026',
    periodMonth: '2026-02',
    taxYear: 2026,
    dueDate: '2026-03-31',
    submissionDate: '2026-03-12',
    status: 'SUBMITTED_TO_ETA',
    amendmentType: 'ORIGINAL',
    declarationNature: 'STANDARD_14',
    salesTaxableAmount: 480000,
    purchasesTaxableAmount: 290000,
    vatOutputTax: 67200,
    vatInputTax: 40600,
    previousCreditBalance: 4200,
    netTaxPayable: 22400,
    netVatPayable: 22400,
    etaReferenceNumber: 'ETA-VAT-2026-029418',
    receiptNumber: 'REC-90214',
    notes: 'إقرار القيمة المضافة لشهر فبراير 2026 - تم التقديم والسداد عبر ساب',
  },
  {
    clientId: 'cl-1',
    clientName: 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)',
    declarationType: 'VAT_10',
    period: 'شهر يناير 2026',
    periodMonth: '2026-01',
    taxYear: 2026,
    dueDate: '2026-02-28',
    submissionDate: '2026-02-18',
    status: 'SUBMITTED_TO_ETA',
    amendmentType: 'ORIGINAL',
    declarationNature: 'STANDARD_14',
    salesTaxableAmount: 420000,
    purchasesTaxableAmount: 310000,
    vatOutputTax: 58800,
    vatInputTax: 43400,
    previousCreditBalance: 0,
    netTaxPayable: 15400,
    netVatPayable: 15400,
    etaReferenceNumber: 'ETA-VAT-2026-018820',
    receiptNumber: 'REC-89012',
    notes: 'إقرار القيمة المضافة لشهر يناير 2026 - مسدد بالكامل',
  },
  {
    clientId: 'cl-2',
    clientName: 'مؤسسة الأهرام الدولية للمقاولات والتوريدات (ش.ذ.م.م)',
    declarationType: 'VAT_10',
    period: 'شهر فبراير 2026',
    periodMonth: '2026-02',
    taxYear: 2026,
    dueDate: '2026-03-31',
    submissionDate: '2026-03-10',
    status: 'SUBMITTED_TO_ETA',
    amendmentType: 'ORIGINAL',
    declarationNature: 'STANDARD_14',
    salesTaxableAmount: 180000,
    purchasesTaxableAmount: 120000,
    vatOutputTax: 25200,
    vatInputTax: 16800,
    previousCreditBalance: 0,
    netTaxPayable: 8400,
    netVatPayable: 8400,
    etaReferenceNumber: 'ETA-VAT-2026-024519',
    receiptNumber: 'REC-76120',
    notes: 'إقرار القيمة المضافة لشهر فبراير 2026 - تم التقديم بنجاح',
  },
];

export type TaxFilter = 'ALL' | 'VAT' | 'INCOME';
export type SystemFilter = 'ALL' | 'SAP' | 'OLD_PORTAL';
export type StatusFilter = 'ALL' | 'SUBMITTED' | 'PENDING';

interface UnifiedTaxFilingAgendaViewProps {
  state: DatabaseState;
  onOpenPdfModal?: (decl: TaxDeclarationRecord) => void;
  onOpenInvoicesHarmonizer?: (clientId?: string) => void;
}

export const UnifiedTaxFilingAgendaView: React.FC<UnifiedTaxFilingAgendaViewProps> = ({
  state,
}) => {
  // الفلاتر الأساسية
  const [taxFilter, setTaxFilter] = useState<TaxFilter>('ALL');
  const [systemFilter, setSystemFilter] = useState<SystemFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // تحديد الفترة الضريبية بالتاريخ (وفق نظام الضرائب)
  const [selectedIsoMonth, setSelectedIsoMonth] = useState('2026-03');
  const periodInfo = useMemo(() => calculateTaxPeriodDates(selectedIsoMonth), [selectedIsoMonth]);
  const periodName = periodInfo.label;

  // النسخ وإظهار كلمات المرور
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // الصفوف المفتوحة (Accordion)
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

  // اختيار إقرار سابق مخصص لكل شركة من قائمة الفترات السابقة
  const [selectedPrevDeclIdPerClient, setSelectedPrevDeclIdPerClient] = useState<Record<string, string>>({});

  // طي / فتح بطاقة الإقرار السابق لكل شركة (افتراضياً مفتوحة ومتاحة للمعاينة المباشرة)
  const [collapsedPrevDeclIds, setCollapsedPrevDeclIds] = useState<Set<string>>(new Set());

  // طي / فتح سجل إقرارات المنشأة المحفوظة (افتراضياً مطوي لتوفير الارتفاع وتقليل الحاجة للتمرير)
  const [showClientHistory, setShowClientHistory] = useState<Record<string, boolean>>({});

  // إظهار / إخفاء التواريخ التفصيلية (من / إلى / استحقاق) لتوفير الارتفاع
  const [showDetailedDates, setShowDetailedDates] = useState<Record<string, boolean>>({});

  // بيانات نموذج الإقرار المنسدل لكل شركة بالتاريخ
  const [drawerData, setDrawerData] = useState<
    Record<
      string,
      {
        declarationType: 'VAT_10' | 'INCOME_27_CORP' | 'INCOME_28_INDIV' | 'PAYROLL_4' | 'WHT_41';
        period: string;
        taxYear: number;
        periodMonth: string;
        startDate: string;
        endDate: string;
        dueDate: string;
        quarter?: number;
        amendmentType: 'ORIGINAL' | 'AMENDED';
        originalDeclarationRef: string;
        amendmentReason: string;
        isZeroReturn: boolean;
        salesAmount: number;
        purchasesAmount: number;
        vatOutputTax: number;
        vatInputTax: number;
        previousCreditBalance: number;
        netTaxPayable: number;
        etaRef: string;
        receiptNo: string;
        isSubmitted: boolean;
        notes: string;
      }
    >
  >({});

  // غرس إقرارات تاريخية أولية لشركة النيل والشركات إذا لم تكن موجودة
  useEffect(() => {
    const hasNileDecl = state.taxDeclarations.some(
      (d) => d.clientId === 'cl-1' || d.clientName?.includes('النيل')
    );
    if (!hasNileDecl) {
      SAMPLE_INITIAL_HISTORICAL_DECLARATIONS.forEach((decl) => {
        db.addTaxDeclaration(decl);
      });
    }
  }, []);

  // نافذة تعديل / إضافة شركة وبيانات الدخول
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isNewClientMode, setIsNewClientMode] = useState(false);
  const [clientModalForm, setClientModalForm] = useState({
    id: '',
    clientCode: '',
    name: '',
    companyType: 'LLC' as CompanyType,
    taxCardNo: '',
    taxOffice: '',
    isVatSubject: true,
    isIncomeTaxSubject: true,
    taxSystemType: 'SAP' as 'SAP' | 'OLD_PORTAL',
    username: '',
    password: '',
    pinOtp: '',
    portalUrl: '',
  });

  // نافذة طباعة الإقرار الرسمي PDF
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedDeclForPdf, setSelectedDeclForPdf] = useState<TaxDeclarationRecord | null>(null);

  // إشعار نجاح مؤقت
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // نسخ إلى الحافظة
  const handleCopy = (text: string, keyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // إظهار / إخفاء كلمة المرور
  const togglePasswordVisibility = (clientId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisiblePasswords((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // قراءة بيانات الدخول والمنظومة للعميل
  const getClientSystemInfo = (client: ClientArchiveRecord) => {
    const creds = client.portalCredentials || {};
    let sysType = client.taxSystemType || (creds.sapPortal?.username ? 'SAP' : 'OLD_PORTAL');

    let username = '';
    let password = '';
    let pinOtp = '';
    let portalUrl = '';

    if (sysType === 'SAP') {
      username = creds.sapPortal?.username || creds.sapTaxPortal?.username || creds.etaGeneralTax?.username || '';
      password = creds.sapPortal?.password || creds.sapTaxPortal?.password || creds.etaGeneralTax?.password || '';
      pinOtp = creds.sapPortal?.pinOtp || creds.sapTaxPortal?.pinOtp || '';
      portalUrl = creds.sapPortal?.portalUrl || OFFICIAL_SAP_PORTAL_URL;
    } else {
      username = creds.etaGeneralTax?.username || creds.sapPortal?.username || '';
      password = creds.etaGeneralTax?.password || creds.sapPortal?.password || '';
      pinOtp = creds.etaGeneralTax?.pinOtp || '';
      portalUrl = creds.etaGeneralTax?.portalUrl || OFFICIAL_GENERAL_TAX_PORTAL_URL;
    }

    // مطابقة بيانات شركة النيل بدقة للمحاسب
    if ((client.id === 'cl-1' || client.name?.includes('النيل')) && !username) {
      sysType = 'SAP';
      portalUrl = OFFICIAL_SAP_PORTAL_URL;
    }

    return {
      sysType,
      isSap: sysType === 'SAP',
      username,
      password,
      pinOtp,
      portalUrl,
    };
  };

  // فحص أحدث إقرار للفترة المحددة بدقة شهرية
  const getClientDeclarationStatus = (client: ClientArchiveRecord, targetIsoMonth: string = selectedIsoMonth) => {
    const targetPeriodInfo = calculateTaxPeriodDates(targetIsoMonth);
    const decls = state.taxDeclarations
      .filter((d) => d.clientId === client.id)
      .sort((a, b) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime());

    const currentDecl = decls.find((d) => {
      // إقرار القيمة المضافة أو الإقرارات الشهرية
      if (d.declarationType === 'VAT_10' || !d.declarationType) {
        return (
          d.periodMonth === targetPeriodInfo.isoMonth ||
          d.period?.includes(targetPeriodInfo.label) ||
          d.period?.includes(targetPeriodInfo.monthName) ||
          d.period?.includes(targetPeriodInfo.isoMonth)
        );
      }
      // إقرارات ضرائب الدخل السنوية
      if (d.declarationType === 'INCOME_27_CORP' || d.declarationType === 'INCOME_28_INDIV') {
        return d.taxYear === targetPeriodInfo.year;
      }
      // إقرارات ربع سنوية
      return (
        d.period?.includes(targetPeriodInfo.label) ||
        d.period?.includes(targetPeriodInfo.monthName) ||
        d.period?.includes(targetPeriodInfo.isoMonth)
      );
    });

    const isSubmitted =
      currentDecl?.status === 'SUBMITTED_TO_ETA' ||
      currentDecl?.status === 'PAID' ||
      currentDecl?.status === 'APPROVED';

    return {
      latestDecl: currentDecl || null,
      allDecls: decls,
      isSubmitted: !!isSubmitted,
      netPayable: currentDecl?.netTaxPayable ?? currentDecl?.netVatPayable ?? 0,
      etaRef: currentDecl?.etaReferenceNumber,
    };
  };

  // جلب الإقرار السابق للمنشأة
  const getPreviousDeclaration = (clientId: string, currentIsoMonth: string = selectedIsoMonth) => {
    const prevIsoMonth = getPreviousMonthIso(currentIsoMonth);
    const prevPeriodInfo = calculateTaxPeriodDates(prevIsoMonth);

    const decls = state.taxDeclarations
      .filter((d) => d.clientId === clientId)
      .sort((a, b) => new Date(b.dueDate || b.createdAt).getTime() - new Date(a.dueDate || a.createdAt).getTime());

    // 1. إذا اختار المحاسب إقراراً سابقاً معيناً من القائمة المنسدلة لهذه الشركة
    const customSelectedId = selectedPrevDeclIdPerClient[clientId];
    if (customSelectedId) {
      const customDecl = decls.find((d) => d.id === customSelectedId);
      if (customDecl) {
        const cPeriod = calculateTaxPeriodDates(customDecl.periodMonth || prevIsoMonth);
        return {
          prevDecl: customDecl,
          prevPeriodInfo: cPeriod,
          allPastDecls: decls,
        };
      }
    }

    // 2. البحث عن إقرار الشهر السابق مباشرة (مثلاً فبراير إذا كان الحالي مارس)
    const directPrev = decls.find(
      (d) =>
        d.periodMonth === prevPeriodInfo.isoMonth ||
        d.period?.includes(prevPeriodInfo.label) ||
        d.period?.includes(prevPeriodInfo.monthName) ||
        d.period?.includes(prevPeriodInfo.isoMonth)
    );

    if (directPrev) {
      return { prevDecl: directPrev, prevPeriodInfo, allPastDecls: decls };
    }

    // 3. البحث عن أي إقرار سابق مسجل قبل هذا التاريخ
    const anyPrev = decls.find((d) => {
      const dDate = d.periodMonth || d.dueDate || d.createdAt || '';
      return dDate < `${currentIsoMonth}-01` || d.taxYear < prevPeriodInfo.year;
    });

    return {
      prevDecl: anyPrev || (decls.length > 0 ? decls[0] : null),
      prevPeriodInfo,
      allPastDecls: decls,
    };
  };

  // ترحيل الرصيد الدائن من الإقرار السابق للإقرار الحالي
  const handleCarryForwardCredit = (clientId: string, prevDecl: TaxDeclarationRecord) => {
    const outV = prevDecl.vatOutputTax || 0;
    const inV = prevDecl.vatInputTax || 0;
    const oldCredit = prevDecl.previousCreditBalance || 0;
    const credit = Math.max(0, (inV + oldCredit) - outV);
    const amountToCarry = credit > 0 ? credit : (prevDecl.previousCreditBalance || 0);

    updateDrawerField(clientId, 'previousCreditBalance', amountToCarry);
    showToast(`✓ تم ترحيل الرصيد الدائن (${formatEgyptianCurrency(amountToCarry)}) إلى الإقرار الحالي`);
  };

  // نسخ أرقام الإقرار السابق كمسودة في الإقرار الحالي
  const handleCopyPreviousNumbers = (clientId: string, prevDecl: TaxDeclarationRecord) => {
    updateDrawerField(clientId, 'salesAmount', prevDecl.salesTaxableAmount || 0);
    updateDrawerField(clientId, 'purchasesAmount', prevDecl.purchasesTaxableAmount || 0);
    updateDrawerField(clientId, 'vatOutputTax', prevDecl.vatOutputTax || 0);
    updateDrawerField(clientId, 'vatInputTax', prevDecl.vatInputTax || 0);
    showToast('✓ تم نسخ أرقام الإقرار السابق كمسودة في الإقرار الحالي');
  };

  // تهيئة بيانات الدرفة عند الفتح أو تغيير الشهر
  const initClientDrawer = (client: ClientArchiveRecord, monthToInit: string = selectedIsoMonth) => {
    const status = getClientDeclarationStatus(client, monthToInit);
    const existing = status.latestDecl;

    const defaultDeclType: any = client.isVatSubject ? 'VAT_10' : 'INCOME_27_CORP';
    const isZero = existing?.declarationNature === 'ZERO_RETURN';
    const currentPeriodInfo = calculateTaxPeriodDates(monthToInit);

    // ترحيل الرصيد الدائن التلقائي إذا كانت مسودة جديدة
    let initialPrevCredit = existing?.previousCreditBalance || 0;
    if (!existing) {
      const { prevDecl } = getPreviousDeclaration(client.id, monthToInit);
      if (prevDecl) {
        const outV = prevDecl.vatOutputTax || 0;
        const inV = prevDecl.vatInputTax || 0;
        const oldCred = prevDecl.previousCreditBalance || 0;
        const diff = (inV + oldCred) - outV;
        if (diff > 0) initialPrevCredit = diff;
      }
    }

    setDrawerData((prev) => ({
      ...prev,
      [client.id]: {
        declarationType: (existing?.declarationType as any) || defaultDeclType,
        period: existing?.period || currentPeriodInfo.label,
        taxYear: existing?.taxYear || currentPeriodInfo.year,
        periodMonth: currentPeriodInfo.isoMonth,
        startDate: currentPeriodInfo.startDate,
        endDate: currentPeriodInfo.endDate,
        dueDate: existing?.dueDate || currentPeriodInfo.dueDate,
        quarter: 1,
        amendmentType: existing?.amendmentType || 'ORIGINAL',
        originalDeclarationRef: existing?.originalDeclarationRef || '',
        amendmentReason: existing?.amendmentReason || '',
        isZeroReturn: isZero,
        salesAmount: existing?.salesTaxableAmount || 0,
        purchasesAmount: existing?.purchasesTaxableAmount || 0,
        vatOutputTax: existing?.vatOutputTax || 0,
        vatInputTax: existing?.vatInputTax || 0,
        previousCreditBalance: initialPrevCredit,
        netTaxPayable: existing?.netTaxPayable ?? existing?.netVatPayable ?? 0,
        etaRef: existing?.etaReferenceNumber || '',
        receiptNo: existing?.receiptNumber || '',
        isSubmitted: status.isSubmitted,
        notes: existing?.notes || '',
      },
    }));
  };

  // تغيير الشهر على مستوى الشاشة بالكامل وتحديث كافة الشركات المفتوحة فوراً
  const handleSelectIsoMonth = (newIsoMonth: string) => {
    setSelectedIsoMonth(newIsoMonth);
    expandedClientIds.forEach((cId) => {
      const client = state.clients.find((x) => x.id === cId);
      if (client) {
        initClientDrawer(client, newIsoMonth);
      }
    });
  };

  // تغيير الشهر داخل درفة شركة معينة وتحديث بياناتها فوراً
  const handleDrawerMonthChange = (clientId: string, newIsoMonth: string) => {
    updateDrawerField(clientId, 'periodMonth', newIsoMonth);
  };

  // التحديث التلقائي الفوري لكافة المنشآت المفتوحة فور تغيير الشهر بالتاريخ
  useEffect(() => {
    expandedClientIds.forEach((clientId) => {
      const client = state.clients.find((c) => c.id === clientId);
      if (client) {
        initClientDrawer(client, selectedIsoMonth);
      }
    });
  }, [selectedIsoMonth, state.taxDeclarations]);

  // تبديل فتح / إغلاق درفة الإقرار
  const toggleAccordion = (clientId: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
        if (!drawerData[clientId]) {
          const c = state.clients.find((x) => x.id === clientId);
          if (c) initClientDrawer(c);
        }
      }
      return next;
    });
  };

  // تحديث حقل في بيانات الإقرار بالتاريخ
  const updateDrawerField = (clientId: string, field: string, value: any) => {
    setDrawerData((prev) => {
      const currentPeriodInfo = calculateTaxPeriodDates(selectedIsoMonth);
      const cur = prev[clientId] || {
        declarationType: 'VAT_10',
        period: currentPeriodInfo.label,
        taxYear: currentPeriodInfo.year,
        periodMonth: currentPeriodInfo.isoMonth,
        startDate: currentPeriodInfo.startDate,
        endDate: currentPeriodInfo.endDate,
        dueDate: currentPeriodInfo.dueDate,
        quarter: 1,
        amendmentType: 'ORIGINAL',
        originalDeclarationRef: '',
        amendmentReason: '',
        isZeroReturn: false,
        salesAmount: 0,
        purchasesAmount: 0,
        vatOutputTax: 0,
        vatInputTax: 0,
        previousCreditBalance: 0,
        netTaxPayable: 0,
        etaRef: '',
        receiptNo: '',
        isSubmitted: false,
        notes: '',
      };

      const updated = { ...cur, [field]: value };

      // عند تغيير شهر الفترة بالتاريخ داخل درفة الشركة -> تحميل فوري للإقرار المحفوظ أو تهيئة مسودة جديدة
      if (field === 'periodMonth') {
        const pInfo = calculateTaxPeriodDates(value);
        updated.periodMonth = pInfo.isoMonth;
        updated.taxYear = pInfo.year;
        updated.startDate = pInfo.startDate;
        updated.endDate = pInfo.endDate;
        updated.dueDate = pInfo.dueDate;
        updated.period = pInfo.label;

        const client = state.clients.find((c) => c.id === clientId);
        if (client) {
          const st = getClientDeclarationStatus(client, value);
          if (st.latestDecl) {
            const ex = st.latestDecl;
            updated.declarationType = (ex.declarationType as any) || updated.declarationType;
            updated.amendmentType = ex.amendmentType || 'ORIGINAL';
            updated.originalDeclarationRef = ex.originalDeclarationRef || '';
            updated.amendmentReason = ex.amendmentReason || '';
            updated.isZeroReturn = ex.declarationNature === 'ZERO_RETURN';
            updated.salesAmount = ex.salesTaxableAmount || 0;
            updated.purchasesAmount = ex.purchasesTaxableAmount || 0;
            updated.vatOutputTax = ex.vatOutputTax || 0;
            updated.vatInputTax = ex.vatInputTax || 0;
            updated.previousCreditBalance = ex.previousCreditBalance || 0;
            updated.netTaxPayable = ex.netTaxPayable ?? ex.netVatPayable ?? 0;
            updated.etaRef = ex.etaReferenceNumber || '';
            updated.receiptNo = ex.receiptNumber || '';
            updated.isSubmitted = st.isSubmitted;
            updated.notes = ex.notes || '';
          } else {
            // إقرار جديد / مسودة جديدة: ترحيل الرصيد الدائن التلقائي من الشهر السابق
            const { prevDecl } = getPreviousDeclaration(client.id, value);
            let autoCredit = 0;
            if (prevDecl) {
              const diff = ((prevDecl.vatInputTax || 0) + (prevDecl.previousCreditBalance || 0)) - (prevDecl.vatOutputTax || 0);
              if (diff > 0) autoCredit = diff;
            }
            updated.salesAmount = 0;
            updated.purchasesAmount = 0;
            updated.vatOutputTax = 0;
            updated.vatInputTax = 0;
            updated.previousCreditBalance = autoCredit;
            updated.netTaxPayable = 0;
            updated.etaRef = '';
            updated.receiptNo = '';
            updated.isSubmitted = false;
            updated.notes = '';
          }
        }
      }

      // عند تغيير نوع الإقرار
      if (field === 'declarationType') {
        if (value === 'INCOME_27_CORP' || value === 'INCOME_28_INDIV') {
          updated.startDate = `${updated.taxYear}-01-01`;
          updated.endDate = `${updated.taxYear}-12-31`;
          updated.dueDate = `${updated.taxYear + 1}-04-30`;
          updated.period = `سنة ${updated.taxYear} المالية`;
        } else if (value === 'VAT_10') {
          const pInfo = calculateTaxPeriodDates(updated.periodMonth || selectedIsoMonth);
          updated.startDate = pInfo.startDate;
          updated.endDate = pInfo.endDate;
          updated.dueDate = pInfo.dueDate;
          updated.period = pInfo.label;
        } else if (value === 'PAYROLL_4' || value === 'WHT_41') {
          const q = updated.quarter || 1;
          const qStart = q === 1 ? '01-01' : q === 2 ? '04-01' : q === 3 ? '07-01' : '10-01';
          const qEnd = q === 1 ? '03-31' : q === 2 ? '06-30' : q === 3 ? '09-30' : '12-31';
          const qDue = q === 1 ? '04-30' : q === 2 ? '07-31' : q === 3 ? '10-31' : `${updated.taxYear + 1}-01-31`;
          updated.startDate = `${updated.taxYear}-${qStart}`;
          updated.endDate = `${updated.taxYear}-${qEnd}`;
          updated.dueDate = `${updated.taxYear}-${qDue}`;
          updated.period = `الربع ${q === 1 ? 'الأول' : q === 2 ? 'الثاني' : q === 3 ? 'الثالث' : 'الرابع'} ${updated.taxYear}`;
        }
      }

      // عند تغيير الربع
      if (field === 'quarter') {
        const q = Number(value);
        updated.quarter = q;
        const qStart = q === 1 ? '01-01' : q === 2 ? '04-01' : q === 3 ? '07-01' : '10-01';
        const qEnd = q === 1 ? '03-31' : q === 2 ? '06-30' : q === 3 ? '09-30' : '12-31';
        const qDue = q === 1 ? '04-30' : q === 2 ? '07-31' : q === 3 ? '10-31' : `${updated.taxYear + 1}-01-31`;
        updated.startDate = `${updated.taxYear}-${qStart}`;
        updated.endDate = `${updated.taxYear}-${qEnd}`;
        updated.dueDate = `${updated.taxYear}-${qDue}`;
        updated.period = `الربع ${q === 1 ? 'الأول' : q === 2 ? 'الثاني' : q === 3 ? 'الثالث' : 'الرابع'} ${updated.taxYear}`;
      }

      // إذا تم اختيار إقرار صفري -> تصفير المبالغ فوراً
      if (field === 'isZeroReturn') {
        if (value === true) {
          updated.salesAmount = 0;
          updated.purchasesAmount = 0;
          updated.vatOutputTax = 0;
          updated.vatInputTax = 0;
          updated.netTaxPayable = 0;
        }
      }

      // إعادة حساب ضريبة القيمة المضافة وصافي المستحق تلقائياً
      if (
        (field === 'salesAmount' ||
          field === 'purchasesAmount' ||
          field === 'previousCreditBalance' ||
          field === 'vatOutputTax' ||
          field === 'vatInputTax') &&
        !updated.isZeroReturn
      ) {
        if (updated.declarationType === 'VAT_10') {
          const s = Number(updated.salesAmount) || 0;
          const p = Number(updated.purchasesAmount) || 0;
          const outVat = field === 'vatOutputTax' ? Number(value) : Math.round(s * 0.14);
          const inVat = field === 'vatInputTax' ? Number(value) : Math.round(p * 0.14);
          updated.vatOutputTax = outVat;
          updated.vatInputTax = inVat;
          const diff = outVat - inVat;
          const cred = Number(updated.previousCreditBalance) || 0;
          updated.netTaxPayable = Math.max(0, diff - cred);
        }
      }

      return {
        ...prev,
        [clientId]: updated,
      };
    });
  };

  // حفظ الإقرار في ملف العميل
  const handleSaveDeclaration = (client: ClientArchiveRecord, markAsSubmitted: boolean = false) => {
    const data = drawerData[client.id];
    if (!data) return;

    const isSubmitted = markAsSubmitted ? true : data.isSubmitted;
    const generatedRef =
      data.etaRef.trim() ||
      (isSubmitted ? `ETA-${Date.now().toString().slice(-6)}` : undefined);

    const existingDecl = state.taxDeclarations.find(
      (d) =>
        d.clientId === client.id &&
        d.period === data.period &&
        d.declarationType === data.declarationType &&
        d.amendmentType === data.amendmentType
    );

    if (existingDecl) {
      db.updateTaxDeclaration(existingDecl.id, {
        periodMonth: data.periodMonth,
        amendmentType: data.amendmentType,
        originalDeclarationRef: data.originalDeclarationRef,
        amendmentReason: data.amendmentReason,
        declarationNature: data.isZeroReturn ? 'ZERO_RETURN' : 'STANDARD_14',
        salesTaxableAmount: data.salesAmount,
        purchasesTaxableAmount: data.purchasesAmount,
        vatOutputTax: data.vatOutputTax,
        vatInputTax: data.vatInputTax,
        previousCreditBalance: data.previousCreditBalance,
        netTaxPayable: data.netTaxPayable,
        netVatPayable: data.declarationType === 'VAT_10' ? data.netTaxPayable : undefined,
        etaReferenceNumber: generatedRef,
        receiptNumber: data.receiptNo || existingDecl.receiptNumber,
        status: isSubmitted ? 'SUBMITTED_TO_ETA' : 'DRAFT',
        submissionDate: isSubmitted ? (existingDecl.submissionDate || new Date().toISOString().split('T')[0]) : undefined,
        notes: data.notes,
      });
    } else {
      db.addTaxDeclaration({
        clientId: client.id,
        clientName: client.name,
        declarationType: data.declarationType,
        period: data.period,
        periodMonth: data.periodMonth,
        taxYear: data.taxYear,
        dueDate: `${data.taxYear}-04-30`,
        amendmentType: data.amendmentType,
        originalDeclarationRef: data.originalDeclarationRef,
        amendmentReason: data.amendmentReason,
        declarationNature: data.isZeroReturn ? 'ZERO_RETURN' : 'STANDARD_14',
        salesTaxableAmount: data.salesAmount,
        purchasesTaxableAmount: data.purchasesAmount,
        vatOutputTax: data.vatOutputTax,
        vatInputTax: data.vatInputTax,
        previousCreditBalance: data.previousCreditBalance,
        netTaxPayable: data.netTaxPayable,
        netVatPayable: data.declarationType === 'VAT_10' ? data.netTaxPayable : undefined,
        etaReferenceNumber: generatedRef,
        receiptNumber: data.receiptNo || undefined,
        status: isSubmitted ? 'SUBMITTED_TO_ETA' : 'DRAFT',
        submissionDate: isSubmitted ? new Date().toISOString().split('T')[0] : undefined,
        notes: data.notes || (data.amendmentType === 'AMENDED' ? 'إقرار معدل' : 'إقرار أصلي'),
      });
    }

    // تحديث الحالة المحلية
    updateDrawerField(client.id, 'isSubmitted', isSubmitted);
    if (generatedRef) updateDrawerField(client.id, 'etaRef', generatedRef);

    showToast(
      markAsSubmitted
        ? `✓ تم تأكيد تقديم الإقرار وتوثيق المرجع في ملف ${client.name}`
        : `✓ تم حفظ بيانات الإقرار في ملف ${client.name}`
    );
  };

  // فتح نافذة تعديل بيانات الشركة والدخول
  const openEditClientModal = (client: ClientArchiveRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sys = getClientSystemInfo(client);
    setIsNewClientMode(false);
    setClientModalForm({
      id: client.id,
      clientCode: client.clientCode,
      name: client.name,
      companyType: client.companyType || 'LLC',
      taxCardNo: client.taxCardNo || '',
      taxOffice: client.taxOffice || '',
      isVatSubject: client.isVatSubject ?? true,
      isIncomeTaxSubject: true,
      taxSystemType: sys.sysType as any,
      username: sys.username,
      password: sys.password,
      pinOtp: sys.pinOtp,
      portalUrl: sys.portalUrl,
    });
    setIsClientModalOpen(true);
  };

  // فتح نافذة إضافة شركة جديدة
  const openNewClientModal = () => {
    setIsNewClientMode(true);
    setClientModalForm({
      id: '',
      clientCode: `CL-${(state.clients.length + 1).toString().padStart(3, '0')}`,
      name: '',
      companyType: 'LLC',
      taxCardNo: '',
      taxOffice: '',
      isVatSubject: true,
      isIncomeTaxSubject: true,
      taxSystemType: 'SAP',
      username: '',
      password: '',
      pinOtp: '',
      portalUrl: OFFICIAL_SAP_PORTAL_URL,
    });
    setIsClientModalOpen(true);
  };

  // حفظ بيانات الشركة والدخول (إضافة أو تعديل)
  const handleSaveClientModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientModalForm.name.trim()) return;

    const isSap = clientModalForm.taxSystemType === 'SAP';
    const targetUrl =
      clientModalForm.portalUrl.trim() ||
      (isSap ? OFFICIAL_SAP_PORTAL_URL : OFFICIAL_GENERAL_TAX_PORTAL_URL);

    const credObj = {
      username: clientModalForm.username.trim(),
      password: clientModalForm.password.trim(),
      pinOtp: clientModalForm.pinOtp.trim(),
      portalUrl: targetUrl,
    };

    if (isNewClientMode) {
      db.addClient({
        name: clientModalForm.name.trim(),
        clientCode: clientModalForm.clientCode.trim(),
        companyType: clientModalForm.companyType,
        taxCardNo: clientModalForm.taxCardNo.trim(),
        taxOffice: clientModalForm.taxOffice.trim(),
        commercialRegistrationNo: '',
        incomeTaxFileNo: '',
        vatRegistrationNo: clientModalForm.taxCardNo.trim(),
        socialInsuranceNo: '',
        clientType: 'PRIMARY',
        isVatSubject: clientModalForm.isVatSubject,
        taxSystemType: clientModalForm.taxSystemType,
        capital: 500000,
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        activity: '',
        documents: [],
        partners: [],
        portalCredentials: {
          sapPortal: isSap ? credObj : undefined,
          etaGeneralTax: !isSap ? credObj : undefined,
        },
      });
      showToast(`✓ تم إضافة المنشأة الجديدة: ${clientModalForm.name}`);
    } else {
      const existing = state.clients.find((c) => c.id === clientModalForm.id);
      if (existing) {
        db.updateClient(existing.id, {
          name: clientModalForm.name.trim(),
          companyType: clientModalForm.companyType,
          taxCardNo: clientModalForm.taxCardNo.trim(),
          taxOffice: clientModalForm.taxOffice.trim(),
          isVatSubject: clientModalForm.isVatSubject,
          taxSystemType: clientModalForm.taxSystemType,
          portalCredentials: {
            ...existing.portalCredentials,
            sapPortal: isSap ? credObj : existing.portalCredentials?.sapPortal,
            etaGeneralTax: !isSap ? credObj : existing.portalCredentials?.etaGeneralTax,
          },
        });
        showToast(`✓ تم تحديث بيانات المنشأة: ${clientModalForm.name}`);
      }
    }

    setIsClientModalOpen(false);
  };

  // فلترة قائمة الشركات
  const filteredClients = useMemo(() => {
    return state.clients.filter((client) => {
      // 1. فلتر الضريبة (قيمة مضافة / دخل)
      if (taxFilter === 'VAT' && !client.isVatSubject) return false;
      // 2. فلتر المنظومة (ساب / عامة)
      const sys = getClientSystemInfo(client);
      if (systemFilter !== 'ALL' && sys.sysType !== systemFilter) return false;

      // 3. فلتر حالة التقديم
      const status = getClientDeclarationStatus(client);
      if (statusFilter === 'SUBMITTED' && !status.isSubmitted) return false;
      if (statusFilter === 'PENDING' && status.isSubmitted) return false;

      // 4. البحث السريع
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = (client.name || '').toLowerCase().includes(q);
        const matchTaxCard = (client.taxCardNo || '').toLowerCase().includes(q);
        const matchOffice = (client.taxOffice || '').toLowerCase().includes(q);
        const matchUser = (sys.username || '').toLowerCase().includes(q);
        if (!matchName && !matchTaxCard && !matchOffice && !matchUser) return false;
      }

      return true;
    });
  }, [state.clients, taxFilter, systemFilter, statusFilter, searchTerm, periodName, state.taxDeclarations]);

  // إحصائيات سريعة وموجزة في سطر واحد
  const summary = useMemo(() => {
    const total = state.clients.length;
    let submitted = 0;
    let vatCount = 0;
    let sapCount = 0;
    let oldPortalCount = 0;

    state.clients.forEach((c) => {
      const st = getClientDeclarationStatus(c);
      const sys = getClientSystemInfo(c);
      if (st.isSubmitted) submitted++;
      if (c.isVatSubject) vatCount++;
      if (sys.sysType === 'SAP') sapCount++;
      else oldPortalCount++;
    });

    return {
      total,
      submitted,
      pending: total - submitted,
      vatCount,
      sapCount,
      oldPortalCount,
    };
  }, [state.clients, state.taxDeclarations, periodName]);

  // تصدير إكسيل CSV بسيط
  const handleExportCsv = () => {
    const headers = [
      'اسم الشركة',
      'رقم التسجيل',
      'المأمورية',
      'الكيان',
      'قيمة مضافة',
      'المنظومة',
      'اليوزر',
      'حالة الإقرار',
      'صافي الضريبة',
      'رقم الإشعار',
    ];

    const rows = filteredClients.map((c) => {
      const sys = getClientSystemInfo(c);
      const st = getClientDeclarationStatus(c);
      return [
        `"${c.name}"`,
        `"${c.taxCardNo}"`,
        `"${c.taxOffice}"`,
        `"${c.companyType}"`,
        `"${c.isVatSubject ? 'مسجل' : 'غير مسجل'}"`,
        `"${sys.isSap ? 'SAP' : 'الضرائب العامة'}"`,
        `"${sys.username}"`,
        `"${st.isSubmitted ? 'تم التقديم' : 'بانتظار التقديم'}"`,
        `"${st.netPayable}"`,
        `"${st.etaRef || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `إقرارات_${periodName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="tax-agenda-printable-container" className="space-y-3 font-sans text-slate-900 dark:text-slate-100" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. الشريط العلوي المبسط بدون حشو */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                إدارة الإقرارات وبيانات الدخول للشركات
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                منظومة SAP والضرائب العامة
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              بيانات الدخول المباشرة، فتح سهم الإقرار (أصلي / معدل / صفري)، وتوثيق الحفظ والتقديم في ملف العميل.
            </p>
          </div>

          {/* الأزرار العلوية السريعة الموحدة */}
          <div className="flex items-center gap-2 shrink-0">
            <ScreenActionToolbar
              modelType="TAXES"
              title={`أجندة وسجل الإقرارات الضريبية (${selectedIsoMonth})`}
              targetElementId="tax-agenda-printable-container"
              compact={true}
              actions={[
                {
                  label: 'إضافة شركة جديدة',
                  icon: Plus,
                  onClick: openNewClientModal,
                },
              ]}
            />
          </div>
        </div>

        {/* سطر الإحصائيات الموجز */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1">
            <span>إجمالي المنشآت:</span>
            <span className="font-bold text-slate-900 dark:text-white">{summary.total}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span>تم التقديم:</span>
            <span className="font-bold">{summary.submitted}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <span>بانتظار التقديم:</span>
            <span className="font-bold">{summary.pending}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
            <span>مسجلة قيمة مضافة:</span>
            <span className="font-bold">{summary.vatCount}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
            <span>SAP:</span>
            <span className="font-bold">{summary.sapCount}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
            <span>الضرائب العامة:</span>
            <span className="font-bold">{summary.oldPortalCount}</span>
          </div>
        </div>
      </div>

      {/* 2. شريط الفلاتر والبحث (سريع ومرن بنقرة واحدة) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* فلتر نوع الضريبة */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <span className="px-2 text-slate-500 font-semibold text-[11px]">الضريبة:</span>
            <button
              onClick={() => setTaxFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                taxFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              كافة الضرائب
            </button>
            <button
              onClick={() => setTaxFilter('VAT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                taxFilter === 'VAT'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              قيمة مضافة ({summary.vatCount})
            </button>
            <button
              onClick={() => setTaxFilter('INCOME')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                taxFilter === 'INCOME'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              ضرائب دخل
            </button>
          </div>

          {/* فلتر المنظومة */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <span className="px-2 text-slate-500 font-semibold text-[11px]">المنظومة:</span>
            <button
              onClick={() => setSystemFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                systemFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSystemFilter('SAP')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                systemFilter === 'SAP'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              منظومة SAP ({summary.sapCount})
            </button>
            <button
              onClick={() => setSystemFilter('OLD_PORTAL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                systemFilter === 'OLD_PORTAL'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              الضرائب العامة ({summary.oldPortalCount})
            </button>
          </div>

          {/* فلتر حالة التقديم */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <span className="px-2 text-slate-500 font-semibold text-[11px]">الحالة:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              تم التقديم
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              بانتظار التقديم
            </button>
          </div>
        </div>

        {/* سطر البحث السريع وتحديد الفترة */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الشركة، رقم التسجيل الضريبي، المأمورية، أو اسم المستخدم..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* محدد الفترة الضريبية بالتاريخ مع أزرار التنقل السريع التلقائي */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-auto text-xs bg-slate-100/90 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSelectIsoMonth(getPreviousMonthIso(selectedIsoMonth))}
              className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
              title="الانتقال للشهر السابق وتحديث كافة المنشآت تلقائياً"
            >
              <span>⟵ الشهر السابق</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-slate-600 dark:text-slate-300 font-semibold text-[11px]">الفترة:</span>
              <input
                type="month"
                value={selectedIsoMonth}
                onChange={(e) => handleSelectIsoMonth(e.target.value)}
                className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white cursor-pointer"
                title="تحديد شهر وسنة الفترة الضريبية بالتقويم"
              />
            </div>

            <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs whitespace-nowrap shadow-2xs">
              {periodInfo.label}
            </span>

            <button
              type="button"
              onClick={() => handleSelectIsoMonth(getNextMonthIso(selectedIsoMonth))}
              className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
              title="الانتقال للشهر التالي وتحديث كافة المنشآت تلقائياً"
            >
              <span>الشهر التالي ⟶</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. قائمة الشركات مع توزيع أفقي منظم وتناوب ألوان السطور (Zebra Striping) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* شريط عناوين الأعمدة الأفقي */}
        <div className="hidden lg:grid grid-cols-12 items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none">
          <div className="col-span-4 flex items-center gap-2">
            <span>المنشأة والكيان القانوني</span>
          </div>
          <div className="col-span-2">
            <span>رقم التسجيل والمأمورية</span>
          </div>
          <div className="col-span-1">
            <span>الخضوع</span>
          </div>
          <div className="col-span-3">
            <span>المنظومة وبيانات الدخول (User / Pass / الرابط)</span>
          </div>
          <div className="col-span-2 text-left">
            <span>حالة الإقرار والتقديم</span>
          </div>
        </div>

        {/* سطور الشركات مع تناوب الألوان */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد منشآت تطابق الفلتر الحالي</p>
              <p className="text-xs text-slate-400 mt-1">جرب تغيير شروط الفلترة أو إضافة منشأة جديدة.</p>
            </div>
          ) : (
            filteredClients.map((client, index) => {
              const sys = getClientSystemInfo(client);
              const status = getClientDeclarationStatus(client);
              const isExpanded = expandedClientIds.has(client.id);
              const drawer = drawerData[client.id];
              const isEven = index % 2 === 0;

              return (
                <div key={client.id} className="transition-colors">
                  {/* السطر الأفقي الرئيسي للشركة (سطر وسطر لون - Zebra Striping) */}
                  <div
                    onClick={() => toggleAccordion(client.id)}
                    className={`px-3 py-1.5 sm:py-2 transition-colors cursor-pointer select-none ${
                      isExpanded
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60'
                        : isEven
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-2.5">
                      {/* عمود 1: سهم الفتح + اسم الشركة + الكود + نوع الكيان (4 أعمدة) */}
                      <div className="lg:col-span-4 flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                            isExpanded
                              ? 'bg-blue-600 text-white rotate-180'
                              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                          title={isExpanded ? 'طي بيانات الإقرار' : 'فتح بيانات الإقرار'}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate"
                              title={client.name}
                            >
                              {client.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              {client.clientCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {client.companyType === 'INDIVIDUAL'
                              ? 'منشأة فردية'
                              : client.companyType === 'PARTNERSHIP'
                              ? 'شركة أشخاص / تضامن'
                              : client.companyType === 'SOLE_PROPRIETORSHIP'
                              ? 'منشأة فردية'
                              : 'شركة أموال / ذ.م.م'}
                          </div>
                        </div>
                      </div>

                      {/* عمود 2: رقم التسجيل والمأمورية (عمودين) */}
                      <div className="lg:col-span-2 text-xs min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 hidden lg:inline">ت:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                            {client.taxCardNo || '—'}
                          </span>
                        </div>
                        <div
                          className="text-[11px] text-slate-500 dark:text-slate-400 truncate"
                          title={client.taxOffice}
                        >
                          {client.taxOffice || 'مأمورية عامة'}
                        </div>
                      </div>

                      {/* عمود 3: الخضوع (مضافة / دخل) (عمود واحد) */}
                      <div className="lg:col-span-1 flex items-center gap-1 flex-nowrap">
                        {client.isVatSubject && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            مضافة
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          دخل
                        </span>
                      </div>

                      {/* عمود 4: المنظومة وبيانات الدخول موزعة بالعرض (3 أعمدة) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="lg:col-span-3 flex items-center gap-1.5 flex-nowrap text-xs overflow-x-auto scrollbar-none py-0.5"
                      >
                        {/* شارة المنظومة */}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                            sys.isSap
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                          }`}
                        >
                          {sys.isSap ? 'SAP' : 'عامة'}
                        </span>

                        {/* اسم المستخدم مع زر نسخ */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          <span className="text-[9px] text-slate-400 font-bold">U:</span>
                          <span
                            className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[85px]"
                            title={sys.username}
                          >
                            {sys.username || '—'}
                          </span>
                          {sys.username && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(sys.username, `${client.id}_user`, e)}
                              className="text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="نسخ اسم المستخدم"
                            >
                              {copiedKey === `${client.id}_user` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* كلمة المرور مع إظهار ونسخ */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          <span className="text-[9px] text-slate-400 font-bold">P:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[70px]">
                            {sys.password
                              ? visiblePasswords[client.id]
                                ? sys.password
                                : '••••••'
                              : '—'}
                          </span>
                          {sys.password && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => togglePasswordVisibility(client.id, e)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="إظهار / إخفاء"
                              >
                                {visiblePasswords[client.id] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(sys.password, `${client.id}_pass`, e)}
                                className="text-slate-400 hover:text-blue-600 cursor-pointer"
                                title="نسخ كلمة المرور"
                              >
                                {copiedKey === `${client.id}_pass` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>

                        {/* زر الدخول المباشر للمنظومة */}
                        <a
                          href={sys.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 transition-colors shrink-0 ${
                            sys.isSap
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                          title={sys.isSap ? 'فتح منظومة ساب (ETA SAML)' : 'فتح منظومة الضرائب العامة (e-Tax)'}
                        >
                          <span>دخول</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        {/* زر تعديل بيانات الدخول */}
                        <button
                          type="button"
                          onClick={(e) => openEditClientModal(client, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
                          title="تعديل بيانات الشركة والدخول"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* عمود 5: حالة التقديم وزر سهم الإقرار المنسدل (عمودين) */}
                      <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 shrink-0">
                        {/* حالة التقديم */}
                        <div className="text-right">
                          {status.isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم التقديم</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>بانتظار التقديم</span>
                            </span>
                          )}
                          {status.netPayable > 0 && (
                            <div className="text-[10px] font-mono text-slate-500">
                              {formatEgyptianCurrency(status.netPayable)}
                            </div>
                          )}
                        </div>

                        {/* زر سهم الإقرار المنسدل */}
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 flex items-center gap-1 hover:bg-blue-100 cursor-pointer shrink-0"
                        >
                          <span>بيانات الإقرار</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* درفة بيانات الإقرار المنسدلة (مدمجة ومصغرة لتفادي الحاجة للتمرير) */}
                  {isExpanded && (
                  <div className="p-2 sm:p-2.5 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-fade-in text-xs">
                    {drawer ? (
                      <>
                        {/* 1. السطر المدمج: نوع وطبيعة الإقرار + شهر الفترة بالتاريخ + الإقرار الصفري */}
                        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          {/* الجزء الأيمن: نوع وطبيعة الإقرار والصفري */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* نوع الإقرار */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">النموذج:</span>
                              <select
                                value={drawer.declarationType}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'declarationType', e.target.value)
                                }
                                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                              >
                                <option value="VAT_10">قيمة مضافة (نموذج 10)</option>
                                <option value="INCOME_27_CORP">دخل شركات (نموذج 27)</option>
                                <option value="INCOME_28_INDIV">دخل منشآت فردية (نموذج 28)</option>
                                <option value="PAYROLL_4">كسب العمل / المرتبات (نموذج 4)</option>
                                <option value="WHT_41">خصم وتحصيل (نموذج 41)</option>
                              </select>
                            </div>

                            {/* طبيعة الإقرار (أصلي / معدل) */}
                            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                              <button
                                type="button"
                                onClick={() => updateDrawerField(client.id, 'amendmentType', 'ORIGINAL')}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                  drawer.amendmentType === 'ORIGINAL'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                أصلي
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDrawerField(client.id, 'amendmentType', 'AMENDED')}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                  drawer.amendmentType === 'AMENDED'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                مُعدّل
                              </button>
                            </div>

                            {/* خيار الإقرار الصفري */}
                            <button
                              type="button"
                              onClick={() =>
                                updateDrawerField(client.id, 'isZeroReturn', !drawer.isZeroReturn)
                              }
                              className={`px-2 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                drawer.isZeroReturn
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                                  drawer.isZeroReturn ? 'bg-white text-purple-700' : 'border-slate-400 bg-white dark:bg-slate-700'
                                }`}
                              >
                                {drawer.isZeroReturn && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span>إقرار صفري</span>
                            </button>
                          </div>

                          {/* الجزء الأيسر: محدد الفترة بالتاريخ سريع ومدمج مع أزرار التنقل */}
                          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-500">الفترة:</span>
                            </div>

                            {drawer.declarationType === 'VAT_10' ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDrawerMonthChange(
                                      client.id,
                                      getPreviousMonthIso(drawer.periodMonth || selectedIsoMonth)
                                    )
                                  }
                                  className="px-1.5 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                  title="الشهر السابق وتحديث الإقرار تلقائياً"
                                >
                                  ⟵
                                </button>
                                <input
                                  type="month"
                                  value={drawer.periodMonth || selectedIsoMonth}
                                  onChange={(e) => handleDrawerMonthChange(client.id, e.target.value)}
                                  className="px-1.5 py-0.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-pointer"
                                  title="تحديد شهر الفترة الضريبية"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDrawerMonthChange(
                                      client.id,
                                      getNextMonthIso(drawer.periodMonth || selectedIsoMonth)
                                    )
                                  }
                                  className="px-1.5 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                  title="الشهر التالي وتحديث الإقرار تلقائياً"
                                >
                                  ⟶
                                </button>
                              </div>
                            ) : drawer.declarationType === 'INCOME_27_CORP' || drawer.declarationType === 'INCOME_28_INDIV' ? (
                              <select
                                value={drawer.taxYear}
                                onChange={(e) => updateDrawerField(client.id, 'taxYear', Number(e.target.value))}
                                className="px-2 py-0.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-pointer"
                              >
                                <option value={2026}>سنة 2026 المالية</option>
                                <option value={2025}>سنة 2025 المالية</option>
                                <option value={2024}>سنة 2024 المالية</option>
                                <option value={2023}>سنة 2023 المالية</option>
                              </select>
                            ) : (
                              <select
                                value={drawer.quarter || 1}
                                onChange={(e) => updateDrawerField(client.id, 'quarter', Number(e.target.value))}
                                className="px-2 py-0.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-pointer"
                              >
                                <option value={1}>الربع 1 (01/01 إلى 31/03)</option>
                                <option value={2}>الربع 2 (01/04 إلى 30/06)</option>
                                <option value={3}>الربع 3 (01/07 إلى 30/09)</option>
                                <option value={4}>الربع 4 (01/10 إلى 31/12)</option>
                              </select>
                            )}

                            {/* التواريخ بالتاريخ مع زر تعديل تفصيلي سريع */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                              <span title="من تاريخ">{drawer.startDate}</span>
                              <span>←</span>
                              <span title="إلى تاريخ">{drawer.endDate}</span>
                              <span
                                className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800"
                                title="الموعد القانوني للتقديم"
                              >
                                استحقاق: {drawer.dueDate}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowDetailedDates((prev) => ({
                                    ...prev,
                                    [client.id]: !prev[client.id],
                                  }))
                                }
                                className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                title="تعديل تواريخ الفترة يدوياً"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* إمكانية تعديل التواريخ تفصيلياً إذا فتح المستخدم زر القلم */}
                        {showDetailedDates[client.id] && (
                          <div className="bg-slate-100 dark:bg-slate-800/90 p-2 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">من تاريخ:</label>
                              <input
                                type="date"
                                value={drawer.startDate}
                                onChange={(e) => updateDrawerField(client.id, 'startDate', e.target.value)}
                                className="w-full px-2 py-0.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">إلى تاريخ:</label>
                              <input
                                type="date"
                                value={drawer.endDate}
                                onChange={(e) => updateDrawerField(client.id, 'endDate', e.target.value)}
                                className="w-full px-2 py-0.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">الموعد القانوني:</label>
                              <input
                                type="date"
                                value={drawer.dueDate}
                                onChange={(e) => updateDrawerField(client.id, 'dueDate', e.target.value)}
                                className="w-full px-2 py-0.5 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>
                        )}

                        {/* تفاصيل التعديل إذا كان الإقرار معدلاً (مدمج في سطر واحد) */}
                        {drawer.amendmentType === 'AMENDED' && (
                          <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                              <label className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                                رقم أو إشعار الإقرار الأصلي:
                              </label>
                              <input
                                type="text"
                                value={drawer.originalDeclarationRef}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'originalDeclarationRef', e.target.value)
                                }
                                placeholder="مثال: ETA-88912"
                                className="w-full px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                              <label className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                                سبب التعديل:
                              </label>
                              <input
                                type="text"
                                value={drawer.amendmentReason}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'amendmentReason', e.target.value)
                                }
                                placeholder="مثال: تصويب فاتورة أو إشعار دائن..."
                                className="w-full px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {/* 1.5. قسم عرض الإقرار السابق ومقارنته وترحيل الرصيد الدائن (مضغوط وعالي الكفاءة) */}
                        {(() => {
                          const { prevDecl, prevPeriodInfo, allPastDecls } = getPreviousDeclaration(
                            client.id,
                            drawer.periodMonth || selectedIsoMonth
                          );
                          const isPrevCollapsed = collapsedPrevDeclIds.has(client.id);
                          const prevOut = prevDecl?.vatOutputTax || 0;
                          const prevIn = prevDecl?.vatInputTax || 0;
                          const prevCredit = prevDecl?.previousCreditBalance || 0;
                          const calculatedCarriedCredit = Math.max(0, (prevIn + prevCredit) - prevOut);
                          const displayCredit = calculatedCarriedCredit > 0 ? calculatedCarriedCredit : (prevDecl?.previousCreditBalance || 0);

                          // حساب الفوارق المحاسبية للمقارنة مع الإقرار الحالي
                          const salesDiff = (drawer.salesAmount || 0) - (prevDecl?.salesTaxableAmount || 0);
                          const netDiff = (drawer.netTaxPayable || 0) - (prevDecl?.netTaxPayable ?? prevDecl?.netVatPayable ?? 0);

                          return (
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900/90 dark:to-indigo-950/20 rounded-lg p-2 sm:p-2.5 border border-indigo-200/90 dark:border-indigo-900/50 space-y-1.5 shadow-2xs">
                              {/* شريط الإقرار السابق الرئيسي في سطر واحد */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <div className="p-1 rounded bg-indigo-600 text-white shrink-0">
                                    <History className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">
                                    الإقرار السابق:
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    {prevPeriodInfo.label}
                                  </span>

                                  {prevDecl ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      <span>
                                        {prevDecl.status === 'SUBMITTED_TO_ETA' || prevDecl.status === 'PAID'
                                          ? `تم التقديم (ETA: ${prevDecl.etaReferenceNumber || 'موثق'})`
                                          : 'مسودة سابقة'}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      (لا يوجد إقرار سابق محفوظ)
                                    </span>
                                  )}
                                </div>

                                {/* أدوات التحكم السريعة والترحيل والنسخ */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {allPastDecls.length > 1 && (
                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                                      <span className="text-slate-400 text-[9px] font-bold">فترة:</span>
                                      <select
                                        value={prevDecl?.id || ''}
                                        onChange={(e) =>
                                          setSelectedPrevDeclIdPerClient((prev) => ({
                                            ...prev,
                                            [client.id]: e.target.value,
                                          }))
                                        }
                                        className="bg-transparent font-bold text-[11px] text-indigo-700 dark:text-indigo-300 cursor-pointer focus:outline-none"
                                      >
                                        {allPastDecls.map((d) => (
                                          <option key={d.id} value={d.id}>
                                            {d.period} ({d.status === 'SUBMITTED_TO_ETA' ? 'تم' : 'مسودة'})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {/* زر ترحيل الرصيد الدائن المباشر */}
                                  {prevDecl && displayCredit > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleCarryForwardCredit(client.id, prevDecl)}
                                      className="px-2 py-0.5 rounded font-bold text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                                      title="ترحيل الرصيد الدائن من الإقرار السابق وإعادة حساب الصافي"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      <span>ترحيل الرصيد ({formatEgyptianCurrency(displayCredit)}) ⟵</span>
                                    </button>
                                  )}

                                  {/* زر نسخ أرقام الإقرار السابق كمسودة */}
                                  {prevDecl && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPreviousNumbers(client.id, prevDecl)}
                                      className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer flex items-center gap-1 shrink-0"
                                      title="نسخ مبيعات ومشتريات الإقرار السابق في الحالي"
                                    >
                                      <Copy className="w-3 h-3 text-slate-400" />
                                      <span>نسخ الأرقام</span>
                                    </button>
                                  )}

                                  {/* زر استعراض PDF الإقرار السابق */}
                                  {prevDecl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDeclForPdf(prevDecl);
                                        setIsPdfModalOpen(true);
                                      }}
                                      className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-indigo-600 hover:bg-slate-100 cursor-pointer shrink-0"
                                      title="طباعة واستعراض PDF الإقرار السابق"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  )}

                                  {/* زر طي / إظهار تفاصيل أرقام الإقرار السابق */}
                                  {prevDecl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCollapsedPrevDeclIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(client.id)) next.delete(client.id);
                                          else next.add(client.id);
                                          return next;
                                        });
                                      }}
                                      className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer flex items-center gap-1 shrink-0"
                                    >
                                      <span>{isPrevCollapsed ? 'عرض الأرقام' : 'إخفاء'}</span>
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform ${!isPrevCollapsed ? 'rotate-180' : ''}`}
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* شبكة أرقام الإقرار السابق المصغرة والمقارنة (سطر واحد مدمج) */}
                              {prevDecl && !isPrevCollapsed && (
                                <div className="space-y-1 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 animate-fade-in">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 text-xs">
                                    <div className="bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                                      <span className="text-[9px] text-slate-400 block font-semibold">المبيعات:</span>
                                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                                        {formatEgyptianCurrency(prevDecl.salesTaxableAmount || 0)}
                                      </span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                                      <span className="text-[9px] text-slate-400 block font-semibold">المشتريات:</span>
                                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                                        {formatEgyptianCurrency(prevDecl.purchasesTaxableAmount || 0)}
                                      </span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                                      <span className="text-[9px] text-slate-400 block font-semibold">ض. المخرجات (14%):</span>
                                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                                        {formatEgyptianCurrency(prevDecl.vatOutputTax || 0)}
                                      </span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                                      <span className="text-[9px] text-slate-400 block font-semibold">ض. المدخلات:</span>
                                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                                        {formatEgyptianCurrency(prevDecl.vatInputTax || 0)}
                                      </span>
                                    </div>

                                    <div className="bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                                      <span className="text-[9px] text-indigo-700 dark:text-indigo-300 block font-bold">الرصيد الدائن:</span>
                                      <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200 text-[11px]">
                                        {formatEgyptianCurrency(displayCredit)}
                                      </span>
                                    </div>

                                    <div className="bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                                      <span className="text-[9px] text-emerald-700 dark:text-emerald-300 block font-bold">الصافي المسدد:</span>
                                      <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 text-[11px]">
                                        {formatEgyptianCurrency(prevDecl.netTaxPayable ?? prevDecl.netVatPayable ?? 0)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* شريط مقارنة الفوارق إن وجدت */}
                                  {(drawer.salesAmount > 0 || drawer.netTaxPayable > 0) && (
                                    <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-300 font-semibold pt-0.5">
                                      {drawer.salesAmount > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span>فارق المبيعات عن السابق:</span>
                                          <span
                                            className={`font-mono font-bold ${
                                              salesDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                            }`}
                                          >
                                            {salesDiff >= 0 ? `+${formatEgyptianCurrency(salesDiff)}` : formatEgyptianCurrency(salesDiff)}
                                          </span>
                                        </div>
                                      )}
                                      {drawer.netTaxPayable > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span>فارق الضريبة:</span>
                                          <span
                                            className={`font-mono font-bold ${
                                              netDiff >= 0 ? 'text-blue-600' : 'text-amber-600'
                                            }`}
                                          >
                                            {netDiff >= 0 ? `+${formatEgyptianCurrency(netDiff)}` : formatEgyptianCurrency(netDiff)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* 2. قيم الإقرار المحاسبية الحالية (مدمجة في شبكة أفقية محكمة) */}
                        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                            <span>قيم الإقرار المحاسبية الحالية (ج.م)</span>
                            {drawer.isZeroReturn && (
                              <span className="text-[10px] text-purple-600 font-normal">
                                (تم تصفير الأرقام لأن الإقرار صفري)
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-xs">
                            {/* المبيعات */}
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                                المبيعات / الإيراد:
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.salesAmount || ''}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'salesAmount', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-xs"
                              />
                            </div>

                            {/* المشتريات */}
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                                المشتريات / التكاليف:
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.purchasesAmount || ''}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'purchasesAmount', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-xs"
                              />
                            </div>

                            {/* ضريبة المخرجات */}
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                                ضريبة المخرجات (14%):
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.vatOutputTax || ''}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'vatOutputTax', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-xs"
                              />
                            </div>

                            {/* ضريبة المدخلات */}
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                                ضريبة المدخلات:
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.vatInputTax || ''}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'vatInputTax', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-xs"
                              />
                            </div>

                            {/* رصيد دائن سابق */}
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">
                                رصيد دائن سابق:
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.previousCreditBalance || ''}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'previousCreditBalance', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-xs"
                              />
                            </div>

                            {/* صافي الضريبة واجبة السداد */}
                            <div className="bg-blue-50 dark:bg-blue-950/40 p-1 rounded-md border border-blue-200 dark:border-blue-900/50">
                              <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-0.5">
                                صافي الضريبة المستحقة:
                              </label>
                              <input
                                type="number"
                                disabled={drawer.isZeroReturn}
                                value={drawer.netTaxPayable || 0}
                                onChange={(e) =>
                                  updateDrawerField(client.id, 'netTaxPayable', Number(e.target.value))
                                }
                                className="w-full px-1.5 py-0.5 font-mono font-bold text-blue-900 dark:text-blue-200 rounded border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 disabled:opacity-50 text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. شريط التوثيق والحفظ وتأكيد التقديم في سطر أفقي مدمج واحد */}
                        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* حقول التوثيق السريعة */}
                          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[280px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">رقم الإشعار:</span>
                              <input
                                type="text"
                                value={drawer.etaRef}
                                onChange={(e) => updateDrawerField(client.id, 'etaRef', e.target.value)}
                                placeholder="ETA-902144"
                                className="w-28 px-2 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">رقم الإيصال:</span>
                              <input
                                type="text"
                                value={drawer.receiptNo}
                                onChange={(e) => updateDrawerField(client.id, 'receiptNo', e.target.value)}
                                placeholder="إيصال سداد"
                                className="w-24 px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              />
                            </div>

                            <div className="flex items-center gap-1 flex-1 min-w-[130px]">
                              <input
                                type="text"
                                value={drawer.notes}
                                onChange={(e) => updateDrawerField(client.id, 'notes', e.target.value)}
                                placeholder="ملاحظات محاسبية..."
                                className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              />
                            </div>
                          </div>

                          {/* أزرار الحفظ والتقديم السريعة */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* زر تم التقديم */}
                            <button
                              type="button"
                              onClick={() => handleSaveDeclaration(client, true)}
                              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تسجيل تم التقديم</span>
                            </button>

                            {/* زر حفظ في ملف العميل */}
                            <button
                              type="button"
                              onClick={() => handleSaveDeclaration(client, false)}
                              className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ كمسودة</span>
                            </button>

                            {/* زر تصدير PDF محدث حياً ومباشراً مع أي تغيير في التاريخ أو الأرقام */}
                            <button
                              type="button"
                              onClick={() => {
                                const currentPeriodInfo = calculateTaxPeriodDates(drawer.periodMonth || selectedIsoMonth);
                                const liveDecl: TaxDeclarationRecord = {
                                  id: status.latestDecl?.id || `preview-${client.id}-${drawer.periodMonth || selectedIsoMonth}-${Date.now()}`,
                                  clientId: client.id,
                                  clientName: client.name,
                                  taxCardNo: client.taxCardNo,
                                  taxOffice: client.taxOffice,
                                  declarationType: drawer.declarationType || 'VAT_10',
                                  taxYear: drawer.taxYear || currentPeriodInfo.year,
                                  period: drawer.period || currentPeriodInfo.label,
                                  periodMonth: drawer.periodMonth || currentPeriodInfo.isoMonth,
                                  startDate: drawer.startDate || currentPeriodInfo.startDate,
                                  endDate: drawer.endDate || currentPeriodInfo.endDate,
                                  dueDate: drawer.dueDate || currentPeriodInfo.dueDate,
                                  amendmentType: drawer.amendmentType || 'ORIGINAL',
                                  originalDeclarationRef: drawer.originalDeclarationRef || '',
                                  amendmentReason: drawer.amendmentReason || '',
                                  declarationNature: drawer.isZeroReturn ? 'ZERO_RETURN' : 'ACTUAL',
                                  salesTaxableAmount: Number(drawer.salesAmount) || 0,
                                  salesAmount: Number(drawer.salesAmount) || 0,
                                  vatOutputTax: Number(drawer.vatOutputTax) || 0,
                                  purchasesTaxableAmount: Number(drawer.purchasesAmount) || 0,
                                  purchasesAmount: Number(drawer.purchasesAmount) || 0,
                                  vatInputTax: Number(drawer.vatInputTax) || 0,
                                  previousCreditBalance: Number(drawer.previousCreditBalance) || 0,
                                  netTaxPayable: Number(drawer.netTaxPayable) || 0,
                                  netVatPayable: Number(drawer.netTaxPayable) || 0,
                                  status: drawer.isSubmitted ? 'SUBMITTED_TO_ETA' : (status.latestDecl?.status || 'DRAFT'),
                                  etaReferenceNumber: drawer.etaRef || status.latestDecl?.etaReferenceNumber || '',
                                  paymentReceiptNumber: drawer.receiptNo || status.latestDecl?.paymentReceiptNumber || '',
                                  submissionDate: drawer.isSubmitted
                                    ? (status.latestDecl?.submissionDate || new Date().toISOString().slice(0, 10))
                                    : (status.latestDecl?.submissionDate || new Date().toISOString().slice(0, 10)),
                                  notes: drawer.notes || status.latestDecl?.notes || '',
                                  createdAt: status.latestDecl?.createdAt || new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                } as unknown as TaxDeclarationRecord;

                                setSelectedDeclForPdf(liveDecl);
                                setIsPdfModalOpen(true);
                              }}
                              className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="تصدير نموذج رسمي PDF محدث ومطابق للأرقام والتاريخ الحالي"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">PDF</span>
                            </button>
                          </div>
                        </div>

                        {/* 4. سجل إقرارات الشركة السابقة (الأصلية والمعدلة) - مطوي افتراضياً لتوفير المساحة */}
                        {status.allDecls.length > 0 && (
                          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setShowClientHistory((prev) => ({
                                  ...prev,
                                  [client.id]: !prev[client.id],
                                }))
                              }
                              className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span>سجل إقرارات المنشأة المحفوظة ({status.allDecls.length})</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                <span>{showClientHistory[client.id] ? 'طي السجل' : 'عرض السجل المحفوظ'}</span>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${
                                    showClientHistory[client.id] ? 'rotate-180' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {showClientHistory[client.id] && (
                              <div className="p-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto max-h-44 overflow-y-auto">
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                                      <th className="py-1 px-2">الفترة</th>
                                      <th className="py-1 px-2">النموذج</th>
                                      <th className="py-1 px-2">طبيعة الإقرار</th>
                                      <th className="py-1 px-2">صافي الضريبة</th>
                                      <th className="py-1 px-2">رقم الإشعار</th>
                                      <th className="py-1 px-2">الحالة</th>
                                      <th className="py-1 px-2 text-center">إجراءات</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {status.allDecls.map((d) => (
                                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-1 px-2 font-medium">{d.period}</td>
                                        <td className="py-1 px-2 text-[11px]">
                                          {d.declarationType === 'VAT_10'
                                            ? 'قيمة مضافة (10)'
                                            : d.declarationType === 'INCOME_27_CORP'
                                            ? 'دخل شركات (27)'
                                            : d.declarationType === 'INCOME_28_INDIV'
                                            ? 'دخل فردي (28)'
                                            : d.declarationType}
                                        </td>
                                        <td className="py-1 px-2">
                                          <span
                                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                              d.declarationNature === 'ZERO_RETURN'
                                                ? 'bg-purple-100 text-purple-700'
                                                : d.amendmentType === 'AMENDED'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}
                                          >
                                            {d.declarationNature === 'ZERO_RETURN'
                                              ? 'صفري'
                                              : d.amendmentType === 'AMENDED'
                                              ? 'مُعدّل'
                                              : 'أصلي'}
                                          </span>
                                        </td>
                                        <td className="py-1 px-2 font-mono font-semibold">
                                          {formatEgyptianCurrency(d.netTaxPayable ?? d.netVatPayable ?? 0)}
                                        </td>
                                        <td className="py-1 px-2 font-mono text-[11px] text-slate-500">
                                          {d.etaReferenceNumber || '—'}
                                        </td>
                                        <td className="py-1 px-2">
                                          <span
                                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                              d.status === 'SUBMITTED_TO_ETA' || d.status === 'PAID'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {d.status === 'SUBMITTED_TO_ETA'
                                              ? 'تم التقديم'
                                              : d.status === 'PAID'
                                              ? 'مسدد'
                                              : 'مسودة'}
                                          </span>
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPrevDeclIdPerClient((prev) => ({ ...prev, [client.id]: d.id }));
                                                setCollapsedPrevDeclIds((prev) => {
                                                  const next = new Set(prev);
                                                  next.delete(client.id);
                                                  return next;
                                                });
                                                showToast(`✓ تم عرض إقرار (${d.period}) في قسم الإقرار السابق للمقارنة`);
                                              }}
                                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                              title="استعراض هذا الإقرار كإقرار سابق للمقارنة بالأعلى"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedDeclForPdf(d);
                                                setIsPdfModalOpen(true);
                                              }}
                                              className="p-1 text-slate-400 hover:text-blue-600"
                                              title="عرض وتصدير PDF"
                                            >
                                              <FileText className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (window.confirm('هل تريد حذف هذا الإقرار؟')) {
                                                  db.deleteTaxDeclaration(d.id);
                                                  showToast('تم حذف الإقرار');
                                                }
                                              }}
                                              className="p-1 text-slate-400 hover:text-red-600"
                                              title="حذف"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* 4. نافذة تعديل / إضافة شركة وبيانات الدخول */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isNewClientMode ? 'إضافة منشأة جديدة وبيانات الدخول' : 'تعديل بيانات المنشأة والدخول'}
                </h3>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* اسم الشركة */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    اسم الشركة / المنشأة: *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientModalForm.name}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="مثال: شركة النيل للهندسة والتجارة"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                {/* رقم التسجيل الضريبي */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    رقم التسجيل الضريبي:
                  </label>
                  <input
                    type="text"
                    value={clientModalForm.taxCardNo}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, taxCardNo: e.target.value }))
                    }
                    placeholder="مثال: 450-128-990"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                {/* المأمورية المختصة */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    المأمورية التابع لها:
                  </label>
                  <input
                    type="text"
                    value={clientModalForm.taxOffice}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, taxOffice: e.target.value }))
                    }
                    placeholder="مثال: كبار الممولين / قصر النيل"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                {/* نوع الكيان */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نوع الكيان القانوني:
                  </label>
                  <select
                    value={clientModalForm.companyType}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, companyType: e.target.value as any }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="LLC">شركة ذات مسؤولية محدودة (LLC)</option>
                    <option value="JOINT_STOCK">شركة مساهمة (SAE)</option>
                    <option value="PARTNERSHIP">شركة تضامن / أشخاص</option>
                    <option value="INDIVIDUAL">منشأة فردية</option>
                    <option value="ONE_PERSON">شركة الشخص الواحد</option>
                  </select>
                </div>

                {/* التسجيل في القيمة المضافة */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    التسجيل في القيمة المضافة:
                  </label>
                  <select
                    value={clientModalForm.isVatSubject ? 'YES' : 'NO'}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, isVatSubject: e.target.value === 'YES' }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="YES">مسجلة قيمة مضافة (خاضع)</option>
                    <option value="NO">غير مسجلة قيمة مضافة</option>
                  </select>
                </div>
              </div>

              {/* قسم بيانات المنظومة والدخول */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  بيانات الدخول على المنظومة:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">المنظومة:</label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setClientModalForm((p) => ({
                            ...p,
                            taxSystemType: 'SAP',
                            portalUrl: OFFICIAL_SAP_PORTAL_URL,
                          }))
                        }
                        className={`py-1 rounded text-[11px] font-bold cursor-pointer ${
                          clientModalForm.taxSystemType === 'SAP'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        SAP
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setClientModalForm((p) => ({
                            ...p,
                            taxSystemType: 'OLD_PORTAL',
                            portalUrl: OFFICIAL_GENERAL_TAX_PORTAL_URL,
                          }))
                        }
                        className={`py-1 rounded text-[11px] font-bold cursor-pointer ${
                          clientModalForm.taxSystemType === 'OLD_PORTAL'
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ضرائب عامة
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">رمز PIN / OTP (إن وجد):</label>
                    <input
                      type="text"
                      value={clientModalForm.pinOtp}
                      onChange={(e) =>
                        setClientModalForm((p) => ({ ...p, pinOtp: e.target.value }))
                      }
                      placeholder="اختياري"
                      className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">اسم المستخدم (User):</label>
                    <input
                      type="text"
                      value={clientModalForm.username}
                      onChange={(e) =>
                        setClientModalForm((p) => ({ ...p, username: e.target.value }))
                      }
                      placeholder="اليوزر"
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">كلمة المرور (Password):</label>
                    <input
                      type="text"
                      value={clientModalForm.password}
                      onChange={(e) =>
                        setClientModalForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="الباسورد"
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">رابط المنظومة المباشر:</label>
                  <input
                    type="text"
                    value={clientModalForm.portalUrl}
                    onChange={(e) =>
                      setClientModalForm((p) => ({ ...p, portalUrl: e.target.value }))
                    }
                    className="w-full px-2 py-1 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 truncate"
                  />
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ البيانات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. نافذة تصدير وعرض الإقرار الرسمي PDF */}
      {isPdfModalOpen && (
        <EgyptianTaxDeclarationPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          state={state}
          initialDeclaration={selectedDeclForPdf}
        />
      )}
    </div>
  );
};

export default React.memo(UnifiedTaxFilingAgendaView);
