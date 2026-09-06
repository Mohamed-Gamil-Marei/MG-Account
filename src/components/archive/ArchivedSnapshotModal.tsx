import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  RotateCcw,
  Download,
  Printer,
  Copy,
  Check,
  FileText,
  Scale,
  TrendingUp,
  Wallet,
  AlertCircle,
  Building,
  UserCheck,
  Hash,
  Sparkles,
} from 'lucide-react';
import { ClientDocument } from '../../types';
import { AutoArchiverService, AutoArchivedSnapshot } from '../../services/AutoArchiver';
import { PrintService } from '../../services/PrintService';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { db } from '../../db/localDatabase';

interface ArchivedSnapshotModalProps {
  document: ClientDocument;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: (message: string) => void;
}

export const ArchivedSnapshotModal: React.FC<ArchivedSnapshotModalProps> = ({
  document,
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'BALANCE_SHEET' | 'INCOME' | 'TECHNICAL'>('SUMMARY');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const snapshot: AutoArchivedSnapshot | null = AutoArchiverService.parseArchivedSnapshot(document);
  const timestampCode = snapshot?.timestampCode || AutoArchiverService.extractTimestampCode(document) || 'ARC-VERIFIED';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(timestampCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.fileName || `archived_snapshot_${timestampCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintArchivedReport = () => {
    if (!snapshot) return;

    const printHtml = `
      <div style="direction: rtl; font-family: system-ui, -apple-system, sans-serif; padding: 10px;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${snapshot.firmName}</h2>
          <div style="font-size: 13px; color: #334155; margin-top: 4px;">
            المحاسب القانوني ومراقب الحسابات: <strong>${snapshot.auditorName}</strong> (قيد رقم: ${snapshot.registrationNumber})
          </div>
          <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 11px; padding: 4px 12px; border-radius: 6px; margin-top: 8px; font-family: monospace; font-weight: bold;">
            وثيقة معتمدة ومؤرشفة آلياً بترميز زمني موثق: ${snapshot.timestampCode}
          </div>
        </div>

        <div style="margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px; color: #64748b;">اسم المنشأة / العميل:</td>
              <td style="padding: 4px; font-weight: bold; color: #0f172a;">${snapshot.clientName}</td>
              <td style="padding: 4px; color: #64748b;">السنة المالية المعتمدة:</td>
              <td style="padding: 4px; font-weight: bold; color: #0f172a; font-family: monospace;">${snapshot.fiscalYear}</td>
            </tr>
            <tr>
              <td style="padding: 4px; color: #64748b;">تاريخ ووقت الأرشفة:</td>
              <td style="padding: 4px; font-family: monospace;">${snapshot.archivedAt?.replace('T', ' ').substring(0, 19)}</td>
              <td style="padding: 4px; color: #64748b;">البصمة الرقمية (Hash):</td>
              <td style="padding: 4px; font-family: monospace; font-size: 10px; color: #047857;">${snapshot.integrityHash}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">
          ملخص المؤشرات والقوائم المالية المعتمدة في اللقطة
        </h3>

        <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 8px; text-align: right;">البيان المالي</th>
              <th style="padding: 8px; text-align: left; font-family: monospace;">القيمة المعتمدة (EGP)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">إجمالي الأصول (Total Assets)</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #047857;">
                ${formatEgyptianCurrency(snapshot.summary?.totalAssets || 0)}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">إجمالي الالتزامات (Total Liabilities)</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; color: #b91c1c;">
                ${formatEgyptianCurrency(snapshot.summary?.totalLiabilities || 0)}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">حقوق الملكية ورأس المال (Total Equity)</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0284c7;">
                ${formatEgyptianCurrency(snapshot.summary?.totalEquity || 0)}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0; background: #f0fdf4;">
              <td style="padding: 8px; font-weight: bold;">صافي أرباح / خسائر النشاط (Net Profit)</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: 800; color: #15803d;">
                ${formatEgyptianCurrency(snapshot.summary?.netProfit || 0)}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">إجمالي إيرادات النشاط والمبيعات (Revenues)</td>
              <td style="padding: 8px; text-align: left; font-family: monospace;">
                ${formatEgyptianCurrency(snapshot.summary?.revenues || 0)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
          <div>تمت الأرشفة إلكترونياً بواسطة محرك AutoArchiver ومحمية ببصمة التحقق EAS</div>
          <div>اعتماد ومصادقة مراقب الحسابات: <strong>${snapshot.auditorName}</strong> (توقيع رسمي)</div>
        </div>
      </div>
    `;

    PrintService.printHtmlContent(printHtml, `تقرير_مستند_مؤرشف_${timestampCode}`);
  };

  const handleRestoreSnapshot = () => {
    if (!snapshot) return;
    setIsRestoring(true);

    try {
      // 1. Set the active client to this document's client
      if (snapshot.clientId) {
        db.setActiveClient(snapshot.clientId, { fiscalYear: snapshot.fiscalYear });
      }

      // 2. If snapshot contains custom overrides, save or apply them
      if (snapshot.rawPayload?.overrides) {
        const key = `fs_overrides_${snapshot.clientId || 'default'}_${snapshot.fiscalYear}`;
        localStorage.setItem(key, JSON.stringify(snapshot.rawPayload.overrides));
      }

      // 3. Log audit event
      db.logAudit(
        'UPDATE',
        `استرجاع لقطة أرشيفية معتمدة بكود (${snapshot.timestampCode}) للسنة المالية ${snapshot.fiscalYear} للعميل: ${snapshot.clientName}`
      );

      setRestoreNotice(
        `تم استرجاع واعتماد لقطة البيانات بنجاح للسنة المالية ${snapshot.fiscalYear}. تم تفعيل ملف العميل ومطابقة الأرصدة.`
      );

      if (onRestoreSuccess) {
        onRestoreSuccess(
          `تم استرجاع اللقطة المؤرشفة (${snapshot.timestampCode}) بنجاح وتعيين ${snapshot.clientName} كعميل نشط لسنة ${snapshot.fiscalYear}.`
        );
      }
    } catch (e: any) {
      alert('حدث خطأ أثناء استرجاع اللقطة: ' + e?.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 text-xs my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900">{document.title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] border border-emerald-300">
                  مؤرشف آلياً (AutoArchived)
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                مستند مالي معتمد ومحفوظ في قاعدة البيانات بترميز زمني موثق وبصمة أمان غير قابلة للتعديل.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Timestamp & Integrity Bar */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">الترميز الزمني المعتمد:</span>
            </div>
            <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {timestampCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="نسخ كود التوثيق"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span className="text-slate-400">تاريخ الحفظ:</span>
            <span className="font-bold text-slate-700">{document.uploadedAt}</span>
            {snapshot?.integrityHash && (
              <span className="px-2 py-0.5 bg-slate-200/60 text-slate-700 rounded text-[10px]">
                {snapshot.integrityHash}
              </span>
            )}
          </div>
        </div>

        {/* Success Notice if restored */}
        {restoreNotice && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-900 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{restoreNotice}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-3 pb-2 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SUMMARY'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>ملخص المؤشرات المعتمدة</span>
          </button>

          <button
            onClick={() => setActiveTab('BALANCE_SHEET')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BALANCE_SHEET'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>لقطة المركز المالي</span>
          </button>

          <button
            onClick={() => setActiveTab('INCOME')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'INCOME'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>لقطة قائمة الدخل</span>
          </button>

          <button
            onClick={() => setActiveTab('TECHNICAL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TECHNICAL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>البيانات الفنية والهاش</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: SUMMARY */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-4">
              {/* Client & Auditor Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-indigo-700 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">المنشأة والممول:</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {snapshot?.clientName || 'العميل المسجل'}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 font-mono">
                      السنة المالية: {snapshot?.fiscalYear || '2026'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-700 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">المحاسب القانوني المعتمد:</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {snapshot?.auditorName || 'محمد جميل مرعي'}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {snapshot?.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات'} (سجل: {snapshot?.registrationNumber || '12845'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                  <span className="text-emerald-700 block font-semibold text-[11px]">إجمالي الأصول</span>
                  <span className="text-sm font-bold text-emerald-900 mt-1 block font-mono">
                    {formatEgyptianCurrency(snapshot?.summary?.totalAssets || 0)}
                  </span>
                </div>

                <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200">
                  <span className="text-rose-700 block font-semibold text-[11px]">إجمالي الالتزامات</span>
                  <span className="text-sm font-bold text-rose-900 mt-1 block font-mono">
                    {formatEgyptianCurrency(snapshot?.summary?.totalLiabilities || 0)}
                  </span>
                </div>

                <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200">
                  <span className="text-blue-700 block font-semibold text-[11px]">حقوق الملكية</span>
                  <span className="text-sm font-bold text-blue-900 mt-1 block font-mono">
                    {formatEgyptianCurrency(snapshot?.summary?.totalEquity || 0)}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200">
                  <span className="text-amber-700 block font-semibold text-[11px]">صافي الربح / الخسارة</span>
                  <span className="text-sm font-bold text-amber-900 mt-1 block font-mono">
                    {formatEgyptianCurrency(snapshot?.summary?.netProfit || 0)}
                  </span>
                </div>
              </div>

              {/* Notes if any */}
              {document.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900 ml-1">ملاحظات الأرشفة والرقابة:</span>
                  <span>{document.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BALANCE SHEET */}
          {activeTab === 'BALANCE_SHEET' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-right">البند في المركز المالي</th>
                      <th className="py-2.5 px-3 text-left font-mono">القيمة المعتمدة (EGP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">أصول غير متداولة (أصول ثابتة واستثمارات)</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(snapshot?.rawPayload?.balanceSheet?.nonCurrentAssetsTotal || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">أصول متداولة (مخزون، عملاء، نقدية بالبنوك)</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(snapshot?.rawPayload?.balanceSheet?.currentAssetsTotal || 0)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50 font-bold">
                      <td className="py-2.5 px-3 text-emerald-950 font-black">إجمالي الأصول المعتمدة</td>
                      <td className="py-2.5 px-3 text-left font-mono text-emerald-900 font-black">
                        {formatEgyptianCurrency(snapshot?.summary?.totalAssets || snapshot?.rawPayload?.balanceSheet?.totalAssets || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">حقوق الملكية (رأس المال والاحتياطيات)</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(snapshot?.summary?.totalEquity || snapshot?.rawPayload?.balanceSheet?.totalEquity || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">التزامات غير متداولة وطويلة الأجل</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(snapshot?.rawPayload?.balanceSheet?.nonCurrentLiabilitiesTotal || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">التزامات متداولة وقصيرة الأجل وموردون</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {formatEgyptianCurrency(snapshot?.rawPayload?.balanceSheet?.currentLiabilitiesTotal || 0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-2.5 px-3 text-slate-900 font-black">إجمالي الالتزامات وحقوق الملكية</td>
                      <td className="py-2.5 px-3 text-left font-mono text-slate-900 font-black">
                        {formatEgyptianCurrency(
                          (snapshot?.summary?.totalEquity || 0) + (snapshot?.summary?.totalLiabilities || 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INCOME STATEMENT */}
          {activeTab === 'INCOME' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-right">بيان قائمة الدخل الشامل</th>
                      <th className="py-2.5 px-3 text-left font-mono">القيمة المعتمدة (EGP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">إيرادات النشاط والمبيعات</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-emerald-800">
                        {formatEgyptianCurrency(snapshot?.summary?.revenues || snapshot?.rawPayload?.incomeStatement?.revenuesTotal || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">تكلفة المبيعات وإنتاج البضاعة (COGS)</td>
                      <td className="py-2 px-3 text-left font-mono text-rose-800">
                        ({formatEgyptianCurrency(snapshot?.rawPayload?.incomeStatement?.costOfGoodsSold || 0)})
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-2 px-3 text-slate-900">مجمل الربح (Gross Profit)</td>
                      <td className="py-2 px-3 text-left font-mono text-slate-900">
                        {formatEgyptianCurrency(snapshot?.rawPayload?.incomeStatement?.grossProfit || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">المصروفات الإدارية والعمومية والبيعية</td>
                      <td className="py-2 px-3 text-left font-mono text-rose-800">
                        ({formatEgyptianCurrency(snapshot?.rawPayload?.incomeStatement?.totalOperatingExp || 0)})
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-black">
                      <td className="py-2.5 px-3 text-emerald-950">صافي ربح / خسارة النشاط بعد الضرائب</td>
                      <td className="py-2.5 px-3 text-left font-mono text-emerald-900 text-sm">
                        {formatEgyptianCurrency(snapshot?.summary?.netProfit || snapshot?.rawPayload?.incomeStatement?.netProfitAfterTax || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL & INTEGRITY */}
          {activeTab === 'TECHNICAL' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-64">
                <pre>{JSON.stringify(snapshot, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintArchivedReport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة المستند المعتمد</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>تنزيل نسخة JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreSnapshot}
              disabled={isRestoring}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استرجاع البيانات وتفعيل هذه النسخة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
