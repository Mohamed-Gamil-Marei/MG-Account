import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Award,
  LineChart,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { ClientsArchiveView } from '../ClientsArchiveView';
import { OfficeTreasuryView } from '../OfficeTreasuryView';
import { CertificatesGeneratorView } from '../CertificatesGeneratorView';
import { FeasibilityStudyView } from '../FeasibilityStudyView';
import { AccessRestrictedGate } from '../AccessRestrictedGate';

export type OfficePracticeSubTab =
  | 'CLIENTS_ARCHIVE'
  | 'OFFICE_TREASURY'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY';

interface OfficePracticeHubViewProps {
  state: DatabaseState;
  initialSubTab?: OfficePracticeSubTab;
}

export const OfficePracticeHubView: React.FC<OfficePracticeHubViewProps> = ({
  state,
  initialSubTab = 'CLIENTS_ARCHIVE',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<OfficePracticeSubTab>(initialSubTab);
  const [treasuryUnlocked, setTreasuryUnlocked] = useState<boolean>(false);
  const currentUser = db.getCurrentUser();

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const tabs: {
    id: OfficePracticeSubTab;
    label: string;
    description: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
    isTreasury?: boolean;
  }[] = [
    {
      id: 'CLIENTS_ARCHIVE',
      label: 'أرشيف وملفات العملاء',
      description: 'السجلات التجارية، البطاقات الضريبية، والوكالات والإجراءات',
      icon: Users,
      badge: `${state.clients.length} عميل`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'OFFICE_TREASURY',
      label: 'خزنة وحسابات المكتب',
      description: 'حسابات أتعاب ومصروفات وسندات قبض وصرف المكتب (مستقلة)',
      icon: Building2,
      badge: `${state.treasuryTransactions.length} حركة`,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      isTreasury: true,
    },
    {
      id: 'CERTIFICATES',
      label: 'الشهادات المهنية المعتمدة',
      description: 'إصدار شهادات الدخل وإثبات المحاسب بالرمز التشفيري QR',
      icon: Award,
      badge: state.certificates.length,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'FEASIBILITY_STUDY',
      label: 'دراسات الجدوى الاقتصادية',
      description: 'النمذجة المالية، المؤشرات (NPV, IRR, Payback) ونقاط التعادل',
      icon: LineChart,
      badge: state.feasibilityStudies.length,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
  ];

  const canAccessTreasury = currentUser.role === 'ADMIN' || currentUser.canAccessTreasury || treasuryUnlocked;

  return (
    <div className="space-y-6">
      {/* Hub Top Navigation Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مركز إدارة المكتب وشؤون العملاء</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                  Practice Management
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة العملاء، إدارة خزنة وأتعاب المكتب المستقلة، إصدار الشهادات المهنية، ودراسات الجدوى.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-2">
              <span>إجمالي ملفات العملاء المسجلة:</span>
              <span className="font-bold text-slate-900">{state.clients.length} ملف</span>
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
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500/30'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
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
        {activeSubTab === 'CLIENTS_ARCHIVE' && <ClientsArchiveView state={state} />}
        {activeSubTab === 'OFFICE_TREASURY' && (
          canAccessTreasury ? (
            <OfficeTreasuryView state={state} />
          ) : (
            <AccessRestrictedGate
              currentUser={currentUser}
              targetTabName="خزنة وحسابات أتعاب المكتب المستقلة"
              onOverrideSuccess={() => setTreasuryUnlocked(true)}
              onNavigateHome={() => setActiveSubTab('CLIENTS_ARCHIVE')}
            />
          )
        )}
        {activeSubTab === 'CERTIFICATES' && <CertificatesGeneratorView state={state} />}
        {activeSubTab === 'FEASIBILITY_STUDY' && <FeasibilityStudyView state={state} />}
      </div>
    </div>
  );
};
