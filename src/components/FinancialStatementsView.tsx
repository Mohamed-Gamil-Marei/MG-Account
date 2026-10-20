import React, { useMemo, useState } from 'react';
import { DatabaseState, db, createDefaultClientStatementMapping } from '../db/localDatabase';
import { AccountingCalculator, STATEMENT_LINE_LABELS_AR } from '../services/AccountingCalculator';
import { formatEgyptianCurrency, buildFinancialStatementsQrText } from '../utils/qrCodeGenerator';
import {
  FileSpreadsheet,
  Printer,
  AlertCircle,
  TrendingUp,
  Scale,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Link2,
  Edit3,
  Undo2,
  ShieldCheck,
  Eye,
  EyeOff,
  History,
  FileText,
  Percent,
  Download,
  Info,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PrintService } from '../services/PrintService';
import {
  FinancialStatementLineKey,
  ClientStatementMapping,
  StatementModel,
  StatementAdjustmentPeriod,
  ManagerStatementAdjustment,
  ApprovedStatementsSnapshot,
} from '../types';
import { canPerform } from '../services/accessGuard';
import { formatCairoDateTimeArabic } from '../utils/cairoTime';

export interface FinancialStatementsViewProps {
  state: DatabaseState;
  fiscalYear?: number;
  initialStatementTab?: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'EQUITY' | 'NOTES' | 'RATIOS' | 'ADJUSTMENTS_REPORT' | 'MAPPING' | string;
  onNavigateToExchangeRates?: () => void;
  onNavigateToCreditSimulator?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  state,
  fiscalYear = 2026,
  initialStatementTab = 'BALANCE_SHEET',
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialStatementTab);
  const [hideAdjustmentMarks, setHideAdjustmentMarks] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);

  // Modal states for editing line amount
  const [editingCell, setEditingCell] = useState<{
    lineKey: FinancialStatementLineKey | string;
    lineLabel: string;
    period: StatementAdjustmentPeriod;
    currentValue: number;
    ledgerValue: number;
  } | null>(null);
  const [editOverrideAmount, setEditOverrideAmount] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // Modal states for renaming line label
  const [renamingLine, setRenamingLine] = useState<{
    lineKey: FinancialStatementLineKey | string;
    currentLabel: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  // Re-issue approval modal
  const [isReissueModalOpen, setIsReissueModalOpen] = useState<boolean>(false);
  const [reissueReasonInput, setReissueReasonInput] = useState<string>('');
  const [reissueError, setReissueError] = useState<string | null>(null);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeClientId = state.activeClientContext?.clientId || state.clients[0]?.id || '';
  const activeClient = state.clients.find((c) => c.id === activeClientId) || null;

  const targetYear =
    state.activeClientContext?.selectedFiscalYear ||
    activeClient?.fiscalYear ||
    activeClient?.activeFiscalYear ||
    fiscalYear;

  const fiscalBounds = useMemo(() => {
    return db.getClientFiscalYearBounds(activeClientId, targetYear);
  }, [activeClientId, targetYear]);

  const unassignedSummary = useMemo(() => {
    return db.getUnassignedRecordsSummary();
  }, [state.journalEntries, state.invoices, state.treasuryTransactions, state.fixedAssets, state.taxDeclarations]);

  const currentUser = db.getCurrentUser();
  const canEditFinalStatements = useMemo(() => {
    return canPerform('EDIT_FINAL_STATEMENTS', { clientId: activeClientId, fiscalYear: targetYear });
  }, [currentUser, activeClientId, targetYear]);

  // All approved versions for this client and year
  const approvedSnapshots = useMemo(() => {
    if (!activeClientId) return [];
    return db.getApprovedStatementsForClient(activeClientId, targetYear);
  }, [activeClientId, targetYear, state.approvedStatements]);

  const latestApprovedSnap = useMemo(() => {
    if (!activeClientId) return undefined;
    return db.getLatestApprovedStatementForClient(activeClientId, targetYear);
  }, [activeClientId, targetYear, state.approvedStatements]);

  // Build the single unified StatementModel from AccountingCalculator & db
  const model: StatementModel = useMemo(() => {
    if (!activeClientId) {
      return AccountingCalculator.buildStatementModel({
        clientId: 'none',
        fiscalYear: targetYear,
        version: 1,
        client: { id: 'none', name: 'غير محدد' },
        accounts: [],
        comparativeAccounts: [],
        entries: [],
        fiscalBounds: db.getClientFiscalYearBounds(null, targetYear),
        comparativeFiscalBounds: db.getClientFiscalYearBounds(null, targetYear - 1),
        statementMapping: {},
      });
    }
    return db.buildStatementModel(activeClientId, targetYear, selectedVersion);
  }, [
    activeClientId,
    targetYear,
    selectedVersion,
    state.accounts,
    state.journalEntries,
    state.openingBalances,
    state.clientOpeningBalances,
    state.statementMappings,
    state.managerAdjustmentLayers,
    state.statementNotes,
    state.approvedStatements,
    state.officeProfile,
  ]);

  // Mapping editor state
  const clientStatementMapping = useMemo(() => {
    if (!activeClientId) return {};
    return db.getClientStatementMapping(activeClientId);
  }, [activeClientId, state.statementMappings]);

  const [editingMapping, setEditingMapping] = useState<ClientStatementMapping>({});
  const [mappingSaveSuccess, setMappingSaveSuccess] = useState(false);

  React.useEffect(() => {
    setEditingMapping({ ...clientStatementMapping });
  }, [clientStatementMapping]);

  const handleSaveMapping = () => {
    if (!activeClientId) return;
    db.setClientStatementMapping(activeClientId, editingMapping);
    setMappingSaveSuccess(true);
    setTimeout(() => setMappingSaveSuccess(false), 3000);
  };

  const handleResetDefaultMapping = () => {
    if (!activeClientId) return;
    const def = createDefaultClientStatementMapping(activeClientId);
    setEditingMapping(def);
    db.setClientStatementMapping(activeClientId, def, 'استعادة التخطيط القياسي المصري لبنود القوائم');
    setMappingSaveSuccess(true);
    setTimeout(() => setMappingSaveSuccess(false), 3000);
  };

  // Open edit modal for an amount cell
  const handleOpenCellEdit = (
    lineKey: FinancialStatementLineKey | string,
    period: StatementAdjustmentPeriod
  ) => {
    if (!canEditFinalStatements) return;
    const line = model.linesMap[lineKey];
    if (!line) return;
    const curVal = period === 'CURRENT' ? line.currentAmount : line.comparativeAmount;
    const ledVal = period === 'CURRENT' ? line.ledgerCurrent : line.ledgerComparative;
    setEditingCell({
      lineKey,
      lineLabel: line.labelAr,
      period,
      currentValue: curVal,
      ledgerValue: ledVal,
    });
    setEditOverrideAmount(String(curVal));
    setEditReason(line.adjustmentCurrent?.reason || line.adjustmentComparative?.reason || '');
    setEditError(null);
  };

  const handleSaveCellEdit = () => {
    if (!editingCell || !activeClientId) return;
    const num = parseFloat(editOverrideAmount);
    if (isNaN(num)) {
      setEditError('يرجى إدخال قيمة رقمية صحيحة.');
      return;
    }
    const cleanReason = editReason.trim();
    if (!cleanReason) {
      setEditError('سبب التعديل اليدوي إلزامي ولا يمكن حفظ التعديل بدونه.');
      return;
    }

    try {
      db.upsertManagerStatementAdjustment({
        clientId: activeClientId,
        fiscalYear: targetYear,
        lineKey: editingCell.lineKey,
        period: editingCell.period,
        overrideAmount: num,
        reason: cleanReason,
      });
      setEditingCell(null);
      setActionMessage({ type: 'success', text: `تم تحديث بند (${editingCell.lineLabel}) بنجاح وانعكس في كافة القوائم والإيضاحات.` });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setEditError(err.message || 'تعذر حفظ التعديل');
    }
  };

  const handleResetLineToLedger = (lineKey: string, period?: StatementAdjustmentPeriod) => {
    if (!canEditFinalStatements || !activeClientId) return;
    try {
      db.resetManagerStatementAdjustmentLine({
        clientId: activeClientId,
        fiscalYear: targetYear,
        lineKey,
        period,
      });
      setActionMessage({ type: 'success', text: 'تم إرجاع البند لرصيد دفتر الأستاذ بنجاح.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'تعذر إرجاع البند' });
    }
  };

  const handleResetAllToLedger = () => {
    if (!canEditFinalStatements || !activeClientId) return;
    if (!window.confirm('هل أنت متأكد من رغبتك في إرجاع جميع البنود المعدلة يدويًا إلى أرصدة دفتر الأستاذ الأصلية؟')) {
      return;
    }
    try {
      db.resetAllManagerStatementAdjustments(activeClientId, targetYear);
      setActionMessage({ type: 'success', text: 'تم إرجاع جميع بنود القوائم المالية لأرصدة دفتر الأستاذ.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'تعذر إرجاع البنود' });
    }
  };

  // Open line rename modal
  const handleOpenRenameLine = (lineKey: string, currentLabel: string) => {
    if (!canEditFinalStatements) return;
    setRenamingLine({ lineKey, currentLabel });
    setRenameInput(currentLabel);
  };

  const handleSaveRenameLine = () => {
    if (!renamingLine || !activeClientId) return;
    const cleanLabel = renameInput.trim();
    if (!cleanLabel) return;
    try {
      db.setStatementLineDisplayName({
        clientId: activeClientId,
        fiscalYear: targetYear,
        lineKey: renamingLine.lineKey,
        customLabelAr: cleanLabel,
      });
      setRenamingLine(null);
      setActionMessage({ type: 'success', text: 'تم تحديث مسمى البند بنجاح وتوثيقه في سجل المراجعة.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'تعذر تعديل المسمى');
    }
  };

  // Start editing approved version (produces working draft)
  const handleStartEditingApprovedVersion = () => {
    if (!canEditFinalStatements || !activeClientId) return;
    try {
      const res = db.startEditingApprovedStatementVersion(activeClientId, targetYear, selectedVersion);
      setSelectedVersion(undefined); // Switch to working draft view
      setActionMessage({
        type: 'success',
        text: `تم فتح نسخة عمل (مسودة تعديل الإصدار النهائي) بناءً على الإصدار (${res.draftLayer.basedOnVersion}). يمكنك الآن تعديل الأرقام ثم اعتماد الإصدار الجديد N+1.`,
      });
      setTimeout(() => setActionMessage(null), 6000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'تعذر فتح نسخة التعديل' });
    }
  };

  // Approve modified statement version (produces version N+1)
  const handleApproveEditedVersion = () => {
    if (!canEditFinalStatements || !activeClientId) return;
    const isReissue = approvedSnapshots.length > 0;
    if (isReissue && !reissueReasonInput.trim()) {
      setReissueError('سبب إعادة الإصدار إلزامي ولا يمكن اعتماد التعديل بدونه.');
      return;
    }
    try {
      const res = db.approveStatementModelVersion({
        clientId: activeClientId,
        fiscalYear: targetYear,
        reissueReason: reissueReasonInput.trim(),
      });
      setIsReissueModalOpen(false);
      setReissueReasonInput('');
      setSelectedVersion(res.snapshot.version);
      setActionMessage({
        type: 'success',
        text: `تم اعتماد القوائم بنجاح وإصدار النسخة (${res.snapshot.version}) ببصمة أمان جديدة وتحديث كود التحقق. تم وسم الإصدار السابق بـ SUPERSEDED.`,
      });
      setTimeout(() => setActionMessage(null), 7000);
    } catch (err: any) {
      setReissueError(err.message || 'تعذر اعتماد الإصدار');
    }
  };

  // Explanatory note manual text edit
  const handleSaveNoteEdit = (noteId: string) => {
    if (!canEditFinalStatements || !activeClientId) return;
    try {
      db.saveStatementNoteManualEdit({
        clientId: activeClientId,
        fiscalYear: targetYear,
        noteId,
        manualParagraph: editingNoteText,
      });
      setEditingNoteId(null);
      setActionMessage({ type: 'success', text: 'تم حفظ نص الإيضاح المتمم بنجاح وتحديث النموذج.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ الإيضاح');
    }
  };

  const handleConfirmNoteReview = (noteId: string) => {
    if (!canEditFinalStatements || !activeClientId) return;
    try {
      db.confirmStatementNoteReview({
        clientId: activeClientId,
        fiscalYear: targetYear,
        noteId,
      });
      setActionMessage({ type: 'success', text: 'تم تأكيد مراجعة الإيضاح وتحديث أرقام الأساس.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'تعذر تأكيد المراجعة');
    }
  };

  // Export internal adjustments report to CSV/Excel
  const handleExportAdjustmentsReportCsv = () => {
    const rows = model.adjustmentsImpactReport;
    if (!rows || rows.length === 0) {
      alert('لا توجد تعديلات يدوية مسجلة لتصديرها.');
      return;
    }
    const header = [
      'البند',
      'الفترة',
      'رصيد الأستاذ',
      'الرصيد المعدل',
      'الفارق',
      'السبب',
      'المستخدم',
      'التاريخ والوقت',
      'الأثر على إجمالي الأصول',
      'الأثر على الالتزامات وحقوق الملكية',
      'الأثر على صافي الربح',
      'الأثر على النقدية',
    ];
    const csvContent =
      '\uFEFF' +
      [
        header.join(','),
        ...rows.map((r) =>
          [
            `"${r.lineLabelAr.replace(/"/g, '""')}"`,
            r.period === 'CURRENT' ? 'الحالية' : 'المقارنة',
            r.ledgerAmount,
            r.overrideAmount,
            r.diff,
            `"${r.reason.replace(/"/g, '""')}"`,
            `"${r.by.replace(/"/g, '""')}"`,
            `"${r.at}"`,
            r.impactOnAssets,
            r.impactOnLiabilitiesAndEquity,
            r.impactOnNetProfit,
            r.impactOnCash,
          ].join(',')
        ),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_فروق_التعديلات_اليدوية_${activeClient?.name || activeClientId}_${targetYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeClient) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 text-xs flex items-center gap-3" dir="rtl">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-black text-sm">يرجى اختيار المنشأة (العميل) لعرض القوائم المالية</p>
          <p className="mt-1">كل منشأة لها قوائم مالية وطبقة تعديلات مدير وإصدارات معتمدة مستقلة لكل سنة مالية.</p>
        </div>
      </div>
    );
  }

  if (unassignedSummary.totalCount > 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-900 text-xs flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-700" />
          <div>
            <p className="font-black text-sm">
              لا يمكن استخراج أو اعتماد القوائم المالية قبل معالجة السجلات غير المنسوبة ({unassignedSummary.totalCount} سجل)
            </p>
            <p className="mt-1">
              يوجد سجلات معلقة غير منسوبة لعميل (قيود: {unassignedSummary.journalEntriesCount}، فواتير: {unassignedSummary.invoicesCount}، خزنة: {unassignedSummary.treasuryTransactionsCount}، أصول: {unassignedSummary.fixedAssetsCount}، إقرارات: {unassignedSummary.taxDeclarationsCount}).
              يلزم نسبها للمنشأة المختصة لضمان تكامل وموثوقية القوائم المالية.
            </p>
          </div>
        </div>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('UNASSIGNED_ENTRIES')}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold shrink-0 hover:bg-rose-700"
          >
            فتح شاشة السجلات غير المنسوبة
          </button>
        )}
      </div>
    );
  }

  // Render an editable amount cell with color dot & tooltip if modified
  const renderAmountCell = (
    lineKey: FinancialStatementLineKey | string,
    period: StatementAdjustmentPeriod,
    amount: number
  ) => {
    const line = model.linesMap[lineKey];
    const isOverridden = period === 'CURRENT' ? line?.isOverriddenCurrent : line?.isOverriddenComparative;
    const adj = period === 'CURRENT' ? line?.adjustmentCurrent : line?.adjustmentComparative;
    const ledgerVal = period === 'CURRENT' ? line?.ledgerCurrent ?? 0 : line?.ledgerComparative ?? 0;

    return (
      <div className="relative group inline-flex items-center justify-end gap-1.5 font-mono font-bold">
        {/* Visual edit dot (only on screen, hidden when hideAdjustmentMarks is true or when printing) */}
        {isOverridden && !hideAdjustmentMarks && (
          <span
            className="w-2 h-2 rounded-full bg-amber-500 shrink-0 cursor-help print:hidden"
            title={`عُدِّل يدويًا: الأصل ${formatEgyptianCurrency(ledgerVal)}، الجديد ${formatEgyptianCurrency(amount)}، السبب: ${adj?.reason || '—'}`}
          />
        )}

        <span
          className={`cursor-pointer px-1 py-0.5 rounded-sm transition-colors ${
            isOverridden && !hideAdjustmentMarks
              ? 'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40'
              : 'text-slate-900 dark:text-white'
          } ${canEditFinalStatements ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:underline' : ''}`}
          onDoubleClick={() => canEditFinalStatements && handleOpenCellEdit(lineKey, period)}
          title={canEditFinalStatements ? 'انقر نقراً مزدوجاً أو على أيقونة القلم لتعديل الرقم' : undefined}
        >
          {formatEgyptianCurrency(amount)}
        </span>

        {/* Edit & Revert Actions for authorized manager (hidden when printing) */}
        {canEditFinalStatements && (
          <div className="hidden group-hover:inline-flex items-center gap-0.5 print:hidden">
            <button
              type="button"
              onClick={() => handleOpenCellEdit(lineKey, period)}
              className="p-1 rounded-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900"
              title="تعديل هذا الرقم يدويًا"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            {isOverridden && (
              <button
                type="button"
                onClick={() => handleResetLineToLedger(lineKey, period)}
                className="p-1 rounded-sm text-amber-600 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900"
                title={`إرجاع لرصيد الأستاذ الأصلي (${formatEgyptianCurrency(ledgerVal)})`}
              >
                <Undo2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 text-xs" dir="rtl">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border font-bold flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100'
              : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent Reconciliation & Matching Panel (لوحة المطابقة الثابتة - الجزء ج-4) */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-md space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-black text-sm">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>لوحة المطابقة المحاسبية المستمرة (Reconciliation Bar)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">التعديلات اليدوية بالطبقة:</span>
            <span className="font-mono font-bold text-amber-400">
              {model.reconciliation.manualAdjustmentsCount} بند (إجمالي الفروق: {formatEgyptianCurrency(model.reconciliation.manualAdjustmentsTotalAbsolute)})
            </span>
            {model.reconciliation.manualAdjustmentsCount > 0 && canEditFinalStatements && (
              <button
                type="button"
                onClick={handleResetAllToLedger}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold border border-amber-500/30 text-[10px] flex items-center gap-1"
                title="إرجاع كافة البنود لأرصدة الأستاذ"
              >
                <Undo2 className="w-3 h-3" />
                <span>إرجاع الكل للأستاذ</span>
              </button>
            )}
          </div>
        </div>

        {(() => {
          const rec = model.reconciliation || ({} as any);
          const bsDiff = rec.balanceSheetDifference ?? rec.assetsVsLiabilitiesAndEquityDiff ?? rec.assetsVsLiabilitiesEquityDiff ?? 0;
          const npDiff = rec.netProfitDifference ?? rec.netProfitIncomeVsEquityDiff ?? 0;
          const cashDiff = rec.cashDifference ?? rec.cashFlowVsBalanceSheetCashDiff ?? 0;
          const isBsBalanced = Boolean(rec.isBalanceSheetBalanced ?? (Math.abs(bsDiff) < 0.01));
          const isNpMatched = Boolean(rec.isNetProfitMatched ?? rec.isNetProfitConsistent ?? (Math.abs(npDiff) < 0.01));
          const isCashMatched = Boolean(rec.isCashMatched ?? rec.isCashConsistent ?? (Math.abs(cashDiff) < 0.01));
          const isAllMatched = Boolean(rec.isAllMatched ?? (isBsBalanced && isNpMatched && isCashMatched));

          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Difference 1: Assets vs Liabilities + Equity */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isBsBalanced
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-rose-950/60 border-rose-600 text-rose-200'
                  }`}
                >
                  <div>
                    <p className="text-[11px] text-slate-400">فارق الميزانية (الأصول - الالتزامات وحقوق الملكية)</p>
                    <p className="font-black text-xs mt-0.5">
                      {isBsBalanced ? 'متزنة تماماً (0.00)' : 'يوجد فارق عدم توازن'}
                    </p>
                  </div>
                  <span className={`font-mono font-black text-sm ${isBsBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatEgyptianCurrency(bsDiff)}
                  </span>
                </div>

                {/* Difference 2: Income Statement Net Profit vs Equity Net Profit */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isNpMatched
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-rose-950/60 border-rose-600 text-rose-200'
                  }`}
                >
                  <div>
                    <p className="text-[11px] text-slate-400">فارق صافي الربح (قائمة الدخل - حقوق الملكية)</p>
                    <p className="font-black text-xs mt-0.5">
                      {isNpMatched ? 'مطابق تماماً (0.00)' : 'فارق بين الدخل وحقوق الملكية'}
                    </p>
                  </div>
                  <span className={`font-mono font-black text-sm ${isNpMatched ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatEgyptianCurrency(npDiff)}
                  </span>
                </div>

                {/* Difference 3: Cash Flow Ending Cash vs Balance Sheet Cash */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isCashMatched
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-rose-950/60 border-rose-600 text-rose-200'
                  }`}
                >
                  <div>
                    <p className="text-[11px] text-slate-400">فارق النقدية (التدفقات النقدية - المركز المالي)</p>
                    <p className="font-black text-xs mt-0.5">
                      {isCashMatched ? 'مطابق تماماً (0.00)' : 'فارق رصيد النقدية آخر المدة'}
                    </p>
                  </div>
                  <span className={`font-mono font-black text-sm ${isCashMatched ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatEgyptianCurrency(cashDiff)}
                  </span>
                </div>
              </div>

              {/* Warning Callout when any difference exists */}
              {!isAllMatched && (
                <div className="bg-rose-900/60 border border-rose-500 p-2.5 rounded-xl text-rose-200 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    تنبيه محاسبي للمدير: توجد فروق مطابقة ناتجة عن تعديلات يدوية أو عدم ربط حسابات. الفروق لا تمنع الحفظ ولا تمنع الاعتماد وفق معايير النظام، ولا يتم إدخال أي تسوية آلية أو حساب وهمي.
                  </span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Main Card with Tabs & Actions */}
      <div id="financial-statements-printable" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5">
        {/* Top Header & Version Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  القوائم المالية • {activeClient.name}
                </h2>
                {/* Version badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    model.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : model.status === 'SUPERSEDED'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 line-through'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {model.status === 'APPROVED'
                    ? `إصدار معتمد V${model.version}`
                    : model.status === 'SUPERSEDED'
                    ? `إصدار مستبدل (SUPERSEDED) V${model.version}`
                    : `مسودة عمل V${model.version}`}
                </span>

                {model.supersededAt && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    (استُبدل بالإصدار V{model.supersededByVersion} بتاريخ {model.supersededAt.slice(0, 10)})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                السنة المالية: <strong>{targetYear}</strong> • من {fiscalBounds.startDate} حتى {fiscalBounds.endDate} ({fiscalBounds.labelAr})
                {model.verificationCode && (
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">
                    • كود التحقق: {model.verificationCode}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {/* Version Switcher if multiple versions exist */}
            {approvedSnapshots.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedVersion ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedVersion(val);
                  }}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">مسودة العمل الحالية / الأحدث</option>
                  {approvedSnapshots.map((s) => (
                    <option key={s.id} value={s.version}>
                      إصدار V{s.version} ({s.status === 'SUPERSEDED' ? 'مستبدل' : 'معتمد'}) - {s.approvedAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Edit Final Approved Version Button (الجزء د-1) */}
            {canEditFinalStatements && latestApprovedSnap && selectedVersion !== undefined && (
              <button
                type="button"
                onClick={handleStartEditingApprovedVersion}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold flex items-center gap-1.5 hover:bg-amber-700 shadow-xs"
                title="فتح مسودة عمل لتعديل هذا الإصدار النهائي وإنتاج إصدار جديد N+1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الإصدار النهائي</span>
              </button>
            )}

            {/* Approve Working Version Button */}
            {canEditFinalStatements && model.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => {
                  setReissueReasonInput('');
                  setReissueError(null);
                  setIsReissueModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>اعتماد الإصدار ({model.version})</span>
              </button>
            )}

            {/* Toggle Adjustment Marks (إخفاء علامات التعديل - الجزء ج-2) */}
            <button
              type="button"
              onClick={() => setHideAdjustmentMarks((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                hideAdjustmentMarks
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="إخفاء النقاط والتلميحات المميزة للأرقام المعدلة يدويًا"
            >
              {hideAdjustmentMarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideAdjustmentMarks ? 'إظهار علامات التعديل' : 'إخفاء علامات التعديل'}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={() => {
                setHideAdjustmentMarks(true);
                setTimeout(() => {
                  PrintService.printElementById('financial-statements-printable', {
                    documentTitle: `القوائم المالية - ${activeClient.name} - ${targetYear}`,
                  });
                }, 100);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-1.5 hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة نظيفة</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('BALANCE_SHEET')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'BALANCE_SHEET'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>المركز المالي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INCOME_STATEMENT')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'INCOME_STATEMENT'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>قائمة الدخل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CASH_FLOW')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'CASH_FLOW'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>التدفقات النقدية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EQUITY')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'EQUITY'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>التغير في حقوق الملكية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NOTES')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'NOTES'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>الإيضاحات المتممة ({model.notes.length})</span>
            {model.notes.some((n) => n.needsReview) && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="يوجد إيضاحات تحتاج مراجعة" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RATIOS')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'RATIOS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>النسب والمؤشرات المالية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADJUSTMENTS_REPORT')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'ADJUSTMENTS_REPORT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>تقرير فروق التعديلات اليدوية ({model.adjustmentsImpactReport.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MAPPING')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'MAPPING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>تخطيط بنود القوائم</span>
          </button>
        </div>

        {/* TAB 1: BALANCE SHEET (المركز المالي) */}
        {activeTab === 'BALANCE_SHEET' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Column */}
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-black text-sm text-blue-900 dark:text-blue-100">الأصول (Assets)</h4>
                </div>

                {/* Current Assets */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>الأصول المتداولة</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(model.balanceSheet.totals.currentAssets)}
                    </span>
                  </div>
                  {model.balanceSheet.currentAssets.map((line) => (
                    <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {canEditFinalStatements && (
                          <button
                            type="button"
                            onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                            className="text-slate-400 hover:text-slate-700 print:hidden"
                            title="تعديل اسم البند"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span>{line.labelAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                          مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                        </span>
                        {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Non-Current Assets */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>الأصول غير المتداولة</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(model.balanceSheet.totals.nonCurrentAssets)}
                    </span>
                  </div>
                  {model.balanceSheet.nonCurrentAssets.map((line) => (
                    <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {canEditFinalStatements && (
                          <button
                            type="button"
                            onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                            className="text-slate-400 hover:text-slate-700 print:hidden"
                            title="تعديل اسم البند"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span>{line.labelAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                          مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                        </span>
                        {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Assets Summary */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center font-black text-sm">
                  <span>إجمالي الأصول (Total Assets)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      مقارن: {formatEgyptianCurrency(model.comparative.totalAssets)}
                    </span>
                    <span className="font-mono text-emerald-300">
                      {formatEgyptianCurrency(model.balanceSheet.totals.totalAssets)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                  <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-100">الالتزامات وحقوق الملكية</h4>
                </div>

                {/* Current Liabilities */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>الالتزامات المتداولة</span>
                    <span className="font-mono text-rose-700 dark:text-rose-400">
                      {formatEgyptianCurrency(model.balanceSheet.totals.currentLiabilities)}
                    </span>
                  </div>
                  {model.balanceSheet.currentLiabilities.map((line) => (
                    <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {canEditFinalStatements && (
                          <button
                            type="button"
                            onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                            className="text-slate-400 hover:text-slate-700 print:hidden"
                            title="تعديل اسم البند"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span>{line.labelAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                          مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                        </span>
                        {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Non-Current Liabilities */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>الالتزامات غير المتداولة</span>
                    <span className="font-mono text-rose-700 dark:text-rose-400">
                      {formatEgyptianCurrency(model.balanceSheet.totals.nonCurrentLiabilities)}
                    </span>
                  </div>
                  {model.balanceSheet.nonCurrentLiabilities.map((line) => (
                    <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {canEditFinalStatements && (
                          <button
                            type="button"
                            onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                            className="text-slate-400 hover:text-slate-700 print:hidden"
                            title="تعديل اسم البند"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span>{line.labelAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                          مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                        </span>
                        {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Equity */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>حقوق الملكية (Equity)</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-400">
                      {formatEgyptianCurrency(model.balanceSheet.totals.totalEquity)}
                    </span>
                  </div>
                  {model.balanceSheet.equity.map((line) => (
                    <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {canEditFinalStatements && (
                          <button
                            type="button"
                            onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                            className="text-slate-400 hover:text-slate-700 print:hidden"
                            title="تعديل اسم البند"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span>{line.labelAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                          مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                        </span>
                        {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                      </div>
                    </div>
                  ))}

                  {/* Net profit derived from income statement */}
                  <div className="flex justify-between items-center py-1.5 text-xs border-t border-slate-100 dark:border-slate-800 font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      صافي أرباح (خسائر) العام مشتقة تلقائياً من قائمة الدخل
                    </span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(model.incomeStatement.totals.netProfit)}
                    </span>
                  </div>
                </div>

                {/* Total Liabilities & Equity Summary */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center font-black text-sm">
                  <span>إجمالي الالتزامات وحقوق الملكية</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      مقارن: {formatEgyptianCurrency(model.comparative.totalLiabilitiesAndEquity)}
                    </span>
                    <span className="font-mono text-emerald-300">
                      {formatEgyptianCurrency(model.balanceSheet.totals.totalLiabilitiesAndEquity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INCOME STATEMENT (قائمة الدخل) */}
        {activeTab === 'INCOME_STATEMENT' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                قائمة الدخل عن الفترة من {fiscalBounds.startDate} حتى {fiscalBounds.endDate}
              </h3>
              <p className="text-slate-500 text-[11px]">
                جميع الإجماليات وهوامش الربح مشتقة آلياً وتتحدث فور تعديل أي رقم يدويًا
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 bg-white dark:bg-slate-900">
              {model.incomeStatement.lines.map((line) => (
                <div
                  key={line.lineKey}
                  className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    {canEditFinalStatements && (
                      <button
                        type="button"
                        onClick={() => handleOpenRenameLine(line.lineKey, line.labelAr)}
                        className="text-slate-400 hover:text-slate-700 print:hidden"
                        title="تعديل اسم البند"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{line.labelAr}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-400 font-mono">
                      مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                    </span>
                    {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                  </div>
                </div>
              ))}

              {/* Derived Totals */}
              <div className="pt-3 space-y-2 font-bold">
                <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3.5 rounded-xl">
                  <span>صافي الإيرادات التشغيلية</span>
                  <span className="font-mono text-blue-700 dark:text-blue-300">
                    {formatEgyptianCurrency(model.incomeStatement.totals.netRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 rounded-xl text-emerald-900 dark:text-emerald-100 font-black">
                  <span>مجمل الربح (Gross Profit)</span>
                  <span className="font-mono">
                    {formatEgyptianCurrency(model.incomeStatement.totals.grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3.5 rounded-xl">
                  <span>الربح التشغيلي (Operating Profit)</span>
                  <span className="font-mono">
                    {formatEgyptianCurrency(model.incomeStatement.totals.operatingProfit)}
                  </span>
                </div>
                <div
                  className={`p-4 rounded-2xl flex justify-between items-center font-black text-sm text-white ${
                    model.incomeStatement.totals.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  <span>
                    {model.incomeStatement.totals.netProfit >= 0 ? 'صافي أرباح العام' : 'صافي خسائر العام'}
                  </span>
                  <span className="font-mono text-base">
                    {formatEgyptianCurrency(model.incomeStatement.totals.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CASH FLOW (قائمة التدفقات النقدية - الطريقة غير المباشرة المشتقة) */}
        {activeTab === 'CASH_FLOW' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                قائمة التدفقات النقدية (الطريقة غير المباشرة)
              </h3>
              <p className="text-slate-500 text-[11px]">
                مشتقة بالكامل من صافي الربح والتغير في بنود رأس المال العامل والأنشطة الاستثمارية والتمويلية
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 bg-white dark:bg-slate-900">
              {/* Operating Activities */}
              <div className="space-y-2">
                <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-200 pb-1 border-b">
                  تدفقات الأنشطة التشغيلية
                </h4>
                {model.cashFlow.operatingLines.map((line) => (
                  <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                    <span>{line.labelAr}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">
                        مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                      </span>
                      {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3 rounded-xl font-bold">
                  <span>صافي التدفقات من الأنشطة التشغيلية</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(model.cashFlow.totals.netOperatingCash)}
                  </span>
                </div>
              </div>

              {/* Investing Activities */}
              <div className="space-y-2">
                <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-200 pb-1 border-b">
                  تدفقات الأنشطة الاستثمارية
                </h4>
                {model.cashFlow.investingLines.map((line) => (
                  <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                    <span>{line.labelAr}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">
                        مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                      </span>
                      {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3 rounded-xl font-bold">
                  <span>صافي التدفقات من الأنشطة الاستثمارية</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(model.cashFlow.totals.netInvestingCash)}
                  </span>
                </div>
              </div>

              {/* Financing Activities */}
              <div className="space-y-2">
                <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-200 pb-1 border-b">
                  تدفقات الأنشطة التمويلية
                </h4>
                {model.cashFlow.financingLines.map((line) => (
                  <div key={line.lineKey} className="flex justify-between items-center py-1 text-slate-600 dark:text-slate-400">
                    <span>{line.labelAr}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">
                        مقارن: {renderAmountCell(line.lineKey, 'COMPARATIVE', line.comparativeAmount)}
                      </span>
                      {renderAmountCell(line.lineKey, 'CURRENT', line.currentAmount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/40 px-3 rounded-xl font-bold">
                  <span>صافي التدفقات من الأنشطة التمويلية</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatEgyptianCurrency(model.cashFlow.totals.netFinancingCash)}
                  </span>
                </div>
              </div>

              {/* Net Cash Position */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 font-bold">
                <div className="flex justify-between items-center">
                  <span>صافي التغير في النقدية خلال العام</span>
                  <span className="font-mono text-emerald-300">
                    {formatEgyptianCurrency(model.cashFlow.totals.netChangeInCash)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>رصيد النقدية في بداية العام</span>
                  <span className="font-mono">
                    {formatEgyptianCurrency(model.cashFlow.totals.beginningCash)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-800">
                  <span>رصيد النقدية في نهاية العام (المطابق للمركز المالي)</span>
                  <span className="font-mono text-emerald-400 text-base">
                    {formatEgyptianCurrency(model.cashFlow.totals.endingCash)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EQUITY STATEMENT (قائمة التغير في حقوق الملكية) */}
        {activeTab === 'EQUITY' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                قائمة التغير في حقوق الملكية عن السنة المنتهية في {fiscalBounds.labelAr}
              </h3>
              <p className="text-slate-500 text-[11px]">
                توضح حركة رأس المال، والاحتياطيات، والأرباح المرحلة وصافي ربح العام
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="p-3 border">البيان</th>
                    <th className="p-3 border">رأس المال المدفوع</th>
                    <th className="p-3 border">الاحتياطيات</th>
                    <th className="p-3 border">الأرباح المرحلة</th>
                    <th className="p-3 border">صافي ربح العام</th>
                    <th className="p-3 border">إجمالي حقوق الملكية</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-3 border font-sans font-bold">الرصيد في بداية العام</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.rows[0]?.capital || 0)}</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.rows[0]?.reserves || 0)}</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.rows[0]?.retainedEarnings || 0)}</td>
                    <td className="p-3 border text-slate-400">0.00</td>
                    <td className="p-3 border font-bold">{formatEgyptianCurrency(model.equityStatement.rows[0]?.totalEquity || 0)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-3 border font-sans font-bold">صافي أرباح (خسائر) العام الحالي</td>
                    <td className="p-3 border text-slate-400">-</td>
                    <td className="p-3 border text-slate-400">-</td>
                    <td className="p-3 border text-slate-400">-</td>
                    <td className="p-3 border font-bold text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(model.incomeStatement.totals.netProfit)}
                    </td>
                    <td className="p-3 border font-bold text-emerald-700 dark:text-emerald-400">
                      {formatEgyptianCurrency(model.incomeStatement.totals.netProfit)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-black text-sm">
                    <td className="p-3 border font-sans">الرصيد في نهاية العام</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.totals.capital)}</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.totals.reserves)}</td>
                    <td className="p-3 border">{formatEgyptianCurrency(model.equityStatement.totals.retainedEarnings)}</td>
                    <td className="p-3 border text-emerald-600">{formatEgyptianCurrency(model.incomeStatement.totals.netProfit)}</td>
                    <td className="p-3 border text-indigo-700 dark:text-indigo-400">
                      {formatEgyptianCurrency(model.equityStatement.totals.totalEquity)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: NOTES (الإيضاحات المتممة للقوائم المالية - الجزء د-5) */}
        {activeTab === 'NOTES' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  الإيضاحات المتممة للقوائم المالية
                </h3>
                <p className="text-slate-500 text-[11px]">
                  القوالب تأخذ أرقامها بمفاتيح حية من النموذج، والفقرات المعدلة يدويًا تُميز عند تغير الأرقام بوسم "تحتاج مراجعة"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {model.notes.map((note) => (
                <div
                  key={note.id}
                  className={`border rounded-2xl p-5 space-y-3 bg-white dark:bg-slate-900 ${
                    note.needsReview
                      ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold flex items-center justify-center text-xs">
                        {note.noteNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{note.title}</h4>
                      {note.needsReview && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-bold text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>تحتاج مراجعة (تغيرت أرقام الأساس)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      {note.needsReview && canEditFinalStatements && (
                        <button
                          type="button"
                          onClick={() => handleConfirmNoteReview(note.id)}
                          className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تأكيد المراجعة</span>
                        </button>
                      )}
                      {canEditFinalStatements && editingNoteId !== note.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteText(note.manualParagraph || note.paragraph);
                          }}
                          className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل النص يدويًا</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note Text or Textarea */}
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={4}
                        className="w-full p-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="أدخل النص التوضيحي للإيضاح..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="px-3 py-1.5 rounded-xl border text-slate-700 dark:text-slate-300 font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNoteEdit(note.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
                        >
                          حفظ النص وتأكيد المراجعة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                      {note.manualParagraph || note.paragraph}
                    </p>
                  )}

                  {/* Linked Lines Data Table */}
                  {note.lines && note.lines.length > 0 && (
                    <div className="pt-2">
                      <table className="w-full text-xs text-right border-collapse bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden font-mono">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px]">
                            <th className="p-2 font-sans">البيان</th>
                            <th className="p-2">السنة الحالية ({targetYear})</th>
                            <th className="p-2">سنة المقارنة ({targetYear - 1})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {note.lines.map((nl) => (
                            <tr key={nl.lineKey} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="p-2 font-sans font-bold text-slate-800 dark:text-slate-200">{nl.labelAr}</td>
                              <td className="p-2">{renderAmountCell(nl.lineKey, 'CURRENT', nl.currentAmount)}</td>
                              <td className="p-2">{renderAmountCell(nl.lineKey, 'COMPARATIVE', nl.comparativeAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: RATIOS (النسب والمؤشرات المالية المشتقة) */}
        {activeTab === 'RATIOS' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                المؤشرات والنسب المالية المشتقة من النموذج
              </h3>
              <p className="text-slate-500 text-[11px]">
                تُحسب بالكامل من بنود النموذج ولا تُخزن بشكل ثابت
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {model.ratios.map((r, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1 bg-white dark:bg-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{r.nameAr}</span>
                    <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-400">
                      {r.value.toFixed(2)} {r.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{r.interpretationAr}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ADJUSTMENTS REPORT (تقرير فروق التعديلات اليدوية - الجزء ج-5) */}
        {activeTab === 'ADJUSTMENTS_REPORT' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
              <div>
                <h3 className="font-black text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>تقرير فروق التعديلات اليدوية لمدير الحسابات (داخلي)</span>
                </h3>
                <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                  يوثق الأصل، الجديد، الفارق، السبب، المستخدم، والوقت، وأثر كل تعديل على الإجماليات (لا يُطبع مع القوائم المعتمدة)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAdjustmentsReportCsv}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold flex items-center gap-1.5 hover:bg-amber-700 text-xs shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير إلى Excel / CSV</span>
                </button>
              </div>
            </div>

            {model.adjustmentsImpactReport.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border">
                لا توجد تعديلات يدوية مسجلة؛ جميع أرقام القوائم مطابقة لرصيد دفتر الأستاذ بنسبة 100%.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                      <th className="p-2.5 border">البند</th>
                      <th className="p-2.5 border">الفترة</th>
                      <th className="p-2.5 border">رصيد الأستاذ</th>
                      <th className="p-2.5 border">الرصيد المعدل</th>
                      <th className="p-2.5 border">الفارق</th>
                      <th className="p-2.5 border w-1/4">السبب</th>
                      <th className="p-2.5 border">المستخدم</th>
                      <th className="p-2.5 border">التاريخ</th>
                      <th className="p-2.5 border">الأثر على الربح</th>
                      <th className="p-2.5 border">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.adjustmentsImpactReport.map((row) => (
                      <tr key={row.adjustmentId} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono">
                        <td className="p-2.5 border font-sans font-bold text-slate-800 dark:text-slate-200">{row.lineLabelAr}</td>
                        <td className="p-2.5 border font-sans">{row.period === 'CURRENT' ? 'الحالية' : 'المقارنة'}</td>
                        <td className="p-2.5 border text-slate-500">{formatEgyptianCurrency(row.ledgerAmount)}</td>
                        <td className="p-2.5 border font-bold text-amber-700 dark:text-amber-400">{formatEgyptianCurrency(row.overrideAmount)}</td>
                        <td className={`p-2.5 border font-bold ${row.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.diff >= 0 ? `+${formatEgyptianCurrency(row.diff)}` : formatEgyptianCurrency(row.diff)}
                        </td>
                        <td className="p-2.5 border font-sans text-slate-700 dark:text-slate-300">{row.reason}</td>
                        <td className="p-2.5 border font-sans text-slate-600 dark:text-slate-400">{row.by}</td>
                        <td className="p-2.5 border text-[10px] text-slate-500">{row.at.slice(0, 16)}</td>
                        <td className="p-2.5 border">
                          {row.impactOnNetProfit !== 0 ? (
                            <span className={row.impactOnNetProfit > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {row.impactOnNetProfit > 0 ? '+' : ''}{formatEgyptianCurrency(row.impactOnNetProfit)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5 border font-sans">
                          {canEditFinalStatements && (
                            <button
                              type="button"
                              onClick={() => handleResetLineToLedger(row.lineKey, row.period)}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold"
                            >
                              إرجاع للأستاذ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: MAPPING EDITOR (تخطيط الحسابات) */}
        {activeTab === 'MAPPING' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <div>
                <h3 className="font-black text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <span>تخطيط بنود القوائم المالية للمنشأة ({activeClient.name})</span>
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  ربط الحسابات التحليلية في دفتر الأستاذ ببنود القوائم المالية
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultMapping}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة التخطيط القياسي المصري</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapping}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-indigo-700 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التخطيط</span>
                </button>
              </div>
            </div>

            {mappingSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ تخطيط بنود القوائم المالية للمنشأة وتحديث التقارير بنجاح.</span>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="p-2.5 border">كود الحساب</th>
                    <th className="p-2.5 border">اسم الحساب</th>
                    <th className="p-2.5 border">طبيعة الحساب</th>
                    <th className="p-2.5 border w-1/3">بند القائمة المستهدف</th>
                  </tr>
                </thead>
                <tbody>
                  {db.getClientAccounts(activeClientId, targetYear).map((acc) => {
                    const currentMappedKey =
                      editingMapping[acc.code] || editingMapping[acc.id] || '';

                    return (
                      <tr key={acc.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 border font-mono font-bold text-indigo-700 dark:text-indigo-400">{acc.code}</td>
                        <td className="p-2.5 border font-bold">{acc.name}</td>
                        <td className="p-2.5 border text-slate-500 font-mono text-[11px]">
                          {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                        </td>
                        <td className="p-2.5 border">
                          <select
                            value={currentMappedKey}
                            onChange={(e) => {
                              const val = e.target.value as FinancialStatementLineKey;
                              setEditingMapping((prev) => ({
                                ...prev,
                                [acc.code]: val,
                              }));
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                              currentMappedKey
                                ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                : 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                            }`}
                          >
                            <option value="">-- غير مربوط بأي بند (تنبيه) --</option>
                            {Object.entries(STATEMENT_LINE_LABELS_AR).map(([key, item]) => (
                              <option key={key} value={key}>
                                {typeof item === 'string' ? item : item.labelAr}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT LINE AMOUNT (تعديل رقم يدوي ومبرر التعديل) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl" dir="rtl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>تعديل رقم القوائم المالية • {editingCell.lineLabel}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">الفترة:</span>
                <span className="font-bold">{editingCell.period === 'CURRENT' ? `السنة الحالية (${targetYear})` : `سنة المقارنة (${targetYear - 1})`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رصيد دفتر الأستاذ الأصلي:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatEgyptianCurrency(editingCell.ledgerValue)}</span>
              </div>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 font-bold text-xs">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الجديد المعروض في القوائم المالية (ج.م) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editOverrideAmount}
                  onChange={(e) => setEditOverrideAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل اليدوي (إلزامي للتوثيق في سجل المراجعة) *
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="اكتب مبرر التعديل باختصار..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 rounded-xl border text-slate-700 dark:text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCellEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xs"
              >
                حفظ التعديل وانعكاسه آليًا
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RENAME LINE LABEL (تعديل مسمى البند) */}
      {renamingLine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl" dir="rtl">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span>تعديل مسمى البند في القوائم المالية</span>
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم البند المعروض في القوائم المطبوعة *
              </label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRenamingLine(null)}
                className="px-4 py-2 rounded-xl border text-slate-700 dark:text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRenameLine}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
              >
                حفظ المسمى
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APPROVE & REISSUE VERSION (اعتماد وإعادة إصدار النسخة N+1) */}
      {isReissueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl" dir="rtl">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  اعتماد الإصدار النهائي للقوائم المالية (V{model.version})
                </h3>
                <p className="text-[11px] text-slate-500">
                  سيتم توليد كود تحقق جديد، وحساب بصمة SHA-256 جديدة، ووسم الإصدار السابق SUPERSEDED
                </p>
              </div>
            </div>

            {reissueError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 font-bold text-xs">
                {reissueError}
              </div>
            )}

            {approvedSnapshots.length > 0 && (
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  سبب إعادة الإصدار (إلزامي للتوثيق في سجل المراجعة) *
                </label>
                <textarea
                  value={reissueReasonInput}
                  onChange={(e) => setReissueReasonInput(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: تعديل مخصص الضرائب وفق المراجعة النهائية لمصلحة الضرائب وتحديث التدفقات النقدية..."
                  autoFocus
                />
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-800 dark:text-slate-200">الأثر عند الاعتماد:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>إنشاء الإصدار رقم ({model.version}) وحفظ اللقطة الكاملة في قاعدة البيانات.</li>
                <li>الإصدار السابق رقم ({model.version - 1}) يبقى محفوظاً للقراءة فقط وموسوماً بـ SUPERSEDED.</li>
                <li>كود التحقق (QR) للإصدار السابق سيعرض للمراجعين "هذا الإصدار تم استبداله بإصدار أحدث".</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsReissueModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-slate-700 dark:text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApproveEditedVersion}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-md"
              >
                تأكيد الاعتماد وإصدار V{model.version}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
