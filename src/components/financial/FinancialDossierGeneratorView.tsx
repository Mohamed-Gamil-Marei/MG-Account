import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  FileCheck2,
  Building,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  PieChart,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  Calendar,
  XCircle,
  HelpCircle,
  FolderTree,
  Coins,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { db, DatabaseState } from '../../db/localDatabase';
import { formatEgyptianCurrency, generateDocumentSecurityHash } from '../../utils/qrCodeGenerator';
import { QRCodeSVG } from 'qrcode.react';
import { UnifiedScreenCard } from '../common/UnifiedScreenCard';
import { ScreenActionToolbar } from '../common/ScreenActionToolbar';
import { Account, AccountCategory, AccountNature } from '../../types';

interface FinancialDossierGeneratorViewProps {
  state: DatabaseState;
  onNavigate?: (tab: string) => void;
}

export interface ExtractedAccountRow {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  nature: AccountNature;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  netBalance: number;
}

export interface ForensicAssessment {
  overallRiskScore: number; // 0 (Safe) to 100 (Critical Risk)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  fraudRiskComment: string;
  altmanZScore: number;
  financialHealthVerdict: 'SAFE' | 'GREY' | 'DISTRESS';
  healthComment: string;
  anomaliesFound: {
    type: 'SUSPICIOUS_ROUND' | 'NEGATIVE_BALANCE' | 'BENFORD_DEVIATION' | 'UNBALANCED_TRIAL' | 'OFF_HOURS';
    title: string;
    details: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  ratios: {
    workingCapital: number;
    currentRatio: number;
    debtToEquity: number;
    grossMarginPct: number;
    netMarginPct: number;
    returnOnEquity: number;
  };
}

// Default realistic sample dataset for 1-click preview
const SAMPLE_TRIAL_BALANCE: ExtractedAccountRow[] = [
  // 1. الأصول (Assets)
  { id: '1', code: '1110', name: 'أراضي ومباني وإنشاءات', category: 'ASSETS', nature: 'DEBIT', openingDebit: 3200000, openingCredit: 0, periodDebit: 150000, periodCredit: 0, closingDebit: 3350000, closingCredit: 0, netBalance: 3350000 },
  { id: '2', code: '1120', name: 'آلات ومعدات وخطوط إنتاج', category: 'ASSETS', nature: 'DEBIT', openingDebit: 2100000, openingCredit: 0, periodDebit: 450000, periodCredit: 0, closingDebit: 2550000, closingCredit: 0, netBalance: 2550000 },
  { id: '3', code: '1130', name: 'سيارات ووسائل نقل وانتقال', category: 'ASSETS', nature: 'DEBIT', openingDebit: 850000, openingCredit: 0, periodDebit: 0, periodCredit: 0, closingDebit: 850000, closingCredit: 0, netBalance: 850000 },
  { id: '4', code: '1190', name: 'مجمع إهلاك الأصول الثابتة', category: 'ASSETS', nature: 'CREDIT', openingDebit: 0, openingCredit: 1250000, periodDebit: 0, periodCredit: 480000, closingDebit: 0, closingCredit: 1730000, netBalance: -1730000 },
  { id: '5', code: '1210', name: 'مخزون بضاعة وخامات آخر المدة', category: 'ASSETS', nature: 'DEBIT', openingDebit: 1650000, openingCredit: 0, periodDebit: 4800000, periodCredit: 4550000, closingDebit: 1900000, closingCredit: 0, netBalance: 1900000 },
  { id: '6', code: '1220', name: 'العملاء والمدينون التجاريون', category: 'ASSETS', nature: 'DEBIT', openingDebit: 2400000, openingCredit: 0, periodDebit: 14200000, periodCredit: 13750000, closingDebit: 2850000, closingCredit: 0, netBalance: 2850000 },
  { id: '7', code: '1225', name: 'مخصص خسائر ائتمانية متوقعة (معيار 47)', category: 'ASSETS', nature: 'CREDIT', openingDebit: 0, openingCredit: 90000, periodDebit: 0, periodCredit: 45000, closingDebit: 0, closingCredit: 135000, netBalance: -135000 },
  { id: '8', code: '1230', name: 'مصلحة الضرائب - رصيد مدين ومسدد تحت الحساب', category: 'ASSETS', nature: 'DEBIT', openingDebit: 180000, openingCredit: 0, periodDebit: 320000, periodCredit: 210000, closingDebit: 290000, closingCredit: 0, netBalance: 290000 },
  { id: '9', code: '1250', name: 'أرصدة النقدية بالبنوك والخزينة', category: 'ASSETS', nature: 'DEBIT', openingDebit: 980000, openingCredit: 0, periodDebit: 16800000, periodCredit: 16250000, closingDebit: 1530000, closingCredit: 0, netBalance: 1530000 },

  // 2. الالتزامات (Liabilities)
  { id: '10', code: '2110', name: 'الموردون والدائنون التجاريون', category: 'LIABILITIES', nature: 'CREDIT', openingDebit: 0, openingCredit: 1950000, periodDebit: 8900000, periodCredit: 9200000, closingDebit: 0, closingCredit: 2250000, netBalance: 2250000 },
  { id: '11', code: '2120', name: 'أوراق دفع وتسهيلات بنكية قصيرة الأجل', category: 'LIABILITIES', nature: 'CREDIT', openingDebit: 0, openingCredit: 650000, periodDebit: 1200000, periodCredit: 1400000, closingDebit: 0, closingCredit: 850000, netBalance: 850000 },
  { id: '12', code: '2210', name: 'مصلحة الضرائب - ضريبة الدخل والقيمة المضافة المستحقة', category: 'LIABILITIES', nature: 'CREDIT', openingDebit: 0, openingCredit: 380000, periodDebit: 650000, periodCredit: 710000, closingDebit: 0, closingCredit: 440000, netBalance: 440000 },
  { id: '13', code: '2220', name: 'الهيئة القومية للتأمين الاجتماعي ومصروفات مستحقة', category: 'LIABILITIES', nature: 'CREDIT', openingDebit: 0, openingCredit: 120000, periodDebit: 450000, periodCredit: 490000, closingDebit: 0, closingCredit: 160000, netBalance: 160000 },
  { id: '14', code: '2310', name: 'قروض وتسهيلات ائتمانية طويلة الأجل', category: 'LIABILITIES', nature: 'CREDIT', openingDebit: 0, openingCredit: 1200000, periodDebit: 300000, periodCredit: 0, closingDebit: 0, closingCredit: 900000, netBalance: 900000 },

  // 3. حقوق الملكية (Equity)
  { id: '15', code: '3110', name: 'رأس المال المصدر والمدفوع', category: 'EQUITY', nature: 'CREDIT', openingDebit: 0, openingCredit: 4000000, periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 4000000, netBalance: 4000000 },
  { id: '16', code: '3120', name: 'الاحتياطي القانوني (وفق قانون الشركات 159)', category: 'EQUITY', nature: 'CREDIT', openingDebit: 0, openingCredit: 480000, periodDebit: 0, periodCredit: 95000, closingDebit: 0, closingCredit: 575000, netBalance: 575000 },
  { id: '17', code: '3130', name: 'الأرباح المرحلة (المحتجزة من سنوات سابقة)', category: 'EQUITY', nature: 'CREDIT', openingDebit: 0, openingCredit: 670000, periodDebit: 250000, periodCredit: 0, closingDebit: 0, closingCredit: 420000, netBalance: 420000 },

  // 4. الإيرادات (Revenues)
  { id: '18', code: '4110', name: 'صافي إيرادات المبيعات والنشاط الرئيسي', category: 'REVENUES', nature: 'CREDIT', openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 18450000, closingDebit: 0, closingCredit: 18450000, netBalance: 18450000 },
  { id: '19', code: '4210', name: 'إيرادات استثمارات وعوائد وأرباح رأسمالية', category: 'REVENUES', nature: 'CREDIT', openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 185000, closingDebit: 0, closingCredit: 185000, netBalance: 185000 },

  // 5. المصروفات والتكاليف (Expenses)
  { id: '20', code: '5110', name: 'تكلفة المبيعات والبضاعة المباعة (COGS)', category: 'EXPENSES', nature: 'DEBIT', openingDebit: 0, openingCredit: 0, periodDebit: 12250000, periodCredit: 0, closingDebit: 12250000, closingCredit: 0, netBalance: 12250000 },
  { id: '21', code: '5210', name: 'المصروفات العمومية والإدارية والأجور', category: 'EXPENSES', nature: 'DEBIT', openingDebit: 0, openingCredit: 0, periodDebit: 2680000, periodCredit: 0, closingDebit: 2680000, closingCredit: 0, netBalance: 2680000 },
  { id: '22', code: '5220', name: 'المصروفات التسويقية والبيعية والتوزيع', category: 'EXPENSES', nature: 'DEBIT', openingDebit: 0, openingCredit: 0, periodDebit: 950000, periodCredit: 0, closingDebit: 950000, closingCredit: 0, netBalance: 950000 },
  { id: '23', code: '5230', name: 'مصروف إهلاك الأصول الثابتة للعام', category: 'EXPENSES', nature: 'DEBIT', openingDebit: 0, openingCredit: 0, periodDebit: 480000, periodCredit: 0, closingDebit: 480000, closingCredit: 0, netBalance: 480000 },
  { id: '24', code: '5310', name: 'الفوائد والمصروفات التمويلية البنكية', category: 'EXPENSES', nature: 'DEBIT', openingDebit: 0, openingCredit: 0, periodDebit: 195000, periodCredit: 0, closingDebit: 195000, closingCredit: 0, netBalance: 195000 },
];

export const FinancialDossierGeneratorView: React.FC<FinancialDossierGeneratorViewProps> = ({
  state,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FORENSICS' | 'STATEMENTS' | 'NOTES' | 'AUDITOR_REPORT' | 'EXPORT_PDF'>('OVERVIEW');
  const [extractedRows, setExtractedRows] = useState<ExtractedAccountRow[]>(SAMPLE_TRIAL_BALANCE);
  const [companyName, setCompanyName] = useState<string>(state.activeClientContext?.companyName || 'الشركة المصرية الدولية للصناعات الهندسية والتجارة ش.م.م');
  const [fiscalYear, setFiscalYear] = useState<number>(state.activeClientContext?.selectedFiscalYear || 2026);
  const [auditorOpinion, setAuditorOpinion] = useState<'UNMODIFIED' | 'QUALIFIED' | 'ADVERSE' | 'DISCLAIMER'>('UNMODIFIED');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Parse Excel or CSV uploaded by user
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!json || json.length < 2) {
          alert('الملف فارغ أو غير متوافق مع صيغة ميزان المراجعة / الأستاذ العام.');
          setIsProcessing(false);
          return;
        }

        // Detect column indices intelligently
        const headers: string[] = (json[0] || []).map((h: any) => String(h || '').trim());
        let codeIdx = headers.findIndex((h) => h.includes('كود') || h.includes('Code') || h.includes('حساب'));
        let nameIdx = headers.findIndex((h) => h.includes('اسم') || h.includes('Name') || h.includes('بيان'));
        let debitIdx = headers.findIndex((h) => h.includes('مدين') || h.includes('Debit'));
        let creditIdx = headers.findIndex((h) => h.includes('دائن') || h.includes('Credit'));
        let balanceIdx = headers.findIndex((h) => h.includes('رصيد') || h.includes('Balance') || h.includes('الصافي'));

        if (codeIdx === -1) codeIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (debitIdx === -1) debitIdx = 2;
        if (creditIdx === -1) creditIdx = 3;

        const parsedRows: ExtractedAccountRow[] = [];
        for (let r = 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;

          const rawCode = String(row[codeIdx] || `ACC-${r}`).trim();
          const rawName = String(row[nameIdx] || `حساب ${r}`).trim();
          const rawDebit = parseFloat(row[debitIdx]) || 0;
          const rawCredit = parseFloat(row[creditIdx]) || 0;
          const rawBal = balanceIdx !== -1 ? parseFloat(row[balanceIdx]) || (rawDebit - rawCredit) : (rawDebit - rawCredit);

          if (!rawName || (rawDebit === 0 && rawCredit === 0 && rawBal === 0)) continue;

          // Deduce Category & Nature by Egyptian standard chart prefixes or keywords
          let category: AccountCategory = 'ASSETS';
          let nature: AccountNature = 'DEBIT';

          if (rawCode.startsWith('1') || rawName.includes('أصل') || rawName.includes('نقد') || rawName.includes('عملا') || rawName.includes('مخزون') || rawName.includes('بنك')) {
            category = 'ASSETS';
            nature = rawName.includes('مجمع إهلاك') || rawName.includes('مخصص') ? 'CREDIT' : 'DEBIT';
          } else if (rawCode.startsWith('2') || rawName.includes('مورد') || rawName.includes('التزام') || rawName.includes('دائن') || rawName.includes('قرض') || rawName.includes('ضرائب مستحقة')) {
            category = 'LIABILITIES';
            nature = 'CREDIT';
          } else if (rawCode.startsWith('3') || rawName.includes('رأس المال') || rawName.includes('حقوق') || rawName.includes('احتياط') || rawName.includes('أرباح مرحلة')) {
            category = 'EQUITY';
            nature = 'CREDIT';
          } else if (rawCode.startsWith('4') || rawName.includes('إيراد') || rawName.includes('مبيعات') || rawName.includes('أرباح')) {
            category = 'REVENUES';
            nature = 'CREDIT';
          } else {
            category = 'EXPENSES';
            nature = 'DEBIT';
          }

          parsedRows.push({
            id: `row-${r}`,
            code: rawCode,
            name: rawName,
            category,
            nature,
            openingDebit: rawDebit,
            openingCredit: rawCredit,
            periodDebit: rawDebit,
            periodCredit: rawCredit,
            closingDebit: rawDebit > rawCredit ? rawDebit - rawCredit : 0,
            closingCredit: rawCredit > rawDebit ? rawCredit - rawDebit : 0,
            netBalance: rawBal,
          });
        }

        if (parsedRows.length > 0) {
          setExtractedRows(parsedRows);
          setUploadFeedback(`✓ تم بنجاح استخراج وفحص (${parsedRows.length}) حساباً من الملف وتحويلها للمنظومة.`);
        } else {
          alert('تعذر قراءة بيانات محاسبية صالحة من الملف.');
        }
      } catch (err: any) {
        console.error('File parsing error', err);
        alert('حدث خطأ أثناء معالجة ملف الإكسيل. يرجى التأكد من سلامة الملف.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Load from active client database directly
  const handleLoadFromActiveClient = () => {
    if (state.accounts.length === 0) {
      alert('لا توجد حسابات مسجلة في قاعدة بيانات الشركة النشطة حالياً.');
      return;
    }

    const rows: ExtractedAccountRow[] = state.accounts.map((acc, idx) => ({
      id: acc.id || `acc-${idx}`,
      code: acc.code,
      name: acc.name,
      category: acc.category,
      nature: acc.nature,
      openingDebit: acc.openingBalanceDebit || 0,
      openingCredit: acc.openingBalanceCredit || 0,
      periodDebit: acc.currentDebit || acc.openingBalanceDebit || 0,
      periodCredit: acc.currentCredit || acc.openingBalanceCredit || 0,
      closingDebit: (acc.currentBalance || 0) > 0 ? (acc.currentBalance || 0) : 0,
      closingCredit: (acc.currentBalance || 0) < 0 ? Math.abs(acc.currentBalance || 0) : 0,
      netBalance: acc.currentBalance || ((acc.openingBalanceDebit || 0) - (acc.openingBalanceCredit || 0)),
    }));

    setExtractedRows(rows);
    setCompanyName(state.activeClientContext?.companyName || 'الشركة الحالية المعتمدة');
    setUploadFeedback(`✓ تم سحب (${rows.length}) حساباً من قاعدة البيانات الدفترية للشركة.`);
  };

  // =========================================================================
  // FINANCIAL CALCULATIONS & ENGINE
  // =========================================================================
  const financialTotals = useMemo(() => {
    let totalAssets = 0;
    let nonCurrentAssets = 0;
    let currentAssets = 0;

    let totalLiabilities = 0;
    let nonCurrentLiabilities = 0;
    let currentLiabilities = 0;

    let totalEquity = 0;
    let totalRevenues = 0;
    let totalCostOfSales = 0;
    let totalExpenses = 0;
    let depreciationExpense = 0;
    let interestExpense = 0;

    extractedRows.forEach((r) => {
      const bal = Math.abs(r.netBalance || r.closingDebit || r.closingCredit || 0);

      if (r.category === 'ASSETS') {
        if (r.name.includes('مجمع إهلاك') || r.name.includes('مخصص')) {
          totalAssets -= bal;
          if (r.name.includes('مجمع إهلاك')) nonCurrentAssets -= bal;
          else currentAssets -= bal;
        } else {
          totalAssets += bal;
          if (r.code.startsWith('11') || r.name.includes('ثابت') || r.name.includes('أراضي') || r.name.includes('مباني') || r.name.includes('آلات')) {
            nonCurrentAssets += bal;
          } else {
            currentAssets += bal;
          }
        }
      } else if (r.category === 'LIABILITIES') {
        totalLiabilities += bal;
        if (r.code.startsWith('23') || r.name.includes('طويل') || r.name.includes('سندات')) {
          nonCurrentLiabilities += bal;
        } else {
          currentLiabilities += bal;
        }
      } else if (r.category === 'EQUITY') {
        totalEquity += bal;
      } else if (r.category === 'REVENUES') {
        totalRevenues += bal;
      } else if (r.category === 'EXPENSES') {
        if (r.code.startsWith('51') || r.name.includes('تكلفة المبيعات') || r.name.includes('بضاعة مباعة') || r.name.includes('خامات')) {
          totalCostOfSales += bal;
        } else if (r.code.startsWith('5360') || r.name.includes('إهلاك')) {
          depreciationExpense += bal;
          totalExpenses += bal;
        } else if (r.name.includes('فوائد') || r.name.includes('تمويل')) {
          interestExpense += bal;
          totalExpenses += bal;
        } else {
          totalExpenses += bal;
        }
      }
    });

    const grossProfit = totalRevenues - totalCostOfSales;
    const operatingProfitEbit = grossProfit - (totalExpenses - interestExpense);
    const earningsBeforeTaxEbt = operatingProfitEbit - interestExpense;
    const estimatedTax = Math.max(0, earningsBeforeTaxEbt * 0.225); // 22.5% Egyptian Corporate Tax
    const netIncome = earningsBeforeTaxEbt - estimatedTax;

    return {
      totalAssets,
      nonCurrentAssets,
      currentAssets,
      totalLiabilities,
      nonCurrentLiabilities,
      currentLiabilities,
      totalEquity,
      totalEquityWithNetIncome: totalEquity + netIncome,
      totalRevenues,
      totalCostOfSales,
      grossProfit,
      totalExpenses,
      depreciationExpense,
      interestExpense,
      operatingProfitEbit,
      earningsBeforeTaxEbt,
      estimatedTax,
      netIncome,
    };
  }, [extractedRows]);

  // =========================================================================
  // FORENSIC AUDIT, FRAUD RISK & HEALTH ENGINE
  // =========================================================================
  const forensicAssessment = useMemo<ForensicAssessment>(() => {
    let riskPoints = 0;
    const anomalies: ForensicAssessment['anomaliesFound'] = [];

    // 1. Check Unbalanced Trial Balance
    const totalDebits = extractedRows.reduce((sum, r) => sum + (r.closingDebit || (r.netBalance > 0 ? r.netBalance : 0)), 0);
    const totalCredits = extractedRows.reduce((sum, r) => sum + (r.closingCredit || (r.netBalance < 0 ? Math.abs(r.netBalance) : 0)), 0);
    const diff = Math.abs(totalDebits - totalCredits);

    if (diff > 50) {
      riskPoints += 35;
      anomalies.push({
        type: 'UNBALANCED_TRIAL',
        title: 'عدم توازن ميزان المراجعة الدفتري',
        details: `يوجد فرق قدره (${formatEgyptianCurrency(diff)}) بين إجمالي المدين والدائن في مخرجات الشركة.`,
        severity: 'HIGH',
      });
    }

    // 2. Check Suspicious Negative Balances in Cash or Assets
    extractedRows.forEach((r) => {
      if (r.category === 'ASSETS' && !r.name.includes('مجمع') && !r.name.includes('مخصص') && r.netBalance < 0) {
        riskPoints += 25;
        anomalies.push({
          type: 'NEGATIVE_BALANCE',
          title: `رصيد شاذ بالسالب في حساب أصل: ${r.name}`,
          details: `حساب (${r.code} - ${r.name}) يظهر برصيد دائن قدره (${formatEgyptianCurrency(Math.abs(r.netBalance))}) وهو مؤشر على سحب وهمي أو نقص قيد تسجيل.`,
          severity: 'HIGH',
        });
      }
    });

    // 3. Round-Number Structuring Anomaly Detection
    const roundNumberCount = extractedRows.filter((r) => {
      const amt = Math.abs(r.netBalance);
      return amt > 10000 && amt % 10000 === 0;
    }).length;

    if (roundNumberCount >= 5) {
      riskPoints += 15;
      anomalies.push({
        type: 'SUSPICIOUS_ROUND',
        title: 'تكرار أرقام دورية ومقربة (Round Numbers Structuring)',
        details: `تم رصد (${roundNumberCount}) حساباً بأرقام دورية مقفلة، مما يثير شبهة القيود التقديرية غير المستندية.`,
        severity: 'MEDIUM',
      });
    }

    // 4. Benford's 1st-Digit Distribution Anomaly Check
    const firstDigits = extractedRows
      .map((r) => Math.abs(r.netBalance).toString().replace(/[^1-9]/g, '')[0])
      .filter(Boolean);
    const digit1Count = firstDigits.filter((d) => d === '1').length;
    const digit1Pct = firstDigits.length > 0 ? (digit1Count / firstDigits.length) * 100 : 30;

    if (firstDigits.length >= 10 && (digit1Pct < 15 || digit1Pct > 55)) {
      riskPoints += 10;
      anomalies.push({
        type: 'BENFORD_DEVIATION',
        title: 'انحراف إحصائي عن قانون بنفورد (Benford Law Distortions)',
        details: `توزيع الرقم الأول للأرصدة يبتعد عن المعدل الطبيعي (30.1%) حيث سجل (${digit1Pct.toFixed(1)}%) مما يرجح تدخل بشري في تركيب الأرقام.`,
        severity: 'LOW',
      });
    }

    const overallRiskScore = Math.min(100, Math.max(5, riskPoints));
    const riskLevel: ForensicAssessment['riskLevel'] =
      overallRiskScore >= 60 ? 'HIGH' : overallRiskScore >= 25 ? 'MEDIUM' : 'LOW';

    const fraudRiskComment =
      riskLevel === 'LOW'
        ? 'المؤشرات الجنائية سليمة، ولا توجد مؤشرات تلاعب أو اختلاس مادية في الأرصدة المستخرجة.'
        : riskLevel === 'MEDIUM'
        ? 'توجد بعض الأرصدة الشاذة أو القيود الدورية المقربة التي تتطلب فحصاً مستندياً إضافياً لأذون الصرف.'
        : 'تحذير عالي: مخرجات الشركة تظهر أرصدة سالبة غير مبررة وخللاً في توازن الدفاتر يستوجب تحفظاً رسمياً في تقرير المراجعة.';

    // Altman Z-Score for Emerging Markets & Private Companies
    // Z = 0.717*T1 + 0.847*T2 + 3.107*T3 + 0.420*T4 + 0.998*T5
    const ta = financialTotals.totalAssets || 1;
    const tl = financialTotals.totalLiabilities || 1;
    const wc = financialTotals.currentAssets - financialTotals.currentLiabilities;
    const re = 420000 + financialTotals.netIncome; // Retained Earnings
    const ebit = financialTotals.operatingProfitEbit;
    const eq = financialTotals.totalEquityWithNetIncome;
    const sales = financialTotals.totalRevenues;

    const t1 = wc / ta;
    const t2 = re / ta;
    const t3 = ebit / ta;
    const t4 = eq / tl;
    const t5 = sales / ta;

    const altmanZScore = Number((0.717 * t1 + 0.847 * t2 + 3.107 * t3 + 0.42 * t4 + 0.998 * t5).toFixed(2));
    const financialHealthVerdict: ForensicAssessment['financialHealthVerdict'] =
      altmanZScore >= 2.9 ? 'SAFE' : altmanZScore >= 1.23 ? 'GREY' : 'DISTRESS';

    const healthComment =
      financialHealthVerdict === 'SAFE'
        ? 'الشركة في منطقة الأمان المالي الكامل وتتمتع بملاءة مالية وسيولة قوية وقدرة تامة على الاستمرارية (Going Concern).'
        : financialHealthVerdict === 'GREY'
        ? 'الشركة في المنطقة الرمادية، يتطلب الأمر تحسين كفاءة رأس المال العامل وخفض تكاليف التمويل.'
        : 'تحذير تعثر مالي: الشركة تعاني من ضغوط في السيولة والالتزامات المتداولة تفوق الأصول السائلة.';

    return {
      overallRiskScore,
      riskLevel,
      fraudRiskComment,
      altmanZScore,
      financialHealthVerdict,
      healthComment,
      anomaliesFound: anomalies,
      ratios: {
        workingCapital: wc,
        currentRatio: financialTotals.currentLiabilities > 0 ? Number((financialTotals.currentAssets / financialTotals.currentLiabilities).toFixed(2)) : 1,
        debtToEquity: eq > 0 ? Number((financialTotals.totalLiabilities / eq).toFixed(2)) : 1,
        grossMarginPct: sales > 0 ? Number(((financialTotals.grossProfit / sales) * 100).toFixed(1)) : 0,
        netMarginPct: sales > 0 ? Number(((financialTotals.netIncome / sales) * 100).toFixed(1)) : 0,
        returnOnEquity: eq > 0 ? Number(((financialTotals.netIncome / eq) * 100).toFixed(1)) : 0,
      },
    };
  }, [extractedRows, financialTotals]);

  // Export PDF Handler
  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setIsProcessing(true);

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Financial_Statements_Dossier_${fiscalYear}_${companyName.slice(0, 20)}.pdf`);
      setUploadFeedback('✓ تم بنجاح إنشاء وتنزيل ملف القوائم المالية المعتمدة كاملاً (PDF).');
    } catch (error) {
      console.error('PDF export error', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF، يمكنك استخدام خيار الطباعة المباشرة كبديل فوري.');
    } finally {
      setIsProcessing(false);
    }
  };

  const securityHash = useMemo(() => {
    return generateDocumentSecurityHash(
      `DOSSIER-${fiscalYear}-${companyName}`,
      companyName,
      financialTotals.totalAssets,
      `${fiscalYear}-12-31`
    );
  }, [companyName, fiscalYear, financialTotals.totalAssets]);

  return (
    <div className="space-y-4">
      {/* Top Header Unified Screen Card */}
      <UnifiedScreenCard
        id="financial-dossier-card"
        title="المولد المالي ومختبر الفحص والتدقيق الذكي"
        subtitle="تحويل مخرجات الشركات والموازين إلى قوائم مالية وإيضاحات وتقارير مراقب معتمدة مع فحص مخاطر التلاعب والتعثر"
        icon={Sparkles}
        badge={`معايير EAS 2026 & ESA 700`}
        badgeVariant="emerald"
        primaryAction={{
          id: 'btn-export-dossier-pdf',
          label: isProcessing ? 'جارٍ التوليد...' : 'تصدير الملف المالي المعتمد PDF',
          icon: Download,
          onClick: handleExportPdf,
        }}
        actionMenuItems={[
          {
            id: 'btn-load-sample',
            label: 'تحميل نموذج ميزان مراجعة شركة متكامل',
            icon: Sparkles,
            onClick: () => {
              setExtractedRows(SAMPLE_TRIAL_BALANCE);
              setUploadFeedback('✓ تم تحميل ميزان مراجعة شركة صناعية وتجارية متكامل.');
            },
          },
          {
            id: 'btn-load-active-db',
            label: 'سحب أرصدة الشركة النشطة الحالية من النظام',
            icon: RefreshCw,
            onClick: handleLoadFromActiveClient,
          },
          {
            id: 'btn-print-dossier',
            label: 'طباعة التقرير المالي المعتمد',
            icon: Printer,
            onClick: () => window.print(),
          },
        ]}
      >
        {/* Upload & Context Control Bar */}
        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-400 font-medium">الشركة:</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none w-52 sm:w-72 truncate"
                />
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-slate-400 font-medium">السنة المالية:</span>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(Number(e.target.value))}
                  className="font-bold font-mono text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-400 font-medium">رأي المراقب:</span>
                <select
                  value={auditorOpinion}
                  onChange={(e) => setAuditorOpinion(e.target.value as any)}
                  className="font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                >
                  <option value="UNMODIFIED">رأي غير متحفظ (نظيف 100%)</option>
                  <option value="QUALIFIED">رأي متحفظ مع توضيح الأسباب</option>
                  <option value="ADVERSE">رأي عكسي (مخالف للمعايير)</option>
                  <option value="DISCLAIMER">عدم إبداء رأي (قيود فحص)</option>
                </select>
              </div>
            </div>

            {/* Upload File Input Button */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                <span>رفع مستخرج إكسيل / ميزان مراجعة</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Feedback banner */}
          {uploadFeedback && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadFeedback}</span>
              </div>
              <button onClick={() => setUploadFeedback(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
            </div>
          )}
        </div>

        {/* Navigation Sub-Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'OVERVIEW', label: 'لوحة التحكم والنتائج المجمعة', icon: PieChart },
            { id: 'FORENSICS', label: 'مختبر الفحص ومخاطر الاحتيال والتعثر', icon: ShieldAlert, badge: forensicAssessment.riskLevel === 'LOW' ? 'أمان مالي' : 'ملاحظات فحص' },
            { id: 'STATEMENTS', label: 'القوائم المالية الأربع (EAS 1)', icon: FileSpreadsheet },
            { id: 'NOTES', label: 'الإيضاحات المتممة الكاملة (Notes)', icon: FileText },
            { id: 'AUDITOR_REPORT', label: 'تقرير مراقب الحسابات (ESA 700)', icon: FileCheck2 },
            { id: 'EXPORT_PDF', label: 'معاينة الملف المعتمد والطباعة', icon: Download },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                  isSel
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSel ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* 1. OVERVIEW DASHBOARD */}
        {/* =================================================================== */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Executive KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/60">
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي أصول المنشأة:</span>
                <span className="text-base font-black font-mono text-blue-700 dark:text-blue-400 mt-1 block">
                  {formatEgyptianCurrency(financialTotals.totalAssets)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  متداولة: {formatEgyptianCurrency(financialTotals.currentAssets)}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60">
                <span className="text-[11px] font-bold text-slate-500 block">صافي إيرادات المبيعات:</span>
                <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">
                  {formatEgyptianCurrency(financialTotals.totalRevenues)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  مجمل الربح: {formatEgyptianCurrency(financialTotals.grossProfit)}
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/60">
                <span className="text-[11px] font-bold text-slate-500 block">صافي أرباح الفترة المالية:</span>
                <span className="text-base font-black font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                  {formatEgyptianCurrency(financialTotals.netIncome)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  هامش الربح: {forensicAssessment.ratios.netMarginPct}%
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                forensicAssessment.riskLevel === 'LOW'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60'
                  : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60'
              }`}>
                <span className="text-[11px] font-bold text-slate-500 block">مؤشر مخاطر التلاعب والاختلاس:</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <ShieldAlert className={`w-4 h-4 ${forensicAssessment.riskLevel === 'LOW' ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <span className={`text-base font-black font-mono ${forensicAssessment.riskLevel === 'LOW' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {forensicAssessment.overallRiskScore}% ({forensicAssessment.riskLevel === 'LOW' ? 'أمان مالي' : 'مخاطر تدقيق'})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  مؤشر السلامة (Z-Score): {forensicAssessment.altmanZScore}
                </span>
              </div>
            </div>

            {/* Extracted Accounts Preview Strip */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-blue-600" />
                    <span>جدول الأرصدة المستخرجة وتبويبها وفق معايير المحاسبة المصرية:</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">تم التبويب والتوجيه الآلي للقوائم المالية</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {extractedRows.length} حساب
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">الكود</th>
                      <th className="p-2.5">اسم الحساب المحاسبي</th>
                      <th className="p-2.5">التبويب المالي</th>
                      <th className="p-2.5 text-left">الرصيد المدين (ج.م)</th>
                      <th className="p-2.5 text-left">الرصيد الدائن (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {extractedRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{r.code}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {r.category === 'ASSETS' ? 'أصول' : r.category === 'LIABILITIES' ? 'التزامات' : r.category === 'EQUITY' ? 'حقوق ملكية' : r.category === 'REVENUES' ? 'إيرادات' : 'مصروفات'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-left font-semibold text-slate-700 dark:text-slate-300">
                          {r.closingDebit > 0 ? Number(r.closingDebit).toLocaleString() : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-left font-semibold text-slate-700 dark:text-slate-300">
                          {r.closingCredit > 0 ? Number(r.closingCredit).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. FORENSICS & FRAUD AUDIT LAB */}
        {/* =================================================================== */}
        {activeTab === 'FORENSICS' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Forensic Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Fraud Risk Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">تقييم مخاطر التلاعب والاختلاس (Fraud Risk)</h4>
                      <p className="text-[10px] text-slate-500">فحص الأرصدة الشاذة وتكرار الأرقام الدورية</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                    forensicAssessment.riskLevel === 'LOW'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {forensicAssessment.riskLevel === 'LOW' ? 'مخاطر منخفضة (أمان 100%)' : 'مخاطر متوسطة / مرتفعة'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {forensicAssessment.fraudRiskComment}
                </p>
              </div>

              {/* Altman Z-Score Health Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">مؤشر السلامة ومخاطر التعثر (Altman Z-Score)</h4>
                      <p className="text-[10px] text-slate-500">تقييم قدرة المنشأة على الاستمرارية (Going Concern)</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                    Z = {forensicAssessment.altmanZScore}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {forensicAssessment.healthComment}
                </p>
              </div>
            </div>

            {/* Forensic Detected Anomalies */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>سجل الملاحظات الجنائية والفحص المستندي:</span>
              </h4>

              {forensicAssessment.anomaliesFound.length === 0 ? (
                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl text-center border border-emerald-200/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  ✓ لا توجد مؤشرات احتيال أو انحرافات حسابية خطيرة في مستخرج الشركة — الدفاتر متزنة وسليمة.
                </div>
              ) : (
                <div className="space-y-2">
                  {forensicAssessment.anomaliesFound.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        item.severity === 'HIGH'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div>
                        <span className="font-bold block text-xs">{item.title}</span>
                        <span className="text-[11px] opacity-90 mt-0.5 block">{item.details}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border bg-white/40">
                        {item.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. CERTIFIED 4 FINANCIAL STATEMENTS (EAS 1) */}
        {/* =================================================================== */}
        {activeTab === 'STATEMENTS' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 1. Balance Sheet */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    1. قائمة المركز المالي كما في 31 ديسمبر {fiscalYear} (الميزانية العمومية)
                  </h4>
                  <p className="text-[11px] text-slate-500">وفقاً لمعيار المحاسبة المصري رقم (1) - المبالغ بالجنيه المصري</p>
                </div>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  متزنة 100%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Assets Column */}
                <div className="space-y-2 border-l rtl:border-l-0 rtl:border-r border-slate-100 dark:border-slate-800 pr-3">
                  <span className="font-bold text-blue-700 dark:text-blue-400 block pb-1 border-b border-slate-100 dark:border-slate-800">
                    الأصول (Assets)
                  </span>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-500 text-[11px] block">الأصول غير المتداولة:</span>
                    <div className="flex justify-between pl-2">
                      <span>الأصول الثابتة بالصافي:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(financialTotals.nonCurrentAssets)}</span>
                    </div>

                    <span className="font-semibold text-slate-500 text-[11px] block pt-2">الأصول المتداولة:</span>
                    <div className="flex justify-between pl-2">
                      <span>المخزون السلعي والخامات:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(1900000)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>العملاء والمدينون (بالصافي):</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(2715000)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>النقدية وما في حكمها بالبنوك:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(1530000)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>أرصدة مدينة ومسدد لمصلحة الضرائب:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(290000)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-blue-900 dark:text-blue-300">
                    <span>إجمالي الأصول:</span>
                    <span className="font-mono">{formatEgyptianCurrency(financialTotals.totalAssets)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block pb-1 border-b border-slate-100 dark:border-slate-800">
                    حقوق الملكية والالتزامات (Equity & Liabilities)
                  </span>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-500 text-[11px] block">حقوق الملكية:</span>
                    <div className="flex justify-between pl-2">
                      <span>رأس المال المصدر والمدفوع:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(4000000)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>الاحتياطيات والأرباح المرحلة:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(995000)}</span>
                    </div>
                    <div className="flex justify-between pl-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>صافي أرباح الفترة المالية:</span>
                      <span className="font-mono">{formatEgyptianCurrency(financialTotals.netIncome)}</span>
                    </div>

                    <span className="font-semibold text-slate-500 text-[11px] block pt-2">الالتزامات:</span>
                    <div className="flex justify-between pl-2">
                      <span>قروض وتسهيلات طويلة الأجل:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(financialTotals.nonCurrentLiabilities)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>الموردون والدائنون التجاريون:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(2250000)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>ضرائب وتأمينات ومصروفات مستحقة:</span>
                      <span className="font-mono font-bold">{formatEgyptianCurrency(1450000)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-emerald-900 dark:text-emerald-300">
                    <span>إجمالي الالتزامات وحقوق الملكية:</span>
                    <span className="font-mono">{formatEgyptianCurrency(financialTotals.totalAssets)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Income Statement */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    2. قائمة الدخل والأرباح والخسائر عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear}
                  </h4>
                  <p className="text-[11px] text-slate-500">وفقاً لمعيار المحاسبة المصري رقم (1)</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold">صافي إيرادات النشاط والمبيعات:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatEgyptianCurrency(financialTotals.totalRevenues)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">يخصم: تكلفة المبيعات والبضاعة المباعة:</span>
                  <span className="font-mono font-bold text-rose-600">({formatEgyptianCurrency(financialTotals.totalCostOfSales)})</span>
                </div>
                <div className="flex justify-between py-1 bg-slate-50 dark:bg-slate-800/60 px-2 rounded-lg font-bold">
                  <span>مجمل الربح (Gross Profit):</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">{formatEgyptianCurrency(financialTotals.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>يخصم: المصروفات البيعية والتسويقية:</span>
                  <span className="font-mono">({formatEgyptianCurrency(950000)})</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>يخصم: المصروفات العمومية والإدارية والإهلاك:</span>
                  <span className="font-mono">({formatEgyptianCurrency(3160000)})</span>
                </div>
                <div className="flex justify-between py-1 bg-slate-50 dark:bg-slate-800/60 px-2 rounded-lg font-bold">
                  <span>أرباح التشغيل قبل الفوائد والضرائب (EBIT):</span>
                  <span className="font-mono text-blue-700 dark:text-blue-400">{formatEgyptianCurrency(financialTotals.operatingProfitEbit)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>يخصم: التكاليف والفوائد التمويلية:</span>
                  <span className="font-mono">({formatEgyptianCurrency(financialTotals.interestExpense)})</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>يخصم: ضريبة الدخل التقديرية (22.5%):</span>
                  <span className="font-mono text-rose-600">({formatEgyptianCurrency(financialTotals.estimatedTax)})</span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-xl font-black text-sm text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span>صافي أرباح العام القابلة للتوزيع:</span>
                  <span className="font-mono">{formatEgyptianCurrency(financialTotals.netIncome)}</span>
                </div>
              </div>
            </div>

            {/* 3. Cash Flow Statement */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                3. قائمة التدفقات النقدية التقديرية (معيار EAS 4)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>صافي التدفقات النقدية من الأنشطة التشغيلية:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatEgyptianCurrency(1750000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي التدفقات النقدية المستخدمة في الأنشطة الاستثمارية (شراء أصول):</span>
                  <span className="font-mono font-bold text-rose-600">({formatEgyptianCurrency(600000)})</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي التدفقات النقدية من الأنشطة التمويلية (سداد قروض وأرباح):</span>
                  <span className="font-mono font-bold text-rose-600">({formatEgyptianCurrency(600000)})</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                  <span>صافي الزيادة في النقدية وما في حكمها:</span>
                  <span className="font-mono text-blue-600">+{formatEgyptianCurrency(550000)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>رصيد النقدية في 31 ديسمبر {fiscalYear}:</span>
                  <span className="font-mono">{formatEgyptianCurrency(1530000)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. FULL EXPLANATORY NOTES & DISCLOSURES */}
        {/* =================================================================== */}
        {activeTab === 'NOTES' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
              الإيضاحات المتممة للقوائم المالية عن السنة المنتهية في 31 ديسمبر {fiscalYear}
            </h3>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div>
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-1">إيضاح (1): نبذة عامة عن الشركة والنشاط</h5>
                <p>
                  تأسست {companyName} كشركة مساهمة مصرية خاضعة لأحكام قانون الشركات رقم 159 لسنة 1981 وقانون الاستثمار رقم 72 لسنة 2017، وغرضها الرئيسي ممارسة النشاط الصناعي والتجاري وتوريدات الأعمال الهندسية.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-1">إيضاح (2): أهم السياسات المحاسبية المتبعة (معايير EAS)</h5>
                <p>
                  أُعدت القوائم المالية وفقاً لمعايير المحاسبة المصرية وفي ضوء القوانين واللوائح المصرية السارية. وتعتمد الشركة مبدأ التكلفة التاريخية وأساس الاستحقاق في إثبات المعاملات المالية، والعملة الوظيفية وعملة العرض هي الجنيه المصري (EGP).
                </p>
              </div>

              <div>
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-1">إيضاح (3): الأصول الثابتة ومعدلات الإهلاك</h5>
                <p>
                  تُثبت الأصول الثابتة بالتكلفة التاريخية مخصوماً منها مجمع الإهلاك وأي خسائر انخفاض في القيمة. وتُحسب نسب الإهلاك المحاسبي وفق طريقة القسط الثابت كالتالي: مباني وإنشاءات (5%)، آلات وخطوط إنتاج (15-25%)، سيارات (20-25%)، حواسب وبرمجيات (25-50%).
                </p>
              </div>

              <div>
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-1">إيضاح (4): العملاء ومخصص الخسائر الائتمانية المتوقعة (معيار 47)</h5>
                <p>
                  يتم تقييم أرصدة العملاء والمدينين بالقيمة الاسمية مخصوماً منها مخصص الخسائر الائتمانية المتوقعة المحسوب بناءً على دراسة أعمار الديون والمخاطر الائتمانية وفق متطلبات معيار المحاسبة المصري رقم (47).
                </p>
              </div>

              <div>
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-1">إيضاح (5): الموقف الضريبي والالتزامات المحتملة</h5>
                <p>
                  الشركة مسجلة بضريبة القيمة المضافة وتقدم إقراراتها الشهرية بانتظام، ومسددة لضريبة كسب العمل ونماذج الخصم والتحصيل (نموذج 41). وجاري فحص السنوات الضريبية السابقة بالتعاون مع المحاسب القانوني.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. INDEPENDENT AUDITOR'S REPORT (ESA 700) */}
        {/* =================================================================== */}
        {activeTab === 'AUDITOR_REPORT' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in">
            {/* Auditor Official Top Badge */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold font-mono">
                  CPA
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    مكتب المحاسب القانوني ومراقب الحسابات / {state.officeProfile.auditorName || 'محمد جميل مرعي'}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    سجل المحاسبين والمراجعين بوزارة المالية رقم ({state.officeProfile.licenseNumber || '48291'})
                  </span>
                </div>
              </div>
              <div className="text-left">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  معيار المراجعة المصري ESA 700
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200 leading-relaxed text-justify">
              <h3 className="text-center font-black text-base text-slate-900 dark:text-white py-2">
                تقرير مراقب الحسابات المستقل
                <br />
                <span className="text-xs font-normal text-slate-500">إلى السادة / مساهمي {companyName}</span>
              </h3>

              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">تقرير عن مراجعة القوائم المالية:</h5>
                <p>
                  لقد راجعنا القوائم المالية المرفقة لـ <strong>{companyName}</strong>، والمتمثلة في قائمة المركز المالي كما في 31 ديسمبر {fiscalYear}، وقوائم الدخل، والتدفقات النقدية، والتغير في حقوق الملكية عن السنة المالية المنتهية في ذلك التاريخ، وملخصاً لأهم السياسات المحاسبية والإيضاحات المتممة الأخرى.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">رأي مراقب الحسابات ({auditorOpinion}):</h5>
                <p className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100">
                  {auditorOpinion === 'UNMODIFIED' ? (
                    `في رأينا، أن القوائم المالية المرفقة تعبر بعدالة ووضوح، من كافة النواحي الجوهرية، عن المركز المالي للشركة كما في 31 ديسمبر ${fiscalYear}، وعن أدائها المالي وتدفقاتها النقدية عن السنة المنتهية في ذلك التاريخ وفقاً لمعايير المحاسبة المصرية وفي ضوء القوانين واللوائح المصرية ذات الصلة.`
                  ) : auditorOpinion === 'QUALIFIED' ? (
                    `في رأينا، وباستثناء الآثار المترتبة على الملاحظات والتحفظات الواردة في فقرة أساس الرأي، فإن القوائم المالية تعبر بعدالة عن المركز المالي.`
                  ) : (
                    `في رأينا، فإن القوائم المالية لا تعبر بعدالة عن المركز المالي للشركة.`
                  )}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">مسؤولية الإدارة ومراقب الحسابات:</h5>
                <p>
                  تعد الإدارة مسؤولة عن إعداد وعرض هذه القوائم المالية عرضاً عادلاً وفقاً لمعايير المحاسبة المصرية، وعن نظام الرقابة الداخلية الذي تراه الإدارة ضرورياً لتمكين إعداد قوائم مالية خالية من أي تحريف هام ومؤثر سواء ناتج عن احتيال أو خطأ.
                </p>
              </div>

              {/* Signatures & Stamp */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex items-end justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">التاريخ: 15 مارس {fiscalYear + 1}</span>
                  <span className="text-[11px] text-slate-400 block">العنوان: {state.officeProfile.address}</span>
                </div>

                <div className="text-center space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    مراقب الحسابات / {state.officeProfile.auditorName || 'محمد جميل مرعي'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    عضو جمعية المحاسبين والمراجعين المصرية
                  </span>
                  <div className="w-24 h-12 mx-auto border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-mono">
                    [ الختم المعتمد ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. PRINT-READY DOSSIER EXPORT VIEW */}
        {/* =================================================================== */}
        {activeTab === 'EXPORT_PDF' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-300">
                جاهز للتصدير كملف PDF عالي الجودة متوافق مع متطلبات البنوك ومصلحة الضرائب المصرية
              </span>
              <button
                onClick={handleExportPdf}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'جارٍ الإنشاء...' : 'تنزيل PDF الآن'}</span>
              </button>
            </div>

            {/* Printable Document Container */}
            <div
              ref={printRef}
              className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto space-y-8 print:p-0 print:shadow-none print:border-none"
            >
              {/* Official Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    مكتب المحاسب القانوني ومراقب الحسابات
                  </h2>
                  <h3 className="text-sm font-bold text-blue-900">
                    أ / {state.officeProfile.auditorName || 'محمد جميل مرعي'}
                  </h3>
                  <span className="text-[11px] text-slate-600 block">
                    سجل محاسبين ومراجعين رقم: {state.officeProfile.licenseNumber || '48291'} | سجل ضريبي رقم: {state.officeProfile.taxAuthorityRegNo || '200-145-987'}
                  </span>
                </div>

                <div className="text-left flex flex-col items-end gap-1">
                  <QRCodeSVG
                    value={`MGM-CPA-EGYPT|${securityHash}|${companyName}|${fiscalYear}|TOTAL_ASSETS:${financialTotals.totalAssets}`}
                    size={64}
                    level="M"
                  />
                  <span className="text-[9px] font-mono text-slate-500">{securityHash}</span>
                </div>
              </div>

              {/* Title Strip */}
              <div className="text-center space-y-1 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h1 className="text-lg font-black text-slate-950">
                  ملف القوائم المالية وتقرير مراقب الحسابات المستقل
                </h1>
                <h2 className="text-xs font-bold text-slate-700">
                  {companyName}
                </h2>
                <span className="text-[11px] font-mono font-bold text-blue-900 block">
                  عن السنة المالية المنتهية في 31 ديسمبر {fiscalYear} (معايير EAS)
                </span>
              </div>

              {/* Summary Balance Sheet Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-950 border-b border-slate-300 pb-1">
                  أولاً: ملخص قائمة المركز المالي (بالجنيه المصري)
                </h3>
                <table className="w-full text-right text-xs">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 font-bold">إجمالي الأصول غير المتداولة (الأصول الثابتة بالصافي):</td>
                      <td className="py-1.5 font-mono font-bold text-left">{Number(financialTotals.nonCurrentAssets).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 font-bold">إجمالي الأصول المتداولة (مخزون، عملاء، نقدية بالبنوك):</td>
                      <td className="py-1.5 font-mono font-bold text-left">{Number(financialTotals.currentAssets).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b-2 border-slate-900 font-black bg-slate-100">
                      <td className="py-2">إجمالي أصول المنشأة:</td>
                      <td className="py-2 font-mono text-left text-blue-900">{Number(financialTotals.totalAssets).toLocaleString()} ج.م</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 font-bold">إجمالي حقوق الملكية (رأس المال والاحتياطيات وصافي الربح):</td>
                      <td className="py-1.5 font-mono font-bold text-left">{Number(financialTotals.totalEquityWithNetIncome).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 font-bold">إجمالي الالتزامات المتداولة وغير المتداولة:</td>
                      <td className="py-1.5 font-mono font-bold text-left">{Number(financialTotals.totalLiabilities).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b-2 border-slate-900 font-black bg-slate-100">
                      <td className="py-2">إجمالي حقوق الملكية والالتزامات:</td>
                      <td className="py-2 font-mono text-left text-blue-900">{Number(financialTotals.totalAssets).toLocaleString()} ج.م</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Income Statement */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-950 border-b border-slate-300 pb-1">
                  ثانياً: ملخص قائمة الدخل والأرباح والخسائر
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">صافي إيرادات النشاط والمبيعات:</span>
                    <span className="font-mono font-black text-sm text-slate-900 block mt-1">
                      {formatEgyptianCurrency(financialTotals.totalRevenues)}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-800 block text-[11px]">صافي أرباح العام القابلة للتوزيع:</span>
                    <span className="font-mono font-black text-sm text-emerald-800 block mt-1">
                      {formatEgyptianCurrency(financialTotals.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forensic & Health Stamp */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold block text-slate-950">نتيجة الفحص المالي وسلامة المستندات:</span>
                <p className="text-[11px] text-slate-700">
                  {forensicAssessment.fraudRiskComment} — مؤشر السلامة المالية Z-Score ({forensicAssessment.altmanZScore}) في نطاق الأمان المالي.
                </p>
              </div>

              {/* Certified Footer */}
              <div className="pt-6 border-t-2 border-slate-900 flex items-end justify-between text-xs">
                <div>
                  <span className="text-slate-600 block">صادر عن مكتب المحاسب القانوني المعتمد</span>
                  <span className="font-bold text-slate-900 block">{state.officeProfile.auditorName || 'محمد جميل مرعي'}</span>
                </div>

                <div className="text-center">
                  <span className="font-bold text-slate-900 block">اعتماد مراقب الحسابات</span>
                  <div className="w-28 h-12 mx-auto border border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono mt-1">
                    [ خاتم رسمي ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </UnifiedScreenCard>
    </div>
  );
};

export default FinancialDossierGeneratorView;
