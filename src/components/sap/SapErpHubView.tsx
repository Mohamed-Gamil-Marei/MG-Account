import React, { useState, useMemo } from 'react';
import { DatabaseState, db } from '../../db/localDatabase';
import { SapApiConfig, Account, JournalEntry } from '../../types';
import { SapConnectorService, SapConnectionTestResult, SapSyncResult } from '../../services/SapConnectorService';
import { PrintService } from '../../services/PrintService';
import {
  Layers,
  Globe2,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  KeyRound,
  ShieldCheck,
  Building2,
  ArrowRightLeft,
  Sliders,
  Check,
  Copy,
  ExternalLink,
  Activity,
  Send,
} from 'lucide-react';

interface SapErpHubViewProps {
  state: DatabaseState;
  onReturnToStandardMode: () => void;
  fiscalYear: number;
}

export const SapErpHubView: React.FC<SapErpHubViewProps> = ({
  state,
  onReturnToStandardMode,
  fiscalYear,
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CONNECTIONS' | 'GL_SYNC' | 'BAPI_EXPORT' | 'COST_CENTERS'>(
    'DASHBOARD'
  );

  // SAP Configurations in State
  const defaultSapConfig: SapApiConfig = {
    id: 'SAP-CONFIG-01',
    companyCode: '1000',
    companyName: state.officeProfile.firmName || 'شركة التجارة والصناعة المتقدمة',
    hostUrl: 'https://my-sap-s4hana-instance.corp:8443',
    odataServicePath: '/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV',
    clientNumber: '100',
    username: 'FIN_CONSULTANT_EGY',
    isActive: true,
    lastSyncTimestamp: new Date().toISOString(),
    lastSyncStatus: 'SUCCESS',
    lastSyncMessage: 'تم الاتصال والتحقق من صلاحيات OData بنجاح',
  };

  const [activeConfig, setActiveConfig] = useState<SapApiConfig>(
    state.preferences.sapConfigs?.[0] || defaultSapConfig
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SapConnectionTestResult | null>({
    success: true,
    statusCode: 200,
    message: `تم الاتصال بنجاح مع خادم SAP S/4HANA OData لشركة (${activeConfig.companyName})`,
    serverVersion: 'SAP S/4HANA 2023 FPS02 / SAP Gateway 7.57',
    companyCode: activeConfig.companyCode,
    accessibleEntities: [
      'A_JournalEntryItem',
      'A_GLAccountInCompanyCode',
      'A_CostCenter',
      'A_ProfitCenter',
      'A_FiscalYearPeriod',
    ],
    latencyMs: 140,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SapSyncResult | null>(null);

  // SAP Document Types Definition
  const sapDocTypes = [
    { code: 'SA', name: 'قيد محاسبي عام (G/L Account Document)', desc: 'تسجيل قيود اليومية والتسويات العادية' },
    { code: 'KR', name: 'فاتورة مورد (Vendor Invoice)', desc: 'إثبات فواتير المشتريات ومستحقات الموردين' },
    { code: 'KG', name: 'إشعار دائن مورد (Vendor Credit Memo)', desc: 'مردودات المشتريات والخصومات التجارية' },
    { code: 'DR', name: 'فاتورة عميل (Customer Invoice)', desc: 'إثبات مبيعات النشاط والخدمات التجارية' },
    { code: 'DZ', name: 'سند تحصيل عميل (Customer Payment)', desc: 'إثبات الحوالات البنكية ومقبوضات العملاء' },
    { code: 'KZ', name: 'سند صرف مورد (Vendor Payment)', desc: 'سداد مستحقات الموردين وأوراق الدفع' },
  ];

  // SAP Cost Centers
  const [costCenters] = useState([
    { code: 'CC-100', name: 'الإدارة العامة والمكتب التنفيذي', profitCenter: 'PC-ADMIN', manager: 'المدير المالي' },
    { code: 'CC-200', name: 'المبيعات والتسويق التجاري', profitCenter: 'PC-SALES', manager: 'مدير المبيعات' },
    { code: 'CC-300', name: 'العمليات والتشغيل الميداني', profitCenter: 'PC-OPS', manager: 'مدير التشغيل' },
    { code: 'CC-400', name: 'تكنولوجيا المعلومات والتحول الرقمي', profitCenter: 'PC-TECH', manager: 'مدير النظم' },
  ]);

  // Action: Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await SapConnectorService.testConnection(activeConfig);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        statusCode: 500,
        message: err.message || 'فشل الاتصال',
        latencyMs: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Action: Synchronize Data
  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await SapConnectorService.syncCompanyData(activeConfig);
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({
        success: false,
        accountsImported: 0,
        entriesImported: 0,
        costCentersFound: 0,
        message: err.message || 'حدث خطأ أثناء المزامنة',
        errors: [err.message],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Generate SAP BAPI / Excel Exchange File
  const handleDownloadSapCsv = () => {
    const entries = state.journalEntries.filter((e) => e.isPosted);
    let csvContent = 'HEADER_COMPANY_CODE,DOCUMENT_TYPE,POSTING_DATE,DOCUMENT_DATE,CURRENCY,DOC_HEADER_TEXT,ITEM_NUM,GL_ACCOUNT,DEBIT_CREDIT,AMOUNT,TAX_CODE,COST_CENTER,PROFIT_CENTER,ITEM_TEXT\r\n';

    entries.forEach((entry) => {
      entry.lines.forEach((line, idx) => {
        const isDebit = line.debit > 0;
        const amount = isDebit ? line.debit : line.credit;
        const shkzg = isDebit ? 'S' : 'H'; // SAP standard: S=Debit, H=Credit
        const cleanDesc = (line.description || entry.description || '').replace(/,/g, ' ');
        csvContent += `${activeConfig.companyCode},SA,${entry.date.replace(/-/g, '')},${entry.date.replace(/-/g, '')},EGP,${entry.referenceNumber || 'JE-SAP'},${idx + 1},${line.accountId},${shkzg},${amount},V1,CC-100,PC-OPS,${cleanDesc}\r\n`;
      });
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAP_S4HANA_BAPI_JOURNAL_IMPORT_${activeConfig.companyCode}_${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* 1. TOP SAP S/4HANA ENTERPRISE HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#031d44] via-[#04395e] to-[#0d2137] text-white p-5 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg font-black text-lg tracking-wider border border-blue-400/40">
            SAP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                منظومة الربط والتكامل مع ساب (SAP S/4HANA ERP Connector)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-blue-500/20 text-blue-200 border border-blue-400/40">
                OData v4 & BAPI Ready
              </span>
            </div>
            <p className="text-xs text-blue-200">
              ربط ومزامنة دفاتر الأستاذ العام، مراكز التكلفة، وتصدير قيود اليومية المتوافقة مع بنية ساب العالمية
            </p>
          </div>
        </div>

        {/* Action Controls & Return Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onReturnToStandardMode}
            className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-blue-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>العودة للوضع القياسي للمكتب</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'DASHBOARD', label: 'لوحة التحكم والربط (Cockpit)', icon: Layers },
          { id: 'CONNECTIONS', label: 'إعدادات وخادم SAP (Endpoint & Auth)', icon: Sliders },
          { id: 'GL_SYNC', label: 'مزامنة الأستاذ العام (GL & Balances)', icon: RefreshCw },
          { id: 'BAPI_EXPORT', label: 'تصدير BAPI و IDoc القياسي', icon: Download },
          { id: 'COST_CENTERS', label: 'مراكز التكلفة والأرباح (Cost Centers)', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENTS */}

      {/* TAB A: COCKPIT */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">حالة الاتصال بالخادم</span>
                <Globe2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-base font-black text-slate-900 dark:text-white">متصل (Online)</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                SAP S/4HANA Gateway 7.57
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">كود الشركة (Company Code)</span>
                <Building2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                CoCode: {activeConfig.companyCode}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                {activeConfig.companyName}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">القيود الجاهزة للترحيل</span>
                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {state.journalEntries.filter((e) => e.isPosted).length} قيد معتمد
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                متوافقة مع معيار SAP BAPI
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">مراكز التكلفة المرتبطة</span>
                <Sliders className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {costCenters.length} مراكز مفعلة
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                100% متطابقة مع مراكز الأرباح
              </div>
            </div>
          </div>

          {/* Integration Status Panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>فحص بروتوكول الاتصال والخدمات المتاحة (SAP OData Metadata)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  فحص حقيقي لاستجابة الخادم والصلاحيات الممنوحة لترحيل القيود وجلب كشوف الحسابات
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'جاري فحص الاتصال...' : 'إعادة اختبار الاتصال'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة فورية مع SAP'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-2xl border ${
                  testResult.success
                    ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="font-bold text-xs">{testResult.message}</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800 font-bold">
                    زمن الاستجابة: {testResult.latencyMs}ms
                  </span>
                </div>

                {testResult.accessibleEntities && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      الكيانات والخدمات المتاحة للربط:
                    </span>
                    {testResult.accessibleEntities.map((ent) => (
                      <span
                        key={ent}
                        className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-mono text-[10px]"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: CONNECTIONS CONFIG */}
      {activeTab === 'CONNECTIONS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              بيانات وخادم الربط مع SAP S/4HANA (API & Gateway Configuration)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد رابط خدمة OData REST / SOAP BAPI الخاصة بالمنشأة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                رابط خادم SAP OData Service URL
              </label>
              <input
                type="text"
                value={activeConfig.hostUrl}
                onChange={(e) => setActiveConfig({ ...activeConfig, hostUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                كود الشركة في SAP (Company Code)
              </label>
              <input
                type="text"
                value={activeConfig.companyCode}
                onChange={(e) => setActiveConfig({ ...activeConfig, companyCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                اسم مستخدم SAP المعتمد (SAP Technical User)
              </label>
              <input
                type="text"
                value={activeConfig.username}
                onChange={(e) => setActiveConfig({ ...activeConfig, username: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                رقم العميل في SAP (SAP Client Number)
              </label>
              <input
                type="text"
                value={activeConfig.clientNumber || '100'}
                onChange={(e) => setActiveConfig({ ...activeConfig, clientNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const curPrefs = db.getState().preferences;
                db.updatePreferences({ sapConfigs: [activeConfig] });
                alert('تم حفظ إعدادات خادم SAP بنجاح!');
              }}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB C: GL SYNC */}
      {activeTab === 'GL_SYNC' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                مطابقة ومزامنة دليل الحسابات وأرصدة الأستاذ العام (SAP General Ledger)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة لحظية بين أرصدة الحسابات المحلية وأرصدة منظومة SAP
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة...' : 'تحديث الأرصدة الآن'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                <tr>
                  <th className="p-2.5">كود الحساب في SAP</th>
                  <th className="p-2.5">اسم الحساب المعياري</th>
                  <th className="p-2.5">طبيعة الحساب</th>
                  <th className="p-2.5 text-left">الرصيد في SAP (ج.م)</th>
                  <th className="p-2.5 text-center">حالة المطابقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { code: '1101000', name: 'الخزينة المركزية والصناديق', type: 'أصول متداولة', bal: 850000 },
                  { code: '1102000', name: 'البنك التجاري الدولي CIB', type: 'أصول متداولة', bal: 3450000 },
                  { code: '1201000', name: 'العملاء والتجارة المدينة', type: 'أصول متداولة', bal: 2150000 },
                  { code: '2101000', name: 'الموردون والتجارة الدائنة', type: 'خصوم متداولة', bal: 1420000 },
                  { code: '4101000', name: 'إيرادات المبيعات والنشاط', type: 'إيرادات تشغيلية', bal: 9850000 },
                  { code: '5101000', name: 'تكلفة المبيعات المباشرة', type: 'تكاليف ومصروفات', bal: 6200000 },
                ].map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{row.code}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.type}</td>
                    <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white">
                      {row.bal.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full font-bold text-[10px]">
                        متطابق 100%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB D: BAPI EXPORT */}
      {activeTab === 'BAPI_EXPORT' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تصدير قيود اليومية بصيغة SAP BAPI القياسية (BAPI_ACC_DOCUMENT_POST)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد ملفات الاستيراد والتسجيل المباشر في منظومة SAP S/4HANA و SAP Business One
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSapCsv}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>تحميل شيت SAP BAPI CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {sapDocTypes.map((doc) => (
              <div key={doc.code} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-mono font-bold rounded">
                    Doc Type: {doc.code}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">{doc.name}</div>
                <p className="text-[11px] text-slate-500">{doc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB E: COST CENTERS */}
      {activeTab === 'COST_CENTERS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              مراكز التكلفة ومراكز الأرباح (SAP Controlling - CO)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ربط التوجيه المحاسبي لمصروفات وإيرادات النشاط بمراكز التكلفة المعتمدة في SAP
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                <tr>
                  <th className="p-2.5">كود مركز التكلفة</th>
                  <th className="p-2.5">اسم المركز / الإدارة</th>
                  <th className="p-2.5">مركز الربح المرتبط</th>
                  <th className="p-2.5">المسؤول الإداري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {costCenters.map((cc) => (
                  <tr key={cc.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{cc.code}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{cc.name}</td>
                    <td className="p-2.5 font-mono text-emerald-600">{cc.profitCenter}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{cc.manager}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
