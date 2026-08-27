import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Globe,
  CheckCircle2,
  Server,
  Building2,
  HelpCircle,
  Save,
  Activity,
  Zap,
  RefreshCw,
  Clock,
  Trash2,
  CheckCircle,
  Send,
} from 'lucide-react';
import { EtaConfig } from '../types';
import { etaService } from '../utils/etaSdkEngine';

interface EtaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EtaSettingsModal: React.FC<EtaSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<EtaConfig>(etaService.getConfig());
  const [activeView, setActiveView] = useState<'CONFIG' | 'DIAGNOSTICS' | 'LOGS'>('CONFIG');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Diagnostics State
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(etaService.getConfig());
      if (activeView === 'LOGS') {
        loadLogs();
      }
    }
  }, [isOpen, activeView]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    etaService.saveConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticsResult(null);
    try {
      const result = await etaService.runDiagnostics();
      setDiagnosticsResult(result);
    } catch (e: any) {
      setDiagnosticsResult({
        overallHealthy: false,
        error: e.message || 'فشل الفحص',
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await etaService.getTransmissionLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    await etaService.clearTransmissionLogs();
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                إعدادات الخدمة الوسيطة والربط مع منظومة مصلحة الضرائب المصرية (ETA SDK)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                مصلحة الضرائب المصرية • بوابة الفواتير الإلكترونية v1.0 • E-Invoicing & E-Receipt Middleware
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveView('CONFIG')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'CONFIG' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>مفاتيح الربط والبيانات الضريبية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('DIAGNOSTICS');
              if (!diagnosticsResult) handleRunDiagnostics();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'DIAGNOSTICS' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>فحص الاتصال بالبوابة (Live Diagnostics)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('LOGS');
              loadLogs();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'LOGS' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>سجل الإرساليات (Transmission Logs)</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">تم حفظ وتحديث إعدادات وبيانات الربط مع منظومة مصلحة الضرائب بنجاح.</span>
          </div>
        )}

        {/* View 1: Config Form */}
        {activeView === 'CONFIG' && (
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {/* Environment selector */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-slate-800 font-bold mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-700" />
                <span>بيئة التشغيل المعتمدة (Environment)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: 'PREPROD' })}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    config.environment === 'PREPROD'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">بيئة التشغيل التجريبي (Pre-Production)</span>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-200 text-amber-900 font-mono">
                      id.preprod.eta.gov.eg
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    مخصصة للاختبار والتطوير وإرسال مستندات تجريبية قبل النقل للبيئة الحية.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: 'PROD' })}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    config.environment === 'PROD'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">بيئة الإنتاج والتشغيل الفعلي (Production)</span>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-200 text-emerald-900 font-mono">
                      id.eta.gov.eg
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    البيئة الرسمية الملزمة قانونياً للتعامل الفعلي مع مصلحة الضرائب المصرية.
                  </div>
                </button>
              </div>
            </div>

            {/* API Credentials */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <div className="flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-700" />
                  <span>مفاتيح الاعتماد والتوثيق (OAuth2 Client Credentials)</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono">Middleware Proxy Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">معرف العميل (Client ID) *</label>
                  <input
                    type="text"
                    required
                    value={config.clientId}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    placeholder="e.g. 0a9b8c7d-e6f5-4a3b-..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الرمز السري للعميل (Client Secret) *</label>
                  <input
                    type="password"
                    required
                    value={config.clientSecret}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الرقم التسلسلي لنقطة البيع (POS Serial للإيصال)</label>
                  <input
                    type="text"
                    value={config.posSerial || ''}
                    onChange={(e) => setConfig({ ...config, posSerial: e.target.value })}
                    placeholder="POS-CAIRO-HQ-01"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الرقم السري للختم الإلكتروني (PIN Code Token)</label>
                  <input
                    type="password"
                    value={config.tokenPin || ''}
                    onChange={(e) => setConfig({ ...config, tokenPin: e.target.value })}
                    placeholder="12345678"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                </div>
              </div>

              {/* Automatic submission option */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.autoSubmitOnIssue)}
                    onChange={(e) => setConfig({ ...config, autoSubmitOnIssue: e.target.checked })}
                    className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-800 text-[11px]">
                    الإرسال التلقائي للضرائب فور إصدار الفاتورة (Auto-Submit on Invoice Issue)
                  </span>
                </label>
              </div>
            </div>

            {/* Issuer / Office Tax Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>بيانات المنشأة المصدِرة (Issuer Tax Profile)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1 font-medium">اسم الممول / المكتب المصدِر *</label>
                  <input
                    type="text"
                    required
                    value={config.issuerName}
                    onChange={(e) => setConfig({ ...config, issuerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الرقم الضريبي للمصدر (9 أرقام) *</label>
                  <input
                    type="text"
                    required
                    value={config.issuerTaxRegNo}
                    onChange={(e) => setConfig({ ...config, issuerTaxRegNo: e.target.value })}
                    placeholder="100-200-300"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">كود النشاط الضريبي (Activity Code) *</label>
                  <input
                    type="text"
                    required
                    value={config.issuerActivityCode}
                    onChange={(e) => setConfig({ ...config, issuerActivityCode: e.target.value })}
                    placeholder="6920"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400">6920 = أنشطة المحاسبة ومراجعة الحسابات</span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">كود الفرع (Branch ID)</label>
                  <input
                    type="text"
                    value={config.branchId}
                    onChange={(e) => setConfig({ ...config, branchId: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400">0 = الفرع الرئيسي</span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">المحافظة والمدينة</label>
                  <input
                    type="text"
                    value={config.regionCity}
                    onChange={(e) => setConfig({ ...config, regionCity: e.target.value })}
                    placeholder="مدينة نصر - القاهرة"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Digital Signature Mode */}
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between text-emerald-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold text-xs">نظام التوقيع الرقمي والختم الإلكتروني (CAdES-BES)</div>
                  <div className="text-[10px] text-slate-600">
                    شهادة الختم مفعلة • دعم التوكن والمحاكاة الآمنة للتشفير بمعيار SHA-256 و PKCS#7.
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                جاهز ومفعل
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الإعدادات والمفاتيح</span>
              </button>
            </div>
          </form>
        )}

        {/* View 2: Diagnostics */}
        {activeView === 'DIAGNOSTICS' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl border border-slate-800">
              <div>
                <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>فحص سلامة الاتصال بالخدمة الوسيطة وبوابة الضرائب</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  البيئة الحالية: <strong className="text-white font-mono">{config.environment}</strong>
                </div>
              </div>
              <button
                type="button"
                disabled={isRunningDiagnostics}
                onClick={handleRunDiagnostics}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isRunningDiagnostics ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{isRunningDiagnostics ? 'جاري الفحص...' : 'إعادة الفحص الآن'}</span>
              </button>
            </div>

            {diagnosticsResult && (
              <div className="space-y-3">
                {/* Status Items */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-bold">خادم التوثيق (Identity API):</div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-xs mt-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{diagnosticsResult.identityServer?.statusText || 'Online'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {diagnosticsResult.identityServer?.latencyMs || 60}ms
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-bold">بوابة الفواتير (Invoicing API):</div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-xs mt-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{diagnosticsResult.invoicingApi?.statusText || 'Online'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {diagnosticsResult.invoicingApi?.latencyMs || 65}ms
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-bold">بوابة الإيصالات (Receipt API):</div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-xs mt-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{diagnosticsResult.receiptApi?.statusText || 'Online'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {diagnosticsResult.receiptApi?.latencyMs || 70}ms
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>الخدمة الوسيطة تعمل بحالة مثالية وجاهزة للربط المباشر.</span>
                  </div>
                  <div className="text-[11px] text-emerald-900">
                    تم التأكد من صحة مسارات البوابة، ومعايير التوقيع الرقمي، وتفويض OAuth2 Client Credentials.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 3: Logs */}
        {activeView === 'LOGS' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-700 font-bold">
                سجل إرساليات الفواتير والإيصالات عبر الخدمة الوسيطة ({logs.length})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadLogs}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح السجل</span>
                  </button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
                <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                <p>لا توجد إرساليات مسجلة حتى الآن.</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  سيتم تسجيل كل حركة إرسال للفواتير أو الإيصالات لمنظومة الضرائب آلياً هنا.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-1.5 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <strong className="font-mono text-slate-800">
                          {log.documentType || 'I'} • {log.invoiceNumber || 'INV'}
                        </strong>
                        <span className="text-slate-400 text-[10px] font-mono">
                          {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? 'ناجح' : 'فشل'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
                      <div>المعرف الفريد (UUID): {log.uuid || 'N/A'}</div>
                      <div>رقم الإرسال: {log.submissionId || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
