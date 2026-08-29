import React, { useState, useEffect } from 'react';
import {
  Percent,
  ShieldAlert,
  FileCode2,
  Calculator,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxTrackerView } from '../TaxTrackerView';
import { TaxExposureSimulatorView } from '../TaxExposureSimulatorView';
import { EtaReconciliationView } from '../EtaReconciliationView';
import { PayrollInsuranceEngineView } from '../PayrollInsuranceEngineView';
import { AuditWorkingPapersView } from '../AuditWorkingPapersView';

export type TaxAuditSubTab =
  | 'TAX_TRACKER'
  | 'TAX_EXPOSURE_SIMULATOR'
  | 'ETA_RECONCILIATION'
  | 'PAYROLL_INSURANCE'
  | 'AUDIT_WORKING_PAPERS';

interface TaxAuditHubViewProps {
  state: DatabaseState;
  initialSubTab?: TaxAuditSubTab;
}

export const TaxAuditHubView: React.FC<TaxAuditHubViewProps> = ({
  state,
  initialSubTab = 'TAX_TRACKER',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TaxAuditSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const pendingTaxesCount = state.taxDeclarations.filter(
    (t) => t.status === 'READY_TO_SUBMIT' || t.status === 'DRAFT'
  ).length;

  const tabs: {
    id: TaxAuditSubTab;
    label: string;
    description: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'TAX_TRACKER',
      label: 'إقرارات الضرائب والقيمة المضافة',
      description: 'متابعة المواعيد القانونية، السدادات، ونموذج 10 ضرائب',
      icon: Percent,
      badge: pendingTaxesCount > 0 ? `${pendingTaxesCount} مستحق` : 'مكتمل',
      badgeColor: pendingTaxesCount > 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'TAX_EXPOSURE_SIMULATOR',
      label: 'محاكي الفحص والمخاطر',
      description: 'كشف نقاط الضعف ونسب الأرباح التقديرية والفروق الضريبية',
      icon: ShieldAlert,
      badge: 'فحص مسبق',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'ETA_RECONCILIATION',
      label: 'مطابقة الفواتير الإلكترونية',
      description: 'المطابقة الثلاثية ومحاذاة إقرارات القيمة المضافة مع ETA',
      icon: FileCode2,
      badge: 'SDK v1.0',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    {
      id: 'PAYROLL_INSURANCE',
      label: 'كسب العمل والتأمينات',
      description: 'حساب ضريبة الأجور والتأمينات الاجتماعية قانون 148 / 206',
      icon: Calculator,
      badge: 'ق 148',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    },
    {
      id: 'AUDIT_WORKING_PAPERS',
      label: 'أوراق عمل المراجعة (ESA 320)',
      description: 'مصفوفة تقييم الأهمية النسبية وملف توثيق المراجعة',
      icon: ShieldCheck,
      badge: 'ملف المراجعة',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Top Navigation Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-red-700 text-white flex items-center justify-center shadow-xs">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مركز الضرائب والمراجعة والامتثال المهني</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ETA & ESA Framework
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة الإقرارات الضريبية، محاكاة الفحص، مطابقة الفواتير الإلكترونية، كسب العمل، وأوراق عمل المراجعة.
              </p>
            </div>
          </div>

          {pendingTaxesCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                <span>يوجد {pendingTaxesCount} إقرار ضريبي بانتظار الاعتماد والسداد</span>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Tabs Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-amber-600 text-white' : 'bg-slate-200/80 text-slate-600'
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
        {activeSubTab === 'TAX_TRACKER' && <TaxTrackerView state={state} />}
        {activeSubTab === 'TAX_EXPOSURE_SIMULATOR' && <TaxExposureSimulatorView state={state} />}
        {activeSubTab === 'ETA_RECONCILIATION' && <EtaReconciliationView state={state} />}
        {activeSubTab === 'PAYROLL_INSURANCE' && <PayrollInsuranceEngineView state={state} />}
        {activeSubTab === 'AUDIT_WORKING_PAPERS' && <AuditWorkingPapersView state={state} />}
      </div>
    </div>
  );
};
