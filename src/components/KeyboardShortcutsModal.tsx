import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  Search,
  X,
  LayoutDashboard,
  Receipt,
  BookOpen,
  Scale,
  FileSpreadsheet,
  FileCheck2,
  TrendingUp,
  CreditCard,
  Percent,
  Users,
  Building2,
  Award,
  LineChart,
  FolderTree,
  History,
  Download,
  RefreshCw,
  Laptop,
  ArrowRight,
  Sparkles,
  Ship,
} from 'lucide-react';

export interface ShortcutItem {
  id: string;
  keyCombo: string[];
  label: string;
  category: 'NAVIGATION' | 'ACTIONS' | 'GENERAL';
  description?: string;
  icon: any;
  action: () => void;
  targetTabId?: string;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onOpenBackupModal: () => void;
  onOpenDesktopModal: () => void;
  onCheckUpdate: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenBackupModal,
  onOpenDesktopModal,
  onCheckUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'NAVIGATION' | 'ACTIONS'>('ALL');

  const shortcuts: ShortcutItem[] = useMemo(
    () => [
      // Navigation Shortcuts
      {
        id: 'nav-dashboard',
        keyCombo: ['Ctrl', 'D'],
        label: 'لوحة التحكم الرئيسية',
        category: 'NAVIGATION',
        description: 'عرض المؤشرات العامة والإحصائيات وتدفقات السيولة',
        icon: LayoutDashboard,
        targetTabId: 'DASHBOARD',
        action: () => {
          onNavigate('DASHBOARD');
          onClose();
        },
      },
      {
        id: 'nav-journal',
        keyCombo: ['Ctrl', 'J'],
        label: 'دفتر قيود اليومية العامة',
        category: 'NAVIGATION',
        description: 'تسجيل قيود اليومية الجديدة ومراجعة وتعديل القيود',
        icon: Receipt,
        targetTabId: 'JOURNAL_ENTRIES',
        action: () => {
          onNavigate('JOURNAL_ENTRIES');
          onClose();
        },
      },
      {
        id: 'nav-ledger',
        keyCombo: ['Ctrl', 'L'],
        label: 'دفتر الأستاذ العام',
        category: 'NAVIGATION',
        description: 'كشوف حسابات الأستاذ ومطابقة الأرصدة المدينة والدائنة',
        icon: BookOpen,
        targetTabId: 'GENERAL_LEDGER',
        action: () => {
          onNavigate('GENERAL_LEDGER');
          onClose();
        },
      },
      {
        id: 'nav-trial-balance',
        keyCombo: ['Ctrl', 'T'],
        label: 'ميزان المراجعة بالمجاميع والأرصدة',
        category: 'NAVIGATION',
        description: 'التحقق من توازن الحسابات والتحليل المالي الميداني',
        icon: Scale,
        targetTabId: 'TRIAL_BALANCE',
        action: () => {
          onNavigate('TRIAL_BALANCE');
          onClose();
        },
      },
      {
        id: 'nav-financials',
        keyCombo: ['Ctrl', 'F'],
        label: 'القوائم المالية والتقارير الختامية',
        category: 'NAVIGATION',
        description: 'قائمة الدخل والمركز المالي وفق معايير المحاسبة المصرية',
        icon: FileSpreadsheet,
        targetTabId: 'FINANCIAL_STATEMENTS',
        action: () => {
          onNavigate('FINANCIAL_STATEMENTS');
          onClose();
        },
      },
      {
        id: 'nav-invoices',
        keyCombo: ['Ctrl', 'I'],
        label: 'الفواتير والمبيعات والمشتريات',
        category: 'NAVIGATION',
        description: 'إصدار فواتير المبيعات والمشتريات وحساب ضريبة القيمة المضافة',
        icon: CreditCard,
        targetTabId: 'INVOICING',
        action: () => {
          onNavigate('INVOICING');
          onClose();
        },
      },
      {
        id: 'nav-clients',
        keyCombo: ['Ctrl', 'C'],
        label: 'أرشيف العملاء والشركات',
        category: 'NAVIGATION',
        description: 'ملفات الشركات والسجلات التجارية والبطاقات الضريبية',
        icon: Users,
        targetTabId: 'CLIENTS_ARCHIVE',
        action: () => {
          onNavigate('CLIENTS_ARCHIVE');
          onClose();
        },
      },
      {
        id: 'nav-taxes',
        keyCombo: ['Ctrl', 'X'],
        label: 'إقرارات القيمة المضافة والضرائب',
        category: 'NAVIGATION',
        description: 'متابعة الإقرارات الشهرية ونموذج 10 ضريبة ومواعيد السداد',
        icon: Percent,
        targetTabId: 'TAX_TRACKER',
        action: () => {
          onNavigate('TAX_TRACKER');
          onClose();
        },
      },
      {
        id: 'nav-treasury',
        keyCombo: ['Ctrl', 'M'],
        label: 'خزنة المكتب المستقلة',
        category: 'NAVIGATION',
        description: 'تسجيل مقبوضات ومصروفات أتعاب مكتب المحاسبة والمراجعة',
        icon: Building2,
        targetTabId: 'OFFICE_TREASURY',
        action: () => {
          onNavigate('OFFICE_TREASURY');
          onClose();
        },
      },
      {
        id: 'nav-customs',
        keyCombo: ['Ctrl', 'Shift', 'C'],
        label: 'الجمارك والتجارة والتكلفة الإنزالية',
        category: 'NAVIGATION',
        description: 'شحنات الاستيراد والتصدير، نظام نافذة ACI، واحتساب التكلفة الرأسمالية EAS 2',
        icon: Ship,
        targetTabId: 'CUSTOMS_HUB',
        action: () => {
          onNavigate('CUSTOMS_HUB');
          onClose();
        },
      },
      {
        id: 'nav-chart-accounts',
        keyCombo: ['Ctrl', 'O'],
        label: 'دليل وشجرة الحسابات المصرية',
        category: 'NAVIGATION',
        description: 'هيكل الحسابات التبويبية مع الأكواد القياسية',
        icon: FolderTree,
        targetTabId: 'CHART_OF_ACCOUNTS',
        action: () => {
          onNavigate('CHART_OF_ACCOUNTS');
          onClose();
        },
      },
      {
        id: 'nav-auditor-report',
        keyCombo: ['Ctrl', 'A'],
        label: 'تقرير مراقب الحسابات المستقل',
        category: 'NAVIGATION',
        description: 'رأي المراجع المستقل وفقاً لمعايير المراجعة المصرية (ESA)',
        icon: FileCheck2,
        targetTabId: 'AUDITOR_REPORT',
        action: () => {
          onNavigate('AUDITOR_REPORT');
          onClose();
        },
      },
      {
        id: 'nav-credit',
        keyCombo: ['Ctrl', 'R'],
        label: 'ملف الائتمان ونموذج التوزيع البنكي',
        category: 'NAVIGATION',
        description: 'تحليل التدفقات النقدية وملاءمة التسهيلات الائتمانية',
        icon: TrendingUp,
        targetTabId: 'CREDIT_SIMULATOR',
        action: () => {
          onNavigate('CREDIT_SIMULATOR');
          onClose();
        },
      },
      {
        id: 'nav-certificates',
        keyCombo: ['Ctrl', 'Q'],
        label: 'الشهادات المهنية وإثبات الدخل',
        category: 'NAVIGATION',
        description: 'توليد شهادات إثبات الدخل الموثقة بباركود QR الرقمي',
        icon: Award,
        targetTabId: 'CERTIFICATES',
        action: () => {
          onNavigate('CERTIFICATES');
          onClose();
        },
      },
      {
        id: 'nav-feasibility',
        keyCombo: ['Ctrl', 'E'],
        label: 'دراسات الجدوى الاقتصادية',
        category: 'NAVIGATION',
        description: 'التقييم الاستثماري وحساب فترات الاسترداد ومعدل العائد الداخلي',
        icon: LineChart,
        targetTabId: 'FEASIBILITY_STUDY',
        action: () => {
          onNavigate('FEASIBILITY_STUDY');
          onClose();
        },
      },
      {
        id: 'nav-audit-trail',
        keyCombo: ['Ctrl', 'S'],
        label: 'سجل تدقيق العمليات (Audit Trail)',
        category: 'NAVIGATION',
        description: 'سجل حركات النظام والتعديلات وتوثيق أمان السجلات',
        icon: History,
        targetTabId: 'AUDIT_TRAIL',
        action: () => {
          onNavigate('AUDIT_TRAIL');
          onClose();
        },
      },

      // Quick Actions
      {
        id: 'action-backup',
        keyCombo: ['Ctrl', 'B'],
        label: 'النسخ الاحتياطي وتصدير البيانات',
        category: 'ACTIONS',
        description: 'إنشاء نسخة احتياطية مشفرة بصيغة JSON أو ترحيل البيانات',
        icon: Download,
        action: () => {
          onOpenBackupModal();
          onClose();
        },
      },
      {
        id: 'action-update',
        keyCombo: ['Ctrl', 'U'],
        label: 'فحص التحديثات والإصدارات الجديدة',
        category: 'ACTIONS',
        description: 'التحقق السريع من توفر تحديثات جديدة وتنزيل ملفات التثبيت',
        icon: RefreshCw,
        action: () => {
          onCheckUpdate();
          onClose();
        },
      },
      {
        id: 'action-desktop',
        keyCombo: ['Ctrl', 'P'],
        label: 'تثبيت البرنامج على سطح المكتب',
        category: 'ACTIONS',
        description: 'تنزيل حزمة التشغيل المستقلة والمباشرة لسطح المكتب',
        icon: Laptop,
        action: () => {
          onOpenDesktopModal();
          onClose();
        },
      },
      {
        id: 'action-shortcuts-help',
        keyCombo: ['Ctrl', 'K'],
        label: 'لوحة اختصارات لوحة المفاتيح',
        category: 'ACTIONS',
        description: 'عرض هذه اللوحة التفاعلية للبحث والتنقل السريع',
        icon: Keyboard,
        action: () => {
          // already open
        },
      },
    ],
    [onNavigate, onOpenBackupModal, onOpenDesktopModal, onCheckUpdate, onClose]
  );

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((item) => {
      const matchCategory =
        activeCategory === 'ALL' || item.category === activeCategory;
      const matchQuery =
        !searchQuery ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.keyCombo.join('+').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [shortcuts, activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 text-xs flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Keyboard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  اختصارات لوحة المفاتيح والتنقل السريع
                </h3>
                <span className="text-[10px] font-mono bg-blue-600/60 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                  Ctrl + K
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تنقل بين أقسام المنظومة المحاسبية ونفذ الأوامر بضغطة زر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن قسم، أمر، أو اختصار (مثال: قيد، يومية، فاتورة، أستاذ، Ctrl+J)..."
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Tab */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              جميع الاختصارات ({shortcuts.length})
            </button>
            <button
              onClick={() => setActiveCategory('NAVIGATION')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeCategory === 'NAVIGATION'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              أقسام وشاشات المنظومة
            </button>
            <button
              onClick={() => setActiveCategory('ACTIONS')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeCategory === 'ACTIONS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              العمليات والإجراءات السريعة
            </button>
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Keyboard className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">لم يتم العثور على أي اختصار يطابق بحثك</p>
              <p className="text-[11px]">جرب كتابة اسم الشاشة أو الحرف المقابل للاختصار</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white group-hover:bg-blue-600 group-hover:text-white border border-slate-200 group-hover:border-blue-600 flex items-center justify-center text-slate-700 transition-colors shrink-0 shadow-2xs">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-blue-900 text-xs truncate">
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key combo badges */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keyCombo.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-1 bg-white group-hover:bg-blue-100/80 border border-slate-300 group-hover:border-blue-400 rounded-md font-mono text-[11px] font-bold text-slate-800 group-hover:text-blue-900 shadow-2xs">
                            {key}
                          </kbd>
                          {kIdx < item.keyCombo.length - 1 && (
                            <span className="text-slate-400 text-[10px] font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Tip */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>
              نصيحة: يمكنك الضغط على <kbd className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800">Ctrl + J</kbd> في أي وقت للانتقال المباشر لقيود اليومية.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors"
          >
            إغلاق (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
