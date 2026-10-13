import React, { useState, useEffect } from 'react';
import { Calculator, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { BudgetPlannerView } from '../financial/BudgetPlannerView';
import { CashFlowPredictorView } from '../financial/CashFlowPredictorView';
import { ClientSelector } from '../common/ClientSelector';
import { ResponsiveSubTabBar } from '../common/ThemeUIComponents';

export type FinancialPlanningSubTab = 'BUDGET_PLANNER' | 'CASH_FLOW_PREDICTOR';

interface FinancialPlanningHubViewProps {
  state: DatabaseState;
  initialSubTab?: FinancialPlanningSubTab;
  fiscalYear?: number;
}

export const FinancialPlanningHubView: React.FC<FinancialPlanningHubViewProps> = ({
  state,
  initialSubTab = 'BUDGET_PLANNER',
  fiscalYear = 2026,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialPlanningSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs = [
    {
      id: 'BUDGET_PLANNER' as FinancialPlanningSubTab,
      label: 'الموازنة التقديرية للعام والتشغيل',
      icon: Calculator,
      badge: `${fiscalYear}`,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
    {
      id: 'CASH_FLOW_PREDICTOR' as FinancialPlanningSubTab,
      label: 'توقعات التدفقات النقدية ومسار السيولة',
      icon: Calendar,
      badge: 'تنبؤ 12 شهراً',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Sub Tabs Bar */}
      <ResponsiveSubTabBar
        tabs={tabs.map((t) => ({
          id: t.id,
          label: t.label,
          icon: React.createElement(t.icon, { className: 'w-4 h-4 shrink-0' }),
          badge: t.badge ? (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.badgeColor || ''}`}>
              {t.badge}
            </span>
          ) : undefined,
        }))}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as FinancialPlanningSubTab)}
      />

      {/* Sub View Content */}
      <div>
        {activeSubTab === 'BUDGET_PLANNER' && (
          <BudgetPlannerView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'CASH_FLOW_PREDICTOR' && (
          <CashFlowPredictorView state={state} />
        )}
      </div>
    </div>
  );
};

export default React.memo(FinancialPlanningHubView);
