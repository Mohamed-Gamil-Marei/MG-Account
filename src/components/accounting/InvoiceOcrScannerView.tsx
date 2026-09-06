import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Scan,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  DollarSign,
  Copy,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  RotateCw,
  Building2,
  Calendar,
  Hash,
  Percent,
  Receipt,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowLeftRight,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { Account, JournalEntry, OcrInvoiceResult, OcrSuggestedJournalLine } from '../../types';
import {
  scanInvoiceWithOcr,
  compressImageForOcr,
  DEMO_INVOICE_PRESETS,
  DemoInvoicePreset,
  buildJournalEntryFromOcr,
} from '../../services/invoiceOcrService';

interface InvoiceOcrScannerViewProps {
  onNavigateToJournal?: () => void;
  onOpenEntryDetails?: (entryId: string) => void;
}

export const InvoiceOcrScannerView: React.FC<InvoiceOcrScannerViewProps> = ({
  onNavigateToJournal,
  onOpenEntryDetails,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Scanner Mode & Input State
  const [activeInputMode, setActiveInputMode] = useState<'CAMERA' | 'UPLOAD' | 'PRESETS'>('UPLOAD');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Image & OCR Status
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OcrInvoiceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable fields for review before posting
  const [editDate, setEditDate] = useState<string>('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState<string>('');
  const [editCounterparty, setEditCounterparty] = useState<string>('');
  const [editTaxNumber, setEditTaxNumber] = useState<string>('');
  const [editSubtotal, setEditSubtotal] = useState<number>(0);
  const [editTaxAmount, setEditTaxAmount] = useState<number>(0);
  const [editWhtAmount, setEditWhtAmount] = useState<number>(0);
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [journalLines, setJournalLines] = useState<OcrSuggestedJournalLine[]>([]);

  // Feedback Toast
  const [successToast, setSuccessToast] = useState<{ message: string; entryId?: string } | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load accounts and active client context
  useEffect(() => {
    const currentState = db.getState();
    const loadedAccounts = currentState.accounts || [];
    setAccounts(loadedAccounts);
    const loadedClients = currentState.clients || [];
    setClients(loadedClients);

    const activeContext = currentState.activeClientContext;
    if (activeContext?.clientId) {
      setSelectedClientId(activeContext.clientId);
    } else if (loadedClients.length > 0) {
      setSelectedClientId(loadedClients[0].id);
    }
  }, []);

  // Initialize camera stream when CAMERA tab is active and no image captured
  useEffect(() => {
    if (activeInputMode === 'CAMERA' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeInputMode, cameraFacingMode, capturedImage]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك الحالي لا يدعم الوصول المباشر لكاميرا الويب/المحمول.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play warning:', err));
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'تعذر تشغيل الكاميرا مباشرة (تأكد من منح إذن الكاميرا أو استخدام رفع ملف الصورة أو النماذج الجاهزة).'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacingMode = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture snapshot from video stream
  const captureSnapshot = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      stopCamera();
      setCapturedImage(dataUrl);
      setImageRotation(0);
      processImageForOcr(dataUrl);
    } catch (err: any) {
      setErrorMsg(`خطأ في التقاط الصورة: ${err.message}`);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setProcessingStage('جاري ضغط ومعالجة الصورة ضوئياً...');
      const { base64 } = await compressImageForOcr(file);
      setCapturedImage(base64);
      setImageRotation(0);
      processImageForOcr(base64);
    } catch (err: any) {
      setErrorMsg(`تعذر قراءة ملف الصورة: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setProcessingStage('جاري ضغط ومعالجة الصورة ضوئياً...');
      const { base64 } = await compressImageForOcr(file);
      setCapturedImage(base64);
      setImageRotation(0);
      processImageForOcr(base64);
    } catch (err: any) {
      setErrorMsg(`تعذر قراءة ملف الصورة: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Load a demo preset
  const handleLoadDemoPreset = (preset: DemoInvoicePreset) => {
    stopCamera();
    setOcrResult(preset.sampleData);
    setCapturedImage(preset.sampleData.rawImagePreviewUrl || null);
    populateFormFields(preset.sampleData);
    setErrorMsg(null);
    setSuccessToast({
      message: `تم تحميل نموذج "${preset.title}" واقتراح قيد اليومية المتوازن بنجاح.`,
    });
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Execute OCR Processing
  const processImageForOcr = async (imageBase64: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setOcrResult(null);

    const client = clients.find((c) => c.id === selectedClientId);

    try {
      setProcessingStage('جاري إرسال الصورة لمحرك الرؤية الضوئية الذكي...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStage('استخراج التواريخ، أرقام الفواتير، وبيانات الأطراف والضرائب...');
      const result = await scanInvoiceWithOcr(imageBase64, 'image/jpeg', {
        clientName: client?.name,
        clientSector: client?.activity,
      });

      setProcessingStage('توليد وتدقيق قيد اليومية المزدوج والتوجيه الضريبي...');
      await new Promise((r) => setTimeout(r, 400));

      setOcrResult(result);
      populateFormFields(result);
    } catch (err: any) {
      console.error('OCR Processing failure:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة الصورة ضوئياً.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Populate editable state from OCR result
  const populateFormFields = (res: OcrInvoiceResult) => {
    setEditDate(res.date || new Date().toISOString().split('T')[0]);
    setEditInvoiceNumber(res.invoiceNumber || '');
    setEditCounterparty(res.counterparty || '');
    setEditTaxNumber(res.taxNumber || '');
    setEditSubtotal(res.subtotal || 0);
    setEditTaxAmount(res.taxAmount || 0);
    setEditWhtAmount(res.withholdingTaxAmount || 0);
    setEditTotalAmount(res.totalAmount || 0);
    setEditDescription(
      res.suggestedJournalEntry?.description ||
        `إثبات فاتورة ${res.invoiceNumber} - ${res.counterparty}`
    );
    setJournalLines(res.suggestedJournalEntry?.lines || []);
  };

  // Update a journal line
  const handleUpdateLine = (index: number, field: keyof OcrSuggestedJournalLine, value: any) => {
    setJournalLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Change account for a line
  const handleSelectAccountForLine = (index: number, accountCode: string) => {
    const acc = accounts.find((a) => a.code === accountCode);
    if (!acc) return;

    setJournalLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        accountCode: acc.code,
        accountName: acc.name,
      };
      return next;
    });
  };

  // Add line
  const handleAddLine = () => {
    setJournalLines((prev) => [
      ...prev,
      {
        accountCode: '3211',
        accountName: 'حـ/ مصروفات عمومية وإدارية',
        debit: 0,
        credit: 0,
        notes: 'بند إضافي',
      },
    ]);
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    if (journalLines.length <= 2) {
      alert('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (مدين ودائن).');
      return;
    }
    setJournalLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalDebit = journalLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = journalLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  // Post entry directly to localDatabase General Journal
  const handlePostToJournal = () => {
    if (!isBalanced) {
      alert('لا يمكن ترحيل القيد: القيد غير متوازن محاسبياً (إجمالي المدين لا يساوي إجمالي الدائن).');
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);

    const fullLines = journalLines.map((l, idx) => {
      const matchedAcc = accounts.find((a) => a.code === l.accountCode);
      return {
        id: `ocr-line-${Date.now()}-${idx}`,
        accountId: matchedAcc?.id || `acc-${l.accountCode}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        currency: (ocrResult?.currency || 'EGP') as any,
        exchangeRate: 1.0,
        description: l.notes || editDescription,
      };
    });

    let entryType: JournalEntry['entryType'] = 'GENERAL';
    if (ocrResult?.invoiceType === 'PURCHASE') entryType = 'PURCHASE';
    else if (ocrResult?.invoiceType === 'SALES') entryType = 'SALES';
    else if (ocrResult?.paymentMethod === 'CASH' || ocrResult?.paymentMethod === 'PETTY_CASH')
      entryType = 'PAYMENT';

    const newEntry = db.addJournalEntry({
      date: editDate,
      description: editDescription,
      currency: (ocrResult?.currency || 'EGP') as any,
      clientId: selectedClientId,
      clientName: client?.name || editCounterparty,
      lines: fullLines,
      totalDebit,
      totalCredit,
      isPosted: true,
      entryType,
      referenceNumber: editInvoiceNumber,
      attachedFileName: `فاتورة-${editInvoiceNumber || 'OCR'}.jpg`,
      attachedFileUrl: capturedImage || undefined,
    });

    setSuccessToast({
      message: `تم اعتماد وترحيل القيد المحاسبي (${newEntry.serialNumber}) بنجاح إلى اليومية العامة!`,
      entryId: newEntry.id,
    });
  };

  // Reset and scan another invoice
  const handleReset = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setErrorMsg(null);
    setImageRotation(0);
    if (activeInputMode === 'CAMERA') {
      startCamera();
    }
  };

  // Copy detected text to clipboard
  const handleCopyText = () => {
    if (!ocrResult?.detectedTextSummary) return;
    navigator.clipboard.writeText(ocrResult.detectedTextSummary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                محرك OCR الذكي + رؤية الذكاء الاصطناعي (Gemini Vision)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold">
                معايير المحاسبة المصرية (EAS)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Scan className="w-8 h-8 text-indigo-400" />
              الماسح الضوئي الذكي للفواتير الورقية (OCR Scanner)
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-3xl leading-relaxed">
              التقاط صور الفواتير والإيصالات الورقية عبر الكاميرا أو رفع الملفات، واستخراج الأرقام الضريبية والمبالغ
              وتوليد قيود اليومية المتوازنة والتوجيه الضريبي وترحيلها مباشرة لدفتر اليومية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToJournal && (
              <button
                onClick={onNavigateToJournal}
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 shadow"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                دفتر اليومية العامة
              </button>
            )}
            {ocrResult && (
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                مسح فاتورة جديدة
              </button>
            )}
          </div>
        </div>

        {/* Client Selection Context Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">المنشأة / العميل المفحوص:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.taxCardNo ? `ب.ض: ${c.taxCardNo}` : c.clientCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              تدقيق رقم التسجيل الضريبي
            </span>
            <span className="flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-amber-400" />
              احتساب ض.ق.م 14% وخصم أ.ت.ص
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-100">{successToast.message}</p>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                تم تحديث الأستاذ العام وميزان المراجعة والأرصدة الضريبية فورياً.
              </p>
            </div>
          </div>
          {successToast.entryId && onOpenEntryDetails && (
            <button
              onClick={() => onOpenEntryDetails(successToast.entryId!)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              عرض القيد باليومية
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs font-medium">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs text-rose-300 underline hover:text-white"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Mode Selector Tabs (Visible before capture) */}
      {!ocrResult && !isProcessing && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-2 shadow-sm">
          <button
            onClick={() => {
              setActiveInputMode('CAMERA');
              setCapturedImage(null);
            }}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeInputMode === 'CAMERA'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            التقاط مباشر بالكاميرا (Camera)
          </button>
          <button
            onClick={() => {
              setActiveInputMode('UPLOAD');
              setCapturedImage(null);
              stopCamera();
            }}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeInputMode === 'UPLOAD'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            رفع صورة الفاتورة (File Upload)
          </button>
          <button
            onClick={() => {
              setActiveInputMode('PRESETS');
              stopCamera();
            }}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeInputMode === 'PRESETS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            نماذج فواتير مصرية جاهزة (Demo Receipts)
          </button>
        </div>
      )}

      {/* Input / Scanner Section */}
      {!ocrResult && !isProcessing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Scanner Stage */}
          <div className="lg:col-span-8 space-y-4">
            {activeInputMode === 'CAMERA' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-hidden relative">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-200">عدسة الكاميرا الحية (Live Scanner)</span>
                  </div>
                  <button
                    onClick={toggleCameraFacingMode}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 border border-slate-700"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                    تبديل الكاميرا ({cameraFacingMode === 'environment' ? 'الخلفية' : 'الأمامية'})
                  </button>
                </div>

                {/* Viewfinder Container */}
                <div className="relative aspect-[4/3] md:aspect-[16/10] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 group">
                  {cameraError ? (
                    <div className="p-6 text-center max-w-md">
                      <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-200 mb-2">{cameraError}</p>
                      <p className="text-xs text-slate-400 mb-4">
                        يمكنك استخدام زر "رفع صورة" لاختيار صورة من جهازك، أو تجربة النماذج الجاهزة.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        اختيار صورة من الجهاز
                      </button>
                    </div>
                  ) : (
                    <>
                      {cameraStream ? (
                        <video
                          ref={(el) => {
                            videoRef.current = el;
                            if (el && cameraStream && el.srcObject !== cameraStream) {
                              el.srcObject = cameraStream;
                              el.play().catch(() => {});
                            }
                          }}
                          playsInline
                          muted
                          onError={(e) => {
                            e.preventDefault?.();
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 space-y-3">
                          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                          <p className="text-xs sm:text-sm font-medium text-slate-300">جاري تهيئة وتأمين اتصال الكاميرا...</p>
                        </div>
                      )}

                      {/* Scanning Guide Overlay Reticle */}
                      <div className="absolute inset-8 md:inset-12 border-2 border-dashed border-indigo-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-inner">
                        {/* Corner markers */}
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                          <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                        </div>

                        {/* Animated Laser Scan Line */}
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-bounce opacity-80"></div>

                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                          <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                        </div>
                      </div>

                      {/* Hint pill */}
                      <div className="absolute bottom-4 bg-slate-900/80 backdrop-blur border border-slate-700/80 px-4 py-1.5 rounded-full text-xs text-slate-200 font-medium pointer-events-none">
                        📐 اضبط حدود الفاتورة داخل الإطار وتأكد من إضاءة واضحة
                      </div>
                    </>
                  )}
                </div>

                {/* Shutter Action Bar */}
                {!cameraError && (
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={captureSnapshot}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition flex items-center gap-3 shadow-lg shadow-emerald-600/30 active:scale-95"
                    >
                      <Camera className="w-5 h-5 text-white" />
                      التقاط صورة الفاتورة وبدء الفحص الضوئي
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      أو اختر ملف
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeInputMode === 'UPLOAD' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-12 text-center cursor-pointer transition shadow-xl group"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">اسحب وأفلت صورة الفاتورة هنا</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                  يدعم صور الفواتير الورقية بصيغ JPG و PNG و WebP وحتى 50 ميجابايت. سيقوم النظام بتحسين التباين
                  وقراءة النصوص والأرقام آلياً.
                </p>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
                >
                  استعراض الصور من جهازك
                </button>
              </div>
            )}

            {activeInputMode === 'PRESETS' && (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  اختر أحد نماذج الفواتير المصرية الواقعية لتجربة مسح القيد وتوزيعه المحاسبي والضريبي فوراً:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {DEMO_INVOICE_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleLoadDemoPreset(preset)}
                      className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/80 rounded-2xl p-4 cursor-pointer transition shadow-md hover:shadow-indigo-500/10 group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold">
                            {preset.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                            {preset.badge}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition mb-1">
                          {preset.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          الإجمالي: <strong className="text-emerald-400">{preset.sampleData.totalAmount.toLocaleString()} ج.م</strong>
                        </span>
                        <span className="text-indigo-400 font-bold group-hover:translate-x-[-4px] transition flex items-center gap-1">
                          فحص النموذج <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Guidelines & Quick Helper Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                مميزات محرك OCR المحاسبي:
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>تحديد الأطراف تلقائياً:</strong> التعرف على اسم المورد أو العميل ورقمه الضريبي المطبوع.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>تفكيك الضرائب المصرية:</strong> حساب وعزل ضريبة القيمة المضافة 14% وخصم أ.ت.ص (1% توريد / 3% خدمات).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>قيد مزدوج متوازن 100%:</strong> مطابقة المدين والدائن وربط الحسابات مع دليل الحسابات المصري.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>أرشفة صورة الفاتورة:</strong> حفظ النسخة الممسوحة ضوئياً مرفقة مع القيد المحاسبي لأغراض الفحص الضريبي.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 shadow-sm text-xs text-indigo-200">
              <h4 className="font-bold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                نصائح لأعلى دقة فحص:
              </h4>
              <p className="text-slate-300 leading-relaxed">
                تأكد من وضوح أرقام المبالغ، وتاريخ الفاتورة، وختم المنشأة أو رقم التسجيل الضريبي، وتجنب الانعكاسات الضوئية
                على الورق اللامع أو الحراري.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Scanning Radar Animation */}
      {isProcessing && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-2xl animate-fadeIn">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
              <Scan className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <h3 className="text-lg font-black text-white mb-2">جاري معالجة الفاتورة ضوئياً...</h3>
          <p className="text-sm font-semibold text-emerald-400 mb-4">{processingStage}</p>
          <div className="max-w-md mx-auto bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 animate-pulse w-3/4 rounded-full"></div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            يتم فحص نصوص الفاتورة وتوليد القيد المزدوج وفقاً لقانون الضرائب المصري...
          </p>
        </div>
      )}

      {/* OCR Result & Balanced Journal Reviewer View */}
      {ocrResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Scanned Image Preview & Extracted OCR Raw Texts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  صورة المستند الممسوح ضوئياً
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                    title="تدوير الصورة 90 درجة"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1 border border-slate-700"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    تدوير
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs border border-slate-700"
                  >
                    إعادة المسح
                  </button>
                </div>
              </div>

              {/* Image Container with rotation */}
              <div className="bg-black/90 rounded-xl overflow-hidden border border-slate-800 min-h-[280px] max-h-[420px] flex items-center justify-center p-2 relative group">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Scanned Invoice"
                    style={{ transform: `rotate(${imageRotation}deg)` }}
                    className="max-h-[380px] w-auto object-contain rounded transition duration-200"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">تم فحص النموذج التجريبي المعتمد</p>
                  </div>
                )}

                <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-400 border border-emerald-500/40 shadow">
                  دقة القراءة: {ocrResult.confidence || 98}%
                </div>
              </div>

              {/* Extracted Line Items */}
              {ocrResult.lineItems && ocrResult.lineItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    البنود والأصناف المستخرجة من الفاتورة ({ocrResult.lineItems.length}):
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {ocrResult.lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/60 rounded-lg p-2 text-xs flex items-center justify-between border border-slate-700/50"
                      >
                        <div className="truncate max-w-[200px]">
                          <span className="text-slate-200 font-medium">{item.description}</span>
                          <span className="text-slate-400 text-[10px] block">
                            الكمية: {item.quantity} × {item.unitPrice.toLocaleString()} ج.م
                          </span>
                        </div>
                        <strong className="text-emerald-400 font-bold">
                          {item.total.toLocaleString()} ج.م
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Transcript Summary */}
              {ocrResult.detectedTextSummary && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-300">ملخص النصوص المستخرجة:</span>
                    <button
                      onClick={handleCopyText}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedText ? 'تم النسخ!' : 'نسخ النص'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                    {ocrResult.detectedTextSummary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Editable Financial Fields & Balanced Journal Entry Reviewer */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Key Metrics Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    مراجعة وتعديل بيانات الفاتورة وقيد اليومية
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تحقق من الحسابات والمبالغ واضغط اعتماد لترحيل القيد فورياً لليومية العامة
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                    isBalanced
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      القيد متوازن محاسبياً
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      القيد غير متوازن
                    </>
                  )}
                </span>
              </div>

              {/* Extracted Invoice Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-indigo-400" /> رقم الفاتورة:
                  </span>
                  <input
                    type="text"
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                  />
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" /> تاريخ الفاتورة:
                  </span>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                  />
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 col-span-2">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-400" /> الطرف الآخر (المورد/الجهة):
                  </span>
                  <input
                    type="text"
                    value={editCounterparty}
                    onChange={(e) => setEditCounterparty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                  />
                </div>
              </div>

              {/* Tax & Financial Breakdown Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 text-center">
                  <span className="text-[10px] text-slate-400 block">قبل الضريبة</span>
                  <span className="text-xs font-black text-slate-200">
                    {editSubtotal.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/40 text-center">
                  <span className="text-[10px] text-indigo-300 block">ض.ق.م 14%</span>
                  <span className="text-xs font-black text-indigo-200">
                    {editTaxAmount.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 text-center">
                  <span className="text-[10px] text-amber-300 block">خصم أ.ت.ص</span>
                  <span className="text-xs font-black text-amber-200">
                    {editWhtAmount > 0 ? `-${editWhtAmount.toLocaleString()}` : '0'} ج.م
                  </span>
                </div>

                <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40 text-center">
                  <span className="text-[10px] text-emerald-300 block">الصافي الإجمالي</span>
                  <span className="text-xs font-black text-emerald-400">
                    {editTotalAmount.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Journal Entry Description */}
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  شرح وبيان القيد المحاسبي:
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Journal Lines Table */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    أطراف القيد المحاسبي المزدوج (اليومية العامة):
                  </span>
                  <button
                    onClick={handleAddLine}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة طرف للقيد
                  </button>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                      <tr>
                        <th className="py-2 px-3">الحساب في الدليل المصري</th>
                        <th className="py-2 px-2 w-28 text-center">مدين (Debit)</th>
                        <th className="py-2 px-2 w-28 text-center">دائن (Credit)</th>
                        <th className="py-2 px-2">البيان والتوجيه</th>
                        <th className="py-2 px-1 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/90">
                      {journalLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/50 transition">
                          {/* Account selector */}
                          <td className="py-2 px-3">
                            <select
                              value={line.accountCode}
                              onChange={(e) => handleSelectAccountForLine(idx, e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-medium focus:outline-none"
                            >
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.code}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                              {!accounts.some((a) => a.code === line.accountCode) && (
                                <option value={line.accountCode}>
                                  {line.accountCode} - {line.accountName}
                                </option>
                              )}
                            </select>
                          </td>

                          {/* Debit */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.debit || ''}
                              onChange={(e) =>
                                handleUpdateLine(idx, 'debit', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold text-center"
                            />
                          </td>

                          {/* Credit */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.credit || ''}
                              onChange={(e) =>
                                handleUpdateLine(idx, 'credit', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-bold text-center"
                            />
                          </td>

                          {/* Notes */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={line.notes || ''}
                              onChange={(e) => handleUpdateLine(idx, 'notes', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                            />
                          </td>

                          {/* Remove action */}
                          <td className="py-2 px-1 text-center">
                            <button
                              onClick={() => handleRemoveLine(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="حذف السطر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-800/90 font-bold text-slate-200 border-t border-slate-700">
                      <tr>
                        <td className="py-2 px-3 text-left">الإجمالي:</td>
                        <td className="py-2 px-2 text-center text-emerald-400 font-black">
                          {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-2 px-2 text-center text-amber-400 font-black">
                          {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td colSpan={2} className="py-2 px-2 text-left text-[11px]">
                          {isBalanced ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> متوازن
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> الفرق:{' '}
                              {Math.abs(totalDebit - totalCredit).toFixed(2)} ج.م
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Egyptian Tax Authority Directive Badge */}
              {ocrResult.suggestedJournalEntry?.taxDirective && (
                <div className="p-3.5 bg-indigo-950/50 border border-indigo-800/40 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5 mb-5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-indigo-300 block mb-0.5">التوجيه الضريبي المعتمد للفاتورة:</strong>
                    <p className="text-slate-300 leading-relaxed">
                      {ocrResult.suggestedJournalEntry.taxDirective}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  مسح فاتورة أخرى
                </button>

                <button
                  onClick={handlePostToJournal}
                  disabled={!isBalanced}
                  className={`px-6 py-3 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-lg ${
                    isBalanced
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  اعتماد وترحيل القيد لدفتر اليومية فورياً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
