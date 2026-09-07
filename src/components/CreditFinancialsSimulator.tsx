import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
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
} from 'lucide-react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import { OfficialReportHeader } from './common/OfficialReportHeader';
import { exportElementToPdf, exportElementToImage } from '../utils/certifiedDocumentExporter';
import { CreditYearlyEditor, FiscalYearData } from './credit/CreditYearlyEditor';
import { CreditFinancialStatementsTab } from './credit/CreditFinancialStatementsTab';
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
import { CreditScoringKpisTab } from './credit/CreditScoringKpisTab';
import {
  CreditNotesTab,
  SupplementaryNoteItem,
  DEFAULT_SUPPLEMENTARY_NOTES,
} from './credit/CreditNotesTab';
import { CreditBatchPrintDocument, CreditPrintScope, ClientProfileData } from './credit/CreditBatchPrintDocument';
import { PageRangeSelector, PageRangeConfig } from './common/PageRangeSelector';
import { PrintHeaderCustomizerModal, ExtendedOfficeProfile } from './credit/PrintHeaderCustomizerModal';
import { db } from '../db/localDatabase';
import { CompanyHeaderSelector } from './common/CompanyHeaderSelector';
import { QuickCompanyModal } from './common/QuickCompanyModal';
import { UnifiedScreenCard } from './common/UnifiedScreenCard';
import { ActionMenu } from './common/ActionMenu';
import { ClientArchiveRecord } from '../types';
import * as XLSX from 'xlsx';

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

  // Initial Multi-Year Fiscal Assumptions
  const [yearsData, setYearsData] = useState<Record<number, FiscalYearData>>({
    2026: {
      year: 2026,
      sales: 15000000,
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
    },
    2025: {
      year: 2025,
      sales: 12700000,
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
    },
    2024: {
      year: 2024,
      sales: 11000000,
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
    },
  });

  // Print Dialog State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<CreditPrintScope>('ALL_YEARS_BATCH');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pageRangeConfig, setPageRangeConfig] = useState<PageRangeConfig>({
    mode: 'ALL',
    fromPage: 1,
    toPage: 3,
    customPagesString: '',
    showPageNumbers: true,
  });

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

        .print-page, .page-break {
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          margin: 0 0 10mm 0 !important;
          padding: 0 !important;
        }

        .print-page:last-child, .page-break:last-child {
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

  // Dynamic Full Financial Computations with DIRECT LINKING to Fixed Assets & Admin Expenses
  const computedData: Record<number, any> = {};

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

    const sales = d.sales || 10000000;
    const cogs = (sales * d.cogsRatio) / 100;
    const grossProfit = sales - cogs;

    // DIRECT LINK 1: Calculate Admin & General Expenses directly from Admin Expenses Schedule
    const linkedAdminExpSum = adminExpenses.reduce(
      (sum, item) => sum + (item.valuesByYear?.[yr] || 0),
      0
    );
    const adminExp =
      linkedAdminExpSum > 0 ? linkedAdminExpSum : (sales * d.adminExpRatio) / 100;

    const sellingExp = (sales * d.sellingExpRatio) / 100;
    const ebitda = grossProfit - adminExp - sellingExp;

    // DIRECT LINK 2: Calculate Net Fixed Assets and Depreciation directly from Fixed Assets Schedule
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

    const netFixedAssets =
      linkedNetFixedAssetsSum > 0
        ? linkedNetFixedAssetsSum
        : (sales * d.fixedAssetsRatio) / 100;

    const depreciation =
      linkedDepExpenseSum > 0
        ? linkedDepExpenseSum
        : (sales * d.fixedAssetsRatio * 0.1) / 100;

    const ebit = ebitda - depreciation;
    const financeExp = (sales * d.financeExpRatio) / 100;
    const ebt = ebit - financeExp;
    const tax = Math.max(0, (ebt * d.taxRate) / 100);
    const netProfit = ebt - tax;

    const cash = (sales * d.cashRatio) / 100;
    const receivables = (sales * d.receivablesRatio) / 100;
    const inventory = (sales * d.inventoryRatio) / 100;
    const otherDebit = sales * 0.03;
    const totalCurrentAssets = cash + receivables + inventory + otherDebit;

    const projectsInProgress = sales * 0.04;
    const totalNonCurrentAssets = netFixedAssets + projectsInProgress;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const suppliers = (sales * d.suppliersRatio) / 100;
    const shortLoans = (sales * d.shortLoansRatio) / 100;
    const otherCurrentLiab = sales * 0.04;
    const totalCurrentLiabilities = suppliers + shortLoans + otherCurrentLiab;

    const longLoans = (sales * d.longLoansRatio) / 100;
    const totalLiabilities = totalCurrentLiabilities + longLoans;

    // Total Equity allows negative values (عجز في حقوق الملكية بسبب الخسائر المرحلة)
    const totalEquity = totalAssets - totalLiabilities;
    const baseCapital = clientProfile.capital || 10000000;
    const paidUpCapital = totalEquity >= baseCapital ? baseCapital : Math.max(100000, baseCapital);
    const legalReserve = totalEquity > baseCapital ? Math.round((totalEquity - baseCapital) * 0.1) : 0;
    const retainedEarningsAndProfit = totalEquity - paidUpCapital - legalReserve;
    const totalEquityAndLiabilities = totalLiabilities + totalEquity;

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

    computedData[yr] = {
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
      longLoans,
      totalLiabilities,
      totalEquity,
      paidUpCapital,
      legalReserve,
      retainedEarningsAndProfit,
      totalEquityAndLiabilities,
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

  const navTabs: { id: SimulatorTab; label: string; icon: any }[] = [
    { id: 'STATEMENTS', label: '1. القوائم المالية المقارنة (المركز والدخل والتدفقات)', icon: Scale },
    { id: 'PROFIT_DIST', label: '2. مشروع ومذكرة توزيع الأرباح', icon: Award },
    { id: 'AUDITOR_REPORT', label: '3. تقرير مراقب الحسابات المعتمد (ESA)', icon: FileCheck2 },
    { id: 'TAX_CERT', label: '4. شهادة الموقف الضريبي والتأميني', icon: FileBadge },
    { id: 'FIXED_ASSETS', label: '5. جدول إهلاك الأصول الثابتة', icon: Building },
    { id: 'ADMIN_EXPENSES', label: '6. جدول المصروفات الإدارية والعمومية', icon: FileSpreadsheet },
    { id: 'NOTES', label: '7. الإيضاحات المتممة للقوائم (Rich Text)', icon: BookOpen },
    { id: 'KPIS', label: '8. لوحة التعديل والنسب المتقدمة', icon: Sliders },
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

        {/* Compact Streamlined Year Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
          {yearsList.map((yr) => {
            const isSelected = selectedYear === yr;
            const isBatchIncluded = batchSelectedYears.includes(yr);
            const data = computedData[yr] || {};

            return (
              <div
                key={yr}
                onClick={() => setSelectedYear(yr)}
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
            supplementaryNotes={supplementaryNotes}
            onUpdateNotesList={setSupplementaryNotes}
            assetCategories={assetCategories}
            adminExpenses={adminExpenses}
          />
        )}

        {activeTab === 'PROFIT_DIST' && (
          <CreditProfitDistributionTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            supplementaryNotes={supplementaryNotes}
            onUpdateNotesList={setSupplementaryNotes}
          />
        )}

        {activeTab === 'AUDITOR_REPORT' && (
          <CreditAuditorReportTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            clientProfile={clientProfile}
          />
        )}

        {activeTab === 'TAX_CERT' && (
          <CreditTaxCertificateTab
            yearsList={yearsList}
            computedData={computedData}
            officeProfile={officeProfile}
            clientProfile={clientProfile}
          />
        )}

        {activeTab === 'FIXED_ASSETS' && (
          <CreditFixedAssetsTab
            yearsList={yearsList}
            computedData={computedData}
            assetCategories={assetCategories}
            onUpdateAssetCategories={setAssetCategories}
            onResetAssets={() => setAssetCategories(DEFAULT_ASSET_CATEGORIES)}
          />
        )}

        {activeTab === 'ADMIN_EXPENSES' && (
          <CreditAdminExpensesTab
            yearsList={yearsList}
            computedData={computedData}
            expenseItems={adminExpenses}
            onUpdateExpenseItems={setAdminExpenses}
            onResetExpenses={() => setAdminExpenses(DEFAULT_ADMIN_EXPENSES)}
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
          />
        )}

        {activeTab === 'KPIS' && (
          <CreditScoringKpisTab
            yearsData={yearsData}
            yearsList={yearsList}
            computedData={computedData}
            companyName={clientProfile.companyName}
          />
        )}
      </div>

      {/* ADVANCED PRINT & BATCH PRINT MODAL (وحدة الطباعة والتصدير المجمعة) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto print:z-auto">
          <div className="bg-white w-full max-w-5xl h-[92vh] print:h-auto print:max-w-none print:w-full rounded-3xl print:rounded-none border border-slate-200 print:border-none shadow-2xl print:shadow-none flex flex-col p-5 sm:p-6 print:p-0 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    مركز الطباعة المجمعة والتصدير المعتمد (Batch Printing Manager)
                  </h3>
                  <p className="text-xs text-slate-500">
                    حدد نطاق الطباعة ومحتوى المستندات لتوليد ملف طباعة موحد أو تصدير PDF لكافة السنوات المحددة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs no-print">
              <span className="font-bold text-slate-700">نطاق المستندات:</span>
              <button
                type="button"
                onClick={() => {
                  setPrintScope('ALL_YEARS_BATCH');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: yearsList.length,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'ALL_YEARS_BATCH'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                دفعة القوائم المالية لكافة السنوات ({yearsList.join(' - ')})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('COMPLETE_DOSSIER');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 8,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'COMPLETE_DOSSIER'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                الملف الائتماني الشامل (تقرير + قوائم + إهلاك + إيضاحات)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('SELECTED_YEAR');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'SELECTED_YEAR'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                السنة النشطة فقط ({selectedYear})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('PROFIT_DIST_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'PROFIT_DIST_ONLY'
                    ? 'bg-purple-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                مشروع توزيع الأرباح فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('TAX_CERT_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'TAX_CERT_ONLY'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                الشهادة والموقف الضريبي والتأميني فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('AUDITOR_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'AUDITOR_ONLY'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                تقرير مراقب الحسابات فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('FIXED_ASSETS_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'FIXED_ASSETS_ONLY'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                جدول إهلاك الأصول فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('GA_EXPENSES_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'GA_EXPENSES_ONLY'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                جدول المصروفات الإدارية فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintScope('NOTES_ONLY');
                  setPageRangeConfig((prev) => ({
                    ...prev,
                    fromPage: 1,
                    toPage: 1,
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printScope === 'NOTES_ONLY'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                الإيضاحات المتممة فقط
              </button>
            </div>

            {/* Quick Header Flexibility Controls for Printing & Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-blue-50/80 dark:bg-slate-800/80 rounded-2xl border border-blue-200/80 dark:border-slate-700 text-xs no-print">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>التحكم المرن في ترويسة المستندات:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsHeaderModalOpen(true)}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                >
                  <span>تخصيص الترويسة ومقرات المكتب وبيانات المنشأة</span>
                </button>

                <div className="h-4 w-px bg-blue-200 dark:bg-slate-700 hidden sm:block" />

                {/* Quick Toggles */}
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
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

                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
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

                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
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

                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={showHeaderClientBanner}
                    onChange={(e) => setShowHeaderClientBanner(e.target.checked)}
                    className="rounded accent-purple-700 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>شريط بيانات المنشأة</span>
                </label>
              </div>

              <div className="text-[11px] font-mono text-blue-900 dark:text-blue-300 font-bold hidden md:block">
                نمط الترويسة: {officeProfile.headerStyle === 'compact' ? 'مدمج وموجز' : officeProfile.headerStyle === 'formal-classic' ? 'رسمي كلاسيكي مؤطر' : 'عصري قياسي'}
              </div>
            </div>

            {/* Page Range Flexible Controller (From Page X to Page Y) */}
            {(() => {
              // Calculate estimated total pages based on current print scope
              let totalPages = 1;
              let pageTitles: { pageNumber: number; title: string }[] = [];
              if (printScope === 'COMPLETE_DOSSIER') {
                totalPages = 8;
                pageTitles = [
                  { pageNumber: 1, title: 'الغلاف الرسمي الشامل' },
                  { pageNumber: 2, title: `القوائم المالية لسنة ${selectedYear}` },
                  { pageNumber: 3, title: 'تقرير مراقب الحسابات المستقل' },
                  { pageNumber: 4, title: `مشروع وتوزيع الأرباح لسنة ${selectedYear}` },
                  { pageNumber: 5, title: `جدول حركة وإهلاك الأصول الثابتة` },
                  { pageNumber: 6, title: `كشف المصروفات العمومية والإدارية` },
                  { pageNumber: 7, title: `الإيضاحات المتممة للقوائم المالية` },
                  { pageNumber: 8, title: `شهادة الموقف الضريبي والتأميني` },
                ];
              } else if (printScope === 'ALL_YEARS_BATCH') {
                totalPages = yearsList.length;
                pageTitles = yearsList.map((y, idx) => ({
                  pageNumber: idx + 1,
                  title: `القوائم المالية لسنة ${y} م`,
                }));
              } else if (printScope === 'CUSTOM_RANGE_BATCH') {
                totalPages = Math.max(1, batchSelectedYears.length);
                pageTitles = batchSelectedYears.map((y, idx) => ({
                  pageNumber: idx + 1,
                  title: `القوائم المالية لسنة ${y} م`,
                }));
              } else {
                totalPages = 1;
                pageTitles = [{ pageNumber: 1, title: 'الصفحة المستهدفة للطباعة' }];
              }

              return (
                <PageRangeSelector
                  totalPages={totalPages}
                  config={{
                    ...pageRangeConfig,
                    toPage: Math.min(pageRangeConfig.toPage, totalPages) || totalPages,
                  }}
                  onChange={(newCfg) => setPageRangeConfig(newCfg)}
                  pageTitles={pageTitles}
                  className="no-print"
                />
              );
            })()}

            {/* Scrollable Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 print:p-0 bg-slate-100 print:bg-white rounded-2xl print:rounded-none border border-slate-200 print:border-none">
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
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
              <span className="text-xs text-slate-500">
                يمكنك التصدير كملف PDF عالي الدقة (jspdf + html2canvas) أو صورة PNG أو الطباعة المباشرة على ورق A4.
              </span>
              <div className="flex items-center gap-2 flex-wrap">
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
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isExportingPdf ? 'جارِ التصدير...' : 'تصدير PDF (jspdf)'}</span>
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
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>تصدير PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  بدء الطباعة الآن (Print A4)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
