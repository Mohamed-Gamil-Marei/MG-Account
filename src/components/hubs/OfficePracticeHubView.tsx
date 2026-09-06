import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Award,
  LineChart,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  FileText,
  Settings,
  Briefcase,
  Play,
  Smartphone,
} from 'lucide-react';
import { MgBrandBadge } from '../common/MgBrandBadge';
import { DatabaseState, db } from '../../db/localDatabase';
import { ClientsArchiveView } from '../ClientsArchiveView';
import { OfficeTreasuryView } from '../OfficeTreasuryView';
import { CertificatesGeneratorView } from '../CertificatesGeneratorView';
import { FeasibilityStudyView } from '../FeasibilityStudyView';
import { WhatsAppBotView } from '../WhatsAppBotView';
import { WhatsAppSettingsView } from '../WhatsAppSettingsView';
import { CreditDossierRegistryView } from '../CreditDossierRegistryView';
import { PracticeManagementHubView } from '../practice/PracticeManagementHubView';
import { WhatsAppBusinessApiView } from '../practice/WhatsAppBusinessApiView';
import { AccessRestrictedGate } from '../AccessRestrictedGate';
import { ClientSelector } from '../common/ClientSelector';

export type OfficePracticeSubTab =
  | 'CLIENTS_ARCHIVE'
  | 'PRACTICE_MANAGEMENT'
  | 'CREDIT_DOSSIER_REGISTRY'
  | 'WHATSAPP_BUSINESS_API'
  | 'WHATSAPP_SETTINGS'
  | 'WHATSAPP_BOT'
  | 'OFFICE_TREASURY'
  | 'CERTIFICATES'
  | 'FEASIBILITY_STUDY';

interface OfficePracticeHubViewProps {
  state: DatabaseState;
  initialSubTab?: OfficePracticeSubTab;
  onOpenPromoModal?: () => void;
}

export const OfficePracticeHubView: React.FC<OfficePracticeHubViewProps> = ({
  state,
  initialSubTab = 'CLIENTS_ARCHIVE',
  onOpenPromoModal,
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
    icon: any;
    badge?: string | number;
    badgeColor?: string;
    isTreasury?: boolean;
  }[] = [
    {
      id: 'CLIENTS_ARCHIVE',
      label: 'ملفات العملاء',
      icon: Users,
      badge: state.clients.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'PRACTICE_MANAGEMENT',
      label: 'عقود المراجعة والارتباط',
      icon: Briefcase,
    },
    {
      id: 'CREDIT_DOSSIER_REGISTRY',
      label: 'الملف الائتماني',
      icon: FileText,
    },
    {
      id: 'WHATSAPP_BUSINESS_API',
      label: 'واتس آب بيزنس API (عروض وتقارير)',
      icon: Smartphone,
      badge: 'API مباشر',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold',
    },
    {
      id: 'WHATSAPP_SETTINGS',
      label: 'إعدادات المراسلات',
      icon: Settings,
    },
    {
      id: 'WHATSAPP_BOT',
      label: 'المراسلات الآلية',
      icon: MessageSquare,
    },
    {
      id: 'OFFICE_TREASURY',
      label: 'خزينة المكتب',
      icon: Building2,
      badge: state.treasuryTransactions.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      isTreasury: true,
    },
    {
      id: 'CERTIFICATES',
      label: 'الشهادات المهنية',
      icon: Award,
      badge: state.certificates.length > 0 ? state.certificates.length : undefined,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'FEASIBILITY_STUDY',
      label: 'دراسات الجدوى',
      icon: LineChart,
      badge: state.feasibilityStudies.length > 0 ? state.feasibilityStudies.length : undefined,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  ];

  const canAccessTreasury = currentUser.role === 'ADMIN' || currentUser.canAccessTreasury || treasuryUnlocked;

  return (
    <div className="space-y-3.5">
      {/* Central Active Client Context Selector */}
      <ClientSelector state={state} />

      {/* Hub Top Navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/50">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">إدارة المكتب والممارسة المهنية</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  شؤون المكتب
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                ملفات العملاء، عقود الارتباط، خزينة المكتب والشهادات المهنية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto">
            {onOpenPromoModal && (
              <button
                type="button"
                onClick={onOpenPromoModal}
                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 hover:from-emerald-900 hover:to-slate-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs group transition-all"
                title="مشاهدة الهوية الرسمية والبرومو السينمائي للمكتب (MG Official Promo)"
              >
                <Play className="w-3 h-3 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                <span>برومو وهوية MG</span>
              </button>
            )}
            <div className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
              <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>{state.clients.length} عميل</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div>
        {activeSubTab === 'CLIENTS_ARCHIVE' && <ClientsArchiveView state={state} />}
        {activeSubTab === 'PRACTICE_MANAGEMENT' && <PracticeManagementHubView state={state} />}
        {activeSubTab === 'CREDIT_DOSSIER_REGISTRY' && <CreditDossierRegistryView state={state} />}
        {activeSubTab === 'WHATSAPP_BUSINESS_API' && (
          <WhatsAppBusinessApiView
            state={state}
            onNavigateToArchive={() => setActiveSubTab('CLIENTS_ARCHIVE')}
          />
        )}
        {activeSubTab === 'WHATSAPP_SETTINGS' && (
          <WhatsAppSettingsView
            onNavigateToArchive={() => setActiveSubTab('CLIENTS_ARCHIVE')}
            onNavigateToBot={() => setActiveSubTab('WHATSAPP_BOT')}
          />
        )}
        {activeSubTab === 'WHATSAPP_BOT' && <WhatsAppBotView />}
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

