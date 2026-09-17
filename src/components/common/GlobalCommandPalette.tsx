import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Command,
  ArrowRight,
  BookOpen,
  DollarSign,
  FileText,
  Users,
  Shield,
  Layers,
  Sparkles,
  Calculator,
  Lock,
  RotateCcw,
  Zap,
  TrendingUp,
  CreditCard,
  Building,
  KeyRound,
  FileSpreadsheet,
  HelpCircle,
  X,
  Ship,
  Film,
} from 'lucide-react';
import { useDensity } from './CompactDensityContext';

export interface CommandItem {
  id: string;
  title: string;
  category: 'NAVIGATION' | 'ACTIONS' | 'REPORTS' | 'TAX' | 'SETTINGS';
  description?: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenShortcutsModal?: () => void;
  onOpenDesktopModal?: () => void;
  onOpenPromoModal?: () => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenShortcutsModal,
  onOpenDesktopModal,
  onOpenPromoModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { density, toggleDensity, isFocusMode, toggleFocusMode } = useDensity();

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'لوحة المؤشرات والرقابة المالية',
      category: 'NAVIGATION',
      description: 'نظرة عامة على أداء الشركة والمؤشرات الحيوية والسيولة',
      shortcut: 'Ctrl+D',
      icon: Layers,
      action: () => {
        onNavigateTab('DASHBOARD');
        onClose();
      },
    },
    {
      id: 'nav-journal',
      title: 'دفتر اليومية العامة والقيود',
      category: 'NAVIGATION',
      description: 'إدخال ومراجعة قيود اليومية المحاسبية المزدوجة',
      shortcut: 'Ctrl+J',
      icon: BookOpen,
      action: () => {
        onNavigateTab('JOURNAL_ENTRIES');
        onClose();
      },
    },
    {
      id: 'nav-ledger',
      title: 'دفتر الأستاذ العام (General Ledger)',
      category: 'NAVIGATION',
      description: 'كشوف حسابات الأستاذ المساعد والأرصدة التراكمية',
      shortcut: 'Ctrl+L',
      icon: DollarSign,
      action: () => {
        onNavigateTab('GENERAL_LEDGER');
        onClose();
      },
    },
    {
      id: 'nav-trial-balance',
      title: 'ميزان المراجعة بالمجاميع والأرصدة',
      category: 'NAVIGATION',
      description: 'مطابقة الأرصدة وميزان المراجعة قبل وبعد التسويات',
      shortcut: 'Ctrl+T',
      icon: TrendingUp,
      action: () => {
        onNavigateTab('TRIAL_BALANCE');
        onClose();
      },
    },
    {
      id: 'nav-financial-statements',
      title: 'القوائم المالية والحسابات الختامية (EAS/IFRS)',
      category: 'NAVIGATION',
      description: 'قائمة المركز المالي، الدخل، التدفقات النقدية، والتغير بالملكية',
      shortcut: 'Ctrl+F',
      icon: FileSpreadsheet,
      action: () => {
        onNavigateTab('FINANCIAL_STATEMENTS');
        onClose();
      },
    },
    {
      id: 'nav-treasury',
      title: 'الخزينة والمقبوضات والمدفوعات',
      category: 'NAVIGATION',
      description: 'إيصالات القبض والصرف، أرصدة البنوك وحركات النقدية',
      shortcut: 'Ctrl+P',
      icon: CreditCard,
      action: () => {
        onNavigateTab('TREASURY');
        onClose();
      },
    },
    {
      id: 'nav-clients',
      title: 'أرشيف ملفات العملاء والشركات',
      category: 'NAVIGATION',
      description: 'بيانات المنشآت، السجلات التجارية، بوابات الضرائب، والأتعاب',
      shortcut: 'Ctrl+M',
      icon: Users,
      action: () => {
        onNavigateTab('CLIENTS');
        onClose();
      },
    },
    {
      id: 'nav-invoicing',
      title: 'الفواتير والمطالبات المالية',
      category: 'NAVIGATION',
      description: 'إصدار الفواتير، ضريبة القيمة المضافة، والتسويات',
      shortcut: 'Ctrl+I',
      icon: FileText,
      action: () => {
        onNavigateTab('INVOICING');
        onClose();
      },
    },
    {
      id: 'nav-excel-audit',
      title: 'مختبر مراجعة الإكسيل الذكي (XAI & Unsupervised ML)',
      category: 'NAVIGATION',
      description: 'فحص ملفات إكسيل الشركات، كشف الاحتيال وشذوذ بنفورد وتكرار التوزيع مع تقارير Word/Excel/PDF',
      shortcut: 'Ctrl+E',
      icon: Sparkles,
      action: () => {
        onNavigateTab('EXCEL_AUDIT_SENTINEL');
        onClose();
      },
    },
    {
      id: 'nav-customs',
      title: 'الجمارك والتجارة والتكلفة الإنزالية (ACI / Nafeza)',
      category: 'NAVIGATION',
      description: 'إدارة الشحنات الجمركية، رقم ACID، قيود المخزون، وسندات الخزنة والأرشيف',
      icon: Ship,
      action: () => {
        onNavigateTab('CUSTOMS_HUB');
        onClose();
      },
    },
    {
      id: 'nav-promo-modal',
      title: 'البرومو السينمائي والهوية الرسمية للمكتب (MG Official Promo)',
      category: 'NAVIGATION',
      description: 'مشاهدة البرومو ثلاثي الأبعاد 60 FPS، الختم الذهبي، وتصدير الفيديو والشعار',
      icon: Film,
      action: () => {
        if (onOpenPromoModal) {
          onOpenPromoModal();
        }
        onClose();
      },
    },
    {
      id: 'nav-tax-audit',
      title: 'مركز الضرائب والإقرارات والفحص',
      category: 'TAX',
      description: 'إقرارات الدخل 101/102/105، القيمة المضافة، والخصم والإضافة',
      icon: Shield,
      action: () => {
        onNavigateTab('TAX_HUB');
        onClose();
      },
    },
    {
      id: 'nav-credit-simulator',
      title: 'محاكي الاعتماد الائتماني والتمويل البنكي',
      category: 'REPORTS',
      description: 'تحليل الجدارة الائتمانية واحتساب نسب التغطية ونموذج Altman Z-Score',
      icon: Sparkles,
      action: () => {
        onNavigateTab('CREDIT_SIMULATOR');
        onClose();
      },
    },
    // Quick Actions
    {
      id: 'act-toggle-density',
      title: `تبديل كثافة الجداول (الحالي: ${density === 'compact' ? 'مضغوط فائق' : 'مريح وواسع'})`,
      category: 'ACTIONS',
      description: 'التبديل بين رؤية تفصيلية سريعة أو مسافات مريحة للقراءة',
      shortcut: 'Alt+D',
      icon: Zap,
      action: () => {
        toggleDensity();
        onClose();
      },
    },
    {
      id: 'act-toggle-focus',
      title: `وضع التركيز والنقاء (Zen Mode): ${isFocusMode ? 'مفعل (إيقاف)' : 'معطل (تشغيل)'}`,
      category: 'ACTIONS',
      description: 'إخفاء الأشرطة الجانبية والعلوية لتوفير شاشة كاملة ونقية 100%',
      shortcut: 'F11 / Alt+Z',
      icon: Sparkles,
      action: () => {
        toggleFocusMode();
        onClose();
      },
    },
    {
      id: 'act-shortcuts',
      title: 'دليل اختصارات لوحة المفاتيح السريعة',
      category: 'SETTINGS',
      description: 'عرض كافة اختصارات البرنامج المحاسبي للتنقل السريع',
      shortcut: '?',
      icon: HelpCircle,
      action: () => {
        onClose();
        if (onOpenShortcutsModal) onOpenShortcutsModal();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!searchTerm || !searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (cmd.title || '').toLowerCase().includes(term) ||
      (cmd.description && cmd.description.toLowerCase().includes(term)) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(term))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-850/50">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Command className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="اكتب اسم الشاشة، أمر، تقرير، أو اختصار (مثال: قيود، ميزان، ضرائب)..."
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 font-bold text-sm focus:outline-none"
          />
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold">
            ESC للإغلاق
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              لا توجد نتائج مطابقة لبحثك "{searchTerm}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm truncate">
                        {cmd.title}
                      </div>
                      {cmd.description && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    {cmd.shortcut && (
                      <kbd
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 rtl:rotate-180 opacity-60 ${
                        isSelected ? 'opacity-100' : ''
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-bold">
          <div className="flex items-center gap-3">
            <span>استخدم ↑ ↓ للتنقل</span>
            <span>↵ للتنفيذ</span>
          </div>
          <div className="flex items-center gap-2">
            <span>البحث السريع الذكي (Ctrl+K)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
