import React, { useState, useMemo } from 'react';
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Printer,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { PrintService } from '../../services/PrintService';

interface TaxAppealsDefenseViewProps {
  state: DatabaseState;
  showToast?: (msg: string) => void;
}

export const TaxAppealsDefenseView: React.FC<TaxAppealsDefenseViewProps> = ({
  state,
  showToast,
}) => {
  const clients = state.clients || [];

  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients.length > 0 ? clients[0].id : ''
  );
  const [taxYear, setTaxYear] = useState<number>(2025);
  const [appealType, setAppealType] = useState<
    'MODEL_19_INCOME' | 'MODEL_15_VAT' | 'APPEAL_COMMITTEE_MEMO' | 'RECONSIDERATION_REQUEST'
  >('MODEL_19_INCOME');

  const [modelNumber, setModelNumber] = useState<string>('19/2026/0491');
  const [modelDate, setModelDate] = useState<string>('2026-02-15');
  const [taxInspectorName, setTaxInspectorName] = useState<string>('مأمورية ضرائب الشركات المساهمة بالقاهرة');
  const [disputedAmount, setDisputedAmount] = useState<number>(485000);
  const [declaredAmount, setDeclaredAmount] = useState<number>(120000);

  // Appeal Defense Points selection
  const [selectedDefensePoints, setSelectedDefensePoints] = useState<string[]>([
    'POINT_PROCEDURAL_INVALIDITY',
    'POINT_UNJUSTIFIED_ESTIMATION',
    'POINT_EXPENSE_DISALLOWANCE',
    'POINT_DEPRECIATION_DIFF',
  ]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  const toggleDefensePoint = (pointId: string) => {
    if (selectedDefensePoints.includes(pointId)) {
      setSelectedDefensePoints(selectedDefensePoints.filter((p) => p !== pointId));
    } else {
      setSelectedDefensePoints([...selectedDefensePoints, pointId]);
    }
  };

  const handlePrintAppealMemo = () => {
    PrintService.printElementById('tax-appeal-memo-printable', {
      title: `مذكرة طعن ضريبي - ${selectedClient?.name || 'الشركة'} - نموذج ${modelNumber}`,
      customDelayMs: 300,
    });
    if (showToast) {
      showToast('تم إرسال مذكرة الطعن الضريبي للطباعة والمعاينة الرسمية');
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  المساعد الذكي للطعون والمذكرات الضريبية ومخاطر الفحص (Tax Appeals & Defense Engine)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono">
                  قانون 206 لسنة 2020 & قانون 91
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                صياغة قانونية وفنية متخصصة لمذكرات الطعن على نماذج الفحص والربط الضريبي (نموذج 19 ضرائب، نموذج 15 ق.م، ومذكرات لجان الطعن)،
                مستندة إلى نصوص قانون الإجراءات الضريبية الموحد وقانون الضريبة على الدخل والقيمة المضافة وأحكام محكمة النقض.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintAppealMemo}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مذكرة الطعن الرسمية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="w-4 h-4 text-rose-400" />
            <span>بيانات النموذج الضريبي والطعن</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">الشركة / الممول:</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.taxNumber || 'سجل ضريبي'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold">نوع الإجراء / الطعن المطلوب:</label>
              <select
                value={appealType}
                onChange={(e) => setAppealType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-rose-300 font-bold"
              >
                <option value="MODEL_19_INCOME">طعن على نموذج (19 ضرائب) - فحص أرباح شركات</option>
                <option value="MODEL_15_VAT">طعن على نموذج (15 ضرائب) - ضريبة القيمة المضافة</option>
                <option value="APPEAL_COMMITTEE_MEMO">مذكرة دفاع أمام لجنة الطعن الضريبي</option>
                <option value="RECONSIDERATION_REQUEST">طلب إعادة النظر في الربط لعدم الإخطار القانوني</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold">رقم النموذج المؤرخ:</label>
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">تاريخ استلام النموذج:</label>
                <input
                  type="date"
                  value={modelDate}
                  onChange={(e) => setModelDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold">مأمورية الضرائب المختصة:</label>
              <input
                type="text"
                value={taxInspectorName}
                onChange={(e) => setTaxInspectorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold">الضريبة المربوطة بالنموذج:</label>
                <input
                  type="number"
                  value={disputedAmount}
                  onChange={(e) => setDisputedAmount(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">الضريبة المقر عنها دفترياً:</label>
                <input
                  type="number"
                  value={declaredAmount}
                  onChange={(e) => setDeclaredAmount(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Defense Legal Bases Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-400" />
              <span>محاور وأسانيد الدفاع القانوني المضمنة في المذكرة (Legal Defense Matrix)</span>
            </div>
            <span className="text-xs text-slate-400">حدد البنود المطلوبة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              {
                id: 'POINT_PROCEDURAL_INVALIDITY',
                title: 'بطلان التقدير الشكلي والإجرائي',
                law: 'المادة 41 و 42 من قانون 206 لسنة 2020',
                desc: 'عدم إخطار الممول بالسند القانوني والوقائع وأسباب إهدار الدفاتر المنتظمة.',
              },
              {
                id: 'POINT_UNJUSTIFIED_ESTIMATION',
                title: 'إهدار الدفاتر والحسابات المنتظمة بلا سند',
                law: 'المادة 78 من قانون 91 لسنة 2005',
                desc: 'إمساك دفاتر منتظمة مستوفية للشروط المحاسبية وإقرارات الكترونية معتمدة.',
              },
              {
                id: 'POINT_EXPENSE_DISALLOWANCE',
                title: 'رد المصروفات التكاليفية المؤيدة',
                law: 'المادة 22 و 23 من قانون 91 لسنة 2005',
                desc: 'المصروفات مرتبطة بالنشاط ولازمة لتحقيق الإيراد ومؤيدة بالفواتير الإلكترونية.',
              },
              {
                id: 'POINT_DEPRECIATION_DIFF',
                title: 'فروق الإهلاك والترحيل الضريبي',
                law: 'المواد 25، 26، 27 من قانون 91 لسنة 2005',
                desc: 'صحة حساب الإهلاك الضريبي المعجل والأساس الضريبي للمجموعات.',
              },
              {
                id: 'POINT_VAT_INPUT_DEDUCTION',
                title: 'أحقية خصم الضريبة على المدخلات',
                law: 'المادة 22 من قانون 67 لسنة 2016',
                desc: 'الفواتير مسجلة بمنظومة الفاتورة الإلكترونية ومستوفية لضوابط الخصم الضريبي.',
              },
              {
                id: 'POINT_LIMITATION_PERIOD',
                title: 'سقوط حق المأمورية بالتقادم الخمسي',
                law: 'المادة 91 من قانون الإجراءات الضريبية الموحد',
                desc: 'مضي أكثر من خمس سنوات على تاريخ انتهاء الأجل المحدد لتقديم الإقرار.',
              },
            ].map((pt) => {
              const isSelected = selectedDefensePoints.includes(pt.id);
              return (
                <div
                  key={pt.id}
                  onClick={() => toggleDefensePoint(pt.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-right ${
                    isSelected
                      ? 'bg-rose-950/20 border-rose-500 text-slate-100 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs">{pt.title}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isSelected ? '✓' : '+'}
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-400 font-mono font-bold mb-1">{pt.law}</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">{pt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRINTABLE LEGAL APPEAL MEMO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="tax-appeal-memo-printable">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-lg font-black text-white">مكتب المحاسب القانوني ومراقب الحسابات</h2>
            <div className="text-xs text-rose-400 font-bold">محمد جميل مرعي - مستشار الضرائب والمراجعة القانونية</div>
            <div className="text-[11px] text-slate-400">سجل عام المحاسبين والمراجعين رقم: 18492</div>
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-white">صحيفة طعن ضريبي رسمي</div>
            <div className="text-xs text-slate-400 font-mono">النموذج المطعون فيه: {modelNumber}</div>
            <div className="text-xs text-slate-400">التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-200">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-sm font-bold text-white">
              السيد الأستاذ / رئيس {taxInspectorName} (لجنة الطعن المختصة)
            </div>
            <div className="text-slate-300">تحية طيبة وبعد ،،،</div>
            <div className="text-slate-300 text-justify">
              مقدمه لسيادتكم / المحاسب القانوني <strong>محمد جميل مرعي</strong>، بصفتي وكيلاً عن الممول / <strong>{selectedClient?.name}</strong>،
              المسجل ضريبياً برقم <strong>({selectedClient?.taxNumber || '000-000-000'})</strong>، 
              وملف ضريبي رقم <strong>({selectedClient?.fileNumber || '12345/ع'})</strong>.
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>الموضوع: الطعن على النموذج الضريبي رقم ({modelNumber}) المؤرخ في ({modelDate}):</span>
            </h4>
            <p className="text-slate-300 text-justify">
              حيث تسلمت الشركة النموذج عالي البيان متضمناً ربطاً تقديرياً للضريبة بمبلغ وقدره <strong>({disputedAmount.toLocaleString()} ج.م)</strong> عن السنة الضريبية ({taxYear})،
              ولما كان هذا التقدير قد شابه العوار القانوني والمحاسبي وأهدر حقوق الممول الدفترية، فإننا نطعن عليه شكلاً وموضوعاً استناداً للأسباب الآتية:
            </p>

            {/* Defense Points Listed */}
            <div className="space-y-3 pt-2">
              {selectedDefensePoints.map((pointId, idx) => (
                <div key={pointId} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span>
                      {pointId === 'POINT_PROCEDURAL_INVALIDITY' && 'أولاً: بطلان التقدير لمخالفة الإجراءات الجوهرية (المادة 41 من قانون 206 لسنة 2020)'}
                      {pointId === 'POINT_UNJUSTIFIED_ESTIMATION' && 'ثانياً: خطأ المأمورية في إهدار الدفاتر المحاسبية والحسابات المنتظمة دون مسوغ قانوني'}
                      {pointId === 'POINT_EXPENSE_DISALLOWANCE' && 'ثالثاً: أحقية الشركة في اعتماد كافة التكاليف والمصروفات المؤيدة بالفواتير الإلكترونية'}
                      {pointId === 'POINT_DEPRECIATION_DIFF' && 'رابعاً: صحة حساب مخصصات وإهلاكات الأصول وفقاً لمعايير المحاسبة المصرية والمادة 25 من القانون'}
                      {pointId === 'POINT_VAT_INPUT_DEDUCTION' && 'خامساً: أحقية الشركة في رد وخصم كامل ضريبة المدخلات وفقاً للمادة 22 من قانون 67 لسنة 2016'}
                      {pointId === 'POINT_LIMITATION_PERIOD' && 'سادساً: الدفع بسقوط حق المصلحة في المطالبة بالتقادم الخمسي المنصوص عليه قانوناً'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] pr-7">
                    {pointId === 'POINT_PROCEDURAL_INVALIDITY' && 'لم تلتزم المأمورية ببيان الأسس الفنية والواقعية التي بني عليها الربط، مما يجرد الإخطار من فاعليته القانونية ويجعله حرياً بالإلغاء.'}
                    {pointId === 'POINT_UNJUSTIFIED_ESTIMATION' && 'تمسك الشركة بدفاترها الإلكترونية وقوائمها المالية المعتمدة والمقدمة إلكترونياً لمنظومة الضرائب المصرية في المواعيد المقررة.'}
                    {pointId === 'POINT_EXPENSE_DISALLOWANCE' && 'كافة المصروفات المدرجة بالإقرار مؤيدة بالفواتير الإلكترونية المعتمدة ومستوفية لشروط المادتين 22 و 23 من القانون 91 لسنة 2005.'}
                    {pointId === 'POINT_DEPRECIATION_DIFF' && 'تطبيق النسب المقررة بالمادة (25) من قانون الضريبة على الدخل مع استبعاد أي إضافات عشوائية للأوعية التقديرية.'}
                    {pointId === 'POINT_VAT_INPUT_DEDUCTION' && 'جميع المشتريات ومؤيدات الخصم صادرة من مسجلين لدى مصلحة الضرائب المصرية ومثبتة عبر منظومة الفاتورة والإيصال الإلكتروني.'}
                    {pointId === 'POINT_LIMITATION_PERIOD' && 'مضي المدة القانونية المقررة لسقوط حق مصلحة الضرائب في فحص أو تعديل الإقرار الضريبي.'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white">الطلبات الختامية:</h4>
            <div className="text-slate-300">
              بناءً على ما تقدم، يلتمس الطاعن من لجنتكم الموقرة:
              <ol className="list-decimal list-inside space-y-1 mt-1 font-bold text-slate-200">
                <li>قبول الطعن شكلاً لتقديمه في الميعاد القانوني المقرر (30 يوماً من تاريخ الإخطار).</li>
                <li>وفي الموضوع، إلغاء التقديرات الجزافية واعتماد الإقرار الضريبي الدفتري المقدم من الشركة.</li>
                <li>إحالة الملف إلى لجنة إعادة النظر أو لجنة الطعن للفحص المستندي الميداني.</li>
              </ol>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs font-bold text-slate-300">
            <div>
              <div>الممثل القانوني للشركة</div>
              <div className="mt-8 text-slate-500 font-mono">...........................................</div>
            </div>
            <div>
              <div>المحاسب القانوني والوكيل الضريبي</div>
              <div className="text-rose-400 mt-1">محمد جميل مرعي</div>
              <div className="mt-6 text-slate-500 font-mono">[ختم المحاسب القانوني المعتمد]</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
