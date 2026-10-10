import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { fetchWithAuth } from '../../lib/apiClient';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Scale,
  FileText,
  Building,
  Calendar,
  Layers,
  HelpCircle,
  ShieldCheck,
  Edit3,
  Save,
  Printer,
  FileCode,
  Info,
  ChevronDown,
  Check,
  ListFilter,
  Eye,
  Lock,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { Account, JournalEntry, OfficeProfile } from '../../types';
import { OfficialReportHeader } from '../common/OfficialReportHeader';

interface FileReviewWizardViewProps {
  state: DatabaseState;
  onNavigateToTab?: (tabId: string) => void;
}

export interface MappedAccountRow {
  id: string;
  originalCode: string;
  originalName: string;
  debit: number;
  credit: number;
  openingDebit?: number;
  openingCredit?: number;
  netBalance: number; // Positive = Debit, Negative = Credit
  
  // COA Mapping
  mappedCode: string;
  mappedName: string;
  matchType: 'EXACT_CODE' | 'EXACT_NAME' | 'AI_SUGGESTED' | 'MANUAL_MODIFIED' | 'UNMAPPED';
  confidence: number;
  aiReasoning?: string;
  isApproved: boolean;
  isModifiedByAuditor?: boolean;
}

export interface AuditorModificationRecord {
  id: string;
  timestamp: string;
  accountRowId: string;
  originalCode: string;
  originalName: string;
  previousMappedCode: string;
  previousMappedName: string;
  newMappedCode: string;
  newMappedName: string;
  modifiedBy: string;
  reason?: string;
}

export interface AuditStaticCheckResult {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  reverseNatureAccounts: Array<{ code: string; name: string; category: string; nature: string; netBalance: number }>;
  duplicateAccounts: Array<{ code: string; name: string; count: number }>;
  unmappedAccounts: Array<{ originalCode: string; originalName: string }>;
  errorsCount: number;
  warningsCount: number;
}

export interface GeminiReviewReportData {
  auditNotes: string[];
  financialRatios: Array<{ ratioName: string; value: string; interpretation: string }>;
  draftDisclosures: string;
  summaryText: string;
}

export const FileReviewWizardView: React.FC<FileReviewWizardViewProps> = ({
  state,
  onNavigateToTab,
}) => {
  const officeProfile: OfficeProfile = state.officeProfile;
  const currentUser = db.getCurrentUser();

  // Step Tracker (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Context & Upload File
  const [selectedClientId, setSelectedClientId] = useState<string>(
    state.activeClientContext?.clientId || (state.clients[0]?.id || '')
  );
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(
    state.activeClientContext?.selectedFiscalYear || 2026
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [rawMatrix, setRawMatrix] = useState<any[][]>([]);

  // Step 2: Column Mapping & Preview
  const [codeCol, setCodeCol] = useState<number>(-1);
  const [nameCol, setNameCol] = useState<number>(-1);
  const [debitCol, setDebitCol] = useState<number>(-1);
  const [creditCol, setCreditCol] = useState<number>(-1);
  const [openingDebitCol, setOpeningDebitCol] = useState<number>(-1);
  const [openingCreditCol, setOpeningCreditCol] = useState<number>(-1);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);

  // Step 3: Account Mapping State
  const [mappedRows, setMappedRows] = useState<MappedAccountRow[]>([]);
  const [auditorChangesLog, setAuditorChangesLog] = useState<AuditorModificationRecord[]>([]);
  const [isAiSuggesting, setIsAiSuggesting] = useState<boolean>(false);
  const [mappingApproved, setMappingApproved] = useState<boolean>(false);

  // Step 4: Static Check Results
  const [staticCheck, setStaticCheck] = useState<AuditStaticCheckResult | null>(null);

  // Step 5: Financial Statements & Direct Audit Entries
  const [generatedEntries, setGeneratedEntries] = useState<JournalEntry[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [isSavedToDb, setIsSavedToDb] = useState<boolean>(false);

  // Step 6: Gemini Report
  const [reviewReport, setReviewReport] = useState<GeminiReviewReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // Step 7: Export & Finish
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeClient = useMemo(() => {
    return state.clients.find((c) => c.id === selectedClientId) || state.clients[0];
  }, [state.clients, selectedClientId]);

  // Handler: Step 1 Upload & Read File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0] || '';
        setActiveSheet(firstSheet);
        parseSheetData(wb, firstSheet);
      } catch (err) {
        alert('تعذر قراءة ملف الإكسيل. يرجى التأكد من أن الملف سليم بصيغة .xlsx أو .csv');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    setRawMatrix(matrix);

    // Auto-detect columns intelligently
    autoDetectColumns(matrix);
  };

  const handleSheetChange = (sName: string) => {
    setActiveSheet(sName);
    if (workbook) {
      parseSheetData(workbook, sName);
    }
  };

  // Smart Auto-detection of Column Headers
  const autoDetectColumns = (matrix: any[][]) => {
    if (!matrix || matrix.length === 0) return;

    let bestHeaderIdx = 0;
    for (let r = 0; r < Math.min(matrix.length, 10); r++) {
      const rowStr = matrix[r].map((cell) => String(cell).toLowerCase()).join(' ');
      if (
        rowStr.includes('كود') ||
        rowStr.includes('اسم') ||
        rowStr.includes('مدين') ||
        rowStr.includes('دائن') ||
        rowStr.includes('code') ||
        rowStr.includes('account') ||
        rowStr.includes('debit') ||
        rowStr.includes('credit')
      ) {
        bestHeaderIdx = r;
        break;
      }
    }
    setHeaderRowIdx(bestHeaderIdx);

    const headerRow = matrix[bestHeaderIdx] || [];
    let detectedCode = -1;
    let detectedName = -1;
    let detectedDebit = -1;
    let detectedCredit = -1;
    let detectedOpDebit = -1;
    let detectedOpCredit = -1;

    headerRow.forEach((cell: any, idx: number) => {
      const val = String(cell).trim().toLowerCase();
      if (val.includes('كود') || val === 'code' || val.includes('رقم الحساب')) {
        if (detectedCode === -1) detectedCode = idx;
      }
      if (val.includes('اسم') || val.includes('حساب') || val.includes('account') || val.includes('name')) {
        if (detectedName === -1 && !val.includes('كود')) detectedName = idx;
      }
      if (val.includes('افتتاحي') && val.includes('مدين')) {
        detectedOpDebit = idx;
      } else if (val.includes('افتتاحي') && val.includes('دائن')) {
        detectedOpCredit = idx;
      } else if (val.includes('مدين') || val.includes('debit')) {
        if (detectedDebit === -1) detectedDebit = idx;
      } else if (val.includes('دائن') || val.includes('credit')) {
        if (detectedCredit === -1) detectedCredit = idx;
      }
    });

    setCodeCol(detectedCode !== -1 ? detectedCode : 0);
    setNameCol(detectedName !== -1 ? detectedName : 1);
    setDebitCol(detectedDebit !== -1 ? detectedDebit : 2);
    setCreditCol(detectedCredit !== -1 ? detectedCredit : 3);
    setOpeningDebitCol(detectedOpDebit);
    setOpeningCreditCol(detectedOpCredit);
  };

  // Step 2 -> Step 3: Parse Accounts and Run Initial COA Match
  const processInitialCOAMapping = () => {
    if (codeCol < 0 || nameCol < 0 || debitCol < 0 || creditCol < 0) {
      alert('يرجى تحديد أعمدة (الكود، الاسم، المدين، والدائن) قبل المتابعة.');
      return;
    }

    const dataRows = rawMatrix.slice(headerRowIdx + 1);
    const systemAccounts = state.accounts;

    const parsedRows: MappedAccountRow[] = [];

    dataRows.forEach((row, idx) => {
      const rawCode = String(row[codeCol] || '').trim();
      const rawName = String(row[nameCol] || '').trim();
      if (!rawCode && !rawName) return; // Skip empty rows

      const debitVal = parseFloat(String(row[debitCol] || '0').replace(/,/g, '')) || 0;
      const creditVal = parseFloat(String(row[creditCol] || '0').replace(/,/g, '')) || 0;
      const opDebitVal =
        openingDebitCol >= 0 ? parseFloat(String(row[openingDebitCol] || '0').replace(/,/g, '')) || 0 : 0;
      const opCreditVal =
        openingCreditCol >= 0 ? parseFloat(String(row[openingCreditCol] || '0').replace(/,/g, '')) || 0 : 0;

      const netBalance = debitVal - creditVal;

      // Deterministic Match 1: By Code
      const exactCodeMatch = systemAccounts.find((a) => a.code === rawCode);
      if (exactCodeMatch) {
        parsedRows.push({
          id: `row-${idx}-${Date.now()}`,
          originalCode: rawCode,
          originalName: rawName,
          debit: debitVal,
          credit: creditVal,
          openingDebit: opDebitVal,
          openingCredit: opCreditVal,
          netBalance,
          mappedCode: exactCodeMatch.code,
          mappedName: exactCodeMatch.name,
          matchType: 'EXACT_CODE',
          confidence: 1.0,
          aiReasoning: 'طابق كود الحساب بالدليل المعياري للنظام تماماً',
          isApproved: true,
        });
        return;
      }

      // Deterministic Match 2: By Name
      const exactNameMatch = systemAccounts.find(
        (a) => a.name.trim().toLowerCase() === rawName.toLowerCase()
      );
      if (exactNameMatch) {
        parsedRows.push({
          id: `row-${idx}-${Date.now()}`,
          originalCode: rawCode,
          originalName: rawName,
          debit: debitVal,
          credit: creditVal,
          openingDebit: opDebitVal,
          openingCredit: opCreditVal,
          netBalance,
          mappedCode: exactNameMatch.code,
          mappedName: exactNameMatch.name,
          matchType: 'EXACT_NAME',
          confidence: 0.95,
          aiReasoning: 'طابق اسم الحساب مع دليل الحسابات بالاسم',
          isApproved: true,
        });
        return;
      }

      // Unmapped
      parsedRows.push({
        id: `row-${idx}-${Date.now()}`,
        originalCode: rawCode,
        originalName: rawName,
        debit: debitVal,
        credit: creditVal,
        openingDebit: opDebitVal,
        openingCredit: opCreditVal,
        netBalance,
        mappedCode: '',
        mappedName: '',
        matchType: 'UNMAPPED',
        confidence: 0,
        isApproved: false,
      });
    });

    setMappedRows(parsedRows);
    setCurrentStep(3);

    // Automatically trigger Gemini AI suggestion for unmapped accounts
    const unmapped = parsedRows.filter((r) => r.matchType === 'UNMAPPED');
    if (unmapped.length > 0) {
      requestGeminiMappingSuggestions(parsedRows, unmapped);
    }
  };

  // Request Gemini Suggestions via Server API
  const requestGeminiMappingSuggestions = async (
    allRows: MappedAccountRow[],
    unmappedList: MappedAccountRow[]
  ) => {
    setIsAiSuggesting(true);
    try {
      const payloadUnmapped = unmappedList.map((u) => ({
        originalCode: u.originalCode,
        originalName: u.originalName,
        debit: u.debit,
        credit: u.credit,
      }));

      const payloadCOA = state.accounts.map((a) => ({
        code: a.code,
        name: a.name,
        category: a.category,
        nature: a.nature,
      }));

      const res = await fetchWithAuth('/api/audit/suggest-account-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unmappedAccounts: payloadUnmapped,
          chartOfAccounts: payloadCOA,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const suggestions = json.data;
          const updatedRows = allRows.map((row) => {
            if (row.matchType === 'UNMAPPED') {
              const match = suggestions.find(
                (s: any) =>
                  s.originalName === row.originalName || s.originalCode === row.originalCode
              );
              if (match && match.suggestedCode) {
                return {
                  ...row,
                  mappedCode: match.suggestedCode,
                  mappedName: match.suggestedName || getAccountNameByCode(match.suggestedCode),
                  matchType: 'AI_SUGGESTED' as const,
                  confidence: match.confidence || 0.85,
                  aiReasoning: match.reasoning || 'اقتراح ذكي بناءً على الطبيعة المحاسبية للحساب والمعايير المصرية',
                  isApproved: false,
                };
              }
            }
            return row;
          });
          setMappedRows(updatedRows);
        }
      }
    } catch (err) {
      console.warn('Gemini AI account mapping suggestion unavailable or offline:', err);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const getAccountNameByCode = (code: string): string => {
    const acc = state.accounts.find((a) => a.code === code);
    return acc ? acc.name : '';
  };

  // Auditor Manual Correction
  const handleAuditorCodeChange = (rowId: string, newCode: string) => {
    const row = mappedRows.find((r) => r.id === rowId);
    if (!row) return;

    const newName = getAccountNameByCode(newCode) || row.mappedName;

    // Log Modification
    const logRecord: AuditorModificationRecord = {
      id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      accountRowId: rowId,
      originalCode: row.originalCode,
      originalName: row.originalName,
      previousMappedCode: row.mappedCode,
      previousMappedName: row.mappedName,
      newMappedCode: newCode,
      newMappedName: newName,
      modifiedBy: currentUser.name || 'المراجع القانوني',
      reason: 'تحديث يدوي من المحاسب أثناء مراجعة الملف',
    };

    setAuditorChangesLog((prev) => [logRecord, ...prev]);

    setMappedRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            mappedCode: newCode,
            mappedName: newName,
            matchType: 'MANUAL_MODIFIED',
            confidence: 1.0,
            isApproved: true,
            isModifiedByAuditor: true,
          };
        }
        return r;
      })
    );
  };

  // Approve Mappings Step 3 -> Step 4
  const handleApproveMappings = () => {
    const hasUnmapped = mappedRows.some((r) => !r.mappedCode);
    if (hasUnmapped) {
      if (!confirm('هناك حسابات لم يتم تحديد كود لها. هل تريد الاستمرار وتصحيحها؟')) {
        return;
      }
    }
    setMappingApproved(true);
    runStaticCodeChecks();
    setCurrentStep(4);
  };

  // Step 4: Deterministic Static Code Checks (Pure Code - NO AI)
  const runStaticCodeChecks = () => {
    let totalDebit = 0;
    let totalCredit = 0;
    const reverseNature: Array<{ code: string; name: string; category: string; nature: string; netBalance: number }> = [];
    const codeCounts: Record<string, number> = {};
    const unmapped: Array<{ originalCode: string; originalName: string }> = [];

    mappedRows.forEach((row) => {
      totalDebit += row.debit;
      totalCredit += row.credit;

      if (!row.mappedCode) {
        unmapped.push({ originalCode: row.originalCode, originalName: row.originalName });
      } else {
        codeCounts[row.mappedCode] = (codeCounts[row.mappedCode] || 0) + 1;

        // Check reverse natural balance
        const sysAcc = state.accounts.find((a) => a.code === row.mappedCode);
        if (sysAcc) {
          const net = row.debit - row.credit;
          if (sysAcc.nature === 'DEBIT' && net < -0.01) {
            reverseNature.push({
              code: sysAcc.code,
              name: sysAcc.name,
              category: sysAcc.category,
              nature: sysAcc.nature,
              netBalance: net,
            });
          } else if (sysAcc.nature === 'CREDIT' && net > 0.01) {
            reverseNature.push({
              code: sysAcc.code,
              name: sysAcc.name,
              category: sysAcc.category,
              nature: sysAcc.nature,
              netBalance: net,
            });
          }
        }
      }
    });

    const totalDebitRounded = Math.round(totalDebit * 100) / 100;
    const totalCreditRounded = Math.round(totalCredit * 100) / 100;
    const difference = Math.abs(totalDebitRounded - totalCreditRounded);
    const isBalanced = difference < 0.01;

    const duplicates = Object.entries(codeCounts)
      .filter(([_, count]) => count > 1)
      .map(([code, count]) => {
        const acc = state.accounts.find((a) => a.code === code);
        return { code, name: acc ? acc.name : '', count };
      });

    const errorsCount = (!isBalanced ? 1 : 0) + unmapped.length;
    const warningsCount = reverseNature.length + duplicates.length;

    setStaticCheck({
      isBalanced,
      totalDebit: totalDebitRounded,
      totalCredit: totalCreditRounded,
      difference: Math.round(difference * 100) / 100,
      reverseNatureAccounts: reverseNature,
      duplicateAccounts: duplicates,
      unmappedAccounts: unmapped,
      errorsCount,
      warningsCount,
    });
  };

  // Step 4 -> Step 5: Generate Entries & Statements
  const handleProceedToGeneration = () => {
    if (!staticCheck?.isBalanced) {
      alert('الميزان غير متزن! غير مسموح بتوليد القوائم في وضع المراجعة إلا بعد موازنة الملف بتعديل القيود.');
      return;
    }
    if (staticCheck?.unmappedAccounts.length > 0) {
      alert('توجد حسابات غير مربوطة بأكواد الدليل. يرجى إتمام ربط كافة الحسابات أولاً.');
      return;
    }

    // Grouping by Category to calculate Financial Statements
    let revenues = 0;
    let cogs = 0;
    let selling = 0;
    let admin = 0;
    let dep = 0;
    let fin = 0;
    let otherInc = 0;
    let taxExp = 0;

    let ppe = 0;
    let accDep = 0;
    let inventory = 0;
    let receivables = 0;
    let notesReceivable = 0;
    let taxDebit = 0;
    let prepayments = 0;
    let cashAndBanks = 0;

    let capital = 0;
    let legalReserve = 0;
    let retainedEarnings = 0;
    let currentProfit = 0;

    let longTermLoans = 0;
    let payables = 0;
    let notesPayable = 0;
    let taxesPayable = 0;
    let accruedExpenses = 0;

    mappedRows.forEach((row) => {
      const code = row.mappedCode;
      const net = row.debit - row.credit;

      if (code.startsWith('41') || code.startsWith('42')) revenues += Math.abs(net);
      else if (code.startsWith('51')) cogs += Math.abs(net);
      else if (code.startsWith('52')) selling += Math.abs(net);
      else if (code.startsWith('530') || code.startsWith('531')) admin += Math.abs(net);
      else if (code.startsWith('536')) dep += Math.abs(net);
      else if (code.startsWith('54')) fin += Math.abs(net);
      else if (code.startsWith('43') || code.startsWith('44')) otherInc += Math.abs(net);
      else if (code.startsWith('55')) taxExp += Math.abs(net);

      // Balance Sheet
      else if (code.startsWith('121') || code.startsWith('122')) ppe += Math.abs(net);
      else if (code.startsWith('231') || code.startsWith('129')) accDep += Math.abs(net);
      else if (code.startsWith('131') || code.startsWith('132')) inventory += Math.abs(net);
      else if (code.startsWith('141')) receivables += Math.abs(net);
      else if (code.startsWith('142')) notesReceivable += Math.abs(net);
      else if (code.startsWith('143')) taxDebit += Math.abs(net);
      else if (code.startsWith('144')) prepayments += Math.abs(net);
      else if (code.startsWith('111') || code.startsWith('112') || code.startsWith('113')) cashAndBanks += Math.abs(net);

      else if (code.startsWith('311')) capital += Math.abs(net);
      else if (code.startsWith('312')) legalReserve += Math.abs(net);
      else if (code.startsWith('313')) retainedEarnings += Math.abs(net);

      else if (code.startsWith('211') || code.startsWith('221')) longTermLoans += Math.abs(net);
      else if (code.startsWith('222')) payables += Math.abs(net);
      else if (code.startsWith('223')) notesPayable += Math.abs(net);
      else if (code.startsWith('224')) taxesPayable += Math.abs(net);
      else if (code.startsWith('225')) accruedExpenses += Math.abs(net);
    });

    const grossProfit = revenues - cogs;
    const operatingProfit = grossProfit - (selling + admin + dep) + otherInc - fin;
    const netProfitBeforeTax = operatingProfit;
    const netProfitAfterTax = netProfitBeforeTax - taxExp;

    currentProfit = netProfitAfterTax;

    const totalNonCurrentAssets = Math.max(0, ppe - accDep);
    const totalCurrentAssets = inventory + receivables + notesReceivable + taxDebit + prepayments + cashAndBanks;
    const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

    const totalEquity = capital + legalReserve + retainedEarnings + currentProfit;
    const totalNonCurrentLiabilities = longTermLoans;
    const totalCurrentLiabilities = payables + notesPayable + taxesPayable + accruedExpenses;
    const totalLiabilitiesAndEquity = totalEquity + totalNonCurrentLiabilities + totalCurrentLiabilities;

    const finSummary = {
      clientName: activeClient?.name || 'العميل',
      fiscalYear: selectedFiscalYear,
      revenues,
      costOfGoodsSold: cogs,
      grossProfit,
      sellingAndMarketingExpenses: selling,
      administrativeExpenses: admin,
      depreciationExpense: dep,
      financeCosts: fin,
      otherIncomes: otherInc,
      netProfitBeforeTax,
      taxExpense: taxExp,
      netProfitAfterTax,
      
      // Balance Sheet
      nonCurrentAssets: totalNonCurrentAssets,
      currentAssets: totalCurrentAssets,
      totalAssets,
      equity: totalEquity,
      nonCurrentLiabilities: totalNonCurrentLiabilities,
      currentLiabilities: totalCurrentLiabilities,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1,
    };

    setFinancialSummary(finSummary);

    // Call localDatabase generateAuditDirectEntries
    const directEntriesRes = db.generateAuditDirectEntries({
      fiscalYear: selectedFiscalYear,
      clientId: activeClient?.id,
      clientName: activeClient?.name,
      date: `${selectedFiscalYear}-12-31`,
      incomeData: {
        revenues,
        costOfGoodsSold: cogs,
        sellingAndMarketingExpenses: selling,
        administrativeExpenses: admin,
        depreciationExpense: dep,
        financeCosts: fin,
        otherIncomes: otherInc,
        taxExpense: taxExp,
        netProfitAfterTax,
      },
      balanceData: {
        nonCurrentAssets: { ppe, accDep },
        currentAssets: { inventory, receivables, notesReceivable, taxDebit, prepayments, cashAndBanks },
        equity: { capital, legalReserve, retainedEarnings, currentProfit, partnersCurrent: 0 },
        nonCurrentLiabilities: { longTermLoans },
        currentLiabilities: { payables, notesPayable, taxesPayable, socialInsurance: 0, accruedExpenses },
      },
    });

    if (directEntriesRes.success) {
      setGeneratedEntries(directEntriesRes.generatedEntries);
    }

    setCurrentStep(5);
  };

  // Step 5 -> Step 6: Generate Gemini Report (Numbers Only Input - NO Invention)
  const handleGenerateGeminiReport = async () => {
    setCurrentStep(6);
    setIsGeneratingReport(true);
    try {
      const res = await fetchWithAuth('/api/audit/generate-review-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: activeClient?.name || 'العميل المراجَع',
          fiscalYear: selectedFiscalYear,
          financialSummary,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setReviewReport(json.data);
        }
      }
    } catch (err) {
      console.warn('Gemini report generation error:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export functions
  const handleExportJournalEntriesExcel = () => {
    const exportData = generatedEntries.flatMap((entry) =>
      entry.lines.map((line) => ({
        'رقم القيد Serial': entry.serialNumber,
        'التاريخ Date': entry.date,
        'نوع القيد': entry.entryType,
        'كود الحساب Account Code': line.accountCode,
        'اسم الحساب Account Name': line.accountName,
        'مدين Debit (EGP)': line.debit,
        'دائن Credit (EGP)': line.credit,
        'البيان Description': line.description || entry.description,
      }))
    );

    const ws = XLSX.utils.json_to_array ? XLSX.utils.json_to_sheet(exportData) : XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'القيود المترجمة');
    XLSX.writeFile(wb, `Audit_Entries_${activeClient?.name}_${selectedFiscalYear}.xlsx`);
  };

  const handleExportAuditorLogExcel = () => {
    const exportData = auditorChangesLog.map((log) => ({
      'التاريخ والوقت': new Date(log.timestamp).toLocaleString('ar-EG'),
      'اسم المراجع / المحاسب': log.modifiedBy,
      'كود الحساب بالملف': log.originalCode,
      'اسم الحساب بالملف': log.originalName,
      'الكود المقترح سابقاً': log.previousMappedCode,
      'اسم الحساب السابق': log.previousMappedName,
      'الكود المعتمد المعدل': log.newMappedCode,
      'اسم الحساب المعتمد': log.newMappedName,
      'سبب التعديل': log.reason || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل تعديلات المحاسب');
    XLSX.writeFile(wb, `Auditor_Changes_Log_${activeClient?.name}_${selectedFiscalYear}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Official Header */}
      <OfficialReportHeader
        title="شاشة مراجعة وقراءة الملفات (وضع المراجعة)"
        subtitle="مسار موحد بخطوات متلسلسلة لقراءة الموازين، الربط بالدليل، وتوليد القوائم والتقارير"
        officeProfile={officeProfile}
      />

      {/* Stepper Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs">
          {[
            { step: 1, label: '1. رفع الملف والبيانات', icon: Upload },
            { step: 2, label: '2. تحديد الأعمدة', icon: FileSpreadsheet },
            { step: 3, label: '3. ربط الحسابات', icon: Sparkles },
            { step: 4, label: '4. الفحوصات الثابتة', icon: Scale },
            { step: 5, label: '5. توليد القيود والقوائم', icon: FileText },
            { step: 6, label: '6. تقرير الملاحظات', icon: ShieldCheck },
            { step: 7, label: '7. التصدير المعتمد', icon: Download },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <div
                key={s.step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all min-w-max ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{s.label}</span>
                {isDone && <Check className="w-3.5 h-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Upload File & Select Client & Fiscal Year */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              الخطوة 1: اختيار الكيان، السنة المالية، ورفع ملف الميزان / الأستاذ العام
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              قم برفع ملف Excel أو CSV يحتوي على ميزان المراجعة أو دفتر الأستاذ للعميل للمراجعة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                العميل / الشركة المفحوصة:
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.commercialRegistrationNo || c.taxCardNo || 'ملف كود ' + c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                السنة المالية للمراجعة:
              </label>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    عن السنة المالية المنتهية في {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 dark:border-blue-800 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <FileSpreadsheet className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {fileName ? `الملف المحدد: ${fileName}` : 'اضغط هنا لرفع ملف الميزان (Excel / CSV)'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">يدعم ملفات .xlsx, .xls, .csv ذات الجداول المترابطة</p>
          </div>

          {sheetNames.length > 1 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اختر ورقة العمل (Sheet) المطلوبة للمراجعة:
              </label>
              <div className="flex gap-2 flex-wrap">
                {sheetNames.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSheetChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeSheet === s
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={!file || rawMatrix.length === 0}
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>التالي: تحديد الأعمدة والمعاينة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping & Live Preview */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              الخطوة 2: تحديد مطابقة الأعمدة ومعاينة بيانات الملف
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              حدد الأعمدة المقابلة لكود الحساب، الاسم، الحركة المدينة، والحركة الدائنة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عمود كود الحساب (Code):
              </label>
              <select
                value={codeCol}
                onChange={(e) => setCodeCol(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={-1}>-- اختر العمود --</option>
                {rawMatrix[headerRowIdx]?.map((val: any, idx: number) => (
                  <option key={idx} value={idx}>
                    عمود {idx + 1}: {String(val || `العمود ${idx + 1}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عمود اسم الحساب (Name):
              </label>
              <select
                value={nameCol}
                onChange={(e) => setNameCol(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={-1}>-- اختر العمود --</option>
                {rawMatrix[headerRowIdx]?.map((val: any, idx: number) => (
                  <option key={idx} value={idx}>
                    عمود {idx + 1}: {String(val || `العمود ${idx + 1}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عمود مدين (Debit):
              </label>
              <select
                value={debitCol}
                onChange={(e) => setDebitCol(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={-1}>-- اختر العمود --</option>
                {rawMatrix[headerRowIdx]?.map((val: any, idx: number) => (
                  <option key={idx} value={idx}>
                    عمود {idx + 1}: {String(val || `العمود ${idx + 1}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عمود دائن (Credit):
              </label>
              <select
                value={creditCol}
                onChange={(e) => setCreditCol(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={-1}>-- اختر العمود --</option>
                {rawMatrix[headerRowIdx]?.map((val: any, idx: number) => (
                  <option key={idx} value={idx}>
                    عمود {idx + 1}: {String(val || `العمود ${idx + 1}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Preview Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              معاينة أول 10 أسطر من الملف مع التظليل:
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-200 dark:border-slate-700">#</th>
                    {rawMatrix[headerRowIdx]?.map((colName: any, idx: number) => {
                      let colLabel = '';
                      if (idx === codeCol) colLabel = ' [كود]';
                      if (idx === nameCol) colLabel = ' [اسم]';
                      if (idx === debitCol) colLabel = ' [مدين]';
                      if (idx === creditCol) colLabel = ' [دائن]';

                      return (
                        <th
                          key={idx}
                          className={`p-2 border border-slate-200 dark:border-slate-700 ${
                            colLabel ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold' : ''
                          }`}
                        >
                          {String(colName || `عمود ${idx + 1}`)} {colLabel}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rawMatrix.slice(headerRowIdx + 1, headerRowIdx + 11).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 border border-slate-200 dark:border-slate-700 font-mono text-slate-400">
                        {rIdx + 1}
                      </td>
                      {row.map((cell: any, cIdx: number) => (
                        <td
                          key={cIdx}
                          className={`p-2 border border-slate-200 dark:border-slate-700 ${
                            cIdx === codeCol || cIdx === nameCol || cIdx === debitCol || cIdx === creditCol
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 font-bold'
                              : ''
                          }`}
                        >
                          {String(cell || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={processInitialCOAMapping}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <span>التالي: ربط ومطابقة الحسابات بالدليل</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COA Account Mapping & AI Suggestions */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                الخطوة 3: ربط كل حساب بالدليل واقتراحات الذكاء الاصطناعي (Gemini)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تمت المطابقة التلقائية بالكود والاسم. والحسابات غير المطابقة تم توليد اقتراح محاسبي معتمد لها.
              </p>
            </div>

            {isAiSuggesting && (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                <span>جاري استقبال اقتراحات الذكاء الاصطناعي من Gemini...</span>
              </div>
            )}
          </div>

          {/* Interactive Mapping Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">كود الملف</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">اسم الحساب بالملف</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">مدين</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">دائن</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">حالة الربط والتطابق</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">الحساب المستهدف بالنظام</th>
                  <th className="p-2.5 border border-slate-200 dark:border-slate-700">السبب المحاسبي / الثقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {mappedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 font-mono">{row.originalCode || '-'}</td>
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 font-semibold">{row.originalName}</td>
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 font-mono text-emerald-700 dark:text-emerald-400">
                      {row.debit > 0 ? row.debit.toLocaleString('ar-EG') : '-'}
                    </td>
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 font-mono text-rose-700 dark:text-rose-400">
                      {row.credit > 0 ? row.credit.toLocaleString('ar-EG') : '-'}
                    </td>

                    {/* Match Status Badge */}
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700">
                      {row.matchType === 'EXACT_CODE' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          مطابق بالكود (100%)
                        </span>
                      )}
                      {row.matchType === 'EXACT_NAME' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          مطابق بالاسم (95%)
                        </span>
                      )}
                      {row.matchType === 'AI_SUGGESTED' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          اقتراح Gemini ({Math.round((row.confidence || 0.85) * 100)}%)
                        </span>
                      )}
                      {row.matchType === 'MANUAL_MODIFIED' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          معدل من المحاسب
                        </span>
                      )}
                      {row.matchType === 'UNMAPPED' && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          غير مربوط
                        </span>
                      )}
                    </td>

                    {/* Target System Account Selector / Editable */}
                    <td className="p-2 border border-slate-200 dark:border-slate-700">
                      <select
                        value={row.mappedCode}
                        onChange={(e) => handleAuditorCodeChange(row.id, e.target.value)}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="">-- اختر حساب من الدليل --</option>
                        {state.accounts.map((acc) => (
                          <option key={acc.id} value={acc.code}>
                            [{acc.code}] {acc.name} ({acc.category})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Reasoning */}
                    <td className="p-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px]">
                      {row.aiReasoning || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={handleApproveMappings}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد مطابقة الحسابات والمتابعة للفحوصات</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Static Code Deterministic Audit Checks (NO AI) */}
      {currentStep === 4 && staticCheck && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              الخطوة 4: الفحوصات الفنية والقواعد الثابتة بالأكواد (Static Code Audit Checks)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              فحوصات برمجية حتمية بدون ذكاء اصطناعي: الاتزان المحاسبي، الأرصدة العكسية، والتكرار.
            </p>
          </div>

          {/* Hard Block Banner if Unbalanced */}
          {!staticCheck.isBalanced && (
            <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500 text-rose-900 dark:text-rose-200 flex items-start gap-3">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">ميزان المراجعة غير متزن! (ممنوع المتابعة)</h4>
                <p className="text-xs mt-1">
                  إجمالي المدين ({staticCheck.totalDebit.toLocaleString('ar-EG')}) لا يساوي إجمالي الدائن (
                  {staticCheck.totalCredit.toLocaleString('ar-EG')}). الفارق: {staticCheck.difference.toLocaleString('ar-EG')} ج.م.
                  وفقاً لضوابط المراجعة في "وضع المراجعة"، يرجى تصحيح أرقام القيود أولاً.
                </p>
              </div>
            </div>
          )}

          {staticCheck.isBalanced && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">ميزان المراجعة متزن تماماً</h4>
                <p className="text-xs mt-0.5">
                  مجموع المدين ({staticCheck.totalDebit.toLocaleString('ar-EG')}) يساوي مجموع الدائن (
                  {staticCheck.totalCredit.toLocaleString('ar-EG')}).
                </p>
              </div>
            </div>
          )}

          {/* Detailed Check Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Reverse Nature Accounts */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                حسابات برصيد عكس طبيعتها المحاسبية ({staticCheck.reverseNatureAccounts.length})
              </h4>
              {staticCheck.reverseNatureAccounts.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  جميع الحسابات تتماشى مع طبيعتها المحاسبية المعتمدة.
                </p>
              ) : (
                <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  {staticCheck.reverseNatureAccounts.map((a, i) => (
                    <li key={i} className="bg-amber-100/50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
                      كود [{a.code}] {a.name}: رصيد {a.netBalance.toLocaleString('ar-EG')} ج.م (طبيعة الحساب {a.nature})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Card 2: Duplicate Accounts */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-blue-500" />
                حسابات مكررة متطابقة الأكواد ({staticCheck.duplicateAccounts.length})
              </h4>
              {staticCheck.duplicateAccounts.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  لا توجد أكواد حسابات مكررة بالملف.
                </p>
              ) : (
                <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  {staticCheck.duplicateAccounts.map((d, i) => (
                    <li key={i} className="bg-blue-100/50 dark:bg-blue-950/40 p-2 rounded border border-blue-200 dark:border-blue-800">
                      الكود [{d.code}] {d.name} متكرر عدد {d.count} مرات بالملف
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              disabled={!staticCheck.isBalanced || staticCheck.unmappedAccounts.length > 0}
              onClick={handleProceedToGeneration}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>التالي: توليد القيود المباشرة والقوائم المالية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Generate Direct Entries & Financial Statements */}
      {currentStep === 5 && financialSummary && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              الخطوة 5: توليد القيود المحاسبية المباشرة واستخراج القوائم المالية
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تم توليد القيود المباشرة بواسطة المحرك المحاسبي النظامي بدون أي موازنة آلية طارئة.
            </p>
          </div>

          {/* Financial Statements Summary Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">إجمالي الإيرادات:</span>
              <p className="text-lg font-extrabold text-blue-900 dark:text-blue-100 font-mono mt-1">
                {financialSummary.revenues.toLocaleString('ar-EG')} ج.م
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">صافي الربح بعد الضريبة:</span>
              <p className="text-lg font-extrabold text-purple-900 dark:text-purple-100 font-mono mt-1">
                {financialSummary.netProfitAfterTax.toLocaleString('ar-EG')} ج.م
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">إجمالي الأصول (الميزانية):</span>
              <p className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100 font-mono mt-1">
                {financialSummary.totalAssets.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
          </div>

          {/* Generated Entries Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              معاينة القيود المباشرة المولدة ({generatedEntries.length} قيد متوازن):
            </h4>
            <div className="space-y-3">
              {generatedEntries.map((entry) => (
                <div key={entry.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span className="text-blue-600 font-mono">سريال: {entry.serialNumber}</span>
                    <span>{entry.description}</span>
                    <span className="text-slate-500 font-mono">{entry.date}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="p-1.5 border border-slate-300 dark:border-slate-600">كود الحساب</th>
                          <th className="p-1.5 border border-slate-300 dark:border-slate-600">اسم الحساب</th>
                          <th className="p-1.5 border border-slate-300 dark:border-slate-600">مدين</th>
                          <th className="p-1.5 border border-slate-300 dark:border-slate-600">دائن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-mono">{line.accountCode}</td>
                            <td className="p-1.5 border border-slate-200 dark:border-slate-700">{line.accountName}</td>
                            <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-mono text-emerald-600">{line.debit > 0 ? line.debit.toLocaleString('ar-EG') : '-'}</td>
                            <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-mono text-rose-600">{line.credit > 0 ? line.credit.toLocaleString('ar-EG') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateGeminiReport}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>التالي: إعداد تقرير الملاحظات وتحليل النسب بالذكاء الاصطناعي</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Gemini Report & Disclosures */}
      {currentStep === 6 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                الخطوة 6: تقرير ملاحظات المراجعة وتحليل النسب المعتمدة (Gemini)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                استناداً لأرقام القوائم المالية المعتمدة فقط بدون توليد أي أرقام من العدم.
              </p>
            </div>

            {isGeneratingReport && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري صياغة تقرير الملاحظات والنسب...</span>
              </div>
            )}
          </div>

          {reviewReport && (
            <div className="space-y-6">
              {/* Audit Observations */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">ملاحظات وتحليلات المراجعة:</h4>
                <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {reviewReport.auditNotes?.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>

              {/* Financial Ratios Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">تحليل النسب المالية:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reviewReport.financialRatios?.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>{r.ratioName}</span>
                        <span className="text-purple-600 font-mono">{r.value}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{r.interpretation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Disclosures */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">صياغة الإيضاحات المتممة المبدئية:</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {reviewReport.draftDisclosures}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(7)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <span>التالي: التصدير ومخرجات المراجعة النهائية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Export Deliverables & Save */}
      {currentStep === 7 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              الخطوة 7: تصدير النتائج والمستندات المعتمدة
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              قم بتصدير القيود، القوائم المالية، الملاحظات، وسجل التعديلات المنجزة من المحاسب.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleExportJournalEntriesExcel}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 text-right space-y-1 transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>تصدير القيود المباشرة المولدة (Excel)</span>
              </div>
              <p className="text-[11px] text-slate-500">تحميل شيت إكسيل يحتوي على شجرة القيود المتوازنة كاملة.</p>
            </button>

            <button
              type="button"
              onClick={handleExportAuditorLogExcel}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-purple-50/50 hover:bg-purple-100/50 dark:bg-purple-950/20 text-right space-y-1 transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <span>تصدير سجل تعديلات المحاسب والمراجعة (Excel)</span>
              </div>
              <p className="text-[11px] text-slate-500">تحميل سجل يحتوي على جميع تصحيحات الأكواد التي أجراها المحاسب.</p>
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={() => {
                alert('تم اعتماد وحفظ نتائج المراجعة بنجاح في قاعدة بيانات المنظومة.');
                if (onNavigateToTab) onNavigateToTab('JOURNAL_ENTRIES');
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إنهاء المراجعة والإنهاء مع حفظ التغييرات</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileReviewWizardView;
