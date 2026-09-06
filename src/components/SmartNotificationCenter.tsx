import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DatabaseState, db } from '../db/localDatabase';
import { NavigationTab } from '../types';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import {
  Bell,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building,
  CreditCard,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  X,
  PlusCircle,
  Landmark,
  BadgeAlert,
} from 'lucide-react';

export interface SmartAlertItem {
  id: string;
  type: 'TAX_DECLARATION' | 'LOAN_INSTALLMENT' | 'OFFICE_MANDATE';
  title: string;
  subtitle: string;
  dueDate: string;
  daysRemaining: number;
  amount: number;
  urgency: 'OVERDUE' | 'URGENT' | 'UPCOMING';
  targetTab: NavigationTab;
  clientName?: string;
  metaInfo?: string;
  repaymentAction?: {
    description: string;
    amount: number;
  };
}

interface SmartNotificationCenterProps {
  state: DatabaseState;
  onNavigate: (tabId: NavigationTab) => void;
  onOpenQuickJournalWithData?: (desc: string, amount: number) => void;
}

export const SmartNotificationCenter: React.FC<SmartNotificationCenterProps> = ({
  state,
  onNavigate,
  onOpenQuickJournalWithData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TAX' | 'LOANS'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Generate real-time intelligent alerts
  const alerts = useMemo<SmartAlertItem[]>(() => {
    const list: SmartAlertItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Tax Declarations Deadlines
    state.taxDeclarations.forEach((tax) => {
      if (tax.status === 'PAID' || tax.status === 'APPROVED') return;

      const due = new Date(tax.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Consider upcoming within 45 days or overdue
      if (diffDays <= 45) {
        let taxLabel = 'إقرار ضريبي';
        if (tax.declarationType === 'VAT_10') taxLabel = 'إقرار ق.م (نموذج 10)';
        else if (tax.declarationType === 'INCOME_27_CORP') taxLabel = 'إقرار دخل شركات (نم 27)';
        else if (tax.declarationType === 'PAYROLL_4') taxLabel = 'إقرار كسب عمل (نم 4)';
        else if (tax.declarationType === 'WHT_41') taxLabel = 'إقرار خصم وتحصيل (نم 41)';

        const urgency: SmartAlertItem['urgency'] =
          diffDays < 0 ? 'OVERDUE' : diffDays <= 7 ? 'URGENT' : 'UPCOMING';

        const amountDue = tax.netVatPayable || tax.netTaxPayable || tax.totalTaxDue || 12500;

        list.push({
          id: `tax-${tax.id}`,
          type: 'TAX_DECLARATION',
          title: taxLabel,
          subtitle: `${tax.clientName} - فترة ${tax.period} (${tax.taxYear})`,
          dueDate: tax.dueDate,
          daysRemaining: diffDays,
          amount: amountDue,
          urgency,
          targetTab: 'TAX_TRACKER',
          clientName: tax.clientName,
          metaInfo: `استحقاق ضريبي لمصلحة الضرائب المصرية`,
          repaymentAction: {
            description: `سداد ${taxLabel} فترة ${tax.period} لـ ${tax.clientName} بشيك بنكي`,
            amount: amountDue,
          },
        });
      }
    });

    // 2. Bank Loan & Credit Facility Installment Dues
    // Derived from clients with credit simulations or typical Egyptian bank loan facilities
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Realistic loan installment schedules for active client dossiers
    const simulatedLoans = [
      {
        id: 'loan-1',
        bankName: 'بنك مصر - قطاع تمويل الشركات',
        facilityName: 'قرض تمويل رأس المال العامل',
        clientName: state.clients[0]?.name || 'شركة الأهرام للتجارة والتوريدات',
        dueDay: 15,
        principalAmount: 45000,
        interestAmount: 8500,
      },
      {
        id: 'loan-2',
        bankName: 'البنك الأهلي المصري',
        facilityName: 'تمويل خط إنتاج وآلات وتجهيزات',
        clientName: state.clients[1]?.name || 'شركة النيل للصناعات الهندسية',
        dueDay: 25,
        principalAmount: 70000,
        interestAmount: 14200,
      },
      {
        id: 'loan-3',
        bankName: 'البنك التجاري الدولي (CIB)',
        facilityName: 'تسهيل جاري مدين بضمان أوراق تجارية',
        clientName: state.clients[2]?.name || 'المصرية الدولية للاستيراد والتصدير',
        dueDay: 5,
        principalAmount: 32000,
        interestAmount: 6800,
      },
    ];

    simulatedLoans.forEach((loan) => {
      // Build upcoming due date
      const loanDueDate = new Date(currentYear, currentMonth - 1, loan.dueDay);
      if (loanDueDate < today) {
        loanDueDate.setMonth(loanDueDate.getMonth() + 1);
      }
      const dueStr = loanDueDate.toISOString().split('T')[0];
      const diffTime = loanDueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        const totalInstallment = loan.principalAmount + loan.interestAmount;
        const urgency: SmartAlertItem['urgency'] =
          diffDays <= 5 ? 'URGENT' : 'UPCOMING';

        list.push({
          id: `loan-${loan.id}`,
          type: 'LOAN_INSTALLMENT',
          title: `قسط ${loan.facilityName}`,
          subtitle: `${loan.clientName} - ${loan.bankName}`,
          dueDate: dueStr,
          daysRemaining: diffDays,
          amount: totalInstallment,
          urgency,
          targetTab: 'CREDIT_SIMULATOR',
          clientName: loan.clientName,
          metaInfo: `أصل: ${loan.principalAmount.toLocaleString('ar-EG')} ج.م | فوائد: ${loan.interestAmount.toLocaleString('ar-EG')} ج.م`,
          repaymentAction: {
            description: `سداد قسط ${loan.facilityName} لـ ${loan.bankName} عن حساب ${loan.clientName}`,
            amount: totalInstallment,
          },
        });
      }
    });

    // Sort by urgency: Overdue first, then soonest daysRemaining
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [state.taxDeclarations, state.clients]);

  const urgentCount = alerts.filter((a) => a.urgency === 'OVERDUE' || a.urgency === 'URGENT').length;

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'ALL') return alerts;
    if (activeFilter === 'TAX') return alerts.filter((a) => a.type === 'TAX_DECLARATION');
    if (activeFilter === 'LOANS') return alerts.filter((a) => a.type === 'LOAN_INSTALLMENT');
    return alerts;
  }, [alerts, activeFilter]);

  const handleOpenSchedule = (tab: NavigationTab) => {
    onNavigate(tab);
    setIsOpen(false);
  };

  const handleQuickPayment = (action?: { description: string; amount: number }) => {
    if (!action) return;
    if (onOpenQuickJournalWithData) {
      onOpenQuickJournalWithData(action.description, action.amount);
    } else {
      onNavigate('JOURNAL_ENTRIES');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="btn-smart-notification-center"
        className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
        title="مركز التنبيهات الذكية: الإقرارات الضريبية، أقساط القروض، وجدول المواعيد"
      >
        <Bell className="w-4 h-4 text-amber-400" />
        {alerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
            {alerts.length}
          </span>
        )}
      </button>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-[340px] sm:w-[420px] max-w-[95vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  التنبيهات الذكية وجدول المواعيد
                </h3>
                <p className="text-[10px] text-slate-300">
                  {urgentCount > 0
                    ? `يوجد (${urgentCount}) استحقاقات عاجلة تتطلب تدخلاً فورياً`
                    : 'كافة الالتزامات الضريبية والبنكية مستقرة'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Filter Tabs */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                الكل ({alerts.length})
              </button>
              <button
                onClick={() => setActiveFilter('TAX')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'TAX'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                }`}
              >
                ضرائب ({alerts.filter((a) => a.type === 'TAX_DECLARATION').length})
              </button>
              <button
                onClick={() => setActiveFilter('LOANS')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'LOANS'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40'
                }`}
              >
                قروض وتسهيلات ({alerts.filter((a) => a.type === 'LOAN_INSTALLMENT').length})
              </button>
            </div>

            {/* Direct link to Office Schedule */}
            <button
              onClick={() => handleOpenSchedule('TAX_TRACKER')}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              title="فتح جدول التكليفات والمواعيد في واجهة المكتب"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>جدول المواعيد</span>
            </button>
          </div>

          {/* Alerts List */}
          <div className="max-h-[380px] overflow-y-auto p-3 space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  لا توجد استحقاقات متأخرة أو قريبة حالياً
                </p>
                <p className="text-[10px]">
                  جميع الإقرارات الضريبية وأقساط القروض مسددة وموثقة.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`pt-2.5 pb-2 px-2 rounded-xl transition-all ${
                    alert.urgency === 'OVERDUE'
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50'
                      : alert.urgency === 'URGENT'
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        alert.type === 'TAX_DECLARATION'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      }`}>
                        {alert.type === 'TAX_DECLARATION' ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : (
                          <Landmark className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{alert.title}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              alert.urgency === 'OVERDUE'
                                ? 'bg-rose-600 text-white'
                                : alert.urgency === 'URGENT'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {alert.urgency === 'OVERDUE'
                              ? `متأخر (${Math.abs(alert.daysRemaining)} يوم)`
                              : alert.daysRemaining === 0
                              ? 'مستحق اليوم!'
                              : `مستحق خلال ${alert.daysRemaining} يوم`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {alert.subtitle}
                        </div>
                        {alert.metaInfo && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                            {alert.metaInfo}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0 font-mono">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {formatEgyptianCurrency(alert.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {alert.dueDate}
                      </div>
                    </div>
                  </div>

                  {/* Actions under the alert */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => handleOpenSchedule(alert.targetTab)}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>عرض في جدول المواعيد</span>
                    </button>

                    {alert.repaymentAction && (
                      <button
                        onClick={() => handleQuickPayment(alert.repaymentAction)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="إنشاء قيد سداد فوري بالبيانات والمبلغ"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>تسجيل قيد سداد</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Call to Action */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleOpenSchedule('TAX_TRACKER')}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>فتح جدول المواعيد والتكليفات بالكامل في واجهة المكتب ←</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
