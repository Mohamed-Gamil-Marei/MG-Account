import React, { useState } from 'react';
import {
  FolderTree,
  Building,
  Factory,
  Utensils,
  Stethoscope,
  ShoppingCart,
  CheckCircle2,
  PlusCircle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { Account, AccountCategory, AccountNature } from '../../types';

interface IndustryCoaTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
}

interface IndustryTemplate {
  id: string;
  name: string;
  icon: any;
  badge: string;
  description: string;
  color: string;
  accounts: Omit<Account, 'id'>[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'CONTRACTING',
    name: 'المقاولات والاستثمار العقاري',
    icon: Building,
    badge: 'مقاولات ومستخلصات',
    description: 'شجرة حسابات معتمدة لشركات المقاولات: مستخلصات، حجز ضمان، تكاليف عمليات، مقاولي باطن',
    color: 'amber',
    accounts: [
      {
        code: '1240',
        name: 'عملاء مستخلصات عمليات تحت التنفيذ',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'المبالغ المعتمدة بمستخلصات المشروعات لدى الملاك',
      },
      {
        code: '1245',
        name: 'عملاء - مبالغ محتجزة تأمين ضمان أعمال (5-10%)',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'تأمينات ضمان محتجزة لدى الملاك لحين انتهاء فترة الصيانة والتسليم النهائي',
      },
      {
        code: '1255',
        name: 'خطابات ضمان وتأمينات ابتدائية ونهائية بنكية',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'غطاء خطابات الضمان لدى البنوك للمناقصات والعمليات',
      },
      {
        code: '2130',
        name: 'مقاولو الباطن وشركات التنفيذ المساعد',
        category: 'LIABILITIES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'مستحقات مقاولي الباطن عن الأعمال المنفذة بالمواقع',
      },
      {
        code: '2135',
        name: 'مخصص حجز ضمان مقاولي الباطن (دائن)',
        category: 'LIABILITIES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'مبالغ محتجزة من مقاولي الباطن لضمان حسن التنفيذ',
      },
      {
        code: '5310',
        name: 'تكاليف عمليات قيد التنفيذ - مواد ومهمات موقع',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'حديد، أسمنت، طوب، رمل، خرسانة جاهزة ومواد بناء',
      },
      {
        code: '5320',
        name: 'تكاليف عمليات - أجور عمالة موقع وتشغيل',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'أجور مهندسي الموقع والعمالة المباشرة والمشرفين',
      },
      {
        code: '5330',
        name: 'تكاليف عمليات - مقاولي باطن وإيجار معدات ثقيلة',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'أوناش، لوادر، حفارات، ومستخلصات مقاولي الباطن',
      },
      {
        code: '4120',
        name: 'إيرادات عقود ومستخلصات مقاولات معتمدة',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'إيرادات الإنجاز المعتمدة وفق معيار المحاسبة المصري (EAS 48)',
      },
    ],
  },
  {
    id: 'MANUFACTURING',
    name: 'المصانع والتكاليف الصناعية',
    icon: Factory,
    badge: 'تكاليف وإنتاج',
    description: 'دليل حسابات صناعي معتمد: خامات، تشغيل لدى الغير، مصروفات صناعية، إنتاج تام وتحت التشغيل',
    color: 'blue',
    accounts: [
      {
        code: '1140',
        name: 'مخزون مواد خام ومستلزمات إنتاج',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'المواد الأولية المعدة للدخول في خطوط الإنتاج',
      },
      {
        code: '1145',
        name: 'مخزون إنتاج تحت التشغيل (WIP)',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'منتجات قيد التصنيع لم تكتمل في نهاية الفترة المالية',
      },
      {
        code: '1150',
        name: 'مخزون إنتاج تام الصنع',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'السلع المصنعة الجاهزة للبيع والتسليم للعملاء',
      },
      {
        code: '1270',
        name: 'أمانات ومواد تشغيل لدى الغير',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'خامات ومكونات مسلمة لمصانع خارجية لمراحل إنتاجية',
      },
      {
        code: '5410',
        name: 'تكلفة المواد المباشرة المنصرفة للتشغيل',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'أذون صرف الخامات المباشرة لأوامر الإنتاج',
      },
      {
        code: '5420',
        name: 'أجور صناعية مباشرة',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'رواتب وأجور عمالة خطوط الإنتاج والمصنع',
      },
      {
        code: '5430',
        name: 'مصروفات صناعية غير مباشرة (Overhead)',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'قوى محركة، صيانة ماكينات، إهلاك خطوط إنتاج، زيوت وقطع غيار',
      },
      {
        code: '4130',
        name: 'مبيعات منتجات مصنعة تامة',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'إيرادات بيع المنتجات الصناعية للعملاء والوكلاء',
      },
    ],
  },
  {
    id: 'RESTAURANTS',
    name: 'المطاعم والكافيهات والأغذية',
    icon: Utensils,
    badge: 'Food Cost & هالك',
    description: 'شجرة حسابات المطاعم: خامات أغذية ومشروبات، تكلفة أطباق (Food Cost %)، هالك، وتوصيل',
    color: 'emerald',
    accounts: [
      {
        code: '1160',
        name: 'مخزون خامات وأغذية ومشروبات (F&B)',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'لحوم، دواجن، خضروات، زيوت، بيفريج ومكونات إعداد الطعام',
      },
      {
        code: '5510',
        name: 'تكلفة الأغذية والمشروبات المستهلكة (Food Cost)',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'تكلفة المكونات والخامات المنصرفة للمطبخ والبار',
      },
      {
        code: '5520',
        name: 'مصروفات هالك وتالف وضيافة مسموح بها',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'الهالك الطبيعي وتذوق الشيفات والضيافة التسويقية',
      },
      {
        code: '5530',
        name: 'مستلزمات تعبئة وتغليف وسفري (Packaging)',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'علب، أكياس، مناديل، شوك، مستلزمات الدليفري',
      },
      {
        code: '4140',
        name: 'إيرادات مبيعات صالة ومطعم',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'فواتير الوجبات والمشروبات المباعة داخل المطعم',
      },
      {
        code: '4145',
        name: 'إيرادات مبيعات توصيل وتطبيقات (دليفري)',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'إيرادات طلبات التوصيل وتطبيقات طلبات ومرسول',
      },
    ],
  },
  {
    id: 'CLINICS',
    name: 'العيادات والمراكز الطبية',
    icon: Stethoscope,
    badge: 'أطباء وتأمين طبي',
    description: 'شجرة حسابات المراكز الطبية والعيادات: عمولات وأتعاب أطباء، شركات تأمين صحي، مستلزمات',
    color: 'rose',
    accounts: [
      {
        code: '1280',
        name: 'مديونيات شركات التأمين الطبي والرعاية الصحية',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'مطالبات معتمدة لدى بوبا، أكسا، نكست كير وشركات الرعاية',
      },
      {
        code: '2150',
        name: 'أتعاب وعمولات أطباء واستشاريين مستحقة',
        category: 'LIABILITIES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'حصة الأطباء من الكشوفات والعمليات الجراحية',
      },
      {
        code: '5610',
        name: 'مصروفات مستلزمات وأدوية طبية مستهلكة',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'شاش، سرنجات، معقمات، خيوط جراحية، كيماويات معامل',
      },
      {
        code: '5620',
        name: 'أتعاب كشوفات وعمليات أطباء خارجية',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'نصيب الأطباء الزائرين والاستشاريين',
      },
      {
        code: '4150',
        name: 'إيرادات كشوفات وعيادات خارجية',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'رسوم كشوفات العيادات العامة والتخصصية',
      },
      {
        code: '4155',
        name: 'إيرادات عمليات وفحوصات ومعامل وأشعة',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'إيرادات غرف العمليات والتحاليل والأشعة الطبية',
      },
    ],
  },
  {
    id: 'ECOMMERCE',
    name: 'التجارة الإلكترونية والتجزئة',
    icon: ShoppingCart,
    badge: 'نون & جوميا & شحن',
    description: 'شجرة حسابات المتاجر الرقمية: عمولات المنصات، بوابات الدفع (Paymob)، وبضاعة لدى شركات الشحن',
    color: 'purple',
    accounts: [
      {
        code: '1170',
        name: 'بضاعة بالطريق ولدى شركات الشحن (COD)',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'شحنات مسلمة لشركات التوصيل بنظام الدفع عند الاستلام',
      },
      {
        code: '1290',
        name: 'مديونيات بوابات الدفع الإلكتروني (Paymob/Fawry)',
        category: 'ASSETS' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'متحصلات بطاقات الائتمان قيد التحويل للحساب البنكي',
      },
      {
        code: '2160',
        name: 'مستحقات منصات البيع (نون / أمازون / جوميا)',
        category: 'LIABILITIES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'أرصدة وعمولات مستحقة للماركت بليس والمنصات الوسيطة',
      },
      {
        code: '5710',
        name: 'عمولات منصات التجارة الإلكترونية وبوابات الدفع',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'عمولات البيع ورسوم بوابات الدفع والتحصيل الرقمي',
      },
      {
        code: '5720',
        name: 'مصروفات شحن وتوصيل وإرجاع للعملاء',
        category: 'EXPENSES' as AccountCategory,
        nature: 'DEBIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'تكاليف بوالص الشحن والتوصيل للمنازل والمرتجعات',
      },
      {
        code: '4160',
        name: 'مبيعات متجر إلكتروني وقنوات رقمية',
        category: 'REVENUES' as AccountCategory,
        nature: 'CREDIT' as AccountNature,
        level: 3,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        description: 'إيرادات المبيعات عبر الموقع وتطبيقات التواصل الاجتماعي',
      },
    ],
  },
];

export const IndustryCoaTemplateModal: React.FC<IndustryCoaTemplateModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('CONTRACTING');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTemplate =
    INDUSTRY_TEMPLATES.find((t) => t.id === selectedIndustryId) || INDUSTRY_TEMPLATES[0];

  const handleApplyTemplate = () => {
    let addedCount = 0;
    const existingCodes = new Set(state.accounts.map((a) => a.code));

    currentTemplate.accounts.forEach((acc) => {
      if (!existingCodes.has(acc.code)) {
        db.addAccount({
          ...acc,
          openingBalanceDebit: 0,
          openingBalanceCredit: 0,
        });
        addedCount++;
      }
    });

    setSuccessNotice(
      `✓ تم بنجاح دمج وتطبيق شجرة حسابات «${currentTemplate.name}» (تمت إضافة ${addedCount} حساب جديد إلى دليلك)`
    );

    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                أدلة الحسابات للأنشطة المتخصصة (Industry Chart of Accounts)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر نشاط عميلك ليتم دمج الحسابات المهنية المعتمدة لشجرته المحاسبية بضغطة زر واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Industries Selection Tabs */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              الأنشطة المتاحة:
            </span>
            {INDUSTRY_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isSel = tmpl.id === selectedIndustryId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedIndustryId(tmpl.id)}
                  className={`w-full p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSel
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/80 text-blue-950 dark:text-blue-100 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSel ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{tmpl.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {tmpl.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Accounts Preview in Selected Template */}
          <div className="md:col-span-8 bg-slate-50 dark:bg-slate-850/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{currentTemplate.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {currentTemplate.accounts.length} حساب تخصصي
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentTemplate.description}
                  </p>
                </div>
              </div>

              {/* Accounts Table Preview */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {currentTemplate.accounts.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                        {acc.code}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {acc.description}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        acc.nature === 'DEBIT'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {acc.nature === 'DEBIT' ? 'مدين' : 'دائن'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Apply Action */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                يتم دمج الحسابات بأمان دون التأثير على حساباتك الحالية
              </span>
              <button
                onClick={handleApplyTemplate}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تطبيق شجرة نشاط «{currentTemplate.name}» فوراً</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
