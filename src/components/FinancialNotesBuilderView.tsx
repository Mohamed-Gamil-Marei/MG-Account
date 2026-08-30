import React, { useState } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import {
  FileSpreadsheet,
  BookOpen,
  Printer,
  Download,
  Building,
  CheckCircle2,
  Edit3,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

interface FinancialNotesBuilderProps {
  state: DatabaseState;
}

interface NoteItem {
  id: string;
  number: number;
  title: string;
  easStandard: string;
  category: 'GENERAL' | 'POLICIES' | 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'OTHER';
  contentAr: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export const FinancialNotesBuilderView: React.FC<FinancialNotesBuilderProps> = ({ state }) => {
  const [selectedClient, setSelectedClient] = useState<string>(state.clients[0]?.id || '');
  const [fiscalYear, setFiscalYear] = useState<number>(2025);
  const [activeNoteId, setActiveNoteId] = useState<string>('note-1');

  const client = state.clients.find((c) => c.id === selectedClient) || state.clients[0];

  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'note-1',
      number: 1,
      title: 'معلومات عامة عن الشركة والكيان القانوني',
      easStandard: 'معيار المحاسبة المصري رقم (1)',
      category: 'GENERAL',
      contentAr: `تأسست شركة ${client?.name || 'الأهرام للصناعات الهندسية والتجارة'} كشركة مساهمة مصرية (ش.م.م) خاضعة لأحكام قانون الشركات رقم 159 لسنة 1981 ولائحته التنفيذية وقانون الاستثمار رقم 72 لسنة 2017. 
الغرض الرئيسي للشركة هو تصنيع وتوزيع وتصدير المنتجات الهندسية والتوريدات العمومية. المركز الرئيسي للشركة ومقرها القانوني: ${client?.address || 'المنطقة الصناعية - مدينة السادس من أكتوبر - الجيزة'}.
السجل التجاري رقم: ${client?.commercialRegistrationNo || '148293'} - الجيزة، والبطاقة الضريبية رقم: ${client?.taxCardNo || '284-918-372'}. تبدأ السنة المالية للشركة في الأول من يناير وتنتهي في الحادي والثلاثين من ديسمبر من كل عام.`,
    },
    {
      id: 'note-2',
      number: 2,
      title: 'أهم السياسات المحاسبية المتبعة',
      easStandard: 'معايير المحاسبة المصرية (EAS)',
      category: 'POLICIES',
      contentAr: `أُعدت القوائم المالية المرفقة وفقاً لمعايير المحاسبة المصرية (EAS) وفي ضوء القوانين واللوائح المصرية السارية. وفيما يلي ملخص لأهم السياسات المحاسبية المطبقة:
1. أساس الإعداد: تم إعداد القوائم المالية على أساس التكلفة التاريخية وباستخدام مبدأ الاستحقاق المحاسبي وفرضية الاستمرارية.
2. عملة التعامل والتقرير: العملة الوظيفية وعملة العرض للقوائم المالية هي الجنيه المصري (EGP). تتم ترجمة المعاملات بالعملات الأجنبية بأسعار الصرف السائدة في تاريخ المعاملة وفقاً للمعيار المصري رقم (13).
3. الاعتراف بالإيراد (معيار EAS 48): يتم الاعتراف بالإيراد عند انتقال السيطرة على السلع أو الخدمات الموعودة للعميل بالوفاء بالتزامات الأداء المحددة في العقد وبالمبلغ الذي يعكس المقابل المتوقع استحقاقه.
4. الأصول الثابتة وإهلاكها (معيار EAS 10): تُقاس الأصول الثابتة بالتكلفة التاريخية مخصوماً منها مجمع الإهلاك وخسائر انخفاض القيمة. يتم الإهلاك بطريقة القسط الثابت على مدار الأعمار الإنتاجية المقدرة (المباني: 20-50 سنة، الآلات والمعدات: 5-10 سنوات، السيارات: 5 سنوات، أجهزة الحاسب: 3-5 سنوات).
5. المخزون (معيار EAS 2): يُقوم المخزون بالتكلفة أو صافي القيمة البيعية القابلة للتحقق أيهما أقل، وتُحدد التكلفة باستخدام طريقة المتوسط المرجح.
6. الخسائر الائتمانية المتوقعة (معيار EAS 47): تطبق الشركة النموذج المبسط لاحتساب مخصص الخسائر الائتمانية المتوقعة للعملاء وحسابات القبض التجارية.`,
    },
    {
      id: 'note-3',
      number: 3,
      title: 'الأصول الثابتة ومجمع الإهلاك',
      easStandard: 'معيار المحاسبة المصري رقم (10)',
      category: 'ASSETS',
      contentAr: `تتكون الأصول الثابتة من المباني والآلات والمعدات ووسائل النقل وأجهزة الحاسب الآلي. يتم إهلاك الأصول بطريقة القسط الثابت. والجدول التالي يوضح حركة الأصول الثابتة ومجمع الإهلاك خلال العام المنتهي:`,
      tableData: {
        headers: ['بند الأصل', 'رصيد أول العام (ج.م)', 'إضافات العام (ج.م)', 'استبعادات (ج.م)', 'إهلاك العام (ج.م)', 'صافي القيمة الدفترية (ج.م)'],
        rows: [
          ['الأراضي والمباني', '4,500,000', '250,000', '0', '150,000', '4,600,000'],
          ['الآلات وخطوط الإنتاج', '3,800,000', '620,000', '0', '420,000', '4,000,000'],
          ['سيارات ووسائل نقل', '1,200,000', '0', '0', '240,000', '960,000'],
          ['أجهزة حاسب وبرمجيات', '350,000', '95,000', '0', '110,000', '335,000'],
          ['أثاث ومعدات مكاتب', '280,000', '35,000', '0', '45,000', '270,000'],
        ],
      },
    },
    {
      id: 'note-4',
      number: 4,
      title: 'المخزون وبضاعة بالطريق',
      easStandard: 'معيار المحاسبة المصري رقم (2)',
      category: 'ASSETS',
      contentAr: `تم جرد المخزون في 31 ديسمبر 2025 تحت إشراف لجنة جرد معتمدة وبحضور ممثلي مراقب الحسابات المستقل. يُقوم المخزون بالتكلفة على أساس المتوسط المرجح أو صافي القيمة القابلة للتحقق أيهما أقل:`,
      tableData: {
        headers: ['نوع المخزون', '31 ديسمبر 2025 (ج.م)', '31 ديسمبر 2024 (ج.م)'],
        rows: [
          ['خامات ومواد أولية ومستلزمات إنتاج', '2,450,000', '2,100,000'],
          ['إنتاج غير تام (قيد التشغيل)', '680,000', '540,000'],
          ['إنتاج تام (بضاعة جاهزة للبيع)', '1,890,000', '1,650,000'],
          ['اعتمادات مستندية وبضاعة بالطريق', '420,000', '290,000'],
          ['يخصم: مخصص هبوط أسعار وركود المخزون', '(75,000)', '(50,000)'],
          ['الإجمالي الصافي للمخزون', '5,365,000', '4,530,000'],
        ],
      },
    },
    {
      id: 'note-5',
      number: 5,
      title: 'العملاء والمدينون ومخصص الخسائر الائتمانية',
      easStandard: 'معيار المحاسبة المصري رقم (47)',
      category: 'ASSETS',
      contentAr: `تتضمن أرصدة العملاء المبالغ المستحقة عن مبيعات السلع والتوريدات للعملاء التجاريين في النطاق الجغرافي لجمهورية مصر العربية. يتم تقييم الجدارة الائتمانية وتكوين مخصص الخسائر الائتمانية المتوقعة (ECL):`,
      tableData: {
        headers: ['فترة الاستحقاق / العمر الزمني', 'إجمالي الرصيد (ج.م)', 'نسبة التعثر المتوقعة', 'المخصص المحتسب (ج.م)'],
        rows: [
          ['أرصدة جارية وغير متأخرة (1-30 يوم)', '2,800,000', '0.5%', '14,000'],
          ['أرصدة متأخرة من 31 إلى 90 يوم', '950,000', '2.0%', '19,000'],
          ['أرصدة متأخرة من 91 إلى 180 يوم', '420,000', '8.0%', '33,600'],
          ['أرصدة متأخرة أكثر من 180 يوم', '180,000', '40.0%', '72,000'],
          ['الإجمالي', '4,350,000', '-', '138,600'],
        ],
      },
    },
    {
      id: 'note-6',
      number: 6,
      title: 'النقدية وما في حكمها',
      easStandard: 'معيار المحاسبة المصري رقم (4)',
      category: 'ASSETS',
      contentAr: `تتضمن النقدية وما في حكمها الأرصدة النقدية بالصندوق ولدى البنوك التجارية الخاضعة لرقابة البنك المركزي المصري دون قيود على السحب:`,
      tableData: {
        headers: ['البند / البنك', '31 ديسمبر 2025 (ج.م)', '31 ديسمبر 2024 (ج.م)'],
        rows: [
          ['النقدية بالصندوق (الخزينة الرئيسية)', '85,000', '65,000'],
          ['البنك الأهلي المصري - حساب جاري', '1,450,000', '980,000'],
          ['بنك مصر - حساب جاري', '890,000', '620,000'],
          ['البنك التجاري الدولي (CIB) - حساب دولاري (معادل)', '1,240,000', '850,000'],
          ['ودائع قصيرة الأجل (أقل من 3 شهور)', '1,500,000', '1,000,000'],
          ['الإجمالي بقائمة التدفقات النقدية', '5,165,000', '3,515,000'],
        ],
      },
    },
    {
      id: 'note-7',
      number: 7,
      title: 'رأس المال والاحتياطيات',
      easStandard: 'قانون الشركات رقم 159 لسنة 1981',
      category: 'EQUITY',
      contentAr: `رأس المال المرخص به للشركة محدد بمبلغ 20,000,000 ج.م (عشرون مليون جنيه مصري).
رأس المال المصدر والمدفوع بالكامل يبلغ 10,000,000 ج.م (عشرة ملايين جنيه مصري) مقسم إلى 100,000 سهم اسمي بقيمة اسمية 100 ج.م للسهم الواحد.
الاحتياطي القانوني: يتم تجنيب نسبة 5% من صافي أرباح العام لتكوين الاحتياطي القانوني وفقاً للمادة (40) من القانون 159 لسنة 1981 حتى يبلغ نصف رأس المال المصدر.`,
    },
    {
      id: 'note-8',
      number: 8,
      title: 'المعاملات مع الأطراف ذات العلاقة',
      easStandard: 'معيار المحاسبة المصري رقم (15)',
      category: 'OTHER',
      contentAr: `تتم المعاملات مع الشركات الشقيقة وأعضاء مجلس الإدارة وفقاً لذات الشروط والأسس التجارية المتبعة مع الغير (مبدأ السعر المحايد Arm's Length Principle). وبلغت قيمة المعاملات خلال العام: مبيعات خدمات للشركة الشقيقة بمبلغ 350,000 ج.م، ومكافآت وبدلات حضور مجلس الإدارة بمبلغ 180,000 ج.م.`,
    },
    {
      id: 'note-9',
      number: 9,
      title: 'الالتزامات المحتملة والارتباطات الرأسمالية',
      easStandard: 'معيار المحاسبة المصري رقم (28)',
      category: 'LIABILITIES',
      contentAr: `بلغت خطابات الضمان المصدرة من البنوك لصالح الغير والخاصة بأعمال التوريدات في تاريخ الميزانية مبلغ 1,200,000 ج.م مغطاة بغطاء نقدي بنسبة 15%. لا توجد قضايا أو نزاعات قضائية جوهرية مرفوعة ضد الشركة من شأنها التأثير على مركزها المالي.`,
    },
    {
      id: 'note-10',
      number: 10,
      title: 'الأحداث اللاحقة لتاريخ القوائم المالية',
      easStandard: 'معيار المحاسبة المصري رقم (7)',
      category: 'OTHER',
      contentAr: `لم تقع أية أحداث جوهرية أو غير عادية لاحقة لتاريخ المركز المالي في 31 ديسمبر 2025 وحتى تاريخ اعتماد القوائم المالية من مجلس الإدارة تتطلب تعديل الأرقام الدفترية أو الإفصاح عنها بخلاف ما تم بيانه.`,
    },
  ]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              كراسة الإيضاحات المتممة المعتمدة (EAS Notes to Financials)
            </span>
            <span className="text-slate-400 text-xs font-mono">الهيئة العامة للاستثمار ومصلحة الشركات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            منشئ الإيضاحات المتممة للقوائم المالية المصرية
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            صياغة وتوليد الإيضاحات والسياسات المحاسبية الإلزامية المرفقة بالميزانية وقائمة الدخل وفق معايير المحاسبة المصرية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScreenActionToolbar
            modelType="FINANCIAL_NOTES"
            title="الإيضاحات المتممة للقوائم المالية المصرية"
            showImport={false}
          />
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">الشركة:</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
            >
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">السنة المالية:</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          إجمالي الإيضاحات المعتمدة بالكراسة: <strong>{notes.length} إيضاحاً</strong>
        </div>
      </div>

      {/* Main Split Layout: Notes Navigation on Right, Note Editor & Preview on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right Side: Index of Notes */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
            <div className="font-bold text-xs text-slate-700 px-2 py-1 mb-2 border-b border-slate-100 flex items-center justify-between">
              <span>فهرس الإيضاحات المتممة</span>
              <span className="text-[10px] text-slate-400 font-mono">EAS Index</span>
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`w-full text-right p-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                    activeNoteId === note.id
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg text-[10px] font-mono flex items-center justify-center shrink-0 ${
                      activeNoteId === note.id
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {note.number}
                  </span>
                  <div className="flex-1 truncate">
                    <div className="truncate">{note.title}</div>
                    <div
                      className={`text-[10px] truncate ${
                        activeNoteId === note.id ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {note.easStandard}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Left Side: Active Note Viewer & Editor */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold text-xs flex items-center justify-center">
                  {activeNote.number}
                </span>
                <h2 className="font-bold text-slate-900 text-base">
                  إيضاح ({activeNote.number}): {activeNote.title}
                </h2>
              </div>
              <span className="text-slate-500 text-xs mt-1 block">
                مرجع المعيار: <strong>{activeNote.easStandard}</strong>
              </span>
            </div>

            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              صيغة رسمية معتمدة
            </span>
          </div>

          {/* Note Narrative Text */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">نص الإيضاح والإفصاح المحاسبي:</label>
            <textarea
              rows={7}
              value={activeNote.contentAr}
              onChange={(e) => {
                const val = e.target.value;
                setNotes((prev) =>
                  prev.map((n) => (n.id === activeNote.id ? { ...n, contentAr: val } : n))
                );
              }}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Table Data if exists */}
          {activeNote.tableData && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">الجدول المالي التحليلي المرفق:</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      {activeNote.tableData.headers.map((h, idx) => (
                        <th key={idx} className="p-2.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeNote.tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-2.5 ${
                              cIdx === 0
                                ? 'font-bold text-slate-900'
                                : 'font-mono text-left text-slate-700'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Regulatory Citation Footer */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                تعتبر الإيضاحات المتممة جزءاً لا يتجزأ من القوائم المالية وتقرأ معها.
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-slate-500">
              مكتب أ/ {state.officeProfile.auditorName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
