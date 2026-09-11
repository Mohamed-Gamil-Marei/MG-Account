import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Scale,
  Award,
  FileCheck2,
  FileBadge,
  Layers,
  BookOpen,
  Sliders,
  Sparkles,
  Download,
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Building,
  ChevronDown,
  Eye,
  Image,
  Check,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { OfficialReportHeader } from './common/OfficialReportHeader';
import { exportElementToPdf, exportElementToImage } from '../utils/certifiedDocumentExporter';
import { CreditYearlyEditor, FiscalYearData } from './credit/CreditYearlyEditor';
import { CreditFinancialStatementsTab, StatementLineItem } from './credit/CreditFinancialStatementsTab';
import { CreditProfitDistributionTab } from './credit/CreditProfitDistributionTab';
import { CreditAuditorReportTab } from './credit/CreditAuditorReportTab';
import { CreditTaxCertificateTab } from './credit/CreditTaxCertificateTab';
import {
  CreditFixedAssetsTab,
  FixedAssetCategoryItem,
  DEFAULT_ASSET_CATEGORIES,
} from './credit/CreditFixedAssetsTab';
import {
  CreditAdminExpensesTab,
  AdminExpenseItem,
  DEFAULT_ADMIN_EXPENSES,
} from './credit/CreditAdminExpensesTab';
import {
  CreditScoringKpisTab,
  CreditMemoConfig,
  CustomCreditRatioItem,
  DEFAULT_CREDIT_MEMO_CONFIG,
} from './credit/CreditScoringKpisTab';
import {
  CreditNotesTab,
  SupplementaryNoteItem,
  DEFAULT_SUPPLEMENTARY_NOTES,
} from './credit/CreditNotesTab';
import {
  CreditBatchPrintDocument,
  CreditPrintScope,
  ClientProfileData,
  getDossierPageMetas,
  PrintablePageMeta,
} from './credit/CreditBatchPrintDocument';
import {
  PageRangeSelector,
  PageRangeConfig,
  isPageIncluded,
  togglePageInCustomString,
  formatPagesToRangeString,
} from './common/PageRangeSelector';
import { PrintHeaderCustomizerModal, ExtendedOfficeProfile } from './credit/PrintHeaderCustomizerModal';
import { PurgeDatabaseModal } from './PurgeDatabaseModal';
import { db } from '../db/localDatabase';
import { CompanyHeaderSelector } from './common/CompanyHeaderSelector';
import { QuickCompanyModal } from './common/QuickCompanyModal';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { ActionMenu } from './common/ActionMenu';
import { ClientArchiveRecord } from '../types';
import * as XLSX from 'xlsx';
import { SmartCreditSuite } from './credit/SmartCreditSuite';
import { CreditExcelBridgeModal } from './credit/CreditExcelBridgeModal';

interface CreditFinancialsSimulatorProps {
  state: DatabaseState;
}

export type SimulatorTab =
  | 'KPIS'
  | 'STATEMENTS'
  | 'PROFIT_DIST'
  | 'AUDITOR_REPORT'
  | 'TAX_CERT'
  | 'FIXED_ASSETS'
  | 'ADMIN_EXPENSES'
  | 'NOTES';

export const CreditFinancialsSimulator: React.FC<CreditFinancialsSimulatorProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<SimulatorTab>('STATEMENTS');
  const [sector, setSector] = useState<'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES'>('COMMERCIAL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [yearsList, setYearsList] = useState<number[]>([2024, 2025, 2026]);
  const [batchSelectedYears, setBatchSelectedYears] = useState<number[]>([2024, 2025, 2026]);

  // Central State for Asset Categories (Fixed Assets Schedule)
  const [assetCategories, setAssetCategories] = useState<FixedAssetCategoryItem[]>(DEFAULT_ASSET_CATEGORIES);

  // Central State for G&A Expenses (Admin Expenses Schedule)
  const [adminExpenses, setAdminExpenses] = useState<AdminExpenseItem[]>(DEFAULT_ADMIN_EXPENSES);

  // Central State for Supplementary Notes
  const [supplementaryNotes, setSupplementaryNotes] = useState<SupplementaryNoteItem[]>(DEFAULT_SUPPLEMENTARY_NOTES);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);

  // Initial Multi-Year Fiscal Assumptions - Calibrated to True Balance (Assets = Liabilities + Equity)
  const [yearsData, setYearsData] = useState<Record<number, FiscalYearData>>({
    2026: {
      year: 2026,
      sales: 23540850,
      cogs: 14124510,
      grossProfit: 9416340,
      adminExp: 2050480,
      sellingExp: 0,
      financeExp: 185635,
      ebit: 7180225,
      depreciation: 2208763,
      netProfit: 4971462,
      netFixedAssets: 26350500,
      projectsInProgress: 941634,
      inventory: 9215384,
      receivables: 6850400,
      otherDebit: 706225,
      cash: 200000,
      suppliers: 202000,
      shortLoans: 3996065,
      otherCurrentLiab: 941634,
      longLoans: 2779809,
      paidUpCapital: 2000000,
      legalReserve: 1000000,
      retainedEarningsAndProfit: 33344635,
      cogsRatio: 60,
      adminExpRatio: 8.71,
      sellingExpRatio: 0,
      financeExpRatio: 0.79,
      taxRate: 0,
      cashRatio: 0.85,
      receivablesRatio: 29.1,
      inventoryRatio: 39.15,
      fixedAssetsRatio: 111.94,
      suppliersRatio: 0.86,
      shortLoansRatio: 16.97,
      longLoansRatio: 11.81,
    },
    2025: {
      year: 2025,
      sales: 38133805,
      cogs: 22880000,
      grossProfit: 15253805,
      adminExp: 3050042,
      sellingExp: 0,
      financeExp: 285000,
      depreciation: 2208763,
      netProfit: 9710000,
      netFixedAssets: 26350500,
      projectsInProgress: 1525352,
      inventory: 8901000,
      receivables: 4513548,
      otherDebit: 1144014,
      cash: 175000,
      suppliers: 190250,
      shortLoans: 3567209,
      otherCurrentLiab: 1525352,
      longLoans: 3243568,
      paidUpCapital: 2000000,
      legalReserve: 1000000,
      retainedEarningsAndProfit: 31083035,
      cogsRatio: 60,
      adminExpRatio: 8.0,
      sellingExpRatio: 0,
      financeExpRatio: 0.75,
      taxRate: 0,
      cashRatio: 0.46,
      receivablesRatio: 11.84,
      inventoryRatio: 23.34,
      fixedAssetsRatio: 69.1,
      suppliersRatio: 0.5,
      shortLoansRatio: 9.35,
      longLoansRatio: 8.5,
    },
    2024: {
      year: 2024,
      sales: 9845663,
      cogs: 7011525,
      grossProfit: 2834138,
      adminExp: 428462,
      sellingExp: 0,
      financeExp: 0,
      depreciation: 2208763,
      netProfit: 196913,
      netFixedAssets: 28558000,
      projectsInProgress: 393827,
      inventory: 4750000,
      receivables: 3600000,
      otherDebit: 295370,
      cash: 100000,
      suppliers: 180500,
      shortLoans: 0,
      otherCurrentLiab: 393827,
      longLoans: 0,
      paidUpCapital: 2000000,
      legalReserve: 1000000,
      retainedEarningsAndProfit: 34122870,
      cogsRatio: 71.21,
      adminExpRatio: 4.35,
      sellingExpRatio: 0,
      financeExpRatio: 0,
      taxRate: 0,
      cashRatio: 1.02,
      receivablesRatio: 36.56,
      inventoryRatio: 48.24,
      fixedAssetsRatio: 290.06,
      suppliersRatio: 1.83,
      shortLoansRatio: 0,
      longLoansRatio: 0,
    },
  });

  // Flexible Custom Items & Line Items Customization State (Rename / Add / Delete)
  const [customItems, setCustomItems] = useState<StatementLineItem[]>([]);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);

  // Flexible Bank Credit File State (Custom Ratios, Manual Overrides, Benchmarks, Limits & Memo)
  const [customCreditRatios, setCustomCreditRatios] = useState<CustomCreditRatioItem[]>([]);
  const [creditRatioNames, setCreditRatioNames] = useState<Record<string, string>>({});
  const [hiddenCreditRatioIds, setHiddenCreditRatioIds] = useState<string[]>([]);
  const [creditRatioBenchmarks, setCreditRatioBenchmarks] = useState<Record<string, string>>({});
  const [manualCreditRatioValues, setManualCreditRatioValues] = useState<Record<string, Record<number, number | string>>>({});
  const [creditMemoConfig, setCreditMemoConfig] = useState<CreditMemoConfig>(DEFAULT_CREDIT_MEMO_CONFIG);

  // Print Dialog State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isExcelBridgeModalOpen, setIsExcelBridgeModalOpen] = useState<boolean>(false);
  const [isSmartSuiteVisible, setIsSmartSuiteVisible] = useState<boolean>(true);
  const [printScope, setPrintScope] = useState<CreditPrintScope>('ALL_YEARS_BATCH');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pageRangeConfig, setPageRangeConfig] = useState<PageRangeConfig>({
    mode: 'ALL',
    fromPage: 1,
    toPage: 3,
    customPagesString: '',
    showPageNumbers: true,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [isModalFullscreen, setIsModalFullscreen] = useState<boolean>(false);
  const [isPageRangeExpanded, setIsPageRangeExpanded] = useState<boolean>(false);
  const [isHeaderControlsExpanded, setIsHeaderControlsExpanded] = useState<boolean>(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState<boolean>(false);

  // Flexible Period & Date Range Selection State (EAS 1 / EAS 30 / Banking Credit Dossier)
  const [periodPreset, setPeriodPreset] = useState<'FULL_YEAR' | 'Q1' | 'H1' | '9M' | 'Q4' | 'CUSTOM'>('H1');
  const [startDate, setStartDate] = useState<string>(`${selectedYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(selectedYear === 2026 ? '2026-06-30' : `${selectedYear}-12-31`);

  // Compute textual description of the duration (e.g. 12 شهراً / 3 أشهر / X يوماً)
  const periodDurationText = useMemo(() => {
    if (!startDate || !endDate) return '';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '';
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays >= 355 && diffDays <= 366) return 'سنة مالية كاملة (12 شهراً)';
      if (diffDays >= 85 && diffDays <= 93) return 'فترة ربع سنوية (3 أشهر)';
      if (diffDays >= 178 && diffDays <= 184) return 'فترة نصف سنوية (6 أشهر)';
      if (diffDays >= 270 && diffDays <= 276) return 'فترة 9 أشهر دورية';
      return `${diffDays} يوماً تقويمياً`;
    } catch {
      return '';
    }
  }, [startDate, endDate]);

  // Synchronize date range whenever selectedYear changes if not in CUSTOM mode
  const handleSelectYearAndSyncDates = (newYear: number) => {
    setSelectedYear(newYear);
    if (periodPreset === 'FULL_YEAR') {
      setStartDate(`${newYear}-01-01`);
      setEndDate(`${newYear}-12-31`);
    } else if (periodPreset === 'Q1') {
      setStartDate(`${newYear}-01-01`);
      setEndDate(`${newYear}-03-31`);
    } else if (periodPreset === 'H1') {
      setStartDate(`${newYear}-01-01`);
      setEndDate(`${newYear}-06-30`);
    } else if (periodPreset === '9M') {
      setStartDate(`${newYear}-01-01`);
      setEndDate(`${newYear}-09-30`);
    } else if (periodPreset === 'Q4') {
      setStartDate(`${newYear}-10-01`);
      setEndDate(`${newYear}-12-31`);
    } else {
      const sParts = startDate.split('-');
      const eParts = endDate.split('-');
      if (sParts.length === 3 && eParts.length === 3) {
        setStartDate(`${newYear}-${sParts[1]}-${sParts[2]}`);
        setEndDate(`${newYear}-${eParts[1]}-${eParts[2]}`);
      } else {
        setStartDate(`${newYear}-01-01`);
        setEndDate(`${newYear}-12-31`);
      }
    }
  };

  const applyPeriodPreset = (preset: 'FULL_YEAR' | 'Q1' | 'H1' | '9M' | 'Q4' | 'CUSTOM') => {
    setPeriodPreset(preset);
    if (preset === 'FULL_YEAR') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else if (preset === 'Q1') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-03-31`);
    } else if (preset === 'H1') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-06-30`);
    } else if (preset === '9M') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-09-30`);
    } else if (preset === 'Q4') {
      setStartDate(`${selectedYear}-10-01`);
      setEndDate(`${selectedYear}-12-31`);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setPeriodPreset('CUSTOM');
    const y = parseInt(val.split('-')[0], 10);
    if (!isNaN(y) && y >= 2000 && y <= 2050 && y !== selectedYear && yearsList.includes(y)) {
      setSelectedYear(y);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setPeriodPreset('CUSTOM');
    const y = parseInt(val.split('-')[0], 10);
    if (!isNaN(y) && y >= 2000 && y <= 2050 && y !== selectedYear && yearsList.includes(y)) {
      setSelectedYear(y);
    }
  };

  const previewScrollContainerRef = useRef<HTMLDivElement>(null);

  // Real-time Scroll-Spy synchronization between preview scroll position and toolbar active page
  useEffect(() => {
    if (!isPrintModalOpen) return;

    const container = previewScrollContainerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const sheets = container.querySelectorAll<HTMLElement>('[id^="page-sheet-"]');
          if (!sheets.length) {
            ticking = false;
            return;
          }

          const containerRect = container.getBoundingClientRect();
          const targetY = containerRect.top + 80;

          let bestPage = 1;
          let minDistance = Infinity;

          sheets.forEach((sheet) => {
            const pageNumStr = sheet.id.replace('page-sheet-', '');
            const pageNum = parseInt(pageNumStr, 10);
            if (isNaN(pageNum)) return;

            const rect = sheet.getBoundingClientRect();
            const distance = Math.abs(rect.top - targetY);

            if (rect.top <= targetY + 60 && rect.bottom >= targetY) {
              bestPage = pageNum;
              minDistance = 0;
            } else if (distance < minDistance) {
              minDistance = distance;
              bestPage = pageNum;
            }
          });

          if (bestPage && !isNaN(bestPage)) {
            setActivePreviewPage((prev) => (prev !== bestPage ? bestPage : prev));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    const timer = setTimeout(handleScroll, 120);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [isPrintModalOpen, printScope]);

  const scrollToPage = (pageNum: number) => {
    setActivePreviewPage(pageNum);
    const container = previewScrollContainerRef.current;
    const el = document.getElementById(`page-sheet-${pageNum}`);
    if (container && el) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + container.scrollTop - 16;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dynamic Print Stylesheet Isolation for Clean A4 Output
  const handlePrintDossier = () => {
    const styleId = 'credit-dossier-print-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 10mm 10mm 12mm 10mm;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: 'IBM Plex Sans Arabic', 'Cairo', system-ui, sans-serif !important;
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Hide all UI chrome, controls and dialog backdrops */
        header, nav, aside, #sidebar-navigation, .no-print, [data-no-print="true"], button {
          display: none !important;
          visibility: hidden !important;
        }

        /* Prevent fixed modal wrapper from clipping multi-page output */
        .fixed, div[class*="fixed"] {
          position: static !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          width: 100% !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        div[class*="overflow-y-auto"], div[class*="overflow-x-auto"] {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }

        #credit-printable-dossier {
          display: block !important;
          visibility: visible !important;
          position: static !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        .print-page, .page-break, .a4-sheet-canvas, [id^="page-sheet-"] {
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 0 !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 0 10mm 0 !important;
          padding: 0 !important;
        }

        .print-page:last-child, .page-break:last-child, .a4-sheet-canvas:last-child, [id^="page-sheet-"]:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
          margin-bottom: 0 !important;
        }

        table {
          width: 100% !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        th, td {
          padding: 4px 6px !important;
        }
      }
    `;
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Client Identification State
  const activeDbClient = state.clients.find((c) => c.id === state.activeClientContext?.clientId);

  const applyClientRecordToProfile = (cl: ClientArchiveRecord) => {
    let form = 'منشأة فردية';
    if (cl.companyType === 'JOINT_STOCK') form = 'شركة مساهمة مصرية (ش.م.م)';
    else if (cl.companyType === 'LLC') form = 'شركة ذات مسؤولية محدودة (ش.ذ.م.م)';
    else if (cl.companyType === 'PARTNERSHIP') form = 'شركة أشخاص (تضامن / توصية)';
    else if (cl.companyType === 'SOLE_PROPRIETORSHIP') form = 'منشأة فردية';
    else if (cl.companyType === 'INDIVIDUAL') form = 'شخص طبيعي / مهني';

    setClientProfile({
      companyName: cl.name,
      legalForm: form,
      commercialRegNo: cl.commercialRegistrationNo || '109482',
      taxRegNo: cl.taxCardNo || '492-817-302',
      taxFileNo: cl.incomeTaxFileNo || '204/918',
      taxOffice: cl.taxOffice || 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
      socialInsuranceNo: cl.socialInsuranceNo || '10948201 / مكتب مصر الجديدة',
      address: cl.address || 'القاهرة - جمهورية مصر العربية',
      activity: cl.activity || 'نشاط تجاري وصناعي وتوريدات عامة',
      capital: cl.capital || 10000000,
      representedBy: cl.contactPerson || 'رئيس مجلس الإدارة والعضو المنتدب',
    });
  };

  const [clientProfile, setClientProfile] = useState<ClientProfileData>(() => {
    if (activeDbClient) {
      let form = 'منشأة فردية';
      if (activeDbClient.companyType === 'JOINT_STOCK') form = 'شركة مساهمة مصرية (ش.م.م)';
      else if (activeDbClient.companyType === 'LLC') form = 'شركة ذات مسؤولية محدودة (ش.ذ.م.م)';
      else if (activeDbClient.companyType === 'ONE_PERSON') form = 'شركة الشخص الواحد';

      return {
        companyName: activeDbClient.name,
        legalForm: form,
        commercialRegNo: activeDbClient.commercialRegistrationNo || '109482',
        taxRegNo: activeDbClient.taxCardNo || '492-817-302',
        taxFileNo: activeDbClient.incomeTaxFileNo || '204/918',
        taxOffice: activeDbClient.taxOffice || 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
        socialInsuranceNo: activeDbClient.socialInsuranceNo || '10948201 / مكتب مصر الجديدة',
        address: activeDbClient.address || 'المنطقة الصناعية - 6 أكتوبر - الجيزة',
        activity: activeDbClient.activity || 'تصنيع وتوريد المعدات الهندسية والمستلزمات الصناعية',
        capital: activeDbClient.capital || 25000000,
        representedBy: activeDbClient.contactPerson || 'رئيس مجلس الإدارة والعضو المنتدب',
      };
    }
    return {
      companyName: 'شركة النيل للصناعات الهندسية والتوريدات (ش.م.م)',
      legalForm: 'شركة مساهمة مصرية (ش.م.م)',
      commercialRegNo: '109482',
      taxRegNo: '492-817-302',
      taxFileNo: '204/918',
      taxOffice: 'مأمورية ضرائب الشركات المساهمة بالقاهرة',
      socialInsuranceNo: '10948201 / مكتب مصر الجديدة',
      address: 'المنطقة الصناعية - مدينة السادس من أكتوبر - الجيزة',
      activity: 'تصنيع وتوريد المعدات الهندسية والمستلزمات الصناعية والمقاولات المتخصصة',
      capital: 25000000,
      representedBy: 'رئيس مجلس الإدارة والعضو المنتدب',
    };
  });
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isQuickCompanyModalInSimulatorOpen, setIsQuickCompanyModalInSimulatorOpen] = useState<boolean>(false);

  // Office Profile Reactive State with flexible addresses, phones, and branding
  const [officeProfile, setOfficeProfile] = useState<ExtendedOfficeProfile>(() => {
    const savedOffice = state.officeProfile;
    return {
      firmName: savedOffice?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات',
      auditorName: savedOffice?.auditorName || 'أ/ محمد جميل مرعي',
      licenseNumber: savedOffice?.licenseNumber || 'س.م.م 43122',
      taxAuthorityLicense: savedOffice?.taxAuthorityLicense || 'سجل خبراء الضرائب 1849',
      taxAuthorityRegNo: savedOffice?.taxAuthorityRegNo || '492-817-302',
      phone: savedOffice?.phone || '01003335360',
      mobile: savedOffice?.mobile || '01003335360',
      email: savedOffice?.email || 'info@audit-office.eg',
      title: savedOffice?.title || 'محاسب قانوني وخبير ضرائب ومراقب حسابات الشركات المساهمة',
      address: savedOffice?.address || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
      mainOfficeTitle: (savedOffice as any)?.mainOfficeTitle || 'المقر الرئيسي',
      mainOfficeAddress: savedOffice?.mainOfficeAddress || savedOffice?.address || 'ميدان النافورة - الدور الرابع - مركز الحسينية - الشرقية',
      showMainOfficeAddress: savedOffice?.showMainOfficeAddress !== false,
      branchOfficeTitle: (savedOffice as any)?.branchOfficeTitle || 'فرع العاشر من رمضان',
      branchOfficeAddress: savedOffice?.branchOfficeAddress || 'المباركية مول - مدينة العاشر من رمضان - الشرقية',
      showBranchOfficeAddress: savedOffice?.showBranchOfficeAddress !== false,
      showOfficePhones: (savedOffice as any)?.showOfficePhones !== false,
      showLogo: (savedOffice as any)?.showLogo !== false,
      headerStyle: (savedOffice as any)?.headerStyle || 'standard',
      logoUrl: savedOffice?.logoUrl || '',
      stampUrl: savedOffice?.stampUrl || '',
      ...savedOffice,
    };
  });

  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState<boolean>(false);
  const [showHeaderClientBanner, setShowHeaderClientBanner] = useState<boolean>(true);

  // Synchronize officeProfile when state.officeProfile updates
  useEffect(() => {
    if (state.officeProfile) {
      setOfficeProfile((prev) => ({
        ...prev,
        ...state.officeProfile,
      }));
    }
  }, [state.officeProfile]);

  const handleSaveOfficeProfile = (newProfile: ExtendedOfficeProfile) => {
    setOfficeProfile(newProfile);
    try {
      db.updateOfficeProfile(newProfile as any);
    } catch (err) {
      console.warn('Error saving office profile:', err);
    }
  };

  // Automatically synchronize clientProfile when active client context changes
  useEffect(() => {
    if (activeDbClient) {
      applyClientRecordToProfile(activeDbClient);
    }
  }, [state.activeClientContext?.clientId, activeDbClient]);

  // Add new Fiscal Year
  const handleAddNewFiscalYear = () => {
    const maxYear = Math.max(...yearsList);
    const nextYear = maxYear + 1;
    setYearsList((prev) => [...prev, nextYear].sort((a, b) => a - b));
    setBatchSelectedYears((prev) => [...prev, nextYear].sort((a, b) => a - b));

    // Default clone from latest year with 12% growth
    const latestData = yearsData[maxYear] || yearsData[2026];
    setYearsData((prev) => ({
      ...prev,
      [nextYear]: {
        ...latestData,
        year: nextYear,
        sales: Math.round(latestData.sales * 1.12),
      },
    }));

    // Clone Asset values for next year
    setAssetCategories((prev) =>
      prev.map((cat) => {
        const latestCat = cat.valuesByYear?.[maxYear] || {
          costStart: 100000,
          additions: 10000,
          disposals: 0,
          accumStart: 20000,
        };
        const costEnd = latestCat.costStart + latestCat.additions - latestCat.disposals;
        const depExpense = Math.round(costEnd * (cat.depRate / 100));
        const accumEnd = latestCat.accumStart + depExpense;

        return {
          ...cat,
          valuesByYear: {
            ...cat.valuesByYear,
            [nextYear]: {
              costStart: costEnd,
              additions: Math.round(latestCat.additions * 1.1),
              disposals: 0,
              accumStart: accumEnd,
            },
          },
        };
      })
    );

    // Clone Admin Expenses for next year
    setAdminExpenses((prev) =>
      prev.map((item) => {
        const prevVal = item.valuesByYear?.[maxYear] || 30000;
        return {
          ...item,
          valuesByYear: {
            ...item.valuesByYear,
            [nextYear]: Math.round(prevVal * 1.12),
          },
        };
      })
    );

    setSelectedYear(nextYear);
  };

  // Toggle year selection for batch printing
  const handleToggleBatchYear = (yr: number) => {
    setBatchSelectedYears((prev) => {
      if (prev.includes(yr)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((y) => y !== yr);
      } else {
        return [...prev, yr].sort((a, b) => a - b);
      }
    });
  };

  // Update specific year data
  const handleUpdateYearData = (yr: number, updated: Partial<FiscalYearData>) => {
    setYearsData((prev) => ({
      ...prev,
      [yr]: {
        ...prev[yr],
        ...updated,
      },
    }));
  };

  // Sector Presets
  const handleSectorChange = (s: 'COMMERCIAL' | 'INDUSTRIAL' | 'CONTRACTING' | 'SERVICES') => {
    setSector(s);
    let c = 75, a = 8, se = 5, f = 3;
    if (s === 'COMMERCIAL') {
      c = 78; a = 7; se = 5; f = 2.5;
    } else if (s === 'INDUSTRIAL') {
      c = 70; a = 9; se = 6; f = 3.5;
    } else if (s === 'CONTRACTING') {
      c = 82; a = 5; se = 3; f = 4;
    } else if (s === 'SERVICES') {
      c = 55; a = 18; se = 8; f = 2;
    }

    setYearsData((prev) => {
      const next = { ...prev };
      yearsList.forEach((yr) => {
        if (next[yr]) {
          next[yr] = {
            ...next[yr],
            cogsRatio: c,
            adminExpRatio: a,
            sellingExpRatio: se,
            financeExpRatio: f,
          };
        }
      });
      return next;
    });
  };

  const handleApplyPresetToAllYears = () => {
    handleSectorChange(sector);
  };

  // Reset simulator financials to standard defaults
  const handleResetSimulatorDefaults = () => {
    if (window.confirm('هل تريد إعادة ضبط أرقام المحاكي والقوائم المالية والإيضاحات إلى القيم النموذجية الافتراضية؟')) {
      setAssetCategories(DEFAULT_ASSET_CATEGORIES);
      setAdminExpenses(DEFAULT_ADMIN_EXPENSES);
      setSupplementaryNotes(DEFAULT_SUPPLEMENTARY_NOTES);
      setCustomItems([]);
      setItemNames({});
      setHiddenItemIds([]);
      setYearsData({
        2026: {
          year: 2026,
          sales: 23540850,
          cogs: 14124510,
          grossProfit: 9416340,
          adminExp: 2050480,
          sellingExp: 0,
          financeExp: 185635,
          ebit: 7180225,
          depreciation: 2208763,
          netProfit: 4971462,
          netFixedAssets: 26350500,
          projectsInProgress: 941634,
          inventory: 9215384,
          receivables: 6850400,
          otherDebit: 706225,
          cash: 200000,
          suppliers: 202000,
          shortLoans: 3996065,
          otherCurrentLiab: 941634,
          longLoans: 2779809,
          paidUpCapital: 2000000,
          legalReserve: 1000000,
          retainedEarningsAndProfit: 33344635,
          cogsRatio: 60,
          adminExpRatio: 8.71,
          sellingExpRatio: 0,
          financeExpRatio: 0.79,
          taxRate: 0,
          cashRatio: 0.85,
          receivablesRatio: 29.1,
          inventoryRatio: 39.15,
          fixedAssetsRatio: 111.94,
          suppliersRatio: 0.86,
          shortLoansRatio: 16.97,
          longLoansRatio: 11.81,
        },
        2025: {
          year: 2025,
          sales: 38133805,
          cogs: 22880000,
          grossProfit: 15253805,
          adminExp: 3050042,
          sellingExp: 0,
          financeExp: 285000,
          depreciation: 2208763,
          netProfit: 9710000,
          netFixedAssets: 26350500,
          projectsInProgress: 1525352,
          inventory: 8901000,
          receivables: 4513548,
          otherDebit: 1144014,
          cash: 175000,
          suppliers: 190250,
          shortLoans: 3567209,
          otherCurrentLiab: 1525352,
          longLoans: 3243568,
          paidUpCapital: 2000000,
          legalReserve: 1000000,
          retainedEarningsAndProfit: 31083035,
          cogsRatio: 60,
          adminExpRatio: 8.0,
          sellingExpRatio: 0,
          financeExpRatio: 0.75,
          taxRate: 0,
          cashRatio: 0.46,
          receivablesRatio: 11.84,
          inventoryRatio: 23.34,
          fixedAssetsRatio: 69.1,
          suppliersRatio: 0.5,
          shortLoansRatio: 9.35,
          longLoansRatio: 8.5,
        },
        2024: {
          year: 2024,
          sales: 9845663,
          cogs: 7011525,
          grossProfit: 2834138,
          adminExp: 428462,
          sellingExp: 0,
          financeExp: 0,
          depreciation: 2208763,
          netProfit: 196913,
          netFixedAssets: 28558000,
          projectsInProgress: 393827,
          inventory: 4750000,
          receivables: 3600000,
          otherDebit: 295370,
          cash: 100000,
          suppliers: 180500,
          shortLoans: 0,
          otherCurrentLiab: 393827,
          longLoans: 0,
          paidUpCapital: 2000000,
          legalReserve: 1000000,
          retainedEarningsAndProfit: 34122870,
          cogsRatio: 71.21,
          adminExpRatio: 4.35,
          sellingExpRatio: 0,
          financeExpRatio: 0,
          taxRate: 0,
          cashRatio: 1.02,
          receivablesRatio: 36.56,
          inventoryRatio: 48.24,
          fixedAssetsRatio: 290.06,
          suppliersRatio: 1.83,
          shortLoansRatio: 0,
          longLoansRatio: 0,
        },
      });
    }
  };

  // Helper to extract breakdown sum from Supplementary Notes
  const getNoteBreakdownSum = (noteNumber: number | string, yr: number): number | null => {
    const note = supplementaryNotes.find((n) => String(n.noteNumber) === String(noteNumber));
    if (note && note.customBreakdownRows && note.customBreakdownRows.length > 0) {
      const hasAnyValue = note.customBreakdownRows.some((r) => r.values && r.values[yr] !== undefined);
      if (hasAnyValue) {
        return note.customBreakdownRows.reduce((sum, r) => sum + (r.values?.[yr] || 0), 0);
      }
    }
    return null;
  };

  // Dynamic Full Financial Computations with 2-Way DIRECT LINKING to Fixed Assets, Admin Expenses & Notes
  const computedData: Record<number, any> = useMemo(() => {
    const result: Record<number, any> = {};

    yearsList.forEach((yr) => {
    const d = yearsData[yr] || {
      sales: 10000000,
      cogsRatio: 75,
      adminExpRatio: 8,
      sellingExpRatio: 5,
      financeExpRatio: 3,
      taxRate: 22.5,
      cashRatio: 8,
      receivablesRatio: 22,
      inventoryRatio: 25,
      fixedAssetsRatio: 35,
      suppliersRatio: 18,
      shortLoansRatio: 12,
      longLoansRatio: 15,
    };

    const sales = d.sales !== undefined ? d.sales : 10000000;
    const note15Sum = getNoteBreakdownSum(15, yr);
    const cogs = note15Sum !== null ? note15Sum : (d.cogs !== undefined ? d.cogs : (sales * d.cogsRatio) / 100);
    const grossProfit = sales - cogs;

    // DIRECT LINK 1: Calculate Admin & General Expenses directly from Admin Expenses Schedule or Note 16 or direct override
    const linkedAdminExpSum = adminExpenses.reduce(
      (sum, item) => sum + (item.valuesByYear?.[yr] || 0),
      0
    );
    const note16Sum = getNoteBreakdownSum(16, yr);
    const adminExp =
      linkedAdminExpSum > 0
        ? linkedAdminExpSum
        : note16Sum !== null
        ? note16Sum
        : d.adminExp !== undefined
        ? d.adminExp
        : (sales * d.adminExpRatio) / 100;

    const note17Sum = getNoteBreakdownSum(17, yr);
    const sellingExp = note17Sum !== null ? note17Sum : (d.sellingExp !== undefined ? d.sellingExp : (sales * d.sellingExpRatio) / 100);
    const ebitda = grossProfit - adminExp - sellingExp;

    // DIRECT LINK 2: Calculate Net Fixed Assets and Depreciation directly from Fixed Assets Schedule or Note 4
    let linkedNetFixedAssetsSum = 0;
    let linkedDepExpenseSum = 0;
    let linkedAccumDepSum = 0;
    let linkedCostEndSum = 0;

    assetCategories.forEach((cat) => {
      const yrData = cat.valuesByYear?.[yr] || {
        costStart: 100000,
        additions: 0,
        disposals: 0,
        accumStart: 20000,
      };
      const costEnd = (yrData.costStart || 0) + (yrData.additions || 0) - (yrData.disposals || 0);
      const depExpense =
        yrData.customDepExpense !== undefined
          ? yrData.customDepExpense
          : cat.depRate > 0
          ? Math.round(costEnd * (cat.depRate / 100))
          : 0;
      const accumEnd = (yrData.accumStart || 0) + depExpense - (yrData.accumDisposals || 0);
      const netBookValue = Math.max(0, costEnd - accumEnd);

      linkedCostEndSum += costEnd;
      linkedDepExpenseSum += depExpense;
      linkedAccumDepSum += accumEnd;
      linkedNetFixedAssetsSum += netBookValue;
    });

    const note4Sum = getNoteBreakdownSum(4, yr);
    const netFixedAssets =
      linkedNetFixedAssetsSum > 0
        ? linkedNetFixedAssetsSum
        : note4Sum !== null
        ? note4Sum
        : d.netFixedAssets !== undefined
        ? d.netFixedAssets
        : (sales * d.fixedAssetsRatio) / 100;

    const depreciation =
      linkedDepExpenseSum > 0
        ? linkedDepExpenseSum
        : (sales * d.fixedAssetsRatio * 0.1) / 100;

    const ebit = ebitda - depreciation;
    const note18Sum = getNoteBreakdownSum(18, yr);
    const financeExp = note18Sum !== null ? note18Sum : (d.financeExp !== undefined ? d.financeExp : (sales * d.financeExpRatio) / 100);
    const ebt = ebit - financeExp;
    const note19Sum = getNoteBreakdownSum(19, yr);
    const tax = note19Sum !== null ? note19Sum : (d.tax !== undefined ? d.tax : Math.max(0, (ebt * d.taxRate) / 100));
    const netProfit = ebt - tax;

    // Calculate Custom Items sums for this year by section
    const customNC = customItems.filter((i) => i.section === 'NON_CURRENT_ASSETS').reduce((s, i) => s + (i.values[yr] || 0), 0);
    const customCA = customItems.filter((i) => i.section === 'CURRENT_ASSETS').reduce((s, i) => s + (i.values[yr] || 0), 0);
    const customLL = customItems.filter((i) => i.section === 'LONG_LIABILITIES').reduce((s, i) => s + (i.values[yr] || 0), 0);
    const customCL = customItems.filter((i) => i.section === 'CURRENT_LIABILITIES').reduce((s, i) => s + (i.values[yr] || 0), 0);
    const customEQ = customItems.filter((i) => i.section === 'EQUITY').reduce((s, i) => s + (i.values[yr] || 0), 0);

    const note9Sum = getNoteBreakdownSum(9, yr);
    const rawCash = note9Sum !== null ? note9Sum : (d.cash !== undefined ? d.cash : (sales * d.cashRatio) / 100);
    const cash = hiddenItemIds.includes('cash') ? 0 : rawCash;

    const note7Sum = getNoteBreakdownSum(7, yr);
    const rawReceivables = note7Sum !== null ? note7Sum : (d.receivables !== undefined ? d.receivables : (sales * d.receivablesRatio) / 100);
    const receivables = hiddenItemIds.includes('receivables') ? 0 : rawReceivables;

    const note6Sum = getNoteBreakdownSum(6, yr);
    const rawInventory = note6Sum !== null ? note6Sum : (d.inventory !== undefined ? d.inventory : (sales * d.inventoryRatio) / 100);
    const inventory = hiddenItemIds.includes('inventory') ? 0 : rawInventory;

    const note8Sum = getNoteBreakdownSum(8, yr);
    const rawOtherDebit = note8Sum !== null ? note8Sum : (d.otherDebit !== undefined ? d.otherDebit : sales * 0.03);
    const otherDebit = hiddenItemIds.includes('otherDebit') ? 0 : rawOtherDebit;
    const totalCurrentAssets = cash + receivables + inventory + otherDebit + customCA;

    const effNetFixedAssets = hiddenItemIds.includes('netFixedAssets') ? 0 : netFixedAssets;
    const note5Sum = getNoteBreakdownSum(5, yr);
    const rawProjects = note5Sum !== null ? note5Sum : (d.projectsInProgress !== undefined ? d.projectsInProgress : sales * 0.04);
    const projectsInProgress = hiddenItemIds.includes('projectsInProgress') ? 0 : rawProjects;
    const totalNonCurrentAssets = effNetFixedAssets + projectsInProgress + customNC;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const note12Sum = getNoteBreakdownSum(12, yr);
    const rawSuppliers = note12Sum !== null ? note12Sum : (d.suppliers !== undefined ? d.suppliers : (sales * d.suppliersRatio) / 100);
    const suppliers = hiddenItemIds.includes('suppliers') ? 0 : rawSuppliers;

    const note13Sum = getNoteBreakdownSum(13, yr);
    const rawShortLoans = note13Sum !== null ? note13Sum : (d.shortLoans !== undefined ? d.shortLoans : (sales * d.shortLoansRatio) / 100);
    const shortLoans = hiddenItemIds.includes('shortLoans') ? 0 : rawShortLoans;

    const note13bSum = getNoteBreakdownSum('13/ب', yr);
    const rawOtherCurrentLiab = note13bSum !== null ? note13bSum : (d.otherCurrentLiab !== undefined ? d.otherCurrentLiab : sales * 0.04);
    const otherCurrentLiab = hiddenItemIds.includes('otherCurrentLiab') ? 0 : rawOtherCurrentLiab;
    const totalCurrentLiabilities = suppliers + shortLoans + otherCurrentLiab + customCL;

    const note11Sum = getNoteBreakdownSum(11, yr);
    const rawLongLoans = note11Sum !== null ? note11Sum : (d.longLoans !== undefined ? d.longLoans : (sales * d.longLoansRatio) / 100);
    const longLoans = hiddenItemIds.includes('longLoans') ? 0 : rawLongLoans;
    const totalLongLiabilities = longLoans + customLL;
    const totalLiabilities = totalCurrentLiabilities + totalLongLiabilities;

    // Equity items - dynamically factored
    const baseCapital = clientProfile.capital || 10000000;
    const note10Sum = getNoteBreakdownSum(10, yr);
    const rawPaidUpCapital = note10Sum !== null ? note10Sum : (d.paidUpCapital !== undefined ? d.paidUpCapital : (totalAssets >= baseCapital ? baseCapital : Math.max(100000, baseCapital)));
    const paidUpCapital = hiddenItemIds.includes('paidUpCapital') ? 0 : rawPaidUpCapital;

    const rawLegalReserve = d.legalReserve !== undefined ? d.legalReserve : 1000000;
    const legalReserve = hiddenItemIds.includes('legalReserve') ? 0 : rawLegalReserve;

    const rawRetained = d.retainedEarningsAndProfit !== undefined ? d.retainedEarningsAndProfit : (totalAssets - totalLiabilities - paidUpCapital - legalReserve);
    const retainedEarningsAndProfit = hiddenItemIds.includes('retainedEarningsAndProfit') ? 0 : rawRetained;

    // True Equity Sum:
    const totalEquity = paidUpCapital + legalReserve + retainedEarningsAndProfit + customEQ;
    const totalEquityAndLiabilities = totalLiabilities + totalEquity;

    // Real-Time Balance Difference (Assets - Equity & Liabilities)
    // When 0, the balance sheet balances perfectly. If non-zero, difference is highlighted immediately.
    const balanceDiff = Math.round((totalAssets - totalEquityAndLiabilities) * 100) / 100;
    const isBalanced = Math.abs(balanceDiff) < 0.01;

    const workingCapitalChange = sales * 0.02;
    const operatingCashFlow = netProfit + depreciation - workingCapitalChange;
    const capex = netFixedAssets * 0.15;
    const financingCashFlow = -financeExp + longLoans * 0.05;

    const currentRatio =
      totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 1.5;
    const quickRatio =
      totalCurrentLiabilities > 0 ? (cash + receivables) / totalCurrentLiabilities : 1.1;
    const grossMargin = (grossProfit / sales) * 100;
    const netMargin = (netProfit / sales) * 100;
    const icr = financeExp > 0 ? ebit / financeExp : 10;
    const roe = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0;
    const debtToEquity = totalEquity > 0 ? (totalLiabilities / totalEquity) * 100 : 0;

    result[yr] = {
      sales,
      cogs,
      grossProfit,
      adminExp,
      sellingExp,
      ebitda,
      ebit,
      financeExp,
      ebt,
      tax,
      netProfit,
      cash,
      receivables,
      inventory,
      otherDebit,
      totalCurrentAssets,
      netFixedAssets,
      totalCostEnd: linkedCostEndSum,
      accumDepreciation: linkedAccumDepSum,
      projectsInProgress,
      totalNonCurrentAssets,
      totalAssets,
      suppliers,
      shortLoans,
      otherCurrentLiab,
      totalCurrentLiabilities,
      totalLongLiabilities,
      longLoans,
      totalLiabilities,
      totalEquity,
      paidUpCapital,
      legalReserve,
      retainedEarningsAndProfit,
      totalEquityAndLiabilities,
      balanceDiff,
      isBalanced,
      depreciation,
      workingCapitalChange,
      operatingCashFlow,
      capex,
      financingCashFlow,
      currentRatio,
      quickRatio,
      grossMargin,
      netMargin,
      icr,
      roe,
      debtToEquity,
    };
  });

  return result;
}, [yearsList, yearsData, customItems, hiddenItemIds, supplementaryNotes, assetCategories, adminExpenses]);

  // Centralized Bidirectional Cell Update Handler
  const handleUpdateFinancialStatementCell = (field: string, year: number, val: number) => {
    // 1. Update yearsData state with explicit override
    setYearsData((prev) => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [field]: val,
      },
    }));

    // 2. Synchronize matching Supplementary Note breakdown rows
    const noteMapping: Record<string, number | string> = {
      netFixedAssets: 4,
      projectsInProgress: 5,
      inventory: 6,
      receivables: 7,
      otherDebit: 8,
      cash: 9,
      paidUpCapital: 10,
      longLoans: 11,
      suppliers: 12,
      shortLoans: 13,
      otherCurrentLiab: '13/ب',
      sales: 14,
      cogs: 15,
      adminExp: 16,
      sellingExp: 17,
      financeExp: 18,
      tax: 19,
    };

    const targetNoteNum = noteMapping[field];
    if (targetNoteNum !== undefined) {
      setSupplementaryNotes((prevNotes) =>
        prevNotes.map((note) => {
          if (String(note.noteNumber) === String(targetNoteNum)) {
            const rows = note.customBreakdownRows || [];
            if (rows.length === 0) {
              return {
                ...note,
                customBreakdownRows: [
                  {
                    id: `row-${Date.now()}`,
                    name: note.title || 'بيان تفصيلي معتمد',
                    values: { [year]: val },
                  },
                ],
              };
            }
            const currentTotal = rows.reduce((s, r) => s + (r.values?.[year] || 0), 0);
            if (currentTotal === 0 || rows.length === 1) {
              return {
                ...note,
                customBreakdownRows: rows.map((r, idx) =>
                  idx === 0
                    ? { ...r, values: { ...(r.values || {}), [year]: val } }
                    : { ...r, values: { ...(r.values || {}), [year]: 0 } }
                ),
              };
            }
            const factor = val / currentTotal;
            let allocated = 0;
            return {
              ...note,
              customBreakdownRows: rows.map((r, idx) => {
                if (idx === rows.length - 1) {
                  const remainder = val - allocated;
                  return {
                    ...r,
                    values: { ...(r.values || {}), [year]: Math.round(remainder * 100) / 100 },
                  };
                }
                const rowVal = Math.round((r.values?.[year] || 0) * factor * 100) / 100;
                allocated += rowVal;
                return {
                  ...r,
                  values: { ...(r.values || {}), [year]: rowVal },
                };
              }),
            };
          }
          return note;
        })
      );
    }

    // 3. If field is adminExp, also synchronize adminExpenses schedule rows
    if (field === 'adminExp') {
      setAdminExpenses((prevExp) => {
        const currentSum = prevExp.reduce((s, item) => s + (item.valuesByYear?.[year] || 0), 0);
        if (currentSum === 0) {
          return prevExp.map((item, idx) =>
            idx === 0
              ? { ...item, valuesByYear: { ...(item.valuesByYear || {}), [year]: val } }
              : item
          );
        }
        const factor = val / currentSum;
        let allocated = 0;
        return prevExp.map((item, idx) => {
          if (idx === prevExp.length - 1) {
            const remainder = val - allocated;
            return {
              ...item,
              valuesByYear: { ...(item.valuesByYear || {}), [year]: Math.round(remainder * 100) / 100 },
            };
          }
          const itemVal = Math.round((item.valuesByYear?.[year] || 0) * factor * 100) / 100;
          allocated += itemVal;
          return {
            ...item,
            valuesByYear: { ...(item.valuesByYear || {}), [year]: itemVal },
          };
        });
      });
    }

    // 4. If field is netFixedAssets, also synchronize assetCategories schedule
    if (field === 'netFixedAssets') {
      setAssetCategories((prevCats) => {
        const currentNetSum = prevCats.reduce((s, cat) => {
          const yrD = cat.valuesByYear?.[year];
          if (!yrD) return s;
          const costEnd = (yrD.costStart || 0) + (yrD.additions || 0) - (yrD.disposals || 0);
          const dep = yrD.customDepExpense ?? (cat.depRate > 0 ? Math.round(costEnd * (cat.depRate / 100)) : 0);
          const accum = (yrD.accumStart || 0) + dep - (yrD.accumDisposals || 0);
          return s + Math.max(0, costEnd - accum);
        }, 0);

        if (currentNetSum === 0) return prevCats;
        const factor = val / currentNetSum;
        return prevCats.map((cat) => {
          const yrD = cat.valuesByYear?.[year] || { costStart: 0, additions: 0, disposals: 0, accumStart: 0 };
          return {
            ...cat,
            valuesByYear: {
              ...(cat.valuesByYear || {}),
              [year]: {
                ...yrD,
                costStart: Math.round((yrD.costStart || 0) * factor),
                additions: Math.round((yrD.additions || 0) * factor),
                accumStart: Math.round((yrD.accumStart || 0) * factor),
              },
            },
          };
        });
      });
    }
  };

  // Flexible Custom Items Handlers
  const handleUpdateCustomItems = (items: StatementLineItem[]) => {
    setCustomItems(items);
  };

  const handleUpdateItemName = (idOrField: string, newName: string) => {
    const isCustom = customItems.some((i) => i.id === idOrField);
    if (isCustom) {
      setCustomItems((prev) =>
        prev.map((i) => (i.id === idOrField ? { ...i, name: newName.trim() } : i))
      );
    } else {
      setItemNames((prev) => ({
        ...prev,
        [idOrField]: newName.trim(),
      }));
    }
  };

  const handleToggleHideItem = (idOrField: string) => {
    const isCustom = customItems.some((i) => i.id === idOrField);
    if (isCustom) {
      setCustomItems((prev) => prev.filter((i) => i.id !== idOrField));
    } else {
      setHiddenItemIds((prev) =>
        prev.includes(idOrField) ? prev.filter((id) => id !== idOrField) : [...prev, idOrField]
      );
    }
  };

  const handleRestoreAllItems = () => {
    setHiddenItemIds([]);
  };

  // 1-Click Auto-Balance for a fiscal year (balances Assets with Liabilities & Equity via Retained Earnings)
  const handleAutoBalanceYear = (yr: number) => {
    const cd = computedData[yr];
    if (!cd) return;
    const currentRetained = yearsData[yr]?.retainedEarningsAndProfit || 0;
    const newRetained = Math.round((currentRetained + cd.balanceDiff) * 100) / 100;
    handleUpdateFinancialStatementCell('retainedEarningsAndProfit', yr, newRetained);
  };

  const handleAutoBalanceAllYears = () => {
    yearsList.forEach((yr) => {
      const cd = computedData[yr];
      if (cd && !cd.isBalanced) {
        handleAutoBalanceYear(yr);
      }
    });
  };

  // Export Comprehensive Multi-Sheet Excel Workbook
  const handleExportComprehensiveExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Income Statement
    const isRows = [
      { 'بيان قائمة الدخل': 'إيرادات المبيعات والنشاط', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.sales }), {}) },
      { 'بيان قائمة الدخل': 'تكلفة المبيعات المباشرة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.cogs }), {}) },
      { 'بيان قائمة الدخل': 'مجمل ربح النشاط', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.grossProfit }), {}) },
      { 'بيان قائمة الدخل': 'المصروفات الإدارية والعمومية (مرحلة من جدول المصاريف)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.adminExp }), {}) },
      { 'بيان قائمة الدخل': 'المصروفات البيعية والتسويقية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.sellingExp }), {}) },
      { 'بيان قائمة الدخل': 'الأرباح قبل الفوائد والضرائب والإهلاك (EBITDA)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.ebitda }), {}) },
      { 'بيان قائمة الدخل': 'إهلاك الأصول الثابتة (مرحل من جدول الإهلاك)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.depreciation }), {}) },
      { 'بيان قائمة الدخل': 'أرباح التشغيل قبل الفوائد والضرائب (EBIT)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.ebit }), {}) },
      { 'بيان قائمة الدخل': 'أعباء التمويل والفوائد البنكية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.financeExp }), {}) },
      { 'بيان قائمة الدخل': 'صافي الربح قبل الضريبة (EBT)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.ebt }), {}) },
      { 'بيان قائمة الدخل': 'ضريبة الدخل المستحقة (22.5%)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.tax }), {}) },
      { 'بيان قائمة الدخل': 'صافي أرباح العام بعد الضريبة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.netProfit }), {}) },
    ];
    const wsIS = XLSX.utils.json_to_sheet(isRows);
    XLSX.utils.book_append_sheet(wb, wsIS, 'قائمة الدخل المقارنة');

    // 2. Sheet: Balance Sheet
    const bsRows = [
      { 'بيان المركز المالي': 'صافي الأصول الثابتة (مرحل من جدول الإهلاك)', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.netFixedAssets }), {}) },
      { 'بيان المركز المالي': 'مشروعات تحت التنفيذ', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.projectsInProgress }), {}) },
      { 'بيان المركز المالي': 'إجمالي الأصول غير المتداولة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.totalNonCurrentAssets }), {}) },
      { 'بيان المركز المالي': 'المخزون السلعي والبضائع', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.inventory }), {}) },
      { 'بيان المركز المالي': 'العملاء وأوراق القبض', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.receivables }), {}) },
      { 'بيان المركز المالي': 'أرصدة مدينة أخرى', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.otherDebit }), {}) },
      { 'بيان المركز المالي': 'النقدية وما في حكمها', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.cash }), {}) },
      { 'بيان المركز المالي': 'إجمالي الأصول المتداولة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.totalCurrentAssets }), {}) },
      { 'بيان المركز المالي': 'إجمالي الأصول', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.totalAssets }), {}) },
      { 'بيان المركز المالي': 'رأس المال المدفوع', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.paidUpCapital }), {}) },
      { 'بيان المركز المالي': 'الاحتياطي القانوني', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.legalReserve }), {}) },
      { 'بيان المركز المالي': 'الأرباح المرحلة وصافي ربح العام', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.retainedEarningsAndProfit }), {}) },
      { 'بيان المركز المالي': 'إجمالي حقوق الملكية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.totalEquity }), {}) },
      { 'بيان المركز المالي': 'قروض وتسهيلات طويلة الأجل', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.longLoans }), {}) },
      { 'بيان المركز المالي': 'الموردون وأوراق الدفع', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.suppliers }), {}) },
      { 'بيان المركز المالي': 'تسهيلات قصيرة الأجل', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.shortLoans }), {}) },
      { 'بيان المركز المالي': 'أرصدة دائنة ومخصصات', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.otherCurrentLiab }), {}) },
      { 'بيان المركز المالي': 'إجمالي الالتزامات وحقوق الملكية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.totalEquityAndLiabilities }), {}) },
    ];
    const wsBS = XLSX.utils.json_to_sheet(bsRows);
    XLSX.utils.book_append_sheet(wb, wsBS, 'قائمة المركز المالي');

    // 3. Sheet: Cash Flow Statement
    const cfRows = [
      { 'بيان التدفقات النقدية': 'صافي أرباح العام بعد الضريبة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.netProfit }), {}) },
      { 'بيان التدفقات النقدية': 'يضاف: إهلاك الأصول الثابتة', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.depreciation }), {}) },
      { 'بيان التدفقات النقدية': 'التغير في رأس المال العامل', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.workingCapitalChange }), {}) },
      { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية من الأنشطة التشغيلية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.operatingCashFlow }), {}) },
      { 'بيان التدفقات النقدية': 'شراء أصول ثابتة وتوسعات رأسمالية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.capex }), {}) },
      { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية من الأنشطة الاستثمارية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: -computedData[y]?.capex }), {}) },
      { 'بيان التدفقات النقدية': 'صافي التدفقات النقدية من الأنشطة التمويلية', ...yearsList.reduce((acc, y) => ({ ...acc, [`سنة ${y}`]: computedData[y]?.financingCashFlow }), {}) },
    ];
    const wsCF = XLSX.utils.json_to_sheet(cfRows);
    XLSX.utils.book_append_sheet(wb, wsCF, 'قائمة التدفقات النقدية');

    // 4. Sheet: Fixed Assets Schedule
    const faRows: any[] = [];
    yearsList.forEach((yr) => {
      assetCategories.forEach((cat) => {
        const yrData = cat.valuesByYear?.[yr] || { costStart: 0, additions: 0, disposals: 0, accumStart: 0 };
        const costEnd = (yrData.costStart || 0) + (yrData.additions || 0) - (yrData.disposals || 0);
        const depExpense = yrData.customDepExpense !== undefined ? yrData.customDepExpense : (cat.depRate > 0 ? Math.round(costEnd * (cat.depRate / 100)) : 0);
        const accumEnd = (yrData.accumStart || 0) + depExpense;
        const netValue = Math.max(0, costEnd - accumEnd);

        faRows.push({
          'السنة المالية': yr,
          'بيان الأصل الثابت': cat.name,
          'نسبة الإهلاك %': cat.depRate,
          'تكلفة أول المدة': yrData.costStart,
          'إضافات العام': yrData.additions,
          'استبعادات العام': yrData.disposals,
          'إجمالي التكلفة آخر المدة': costEnd,
          'مجمع إهلاك أول المدة': yrData.accumStart,
          'إهلاك العام المحسوب': depExpense,
          'مجمع إهلاك آخر المدة': accumEnd,
          'صافي القيمة الدفترية': netValue,
        });
      });
    });
    const wsFA = XLSX.utils.json_to_sheet(faRows);
    XLSX.utils.book_append_sheet(wb, wsFA, 'جدول إهلاك الأصول الثابتة');

    // 5. Sheet: Admin Expenses Schedule
    const gaRows = adminExpenses.map((item, idx) => {
      const rowData: Record<string, any> = {
        'م': idx + 1,
        'بند المصروف الإداري والعمومي': item.name,
        'التصنيف': item.category,
      };
      yearsList.forEach((yr) => {
        rowData[`سنة ${yr} (ج.م)`] = item.valuesByYear?.[yr] || 0;
      });
      return rowData;
    });
    const wsGA = XLSX.utils.json_to_sheet(gaRows);
    XLSX.utils.book_append_sheet(wb, wsGA, 'المصروفات الإدارية والعمومية');

    // 6. Sheet: Notes & Schedules
    const notesExportRows = supplementaryNotes.map((n) => ({
      'رقم الإيضاح': `إيضاح (${n.noteNumber})`,
      'عنوان الإيضاح': n.title,
      'التصنيف': n.category,
      'نص الإيضاح': n.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim(),
    }));
    const wsNotes = XLSX.utils.json_to_sheet(notesExportRows);
    XLSX.utils.book_append_sheet(wb, wsNotes, 'الإيضاحات المتممة');

    XLSX.writeFile(wb, `الملف_الائتماني_المتكامل_والقوائم_المالية_${selectedYear}.xlsx`);
  };

  // Handler for Reverse Engineering / Smart Suite updates
  const handleApplyEngineeredNumbers = (engineeredData: Record<number, Partial<FiscalYearData>>) => {
    setYearsData((prev) => {
      const next = { ...prev };
      Object.entries(engineeredData).forEach(([yrStr, data]) => {
        const yr = parseInt(yrStr, 10);
        if (next[yr]) {
          next[yr] = { ...next[yr], ...data };
        } else {
          next[yr] = {
            year: yr,
            sales: 20000000,
            cogsRatio: 65,
            adminExpRatio: 8,
            sellingExpRatio: 0,
            financeExpRatio: 1,
            taxRate: 22.5,
            cashRatio: 5,
            receivablesRatio: 20,
            inventoryRatio: 25,
            fixedAssetsRatio: 50,
            suppliersRatio: 10,
            shortLoansRatio: 15,
            longLoansRatio: 10,
            ...data,
          };
        }
      });
      return next;
    });
  };

  // Handler for Excel Import Success
  const handleImportExcelSuccess = (importedData: {
    yearsDetected: number[];
    parsedYearsData: Record<number, Partial<FiscalYearData>>;
    clientMetadata?: any;
  }) => {
    if (importedData.yearsDetected && importedData.yearsDetected.length > 0) {
      setYearsList(importedData.yearsDetected);
      setBatchSelectedYears(importedData.yearsDetected);
      if (!importedData.yearsDetected.includes(selectedYear)) {
        setSelectedYear(importedData.yearsDetected[importedData.yearsDetected.length - 1]);
      }
    }

    if (importedData.parsedYearsData) {
      setYearsData((prev) => {
        const next = { ...prev };
        Object.entries(importedData.parsedYearsData).forEach(([yrStr, data]) => {
          const yr = parseInt(yrStr, 10);
          if (next[yr]) {
            next[yr] = { ...next[yr], ...data };
          } else {
            next[yr] = {
              year: yr,
              sales: data.sales || 20000000,
              cogsRatio: 65,
              adminExpRatio: 8,
              sellingExpRatio: 0,
              financeExpRatio: 1,
              taxRate: 22.5,
              cashRatio: 5,
              receivablesRatio: 20,
              inventoryRatio: 25,
              fixedAssetsRatio: 50,
              suppliersRatio: 10,
              shortLoansRatio: 15,
              longLoansRatio: 10,
              ...data,
            };
          }
        });
        return next;
      });
    }

    if (importedData.clientMetadata) {
      setClientProfile((prev) => ({
        ...prev,
        companyName: importedData.clientMetadata.companyName || prev.companyName,
        commercialRegNo: importedData.clientMetadata.commercialRegNo || prev.commercialRegNo,
        taxRegNo: importedData.clientMetadata.taxRegNo || prev.taxRegNo,
        legalForm: importedData.clientMetadata.legalForm || prev.legalForm,
        activity: importedData.clientMetadata.activity || prev.activity,
      }));
    }
  };

  const navTabs: { id: SimulatorTab; label: string; icon: any }[] = [
    { id: 'STATEMENTS', label: '1. القوائم المالية المقارنة (المركز والدخل والتدفقات)', icon: Scale },
    { id: 'PROFIT_DIST', label: '2. مشروع ومذكرة توزيع الأرباح', icon: Award },
    { id: 'AUDITOR_REPORT', label: '3. تقرير مراقب الحسابات المعتمد (ESA)', icon: FileCheck2 },
    { id: 'TAX_CERT', label: '4. شهادة الموقف الضريبي والتأميني', icon: FileBadge },
    { id: 'FIXED_ASSETS', label: '5. جدول إهلاك الأصول الثابتة', icon: Building },
    { id: 'ADMIN_EXPENSES', label: '6. جدول المصروفات الإدارية والعمومية', icon: FileSpreadsheet },
    { id: 'NOTES', label: '7. الإيضاحات المتممة للقوائم (Rich Text)', icon: BookOpen },
    { id: 'KPIS', label: '8. الملف الائتماني البنكي ومؤشرات الجدارة والتعثر', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header Unified Card */}
      <UnifiedScreenCard
        id="credit-financials-screen-card"
        title="ملف الائتمان البنكي والمحاكي المالي المتكامل"
        badgeText="معتمد EAS"
        badgeVariant="emerald"
        actionsSlot={
          <div className="flex items-center gap-2">
            <CompanyHeaderSelector
              state={state}
              title="الشركة:"
              allOptionLabel="شركة النيل للصناعات الهندسية"
              onSelectClient={(cl) => {
                if (cl) {
                  applyClientRecordToProfile(cl);
                }
              }}
            />

            <button
              type="button"
              onClick={() => setIsExcelBridgeModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="تنزيل نموذج إكسيل أو استيراد ملف"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">جسر الإكسيل (تنزيل / استيراد)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHeaderModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="تخصيص ترويسة ومقرات وهواتف المكتب وبيانات المنشأة"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span className="hidden sm:inline">ترويسة المكتب والطباعة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintScope('COMPLETE_DOSSIER');
                setPageRangeConfig((prev) => ({
                  ...prev,
                  mode: 'ALL',
                  fromPage: 1,
                  toPage: 8,
                }));
                setIsPrintModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="طباعة وتوثيق الملف"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400 dark:text-blue-200" />
              <span className="hidden sm:inline">طباعة وتوثيق الملف</span>
            </button>

            <ActionMenu
              id="credit-simulator-action-menu"
              label="إجراءات"
              triggerVariant="secondary"
              align="left"
              items={[
                {
                  id: 'header-customizer',
                  label: 'تخصيص ترويسة ومقرات وهواتف المكتب وبيانات المنشأة',
                  icon: Sliders,
                  onClick: () => setIsHeaderModalOpen(true),
                },
                {
                  id: 'client-data',
                  label: 'بيانات المنشأة والضرائب',
                  icon: Building,
                  onClick: () => setIsClientModalOpen(true),
                },
                {
                  id: 'excel-bridge',
                  label: 'جسر الإكسيل: تنزيل نموذج مدعوم / استيراد أرقام',
                  icon: FileSpreadsheet,
                  variant: 'success',
                  onClick: () => setIsExcelBridgeModalOpen(true),
                },
                {
                  id: 'export-excel',
                  label: 'تصدير إكسيل متكامل (XLSX)',
                  icon: FileSpreadsheet,
                  variant: 'success',
                  onClick: handleExportComprehensiveExcel,
                },
                {
                  id: 'export-pdf',
                  label: 'تصدير PDF للشاشة المفتوحة',
                  icon: FileText,
                  onClick: () => exportElementToPdf('credit-financials-container', `الملف_الائتماني_المعتمد_${selectedYear}.pdf`),
                },
                {
                  id: 'export-png',
                  label: 'تصدير كصورة عالية الدقة (PNG)',
                  icon: Image,
                  onClick: () => exportElementToImage('credit-financials-container', `الملف_الائتماني_${selectedYear}.png`),
                },
                {
                  id: 'batch-print',
                  label: 'طباعة السنوات المقارنة مجمعة',
                  icon: Layers,
                  onClick: () => {
                    setPrintScope('ALL_YEARS_BATCH');
                    setPageRangeConfig((prev) => ({
                      ...prev,
                      mode: 'ALL',
                      fromPage: 1,
                      toPage: yearsList.length,
                    }));
                    setIsPrintModalOpen(true);
                  },
                },
                {
                  id: 'reset-simulator',
                  label: 'إعادة ضبط أرقام المحاكي والقوائم للمعدلات الافتراضية',
                  icon: SlidersHorizontal,
                  onClick: handleResetSimulatorDefaults,
                },
                {
                  id: 'purge-database',
                  label: 'تفريغ وتصفير بيانات المنظومة بالكامل (Mgacc120)',
                  icon: Trash2,
                  variant: 'danger',
                  onClick: () => setIsPurgeModalOpen(true),
                },
              ]}
            />
          </div>
        }
      >
        {/* Streamlined Fiscal Years Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">السنوات المالية للمحاكاة:</span>
          </div>

          <button
            type="button"
            onClick={handleAddNewFiscalYear}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>إضافة سنة مالية</span>
          </button>
        </div>

        {/* Flexible Financial Period & Date Range Selection Bar (EAS 1 / EAS 30 / Banking Credit Dossier) */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-700 dark:text-blue-400">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>فترة الملف الائتماني والقوائم المالية المحددة</span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    من وإلى
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  مرونة كاملة لتحديد فترات التقييم الائتماني: سنوية، ربع سنوية، نصف سنوية، أو فترة مخصصة (EAS 30)
                </div>
              </div>
            </div>

            {/* Quick Period Presets */}
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400 font-bold ml-1">فترات قياسية:</span>
              {[
                { id: 'FULL_YEAR', label: 'سنة كاملة' },
                { id: 'Q1', label: 'الربع الأول (Q1)' },
                { id: 'H1', label: 'النصف الأول (H1)' },
                { id: '9M', label: '9 أشهر (Q3)' },
                { id: 'Q4', label: 'الربع الرابع (Q4)' },
              ].map((p) => {
                const isSelected = periodPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPeriodPreset(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inputs & Period Details */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Start Date */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">من تاريخ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="bg-transparent font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Arrow */}
              <span className="text-slate-400 font-bold text-xs">←</span>

              {/* End Date */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إلى تاريخ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="bg-transparent font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Duration & Period Chip */}
              {periodDurationText && (
                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>{periodDurationText}</span>
                </span>
              )}
            </div>

            {/* Quick Reset to Full Year */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyPeriodPreset('FULL_YEAR')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>استعادة كامل السنة ({selectedYear})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Streamlined Year Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
          {yearsList.map((yr) => {
            const isSelected = selectedYear === yr;
            const isBatchIncluded = batchSelectedYears.includes(yr);
            const data = computedData[yr] || {};

            return (
              <div
                key={yr}
                onClick={() => handleSelectYearAndSyncDates(yr)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer relative text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500/80 dark:border-blue-500/70 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                      سنة {yr}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                        النشطة
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBatchYear(yr);
                    }}
                    title="تضمين في الطباعة المقارنة"
                    className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    {isBatchIncluded ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                  <div className="truncate text-slate-500 dark:text-slate-400">
                    مبيعات: <span className="font-bold text-slate-800 dark:text-slate-200">{formatEgyptianCurrency(data.sales || 0)}</span>
                  </div>
                  <div className="truncate text-slate-500 dark:text-slate-400 text-left">
                    صافي: <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatEgyptianCurrency(data.netProfit || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </UnifiedScreenCard>

      {/* Flexible Inputs & Sliders Editor */}
      <CreditYearlyEditor
        yearsData={yearsData}
        activeYear={selectedYear}
        onUpdateYearData={handleUpdateYearData}
        sector={sector}
        onSectorChange={handleSectorChange}
        onApplyPresetToAllYears={handleApplyPresetToAllYears}
      />

      {/* Smart Credit Suite (الهندسة الائتمانية العكسية، محاكي شروط البنوك، ومطابقة حركة كشف الحساب) */}
      <div className="no-print space-y-2">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsSmartSuiteVisible(!isSmartSuiteVisible)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{isSmartSuiteVisible ? 'إخفاء جناح التحليل الائتماني المتقدم' : 'إظهار جناح التحليل الائتماني المتقدم (الهندسة العكسية / محاكي البنوك)'}</span>
          </button>
        </div>

        {isSmartSuiteVisible && (
          <SmartCreditSuite
            yearsList={yearsList}
            yearsData={yearsData}
            computedData={computedData}
            activeYear={selectedYear}
            clientName={clientProfile.companyName}
            onApplyEngineeredNumbers={handleApplyEngineeredNumbers}
          />
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto no-print">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENT WRAPPED IN PRINTABLE CONTAINER */}
      <div id="credit-financials-container" data-printable="true" className="space-y-6">
        {/* Official Letterhead Header for Direct Browser/Canvas Printing */}
        <OfficialReportHeader
          officeProfile={officeProfile}
          clientProfile={clientProfile}
          fiscalYear={selectedYear}
          periodStartDate={startDate}
          periodEndDate={endDate}
          showHeaderClientBanner={showHeaderClientBanner}
          documentTitle={
            activeTab === 'STATEMENTS'
              ? 'القوائم المالية والحسابات الختامية المقارنة'
              : activeTab === 'PROFIT_DIST'
              ? 'مشروع ومذكرة توزيع الأرباح القانونية المقترحة'
              : activeTab === 'AUDITOR_REPORT'
              ? 'تقرير مراقب الحسابات المستقل المعتمد (ESA)'
              : activeTab === 'TAX_CERT'
              ? 'شهادة الموقف الضريبي والتأميني الصادرة من مراقب الحسابات'
              : activeTab === 'FIXED_ASSETS'
              ? 'جدول حركة وإهلاك الأصول الثابتة السنوي'
              : activeTab === 'ADMIN_EXPENSES'
              ? 'جدول تفصيلي للمصروفات الإدارية والعمومية'
              : activeTab === 'NOTES'
              ? 'الإيضاحات المتممة للقوائم المالية (الملحق الإيضاحي)'
              : 'تقرير المؤشرات المالية والائتمانية والتقييم الائتماني'
          }
          documentSubtitle="مستخرج رسمي معتمد ومطابق لمعايير المحاسبة المصرية (EAS) وقوانين الشركات والضرائب"
        />

        {activeTab === 'STATEMENTS' && (
          <CreditFinancialStatementsTab
            yearsData={yearsData}
            yearsList={yearsList}
            computedData={computedData}
            customItems={customItems}
            onUpdateCustomItems={handleUpdateCustomItems}
            itemNames={itemNames}
            onUpdateItemName={handleUpdateItemName}
            hiddenItemIds={hiddenItemIds}
            onToggleHideItem={handleToggleHideItem}
            onRestoreAllItems={handleRestoreAllItems}
            onAutoBalanceYear={handleAutoBalanceYear}
            onAutoBalanceAllYears={handleAutoBalanceAllYears}
            supplementaryNotes={supplementaryNotes}
            onUpdateNotesList={setSupplementaryNotes}
            assetCategories={assetCategories}
            adminExpenses={adminExpenses}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
            onUpdateCell={handleUpdateFinancialStatementCell}
          />
        )}

        {activeTab === 'PROFIT_DIST' && (
          <CreditProfitDistributionTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            supplementaryNotes={supplementaryNotes}
            onUpdateNotesList={setSupplementaryNotes}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'AUDITOR_REPORT' && (
          <CreditAuditorReportTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            clientProfile={clientProfile}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'TAX_CERT' && (
          <CreditTaxCertificateTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            clientProfile={clientProfile}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'FIXED_ASSETS' && (
          <CreditFixedAssetsTab
            yearsList={yearsList}
            computedData={computedData}
            assetCategories={assetCategories}
            onUpdateAssetCategories={setAssetCategories}
            onResetAssets={() => setAssetCategories(DEFAULT_ASSET_CATEGORIES)}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'ADMIN_EXPENSES' && (
          <CreditAdminExpensesTab
            yearsList={yearsList}
            computedData={computedData}
            expenseItems={adminExpenses}
            onUpdateExpenseItems={setAdminExpenses}
            onResetExpenses={() => setAdminExpenses(DEFAULT_ADMIN_EXPENSES)}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'NOTES' && (
          <CreditNotesTab
            yearsList={yearsList}
            computedData={computedData}
            notesList={supplementaryNotes}
            onUpdateNotesList={setSupplementaryNotes}
            onResetNotes={() => setSupplementaryNotes(DEFAULT_SUPPLEMENTARY_NOTES)}
            assetCategories={assetCategories}
            adminExpenses={adminExpenses}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
          />
        )}

        {activeTab === 'KPIS' && (
          <CreditScoringKpisTab
            yearsData={yearsData}
            yearsList={yearsList}
            computedData={computedData}
            companyName={clientProfile.companyName}
            periodStartDate={startDate}
            periodEndDate={endDate}
            periodLabel={periodDurationText}
            customCreditRatios={customCreditRatios}
            onUpdateCustomCreditRatios={setCustomCreditRatios}
            creditRatioNames={creditRatioNames}
            onUpdateCreditRatioName={(id, name) => setCreditRatioNames((prev) => ({ ...prev, [id]: name }))}
            hiddenCreditRatioIds={hiddenCreditRatioIds}
            onToggleHideCreditRatio={(id) =>
              setHiddenCreditRatioIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onRestoreAllCreditRatios={() => setHiddenCreditRatioIds([])}
            creditRatioBenchmarks={creditRatioBenchmarks}
            onUpdateCreditRatioBenchmark={(id, bm) =>
              setCreditRatioBenchmarks((prev) => ({ ...prev, [id]: bm }))
            }
            manualCreditRatioValues={manualCreditRatioValues}
            onUpdateManualCreditRatioValue={(id, yr, val) =>
              setManualCreditRatioValues((prev) => {
                const next = { ...prev };
                if (!next[id]) next[id] = {};
                if (val === null) {
                  delete next[id][yr];
                } else {
                  next[id][yr] = val;
                }
                return next;
              })
            }
            creditMemoConfig={creditMemoConfig}
            onUpdateCreditMemoConfig={setCreditMemoConfig}
          />
        )}
      </div>

      {/* ADVANCED PRINT & BATCH PRINT MODAL (وحدة الطباعة والتصدير المعتمدة - أوامر جانبية ومعاينة موسعة) */}
      {isPrintModalOpen && (() => {
        // Calculate all page metas dynamically using getDossierPageMetas
        const allPageMetas = getDossierPageMetas(printScope, selectedYear, yearsList, batchSelectedYears);
        const totalPages = allPageMetas.length;
        const selectedPageMetas = allPageMetas.filter((m) =>
          isPageIncluded(m.pageNumber, pageRangeConfig, totalPages)
        );
        const effectiveTotalPages =
          pageRangeConfig.resequencePageNumbers !== false
            ? selectedPageMetas.length
            : totalPages;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-3 print:p-0 print:bg-white print:static print:inset-auto print:z-auto">
            <div
              className={`bg-white dark:bg-slate-900 w-full ${
                isModalFullscreen ? 'h-full max-w-none rounded-none' : 'h-full max-h-[98vh] max-w-[1750px] rounded-2xl md:rounded-3xl'
              } print:h-auto print:max-w-none print:w-full print:rounded-none border border-slate-200 dark:border-slate-800 print:border-none shadow-2xl print:shadow-none flex flex-col md:flex-row overflow-hidden transition-all`}
            >
              {/* SIDEBAR: Print Controls & Settings (لوحة أوامر وخيارات الطباعة الجانبية) */}
              <aside className="w-full md:w-[350px] lg:w-[380px] shrink-0 h-auto md:h-full max-h-[45vh] md:max-h-none min-h-0 bg-slate-50/95 dark:bg-slate-900/95 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col no-print z-20">
                {/* Sidebar Header */}
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-xl shadow-2xs">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          أوامر وخيارات الطباعة
                        </h3>
                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold rounded border border-blue-200 dark:border-blue-800">
                          A4 Certified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        لوحة التحكم الجانبية المتطورة
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Action Buttons: Print Now + Export PDF & PNG */}
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0 bg-blue-50/40 dark:bg-blue-950/20">
                  <button
                    type="button"
                    onClick={handlePrintDossier}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all"
                    title="طباعة الورق A4 الفوري (Ctrl+P)"
                  >
                    <Printer className="w-4 h-4" />
                    <span>بدء الطباعة A4 (طباعة فورية)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isExportingPdf}
                      onClick={async () => {
                        setIsExportingPdf(true);
                        try {
                          const rangeSuffix =
                            pageRangeConfig.mode === 'ALL'
                              ? 'كافة_الصفحات'
                              : pageRangeConfig.mode === 'RANGE'
                              ? `ص_${pageRangeConfig.fromPage}_إلى_${pageRangeConfig.toPage}`
                              : `صفحات_${pageRangeConfig.customPagesString || 'مخصصة'}`;
                          await exportElementToPdf(
                            'credit-printable-dossier',
                            `ملف_الائتمان_المعتمد_${selectedYear}_${rangeSuffix}.pdf`
                          );
                        } finally {
                          setIsExportingPdf(false);
                        }
                      }}
                      className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="truncate">{isExportingPdf ? 'جارِ التصدير...' : 'تصدير PDF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const rangeSuffix =
                          pageRangeConfig.mode === 'ALL'
                            ? 'كافة_الصفحات'
                            : pageRangeConfig.mode === 'RANGE'
                            ? `ص_${pageRangeConfig.fromPage}_إلى_${pageRangeConfig.toPage}`
                            : `صفحات_${pageRangeConfig.customPagesString || 'مخصصة'}`;
                        await exportElementToImage(
                          'credit-printable-dossier',
                          `ملف_الائتمان_المعتمد_${selectedYear}_${rangeSuffix}.png`,
                          'png'
                        );
                      }}
                      className="py-2 px-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>تصدير PNG</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable Settings Sections */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs">
                  {/* SECTION 1: Document Scope */}
                  <div className="space-y-2">
                    <label className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                      <span>نطاق الوثائق والمستندات:</span>
                      <span className="text-[11px] font-normal text-slate-500">Document Scope</span>
                    </label>

                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintScope('COMPLETE_DOSSIER');
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'ALL',
                            fromPage: 1,
                            toPage: 11,
                          }));
                          scrollToPage(1);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                          printScope === 'COMPLETE_DOSSIER'
                            ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div>الملف الائتماني الشامل المعتمد</div>
                            <div className={`text-[10px] font-normal ${printScope === 'COMPLETE_DOSSIER' ? 'text-indigo-200' : 'text-slate-400'}`}>
                              كافة الأوراق الـ 11 (الغلاف، القوائم، التقارير، التحليل والجدارة)
                            </div>
                          </div>
                        </div>
                        {printScope === 'COMPLETE_DOSSIER' && <Check className="w-4 h-4 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintScope('ALL_YEARS_BATCH');
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'ALL',
                            fromPage: 1,
                            toPage: yearsList.length,
                          }));
                          scrollToPage(1);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                          printScope === 'ALL_YEARS_BATCH'
                            ? 'bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-300 dark:ring-blue-800'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <div>كافة السنوات مجمعة</div>
                            <div className={`text-[10px] font-normal ${printScope === 'ALL_YEARS_BATCH' ? 'text-blue-200' : 'text-slate-400'}`}>
                              {yearsList.length} سنوات مالية متتالية
                            </div>
                          </div>
                        </div>
                        {printScope === 'ALL_YEARS_BATCH' && <Check className="w-4 h-4 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintScope('SELECTED_YEAR');
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'ALL',
                            fromPage: 1,
                            toPage: 1,
                          }));
                          scrollToPage(1);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                          printScope === 'SELECTED_YEAR'
                            ? 'bg-sky-700 text-white border-sky-700 shadow-sm ring-2 ring-sky-300 dark:ring-sky-800'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-sky-400 shrink-0" />
                          <div>
                            <div>قوائم سنة {selectedYear} المالية فقط</div>
                            <div className={`text-[10px] font-normal ${printScope === 'SELECTED_YEAR' ? 'text-sky-200' : 'text-slate-400'}`}>
                              المركز المالي والدخل والتدفقات
                            </div>
                          </div>
                        </div>
                        {printScope === 'SELECTED_YEAR' && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    </div>

                    {/* Single Document Selector Dropdown */}
                    <div className="pt-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        أو طباعة مستند مستقل بذاته:
                      </label>
                      <select
                        value={
                          ['COMPLETE_DOSSIER', 'ALL_YEARS_BATCH', 'SELECTED_YEAR'].includes(printScope)
                            ? ''
                            : printScope
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            const newScope = e.target.value as CreditPrintScope;
                            setPrintScope(newScope);
                            const metas = getDossierPageMetas(newScope, selectedYear, yearsList, batchSelectedYears);
                            setPageRangeConfig((prev) => ({
                              ...prev,
                              mode: 'ALL',
                              fromPage: 1,
                              toPage: metas.length,
                            }));
                            scrollToPage(1);
                          }
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- اختر مستنداً منفرداً --</option>
                        <option value="PROFIT_DIST_ONLY">مشروع وتوزيع الأرباح المقترح</option>
                        <option value="TAX_CERT_ONLY">شهادة الموقف الضريبي والتأميني</option>
                        <option value="AUDITOR_ONLY">تقرير مراقب الحسابات المستقل</option>
                        <option value="FIXED_ASSETS_ONLY">جدول حركة وإهلاك الأصول الثابتة</option>
                        <option value="GA_EXPENSES_ONLY">كشف المصروفات العمومية والإدارية</option>
                        <option value="NOTES_ONLY">الإيضاحات المتممة للقوائم المالية</option>
                        <option value="CREDIT_ANALYSIS_ONLY">تقرير التحليل المالي والنسب المصرفية</option>
                        <option value="CREDIT_SCORING_ONLY">تقييم الجدارة ومذكرة التوصية الائتمانية</option>
                      </select>
                    </div>
                  </div>

                  {/* SECTION 2: Pages & Dynamic Renumbering */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-slate-800 dark:text-slate-200 text-xs">
                        تحديد الصفحات والترقيم:
                      </label>
                      <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {selectedPageMetas.length} من {totalPages} صفحة
                      </span>
                    </div>

                    {/* Mode selector pills */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'ALL',
                            fromPage: 1,
                            toPage: totalPages,
                          }));
                          scrollToPage(1);
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          pageRangeConfig.mode === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        كافة الصفحات
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'RANGE',
                            fromPage: Math.min(prev.fromPage || 1, totalPages),
                            toPage: Math.min(prev.toPage || totalPages, totalPages),
                          }));
                          scrollToPage(1);
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          pageRangeConfig.mode === 'RANGE'
                            ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        نطاق محدد
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            mode: 'CUSTOM',
                            customPagesString: prev.customPagesString || `1-${Math.min(3, totalPages)}`,
                          }));
                          scrollToPage(1);
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          pageRangeConfig.mode === 'CUSTOM'
                            ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        مخصص / يدوي
                      </button>
                    </div>

                    {/* Inputs for RANGE mode */}
                    {pageRangeConfig.mode === 'RANGE' && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">من ورقة:</label>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageRangeConfig.fromPage}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, totalPages));
                              setPageRangeConfig((prev) => ({
                                ...prev,
                                fromPage: val,
                                toPage: Math.max(val, prev.toPage),
                              }));
                            }}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">إلى ورقة:</label>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageRangeConfig.toPage}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, totalPages));
                              setPageRangeConfig((prev) => ({
                                ...prev,
                                toPage: val,
                                fromPage: Math.min(val, prev.fromPage),
                              }));
                            }}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Inputs for CUSTOM mode */}
                    {pageRangeConfig.mode === 'CUSTOM' && (
                      <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          أرقام الصفحات المطلوبة:
                        </label>
                        <input
                          type="text"
                          placeholder={`مثال: 1, 3, 5-7 (من 1 إلى ${totalPages})`}
                          value={pageRangeConfig.customPagesString || ''}
                          onChange={(e) =>
                            setPageRangeConfig((prev) => ({
                              ...prev,
                              customPagesString: e.target.value,
                            }))
                          }
                          className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100"
                        />
                        <p className="text-[10px] text-slate-500">
                          اكتب أرقام الصفحات مفصولة بفواصل أو شرطات مثل: 1, 3, 5-8
                        </p>
                      </div>
                    )}

                    {/* INTERACTIVE PAGE CHECKBOXES LIST (قائمة الأوراق التفاعلية لتحديد سريع) */}
                    <div className="space-y-1.5 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700 text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          قائمة أوراق المستند (تحديد سريع):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPageRangeConfig((prev) => ({
                                ...prev,
                                mode: 'ALL',
                                fromPage: 1,
                                toPage: totalPages,
                                customPagesString: '',
                              }));
                            }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                          >
                            تحديد الكل
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPageRangeConfig((prev) => ({
                                ...prev,
                                mode: 'CUSTOM',
                                customPagesString: '1',
                              }));
                            }}
                            className="text-[10px] text-slate-500 hover:underline font-bold cursor-pointer"
                          >
                            الأولى فقط
                          </button>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                        {allPageMetas.map((meta) => {
                          const isChecked = isPageIncluded(meta.pageNumber, pageRangeConfig, totalPages);
                          return (
                            <div
                              key={meta.id}
                              onClick={() => {
                                const newCustomStr = togglePageInCustomString(
                                  pageRangeConfig.mode === 'CUSTOM'
                                    ? pageRangeConfig.customPagesString || ''
                                    : isChecked
                                    ? formatPagesToRangeString(allPageMetas.filter((m) => m.pageNumber !== meta.pageNumber).map((m) => m.pageNumber))
                                    : formatPagesToRangeString([meta.pageNumber]),
                                  meta.pageNumber,
                                  totalPages
                                );
                                setPageRangeConfig((prev) => ({
                                  ...prev,
                                  mode: 'CUSTOM',
                                  customPagesString: newCustomStr,
                                }));
                              }}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors select-none ${
                                isChecked
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 font-bold'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent div onClick
                                className="rounded accent-blue-700 w-3.5 h-3.5 cursor-pointer shrink-0"
                              />
                              <span className="font-mono text-[10px] px-1 bg-slate-200/80 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 shrink-0">
                                ص {meta.pageNumber}
                              </span>
                              <span className="truncate flex-1">{meta.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DYNAMIC FOOTER RENUMBERING (إعادة ترتيب رقم تذييل الصفحة بناءً على الصفحات المحددة) */}
                    <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl space-y-1.5">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          id="resequence-sidebar-toggle"
                          checked={pageRangeConfig.resequencePageNumbers !== false}
                          onChange={(e) =>
                            setPageRangeConfig((prev) => ({
                              ...prev,
                              resequencePageNumbers: e.target.checked,
                            }))
                          }
                          className="rounded accent-emerald-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5">
                          <div className="font-black text-emerald-950 dark:text-emerald-100 text-xs flex items-center gap-1.5">
                            <span>إعادة ترتيب رقم تذييل الصفحة تلقائياً</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 rounded font-bold font-mono">
                              1 من {selectedPageMetas.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            عند تحديد صفحات معينة، سيتم تسلسل أرقام التذييل (1 من {selectedPageMetas.length}، 2 من {selectedPageMetas.length}...) بناءً على الصفحات المحددة فقط.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Show page numbers in footer toggle */}
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                      <input
                        type="checkbox"
                        checked={pageRangeConfig.showPageNumbers}
                        onChange={(e) =>
                          setPageRangeConfig((prev) => ({
                            ...prev,
                            showPageNumbers: e.target.checked,
                          }))
                        }
                        className="rounded accent-blue-700 w-4 h-4 cursor-pointer"
                      />
                      <span>إظهار الترقيم أسفل الورقة (تذييل الصفحة)</span>
                    </label>
                  </div>

                  {/* SECTION 3: Header & Office Profile */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-black text-slate-800 dark:text-slate-200 text-xs block">
                      عناصر ترويسة وهوية المستند:
                    </label>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={officeProfile.showMainOfficeAddress !== false}
                          onChange={(e) =>
                            handleSaveOfficeProfile({
                              ...officeProfile,
                              showMainOfficeAddress: e.target.checked,
                            })
                          }
                          className="rounded accent-blue-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>المقر الرئيسي</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={officeProfile.showBranchOfficeAddress !== false}
                          onChange={(e) =>
                            handleSaveOfficeProfile({
                              ...officeProfile,
                              showBranchOfficeAddress: e.target.checked,
                            })
                          }
                          className="rounded accent-indigo-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>فرع المكتب</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={officeProfile.showOfficePhones !== false}
                          onChange={(e) =>
                            handleSaveOfficeProfile({
                              ...officeProfile,
                              showOfficePhones: e.target.checked,
                            })
                          }
                          className="rounded accent-emerald-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>هواتف المكتب</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={showHeaderClientBanner}
                          onChange={(e) => setShowHeaderClientBanner(e.target.checked)}
                          className="rounded accent-purple-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>شريط المنشأة</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsHeaderModalOpen(true)}
                      className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>تخصيص بيانات الترويسة وتوقيع الشركاء...</span>
                    </button>
                  </div>

                  {/* SECTION 4: Print Order Summary */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700">
                      ملخص مواصفات أمر الطباعة:
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">الأوراق المحددة:</span>
                      <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                        {selectedPageMetas.length} من أصل {totalPages} ورقة
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">حجم الورقة:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">A4 (210 × 297 mm)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">الاتجاه:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">رأسي (Portrait)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">الدقة والجودة:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">High-Res 300 DPI Vector</span>
                    </div>
                  </div>
                </div>

                {/* Sidebar Bottom Footer */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    اختصار: Ctrl+P
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    إغلاق المعاينة
                  </button>
                </div>
              </aside>

              {/* MAIN DOCUMENT PREVIEW DESK: Fills the rest of the screen (عرض الشاشة الخاصة بالطباعة بباقي الشاشة) */}
              <main className="flex-1 h-full min-h-0 flex flex-col bg-slate-200/90 dark:bg-slate-950 overflow-hidden">
                {/* Preview Top Navigation & View Toolbar */}
                <div className="p-2.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 no-print z-10">
                  {/* Right: Page Navigation Controls & Current Page Title */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                      <button
                        type="button"
                        disabled={activePreviewPage <= 1}
                        onClick={() => scrollToPage(Math.max(1, activePreviewPage - 1))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                        title="الصفحة السابقة"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 font-mono font-black text-blue-700 dark:text-blue-300 text-xs">
                        ص {activePreviewPage} من {effectiveTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={activePreviewPage >= effectiveTotalPages}
                        onClick={() => scrollToPage(Math.min(effectiveTotalPages, activePreviewPage + 1))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dynamic Active Page Title Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold truncate max-w-xs md:max-w-md">
                      <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                      <span className="truncate">
                        {selectedPageMetas[activePreviewPage - 1]?.title || allPageMetas.find((p) => p.pageNumber === activePreviewPage)?.title || 'المعاينة الحية A4'}
                      </span>
                    </div>
                  </div>

                  {/* Left: Zoom Controls, Quick Print, Fullscreen & Close */}
                  <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        title="تصغير المعاينة"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(100)}
                        className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs hover:text-blue-600 cursor-pointer"
                        title="إعادة ضبط المقياس 100%"
                      >
                        {zoomLevel}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        title="تكبير المعاينة"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Print Button */}
                    <button
                      type="button"
                      onClick={handlePrintDossier}
                      className="hidden sm:flex px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة A4</span>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsModalFullscreen(!isModalFullscreen)}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title={isModalFullscreen ? 'استعادة الحجم الطبيعي' : 'ملء الشاشة'}
                    >
                      {isModalFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(false)}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="إغلاق المعاينة"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Realistic A4 Document Canvas */}
                <div
                  ref={previewScrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 print:p-0 bg-slate-200/90 dark:bg-slate-950 flex justify-center"
                >
                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out',
                      width: `${100 * (100 / Math.max(40, zoomLevel))}%`,
                      minWidth: 'fit-content',
                    }}
                    className="flex justify-center"
                  >
                    <CreditBatchPrintDocument
                      printScope={printScope}
                      selectedYear={selectedYear}
                      yearsList={yearsList}
                      customYearsList={batchSelectedYears}
                      yearsData={yearsData}
                      computedData={computedData}
                      officeProfile={officeProfile}
                      assetCategories={assetCategories}
                      adminExpenseItems={adminExpenses}
                      notesList={supplementaryNotes}
                      clientProfile={clientProfile}
                      showHeaderClientBanner={showHeaderClientBanner}
                      pageRangeConfig={pageRangeConfig}
                      periodStartDate={startDate}
                      periodEndDate={endDate}
                      periodLabel={periodDurationText}
                      creditMemoConfig={creditMemoConfig}
                      customCreditRatios={customCreditRatios}
                      creditRatioNames={creditRatioNames}
                      hiddenCreditRatioIds={hiddenCreditRatioIds}
                    />
                  </div>
                </div>
              </main>
            </div>
          </div>
        );
      })()}

      {/* CLIENT PROFILE MODAL */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    تعديل وتحديد بيانات المنشأة والعميل الممول
                  </h3>
                  <p className="text-xs text-slate-500">
                    تنعكس هذه البيانات تلقائياً في ترويسات جميع القوائم وتقرير المراقب والموقف الضريبي والتأميني.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets from Client Archive */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 block">
                  استيراد واختيار من الشركات المسجلة بالأرشيف:
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCompanyModalInSimulatorOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة وتأسيس شركة جديدة</span>
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {state.clients && state.clients.length > 0 ? (
                  state.clients.map((cl) => (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => applyClientRecordToProfile(cl)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      {cl.name}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">لا توجد شركات إضافية مسجلة حالياً</span>
                )}
              </div>
            </div>

            {/* Client Profile Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">
                  اسم الشركة / المنشأة بالكامل:
                </label>
                <input
                  type="text"
                  value={clientProfile.companyName}
                  onChange={(e) => setClientProfile({ ...clientProfile, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الشكل القانوني:</label>
                <input
                  type="text"
                  value={clientProfile.legalForm}
                  onChange={(e) => setClientProfile({ ...clientProfile, legalForm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم السجل التجاري:</label>
                <input
                  type="text"
                  value={clientProfile.commercialRegNo}
                  onChange={(e) => setClientProfile({ ...clientProfile, commercialRegNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم التسجيل الضريبي (البطاقة الضريبية):</label>
                <input
                  type="text"
                  value={clientProfile.taxRegNo}
                  onChange={(e) => setClientProfile({ ...clientProfile, taxRegNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">مأمورية الضرائب المختصة:</label>
                <input
                  type="text"
                  value={clientProfile.taxOffice}
                  onChange={(e) => setClientProfile({ ...clientProfile, taxOffice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الرقم التأميني للمنشأة ومكتب التأمينات:</label>
                <input
                  type="text"
                  value={clientProfile.socialInsuranceNo}
                  onChange={(e) => setClientProfile({ ...clientProfile, socialInsuranceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رأس المال المصدر والمدفوع (ج.م):</label>
                <input
                  type="number"
                  value={clientProfile.capital || 25000000}
                  onChange={(e) => setClientProfile({ ...clientProfile, capital: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">عنوان المقر الرئيسي والنشاط الفعلي:</label>
                <input
                  type="text"
                  value={clientProfile.activity}
                  onChange={(e) => setClientProfile({ ...clientProfile, activity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                حفظ واعتماد في القوائم والمستندات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Company Add Modal */}
      <QuickCompanyModal
        isOpen={isQuickCompanyModalInSimulatorOpen}
        onClose={() => setIsQuickCompanyModalInSimulatorOpen(false)}
        onCompanyCreated={(newCl) => {
          applyClientRecordToProfile(newCl);
        }}
      />

      {/* Flexible Print Header & Office Profile Customizer Modal */}
      <PrintHeaderCustomizerModal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        officeProfile={officeProfile}
        onSaveOfficeProfile={handleSaveOfficeProfile}
        clientProfile={clientProfile}
        onSaveClientProfile={setClientProfile}
        showHeaderClientBanner={showHeaderClientBanner}
        onToggleShowHeaderClientBanner={setShowHeaderClientBanner}
        onApplyAndPrint={() => {
          setIsHeaderModalOpen(false);
          setPrintScope('COMPLETE_DOSSIER');
          setIsPrintModalOpen(true);
        }}
        sampleDocumentTitle={
          activeTab === 'STATEMENTS'
            ? 'القوائم المالية والحسابات الختامية المقارنة'
            : activeTab === 'PROFIT_DIST'
            ? 'مشروع ومذكرة توزيع الأرباح المقترحة'
            : activeTab === 'AUDITOR_REPORT'
            ? 'تقرير مراقب الحسابات المستقل المعتمد'
            : activeTab === 'TAX_CERT'
            ? 'شهادة الموقف الضريبي والتأميني'
            : 'الملف الائتماني والتقارير المالية المعتمدة'
        }
        sampleYear={selectedYear}
      />

      {/* Critical System Purge Modal */}
      <PurgeDatabaseModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onPurgeComplete={() => {
          handleResetSimulatorDefaults();
        }}
      />

      {/* Excel 2-Way Bridge Modal */}
      <CreditExcelBridgeModal
        isOpen={isExcelBridgeModalOpen}
        onClose={() => setIsExcelBridgeModalOpen(false)}
        yearsList={yearsList}
        yearsData={yearsData}
        clientName={clientProfile.companyName}
        onImportSuccess={handleImportExcelSuccess}
      />
    </div>
  );
};
