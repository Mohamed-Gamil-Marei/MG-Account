import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCheck2,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { FinancialStatementsView } from '../FinancialStatementsView';
import { FinancialNotesBuilderView } from '../FinancialNotesBuilderView';
import { AuditorReportView } from '../AuditorReportView';
import { CreditFinancialsSimulator } from '../CreditFinancialsSimulator';

export type FinancialReportingSubTab =
  | 'FINANCIAL_STATEMENTS'
  | 'FINANCIAL_NOTES'
  | 'AUDITOR_REPORT'
  | 'CREDIT_SIMULATOR';

interface FinancialReportingHubViewProps {
  state: DatabaseState;
  initialSubTab?: FinancialReportingSubTab;
  fiscalYear?: number;
}

export const FinancialReportingHubView: React.FC<FinancialReportingHubViewProps> = ({
  state,
  initialSubTab = 'FINANCIAL_STATEMENTS',
  fiscalYear = 2026,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialReportingSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs: {
    id: FinancialReportingSubTab;
    label: string;
    description: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'FINANCIAL_STATEMENTS',
      label: 'القوائم المالية المعتمدة',
      description: 'المركز المالي، الدخل، التدفقات النقدية، وحقوق الملكية',
      icon: FileSpreadsheet,
      badge: 'EAS',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'FINANCIAL_NOTES',
      label: 'الإيضاحات المتممة للقوائم',
      description: 'السياسات المحاسبية والتفاصيل الإيضاحية (معيار 1)',
      icon: FileText,
      badge: 'EAS 1',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    {
      id: 'AUDITOR_REPORT',
      label: 'تقرير مراقب الحسابات',
      description: 'نموذج التقرير المستقل وتأكيد الرأي المهني المعتمد',
      icon: FileCheck2,
      badge: 'ESA',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'CREDIT_SIMULATOR',
      label: 'ملف الائتمان وتوزيع الأرباح',
      description: 'محاكاة التقييم الائتماني البنكي ومصفوفة التوزيع القانوني',
      icon: TrendingUp,
      badge: 'توزيع ذكي',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Top Navigation Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مركز القوائم والتقارير المالية والختامية</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  الحزمة الختامية الكاملة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد واعتماد القوائم المالية، الإيضاحات المتممة، تقرير مراقب الحسابات، وتحليل الملف الائتماني للسنة المالية {fiscalYear}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-700" />
              <span>مراقب الحسابات: أ/ {state.officeProfile.auditorName}</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tab.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'FINANCIAL_STATEMENTS' && (
          <FinancialStatementsView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'FINANCIAL_NOTES' && (
          <FinancialNotesBuilderView state={state} />
        )}
        {activeSubTab === 'AUDITOR_REPORT' && (
          <AuditorReportView state={state} fiscalYear={fiscalYear} />
        )}
        {activeSubTab === 'CREDIT_SIMULATOR' && (
          <CreditFinancialsSimulator state={state} />
        )}
      </div>
    </div>
  );
};
