import React, { useState } from 'react';
import { MohamedGamilLogo } from './MohamedGamilLogo';
import { Check, X, Shield, Eye, Sparkles, Layers, FileText } from 'lucide-react';

interface LogoInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveVariant?: (variant: 'SEAL_FULL' | 'HEADER_TRANSPARENT') => void;
}

export const LogoInspectionModal: React.FC<LogoInspectionModalProps> = ({
  isOpen,
  onClose,
  onApproveVariant,
}) => {
  const [bgType, setBgType] = useState<'transparent' | 'white' | 'dark' | 'paper'>('white');
  const [activeTab, setActiveTab] = useState<'compare' | 'seal' | 'header'>('compare');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-200">
                معاينة تجربة تفريغ الشعار والختم الرسمي (أ/ محمد جميل مرعي)
              </h3>
              <p className="text-xs text-slate-400">
                عزل تام للخلفية الرخامية، تمييز شعار الترويسة عن الختم، واختبار الشفافية على الأوراق الرسمية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Background & View Mode Selector */}
        <div className="bg-slate-950/60 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">وضع العرض:</span>
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'compare' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                مقارنة النموذجين (الختم vs شعار الترويسة)
              </button>
              <button
                onClick={() => setActiveTab('seal')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'seal' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                الختم الدائري المفرغ
              </button>
              <button
                onClick={() => setActiveTab('header')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'header' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                شعار الترويسة المتمايز
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">خلفية الاختبار:</span>
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setBgType('white')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  bgType === 'white' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-300'
                }`}
                title="ورق أبيض رسمي"
              >
                📄 ورق أبيض
              </button>
              <button
                onClick={() => setBgType('transparent')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  bgType === 'transparent' ? 'bg-slate-700 text-amber-300 font-bold' : 'text-slate-300'
                }`}
                title="مفرغ شفاف تماماً"
              >
                🏁 شفاف مفرغ
              </button>
              <button
                onClick={() => setBgType('dark')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  bgType === 'dark' ? 'bg-emerald-950 text-emerald-200 font-bold border border-emerald-500/40' : 'text-slate-300'
                }`}
                title="داكن زمردي"
              >
                💎 زمردي داكن
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body / Inspection Area */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Compare View */}
          {activeTab === 'compare' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option 1: Official Seal (الختم الرسمي المفرغ) */}
              <div className="border border-slate-700 rounded-xl bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-amber-300 text-sm">النموذج (1): الختم المعتمد المفرغ</h4>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                    للتوقيع والاعتماد
                  </span>
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  تفريغ الميدالية الذهبية الدائرية بالكامل من الخلفية الرخامية الخضراء، مع الحفاظ على كافة البيانات (الاسم، ترخيص س.م.م 43122، الهاتف، القفل، والمونوغرام MG).
                </p>

                {/* Canvas Container */}
                <div
                  className={`h-56 rounded-xl border flex items-center justify-center transition-colors relative overflow-hidden ${
                    bgType === 'white'
                      ? 'bg-white border-slate-300'
                      : bgType === 'transparent'
                      ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] bg-slate-200 border-slate-400'
                      : 'bg-emerald-950 border-emerald-800'
                  }`}
                >
                  <MohamedGamilLogo size={180} />
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-amber-200">الاستخدام المقترح:</strong> يوضع في أسفل الشهادة في مساحة التوقيع والاعتماد، أو كختم مائي رقمي اختياري.
                </div>
              </div>

              {/* Option 2: Differentiated Header Logo (شعار الترويسة المفرغ) */}
              <div className="border border-slate-700 rounded-xl bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-emerald-300 text-sm">النموذج (2): شعار الترويسة المتمايز</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    لأعلى الورقة الرسمية
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  تصميم متمايز مخصص للترويسة العلوية يركز على أيقونة الفخامة (رمز MG + علامة المراجعة ✓ + سهم الصعود) دون تكرار الختم كاملاً مرتين في نفس الصفحة.
                </p>

                {/* Canvas Container */}
                <div
                  className={`h-56 rounded-xl border flex flex-col items-center justify-center gap-2 p-4 transition-colors relative overflow-hidden ${
                    bgType === 'white'
                      ? 'bg-white border-slate-300'
                      : bgType === 'transparent'
                      ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] bg-slate-200 border-slate-400'
                      : 'bg-emerald-950 border-emerald-800'
                  }`}
                >
                  <MohamedGamilLogo size={120} />
                  <div className="text-center select-none">
                    <div className="text-xs font-black text-slate-900 tracking-wider">
                      مكتب المحاسب القانوني ومراقب الحسابات
                    </div>
                    <div className="text-sm font-black text-emerald-950 tracking-wide mt-0.5">
                      أ / محمد جميل مرعي
                    </div>
                    <div className="text-[9px] font-bold text-slate-600 font-mono">
                      عضو جمعية المحاسبين والمراجعين المصرية • س.م.م 43122
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-emerald-300">ميزة التمايز:</strong> يمنح الشهادة مظهراً رئاسياً يجمع بين شعار المؤسسة في القمة، والختم والتوقيع الحي في الأسفل.
                </div>
              </div>

            </div>
          )}

          {/* Detailed Seal View */}
          {activeTab === 'seal' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-amber-300">الختم الدائري المعتمد المفرغ (فائق الدقة)</h4>
                <p className="text-xs text-slate-400">
                  تفاصيل الشعار المعزول: إطار ذهبي بارز 3D، مونوغرام MG، علامة المراجعة والاعتماد، شبكة الفحص، حزمة العملات، والقفل الأمني
                </p>
              </div>

              <div
                className={`h-80 rounded-2xl border flex items-center justify-center transition-colors relative overflow-hidden ${
                  bgType === 'white'
                    ? 'bg-white border-slate-300 shadow-inner'
                    : bgType === 'transparent'
                    ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-200 border-slate-400'
                    : 'bg-emerald-950 border-emerald-800 shadow-inner'
                }`}
              >
                <MohamedGamilLogo size={260} />
              </div>
            </div>
          )}

          {/* Detailed Header View */}
          {activeTab === 'header' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-emerald-300">محاكاة الترويسة الرسمية للشهادات بعد التمايز</h4>
                <p className="text-xs text-slate-400">
                  كيف ستبدو قمة الشهادة والتقارير المالية عند تطبيق الشعار المفرغ المتمايز
                </p>
              </div>

              {/* Simulated Certificate Header */}
              <div className="bg-white text-slate-900 p-6 rounded-2xl border-4 border-double border-emerald-950 shadow-md">
                <div className="flex items-center justify-between border-b-2 border-emerald-950 pb-4">
                  {/* Right: Firm Info */}
                  <div className="text-right space-y-0.5">
                    <div className="text-[11px] font-bold text-emerald-900">جمهورية مصر العربية</div>
                    <div className="text-sm font-black text-slate-950">مكتب المحاسب القانوني ومراقب الحسابات</div>
                    <div className="text-base font-black text-emerald-950">أ/ محمد جميل مرعي</div>
                    <div className="text-[10px] text-slate-700 font-mono">سجل المحاسبين والمراجعين: <strong>س.م.م 43122</strong></div>
                  </div>

                  {/* Center: The Isolated Logo */}
                  <div className="flex flex-col items-center">
                    <MohamedGamilLogo size={90} />
                    <div className="text-[9px] font-bold text-emerald-950 mt-1">شعار المكتب المعتمد</div>
                  </div>

                  {/* Left: Branches */}
                  <div className="text-left space-y-0.5 text-[10px] text-slate-700">
                    <div>📍 <strong>الرئيسي:</strong> مركز الحسينية - الشرقية</div>
                    <div>📍 <strong>الفرع:</strong> العاشر من رمضان - الشرقية</div>
                    <div>📞 <strong>هاتف:</strong> 01003335360</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Confirmation Guidance */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-bold text-emerald-300">ملاحظة موجهة لحضرتك أ/ محمد جميل مرعي:</div>
              <p className="text-slate-300 leading-relaxed">
                التفريغ مكتمل بنسبة 100% وبدقة المتجهات (Vector SVG) لضمان عدم وجود أي تشويش أو بهتان عند الطباعة بأعلى دقة. 
                أما بالنسبة للتوقيع والختم، فتم تفريغ مكانهما في أسفل الشهادة لتقوم بالختم والتوقيع الفعلي بيدك.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            إغلاق المعاينة
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onApproveVariant) onApproveVariant('HEADER_TRANSPARENT');
                onClose();
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              اعتمد هذا التفريغ للشعار والختم
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
