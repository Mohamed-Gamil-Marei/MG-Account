import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode,
  FileText,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
  Hash,
  Award,
  Server,
  Activity,
  Zap,
} from 'lucide-react';
import { Invoice } from '../types';
import { db } from '../db/localDatabase';
import { etaService } from '../utils/etaSdkEngine';
import { EtaExcelEngine } from '../utils/etaExcelEngine';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';

interface EtaSubmissionModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSubmissionSuccess?: () => void;
}

export const EtaSubmissionModal: React.FC<EtaSubmissionModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onSubmissionSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'MIDDLEWARE' | 'JSON' | 'XML' | 'SIGNATURE'>('SUMMARY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    uuid?: string;
    longId?: string;
    submissionId?: string;
    publicUrl?: string;
    message?: string;
    httpStatus?: number;
    rawEtaResponse?: any;
    errors?: string[];
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const config = etaService.getConfig();
  const validation = etaService.validateInvoiceForEta(invoice);
  const signedData = etaService.generateFullSignedPayload(invoice);
  const rawXml = etaService.generateEtaXml(invoice);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSubmitToEta = async () => {
    setIsSubmitting(true);
    setSubmissionResult(null);
    setSubmissionStep('جاري تدقيق المخطط والمعايير الضريبية...');

    try {
      await new Promise((r) => setTimeout(r, 250));
      setSubmissionStep('جاري التوقيع الرقمي والختم الإلكتروني CAdES-BES...');
      await new Promise((r) => setTimeout(r, 250));
      setSubmissionStep('جاري الاتصال بالخدمة الوسيطة وتفويض OAuth2...');

      const res = await etaService.submitDocumentToEta(invoice);
      setSubmissionResult(res);

      if (res.success) {
        setSubmissionStep('تم الاعتماد بنجاح!');
        db.updateInvoice(invoice.id, {
          etaStatus: 'VALID',
          etaUuid: res.uuid,
          etaLongId: res.longId,
          etaSubmissionId: res.submissionId,
          etaSubmissionDate: new Date().toISOString(),
          etaPublicUrl: res.publicUrl,
          etaCanonicalHash: res.canonicalHash || signedData.hash,
          etaSignatureValue: res.signature || signedData.signature,
        });

        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      }
    } catch (e: any) {
      setSubmissionResult({
        success: false,
        message: 'حدث خطأ أثناء الاتصال بالخدمة الوسيطة لمنظومة مصلحة الضرائب المصرية',
        errors: [e?.message || 'خطأ غير معروف'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs my-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  إرسال واعتماد الفاتورة بمنظومة الضرائب المصرية (ETA SDK)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    config.environment === 'PROD'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {config.environment === 'PROD' ? 'PROD - إنتاج فعلي' : 'PREPROD - تجريبي'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                مستند رقم: <strong className="font-mono text-slate-800">{invoice.invoiceNumber}</strong> • العميل:{' '}
                <strong className="text-slate-800">{invoice.partnerName}</strong>
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

        {/* Submission Success Alert */}
        {submissionResult && submissionResult.success && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submissionResult.message}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-emerald-200">
              <div>
                <span className="text-slate-500">المعرف الفريد (UUID): </span>
                <strong className="font-mono text-slate-900">{submissionResult.uuid}</strong>
              </div>
              <div>
                <span className="text-slate-500">رقم الإرسال (Submission ID): </span>
                <strong className="font-mono text-slate-900">{submissionResult.submissionId}</strong>
              </div>
            </div>
            {submissionResult.publicUrl && (
              <div className="pt-2">
                <a
                  href={submissionResult.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>التحقق من الفاتورة عبر بوابة مصلحة الضرائب المصرية</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Submission Error Alert */}
        {submissionResult && !submissionResult.success && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-950 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{submissionResult.message}</span>
            </div>
            {submissionResult.errors && (
              <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                {submissionResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Validation Checks Banner */}
        <div
          className={`mt-4 p-3 rounded-2xl border flex items-center justify-between ${
            validation.isValid ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <div className="font-bold text-xs text-slate-900">
                {validation.isValid
                  ? 'تم التحقق من تطابق كافة متطلبات مصلحة الضرائب المصرية'
                  : 'توجد محددات غير مكتملة وفقاً للائحة الفاتورة الإلكترونية'}
              </div>
              <div className="text-[10px] text-slate-500">
                الرقم الضريبي للمصدر: {config.issuerTaxRegNo} • كود النشاط: {config.issuerActivityCode} (محاسبة ومراجعة)
              </div>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
              validation.isValid ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
            }`}
          >
            {validation.isValid ? 'مطابق 100%' : 'تنبيه تدقيق'}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              activeTab === 'SUMMARY' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ملخص المستند والتشفير
          </button>
          <button
            onClick={() => setActiveTab('MIDDLEWARE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'MIDDLEWARE' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>الربط المباشر والخدمة الوسيطة (Middleware)</span>
          </button>
          <button
            onClick={() => setActiveTab('JSON')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'JSON' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>ETA JSON Schema v1.0</span>
          </button>
          <button
            onClick={() => setActiveTab('XML')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'XML' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ETA XML (UBL 2.1)</span>
          </button>
          <button
            onClick={() => setActiveTab('SIGNATURE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SIGNATURE' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>الختم الرقمي CAdES-BES</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'SUMMARY' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-slate-500 text-[10px]">قيمة البضاعة:</div>
                  <div className="font-bold font-mono text-xs text-slate-800 mt-0.5">
                    {formatEgyptianCurrency(invoice.subtotal)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="text-emerald-800 text-[10px]">ض.ق.م (14% VAT):</div>
                  <div className="font-bold font-mono text-xs text-emerald-950 mt-0.5">
                    +{formatEgyptianCurrency(invoice.totalVat)}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <div className="text-red-800 text-[10px]">خصم وتحصيل (1% WHT):</div>
                  <div className="font-bold font-mono text-xs text-red-950 mt-0.5">
                    -{formatEgyptianCurrency(invoice.totalWht)}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <div className="text-slate-400 text-[10px]">الصافي الإجمالي:</div>
                  <div className="font-bold font-mono text-xs text-emerald-400 mt-0.5">
                    {formatEgyptianCurrency(invoice.grandTotal)}
                  </div>
                </div>
              </div>

              {/* Hash & Signature Details */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-700" />
                    <span>بصمة التشفير المعيارية (Canonical SHA-256 Hash):</span>
                  </span>
                  <button
                    onClick={() => handleCopy(signedData.hash, 'hash')}
                    className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 text-[10px] cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'hash' ? 'تم النسخ!' : 'نسخ'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-xl font-mono text-[10px] break-all text-slate-700 select-all">
                  {signedData.hash}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => EtaExcelEngine.exportInvoiceToEtaJson(invoice)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => EtaExcelEngine.exportInvoiceToEtaXml(invoice)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => EtaExcelEngine.exportInvoiceToExcel(invoice)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير شيت Excel</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'MIDDLEWARE' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                    <Server className="w-4 h-4" />
                    <span>مسار الربط المباشر للخدمة الوسيطة (Direct Middleware Proxy):</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    POST /api/eta/documents/submit
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-300">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 font-bold mb-1">بوابة مصلحة الضرائب المستهدفة:</div>
                    <div className="text-emerald-300 break-all">{etaService.getInvoicingApiBaseUrl()}/api/v1.0/documentsubmissions</div>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 font-bold mb-1">خادم التوثيق والهوية (OAuth2):</div>
                    <div className="text-emerald-300 break-all">{etaService.getIdentityUrl()}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>ترويسة الطلب وتفويض الهوية (HTTP Headers Handshake):</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 space-y-1">
                  <div><strong>Authorization:</strong> Bearer eta_live_token_**** (InvoicingAPI scope)</div>
                  <div><strong>Content-Type:</strong> application/json; charset=utf-8</div>
                  <div><strong>X-Client-ID:</strong> {config.clientId.substring(0, 8)}...</div>
                  <div><strong>X-Issuer-Tax-Reg:</strong> {config.issuerTaxRegNo}</div>
                </div>
              </div>

              {submissionResult && submissionResult.rawEtaResponse && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 text-xs">استجابة بوابة مصلحة الضرائب (Raw Response):</div>
                  <pre className="p-2.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[9px] max-h-40 overflow-y-auto">
                    {JSON.stringify(submissionResult.rawEtaResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'JSON' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(JSON.stringify(signedData.payload, null, 2), 'json')}
                className="absolute left-3 top-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer z-10"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedKey === 'json' ? 'تم النسخ!' : 'نسخ الكود'}</span>
              </button>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl overflow-x-auto text-[10px] font-mono max-h-72 border border-slate-800">
                {JSON.stringify(signedData.payload, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'XML' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(rawXml, 'xml')}
                className="absolute left-3 top-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer z-10"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedKey === 'xml' ? 'تم النسخ!' : 'نسخ XML'}</span>
              </button>
              <pre className="p-4 bg-slate-950 text-blue-300 rounded-2xl overflow-x-auto text-[10px] font-mono max-h-72 border border-slate-800">
                {rawXml}
              </pre>
            </div>
          )}

          {activeTab === 'SIGNATURE' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    شهادة التوقيع الرقمي والختم الإلكتروني المعياري
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {config.tokenSubject || 'CN=EGYPT TRUST E-SEAL CERTIFICATE, C=EG'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-700 text-[11px]">محتوى التوقيع المشفر (Base64 CAdES-BES Value):</div>
                <pre className="p-2 bg-white border border-slate-200 rounded-xl font-mono text-[9px] break-all text-slate-600 max-h-36 overflow-y-auto">
                  {signedData.signature}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            disabled={isSubmitting || !validation.isValid}
            onClick={handleSubmitToEta}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الإرسال والاعتماد...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>إرسال المستند لمصلحة الضرائب المصرية الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
